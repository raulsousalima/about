# [rulecase] — Regra para Criação de Novas Páginas Case Study

> Baseado no template: `case/decathlon.html`
> Versão: 2.0 · Última revisão: Outubro 2026 (migração para o design system — ver `/designsystem.html` e `docs/design-system-migration.md`)

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
  §6 GALLERY     → Toggle App/Web + grid de screenshots (case-gallery)
  §6.5 STRATEGY  → Texto estratégico aprofundado (OBRIGATÓRIO)
  §7 IMPACT      → 3 cards de métrica (ui-card--metric) com números e descrições
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
| **Accent (fundo)**     | `bg-accent`                           | Fundos de CTA, bullets, traços decorativos    |
| **Accent (texto)**     | `text-accent-text`                    | Lime como texto, ícone ou foco (AA no tema claro) |
| **Texto sobre accent** | `text-on-accent`                      | Texto dentro de qualquer fundo lime            |
| **Borders**            | `border-[var(--color-border)]`        | Bordas de cards e containers                  |
| **Backgrounds sutis**  | `bg-[var(--alpha-5)]`                 | Cards e painéis internos                      |
| **Border radius MD**   | `var(--radius-md)` (16px)             | Containers de mídia `.case-img-placeholder`   |
| **Border radius MD**   | `rounded-[var(--radius-md)]`          | Process timeline, containers de conteúdo      |
| **Tipografia serif**   | `font-serif font-bold`                | H1, H2 (títulos de seção)                     |
| **Espaçamento seções** | `py-16 md:py-24`                      | Padding vertical padrão de cada seção         |
| **Container**          | `max-w-7xl mx-auto px-6`              | Wrapper de conteúdo em todas as seções        |

---

## 5. CSS Classes do Design System — Obrigatórias

Componentes `ui-*` em `src/components.css` (documentados em `/designsystem.html`) e classes de layout
de case em `src/index.css`. **Não recriar inline.**

| Componente                   | Onde usar                                                      |
|------------------------------|----------------------------------------------------------------|
| `.ui-btn` + `--primary` / `--outline` / `--link`, `--sm` / `--lg` | Todo botão ou link de ação. Ícone em `<i>` próprio, nunca “→” no texto |
| `.ui-badge.ui-badge--label`  | Pills de label: "Desafio", "Processo", "Impacto", "Projeto"   |
| `.ui-card.ui-card--metric`   | Cards de impacto/métricas (§7)                                 |
| `.ui-card.ui-card--lead`     | Cards de destaque com título + texto                           |
| `.ui-segmented`              | Toggle App/Web (§6) e qualquer escolha exclusiva               |
| `.ui-chip`                   | Filtros liga/desliga (`aria-pressed`)                          |
| `.ui-accordion`              | Conteúdo expansível (`<details>`)                              |

| Classe de layout             | Onde usar                                                      |
|------------------------------|----------------------------------------------------------------|
| Classe                       | Onde usar                                                      |
|------------------------------|----------------------------------------------------------------|
| `.glass-nav`                 | No `<header>` (FROZEN)                                        |
| `.case-hero-banner`          | Div do hero banner (§1)                                        |
| `.case-img-placeholder`      | Container do logo (§2) e da imagem do challenge (§4)           |
| `.heading-accent`            | `<h1>` e `<h2>` — gera o underline accent automático           |
| `.reveal`                    | Todos os elementos com animação de entrada (scroll)            |
| `.process-timeline`          | Container da timeline de process (§5)                          |
| `.process-step`              | Cada etapa individual da timeline                              |
| `.case-gallery`              | Container base da galeria (§6) — usado com `.show-grid`        |
| `.case-gallery-item-wrapper` | Wrapper externo de cada item: título + frame                   |
| `.case-item-title`           | `<h4>` com nome da tela acima do frame                         |
| `.case-gallery-item`         | Frame do dispositivo (phone/desktop/web)                       |
| `.case-gallery-scroll`       | Área interna scrollável da imagem dentro do frame              |
| `.case-gallery-overlay`      | Imagem sobreposta no frame (ex: menu inferior, navegador)      |
| `.web-desktop-format`        | Variante de frame para desktop web (aspect-ratio 900/850)      |
| `.web-mobile-format`         | Variante de frame para mobile web (aspect-ratio 393/850)       |
| `.case-strategy-section`     | Container da seção Strategy (§6.5)                             |
| `.case-strategy-content`     | Wrapper do texto estratégico — tipografia e espaçamento        |

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
case.[slug].gallery.title1  → case.[slug].gallery.title4   ← títulos acima de cada frame
case.[slug].strategy.p1  → case.[slug].strategy.p6           ← parágrafos da seção Strategy
case.[slug].strategy.item1  → case.[slug].strategy.item3     ← lista de itens da Strategy
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
    <a href="../index.html#cases" class="ui-btn ui-btn--link mb-6">
      <i class="ti ti-arrow-left" aria-hidden="true"></i><span data-i18n="case.back">Voltar</span>
    </a>

    <!-- H1 — único da página -->
    <h1 class="font-serif text-4xl md:text-5xl font-bold mb-[60px] heading-accent reveal"
      data-i18n="case.[slug].title">
      [Título do Case em PT]
    </h1>
  </div>

  <!-- Hero banner FULL WIDTH — border-radius: 0 obrigatório -->
  <div class="case-hero-banner reveal"
    style="background-image: url('[URL_IMAGEM]'); border-radius: 0;">
    <div class="absolute inset-0 bg-black/40 z-0"></div>
    <div class="absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-6">
      <span class="text-6xl md:text-[8rem] font-bold text-white/10 font-serif tracking-widest select-none uppercase">
        [NOME DA EMPRESA]
      </span>
    </div>
  </div>
