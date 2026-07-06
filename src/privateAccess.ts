/**
 * Private case access — rotating token gate.
 *
 * HOW IT WORKS
 *  - A case listed in PRIVATE_CASES is hidden from the home grid and its
 *    internal page is blocked, UNLESS the visitor has unlocked "private mode".
 *  - Private mode is unlocked by opening any page with ?preview=<token> where
 *    <token> is one of ACCESS_TOKENS. The unlock is remembered in localStorage,
 *    so the visitor can browse the rest of the site without re-adding the token.
 *  - The token only unlocks "private mode" — it does NOT name a specific case.
 *    So adding another slug to PRIVATE_CASES later keeps every existing link
 *    working; the new case simply becomes visible to anyone already unlocked.
 *
 * SHARE A LINK
 *    https://<your-site>/?preview=RL-f01a99bc3816baf9
 *
 * REVOKE ACCESS (rotate)
 *  - Remove a token from ACCESS_TOKENS (or replace it) and redeploy. Any link
 *    using that token stops working immediately, and browsers previously
 *    unlocked with it are re-locked (the stored value no longer matches).
 *  - Keep multiple tokens in the array to hand out separate links you can
 *    revoke independently.
 */

// Active tokens. Add/replace/remove entries to rotate access, then redeploy.
const ACCESS_TOKENS = ['RL-f01a99bc3816baf9']

// Case slugs that require the token (matches case/<slug>.html and
// [data-private-case="<slug>"] cards on the home grid).
const PRIVATE_CASES = ['daycoval']

const STORAGE_KEY = 'pa_unlock'

function storedToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function isUnlocked(): boolean {
  const t = storedToken()
  return t !== null && ACCESS_TOKENS.includes(t)
}

function currentSlug(): string | null {
  const file = window.location.pathname.split('/').pop() || ''
  const slug = file.replace(/\.html$/, '')
  return PRIVATE_CASES.includes(slug) ? slug : null
}

export function initPrivateAccess(): void {
  // 1. Consume ?preview=<token> from the URL, persist a valid unlock, then
  //    strip it from the address bar (keeps the token from lingering / being
  //    re-shared by accident). Preserves any hash used for in-page nav.
  const params = new URLSearchParams(window.location.search)
  const param = params.get('preview')
  if (param !== null) {
    if (ACCESS_TOKENS.includes(param)) {
      try { localStorage.setItem(STORAGE_KEY, param) } catch { /* ignore */ }
    }
    params.delete('preview')
    const qs = params.toString()
    const clean = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
    window.history.replaceState({}, '', clean)
  }

  const unlocked = isUnlocked()

  // 2. Private internal page: reveal when unlocked, otherwise send home.
  //    The page ships with <html class="pa-locked"> hiding <body> so locked
  //    visitors never see the content flash before the redirect.
  const slug = currentSlug()
  if (slug) {
    if (unlocked) {
      document.documentElement.classList.remove('pa-locked')
    } else {
      window.location.replace('../index.html#cases')
      return
    }
  }

  // 3. Home grid: private cards ship hidden (.pa-hidden); reveal only when
  //    unlocked, and drop them from the DOM entirely when locked.
  document.querySelectorAll<HTMLElement>('[data-private-case]').forEach((el) => {
    const s = el.getAttribute('data-private-case') || ''
    if (!PRIVATE_CASES.includes(s)) {
      el.classList.remove('pa-hidden')
      return
    }
    if (unlocked) {
      el.classList.remove('pa-hidden')
    } else {
      el.remove()
    }
  })
}
