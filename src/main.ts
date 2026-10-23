import './index.css'
import './components.css'
import { initCaseAccess } from './caseAccess'
import { initCaseAdmin } from './caseAdmin'
import { initI18n } from './i18n'
import { initTheme } from './theme'
import { initTypewriter } from './typewriter'
import { initGalleryToggle } from './caseToggle'
import { animateCounters } from './counter'
import { initScrollSequence } from './scrollSequence'
import { initGalleryMosaic } from './gallery'
import { initGalleryParticles } from './particles'
import { initScorecardCharts } from './scorecardChart'
import { initFeatureTables } from './featureTable'
import { initRadarCharts } from './radarChart'
import { initReviewDashboards } from './reviewDashboard'

// Case access gate — run first so restricted cards/pages resolve before the
// rest of the page initializes. Admin tab wires up the manage panel.
initCaseAccess()
initCaseAdmin()

// Scroll-reveal: observe all .reveal elements
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible')
      
      // Trigger counter animations if any metrics are within the revealed container
      animateCounters(e.target as HTMLElement)
      
      observer.unobserve(e.target)
    }
  }),
  { threshold: 0.12 }
)

document.querySelectorAll('.reveal').forEach(el => observer.observe(el))

// Stagger reveal for sibling cards; drop the delay once shown so hover isn't delayed.
document.querySelectorAll<HTMLElement>('.ui-card.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${i * 80}ms`
  const clear = (e: TransitionEvent) => {
    if (e.target !== el || e.propertyName !== 'opacity') return
    el.style.transitionDelay = ''
    el.removeEventListener('transitionend', clear)
  }
  el.addEventListener('transitionend', clear)
})

// Experience items: button + popover (one open at a time; Esc / outside click close)
const expTriggers = [...document.querySelectorAll<HTMLButtonElement>('.exp-item > [aria-controls]')]
const closeExp = (except?: HTMLButtonElement) => expTriggers.forEach(t => {
  if (t === except) return
  t.setAttribute('aria-expanded', 'false')
  document.getElementById(t.getAttribute('aria-controls')!)!.hidden = true
})
expTriggers.forEach(trigger => {
  trigger.addEventListener('click', () => {
    const open = trigger.getAttribute('aria-expanded') !== 'true'
    closeExp(trigger)
    trigger.setAttribute('aria-expanded', String(open))
    document.getElementById(trigger.getAttribute('aria-controls')!)!.hidden = !open
  })
})
document.addEventListener('click', e => {
  if (!(e.target as HTMLElement).closest('.exp-item')) closeExp()
})
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return
  const open = expTriggers.find(t => t.getAttribute('aria-expanded') === 'true')
  if (!open) return
  closeExp()
  open.focus()
})

// Logo click always scrolls to top
document.querySelector('a[href="#home"]')?.addEventListener('click', (e) => {
  e.preventDefault()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// Initialize systems
initI18n()
initScorecardCharts()
initFeatureTables()
initRadarCharts()
initReviewDashboards()
initTheme()
initTypewriter()
initGalleryToggle()
initScrollSequence()
initGalleryMosaic()
initGalleryParticles()


