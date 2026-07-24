import { useState, useEffect } from 'react';
import iconImg from '../assets/icon-48.png';

export default function SidePanelApp() {
  const [user, setUser] = useState(null);
  const [resume, setResume] = useState("");
  const [keys, setKeys] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [syncStatus, setSyncStatus] = useState("checking"); // checking | connected | disconnected
  const [authToken, setAuthToken] = useState("");

  // Carrega dados iniciais do storage da extensão
  const loadStorageData = () => {
    chrome.storage.local.get(['user', 'resume', 'keys', 'authToken', 'tempJobDescription'], (data) => {
      if (data.user) {
        setUser(data.user);
        setResume(data.resume || "");
        setKeys(data.keys || null);
        setAuthToken(data.authToken || "");
        setSyncStatus("connected");
      } else {
        setUser(null);
        setResume("");
        setKeys(null);
        setAuthToken("");
        setSyncStatus("disconnected");
      }

      // Se houver texto vindo do menu de contexto
      if (data.tempJobDescription) {
        setJobDescription(data.tempJobDescription);
        // Limpa o temporário para não re-preencher no próximo carregamento
        chrome.storage.local.remove('tempJobDescription');
      }
    });
  };

  useEffect(() => {
    loadStorageData();

    // Solicita ativamente a sessão de login para abas abertas do site principal
    chrome.tabs.query({ url: ["https://job-fit-analyzer.web.app/*", "https://job-fit-analyzer.firebaseapp.com/*", "https://job-fit-analyzer-4f7af.web.app/*", "https://job-fit-analyzer-4f7af.firebaseapp.com/*", "http://localhost/*"] }, (tabs) => {
      if (tabs && tabs.length > 0) {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_SESSION' })
            .catch(() => { /* Silencia erros de abas que não carregaram o script ainda */ });
        });
      }
    });

    // Escuta atualizações da sessão ou disparos de menu de contexto
    const handleMessage = (message) => {
      if (message.type === 'SESSION_UPDATED') {
        loadStorageData();
      } else if (message.type === 'ANALYZE_SELECTION_TRIGGERED') {
        setJobDescription(message.text);
        setResult(null);
        setError(null);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Injeta o content script na aba ativa para ler a vaga
  const analyzeCurrentPage = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error("Nenhuma aba ativa encontrada.");
      }

      // Evita rodar scripts em páginas internas do Chrome (chrome://)
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
        throw new Error("Não é possível analisar páginas do sistema do navegador.");
      }

      // Injeta o script de conteúdo
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error("Falha ao ler o conteúdo desta página. Verifique se o site terminou de carregar.");
      }

      const pageData = results[0].result;
      setJobDescription(pageData.text);
      setJobTitle(pageData.title);

      await runAnalysis(pageData.text, pageData.title, pageData.url);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao extrair a vaga.");
      setLoading(false);
    }
  };

  // Chama a Cloud Function do Firebase para analisar a vaga
  const runAnalysis = async (jdText, title, url) => {
    if (!resume) {
      throw new Error("Currículo não encontrado. Cadastre seu currículo no painel do site.");
    }
    
    setLoading(true);
    try {
      const projectId = "job-fit-analyzer-4f7af";
      const region = "us-central1";
      const endpoint = `https://${region}-${projectId}.cloudfunctions.net/analyzeJobFitHttp`;

      const headers = {
        "Content-Type": "application/json"
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            resume,
            jobDescription: jdText,
            keys: keys || {},
            options: {}
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro na chamada da IA (HTTP ${res.status}): ${errorText || 'Acesso negado.'}`);
      }

      const responseJson = await res.json();
      const analysisResult = responseJson.result;

      if (!analysisResult) {
        throw new Error("A resposta do analisador de IA veio vazia.");
      }

      setResult(analysisResult);

      const analysisData = {
        vaga: {
          titulo: analysisResult.vaga?.titulo || title || "Vaga Extraída",
          empresa: analysisResult.vaga?.empresa || "Empresa Não Identificada",
          local: analysisResult.vaga?.local || "",
          nivel: analysisResult.vaga?.nivel || ""
        },
        score: analysisResult.score,
        fit_categoria: analysisResult.fit_categoria,
        aderencias: analysisResult.aderencias || [],
        gaps: analysisResult.gaps || [],
        diferenciais: analysisResult.diferenciais || [],
        veredicto: analysisResult.veredicto || "",
        recomendacao: analysisResult.recomendacao || "",
        providerUsed: analysisResult.providerUsed || "",
        url: url || "",
        source: "extension"
      };

      // Tenta salvar e sincronizar o histórico com o Firestore
      await saveAndSyncAnalysis(analysisData);

    } catch (err) {
      console.error("Erro na chamada da IA:", err);
      setError(err.message || "Erro de processamento da IA no servidor.");
    } finally {
      setLoading(false);
    }
  };

  const saveAndSyncAnalysis = async (analysisData) => {
    chrome.storage.local.get({ localAnalyses: [], pendingAnalyses: [] }, (storage) => {
      const localAnalyses = [analysisData, ...storage.localAnalyses].slice(0, 10);
      const pendingAnalyses = [...storage.pendingAnalyses, analysisData];

      chrome.storage.local.set({ localAnalyses, pendingAnalyses }, () => {
        // Busca abas do Job Fit Analyzer abertas para disparar a persistência
        chrome.tabs.query({ url: ["https://job-fit-analyzer.web.app/*", "https://job-fit-analyzer.firebaseapp.com/*", "https://job-fit-analyzer-4f7af.web.app/*", "https://job-fit-analyzer-4f7af.firebaseapp.com/*", "http://localhost/*"] }, (tabs) => {
          if (tabs && tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SYNC_PENDING_ANALYSES', analyses: pendingAnalyses }, (response) => {
              if (response && response.success) {
                // Sincronizado com sucesso, limpa os pendentes
                chrome.storage.local.set({ pendingAnalyses: [] });
              }
            });
          }
        });
      });
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) return;
    setError(null);
    setResult(null);
    try {
      await runAnalysis(jobDescription, "Vaga Colada Manualmente", "");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Helper de classes CSS para cores baseadas em score
  const getScoreClass = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-partial';
    return 'score-weak';
  };

  // --- RENDERS ---

  if (syncStatus === "checking") {
    return (
      <div className="panel-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" style={{ width: 24, height: 24 }}></div>
      </div>
    );
  }

  if (syncStatus === "disconnected") {
    return (
      <div className="panel-container">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={iconImg} alt="Icon" style={{ width: 22, height: 22 }} />
            <h1>Companion Job Fit</h1>
          </div>
          <span className="header-status status-disconnected">Desconectado</span>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title">⚠️ Autenticação Requerida</div>
          <div className="card-content">
            Você precisa estar logado na plataforma principal do <strong>Job Fit Analyzer</strong> para realizar análises de vagas.
          </div>
          <a href="https://job-fit-analyzer-4f7af.web.app" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: 8 }}>
            Entrar no Job Fit Analyzer
          </a>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="panel-container">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={iconImg} alt="Icon" style={{ width: 22, height: 22 }} />
            <h1>Companion Job Fit</h1>
          </div>
          <span className="header-status status-connected">Conectado</span>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title">📄 Currículo Ausente</div>
          <div className="card-content">
            Olá, <strong>{user?.displayName || 'Usuário'}</strong>.
            Identificamos que você ainda não configurou seu currículo na plataforma. É necessário enviar o currículo para poder fazer análises de vagas.
          </div>
          <a href="https://job-fit-analyzer-4f7af.web.app/profile" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: 8 }}>
            Configurar Currículo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-container">
      {/* Header */}
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={iconImg} alt="Icon" style={{ width: 22, height: 22 }} />
          <h1>Companion Job Fit</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user?.photoURL && (
            <img src={user.photoURL} alt={user.displayName} style={{ width: 20, height: 20, borderRadius: '50%' }} />
          )}
          <span className="header-status status-connected">Pronto</span>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button 
          onClick={analyzeCurrentPage} 
          disabled={loading} 
          className={`btn btn-primary ${loading ? 'btn-disabled' : ''}`}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              Processando Vaga...
            </>
          ) : (
            'Analisar Vaga desta Aba'
          )}
        </button>

        <button 
          onClick={() => setManualMode(!manualMode)} 
          className="btn" 
          style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {manualMode ? 'Ocultar Campo de Texto' : 'Colar Descrição Manualmente'}
        </button>
      </div>

      {/* Input Manual */}
      {manualMode && (
        <form onSubmit={handleManualSubmit} className="card">
          <div className="card-title">Inserção Manual</div>
          <textarea
            className="card-content"
            style={{ 
              width: '100%', 
              height: '100px', 
              background: 'rgba(0,0,0,0.2)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '6px', 
              padding: '8px', 
              color: '#fff',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: '0.8rem'
            }}
            placeholder="Cole aqui o texto da descrição da vaga de emprego..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={loading || !jobDescription.trim()} 
            className={`btn btn-primary ${loading || !jobDescription.trim() ? 'btn-disabled' : ''}`}
          >
            {loading ? <div className="spinner"></div> : 'Rodar Análise Manual'}
          </button>
        </form>
      )}

      {/* Feedback de Carregamento */}
      {loading && (
        <div className="terminal-scanner">
          <span className="blink">■</span>
          <span>Extraindo dados e analisando fit com a IA...</span>
        </div>
      )}

      {/* Feedback de Erro */}
      {error && (
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="card-title" style={{ color: '#ef4444' }}>⚠️ Falha na Análise</div>
          <div className="card-content" style={{ color: '#ef4444' }}>{error}</div>
        </div>
      )}

      {/* Resultados da Análise */}
      {result && !loading && (
        <div className="card" style={{ gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="score-badge-container">
              <div className={`score-circle ${getScoreClass(result.score)}`}>
                <span className="number">{result.score}</span>
                <span className="label">Match</span>
              </div>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', textAlign: 'center' }}>
              {result.vaga?.titulo || jobTitle}
            </h2>
            {result.vaga?.empresa && (
              <span style={{ fontSize: '0.8rem', color: '#a0a0c0' }}>{result.vaga.empresa}</span>
            )}
          </div>

          <div>
            <div className="section-title">Veredicto</div>
            <div className="card-content" style={{ color: '#ddddf5', fontSize: '0.8rem' }}>
              {result.veredicto}
            </div>
          </div>

          {result.gaps && result.gaps.length > 0 && (
            <div>
              <div className="section-title" style={{ color: '#ef4444' }}>Gaps de Competência</div>
              <div className="badge-list">
                {result.gaps.map((gap, i) => (
                  <div key={i} className={`badge-item border-${gap.impacto || 'moderado'}`}>
                    <div className="badge-item-title" style={{ color: '#fff' }}>{gap.criterio}</div>
                    <div className="badge-item-desc">{gap.detalhe}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.aderencias && result.aderencias.length > 0 && (
            <div>
              <div className="section-title" style={{ color: '#22d78f' }}>Pontos de Aderência</div>
              <div className="badge-list">
                {result.aderencias.map((ad, i) => (
                  <div key={i} className={`badge-item border-${ad.status || 'forte'}`}>
                    <div className="badge-item-title" style={{ color: '#fff' }}>{ad.criterio}</div>
                    <div className="badge-item-desc">{ad.detalhe}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.diferenciais && result.diferenciais.length > 0 && (
            <div>
              <div className="section-title" style={{ color: '#00d4ff' }}>Diferenciais Sugeridos</div>
              <div>
                {result.diferenciais.map((dif, i) => (
                  <span key={i} className="differential-tag">{dif}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="section-title">Orientação e Próximos Passos</div>
            <div className="card-content" style={{ color: '#ddddf5', fontSize: '0.8rem' }}>
              {result.recomendacao}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#606080' }}>
              Análise processada via {result.providerUsed?.toUpperCase() || 'IA'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
