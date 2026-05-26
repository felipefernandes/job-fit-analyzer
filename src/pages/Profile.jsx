import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, saveUserProfile, saveResumeToDb, getResumeFromDb, saveLlmKey, getLlmKey, removeLlmKey, deleteUserData } from '../services/db';
import { deleteCurrentUserAccount } from '../services/auth';

export default function Profile() {
    const { user } = useAuth();
    
    // States
    const [profile, setProfile] = useState({ displayName: user?.displayName || '' });
    const [resume, setResume] = useState({ content: '', source: 'markdown', sourceUrl: '' });
    const [keys, setKeys] = useState({ gemini: '', groq: '' });
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

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                const p = await getUserProfile(user.uid);
                if (p) setProfile({ displayName: p.displayName || user.displayName });
                
                const r = await getResumeFromDb(user.uid);
                if (r) setResume(r);
                
                const geminiKey = await getLlmKey(user.uid, 'gemini');
                const groqKey = await getLlmKey(user.uid, 'groq');
                setKeys({ 
                    gemini: geminiKey ? '••••••••' + geminiKey.slice(-4) : '', 
                    groq: groqKey ? '••••••••' + groqKey.slice(-4) : '' 
                });
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

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            setResume({ ...resume, content: evt.target.result, source: 'markdown' });
        };
        reader.readAsText(file);
    };

    const handleSaveKey = async (provider, plainKey) => {
        if (!plainKey || plainKey.startsWith('••••')) return;
        showKeyStatus(provider, `Salvando...`, 'loading', 0);
        try {
            await saveLlmKey(user.uid, provider, plainKey);
            setKeys(prev => ({ ...prev, [provider]: '••••••••' + plainKey.slice(-4) }));
            showKeyStatus(provider, `Salva!`);
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

            <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2 style={{ fontSize: "1.2rem", color: "#00d4ff", margin: 0 }}>Seu Currículo</h2>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button 
                            style={{ ...btnStyle, background: resume.source === 'markdown' ? '#22d78f' : 'transparent', color: resume.source === 'markdown' ? '#0b0b11' : '#8888a8', border: resume.source === 'markdown' ? 'none' : '1px solid #383858', padding: "4px 12px", fontSize: "0.8rem" }}
                            onClick={() => setResume({...resume, source: 'markdown'})}
                        >
                            Texto / Markdown
                        </button>
                        <button 
                            style={{ ...btnStyle, background: resume.source === 'gdocs' ? '#22d78f' : 'transparent', color: resume.source === 'gdocs' ? '#0b0b11' : '#8888a8', border: resume.source === 'gdocs' ? 'none' : '1px solid #383858', padding: "4px 12px", fontSize: "0.8rem" }}
                            onClick={() => setResume({...resume, source: 'gdocs'})}
                        >
                            Google Docs URL
                        </button>
                    </div>
                </div>

                {resume.source === 'markdown' ? (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <p style={{ fontSize: "0.8rem", color: "#8888a8", margin: 0 }}>Cole o conteúdo ou importe um arquivo .md / .txt</p>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                style={{ background: "transparent", border: "1px dashed #383858", color: "#00d4ff", borderRadius: 4, padding: "4px 12px", fontSize: "0.75rem", cursor: "pointer" }}
                            >
                                📤 Importar Arquivo
                            </button>
                            <input type="file" accept=".md,.txt" style={{ display: "none" }} ref={fileInputRef} onChange={handleFileUpload} />
                        </div>
                        <textarea 
                            style={{ ...inputStyle, minHeight: 200, fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical" }} 
                            placeholder="# Seu Nome&#10;Experiência..."
                            value={resume.content}
                            onChange={e => setResume({...resume, content: e.target.value})}
                        />
                    </div>
                ) : (
                    <div>
                        <input 
                            style={inputStyle} 
                            placeholder="https://docs.google.com/document/d/.../edit"
                            value={resume.sourceUrl}
                            onChange={e => setResume({...resume, sourceUrl: e.target.value})}
                        />
                        <p style={{ fontSize: "0.8rem", color: "#8888a8", marginBottom: "1rem" }}>Certifique-se de que o documento está público (Qualquer pessoa com o link).</p>
                    </div>
                )}
                
                <div style={{ display: "flex", alignItems: "center", gap: 15, marginTop: 10 }}>
                    <button style={{ ...btnStyle, flex: 1 }} onClick={handleSaveResume} disabled={resumeStatus.type === 'loading'}>
                        {resumeStatus.type === 'loading' ? 'Processando...' : 'Salvar Currículo'}
                    </button>
                    {renderStatus(resumeStatus)}
                </div>
            </div>

            <div style={card}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#00d4ff" }}>API Keys (LLM Providers)</h2>
                <p style={{ fontSize: "0.85rem", color: "#8888a8", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                    Suas chaves são criptografadas localmente usando sua sessão antes de serem enviadas para o banco de dados. Nós não temos acesso a elas em texto plano.
                </p>

                {['gemini', 'groq'].map(provider => {
                    const providerUrls = {
                        gemini: 'https://aistudio.google.com/app/apikey',
                        groq: 'https://console.groq.com/keys'
                    };
                    
                    return (
                    <div key={provider} style={{ marginBottom: "1.5rem", padding: "1rem", background: "#0b0b11", borderRadius: 4, border: "1px solid #1e1e32" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <strong style={{ textTransform: "capitalize", color: "#e0e0f0", display: "flex", alignItems: "center", gap: 10 }}>
                                {provider} API Key
                                <a href={providerUrls[provider]} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "#8888a8", textDecoration: "underline" }} title={`Obter chave do ${provider}`}>Obter chave ↗</a>
                                {renderStatus(keyStatus[provider])}
                            </strong>
                            {keys[provider] && (
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button style={{ background: "transparent", border: "1px solid #00d4ff", color: "#00d4ff", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer" }} onClick={() => handleTestKey(provider)}>Testar</button>
                                    <button style={{ background: "transparent", border: "1px solid #ff4757", color: "#ff4757", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer" }} onClick={() => handleRemoveKey(provider)}>Remover</button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <input 
                                type="password"
                                style={{ ...inputStyle, marginBottom: 0, flex: 1 }} 
                                placeholder={keys[provider] ? keys[provider] : `Cole sua chave do ${provider}...`}
                                id={`key-${provider}`}
                            />
                            <button 
                                style={{ ...btnStyle, height: "fit-content", flexShrink: 0 }} 
                                disabled={keyStatus[provider]?.type === 'loading'}
                                onClick={() => {
                                    const el = document.getElementById(`key-${provider}`);
                                    if (el.value) {
                                        handleSaveKey(provider, el.value);
                                        el.value = '';
                                    }
                                }}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                    );
                })}
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

        </div>
    );
}
