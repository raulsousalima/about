---
name: ds-check
description: Use before every commit or deploy that touches HTML, translations or styles. Runs npm run ds:check (inline colors, hex in classes, opacity steps that generate no CSS, legacy classes, lime as text, hand-built buttons, arrows in button text, off-token radii, icons without aria-hidden) and the build, and fixes what they report.
---

# DS Check: verificação automática

```bash
npm run ds:check     # precisa terminar com 0 erros
npm run build
```

- Cada erro aponta arquivo e linha, com o motivo e a correção esperada.
- Corrija usando o componente ou token indicado pela skill **ds-layout**; não silencie a regra.
- Uma regra nova entra em `scripts/ds-check.mjs` (lista `RULES`) com `id`, nível, explicação e
  busca; rode o comando no site inteiro para ver se ela gera falso positivo antes de publicar.
