# [rulecase] — Regra para Criação de Novas Páginas Case Study

> Baseado no template: `case/decathlon.html`
> Versão: 1.0 · Última revisão: Abril 2026

---

## 1. Convenção de Nomenclatura e Estrutura de Arquivos

```
case/
  [slug-do-case].html          ← página do case (ex: pernambucanas.html)

img/
  cases/
    [slug-do-case]/
      1.png                    ← screenshots para o gallery (mín. 4)
      2.png
      3.png
      4.png
```

- O **slug** deve ser em minúsculas, sem espaços, usando hífens (ex: `no-friction`, `pernambucanas`).
- Nunca criar subpastas extras dentro de `case/`. Todas as páginas ficam no mesmo nível.
- A glob `"./case/**/*.html"` no `tailwind.config.js` já cobre automaticamente novos arquivos.

---

## 2. Estrutura HTML Obrigatória

A página deve seguir **exatamente** a sequência de seções abaixo. Não remover, reordenar ou renomear seções sem atualizar esta regra.

```
<head>           → SEO, favicon SVG, Tabler Icons CDN
<header>         → Navegação idêntica ao template (FROZEN — não modificar)
<main>
  §1 CASE HERO   → Back button + H1 title + Hero banner full-width
  §2 OVERVIEW    → 2 colunas: logo da empresa + texto descritivo
  §3 CONTEXT     → Texto corrido (até 3 parágrafos)
  §4 CHALLENGE   → 2 colunas: imagem + texto com bullet points
  §5 PROCESS     → Timeline horizontal de 5 etapas (process-timeline)
  §6 GALLERY     → Grade de 4 screenshots (case-gallery)
  §7 IMPACT      → 3 metric-cards com números e descrições
  §8 BACK HOME   → Divider + link de retorno centrado
<footer>         → Footer idêntico ao template (FROZEN — não modificar)
<script>         → src="/src/main.ts" (único script, sempre ao final do body)
```

> **FROZEN** = copiar literalmente do template, sem alterações de classe, estrutura ou atributos.

---

## 3. `<head>` — Checklist

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>[Case Title] — [Subtítulo] | Raul Lima</title>
<meta name="description" content="[Descrição SEO com resultados, aprox. 155 chars]" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22...%22>..." />
<!-- Tabler Icons Standard — OBRIGATÓRIO -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
```

- **Proibido** adicionar `<link>` para CSS externo adicional. Todos os estilos vêm de `/src/index.css` via `main.ts`.
- **Proibido** adicionar `<style>` inline na `<head>`.

---

## 4. Design Tokens — Regras de Uso

Sempre use **CSS variables** definidas em `src/index.css`. Nunca use valores hexadecimais hardcoded no HTML.

| Categoria              | Token / Classe Tailwind               | Uso                                           |
|------------------------|---------------------------------------|-----------------------------------------------|
| **Texto primário**     | `text-text-primary-dark`              | Títulos e conteúdo em destaque                |
| **Texto secundário**   | `text-text-muted-dark`                | Corpo de texto, descrições                    |
| **Accent**             | `text-accent`, `bg-accent`            | CTAs, destaques, bullet points                |
| **Borders**            | `border-[var(--color-border)]`        | Bordas de cards e containers                  |
| **Backgrounds sutis**  | `bg-[var(--alpha-5)]`                 | Cards e painéis internos                      |
| **Border radius MD**   | `var(--radius-md)` (16px)             | Containers de mídia `.case-img-placeholder`   |
| **Border radius 2xl**  | `rounded-2xl`                         | Metric cards, process timeline                |
| **Tipografia serif**   | `font-serif font-bold`                | H1, H2 (títulos de seção)                     |
| **Espaçamento seções** | `py-16 md:py-24`                      | Padding vertical padrão de cada seção         |
| **Container**          | `max-w-7xl mx-auto px-6`              | Wrapper de conteúdo em todas as seções        |

---

## 5. CSS Classes do Design System — Obrigatórias

Definidas em `src/index.css`. **Não recriar inline**.

| Classe                   | Onde usar                                               |
|--------------------------|---------------------------------------------------------|
| `.glass-nav`             | No `<header>` (FROZEN)                                  |
| `.case-hero-banner`      | Div do hero banner (§1)                                 |
| `.case-img-placeholder`  | Container do logo (§2) e da imagem do challenge (§4)    |
| `.case-label`            | Pills de label: "Desafio", "Processo", "Impacto"        |
| `.heading-accent`        | `<h1>` e `<h2>` — gera o underline accent automático    |
| `.reveal`                | Todos os elementos com animação de entrada (scroll)     |
| `.process-timeline`      | Container da timeline de process (§5)                   |
| `.process-step`          | Cada etapa individual da timeline                       |
| `.case-gallery`          | Grid das screenshots (§6)                               |
| `.case-gallery-item`     | Cada item individual da galeria                         |
| `.metric-card`           | Cards de impacto/métricas (§7)                          |

---

## 6. Animações — `.reveal`

O `main.ts` usa `IntersectionObserver` para animar qualquer elemento com `.reveal` ao entrar na viewport.

```html
<!-- ✅ Correto -->
<div class="grid md:grid-cols-2 gap-12 reveal">...</div>

