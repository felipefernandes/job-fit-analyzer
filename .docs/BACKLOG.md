# BACKLOG — Job Fit Analyzer

## Convenções

- **Ordem:** Implementação sequencial de cima para baixo
- **Escopo:** Cada item é atômico — pode ser implementado e testado isoladamente
- **DoD global:** Código em inglês, commit convencional, sem warnings no console, funciona em mobile

---

## Fase 0 — Landing + Auth + Persistência Base

---

### [x] 0.1 — Firebase Auth: Google Sign-In

**Escopo:**
Configurar Firebase Authentication com provider Google. Criar hook/service reutilizável que expõe: login, logout, user state, loading state. Nenhuma UI neste item — apenas a infraestrutura.

**Critérios de aceite:**
- `signInWithPopup` funciona com conta Google real no ambiente de staging
- Estado do usuário (uid, displayName, email, photoURL) acessível via hook/context
- Logout limpa o estado completamente
- Se o usuário já está logado e recarrega a página, o estado persiste (onAuthStateChanged)
- Erros de auth (popup fechado, conta bloqueada) são capturados e retornam mensagem legível

**Como testar:**
- Manual: login com conta Google pessoal no deploy de staging
- Manual: fechar popup durante login → verificar que o app não quebra
- Manual: login → refresh da página → verificar que continua logado
- Manual: logout → verificar que estado limpa e redireciona

---

### [x] 0.2 — Landing Page: Estrutura e Conteúdo

**Escopo:**
Implementar a landing page conforme spec do LANDING.md. Seções: Hero, Como Funciona, O Que Você Recebe, Transparência, CTA Final + Login, Footer. Sem funcionalidade de login ainda — o botão de CTA final será conectado na task 0.3.

**Critérios de aceite:**
- Todas as 5 seções renderizam com conteúdo real (não lorem ipsum)
- Identidade visual dark terminal com JetBrains Mono conforme spec
- Responsivo: funciona em viewport de 375px (iPhone SE) até 1440px
- Animações de entrada (fade-in com stagger) nas seções ao scroll
- Meta tags de SEO preenchidas (title, description, og:image)
- Lighthouse performance score > 90
- Nenhum texto genérico tipo "powered by AI" ou "revolucionário"

**Como testar:**
- Visual: abrir em Chrome DevTools em viewports 375px, 768px, 1440px
- Visual: verificar que animações de scroll funcionam sem jank
- SEO: inspecionar meta tags no código fonte
- Performance: rodar Lighthouse no Chrome DevTools
- Copy: ler todo o texto e validar tom (direto, sem bullshit, acessível)

---

### [x] 0.3 — Landing: Integração do CTA com Firebase Auth

**Escopo:**
Conectar os botões de CTA da landing ("Experimente Agora" e "Entrar com Google") ao Firebase Auth (task 0.1). Após login bem-sucedido, redirecionar para `/app`. Se já logado e acessar `/`, redirecionar para `/app`.

**Critérios de aceite:**
- Botão "Experimente Agora" no hero rola suavemente até a seção de CTA final
- Botão "Entrar com Google" abre popup de Firebase Auth
- Login bem-sucedido → redirect para `/app`
- Usuário já logado acessando `/` → redirect automático para `/app`
- Usuário não logado acessando `/app` → redirect para `/`
- Loading state visível durante o processo de auth
- Erro de auth exibe mensagem inline (não alert)

**Como testar:**
- Manual: fluxo completo — landing → CTA → login → chega no /app
- Manual: acessar /app deslogado → verificar redirect para /
- Manual: acessar / logado → verificar redirect para /app
- Manual: forçar erro (fechar popup) → verificar mensagem de erro

---

### [x] 0.4 — Firestore: Modelo de Dados do Usuário

**Escopo:**
Criar a estrutura de documentos no Firestore para o perfil do usuário. Collection `users/{uid}` com subcollections. Criar service/hook para CRUD. Implementar security rules do Firestore (cada user só acessa seus dados).

