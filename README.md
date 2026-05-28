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

## 🛠️ Funcionamento e Fluxo da Aplicação

O Job Fit Analyzer evoluiu de uma ferramenta estática para uma plataforma completa integrada ao **Firebase**:

### 1. Autenticação e Rotas
* **Firebase Auth**: Login facilitado via Google Sign-In.
* **Rotas da Aplicação**:
  * `/` (Landing Page): Apresentação do produto com termos e políticas.
  * `/app` (Nova Análise): Entrada de vagas (URL com raspagem de conteúdo ou texto colado).
  * `/app/history` (Histórico): Histórico de avaliações salvas no Firestore.
  * `/app/profile` (Perfil): Gerenciamento de dados, upload de currículo (.pdf, .docx, .odt, .txt, .md) e chaves de API.
  * `/terms` e `/privacy`: Documentos regulatórios e preferências de LGPD.

### 2. Persistência de Dados (Firestore)
* O currículo e os metadados são salvos na coleção `users/{uid}`.
* **Criptografia Client-Side**: As chaves de API dos provedores de LLM são criptografadas localmente no navegador (usando chaves derivadas do UID do usuário por AES-GCM) antes de serem enviadas para o Firestore.

---

## 🤖 Arquitetura Multi-Modelos e Fallback Resiliente

O Job Fit Analyzer opera sob uma estrutura unificada e altamente resiliente para chamadas a Large Language Models (LLMs) client-side:

### 1. Provedores Suportados
A aplicação suporta seis provedores principais de IA, permitindo que o usuário traga suas próprias chaves de API:
* **Gemini (Google)**: Provedor principal sugerido (tier gratuito generoso). Suporta a ferramenta nativa de **Google Search Grounding** para raspar dados de vagas via links da web.
* **Groq**: Extremamente rápido, utilizando o modelo **Llama 3.3 70B**.
* **OpenAI**: Suporte a modelos de mercado como o **GPT-4o mini**.
* **Anthropic Claude**: Suporte a modelos Claude client-side (com fallback de rede amigável sob restrições de CORS).
* **OpenRouter**: Gateway flexível que permite acessar modelos Claude e Gemini de forma transparente e sem problemas de CORS no navegador.
* **DeepSeek**: Modelos eficientes e de custo extremamente baixo (e.g. **DeepSeek-Chat**).

### 2. Cadeia de Fallback Inteligente
Se o usuário configurar mais de uma chave de API, o serviço [llm.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/llm.js) ativa automaticamente a cadeia de fallback:
* **Ordem de Prioridade Fixa**: O sistema tenta os provedores cadastrados na seguinte sequência: `Gemini` ➔ `Groq` ➔ `OpenAI` ➔ `Anthropic` ➔ `OpenRouter` ➔ `DeepSeek`.
* **Tratamento de Erros Inteligente**:
  * Erros temporários de rede, timeouts ou limites de quota (HTTP 429 / 5xx) acionam imediatamente a IA secundária da cadeia de forma silenciosa para o usuário.
  * Erros de autenticação (chave inválida ou saldo insuficiente) abortam a cadeia de imediato para notificar o usuário diretamente e evitar erros de configuração.
  * Se apenas uma chave estiver configurada, o fallback é desativado por completo.

---

## 📂 Estrutura de Módulos Principal

* **[src/services/llm.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/llm.js)**: Serviço unificado de abstração de LLMs. Contém os adaptadores para as 6 APIs suportadas, tratamento e tradução de erros específicos, e o orquestrador de fallback inteligente.
* **[src/pages/Analyzer.jsx](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/pages/Analyzer.jsx)**: Painel principal onde o usuário realiza o input da vaga, dispara a análise com os fallbacks e visualiza o feedback visual da IA utilizada.
* **[src/pages/Profile.jsx](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/pages/Profile.jsx)**: Interface do perfil do usuário para gerenciar dados pessoais, currículo, upload local, e cadastrar chaves de API com validação real via ping.
* **[src/services/db.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/db.js)**: Serviço de comunicação com o Firestore, incluindo criptografia client-side de chaves de API usando AES-GCM.
* **[src/services/fileParser.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/fileParser.js)**: Serviço de conversão e extração de texto para múltiplos formatos de currículo (.pdf, .docx, .odt, .md, .txt) executado client-side.

---

## 🤝 Contribuição

Este projeto é open-source e está aberto a contribuições da comunidade! Se você deseja colaborar com melhorias, novos recursos ou correção de problemas, por favor leia o nosso **[Guia de Contribuição](./CONTRIBUTING.md)** para saber como configurar seu ambiente de testes e submeter suas alterações via Pull Request.