</section>
```

- Imagem do hero: preferencialmente da pasta `img/cases/[slug]/bannerhero.png`.
- O ícone Tabler e o subtítulo (`hero_subtitle`) foram **removidos** do template — não adicionar.

---

## 9. Logo com Suporte Dark/Light (§2 — OVERVIEW)

Para logos que precisam mudar de cor entre temas (Dark/Light Mode), o padrão atual utiliza duas imagens SVG distintas, controladas por classes CSS globais de visibilidade.

**No HTML (dentro do `.case-img-placeholder`):**
```html
<!-- Logo (Dinâmico Dark/Light) -->
<img src="../img/cases/[slug]/logo_dark.svg" alt="[Nome da empresa]" class="show-in-dark" style="max-width: 220px; height: auto;" />
<img src="../img/cases/[slug]/logo_light.svg" alt="[Nome da empresa]" class="show-in-light" style="max-width: 220px; height: auto;" />
```

> ⚠️ **Atenção:** As classes `.show-in-dark` e `.show-in-light` já estão predefinidas no `src/index.css` e respondem automaticamente ao atributo `[data-theme="light"]`. **Não** utilize `<svg>` inline e não crie tokens CSS `--color-logo-[slug]`.

---

## 10. Seção §5 — PROCESS (sempre 5 etapas)

A timeline tem sempre **exatamente 5 etapas** (condensar ou expandir descritivamente conforme necessário):

```html
<div class="process-timeline rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--alpha-5)] overflow-hidden reveal">
  <div class="process-step">
    <div class="step-number">01</div>
    <h3 class="step-title" data-i18n="case.[slug].process.step1.title">Nome</h3>
    <p class="step-desc" data-i18n="case.[slug].process.step1.desc">Descrição.</p>
  </div>
  <!-- step 02, 03, 04, 05 ... -->
