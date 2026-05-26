import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAnalysesHistory, deleteAnalysis } from '../services/db';

export default function History() {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});

    useEffect(() => {
        const loadHistory = async () => {
            if (!user) return;
            try {
                const data = await getAnalysesHistory(user.uid);
                setHistory(data);
            } catch (e) {
                console.error("Erro ao carregar histórico", e);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [user]);

    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza que deseja excluir esta avaliação do histórico?")) return;
        
        try {
            await deleteAnalysis(user.uid, id);
            setHistory(prev => prev.filter(item => item.id !== id));
        } catch (e) {
            console.error("Erro ao deletar análise", e);
            alert("Não foi possível excluir a avaliação.");
        }
    };

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const scoreColor = (s) => {
        if (s >= 80) return "#22d78f";
        if (s >= 60) return "#4fc3f7";
        if (s >= 40) return "#ffb347";
        return "#ff4757";
    };

    if (loading) return <div style={{ padding: "2rem" }}>Carregando histórico...</div>;

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem" }}>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "2rem", color: "#e0e0f0" }}>Histórico de Avaliações</h1>

            {history.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", background: "#13131f", border: "1px solid #1e1e32", borderRadius: 8, color: "#8888a8" }}>
                    Nenhuma avaliação salva ainda. Faça sua primeira análise.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {history.map(item => (
                        <div key={item.id} style={{ background: "#13131f", border: "1px solid #1e1e32", borderRadius: 8, overflow: "hidden" }}>
                            {/* Header do Card */}
                            <div 
                                style={{ padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: expanded[item.id] ? "#181828" : "transparent" }}
                                onClick={() => toggleExpand(item.id)}
                            >
                                <div>
                                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#e0e0f0", marginBottom: 4 }}>{item.vaga?.titulo || 'Vaga Desconhecida'}</div>
                                    <div style={{ fontSize: "0.85rem", color: "#8888a8" }}>{item.vaga?.empresa || 'Empresa Desconhecida'} • {item.createdAt ? new Date(item.createdAt.toMillis()).toLocaleDateString() : ''}</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: scoreColor(item.score), fontFamily: "'JetBrains Mono', monospace" }}>
                                        {item.score}
                                    </div>
                                    <div style={{ color: "#8888a8", transform: expanded[item.id] ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                                        ▼
                                    </div>
                                </div>
                            </div>
                            
                            {/* Conteúdo Expandido */}
                            {expanded[item.id] && (
                                <div style={{ padding: "1.5rem", borderTop: "1px solid #1e1e32" }}>
                                    
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                                        <div>
                                            <h4 style={{ color: "#22d78f", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.8rem", fontFamily: "'JetBrains Mono', monospace" }}>Aderências</h4>
                                            {item.aderencias?.map((a, i) => (
                                                <div key={i} style={{ marginBottom: "0.5rem" }}>
                                                    <div style={{ fontSize: "0.85rem", color: "#c0c0de", fontWeight: 500 }}>{a.criterio}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "#8888a8", lineHeight: 1.4 }}>{a.detalhe}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 style={{ color: "#ff4757", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.8rem", fontFamily: "'JetBrains Mono', monospace" }}>Gaps</h4>
                                            {item.gaps?.length > 0 ? item.gaps.map((g, i) => (
                                                <div key={i} style={{ marginBottom: "0.5rem" }}>
                                                    <div style={{ fontSize: "0.85rem", color: "#c0c0de", fontWeight: 500 }}>{g.criterio}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "#8888a8", lineHeight: 1.4 }}>{g.detalhe}</div>
                                                </div>
                                            )) : <div style={{ fontSize: "0.85rem", color: "#8888a8" }}>Nenhum gap identificado.</div>}
                                        </div>
                                    </div>

                                    <div style={{ background: "#0b0b11", padding: "1rem", borderRadius: 4, borderLeft: `3px solid ${scoreColor(item.score)}`, marginBottom: "1.5rem" }}>
                                        <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: scoreColor(item.score), marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>Recomendação</div>
                                        <div style={{ fontSize: "0.85rem", color: "#c0c0de", lineHeight: 1.5 }}>{item.recomendacao}</div>
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(item.id);
                                            }}
                                            style={{ background: "transparent", border: "1px solid #ff4757", color: "#ff4757", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 5 }}
                                        >
                                            🗑 Excluir Avaliação
                                        </button>
                                    </div>

                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
