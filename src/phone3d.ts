// Device card (.ui-card--device): mounts the 3D phone on [data-phone3d] stages and
// wires the view switch ([data-phone3d-view]). Three.js loads only on pages that use it.

type Phone = { setView: (v: string) => void; setAutoRotate: (v: boolean) => void; setScreen: (src: string) => void; dispose: () => void }

/** Mount one stage; returns the phone handle (used by /designsystem to dispose on re-render). */
export async function mountPhone3D(stage: HTMLElement): Promise<Phone> {
  const { createPhone3D } = await import('./phone3dCore')
  // data-phone3d-app puts a live, navigable app on the screen; otherwise the
  // screen shows the stage's hidden <img> (so Vite fingerprints it).
  const live = stage.dataset.phone3dApp === 'decathlon' ? await mountDecathlon() : null
  const screenElement = live?.host ?? null
  const phone: Phone = createPhone3D(stage, {
    screenSrc: screenElement ? null : stage.querySelector('img')?.src || null,
    screenElement,
    finish: stage.dataset.finish || 'preto',
    autoRotate: true,
    autoRotateSpeed: 0.45,
    ...(screenElement ? { distance: 3.3, initialRotation: { x: 0.06, y: 0.28 } } : {}),
  })
  const card = stage.closest('.ui-card--device')
  const views = [...(card?.querySelectorAll<HTMLButtonElement>('[data-phone3d-view]') ?? [])]
  // 'auto' spins the phone (the default); any fixed view stops it.
  const setView = (name: string) => {
    name === 'auto' ? phone.setAutoRotate(true) : phone.setView(name)
    views.forEach(b => b.setAttribute('aria-checked', String(b.dataset.phone3dView === name)))
  }
  views.forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.phone3dView!)))
  card?.querySelector('[data-phone3d-restart]')?.addEventListener('click', () => {
    setView('auto')
    live?.app.restart()
  })
  return phone
}

async function mountDecathlon() {
  const { mountDecathlonApp } = await import('./protoDecathlon')
  const host = document.createElement('div')
  host.className = 'dkt-host'
  return { host, app: mountDecathlonApp(host, { island: true }) }
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
