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

### 1. Fluxo de Visualização (Views)
A aplicação possui três estados de renderização principais controlados pela variável de estado `view`:
* **`loading`**: Exibido enquanto o currículo salvo está sendo recuperado do armazenamento local.
* **`setup`**: Tela inicial de onboarding (FTUE) e edição de currículo onde o usuário pode optar por colar texto/markdown diretamente na caixa de entrada ou importar arquivos locais (.pdf, .docx, .odt, .txt, .md) extraídos de forma segura 100% no navegador (client-side).
* **`analyze`**: Painel principal onde o usuário fornece os dados da vaga e visualiza os relatórios de fit.

### 2. Armazenamento Local e Resiliência
O currículo do candidato é salvo localmente no navegador:
* **Estratégia de Persistência**: A aplicação tenta usar o objeto de sandbox `window.storage` (com métodos `.set()` e `.get()`).
* **Fallback de Compatibilidade**: Caso a API do sandbox não esteja disponível (por exemplo, ao rodar localmente no Chrome/Firefox padrão), a aplicação faz um fallback transparente para o **`localStorage`** padrão do navegador (`localStorage.getItem()` e `localStorage.setItem()`).

---

## 🤖 Arquitetura Multi-Modelos (Orquestrador de IA)

O Job Fit Analyzer opera sob uma estrutura resiliente de duas camadas para realizar o processamento linguístico do currículo e das vagas:

### 1. Provedor Padrão: Gemini 2.5 Flash (Google)
* O **Gemini 2.5 Flash** é a escolha principal pelo seu custo-benefício, velocidade e suporte a grandes contextos.
* **Busca Web**: Ao analisar links de vagas ou importar do Google Docs, habilitamos o recurso nativo **Google Search Grounding** na API (`tools: [{ googleSearch: {} }]`). Isso instrui o modelo a realizar a busca e obter as informações em tempo real diretamente.
* **JSON Estrito**: O modelo é configurado para responder exclusivamente em JSON estruturado de acordo com o esquema da aplicação.

### 2. Provedor de Fallback: Llama 3.3 70B (Groq)
* Caso a API do Gemini apresente falhas de limite de requisições, erros de conexão ou chave inválida, o orquestrador `fetchLlm` intercepta o erro silenciosamente e direciona a requisição para a **Groq** utilizando o modelo **Llama 3.3 70B** (`llama-3.3-70b-versatile`).
* A interface de resultados indica na tela qual modelo foi utilizado no processamento da análise atual.

---

## 📂 Estrutura de Módulos Principal

* **[src/App.jsx](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/App.jsx)**: Componente único central que contém toda a lógica de negócio, chamadas REST para Gemini e Groq, orquestração de falhas, tratamento de erros, estados do onboarding flexível e renderização da interface adaptativa.
* **[src/services/fileParser.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/services/fileParser.js)**: Serviço de conversão e extração de texto para múltiplos formatos de currículo (.pdf, .docx, .odt, .md, .txt) executado client-side, incluindo algoritmo de reconstrução de linhas baseada em coordenadas Y/X para PDFs.
* **[src/index.css](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/src/index.css)**: Estilos globais, resets de compatibilidade, fontes personalizadas do Google Fonts (`DM Sans` e `JetBrains Mono`) e animações cyber-terminal (scanlines e blinks).
* **[index.html](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/index.html)**: Arquivo base que define o ponto de montagem do React (`#root`).
* **[vite.config.js](file:///c:/Users/felip/OneDrive/Documents/Projects/job-fit-analyzer/vite.config.js)**: Configurações do Vite e plugins de compilação React.

---

## 🤝 Contribuição

Este projeto é open-source e está aberto a contribuições da comunidade! Se você deseja colaborar com melhorias, novos recursos ou correção de problemas, por favor leia o nosso **[Guia de Contribuição](./CONTRIBUTING.md)** para saber como configurar seu ambiente de testes e submeter suas alterações via Pull Request.
