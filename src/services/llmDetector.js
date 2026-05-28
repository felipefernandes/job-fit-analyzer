/**
 * Utility to detect the LLM provider based on the format of the API key.
 */

export const detectLlmProvider = (key) => {
    if (!key) return null;
    const trimmed = key.trim();

    // Groq API Keys: usually start with 'gsk_'
    if (trimmed.startsWith('gsk_')) {
        return 'groq';
    }

    // Gemini API Keys (Google Cloud): usually start with 'AIzaSy' and are around 39 characters
    if (trimmed.startsWith('AIzaSy')) {
        return 'gemini';
    }

    // Anthropic API Keys: usually start with 'sk-ant-'
    if (trimmed.startsWith('sk-ant-')) {
        return 'anthropic';
    }

    // OpenRouter API Keys: usually start with 'sk-or-v1-'
    if (trimmed.startsWith('sk-or-v1-')) {
        return 'openrouter';
    }

    // OpenAI API Keys: usually start with 'sk-proj-' or just 'sk-' (if older format)
    if (trimmed.startsWith('sk-proj-') || (trimmed.startsWith('sk-') && trimmed.length > 20)) {
        return 'openai';
    }

    return null;
};

export const getProviderDisplayName = (provider) => {
    const names = {
        gemini: 'Gemini',
        groq: 'Groq',
        openai: 'OpenAI',
        anthropic: 'Anthropic Claude',
        openrouter: 'OpenRouter',
        deepseek: 'DeepSeek'
    };
    return names[provider] || provider;
};

export const getProviderHelpUrl = (provider) => {
    const urls = {
        gemini: 'https://aistudio.google.com/app/apikey',
        groq: 'https://console.groq.com/keys',
        openai: 'https://platform.openai.com/api-keys',
        anthropic: 'https://console.anthropic.com/settings/keys',
        openrouter: 'https://openrouter.ai/keys',
        deepseek: 'https://platform.deepseek.com/api_keys'
    };
    return urls[provider] || '#';
};
