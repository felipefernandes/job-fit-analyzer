import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, saveUserProfile, saveResumeToDb, getResumeFromDb, saveLlmKey, getLlmKey, removeLlmKey, deleteUserData } from '../services/db';
import { deleteCurrentUserAccount } from '../services/auth';
import { parseResumeFile } from '../services/fileParser';
import CoachMarks from '../components/CoachMarks';
import { detectLlmProvider, getProviderDisplayName, getProviderHelpUrl } from '../services/llmDetector';

export default function Profile() {
    const { user } = useAuth();
    
    // States
    const [profile, setProfile] = useState({ displayName: user?.displayName || '' });
    const [resume, setResume] = useState({ content: '', source: 'markdown', sourceUrl: '' });
    const [keys, setKeys] = useState({ gemini: '', groq: '', openai: '', anthropic: '', openrouter: '' });
    const [loading, setLoading] = useState(true);
    
    const [nameStatus, setNameStatus] = useState({ type: '', message: '' });
    const [resumeStatus, setResumeStatus] = useState({ type: '', message: '' });
    const [keyStatus, setKeyStatus] = useState({});
    
    // States para exclusão de conta
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmEmailInput, setConfirmEmailInput] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    
    const fileInputRef = useRef(null);

    // States para API key unificada e Onboarding
    const [newKey, setNewKey] = useState('');
    const [detectedProvider, setDetectedProvider] = useState(null);
    const [manualProvider, setManualProvider] = useState('');
    const [showHelpAccordion, setShowHelpAccordion] = useState(false);
    const [isOnboardingActive, setIsOnboardingActive] = useState(!localStorage.getItem('jobfit_profile_onboarding_completed'));
    const [onboardingStartStep, setOnboardingStartStep] = useState(0);

    const handleKeyInputChange = (e) => {
        const value = e.target.value;
        setNewKey(value);
        const provider = detectLlmProvider(value);
        setDetectedProvider(provider);
        if (provider) {
            setManualProvider(provider);
        } else {
            setManualProvider('');
        }
    };

    const onboardingSteps = [
        {
            target: '#onboarding-resume-section',
            title: 'Seu Currículo',
            content: 'Faça o upload do seu currículo em PDF, Word (.docx) ou cole em Markdown. Ele será analisado com inteligência artificial contra as vagas que você buscar.',
            position: 'bottom'
        },
        {
            target: '#onboarding-key-section',
            title: 'Chaves de API Unificadas',
            content: 'Cole sua chave de API de IA aqui. O sistema detectará automaticamente se ela pertence ao Gemini, Groq, OpenAI, Anthropic ou OpenRouter. Suas chaves são criptografadas localmente.',
            position: 'top'
        },
        {
            target: '#onboarding-help-section',
            title: 'Como obter chaves gratuitas',
            content: 'Se você não tem chaves de API, clique aqui para expandir o guia passo a passo sobre como obter sua chave do Gemini de graça no Google AI Studio.',
            position: 'top'
        }
    ];

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                const p = await getUserProfile(user.uid);
                if (p) setProfile({ displayName: p.displayName || user.displayName });
                
                const r = await getResumeFromDb(user.uid);
                if (r) setResume(r);
                
                const loadedKeys = {};
                let hasKeys = false;
                for (const provider of ['gemini', 'groq', 'openai', 'anthropic', 'openrouter']) {
                    const keyVal = await getLlmKey(user.uid, provider);
                    if (keyVal) {
                        loadedKeys[provider] = '••••••••' + keyVal.slice(-4);
                        hasKeys = true;
                    } else {
                        loadedKeys[provider] = '';
                    }
                }
                setKeys(loadedKeys);

                // Se o usuário não tem currículo E não tem chaves configuradas, ativa os coach marks automaticamente!
                const hasResume = r && r.content && r.content.trim().length > 0;
                if (!hasResume && !hasKeys) {
                    setOnboardingStartStep(0);
                    setIsOnboardingActive(true);
                }
            } catch (e) {
                console.error("Error loading profile data", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    const showStatus = (setter, msg, type = 'success', duration = 3000) => {
        setter({ type, message: msg });
        if (duration > 0) setTimeout(() => setter({ type: '', message: '' }), duration);
    };

    const showKeyStatus = (provider, msg, type = 'success', duration = 3000) => {
        setKeyStatus(prev => ({ ...prev, [provider]: { type, message: msg } }));
        if (duration > 0) setTimeout(() => setKeyStatus(prev => ({ ...prev, [provider]: { type: '', message: '' } })), duration);
    };

    const handleSaveName = async () => {
        showStatus(setNameStatus, 'Salvando nome...', 'loading', 0);
        try {
            await saveUserProfile(user.uid, profile);
            showStatus(setNameStatus, 'Nome salvo!');
        } catch (e) {
            console.error(e);
            showStatus(setNameStatus, 'Erro ao salvar o nome.', 'error');
        }
    };

    const handleSaveResume = async () => {
        showStatus(setResumeStatus, 'Salvando currículo...', 'loading', 0);
        try {
            await saveResumeToDb(user.uid, resume.content, resume.source, resume.sourceUrl);
            showStatus(setResumeStatus, 'Currículo salvo!');
        } catch (e) {
            console.error("Erro no saveResumeToDb:", e);
            showStatus(setResumeStatus, 'Erro de permissão ou conexão.', 'error', 5000);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const maxSizeBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            showStatus(setResumeStatus, 'O arquivo excede o limite máximo de 5MB.', 'error', 5000);
            return;
        }

        showStatus(setResumeStatus, `Extraindo texto de ${file.name}...`, 'loading', 0);
        try {
            const text = await parseResumeFile(file);
            setResume({ ...resume, content: text, source: 'markdown' });
            showStatus(setResumeStatus, 'Texto extraído com sucesso! Lembre-se de salvar.');
        } catch (err) {
            console.error("Erro na extração do arquivo:", err);
            showStatus(setResumeStatus, err.message || 'Erro ao processar o arquivo.', 'error', 6000);
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const handleSaveKey = async (provider, plainKey) => {
        if (!plainKey || plainKey.startsWith('••••')) return;
        showKeyStatus(provider, `Salvando...`, 'loading', 0);
        try {
            await saveLlmKey(user.uid, provider, plainKey);
            setKeys(prev => ({ ...prev, [provider]: '••••••••' + plainKey.slice(-4) }));
            showKeyStatus(provider, `Salva!`);
            setNewKey('');
            setDetectedProvider(null);
            setManualProvider('');
        } catch (e) {
            console.error(e);
            showKeyStatus(provider, `Erro.`, 'error');
        }
    };

    const handleRemoveKey = async (provider) => {
        showKeyStatus(provider, `Removendo...`, 'loading', 0);
        try {
            await removeLlmKey(user.uid, provider);
            setKeys(prev => ({ ...prev, [provider]: '' }));
            showKeyStatus(provider, `Removida!`);
        } catch (e) {
            console.error(e);
            showKeyStatus(provider, `Erro.`, 'error');
        }
    };

    const handleTestKey = async (provider) => {
        showKeyStatus(provider, `Testando...`, 'loading', 0);
        setTimeout(() => {
            showKeyStatus(provider, `Simulada como OK!`);
        }, 1000);
    };

    const handleDeleteAccount = async () => {
        if (confirmEmailInput !== user.email) return;
        setDeleting(true);
        setDeleteError('');
        try {
            // 1. Apagar dados do Firestore primeiro
            await deleteUserData(user.uid);
            
            // 2. Apagar a conta de autenticação (reautentica se necessário)
            await deleteCurrentUserAccount();
            
            // 3. Limpar localStorage
            localStorage.clear();
        } catch (e) {
            console.error("Erro ao excluir conta:", e);
            setDeleteError(e.message || "Erro ao excluir conta. Tente novamente.");
            setDeleting(false);
        }
    };

    if (loading) return <div style={{ padding: "2rem" }}>Carregando perfil...</div>;

    const card = { background: "#13131f", border: "1px solid #1e1e32", borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" };
    const inputStyle = { width: "100%", background: "transparent", border: "1px solid #1e1e32", color: "#ddddf5", padding: "8px 12px", borderRadius: 4, outline: "none", marginBottom: "1rem", fontFamily: "'DM Sans', sans-serif" };
    const btnStyle = { background: "#22d78f", color: "#0b0b11", border: "none", borderRadius: 4, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" };

    const renderStatus = (status) => {
        if (!status?.message) return null;
        const color = status.type === 'error' ? '#ff4757' : '#22d78f';
        return (
            <span style={{ color, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 5, marginLeft: 10 }}>
                {status.type === 'loading' ? <span style={{ animation: "blink 1s infinite" }}>⏳</span> : (status.type === 'error' ? '⚠' : '✓')}
                {status.message}
            </span>
        );
    };

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem", fontFamily: "'DM Sans', sans-serif" }}>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "2rem", color: "#e0e0f0" }}>Seu Perfil</h1>

            <div style={card}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#00d4ff" }}>Dados Pessoais</h2>
                <label style={{ display: "block", marginBottom: 5, color: "#8888a8", fontSize: "0.85rem" }}>Nome de Exibição</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input 
                        style={{ ...inputStyle, marginBottom: 0, flex: 1 }} 
                        value={profile.displayName} 
                        onChange={e => setProfile({...profile, displayName: e.target.value})} 
                    />
                    <button style={{ ...btnStyle, height: "fit-content", flexShrink: 0 }} onClick={handleSaveName} disabled={nameStatus.type === 'loading'}>Salvar</button>
                    {renderStatus(nameStatus)}
                </div>
            </div>

            <div style={card} id="onboarding-resume-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2 style={{ fontSize: "1.2rem", color: "#00d4ff", margin: 0 }}>Seu Currículo</h2>
                    <button 
                        onClick={() => {
                            localStorage.removeItem('jobfit_profile_onboarding_completed');
                            setOnboardingStartStep(0);
                            setIsOnboardingActive(true);
                        }}
                        style={{ 
                            background: "transparent", 
                            border: "1px solid #383858", 
                            color: "#8888a8", 
                            borderRadius: 4, 
                            padding: "4px 10px", 
                            fontSize: "0.75rem", 
                            cursor: "pointer" 
                        }}
                    >
                        🛈 Ajuda / Tutorial
                    </button>
                </div>

                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <p style={{ fontSize: "0.8rem", color: "#8888a8", margin: 0 }}>Cole o conteúdo ou importe um arquivo .pdf, .docx, .odt, .md ou .txt</p>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={resumeStatus.type === 'loading'}
                            style={{ background: "transparent", border: "1px dashed #383858", color: resumeStatus.type === 'loading' ? '#484868' : '#00d4ff', borderRadius: 4, padding: "4px 12px", fontSize: "0.75rem", cursor: resumeStatus.type === 'loading' ? 'wait' : 'pointer' }}
                        >
                            {resumeStatus.type === 'loading' && resumeStatus.message.includes('Extraindo') ? '⏳ Processando...' : '📤 Importar Arquivo'}
                        </button>
                        <input type="file" accept=".pdf,.docx,.odt,.md,.txt" style={{ display: "none" }} ref={fileInputRef} onChange={handleFileUpload} disabled={resumeStatus.type === 'loading'} />
                    </div>

                    {resumeStatus.type === 'loading' && resumeStatus.message.includes('Extraindo') && (
                        <div className="terminal-scanner">
                            <span className="blink">$_</span> {resumeStatus.message}
                        </div>
                    )}

                    <textarea 
                        style={{ ...inputStyle, minHeight: 200, fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical" }} 
                        placeholder="# Seu Nome&#10;Experiência..."
                        value={resume.content}
                        onChange={e => setResume({...resume, content: e.target.value})}
                        disabled={resumeStatus.type === 'loading'}
                    />
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 15, marginTop: 10 }}>
                    <button style={{ ...btnStyle, flex: 1 }} onClick={handleSaveResume} disabled={resumeStatus.type === 'loading'}>
                        {resumeStatus.type === 'loading' ? 'Processando...' : 'Salvar Currículo'}
                    </button>
                    {renderStatus(resumeStatus)}
                </div>
            </div>

            <div style={card} id="onboarding-key-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2 style={{ fontSize: "1.2rem", color: "#00d4ff", margin: 0 }}>Chaves de API (LLM Providers)</h2>
                    <button 
                        onClick={() => {
                            localStorage.removeItem('jobfit_profile_onboarding_completed');
                            setOnboardingStartStep(1);
                            setIsOnboardingActive(true);
                        }}
                        style={{ 
                            background: "transparent", 
                            border: "1px solid #383858", 
                            color: "#8888a8", 
                            borderRadius: 4, 
                            padding: "4px 10px", 
                            fontSize: "0.75rem", 
                            cursor: "pointer" 
                        }}
                    >
                        🛈 Ajuda / Tutorial
                    </button>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#8888a8", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                    Suas chaves são criptografadas localmente usando sua sessão antes de serem enviadas para o banco de dados. Nós não temos acesso a elas em texto plano.
                </p>

                {/* Input único de chaves */}
                <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#0b0b11", borderRadius: 4, border: "1px solid #1e1e32" }}>
                    <label style={{ display: "block", marginBottom: 8, color: "#e0e0f0", fontSize: "0.85rem", fontWeight: 600 }}>
                        Adicionar nova chave de API
                    </label>
                    <p style={{ fontSize: "0.75rem", color: "#686888", marginBottom: 12 }}>
                        Provedores suportados: Gemini, Groq, OpenAI, Anthropic e OpenRouter.
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                        <input 
                            type="password"
                            style={{ ...inputStyle, marginBottom: 0, flex: 1 }} 
                            placeholder="Cole sua chave de API aqui..."
                            value={newKey}
                            onChange={handleKeyInputChange}
                        />
                        <button 
                            style={{ 
                                ...btnStyle, 
                                height: "fit-content", 
                                flexShrink: 0,
                                background: (!newKey || !manualProvider) ? "#18182a" : "#22d78f",
                                color: (!newKey || !manualProvider) ? "#484868" : "#0b0b11",
                                cursor: (!newKey || !manualProvider) ? "not-allowed" : "pointer"
                            }} 
                            disabled={!newKey || !manualProvider}
                            onClick={() => handleSaveKey(manualProvider, newKey)}
                        >
                            Salvar
                        </button>
                    </div>

                    {/* Tag de detecção / seletor manual */}
                    {newKey.trim().length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            {detectedProvider ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: "0.75rem", color: "#22d78f", background: "rgba(34, 215, 143, 0.08)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(34, 215, 143, 0.2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        ✓ Provedor detectado: <strong>{getProviderDisplayName(detectedProvider)}</strong>
                                    </span>
                                    <a 
                                        href={getProviderHelpUrl(detectedProvider)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        style={{ fontSize: "0.75rem", color: "#00d4ff", textDecoration: "underline" }}
                                    >
                                        Precisa de ajuda com esta chave? ↗
                                    </a>
                                </div>
                            ) : (
                                <div>
                                    <span style={{ fontSize: "0.75rem", color: "#ffb347", background: "rgba(255, 179, 71, 0.08)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(255, 179, 71, 0.2)", display: "block", marginBottom: 8 }}>
                                        ⚠ Não foi possível detectar o provedor automaticamente. Selecione abaixo:
                                    </span>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <select 
                                            value={manualProvider} 
                                            onChange={e => setManualProvider(e.target.value)}
                                            style={{
                                                background: "#13131f",
                                                color: "#ddddf5",
                                                border: "1px solid #1e1e32",
                                                padding: "6px 12px",
                                                borderRadius: 4,
                                                outline: "none",
                                                fontSize: "0.8rem",
                                                fontFamily: "'DM Sans', sans-serif",
                                                flex: 1
                                            }}
                                        >
                                            <option value="">-- Escolha o Provedor --</option>
                                            <option value="gemini">Gemini</option>
                                            <option value="groq">Groq</option>
                                            <option value="openai">OpenAI</option>
                                            <option value="anthropic">Anthropic Claude</option>
                                            <option value="openrouter">OpenRouter</option>
                                        </select>
                                        {manualProvider && (
                                            <a 
                                                href={getProviderHelpUrl(manualProvider)} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                style={{ fontSize: "0.75rem", color: "#00d4ff", textDecoration: "underline" }}
                                            >
                                                Obter chave do {getProviderDisplayName(manualProvider)} ↗
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Ajuda / Accordion */}
                <div 
                    id="onboarding-help-section"
                    style={{ 
                        border: "1px solid #1e1e32", 
                        borderRadius: 4, 
                        marginBottom: "1.5rem", 
                        overflow: "hidden",
                        background: "#13131f"
                    }}
                >
                    <button 
                        onClick={() => setShowHelpAccordion(!showHelpAccordion)}
                        style={{
                            width: "100%",
                            background: "rgba(30, 30, 50, 0.2)",
                            border: "none",
                            color: "#eeeef8",
                            padding: "10px 15px",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <span>❓ Como conseguir uma chave de API gratuitamente?</span>
                        <span>{showHelpAccordion ? "▲" : "▼"}</span>
                    </button>
                    {showHelpAccordion && (
                        <div style={{ padding: "12px 15px", borderTop: "1px solid #1e1e32", fontSize: "0.8rem", color: "#8888a8", lineHeight: 1.6 }}>
                            <p style={{ marginBottom: 10 }}>O provedor mais recomendado e que oferece um <strong>tier gratuito generoso</strong> é o <strong>Gemini</strong> (Google).</p>
                            <ol style={{ paddingLeft: 20, marginBottom: 10 }}>
                                <li style={{ marginBottom: 5 }}>Acesse o <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#00d4ff", textDecoration: "underline" }}>Google AI Studio ↗</a> logado na sua conta Google.</li>
                                <li style={{ marginBottom: 5 }}>Clique no botão azul <strong>"Create API Key"</strong> (Criar chave de API).</li>
                                <li style={{ marginBottom: 5 }}>Escolha a opção para criar em um novo projeto ou projeto existente.</li>
                                <li style={{ marginBottom: 5 }}>Copie a chave gerada (ela começa com <code>AIzaSy</code>).</li>
                                <li>Volte aqui, cole a chave no campo acima e clique em <strong>Salvar</strong>!</li>
                            </ol>
                            <p style={{ margin: 0 }}>Pronto! A chave estará ativa e você poderá fazer análises de compatibilidade de vagas gratuitamente.</p>
                        </div>
                    )}
                </div>

                {/* Lista de Chaves Ativas */}
                <div>
                    <h3 style={{ fontSize: "0.95rem", color: "#eeeef8", marginBottom: "1rem", fontWeight: 600 }}>Provedores Configurados</h3>
                    {Object.entries(keys).filter(([, val]) => val).length === 0 ? (
                        <p style={{ fontSize: "0.8rem", color: "#585878", fontStyle: "italic", background: "#0b0b11", padding: "12px", borderRadius: 4, border: "1px dashed #1e1e32", textAlign: "center" }}>
                            Nenhum provedor configurado no momento. Insira uma chave acima para começar.
                        </p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {Object.entries(keys).map(([provider, keyMask]) => {
                                if (!keyMask) return null;
                                return (
                                    <div 
                                        key={provider} 
                                        style={{ 
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center", 
                                            padding: "10px 14px", 
                                            background: "#0b0b11", 
                                            borderRadius: 4, 
                                            border: "1px solid #1e1e32" 
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#eeeef8", textTransform: "capitalize" }}>
                                                {getProviderDisplayName(provider)}
                                            </span>
                                            <span style={{ fontSize: "0.8rem", color: "#484868", fontFamily: "monospace" }}>
                                                {keyMask}
                                            </span>
                                            <span style={{ fontSize: "0.65rem", color: "#22d78f", background: "rgba(34, 215, 143, 0.08)", padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(34, 215, 143, 0.2)", fontWeight: 700 }}>
                                                ATIVO
                                            </span>
                                            {renderStatus(keyStatus[provider])}
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button 
                                                style={{ 
                                                    background: "transparent", 
                                                    border: "1px solid #00d4ff", 
                                                    color: "#00d4ff", 
                                                    padding: "4px 10px", 
                                                    borderRadius: 4, 
                                                    fontSize: "0.75rem", 
                                                    cursor: "pointer",
                                                    fontFamily: "'DM Sans', sans-serif"
                                                }} 
                                                onClick={() => handleTestKey(provider)}
                                            >
                                                Testar
                                            </button>
                                            <button 
                                                style={{ 
                                                    background: "transparent", 
                                                    border: "1px solid #ff4757", 
                                                    color: "#ff4757", 
                                                    padding: "4px 10px", 
                                                    borderRadius: 4, 
                                                    fontSize: "0.75rem", 
                                                    cursor: "pointer",
                                                    fontFamily: "'DM Sans', sans-serif" 
                                                }} 
                                                onClick={() => handleRemoveKey(provider)}
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div style={{ ...card, borderColor: "#ff4466", background: "rgba(255, 68, 102, 0.01)", marginTop: "2rem" }}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "#ff4466", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>⚠️</span> Danger Zone (Zona de Perigo)
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#8888a8", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                    Exclua permanentemente sua conta e todos os dados salvos (perfil, currículo, chaves de API e histórico de análises). Esta ação é definitiva e não poderá ser revertida.
                </p>

                {!showDeleteConfirm ? (
                    <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{ ...btnStyle, background: "transparent", border: "1px solid #ff4466", color: "#ff4466", transition: "all 0.2s" }}
                        onMouseEnter={(e) => e.target.style.background = "rgba(255, 68, 102, 0.1)"}
                        onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                        Excluir Minha Conta e Dados
                    </button>
                ) : (
                    <div style={{ padding: "1rem", background: "rgba(255, 68, 102, 0.05)", border: "1px dashed #ff4466", borderRadius: 4 }}>
                        <p style={{ fontSize: "0.85rem", color: "#e0e0f0", marginBottom: 10 }}>
                            Para confirmar, digite seu e-mail de cadastro (<strong style={{ color: "#ff4466" }}>{user.email}</strong>):
                        </p>
                        <input 
                            style={inputStyle} 
                            placeholder={user.email} 
                            value={confirmEmailInput} 
                            onChange={e => setConfirmEmailInput(e.target.value)} 
                            disabled={deleting}
                            autoFocus
                        />
                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            <button 
                                style={{ 
                                    ...btnStyle, 
                                    background: confirmEmailInput === user.email ? "#ff4466" : "#2d1a21", 
                                    color: confirmEmailInput === user.email ? "#fff" : "#684852", 
                                    cursor: confirmEmailInput === user.email ? "pointer" : "not-allowed",
                                    border: "none"
                                }}
                                disabled={confirmEmailInput !== user.email || deleting}
                                onClick={handleDeleteAccount}
                            >
                                {deleting ? "Excluindo..." : "Confirmar Exclusão Definitiva"}
                            </button>
                            <button 
                                style={{ ...btnStyle, background: "transparent", border: "1px solid #383858", color: "#8888a8" }}
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setConfirmEmailInput('');
                                    setDeleteError('');
                                }}
                                disabled={deleting}
                            >
                                Cancelar
                            </button>
                        </div>
                        {deleteError && <p style={{ color: "#ff4466", fontSize: "0.8rem", marginTop: 10, fontFamily: "monospace" }}>{deleteError}</p>}
                    </div>
                )}
            </div>

            {isOnboardingActive && (
                <CoachMarks 
                    steps={onboardingSteps} 
                    startStep={onboardingStartStep}
                    onComplete={() => {
                        localStorage.setItem('jobfit_profile_onboarding_completed', 'true');
                        setIsOnboardingActive(false);
                    }} 
                />
            )}
        </div>
    );
}
