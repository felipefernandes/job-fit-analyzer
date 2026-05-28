/* global global, process */
import { analyzeJobFit, testProviderKey, AuthError } from './llm.js';

// Setup de mocks do ambiente browser no Node
global.fetch = () => {};
global.AbortController = class {
    constructor() {
        this.signal = { aborted: false };
    }
    abort() {
        this.signal.aborted = true;
    }
};

let failedTests = 0;
let passedTests = 0;

const assert = (condition, message) => {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        failedTests++;
    } else {
        console.log(`✓ PASSED: ${message}`);
        passedTests++;
    }
};

// Resposta JSON simulada para testes
const mockSuccessAnalysis = {
    vaga: { titulo: "Desenvolvedor React", empresa: "TechCorp", local: "Remoto", nivel: "Pleno" },
    score: 85,
    fit_categoria: "Excelente",
    aderencias: [{ criterio: "React", status: "forte", detalhe: "3 anos de experiência" }],
    gaps: [],
    diferenciais: ["Vite", "Firebase"],
    veredicto: "Forte aderência técnica.",
    recomendacao: "Prosseguir para entrevista."
};

console.log("Iniciando testes da abstração de LLM (llm.js)...");

const runTests = async () => {
    // -------------------------------------------------------------
    // Teste 1: Falha se nenhuma chave estiver configurada
    // -------------------------------------------------------------
    try {
        await analyzeJobFit("Meu CV", "Vaga Dev", {});
        assert(false, "Deveria ter falhado ao tentar rodar sem nenhuma chave cadastrada");
    } catch (e) {
        assert(e.message.includes("Nenhuma chave de API configurada"), "Lança erro correto quando não há chaves configuradas");
    }

    // -------------------------------------------------------------
    global.fetch = async () => {
        return {
            status: 200,
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: JSON.stringify(mockSuccessAnalysis) }] } }]
            })
        };
    };

    try {
        const result = await analyzeJobFit("Meu CV", "Vaga Dev", { gemini: "AIzaSy_key" });
        assert(result.score === 85 && result.providerUsed === 'gemini', "Único provedor (Gemini) executa e retorna sucesso");
        assert(result.fallbackChain.length === 0, "Sem fallback chain quando roda com sucesso no único configurado");
    } catch (e) {
        assert(false, `Falhou teste de único provedor sucesso: ${e.message}`);
    }

    // -------------------------------------------------------------
    global.fetch = async () => {
        return {
            status: 401,
            ok: false,
            statusText: "Unauthorized"
        };
    };

    try {
        await analyzeJobFit("Meu CV", "Vaga Dev", { gemini: "AIzaSy_invalid_key" });
        assert(false, "Deveria ter falhado por autenticação");
    } catch (e) {
        assert(e instanceof AuthError, "Lança AuthError sob status 401");
        assert(e.provider === 'gemini', "Identifica provedor causador do erro");
    }

    // -------------------------------------------------------------
    // Teste 4: Múltiplas chaves (Gemini + Groq) - Gemini falha com AuthError
    // Deve abortar IMEDIATAMENTE (sem fallback)
    // -------------------------------------------------------------
    let groqCalled = false;
    global.fetch = async (url) => {
        if (url.includes("generativelanguage")) {
            return { status: 403, ok: false };
        }
        if (url.includes("groq")) {
            groqCalled = true;
            return {
                status: 200,
                ok: true,
                json: async () => ({ choices: [{ message: { content: JSON.stringify(mockSuccessAnalysis) } }] })
            };
        }
        return { status: 500, ok: false };
    };

    try {
        await analyzeJobFit("Meu CV", "Vaga Dev", { gemini: "AIzaSy_bad_key", groq: "gsk_valida" });
        assert(false, "Deveria ter falhado imediatamente devido a AuthError no Gemini");
    } catch (e) {
        assert(e instanceof AuthError, "Abortou por erro de autenticação (AuthError) e não fez fallback");
        assert(!groqCalled, "Não chamou o Groq como fallback pois o erro foi de Auth no Gemini");
    }

    // -------------------------------------------------------------
    // Teste 5: Múltiplas chaves (Gemini + Groq) - Gemini falha com Rate Limit (429)
    // Deve disparar fallback e rodar no Groq com sucesso
    global.fetch = async (url) => {
        if (url.includes("generativelanguage")) {
            return { status: 429, ok: false };
        }
        if (url.includes("groq")) {
            return {
                status: 200,
                ok: true,
                json: async () => ({ choices: [{ message: { content: JSON.stringify(mockSuccessAnalysis) } }] })
            };
        }
        return { status: 500, ok: false };
    };

    try {
        const result = await analyzeJobFit("Meu CV", "Vaga Dev", { gemini: "AIzaSy_key", groq: "gsk_key" });
        assert(result.score === 85 && result.providerUsed === 'groq', "Executou fallback com sucesso e resolveu no Groq");
        assert(result.fallbackChain.length === 1, "Fallback chain possui 1 item de erro");
        assert(result.fallbackChain[0].provider === 'gemini', "Identifica corretamente que o Gemini falhou e gerou fallback");
    } catch (e) {
        assert(false, `Falhou teste de fallback com rate limit: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Teste 6: Múltiplas chaves (Gemini + Groq) - Gemini dá Timeout
    // Deve disparar fallback e rodar no Groq com sucesso
    global.fetch = async (url) => {
        if (url.includes("generativelanguage")) {
            // Simula erro de abort/timeout lançando erro que simula timeout do fetchWithTimeout
            throw new Error("Timeout");
        }
        if (url.includes("groq")) {
            return {
                status: 200,
                ok: true,
                json: async () => ({ choices: [{ message: { content: JSON.stringify(mockSuccessAnalysis) } }] })
            };
        }
        return { status: 500, ok: false };
    };

    try {
        const result = await analyzeJobFit("Meu CV", "Vaga Dev", { gemini: "AIzaSy_key", groq: "gsk_key" });
        assert(result.score === 85 && result.providerUsed === 'groq', "Executou fallback sob timeout do Gemini e resolveu no Groq");
        assert(result.fallbackChain[0].error.includes("Timeout"), "Registra timeout no log de erros da chain");
    } catch (e) {
        assert(false, `Falhou teste de fallback sob timeout: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Teste 7: Teste real de chave (testProviderKey)
    global.fetch = async () => {
        return { status: 200, ok: true };
    };
    try {
        const testOk = await testProviderKey('groq', 'gsk_teste');
        assert(testOk === true, "testProviderKey retorna true se a requisição de teste for 200 OK");
    } catch (e) {
        assert(false, `testProviderKey falhou no caso de sucesso: ${e.message}`);
    }

    global.fetch = async () => {
        return { status: 401, ok: false };
    };
    try {
        await testProviderKey('groq', 'gsk_teste');
        assert(false, "testProviderKey deveria lançar erro para status 401");
    } catch (e) {
        assert(e.message.includes("inválida ou expirada"), "testProviderKey traduz erro de auth corretamente");
    }

    // -------------------------------------------------------------
    // FIM DOS TESTES
    // -------------------------------------------------------------
    console.log(`\n=== Resumo dos Testes ===`);
    console.log(`Passaram: ${passedTests}`);
    console.log(`Falharam: ${failedTests}`);

    if (failedTests > 0) {
        process.exit(1);
    } else {
        console.log("🎉 Todos os testes unitários do llm.js passaram!");
        process.exit(0);
    }
};

runTests();
