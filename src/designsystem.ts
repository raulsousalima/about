import './index.css'
import './components.css'
import './designsystem.css'
import { initTheme } from './theme'
import { initI18n, getLang } from './i18n'
import { bindCompare } from './compare'
import { mountSimulator } from './simulator'

/* =====================================================
   /designsystem — docs app
   Hash router (#/page), foundation renderers that read the live token values,
   and a playground engine: each component spec renders its markup from the
   control values; the stage can overlay anatomy pins or measurements taken
   from the rendered DOM, and the token table resolves every var() live, so
   the docs always match the CSS in both themes.

   i18n: static copy in designsystem.html uses data-i18n keys (ds.*) from
   translations.json like the rest of the site. Text generated here uses
   L(pt, en) and is re-rendered on the 'langchange' event.
   ===================================================== */

type Props = Record<string, string | boolean>
type Lang = 'pt' | 'en'
type Text = [pt: string, en: string]

/* ---------------- Utilities ---------------- */

let lang: Lang = getLang()
const L = (pt: string, en: string) => lang === 'pt' ? pt : en
const tr = (t: Text) => L(t[0], t[1])

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const root = document.documentElement

function cssVar(name: string): string {
  return getComputedStyle(root).getPropertyValue(name).trim()
}

function remToPx(v: string): string {
  const m = v.match(/^(-?[\d.]+)rem$/)
  if (!m) return ''
  return `${+(parseFloat(m[1]) * 16).toFixed(2)}px`
}

let toastTimer = 0
function toast(msg: string) {
  let el = document.querySelector<HTMLElement>('.ds-toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'ds-toast'
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    document.body.appendChild(el)
  }
  el.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i><span>${esc(msg)}</span>`
  el.classList.add('is-visible')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el!.classList.remove('is-visible'), 1800)
}

async function copy(text: string, label = L('Copiado', 'Copied')) {
  try {
    await navigator.clipboard.writeText(text)
    toast(`${label}: ${text.length > 40 ? text.slice(0, 40) + '…' : text}`)
  } catch {
    toast(L('Não foi possível copiar', 'Could not copy'))
  }
}

/** Resolves any CSS color (incl. var()) to [r, g, b, a] via a probe element. */
const probe = document.createElement('span')
function resolveColor(value: string): [number, number, number, number] | null {
  if (!probe.isConnected) { probe.style.display = 'none'; document.body.appendChild(probe) }
  probe.style.color = ''
  probe.style.color = value
  const c = getComputedStyle(probe).color
  const m = c.match(/rgba?\(([^)]+)\)/) || c.match(/color\(srgb ([^)]+)\)/)
  if (!m) return null
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
  if (c.startsWith('color(')) return [parts[0] * 255, parts[1] * 255, parts[2] * 255, parts[3] ?? 1]
  return [parts[0], parts[1], parts[2], parts[3] ?? 1]
}

function toHex([r, g, b, a]: number[]): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0').toUpperCase()
  return a < 1 ? `#${h(r)}${h(g)}${h(b)} · ${Math.round(a * 100)}%` : `#${h(r)}${h(g)}${h(b)}`
}

