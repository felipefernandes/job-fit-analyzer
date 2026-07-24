/**
 * Camada de Abstração de LLM para o Job Fit Analyzer.
 * Isola a lógica de comunicação no backend para segurança de chaves.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase.js";

// Prioridade interna de fallbacks do sistema (predefinida)
export const PROVIDER_PRIORITY = ['gemini', 'groq', 'openai', 'anthropic', 'openrouter', 'deepseek'];

// Classes de Erros Normalizadas (mantidas para compatibilidade com o testProviderKey e UI)
export class AuthError extends Error {
    constructor(provider, message = "Chave de API inválida ou não autorizada.") {
        super(`[${provider}] Erro de Autenticação: ${message}`);
        this.name = "AuthError";
        this.provider = provider;
    }
}

export class RateLimitError extends Error {
    constructor(provider, message = "Limite de requisições atingido.") {
        super(`[${provider}] Rate Limit: ${message}`);
        this.name = "RateLimitError";
        this.provider = provider;
    }
}

export class ServerError extends Error {
    constructor(provider, message = "Erro interno no servidor do provedor.") {
        super(`[${provider}] Server Error: ${message}`);
        this.name = "ServerError";
        this.provider = provider;
    }
}

// Timeout Helper
const fetchWithTimeout = async (resource, options = {}) => {
    const { timeout = 30000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Timeout', { cause: error });
        }
        throw error;
    }
};

/**
 * Executa a análise de compatibilidade chamando a Cloud Function segura.
 * Toda a lógica de fallback e tracing (Langfuse) ocorre no servidor.
 */
export const analyzeJobFit = async (resume, jobDescription, keys, options = {}) => {
    try {
        const functions = getFunctions(app);
        const analyzeJobFitHttp = httpsCallable(functions, 'analyzeJobFitHttp');
        
        // As chaves enviadas aqui (keys) são as que o usuário porventura salvou na UI local.
        // Se o usuário não tem chaves locais, o backend usará as variáveis de ambiente secretas dele.
        const response = await analyzeJobFitHttp({
            resume,
            jobDescription,
            keys,
            options
        });

        // O resultado já vem no formato final do JSON que a UI espera
        return response.data;
    } catch (error) {
        console.error("[LLM Service] Erro ao chamar a Cloud Function:", error);
        throw new Error(error.message || "Erro de comunicação com o servidor de IA.", { cause: error });
    }
};

// ==========================================
// TESTE DE CONEXÃO (PING)
// ==========================================

/**
 * Realiza uma chamada de ping mínima para validar a integridade de uma chave API de IA fornecida pelo usuário.
 */
export const testProviderKey = async (provider, key) => {
    if (!key || key.trim().length === 0) {
        throw new Error("Chave não informada.");
    }
    
    const pingPrompt = "responda apenas com a palavra 'ok'.";

    try {
        switch (provider) {
            case 'gemini': {
                let model = 'gemini-2.0-flash';
                try {
                    const listRes = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, { timeout: 8000 });
                    if (listRes.status === 401 || listRes.status === 403) throw new AuthError(provider);
                    if (listRes.ok) {
                        const data = await listRes.json();
                        const flashModels = (data.models || [])
                            .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
                            .map(m => m.name.replace(/^models\//, ''))
                            .filter(name => name.includes("flash"));
                        if (flashModels.length > 0) {
                            const priority = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash'];
                            model = priority.find(candidate => flashModels.includes(candidate)) || flashModels[0];
                        }
                    }
                } catch (e) {
                    if (e instanceof AuthError) throw e;
                }

                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                const res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: pingPrompt }] }],
                        generationConfig: { maxOutputTokens: 5 }
                    }),
                    timeout: 10000
                });
                if (res.status === 401 || res.status === 403) throw new AuthError(provider);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                break;
            }
            case 'groq': {
                const endpoint = "https://api.groq.com/openai/v1/chat/completions";
                const res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: "llama-3.1-8b-instant",
                        messages: [{ role: "user", content: pingPrompt }],
                        max_tokens: 5
                    }),
                    timeout: 10000
                });
                if (res.status === 401 || res.status === 403) throw new AuthError(provider);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                break;
            }
            case 'openai': {
                const endpoint = "https://api.openai.com/v1/chat/completions";
                const res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: pingPrompt }],
                        max_tokens: 5
                    }),
                    timeout: 10000
                });
                if (res.status === 401 || res.status === 403) throw new AuthError(provider);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                break;
            }
            case 'anthropic': {
                const endpoint = "https://api.anthropic.com/v1/messages";
                const res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "x-api-key": key,
                        "anthropic-version": "2023-06-01",
                        "dangerously-allow-browser": "true"
                    },
                    body: JSON.stringify({
                        model: "claude-3-5-haiku-latest",
                        messages: [{ role: "user", content: pingPrompt }],
                        max_tokens: 5
                    }),
                    timeout: 10000
                });
                if (res.status === 401 || res.status === 403) throw new AuthError(provider);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                break;
            }
            case 'openrouter': {
                const endpoint = "https://openrouter.ai/api/v1/chat/completions";
                const res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-001",
                        messages: [{ role: "user", content: pingPrompt }],
                        max_tokens: 5
                    }),
                    timeout: 10000
                });
                if (res.status === 401 || res.status === 403) throw new AuthError(provider);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                break;
            }
            case 'deepseek': {
                const endpoint = "https://api.deepseek.com/v1/chat/completions";
                const res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: "deepseek-chat",
                        messages: [{ role: "user", content: pingPrompt }],
                        max_tokens: 5
                    }),
                    timeout: 10000
                });
                if (res.status === 401 || res.status === 403) throw new AuthError(provider);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                break;
            }
            default:
                throw new Error(`Provedor desconhecido: ${provider}`);
        }
        return true;
    } catch (e) {
        if (e instanceof AuthError) {
            throw new Error("Chave de API inválida ou expirada. Verifique os caracteres e saldo.", { cause: e });
        }
        if (e.name === 'TypeError' || e.message?.includes('Failed to fetch')) {
            if (provider === 'anthropic') {
                throw new Error("Erro de rede/CORS: O provedor Anthropic bloqueia chamadas diretas do navegador. A chave provavelmente está OK, mas use o OpenRouter no aplicativo.", { cause: e });
            }
            throw new Error("Erro de conexão de rede ao tentar contatar o provedor.", { cause: e });
        }
        throw new Error(e.message || "Erro desconhecido ao testar a chave.", { cause: e });
    }
};
