# Plano de migração do design system

Objetivo: todas as páginas do site usando os tokens de `src/index.css` e os componentes `ui-*` de
`src/components.css`, documentados em `/designsystem.html`. A home foi migrada primeiro (commit
`042a6fa`) e serviu de piloto; este plano cobre o resto do site.

## Princípios

- **Uma fase por commit.** Cada fase termina com build limpo e verificação visual nos dois temas.
- **Trocar marcação, não conteúdo.** Textos, chaves `data-i18n`, imagens e ordem das seções ficam
  iguais. Quando um `data-i18n` está num elemento que ganha ícone, a chave desce para um `<span>`.
- **Lime como texto, ícone ou foco usa `--color-accent-text`.** Lime como fundo ou traço decorativo
  continua `--color-accent`.
- **CSS legado só sai quando nenhum HTML/TS usa mais a classe** (fase 6).

## Inventário

| Página | Linhas | O que muda |
|---|---:|---|
| `case/daycoval.html` | 676 | moldura, labels, métricas, toggle App/Web |
| `case/decathlon.html` | 601 | moldura, labels, métricas |
| `case/nofrictionai.html` | 507 | moldura, labels, métricas |
| `case/pefisa.html` | 1035 | moldura, labels, métricas, chips, segmented, accordion, tooltips |
| `case/pernambucanas.html` | 460 | moldura, labels, métricas |
| `case/starbem.html` | 579 | moldura, labels, métricas |
| `styleguide.html` | 317 | vitrine passa a usar `ui-*`; abas de tema viram segmented |
| `profile.html` | 177 | login e barras de ação (área privada) |
| `space-shooter-offline.html` | — | fora do escopo (jogo com visual próprio) |

## Fases

### 1. Moldura comum dos cases
Header e footer são idênticos nas 6 páginas; troca feita por script com substituição exata.
- Logo: `text-black` → `text-on-accent`. Botão EN: `text-accent` → `text-accent-text`.
- Contato do header → `ui-btn ui-btn--outline ui-btn--sm` (igual à home).
- “← Voltar” do topo e “voltar para home” do fim → `ui-btn ui-btn--link` com ícone.
- Footer: rótulo `mb-4`, título com `heading-accent`, CTA → `ui-btn ui-btn--primary ui-btn--lg`
  (corrige o texto claro sobre lime no tema claro), links de footer com `--color-accent-text`.
- Lightbox: botão fechar com `aria-hidden` no ícone.

### 2. Blocos de conteúdo dos cases
- `case-label` → `ui-badge ui-badge--label` (≈36 ocorrências).
- `metric-card …` → `ui-card ui-card--metric`, `metric-value` → `ui-card__metric`,
  `metric-desc` → `ui-card__text` (≈18).
- Timeline de processo e containers: `rounded-2xl` → `--radius-md`.
- Daycoval: toggle App/Web → `ui-segmented` (radiogroup); `src/caseToggle.ts` passa a usar
  `aria-checked` em vez de trocar classes.

### 3. Widgets do Pefisa
- Filtros da tabela (`feat-chip`) → `ui-chip` (estado em `aria-pressed`, que `featureTable.ts` já usa).
- Filtros de produto (`rdash-chip`) → `ui-chip ui-chip--accent ui-chip--sm`.
- Chips estáticos (`rdash-chip is-static`) → `ui-badge ui-badge--tag ui-badge--sm`.
- Origem (`rdash-seg`) → `ui-segmented ui-segmented--sm`; o segmented passa a aceitar
  `aria-pressed` além de `aria-checked`.
- Heurísticas (`heur-item`) → `ui-accordion`.
- Tooltips dos gráficos e cards do dashboard: mantêm as classes (posicionadas por JS), com sombra e
  raio vindos de `--shadow-md` / `--radius-*`.

### 4. Styleguide
- Abas Dark/Light → `ui-segmented ui-segmented--accent`.
- Vitrine de botões, tags e cards passa a mostrar os componentes `ui-*` reais.
- Ponteiro para `/designsystem.html` como referência completa (decisão pendente abaixo).

### 5. Profile (área privada)
- Login: campos → `ui-field` + `ui-input`; botões → `ui-btn` primary/secondary.
- Selects e barras de ação estáticas no HTML → tokens de borda e raio.
- A UI gerada por `src/profile.ts` fica para uma fase própria (1.2k linhas, uso interno).

### 6. Limpeza e regras
- Remover de `src/index.css` as classes sem uso: `.tag`, `.lead-card`, `.case-card`,
  `.case-label`, `.metric-card*`, `.feat-chip*`, `.rdash-chip`, `.rdash-seg`, `.heur-*`.
- Atualizar `rulecase.md` e `new_case_prompt_template.md` para que novos cases já nasçam com
  `ui-*` e tokens.

### 7. Verificação
- Capturas de todas as páginas em 1440px e 390px, tema escuro e claro, PT e EN.
- Navegação só com teclado: foco visível, toggle App/Web, chips, accordion, popover.
- Sem rolagem horizontal no mobile e sem erros no console.

## Decisões pendentes

- **Styleguide x Design System:** manter `styleguide.html` como vitrine curta (linkada no footer)
  ou redirecionar o link do footer para `/designsystem.html`. Até decidir, o styleguide é migrado
  e o design system continua sem link público.

## Status

| Fase | Status |
|---|---|
| 0. Home (piloto) | Feito (`042a6fa`) |
| 1. Moldura dos cases | Feito |
| 2. Conteúdo dos cases | Feito |
| 3. Widgets do Pefisa | Feito |
| 4. Styleguide | Feito |
| 5. Profile | Feito |
| 6. Limpeza e regras | Feito |
| 7. Verificação | Feito |

## Notas da execução

- `src/counter.ts` procurava `.metric-value`; passou a ler `.ui-card__metric` (sem isso as
  métricas paravam de animar).
- O profile usava `bg-bg-primary-dark`, classe inexistente: o header fixo ficava sem fundo.
- As amostras de raio do styleguide usavam `rounded-sm/md/lg` do Tailwind (2/6/8px), não os
  tokens descritos nas legendas.
- O topo de `/designsystem.html` estourava 390px no mobile depois do seletor EN|PT; versão e link
  do código somem em telas pequenas.
- Novos utilitários do DS criados na migração: `ui-btn--danger`, `ui-input--select`,
  `ui-card__metric--sm`, segmented com `aria-pressed` e `heading-accent--center`.
- Fora do escopo e ainda pendente: UI gerada por `src/profile.ts` (painéis de edição, links e
  interview) e os cards internos do dashboard do Pefisa (`rdash-*`), que seguem com classes
  próprias já baseadas em tokens.