function luminance([r, g, b]: number[]): number {
  const ch = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

/** WCAG contrast of fg (alpha-blended) over an opaque bg. */
function contrast(fg: string, bg: string): number | null {
  const f = resolveColor(fg), b = resolveColor(bg)
  if (!f || !b) return null
  const blend = f.map((v, i) => i < 3 ? v * f[3] + b[i] * (1 - f[3]) : 1)
  const [l1, l2] = [luminance(blend), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

function prettyValue(v: string): string {
  if (!v) return '—'
  const parts = v.split(/\s+/)
  const px = parts.map(remToPx)
  return px.every(Boolean) ? `${v} · ${px.join(' ')}` : v
}

const isColorish = (v: string) => /^(#|rgb|hsl|color\()/.test(v)

/* ---------------- Navigation model ---------------- */

type Group = 'foundation' | 'components' | 'support'
interface PageDef { id: string; title: Text; icon: string; group: Group; desc: Text }

const GROUPS: Record<Group, Text> = { foundation: ['Fundação', 'Foundation'], components: ['Componentes', 'Components'], support: ['Suporte', 'Support'] }

const PAGES: PageDef[] = [
  { id: 'introducao', title: ['Visão geral', 'Overview'], icon: 'layout-dashboard', group: 'foundation', desc: ['Princípios, origem e como usar.', 'Principles, origin and how to use.'] },
  { id: 'cores', title: ['Cores', 'Color'], icon: 'palette', group: 'foundation', desc: ['Superfícies, texto, marca e semânticas.', 'Surfaces, text, brand and semantic.'] },
  { id: 'tipografia', title: ['Tipografia', 'Typography'], icon: 'typography', group: 'foundation', desc: ['Playfair Display + Inter, escala e pesos.', 'Playfair Display + Inter, scale and weights.'] },
  { id: 'espacamento', title: ['Espaçamento & Layout', 'Spacing & Layout'], icon: 'ruler-measure', group: 'foundation', desc: ['Escala de 4px, grid e breakpoints.', '4px scale, grid and breakpoints.'] },
  { id: 'raios', title: ['Raios', 'Radius'], icon: 'border-radius', group: 'foundation', desc: ['Arredondamentos de controles e containers.', 'Corner rounding for controls and containers.'] },
  { id: 'elevacao', title: ['Bordas & Elevação', 'Borders & Elevation'], icon: 'shadow', group: 'foundation', desc: ['Espessuras de borda e sombras.', 'Border widths and shadows.'] },
  { id: 'movimento', title: ['Movimento', 'Motion'], icon: 'wave-sine', group: 'foundation', desc: ['Durações e curvas de transição.', 'Durations and easing.'] },
  { id: 'iconografia', title: ['Iconografia', 'Iconography'], icon: 'icons', group: 'foundation', desc: ['Tabler Icons, tamanhos e uso.', 'Tabler Icons, sizes and usage.'] },
  { id: 'button', title: ['Button', 'Button'], icon: 'click', group: 'components', desc: ['Ações primárias, secundárias e links.', 'Primary, secondary and link actions.'] },
  { id: 'badge', title: ['Badge', 'Badge'], icon: 'tag', group: 'components', desc: ['Tags, labels de seção e status.', 'Tags, section labels and status.'] },
  { id: 'chip', title: ['Chip', 'Chip'], icon: 'filter', group: 'components', desc: ['Filtros com estado ligado/desligado.', 'Filters with an on/off state.'] },
  { id: 'segmented', title: ['Segmented Control', 'Segmented Control'], icon: 'toggle-left', group: 'components', desc: ['Alternância entre visões exclusivas.', 'Switch between exclusive views.'] },
  { id: 'input', title: ['Input', 'Input'], icon: 'forms', group: 'components', desc: ['Campo de texto com label e feedback.', 'Text field with label and feedback.'] },
  { id: 'card', title: ['Card', 'Card'], icon: 'cards', group: 'components', desc: ['Lead, case, métrica e item.', 'Lead, case, metric and item.'] },
  { id: 'accordion', title: ['Accordion', 'Accordion'], icon: 'layout-list', group: 'components', desc: ['Conteúdo expansível em lista.', 'Expandable list content.'] },
  { id: 'tooltip', title: ['Tooltip', 'Tooltip'], icon: 'message-2', group: 'components', desc: ['Rótulos e valores sob demanda.', 'Labels and values on demand.'] },
  { id: 'popover', title: ['Popover', 'Popover'], icon: 'layout-bottombar-expand', group: 'components', desc: ['Painel com detalhes ao clicar.', 'Detail panel on click.'] },
  { id: 'compare', title: ['Compare', 'Compare'], icon: 'columns-2', group: 'components', desc: ['Antes e depois com linha arrastável.', 'Before and after with a draggable line.'] },
  { id: 'navbar', title: ['Navbar', 'Navbar'], icon: 'layout-navbar', group: 'components', desc: ['Cabeçalho fixo com vidro fosco.', 'Fixed frosted-glass header.'] },
  { id: 'simulador', title: ['Simulador', 'Simulator'], icon: 'device-mobile', group: 'support', desc: ['App Kalion Bank navegável com tokens editáveis.', 'Navigable Kalion Bank app with editable tokens.'] },
  { id: 'documentacao', title: ['Documentação', 'Documentation'], icon: 'book', group: 'support', desc: ['Linguagem, guia de uso e docs do repositório.', 'Language, usage guide and repository docs.'] },
]

/* ---------------- Foundations ---------------- */

interface Swatch { token: string; name: string; tw?: string; on?: string }

const SWATCHES: Record<string, Swatch[]> = {
  surface: [
    { token: '--color-bg-dark', name: 'Background', tw: 'bg-bg-dark' },
    { token: '--color-bg-light', name: 'Background alt', tw: 'bg-bg-light' },
    { token: '--color-surface', name: 'Surface', tw: 'bg-surface' },
    { token: '--color-surface-hover', name: 'Surface hover', tw: 'bg-surface-hover' },
    { token: '--color-surface-light', name: 'Surface (faixa clara)', tw: 'bg-surface-light' },
    { token: '--glass-bg', name: 'Glass' },
    { token: '--color-border', name: 'Border', tw: 'border' },
  ],
  text: [
    { token: '--color-text-primary-dark', name: 'Text primary', tw: 'text-text-primary-dark', on: '--color-bg-dark' },
    { token: '--color-text-muted-dark', name: 'Text muted', tw: 'text-text-muted-dark', on: '--color-bg-dark' },
    { token: '--color-text-primary-light', name: 'Text primary (alt)', tw: 'text-text-primary-light', on: '--color-bg-light' },
    { token: '--color-text-muted-light', name: 'Text muted (alt)', tw: 'text-text-muted-light', on: '--color-bg-light' },
  ],
  brand: [
    { token: '--color-accent', name: 'Accent', tw: 'bg-accent', on: '--color-bg-dark' },
    { token: '--color-accent-hover', name: 'Accent hover', tw: 'bg-accent-hover', on: '--color-bg-dark' },
    { token: '--color-accent-text', name: 'Accent text', tw: 'text-accent-text', on: '--color-bg-dark' },
    { token: '--color-accent-muted', name: 'Accent muted', tw: 'bg-accent-muted' },
    { token: '--color-on-accent', name: 'On accent', tw: 'text-on-accent', on: '--color-accent' },
  ],
  semantic: [
    { token: '--color-success', name: 'Success', tw: 'text-success', on: '--color-bg-dark' },
    { token: '--color-success-bg', name: 'Success bg', tw: 'bg-success-bg' },
    { token: '--color-warning', name: 'Warning', tw: 'text-warning', on: '--color-bg-dark' },
    { token: '--color-warning-bg', name: 'Warning bg', tw: 'bg-warning-bg' },
    { token: '--color-error', name: 'Error', tw: 'text-error', on: '--color-bg-dark' },
    { token: '--color-error-bg', name: 'Error bg', tw: 'bg-error-bg' },
    { token: '--color-info', name: 'Info', tw: 'text-info', on: '--color-bg-dark' },
    { token: '--color-info-bg', name: 'Info bg', tw: 'bg-info-bg' },
  ],
  alpha: [
    { token: '--alpha-5', name: 'Alpha 5' },
    { token: '--alpha-10', name: 'Alpha 10' },
    { token: '--alpha-15', name: 'Alpha 15' },
    { token: '--alpha-20', name: 'Alpha 20' },
    { token: '--alpha-40', name: 'Alpha 40' },
  ],
}

function renderSwatches(el: HTMLElement) {
  const list = SWATCHES[el.dataset.dsSwatches!] || []
  el.classList.add('ds-swatches')
  el.innerHTML = list.map(s => {
    const val = cssVar(s.token)
    const rgba = resolveColor(`var(${s.token})`)
    let aa = ''
    if (s.on) {
      const r = contrast(`var(${s.token})`, `var(${s.on})`)
      if (r) {
        const grade = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA18' : L('Falha', 'Fail')
        aa = `<span class="ds-swatch__aa${r < 3 ? ' is-fail' : ''}" title="${L('Contraste sobre', 'Contrast on')} ${s.on}">${grade} ${r.toFixed(1)}</span>`
      }
    }
    return `<button type="button" class="ds-swatch" data-copy="var(${s.token})" aria-label="${esc(s.name)}, ${esc(s.token)}, ${esc(val)}. ${L('Copiar token', 'Copy token')}">
      <span class="ds-swatch__chip"><span class="ds-swatch__fill" style="background: var(${s.token})"></span>${aa}</span>
      <span class="ds-swatch__meta">
        <span class="ds-swatch__name">${esc(s.name)}</span>
        <span class="ds-swatch__token">${s.token}</span>
        <span class="ds-swatch__value">${rgba ? toHex(rgba) : esc(val)}</span>
        ${s.tw ? `<span class="ds-swatch__token">.${s.tw}</span>` : ''}
      </span>
    </button>`
  }).join('')
}

const TYPE_SCALE: { role: string; cls: string; style: string; token: string; sample: Text; use: Text }[] = [
  { role: 'Display', cls: 'font-serif', style: 'font-size:var(--text-display);font-weight:700;line-height:var(--leading-display);letter-spacing:-0.025em', token: '--text-display', sample: ['Raul <em>Lima.</em>', 'Raul <em>Lima.</em>'], use: ['Hero da home', 'Home hero'] },
  { role: 'Heading XL', cls: 'font-serif', style: 'font-size:var(--text-7xl);font-weight:700;line-height:0.95', token: '--text-7xl', sample: ['Obrigado por <em>assistir.</em>', 'Thanks for <em>watching.</em>'], use: ['CTA do footer', 'Footer CTA'] },
  { role: 'Heading L', cls: 'font-serif', style: 'font-size:var(--text-5xl);font-weight:700;line-height:1.1', token: '--text-5xl', sample: ['Design como ponte', 'Design as a bridge'], use: ['Títulos de seção e de case', 'Section and case titles'] },
  { role: 'Heading M', cls: 'font-serif', style: 'font-size:var(--text-4xl);font-weight:700;line-height:1.1', token: '--text-4xl', sample: ['Impacto do projeto', 'Project impact'], use: ['Números de métricas, subtítulos', 'Metric numbers, subheads'] },
  { role: 'Heading S', cls: 'font-serif', style: 'font-size:var(--text-2xl);font-weight:700;line-height:var(--leading-tight)', token: '--text-2xl', sample: ['Experiência', 'Experience'], use: ['Título de coluna', 'Column title'] },
  { role: 'Heading XS', cls: 'font-serif', style: 'font-size:var(--text-xl);font-weight:700;line-height:var(--leading-tight)', token: '--text-xl', sample: ['Título do projeto', 'Project title'], use: ['Título de card', 'Card title'] },
  { role: 'Body L', cls: '', style: 'font-size:var(--text-lg);line-height:1.8', token: '--text-lg', sample: ['Texto estratégico e overview dos cases.', 'Strategy copy and case overviews.'], use: ['Parágrafos de destaque', 'Lead paragraphs'] },
  { role: 'Body', cls: '', style: 'font-size:var(--text-base);line-height:var(--leading-relaxed)', token: '--text-base', sample: ['15 anos criando produtos digitais que conectam pessoas.', '15 years building digital products that connect people.'], use: ['Texto corrido', 'Running text'] },
  { role: 'Body S', cls: '', style: 'font-size:var(--text-sm);line-height:var(--leading-relaxed)', token: '--text-sm', sample: ['Descrição de card, botões e navegação.', 'Card descriptions, buttons and navigation.'], use: ['UI, botões, cards', 'UI, buttons, cards'] },
  { role: 'Caption', cls: '', style: 'font-size:var(--text-xs);line-height:var(--leading-normal)', token: '--text-xs', sample: ['Legenda, metadados e tooltips.', 'Captions, metadata and tooltips.'], use: ['Metadados', 'Metadata'] },
  { role: 'Overline', cls: '', style: 'font-size:var(--text-xs);font-weight:500;letter-spacing:var(--tracking-widest);text-transform:uppercase', token: '--text-xs', sample: ['01 — Sobre', '01 — About'], use: ['Rótulos de seção', 'Section labels'] },
  { role: 'Micro', cls: '', style: 'font-size:var(--text-2xs);font-weight:700;letter-spacing:var(--tracking-widest);text-transform:uppercase', token: '--text-2xs', sample: ['Status', 'Status'], use: ['Badges de status', 'Status badges'] },
]

function renderTypeScale(el: HTMLElement) {
  el.innerHTML = TYPE_SCALE.map((t, i) => `
    <div class="ds-type-row">
      <div class="ds-type-row__meta">
        <strong>${t.role}</strong>
        <span>${t.token}</span>
        <span data-type-meta="${i}"></span>
        <span>${tr(t.use)}</span>
      </div>
      <div class="ds-type-row__sample ${t.cls}" style="${t.style}" data-type-sample="${i}">${tr(t.sample)}</div>
    </div>`).join('')
  updateTypeMeta(el)
}

function updateTypeMeta(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLElement>('[data-type-sample]').forEach(s => {
    const cs = getComputedStyle(s)
    const meta = scope.querySelector<HTMLElement>(`[data-type-meta="${s.dataset.typeSample}"]`)
    if (!meta) return
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '')
    const lh = cs.lineHeight === 'normal' ? 'normal' : `${Math.round(parseFloat(cs.lineHeight))}px`
    meta.textContent = `${fam} · ${cs.fontWeight} · ${Math.round(parseFloat(cs.fontSize))}px / ${lh}`
  })
}

const SPACING: [string, Text][] = [
  ['--space-1', ['Ícone ↔ texto compacto', 'Tight icon ↔ text']], ['--space-2', ['Gap de botão, badges', 'Button and badge gap']],
  ['--space-3', ['Padding de badge status', 'Status badge padding']], ['--space-4', ['Padding de botão sm, gutters internos', 'Small button padding, inner gutters']],
  ['--space-5', ['Padding de card compacto', 'Compact card padding']], ['--space-6', ['Padding de botão md, card, gutter do container', 'Medium button, card padding, container gutter']],
  ['--space-8', ['Padding horizontal de lead card', 'Lead card horizontal padding']], ['--space-10', ['Padding de metric card', 'Metric card padding']],
  ['--space-12', ['Gap entre colunas', 'Column gap']], ['--space-16', ['Margem de título de seção', 'Section title margin']],
  ['--space-24', ['Seção (mobile)', 'Section (mobile)']], ['--space-32', ['Seção (desktop)', 'Section (desktop)']],
]

function renderSpacing(el: HTMLElement) {
  el.innerHTML = SPACING.map(([t, u]) => {
    const v = cssVar(t)
    const use = tr(u)
    return `<div class="ds-scale-row" title="${esc(use)}">
      <code>${t}</code><span>${remToPx(v) || v}</span>
      <div style="display:flex;align-items:center;gap:var(--space-3);min-width:0"><div class="ds-scale-bar" style="width:var(${t})"></div><span style="font-family:inherit;color:var(--color-text-muted-dark);font-size:var(--text-xs);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(use)}</span></div>
    </div>`
  }).join('')
}

const RADII: [string, Text][] = [
  ['--radius-xs', ['Badge de status, foco', 'Status badge, focus']], ['--radius-sm', ['Input, tooltip', 'Input, tooltip']],
  ['--radius-base', ['Itens de lista, review', 'List items, reviews']], ['--radius-md', ['Lead card, metric card', 'Lead card, metric card']],
  ['--radius-lg', ['Case card, banner, playground', 'Case card, banner, playground']], ['--radius-pill', ['Botões, tags, chips', 'Buttons, tags, chips']],
]

function renderRadii(el: HTMLElement) {
  el.className = 'ds-shapes'
  el.innerHTML = RADII.map(([t, use]) => {
    const v = cssVar(t)
    return `<div class="ds-shape"><div class="ds-shape__box" style="border-radius:var(${t})">${remToPx(v) || v}</div><strong>${tr(use)}</strong><code>${t}</code></div>`
  }).join('')
}

function renderShadows(el: HTMLElement) {
  const list: [string, Text][] = [['--shadow-xs', ['Item ativo (chip, segmented)', 'Active item (chip, segmented)']], ['--shadow-md', ['Tooltip, popover', 'Tooltip, popover']], ['--shadow-lg', ['Case card hover', 'Case card hover']], ['--shadow-xl', ['Frames e drawers', 'Frames and drawers']]]
  el.className = 'ds-shapes'
  el.innerHTML = list.map(([t, use]) => `<div class="ds-shape"><div class="ds-shape__box is-elevated" style="box-shadow:var(${t});border-radius:var(--radius-md)"></div><strong>${tr(use)}</strong><code>${t}</code></div>`).join('')
}

function renderBorders(el: HTMLElement) {
  const list: [string, Text][] = [['--border-1', ['Padrão: cards, inputs, divisores', 'Default: cards, inputs, dividers']], ['--border-2', ['Anel de foco, spinner', 'Focus ring, spinner']], ['--border-frame', ['Moldura de device nos cases', 'Device frame in cases']]]
  el.className = 'ds-shapes'
  el.innerHTML = list.map(([t, use]) => `<div class="ds-shape"><div class="ds-shape__box" style="border:var(${t}) solid var(--alpha-40);border-radius:var(--radius-md)">${cssVar(t)}</div><strong>${tr(use)}</strong><code>${t}</code></div>`).join('')
}

function renderMotion(el: HTMLElement) {
  const list: [string, Text][] = [['--duration-fast', ['Chips, cor de ícone', 'Chips, icon color']], ['--duration-base', ['Botões, links, bordas', 'Buttons, links, borders']], ['--duration-slow', ['Cards, drawers', 'Cards, drawers']], ['--duration-reveal', ['Reveal ao rolar', 'Scroll reveal']]]
  el.innerHTML = `<div class="ds-motion">${list.map(([t, use]) => `
    <div class="ds-motion__row" title="${tr(use)}"><code>${t}</code><span>${cssVar(t)}</span>
      <div class="ds-motion__track"><span class="ds-motion__dot" style="transition-duration:var(${t})"></span></div>
    </div>`).join('')}</div>
    <button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-motion-play style="margin-top:var(--space-4)"><i class="ti ti-player-play" aria-hidden="true"></i><span>${L('Reproduzir', 'Play')}</span></button>`
  const wrap = el.querySelector('.ds-motion')!
  el.querySelector('[data-motion-play]')!.addEventListener('click', () => wrap.classList.toggle('is-played'))
}

const ICONS = ['arrow-right', 'arrow-left', 'arrow-up-right', 'mail', 'brand-linkedin', 'brand-behance', 'moon', 'sun', 'menu-2', 'x', 'check', 'download',
  'briefcase', 'users', 'target-arrow', 'code', 'chart-line', 'school', 'map-pin', 'building-skyscraper', 'file-text', 'external-link',
  'circle-check', 'alert-triangle', 'alert-circle', 'info-circle', 'search', 'filter', 'device-mobile', 'world']

function renderIcons(el: HTMLElement) {
  el.className = 'ds-icons'
  el.innerHTML = ICONS.map(n => `<button type="button" class="ds-icon" data-copy='<i class="ti ti-${n}"></i>' aria-label="${L('Copiar ícone', 'Copy icon')} ${n}"><i class="ti ti-${n}" aria-hidden="true"></i><span>${n}</span></button>`).join('')
}

const FOUNDATION_RENDERERS: [string, (el: HTMLElement) => void][] = [
  ['[data-ds-swatches]', renderSwatches], ['[data-ds-type-scale]', renderTypeScale], ['[data-ds-spacing]', renderSpacing],
  ['[data-ds-radii]', renderRadii], ['[data-ds-shadows]', renderShadows], ['[data-ds-borders]', renderBorders],
  ['[data-ds-motion]', renderMotion], ['[data-ds-icons]', renderIcons],
  ['[data-ds-simulator]', el => mountSimulator(el, L)],
]

/* ---------------- Playground specs ---------------- */

// Option/label text is a plain string when identical in both languages.
type Label = string | Text
const lbl = (l: Label) => typeof l === 'string' ? l : tr(l)

type Control =
  | { type: 'radio'; key: string; label: Text; options: [string, Label][]; when?: (p: Props) => boolean }
  | { type: 'switch'; key: string; label: Text; when?: (p: Props) => boolean }
  | { type: 'text'; key: string; label: Text; when?: (p: Props) => boolean }

interface Part { label: string; selector: string; note: string }
interface TokenRow { part: string; prop: string; token: string }

interface Spec {
  controls: Control[]
  /** Text defaults are bilingual so they can follow a language switch until edited. */
  defaults: Record<string, string | boolean | Text>
  render: (p: Props) => string
  /** Element measured by the measure overlay (default: [data-ds-root]). */
  measure?: string
  anatomy: (p: Props) => Part[]
  tokens: (p: Props) => TokenRow[]
  bind?: (stage: HTMLElement, p: Props, set: (patch: Props, focus?: boolean) => void) => void
}

const STATE_OPTS: [string, Label][] = [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus'], ['active', 'Pressed'], ['disabled', 'Disabled']]
const stateClass = (s: Props['state']) => (s === 'hover' || s === 'focus' || s === 'active') ? ` is-${s}` : ''
const icon = (n: string, cls = '') => `<i class="ti ti-${n}${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`

// Shared part names
const P = {
  container: () => L('Container', 'Container'),
  icon: () => L('Ícone', 'Icon'),
  label: () => 'Label',
  desc: () => L('Descrição', 'Description'),
  title: () => L('Título', 'Title'),
  focus: () => L('Foco', 'Focus'),
  motion: () => L('Movimento', 'Motion'),
}

const SPECS: Record<string, Spec> = {
  button: {
    controls: [
      { type: 'radio', key: 'variant', label: ['Variante', 'Variant'], options: [['primary', 'Primary'], ['secondary', 'Secondary'], ['outline', 'Outline'], ['ghost', 'Ghost'], ['link', 'Link']] },
      { type: 'radio', key: 'size', label: ['Tamanho', 'Size'], options: [['sm', 'SM'], ['md', 'MD'], ['lg', 'LG']] },
      { type: 'radio', key: 'icon', label: ['Ícone', 'Icon'], options: [['none', ['Sem', 'None']], ['left', ['Esquerda', 'Left']], ['right', ['Direita', 'Right']], ['only', ['Só ícone', 'Icon only']]] },
      { type: 'radio', key: 'glyph', label: ['Glifo', 'Glyph'], options: [['arrow-right', '→'], ['arrow-left', '←'], ['mail', 'Mail'], ['download', 'Download']], when: p => p.icon !== 'none' },
      { type: 'radio', key: 'state', label: ['Estado', 'State'], options: [...STATE_OPTS, ['loading', 'Loading']] },
      { type: 'text', key: 'label', label: ['Label', 'Label'] },
    ],
    defaults: { variant: 'primary', size: 'md', icon: 'right', glyph: 'arrow-right', state: 'default', label: ['Ver projetos', 'View projects'] },
    render: p => {
      const only = p.icon === 'only'
      const loading = p.state === 'loading'
      const cls = `ui-btn ui-btn--${p.variant}${p.size !== 'md' ? ` ui-btn--${p.size}` : ''}${only ? ' ui-btn--icon' : ''}${stateClass(p.state)}${loading ? ' is-loading' : ''}`
      const ic = loading ? '<span class="ui-spinner" aria-hidden="true"></span>' : icon(String(p.glyph))
      const label = only ? '' : `<span class="ui-btn__label">${esc(String(p.label || 'Button'))}</span>`
      const attrs = [`type="button"`, `class="${cls}"`]
      if (only) attrs.push(`aria-label="${esc(String(p.label || 'Button'))}"`)
      if (p.state === 'disabled') attrs.push('disabled')
      if (loading) attrs.push('aria-busy="true"')
      const left = (p.icon === 'left' || only || (loading && p.icon === 'none')) ? ic : ''
      const right = p.icon === 'right' ? ic : ''
      return `<button ${attrs.join(' ')} data-ds-root>${left}${label}${right}</button>`
    },
    anatomy: p => {
      const parts: Part[] = [{ label: P.container(), selector: '.ui-btn', note: L('Fundo, borda, raio pill e altura do controle', 'Background, border, pill radius and control height') }]
      if (p.icon !== 'none' || p.state === 'loading') parts.push({ label: p.state === 'loading' ? 'Spinner' : P.icon(), selector: '.ui-btn > i, .ui-btn > .ui-spinner', note: L('Tabler Icon, herda a cor do label', 'Tabler Icon, inherits the label color') })
      if (p.icon !== 'only') parts.push({ label: P.label(), selector: '.ui-btn__label', note: L('Inter, verbo de ação curto', 'Inter, short action verb') })
      return parts
    },
    tokens: p => {
      const v = p.variant
      const size = String(p.size)
      const C = P.container(), Lb = P.label()
      return [
        { part: C, prop: 'background', token: v === 'primary' ? '--color-accent' : v === 'ghost' && p.state === 'hover' ? '--alpha-5' : 'transparent' },
        { part: C, prop: 'border-color', token: v === 'secondary' ? (p.state === 'hover' ? '--alpha-40' : '--alpha-15') : v === 'outline' ? (p.state === 'hover' ? '--color-accent' : '--alpha-15') : 'transparent' },
        { part: Lb, prop: 'color', token: v === 'primary' ? '--color-on-accent' : v === 'secondary' ? '--color-text-primary-dark' : p.state === 'hover' ? (v === 'ghost' ? '--color-text-primary-dark' : '--color-accent-text') : '--color-text-muted-dark' },
        { part: C, prop: 'height', token: v === 'link' ? 'auto' : `--control-${size}` },
        { part: C, prop: 'padding-inline', token: v === 'link' || p.icon === 'only' ? '0' : size === 'sm' ? '--space-4' : size === 'lg' ? '--space-8' : '--space-6' },
        { part: C, prop: 'gap', token: '--space-2' },
        { part: C, prop: 'border-radius', token: v === 'link' ? '--radius-xs' : '--radius-pill' },
        { part: C, prop: 'border-width', token: '--border-1' },
        { part: Lb, prop: 'font-family', token: '--font-sans' },
        { part: Lb, prop: 'font-size', token: size === 'lg' ? '--text-base' : '--text-sm' },
        { part: Lb, prop: 'font-weight', token: v === 'primary' ? '--weight-semibold' : v === 'link' ? '--weight-regular' : '--weight-medium' },
        { part: P.focus(), prop: 'outline', token: '--color-accent-text' },
        { part: P.motion(), prop: 'transition', token: '--duration-base' },
      ]
    },
  },

  badge: {
    controls: [
      { type: 'radio', key: 'variant', label: ['Variante', 'Variant'], options: [['tag', 'Tag'], ['label', 'Label'], ['status', 'Status'], ['dot', 'Dot']] },
      { type: 'radio', key: 'tone', label: ['Tom', 'Tone'], options: [['success', 'Success'], ['warning', 'Warning'], ['error', 'Error'], ['info', 'Info']], when: p => p.variant === 'status' },
      { type: 'radio', key: 'size', label: ['Tamanho', 'Size'], options: [['sm', 'SM'], ['md', 'MD']] },
      { type: 'switch', key: 'icon', label: ['Ícone', 'Icon'], when: p => p.variant !== 'dot' },
      { type: 'switch', key: 'pulse', label: ['Pulsar', 'Pulse'], when: p => p.variant === 'dot' },
      { type: 'radio', key: 'state', label: ['Estado', 'State'], options: [['default', 'Default'], ['hover', 'Hover']], when: p => p.variant === 'tag' },
      { type: 'text', key: 'label', label: ['Label', 'Label'] },
    ],
    defaults: { variant: 'status', tone: 'success', size: 'md', icon: true, pulse: true, state: 'default', label: ['Publicado', 'Published'] },
    render: p => {
      const v = p.variant
      let cls = `ui-badge ui-badge--${v}`
      if (v === 'status') cls += ` ui-badge--${p.tone}`
      if (p.size === 'sm') cls += ' ui-badge--sm'
      if (v === 'tag' && p.state === 'hover') cls += ' is-hover'
      const glyph = v === 'status' ? ({ success: 'circle-check', warning: 'alert-triangle', error: 'alert-circle', info: 'info-circle' } as Record<string, string>)[String(p.tone)] : v === 'label' ? 'sparkles' : 'hash'
      const lead = v === 'dot' ? `<span class="ui-badge__dot${p.pulse ? ' is-pulse' : ''}" aria-hidden="true"></span>` : p.icon ? icon(glyph) : ''
      return `<span class="${cls}" data-ds-root>${lead}<span>${esc(String(p.label || 'Badge'))}</span></span>`
    },
    anatomy: p => {
      const parts: Part[] = [{ label: P.container(), selector: '.ui-badge', note: L('Fundo translúcido + borda do mesmo tom', 'Translucent fill + border in the same tone') }]
      if (p.variant === 'dot') parts.push({ label: L('Indicador', 'Indicator'), selector: '.ui-badge__dot', note: L('8px, accent, pulso opcional', '8px, accent, optional pulse') })
      else if (p.icon) parts.push({ label: P.icon(), selector: '.ui-badge > i', note: L('Reforça o significado além da cor', 'Carries meaning beyond color') })
      parts.push({ label: P.label(), selector: '.ui-badge > span:last-child', note: p.variant === 'status' || p.variant === 'label' ? L('Caixa alta com tracking', 'Uppercase with tracking') : 'Sentence case' })
      return parts
    },
    tokens: p => {
      const v = p.variant
      const tone = String(p.tone)
      const C = P.container(), Lb = P.label()
      const fg = v === 'status' ? `--color-${tone}` : v === 'label' ? '--color-accent-text' : v === 'dot' ? '--color-text-muted-dark' : p.state === 'hover' ? '--color-accent-text' : '--color-text-primary-dark'
      const bg = v === 'status' ? `--color-${tone}-bg` : v === 'label' || (v === 'tag' && p.state === 'hover') ? '--color-accent-muted' : '--alpha-5'
      const border = v === 'status' ? `--color-${tone} · 20%` : v === 'label' ? '--color-accent · 25%' : v === 'dot' ? '--alpha-10' : p.state === 'hover' ? '--color-accent' : '--alpha-15'
      const rows: TokenRow[] = [
        { part: C, prop: 'background', token: bg },
        { part: C, prop: 'border-color', token: border },
        { part: C, prop: 'border-radius', token: v === 'status' ? '--radius-xs' : '--radius-pill' },
        { part: C, prop: 'gap', token: '--space-2' },
        { part: Lb, prop: 'color', token: fg },
        { part: Lb, prop: 'font-size', token: v === 'status' || p.size === 'sm' ? '--text-2xs' : v === 'tag' ? '0.8rem' : '--text-xs' },
        { part: Lb, prop: 'font-weight', token: v === 'status' ? '--weight-bold' : v === 'label' ? '--weight-semibold' : v === 'dot' ? '--weight-regular' : '--weight-medium' },
      ]
      if (v === 'status' || v === 'label') rows.push({ part: Lb, prop: 'letter-spacing', token: v === 'status' ? '--tracking-widest' : '--tracking-wide' })
      if (v === 'dot') rows.push({ part: L('Indicador', 'Indicator'), prop: 'background', token: '--color-accent' }, { part: L('Indicador', 'Indicator'), prop: 'size', token: '--space-2' })
      return rows
    },
  },

  chip: {
    controls: [
      { type: 'radio', key: 'variant', label: ['Variante', 'Variant'], options: [['neutral', 'Neutral'], ['accent', 'Accent']] },
      { type: 'radio', key: 'size', label: ['Tamanho', 'Size'], options: [['sm', 'SM'], ['md', 'MD']] },
      { type: 'switch', key: 'pressed', label: ['Selecionado', 'Selected'] },
      { type: 'switch', key: 'icon', label: ['Ícone', 'Icon'] },
      { type: 'switch', key: 'count', label: ['Contador', 'Counter'] },
      { type: 'radio', key: 'state', label: ['Estado', 'State'], options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus'], ['disabled', 'Disabled']] },
      { type: 'text', key: 'label', label: ['Label', 'Label'] },
    ],
    defaults: { variant: 'neutral', size: 'md', pressed: true, icon: false, count: true, state: 'default', label: 'Mobile' },
    render: p => {
      const cls = `ui-chip${p.variant === 'accent' ? ' ui-chip--accent' : ''}${p.size === 'sm' ? ' ui-chip--sm' : ''}${stateClass(p.state)}`
      return `<button type="button" class="${cls}" aria-pressed="${p.pressed ? 'true' : 'false'}"${p.state === 'disabled' ? ' disabled' : ''} data-ds-root>${p.icon ? icon('device-mobile') : ''}<span>${esc(String(p.label || 'Chip'))}</span>${p.count ? '<span class="ui-chip__count">12</span>' : ''}</button>`
    },
    anatomy: p => {
      const parts: Part[] = [{ label: P.container(), selector: '.ui-chip', note: L('aria-pressed define o estado', 'aria-pressed sets the state') }]
      if (p.icon) parts.push({ label: P.icon(), selector: '.ui-chip > i', note: L('Opcional, 16px', 'Optional, 16px') })
      parts.push({ label: P.label(), selector: '.ui-chip > span', note: L('Nome do filtro', 'Filter name') })
      if (p.count) parts.push({ label: L('Contador', 'Counter'), selector: '.ui-chip__count', note: L('Números tabulares, 60% de opacidade', 'Tabular numbers, 60% opacity') })
      return parts
    },
    tokens: p => {
      const on = !!p.pressed
      const acc = p.variant === 'accent'
      const C = P.container(), Lb = P.label()
      return [
        { part: C, prop: 'background', token: on ? (acc ? '--color-accent' : '--color-surface') : 'transparent' },
        { part: C, prop: 'border-color', token: on ? (acc ? '--color-accent' : '--alpha-15') : '--alpha-10' },
        { part: C, prop: 'box-shadow', token: on && !acc ? '--shadow-xs' : 'none' },
        { part: C, prop: 'border-radius', token: '--radius-pill' },
        { part: Lb, prop: 'color', token: on ? (acc ? '--color-on-accent' : '--color-text-primary-dark') : p.state === 'hover' ? '--color-text-primary-dark' : '--color-text-muted-dark' },
        { part: Lb, prop: 'font-size', token: p.size === 'sm' ? '--text-xs' : '0.8125rem' },
        { part: Lb, prop: 'font-weight', token: '--weight-medium' },
        { part: P.motion(), prop: 'transition', token: '--duration-fast' },
      ]
    },
    bind: (stage, p, set) => {
      stage.querySelector('.ui-chip')?.addEventListener('click', () => set({ pressed: !p.pressed }))
    },
  },

  segmented: {
    controls: [
      { type: 'radio', key: 'variant', label: ['Variante', 'Variant'], options: [['neutral', 'Neutral'], ['accent', 'Accent']] },
      { type: 'radio', key: 'size', label: ['Tamanho', 'Size'], options: [['sm', 'SM'], ['md', 'MD']] },
      { type: 'radio', key: 'items', label: ['Opções', 'Options'], options: [['2', '2'], ['3', '3']] },
      { type: 'switch', key: 'icons', label: ['Ícones', 'Icons'] },
      { type: 'radio', key: 'state', label: ['Estado (item 2)', 'State (item 2)'], options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus']] },
    ],
    defaults: { variant: 'neutral', size: 'md', items: '2', icons: false, state: 'default', selected: '0' },
    render: p => {
      const opts: [string, string][] = [['App', 'device-mobile'], ['Web', 'world'], ['Board', 'layout-board']].slice(0, +p.items) as [string, string][]
      const sel = Math.min(+p.selected, opts.length - 1)
      const cls = `ui-segmented${p.variant === 'accent' ? ' ui-segmented--accent' : ''}${p.size === 'sm' ? ' ui-segmented--sm' : ''}`
      const items = opts.map(([l, ic], i) => `<button type="button" role="radio" class="ui-segmented__item${i === 1 ? stateClass(p.state) : ''}" aria-checked="${i === sel}" tabindex="${i === sel ? 0 : -1}">${p.icons ? icon(ic) : ''}<span>${l}</span></button>`).join('')
      return `<div class="${cls}" role="radiogroup" aria-label="${L('Modo de visualização', 'View mode')}" data-ds-root>${items}</div>`
    },
    anatomy: () => [
      { label: L('Trilho', 'Track'), selector: '.ui-segmented', note: L('Agrupa opções mutuamente exclusivas', 'Groups mutually exclusive options') },
      { label: L('Item selecionado', 'Selected item'), selector: '.ui-segmented__item[aria-checked="true"]', note: L('Superfície elevada com shadow-xs', 'Raised surface with shadow-xs') },
      { label: 'Item', selector: '.ui-segmented__item[aria-checked="false"]', note: L('Texto muted, hover para primary', 'Muted text, primary on hover') },
    ],
    tokens: p => {
      const T = L('Trilho', 'Track'), S = L('Selecionado', 'Selected')
      return [
        { part: T, prop: 'background', token: '--alpha-5' },
        { part: T, prop: 'border-color', token: '--alpha-10' },
        { part: T, prop: 'padding', token: '--space-1' },
        { part: T, prop: 'border-radius', token: '--radius-pill' },
        { part: S, prop: 'background', token: p.variant === 'accent' ? '--color-accent' : '--color-surface' },
        { part: S, prop: 'color', token: p.variant === 'accent' ? '--color-on-accent' : '--color-text-primary-dark' },
        { part: S, prop: 'box-shadow', token: p.variant === 'accent' ? 'none' : '--shadow-xs' },
        { part: 'Item', prop: 'height', token: p.size === 'sm' ? '1.75rem' : '--control-sm' },
        { part: 'Item', prop: 'color', token: p.state === 'hover' ? '--color-text-primary-dark' : '--color-text-muted-dark' },
        { part: 'Item', prop: 'font-size', token: p.size === 'sm' ? '--text-xs' : '--text-sm' },
      ]
    },
    bind: (stage, _p, set) => {
      const items = [...stage.querySelectorAll<HTMLElement>('.ui-segmented__item')]
      items.forEach((b, i) => {
        b.addEventListener('click', () => set({ selected: String(i) }, true))
        b.addEventListener('keydown', e => {
          const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
          if (!d) return
          e.preventDefault()
          set({ selected: String((i + d + items.length) % items.length) }, true)
        })
      })
    },
  },

  input: {
    controls: [
      { type: 'radio', key: 'size', label: ['Tamanho', 'Size'], options: [['sm', 'SM'], ['md', 'MD']] },
      { type: 'switch', key: 'icon', label: ['Ícone', 'Icon'] },
      { type: 'switch', key: 'hint', label: ['Texto de ajuda', 'Helper text'] },
      { type: 'radio', key: 'state', label: ['Estado', 'State'], options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus'], ['error', ['Erro', 'Error']], ['disabled', 'Disabled']] },
      { type: 'text', key: 'label', label: ['Label', 'Label'] },
      { type: 'text', key: 'placeholder', label: ['Placeholder', 'Placeholder'] },
    ],
    defaults: { size: 'md', icon: true, hint: true, state: 'default', label: 'Email', placeholder: ['voce@empresa.com', 'you@company.com'] },
    measure: '.ui-input',
    render: p => {
      const err = p.state === 'error'
      const st = err ? '' : stateClass(p.state)
      const hint = err
        ? `<p class="ui-field__hint is-error" id="ds-in-hint">${icon('alert-circle')}${L('Informe um email válido.', 'Enter a valid email.')}</p>`
        : p.hint ? `<p class="ui-field__hint" id="ds-in-hint">${L('Usaremos apenas para responder.', 'We’ll only use it to reply.')}</p>` : ''
      const aria = [err ? 'aria-invalid="true"' : '', hint ? 'aria-describedby="ds-in-hint"' : '', p.state === 'disabled' ? 'disabled' : ''].filter(Boolean).join(' ')
      return `<div class="ui-field${p.size === 'sm' ? ' ui-field--sm' : ''}" data-ds-root>
        <label class="ui-field__label" for="ds-in">${esc(String(p.label || 'Label'))}</label>
        <div class="ui-field__control">${p.icon ? `<i class="ti ti-mail ui-field__icon" aria-hidden="true"></i>` : ''}<input id="ds-in" type="email" class="ui-input${st}" placeholder="${esc(String(p.placeholder))}" ${aria}></div>
        ${hint}
      </div>`
    },
    anatomy: p => {
      const parts: Part[] = [
        { label: P.label(), selector: '.ui-field__label', note: L('Sempre visível, ligado via for/id', 'Always visible, linked via for/id') },
        { label: L('Campo', 'Field'), selector: '.ui-input', note: L('Borda 1px, foco com anel accent', '1px border, accent focus ring') },
      ]
      if (p.icon) parts.push({ label: P.icon(), selector: '.ui-field__icon', note: L('Decorativo, aria-hidden', 'Decorative, aria-hidden') })
      if (p.hint || p.state === 'error') parts.push({ label: p.state === 'error' ? L('Mensagem de erro', 'Error message') : L('Ajuda', 'Helper'), selector: '.ui-field__hint', note: L('aria-describedby no input', 'aria-describedby on the input') })
      return parts
    },
    tokens: p => {
      const err = p.state === 'error'
      const F = L('Campo', 'Field'), H = L('Ajuda', 'Helper')
      return [
        { part: P.label(), prop: 'color', token: '--color-text-muted-dark' },
        { part: P.label(), prop: 'letter-spacing', token: '--tracking-widest' },
        { part: F, prop: 'border-color', token: err ? '--color-error' : p.state === 'focus' ? '--color-accent-text' : p.state === 'hover' ? '--alpha-40' : '--color-border' },
        { part: F, prop: L('box-shadow (foco)', 'box-shadow (focus)'), token: err ? '--color-error-bg' : '--color-accent-muted' },
        { part: F, prop: 'border-radius', token: '--radius-sm' },
        { part: F, prop: 'height', token: p.size === 'sm' ? '--control-sm' : '3rem' },
        { part: F, prop: 'padding-inline', token: '--space-4' },
        { part: F, prop: 'color', token: '--color-text-primary-dark' },
        { part: F, prop: 'font-size', token: p.size === 'sm' ? '--text-xs' : '--text-sm' },
        { part: H, prop: 'color', token: err ? '--color-error' : '--color-text-muted-dark' },
        { part: 'Field', prop: 'gap', token: '--space-2' },
      ]
    },
  },

  card: {
    controls: [
      { type: 'radio', key: 'variant', label: ['Variante', 'Variant'], options: [['lead', 'Lead'], ['case', 'Case'], ['metric', ['Métrica', 'Metric']], ['item', 'Item']] },
      { type: 'switch', key: 'interactive', label: ['Clicável (botão)', 'Clickable (button)'], when: p => p.variant === 'item' },
      { type: 'switch', key: 'expanded', label: ['Expandido', 'Expanded'], when: p => p.variant === 'item' && !!p.interactive },
      { type: 'switch', key: 'icon', label: ['Ícone', 'Icon'], when: p => p.variant === 'lead' },
      { type: 'switch', key: 'accent', label: ['Valor em accent', 'Accent value'], when: p => p.variant === 'metric' },
      { type: 'radio', key: 'state', label: ['Estado', 'State'], options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus']], when: p => p.variant !== 'metric' },
    ],
    defaults: { variant: 'case', icon: true, accent: true, state: 'default', interactive: true, expanded: false },
    render: p => {
      const st = p.variant === 'metric' ? '' : stateClass(p.state)
      if (p.variant === 'lead') {
        return `<div class="ui-card ui-card--lead${st}" data-ds-root>${p.icon ? `<i class="ti ti-users ui-card__icon" aria-hidden="true"></i>` : ''}<h3 class="ui-card__title">Leadership &amp; Culture</h3><p class="ui-card__text">${L('Liderança de times multidisciplinares, rituais de design e desenvolvimento de pessoas.', 'Leading multidisciplinary teams, design rituals and people development.')}</p></div>`
      }
      if (p.variant === 'item') {
        const inner = `<span class="ui-card__dot" aria-hidden="true"></span><span><span class="ui-card__name">Daycoval</span><span class="ui-card__meta">${L('2025 – Atual · Banking', '2025 – Present · Banking')}</span></span>`
        return p.interactive
          ? `<button type="button" class="ui-card ui-card--item${st}" aria-expanded="${!!p.expanded}" data-ds-root>${inner}</button>`
          : `<div class="ui-card ui-card--item" data-ds-root>${inner}</div>`
      }
      if (p.variant === 'metric') {
        return `<div class="ui-card ui-card--metric" data-ds-root><p class="ui-card__metric${p.accent ? ' is-accent' : ''}">230K</p><p class="ui-card__text">${L('usuários ativos na plataforma em 2023', 'active users on the platform in 2023')}</p></div>`
      }
      return `<a href="#/card" class="ui-card ui-card--case${st}" data-ds-root><div class="ui-card__media">${icon('photo')}</div><div class="ui-card__body"><p class="ui-card__overline">Healthtech · 2020</p><h3 class="ui-card__heading">Starbem</h3><p class="ui-card__text">${L('Da resposta à pandemia a uma plataforma escalável de saúde.', 'From pandemic response to a scalable health platform.')}</p><span class="ui-card__cta">${L('Ver case', 'View case')} ${icon('arrow-right')}</span></div></a>`
    },
    anatomy: p => {
      if (p.variant === 'lead') return [
        { label: P.container(), selector: '.ui-card', note: L('Superfície alpha-5, borda alpha-10', 'alpha-5 surface, alpha-10 border') },
        ...(p.icon ? [{ label: P.icon(), selector: '.ui-card__icon', note: L('30px, accent', '30px, accent') }] : []),
        { label: P.title(), selector: '.ui-card__title', note: 'Inter semibold' },
        { label: P.desc(), selector: '.ui-card__text', note: L('Texto muted, leading relaxed', 'Muted text, relaxed leading') },
      ]
      if (p.variant === 'item') return [
        { label: P.container(), selector: '.ui-card', note: L('Item de lista; como <button> abre um Popover', 'List entry; as a <button> it opens a Popover') },
        { label: L('Indicador', 'Indicator'), selector: '.ui-card__dot', note: L('Accent quando expandido', 'Accent when expanded') },
        { label: L('Nome', 'Name'), selector: '.ui-card__name', note: 'Inter semibold' },
        { label: 'Meta', selector: '.ui-card__meta', note: L('Período, segmento', 'Period, industry') },
      ]
      if (p.variant === 'metric') return [
        { label: P.container(), selector: '.ui-card', note: L('Centralizado, padding generoso', 'Centered, generous padding') },
        { label: L('Valor', 'Value'), selector: '.ui-card__metric', note: L('Playfair fluido (clamp)', 'Fluid Playfair (clamp)') },
        { label: P.desc(), selector: '.ui-card__text', note: L('Contexto do número', 'Context for the number') },
      ]
      return [
        { label: P.container(), selector: '.ui-card', note: L('Link inteiro clicável, raio lg', 'Whole card is the link, lg radius') },
        { label: L('Mídia', 'Media'), selector: '.ui-card__media', note: L('16:9, zoom no hover', '16:9, zoom on hover') },
        { label: 'Overline', selector: '.ui-card__overline', note: L('Segmento · ano', 'Industry · year') },
        { label: P.title(), selector: '.ui-card__heading', note: 'Playfair bold' },
        { label: 'CTA', selector: '.ui-card__cta', note: L('Gap cresce no hover', 'Gap grows on hover') },
      ]
    },
    tokens: p => {
      const C = P.container(), D = P.desc(), T = P.title()
      if (p.variant === 'lead') return [
        { part: C, prop: 'background', token: p.state === 'hover' ? '--color-accent · 4%' : '--alpha-5' },
        { part: C, prop: 'border-color', token: p.state === 'hover' ? '--color-accent' : '--alpha-10' },
        { part: C, prop: 'border-radius', token: '--radius-md' },
        { part: C, prop: 'padding', token: '--space-6 --space-8' },
        { part: P.icon(), prop: 'color', token: '--color-accent-text' },
        { part: T, prop: 'font-size', token: '--text-base' },
        { part: D, prop: 'color', token: '--color-text-muted-dark' },
        { part: D, prop: 'font-size', token: '--text-sm' },
      ]
      if (p.variant === 'item') return [
        { part: C, prop: 'background', token: '--color-surface' },
        { part: C, prop: 'border-color', token: p.interactive && p.expanded ? '--color-accent-text' : p.interactive && p.state === 'hover' ? '--alpha-40' : '--color-border' },
        { part: C, prop: 'border-radius', token: '--radius-base' },
        { part: C, prop: 'padding', token: '--space-4' },
        { part: C, prop: 'gap', token: '--space-4' },
        { part: L('Indicador', 'Indicator'), prop: 'background', token: p.interactive && p.expanded ? '--color-accent' : '--alpha-20' },
        { part: 'Meta', prop: 'color', token: '--color-text-muted-dark' },
      ]
      if (p.variant === 'metric') return [
        { part: C, prop: 'background', token: '--alpha-5' },
        { part: C, prop: 'border-color', token: '--color-border' },
        { part: C, prop: 'border-radius', token: '--radius-md' },
        { part: C, prop: 'padding', token: '--space-10 --space-6' },
        { part: L('Valor', 'Value'), prop: 'font-family', token: '--font-serif' },
        { part: L('Valor', 'Value'), prop: 'color', token: p.accent ? '--color-accent-text' : '--color-text-primary-dark' },
        { part: D, prop: 'color', token: '--color-text-muted-dark' },
      ]
      return [
        { part: C, prop: 'background', token: '--color-surface' },
        { part: C, prop: 'border-radius', token: '--radius-lg' },
        { part: C, prop: 'box-shadow (hover)', token: '--shadow-lg' },
        { part: C, prop: 'transition', token: '--duration-slow' },
        { part: L('Corpo', 'Body'), prop: 'padding', token: '--space-6' },
        { part: 'Overline', prop: 'letter-spacing', token: '--tracking-widest' },
        { part: T, prop: 'font-family', token: '--font-serif' },
        { part: T, prop: 'font-size', token: '--text-xl' },
        { part: D, prop: 'color', token: '--color-text-muted-dark' },
      ]
    },
  },

  accordion: {
    controls: [
      { type: 'radio', key: 'items', label: ['Itens', 'Items'], options: [['1', '1'], ['2', '2'], ['3', '3']] },
      { type: 'switch', key: 'open', label: ['Primeiro aberto', 'First open'] },
      { type: 'switch', key: 'numbered', label: ['Numeração', 'Numbering'] },
      { type: 'radio', key: 'state', label: ['Estado (gatilho 1)', 'State (trigger 1)'], options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus']] },
    ],
    defaults: { items: '3', open: true, numbered: true, state: 'default' },
    render: p => {
      const data: Text[][] = [
        [['Visibilidade do status do sistema', 'Visibility of system status'], ['O sistema mantém o usuário informado sobre o que acontece, com feedback adequado e em tempo razoável.', 'The system keeps users informed about what is going on, through timely and appropriate feedback.']],
        [['Controle e liberdade do usuário', 'User control and freedom'], ['Saídas de emergência claras para desfazer ações sem passar por fluxos longos.', 'Clearly marked exits to undo actions without going through long flows.']],
        [['Consistência e padrões', 'Consistency and standards'], ['Palavras, situações e ações significam a mesma coisa em todo o produto.', 'Words, situations and actions mean the same thing across the product.']],
      ].slice(0, +p.items) as Text[][]
      return `<div class="ui-accordion" data-ds-root>${data.map(([t, c], i) => `<details class="ui-accordion__item"${i === 0 && p.open ? ' open' : ''}><summary class="ui-accordion__trigger${i === 0 ? stateClass(p.state) : ''}">${p.numbered ? `<span class="ui-accordion__num">${String(i + 1).padStart(2, '0')}</span>` : ''}${tr(t)}</summary><div class="ui-accordion__content">${tr(c)}</div></details>`).join('')}</div>`
    },
    anatomy: p => [
      { label: 'Item', selector: '.ui-accordion__item', note: L('<details> nativo: teclado e leitor de tela de graça', 'Native <details>: keyboard and screen reader for free') },
      { label: L('Gatilho', 'Trigger'), selector: '.ui-accordion__trigger', note: L('<summary>, sublinhado no hover', '<summary>, underlined on hover') },
      ...(p.numbered ? [{ label: L('Índice', 'Index'), selector: '.ui-accordion__num', note: L('Números tabulares', 'Tabular numbers') }] : []),
      ...(p.open ? [{ label: L('Conteúdo', 'Content'), selector: '.ui-accordion__content', note: L('Texto muted', 'Muted text') }] : []),
    ],
    tokens: () => {
      const G = L('Gatilho', 'Trigger'), Ct = L('Conteúdo', 'Content')
      return [
        { part: 'Item', prop: 'border-color', token: '--color-border' },
        { part: G, prop: 'color', token: '--color-text-primary-dark' },
        { part: G, prop: 'font-weight', token: '--weight-medium' },
        { part: 'Chevron', prop: 'border-color', token: '--color-text-muted-dark' },
        { part: 'Chevron', prop: 'transition', token: '--duration-base' },
        { part: L('Índice', 'Index'), prop: 'font-size', token: '--text-xs' },
        { part: Ct, prop: 'color', token: '--color-text-muted-dark' },
        { part: Ct, prop: 'font-size', token: '--text-sm' },
        { part: P.focus(), prop: 'outline', token: '--color-accent-text' },
      ]
    },
    bind: (stage, p, set) => {
      // <details> also fires toggle when parsed with [open]; only sync real changes.
      stage.querySelector('details')?.addEventListener('toggle', e => {
        const open = (e.target as HTMLDetailsElement).open
        if (open !== !!p.open) set({ open }, true)
      })
    },
  },

  tooltip: {
    controls: [
      { type: 'radio', key: 'placement', label: ['Posição', 'Placement'], options: [['top', ['Topo', 'Top']], ['bottom', ['Base', 'Bottom']]] },
      { type: 'switch', key: 'swatch', label: ['Swatch', 'Swatch'] },
      { type: 'switch', key: 'value', label: ['Valor', 'Value'] },
      { type: 'switch', key: 'open', label: ['Forçar aberto', 'Force open'] },
      { type: 'text', key: 'label', label: ['Texto', 'Text'] },
    ],
    defaults: { placement: 'top', swatch: true, value: true, open: true, label: 'Pefisa' },
    measure: '.ui-tooltip',
    render: p => `<span class="ui-tooltip-wrap" data-ds-root>
        <button type="button" class="ui-btn ui-btn--secondary ui-btn--icon" aria-label="${L('Detalhes', 'Details')}" aria-describedby="ds-tip">${icon('info-circle')}</button>
        <span class="ui-tooltip${p.placement === 'bottom' ? ' ui-tooltip--bottom' : ''}${p.open ? ' is-open' : ''}" role="tooltip" id="ds-tip">${p.swatch ? '<span class="ui-tooltip__swatch" aria-hidden="true"></span>' : ''}${esc(String(p.label || 'Tooltip'))}${p.value ? ` <strong>${L('4,2', '4.2')}</strong>` : ''}</span>
      </span>`,
    anatomy: p => [
      { label: L('Gatilho', 'Trigger'), selector: '.ui-btn', note: L('Abre no hover e no foco', 'Opens on hover and focus') },
      { label: L('Balão', 'Bubble'), selector: '.ui-tooltip', note: L('role="tooltip" + aria-describedby', 'role="tooltip" + aria-describedby') },
      ...(p.swatch ? [{ label: 'Swatch', selector: '.ui-tooltip__swatch', note: L('Liga o valor à série do gráfico', 'Links the value to the chart series') }] : []),
      ...(p.value ? [{ label: L('Valor', 'Value'), selector: '.ui-tooltip strong', note: L('Números tabulares', 'Tabular numbers') }] : []),
    ],
    tokens: () => {
      const B = L('Balão', 'Bubble'), T = L('Texto', 'Text')
      return [
        { part: B, prop: 'background', token: '--color-surface' },
        { part: B, prop: 'border-color', token: '--alpha-15' },
        { part: B, prop: 'box-shadow', token: '--shadow-md' },
        { part: B, prop: 'border-radius', token: '--radius-sm' },
        { part: B, prop: 'offset', token: '--space-3' },
        { part: T, prop: 'color', token: '--color-text-primary-dark' },
        { part: T, prop: 'font-size', token: '--text-xs' },
        { part: 'Swatch', prop: 'background', token: '--color-accent' },
        { part: P.motion(), prop: 'transition', token: '--duration-fast' },
      ]
    },
  },

  popover: {
    controls: [
      { type: 'switch', key: 'open', label: ['Aberto', 'Open'] },
      { type: 'switch', key: 'title', label: ['Título', 'Title'] },
      { type: 'radio', key: 'state', label: ['Estado do gatilho', 'Trigger state'], options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus']] },
    ],
    defaults: { open: true, title: true, state: 'default' },
    measure: '.ui-popover',
    render: p => `<div class="ui-popover-wrap" data-ds-root>
        <button type="button" class="ui-card ui-card--item${stateClass(p.state)}" aria-expanded="${!!p.open}" aria-controls="ds-pop"><span class="ui-card__dot" aria-hidden="true"></span><span><span class="ui-card__name">Decathlon</span><span class="ui-card__meta">2025 · Retail</span></span></button>
        <div class="ui-popover" id="ds-pop"${p.open ? '' : ' hidden'}>${p.title ? `<p class="ui-popover__title">Consulting Product Designer</p>` : ''}<p class="ui-popover__text">${L('Redesenho do programa de benefícios, gerando novas oportunidades de negócio.', 'Redesign of the benefits program, opening new business opportunities.')}</p></div>
      </div>`,
    anatomy: p => [
      { label: L('Gatilho', 'Trigger'), selector: '.ui-card--item', note: L('<button> com aria-expanded e aria-controls', '<button> with aria-expanded and aria-controls') },
      ...(p.open ? [{ label: L('Painel', 'Panel'), selector: '.ui-popover', note: L('Flutua sob o gatilho; Esc e clique fora fecham', 'Floats under the trigger; Esc and outside click close it') }] : []),
      ...(p.open && p.title ? [{ label: P.title(), selector: '.ui-popover__title', note: 'Inter semibold' }] : []),
    ],
    tokens: () => {
      const Pn = L('Painel', 'Panel')
      return [
        { part: Pn, prop: 'background', token: '--color-surface' },
        { part: Pn, prop: 'border-color', token: '--alpha-15' },
        { part: Pn, prop: 'box-shadow', token: '--shadow-md' },
        { part: Pn, prop: 'border-radius', token: '--radius-base' },
        { part: Pn, prop: 'padding', token: '--space-5' },
        { part: Pn, prop: L('distância do gatilho', 'offset from trigger'), token: '--space-2' },
        { part: P.title(), prop: 'font-size', token: '--text-sm' },
        { part: P.desc(), prop: 'color', token: '--color-text-muted-dark' },
      ]
    },
    bind: (stage, p, set) => {
      stage.querySelector('.ui-card--item')?.addEventListener('click', () => set({ open: !p.open }, true))
    },
  },

  compare: {
    controls: [
      { type: 'radio', key: 'pos', label: ['Posição', 'Position'], options: [['25', '25%'], ['50', '50%'], ['75', '75%']] },
      { type: 'switch', key: 'labels', label: ['Legendas', 'Labels'] },
      { type: 'switch', key: 'scroll', label: ['Rolagem interna', 'Inner scroll'] },
    ],
    defaults: { pos: '50', labels: true, scroll: true },
    render: p => `<div class="ui-compare${p.scroll ? ' ui-compare--scroll' : ''}" data-compare style="--pos: ${p.pos}%" data-ds-root>
        <div class="ui-compare__viewport"><div class="ui-compare__stage">
          <img class="ui-compare__after" src="/img/cases/kalion/site-depois.jpg" alt="${L('Depois', 'After')}" />
          <img class="ui-compare__before" src="/img/cases/kalion/site-antes.jpg" alt="${L('Antes', 'Before')}" />
          <div class="ui-compare__line" aria-hidden="true"><span class="ui-compare__knob">${icon('arrows-horizontal')}</span></div>
        </div></div>
        ${p.labels ? `<span class="ui-compare__label is-before">${L('Antes', 'Before')}</span><span class="ui-compare__label is-after">${L('Depois', 'After')}</span>` : ''}
        <input class="ui-compare__range" type="range" min="0" max="100" value="${p.pos}" aria-label="${L('Comparar antes e depois', 'Compare before and after')}" />
      </div>`,
    anatomy: p => [
      { label: P.container(), selector: '.ui-compare', note: L('Moldura com borda e raio lg', 'Frame with border and lg radius') },
      { label: L('Linha', 'Line'), selector: '.ui-compare__line', note: L('2px em accent, segue --pos', '2px accent, follows --pos') },
      { label: L('Marcador', 'Knob'), selector: '.ui-compare__knob', note: L('Sticky: fica no centro ao rolar', 'Sticky: stays centered while scrolling') },
      ...(p.labels ? [{ label: L('Legendas', 'Labels'), selector: '.ui-compare__label', note: L('Discretas, vidro fosco', 'Subtle, frosted glass') }] : []),
    ],
    tokens: () => [
      { part: P.container(), prop: 'border-color', token: '--color-border' },
      { part: P.container(), prop: 'border-radius', token: '--radius-lg' },
      { part: L('Linha', 'Line'), prop: 'background', token: '--color-accent' },
      { part: L('Linha', 'Line'), prop: 'width', token: '--border-2' },
      { part: L('Marcador', 'Knob'), prop: 'background', token: '--color-accent' },
      { part: L('Marcador', 'Knob'), prop: 'color', token: '--color-on-accent' },
      { part: L('Marcador', 'Knob'), prop: 'box-shadow', token: '--shadow-md' },
      { part: L('Legendas', 'Labels'), prop: 'background', token: '--glass-bg' },
      { part: L('Legendas', 'Labels'), prop: 'font-size', token: '--text-2xs' },
      { part: P.focus(), prop: 'outline', token: '--color-accent-text' },
    ],
    bind: (stage) => {
      const root = stage.querySelector<HTMLElement>('[data-compare]')
      if (root) bindCompare(root)
    },
  },

  navbar: {
    controls: [
      { type: 'switch', key: 'links', label: ['Links', 'Links'] },
      { type: 'switch', key: 'social', label: ['Ações sociais', 'Social actions'] },
      { type: 'switch', key: 'cta', label: ['CTA', 'CTA'] },
    ],
    defaults: { links: true, social: true, cta: true },
    render: p => `<header class="ui-navbar" data-ds-root>
        <a href="#/navbar" class="ui-navbar__logo" aria-label="${L('Início', 'Home')}">R</a>
        ${p.links ? `<nav class="ui-navbar__links" aria-label="${L('Principal', 'Main')}"><a class="ui-navbar__link" href="#/navbar" aria-current="page">${L('Sobre', 'About')}</a><a class="ui-navbar__link" href="#/navbar">${L('Experiência', 'Experience')}</a><a class="ui-navbar__link" href="#/navbar">Cases</a></nav>` : ''}
        <div class="ui-navbar__actions">${p.social ? `<button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="${L('Alternar tema', 'Toggle theme')}">${icon('moon')}</button><a class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" href="#/navbar" aria-label="LinkedIn">${icon('brand-linkedin')}</a>` : ''}${p.cta ? `<a class="ui-btn ui-btn--outline ui-btn--sm" href="#/navbar">${icon('mail')}<span>${L('Contato', 'Contact')}</span></a>` : ''}</div>
      </header>`,
    anatomy: p => [
      { label: L('Barra', 'Bar'), selector: '.ui-navbar', note: L('Glass: blur 16px + borda inferior', 'Glass: 16px blur + bottom border') },
      { label: 'Logo', selector: '.ui-navbar__logo', note: L('Monograma em accent', 'Accent monogram') },
      ...(p.links ? [{ label: 'Links', selector: '.ui-navbar__links', note: L('Some abaixo de 768px', 'Hidden below 768px') }] : []),
      ...(p.social || p.cta ? [{ label: L('Ações', 'Actions'), selector: '.ui-navbar__actions', note: L('Botões ghost + outline', 'Ghost + outline buttons') }] : []),
    ],
    tokens: () => {
      const B = L('Barra', 'Bar'), A = L('Ações', 'Actions')
      return [
        { part: B, prop: 'background', token: '--glass-bg' },
        { part: B, prop: 'border-bottom', token: '--color-border' },
        { part: B, prop: 'padding', token: '--space-4 --container-gutter' },
        { part: 'Logo', prop: 'background', token: '--color-accent' },
        { part: 'Logo', prop: 'color', token: '--color-on-accent' },
        { part: 'Links', prop: 'gap', token: '--space-8' },
        { part: 'Links', prop: 'color', token: '--color-text-muted-dark' },
        { part: L('Link ativo', 'Active link'), prop: 'color', token: '--color-text-primary-dark' },
        { part: A, prop: 'gap', token: '--space-4' },
      ]
    },
  },
}

/* ---------------- Code formatting ---------------- */

const DEMO_CLASSES = /^is-(hover|focus|active|open)$/
const VOID = new Set(['input', 'img', 'br', 'hr'])

function formatNode(node: Node, depth: number): string {
  const pad = '  '.repeat(depth)
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent!.replace(/\s+/g, ' ').trim()
    return t ? pad + esc(t) : ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const attrs = [...el.attributes]
    .filter(a => !a.name.startsWith('data-ds'))
    .map(a => {
      let v = a.value
      if (a.name === 'class') v = v.split(/\s+/).filter(c => c && !DEMO_CLASSES.test(c)).join(' ')
      return v === '' && a.name !== 'class' ? ` <span class="tk-attr">${a.name}</span>` : ` <span class="tk-attr">${a.name}</span>=<span class="tk-str">"${esc(v)}"</span>`
    }).join('')
  const open = `<span class="tk-tag">&lt;${tag}</span>${attrs}<span class="tk-tag">&gt;</span>`
  if (VOID.has(tag)) return pad + open.replace('&gt;</span>', ' /&gt;</span>')
  const close = `<span class="tk-tag">&lt;/${tag}&gt;</span>`
  const kids = [...el.childNodes].filter(n => n.nodeType === Node.ELEMENT_NODE || n.textContent!.trim())
  if (!kids.length) return pad + open + close
  if (kids.length === 1 && kids[0].nodeType === Node.TEXT_NODE) return pad + open + esc(kids[0].textContent!.replace(/\s+/g, ' ').trim()) + close
  return [pad + open, ...kids.map(k => formatNode(k, depth + 1)).filter(Boolean), pad + close].join('\n')
}

/* ---------------- Overlays ---------------- */

const px = (n: number) => `${Math.round(n * 10) / 10}`

function drawMeasure(stage: HTMLElement, overlay: HTMLElement, target: HTMLElement) {
  const s = stage.getBoundingClientRect()
  const r = target.getBoundingClientRect()
  const cs = getComputedStyle(target)
  const x = r.left - s.left, y = r.top - s.top
  const bw = { t: parseFloat(cs.borderTopWidth), r: parseFloat(cs.borderRightWidth), b: parseFloat(cs.borderBottomWidth), l: parseFloat(cs.borderLeftWidth) }
  const pd = { t: parseFloat(cs.paddingTop), r: parseFloat(cs.paddingRight), b: parseFloat(cs.paddingBottom), l: parseFloat(cs.paddingLeft) }
  const out: string[] = []
  const box = (cls: string, l: number, t: number, w: number, h: number) => out.push(`<div class="${cls}" style="left:${l}px;top:${t}px;width:${w}px;height:${h}px"></div>`)
  const tag = (txt: string, l: number, t: number, cls = '') => out.push(`<span class="ds-m-tag ${cls}" style="left:${l}px;top:${t}px">${txt}</span>`)

  box('ds-m-box', x, y, r.width, r.height)
  const ix = x + bw.l, iy = y + bw.t, iw = r.width - bw.l - bw.r, ih = r.height - bw.t - bw.b
  if (pd.t > 0.5) { box('ds-m-pad', ix, iy, iw, pd.t); if (pd.t >= 6) tag(px(pd.t), ix + iw / 2, iy + pd.t / 2) }
  if (pd.b > 0.5) { box('ds-m-pad', ix, iy + ih - pd.b, iw, pd.b); if (pd.b >= 6) tag(px(pd.b), ix + iw / 2, iy + ih - pd.b / 2) }
  if (pd.l > 0.5) { box('ds-m-pad', ix, iy + pd.t, pd.l, ih - pd.t - pd.b); if (pd.l >= 6) tag(px(pd.l), ix + pd.l / 2, iy + ih / 2) }
  if (pd.r > 0.5) { box('ds-m-pad', ix + iw - pd.r, iy + pd.t, pd.r, ih - pd.t - pd.b); if (pd.r >= 6) tag(px(pd.r), ix + iw - pd.r / 2, iy + ih / 2) }

  // Gaps between flex/grid children along the main axis
  const gap = parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0
  if (gap > 0 && /flex|grid/.test(cs.display)) {
    const kids = [...target.children].filter(k => {
      const kr = k.getBoundingClientRect(); const kcs = getComputedStyle(k)
      return kr.width > 0 && kr.height > 0 && kcs.position !== 'absolute'
    }).map(k => k.getBoundingClientRect())
    const column = cs.flexDirection.startsWith('column') || cs.display.includes('grid') && kids.length > 1 && kids[1].top >= kids[0].bottom
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1], b = kids[i]
      if (column) {
        const g = b.top - a.bottom
        if (g < 1) continue
        box('ds-m-gap', ix + pd.l, a.bottom - s.top, iw - pd.l - pd.r, g)
        tag(px(g), ix + iw / 2, a.bottom - s.top + g / 2, 'is-gap')
      } else {
        const g = b.left - a.right
        if (g < 1) continue
        box('ds-m-gap', a.right - s.left, iy + pd.t, g, ih - pd.t - pd.b)
        tag(px(g), a.right - s.left + g / 2, iy + ih + 12, 'is-gap')
      }
    }
  }

  // Overall dimensions
  out.push(`<div class="ds-m-line" style="left:${x}px;top:${y - 12}px;width:${r.width}px;height:1px"></div>`)
  tag(`${px(r.width)}`, x + r.width / 2, y - 12, 'is-dim')
  out.push(`<div class="ds-m-line" style="left:${x + r.width + 12}px;top:${y}px;width:1px;height:${r.height}px"></div>`)
  tag(`${px(r.height)}`, x + r.width + 12, y + r.height / 2, 'is-dim')
  overlay.innerHTML = out.join('')
}

function drawAnatomy(stage: HTMLElement, overlay: HTMLElement, parts: Part[]) {
  const s = stage.getBoundingClientRect()
  const out: string[] = []
  parts.forEach((p, i) => {
    const el = stage.querySelector<HTMLElement>(`.ds-pg__canvas ${p.selector.split(',').join(', .ds-pg__canvas ')}`)
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = r.left - s.left, y = r.top - s.top
    out.push(`<div class="ds-a-outline" style="left:${x - 2}px;top:${y - 2}px;width:${r.width + 4}px;height:${r.height + 4}px"></div>`)
    const top = i % 2 === 0
    const cx = i === 0 ? x + Math.min(16, r.width / 2) : x + r.width / 2
    const pinY = top ? y - 26 : y + r.height + 26
    const lineTop = top ? pinY : y + r.height + 2
    out.push(`<div class="ds-a-leader" style="left:${cx}px;top:${lineTop}px;height:24px"></div>`)
    out.push(`<span class="ds-a-pin" style="left:${cx}px;top:${pinY}px">${i + 1}</span>`)
  })
  overlay.innerHTML = out.join('')
}

function measureReadout(target: HTMLElement): string {
  const cs = getComputedStyle(target)
  const r = target.getBoundingClientRect()
  const color = (v: string) => { const c = resolveColor(v); return c && c[3] > 0 ? toHex(c) : 'transparent' }
  const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(v => Math.round(parseFloat(v))).join(' ')
  const items: [string, string][] = [
    [L('Tamanho', 'Size'), `${px(r.width)} × ${px(r.height)}`],
    ['Padding', pad],
    [L('Raio', 'Radius'), cs.borderTopLeftRadius === '9999px' || parseFloat(cs.borderTopLeftRadius) > 999 ? 'pill' : cs.borderTopLeftRadius],
    [L('Borda', 'Border'), `${cs.borderTopWidth} ${color(cs.borderTopColor)}`],
    [L('Fundo', 'Fill'), color(cs.backgroundColor)],
    [L('Texto', 'Text'), color(cs.color)],
    [L('Fonte', 'Font'), `${cs.fontFamily.split(',')[0].replace(/["']/g, '')} ${cs.fontWeight} ${cs.fontSize}`],
  ]
  if (/flex|grid/.test(cs.display) && cs.gap !== 'normal' && parseFloat(cs.gap)) items.splice(2, 0, ['Gap', cs.columnGap || cs.gap])
  return items.map(([k, v]) => `<span>${k}<b>${esc(v)}</b></span>`).join('')
}

/* ---------------- Playground engine ---------------- */

type Mode = 'none' | 'anatomy' | 'measure'
interface PgState { props: Props; mode: Mode; showCode: boolean; grid: boolean }

const pgState = new Map<string, PgState>()
const redrawers = new Set<() => void>()
const observers = new WeakMap<HTMLElement, ResizeObserver>()

const resolveDefault = (v: string | boolean | Text, l: Lang): string | boolean => Array.isArray(v) ? v[l === 'pt' ? 0 : 1] : v

/** Text props still at their default follow the language; edited ones are kept. */
function relocalizeProps(prev: Lang) {
  pgState.forEach((st, id) => {
    const d = SPECS[id].defaults
    for (const k in d) if (Array.isArray(d[k]) && st.props[k] === resolveDefault(d[k], prev)) st.props[k] = resolveDefault(d[k], lang)
  })
}

function mountPlayground(host: HTMLElement) {
  const id = host.dataset.dsPlayground!
  const spec = SPECS[id]
  if (!spec) return
  if (!pgState.has(id)) {
    const props: Props = {}
    for (const k in spec.defaults) props[k] = resolveDefault(spec.defaults[k], lang)
    pgState.set(id, { props, mode: 'anatomy', showCode: false, grid: true })
  }
  const st = pgState.get(id)!
  const props = st.props

  host.innerHTML = `
    <div class="ds-pg">
      <div class="ds-pg__bar" role="toolbar" aria-label="${L('Opções do preview', 'Preview options')}">
        <button type="button" class="ds-pg__toggle" data-mode="anatomy" aria-pressed="${st.mode === 'anatomy'}">${icon('focus-2')}${L('Anatomia', 'Anatomy')}</button>
        <button type="button" class="ds-pg__toggle" data-mode="measure" aria-pressed="${st.mode === 'measure'}">${icon('ruler-2')}${L('Medidas', 'Measure')}</button>
        <span class="ds-spacer"></span>
        <button type="button" class="ds-pg__toggle" data-grid aria-pressed="${st.grid}">${icon('grid-dots')}Grid</button>
        <button type="button" class="ds-pg__toggle" data-code aria-pressed="${st.showCode}" aria-controls="ds-code-${id}">${icon('code')}${L('Código', 'Code')}</button>
      </div>
      <div class="ds-pg__body">
        <div class="ds-pg__stage${st.grid ? '' : ' is-plain'}" aria-live="polite">
          <div class="ds-pg__canvas"></div>
          <div class="ds-pg__overlay" aria-hidden="true"></div>
        </div>
        <form class="ds-pg__controls" aria-label="${L('Propriedades do componente', 'Component properties')}" onsubmit="return false"></form>
      </div>
      <div class="ds-pg__specs" aria-label="${L('Medidas computadas', 'Computed measurements')}"></div>
      <div class="ds-pg__code" id="ds-code-${id}"${st.showCode ? '' : ' hidden'}>
        <pre><code></code></pre>
        <button type="button" class="ds-copy">${icon('copy')}${L('Copiar', 'Copy')}</button>
      </div>
    </div>`

  const stage = host.querySelector<HTMLElement>('.ds-pg__stage')!
  const canvas = host.querySelector<HTMLElement>('.ds-pg__canvas')!
  const overlay = host.querySelector<HTMLElement>('.ds-pg__overlay')!
  const form = host.querySelector<HTMLFormElement>('.ds-pg__controls')!
  const specs = host.querySelector<HTMLElement>('.ds-pg__specs')!
  const codeWrap = host.querySelector<HTMLElement>('.ds-pg__code')!
  const code = codeWrap.querySelector('code')!
  const anatomyList = document.querySelector<HTMLElement>(`[data-ds-anatomy="${id}"]`)
  const tokenTable = document.querySelector<HTMLElement>(`[data-ds-tokens="${id}"]`)

  const renderControls = () => {
    form.innerHTML = spec.controls.filter(c => !c.when || c.when(props)).map(c => {
      const name = `${id}-${c.key}`
      if (c.type === 'radio') {
        return `<fieldset class="ds-ctl"><legend>${tr(c.label)}</legend><div class="ds-ctl__opts">${c.options.map(([v, l]) =>
          `<label class="ds-ctl__opt"><input type="radio" name="${name}" value="${v}" data-key="${c.key}"${String(props[c.key]) === v ? ' checked' : ''}><span>${lbl(l)}</span></label>`).join('')}</div></fieldset>`
      }
      if (c.type === 'switch') {
        return `<div class="ds-ctl"><label class="ds-switch"><span>${tr(c.label)}</span><input type="checkbox" role="switch" data-key="${c.key}"${props[c.key] ? ' checked' : ''}></label></div>`
      }
      return `<div class="ds-ctl"><label for="${name}">${tr(c.label)}</label><input type="text" id="${name}" data-key="${c.key}" value="${esc(String(props[c.key] ?? ''))}" autocomplete="off"></div>`
    }).join('')
  }

  const redraw = () => {
    const rootEl = canvas.querySelector<HTMLElement>('[data-ds-root]')
    if (!rootEl) return
    const target = (spec.measure && canvas.querySelector<HTMLElement>(spec.measure)) || rootEl
    if (st.mode === 'measure') drawMeasure(stage, overlay, target)
    else if (st.mode === 'anatomy') drawAnatomy(stage, overlay, spec.anatomy(props))
    else overlay.innerHTML = ''
    specs.innerHTML = measureReadout(target)
  }

  const renderTokens = () => {
    if (!tokenTable) return
    const rows = spec.tokens(props)
    tokenTable.innerHTML = `<div class="ds-table-wrap"><table class="ds-table">
      <thead><tr><th scope="col">${L('Elemento', 'Element')}</th><th scope="col">${L('Propriedade', 'Property')}</th><th scope="col">Token</th><th scope="col">${L('Valor (tema atual)', 'Value (current theme)')}</th></tr></thead>
      <tbody>${rows.map(r => {
        const m = r.token.match(/^(--[\w-]+)/)
        const tokens = r.token.match(/--[\w-]+/g) || []
        const raw = m ? tokens.map(cssVar).join(' ') : ''
        const isColor = m && isColorish(raw)
        const shown = m ? (isColor ? toHex(resolveColor(`var(${m[1]})`) || [0, 0, 0, 1]) : prettyValue(raw)) : '—'
        return `<tr><td class="is-strong">${r.part}</td><td>${r.prop}</td><td>${m ? `<button type="button" class="ds-code-inline" data-copy="var(${m[1]})" title="${L('Copiar', 'Copy')}">${esc(r.token)}</button>` : `<span class="ds-mono">${esc(r.token)}</span>`}</td><td class="ds-num">${isColor ? `<span class="ds-swatch-inline" style="background:var(${m![1]})"></span>` : ''}${esc(shown)}</td></tr>`
      }).join('')}</tbody></table></div>`
  }

  const renderAnatomyList = () => {
    if (!anatomyList) return
    anatomyList.className = 'ds-anatomy'
    anatomyList.innerHTML = spec.anatomy(props).map((p, i) => `<li><span class="ds-a-num" aria-hidden="true">${i + 1}</span><div><strong>${p.label}</strong><p>${esc(p.note)}</p></div><code>${esc(p.selector.split(',')[0].trim())}</code></li>`).join('')
  }

  const render = (keepControls = false) => {
    canvas.innerHTML = spec.render(props)
    const rootEl = canvas.querySelector<HTMLElement>('[data-ds-root]')
    if (rootEl) code.innerHTML = formatNode(rootEl, 0)
    if (!keepControls) renderControls()
    spec.bind?.(canvas, props, set)
    renderTokens()
    renderAnatomyList()
    requestAnimationFrame(redraw)
    // Re-measure once hover/transition transforms settle.
    window.setTimeout(redraw, 360)
  }

  function set(patch: Props, focusRoot = false) {
    Object.assign(props, patch)
    render()
    if (focusRoot) canvas.querySelector<HTMLElement>('[aria-checked="true"], summary, [aria-pressed]')?.focus()
  }

  form.addEventListener('input', e => {
    const t = e.target as HTMLInputElement
    const key = t.dataset.key
    if (!key) return
    if (t.type === 'checkbox') props[key] = t.checked
    else props[key] = t.value
    // Text edits keep focus in the field; option changes may show/hide controls.
    render(t.type === 'text')
  })

  host.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.mode as Mode
    st.mode = st.mode === m ? 'none' : m
    host.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mode === st.mode)))
    redraw()
  }))
  host.querySelector<HTMLButtonElement>('[data-grid]')!.addEventListener('click', e => {
    st.grid = !st.grid
    ;(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(st.grid))
    stage.classList.toggle('is-plain', !st.grid)
  })
  host.querySelector<HTMLButtonElement>('[data-code]')!.addEventListener('click', e => {
    st.showCode = !st.showCode
    ;(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(st.showCode))
    codeWrap.hidden = !st.showCode
  })
  codeWrap.querySelector('.ds-copy')!.addEventListener('click', () => copy(code.textContent || '', L('Código copiado', 'Code copied')))

  // Remounts (language switch) replace the stage; drop the old observer.
  observers.get(host)?.disconnect()
  const ro = new ResizeObserver(() => redraw())
  ro.observe(stage)
  observers.set(host, ro)
  redrawers.add(() => { renderTokens(); redraw() })
  render()
}

/* ---------------- Router ---------------- */

const pageIds = PAGES.map(p => p.id)

function buildNav() {
  const nav = document.querySelector<HTMLElement>('[data-ds-nav]')!
  nav.innerHTML = (Object.keys(GROUPS) as Group[]).map(g => `
    <div class="ds-nav-group" data-group>
      <h2>${tr(GROUPS[g])}</h2>
      <ul>${PAGES.filter(p => p.group === g).map(p => `<li><a class="ds-nav-link" href="#/${p.id}" data-page-link="${p.id}">${icon(p.icon)}<span>${tr(p.title)}</span></a></li>`).join('')}</ul>
    </div>`).join('') + `<p class="ds-nav-empty" hidden>${L('Nada encontrado.', 'Nothing found.')}</p>`
  filterNav()
  markCurrent(currentId())
}

function filterNav() {
  const nav = document.querySelector<HTMLElement>('[data-ds-nav]')!
  const q = document.querySelector<HTMLInputElement>('#ds-search')!.value.trim().toLowerCase()
  let any = false
  nav.querySelectorAll<HTMLElement>('[data-group]').forEach(g => {
    let groupAny = false
    g.querySelectorAll<HTMLElement>('li').forEach(li => {
      const page = PAGES.find(p => p.id === li.querySelector<HTMLElement>('a')!.dataset.pageLink)!
      // Match both languages so a search keeps working after switching.
      const hit = !q || [...page.title, ...page.desc, page.id].join(' ').toLowerCase().includes(q)
      li.hidden = !hit
      groupAny ||= hit
    })
    g.hidden = !groupAny
    any ||= groupAny
  })
  nav.querySelector<HTMLElement>('.ds-nav-empty')!.hidden = any
}

function initSearch() {
  const search = document.querySelector<HTMLInputElement>('#ds-search')!
  search.addEventListener('input', filterNav)
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.querySelector<HTMLAnchorElement>('[data-ds-nav] li:not([hidden]) a')?.click()
    if (e.key === 'Escape') { search.value = ''; filterNav() }
  })
  document.addEventListener('keydown', e => {
    const tag = (e.target as HTMLElement).tagName
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag)) { e.preventDefault(); search.focus() }
  })
}

function buildTiles() {
  document.querySelectorAll<HTMLElement>('[data-ds-tiles]').forEach(el => {
    const g = el.dataset.dsTiles as Group
    el.innerHTML = PAGES.filter(p => p.group === g && p.id !== 'introducao').map(p =>
      `<a class="ds-tile" href="#/${p.id}">${icon(p.icon)}<strong>${tr(p.title)}</strong><span>${tr(p.desc)}</span></a>`).join('')
  })
}

function buildPagers() {
  PAGES.forEach((p, i) => {
    const page = document.querySelector<HTMLElement>(`[data-page="${p.id}"]`)
    if (!page) return
    page.querySelector('.ds-pager')?.remove()
    const prev = PAGES[i - 1], next = PAGES[i + 1]
    const nav = document.createElement('nav')
    nav.className = 'ds-pager'
    nav.setAttribute('aria-label', L('Paginação', 'Pagination'))
    nav.innerHTML = `${prev ? `<a href="#/${prev.id}"><span>← ${L('Anterior', 'Previous')}</span><strong>${tr(prev.title)}</strong></a>` : ''}${next ? `<a class="is-next" href="#/${next.id}"><span>${L('Próximo', 'Next')} →</span><strong>${tr(next.title)}</strong></a>` : ''}`
    page.appendChild(nav)
  })
}

function markCurrent(id: string) {
  document.querySelectorAll<HTMLElement>('[data-page-link]').forEach(a => {
    if (a.dataset.pageLink === id) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  })
}

const mounted = new Set<string>()

function mountPage(page: HTMLElement) {
  FOUNDATION_RENDERERS.forEach(([sel, fn]) => page.querySelectorAll<HTMLElement>(sel).forEach(fn))
  page.querySelectorAll<HTMLElement>('[data-ds-playground]').forEach(mountPlayground)
}

function setDocTitle(id: string) {
  const def = PAGES.find(p => p.id === id)!
  document.title = `${tr(def.title)}: Design System | Raul Lima`
}

function show(id: string, focus: boolean) {
  if (!pageIds.includes(id)) id = 'introducao'
  document.querySelectorAll<HTMLElement>('[data-page]').forEach(p => { p.hidden = p.dataset.page !== id })
  markCurrent(id)
  const page = document.querySelector<HTMLElement>(`[data-page="${id}"]`)!
  setDocTitle(id)

  // Lazily mount dynamic blocks the first time a page is shown (they need layout).
  if (!mounted.has(id)) {
    mounted.add(id)
    mountPage(page)
  } else {
    redrawers.forEach(fn => fn())
  }

  document.body.classList.remove('is-nav-open')
  document.querySelector('[data-ds-menu]')?.setAttribute('aria-expanded', 'false')
  window.scrollTo({ top: 0 })
  if (focus) page.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
}

function currentId() {
  return location.hash.replace(/^#\/?/, '') || 'introducao'
}

/** Re-render every script-generated text after a language switch. */
function onLangChange(next: Lang) {
  if (next === lang) return
  const prev = lang
  lang = next
  relocalizeProps(prev)
  buildNav()
  buildTiles()
  buildPagers()
  setDocTitle(currentId())
  redrawers.clear()
  mounted.forEach(id => {
    const page = document.querySelector<HTMLElement>(`[data-page="${id}"]`)
    if (page) mountPage(page)
  })
  localizeChrome()
}

/** Attributes in the static shell that data-i18n (innerHTML only) can't reach. */
function localizeChrome() {
  const aria: Record<string, Text> = {
    source: ['Código-fonte dos componentes', 'Component source code'],
    theme: ['Alternar tema claro/escuro', 'Toggle light/dark theme'],
    sidebar: ['Navegação do design system', 'Design system navigation'],
    sections: ['Seções', 'Sections'],
  }
  document.querySelectorAll<HTMLElement>('[data-ds-aria]').forEach(el => el.setAttribute('aria-label', tr(aria[el.dataset.dsAria!])))
  document.querySelector('[data-ds-menu]')?.setAttribute('aria-label', L('Abrir menu', 'Open menu'))
  document.querySelector('#ds-search')?.setAttribute('placeholder', L('Buscar', 'Search'))
}

/* ---------------- Init ---------------- */

function init() {
  initTheme()
  initSearch()
  buildNav()
  buildTiles()
  buildPagers()
  show(currentId(), false)
  window.addEventListener('hashchange', () => show(currentId(), true))

  // Static copy (data-i18n) is handled by the site i18n; it fires 'langchange'.
  window.addEventListener('langchange', e => onLangChange((e as CustomEvent<Lang>).detail))
  initI18n()
  localizeChrome()

  // Copy-to-clipboard for any [data-copy] (swatches, icons, token chips).
  document.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-copy]')
    if (t) copy(t.dataset.copy!)
  })

  // Mobile drawer
  const menu = document.querySelector<HTMLButtonElement>('[data-ds-menu]')!
  const setNav = (open: boolean) => {
    document.body.classList.toggle('is-nav-open', open)
    menu.setAttribute('aria-expanded', String(open))
    if (open) document.querySelector<HTMLElement>('.ds-nav-link[aria-current="page"]')?.focus()
  }
  menu.addEventListener('click', () => setNav(!document.body.classList.contains('is-nav-open')))
  document.querySelector('.ds-scrim')!.addEventListener('click', () => setNav(false))
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('is-nav-open')) { setNav(false); menu.focus() } })

  // Token values differ per theme: refresh live readouts when it flips.
  new MutationObserver(() => {
    document.querySelectorAll<HTMLElement>('[data-ds-swatches]').forEach(el => { if (el.childElementCount) renderSwatches(el) })
    document.querySelectorAll<HTMLElement>('[data-ds-spacing]').forEach(el => { if (el.childElementCount) renderSpacing(el) })
    updateTypeMeta()
    redrawers.forEach(fn => fn())
    // Color transitions are mid-flight right after the flip; read again once settled.
    window.setTimeout(() => redrawers.forEach(fn => fn()), 350)
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] })

  document.fonts?.ready.then(() => { updateTypeMeta(); redrawers.forEach(fn => fn()) })
}

init()
