// Device card (.ui-card--device): mounts the 3D phone on [data-phone3d] stages and
// wires the view switch ([data-phone3d-view]). Three.js loads only on pages that use it.
import { getLang } from './i18n'

type Phone = { setView: (v: string) => void; setAutoRotate: (v: boolean) => void; setScreen: (src: string) => void; dispose: () => void }

/** Mount one stage; returns the phone handle (used by /designsystem to dispose on re-render). */
export async function mountPhone3D(stage: HTMLElement): Promise<Phone> {
  const { createPhone3D } = await import('./phone3dCore')
  // data-phone3d-app puts a live, navigable app on the screen; otherwise the
  // screen shows the stage's hidden <img> (so Vite fingerprints it).
  const card = stage.closest('.ui-card--device')
  // Picking a screen turns the phone to face front (setView is wired below).
  let faceFront = () => {}
  const live = stage.dataset.phone3dApp === 'decathlon' ? await mountDecathlon(card, () => faceFront()) : null
  const screenElement = live?.host ?? null
  // Mobile (small or touch-only screens): no automatic motion; the phone starts
  // facing front and only turns when the visitor drags or picks a view.
  const still = matchMedia('(max-width: 767px), (hover: none) and (pointer: coarse)').matches
  const phone: Phone = createPhone3D(stage, {
    screenSrc: screenElement ? null : stage.querySelector('img')?.src || null,
    screenElement,
    finish: stage.dataset.finish || 'preto',
    autoRotate: !still,
    autoRotateSpeed: 0.45,
    float: !still,
    ...(screenElement ? { distance: 3.3, initialRotation: still ? { x: 0, y: 0 } : { x: 0.06, y: 0.28 } } : {}),
    ...(!screenElement && still ? { initialRotation: { x: 0, y: 0 } } : {}),
  })
  const views = [...(card?.querySelectorAll<HTMLButtonElement>('[data-phone3d-view]') ?? [])]
  // 'auto' spins the phone (the default); any fixed view stops it.
  const setView = (name: string) => {
    name === 'auto' ? phone.setAutoRotate(true) : phone.setView(name)
    views.forEach(b => b.setAttribute('aria-checked', String(b.dataset.phone3dView === name)))
  }
  views.forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.phone3dView!)))
  faceFront = () => setView('frente')
  const home = still ? 'frente' : 'auto'
  if (still) views.forEach(b => b.setAttribute('aria-checked', String(b.dataset.phone3dView === home)))
  card?.querySelector('[data-phone3d-restart]')?.addEventListener('click', () => {
    setView(home)
    live?.app.restart()
  })
  return phone
}

async function mountDecathlon(card: Element | null, onStep: () => void) {
  const { mountDecathlonApp, DKT_SCREENS } = await import('./protoDecathlon')
  const host = document.createElement('div')
  host.className = 'dkt-host'
  // Screen steps in the card toolbar, like the /prototipo preview page.
  const steps = card?.querySelector<HTMLElement>('[data-phone3d-steps]')
  const renderSteps = (current: string) => {
    if (!steps) return
    const en = getLang() === 'en'
    steps.setAttribute('aria-label', en ? 'Prototype screens' : 'Telas do protótipo')
    steps.innerHTML = DKT_SCREENS.map(([id, pt, enLabel]) =>
      `<button type="button" class="ui-segmented__item" role="radio" aria-checked="${id === current}" data-step="${id}">${en ? enLabel : pt}</button>`).join('')
  }
  const app = mountDecathlonApp(host, { island: true, onChange: renderSteps })
  renderSteps(app.screen)
  steps?.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-step]')
    if (!btn) return
    onStep()
    app.go(btn.dataset.step as Parameters<typeof app.go>[0], false)
  })
  window.addEventListener('langchange', () => renderSteps(app.screen))
  return { host, app }
}

export function initPhone3D(): void {
  const stages = document.querySelectorAll<HTMLElement>('[data-phone3d]')
  if (!stages.length) return
  // Wait until the card is near the viewport before pulling in Three.js.
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return
    io.unobserve(e.target)
    mountPhone3D(e.target as HTMLElement)
  }), { rootMargin: '300px' })
  stages.forEach(s => io.observe(s))
}
