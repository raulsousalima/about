import './index.css'
import './components.css'
import './designsystem.css'
import { initTheme } from './theme'

/* =====================================================
   /designsystem — docs app
   Hash router (#/page), foundation renderers that read the live token values,
   and a playground engine: each component spec renders its markup from the
   control values; the stage can overlay anatomy pins or measurements taken
   from the rendered DOM, and the token table resolves every var() live, so
   the docs always match the CSS in both themes.
   ===================================================== */

type Props = Record<string, string | boolean>

/* ---------------- Utilities ---------------- */

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

async function copy(text: string, label = 'Copiado') {
  try {
    await navigator.clipboard.writeText(text)
    toast(`${label}: ${text.length > 40 ? text.slice(0, 40) + '…' : text}`)
  } catch {
    toast('Não foi possível copiar')
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

interface PageDef { id: string; title: string; icon: string; group: 'Fundação' | 'Componentes'; desc: string }

const PAGES: PageDef[] = [
  { id: 'introducao', title: 'Visão geral', icon: 'layout-dashboard', group: 'Fundação', desc: 'Princípios, origem e como usar.' },
  { id: 'cores', title: 'Cores', icon: 'palette', group: 'Fundação', desc: 'Superfícies, texto, marca e semânticas.' },
  { id: 'tipografia', title: 'Tipografia', icon: 'typography', group: 'Fundação', desc: 'Playfair Display + Inter, escala e pesos.' },
  { id: 'espacamento', title: 'Espaçamento & Layout', icon: 'ruler-measure', group: 'Fundação', desc: 'Escala de 4px, grid e breakpoints.' },
  { id: 'raios', title: 'Raios', icon: 'border-radius', group: 'Fundação', desc: 'Arredondamentos de controles e containers.' },
  { id: 'elevacao', title: 'Bordas & Elevação', icon: 'shadow', group: 'Fundação', desc: 'Espessuras de borda e sombras.' },
  { id: 'movimento', title: 'Movimento', icon: 'wave-sine', group: 'Fundação', desc: 'Durações e curvas de transição.' },
  { id: 'iconografia', title: 'Iconografia', icon: 'icons', group: 'Fundação', desc: 'Tabler Icons, tamanhos e uso.' },
  { id: 'button', title: 'Button', icon: 'click', group: 'Componentes', desc: 'Ações primárias, secundárias e links.' },
  { id: 'badge', title: 'Badge', icon: 'tag', group: 'Componentes', desc: 'Tags, labels de seção e status.' },
  { id: 'chip', title: 'Chip', icon: 'filter', group: 'Componentes', desc: 'Filtros com estado ligado/desligado.' },
  { id: 'segmented', title: 'Segmented Control', icon: 'toggle-left', group: 'Componentes', desc: 'Alternância entre visões exclusivas.' },
  { id: 'input', title: 'Input', icon: 'forms', group: 'Componentes', desc: 'Campo de texto com label e feedback.' },
  { id: 'card', title: 'Card', icon: 'cards', group: 'Componentes', desc: 'Lead, case e métrica.' },
  { id: 'accordion', title: 'Accordion', icon: 'layout-list', group: 'Componentes', desc: 'Conteúdo expansível em lista.' },
  { id: 'tooltip', title: 'Tooltip', icon: 'message-2', group: 'Componentes', desc: 'Rótulos e valores sob demanda.' },
  { id: 'navbar', title: 'Navbar', icon: 'layout-navbar', group: 'Componentes', desc: 'Cabeçalho fixo com vidro fosco.' },
]

/* ---------------- Foundations ---------------- */

interface Swatch { token: string; name: string; tw?: string; on?: string }

const SWATCHES: Record<string, Swatch[]> = {
  surface: [
    { token: '--color-bg-dark', name: 'Background', tw: 'bg-bg-dark' },
    { token: '--color-bg-light', name: 'Background alt', tw: 'bg-bg-light' },
    { token: '--color-surface', name: 'Surface', tw: 'bg-surface' },
    { token: '--color-surface-hover', name: 'Surface hover', tw: 'bg-surface-hover' },
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
    { token: '--color-accent-muted', name: 'Accent muted', tw: 'bg-accent-muted' },
    { token: '--color-on-accent', name: 'On accent', on: '--color-accent' },
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
        const grade = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA18' : 'Falha'
        aa = `<span class="ds-swatch__aa${r < 3 ? ' is-fail' : ''}" title="Contraste sobre ${s.on}">${grade} ${r.toFixed(1)}</span>`
      }
    }
    return `<button type="button" class="ds-swatch" data-copy="var(${s.token})" aria-label="${esc(s.name)}, ${esc(s.token)}, ${esc(val)}. Copiar token">
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

const TYPE_SCALE = [
  { role: 'Display', cls: 'font-serif', style: 'font-size:var(--text-display);font-weight:700;line-height:var(--leading-display);letter-spacing:-0.025em', token: '--text-display', sample: 'Raul <em>Lima.</em>', use: 'Hero da home' },
  { role: 'Heading XL', cls: 'font-serif', style: 'font-size:var(--text-7xl);font-weight:700;line-height:0.95', token: '--text-7xl', sample: 'Thank’s for <em>Watching.</em>', use: 'CTA do footer' },
  { role: 'Heading L', cls: 'font-serif', style: 'font-size:var(--text-5xl);font-weight:700;line-height:1.1', token: '--text-5xl', sample: 'Design como ponte', use: 'Títulos de seção e de case' },
  { role: 'Heading M', cls: 'font-serif', style: 'font-size:var(--text-4xl);font-weight:700;line-height:1.1', token: '--text-4xl', sample: 'Impacto do projeto', use: 'Números de métricas, subtítulos' },
  { role: 'Heading S', cls: 'font-serif', style: 'font-size:var(--text-xl);font-weight:700;line-height:var(--leading-tight)', token: '--text-xl', sample: 'Título do projeto', use: 'Título de card' },
  { role: 'Body L', cls: '', style: 'font-size:var(--text-lg);line-height:1.8', token: '--text-lg', sample: 'Texto estratégico e overview dos cases.', use: 'Parágrafos de destaque' },
  { role: 'Body', cls: '', style: 'font-size:var(--text-base);line-height:var(--leading-relaxed)', token: '--text-base', sample: '15 anos criando produtos digitais que conectam pessoas.', use: 'Texto corrido' },
  { role: 'Body S', cls: '', style: 'font-size:var(--text-sm);line-height:var(--leading-relaxed)', token: '--text-sm', sample: 'Descrição de card, botões e navegação.', use: 'UI, botões, cards' },
  { role: 'Caption', cls: '', style: 'font-size:var(--text-xs);line-height:var(--leading-normal)', token: '--text-xs', sample: 'Legenda, metadados e tooltips.', use: 'Metadados' },
  { role: 'Overline', cls: '', style: 'font-size:var(--text-xs);font-weight:500;letter-spacing:var(--tracking-widest);text-transform:uppercase', token: '--text-xs', sample: '01 — Sobre', use: 'Rótulos de seção' },
  { role: 'Micro', cls: '', style: 'font-size:var(--text-2xs);font-weight:700;letter-spacing:var(--tracking-widest);text-transform:uppercase', token: '--text-2xs', sample: 'Status', use: 'Badges de status' },
]

function renderTypeScale(el: HTMLElement) {
  el.innerHTML = TYPE_SCALE.map((t, i) => `
    <div class="ds-type-row">
      <div class="ds-type-row__meta">
        <strong>${t.role}</strong>
        <span>${t.token}</span>
        <span data-type-meta="${i}"></span>
        <span>${t.use}</span>
      </div>
      <div class="ds-type-row__sample ${t.cls}" style="${t.style}" data-type-sample="${i}">${t.sample}</div>
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

const SPACING = [
  ['--space-1', 'Ícone ↔ texto compacto'], ['--space-2', 'Gap de botão, badges'], ['--space-3', 'Padding de badge status'],
  ['--space-4', 'Padding de botão sm, gutters internos'], ['--space-5', 'Padding de card compacto'], ['--space-6', 'Padding de botão md, card, gutter do container'],
  ['--space-8', 'Padding horizontal de lead card'], ['--space-10', 'Padding de metric card'], ['--space-12', 'Gap entre colunas'],
  ['--space-16', 'Margem de título de seção'], ['--space-24', 'Seção (mobile)'], ['--space-32', 'Seção (desktop)'],
]

function renderSpacing(el: HTMLElement) {
  el.innerHTML = SPACING.map(([t, use]) => {
    const v = cssVar(t)
    return `<div class="ds-scale-row" title="${esc(use)}">
      <code>${t}</code><span>${remToPx(v) || v}</span>
      <div style="display:flex;align-items:center;gap:var(--space-3);min-width:0"><div class="ds-scale-bar" style="width:var(${t})"></div><span style="font-family:inherit;color:var(--color-text-muted-dark);font-size:var(--text-xs);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(use)}</span></div>
    </div>`
  }).join('')
}

const RADII = [
  ['--radius-xs', 'Badge de status, foco'], ['--radius-sm', 'Input, tooltip'], ['--radius-base', 'Itens de lista, review'],
  ['--radius-md', 'Lead card, metric card'], ['--radius-lg', 'Case card, banner, playground'], ['--radius-pill', 'Botões, tags, chips'],
]

function renderRadii(el: HTMLElement) {
  el.className = 'ds-shapes'
  el.innerHTML = RADII.map(([t, use]) => {
    const v = cssVar(t)
    return `<div class="ds-shape"><div class="ds-shape__box" style="border-radius:var(${t})">${remToPx(v) || v}</div><strong>${use}</strong><code>${t}</code></div>`
  }).join('')
}

function renderShadows(el: HTMLElement) {
  const list = [['--shadow-xs', 'Item ativo (chip, segmented)'], ['--shadow-md', 'Tooltip, popover'], ['--shadow-lg', 'Case card hover'], ['--shadow-xl', 'Frames e drawers']]
  el.className = 'ds-shapes'
  el.innerHTML = list.map(([t, use]) => `<div class="ds-shape"><div class="ds-shape__box is-elevated" style="box-shadow:var(${t});border-radius:var(--radius-md)"></div><strong>${use}</strong><code>${t}</code></div>`).join('')
}

function renderBorders(el: HTMLElement) {
  const list = [['--border-1', 'Padrão: cards, inputs, divisores'], ['--border-2', 'Anel de foco, spinner'], ['--border-frame', 'Moldura de device nos cases']]
  el.className = 'ds-shapes'
  el.innerHTML = list.map(([t, use]) => `<div class="ds-shape"><div class="ds-shape__box" style="border:var(${t}) solid var(--alpha-40);border-radius:var(--radius-md)">${cssVar(t)}</div><strong>${use}</strong><code>${t}</code></div>`).join('')
}

function renderMotion(el: HTMLElement) {
  const list = [['--duration-fast', 'Chips, cor de ícone'], ['--duration-base', 'Botões, links, bordas'], ['--duration-slow', 'Cards, drawers'], ['--duration-reveal', 'Reveal ao rolar']]
  el.innerHTML = `<div class="ds-motion">${list.map(([t, use]) => `
    <div class="ds-motion__row" title="${use}"><code>${t}</code><span>${cssVar(t)}</span>
      <div class="ds-motion__track"><span class="ds-motion__dot" style="transition-duration:var(${t})"></span></div>
    </div>`).join('')}</div>
    <button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-motion-play style="margin-top:var(--space-4)"><i class="ti ti-player-play" aria-hidden="true"></i><span>Reproduzir</span></button>`
  const wrap = el.querySelector('.ds-motion')!
  el.querySelector('[data-motion-play]')!.addEventListener('click', () => wrap.classList.toggle('is-played'))
}

const ICONS = ['arrow-right', 'arrow-left', 'arrow-up-right', 'mail', 'brand-linkedin', 'brand-behance', 'moon', 'sun', 'menu-2', 'x', 'check', 'download',
  'briefcase', 'users', 'target-arrow', 'code', 'chart-line', 'school', 'map-pin', 'building-skyscraper', 'file-text', 'external-link',
  'circle-check', 'alert-triangle', 'alert-circle', 'info-circle', 'search', 'filter', 'device-mobile', 'world']

function renderIcons(el: HTMLElement) {
  el.className = 'ds-icons'
  el.innerHTML = ICONS.map(n => `<button type="button" class="ds-icon" data-copy='<i class="ti ti-${n}"></i>' aria-label="Copiar ícone ${n}"><i class="ti ti-${n}" aria-hidden="true"></i><span>${n}</span></button>`).join('')
}

/* ---------------- Playground specs ---------------- */

type Control =
  | { type: 'radio'; key: string; label: string; options: [string, string][]; when?: (p: Props) => boolean }
  | { type: 'switch'; key: string; label: string; when?: (p: Props) => boolean }
  | { type: 'text'; key: string; label: string; when?: (p: Props) => boolean }

interface Part { label: string; selector: string; note: string }
interface TokenRow { part: string; prop: string; token: string }

interface Spec {
  controls: Control[]
  defaults: Props
  render: (p: Props) => string
  /** Element measured by the measure overlay (default: [data-ds-root]). */
  measure?: string
  anatomy: (p: Props) => Part[]
  tokens: (p: Props) => TokenRow[]
  bind?: (stage: HTMLElement, p: Props, set: (patch: Props, focus?: boolean) => void) => void
}

const STATE_OPTS: [string, string][] = [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus'], ['active', 'Pressed'], ['disabled', 'Disabled']]
const stateClass = (s: Props['state']) => (s === 'hover' || s === 'focus' || s === 'active') ? ` is-${s}` : ''
const icon = (n: string, cls = '') => `<i class="ti ti-${n}${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`

const SPECS: Record<string, Spec> = {
  button: {
    controls: [
      { type: 'radio', key: 'variant', label: 'Variante', options: [['primary', 'Primary'], ['secondary', 'Secondary'], ['outline', 'Outline'], ['ghost', 'Ghost'], ['link', 'Link']] },
      { type: 'radio', key: 'size', label: 'Tamanho', options: [['sm', 'SM'], ['md', 'MD'], ['lg', 'LG']] },
      { type: 'radio', key: 'icon', label: 'Ícone', options: [['none', 'Sem'], ['left', 'Esquerda'], ['right', 'Direita'], ['only', 'Só ícone']] },
      { type: 'radio', key: 'glyph', label: 'Glifo', options: [['arrow-right', '→'], ['arrow-left', '←'], ['mail', 'Mail'], ['download', 'Download']], when: p => p.icon !== 'none' },
      { type: 'radio', key: 'state', label: 'Estado', options: [...STATE_OPTS, ['loading', 'Loading']] },
      { type: 'text', key: 'label', label: 'Label' },
    ],
    defaults: { variant: 'primary', size: 'md', icon: 'right', glyph: 'arrow-right', state: 'default', label: 'Ver projetos' },
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
      const parts: Part[] = [{ label: 'Container', selector: '.ui-btn', note: 'Fundo, borda, raio pill e altura do controle' }]
      if (p.icon !== 'none' || p.state === 'loading') parts.push({ label: p.state === 'loading' ? 'Spinner' : 'Ícone', selector: '.ui-btn > i, .ui-btn > .ui-spinner', note: 'Tabler Icon, herda a cor do label' })
      if (p.icon !== 'only') parts.push({ label: 'Label', selector: '.ui-btn__label', note: 'Inter, verbo de ação curto' })
      return parts
    },
    tokens: p => {
      const v = p.variant
      const size = String(p.size)
      const rows: TokenRow[] = [
        { part: 'Container', prop: 'background', token: v === 'primary' ? '--color-accent' : v === 'ghost' && p.state === 'hover' ? '--alpha-5' : 'transparent' },
        { part: 'Container', prop: 'border-color', token: v === 'secondary' ? (p.state === 'hover' ? '--alpha-40' : '--alpha-15') : v === 'outline' ? (p.state === 'hover' ? '--color-accent' : '--alpha-15') : 'transparent' },
        { part: 'Label', prop: 'color', token: v === 'primary' ? '--color-on-accent' : v === 'secondary' ? '--color-text-primary-dark' : p.state === 'hover' ? (v === 'ghost' ? '--color-text-primary-dark' : '--color-accent') : '--color-text-muted-dark' },
        { part: 'Container', prop: 'height', token: v === 'link' ? 'auto' : `--control-${size}` },
        { part: 'Container', prop: 'padding-inline', token: v === 'link' || p.icon === 'only' ? '0' : size === 'sm' ? '--space-4' : size === 'lg' ? '--space-8' : '--space-6' },
        { part: 'Container', prop: 'gap', token: '--space-2' },
        { part: 'Container', prop: 'border-radius', token: v === 'link' ? '--radius-xs' : '--radius-pill' },
        { part: 'Container', prop: 'border-width', token: '--border-1' },
        { part: 'Label', prop: 'font-family', token: '--font-sans' },
        { part: 'Label', prop: 'font-size', token: size === 'lg' ? '--text-base' : '--text-sm' },
        { part: 'Label', prop: 'font-weight', token: v === 'primary' ? '--weight-semibold' : v === 'link' ? '--weight-regular' : '--weight-medium' },
        { part: 'Focus', prop: 'outline', token: '--color-accent' },
        { part: 'Motion', prop: 'transition', token: '--duration-base' },
      ]
      return rows
    },
  },

  badge: {
    controls: [
      { type: 'radio', key: 'variant', label: 'Variante', options: [['tag', 'Tag'], ['label', 'Label'], ['status', 'Status'], ['dot', 'Dot']] },
      { type: 'radio', key: 'tone', label: 'Tom', options: [['success', 'Success'], ['warning', 'Warning'], ['error', 'Error'], ['info', 'Info']], when: p => p.variant === 'status' },
      { type: 'radio', key: 'size', label: 'Tamanho', options: [['sm', 'SM'], ['md', 'MD']] },
      { type: 'switch', key: 'icon', label: 'Ícone', when: p => p.variant !== 'dot' },
      { type: 'switch', key: 'pulse', label: 'Pulsar', when: p => p.variant === 'dot' },
      { type: 'radio', key: 'state', label: 'Estado', options: [['default', 'Default'], ['hover', 'Hover']], when: p => p.variant === 'tag' },
      { type: 'text', key: 'label', label: 'Label' },
    ],
    defaults: { variant: 'status', tone: 'success', size: 'md', icon: true, pulse: true, state: 'default', label: 'Publicado' },
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
      const parts: Part[] = [{ label: 'Container', selector: '.ui-badge', note: 'Fundo translúcido + borda do mesmo tom' }]
      if (p.variant === 'dot') parts.push({ label: 'Indicador', selector: '.ui-badge__dot', note: '8px, accent, pulso opcional' })
      else if (p.icon) parts.push({ label: 'Ícone', selector: '.ui-badge > i', note: 'Reforça o significado além da cor' })
      parts.push({ label: 'Label', selector: '.ui-badge > span:last-child', note: p.variant === 'status' || p.variant === 'label' ? 'Uppercase com tracking' : 'Sentence case' })
      return parts
    },
    tokens: p => {
      const v = p.variant
      const tone = String(p.tone)
      const fg = v === 'status' ? `--color-${tone}` : v === 'label' ? '--color-accent' : v === 'dot' ? '--color-text-muted-dark' : p.state === 'hover' ? '--color-accent' : '--color-text-primary-dark'
      const bg = v === 'status' ? `--color-${tone}-bg` : v === 'label' || (v === 'tag' && p.state === 'hover') ? '--color-accent-muted' : '--alpha-5'
      const border = v === 'status' ? `--color-${tone} · 20%` : v === 'label' ? '--color-accent · 25%' : v === 'dot' ? '--alpha-10' : p.state === 'hover' ? '--color-accent' : '--alpha-15'
      const rows: TokenRow[] = [
        { part: 'Container', prop: 'background', token: bg },
        { part: 'Container', prop: 'border-color', token: border },
        { part: 'Container', prop: 'border-radius', token: v === 'status' ? '--radius-xs' : '--radius-pill' },
        { part: 'Container', prop: 'gap', token: '--space-2' },
        { part: 'Label', prop: 'color', token: fg },
        { part: 'Label', prop: 'font-size', token: v === 'status' || p.size === 'sm' ? '--text-2xs' : v === 'tag' ? '0.8rem' : '--text-xs' },
        { part: 'Label', prop: 'font-weight', token: v === 'status' ? '--weight-bold' : v === 'label' ? '--weight-semibold' : v === 'dot' ? '--weight-regular' : '--weight-medium' },
      ]
      if (v === 'status' || v === 'label') rows.push({ part: 'Label', prop: 'letter-spacing', token: v === 'status' ? '--tracking-widest' : '--tracking-wide' })
      if (v === 'dot') rows.push({ part: 'Indicador', prop: 'background', token: '--color-accent' }, { part: 'Indicador', prop: 'size', token: '--space-2' })
      return rows
    },
  },

  chip: {
    controls: [
      { type: 'radio', key: 'variant', label: 'Variante', options: [['neutral', 'Neutral'], ['accent', 'Accent']] },
      { type: 'radio', key: 'size', label: 'Tamanho', options: [['sm', 'SM'], ['md', 'MD']] },
      { type: 'switch', key: 'pressed', label: 'Selecionado' },
      { type: 'switch', key: 'icon', label: 'Ícone' },
      { type: 'switch', key: 'count', label: 'Contador' },
      { type: 'radio', key: 'state', label: 'Estado', options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus'], ['disabled', 'Disabled']] },
      { type: 'text', key: 'label', label: 'Label' },
    ],
    defaults: { variant: 'neutral', size: 'md', pressed: true, icon: false, count: true, state: 'default', label: 'Mobile' },
    render: p => {
      const cls = `ui-chip${p.variant === 'accent' ? ' ui-chip--accent' : ''}${p.size === 'sm' ? ' ui-chip--sm' : ''}${stateClass(p.state)}`
      return `<button type="button" class="${cls}" aria-pressed="${p.pressed ? 'true' : 'false'}"${p.state === 'disabled' ? ' disabled' : ''} data-ds-root>${p.icon ? icon('device-mobile') : ''}<span>${esc(String(p.label || 'Chip'))}</span>${p.count ? '<span class="ui-chip__count">12</span>' : ''}</button>`
    },
    anatomy: p => {
      const parts: Part[] = [{ label: 'Container', selector: '.ui-chip', note: 'aria-pressed define o estado' }]
      if (p.icon) parts.push({ label: 'Ícone', selector: '.ui-chip > i', note: 'Opcional, 16px' })
      parts.push({ label: 'Label', selector: '.ui-chip > span', note: 'Nome do filtro' })
      if (p.count) parts.push({ label: 'Contador', selector: '.ui-chip__count', note: 'Números tabulares, 60% de opacidade' })
      return parts
    },
    tokens: p => {
      const on = !!p.pressed
      const acc = p.variant === 'accent'
      return [
        { part: 'Container', prop: 'background', token: on ? (acc ? '--color-accent' : '--color-surface') : 'transparent' },
        { part: 'Container', prop: 'border-color', token: on ? (acc ? '--color-accent' : '--alpha-15') : '--alpha-10' },
        { part: 'Container', prop: 'box-shadow', token: on && !acc ? '--shadow-xs' : 'none' },
        { part: 'Container', prop: 'border-radius', token: '--radius-pill' },
        { part: 'Label', prop: 'color', token: on ? (acc ? '--color-on-accent' : '--color-text-primary-dark') : p.state === 'hover' ? '--color-text-primary-dark' : '--color-text-muted-dark' },
        { part: 'Label', prop: 'font-size', token: p.size === 'sm' ? '--text-xs' : '0.8125rem' },
        { part: 'Label', prop: 'font-weight', token: '--weight-medium' },
        { part: 'Motion', prop: 'transition', token: '--duration-fast' },
      ]
    },
    bind: (stage, p, set) => {
      stage.querySelector('.ui-chip')?.addEventListener('click', () => set({ pressed: !p.pressed }))
    },
  },

  segmented: {
    controls: [
      { type: 'radio', key: 'variant', label: 'Variante', options: [['neutral', 'Neutral'], ['accent', 'Accent']] },
      { type: 'radio', key: 'size', label: 'Tamanho', options: [['sm', 'SM'], ['md', 'MD']] },
      { type: 'radio', key: 'items', label: 'Opções', options: [['2', '2'], ['3', '3']] },
      { type: 'switch', key: 'icons', label: 'Ícones' },
      { type: 'radio', key: 'state', label: 'Estado (item 2)', options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus']] },
    ],
    defaults: { variant: 'neutral', size: 'md', items: '2', icons: false, state: 'default', selected: '0' },
    render: p => {
      const opts: [string, string][] = [['App', 'device-mobile'], ['Web', 'world'], ['Board', 'layout-board']].slice(0, +p.items) as [string, string][]
      const sel = Math.min(+p.selected, opts.length - 1)
      const cls = `ui-segmented${p.variant === 'accent' ? ' ui-segmented--accent' : ''}${p.size === 'sm' ? ' ui-segmented--sm' : ''}`
      const items = opts.map(([l, ic], i) => `<button type="button" role="radio" class="ui-segmented__item${i === 1 ? stateClass(p.state) : ''}" aria-checked="${i === sel}" tabindex="${i === sel ? 0 : -1}">${p.icons ? icon(ic) : ''}<span>${l}</span></button>`).join('')
      return `<div class="${cls}" role="radiogroup" aria-label="Modo de visualização" data-ds-root>${items}</div>`
    },
    anatomy: () => [
      { label: 'Trilho', selector: '.ui-segmented', note: 'Agrupa opções mutuamente exclusivas' },
      { label: 'Item selecionado', selector: '.ui-segmented__item[aria-checked="true"]', note: 'Superfície elevada com shadow-xs' },
      { label: 'Item', selector: '.ui-segmented__item[aria-checked="false"]', note: 'Texto muted, hover para primary' },
    ],
    tokens: p => [
      { part: 'Trilho', prop: 'background', token: '--alpha-5' },
      { part: 'Trilho', prop: 'border-color', token: '--alpha-10' },
      { part: 'Trilho', prop: 'padding', token: '--space-1' },
      { part: 'Trilho', prop: 'border-radius', token: '--radius-pill' },
      { part: 'Selecionado', prop: 'background', token: p.variant === 'accent' ? '--color-accent' : '--color-surface' },
      { part: 'Selecionado', prop: 'color', token: p.variant === 'accent' ? '--color-on-accent' : '--color-text-primary-dark' },
      { part: 'Selecionado', prop: 'box-shadow', token: p.variant === 'accent' ? 'none' : '--shadow-xs' },
      { part: 'Item', prop: 'height', token: p.size === 'sm' ? '1.75rem' : '--control-sm' },
      { part: 'Item', prop: 'color', token: p.state === 'hover' ? '--color-text-primary-dark' : '--color-text-muted-dark' },
      { part: 'Item', prop: 'font-size', token: p.size === 'sm' ? '--text-xs' : '--text-sm' },
    ],
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
      { type: 'radio', key: 'size', label: 'Tamanho', options: [['sm', 'SM'], ['md', 'MD']] },
      { type: 'switch', key: 'icon', label: 'Ícone' },
      { type: 'switch', key: 'hint', label: 'Texto de ajuda' },
      { type: 'radio', key: 'state', label: 'Estado', options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus'], ['error', 'Erro'], ['disabled', 'Disabled']] },
      { type: 'text', key: 'label', label: 'Label' },
      { type: 'text', key: 'placeholder', label: 'Placeholder' },
    ],
    defaults: { size: 'md', icon: true, hint: true, state: 'default', label: 'Email', placeholder: 'voce@empresa.com' },
    measure: '.ui-input',
    render: p => {
      const err = p.state === 'error'
      const st = err ? '' : stateClass(p.state)
      const hint = err
        ? `<p class="ui-field__hint is-error" id="ds-in-hint">${icon('alert-circle')}Informe um email válido.</p>`
        : p.hint ? `<p class="ui-field__hint" id="ds-in-hint">Usaremos apenas para responder.</p>` : ''
      const aria = [err ? 'aria-invalid="true"' : '', hint ? 'aria-describedby="ds-in-hint"' : '', p.state === 'disabled' ? 'disabled' : ''].filter(Boolean).join(' ')
      return `<div class="ui-field${p.size === 'sm' ? ' ui-field--sm' : ''}" data-ds-root>
        <label class="ui-field__label" for="ds-in">${esc(String(p.label || 'Label'))}</label>
        <div class="ui-field__control">${p.icon ? `<i class="ti ti-mail ui-field__icon" aria-hidden="true"></i>` : ''}<input id="ds-in" type="email" class="ui-input${st}" placeholder="${esc(String(p.placeholder))}" ${aria}></div>
        ${hint}
      </div>`
    },
    anatomy: p => {
      const parts: Part[] = [
        { label: 'Label', selector: '.ui-field__label', note: 'Sempre visível, ligado via for/id' },
        { label: 'Campo', selector: '.ui-input', note: 'Borda 1px, foco com anel accent' },
      ]
      if (p.icon) parts.push({ label: 'Ícone', selector: '.ui-field__icon', note: 'Decorativo, aria-hidden' })
      if (p.hint || p.state === 'error') parts.push({ label: p.state === 'error' ? 'Mensagem de erro' : 'Ajuda', selector: '.ui-field__hint', note: 'aria-describedby no input' })
      return parts
    },
    tokens: p => {
      const err = p.state === 'error'
      return [
        { part: 'Label', prop: 'color', token: '--color-text-muted-dark' },
        { part: 'Label', prop: 'letter-spacing', token: '--tracking-widest' },
        { part: 'Campo', prop: 'border-color', token: err ? '--color-error' : p.state === 'focus' ? '--color-accent' : p.state === 'hover' ? '--alpha-40' : '--color-border' },
        { part: 'Campo', prop: 'box-shadow (foco)', token: err ? '--color-error-bg' : '--color-accent-muted' },
        { part: 'Campo', prop: 'border-radius', token: '--radius-sm' },
        { part: 'Campo', prop: 'height', token: p.size === 'sm' ? '--control-sm' : '3rem' },
        { part: 'Campo', prop: 'padding-inline', token: '--space-4' },
        { part: 'Campo', prop: 'color', token: '--color-text-primary-dark' },
        { part: 'Campo', prop: 'font-size', token: p.size === 'sm' ? '--text-xs' : '--text-sm' },
        { part: 'Ajuda', prop: 'color', token: err ? '--color-error' : '--color-text-muted-dark' },
        { part: 'Field', prop: 'gap', token: '--space-2' },
      ]
    },
  },

  card: {
    controls: [
      { type: 'radio', key: 'variant', label: 'Variante', options: [['lead', 'Lead'], ['case', 'Case'], ['metric', 'Métrica']] },
      { type: 'switch', key: 'icon', label: 'Ícone', when: p => p.variant === 'lead' },
      { type: 'switch', key: 'accent', label: 'Valor em accent', when: p => p.variant === 'metric' },
      { type: 'radio', key: 'state', label: 'Estado', options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus']], when: p => p.variant !== 'metric' },
    ],
    defaults: { variant: 'case', icon: true, accent: true, state: 'default' },
    render: p => {
      const st = p.variant === 'metric' ? '' : stateClass(p.state)
      if (p.variant === 'lead') {
        return `<div class="ui-card ui-card--lead${st}" data-ds-root>${p.icon ? `<i class="ti ti-users ui-card__icon" aria-hidden="true"></i>` : ''}<h3 class="ui-card__title">Leadership &amp; Culture</h3><p class="ui-card__text">Liderança de times multidisciplinares, rituais de design e desenvolvimento de pessoas.</p></div>`
      }
      if (p.variant === 'metric') {
        return `<div class="ui-card ui-card--metric" data-ds-root><p class="ui-card__metric${p.accent ? ' is-accent' : ''}">230K</p><p class="ui-card__text">usuários ativos na plataforma em 2023</p></div>`
      }
      return `<a href="#/card" class="ui-card ui-card--case${st}" data-ds-root><div class="ui-card__media">${icon('photo')}</div><div class="ui-card__body"><p class="ui-card__overline">Healthtech · 2020</p><h3 class="ui-card__heading">Starbem</h3><p class="ui-card__text">Da resposta à pandemia a uma plataforma escalável de saúde.</p><span class="ui-card__cta">Ver case ${icon('arrow-right')}</span></div></a>`
    },
    anatomy: p => {
      if (p.variant === 'lead') return [
        { label: 'Container', selector: '.ui-card', note: 'Superfície alpha-5, borda alpha-10' },
        ...(p.icon ? [{ label: 'Ícone', selector: '.ui-card__icon', note: '30px, accent' }] : []),
        { label: 'Título', selector: '.ui-card__title', note: 'Inter semibold' },
        { label: 'Descrição', selector: '.ui-card__text', note: 'Texto muted, leading relaxed' },
      ]
      if (p.variant === 'metric') return [
        { label: 'Container', selector: '.ui-card', note: 'Centralizado, padding generoso' },
        { label: 'Valor', selector: '.ui-card__metric', note: 'Playfair fluido (clamp)' },
        { label: 'Descrição', selector: '.ui-card__text', note: 'Contexto do número' },
      ]
      return [
        { label: 'Container', selector: '.ui-card', note: 'Link inteiro clicável, raio lg' },
        { label: 'Mídia', selector: '.ui-card__media', note: '16:9, zoom no hover' },
        { label: 'Overline', selector: '.ui-card__overline', note: 'Segmento · ano' },
        { label: 'Título', selector: '.ui-card__heading', note: 'Playfair bold' },
        { label: 'CTA', selector: '.ui-card__cta', note: 'Gap cresce no hover' },
      ]
    },
    tokens: p => {
      if (p.variant === 'lead') return [
        { part: 'Container', prop: 'background', token: p.state === 'hover' ? '--color-accent · 4%' : '--alpha-5' },
        { part: 'Container', prop: 'border-color', token: p.state === 'hover' ? '--color-accent' : '--alpha-10' },
        { part: 'Container', prop: 'border-radius', token: '--radius-md' },
        { part: 'Container', prop: 'padding', token: '--space-6 --space-8' },
        { part: 'Ícone', prop: 'color', token: '--color-accent' },
        { part: 'Título', prop: 'font-size', token: '--text-base' },
        { part: 'Descrição', prop: 'color', token: '--color-text-muted-dark' },
        { part: 'Descrição', prop: 'font-size', token: '--text-sm' },
      ]
      if (p.variant === 'metric') return [
        { part: 'Container', prop: 'background', token: '--alpha-5' },
        { part: 'Container', prop: 'border-color', token: '--color-border' },
        { part: 'Container', prop: 'border-radius', token: '--radius-md' },
        { part: 'Container', prop: 'padding', token: '--space-10 --space-6' },
        { part: 'Valor', prop: 'font-family', token: '--font-serif' },
        { part: 'Valor', prop: 'color', token: p.accent ? '--color-accent' : '--color-text-primary-dark' },
        { part: 'Descrição', prop: 'color', token: '--color-text-muted-dark' },
      ]
      return [
        { part: 'Container', prop: 'background', token: '--color-surface' },
        { part: 'Container', prop: 'border-radius', token: '--radius-lg' },
        { part: 'Container', prop: 'box-shadow (hover)', token: '--shadow-lg' },
        { part: 'Container', prop: 'transition', token: '--duration-slow' },
        { part: 'Corpo', prop: 'padding', token: '--space-6' },
        { part: 'Overline', prop: 'letter-spacing', token: '--tracking-widest' },
        { part: 'Título', prop: 'font-family', token: '--font-serif' },
        { part: 'Título', prop: 'font-size', token: '--text-xl' },
        { part: 'Descrição', prop: 'color', token: '--color-text-muted-dark' },
      ]
    },
  },

  accordion: {
    controls: [
      { type: 'radio', key: 'items', label: 'Itens', options: [['1', '1'], ['2', '2'], ['3', '3']] },
      { type: 'switch', key: 'open', label: 'Primeiro aberto' },
      { type: 'switch', key: 'numbered', label: 'Numeração' },
      { type: 'radio', key: 'state', label: 'Estado (gatilho 1)', options: [['default', 'Default'], ['hover', 'Hover'], ['focus', 'Focus']] },
    ],
    defaults: { items: '3', open: true, numbered: true, state: 'default' },
    render: p => {
      const data = [
        ['Visibilidade do status do sistema', 'O sistema mantém o usuário informado sobre o que acontece, com feedback adequado e em tempo razoável.'],
        ['Controle e liberdade do usuário', 'Saídas de emergência claras para desfazer ações sem passar por fluxos longos.'],
        ['Consistência e padrões', 'Palavras, situações e ações significam a mesma coisa em todo o produto.'],
      ].slice(0, +p.items)
      return `<div class="ui-accordion" data-ds-root>${data.map(([t, c], i) => `<details class="ui-accordion__item"${i === 0 && p.open ? ' open' : ''}><summary class="ui-accordion__trigger${i === 0 ? stateClass(p.state) : ''}">${p.numbered ? `<span class="ui-accordion__num">${String(i + 1).padStart(2, '0')}</span>` : ''}${t}</summary><div class="ui-accordion__content">${c}</div></details>`).join('')}</div>`
    },
    anatomy: p => [
      { label: 'Item', selector: '.ui-accordion__item', note: '<details> nativo: teclado e leitor de tela de graça' },
      { label: 'Gatilho', selector: '.ui-accordion__trigger', note: '<summary>, sublinhado no hover' },
      ...(p.numbered ? [{ label: 'Índice', selector: '.ui-accordion__num', note: 'Números tabulares' }] : []),
      ...(p.open ? [{ label: 'Conteúdo', selector: '.ui-accordion__content', note: 'Texto muted' }] : []),
    ],
    tokens: () => [
      { part: 'Item', prop: 'border-color', token: '--color-border' },
      { part: 'Gatilho', prop: 'color', token: '--color-text-primary-dark' },
      { part: 'Gatilho', prop: 'font-weight', token: '--weight-medium' },
      { part: 'Chevron', prop: 'border-color', token: '--color-text-muted-dark' },
      { part: 'Chevron', prop: 'transition', token: '--duration-base' },
      { part: 'Índice', prop: 'font-size', token: '--text-xs' },
      { part: 'Conteúdo', prop: 'color', token: '--color-text-muted-dark' },
      { part: 'Conteúdo', prop: 'font-size', token: '--text-sm' },
      { part: 'Foco', prop: 'outline', token: '--color-accent' },
    ],
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
      { type: 'radio', key: 'placement', label: 'Posição', options: [['top', 'Topo'], ['bottom', 'Base']] },
      { type: 'switch', key: 'swatch', label: 'Swatch' },
      { type: 'switch', key: 'value', label: 'Valor' },
      { type: 'switch', key: 'open', label: 'Forçar aberto' },
      { type: 'text', key: 'label', label: 'Texto' },
    ],
    defaults: { placement: 'top', swatch: true, value: true, open: true, label: 'Pefisa' },
    measure: '.ui-tooltip',
    render: p => `<span class="ui-tooltip-wrap" data-ds-root>
        <button type="button" class="ui-btn ui-btn--secondary ui-btn--icon" aria-label="Detalhes" aria-describedby="ds-tip">${icon('info-circle')}</button>
        <span class="ui-tooltip${p.placement === 'bottom' ? ' ui-tooltip--bottom' : ''}${p.open ? ' is-open' : ''}" role="tooltip" id="ds-tip">${p.swatch ? '<span class="ui-tooltip__swatch" aria-hidden="true"></span>' : ''}${esc(String(p.label || 'Tooltip'))}${p.value ? ' <strong>4,2</strong>' : ''}</span>
      </span>`,
    anatomy: p => [
      { label: 'Gatilho', selector: '.ui-btn', note: 'Abre no hover e no foco' },
      { label: 'Balão', selector: '.ui-tooltip', note: 'role="tooltip" + aria-describedby' },
      ...(p.swatch ? [{ label: 'Swatch', selector: '.ui-tooltip__swatch', note: 'Liga o valor à série do gráfico' }] : []),
      ...(p.value ? [{ label: 'Valor', selector: '.ui-tooltip strong', note: 'Números tabulares' }] : []),
    ],
    tokens: () => [
      { part: 'Balão', prop: 'background', token: '--color-surface' },
      { part: 'Balão', prop: 'border-color', token: '--alpha-15' },
      { part: 'Balão', prop: 'box-shadow', token: '--shadow-md' },
      { part: 'Balão', prop: 'border-radius', token: '--radius-sm' },
      { part: 'Balão', prop: 'offset', token: '--space-3' },
      { part: 'Texto', prop: 'color', token: '--color-text-primary-dark' },
      { part: 'Texto', prop: 'font-size', token: '--text-xs' },
      { part: 'Swatch', prop: 'background', token: '--color-accent' },
      { part: 'Motion', prop: 'transition', token: '--duration-fast' },
    ],
  },

  navbar: {
    controls: [
      { type: 'switch', key: 'links', label: 'Links' },
      { type: 'switch', key: 'social', label: 'Ações sociais' },
      { type: 'switch', key: 'cta', label: 'CTA' },
    ],
    defaults: { links: true, social: true, cta: true },
    render: p => `<header class="ui-navbar" data-ds-root>
        <a href="#/navbar" class="ui-navbar__logo" aria-label="Início">R</a>
        ${p.links ? `<nav class="ui-navbar__links" aria-label="Principal"><a class="ui-navbar__link" href="#/navbar" aria-current="page">Sobre</a><a class="ui-navbar__link" href="#/navbar">Experiência</a><a class="ui-navbar__link" href="#/navbar">Cases</a></nav>` : ''}
        <div class="ui-navbar__actions">${p.social ? `<button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Alternar tema">${icon('moon')}</button><a class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" href="#/navbar" aria-label="LinkedIn">${icon('brand-linkedin')}</a>` : ''}${p.cta ? `<a class="ui-btn ui-btn--outline ui-btn--sm" href="#/navbar">${icon('mail')}<span>Contato</span></a>` : ''}</div>
      </header>`,
    anatomy: p => [
      { label: 'Barra', selector: '.ui-navbar', note: 'Glass: blur 16px + borda inferior' },
      { label: 'Logo', selector: '.ui-navbar__logo', note: 'Monograma em accent' },
      ...(p.links ? [{ label: 'Links', selector: '.ui-navbar__links', note: 'Some abaixo de 768px' }] : []),
      ...(p.social || p.cta ? [{ label: 'Ações', selector: '.ui-navbar__actions', note: 'Botões ghost + outline' }] : []),
    ],
    tokens: () => [
      { part: 'Barra', prop: 'background', token: '--glass-bg' },
      { part: 'Barra', prop: 'border-bottom', token: '--color-border' },
      { part: 'Barra', prop: 'padding', token: '--space-4 --container-gutter' },
      { part: 'Logo', prop: 'background', token: '--color-accent' },
      { part: 'Logo', prop: 'color', token: '--color-on-accent' },
      { part: 'Links', prop: 'gap', token: '--space-8' },
      { part: 'Links', prop: 'color', token: '--color-text-muted-dark' },
      { part: 'Link ativo', prop: 'color', token: '--color-text-primary-dark' },
      { part: 'Ações', prop: 'gap', token: '--space-4' },
    ],
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
  const box = (cls: string, l: number, t: number, w: number, h: number, extra = '') => out.push(`<div class="${cls}" style="left:${l}px;top:${t}px;width:${w}px;height:${h}px;${extra}"></div>`)
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
    out.push(`<div class="ds-a-leader" style="left:${cx}px;top:${lineTop}px;height:${Math.max(0, 24)}px"></div>`)
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
    ['Tamanho', `${px(r.width)} × ${px(r.height)}`],
    ['Padding', pad],
    ['Raio', cs.borderTopLeftRadius === '9999px' || parseFloat(cs.borderTopLeftRadius) > 999 ? 'pill' : cs.borderTopLeftRadius],
    ['Borda', `${cs.borderTopWidth} ${color(cs.borderTopColor)}`],
    ['Fundo', color(cs.backgroundColor)],
    ['Texto', color(cs.color)],
    ['Fonte', `${cs.fontFamily.split(',')[0].replace(/["']/g, '')} ${cs.fontWeight} ${cs.fontSize}`],
  ]
  if (/flex|grid/.test(cs.display) && cs.gap !== 'normal' && parseFloat(cs.gap)) items.splice(2, 0, ['Gap', cs.columnGap || cs.gap])
  return items.map(([k, v]) => `<span>${k}<b>${esc(v)}</b></span>`).join('')
}

/* ---------------- Playground engine ---------------- */

const redrawers = new Set<() => void>()

function mountPlayground(host: HTMLElement) {
  const id = host.dataset.dsPlayground!
  const spec = SPECS[id]
  if (!spec) return
  const props: Props = { ...spec.defaults }
  let mode: 'none' | 'anatomy' | 'measure' = 'anatomy'
  let showCode = false

  host.innerHTML = `
    <div class="ds-pg">
      <div class="ds-pg__bar" role="toolbar" aria-label="Opções do preview">
        <button type="button" class="ds-pg__toggle" data-mode="anatomy" aria-pressed="true">${icon('focus-2')}Anatomia</button>
        <button type="button" class="ds-pg__toggle" data-mode="measure" aria-pressed="false">${icon('ruler-2')}Medidas</button>
        <span class="ds-spacer"></span>
        <button type="button" class="ds-pg__toggle" data-grid aria-pressed="true">${icon('grid-dots')}Grid</button>
        <button type="button" class="ds-pg__toggle" data-code aria-pressed="false" aria-controls="ds-code-${id}">${icon('code')}Código</button>
      </div>
      <div class="ds-pg__body">
        <div class="ds-pg__stage" aria-live="polite">
          <div class="ds-pg__canvas"></div>
          <div class="ds-pg__overlay" aria-hidden="true"></div>
        </div>
        <form class="ds-pg__controls" aria-label="Propriedades do componente" onsubmit="return false"></form>
      </div>
      <div class="ds-pg__specs" aria-label="Medidas computadas"></div>
      <div class="ds-pg__code" id="ds-code-${id}" hidden>
        <pre><code></code></pre>
        <button type="button" class="ds-copy">${icon('copy')}Copiar</button>
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
        return `<fieldset class="ds-ctl"><legend>${c.label}</legend><div class="ds-ctl__opts">${c.options.map(([v, l]) =>
          `<label class="ds-ctl__opt"><input type="radio" name="${name}" value="${v}" data-key="${c.key}"${String(props[c.key]) === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>`
      }
      if (c.type === 'switch') {
        return `<div class="ds-ctl"><label class="ds-switch"><span>${c.label}</span><input type="checkbox" role="switch" data-key="${c.key}"${props[c.key] ? ' checked' : ''}></label></div>`
      }
      return `<div class="ds-ctl"><label for="${name}">${c.label}</label><input type="text" id="${name}" data-key="${c.key}" value="${esc(String(props[c.key] ?? ''))}" autocomplete="off"></div>`
    }).join('')
  }

  const redraw = () => {
    const rootEl = canvas.querySelector<HTMLElement>('[data-ds-root]')
    if (!rootEl) return
    const target = (spec.measure && canvas.querySelector<HTMLElement>(spec.measure)) || rootEl
    if (mode === 'measure') drawMeasure(stage, overlay, target)
    else if (mode === 'anatomy') drawAnatomy(stage, overlay, spec.anatomy(props))
    else overlay.innerHTML = ''
    specs.innerHTML = measureReadout(target)
  }

  const renderTokens = () => {
    if (!tokenTable) return
    const rows = spec.tokens(props)
    tokenTable.innerHTML = `<div class="ds-table-wrap"><table class="ds-table">
      <thead><tr><th scope="col">Elemento</th><th scope="col">Propriedade</th><th scope="col">Token</th><th scope="col">Valor (tema atual)</th></tr></thead>
      <tbody>${rows.map(r => {
        const m = r.token.match(/^(--[\w-]+)/)
        const tokens = r.token.match(/--[\w-]+/g) || []
        const raw = m ? tokens.map(cssVar).join(' ') : ''
        const isColor = m && isColorish(raw)
        const shown = m ? (isColor ? toHex(resolveColor(`var(${m[1]})`) || [0, 0, 0, 1]) : prettyValue(raw)) : '—'
        return `<tr><td class="is-strong">${r.part}</td><td>${r.prop}</td><td>${m ? `<button type="button" class="ds-code-inline" data-copy="var(${m[1]})" title="Copiar">${esc(r.token)}</button>` : `<span class="ds-mono">${esc(r.token)}</span>`}</td><td class="ds-num">${isColor ? `<span class="ds-swatch-inline" style="background:var(${m![1]})"></span>` : ''}${esc(shown)}</td></tr>`
      }).join('')}</tbody></table></div>`
  }

  const renderAnatomyList = () => {
    if (!anatomyList) return
    anatomyList.className = 'ds-anatomy'
    anatomyList.innerHTML = spec.anatomy(props).map((p, i) => `<li><span class="ds-a-num" aria-hidden="true">${i + 1}</span><div><strong>${p.label}</strong><p>${p.note}</p></div><code>${esc(p.selector.split(',')[0].trim())}</code></li>`).join('')
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
    const m = b.dataset.mode as typeof mode
    mode = mode === m ? 'none' : m
    host.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mode === mode)))
    redraw()
  }))
  host.querySelector<HTMLButtonElement>('[data-grid]')!.addEventListener('click', e => {
    const b = e.currentTarget as HTMLButtonElement
    const on = b.getAttribute('aria-pressed') !== 'true'
    b.setAttribute('aria-pressed', String(on))
    stage.classList.toggle('is-plain', !on)
  })
  host.querySelector<HTMLButtonElement>('[data-code]')!.addEventListener('click', e => {
    showCode = !showCode
    ;(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(showCode))
    codeWrap.hidden = !showCode
  })
  codeWrap.querySelector('.ds-copy')!.addEventListener('click', () => copy(code.textContent || '', 'Código copiado'))

  new ResizeObserver(() => redraw()).observe(stage)
  redrawers.add(() => { renderTokens(); redraw() })
  render()
}

