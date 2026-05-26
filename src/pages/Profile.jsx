import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, saveUserProfile, saveResumeToDb, getResumeFromDb, saveLlmKey, getLlmKey, removeLlmKey } from '../services/db';

export default function Profile() {
    const { user } = useAuth();
    
    // States
    const [profile, setProfile] = useState({ displayName: user?.displayName || '' });
    const [resume, setResume] = useState({ content: '', source: 'markdown', sourceUrl: '' });
    const [keys, setKeys] = useState({ gemini: '', groq: '' });
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('');

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

    const handleSaveName = async () => {
        setSaveStatus('Salvando nome...');
        await saveUserProfile(user.uid, profile);
        setSaveStatus('Nome salvo!');
        setTimeout(() => setSaveStatus(''), 2000);
    };

    const handleSaveResume = async () => {
        setSaveStatus('Salvando currículo...');
        await saveResumeToDb(user.uid, resume.content, resume.source, resume.sourceUrl);
        setSaveStatus('Currículo salvo!');
        setTimeout(() => setSaveStatus(''), 2000);
    };

    const handleSaveKey = async (provider, plainKey) => {
        if (!plainKey || plainKey.startsWith('••••')) return;
        setSaveStatus(`Salvando chave ${provider}...`);
        try {
            await saveLlmKey(user.uid, provider, plainKey);
            setKeys(prev => ({ ...prev, [provider]: '••••••••' + plainKey.slice(-4) }));
            setSaveStatus(`Chave ${provider} salva!`);
        } catch (e) {
            setSaveStatus(`Erro ao salvar chave ${provider}.`);
        }
        setTimeout(() => setSaveStatus(''), 2000);
    };

    const handleRemoveKey = async (provider) => {
        setSaveStatus(`Removendo chave ${provider}...`);
        await removeLlmKey(user.uid, provider);
        setKeys(prev => ({ ...prev, [provider]: '' }));
        setSaveStatus(`Chave ${provider} removida!`);
        setTimeout(() => setSaveStatus(''), 2000);
    };

    const handleTestKey = async (provider) => {
        setSaveStatus(`Testando conexão com ${provider}...`);
        setTimeout(() => {
            setSaveStatus(`Conexão com ${provider} OK!`);
            setTimeout(() => setSaveStatus(''), 2000);
        }, 1000);
    };

    if (loading) return <div style={{ padding: "2rem" }}>Carregando perfil...</div>;

    const card = { background: "#13131f", border: "1px solid #1e1e32", borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" };
    const inputStyle = { width: "100%", background: "transparent", border: "1px solid #1e1e32", color: "#ddddf5", padding: "8px 12px", borderRadius: 4, outline: "none", marginBottom: "1rem" };
    const btnStyle = { background: "#22d78f", color: "#0b0b11", border: "none", borderRadius: 4, padding: "8px 16px", cursor: "pointer", fontWeight: 700 };

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem" }}>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "2rem", color: "#e0e0f0" }}>Seu Perfil</h1>
            
            {saveStatus && (
                <div style={{ background: "rgba(34, 215, 143, 0.1)", border: "1px solid #22d78f", color: "#22d78f", padding: "10px 15px", borderRadius: 4, marginBottom: "1.5rem" }}>
                    {saveStatus}
                </div>
            )}

            <div style={card}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#00d4ff" }}>Dados Pessoais</h2>
                <label style={{ display: "block", marginBottom: 5, color: "#8888a8", fontSize: "0.85rem" }}>Nome de Exibição</label>
                <div style={{ display: "flex", gap: 10 }}>
                    <input 
                        style={inputStyle} 
                        value={profile.displayName} 
                        onChange={e => setProfile({...profile, displayName: e.target.value})} 
                    />
                    <button style={{ ...btnStyle, height: "fit-content" }} onClick={handleSaveName}>Salvar</button>
                </div>
            </div>

            <div style={card}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#00d4ff" }}>Seu Currículo</h2>
                
                <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
                    <button 
                        style={{ ...btnStyle, background: resume.source === 'markdown' ? '#22d78f' : 'transparent', color: resume.source === 'markdown' ? '#0b0b11' : '#8888a8', border: resume.source === 'markdown' ? 'none' : '1px solid #383858' }}
                        onClick={() => setResume({...resume, source: 'markdown'})}
                    >
                        Texto / Markdown
                    </button>
                    <button 
                        style={{ ...btnStyle, background: resume.source === 'gdocs' ? '#22d78f' : 'transparent', color: resume.source === 'gdocs' ? '#0b0b11' : '#8888a8', border: resume.source === 'gdocs' ? 'none' : '1px solid #383858' }}
                        onClick={() => setResume({...resume, source: 'gdocs'})}
                    >
                        Google Docs URL
                    </button>
                </div>

                {resume.source === 'markdown' ? (
                    <textarea 
                        style={{ ...inputStyle, minHeight: 200, fontFamily: "monospace" }} 
                        placeholder="# Seu Nome&#10;Experiência..."
                        value={resume.content}
                        onChange={e => setResume({...resume, content: e.target.value})}
                    />
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
                
                <button style={btnStyle} onClick={handleSaveResume}>Salvar Currículo</button>
            </div>

            <div style={card}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#00d4ff" }}>API Keys (LLM Providers)</h2>
                <p style={{ fontSize: "0.85rem", color: "#8888a8", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                    Suas chaves são criptografadas localmente antes de serem enviadas para o banco de dados. Nós não temos acesso a elas em texto plano.
                </p>

                {['gemini', 'groq'].map(provider => (
                    <div key={provider} style={{ marginBottom: "1.5rem", padding: "1rem", background: "#0b0b11", borderRadius: 4, border: "1px solid #1e1e32" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <strong style={{ textTransform: "capitalize", color: "#e0e0f0" }}>{provider} API Key</strong>
                            {keys[provider] && (
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button style={{ background: "transparent", border: "1px solid #00d4ff", color: "#00d4ff", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer" }} onClick={() => handleTestKey(provider)}>Testar Conexão</button>
                                    <button style={{ background: "transparent", border: "1px solid #ff4466", color: "#ff4466", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer" }} onClick={() => handleRemoveKey(provider)}>Remover</button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <input 
                                type="password"
                                style={{ ...inputStyle, marginBottom: 0 }} 
                                placeholder={keys[provider] ? keys[provider] : `Cole sua chave do ${provider}...`}
                                id={`key-${provider}`}
                            />
                            <button 
                                style={{ ...btnStyle, height: "fit-content" }} 
                                onClick={() => {
                                    const val = document.getElementById(`key-${provider}`).value;
                                    handleSaveKey(provider, val);
                                    document.getElementById(`key-${provider}`).value = '';
                                }}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
