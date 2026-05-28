import { useState, useEffect } from "react";
import { useAuth } from '../context/AuthContext';
import { getResumeFromDb, getLlmKey, saveAnalysis } from '../services/db';
import { analyzeJobFit } from '../services/llm';
import { Link } from 'react-router-dom';

const STAGES_URL = ["Buscando a vaga na web...", "Lendo requisitos...", "Cruzando com seu perfil...", "Calculando score..."];
const STAGES_TEXT = ["Lendo job description...", "Extraindo requisitos...", "Cruzando com seu perfil...", "Calculando score..."];



function scoreColor(s) {
    if (s >= 80) return "#22d78f";
    if (s >= 60) return "#4fc3f7";
    if (s >= 40) return "#ffb347";
    return "#ff4757";
}
function StatusDot({ status }) {
    const c = status === "forte" ? "#22d78f" : status === "parcial" ? "#ffb347" : "#ff4757";
    return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0, marginRight: 8 }} />;
}
function ImpactoTag({ impacto }) {
    const c = impacto === "critico" ? "#ff4757" : impacto === "moderado" ? "#ffb347" : "#4fc3f7";
    return <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0b0b11", background: c, padding: "2px 5px", borderRadius: 3, flexShrink: 0, marginRight: 8 }}>{impacto}</span>;
}

const fetchUrlContent = async (url) => {
    let targetUrl = url;
    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (url.includes("docs.google.com/document") && docIdMatch) {
        targetUrl = `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=txt`;
    }
    
    const proxies = [
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];
    
    let text = null;
    let lastError = "";
    
    for (const proxyUrl of proxies) {
        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(res.statusText || res.status);
            text = await res.text();
            break; // Sucesso, sai do loop
        } catch (e) {
            lastError = e.message;
        }
    }
    
    if (text === null) {
        throw new Error(`Este site bloqueia acessos automatizados (Erro: ${lastError}). Por favor, copie o texto da vaga e use a aba "Colar texto".`);
    }

    if (text.includes("<html") || text.includes("<body")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const toRemove = doc.querySelectorAll('script, style, nav, footer, iframe, header, noscript, svg');
        toRemove.forEach(el => el.remove());
        
        // Em plataformas como Gupy, a vaga costuma ficar em main ou div com classe description
        const mainContent = doc.querySelector('main') || doc.querySelector('[class*="description"]') || doc.body;
        text = mainContent.innerText || mainContent.textContent || "";
        text = text.replace(/\s+/g, ' ').trim();
    }
    return text;
};

