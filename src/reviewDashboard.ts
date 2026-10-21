// Experience dashboard (Pefisa case). Data lives in a JSON <script> inside the
// dashboard ([data-rdash-data]); product tags switch which product is shown.
// Colours come from the site tokens, so it follows the global dark/light theme.

type Trend = { dir: 'up' | 'down' | 'flat'; pct?: string; tone?: 'good' | 'bad' }
type Metric = { value: string; trend?: Trend }
type Review = {
  source: 'ai' | 'client'
  theme: 'contas' | 'cartoes' | 'financeiro' | 'canais'
  text: string
  name?: string
  rating?: number // client stars (1–5) or AI criticality (1–5 flames)
  date?: string
}
type Product = {
  key: string
  label: string
  rating: Metric
  insights: Metric
  nps: Metric
  total: Metric
  stars?: number
  reviews: Review[]
}

const T = {
  pt: {
    up: 'Aumento de {p} em relação à versão anterior',
    down: 'Diminuição de {p} em relação à versão anterior',
    flat: 'Não houve variação em relação à versão anterior',
    pending: 'A calcular',
    ai: 'No Friction IA',
    themes: { contas: 'Contas', cartoes: 'Cartões', financeiro: 'Financeiro', canais: 'Canais' },
    client: 'Cliente',
    empty: 'As avaliações deste produto serão adicionadas em breve.',
  },
  en: {
    up: 'Up {p} from the previous version',
    down: 'Down {p} from the previous version',
    flat: 'No change from the previous version',
    pending: 'To be calculated',
    ai: 'No Friction AI',
    themes: { contas: 'Accounts', cartoes: 'Cards', financeiro: 'Financial', canais: 'Channels' },
    client: 'Customer',
    empty: "This product's reviews will be added soon.",
  },
}

const lang = () => (document.documentElement.lang.toLowerCase().startsWith('pt') ? 'pt' : 'en')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Decimal comma in PT and a typographic minus sign for negatives.
const num = (v: string) => (lang() === 'pt' ? v.replace(/(\d)\.(\d)/g, '$1,$2') : v).replace(/^-/, '\u2212')

const BARS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 9v4M8 4v9M13 7v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L3 9.4l6.2-.9z"/></svg>'
const FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.3 2.5 1.6 0 2.2-1.3 2-3 2.3 1.6 3.7 4 3.7 6.6A6.5 6.5 0 0 1 12 22a6.5 6.5 0 0 1-6.5-6.4C5.5 10.8 10 7.5 12 2z"/></svg>'

function trendHtml(t: Trend | undefined): string {
  if (!t) return ''
  const s = T[lang()]
  const text = t.dir === 'flat' ? s.flat : s[t.dir].replace('{p}', num(t.pct || ''))
  return `<p class="rdash-trend">${esc(text)}</p>`
}

function icons(svg: string, cls: string, n: number): string {
  return Array.from({ length: 5 }, (_, i) => `<span class="${cls}${i < n ? ' is-on' : ''}">${svg}</span>`).join('')
}

function metric(el: HTMLElement | null, m: Metric | undefined, opts: { stars?: number } = {}): void {
  if (!el || !m) return
  const tone = m.trend?.tone === 'bad' ? 'is-bad' : 'is-good'
  const pending = m.value === ''
  el.querySelector('[data-rdash-value]')!.innerHTML =
    `<span>${pending ? '—' : esc(num(m.value))}</span>${pending ? '' : `<span class="rdash-bars ${tone}">${BARS}</span>`}`
  const foot = el.querySelector('[data-rdash-foot]')!
  foot.innerHTML =
    (opts.stars !== undefined ? `<div class="rdash-stars" aria-hidden="true">${icons(STAR, 'rdash-star', Math.round(opts.stars))}</div>` : '') +
    (pending ? `<p class="rdash-trend">${esc(T[lang()].pending)}</p>` : trendHtml(m.trend))
}

function reviewCard(r: Review): string {
  const s = T[lang()]
  const theme = `<span class="rdash-tag">${esc(s.themes[r.theme])}</span>`
  if (r.source === 'ai') {
    return `<article class="rdash-review is-ai">
      <header><span class="rdash-avatar is-ai">N</span><strong>${esc(s.ai)}</strong></header>
      <div class="rdash-flames" aria-label="${r.rating ?? 0}/5">${icons(FLAME, 'rdash-flame', r.rating ?? 0)}</div>
      <p>${esc(r.text)}</p>
      <footer>${theme}</footer>
    </article>`
  }
  const initial = (r.name || '?').trim().charAt(0).toUpperCase()
  return `<article class="rdash-review is-client">
    <header><span class="rdash-avatar">${esc(initial)}</span><strong>${esc(r.name || '')}</strong></header>
    <div class="rdash-meta"><span class="rdash-stars" aria-label="${r.rating ?? 0}/5">${icons(STAR, 'rdash-star', r.rating ?? 0)}</span>${r.date ? `<time>${esc(r.date)}</time>` : ''}</div>
    <p>${esc(r.text)}</p>
    <footer>${theme}<span class="rdash-tag is-muted">${esc(s.client)}</span></footer>
  </article>`
}

function render(root: HTMLElement, products: Product[]): void {
  const key = root.dataset.product || products[products.length - 1]?.key
  const p = products.find((x) => x.key === key) || products[0]
  if (!p) return
  const filter = root.dataset.filter || 'all'

  root.querySelectorAll<HTMLButtonElement>('[data-rdash-product]').forEach((b) => {
    const on = b.dataset.rdashProduct === p.key
    b.classList.toggle('is-active', on)
    b.setAttribute('aria-pressed', String(on))
  })
  root.querySelectorAll<HTMLButtonElement>('[data-rdash-filter]').forEach((b) => {
    const on = b.dataset.rdashFilter === filter
    b.classList.toggle('is-active', on)
    b.setAttribute('aria-pressed', String(on))
  })
  const crumb = root.querySelector('[data-rdash-crumb]')
  if (crumb) crumb.textContent = p.label

  metric(root.querySelector('[data-rdash-metric="rating"]'), p.rating)
  metric(root.querySelector('[data-rdash-metric="insights"]'), p.insights)
  metric(root.querySelector('[data-rdash-metric="nps"]'), p.nps)
  metric(root.querySelector('[data-rdash-metric="total"]'), p.total, { stars: p.stars })

  const list = root.querySelector<HTMLElement>('[data-rdash-reviews]')
  if (list) {
    const items = p.reviews.filter((r) => filter === 'all' || r.source === filter)
    list.innerHTML = items.length
      ? items.map(reviewCard).join('')
      : `<p class="rdash-empty">${esc(T[lang()].empty)}</p>`
  }
}

export function initReviewDashboards(): void {
  document.querySelectorAll<HTMLElement>('[data-rdash]').forEach((root) => {
    let products: Product[] = []
    try { products = JSON.parse(root.querySelector('[data-rdash-data]')?.textContent || '[]') } catch { products = [] }
    if (!products.length) return
    root.querySelectorAll<HTMLButtonElement>('[data-rdash-product]').forEach((b) =>
      b.addEventListener('click', () => { root.dataset.product = b.dataset.rdashProduct; render(root, products) }),
    )
    root.querySelectorAll<HTMLButtonElement>('[data-rdash-filter]').forEach((b) =>
      b.addEventListener('click', () => { root.dataset.filter = b.dataset.rdashFilter; render(root, products) }),
    )
    render(root, products)
    new MutationObserver(() => render(root, products)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  })
}
