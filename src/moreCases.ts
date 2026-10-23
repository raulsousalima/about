// "Outros cases" strip at the end of each case page: compact cards linking to
// the other cases. Cards carry data-case-slug, so caseAccess.ts hides the
// restricted/backlog ones exactly as it does on the home grid — render this
// before initCaseAccess(). Covers go through new URL(…, import.meta.url) so
// Vite bundles them (a plain string path would 404 after the build).

const CASES = [
  { slug: 'kalion', title: 'Kalion', overline: 'Design System · Design AI Engineer', cover: new URL('../img/cases/kalion/bannerhero.jpg', import.meta.url).href },
  { slug: 'pernambucanas', title: 'Pernambucanas', overline: 'Retail · Design Leadership', cover: new URL('../img/cases/pernambucanas/bannerhero.png', import.meta.url).href },
  { slug: 'decathlon', title: 'Decathlon', overline: 'Retail · Loyalty UX', cover: new URL('../img/cases/decathlon/bannerhero.png', import.meta.url).href },
  { slug: 'nofrictionai', title: 'No Friction AI', overline: 'AI · Zero-to-One', cover: new URL('../img/cases/nofrictionai/bannerhero.png', import.meta.url).href },
  { slug: 'daycoval', title: 'Banco Daycoval', overline: 'Fintech · Pix UX', cover: new URL('../img/cases/daycoval/banner_hero.webp', import.meta.url).href },
  { slug: 'starbem', title: 'Starbem', overline: 'Healthtech · Zero-to-One', cover: new URL('../img/cases/starbem/bannerhero.png', import.meta.url).href },
  { slug: 'pefisa', title: 'Pefisa', overline: 'Fintech · Product Analysis', cover: new URL('../img/cases/pefisa/bannerhero.webp', import.meta.url).href },
]

export function initMoreCases(): void {
  const strip = document.getElementById('more-cases')
  if (!strip) return
  const current = (window.location.pathname.split('/').pop() || '').replace(/\.html$/, '')

  strip.innerHTML = CASES.filter((c) => c.slug !== current).map((c) => `
    <a href="${c.slug}.html" data-case-slug="${c.slug}" class="ui-card ui-card--case ui-card--mini">
      <div class="ui-card__media">
        <img src="${c.cover}" alt="${c.title} cover" loading="lazy" />
      </div>
      <div class="ui-card__body">
        <p class="ui-card__overline">${c.overline}</p>
        <h3 class="ui-card__heading">${c.title}</h3>
      </div>
    </a>`).join('')
}
