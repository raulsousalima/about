// Generic ui-segmented switch for content panels (e.g. Kalion "Antes / Depois").
// Markup: <div class="ui-segmented" role="radiogroup" data-segmented-panels> with
// role="radio" items whose aria-controls names the panel they show. State lives in
// aria-checked + roving tabindex; arrow keys move the selection.
export function initSegmentedPanels(): void {
  document.querySelectorAll<HTMLElement>('[data-segmented-panels]').forEach((group) => {
    const items = [...group.querySelectorAll<HTMLElement>('[role="radio"][aria-controls]')]
    const select = (target: HTMLElement) => {
      for (const item of items) {
        const on = item === target
        item.setAttribute('aria-checked', String(on))
        item.tabIndex = on ? 0 : -1
        const panel = document.getElementById(item.getAttribute('aria-controls')!)
        if (panel) panel.hidden = !on
      }
    }
    items.forEach((item, i) => {
      item.addEventListener('click', () => select(item))
      item.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
        if (!d) return
        e.preventDefault()
        const next = items[(i + d + items.length) % items.length]
        select(next)
        next.focus()
      })
    })
  })
}
