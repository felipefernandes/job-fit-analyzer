# LANDING PAGE — Job Fit Analyzer

## Objetivo

Página de apresentação do produto que explica o que faz, demonstra como funciona, e convida o visitante a usar via CTA com login Google (Firebase Auth).

Esta landing é o ponto de entrada principal do projeto. Deve funcionar como vitrine tanto para usuários finais (quem busca emprego) quanto para recrutadores e devs que cheguem via GitHub ou LinkedIn.

---

## Identidade Visual

### Direção estética: Dark Terminal / Cyberpunk Minimalista

- **Tema:** Dark — fundo escuro predominante (#0a0a14 ou similar), texto claro
- **Font principal:** `JetBrains Mono` (monospace) — headers, labels, destaques
- **Font secundária:** Uma sans-serif limpa para blocos de texto corrido (sugestão: `IBM Plex Sans`, `Space Grotesk`, ou `Satoshi`)
- **Paleta de cores:**
  - Background: tons de #0a0a14 / #0e0e1a / #12121e
  - Texto principal: #c0c0de / #e0e0f0
  - Acento primário: verde terminal (#00ff88 ou #39ff14) — para CTAs, scores, destaques
  - Acento secundário: ciano (#00d4ff) — para links, badges
  - Warning/gap: vermelho suave (#ff4466)
  - Bordas e separadores: #1e1e32 / #2a2a3e
- **Efeitos visuais permitidos:**
  - Sutil scanline ou noise texture no background (muito leve, ~3-5% opacity)
  - Glow suave no CTA principal
  - Animações de entrada com stagger (fade-in + translate-y)
  - Cursor piscante estilo terminal em algum elemento decorativo
- **Efeitos proibidos:**
  - Gradientes genéricos roxo-para-azul
  - Parallax pesado
  - Partículas / canvas animations
  - Qualquer coisa que pareça template de landing de SaaS genérico

---

## Estrutura da Página

### Seção 1 — Hero

**Objetivo:** Capturar atenção e explicar em 1 frase o que o produto faz.

Conteúdo:
- **Headline:** Algo no estilo: "Descubra seu fit com qualquer vaga. Em segundos."
- **Subheadline:** "Cole seu currículo, cole a vaga, receba um score de compatibilidade gerado por IA. Simples assim."
- **CTA principal:** Botão "Experimente Agora →" (ancora para seção de login ou rola para próxima seção)
- **Badge de contexto:** "Open Source · Gratuito · Seus dados, suas chaves"

Direção visual: headline grande, bastante espaço negativo, CTA com glow verde.

---

### Seção 2 — Como Funciona

**Objetivo:** Demonstrar o passo a passo simplificado de uso.

Conteúdo — 3 steps visuais:

```
Step 1                    Step 2                    Step 3
[ícone: documento]        [ícone: link/paste]       [ícone: score/gráfico]
Envie seu currículo       Cole a vaga               Receba seu score
MD, texto, ou link        URL ou texto direto       0-100 com análise
de Google Docs público    do anúncio                de fit e gaps
```

Direção visual: cards ou blocos com numeração estilo terminal (`01_`, `02_`, `03_`), ícones minimalistas (pode ser SVG inline ou emoji estilizado), animação de entrada sequencial (stagger).

---

### Seção 3 — O que você recebe

**Objetivo:** Mostrar que não é só um número — é uma análise acionável.

Conteúdo — listar as dimensões da análise:
- Score geral de compatibilidade (0–100)
- Breakdown por dimensão (técnico, senioridade, cultura, ATS keywords)
- Pontos de FIT — o que combina
- Pontos de GAP — o que falta
- Recomendação — vale aplicar ou não

Direção visual: mock de um resultado de análise (pode ser estático/decorativo), estilo terminal output. Não precisa ser funcional, apenas ilustrativo.

---

### Seção 4 — Transparência e Privacidade

**Objetivo:** Gerar confiança. Isso é crítico para um produto que lida com currículo.

Conteúdo — bullets ou cards:
- "Você usa SUA chave de API — nenhum dado de LLM passa por nós"
- "Seu currículo fica no SEU Firestore — criptografado"
- "Código 100% aberto — audite no GitHub"
- "Sem ads. Sem tracking. Sem venda de dados."

Direção visual: tom mais sóbrio, pode usar ícones de lock/shield.

---

### Seção 5 — CTA Final + Login

**Objetivo:** Converter. O visitante que rolou até aqui está interessado.

Conteúdo:
- **Headline:** "Pronto pra testar?"
- **Botão:** "Entrar com Google →" (Firebase Auth — Google Sign-In)
- **Nota:** "Gratuito. Open source. Sem pegadinhas."
- **Link secundário:** "Ver no GitHub →" (link para o repositório)

Direção visual: CTA em destaque máximo, verde com glow. Link do GitHub mais discreto abaixo.

---

### Footer

Conteúdo mínimo:
- "Job Fit Analyzer · Open Source · Feito por Felipe Fernandes"
- Link GitHub
- Link LinkedIn (opcional)
- Ano

---

## Comportamento e Fluxo

1. Visitante chega na landing
2. Rola, entende o produto
3. Clica no CTA ("Experimente Agora" ou "Entrar com Google")
4. Firebase Auth popup — Google Sign-In
5. Após login, redireciona para a aplicação principal (`/app` ou rota equivalente)
6. Na primeira vez, aciona onboarding (coach marks — implementação futura, fora do escopo da landing)

---

## Requisitos Técnicos

- **Framework:** React (mesmo do app principal) ou HTML/CSS/JS standalone
- **Hosting:** Firebase Hosting (já configurado)
- **Responsivo:** Mobile-first — deve funcionar bem em telas de celular (candidatos usam muito mobile)
- **Performance:** Sem dependências pesadas na landing — tempo de carregamento < 2s
- **SEO mínimo:** Meta tags (title, description, og:image) para compartilhamento em redes sociais e LinkedIn
- **Firebase Auth:** Integrar botão de login com Google Sign-In via Firebase SDK
- **Analytics:** Firebase Analytics event no clique do CTA (evento: `cta_click`, parâmetro: `location: hero | footer`)

---

## Referências de Tom de Voz (Copy)

- Direto, sem bullshit corporativo
- Levemente informal, mas confiante
- Técnico sem ser excludente — lembre que o público é qualquer pessoa buscando emprego, não só devs
- Evitar: "revolucionário", "game-changer", "powered by AI" de forma genérica
- Preferir: linguagem prática, verbos de ação, frases curtas

---

## O que NÃO implementar na landing

- Sistema de pricing/planos
- Formulário de contato
- Blog
- Chat/suporte
- Qualquer funcionalidade do app em si (a landing só apresenta e redireciona)