**Estrutura de dados:**
```
users/{uid}
  ├── profile: { displayName, email, photoURL, createdAt, updatedAt }
  ├── resume: { content: string, source: "markdown"|"gdocs", sourceUrl?: string, updatedAt }
  ├── llmKeys: { [provider]: { encryptedKey: string, addedAt } }
  └── analyses/{analysisId}
        ├── jobTitle: string
        ├── company: string
        ├── score: number
        ├── fitPoints: string[]
        ├── gapPoints: string[]
        ├── recommendation: string
        ├── provider: string
        ├── createdAt: timestamp
        └── jobSource: "url"|"text"
```

**Critérios de aceite:**
- Security rules: usuário só lê/escreve nos próprios documentos (testado)
- CRUD de profile funciona (create on first login, read, update)
- CRUD de resume funciona (save, read, update)
- CRUD de analyses funciona (create, list ordered by date, read individual)
- Keys de LLM são criptografadas client-side antes de salvar (AES-GCM com chave derivada do uid)
- Timestamps usam `serverTimestamp()` do Firestore

**Como testar:**
- Security rules: usar Firebase Emulator Suite com testes unitários de rules
- Manual: salvar currículo → recarregar página → verificar que carrega do Firestore
- Manual: logar com conta diferente → verificar que não vê dados da outra conta
- Criptografia: inspecionar documento no Firebase Console → verificar que a key está cifrada

---

### [x] 0.5 — Interface: Perfil do Usuário

**Escopo:**
Tela `/app/profile` com: nome de exibição (editável), currículo salvo (textarea MD ou campo de URL do Google Docs), gerenciamento de API keys (adicionar, remover, testar conexão por provider). Usa os services da task 0.4.

**Critérios de aceite:**
- Nome editável com save inline (sem página separada de edição)
- Currículo: toggle entre "Markdown" e "Link do Google Docs"
  - Markdown: textarea com preview
  - Google Docs: campo de URL com validação de formato
- API Keys: lista de providers disponíveis com campo de input para cada key
  - Ao salvar: criptografa e persiste no Firestore
  - Botão "Testar" ao lado de cada key: faz uma chamada mínima ao provider e exibe sucesso/erro
  - Key salva exibe apenas últimos 4 caracteres (mascarada)
  - Botão de remover key
- Feedback visual de save (loading → sucesso/erro)

**Como testar:**
- Manual: salvar nome → recarregar → nome persiste
- Manual: salvar currículo MD → recarregar → conteúdo persiste
- Manual: salvar URL do Docs → recarregar → URL persiste
- Manual: adicionar API key → verificar mascaramento → testar conexão
- Manual: remover key → recarregar → key não aparece mais

---

### [x] 0.6 — Integrar MVP ao Fluxo Autenticado

**Escopo:**
Mover a mecânica principal do MVP (input de vaga + análise + score) para dentro do fluxo autenticado em `/app`. Carregar currículo e API key automaticamente do perfil do Firestore (sem pedir novamente). Manter a opção de informar manualmente caso o perfil esteja incompleto.

**Critérios de aceite:**
- Ao abrir `/app`, se o perfil tem currículo e pelo menos 1 API key, vai direto para input de vaga
- Se perfil incompleto, exibe mensagem com link para `/app/profile`
- Input de vaga mantém os dois modos: URL e texto colado
- Análise usa a API key do perfil (primeira com prioridade ou a única disponível)
- Após resultado, botões:
  - "Nova análise" (limpa input, mantém na tela)
  - "Salvar avaliação" (persiste no Firestore via service da task 0.4)
- Resultado salvo aparece no histórico

**Como testar:**
- Manual: configurar perfil completo → abrir /app → fazer análise → verificar que usou dados do perfil
- Manual: perfil sem key → verificar mensagem de perfil incompleto
- Manual: salvar avaliação → ir para histórico → verificar que aparece

---

### [x] 0.7 — Interface: Histórico de Avaliações

**Escopo:**
Tela `/app/history` com lista de avaliações salvas. Cada item exibe: título da vaga, empresa, score (com cor), data. Ao clicar, expande ou abre detalhe com fit points, gap points, e recomendação.

