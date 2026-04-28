import './index.css'
import { initI18n } from './i18n'
import { initTheme } from './theme'
import { initTypewriter } from './typewriter'
import { initGalleryToggle } from './caseToggle'
import { animateCounters } from './counter'

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

// Stagger reveal for sibling elements (case cards, lead cards)
document.querySelectorAll('.case-card.reveal, .lead-card.reveal').forEach((el, i) => {
  ;(el as HTMLElement).style.transitionDelay = `${i * 80}ms`
})

// Experience item toggle cards
document.querySelectorAll<HTMLElement>('.exp-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation()
    const card = item.querySelector<HTMLElement>('.exp-card')!
    const dot = item.querySelector<HTMLElement>('.exp-dot')!
    const isOpen = !card.classList.contains('hidden')

    // Close all cards and reset dots
    document.querySelectorAll<HTMLElement>('.exp-card').forEach(c => c.classList.add('hidden'))
    document.querySelectorAll<HTMLElement>('.exp-dot').forEach(d => { d.style.backgroundColor = '' })

    if (!isOpen) {
      card.classList.remove('hidden')
      dot.style.backgroundColor = 'var(--color-accent)'
    }
  })
})

document.addEventListener('click', () => {
  document.querySelectorAll<HTMLElement>('.exp-card').forEach(c => c.classList.add('hidden'))
  document.querySelectorAll<HTMLElement>('.exp-dot').forEach(d => { d.style.backgroundColor = '' })
})

// Logo click always scrolls to top
document.querySelector('a[href="#home"]')?.addEventListener('click', (e) => {
  e.preventDefault()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// Initialize systems
initI18n()
initTheme()
initTypewriter()
initGalleryToggle()


