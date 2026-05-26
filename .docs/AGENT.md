# INSTRUÇÕES PARA AGENTES DE CÓDIGO (AGENT.md)

Este arquivo serve como contexto central e "Single Source of Truth" (SSOT) para qualquer Agente de IA operando neste repositório. O objetivo principal deste arquivo é garantir consistência de código, de design e de processos para evitar que agentes fujam do escopo ou reescrevam regras já estabelecidas.

## 1. Visão Geral e Estado Atual do Projeto
O **Job Fit Analyzer** é uma aplicação front-end (React/Vite) que cruza currículos com vagas de emprego usando Inteligência Artificial.

**Estado Atual:**
O MVP já está operante e funcional (deploy no Firebase Hosting). Ele possui:
- Input de vaga (via web search de URL ou texto)
- Input de currículo (em Markdown ou link de Google Docs)
- Orquestrador resiliente no modelo de LLM (Tenta primariamente no **Gemini 2.5 Flash** e faz fallback automático para o **Llama 3.3 70B da Groq**)
- Gerenciamento de chaves de API feito via interface do usuário, com as chaves guardadas puramente em `localStorage` (junto ao cache local do app).

**Direção Futura:** O objetivo geral do ROADMAP é transformá-lo progressivamente em uma plataforma completa de *AI Solutions Engineering* com Autenticação (Firebase), Histórico, Observabilidade (Langfuse), Prompt Engineering com Chain-of-Thought e RAG, conforme especificado no **BACKLOG**.

## 2. Regras de Ouro para Agentes

1. **Atenção Férrea ao Roadmap e Backlog:** Sempre verifique `.docs/ROADMAP.md` e `.docs/BACKLOG.md` para contexto atual. O desenvolvimento funciona estritamente no modelo fase a fase. Não implemente features de fases futuras (ex: RAG) sem antes finalizar as tarefas das fases anteriores (ex: Firebase Auth).
2. **Atualização Contínua das Docs:** Assim que você completar um requisito atômico do escopo (ex: "Criou o hook do Firebase"), você **DEVE** marcar a tarefa como concluída `[x]` tanto no `BACKLOG.md` quanto no `ROADMAP.md`. Manter os `.md` sincronizados é sua responsabilidade.
3. **Não Quebre o Que Funciona (MVP Baseline):** O app base já faz chamadas LLM e tem fallback resiliente implementado. Ao migrar a estrutura para novos providers na Fase 1, não remova ou quebre a integração que já está funcionando hoje entre Gemini e Groq.
4. **Proteja os Segredos e Segurança:** Jamais codifique (hardcode) chaves de API (Gemini, Groq, Firebase, Langfuse) no código-fonte. Chaves de IA ficam a cargo do input do usuário na UI e criptografadas; chaves do Firebase são consumidas via variáveis de ambiente (`.env`).
5. **Comunicação e Fluxo:** Aplique o protocolo **Iara** ou verificadores locais antes de propor os merges, garantindo que o seu código tenha qualidade, sem vazamentos e seja documentado no idioma adequado (inglês para código, PT-BR para documentações e chat).

## 3. Diretrizes de UI/UX (Design System)

A aplicação segue uma linguagem **Dark Terminal / Cyberpunk Minimalista**. Se afaste de templates "SaaS genéricos".
- **Fundo Principal:** Escuro sólido (tons de `#0a0a14` a `#12121e`). O atual é `#0b0b11`. 
- **Tipografia:** 
  - `JetBrains Mono` (monospace) para Headers, Badges, Labels, Inputs e CTAs. 
  - Letra Sans Serif de fácil leitura (como `DM Sans`) para blocos de texto corrido.
- **Cores de Destaque (Acentos):**
  - Primária: Verde terminal / Neon (`#00ff88` ou `#39ff14`).
  - Secundária: Ciano (`#00d4ff`) para Links e Badges.
  - Alertas/Warning: Vermelho Suave (`#ff4466`).
- **Animações e Efeitos:** Minimalistas (leve glow, scanlines suaves). Animações do tipo fade-in com stagger ou micro-interações nos botões de CTA. Sem parallax pesado.

## 4. Stack Tecnológica Base

- **Framework Core:** React (Vite) na arquitetura Single Page.
- **Componentes e CSS:** Vanilla CSS (`index.css`). **Não utilize TailwindCSS** no projeto, pois a base CSS de custom properties e resets já foi consolidada.
- **Autenticação:** (Fase 0) -> Firebase Authentication (Google Sign-In).
- **Banco de Dados e Cloud:** (Fase 0) -> Firestore com Security Rules baseadas em UID de usuário para segurança dos dados.
- **Ferramentas LLM:** Integração agnóstica via APIs REST/SDKs base que futuramente contará com rastreamento pelo **Langfuse** (Fase 3).

## 5. Protocolo de Ação do Agente

* **Ao Iniciar Tarefa:** Leia `.docs/ROADMAP.md` e busque no `.docs/BACKLOG.md` qual o primeiro item que contém um `[ ]` pendente. 
* **Ao Planejar (@architect):** Elabore o plano focado no escopo exato do card do backlog.
* **Ao Codar (@developer):** Use inglês para as lógicas, nome de variáveis, type definitions e JS docs. Mantenha os componentes limpos.
* **Ao Revisar (@tester / @security):** Confirme ausência de secrets expostos no front. Valide a resiliência do sistema e teste a UI com larguras mobile-first (ex: 375px e 1440px), conforme a documentação especifica para a Landing Page e App.
