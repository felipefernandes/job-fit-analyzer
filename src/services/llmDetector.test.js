import { detectLlmProvider } from './llmDetector.js';

const testCases = [
    // Gemini
    { key: 'AIzaSyChaveGeminiValidaCom39Carac123', expected: 'gemini' },
    { key: '  AIzaSyChaveGeminiValidaCom39Carac123  ', expected: 'gemini' }, // com espaços nas pontas
    
    // Groq
    { key: 'gsk_ChaveGroqValidaDeTamanhoLongoParaTestes1234567890', expected: 'groq' },
    
    // Anthropic
    { key: 'sk-ant-sid01-ChaveClaudeAnthropicValidaQueTemTamanhoLongo', expected: 'anthropic' },
    
    // OpenRouter
    { key: 'sk-or-v1-ChaveOpenRouterValidaParaTestarDetector', expected: 'openrouter' },
    
    // OpenAI
    { key: 'sk-proj-ChaveOpenAIValidaDeProjetoRecenteDeTamanhoLongo', expected: 'openai' },
    { key: 'sk-ChaveOpenAIAntigaQueTemMaisDeVinteCaracteres', expected: 'openai' },
    
    // Inválidos / Não detectados
    { key: 'invalid-key', expected: null },
    { key: '12345', expected: null },
    { key: 'sk-curta', expected: null }, // muito curta para OpenAI
    { key: '', expected: null },
    { key: null, expected: null }
];

let failed = 0;

console.log('Iniciando testes de detecção de provedores LLM...');

testCases.forEach((tc, idx) => {
    try {
        const result = detectLlmProvider(tc.key);
        if (result !== tc.expected) {
            console.error(`❌ Teste ${idx + 1} falhou: Chave "${tc.key}" -> Esperado: ${tc.expected}, Obtido: ${result}`);
            failed++;
        } else {
            const displayKey = tc.key ? tc.key.trim().slice(0, 15) : 'null';
            console.log(`✓ Teste ${idx + 1} passou: Chave "${displayKey}..." -> ${result}`);
        }
    } catch (e) {
        console.error(`❌ Teste ${idx + 1} gerou erro para a chave "${tc.key}":`, e);
        failed++;
    }
});

if (failed === 0) {
    console.log('\n🎉 Todos os testes passaram com sucesso!');
    process.exit(0);
} else {
    console.error(`\n❌ Falha em ${failed} testes.`);
    process.exit(1);
}