<!-- ❌ Errado — .reveal no pai E no filho gera bug visual -->
<div class="reveal">
  <div class="reveal">...</div>
</div>
```

- Adicionar `.reveal` **no container da seção**, não em cada filho individualmente.
- Exceção: colunas independentes lado a lado podem ter `.reveal` separado.

---

## 7. Sistema de Internacionalização (i18n)

Todos os textos visíveis devem ter tradução. O sistema usa `data-i18n` lido de `src/translations.json`.

### 7.1 Convenção de chaves

```
case.[slug].[secao].[campo]
```

**Lista completa de chaves obrigatórias para todo novo case:**

```
case.[slug].title
case.[slug].hero_subtitle
case.[slug].overview.company
case.[slug].context.title
case.[slug].context.p1
case.[slug].context.p2
case.[slug].context.p3
case.[slug].challenge.label
case.[slug].challenge.intro
case.[slug].challenge.research
case.[slug].challenge.list.1
case.[slug].challenge.list.2
case.[slug].challenge.list.3
case.[slug].challenge.conclusion
case.[slug].process.label
case.[slug].process.intro
case.[slug].process.step1.title  → case.[slug].process.step5.title
case.[slug].process.step1.desc   → case.[slug].process.step5.desc
case.[slug].gallery.label
case.[slug].impact.label
case.[slug].impact.intro
case.[slug].impact.metric1.value
case.[slug].impact.metric1.desc
case.[slug].impact.metric2.value
case.[slug].impact.metric2.desc
case.[slug].impact.metric3.value
case.[slug].impact.metric3.desc
case.[slug].back_home
```

> A chave `case.back` é **compartilhada** por todos os cases — não duplicar.

### 7.2 Uso no HTML

```html
<!-- Texto simples -->
<span data-i18n="case.[slug].challenge.label">Desafio</span>

<!-- Com HTML interno (bold, breaks) -->
<p data-i18n="case.[slug].challenge.intro">
  O principal desafio foi <strong>transformar...</strong>