**Critérios de aceite:**
- Lista ordenada por data (mais recente primeiro)
- Cada card exibe: título da vaga, nome da empresa, score colorido (verde >70, amarelo 40-70, vermelho <40), data
- Ao clicar: expande mostrando fit points, gap points, recomendação
- Estado vazio: mensagem "Nenhuma avaliação salva ainda. Faça sua primeira análise."
- Paginação ou infinite scroll se houver mais de 20 itens

**Como testar:**
- Manual: salvar 3 avaliações com scores diferentes → verificar ordenação e cores
- Manual: clicar em uma avaliação → verificar que detalhe exibe corretamente
- Manual: deslogar e logar com conta sem histórico → verificar estado vazio

---

### [x] 0.8 — Menu de Navegação do App

**Escopo:**
Navegação interna da aplicação com itens: Nova Análise (`/app`), Histórico (`/app/history`), Perfil (`/app/profile`). Indicar item ativo. Exibir nome e foto do usuário com opção de logout.

**Critérios de aceite:**
- Menu visível em todas as rotas `/app/*`
- Item ativo destacado visualmente
- Foto e nome do Google exibidos
- Botão de logout funciona e redireciona para `/`
- Responsivo: em mobile, colapsa para hamburger ou bottom nav

**Como testar:**
- Manual: navegar entre as 3 rotas → verificar destaque do item ativo
- Manual: logout → verificar redirect para landing
- Visual: verificar em viewport mobile (375px) que navegação funciona

---

## Fase 0.9 — Proteção Legal e Conformidade LGPD (Anexo)

---

### [x] 0.9.1 — Consentimento de Telemetria e Cookies (LGPD)

**Escopo:**
Criar componente `ConsentBanner` para controlar cookies/telemetria. Por padrão, desativar Google Analytics. Exibir banner informando termos e políticas. Salvar escolha em `localStorage`. Ativar Analytics somente com opt-in ("Aceitar").

**Critérios de aceite:**
- Telemetria bloqueada até clique em "Aceitar"
- Opção "Recusar" mantém a telemetria bloqueada e esconde o banner
- Status de consentimento salvo em `localStorage` (`lgpd_consent`: `accepted` | `declined`)
- Inicialização segura do Analytics encapsulada em `firebase.js`

**Como testar:**
- Network: verificar que não há requisições para `google-analytics.com` antes do clique
- LocalStorage: inspecionar chave `lgpd_consent` após ações
- Manual: clicar em Recusar -> verificar que não carrega telemetria

---

### [x] 0.9.2 — Termos de Uso e Política de Privacidade

**Escopo:**
Criar páginas `/terms` e `/privacy` contendo os textos jurídicos do Job Fit Analyzer com o e-mail do autor (`felipefernandesweb@gmail.com`). Adicionar links e gerenciamento de preferências no rodapé da Landing e do AppLayout.

**Critérios de aceite:**
- Rotas públicas `/terms` e `/privacy` acessíveis
- Design escuro condizente com a tipografia do app
- Rodapés contêm links para os documentos e botão "Preferências de Privacidade" para resetar o consentimento

**Como testar:**
- Manual: navegar deslogado e logado até as páginas legais
- Manual: clicar em "Preferências de Privacidade" no rodapé -> banner deve reaparecer

---

### [x] 0.9.3 — Exclusão Completa de Conta e Dados

**Escopo:**
Implementar botão "Excluir Conta" na página `/app/profile`. O fluxo deve: (1) excluir recursivamente todos os dados do usuário no Firestore (perfil, currículo, keys e análises) e (2) excluir a conta no Firebase Auth. Se necessário, reautenticar com Google Sign-In via popup para evitar erros.

**Critérios de aceite:**
- Botão visível na seção "Zona de Perigo" com borda/texto vermelho
- Modal ou prompt exigindo confirmação digitada ("EXCLUIR")
- Ordem rigorosa: deleta dados no Firestore primeiro e conta no Auth depois
- Trata erro `auth/requires-recent-login` reautenticando com Google sem deslogar
- Após deleção, limpa localStorage e retorna à Landing Page

