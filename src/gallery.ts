const AUTO_SPEED = 55 // px per second
const DRAG_THRESHOLD = 6 // px of movement before a pointer-down counts as a drag, not a click

type TrackState = {
  el: HTMLElement
  offset: number
  singleWidth: number
  tracking: boolean
  dragging: boolean
  moved: boolean
  pointerId: number | null
  startX: number
  startOffset: number
}

export function initGalleryMosaic() {
  const lightbox = document.getElementById('gallery-lightbox')
  const lightboxImg = document.getElementById('gallery-lightbox-img') as HTMLImageElement | null
  const closeBtn = lightbox?.querySelector('.gallery-lightbox-close')
  const trackEls = document.querySelectorAll<HTMLElement>('.gallery-track')
  const items = document.querySelectorAll<HTMLImageElement>('.gallery-item')

  if (!lightbox || !lightboxImg || items.length === 0) return

  let lightboxOpen = false

  const states: TrackState[] = Array.from(trackEls).map((el) => ({
    el,
    offset: 0,
    singleWidth: el.scrollWidth / 2,
    tracking: false,
    dragging: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startOffset: 0,
  }))

  function normalize(state: TrackState) {
    if (state.singleWidth <= 0) return
    state.offset = state.offset % state.singleWidth
    if (state.offset > 0) state.offset -= state.singleWidth
  }

  function apply(state: TrackState) {
    state.el.style.transform = `translate3d(${state.offset}px, 0, 0)`
  }

  states.forEach((state) => {
    const ro = new ResizeObserver(() => {
      state.singleWidth = state.el.scrollWidth / 2
      normalize(state)
      apply(state)
    })
    ro.observe(state.el)
  })

  let lastTime: number | null = null
  function tick(time: number) {
    if (lastTime === null) lastTime = time
    const dt = (time - lastTime) / 1000
    lastTime = time

    states.forEach((state) => {
      if (!state.dragging && !lightboxOpen) {
        state.offset -= AUTO_SPEED * dt
        normalize(state)
        apply(state)
      }
    })

    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  states.forEach((state) => {
    state.el.addEventListener('pointerdown', (e) => {
      if (state.tracking) return
      state.tracking = true
      state.dragging = false
      state.moved = false
      state.pointerId = e.pointerId
      state.startX = e.clientX
      state.startOffset = state.offset
    })

    state.el.addEventListener('pointermove', (e) => {
      if (!state.tracking || e.pointerId !== state.pointerId) return
      const dx = e.clientX - state.startX

      // Defer capture/pause until real movement is detected, so a plain
      // click/tap still lands on the image instead of being retargeted.
      if (!state.dragging) {
        if (Math.abs(dx) <= DRAG_THRESHOLD) return
        state.dragging = true
        state.moved = true
        state.el.classList.add('is-dragging')
        state.el.setPointerCapture(e.pointerId)
      }

      state.offset = state.startOffset + dx
      normalize(state)
      apply(state)
    })

    function endDrag(e: PointerEvent) {
      if (e.pointerId !== state.pointerId) return
      state.tracking = false
      state.dragging = false
      state.pointerId = null
      state.el.classList.remove('is-dragging')
    }

    state.el.addEventListener('pointerup', endDrag)
    state.el.addEventListener('pointercancel', endDrag)
  })

  function openLightbox(src: string, alt: string) {
    lightboxImg!.src = src
    lightboxImg!.alt = alt
    lightbox!.classList.add('is-open')
    lightboxOpen = true
  }

  function closeLightbox() {
    lightbox!.classList.remove('is-open')
    lightboxOpen = false
  }

  // Delegated on the track (not per-image) because setPointerCapture retargets
  // the drag-terminating click to the track itself, not the originally hit image.
  states.forEach((state) => {
    state.el.addEventListener('click', (e) => {
      if (state.moved) {
        state.moved = false
        e.preventDefault()
        return
      }
      const img = (e.target as HTMLElement).closest('.gallery-item') as HTMLImageElement | null
      if (img) openLightbox(img.src, img.alt)
    })
  })

  closeBtn?.addEventListener('click', closeLightbox)

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox!.classList.contains('is-open')) closeLightbox()
  })
}
