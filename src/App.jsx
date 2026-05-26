import { useState, useEffect } from "react";

// ─── Analysis stages ───────────────────────────────────────────────────────
const STAGES_URL = ["Buscando a vaga na web...", "Lendo requisitos...", "Cruzando com seu perfil...", "Calculando score..."];
const STAGES_TEXT = ["Lendo job description...", "Extraindo requisitos...", "Cruzando com seu perfil...", "Calculando score..."];

// ─── System prompt: only rules + JSON schema ────────────────────────────────
const SYSTEM_PROMPT = `Você é um analisador especializado de fit de carreira. Compare o currículo do candidato com a vaga e retorne SOMENTE um objeto JSON válido — sem texto antes, sem texto depois, sem markdown, sem backticks.

REGRAS DE SCORING:
- 80-100 → Excelente: atende quase todos os mínimos e vários preferenciais
- 60-79  → Bom: atende maioria dos mínimos, poucos gaps críticos
- 40-59  → Parcial: atende alguns mínimos, gaps relevantes
- 0-39   → Fraco: não atende requisitos core

FORMATO DE SAÍDA (JSON puro, nada mais):
{"vaga":{"titulo":"","empresa":"","local":"","nivel":""},"score":0,"fit_categoria":"Excelente|Bom|Parcial|Fraco","aderencias":[{"criterio":"","status":"forte|parcial|fraco","detalhe":""}],"gaps":[{"criterio":"","impacto":"critico|moderado|baixo","detalhe":""}],"diferenciais":[""],"veredicto":"","recomendacao":""}`;

// ─── Helpers ────────────────────────────────────────────────────────────────
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

// ─── Storage helpers ─────────────────────────────────────────────────────────
async function saveResume(text) {
    try {
        if (window.storage && typeof window.storage.set === "function") {
            await window.storage.set("resume_v1", text);
            return true;
        }
        localStorage.setItem("resume_v1", text);
        return true;
    }
    catch { return false; }
}
async function loadResume() {
    try {
        if (window.storage && typeof window.storage.get === "function") {
            const r = await window.storage.get("resume_v1");
            return r ? r.value : null;
        }
        return localStorage.getItem("resume_v1");
    }
    catch { return null; }
}

// ─── API Integrations ────────────────────────────────────────────────────────
const getGeminiApiKey = () => {
    return localStorage.getItem("gemini_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
};

const getGroqApiKey = () => {
    return localStorage.getItem("groq_api_key") || import.meta.env.VITE_GROQ_API_KEY || "";
};

const callGemini = async (userContent, systemPrompt, isUrlMode) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error("Chave do Gemini não configurada. Adicione sua chave nas configurações (ícone ⚙️).");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: userContent }]
            }
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    if (isUrlMode) {
        requestBody.tools = [{ googleSearch: {} }];
    }

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Erro HTTP na API do Gemini: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("A API do Gemini retornou uma resposta vazia.");
    return text;
};

const callGroq = async (userContent, systemPrompt) => {
    const apiKey = getGroqApiKey();
    if (!apiKey) throw new Error("Chave do Groq não configurada. Adicione sua chave nas configurações (ícone ⚙️).");

    const endpoint = "https://api.groq.com/openai/v1/chat/completions";

    const requestBody = {
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" }
    };

    const res = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Erro HTTP na API do Groq: ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("A API do Groq retornou uma resposta vazia.");
    return text;
};

