// Preview page for the Decathlon prototype (/prototipo/decathlon.html):
// step switch + restart around the app, scaled to fit the viewport.
import './index.css'
import './components.css'
import { initI18n, getLang } from './i18n'
import { initTheme } from './theme'
import { mountDecathlonApp, DKT_SCREENS, DKT_HEIGHT, DKT_WIDTH, type DktScreen } from './protoDecathlon'

initI18n()
initTheme()

const steps = document.querySelector<HTMLElement>('[data-proto-steps]')!
const stage = document.querySelector<HTMLElement>('[data-proto-stage]')!
const device = stage.querySelector<HTMLElement>('.dkt-device')!

const renderSteps = (current: DktScreen) => {
  const en = getLang() === 'en'
  steps.setAttribute('aria-label', en ? 'Flow screens' : 'Telas do fluxo')
  steps.innerHTML = DKT_SCREENS.map(([id, pt, enLabel]) =>
    `<button type="button" class="ui-segmented__item" role="radio" aria-checked="${id === current}" data-step="${id}">${en ? enLabel : pt}</button>`).join('')
}

const app = mountDecathlonApp(document.querySelector<HTMLElement>('[data-proto-app]')!, { onChange: renderSteps })
renderSteps(app.screen)

steps.addEventListener('click', e => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-step]')
  if (btn) app.go(btn.dataset.step as DktScreen)
})
document.querySelector('[data-proto-restart]')!.addEventListener('click', () => app.restart())
window.addEventListener('langchange', () => renderSteps(app.screen))

// Fit the whole phone on screen (and within the column on narrow viewports).
const fit = () => {
  const bezel = 24
  const top = stage.getBoundingClientRect().top + window.scrollY
  const byHeight = (window.innerHeight - Math.min(top, 220) - 32 - bezel) / DKT_HEIGHT
  const byWidth = (stage.clientWidth - bezel) / DKT_WIDTH
  device.style.setProperty('--dkt-scale', Math.max(0.5, Math.min(1, byHeight, byWidth)).toFixed(3))
}
new ResizeObserver(fit).observe(stage)
window.addEventListener('resize', fit)
fit()