export default function Analyzer() {
    const { user } = useAuth();
    
    const [resume, setResume] = useState(null);
    const [keys, setKeys] = useState({});
    const [loadingData, setLoadingData] = useState(true);

    const [mode, setMode] = useState("text");
    const [url, setUrl] = useState("");
    const [jdText, setJdText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [stage, setStage] = useState(0);
    const [providerUsed, setProviderUsed] = useState("");
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;
            try {
                const r = await getResumeFromDb(user.uid);
                if (r) setResume(r.content);
                
                const loadedKeys = {};
                for (const provider of ['gemini', 'groq', 'openai', 'anthropic', 'openrouter', 'deepseek']) {
                    const k = await getLlmKey(user.uid, provider);
                    loadedKeys[provider] = k || '';
                }
                setKeys(loadedKeys);
            } catch(e) {
                console.error(e);
            } finally {
                setLoadingData(false);
            }
        };
        loadProfile();
    }, [user]);

    useEffect(() => {
        if (!loading) return;
        const STAGES = mode === "url" ? STAGES_URL : STAGES_TEXT;
        const iv = setInterval(() => setStage(s => (s + 1) % STAGES.length), 2500);
        return () => clearInterval(iv);
    }, [loading, mode]);

    const hasKeys = Object.values(keys).some(k => k && k.trim().length > 0);
    const canAnalyze = resume && hasKeys && (mode === "url" ? url.trim().length > 0 : jdText.trim().length > 50);

    const analyze = async () => {
        if (!canAnalyze || loading) return;
        setLoading(true); setResult(null); setError(null); setStage(0); setIsSaved(false);

        try {
            let extractedJd = jdText;
            if (mode === "url") {
                setStage(0);
                try {
                    extractedJd = await fetchUrlContent(url);
                    if (!extractedJd.trim()) throw new Error("A página da vaga retornou conteúdo vazio.");
                } catch (scrapeErr) {
                    throw new Error(`Falha ao raspar a vaga do link:\n${scrapeErr.message}`, { cause: scrapeErr });
                }
                setStage(1);
            }

            setStage(2); // Cruzando com perfil

            const resultData = await analyzeJobFit(resume, extractedJd, keys, { useGoogleSearch: mode === 'url' });
            
            setStage(3); // Calculando score

            let displayProvider = resultData.providerUsed;
            if (resultData.fallbackChain && resultData.fallbackChain.length > 0) {
                const original = resultData.fallbackChain[0].provider;
                displayProvider = `${resultData.providerUsed} (Fallback de ${original})`;
            }
            setProviderUsed(displayProvider);

            // Injetamos a fonte no resultado caso queiramos salvar depois
            resultData.jobSource = mode;
            setResult(resultData);
        } catch (err) {
            console.error(err);
            setError(err.message || "Erro inesperado.");
        } finally { setLoading(false); }
    };

    const handleSaveAnalysis = async () => {
        if (!result || isSaved) return;
        try {
            await saveAnalysis(user.uid, {
                ...result,
                provider: providerUsed
            });
            setIsSaved(true);
        } catch (e) {
            console.error("Erro ao salvar avaliação", e);
            alert("Falha ao salvar a avaliação.");
        }
    };

    const reset = () => { setResult(null); setUrl(""); setJdText(""); setError(null); setIsSaved(false); };
    const switchMode = (m) => { setMode(m); setError(null); setResult(null); setIsSaved(false); };

    const card = { background: "#13131f", border: "1px solid #1e1e32", borderRadius: 10, padding: "1.25rem" };
    const mono = { fontFamily: "'JetBrains Mono',monospace" };
    const label = { ...mono, fontSize: "0.58rem", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "0.875rem" };

    if (loadingData) return <div style={{ padding: "2rem" }}>Carregando dados...</div>;

    const activeProvidersCount = Object.values(keys).filter(k => k && k.trim().length > 0).length;

    if (!resume || activeProvidersCount === 0) {
        return (
            <div style={{ maxWidth: 840, margin: "0 auto", padding: "2rem 1.5rem", textAlign: "center", animation: "fadeUp 0.35s ease" }}>
                <div style={card}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>👋</div>
                    <h2 style={{ color: "#eeeef8", marginBottom: "1rem", fontSize: "1.4rem" }}>Bem-vindo ao Job Fit Analyzer!</h2>
                    <p style={{ color: "#8888a8", marginBottom: "2rem", lineHeight: 1.6 }}>
                        Para fazer sua primeira análise, precisamos que você forneça duas coisas essenciais:<br/>
                        <strong>1. Seu currículo</strong> (texto ou importação local)<br/>
                        <strong>2. Uma chave de API</strong> (Gemini, Groq, OpenAI, Claude, OpenRouter ou DeepSeek) para o motor de IA funcionar.<br/>
                    </p>
                    <Link to="/app/profile" style={{ background: "#22d78f", color: "#0b0b11", textDecoration: "none", padding: "12px 24px", borderRadius: 6, fontWeight: 700, display: "inline-block", fontFamily: "'DM Sans', sans-serif" }}>
                        Configurar meu Perfil →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 840, margin: "0 auto", padding: "2rem 1.5rem" }}>
            {/* Header escondido ou minimalista, já que AppLayout tem a nav */}
            <div style={{ display: "flex", gap: 4, marginBottom: "0.875rem", background: "#13131f", border: "1px solid #1e1e32", borderRadius: 8, padding: 4, width: "fit-content" }}>
                {[
                    { key: "text", label: "📋  Colar texto" },
                    { key: "url", label: "🔗  Link da vaga (Em breve)", disabled: true }
                ].map(({ key, label, disabled }) => (
                    <button 
                        key={key} 
                        onClick={() => !disabled && switchMode(key)} 
                        disabled={disabled}
                        style={{ 
                            background: mode === key ? "#22d78f" : "transparent", 
                            color: disabled ? "#484868" : (mode === key ? "#0b0b11" : "#484868"), 
                            border: "none", 
                            borderRadius: 5, 
                            padding: "6px 16px", 
                            fontFamily: "'DM Sans',sans-serif", 
                            fontSize: "0.76rem", 
                            fontWeight: mode === key ? 700 : 400, 
                            cursor: disabled ? "not-allowed" : "pointer", 
                            transition: "all 0.15s",
                            opacity: disabled ? 0.4 : 1
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {mode === "url" && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", ...card, padding: "10px 14px", marginBottom: "1.25rem" }}>
                    <span style={{ ...mono, fontSize: "0.85rem", color: "#22d78f", flexShrink: 0 }}>$_</span>
                    <input type="url" placeholder="https://careers.empresa.com/vaga-id" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && analyze()} disabled={loading} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#ddddf5", fontSize: "0.83rem", ...mono }} />
                    <button onClick={analyze} disabled={loading || !canAnalyze} style={{ background: loading || !canAnalyze ? "#18182a" : "#22d78f", color: loading || !canAnalyze ? "#333352" : "#0b0b11", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: "0.76rem", fontWeight: 700, cursor: loading ? "wait" : !canAnalyze ? "default" : "pointer" }}>
                        {loading ? "···" : "Analisar"}
                    </button>
                </div>
            )}

            {mode === "text" && (
                <div style={{ ...card, padding: "12px 14px", marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                        <span style={{ ...label, color: "#383858", marginBottom: 0 }}>job description</span>
                        <button onClick={analyze} disabled={loading || !canAnalyze} style={{ background: loading || !canAnalyze ? "#18182a" : "#22d78f", color: loading || !canAnalyze ? "#333352" : "#0b0b11", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: "0.76rem", fontWeight: 700, cursor: loading ? "wait" : !canAnalyze ? "default" : "pointer" }}>
                            {loading ? "···" : "Analisar"}
                        </button>
                    </div>
                    <textarea placeholder="Cole aqui o texto completo da vaga..." value={jdText} onChange={e => setJdText(e.target.value)} disabled={loading} rows={10} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#ddddf5", fontSize: "0.8rem", resize: "vertical" }} />
                </div>
            )}

            {activeProvidersCount > 1 && !result && !loading && (
                <div style={{ padding: "0.75rem 1rem", background: "#0c0c16", border: "1px dashed #1e1e32", borderRadius: 8, color: "#8888a8", fontSize: "0.75rem", marginBottom: "1.25rem", display: "flex", gap: 10, alignItems: "center" }}>
                    <span>💡</span>
                    <span style={{ lineHeight: 1.5 }}>
                        <strong>Nota de IA:</strong> Como você possui múltiplos provedores configurados, a análise poderá utilizar um provedor de fallback caso o principal esteja instável. A variação de nuances e critérios pode ocorrer dependendo da IA utilizada na chamada.
                    </span>
                </div>
            )}

            {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.875rem 1.25rem", ...card, marginBottom: "1rem" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d78f", display: "inline-block", flexShrink: 0 }} />
                    <span style={{ ...mono, fontSize: "0.76rem", color: "#22d78f" }}>{mode === "url" ? STAGES_URL[stage] : STAGES_TEXT[stage]}</span>
                </div>
            )}

            {error && (
                <div style={{ padding: "0.875rem 1.25rem", background: "#160a0a", border: "1px solid #3a1515", borderRadius: 8, color: "#ff7070", fontSize: "0.8rem", marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
                    ⚠ {error}
                </div>
            )}

            {result && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", ...card, marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#eeeef8", marginBottom: 5 }}>{result.vaga?.titulo || "Vaga"}</div>
                            <div style={{ fontSize: "0.76rem", color: "#383858" }}>{[result.vaga?.empresa, result.vaga?.local, result.vaga?.nivel].filter(Boolean).join("  ·  ")}</div>
                        </div>
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                            <div style={{ ...mono, fontSize: "3.6rem", fontWeight: 700, lineHeight: 1, color: scoreColor(result.score) }}>{result.score}</div>
                            <div style={{ fontSize: "0.62rem", color: scoreColor(result.score), letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginTop: 3 }}>{result.fit_categoria}</div>
                            {providerUsed && <div style={{ ...mono, fontSize: "0.45rem", color: "#383858", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4 }}>{providerUsed}</div>}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <div style={card}>
                            <div style={{ ...label, color: "#22d78f" }}>aderências</div>
                            {(result.aderencias || []).map((a, i, arr) => (
                                <div key={i} style={{ paddingBottom: "0.6rem", marginBottom: "0.6rem", borderBottom: i < arr.length - 1 ? "1px solid #181828" : "none" }}>
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 3 }}><StatusDot status={a.status} /><span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#c0c0de" }}>{a.criterio}</span></div>
                                    <p style={{ fontSize: "0.69rem", color: "#383858", margin: 0, paddingLeft: 14 }}>{a.detalhe}</p>
                                </div>
                            ))}
                        </div>
                        <div style={card}>
                            <div style={{ ...label, color: "#ff4757" }}>gaps</div>
                            {(result.gaps || []).length === 0 ? <p style={{ fontSize: "0.78rem", color: "#2a2a42" }}>Nenhum gap identificado.</p>
                                : (result.gaps || []).map((g, i, arr) => (
                                    <div key={i} style={{ paddingBottom: "0.6rem", marginBottom: "0.6rem", borderBottom: i < arr.length - 1 ? "1px solid #181828" : "none" }}>
                                        <div style={{ display: "flex", alignItems: "center", marginBottom: 3, flexWrap: "wrap", gap: 4 }}><ImpactoTag impacto={g.impacto} /><span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#c0c0de" }}>{g.criterio}</span></div>
                                        <p style={{ fontSize: "0.69rem", color: "#383858", margin: 0 }}>{g.detalhe}</p>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {(result.diferenciais || []).length > 0 && (
                        <div style={{ ...card, marginBottom: "0.75rem" }}>
                            <div style={{ ...label, color: "#4fc3f7" }}>diferenciais</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {result.diferenciais.map((d, i) => <span key={i} style={{ background: "#0d1825", border: "1px solid #162030", color: "#4fc3f7", fontSize: "0.73rem", padding: "4px 13px", borderRadius: 20 }}>{d}</span>)}
                            </div>
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
                        <div style={card}>
                            <div style={{ ...label, color: "#383858" }}>veredicto</div>
                            <p style={{ fontSize: "0.79rem", color: "#8888a8", lineHeight: 1.65, margin: 0 }}>{result.veredicto}</p>
                        </div>
                        <div style={{ ...card, borderLeft: `3px solid ${scoreColor(result.score)}` }}>
                            <div style={{ ...label, color: scoreColor(result.score) }}>recomendação</div>
                            <p style={{ fontSize: "0.79rem", color: "#c0c0de", lineHeight: 1.65, fontWeight: 500, margin: 0 }}>{result.recomendacao}</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
                        <button onClick={reset} style={{ background: "transparent", border: "1px solid #1e1e32", color: "#383858", padding: "7px 22px", borderRadius: 6, cursor: "pointer", ...mono, fontSize: "0.68rem" }}>
                            → nova análise
                        </button>
                        <button 
                            onClick={handleSaveAnalysis} 
                            disabled={isSaved}
                            style={{ background: isSaved ? "#18182a" : "#22d78f", color: isSaved ? "#22d78f" : "#0b0b11", border: "none", padding: "7px 22px", borderRadius: 6, cursor: isSaved ? "default" : "pointer", fontWeight: 700, fontSize: "0.75rem" }}
                        >
                            {isSaved ? "✓ Salvo no Histórico" : "Salvar Avaliação"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
