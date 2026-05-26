import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { initializeAnalyticsSafe } from "../firebase";

export default function ConsentBanner() {
    const [visible, setVisible] = useState(() => {
        const consent = localStorage.getItem("lgpd_consent");
        return !consent;
    });

    const checkConsent = () => {
        const consent = localStorage.getItem("lgpd_consent");
        setVisible(!consent);
    };

    useEffect(() => {
        // Escutar eventos de mudança (ex: reset no rodapé)
        const handleConsentChange = () => {
            checkConsent();
        };

        window.addEventListener("lgpd_consent_changed", handleConsentChange);
        window.addEventListener("storage", handleConsentChange); // lidar com outras abas se necessário

        return () => {
            window.removeEventListener("lgpd_consent_changed", handleConsentChange);
            window.removeEventListener("storage", handleConsentChange);
        };
    }, []);

    const handleAccept = async () => {
        localStorage.setItem("lgpd_consent", "accepted");
        setVisible(false);
        await initializeAnalyticsSafe();
        // Disparar evento para atualizar outros componentes se necessário
        window.dispatchEvent(new Event("lgpd_consent_changed"));
    };

    const handleDecline = () => {
        localStorage.setItem("lgpd_consent", "declined");
        setVisible(false);
        // Disparar evento para atualizar outros componentes se necessário
        window.dispatchEvent(new Event("lgpd_consent_changed"));
    };

    if (!visible) return null;

    return (
        <div style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(19, 19, 31, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: "1px solid #1e1e32",
            padding: "1.5rem",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.5)",
            animation: "slideUp 0.3s ease-out"
        }}>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .consent-container {
                    max-width: 1000px;
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                }
                .consent-text {
                    color: #c0c0de;
                    font-family: 'DM Sans', system-ui, sans-serif;
                    font-size: 0.85rem;
                    line-height: 1.6;
                    margin: 0;
                }
                .consent-link {
                    color: #00d4ff;
                    text-decoration: none;
                    border-bottom: 1px dashed #00d4ff;
                    transition: color 0.2s;
                }
                .consent-link:hover {
                    color: #00ff88;
                }
                .consent-buttons {
                    display: flex;
                    gap: 12px;
                    flex-shrink: 0;
                }
                .consent-btn {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.75rem;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: all 0.2s;
                }
                .btn-accept {
                    background: transparent;
                    color: #00ff88;
                    border: 1px solid #00ff88;
                    box-shadow: 0 0 10px rgba(0, 255, 136, 0.1);
                }
                .btn-accept:hover {
                    background: rgba(0, 255, 136, 0.15);
                    box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
                }
                .btn-decline {
                    background: #1e1e32;
                    color: #8888a8;
                    border: 1px solid #383858;
                }
                .btn-decline:hover {
                    background: #2a2a44;
                    color: #e0e0f0;
                }
                @media (max-width: 768px) {
                    .consent-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1.2rem;
                    }
                    .consent-buttons {
                        justify-content: flex-end;
                    }
                }
            `}</style>

            <div className="consent-container">
                <p className="consent-text">
                    Nós utilizamos cookies e telemetria anônima para entender como a plataforma é utilizada e melhorar sua experiência. 
                    Nenhuma chave de API, informação de vaga ou currículo é armazenado ou processado fora do seu controle direto. 
                    Para saber mais, consulte nossa <Link to="/privacy" className="consent-link">Política de Privacidade</Link> e nossos <Link to="/terms" className="consent-link">Termos de Uso</Link>.
                </p>
                <div className="consent-buttons">
                    <button className="consent-btn btn-decline" onClick={handleDecline}>Recusar</button>
                    <button className="consent-btn btn-accept" onClick={handleAccept}>Aceitar</button>
                </div>
            </div>
        </div>
    );
}
