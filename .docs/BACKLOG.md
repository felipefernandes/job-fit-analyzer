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

### [x] 1.1 — Abstração de Provider LLM

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

### [x] 1.2 — Adapters Adicionais

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

### [x] 1.3 — Lógica de Fallback

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

### [x] 1.4 — ADR: Arquitetura Multi-Provider

**Escopo:**
Documento em `/docs/decisions/001-multi-provider-architecture.md` explicando: por que múltiplos providers, como funciona o fallback, quais tradeoffs (ex: inconsistência de qualidade entre modelos), e quais alternativas foram consideradas (ex: OpenRouter como gateway único).

**Critérios de aceite:**
- Formato ADR padrão (contexto, decisão, consequências)
- Referencia código real (nomes de arquivos/funções)
- Legível por alguém de fora do projeto

**Como testar:**
- Review: ler o documento e verificar que faz sentido para alguém que não participou do desenvolvimento

---

## Fase 1.5 — Observabilidade Admin

---

### [ ] 1.5.1 — Integração Langfuse: Tracing Básico

**Escopo:**
Integrar Langfuse SDK na aplicação (client-side ou Cloud Functions). Cada chamada de LLM para análise de currículo deve gerar um trace contendo: modelo utilizado, tokens de entrada, tokens de saída, latência da resposta, custo estimado calculado por modelo, score gerado e status (sucesso/erro). Os dados do currículo e API keys do usuário NÃO devem ser enviados ao Langfuse por razões de privacidade.

**Critérios de aceite:**
- Traces aparecem no dashboard do Langfuse em tempo real após cada análise.
- Campos capturados corretamente: `model`, `tokens_input`, `tokens_output`, `latency_ms`, `cost_usd`, `score`, `provider`, `status`.
- Confirmação de conformidade LGPD: o texto do currículo do usuário, job description e chaves de API não constam nos metadados enviados ao Langfuse.
- Funciona perfeitamente com a infraestrutura cloud free tier do Langfuse.

**Como testar:**
- Manual: realizar 3 análises completas no app e validar no painel do Langfuse o registro dos traces.
- Segurança: inspecionar o JSON de carga enviado ao Langfuse pelo console de rede e no painel do Langfuse para garantir que dados de currículo ou chaves não estão presentes.

---

### [ ] 1.5.2 — ADR: Observabilidade Admin

**Escopo:**
Criar documento em `/docs/decisions/003-observability-admin.md` justificando a implementação do Langfuse, explicando o fluxo de dados, as métricas monitoradas de custos e latência, e as decisões de segurança/privacidade para mitigar riscos de exposição de dados de candidatos.

**Critérios de aceite:**
- Formato ADR padrão (Contexto, Decisão, Consequências).
- Documentação explícita de quais campos são enviados e quais são omitidos.
- Referência clara para os adaptadores de LLM configurados.

**Como testar:**
- Revisão técnica da documentação.

---

## Fase 1.5 — Observabilidade Admin

---

### [ ] 1.5.1 — Integração Langfuse: Tracing Básico

**Escopo:**
Integrar Langfuse SDK na aplicação (client-side ou Cloud Functions). Cada chamada de LLM para análise de currículo deve gerar um trace contendo: modelo utilizado, tokens de entrada, tokens de saída, latência da resposta, custo estimado calculado por modelo, score gerado e status (sucesso/erro). Os dados do currículo e API keys do usuário NÃO devem ser enviados ao Langfuse por razões de privacidade.

**Critérios de aceite:**
- Traces aparecem no dashboard do Langfuse em tempo real após cada análise.
- Campos capturados corretamente: `model`, `tokens_input`, `tokens_output`, `latency_ms`, `cost_usd`, `score`, `provider`, `status`.
- Confirmação de conformidade LGPD: o texto do currículo do usuário, job description e chaves de API não constam nos metadados enviados ao Langfuse.
- Funciona perfeitamente com a infraestrutura cloud free tier do Langfuse.

**Como testar:**
- Manual: realizar 3 análises completas no app e validar no painel do Langfuse o registro dos traces.
- Segurança: inspecionar o JSON de carga enviado ao Langfuse pelo console de rede e no painel do Langfuse para garantir que dados de currículo ou chaves não estão presentes.

