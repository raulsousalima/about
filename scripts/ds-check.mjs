#!/usr/bin/env node
// Design system check: flags markup that bypasses the tokens / ui-* components
// documented at /designsystem.html. Run before shipping UI changes:
//   npm run ds:check            → report, exit 1 on errors
//   npm run ds:check -- --json  → machine-readable output
//   npm run ds:check -- file.html other.html
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const explicit = args.filter((a) => !a.startsWith('--'))

const LEGACY = new Set(['tag', 'case-card', 'lead-card', 'case-label', 'metric-card', 'metric-value', 'metric-desc',
  'feat-chip', 'rdash-chip', 'rdash-seg', 'heur-item', 'heur-accordion'])

/** Each rule returns [{ line, match }] for one file's text. */
const RULES = [
  {
    id: 'inline-color', level: 'error',
    why: 'Cor escrita no style. Use um token (classe text-*/bg-* ou var(--color-*)).',
    find: (t) => grep(t, /style="[^"]*(?:^|[;\s"])(?:color|background-color)\s*:\s*(?!var\()[^;"]+/g),
  },
  {
    id: 'hex-in-class', level: 'error',
    why: 'Hex em classe arbitrária do Tailwind (ex.: text-[#111]). Use o token correspondente.',
    find: (t) => grep(t, /class="[^"]*\[#[0-9a-fA-F]{3,8}\][^"]*"/g),
  },
  {
    id: 'broken-opacity', level: 'error',
    why: 'Opacidade fora da escala do Tailwind (ex.: /05, /08): a classe não gera CSS.',
    find: (t) => grep(t, /\b(?:bg|text|border|divide|ring)-(?:black|white)\/0\d\b/g),
  },
  {
    id: 'legacy-class', level: 'error',
    why: 'Classe legada removida na migração. Use o componente ui-* equivalente.',
    find: (t) => classTokens(t).filter((c) => LEGACY.has(c.token)),
  },
  {
    id: 'accent-as-text', level: 'error',
    why: 'Lime como texto falha AA no tema claro. Use text-accent-text (texto/ícone) ou bg-accent (fundo).',
    find: (t) => classTokens(t).filter((c) => /^(?:[\w-]+:)*text-accent$/.test(c.token)),
  },
  {
    id: 'adhoc-button', level: 'error',
    why: 'Botão montado com utilitários (bg-accent + padding). Use ui-btn ui-btn--primary.',
    find: (t) => grep(t, /<(?:a|button)\b[^>]*class="(?![^"]*\bui-btn\b)[^"]*\bbg-accent\b[^"]*\bpx-\d[^"]*"/g),
  },
  {
    id: 'arrow-glyph', level: 'error',
    why: 'Seta “→” dentro do texto de link/botão. Use o ícone ti-arrow-right no slot do ui-btn.',
    find: (t) => grep(t, /<(a|button)\b[^>]*>(?:(?!<\/\1>)[\s\S])*?→/g),
  },
  {
    id: 'raw-radius', level: 'error',
    why: 'Raio fora dos tokens. Use rounded-[var(--radius-base|md|lg)] ou o raio do componente.',
    find: (t) => classTokens(t).filter((c) => /^(?:[\w-]+:)*rounded-(?:xl|2xl|3xl)$/.test(c.token)),
  },
  {
    id: 'icon-aria', level: 'warn',
    why: 'Ícone decorativo sem aria-hidden="true" (o leitor de tela lê um caractere vazio).',
    find: (t) => grep(t, /<i class="ti\b(?![^>]*aria-hidden)[^>]*>/g),
  },
]

// Translations: only the text rules apply (values become innerHTML).
const JSON_RULES = new Set(['accent-as-text', 'inline-color', 'hex-in-class'])

function lineOf(text, index) {
  let n = 1
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++
  return n
}

function grep(text, re) {
  const out = []
  for (const m of text.matchAll(re)) out.push({ line: lineOf(text, m.index), match: m[0].replace(/\s+/g, ' ').slice(0, 110) })
  return out
}

function classTokens(text) {
  const out = []
  for (const m of text.matchAll(/class="([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/).filter(Boolean)) out.push({ token, line: lineOf(text, m.index), match: token })
  }
  return out
}

function defaultFiles() {
  const files = ['index.html', 'styleguide.html', 'profile.html', 'designsystem.html']
  if (existsSync(join(ROOT, 'case'))) for (const f of readdirSync(join(ROOT, 'case'))) if (f.endsWith('.html')) files.push(join('case', f))
  files.push('src/translations.json')
  return files.filter((f) => existsSync(join(ROOT, f)))
}

const files = explicit.length ? explicit : defaultFiles()
const results = []
for (const file of files) {
  const abs = file.startsWith('/') ? file : join(ROOT, file)
  // Strip HTML comments so documentation examples inside them are not flagged.
  const text = readFileSync(abs, 'utf8').replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '))
  const isJson = abs.endsWith('.json')
  for (const rule of RULES) {
    if (isJson && !JSON_RULES.has(rule.id)) continue
    for (const hit of rule.find(text)) results.push({ file: relative(ROOT, abs), rule: rule.id, level: rule.level, line: hit.line, match: hit.match })
  }
}

const errors = results.filter((r) => r.level === 'error')
const warns = results.filter((r) => r.level === 'warn')

if (asJson) {
  console.log(JSON.stringify({ files: files.length, errors: errors.length, warnings: warns.length, results }, null, 2))
} else {
  for (const rule of RULES) {
    const hits = results.filter((r) => r.rule === rule.id)
    if (!hits.length) continue
    console.log(`\n${rule.level === 'error' ? '✖' : '⚠'} ${rule.id} (${hits.length}) — ${rule.why}`)
    for (const h of hits.slice(0, 12)) console.log(`   ${h.file}:${h.line}  ${h.match}`)
    if (hits.length > 12) console.log(`   … e mais ${hits.length - 12}`)
  }
  console.log(`\n${files.length} arquivos · ${errors.length} erros · ${warns.length} avisos`)
}
process.exit(errors.length ? 1 : 0)