</div>
```

---

---

## 11. Seção §6 — GALLERY (Toggle App/Web)

A galeria sempre tem toggle **App / Web**. O padrão App mostra 4 telas em grid; o padrão Web mostra desktop + mobile lado a lado.

```html
<section class="py-16 md:py-24">
  <div class="max-w-7xl mx-auto px-6">
    <!-- Header da seção com toggle -->
    <div class="mb-12 reveal flex flex-col md:flex-row md:items-end justify-between gap-6">
      <span class="ui-badge ui-badge--label mb-4 md:mb-0" data-i18n="case.[slug].gallery.label">Projeto</span>
      <div class="ui-segmented" role="radiogroup" aria-label="Visualização da galeria" id="gallery-view-toggle">
        <button type="button" role="radio" id="view-mode-app-btn" class="ui-segmented__item" aria-checked="true" tabindex="0" aria-controls="gallery-app-view">App</button>
        <button type="button" role="radio" id="view-mode-web-btn" class="ui-segmented__item" aria-checked="false" tabindex="-1" aria-controls="gallery-web-view">Web</button>
      </div>
    </div>

    <!-- App View (default) -->
    <div id="gallery-app-view" class="case-gallery show-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6 pb-8 reveal">
      <!-- Gallery item (repetir 4x) -->
      <div class="case-gallery-item-wrapper">
        <h4 class="case-item-title" data-i18n="case.[slug].gallery.title1">Nome da Tela</h4>
        <div class="case-gallery-item">
          <div class="case-gallery-scroll">
            <img src="../img/cases/[slug]/1.png" alt="Descrição da tela" />
          </div>
          <!-- Opcional: overlay do menu/navegador -->
          <!-- <img src="../img/cases/[slug]/menuinferior.png" class="case-gallery-overlay" alt="Menu inferior" /> -->
        </div>
      </div>
      <!-- items 2, 3, 4 seguem o mesmo padrão -->
    </div>

    <!-- Web View (hidden by default) -->
    <div id="gallery-web-view" class="hidden flex flex-col md:flex-row items-stretch justify-center gap-4 lg:gap-6 reveal pb-8 w-full">
      <!-- Desktop Mockup -->
      <div class="case-gallery-item-wrapper w-full" style="flex: 900;">
        <h4 class="case-item-title">Desktop View</h4>
        <div class="case-gallery-item web-desktop-format">
          <div class="case-gallery-scroll">
            <img src="../img/cases/[slug]/web1.png" alt="Tela Web Desktop" />
          </div>
        </div>
      </div>
      <!-- Mobile Web Mockup -->
      <div class="case-gallery-item-wrapper w-full" style="flex: 393;">
        <h4 class="case-item-title">Mobile Web View</h4>
        <div class="case-gallery-item web-mobile-format">
          <div class="case-gallery-scroll">
            <img src="../img/cases/[slug]/web2.png" alt="Tela Web Mobile" />
          </div>
          <!-- <img src="../img/cases/[slug]/navegador.png" class="case-gallery-overlay" alt="Navegador mobile" /> -->
        </div>
      </div>
    </div>
  </div>
</section>
```

> A lógica JS de toggle (`view-mode-app-btn` / `view-mode-web-btn`) está em `src/caseToggle.ts` (estado em `aria-checked`, setas do teclado) — os IDs devem ser **exatamente** esses.

---

## 12. Seção §6.5 — STRATEGY (OBRIGATÓRIA)

Vem imediatamente após o gallery, dentro da mesma `<section>` do Gallery ou como bloco separado, **antes** da seção Impact.

```html
<!-- Estratégia / Solução Section -->
<div class="case-strategy-section reveal">
  <div class="case-strategy-content">
    <p data-i18n="case.[slug].strategy.p1">[Parágrafo 1: contexto estratégico]</p>
    <p data-i18n="case.[slug].strategy.p2">[Parágrafo 2: diagnóstico / problema identificado]</p>
    <p data-i18n="case.[slug].strategy.p3">[Parágrafo 3: proposta de solução]</p>

    <!-- Lista opcional de itens -->
    <ul class="space-y-4 my-8">
      <li class="flex items-start gap-3">
        <span class="w-1.5 h-1.5 rounded-full bg-accent mt-2.5 flex-shrink-0"></span>
        <strong data-i18n="case.[slug].strategy.item1">[item 1]</strong>
      </li>
      <!-- item2, item3 -->
    </ul>

    <p data-i18n="case.[slug].strategy.p4">[Parágrafo 4: detalhe da solução]</p>
    <p data-i18n="case.[slug].strategy.p5">[Parágrafo 5: modelo de engajamento / continuidade]</p>
    <p data-i18n="case.[slug].strategy.p6">[Parágrafo 6: resultado / connect com metas de negócio]</p>
  </div>
</div>
```

- Mínimo de **3 parágrafos** (`p1` a `p3`). P4, P5 e P6 são opcionais mas recomendados.
- A lista de itens (`strategy.item1-3`) é opcional.
- Deve estar dentro do `max-w-7xl` da seção Gallery ou em uma `<section>` própria, conforme necessidade.

---

## 13. Seção §7 — IMPACT (sempre 3 métricas)

```html
<div class="grid md:grid-cols-3 gap-6 reveal">
  <div class="ui-card ui-card--metric">
    <p class="ui-card__metric" data-i18n="case.[slug].impact.metric1.value">+35%</p>
    <p class="ui-card__text" data-i18n="case.[slug].impact.metric1.desc">
      <strong>descrição</strong>, contexto adicional
    </p>
  </div>
  <!-- metric2 e metric3 seguem o mesmo padrão -->