---

### [ ] 1.5.2 — ADR: Observabilidade Admin

**Escopo:**
Criar documento em `/docs/decisions/003-observability-admin.md` justificando a implementação do Langfuse, explicando o fluxo de dados, as métricas monitoradas de custos e latência, e as decisões de segurança/privacidade para mitigar riscos de exposição de dados de candidatos.

**Critérios de aceite:**
- Formato ADR padrão (Contexto, Decisão, Consequências).
- Documentação explícita de quais campos são enviados e quais são omitidos.
- Referência clara para os adaptadores de LLM configurados.

**Como testar:**
- Revisão técnica da documentação.

---

## Fase 2 — Prompt Engineering Estruturado

---

### [ ] 2.1 — Prompt com Chain-of-Thought

**Escopo:**
Reestruturar o prompt para usar raciocínio em etapas explícitas (Chain-of-Thought). O LLM deve extrair skills da vaga, extrair skills do currículo, realizar a comparação de gaps/fits, avaliar a senioridade, identificar keywords de ATS e gerar um score composto com base nisso.

**Critérios de aceite:**
- O prompt solicita raciocínio passo a passo antes de retornar o veredito final.
- Output estruturado sob um JSON schema estrito contendo: `score`, `dimensions: { technical, seniority, culture, ats }`, `fitPoints`, `gapPoints`, `recommendation`, `reasoning`.
- O campo `reasoning` contém o Chain-of-Thought completo (transparência de análise).
- JSON schema documentado em `/docs/analysis-schema.json`.

**Como testar:**
- Manual: rodar 5 análises com currículos e vagas diferentes e verificar se a chave `reasoning` exibe o passo a passo lógico do modelo.
- Validação estrutural: verificar que o parsing de JSON não falha e valida contra o schema definido.
- Qualidade: comparar scores do prompt anterior com o atual.

---

### [ ] 2.2 — Dimensões de Análise na UI

**Escopo:**
Atualizar a interface de resultados da avaliação para exibir o breakdown das 4 dimensões (Técnica, Senioridade, Cultura e ATS) além do score principal de fit.

**Critérios de aceite:**
- Exibição de 4 sub-scores representados por barras de progresso ou indicadores visuais.
- Detalhes de cada dimensão expandíveis por clique com justificativa textual correspondente.
- Cores dinâmicas consistentes com a pontuação de fit (verde para >70, amarelo para 40-70, vermelho para <40).

**Como testar:**
- Visual: testar no celular e desktop que o layout do breakdown renderiza sem bugs visuais.

---

### [ ] 2.3 — Conjunto de Testes de Qualidade do Prompt

**Escopo:**
Criar um conjunto com 10 pares de currículo e vaga (regression suite) com scores e análises esperadas escritas manualmente para validar o comportamento dos prompts. Documentar em `/tests/prompt-quality/`.

**Critérios de aceite:**
- 10 pares cobrindo diferentes cenários (perfeitos fits, matches parciais, áreas totalmente incompatíveis e edge cases).
- Script local de automação que executa esses testes, lê os outputs do LLM e gera relatório de desvio (diferença entre score real e esperado).
- Desvio médio dos testes deve ser inferior a 15 pontos.

**Como testar:**
- Executar o script de qualidade e analisar o relatório gerado.

---

### [ ] 2.4 — ADR: Prompt Engineering

**Escopo:**
Documentar em `/docs/decisions/002-prompt-engineering.md` as decisões tomadas para estruturação do prompt, os testes de qualidade realizados, e os tradeoffs encontrados (ex: maior latência/custo devido ao Chain-of-Thought versus precisão e consistência).

**Critérios de aceite:**
- Incluir as versões de prompt (anterior vs atual).
- Registrar os dados coletados do conjunto de testes.

**Como testar:**
- Revisão de leitura do ADR.

---

## Fase 3 — RAG para Análise Semântica do CV

---

### [ ] 3.1 — Pipeline de Embedding do Currículo

**Escopo:**
Ao salvar ou atualizar o currículo no perfil, executar um pipeline local ou Cloud Function para realizar chunking inteligente por seções lógicas (experiência, educação, habilidades) do texto e gerar embeddings vetorizados. Armazenar os vetores de forma otimizada (Firestore com vector search ou similar).