</p>
```

- O texto dentro da tag é o **fallback em português** e deve sempre estar presente.

### 7.3 Onde adicionar as traduções

Em `src/translations.json`, adicionar dentro dos blocos `"pt"` **e** `"en"`:

```json
{
  "pt": { "case.[slug].title": "Título em PT", ... },
  "en": { "case.[slug].title": "Title in EN", ... }
}
```

---

## 8. Seção §1 — CASE HERO

```html
<section class="pt-[60px] pb-16">
  <div class="max-w-7xl mx-auto px-6">
    <!-- Back button — FROZEN -->
    <a href="/index.html#cases"
      class="inline-flex items-center gap-2 text-sm text-text-muted-dark hover:text-accent transition-colors mb-6 group">
      <i class="ti ti-arrow-left text-lg transition-transform group-hover:-translate-x-1"></i>
      <span data-i18n="case.back">Voltar</span>
    </a>

    <!-- H1 — único da página -->
    <h1 class="font-serif text-4xl md:text-5xl font-bold mb-[60px] heading-accent reveal"
      data-i18n="case.[slug].title">
      [Título do Case em PT]
    </h1>
  </div>

  <!-- Hero banner FULL WIDTH — border-radius: 0 obrigatório -->
  <div class="case-hero-banner reveal"
    style="background-image: url('[URL_UNSPLASH]'); border-radius: 0;">
    <div class="absolute inset-0 bg-black/40 z-0"></div>
    <div class="absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-6">
      <div class="mb-4 flex flex-col items-center gap-3">
        <i class="ti ti-[icone] text-accent text-5xl drop-shadow-lg"></i>
        <p class="text-xs md:text-sm uppercase tracking-[0.2em] font-semibold text-white/80 drop-shadow-md"
          data-i18n="case.[slug].hero_subtitle">
          [Subtítulo do setor]
        </p>
      </div>
      <span class="text-6xl md:text-[8rem] font-bold text-white/10 font-serif tracking-widest select-none uppercase">
        [NOME DA EMPRESA]
      </span>
    </div>
  </div>
</section>
```

- Imagem Unsplash: `?q=80&w=2938&auto=format&fit=crop`
- Ícone Tabler: tematicamente relacionado ao setor do case.

---

## 9. Logo com Suporte Dark/Light (§2 — OVERVIEW)

Para logos SVG que precisam mudar de cor entre temas:

**1. Adicionar em `src/index.css` no bloco `:root` (dark):**
```css
--color-logo-[slug]: #FFFFFF;
```

**2. Adicionar no bloco `:root[data-theme="light"]`:**
```css
--color-logo-[slug]: #[cor-original-do-brand];
```

**3. No SVG:**
```html
<svg ... aria-label="[Nome da empresa]">
  <path ... fill="var(--color-logo-[slug])"/>
</svg>
```

> ⚠️ **Atenção:** o token deve estar declarado em `:root` (dark) E em `:root[data-theme="light"]`. Declarar apenas no tema light causa bug de `undefined` no modo dark.

---

## 10. Seção §5 — PROCESS (sempre 5 etapas)

A timeline tem sempre **exatamente 5 etapas** (condensar ou expandir descritivamente conforme necessário):

```html
<div class="process-timeline rounded-2xl border border-[var(--color-border)] bg-[var(--alpha-5)] overflow-hidden reveal">
  <div class="process-step">
    <div class="step-number">01</div>
    <h3 class="step-title" data-i18n="case.[slug].process.step1.title">Nome</h3>
    <p class="step-desc" data-i18n="case.[slug].process.step1.desc">Descrição.</p>
  </div>
  <!-- step 02, 03, 04, 05 ... -->
</div>
```

---

## 11. Seção §7 — IMPACT (sempre 3 métricas)

```html
<div class="grid md:grid-cols-3 gap-6 reveal">
  <!-- Métrica 1 e 3: text-accent (positivo). Métrica 2: sem classe de cor (contraste) -->
  <div class="metric-card rounded-2xl border border-[var(--color-border)] bg-[var(--alpha-5)]">
    <p class="metric-value text-accent" data-i18n="case.[slug].impact.metric1.value">+35%</p>
    <p class="metric-desc" data-i18n="case.[slug].impact.metric1.desc">
      <strong>descrição</strong>, contexto adicional
    </p>
  </div>
  <!-- metric2 sem text-accent, metric3 com text-accent -->
