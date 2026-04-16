import './index.css'
import { initI18n } from './i18n'
import { initTheme } from './theme'
import { initTypewriter } from './typewriter'

// Scroll-reveal: observe all .reveal elements
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible')
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

// Initialize i18n system
initI18n()

// Initialize Theme toggle
initTheme()

// Initialize Typewriter effect
initTypewriter()

