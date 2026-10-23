---
name: ds-scale
description: Use when a new ui-* component or variant is needed, or an existing one must change. Checks the library for an existing equivalent first, then implements in code with tokens only, updates the library and documents it in the /designsystem.html playbook so the change is visible.
---

# DS Scale: criar e manter componentes

## 1. Consistência antes de criar

1. Procure um equivalente: `grep -n "^\.ui-" src/components.css` e a página `/designsystem.html`.
2. Se algo próximo existe, prefira **uma variante** (`ui-x--nova`) a um componente novo.
3. Liste os tokens que o componente vai usar (`src/index.css`). Se faltar um token, crie-o nos
   blocos de tema (escuro, `[data-theme="light"]` e `#hero-sequence`) e no Tailwind, se for cor.

## 2. Código (`src/components.css`)

- Classe base `ui-nome` + modificadores `--variante` / `--sm` / `--lg`; elementos `ui-nome__parte`.
- Só tokens: cores, espaços, raios, bordas, sombras, durações. Nada de hex ou px soltos.
- Estados forçáveis para o playground: `:hover, .is-hover`, `:focus-visible, .is-focus`,
  desabilitado (`:disabled`, `.is-disabled`) e o estado ARIA (`aria-pressed`, `aria-checked`, `aria-expanded`).
- Foco com `var(--color-accent-text)`; lime como texto sempre `--color-accent-text`.
- Comportamento em `src/<nome>.ts`, iniciado em `src/main.ts`, com teclado e ARIA.

## 3. Biblioteca e playbook

1. `src/designsystem.ts`: entrada em `PAGES` e spec em `SPECS` (controles, `render`, `anatomy`,
   `tokens`, `bind` se for interativo).
2. `designsystem.html`: `<article data-page="…">` com lead, playground, anatomia, tokens e
   uso/acessibilidade.
3. `src/translations.json`: chaves `ds.<nome>.*` em PT e EN.
4. Tabela de componentes da skill **ds-layout** e regras do `rulecase.md`, se o uso mudar.

## 4. Fechar

Rode a skill **ds-update** para ver o impacto na aplicação e a **ds-check** antes do deploy.