</div>
```

---

## 12. ATUALIZAÇÃO DA HOME (index.html)

Sempre que criar um novo case, é **obrigatório** atualizar ou adicionar o card correspondente na seção de Cases na Home (`index.html`).

O card do case na `index.html` deve usar:
- A mesma imagem do Hero Banner do case como background (com `bg-black/20` para contraste).
- Ser um link (`<a>`) referenciando a nova página.
- Manter o efeito de `zoom` no hover.

**Exemplo de estrutura a usar na `index.html`:**
```html
<a href="/case/[slug].html" class="case-card reveal group bg-white border border-black/06 block">
  <div class="aspect-video w-full overflow-hidden bg-gray-100 relative">
    <div class="absolute inset-0 bg-black/20 z-10 group-hover:bg-black/10 transition-colors duration-500"></div>
    <img src="[URL_UNSPLASH_DO_HERO_BANNER]" alt="[Alt ou nome do case]" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 z-0" />
  </div>
  <div class="p-6">
    <p class="text-xs font-medium text-text-muted-light uppercase tracking-widest mb-2">[TAGS SETOR]</p>
    <h3 class="font-serif text-xl font-bold mb-2" style="color:#111">[NOME DA EMPRESA]</h3>
    <p class="text-sm text-text-muted-light leading-relaxed" data-i18n="cases.[slug].desc">[Descrição breve]</p>
    <div class="mt-4 inline-flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all" style="color:#111">
      <span data-i18n="cases.[slug].link">Ver case</span> <span>→</span>
    </div>
  </div>
</a>
```

---

## 13. Checklist de Validação Antes de Publicar

### ✅ Estrutura
- [ ] Arquivo em `case/[slug].html`
- [ ] Imagens em `img/cases/[slug]/1.png` a `4.png`
- [ ] Header e Footer copiados literalmente do template (não modificados)
- [ ] `<script type="module" src="/src/main.ts"></script>` único e ao final do `<body>`

### ✅ Design System
- [ ] Nenhuma cor hexadecimal hardcoded no HTML
- [ ] Todos os cards usam `border-[var(--color-border)]` e `bg-[var(--alpha-5)]`
- [ ] Logo SVG usa `fill="var(--color-logo-[slug])"` com token em `index.css`
- [ ] Token `--color-logo-[slug]` definido em `:root` E em `:root[data-theme="light"]`

### ✅ i18n
- [ ] Todas as strings visíveis têm `data-i18n` correspondente
- [ ] Chaves `case.[slug].*` adicionadas em **`"pt"`** no `translations.json`
- [ ] Chaves `case.[slug].*` adicionadas em **`"en"`** no `translations.json`
- [ ] Texto fallback em português presente dentro de cada tag

### ✅ Comportamento
- [ ] Dark/Light mode testado — todos os elementos mudam corretamente
- [ ] Troca de idioma EN/PT testada — todos os textos mudam
- [ ] Animações `.reveal` funcionando ao fazer scroll
- [ ] Back button direciona para `/index.html#cases`

### ✅ SEO
- [ ] `<title>` único e descritivo
- [ ] `<meta name="description">` com resultados do case (< 155 chars)
- [ ] Apenas **1 `<h1>`** na página
- [ ] Atributos `alt` descritivos em todas as `<img>`

### ✅ Responsividade
- [ ] Testado em 375px (Mobile)
- [ ] Testado em 768px (Tablet)
- [ ] Testado em 1440px (Desktop)

---

## 14. O que NÃO fazer

| ❌ Proibido                                       | ✅ Correto                                            |
|---------------------------------------------------|-------------------------------------------------------|
| Cores hex hardcoded no HTML                       | `var(--color-*)` ou classes Tailwind mapeadas         |
| `<style>` inline na `<head>`                      | Classes do design system em `index.css`               |
| Adicionar novos `<script>` além do `main.ts`      | Toda lógica passa por `main.ts`                       |
| Modificar Header ou Footer                        | Copiar frozen e não tocar                             |
| Criar nova classe CSS no HTML do case             | Reutilizar classes existentes em `index.css`          |
| Ícones de outras bibliotecas                      | Usar exclusivamente `<i class="ti ti-[nome]">`        |
| `.reveal` no pai e no filho simultaneamente       | `.reveal` apenas no container externo                 |
| Omitir texto fallback em PT dentro da tag         | Sempre incluir fallback mesmo com `data-i18n`         |
