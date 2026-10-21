// Radar chart with legend (visual based on shadcn/ui "Radar Chart - Legend").
//
// Markup: [data-radar] with data-max (scale top, default 5), data-min (centre, default 0) and
// data-series='[{"key":"pe","label":"Pernambucanas","values":[...]}]', one value
// per [data-radar-axis] label inside it (in order). Legend items toggle a series;
// hovering or focusing an axis shows every product's score for it. A data table
// is built alongside for screen readers and as the colour-free view. Logos for
// the legend live in [data-logo-for="<key>"] elements inside the card.

type Series = { key: string; label: string; values: number[] }

const SIZE = 420
const C = SIZE / 2
const R = 150
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
  const min = parseFloat(root.getAttribute('data-min') || '0') || 0 // centre of the chart
  const rings = Math.max(1, Math.round(max - min))
  const n = axes.length

  if (empty) empty.hidden = series.length > 0
  root.classList.toggle('is-empty', series.length === 0)
  if (!series.length || n < 3) return

  const hiddenKeys = new Set((root.dataset.hiddenSeries || '').split(',').filter(Boolean))

  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'radar-svg', role: 'img' })
  // Grid: concentric polygons and spokes.
  for (let ring = 1; ring <= rings; ring++) {
    const pts = axes.map((_, i) => point(i, n, (R * ring) / rings).join(',')).join(' ')
    svg.appendChild(el('polygon', { points: pts, class: 'radar-grid' }))
  }
  axes.forEach((_, i) => {
    const [x, y] = point(i, n, R)
    svg.appendChild(el('line', { x1: C, y1: C, x2: x, y2: y, class: 'radar-grid' }))
  })
  // Series polygons.
  series.forEach((s, si) => {
    if (hiddenKeys.has(s.key)) return
    const pts = s.values.map((v, i) => point(i, n, (R * (Math.max(min, Math.min(max, v)) - min)) / (max - min)).join(',')).join(' ')
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
  // Summary cards: each product's average across all heuristics.
  const summary = root.querySelector<HTMLElement>('[data-radar-summary]')
  if (summary) {
    const title = root.querySelector('[data-radar-summary-title]')?.textContent?.trim() || ''
    const star = '<span class="rdash-star"><svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L3 9.4l6.2-.9z"/></svg></span>'.repeat(5)
    summary.innerHTML = series.map((s) => {
      const avg = s.values.reduce((a, v) => a + v, 0) / s.values.length
      const value = avg.toFixed(2).replace('.', document.documentElement.lang.toLowerCase().startsWith('pt') ? ',' : '.')
      const logo = root.querySelector(`[data-logo-for="${s.key}"]`)?.innerHTML.trim() || ''
      return `<div class="rdash-card rdash-tech-card">
        <div class="rdash-tech-logo">${logo}</div>
        <div class="rdash-card-head"><span>${title}</span></div>
        <div class="rdash-value"><span>${value}</span></div>
        <div class="rdash-stars-frac" role="img" aria-label="${s.label}: ${value}/5">
          <span class="rdash-stars-base" aria-hidden="true">${star}</span>
          <span class="rdash-stars-fill" style="width: ${(Math.min(max, avg) / 5) * 100}%" aria-hidden="true">${star}</span>
        </div>
      </div>`
    }).join('')
  }

  legend.innerHTML = ''
  series.forEach((s, si) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `radar-legend-item${hiddenKeys.has(s.key) ? ' is-off' : ''}`
    b.setAttribute('aria-pressed', String(!hiddenKeys.has(s.key)))
    // Optional logo above the label, copied from [data-logo-for="key"] in the markup
    // (kept in HTML so the build rewrites the image paths).
    const logo = root.querySelector(`[data-logo-for="${s.key}"]`)?.innerHTML.trim() || ''
    b.innerHTML = `${logo ? `<span class="radar-legend-logo">${logo}</span>` : ''}<span class="radar-legend-label"><span class="radar-swatch radar-c${si + 1}"></span>${s.label}</span>`
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