**Critérios de aceite:**
- Chunking baseado em divisores semânticos (quebras de linha, headers markdown) e não tamanho arbitrário.
- Embeddings gerados usando o modelo `text-embedding-004` (ou equivalente gratuito e eficiente).
- O processamento não ocorre se o hash do conteúdo do currículo for idêntico ao já persistido.

**Como testar:**
- Logs: verificar no console de desenvolvedor ou em logs do Firebase que os embeddings foram criados apenas quando há modificação no texto do currículo.

---

### [ ] 3.2 — Busca Semântica na Análise

**Escopo:**
Durante a análise da vaga, extrair palavras-chave e conceitos críticos da vaga para fazer uma busca de similaridade vetorial contra os chunks de currículo salvos. Alimentar o prompt de análise apenas com os top chunks (3 a 5 mais relevantes) em vez do currículo completo.

**Critérios de aceite:**
- Extração automática de palavras-chave da descrição da vaga.
- O prompt é alimentado com o contexto dos chunks mais relevantes.
- Redução mensurável na quantidade de tokens enviados por análise.
- Caso o serviço vetorial falhe, o sistema usa o currículo inteiro como fallback robusto.

**Como testar:**
- Monitorar a contagem de tokens de entrada nos traces do Langfuse com RAG ativado versus o baseline (CV inteiro) coletado na Fase 1.5.

---

### [ ] 3.3 — Comparativo e ADR: RAG

**Escopo:**
Rodar a suíte de testes (10 pares) utilizando a estratégia RAG e mapear os desvios de score, latência, custos e tokens. Criar o ADR `/docs/decisions/004-rag-architecture.md` documentando os dados comparativos e justificando a escolha dos algoritmos de similaridade e chunking.

**Critérios de aceite:**
- Tabela de comparação direta anexada ao ADR.
- Justificativa clara sobre o impacto do RAG na qualidade versus economia de tokens.

**Como testar:**
- Revisão do relatório e ADR.

---

## Fase 4 — Painel de Uso In-App

---

### [ ] 4.1 — Painel de Uso In-App (Usuário)

**Escopo:**
Desenvolver componente visual em `/app` ou na página de perfil que exibe estatísticas acumuladas do uso do usuário. **Ajuste Fino:** O painel deve focar apenas no consumo operacional (número de análises, tokens acumulados, e métricas da última run como latência e provider). Não exibir informações financeiras estimadas em dólares (USD) para o usuário final, pois isso gera sobrecarga visual e cognitiva desnecessária. O registro de custos em USD continuará a ser gravado no Firestore no histórico para auditoria interna de admin e rastreio de baseline no Langfuse.

**Critérios de aceite:**
- Interface limpa com cards exibindo: Total de Avaliações Realizadas, Tokens Gastos (Acumulado) e Detalhes da Última Run (Latência, Tokens e Provedor utilizado).
- Nenhum valor financeiro (USD / R$) é exibido no frontend para o usuário final.
- Os custos calculados continuam sendo salvos nos metadados da análise no Firestore.

**Como testar:**
- Validar visualmente que o componente no dashboard ou perfil renderiza todas as estatísticas sem menção a dólares ou valores financeiros.
- Verificar se novos dados são acrescidos aos acumulados após a conclusão de uma análise.

---

### [ ] 4.2 — ADR: Painel de Uso e Métricas

**Escopo:**
Criar ou atualizar o ADR de observabilidade com o comparativo real entre o consumo pré-RAG (Fase 1.5) e pós-RAG (Fase 3), validando o retorno sobre o investimento técnico de RAG a partir das métricas reais acumuladas no Firestore/Langfuse de admin versus o que é exibido para o usuário.

**Critérios de aceite:**
- Mapeamento e documentação da decisão de não expor USD na UI do usuário final.
- Comparação estatística consolidada baseada em métricas reais.

**Como testar:**
- Revisão do ADR.

---

## Fase 5 — Polish e Publicação OSS

---

### [ ] 5.1 — README.md Exemplar