/* ---------------- Router ---------------- */

const pageIds = PAGES.map(p => p.id)

function buildNav() {
  const nav = document.querySelector<HTMLElement>('[data-ds-nav]')!
  const groups = ['Fundação', 'Componentes'] as const
  nav.innerHTML = groups.map(g => `
    <div class="ds-nav-group" data-group>
      <h2>${g}</h2>
      <ul>${PAGES.filter(p => p.group === g).map(p => `<li><a class="ds-nav-link" href="#/${p.id}" data-page-link="${p.id}">${icon(p.icon)}<span>${p.title}</span></a></li>`).join('')}</ul>
    </div>`).join('') + '<p class="ds-nav-empty" hidden>Nada encontrado.</p>'

  const search = document.querySelector<HTMLInputElement>('#ds-search')!
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase()
    let any = false
    nav.querySelectorAll<HTMLElement>('[data-group]').forEach(g => {
      let groupAny = false
      g.querySelectorAll<HTMLElement>('li').forEach(li => {
        const page = PAGES.find(p => p.id === li.querySelector<HTMLElement>('a')!.dataset.pageLink)!
        const hit = !q || `${page.title} ${page.desc} ${page.id}`.toLowerCase().includes(q)
        li.hidden = !hit
        groupAny ||= hit
      })
      g.hidden = !groupAny
      any ||= groupAny
    })
    nav.querySelector<HTMLElement>('.ds-nav-empty')!.hidden = any
  })
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') nav.querySelector<HTMLAnchorElement>('li:not([hidden]) a')?.click()
    if (e.key === 'Escape') { search.value = ''; search.dispatchEvent(new Event('input')) }
  })
  document.addEventListener('keydown', e => {
    const tag = (e.target as HTMLElement).tagName
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag)) { e.preventDefault(); search.focus() }
  })
}