</div>
```

> Valores numéricos animam sozinhos (`src/counter.ts` lê `.ui-card__metric`). Para textos longos (“Tempo real”) use `ui-card__metric ui-card__metric--sm`.

## 14. ATUALIZAÇÃO DA HOME (index.html)

Sempre que criar um novo case, é **obrigatório** atualizar ou adicionar o card correspondente na seção de Cases na Home (`index.html`).

O card do case na `index.html` deve usar:
- O componente **Card case** (`ui-card ui-card--case`): link inteiro, mídia 16:9 com scrim e zoom no hover.
- A mesma imagem do Hero Banner do case.
- Sem cores inline: a faixa `.section-light` já ajusta texto, superfície e borda.

**Exemplo de estrutura a usar na `index.html`:**
```html
<a href="case/[slug].html" data-case-slug="[slug]" class="ui-card ui-card--case reveal">
  <div class="ui-card__media">
    <img src="img/cases/[slug]/bannerhero.png" alt="[Nome do case] cover" />
  </div>
  <div class="ui-card__body">
    <p class="ui-card__overline">[TAGS SETOR]</p>
    <h3 class="ui-card__heading">[NOME DA EMPRESA]</h3>
    <p class="ui-card__text" data-i18n="cases.[slug].desc">[Descrição breve]</p>
    <span class="ui-card__cta"><span data-i18n="cases.[slug].link">Ver case</span><i class="ti ti-arrow-right" aria-hidden="true"></i></span>
  </div>
</a>
```

---

## 15. Checklist de Validação Antes de Publicar

### ✅ Estrutura
- [ ] Arquivo em `case/[slug].html`
- [ ] Imagens em `img/cases/[slug]/1.png` a `4.png` + `bannerhero.png`
- [ ] Header e Footer copiados literalmente do template (não modificados)
- [ ] `<script type="module" src="/src/main.ts"></script>` único e ao final do `<body>`

### ✅ Design System
- [ ] Nenhuma cor hexadecimal hardcoded no HTML
- [ ] Labels, métricas, botões e toggles usam os componentes `ui-*` (nenhum botão com classes Tailwind soltas)
- [ ] Lime como texto ou ícone usa `text-accent-text`; texto sobre lime usa `text-on-accent`
- [ ] Nenhum “→” dentro de texto traduzido (seta é ícone `ti-arrow-right`)
- [ ] Logo dinâmico da empresa usa duas tags `<img>` e as classes `.show-in-dark` e `.show-in-light`

### ✅ i18n
- [ ] Todas as strings visíveis têm `data-i18n` correspondente
- [ ] Chaves `case.[slug].*` adicionadas em **`"pt"`** no `translations.json`
- [ ] Chaves `case.[slug].*` adicionadas em **`"en"`** no `translations.json`
- [ ] Texto fallback em português presente dentro de cada tag

### ✅ Comportamento
- [ ] Dark/Light mode testado — todos os elementos mudam corretamente
- [ ] Troca de idioma EN/PT testada — todos os textos mudam
- [ ] Animações `.reveal` funcionando ao fazer scroll
- [ ] Back button direciona para `../index.html#cases`
- [ ] Navegação só por teclado: foco visível em todos os controles, toggle App/Web com setas

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

## 16. O que NÃO fazer

| ❌ Proibido                                       | ✅ Correto                                            |
|---------------------------------------------------|-------------------------------------------------------|
| Cores hex hardcoded no HTML                       | `var(--color-*)` ou classes Tailwind mapeadas         |
| `<style>` inline na `<head>`                      | Classes do design system em `index.css`               |
| Adicionar novos `<script>` além do `main.ts`      | Toda lógica passa por `main.ts`                       |
| Modificar Header ou Footer                        | Copiar frozen e não tocar                             |
| Criar nova classe CSS no HTML do case             | Reutilizar `ui-*` (`components.css`) e classes de `index.css` |
| Montar botão/badge com utilitários Tailwind       | `ui-btn`, `ui-badge`, `ui-chip`, `ui-segmented`        |
| Ícones de outras bibliotecas                      | Usar exclusivamente `<i class="ti ti-[nome]">`        |
| `.reveal` no pai e no filho simultaneamente       | `.reveal` apenas no container externo                 |
| Omitir texto fallback em PT dentro da tag         | Sempre incluir fallback mesmo com `data-i18n`         |
