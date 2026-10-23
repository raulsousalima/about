---
name: ds-update
description: Use after any change to src/components.css, the tokens in src/index.css or a ui-* behavior script. Validates the change, maps every page and script where the changed components and tokens are used, and reports the possible impacts before publishing.
---

# DS Update: validar mudanças e medir impacto

## 1. O que mudou

```bash
git diff --stat origin/main -- src/components.css src/index.css src/*.ts
git diff origin/main -- src/components.css src/index.css | grep -oE "\.ui-[a-z-]+(__[a-z-]+)?(--[a-z-]+)?|--[a-z0-9-]+" | sort -u
```

## 2. Onde é usado

Para cada classe ou token alterado:

```bash
grep -rln "ui-nome" --include=*.html --include=*.ts --exclude-dir=node_modules --exclude-dir=dist .
grep -rn "var(--token)" src/*.css
```

Monte uma tabela **componente → páginas/scripts → tipo de impacto** (visual, comportamento,
acessibilidade, tradução). Inclua `/designsystem.html` (playground e tabela de tokens).

## 3. Validar

- Abra cada página afetada nos temas escuro e claro, em PT e EN, em 1440px e 390px.
- Teste o componente pelo teclado (Tab, setas, Esc) e confira o foco visível.
- Dentro de `.section-light` os tokens viram a versão clara: confira o componente ali também.
- Rode a skill **ds-check**.

## 4. Reportar

Antes de publicar, descreva: o que mudou, onde aparece, o impacto esperado em cada página e o
que foi verificado. Mudanças que alteram tamanho, cor ou comportamento visível pedem aprovação.
