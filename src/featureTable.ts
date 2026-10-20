// Feature comparison table (Pefisa case). Category chips filter the rows and
// the footer totals count the features visible under the current filter.

export function initFeatureTables(): void {
  document.querySelectorAll<HTMLElement>('[data-feat-table]').forEach((root) => {
    const chips = root.querySelectorAll<HTMLButtonElement>('[data-feat-filter]')
    const rows = root.querySelectorAll<HTMLTableRowElement>('tbody tr[data-feat-cat]')

    const updateTotals = () => {
      root.querySelectorAll<HTMLElement>('[data-total-for]').forEach((cell) => {
        const app = cell.getAttribute('data-total-for')
        let n = 0
        rows.forEach((row) => {
          if (row.hidden || row.classList.contains('feat-group')) return
          if (row.querySelector(`td[data-app="${app}"]`)?.getAttribute('data-has') === '1') n++
        })
        cell.textContent = String(n)
      })
    }

    const apply = (cat: string) => {
      rows.forEach((row) => {
        row.hidden = cat !== 'all' && row.getAttribute('data-feat-cat') !== cat
      })
      chips.forEach((chip) => {
        const active = chip.getAttribute('data-feat-filter') === cat
        chip.classList.toggle('is-active', active)
        chip.setAttribute('aria-pressed', String(active))
      })
      updateTotals()
    }

    chips.forEach((chip) => chip.addEventListener('click', () => apply(chip.getAttribute('data-feat-filter') || 'all')))
    apply('all')
  })
}
