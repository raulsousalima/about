// Device card (.ui-card--device): mounts the 3D phone on [data-phone3d] stages and
// wires the view switch ([data-phone3d-view]). Three.js loads only on pages that use it.

type Phone = { setView: (v: string) => void; setScreen: (src: string) => void; dispose: () => void }

/** Mount one stage; returns the phone handle (used by /designsystem to dispose on re-render). */
export async function mountPhone3D(stage: HTMLElement): Promise<Phone> {
  const { createPhone3D } = await import('./phone3dCore')
  const phone: Phone = createPhone3D(stage, {
    // Screen comes from the stage's hidden <img>, so Vite fingerprints it like any other image.
    screenSrc: stage.querySelector('img')?.src || null,
    finish: stage.dataset.finish || 'preto',
  })
  const card = stage.closest('.ui-card--device')
  const views = [...(card?.querySelectorAll<HTMLButtonElement>('[data-phone3d-view]') ?? [])]
  views.forEach(btn => btn.addEventListener('click', () => {
    phone.setView(btn.dataset.phone3dView!)
    views.forEach(b => b.setAttribute('aria-checked', String(b === btn)))
  }))
  return phone
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
