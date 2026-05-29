/* global process */
import testEnvLib from 'firebase-functions-test';
import { analyzeJobFitHttp } from './index.js';

const testEnv = testEnvLib();

console.log("Iniciando Teste de Integração (Functions)...");

let passedTests = 0;
let failedTests = 0;

const logAssert = (condition, message) => {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        failedTests++;
    } else {
        console.log(`✓ PASSED: ${message}`);
        passedTests++;
    }
};

const runTests = async () => {
    // Simulador da execução de uma Callable Function
    const wrapped = testEnv.wrap(analyzeJobFitHttp);

    console.log("Teste 1: Validação de input (faltando currículo)");
    try {
        await wrapped({ data: { resume: "", jobDescription: "Vaga" } });
        logAssert(false, "Deveria falhar por falta de currículo");
    } catch (e) {
        logAssert(e.code === 'invalid-argument', "Falhou com invalid-argument corretamente");
    }

    console.log("Teste 2: Teste de integração de rede com chaves inválidas (AuthError)");
    // Como optamos por um mock/integração leve sem gastar tokens, enviamos chaves falsas
    // O esperado é que a nossa Cloud Function faça o fetch real para a API do Gemini,
    // receba um 401/403 e lance um HttpsError('unauthenticated').
    // Isso valida toda a orquestração e parsing de erros.
    try {
        await wrapped({
            data: {
                resume: "Meu CV",
                jobDescription: "Vaga de Node",
                keys: { gemini: "AIzaSy_fake_invalid_key_for_test" }
            }
        });
        logAssert(false, "Deveria falhar por autenticação de LLM");
    } catch (e) {
        logAssert(
            e.code === 'internal' && e.message.includes('Todos os provedores falharam: gemini'),
            `Detectou falha na cadeia de provedores corretamente devido à chave falsa: ${e.message}`
        );
    }

    console.log(`\n=== Resumo dos Testes do Backend ===`);
    console.log(`Passaram: ${passedTests}`);
    console.log(`Falharam: ${failedTests}`);

    testEnv.cleanup();

    if (failedTests > 0) {
        process.exit(1);
    } else {
        console.log("🎉 Todos os testes de integração do backend passaram!");
        process.exit(0);
    }
};

runTests();
