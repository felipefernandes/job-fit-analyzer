import { Langfuse } from 'langfuse';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof globalThis !== 'undefined' && globalThis.process ? globalThis.process.env : {});
const publicKey = env.VITE_LANGFUSE_PUBLIC_KEY;
const secretKey = env.VITE_LANGFUSE_SECRET_KEY;
const baseUrl = env.VITE_LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com';

let langfuse = null;

if (publicKey && publicKey.trim() !== '') {
  try {
    langfuse = new Langfuse({
      publicKey,
      secretKey,
      baseUrl
    });
    console.log('[Observability] Langfuse SDK initialized successfully.');
  } catch (error) {
    console.error('[Observability] Failed to initialize Langfuse:', error);
  }
} else {
  console.warn('[Observability] VITE_LANGFUSE_PUBLIC_KEY is not defined. Observability tracing is disabled.');
}

/**
 * Helper to generate a unique session ID for the current browser session.
 * Keeps traces organized without using user PII.
 */
export const getSessionId = () => {
  if (typeof sessionStorage === 'undefined') {
    return 'session_node_test';
  }
  let sessionId = sessionStorage.getItem('job_fit_analyzer_session');
  if (!sessionId) {
    sessionId = `session_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('job_fit_analyzer_session', sessionId);
  }
  return sessionId;
};

export { langfuse };
