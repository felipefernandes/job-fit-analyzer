# Guia de Contribuição - Job Fit Analyzer

Olá! Que bom que você quer contribuir com o **Job Fit Analyzer**! 🚀

Este projeto é de código aberto e valorizamos muito cada contribuição, seja corrigindo bugs, adicionando melhorias visuais, otimizando performance ou aprimorando a documentação.

Para garantir que o desenvolvimento ocorra de forma organizada e segura para todos, siga as instruções abaixo para configurar seu ambiente local e submeter suas alterações.

---

## 🛠️ Como Configurar o Ambiente de Desenvolvimento

### 1. Pré-requisitos
* Ter o **Node.js** (versão 18 ou superior recomendado) instalado.
* Git configurado em sua máquina.

### 2. Clonar e Instalar
Faça o fork deste repositório e clone-o em sua máquina local:
```bash
git clone https://github.com/SEU-USUARIO/job-fit-analyzer.git
cd job-fit-analyzer
npm install
```

### 3. Configurar as Variáveis de Ambiente e o Firebase de Testes
Para não poluir o banco de dados de produção do projeto principal e permitir que você faça testes livremente, você precisará configurar seu próprio projeto do Firebase de testes.

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) e clique em **Adicionar projeto** (é totalmente gratuito).
2. Na tela inicial do seu projeto Firebase, registre um aplicativo Web clicando no ícone do navegador (`</>`).
3. Dê um nome ao aplicativo e copie os parâmetros de configuração gerados (como `apiKey`, `authDomain`, `projectId`, etc.).
4. Copie o arquivo `.env.example` do projeto para um novo arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
5. Preencha os campos `VITE_FIREBASE_*` no seu arquivo `.env` local com as chaves copiadas do seu projeto Firebase.
6. **Configuração de Serviços no seu Firebase:**
   * **Authentication:** No menu lateral do console do Firebase, acesse *Autenticação*, ative o provedor de login por **E-mail/Senha**.
   * **Firestore Database:** Acesse *Firestore Database*, clique em *Criar banco de dados* (selecione o modo de teste ou produção). Certifique-se de implantar as regras contidas no arquivo `firestore.rules` do projeto para garantir a segurança dos testes.
7. Com isso feito, inicie o servidor de desenvolvimento local:
   ```bash
   npm run dev
   ```

---

## 🌿 Fluxo de Trabalho do Git (GitFlow)

Para manter o histórico limpo e organizado, seguimos as seguintes regras de branch:

1. **Nunca envie commits diretamente na branch `main`.**
2. Crie uma branch específica para a sua alteração partindo da última versão da `main`:
   * **Funcionalidades:** `feat/nome-da-funcionalidade`
   * **Correções de bugs:** `fix/nome-do-bug`
   * **Refatorações:** `refactor/o-que-mudou`
3. Exemplo de fluxo recomendado:
   ```bash
   # Garanta que a main está atualizada
   git checkout main
   git pull origin main

   # Crie sua branch de trabalho
   git checkout -b feat/melhoria-no-design
   ```

---

## 🔍 Qualidade de Código e Revisão

Antes de submeter o seu Pull Request (PR):

1. **Linting e Formatação:**
   Verifique se o seu código não possui erros de sintaxe ou avisos críticos.
   ```bash
   npm run lint
   ```
2. **Uso de Ferramentas Estáticas (CLI Iara):**
   Se o seu ambiente possuir a ferramenta de análise de qualidade estática `iara` instalada, rode-a no seu diff antes de commitar para garantir que não haja erros pendentes:
   ```bash
   git diff main | iara
   ```
3. **Mantenha a segurança:**
   Nunca commite credenciais, senhas ou chaves de API reais de provedores (Gemini, Groq ou do seu próprio Firebase) nos arquivos de código do Git. Use sempre variáveis locais no `.env`.

---

## 📬 Como Submeter um Pull Request (PR)

1. Faça o push da sua branch para o seu fork no GitHub:
   ```bash
   git push origin feat/melhoria-no-design
   ```
2. Acesse a página do repositório original no GitHub e você verá um botão sugerindo **Compare & pull request**.
3. Preencha o template de Pull Request padrão com as informações solicitadas (descrição, o que foi testado, etc.).
4. Aguarde a validação da Integração Contínua (CI) e a revisão de código de um dos mantenedores do projeto.

Muito obrigado por ajudar a tornar o **Job Fit Analyzer** melhor! 💙
