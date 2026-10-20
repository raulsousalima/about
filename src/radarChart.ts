// Radar chart with legend (visual based on shadcn/ui "Radar Chart - Legend").
//
// Markup: [data-radar] with data-max (scale top, default 5) and
// data-series='[{"key":"pe","label":"Pernambucanas","values":[...]}]', one value
// per [data-radar-axis] label inside it (in order). Legend items toggle a series;
// hovering or focusing an axis shows every product's score for it. A data table
// is built alongside for screen readers and as the colour-free view.

type Series = { key: string; label: string; values: number[] }

const SIZE = 420
const C = SIZE / 2
const R = 150
const RINGS = 5
const NS = 'http://www.w3.org/2000/svg'

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  return node
}

function point(i: number, n: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
  return [C + r * Math.cos(a), C + r * Math.sin(a)]
}

function fmt(v: number): string {
  const pt = document.documentElement.lang.toLowerCase().startsWith('pt')
  return v.toFixed(1).replace('.', pt ? ',' : '.')
}

function render(root: HTMLElement): void {
  const plot = root.querySelector<HTMLElement>('[data-radar-plot]')
  const legend = root.querySelector<HTMLElement>('[data-radar-legend]')
  const tip = root.querySelector<HTMLElement>('.radar-tooltip')
  const table = root.querySelector<HTMLTableElement>('[data-radar-table]')
  const empty = root.querySelector<HTMLElement>('[data-radar-empty]')
  if (!plot || !legend) return

  const axes = [...root.querySelectorAll<HTMLElement>('[data-radar-axis]')].map((a) => a.textContent?.trim() || '')
  let series: Series[] = []
  try { series = JSON.parse(root.getAttribute('data-series') || '[]') } catch { series = [] }
  series = series.filter((s) => Array.isArray(s.values) && s.values.length === axes.length)
  const max = parseFloat(root.getAttribute('data-max') || '5') || 5
  const n = axes.length

  if (empty) empty.hidden = series.length > 0
  root.classList.toggle('is-empty', series.length === 0)
  if (!series.length || n < 3) return

  const hiddenKeys = new Set((root.dataset.hiddenSeries || '').split(',').filter(Boolean))

  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'radar-svg', role: 'img' })
  // Grid: concentric polygons and spokes.
  for (let ring = 1; ring <= RINGS; ring++) {
    const pts = axes.map((_, i) => point(i, n, (R * ring) / RINGS).join(',')).join(' ')
    svg.appendChild(el('polygon', { points: pts, class: 'radar-grid' }))
  }
  axes.forEach((_, i) => {
    const [x, y] = point(i, n, R)
    svg.appendChild(el('line', { x1: C, y1: C, x2: x, y2: y, class: 'radar-grid' }))
  })
  // Series polygons.
  series.forEach((s, si) => {
    if (hiddenKeys.has(s.key)) return
    const pts = s.values.map((v, i) => point(i, n, (R * Math.max(0, Math.min(max, v))) / max).join(',')).join(' ')
    svg.appendChild(el('polygon', { points: pts, class: `radar-area radar-c${si + 1}` }))
  })
  // Axis labels + hover targets (bigger than the label itself).
  axes.forEach((label, i) => {
    const [lx, ly] = point(i, n, R + 26)
    const anchor = Math.abs(lx - C) < 8 ? 'middle' : lx > C ? 'start' : 'end'
    const g = el('g', { class: 'radar-axis', tabindex: 0, 'data-axis': i })
    const [hx, hy] = point(i, n, R)
    g.appendChild(el('circle', { cx: hx, cy: hy, r: 22, class: 'radar-hit' }))
    const t = el('text', { x: lx, y: ly, 'text-anchor': anchor, 'dominant-baseline': 'middle', class: 'radar-label' })
    t.textContent = `${i + 1}`
    g.appendChild(t)
    svg.appendChild(g)
  })
  svg.setAttribute('aria-label', series.map((s) => `${s.label}: ${s.values.map(fmt).join(', ')}`).join('; '))
  plot.querySelector('.radar-svg')?.remove()
  plot.prepend(svg)

  // Legend (toggles).
  legend.innerHTML = ''
  series.forEach((s, si) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `radar-legend-item${hiddenKeys.has(s.key) ? ' is-off' : ''}`
    b.setAttribute('aria-pressed', String(!hiddenKeys.has(s.key)))
    b.innerHTML = `<span class="radar-swatch radar-c${si + 1}"></span>${s.label}`
    b.addEventListener('click', () => {
      if (hiddenKeys.has(s.key)) hiddenKeys.delete(s.key)
      else if (hiddenKeys.size < series.length - 1) hiddenKeys.add(s.key) // keep at least one
      root.dataset.hiddenSeries = [...hiddenKeys].join(',')
      render(root)
    })
    legend.appendChild(b)
  })

  // Tooltip per axis.
  if (tip) {
    const show = (i: number, x: number, y: number) => {
      tip.innerHTML = `<strong>${i + 1}. ${axes[i]}</strong>` + series
        .filter((s) => !hiddenKeys.has(s.key))
        .map((s) => `<span class="radar-tip-row"><span class="radar-swatch radar-c${series.indexOf(s) + 1}"></span>${s.label}<b>${fmt(s.values[i])}</b></span>`)
        .join('')
      tip.style.left = `${x}px`
      tip.style.top = `${y}px`
      tip.classList.add('is-visible')
    }
    const hide = () => tip.classList.remove('is-visible')
    svg.querySelectorAll<SVGGElement>('.radar-axis').forEach((g) => {
      const i = Number(g.getAttribute('data-axis'))
      const at = () => {
        const pr = plot.getBoundingClientRect()
        const br = g.getBoundingClientRect()
        return [br.left - pr.left + br.width / 2, br.top - pr.top] as const
      }
      g.addEventListener('pointerenter', () => { const [x, y] = at(); show(i, x, y) })
      g.addEventListener('pointerleave', hide)
      g.addEventListener('focus', () => { const [x, y] = at(); show(i, x, y) })
      g.addEventListener('blur', hide)
    })
  }

  // Data table (screen readers / colour-free view).
  if (table) {
    table.innerHTML = `<thead><tr><th scope="col"></th>${series.map((s) => `<th scope="col">${s.label}</th>`).join('')}</tr></thead><tbody>${axes
      .map((a, i) => `<tr><th scope="row">${i + 1}. ${a}</th>${series.map((s) => `<td>${fmt(s.values[i])}</td>`).join('')}</tr>`)
      .join('')}</tbody>`
  }
}

export function initRadarCharts(): void {
  const roots = document.querySelectorAll<HTMLElement>('[data-radar]')
  if (!roots.length) return
  const all = () => roots.forEach(render)
  all()
  new MutationObserver(all).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
}