function buildTiles() {
  document.querySelectorAll<HTMLElement>('[data-ds-tiles]').forEach(el => {
    const g = el.dataset.dsTiles
    el.innerHTML = PAGES.filter(p => p.group === g && p.id !== 'introducao').map(p =>
      `<a class="ds-tile" href="#/${p.id}">${icon(p.icon)}<strong>${p.title}</strong><span>${p.desc}</span></a>`).join('')
  })
}

function buildPagers() {
  PAGES.forEach((p, i) => {
    const page = document.querySelector<HTMLElement>(`[data-page="${p.id}"]`)
    if (!page) return
    const prev = PAGES[i - 1], next = PAGES[i + 1]
    const nav = document.createElement('nav')
    nav.className = 'ds-pager'
    nav.setAttribute('aria-label', 'Paginação')
    nav.innerHTML = `${prev ? `<a href="#/${prev.id}"><span>← Anterior</span><strong>${prev.title}</strong></a>` : ''}${next ? `<a class="is-next" href="#/${next.id}"><span>Próximo →</span><strong>${next.title}</strong></a>` : ''}`
    page.appendChild(nav)
  })
}

const mounted = new Set<string>()

function show(id: string, focus: boolean) {
  if (!pageIds.includes(id)) id = 'introducao'
  document.querySelectorAll<HTMLElement>('[data-page]').forEach(p => { p.hidden = p.dataset.page !== id })
  document.querySelectorAll<HTMLElement>('[data-page-link]').forEach(a => {
    if (a.dataset.pageLink === id) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  })
  const page = document.querySelector<HTMLElement>(`[data-page="${id}"]`)!
  const def = PAGES.find(p => p.id === id)!
  document.title = `${def.title} — Design System | Raul Lima`

  // Lazily mount dynamic blocks the first time a page is shown (they need layout).
  if (!mounted.has(id)) {
    mounted.add(id)
    page.querySelectorAll<HTMLElement>('[data-ds-swatches]').forEach(renderSwatches)
    page.querySelectorAll<HTMLElement>('[data-ds-type-scale]').forEach(renderTypeScale)
    page.querySelectorAll<HTMLElement>('[data-ds-spacing]').forEach(renderSpacing)
    page.querySelectorAll<HTMLElement>('[data-ds-radii]').forEach(renderRadii)
    page.querySelectorAll<HTMLElement>('[data-ds-shadows]').forEach(renderShadows)
    page.querySelectorAll<HTMLElement>('[data-ds-borders]').forEach(renderBorders)
    page.querySelectorAll<HTMLElement>('[data-ds-motion]').forEach(renderMotion)
    page.querySelectorAll<HTMLElement>('[data-ds-icons]').forEach(renderIcons)
    page.querySelectorAll<HTMLElement>('[data-ds-playground]').forEach(mountPlayground)
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

/* ---------------- Init ---------------- */

function init() {
  initTheme()
  buildNav()
  buildTiles()
  buildPagers()
  show(currentId(), false)
  window.addEventListener('hashchange', () => show(currentId(), true))

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
