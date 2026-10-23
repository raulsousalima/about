---
name: ds-layout
description: Use before creating or changing any UI in this repo (pages, cases, sections, buttons, cards, badges, toggles, colors, spacing). Builds the layout from the existing ui-* components and tokens; when none fits, hands off to ds-scale so the component is implemented and validated in the design system first. Finishes with ds-check.
---

# DS Layout: montar interface com a biblioteca

A referência viva é `/designsystem.html` (código em `src/designsystem.ts`). Tokens ficam em
`src/index.css`; componentes `ui-*` em `src/components.css`. Regras de case em `rulecase.md`.

## 1. Mapear antes de escrever

Para cada elemento da tarefa, escolha o componente existente:

| Precisa de | Use |
|---|---|
| Ação, link de ação, CTA | `ui-btn` + `--primary` / `--secondary` / `--outline` / `--ghost` / `--link`, tamanhos `--sm` / `--lg`, `--icon` |
| Rótulo de seção, tag, status | `ui-badge` + `--label` / `--tag` / `--status ui-badge--{success,warning,error,info}` / `--dot` |
| Filtro liga/desliga | `ui-chip` (`aria-pressed`), `--accent`, `--sm` |
| Escolha exclusiva (App/Web, abas) | `ui-segmented` + `ui-segmented__item` (`role="radio"` + `aria-checked`, ou `aria-pressed`) |
| Campo de formulário | `ui-field` + `ui-field__label` + `ui-input` (+ `ui-field__hint`) |
| Card | `ui-card` + `--lead` / `--case` / `--metric` / `--item` |
| Conteúdo expansível | `ui-accordion` (`<details>`) |
| Detalhe ao passar o mouse / foco | `ui-tooltip` |
| Detalhe ao clicar | `ui-popover` + gatilho `<button aria-expanded aria-controls>` |
| Comparar duas imagens (antes/depois) | `ui-compare` (+ `--scroll` para capturas altas) |
| Cabeçalho | `ui-navbar` |

Tokens, nunca valores soltos:
- Lime como **fundo**: `bg-accent`. Lime como **texto, ícone ou foco**: `text-accent-text` /
  `var(--color-accent-text)`. Texto **sobre** lime: `text-on-accent`.
- Bordas: `var(--color-border)`, `--alpha-10`, `--alpha-15`. Raios: `--radius-base|md|lg|pill`.
- Dentro de `.section-light` os tokens já viram a versão clara; não force cores ali.

## 2. Quando nenhum componente serve

Não invente estilo no HTML. Siga a skill **ds-scale**: o componente é implementado, documentado
no playbook e validado no design system antes de ser usado na página.

## 3. Validar (skill ds-check)

```bash
npm run ds:check        # 0 erros para seguir
npm run build
```

`ds:check` acusa: cor inline, hex em classe, opacidade que não gera CSS (`/05`, `/08`), classes
legadas, lime como texto, botão montado com utilitários, seta “→” em texto de botão, raio fora dos
tokens e ícone sem `aria-hidden`.

Depois confira no navegador: tema claro e escuro, PT e EN, 390px sem rolagem horizontal, foco
visível navegando só com Tab.
