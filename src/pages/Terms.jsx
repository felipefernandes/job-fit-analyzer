import { useNavigate } from "react-router-dom";

export default function Terms() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: "100vh",
            background: "#0a0a14",
            color: "#c0c0de",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            padding: "2rem 1.5rem"
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
                .mono { font-family: 'JetBrains Mono', monospace; }
                .text-green { color: #00ff88; }
                .text-cyan { color: #00d4ff; }
                .legal-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: #12121e;
                    border: 1px solid #1e1e32;
                    border-radius: 8px;
                    padding: 2.5rem;
                }
                .btn-back {
                    background: transparent;
                    color: #00ff88;
                    border: 1px solid #00ff88;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                    margin-bottom: 2rem;
                    text-transform: uppercase;
                }
                .btn-back:hover {
                    background: rgba(0, 255, 136, 0.1);
                }
                h1 {
                    font-size: 2rem;
                    color: #e0e0f0;
                    margin-top: 0;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid #1e1e32;
                    padding-bottom: 1rem;
                }
                h2 {
                    font-size: 1.25rem;
                    color: #00d4ff;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                }
                p, li {
                    font-size: 0.95rem;
                    line-height: 1.7;
                    color: #a0a0c0;
                }
                ul {
                    padding-left: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                li {
                    margin-bottom: 0.5rem;
                }
            `}</style>

            <div className="legal-container">
                <button className="btn-back mono" onClick={() => navigate(-1)}>
                    ← Voltar
                </button>

                <h1 className="mono">// Termos de Uso</h1>
                <p style={{ fontSize: "0.8rem", color: "#686888", marginBottom: "2rem" }} className="mono">
                    Última atualização: 26 de maio de 2026
                </p>

                <p>
                    Bem-vindo ao <strong>Job Fit Analyzer</strong>. Ao utilizar nosso serviço, você concorda com estes Termos de Uso. 
                    Esta ferramenta é um projeto pessoal de código aberto (open-source) desenvolvido por <strong>Felipe Fernandes</strong>.
                </p>

                <h2 className="mono">1. Descrição do Serviço</h2>
                <p>
                    O Job Fit Analyzer é uma ferramenta front-end que permite cruzar as informações contidas em seu currículo com anúncios de vagas de emprego usando inteligência artificial (LLMs). O objetivo do serviço é puramente informativo e analítico, visando auxiliar os usuários no aprimoramento de seus currículos para processos de recrutamento e seleção.
                </p>

                <h2 className="mono">2. Utilização de Chaves de API Próprias</h2>
                <p>
                    Este aplicativo funciona no modelo <em>"Bring Your Own Key"</em> (Traga Sua Própria Chave). O usuário deve fornecer suas próprias chaves de API para os provedores de inteligência artificial (como Google Gemini ou Groq) para realizar as análises.
                </p>
                <ul>
                    <li>Você é o único responsável pelos custos financeiros ou limites de taxa (rate limits) incorridos pelo uso de suas chaves de API nos provedores parceiros.</li>
                    <li>O Job Fit Analyzer não cobra taxas pelo processamento nem monetiza o serviço de processamento de IA.</li>
                    <li>As chaves são armazenadas localmente no seu navegador e enviadas de forma criptografada para o banco de dados do seu perfil, sendo descriptografadas apenas na execução do cliente.</li>
                </ul>

                <h2 className="mono">3. Propriedade Intelectual e Código Aberto</h2>
                <p>
                    O código-fonte deste projeto é aberto e disponibilizado sob a licença <strong>MIT</strong>. Você pode auditá-lo, modificá-lo ou hospedá-lo de forma independente sob os termos da referida licença.
                </p>

                <h2 className="mono">4. Isenção de Responsabilidade</h2>
                <p>
                    A ferramenta fornece scores e breakdown de compatibilidade puramente analíticos gerados por algoritmos estatísticos de linguagem natural (IA). 
                </p>
                <ul>
                    <li>Não garantimos que as análises reflitam com exatidão os critérios reais e proprietários usados por sistemas ATS de mercado (como Gupy, Workday, etc.) ou por recrutadores humanos.</li>
                    <li>A aplicação não garante nenhuma contratação, avanço em processos seletivos ou qualquer resultado de cunho trabalhista.</li>
                    <li>O autor do software não se responsabiliza por quaisquer decisões de carreira tomadas com base nas informações geradas por esta aplicação.</li>
                </ul>

                <h2 className="mono">5. Modificação dos Termos</h2>
                <p>
                    Como um projeto open-source de evolução incremental, reservamo-nos o direito de alterar estes termos a qualquer momento para refletir novos recursos ou mudanças regulatórias. O uso continuado da plataforma implica na aceitação automática das novas condições.
                </p>

                <h2 className="mono">6. Contato</h2>
                <p>
                    Para dúvidas relativas a estes Termos de Uso, você pode entrar em contato diretamente com o mantenedor pelo e-mail: <a href="mailto:felipefernandesweb@gmail.com" className="text-cyan" style={{ textDecoration: "none" }}>felipefernandesweb@gmail.com</a>.
                </p>
            </div>
        </div>
    );
}
