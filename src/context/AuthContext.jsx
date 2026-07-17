import { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuthChanges } from "../services/auth";
import { getResumeFromDb, getLlmKey } from "../services/db";

const AuthContext = createContext();

/* eslint-disable-next-line react-refresh/only-export-components */
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Função para sincronizar a sessão atual do Firebase com a extensão do Chrome
    const syncSessionWithExtension = async (currentUser) => {
        const activeUser = currentUser || user;
        if (!activeUser) {
            // Se não houver usuário ativo, limpa a sessão na extensão
            triggerExtensionClear();
            return;
        }

        try {
            // Busca o ID do elemento injetado pela extensão no DOM
            const extensionId = document.documentElement.getAttribute('data-job-fit-extension-id');
            if (!extensionId || typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
                // Extensão não instalada ou não ativa nesta aba
                return;
            }

            // Busca os dados do perfil do Firestore para enviar atualizado
            const resumeData = await getResumeFromDb(activeUser.uid);
            const resumeContent = resumeData ? resumeData.content : "";

            const loadedKeys = {};
            for (const provider of ['gemini', 'groq', 'openai', 'anthropic', 'openrouter', 'deepseek']) {
                const k = await getLlmKey(activeUser.uid, provider);
                loadedKeys[provider] = k || '';
            }

            const authToken = await activeUser.getIdToken();

            // Envia para o background script da extensão via ID dinâmico
            chrome.runtime.sendMessage(extensionId, {
                type: 'SESSION_CHANGED',
                user: {
                    uid: activeUser.uid,
                    displayName: activeUser.displayName,
                    email: activeUser.email,
                    photoURL: activeUser.photoURL
                },
                authToken,
                resume: resumeContent,
                keys: loadedKeys
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[Job Fit] Erro ao sincronizar sessão com a extensão:", chrome.runtime.lastError.message);
                } else {
                    console.log("[Job Fit] Sessão sincronizada com a extensão com sucesso:", response?.message);
                }
            });
        } catch (e) {
            console.error("[Job Fit] Falha ao tentar sincronizar com extensão:", e);
        }
    };

    const triggerExtensionClear = () => {
        try {
            const extensionId = document.documentElement.getAttribute('data-job-fit-extension-id');
            if (extensionId && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(extensionId, { type: 'SESSION_CLEARED' });
            }
        } catch (e) {
            // Ignora erros ao tentar limpar extensão
        }
    };

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((currentUser) => {
            setUser(currentUser);
            setLoading(false);
            
            if (currentUser) {
                // Sincroniza a sessão na extensão após o login
                setTimeout(() => syncSessionWithExtension(currentUser), 1500);
            } else {
                // Limpa na extensão após logout
                triggerExtensionClear();
            }
        });

        return unsubscribe;
    }, []);

    // Escuta mensagens vindas do content script da extensão para salvar histórico
    useEffect(() => {
        const handleExtensionMessage = async (event) => {
            if (event.data && event.data.source === 'job-fit-extension' && event.data.type === 'SYNC_PENDING_ANALYSES') {
                if (!user) {
                    window.postMessage({ source: 'job-fit-page', type: 'SYNC_PENDING_ANALYSES_RESPONSE', success: false }, '*');
                    return;
                }

                console.log("[Job Fit] Sincronizando análises pendentes da extensão no Firestore...");
                try {
                    const { saveAnalysis } = await import('../services/db');
                    
                    const savePromises = event.data.analyses.map(analysis => 
                        saveAnalysis(user.uid, {
                            ...analysis,
                            provider: analysis.providerUsed || 'IA'
                        })
                    );
                    
                    await Promise.all(savePromises);
                    console.log("[Job Fit] Análises sincronizadas com sucesso!");

                    // Responde de volta para o content script para que a extensão limpe a fila
                    window.postMessage({
                        source: 'job-fit-page',
                        type: 'SYNC_PENDING_ANALYSES_RESPONSE',
                        success: true
                    }, '*');
                } catch (err) {
                    console.error("[Job Fit] Falha ao sincronizar análises no Firestore:", err);
                    window.postMessage({
                        source: 'job-fit-page',
                        type: 'SYNC_PENDING_ANALYSES_RESPONSE',
                        success: false
                    }, '*');
                }
            }
        };

        window.addEventListener('message', handleExtensionMessage);
        return () => window.removeEventListener('message', handleExtensionMessage);
    }, [user]);

    const value = {
        user,
        loading,
        syncSessionWithExtension
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
