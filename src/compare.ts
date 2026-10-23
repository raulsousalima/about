// ui-compare: before/after slider. Pointer drag anywhere on the stage (vertical
// scroll still works thanks to touch-action: pan-y) and arrow keys / Home / End
// through the visually hidden range input, which also carries the a11y value.
export function bindCompare(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>('.ui-compare__stage')
  const range = root.querySelector<HTMLInputElement>('.ui-compare__range')
  if (!stage || !range) return

  const set = (pct: number) => {
    const v = Math.max(0, Math.min(100, pct))
    root.style.setProperty('--pos', `${v}%`)
    range.value = String(Math.round(v))
  }
  const fromPointer = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect()
    set(((e.clientX - r.left) / r.width) * 100)
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    stage.setPointerCapture(e.pointerId)
    fromPointer(e)
  })
  stage.addEventListener('pointermove', (e) => {
    if (stage.hasPointerCapture(e.pointerId)) fromPointer(e)
  })
  range.addEventListener('input', () => set(Number(range.value)))
  set(Number(range.value || 50))
}

export function initCompare(): void {
  document.querySelectorAll<HTMLElement>('[data-compare]').forEach(bindCompare)
}
