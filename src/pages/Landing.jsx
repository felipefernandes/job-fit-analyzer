import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginWithGoogle } from '../services/auth';

export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Redirecionar se já estiver logado
    React.useEffect(() => {
        if (user) {
            navigate('/app');
        }
    }, [user, navigate]);

    const handleLogin = async () => {
        try {
            await loginWithGoogle();
            navigate('/app');
        } catch (error) {
            console.error(error);
        }
    };

    const scrollToCta = () => {
        const ctaSection = document.getElementById('cta-section');
        if (ctaSection) {
            ctaSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a14", color: "#c0c0de", fontFamily: "'IBM Plex Sans', 'Space Grotesk', 'Satoshi', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
                .mono { font-family: 'JetBrains Mono', monospace; }
                .text-green { color: #00ff88; }
                .text-cyan { color: #00d4ff; }
                .bg-card { background: #12121e; border: 1px solid #1e1e32; border-radius: 8px; }
                
                .hero-title { font-size: 2.5rem; font-weight: 700; color: #e0e0f0; margin-bottom: 1rem; line-height: 1.2; }
                .hero-subtitle { font-size: 1.1rem; color: #8888a8; max-width: 600px; margin: 0 auto 2.5rem; line-height: 1.6; }
                
                .btn-primary { 
                    background: transparent; color: #00ff88; border: 1px solid #00ff88; 
                    padding: 12px 24px; border-radius: 4px; font-weight: 700; cursor: pointer; 
                    transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.1em;
                    box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
                }
                .btn-primary:hover { background: rgba(0, 255, 136, 0.1); box-shadow: 0 0 20px rgba(0, 255, 136, 0.4); }
                
                @media (min-width: 768px) {
                    .hero-title { font-size: 3.5rem; }
                    .hero-subtitle { font-size: 1.25rem; }
                    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
                    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; }
                }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .cursor { animation: blink 1s step-end infinite; }
            `}</style>

            {/* Section 1 - Hero */}
            <header style={{ padding: "6rem 1.5rem 4rem", textAlign: "center", borderBottom: "1px solid #1e1e32" }}>
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                    <div className="mono text-green" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "1rem" }}>
                        $ ./job-fit-analyzer.sh <span className="cursor">_</span>
                    </div>
                    <h1 className="hero-title">
                        Descubra seu fit com qualquer vaga. Em segundos.
                    </h1>
                    <p className="hero-subtitle">
                        Cole seu currículo, cole a vaga, receba um score de compatibilidade gerado por IA. Simples assim.
                    </p>
                    <button className="btn-primary mono" onClick={scrollToCta}>
                        Experimente Agora →
                    </button>
                    <div style={{ marginTop: "2rem", fontSize: "0.75rem", color: "#686888" }} className="mono">
                        Open Source · Gratuito · Seus dados, suas chaves
                    </div>
                </div>
            </header>

            {/* Section 2 - Como Funciona */}
            <section style={{ padding: "5rem 1.5rem", maxWidth: 1000, margin: "0 auto" }}>
                <h2 className="mono" style={{ color: "#e0e0f0", fontSize: "1.5rem", marginBottom: "3rem", textAlign: "center" }}>
                    // Como Funciona
                </h2>
                <div className="grid-3">
                    <div className="bg-card" style={{ padding: "2rem" }}>
                        <div className="mono text-cyan" style={{ marginBottom: "1rem" }}>01_</div>
                        <h3 style={{ color: "#e0e0f0", marginBottom: "0.5rem" }}>Envie seu currículo</h3>
                        <p style={{ color: "#8888a8", fontSize: "0.9rem", lineHeight: 1.5 }}>
                            MD, texto, ou link de Google Docs público. Salvo localmente ou no seu perfil seguro.
                        </p>
                    </div>
                    <div className="bg-card" style={{ padding: "2rem" }}>
                        <div className="mono text-cyan" style={{ marginBottom: "1rem" }}>02_</div>
                        <h3 style={{ color: "#e0e0f0", marginBottom: "0.5rem" }}>Cole a vaga</h3>
                        <p style={{ color: "#8888a8", fontSize: "0.9rem", lineHeight: 1.5 }}>
                            Forneça a URL ou o texto direto do anúncio da vaga que deseja analisar.
                        </p>
                    </div>
                    <div className="bg-card" style={{ padding: "2rem" }}>
                        <div className="mono text-cyan" style={{ marginBottom: "1rem" }}>03_</div>
                        <h3 style={{ color: "#e0e0f0", marginBottom: "0.5rem" }}>Receba seu score</h3>
                        <p style={{ color: "#8888a8", fontSize: "0.9rem", lineHeight: 1.5 }}>
                            Obtenha uma análise detalhada de 0 a 100, identificando pontos de fit e gaps.
                        </p>
                    </div>
                </div>
            </section>

            {/* Section 3 - O que você recebe */}
            <section style={{ padding: "5rem 1.5rem", background: "#0e0e1a", borderTop: "1px solid #1e1e32", borderBottom: "1px solid #1e1e32" }}>
                <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                    <div className="grid-2" style={{ alignItems: "center" }}>
                        <div>
                            <h2 className="mono" style={{ color: "#e0e0f0", fontSize: "1.5rem", marginBottom: "1.5rem" }}>
                                // O que você recebe
                            </h2>
                            <ul style={{ listStyle: "none", padding: 0 }}>
                                {['Score geral de compatibilidade (0-100)', 'Breakdown por dimensão (Técnico, Senioridade, Cultura)', 'Pontos de FIT — o que combina perfeitamente', 'Pontos de GAP — o que falta ou precisa melhorar', 'Recomendação — vale aplicar ou não?'].map((item, i) => (
                                    <li key={i} style={{ marginBottom: "1rem", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                        <span className="text-green mono">»</span>
                                        <span style={{ color: "#c0c0de" }}>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-card mono" style={{ padding: "2rem", fontSize: "0.85rem", color: "#8888a8" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                                <span style={{ color: "#e0e0f0" }}>Análise Concluída</span>
                                <span className="text-green">Score: 85</span>
                            </div>
                            <div style={{ borderBottom: "1px dashed #2a2a3e", marginBottom: "1rem" }}></div>
                            <div style={{ color: "#00ff88", marginBottom: "0.5rem" }}>[+] FIT: Experiência sólida em React e Node.js</div>
                            <div style={{ color: "#ff4466", marginBottom: "1rem" }}>[-] GAP: Falta vivência explícita com AWS (solicitado como diferencial)</div>
                            <div style={{ color: "#00d4ff" }}>VEREDICTO: Excelente match técnico. Vale a pena aplicar!</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4 - Transparência */}
            <section style={{ padding: "5rem 1.5rem", maxWidth: 1000, margin: "0 auto" }}>
                <h2 className="mono" style={{ color: "#e0e0f0", fontSize: "1.5rem", marginBottom: "3rem", textAlign: "center" }}>
                    // Transparência e Privacidade
                </h2>
                <div className="grid-2">
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <div className="text-cyan mono">[*]</div>
                        <div>
                            <h4 style={{ color: "#e0e0f0", marginBottom: "0.25rem" }}>Sua chave, suas regras</h4>
                            <p style={{ color: "#8888a8", fontSize: "0.9rem" }}>Você usa SUA chave de API. Nenhum dado de LLM passa por nossos servidores.</p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <div className="text-cyan mono">[*]</div>
                        <div>
                            <h4 style={{ color: "#e0e0f0", marginBottom: "0.25rem" }}>Criptografia End-to-End</h4>
                            <p style={{ color: "#8888a8", fontSize: "0.9rem" }}>Suas chaves e currículo ficam salvos no seu Firestore, 100% criptografados client-side.</p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <div className="text-cyan mono">[*]</div>
                        <div>
                            <h4 style={{ color: "#e0e0f0", marginBottom: "0.25rem" }}>Código Aberto</h4>
                            <p style={{ color: "#8888a8", fontSize: "0.9rem" }}>O código é 100% open source. Você pode auditar tudo diretamente no GitHub.</p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <div className="text-cyan mono">[*]</div>
                        <div>
                            <h4 style={{ color: "#e0e0f0", marginBottom: "0.25rem" }}>Sem Tracking</h4>
                            <p style={{ color: "#8888a8", fontSize: "0.9rem" }}>Zero ads. Sem venda de dados. Uma ferramenta feita de dev para dev.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 5 - CTA Final */}
            <section id="cta-section" style={{ padding: "6rem 1.5rem", background: "#0e0e1a", textAlign: "center", borderTop: "1px solid #1e1e32" }}>
                <h2 className="hero-title" style={{ fontSize: "2rem" }}>Pronto pra testar?</h2>
                <p style={{ color: "#8888a8", marginBottom: "2rem" }}>Gratuito. Open source. Sem pegadinhas.</p>
                <button className="btn-primary mono" style={{ fontSize: "1rem", padding: "16px 32px" }} onClick={handleLogin}>
                    Entrar com Google →
                </button>
                <div style={{ marginTop: "2rem" }}>
                    <a href="https://github.com/felipefernandes/job-fit-analyzer" target="_blank" rel="noreferrer" style={{ color: "#00d4ff", textDecoration: "none", fontSize: "0.9rem", borderBottom: "1px dashed #00d4ff" }}>
                        Ver no GitHub ↗
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: "2rem 1.5rem", textAlign: "center", borderTop: "1px solid #1e1e32", color: "#686888", fontSize: "0.8rem" }}>
                <p>Job Fit Analyzer · Open Source · Feito por Felipe Fernandes</p>
                <p style={{ marginTop: "0.5rem" }}>
                    <a href="https://github.com/felipefernandes/job-fit-analyzer" style={{ color: "#8888a8", textDecoration: "none" }}>GitHub</a>
                </p>
            </footer>
        </div>
    );
}