**Como testar:**
- Manual: criar conta de teste, gerar dados, ir em perfil e clicar em excluir
- Banco de dados: verificar que a coleção e documentos do UID sumiram por completo
- Auth: verificar que a conta foi removida do Firebase Authentication

---

### [x] 0.9.4 — Upload de Currículos (PDF, DOCX, ODT)

**Escopo:**
Adicionar suporte a upload e extração de texto client-side de arquivos PDF, DOCX e ODT na página de perfil. Toda extração deve ocorrer localmente no navegador do usuário para garantir privacidade e conformidade com a LGPD.

**Critérios de aceite:**
- Aceita arquivos `.pdf`, `.docx`, `.odt`, `.md` e `.txt` com limite de tamanho de 5MB
- Extrai o texto brutamente e preenche automaticamente o editor de texto Markdown do currículo
- Implementa reconstrução espacial das linhas para PDFs (agrupamento e ordenação por coordenadas Y/X) para manter a estrutura correta do currículo
- Exibe animação de scanline cyber-terminal durante a extração local
- Desabilita novas importações e o campo de texto enquanto o processamento estiver ativo

**Como testar:**
- Manual: fazer upload de currículos válidos nos formatos PDF, DOCX e ODT e conferir a extração no editor
- Limites: tentar subir um arquivo com mais de 5MB e conferir a mensagem de erro
- Limites: tentar subir um arquivo `.doc` legado e verificar o bloqueio amigável informando os formatos suportados
- UI: validar que a animação e o estado desativado aparecem corretamente

---

## Fase 1 — Multi-Provider com Fallback

---

### [ ] 1.1 — Abstração de Provider LLM

**Escopo:**
Criar camada de abstração que isola o restante do app de providers específicos. Interface unificada: `analyze(resume, jobDescription, config) → AnalysisResult`. Implementar adapters para: Gemini, Groq. Os demais entram em tasks separadas.

**Critérios de aceite:**
- Interface TypeScript/JSDoc definida com tipos claros (input, output, errors)
- Adapter Gemini funciona com a API key do usuário
- Adapter Groq funciona com a API key do usuário
- Erros são normalizados: `RateLimitError`, `AuthError`, `TimeoutError`, `ParseError`
- Cada adapter retorna os mesmos campos: `{ score, fitPoints, gapPoints, recommendation, provider, tokensUsed, latencyMs }`

**Como testar:**
- Unitário: mock de cada provider com respostas de sucesso e erro → verificar normalização
- Manual: configurar key Gemini → rodar análise → verificar que adapter Gemini foi usado
- Manual: configurar key Groq → rodar análise → verificar que adapter Groq foi usado

---

### [ ] 1.2 — Adapters Adicionais

**Escopo:**
Implementar adapters para: OpenRouter, Anthropic Claude, DeepSeek. Mesma interface da task 1.1.

**Critérios de aceite:**
- Cada adapter funciona isoladamente com key válida
- Erros normalizados conforme padrão definido em 1.1
- Teste de conexão (usado no perfil, task 0.5) funciona para cada provider

**Como testar:**
- Manual: para cada provider, configurar key e rodar 1 análise
- Unitário: mocks de erro por provider (rate limit, auth inválida, timeout)

---

### [ ] 1.3 — Lógica de Fallback

**Escopo:**
Implementar orquestrador que tenta providers em ordem de prioridade definida pelo usuário. Se o provider principal falhar com erro recuperável (rate limit, timeout), tenta o próximo. Erros de auth (key inválida) não disparam fallback — reportam direto.

**Critérios de aceite:**
- Ordem de prioridade configurável na interface de perfil (drag-and-drop ou select)
- Fallback automático em caso de: rate limit, timeout (>30s), erro 5xx
- Sem fallback em caso de: auth error (401/403), key ausente
- Log de qual provider foi tentado e qual respondeu
- Feedback visual no resultado: "Analisado por: [provider]" e, se houve fallback: "Fallback de [original] para [usado]"

