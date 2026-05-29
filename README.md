# Job Fit Analyzer

O **Job Fit Analyzer** é um analisador inteligente de fit de carreira que cruza as informações do currículo de um candidato com os requisitos de uma vaga de emprego (seja por link direto ou por texto colado). Ele utiliza inteligência artificial avançada para calcular o nível de aderência, identificar gaps críticos e fornecer recomendações de melhorias no currículo.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### Passo 1: Instalar as dependências
Na pasta raiz do projeto, instale os pacotes npm necessários:
```bash
npm install
```

### Passo 2: Executar em ambiente de desenvolvimento
Inicie o servidor local com hot-reload automático:
```bash
npm run dev
```
O projeto estará disponível no navegador através do endereço [http://localhost:5173/](http://localhost:5173/).

> [!NOTE]
> **Configuração das Chaves de API**: Como as chaves de API não são salvas no arquivo `.env` para evitar exposição em ambientes de deploy, você deve configurá-las diretamente na página de Perfil no painel da aplicação. Elas são criptografadas client-side e armazenadas de forma segura no banco de dados Firestore, sendo descriptografadas apenas durante a sua sessão local no navegador.

### Passo 3: Build de Produção
Para compilar a aplicação otimizada para produção:
```bash
npm run build
```

---

O **Job Fit Analyzer** evoluiu de uma ferramenta estática para uma plataforma completa com backend serverless integrada ao **Firebase**:

### 1. Autenticação e Rotas
* **Firebase Auth**: Login facilitado via Google Sign-In.
* **Rotas da Aplicação**:
  * `/` (Landing Page): Apresentação do produto com termos e políticas.
  * `/app` (Nova Análise): Entrada de vagas (texto colado; opção de link/URL temporariamente desativada).
  * `/app/history` (Histórico): Histórico de avaliações salvas no Firestore.
  * `/app/profile` (Perfil): Gerenciamento de dados, upload de currículo (.pdf, .docx, .odt, .txt, .md) e chaves de API.
  * `/terms` e `/privacy`: Documentos regulatórios e preferências de LGPD.

### 2. Segurança de Segredos e Chaves de API
* **Segredos Globais e Observabilidade**: Segredos do sistema (como a chave privada do Langfuse) residem exclusivamente nas variáveis de ambiente do backend serverless (dentro de `functions/`), mitigando qualquer risco de vazamento no bundle JavaScript do navegador.
* **Criptografia Client-Side (BYOK)**: As chaves de API opcionais fornecidas pelos próprios usuários são salvas criptografadas com AES-GCM no Firestore e transmitidas temporariamente de forma segura durante a requisição autenticada do HTTPS Callable para o backend.

---

## 🤖 Arquitetura Serverless, Multi-Modelos e Observabilidade

O Job Fit Analyzer opera sob uma arquitetura híbrida e altamente resiliente para chamadas a Large Language Models (LLMs) e telemetria:

### 1. Separação de Responsabilidades (Client vs. Backend)
* **Frontend (Vite/React)**: Lida com a interface do usuário, upload de arquivos, parsing local de documentos, autenticação e gerenciamento de dados do perfil do usuário.
* **Backend (Firebase Cloud Functions)**: Centraliza a execução das chamadas para os provedores de LLM e realiza o rastreamento (telemetria/observabilidade) via Langfuse em ambiente restrito e seguro de servidor.

### 2. Provedores Suportados e Fallback
A Cloud Function suporta seis provedores principais de IA, roteando as requisições dinamicamente conforme as chaves configuradas:
* **Gemini (Google)**: Provedor principal sugerido (tier gratuito generoso).
* **Groq**: Extremamente rápido, utilizando o modelo **Llama 3.3 70B**.
* **OpenAI**: Suporte a modelos de mercado como o **GPT-4o mini**.
* **Anthropic Claude**: Suporte a modelos Claude.
* **OpenRouter**: Gateway flexível que permite acessar múltiplos modelos de forma transparente.
* **DeepSeek**: Modelos eficientes e de custo extremamente baixo (e.g. **DeepSeek-Chat**).

### 3. Observabilidade e Tracing
Toda a execução das chamadas de LLM é rastreada em tempo real no servidor usando o **Langfuse SDK**, medindo métricas de latência, contagem de tokens de entrada/saída, erros e custos operacionais estimados, gerando visibilidade completa para o administrador.

---

## 📂 Estrutura de Módulos Principal

* **[functions/index.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/functions/index.js)**: Código da Cloud Function `analyzeJobFitHttp` do Firebase. Centraliza a lógica de fallback de IAs, o tratamento de chamadas e a integração de observabilidade via Langfuse.
* **[src/services/llm.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/llm.js)**: Serviço cliente no frontend que dispara chamadas HTTPS seguras (`httpsCallable`) para a função serverless, desacoplando o cliente de chaves e requisições diretas de IA.
* **[src/pages/Analyzer.jsx](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/pages/Analyzer.jsx)**: Painel principal onde o usuário realiza o input da vaga, inicia a análise e visualiza o feedback visual da IA utilizada.
* **[src/pages/Profile.jsx](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/pages/Profile.jsx)**: Interface do perfil do usuário para gerenciar dados pessoais, currículo, upload local, e cadastrar chaves de API com validação real via ping.
* **[src/services/db.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/db.js)**: Serviço de comunicação com o Firestore, incluindo criptografia client-side de chaves de API usando AES-GCM.
* **[src/services/fileParser.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/fileParser.js)**: Serviço de conversão e extração de texto para múltiplos formatos de currículo (.pdf, .docx, .odt, .md, .txt) executado client-side.

---

## 🤝 Contribuição

Este projeto é open-source e está aberto a contribuições da comunidade! Se você deseja colaborar com melhorias, novos recursos ou correção de problemas, por favor leia o nosso **[Guia de Contribuição](./CONTRIBUTING.md)** para saber como configurar seu ambiente de testes e submeter suas alterações via Pull Request.
