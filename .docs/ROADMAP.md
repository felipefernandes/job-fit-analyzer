# ROADMAP — Job Fit Analyzer

## Visão Geral

Evolução incremental do MVP existente para um showcase de AI Solutions Engineering.
Cada fase entrega valor funcional — o produto é utilizável ao final de cada uma.

**Princípio:** cada fase fecha um ciclo completo. Nada fica pela metade.

---

## Estado Atual (MVP publicado no Firebase)

O que já funciona:
- [x]- Upload de currículo (Markdown ou link de Google Docs público)
- [x]- Configuração de API key do usuário (Gemini ou Groq como fallback)
- [x]- Input da vaga (URL com web search ou texto colado)
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
- [ ] 1. Suporte a múltiplos providers: Gemini, Groq, OpenRouter, Anthropic Claude, DeepSeek
- [ ] 2. Interface para o usuário cadastrar keys de diferentes providers com prioridade
- [ ] 3. Lógica de fallback: se provider 1 falhar (timeout, rate limit, erro), tenta provider 2
- [ ] 4. Feedback visual de qual provider foi utilizado na análise
- [ ] 5. Documentação (ADR) explicando a arquitetura de roteamento

**Resultado:** Análise mais confiável. Usuário pode usar o provider mais barato ou o que já tem key.

---

## Fase 2 — Prompt Engineering Estruturado + Documentação

**Tema:** Qualidade da análise e transparência técnica

**Objetivo:** O prompt deixa de ser uma string fixa e vira um artefato documentado, versionado, e com Chain-of-Thought explícito.

**Entregas:**
- [ ] 1. Prompt reestruturado com Chain-of-Thought: etapas explícitas de raciocínio
- [ ] 2. Dimensões de análise definidas e documentadas:
   - Compatibilidade técnica (skills, stack)
   - Senioridade (anos, escopo, liderança)
   - Cultura e valores (quando inferível)
   - Keywords de ATS (termos que algoritmos de recrutamento buscam)
- [ ] 3. Output estruturado (JSON schema) para parsing confiável
- [ ] 4. ADR documentando: por que esse prompt, quais alternativas foram testadas, quais tradeoffs
- [ ] 5. Testes de qualidade: conjunto de 5-10 pares (currículo + vaga) com scores esperados para validação de regressão

**Resultado:** Análise mais rica, confiável, e o prompt é um artefato técnico auditável.

---

## Fase 3 — Observabilidade LLM

**Tema:** Monitoramento de produção e custos

**Objetivo:** Toda chamada de LLM é rastreada com métricas de custo, latência, tokens e erros.

**Entregas:**
- [ ] 1. Integração com Langfuse (tier free cloud ou self-hosted)
- [ ] 2. Tracing por análise: tokens in/out, modelo usado, latência, custo estimado, score gerado
- [ ] 3. Painel do usuário in-app:
   - Total de runs realizadas
   - Tokens gastos (acumulado)
   - Custo estimado em USD
   - Última análise: latência e tokens
- [ ] 4. Dashboard admin (Langfuse UI ou Looker Studio):
   - Volume de análises por dia/semana
   - Distribuição de modelos usados
   - Taxa de erro por provider
   - Score médio global
- [ ] 5. ADR documentando: por que Langfuse, como os dados fluem, o que cada métrica significa

**Resultado:** Visibilidade total do comportamento do sistema em produção. Showcase de LLM Ops real.

---

## Fase 4 — RAG para Análise Semântica do Currículo

**Tema:** Inteligência na leitura do currículo

**Objetivo:** Em vez de enviar o currículo inteiro no prompt (desperdiçando tokens e limitando tamanho), usar embeddings para buscar apenas os trechos relevantes para cada vaga.

**Entregas:**
- [ ] 1. Pipeline de embedding do currículo no momento do upload (chunk + embed)
- [ ] 2. Armazenamento dos vetores (Firestore com extensão de vector search, ou Pinecone free tier)
- [ ] 3. Na análise: extrair keywords da vaga → buscar chunks mais relevantes do CV → montar contexto otimizado
- [ ] 4. Comparativo de qualidade: score com CV inteiro vs score com RAG (documentado)
- [ ] 5. ADR documentando: estratégia de chunking, modelo de embedding escolhido, tradeoffs

**Resultado:** Análises mais precisas com CVs longos, menor consumo de tokens, demonstra domínio de RAG aplicado.

---

## Fase 5 — Polish, README e Publicação OSS

**Tema:** O projeto como portfólio profissional

**Objetivo:** O repositório no GitHub é apresentável, documentado, e pronto para ser referenciado em processos seletivos e no LinkedIn.

**Entregas:**
- [ ] 1. README.md exemplar:
   - O que é, para quem serve
   - Screenshot/GIF do produto funcionando
   - Arquitetura (diagrama)
   - Stack e justificativa
   - Como rodar local (Docker opcional)
   - Como contribuir
- [ ] 2. Compilação de todos os ADRs em `/docs/decisions/`
- [ ] 3. ARCHITECTURE.md com diagrama de componentes e fluxo de dados
- [ ] 4. CONTRIBUTING.md com guidelines
- [ ] 5. LICENSE (MIT ou Apache 2.0)
- [ ] 6. GitHub Actions: lint + testes automatizados no PR
- [ ] 7. Docker Compose para rodar local (secundário, facilita contribuições)

**Resultado:** Projeto pronto para ser linkado no currículo, no LinkedIn, e em entrevistas técnicas.

---

## Backlog Futuro (pós-publicação, sem compromisso)

Itens que só entram se houver tração ou interesse pessoal:

- [ ] - Pipeline multi-agente com LangGraph (extrator de vaga → analisador de CV → pesquisador de empresa → scorer → coach)
- [ ] - Suporte a mais formatos de CV (PDF, DOCX)
- [ ] - Sugestão de reescrita do CV para a vaga específica
- [ ] - Comparativo lado a lado de múltiplas vagas
- [ ] - Internacionalização (i18n — inglês + português)
- [ ] - PWA para uso mobile offline