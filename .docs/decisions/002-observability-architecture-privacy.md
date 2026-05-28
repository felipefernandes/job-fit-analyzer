# ADR 002: Observability Architecture and Privacy Policies

* **Status:** Accepted
* **Date:** 2026-05-28
* **Author:** Felipe Fernandes <felipefernandesweb@gmail.com>

## Context

To establish a production baseline and track key metrics (latency, token usage, error rates, costs, fallback behavior, and model distribution), we decided to integrate an LLM observability tool. We chose Langfuse for this purpose.

However, since this is a client-side web application where users configure their own API keys and process personal resumes, we must balance observability requirements with strict user privacy. Specifically:
1. **User Privacy**: We must never expose user resumes, job descriptions, or raw prompt instructions containing sensitive candidate information to the admin's central logging dashboard.
2. **Key Security**: API keys owned by users must never be logged or transmitted in telemetry data.
3. **Admin Telemetry Requirements**: The administrator needs to know which models are used, typical scores, latencies, tokens consumed, errors occurred, and fallbacks triggered to optimize future prompt engineering phases.

## Decision

We have integrated the Langfuse Web SDK client-side to track traces and generations while strictly enforcing privacy-preserving filters.

### 1. Client-Side Only Instrumentation
- We initialize the `LangfuseWeb` SDK using **only** the `VITE_LANGFUSE_PUBLIC_KEY` and `VITE_LANGFUSE_BASE_URL`.
- The secret key (`LANGFUSE_SECRET_KEY`) is **omitted** client-side to ensure the front-end application has write-only access to log traces and cannot pull sensitive records or configurations from other traces.

### 2. Privacy Redaction / Masking
- **Input Redaction**: When creating a `generation` inside each provider adapter (e.g., `callGemini`, `callGroq`), the raw `userContent` (which contains the raw resume and job description) is completely redacted and replaced with a static string: `"[REDACTED_CV_AND_JD_FOR_PRIVACY]"`.
- **System Prompt Integrity**: We log the `SYSTEM_PROMPT` to analyze prompt-versioning impact, as it contains no candidate PII.
- **Key Redaction**: API keys are naturally excluded from any traces or metadata payloads.

### 3. Captured Observability Metrics
To provide complete visibility without compromising privacy, the following telemetry is logged:
- **Trace Level (`analyze_job_fit`)**:
  - `sessionId`: A non-PII, randomly generated UUID saved in `sessionStorage` to group trace attempts in the same browser session.
  - `metadata`: `hasGoogleSearch` (boolean flag) and `providerPriority` (fallback configuration).
  - `output`: Struct containing the parsed job title, company, local, job level, the compatibility score, the fit category, the final provider used, and the fallback chain log (listing which fallback providers failed and why).
  - `score`: The compatibility score registered as an evaluation metric (`compatibility_score`) on the trace for aggregations and quality dashboards.
- **Generation Level (`llm_call_[provider]`)**:
  - `model`: The exact model name used (e.g., `gemini-2.5-flash`, `gpt-4o-mini`).
  - `startTime` / `endTime`: Used by Langfuse to compute precise duration (latency).
  - `usage`: Extracted token usage (`promptTokens`, `completionTokens`, `totalTokens`) parsed from each provider's specific JSON response structure.
  - `statusMessage` / `level`: Standardized error classifications (e.g., `AuthError`, `RateLimitError`, `TimeoutError`, `ServerError`) mapped as `ERROR` logs to trace provider reliability.

### 4. ESM & Node.js Test Compatibility
- Since tests are executed via Node.js directly from `llm.test.js`, we guarded env-vars reads (`import.meta.env` fallback to `process.env`) and window/storage dependencies (`sessionStorage` check) to ensure tests pass cleanly in Node environments without throwing reference errors.

## Consequences

- **Developer Visibility**: The administrator can monitor cost estimates, latency trends, and error ratios per model/provider in real-time.
- **Privacy Compliance**: The application remains in compliance with LGPD (Brazilian General Data Protection Law), as no candidate resumes, job descriptions, or user API keys are transmitted to the centralized observability platform.
- **Verification Baseline**: Provides a clean empirical baseline to benchmark future phases, such as Phase 2 (Prompt Engineering adjustments) and Phase 3 (RAG embedding chunking).
