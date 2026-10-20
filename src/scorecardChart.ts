// Radial stacked score charts (visual based on shadcn/ui "Radial Chart - Stacked").
//
// Markup: an element with [data-scorecard] holding [data-score-chart] slots.
// Each slot carries data-scores="performance,usabilidade,experiencia" (1–5).
// The chart draws a half ring where each pillar is a stacked segment sized by
// its score (full ring = 5 on every pillar) and shows the average in the centre.

const PILLARS = ['performance', 'usability', 'experience'] as const
const MAX_SCORE = 5

// Geometry, in SVG user units (viewBox 0 0 W H).
const W = 260
const H = 150
const CX = W / 2
const CY = 136
const R_OUTER = 124
const R_INNER = 92
const GAP_DEG = 1.2 // surface gap between stacked segments

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

/** Annular sector from angle a0 to a1 (degrees, 180 = left, 0 = right). */
function sector(a0: number, a1: number): string {
  const [x0, y0] = polar(R_OUTER, a0)
  const [x1, y1] = polar(R_OUTER, a1)
  const [x2, y2] = polar(R_INNER, a1)
  const [x3, y3] = polar(R_INNER, a0)
  const large = Math.abs(a0 - a1) > 180 ? 1 : 0
  return [
    `M${x0.toFixed(2)} ${y0.toFixed(2)}`,
    `A${R_OUTER} ${R_OUTER} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `A${R_INNER} ${R_INNER} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function formatScore(n: number): string {
  const pt = document.documentElement.lang.toLowerCase().startsWith('pt')
  return n.toFixed(1).replace('.', pt ? ',' : '.')
}

function pillarLabel(root: HTMLElement, pillar: string): string {
  return root.querySelector<HTMLElement>(`[data-pillar-label="${pillar}"]`)?.textContent?.trim() || pillar
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** "Loading" sweep: segments fill left to right while the average counts up. */
function animateChart(
  segments: { el: SVGPathElement; start: number; end: number }[],
  avgEl: HTMLElement | null,
  avg: number,
  delay = 0,
): void {
  const DURATION = 1200
  const sweepEnd = segments.length ? segments[segments.length - 1].end : 180
  const frame = (t: number) => {
    const head = 180 - (180 - sweepEnd) * t // current leading angle
    segments.forEach(({ el, start, end }) => {
      if (head >= start) el.setAttribute('d', '')
      else el.setAttribute('d', sector(start, Math.max(end, head)))
    })
    if (avgEl) avgEl.textContent = formatScore(avg * t)
  }
  frame(0)
  let t0: number | null = null
  const step = (now: number) => {
    if (t0 === null) t0 = now + delay
    if (now < t0) { requestAnimationFrame(step); return }
    const p = Math.min(1, (now - t0) / DURATION)
    frame(easeOutCubic(p))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// 'pending' = drawn empty until the chart scrolls into view.
type Mode = 'static' | 'animate' | 'pending'

function renderChart(root: HTMLElement, slot: HTMLElement, mode: Mode = 'static', delay = 0): void {
  const scores = (slot.getAttribute('data-scores') || '')
    .split(',')
    .map((s) => Math.min(MAX_SCORE, Math.max(0, parseFloat(s) || 0)))
  const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1)
  const total = MAX_SCORE * PILLARS.length

  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  svg.setAttribute('class', 'scorecard-svg')
  svg.setAttribute('role', 'img')

  const track = document.createElementNS(svgNS, 'path')
  track.setAttribute('d', sector(180, 0))
  track.setAttribute('class', 'scorecard-track')
  svg.appendChild(track)

  const segments: { el: SVGPathElement; start: number; end: number }[] = []
  let angle = 180
  PILLARS.forEach((pillar, i) => {
    const span = (scores[i] / total) * 180
    if (span <= 0) return
    const start = angle
    const end = angle - span
    angle = end
    const g = document.createElementNS(svgNS, 'g')
    g.setAttribute('class', 'scorecard-seg')
    g.setAttribute('data-pillar', pillar)
    g.setAttribute('data-value', String(scores[i]))
    g.setAttribute('tabindex', '0')
    // Wider invisible hit area so the hover target is bigger than the mark.
    const hit = document.createElementNS(svgNS, 'path')
    hit.setAttribute('d', sector(start, end))
    hit.setAttribute('class', 'scorecard-hit')
    const seg = document.createElementNS(svgNS, 'path')
    const isLast = i === PILLARS.length - 1 || scores.slice(i + 1).every((s) => s <= 0)
    const drawEnd = isLast ? end : end + GAP_DEG
    seg.setAttribute('d', sector(start, drawEnd))
    seg.setAttribute('class', `scorecard-fill scorecard-fill-${i + 1}`)
    segments.push({ el: seg, start, end: drawEnd })
    g.append(hit, seg)
    svg.appendChild(g)
  })

  slot.querySelector('.scorecard-svg')?.remove()
  slot.querySelector('.scorecard-plot')?.prepend(svg)

  const avgEl = slot.querySelector<HTMLElement>('[data-score-avg]')
  if (avgEl) avgEl.textContent = formatScore(avg)
  if (mode !== 'static' && !prefersReducedMotion()) {
    if (mode === 'animate') animateChart(segments, avgEl, avg, delay)
    else {
      segments.forEach(({ el }) => el.setAttribute('d', ''))
      if (avgEl) avgEl.textContent = formatScore(0)
    }
  }

  // Legend values next to each pillar (identity never rests on colour alone).
  PILLARS.forEach((pillar, i) => {
    const v = slot.querySelector<HTMLElement>(`[data-score-value="${pillar}"]`)
    if (v) v.textContent = formatScore(scores[i] ?? 0)
  })

  const name = slot.querySelector<HTMLElement>('[data-score-name]')?.textContent?.trim() || ''
  svg.setAttribute(
    'aria-label',
    `${name}: ${PILLARS.map((p, i) => `${pillarLabel(root, p)} ${formatScore(scores[i] ?? 0)}`).join(', ')}; ${formatScore(avg)}`,
  )
  wireTooltip(root, slot, svg)
}

function wireTooltip(root: HTMLElement, slot: HTMLElement, svg: SVGSVGElement): void {
  const tip = slot.querySelector<HTMLElement>('.scorecard-tooltip')
  const plot = slot.querySelector<HTMLElement>('.scorecard-plot')
  if (!tip || !plot) return
  const show = (seg: SVGGElement, x: number, y: number) => {
    const pillar = seg.getAttribute('data-pillar') || ''
    const value = parseFloat(seg.getAttribute('data-value') || '0')
    const idx = PILLARS.indexOf(pillar as (typeof PILLARS)[number]) + 1
    tip.innerHTML = `<span class="scorecard-swatch scorecard-swatch-${idx}"></span><span>${pillarLabel(root, pillar)}</span><strong>${formatScore(value)}</strong>`
    tip.style.left = `${x}px`
    tip.style.top = `${y}px`
    tip.classList.add('is-visible')
    svg.classList.add('has-focus')
    svg.querySelectorAll('.scorecard-seg').forEach((s) => s.classList.toggle('is-active', s === seg))
  }
  const hide = () => {
    tip.classList.remove('is-visible')
    svg.classList.remove('has-focus')
    svg.querySelectorAll('.scorecard-seg').forEach((s) => s.classList.remove('is-active'))
  }
  svg.querySelectorAll<SVGGElement>('.scorecard-seg').forEach((seg) => {
    seg.addEventListener('pointermove', (e) => {
      const r = plot.getBoundingClientRect()
      show(seg, e.clientX - r.left, e.clientY - r.top)
    })
    seg.addEventListener('pointerleave', hide)
    seg.addEventListener('focus', () => {
      const r = plot.getBoundingClientRect()
      const b = seg.getBoundingClientRect()
      show(seg, b.left - r.left + b.width / 2, b.top - r.top)
    })
    seg.addEventListener('blur', hide)
  })
}

export function initScorecardCharts(): void {
  const roots = document.querySelectorAll<HTMLElement>('[data-scorecard]')
  if (!roots.length) return
  const renderAll = () =>
    roots.forEach((root) =>
      root.querySelectorAll<HTMLElement>('[data-score-chart]').forEach((slot) =>
        renderChart(root, slot, slot.dataset.played ? 'static' : 'pending'),
      ),
    )
  renderAll()
  // Play the loading sweep once, when each chart scrolls into view.
  const io = new IntersectionObserver(
    (entries) =>
      // Stagger charts that enter together (the desktop row), not ones that
      // scroll in one by one on mobile.
      entries.filter((e) => e.isIntersecting).forEach((e, order) => {
        io.unobserve(e.target)
        const slot = e.target as HTMLElement
        slot.dataset.played = '1'
        const root = slot.closest<HTMLElement>('[data-scorecard]')
        if (root) renderChart(root, slot, 'animate', 300 + order * 150) // 300ms: let the card's reveal fade in first
      }),
    { threshold: 0.4 },
  )
  roots.forEach((root) => root.querySelectorAll<HTMLElement>('[data-score-chart]').forEach((slot) => io.observe(slot)))
  // Re-format numbers (4,2 vs 4.2) and labels when the language switches.
  new MutationObserver(renderAll).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
}