const fetchUrlContent = async (url) => {
    let targetUrl = url;
    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (url.includes("docs.google.com/document") && docIdMatch) {
        targetUrl = `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=txt`;
    }

    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Falha ao acessar o link: ${res.statusText}`);

    let text = await res.text();

    if (text.includes("<html") || text.includes("<body")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const toRemove = doc.querySelectorAll('script, style, nav, footer, iframe, header');
        toRemove.forEach(el => el.remove());
        text = doc.body.innerText || doc.body.textContent || "";
        text = text.replace(/\s+/g, ' ').trim();
    }
    return text;
};

const MUTE_GEMINI = false; // Definido como false (Gemini é o padrão, Groq é o fallback)

const fetchLlm = async (userContent, systemPrompt, isUrlMode) => {
    let geminiErrorMsg = "Gemini mutado no código.";
    if (!MUTE_GEMINI) {
        console.log("Tentando chamada com Gemini 2.5 Flash...");
        try {
            const text = await callGemini(userContent, systemPrompt, isUrlMode);
            return { text, provider: "Gemini" };
        } catch (geminiError) {
            console.warn("Falha no Gemini:", geminiError.message);
            geminiErrorMsg = geminiError.message;
        }
    } else {
        console.log("Gemini está MUTADO. Forçando fallback com Groq...");
    }

    console.log("Tentando chamada com Groq (Llama)...");
    try {
        const text = await callGroq(userContent, systemPrompt);
        return { text, provider: "Groq (Fallback)" };
    } catch (groqError) {
        console.error("Ambos os provedores falharam.");
        throw new Error(`Falha no processamento.\n\n[Erro Gemini]: ${geminiErrorMsg}\n\n[Erro Groq]: ${groqError.message}`);
    }
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function App() {
    const [view, setView] = useState("loading"); // loading | setup | analyze
    const [resume, setResume] = useState("");
    const [resumeDraft, setResumeDraft] = useState("");
    const [mode, setMode] = useState("url");
    const [url, setUrl] = useState("");
    const [jdText, setJdText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [stage, setStage] = useState(0);
    const [debugText, setDebugText] = useState("");
    const [editingResume, setEditingResume] = useState(false);

    // LLM state
    const [providerUsed, setProviderUsed] = useState("");

    // Google Docs setup/import states
    const [setupMode, setSetupMode] = useState("paste"); // paste | gdocs
    const [gdocsUrl, setGdocsUrl] = useState("");
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState(null);
    const [importStage, setImportStage] = useState(0);

    // LLM API Key Settings states
    const [showSettings, setShowSettings] = useState(false);
    const [geminiKeyInput, setGeminiKeyInput] = useState(localStorage.getItem("gemini_api_key") || "");
    const [groqKeyInput, setGroqKeyInput] = useState(localStorage.getItem("groq_api_key") || "");

    const handleSaveSettings = () => {
        localStorage.setItem("gemini_api_key", geminiKeyInput.trim());
        localStorage.setItem("groq_api_key", groqKeyInput.trim());
        setShowSettings(false);
    };

    const IMPORT_STAGES = [
        "Acessando o Google Docs...",
        "Lendo conteúdo...",
        "Processando estrutura...",
        "Convertendo para Markdown..."
    ];

    const STAGES = mode === "url" ? STAGES_URL : STAGES_TEXT;

    useEffect(() => {
        if (!importing) return;
        const iv = setInterval(() => setImportStage(s => (s + 1) % IMPORT_STAGES.length), 2000);
        return () => clearInterval(iv);
    }, [importing]);

    const handleImportGDocs = async () => {
        if (!gdocsUrl.trim() || importing) return;
        setImporting(true);
        setImportError(null);
        setImportStage(0);

        try {
            // 1. Raspagem do documento do Google Docs no cliente
            setImportStage(1); // Lendo conteúdo...
            const documentText = await fetchUrlContent(gdocsUrl);
            if (!documentText.trim()) throw new Error("O documento do Google Docs está vazio.");

            // 2. Envio do conteúdo limpo para a LLM estruturar em Markdown
            setImportStage(3); // Convertendo para Markdown...
            const userContent = `Aqui está o conteúdo do currículo extraído: \n\n${documentText}\n\nPor favor, formate e estruture esse currículo em formato Markdown limpo (sem tags de bloco de código como \`\`\`markdown, sem introduções ou observações).`;
            const systemPrompt = "Você é um formatador de currículos especializado. Receba o texto bruto de um currículo e converta-o em Markdown limpo e bem estruturado. Retorne APENAS o markdown correspondente ao currículo, sem qualquer texto introdutório, sem tags de bloco de código (```markdown) e sem observações adicionais.";

            const { text, provider } = await fetchLlm(userContent, systemPrompt, false);
            console.log(`Documento importado com sucesso via ${provider}`);

            let cleanedText = text;
            if (cleanedText.startsWith("```markdown")) {
                cleanedText = cleanedText.replace(/^```markdown\n/, "").replace(/\n```$/, "");
            } else if (cleanedText.startsWith("```")) {
                cleanedText = cleanedText.replace(/^```\n/, "").replace(/\n```$/, "");
            }

            cleanedText = cleanedText.trim();

            const ok = await saveResume(cleanedText);
            if (ok) {
                setResume(cleanedText);
                setResumeDraft(cleanedText);
                setView("analyze");
                setEditingResume(false);
            } else {
                throw new Error("Erro ao salvar o currículo importado localmente.");
            }
        } catch (err) {
            setImportError(err.message || "Erro inesperado ao importar o documento.");
            console.error(err);
        } finally {
            setImporting(false);
        }
    };

    // Load resume from storage on mount
    useEffect(() => {
        loadResume().then(saved => {
            if (saved) { setResume(saved); setResumeDraft(saved); setView("analyze"); }
            else { setView("setup"); }
        });
    }, []);

    useEffect(() => {
        if (!loading) return;
        const iv = setInterval(() => setStage(s => (s + 1) % STAGES.length), 2500);
        return () => clearInterval(iv);
    }, [loading]);

    const handleSaveResume = async () => {
        if (!resumeDraft.trim()) return;
        const ok = await saveResume(resumeDraft.trim());
        if (ok) { setResume(resumeDraft.trim()); setView("analyze"); setEditingResume(false); }
        else { alert("Erro ao salvar. Tente novamente."); }
    };

    const canAnalyze = resume.trim().length > 0 && (mode === "url" ? url.trim().length > 0 : jdText.trim().length > 50);

    const analyze = async () => {
        if (!canAnalyze || loading) return;
        setLoading(true); setResult(null); setError(null); setDebugText(""); setStage(0);

        try {
            let extractedJd = jdText;
            if (mode === "url") {
                setStage(0); // "Buscando a vaga na web..."
                try {
                    extractedJd = await fetchUrlContent(url);
                    if (!extractedJd.trim()) throw new Error("A página da vaga retornou conteúdo vazio.");
                } catch (scrapeErr) {
                    throw new Error(`Falha ao raspar a vaga do link:\n${scrapeErr.message}\n\nCertifique-se de que a vaga é pública ou cole a descrição manualmente na aba "Colar texto".`);
                }
                setStage(1); // "Lendo requisitos..."
            }

            const jobSection = `VAGA (conteúdo extraído):\n${extractedJd}`;
            const userContent = `CURRÍCULO DO CANDIDATO:\n${resume}\n\n---\n\n${jobSection}\n\n---\n\nAnalise o fit e retorne o JSON.`;

            const { text, provider } = await fetchLlm(userContent, SYSTEM_PROMPT, false);

            console.log(`Análise concluída com sucesso via ${provider}`);
            setDebugText(text);
            setProviderUsed(provider);

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error(`A API não retornou um JSON válido. Resposta recebida:\n\n"${text.slice(0, 300)}..."`);
            const parsed = JSON.parse(jsonMatch[0]);
            setResult(parsed);
        } catch (err) {
            setError(err instanceof SyntaxError ? "JSON malformado na resposta. Tente novamente." : (err.message || "Erro inesperado."));
            console.error(err);
        } finally { setLoading(false); }
    };

    const reset = () => { setResult(null); setUrl(""); setJdText(""); setError(null); setDebugText(""); };
    const switchMode = (m) => { setMode(m); setError(null); setResult(null); setDebugText(""); };

    // ── Styles ────────────────────────────────────────────────────────────────
    const card = { background: "#13131f", border: "1px solid #1e1e32", borderRadius: 10, padding: "1.25rem" };
    const mono = { fontFamily: "'JetBrains Mono',monospace" };
    const label = { ...mono, fontSize: "0.58rem", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "0.875rem" };

    // ── Loading screen ────────────────────────────────────────────────────────
    if (view === "loading") return (
        <div style={{ minHeight: "100vh", background: "#0b0b11", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ ...mono, fontSize: "0.72rem", color: "#22d78f" }}>carregando...</span>
        </div>
    );

    // ── Setup screen ──────────────────────────────────────────────────────────
    if (view === "setup" || editingResume) return (
        <div style={{ minHeight: "100vh", background: "#0b0b11", color: "#ddddf5", padding: "2rem 1.5rem", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
                *{box-sizing:border-box;margin:0;padding:0}
                ::placeholder{color:#2a2a42}
                textarea{caret-color:#22d78f;resize:vertical}
                input{caret-color:#22d78f}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2} }
                button:hover:not(:disabled){opacity:0.85}
            `}</style>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <div style={{ ...mono, fontSize: "0.62rem", color: "#22d78f", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 8 }}>
                    your career intel
                </div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.025em", color: "#eeeef8", marginBottom: "0.4rem" }}>
                    {editingResume ? "Atualizar currículo" : "Configurar currículo"}
                </h1>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: "1.5rem", flexWrap: "wrap" }}>
                    <p style={{ fontSize: "0.8rem", color: "#383858" }}>
                        {editingResume ? "Cole seu currículo em Markdown ou forneça um link do Google Docs." : "Cole seu currículo em texto/markdown ou forneça um link público do Google Docs. Salvo localmente."}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: "#383858", fontSize: "0.72rem", cursor: "pointer", ...mono, letterSpacing: "0.05em", padding: 0 }}>
                            configurações ⚙️
                        </button>
                        <span style={{ color: "#1e1e32" }}>·</span>
                        <span style={{ fontSize: "0.72rem", color: "#484868", ...mono }}>ia: {MUTE_GEMINI ? "groq (llama 3.3)" : "gemini 2.5"}</span>
                    </div>
                </div>

                {/* Alternador de abas */}
                <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", background: "#13131f", border: "1px solid #1e1e32", borderRadius: 8, padding: 4, width: "fit-content" }}>
                    <button
                        onClick={() => { setSetupMode("paste"); setImportError(null); }}
                        disabled={importing}
                        style={{
                            background: setupMode === "paste" ? "#22d78f" : "transparent",
                            color: setupMode === "paste" ? "#0b0b11" : "#484868",
                            border: "none",
                            borderRadius: 5,
                            padding: "6px 16px",
                            fontFamily: "'DM Sans',sans-serif",
                            fontSize: "0.76rem",
                            fontWeight: setupMode === "paste" ? 700 : 400,
                            cursor: importing ? "wait" : "pointer",
                            transition: "all 0.15s"
                        }}
                    >
                        📋 Colar Markdown
                    </button>
                    <button
                        onClick={() => { setSetupMode("gdocs"); setImportError(null); }}
                        disabled={importing}
                        style={{
                            background: setupMode === "gdocs" ? "#22d78f" : "transparent",
                            color: setupMode === "gdocs" ? "#0b0b11" : "#484868",
                            border: "none",
                            borderRadius: 5,
                            padding: "6px 16px",
                            fontFamily: "'DM Sans',sans-serif",
                            fontSize: "0.76rem",
                            fontWeight: setupMode === "gdocs" ? 700 : 400,
                            cursor: importing ? "wait" : "pointer",
                            transition: "all 0.15s"
                        }}
                    >
                        🔗 Google Docs Público
                    </button>
                </div>

                {setupMode === "paste" ? (
                    <>
                        <div style={{ ...card }}>
                            <div style={{ ...label, color: "#383858" }}>currículo (markdown / texto)</div>
                            <textarea
                                value={resumeDraft}
                                onChange={e => setResumeDraft(e.target.value)}
                                rows={18}
                                placeholder="# Felipe Fernandes&#10;AI Solutions Engineer...&#10;&#10;Cole aqui o conteúdo completo do seu currículo."
                                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#ddddf5", fontSize: "0.8rem", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65 }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: "1rem", justifyContent: "flex-end" }}>
                            {editingResume && (
                                <button onClick={() => setEditingResume(false)} style={{ background: "transparent", border: "1px solid #1e1e32", color: "#484868", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: "0.76rem", ...mono, letterSpacing: "0.05em" }}>
                                    cancelar
                                </button>
                            )}
                            <button
                                onClick={handleSaveResume}
                                disabled={!resumeDraft.trim()}
                                style={{ background: resumeDraft.trim() ? "#22d78f" : "#18182a", color: resumeDraft.trim() ? "#0b0b11" : "#333352", border: "none", borderRadius: 6, padding: "8px 24px", cursor: resumeDraft.trim() ? "pointer" : "default", fontSize: "0.76rem", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}
                            >
                                salvar e continuar →
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ ...card }}>
                            <div style={{ ...label, color: "#383858" }}>Link do Google Docs Público</div>
                            <input
                                type="url"
                                value={gdocsUrl}
                                onChange={e => setGdocsUrl(e.target.value)}
                                placeholder="https://docs.google.com/document/d/.../edit?usp=sharing"
                                disabled={importing}
                                style={{
                                    width: "100%",
                                    background: "transparent",
                                    border: "none",
                                    borderBottom: "1px solid #1e1e32",
                                    outline: "none",
                                    color: "#ddddf5",
                                    fontSize: "0.83rem",
                                    paddingBottom: 8,
                                    marginBottom: 12,
                                    ...mono
                                }}
                            />
                            <p style={{ fontSize: "0.7rem", color: "#383858", lineHeight: 1.45 }}>
                                Certifique-se de que as permissões do documento estão configuradas para **"Qualquer pessoa com o link pode ler"**. O sistema acessará o conteúdo através de busca inteligente de IA e o converterá em Markdown.
                            </p>
                        </div>

                        {importing && (
                            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.875rem 1.25rem", ...card, marginTop: "1rem" }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d78f", display: "inline-block", animation: "blink 1s infinite", flexShrink: 0 }} />
                                <span style={{ ...mono, fontSize: "0.76rem", color: "#22d78f" }}>{IMPORT_STAGES[importStage]}</span>
                            </div>
                        )}

                        {importError && (
                            <div style={{ padding: "0.875rem 1.25rem", background: "#160a0a", border: "1px solid #3a1515", borderRadius: 8, color: "#ff7070", fontSize: "0.8rem", marginTop: "1rem", lineHeight: 1.6 }}>
                                ⚠ {importError}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: 10, marginTop: "1rem", justifyContent: "flex-end" }}>
                            {editingResume && !importing && (
                                <button onClick={() => setEditingResume(false)} style={{ background: "transparent", border: "1px solid #1e1e32", color: "#484868", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: "0.76rem", ...mono, letterSpacing: "0.05em" }}>
                                    cancelar
                                </button>
                            )}
                            <button
                                onClick={handleImportGDocs}
                                disabled={!gdocsUrl.trim() || importing}
                                style={{ background: gdocsUrl.trim() && !importing ? "#22d78f" : "#18182a", color: gdocsUrl.trim() && !importing ? "#0b0b11" : "#333352", border: "none", borderRadius: 6, padding: "8px 24px", cursor: gdocsUrl.trim() && !importing ? "pointer" : "default", fontSize: "0.76rem", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}
                            >
                                {importing ? "importando..." : "importar currículo →"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    // ── Analyze screen ────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: "100vh", background: "#0b0b11", color: "#ddddf5", padding: "2rem 1.5rem", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} ::placeholder{color:#2a2a42} input,textarea{caret-color:#22d78f} textarea{resize:vertical}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        button:hover:not(:disabled){opacity:0.85}
      `}</style>

            <div style={{ maxWidth: 840, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: "1.75rem" }}>
                    <div style={{ ...mono, fontSize: "0.62rem", color: "#22d78f", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 8 }}>
                        felipe fernandes · career intel
                    </div>
                    <h1 style={{ fontSize: "1.65rem", fontWeight: 600, letterSpacing: "-0.025em", color: "#eeeef8" }}>Job Fit Analyzer</h1>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", color: "#22d78f" }}>✓ currículo carregado</span>
                        <span style={{ color: "#1e1e32" }}>·</span>
                        <button onClick={() => { setResumeDraft(resume); setEditingResume(true); }} style={{ background: "none", border: "none", color: "#383858", fontSize: "0.72rem", cursor: "pointer", ...mono, letterSpacing: "0.05em", padding: 0 }}>
                            atualizar ↗
                        </button>
                        <span style={{ color: "#1e1e32" }}>·</span>
                        <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: "#383858", fontSize: "0.72rem", cursor: "pointer", ...mono, letterSpacing: "0.05em", padding: 0 }}>
                            configurações ⚙️
                        </button>
                        <span style={{ color: "#1e1e32" }}>·</span>
                        <span style={{ fontSize: "0.72rem", color: "#484868", ...mono }}>ia: {MUTE_GEMINI ? "groq (llama 3.3)" : "gemini 2.5"}</span>
                    </div>
                </div>

                {/* Mode toggle */}
                <div style={{ display: "flex", gap: 4, marginBottom: "0.875rem", background: "#13131f", border: "1px solid #1e1e32", borderRadius: 8, padding: 4, width: "fit-content" }}>
                    {[{ key: "url", label: "🔗  Link da vaga" }, { key: "text", label: "📋  Colar texto" }].map(({ key, label }) => (
                        <button key={key} onClick={() => switchMode(key)} style={{ background: mode === key ? "#22d78f" : "transparent", color: mode === key ? "#0b0b11" : "#484868", border: "none", borderRadius: 5, padding: "6px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.76rem", fontWeight: mode === key ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* URL input */}
                {mode === "url" && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", ...card, padding: "10px 14px", marginBottom: "1.25rem" }}>
                        <span style={{ ...mono, fontSize: "0.85rem", color: "#22d78f", flexShrink: 0 }}>$_</span>
                        <input
                            type="url"
                            placeholder="https://careers.empresa.com/vaga-id"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && analyze()}
                            disabled={loading}
                            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#ddddf5", fontSize: "0.83rem", ...mono }}
                        />
                        <button onClick={analyze} disabled={loading || !canAnalyze} style={{ background: loading || !canAnalyze ? "#18182a" : "#22d78f", color: loading || !canAnalyze ? "#333352" : "#0b0b11", border: "none", borderRadius: 6, padding: "7px 18px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: loading ? "wait" : !canAnalyze ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0 }}>
                            {loading ? "···" : "Analisar"}
                        </button>
                    </div>
                )}

                {/* Text input */}
                {mode === "text" && (
                    <div style={{ ...card, padding: "12px 14px", marginBottom: "1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                            <span style={{ ...label, color: "#383858", marginBottom: 0, paddingTop: 2 }}>job description</span>
                            <button onClick={analyze} disabled={loading || !canAnalyze} style={{ background: loading || !canAnalyze ? "#18182a" : "#22d78f", color: loading || !canAnalyze ? "#333352" : "#0b0b11", border: "none", borderRadius: 6, padding: "6px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: loading ? "wait" : !canAnalyze ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0 }}>
                                {loading ? "···" : "Analisar"}
                            </button>
                        </div>
                        <textarea
                            placeholder="Cole aqui o texto completo da vaga..."
                            value={jdText}
                            onChange={e => setJdText(e.target.value)}
                            disabled={loading}
                            rows={10}
                            style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#ddddf5", fontSize: "0.8rem", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}
                        />
                        {jdText.trim().length > 0 && jdText.trim().length < 50 && (
                            <div style={{ fontSize: "0.68rem", color: "#ffb347", marginTop: 6, ...mono }}>texto muito curto para análise</div>
                        )}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.875rem 1.25rem", ...card, marginBottom: "1rem" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d78f", display: "inline-block", animation: "blink 1s infinite", flexShrink: 0 }} />
                        <span style={{ ...mono, fontSize: "0.76rem", color: "#22d78f" }}>{STAGES[stage]}</span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{ padding: "0.875rem 1.25rem", background: "#160a0a", border: "1px solid #3a1515", borderRadius: 8, color: "#ff7070", fontSize: "0.8rem", marginBottom: "1rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        ⚠ {error}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div style={{ animation: "fadeUp 0.35s ease" }}>

                        {/* Job + Score */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", ...card, marginBottom: "0.75rem", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#eeeef8", marginBottom: 5 }}>{result.vaga?.titulo || "Vaga"}</div>
                                <div style={{ fontSize: "0.76rem", color: "#383858" }}>
                                    {[result.vaga?.empresa, result.vaga?.local, result.vaga?.nivel].filter(Boolean).join("  ·  ")}
                                </div>
                            </div>
                            <div style={{ textAlign: "center", flexShrink: 0 }}>
                                <div style={{ ...mono, fontSize: "3.6rem", fontWeight: 700, lineHeight: 1, color: scoreColor(result.score) }}>{result.score}</div>
                                <div style={{ fontSize: "0.62rem", color: scoreColor(result.score), letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginTop: 3 }}>{result.fit_categoria}</div>
                                {providerUsed && (
                                    <div style={{ ...mono, fontSize: "0.45rem", color: "#383858", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4 }}>
                                        {providerUsed}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Aderências + Gaps */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div style={card}>
                                <div style={{ ...label, color: "#22d78f" }}>aderências</div>
                                {(result.aderencias || []).map((a, i, arr) => (
                                    <div key={i} style={{ paddingBottom: "0.6rem", marginBottom: "0.6rem", borderBottom: i < arr.length - 1 ? "1px solid #181828" : "none" }}>
                                        <div style={{ display: "flex", alignItems: "center", marginBottom: 3 }}><StatusDot status={a.status} /><span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#c0c0de" }}>{a.criterio}</span></div>
                                        <p style={{ fontSize: "0.69rem", color: "#383858", margin: 0, paddingLeft: 14, lineHeight: 1.45 }}>{a.detalhe}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={card}>
                                <div style={{ ...label, color: "#ff4757" }}>gaps</div>
                                {(result.gaps || []).length === 0 ? <p style={{ fontSize: "0.78rem", color: "#2a2a42" }}>Nenhum gap identificado.</p>
                                    : (result.gaps || []).map((g, i, arr) => (
                                        <div key={i} style={{ paddingBottom: "0.6rem", marginBottom: "0.6rem", borderBottom: i < arr.length - 1 ? "1px solid #181828" : "none" }}>
                                            <div style={{ display: "flex", alignItems: "center", marginBottom: 3, flexWrap: "wrap", gap: 4 }}><ImpactoTag impacto={g.impacto} /><span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#c0c0de" }}>{g.criterio}</span></div>
                                            <p style={{ fontSize: "0.69rem", color: "#383858", margin: 0, lineHeight: 1.45 }}>{g.detalhe}</p>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Diferenciais */}
                        {(result.diferenciais || []).length > 0 && (
                            <div style={{ ...card, marginBottom: "0.75rem" }}>
                                <div style={{ ...label, color: "#4fc3f7" }}>diferenciais</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {result.diferenciais.map((d, i) => <span key={i} style={{ background: "#0d1825", border: "1px solid #162030", color: "#4fc3f7", fontSize: "0.73rem", padding: "4px 13px", borderRadius: 20 }}>{d}</span>)}
                                </div>
                            </div>
                        )}

                        {/* Veredicto + Recomendação */}
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

                        <div style={{ textAlign: "center" }}>
                            <button onClick={reset} style={{ background: "transparent", border: "1px solid #1e1e32", color: "#383858", padding: "7px 22px", borderRadius: 6, cursor: "pointer", ...mono, fontSize: "0.68rem", letterSpacing: "0.1em" }}>
                                → nova análise
                            </button>
                        </div>
                    </div>
                )}

                {!result && !loading && !error && (
                    <div style={{ marginTop: "2.5rem", ...mono, fontSize: "0.58rem", color: "#1c1c2e", textAlign: "center", letterSpacing: "0.05em" }}>
                        {mode === "url" ? "cole a url · pressione enter · aguarde a análise" : "cole o texto da vaga · clique em analisar"}
                    </div>
                )}
            </div>

            {/* Configurações Modal */}
            {showSettings && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(11, 11, 17, 0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
                    <div style={{ ...card, maxWidth: 500, width: "100%", animation: "fadeUp 0.25s ease" }}>
                        <div style={{ ...mono, fontSize: "0.62rem", color: "#22d78f", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 8 }}>
                            configurações
                        </div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#eeeef8", marginBottom: "1rem" }}>Chaves de API (LLM)</h2>
                        
                        <p style={{ fontSize: "0.78rem", color: "#686888", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                            Para usar o analisador publicamente de forma segura, insira suas chaves de API abaixo. Elas serão salvas localmente apenas no seu navegador (<code style={{color: "#4fc3f7"}}>localStorage</code>) e nunca serão compartilhadas.
                        </p>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ ...label, color: "#8888a8", display: "block", marginBottom: 6 }}>Chave Gemini API (Google)</label>
                            <input
                                type="password"
                                placeholder={import.meta.env.VITE_GEMINI_API_KEY ? "Chave padrão configurada no sistema" : "Cole sua API key do Gemini..."}
                                value={geminiKeyInput}
                                onChange={e => setGeminiKeyInput(e.target.value)}
                                style={{ width: "100%", background: "#0b0b11", border: "1px solid #1e1e32", borderRadius: 6, padding: "10px 12px", color: "#ddddf5", fontSize: "0.8rem", outline: "none", fontFamily: "'JetBrains Mono', monospace" }}
                            />
                            <div style={{ fontSize: "0.65rem", color: "#484868", marginTop: 4 }}>
                                Obtenha em: <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: "#22d78f", textDecoration: "none" }}>Google AI Studio</a>
                            </div>
                        </div>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ ...label, color: "#8888a8", display: "block", marginBottom: 6 }}>Chave Groq API (Llama Fallback)</label>
                            <input
                                type="password"
                                placeholder={import.meta.env.VITE_GROQ_API_KEY ? "Chave padrão configurada no sistema" : "Cole sua API key da Groq..."}
                                value={groqKeyInput}
                                onChange={e => setGroqKeyInput(e.target.value)}
                                style={{ width: "100%", background: "#0b0b11", border: "1px solid #1e1e32", borderRadius: 6, padding: "10px 12px", color: "#ddddf5", fontSize: "0.8rem", outline: "none", fontFamily: "'JetBrains Mono', monospace" }}
                            />
                            <div style={{ fontSize: "0.65rem", color: "#484868", marginTop: 4 }}>
                                Obtenha em: <a href="https://console.groq.com/" target="_blank" rel="noreferrer" style={{ color: "#22d78f", textDecoration: "none" }}>Groq Console</a>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "1px solid #1e1e32", color: "#484868", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: "0.76rem", ...mono, letterSpacing: "0.05em" }}>
                                cancelar
                            </button>
                            <button onClick={handleSaveSettings} style={{ background: "#22d78f", color: "#0b0b11", border: "none", borderRadius: 6, padding: "8px 24px", cursor: "pointer", fontSize: "0.76rem", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
