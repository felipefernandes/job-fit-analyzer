# ADR 001: Multi-Provider LLM Routing and Fallback Architecture

* **Status:** Accepted
* **Date:** 2026-05-28
* **Author:** Felipe Fernandes <felipefernandesweb@gmail.com>

## Context

The Job Fit Analyzer relies heavily on Large Language Models (LLMs) to perform resume-to-job-description alignment. Previously, the system was tightly coupled to Google Gemini and Groq, with no centralized abstraction. As the application grows to support more providers (Gemini, Groq, OpenAI, Anthropic, OpenRouter, DeepSeek), we need a resilient, flexible structure that allows users to leverage multiple API keys they might already own.

Furthermore, LLM APIs are prone to rate limits (HTTP 429), temporary downtime (HTTP 5xx), and network timeouts. Relying on a single provider decreases the application's uptime. We need an automatic fallback routing mechanism.

Because the application is deployed as a static client-side web application on Firebase Hosting, all API requests occur directly from the user's browser to the LLM endpoints. This introduces unique constraints:
1. **API Keys Security**: API keys must be kept secure, encrypted client-side, and decrypted only in memory when making the requests.
2. **CORS Restrictions**: Some providers (specifically Anthropic Claude) block direct requests from browsers due to CORS policies.

## Decision

We have implemented a unified LLM service at [llm.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/llm.js) which abstracts individual provider nuances and orchestrates routing and fallbacks client-side.

### 1. Predefined Priority List
Instead of introducing complex UI drag-and-drop ordering (which increases bundle size and UI friction), the system determines the priority order automatically based on a fixed priority list chosen for optimal balance of cost, tools, and availability:
`Gemini` ➔ `Groq` ➔ `OpenAI` ➔ `Anthropic Claude` ➔ `OpenRouter` ➔ `DeepSeek`

The first configured provider in this list acts as the primary provider. Remaining configured providers serve as fallbacks in the listed order.

### 2. Conditional Fallback Logic
* **Single Key Configured**: If only one API key is registered in the user profile, the system calls that provider directly. If it fails, the error is immediately propagated to the UI. No fallback loop is executed, preventing redundant overhead.
* **Multiple Keys Configured**: If more than one key is registered:
  * The system attempts to resolve the analysis with the primary provider.
  * If a **recoverable error** occurs (HTTP 429 Rate Limit, network timeout, HTTP 5xx Server Error, or network/CORS failure), the system logs the failure, saves it in a fallback chain log, and proceeds to try the next configured provider.
  * If an **unrecoverable error** occurs—specifically an authentication error (HTTP 401/403, invalid API key)—the fallback loop is **aborted immediately**, and the error is shown to the user. This prevents masking an invalid key with a secondary provider, helping the user debug their configuration.

### 3. Connection Test
To improve onboarding UX, we added a real ping verification via `testProviderKey(provider, key)` that performs a lightweight prompt call (max tokens: 1) to verify key validity.

### 4. Client-Side CORS Handling
For providers that block CORS (Anthropic), the adapter catches the network/CORS `TypeError` and normalizes it into a `ServerError`. This allows the fallback orchestrator to transition to the next provider gracefully. We display a recommendation in the key management panel for the user to use OpenRouter to access Claude models client-side without CORS limitations.

### 5. UI Disclaimer
To manage user expectations regarding slightly varying outputs (since different LLMs have different formatting styles, reasoning depth, and scoring nuances), a subtle alert is displayed in the UI when the user has multiple keys configured.

## Consequences

* **Resilience**: The app remains functional even if the user's primary provider runs out of quota, hits rate limits, or is down.
* **No Middleman Proxy**: Directly calling LLM APIs from the client maintains maximum privacy and security, as keys and resumes are never transmitted to a third-party server (except the respective LLM providers).
* **Clear Error Messaging**: Users get immediate feedback on invalid keys, rather than silent failures.
* **UX Transparency**: The UI clearly shows which provider ended up completing the analysis (e.g., `Gemini` or `Groq (Fallback de Gemini)`), maintaining trust.