**Como testar:**
- Manual: configurar 2 providers, invalidar key do primeiro → verificar que usa o segundo
- Manual: configurar apenas 1 provider com key inválida → verificar mensagem de erro de auth (sem fallback)
- Unitário: simular timeout no provider 1 → verificar que chama provider 2

---

### [ ] 1.4 — ADR: Arquitetura Multi-Provider

**Escopo:**
Documento em `/docs/decisions/001-multi-provider-architecture.md` explicando: por que múltiplos providers, como funciona o fallback, quais tradeoffs (ex: inconsistência de qualidade entre modelos), e quais alternativas foram consideradas (ex: OpenRouter como gateway único).

**Critérios de aceite:**
- Formato ADR padrão (contexto, decisão, consequências)
- Referencia código real (nomes de arquivos/funções)
- Legível por alguém de fora do projeto

**Como testar:**
- Review: ler o documento e verificar que faz sentido para alguém que não participou do desenvolvimento

---

## Fase 2 — Prompt Engineering Estruturado

---

### [ ] 2.1 — Prompt com Chain-of-Thought

**Escopo:**
Reestruturar o prompt para usar raciocínio em etapas explícitas. O LLM deve: (1) extrair skills da vaga, (2) extrair skills do CV, (3) comparar, (4) avaliar senioridade, (5) identificar keywords de ATS, (6) gerar score composto.

**Critérios de aceite:**
- Prompt solicita raciocínio passo a passo antes do resultado final
- Output em JSON schema estrito com campos: `score`, `dimensions: { technical, seniority, culture, ats }`, `fitPoints`, `gapPoints`, `recommendation`, `reasoning`
- O campo `reasoning` contém o Chain-of-Thought completo (transparência)
- JSON schema documentado em arquivo separado (`/docs/analysis-schema.json`)

**Como testar:**
- Manual: rodar 5 análises com pares CV+vaga variados → verificar que `reasoning` mostra etapas claras
- Validação: output de cada análise passa pelo JSON schema sem erros
- Qualidade: comparar scores do prompt antigo vs novo para os mesmos inputs

---

### [ ] 2.2 — Dimensões de Análise na UI

**Escopo:**
Atualizar a interface de resultado para exibir breakdown por dimensão (técnico, senioridade, cultura, ATS) além do score geral. Cada dimensão com score parcial e breve justificativa.

**Critérios de aceite:**
- Score geral mantém destaque principal
- Abaixo: 4 sub-scores com barra ou indicador visual
- Cada dimensão clicável/expandível para ver justificativa
- Cores consistentes com o score geral (verde/amarelo/vermelho)

**Como testar:**
- Manual: rodar análise → verificar que 4 dimensões aparecem com scores individuais
- Visual: verificar em mobile que layout não quebra com 4 dimensões

---

### [ ] 2.3 — Conjunto de Testes de Qualidade do Prompt

**Escopo:**
Criar 10 pares (currículo + vaga) com scores esperados e justificativas. Usar como regression suite. Documentar em `/tests/prompt-quality/`.

**Critérios de aceite:**
- 10 pares representando cenários variados:
  - Match alto (dev sênior para vaga sênior na mesma stack)
  - Match médio (skills parciais, senioridade ok)
  - Match baixo (área completamente diferente)
  - Edge case: CV muito curto
  - Edge case: vaga muito genérica
- Cada par tem: score esperado (range de ±10), justificativa humana
- Script que roda os 10 pares e compara com os scores esperados
- Relatório de desvio (score real vs esperado)

**Como testar:**
- Automatizado: rodar o script → verificar que desvio médio é < 15 pontos
- Manual: revisar 3 resultados detalhados e validar que o reasoning faz sentido

---

### [ ] 2.4 — ADR: Prompt Engineering

**Escopo:**
Documento em `/docs/decisions/002-prompt-engineering.md` explicando: estrutura do prompt, por que Chain-of-Thought, quais dimensões e como foram definidas, resultados dos testes de qualidade, e iterações que foram feitas.

**Critérios de aceite:**
- Inclui versão anterior do prompt (antes) e versão atual (depois)
- Mostra dados reais dos testes de qualidade
- Documenta tradeoffs (ex: CoT usa mais tokens, mas melhora consistência)

