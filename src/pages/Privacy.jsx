import { useNavigate } from "react-router-dom";

export default function Privacy() {
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

                <h1 className="mono">// Política de Privacidade</h1>
                <p style={{ fontSize: "0.8rem", color: "#686888", marginBottom: "2rem" }} className="mono">
                    Última atualização: 26 de maio de 2026
                </p>

                <p>
                    A privacidade e a proteção dos seus dados pessoais são fundamentais. Esta Política de Privacidade descreve como o <strong>Job Fit Analyzer</strong> coleta, utiliza, armazena e protege suas informações em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>.
                </p>

                <h2 className="mono">1. Dados que Coletamos</h2>
                <p>
                    Para fornecer as funcionalidades do aplicativo, coletamos apenas os dados estritamente necessários:
                </p>
                <ul>
                    <li><strong>Dados de Autenticação:</strong> Nome, endereço de e-mail e foto do perfil obtidos através do Google Sign-In para criação e acesso à sua conta.</li>
                    <li><strong>Informações do Currículo:</strong> O texto do seu currículo ou o link do Google Docs fornecido por você em seu perfil.</li>
                    <li><strong>Chaves de API (LLM Providers):</strong> As chaves fornecidas por você (Gemini, Groq) para realizar o processamento das análises de IA.</li>
                    <li><strong>Histórico de Avaliações:</strong> Detalhes das vagas inseridas e os resultados de compatibilidade gerados.</li>
                    <li><strong>Dados de Navegação (Telemetria):</strong> Dados anônimos de uso do site (como páginas visitadas e erros) via Google Analytics, coletados <strong>apenas</strong> caso você forneça seu consentimento explícito.</li>
                </ul>

                <h2 className="mono">2. Como Seus Dados são Protegidos e Armazenados</h2>
                <p>
                    Adotamos práticas robustas de segurança para garantir a integridade dos seus dados:
                </p>
                <ul>
                    <li><strong>Criptografia Client-Side:</strong> Suas chaves de API são criptografadas localmente no seu próprio navegador usando o algoritmo padrão AES-GCM com uma chave derivada do seu UID do Firebase Auth. Isso significa que nem nós, mantenedores da aplicação, conseguimos visualizar suas chaves em formato aberto em nosso banco de dados.</li>
                    <li><strong>Infraestrutura Firebase:</strong> Seus dados são salvos em coleções seguras no Firebase Firestore, cujo acesso é restrito ao seu próprio UID por meio de regras estritas de segurança (Security Rules).</li>
                </ul>

                <h2 className="mono">3. Com Quem Compartilhamos Seus Dados</h2>
                <p>
                    O Job Fit Analyzer <strong>não vende, aluga ou compartilha seus dados pessoais</strong> com fins comerciais.
                </p>
                <ul>
                    <li>Os currículos e as descrições de vagas que você envia para análise são enviados diretamente para os endpoints das APIs de IA configurados por você (como a API do Google Gemini ou a API do Groq Cloud) usando a sua própria chave de acesso. Esse compartilhamento é estritamente técnico e operacional para permitir que os modelos gerem o relatório de compatibilidade.</li>
                    <li>Consulte as políticas de privacidade individuais do Google e do Groq para entender como eles tratam os dados enviados via chamadas de API (geralmente, dados de API corporativa não são utilizados para treinar modelos públicos).</li>
                </ul>

                <h2 className="mono">4. Seus Direitos (Direito à Eliminação e Acesso)</h2>
                <p>
                    Em total conformidade com o Artigo 18 da LGPD, você possui plenos direitos sobre seus dados. Você pode a qualquer momento:
                </p>
                <ul>
                    <li>Acessar e consultar suas informações em tempo real acessando a página de Perfil e Histórico.</li>
                    <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                    <li><strong>Revogar o consentimento e eliminar seus dados completamente:</strong> Disponibilizamos uma opção no final da tela de Perfil que remove permanentemente todo o seu histórico, currículo, chaves criptografadas e cadastro de nossos servidores instantaneamente. Esta ação é definitiva e não pode ser desfeita.</li>
                </ul>

                <h2 className="mono">5. Cookies e Telemetria</h2>
                <p>
                    Utilizamos cookies opcionais do Google Analytics para entender o tráfego da aplicação. Ao acessar a aplicação pela primeira vez, você tem a opção de Aceitar ou Recusar o rastreamento. Você pode alterar essa preferência a qualquer momento clicando no link "Preferências de Privacidade" disponível no rodapé.
                </p>

                <h2 className="mono">6. Contato do Controlador</h2>
                <p>
                    Para exercer seus direitos ou esclarecer qualquer dúvida sobre como tratamos seus dados, você pode entrar em contato diretamente com o desenvolvedor responsável pelo e-mail: <a href="mailto:felipefernandesweb@gmail.com" className="text-cyan" style={{ textDecoration: "none" }}>felipefernandesweb@gmail.com</a>.
                </p>
            </div>
        </div>
    );
}
