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

  // Let pages that render text from script (e.g. /designsystem) re-render.
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }))

  // Update active state on toggle buttons
  document.querySelectorAll<HTMLElement>('[data-lang-btn]').forEach((btn) => {
    const btnLang = btn.getAttribute('data-lang-btn')
    if (btnLang === lang) {
      // 'text-accent' may still be in older page markup; lime as text uses accent-text.
      btn.classList.remove('text-accent', 'text-text-muted-dark')
      btn.classList.add('text-accent-text', 'font-bold')
    } else {
      btn.classList.remove('text-accent', 'text-accent-text', 'font-bold')
      btn.classList.add('text-text-muted-dark')
    }
  })
}

/** Current language (same default as the toggle). */
export function getLang(): Lang {
  return getSavedLang()
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
