# ROADMAP — Job Fit Analyzer

## Visão Geral

Evolução incremental do MVP existente para um showcase de AI Solutions Engineering.
Cada fase entrega valor funcional — o produto é utilizável ao final de cada uma.

**Princípio:** cada fase fecha um ciclo completo. Nada fica pela metade.

---

## Estado Atual (MVP publicado no Firebase)

O que já funciona:
- [x] Upload de currículo (Markdown ou arquivos locais .pdf, .docx, .odt, .txt, .md)
- [x]- Configuração de API key do usuário (Gemini ou Groq como fallback)
- [x] - Input da vaga via texto colado (job description)
- [ ] - Input da vaga via URL com web search (Temporariamente desativado para revisão de estratégia de scraping)
- [x]- Score de compatibilidade (0–100) com análise de fit/gaps
- [x]- Botão "Nova avaliação"
- [x]- Deploy funcional no Firebase Hosting

---

## Fase 0 — Landing + Auth + Persistência Base

**Tema:** Porta de entrada e fundação de dados

**Objetivo:** O produto deixa de ser uma ferramenta anônima e vira uma aplicação com usuário, landing pública, e dados persistidos.

**Entregas:**
- [x] 1. Landing page com identidade visual definida e CTA para login
- [x] 2. Firebase Auth com Google Sign-In
- [x] 3. Firestore: persistência do currículo do usuário (não precisa reenviar a cada uso)
- [x] 4. Firestore: persistência das API keys do usuário (criptografadas client-side)
- [x] 5. Firestore: histórico de avaliações (título da vaga, empresa, score, fit, gaps, data)
- [x] 6. Interface de perfil do usuário (nome, currículo salvo, keys configuradas)
- [x] 7. Interface de histórico de avaliações (lista com score, filtro básico)
- [x] 8. Guardrails e segurança do system prompt

**Resultado:** Usuário faz login, configura uma vez, e tem histórico. Produto é reutilizável.

---

## Fase 0.9 — Proteção Legal e Conformidade LGPD (Anexo)

**Tema:** Segurança jurídica e conformidade regulatória

**Objetivo:** Garantir conformidade com a LGPD e mitigar riscos jurídicos no MVP.

**Entregas:**
- [x] 1. Banner de consentimento de cookies e telemetria (opt-in para Google Analytics)
- [x] 2. Páginas de Termos de Uso e Política de Privacidade acessíveis e em português
- [x] 3. Exclusão completa de conta e todos os dados associados no Firestore e Auth (reautenticação)
- [x] 4. Opção de gerenciar preferências de privacidade a qualquer momento

**Resultado:** MVP seguro e em conformidade legal com a LGPD para lançamento público.

---

## Fase 1 — Multi-Provider com Fallback

**Tema:** Resiliência e flexibilidade de LLM

**Objetivo:** O usuário não fica preso a um provider. O sistema tenta alternativas automaticamente se o provider principal falhar.

**Entregas:**
- [x] 1. Suporte a múltiplos providers: Gemini, Groq, OpenRouter, Anthropic Claude, DeepSeek
- [x] 2. Interface para o usuário cadastrar keys de diferentes providers com prioridade
- [x] 3. Lógica de fallback: se provider 1 falhar (timeout, rate limit, erro), tenta provider 2
- [x] 4. Feedback visual de qual provider foi utilizado na análise
- [x] 5. Documentação (ADR) explicando a arquitetura de roteamento

**Resultado:** Análise 
## Fase 1.5 — Observabilidade Admin

**Tema:** Rastreabilidade e Baseline de Produção

**Objetivo:** Integrar ferramenta de observabilidade para coletar métricas reais de chamadas de LLM (latência, tokens, erros e custos) sem expor dados sensíveis do usuário. Isso servirá como baseline de dados para avaliar os ganhos futuros com Prompt Engineering e RAG.

**Entregas:**
- [x] 1. Integração com Langfuse (tier free cloud ou self-hosted)
- [x] 2. Tracing por análise: tokens in/out, modelo usado, latência, custo estimado, score gerado (excluindo currículo e API keys)
- [x] 3. Dashboard admin (Langfuse UI): volume de análises, distribuição de modelos, taxa de erro por provider e score médio global
- [x] 4. ADR documentando a infraestrutura de observabilidade e as políticas de privacidade de dados

**Resultado:** Visibilidade total do comportamento das chamadas de LLM por trás da aplicação, permitindo criar um baseline empírico antes dos fine-tunnings de prompt e RAG.

---

## Fase 2 — Prompt Engineering Estruturado