**Escopo:**
Refinar o `README.md` raiz para incluir um diagrama visual de arquitetura completo, além de organizar os badges e links rápidos.

**Critérios de aceite:**
- Diagrama de arquitetura de dados e infraestrutura em formato Mermaid ou imagem embutida.
- Badges de build status e licença no início do arquivo.
- Links rápidos estruturados para a documentação de ADRs e guias de contribuição.

**Como testar:**
- Visualizar o README renderizado localmente no editor ou no repositório.

---

### [ ] 5.2 — ARCHITECTURE.md + Compilação de ADRs

**Escopo:**
Criar o arquivo `/docs/ARCHITECTURE.md` para descrever os componentes da aplicação (Landing, Auth, App, LLM Services, Local parsing, Firestore) e estruturar a pasta `/docs/decisions/` com um índice unificado de todos os ADRs criados (001 a 004).

**Critérios de aceite:**
- Índice claro e linkado de todas as decisões arquiteturais.
- Explicação do fluxo de dados e controle entre frontend, banco e APIs de IA.

**Como testar:**
- Validar links internos e leitura do fluxo.

---

### [x] 5.3 — CONTRIBUTING.md + LICENSE

**Escopo:**
Criar diretrizes de contribuição contendo o fluxo de GitFlow, padrões de commit e configuração de ambiente, além da escolha de licença. **Item concluído!** Já criados e estruturados com licença MIT e diretrizes detalhadas de Pull Requests.

---

### [ ] 5.4 — Docker Compose para Dev Local

**Escopo:**
Configurar um ambiente contêinerizado que configure e execute o app localmente com o Firebase Emulator Suite, facilitando a contribuição de novos desenvolvedores de forma agnóstica de sistemas operacionais.

**Critérios de aceite:**
- Execução de `docker-compose up` sobe todo o ecossistema (Vite dev server + Emuladores do Firebase: Auth, Firestore e Hosting).
- Instruções detalhadas adicionadas no `README.md`.

**Como testar:**
- Rodar o comando em ambiente limpo e verificar o pleno funcionamento dos emuladores locais e do app na porta correspondente.

---

### [ ] 5.5 — CI: GitHub Actions

**Escopo:**
Criar uma pipeline básica de integração contínua baseada em GitHub Actions, executada a cada Pull Request em direção à branch `main` ou `develop`.

**Critérios de aceite:**
- Executa passos: `install`, `lint`, `type check`, `test` e `build`.
- Falhas em qualquer uma das etapas bloqueiam a aprovação automática do PR.
- Arquivo de workflow criado em `.github/workflows/ci.yml`.

**Como testar:**
- Abrir um PR com erro proposital de tipo ou lint e verificar o travamento da pipeline.

---

## Backlog Geral / Ideias Futuras (Sem Fase Definida)

---

### [ ] F.1 — Estratégia de Web Scraping Agnóstica e Confiável para Vagas

**Escopo:**
Substituir a raspagem de link direta via proxies client-side (que atualmente está desabilitada temporariamente por inconsistências de formatação e bloqueios de portais de vagas) por uma estratégia robusta e agnóstica de extração de conteúdo de vagas. Estudar abordagens que lidem melhor com estruturas dinâmicas e proteções contra robôs.

**Ideias de implementação:**
- Integrar um agente multimodal/vision de IA (utilizando modelos gratuitos ou de baixíssimo custo como Gemini 2.0 Flash) que possa interpretar capturas de tela ou o DOM completo da página da vaga.
- Usar um parser ou microsserviço de scraping headless server-side se integrável ao Firebase Functions de forma gratuita ou barata.
- Fornecer suporte a extensões de navegador ou bookmarklets para extração do DOM limpo client-side com as credenciais do próprio usuário.

**Critérios de aceite:**
- Opção "Link da vaga" habilitada novamente na interface de análise.
- Suporte estável aos principais portais de vagas nacionais/internacionais (Gupy, LinkedIn, Glassdoor, Indeed, Infojobs).
- Retorno de dados limpos (título da vaga, descrição, requisitos) sem scripts ou tags ruidosas.
- Tratamento gracioso de CAPTCHAs ou bloqueios com fallback claro explicando ao usuário o que ocorreu.
