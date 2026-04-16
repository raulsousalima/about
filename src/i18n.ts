import translations from './translations.json'

type Lang = 'pt' | 'en'
type TranslationMap = Record<string, string>

const allTranslations: Record<Lang, TranslationMap> = translations as Record<Lang, TranslationMap>

/** Read saved language or default to 'pt' */
function getSavedLang(): Lang {
  const saved = localStorage.getItem('lang') as Lang | null
  return saved === 'pt' ? 'pt' : 'en'
}

/** Apply translations to every element with [data-i18n] */
function applyTranslations(lang: Lang): void {
  const map = allTranslations[lang]
  if (!map) return

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')!
    if (map[key] !== undefined) {
      el.innerHTML = map[key]
    }
  })

  // Update <html lang>
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'

  // Update active state on toggle buttons
  document.querySelectorAll<HTMLElement>('[data-lang-btn]').forEach((btn) => {
    const btnLang = btn.getAttribute('data-lang-btn')
    if (btnLang === lang) {
      btn.classList.add('text-accent', 'font-bold')
      btn.classList.remove('text-text-muted-dark')
    } else {
      btn.classList.remove('text-accent', 'font-bold')
      btn.classList.add('text-text-muted-dark')
    }
  })
}

/** Set language, persist, and apply */
export function setLanguage(lang: Lang): void {
  localStorage.setItem('lang', lang)
  applyTranslations(lang)
}

/** Initialize i18n: read preference and apply */
export function initI18n(): void {
  const lang = getSavedLang()
  applyTranslations(lang)

  // Bind click handlers for toggle buttons
  document.querySelectorAll<HTMLElement>('[data-lang-btn]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const target = btn.getAttribute('data-lang-btn') as Lang
      setLanguage(target)
    })
  })
}