**Tema:** Qualidade da análise e transparência técnica com baseline de dados

**Objetivo:** O prompt deixa de ser uma string fixa e vira um artefato documentado, versionado, e com Chain-of-Thought explícito, validado contra as métricas de observabilidade coletadas na Fase 1.5.

**Entregas:**
- [ ] 1. Prompt reestruturado com Chain-of-Thought: etapas explícitas de raciocínio
- [ ] 2. Dimensões de análise definidas e documentadas (técnica, senioridade, cultura, ATS)
- [ ] 3. Output estruturado (JSON schema) para parsing confiável
- [ ] 4. ADR documentando: decisões de design do prompt, testes e tradeoffs
- [ ] 5. Testes de qualidade: conjunto de 5-10 pares (currículo + vaga) com scores esperados para validação de regressão

**Resultado:** Análise mais rica, confiável, e o prompt é um artefato técnico auditável e mensurável.

---

## Fase 3 — RAG para Análise Semântica do Currículo

**Tema:** Inteligência e economia de tokens na leitura de currículos

**Objetivo:** Em vez de enviar o currículo inteiro no prompt (desperdiçando tokens e limitando tamanho), usar embeddings para buscar apenas os trechos relevantes para cada vaga.

**Entregas:**
- [ ] 1. Pipeline de embedding do currículo no momento do upload (chunk + embed)
- [ ] 2. Armazenamento dos vetores (Firestore com vector search ou solução similar)
- [ ] 3. Na análise: extrair keywords da vaga ➔ buscar chunks mais relevantes do CV ➔ montar contexto otimizado
- [ ] 4. Comparativo de qualidade: score e custo com CV inteiro vs com RAG (baseado no tracing e testes)
- [ ] 5. ADR documentando estratégia de chunking, modelo de embedding escolhido e tradeoffs

**Resultado:** Análises precisas com CVs longos, menor consumo de tokens e melhor custo/benefício evidenciado pelo Langfuse.

---

## Fase 4 — Painel de Uso In-App

**Tema:** Transparência de consumo para o usuário final

**Objetivo:** Exibir um painel de uso in-app para o usuário acompanhar seu consumo de tokens e quantidade de análises, sem expor valores financeiros estimados em USD (mantendo a simplicidade para o usuário final).

**Entregas:**
- [ ] 1. Painel do usuário in-app: total de runs realizadas, tokens gastos (acumulado) e na última análise (latência, tokens e provider)
- [ ] 2. Registro de custos guardado internamente (Firestore) apenas para fins de observabilidade do administrador
- [ ] 3. ADR atualizado com o comparativo real de consumo de tokens/custos pré e pós RAG

**Resultado:** O usuário acompanha seu próprio uso e estatísticas de chamadas da sua conta sem sobrecarga de informações financeiras irrelevantes (USD).

---

## Fase 5 — Polish, README e Publicação OSS (Parcialmente Concluído 🔄)

**Tema:** O projeto como portfólio profissional e código aberto

**Objetivo:** Tornar o repositório no GitHub exemplar, documentado e pronto para a comunidade ou processos seletivos.

**O que já está feito:**
- [x] README.md inicial bem estruturado
- [x] CONTRIBUTING.md com guias de contribuição
- [x] LICENSE (MIT) configurado

**O que falta fazer:**
- [ ] 1. Diagrama de arquitetura detalhado (Mermaid ou imagem) no README.md
- [ ] 2. Compilação de todos os ADRs criados em `/docs/decisions/` com índice unificado
- [ ] 3. ARCHITECTURE.md com fluxo de dados detalhado
- [ ] 4. GitHub Actions (CI) configurado para lint, type checking e testes automatizados em PRs
- [ ] 5. Docker Compose configurado para facilitar o setup local usando Firebase Emulator Suite

**Resultado:** Repositório profissional com documentação estelar e pipeline de integração contínua ativa.

---

## Backlog Futuro (pós-publicação, sem compromisso)

Itens que só entram se houver tração ou interesse pessoal:

- [ ] - Pipeline multi-agente com LangGraph (extrator de vaga → analisador de CV → pesquisador de empresa → scorer → coach)
- [x] - Suporte a mais formatos de CV (PDF, DOCX, ODT)
- [ ] - Nova estratégia de web scraping confiável e agnóstica de vagas (ex: usando agentes de IA multimodal ou de baixo custo)
- [ ] - Sugestão de reescrita do CV para a vaga específica
- [ ] - Comparativo lado a lado de múltiplas vagas
- [ ] - Internacionalização (i18n — inglês + português)
- [ ] - PWA para uso mobile offline