**Como testar:**
- Review: documento é compreensível e referencia dados reais

---

## Fase 3 — Observabilidade LLM

---

### [ ] 3.1 — Integração Langfuse: Tracing Básico

**Escopo:**
Integrar Langfuse SDK no client ou em Cloud Function. Cada chamada de LLM gera um trace com: input (sem dados sensíveis), output, tokens, latência, modelo, custo estimado, score gerado.

**Critérios de aceite:**
- Trace aparece no dashboard Langfuse após cada análise
- Campos capturados: model, tokens_input, tokens_output, latency_ms, cost_usd, score, provider, status (success/error)
- Dados sensíveis (currículo, API key) NÃO são enviados ao Langfuse
- Funciona com Langfuse cloud free tier

**Como testar:**
- Manual: rodar 3 análises → abrir Langfuse dashboard → verificar que 3 traces aparecem com todos os campos
- Manual: inspecionar trace no Langfuse → confirmar que currículo não aparece nos dados

---

### [ ] 3.2 — Painel de Uso In-App (Usuário)

**Escopo:**
Componente em `/app` que exibe ao usuário: total de runs, tokens gastos acumulado, custo estimado acumulado, e na última análise: latência, tokens, provider usado. Dados agregados do Firestore (não do Langfuse — Langfuse é admin-only).

**Critérios de aceite:**
- Exibido como card resumo na tela principal ou no perfil
- Dados vêm do Firestore (cada análise salva já inclui tokens e custo desde task 1.1)
- Custo calculado com tabela de preços por modelo (pode ser aproximado)
- Atualiza ao salvar nova análise
- Estado vazio: "Nenhuma análise realizada ainda"

**Como testar:**
- Manual: rodar 3 análises → verificar que totais acumulam corretamente
- Manual: verificar que custo muda conforme o modelo usado

---

### [ ] 3.3 — ADR: Observabilidade

**Escopo:**
Documento em `/docs/decisions/003-observability.md`: por que Langfuse, o que é capturado, o que é excluído (privacidade), como os dados do Langfuse complementam os dados do Firestore, e como interpretar o dashboard.

**Critérios de aceite:**
- Explica a separação: Langfuse = admin/dev, Firestore aggregation = usuário
- Documenta quais dados NÃO são enviados ao Langfuse e por quê
- Inclui screenshot ou descrição do dashboard admin

**Como testar:**
- Review: documento é compreensível e coerente com a implementação

---

## Fase 4 — RAG para Análise Semântica do CV

---

### [ ] 4.1 — Pipeline de Embedding do Currículo

**Escopo:**
Ao salvar/atualizar o currículo no perfil, executar pipeline: chunking do texto → geração de embeddings → armazenamento dos vetores. Chunking por seções semânticas (experiência, formação, skills, etc), não por tamanho fixo.

**Critérios de aceite:**
- Chunking identifica seções do CV (heurística: headers MD, quebras de linha dupla)
- Cada chunk gera um embedding (modelo: `text-embedding-004` do Gemini ou equivalente gratuito)
- Vetores armazenados no Firestore (com extensão de vector search) ou em solução in-memory para MVP
- Pipeline roda automaticamente ao salvar CV e exibe feedback de progresso
- Se o CV não mudar, não reprocessa (hash comparison)

**Como testar:**
- Manual: salvar CV → verificar no Firestore/logs que chunks e embeddings foram gerados
- Manual: salvar o mesmo CV sem mudanças → verificar que não reprocessa
- Manual: alterar 1 seção do CV → verificar que reprocessa

---

### [ ] 4.2 — Busca Semântica na Análise

**Escopo:**
Na hora da análise: extrair keywords/contexto da vaga → buscar os N chunks mais relevantes do CV → montar contexto otimizado para o prompt (em vez de enviar CV inteiro).

**Critérios de aceite:**
- Keywords da vaga extraídas (pode ser via LLM call rápido ou heurística TF-IDF)
- Top 3-5 chunks mais similares retornados pela busca vetorial
- Prompt montado com chunks relevantes em vez do CV inteiro
- Token count do prompt é mensurável e menor que o approach de CV inteiro
- Fallback: se RAG falhar, usar CV inteiro (comportamento anterior)

**Como testar:**
- Manual: rodar análise para vaga técnica → verificar que chunks de experiência técnica são priorizados
- Manual: comparar token count de análise com RAG vs sem RAG
- Manual: simular falha no RAG → verificar que fallback para CV inteiro funciona

---

### [ ] 4.3 — Comparativo e ADR: RAG

**Escopo:**
Rodar os 10 pares de teste (task 2.3) com e sem RAG. Documentar comparativo de: score, token count, custo, qualidade percebida. Documentar decisões em `/docs/decisions/004-rag-architecture.md`.

**Critérios de aceite:**
- Tabela comparativa com os 10 pares: score (com/sem RAG), tokens (com/sem), delta
- ADR documenta: estratégia de chunking, modelo de embedding, por que essa abordagem, tradeoffs
- Conclusão honesta: RAG melhorou, piorou, ou foi neutro? Em quais cenários?

**Como testar:**
- Automatizado: script que roda os 10 pares nos dois modos e gera relatório
- Review: ADR é honesto e baseado em dados reais

---

## Fase 5 — Polish e Publicação OSS

---

### [ ] 5.1 — README.md Exemplar

**Escopo:**
README no root do repositório cobrindo: o que é, para quem, screenshot/GIF, stack, arquitetura (diagrama), como rodar local, como contribuir, licença.

**Critérios de aceite:**
- Primeira seção: o que é + screenshot (acima da dobra do GitHub)
- Diagrama de arquitetura (Mermaid ou imagem)
- Seção de stack com justificativa de 1 linha por tecnologia
- Instruções de setup local (com e sem Docker)
- Link para ADRs, CONTRIBUTING, LICENSE
- Badges: build status, license, tech stack

**Como testar:**
- Review: abrir no GitHub → é compreensível em 30 segundos?
- Review: seguir instruções de setup local → funciona?

---

### [ ] 5.2 — ARCHITECTURE.md + Compilação de ADRs

**Escopo:**
Documento de arquitetura com diagrama de componentes, fluxo de dados, e referência para ADRs individuais. Organizar `/docs/decisions/` com índice.

**Critérios de aceite:**
- Diagrama mostra: Landing → Auth → App → LLM Provider → Langfuse → Firestore
- Fluxo de dados de uma análise documentado passo a passo
- Índice de ADRs com links e resumo de 1 linha cada

**Como testar:**
- Review: alguém de fora consegue entender a arquitetura lendo só este documento?

---

### [ ] 5.3 — CONTRIBUTING.md + LICENSE

**Escopo:**
Guidelines de contribuição e licença do projeto.

**Critérios de aceite:**
- CONTRIBUTING: como rodar local, como criar branch, padrão de commit (conventional commits), como abrir PR
- LICENSE: MIT (mais permissivo, melhor para visibilidade)

**Como testar:**
- Review: seguir o CONTRIBUTING como se fosse contribuidor externo

---

### [ ] 5.4 — Docker Compose para Dev Local

**Escopo:**
Configuração Docker que sobe o app localmente sem precisar de conta Firebase (usa Firebase Emulator Suite).

**Critérios de aceite:**
- `docker-compose up` sobe: app + Firebase Emulators (Auth, Firestore, Hosting)
- README de setup local referencia este método
- Seed data opcional para testar com dados de exemplo

**Como testar:**
- Manual: clonar repo fresco → `docker-compose up` → app funciona no localhost

---

### [ ] 5.5 — CI: GitHub Actions

**Escopo:**
Pipeline básica de CI no PR: lint, type check, testes unitários, build.

**Critérios de aceite:**
- Roda em todo PR para `main`
- Steps: install → lint → type check → test → build
- Badge de status no README
- Falha bloqueia merge (branch protection rule)

**Como testar:**
- Abrir PR com erro de lint proposital → verificar que CI falha
- Abrir PR limpo → verificar que CI passa e badge atualiza