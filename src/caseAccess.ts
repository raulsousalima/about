import { supabase, ALLOWED_EMAIL as ADMIN_EMAIL } from './supabase'

// ---------------------------------------------------------------------------
// Case access model
//
//  - Which cases are "restricted" or "hidden" lives in Supabase (table
//    case_flags), so the owner can flip them from the admin tab without a
//    redeploy. Reads are public; writes are locked to the owner's account by RLS.
//  - VIEWING restricted cases is unlocked either by the share token
//    (?preview=rl-cases, persisted in localStorage) or by being the logged-in
//    admin.
//  - HIDDEN cases (drafts) are stricter: only the logged-in admin sees them;
//    the share token does not unlock them.
//  - EVERYTHING degrades gracefully: before Supabase answers, and whenever it
//    is unreachable (e.g. the free-tier project is paused), we fall back to
//    DEFAULT_RESTRICTED and a per-session cache, so the site never breaks.
// ---------------------------------------------------------------------------

const ACCESS_TOKENS = ['rl-cases']
const STORAGE_KEY = 'pa_unlock'
const FLAGS_CACHE_KEY = 'case_flags_cache'

// Fallback flag sets (used until Supabase responds, and if it never does).
const DEFAULT_RESTRICTED = ['daycoval']
const DEFAULT_HIDDEN = ['pefisa']

export const ALL_CASES = ['pernambucanas', 'decathlon', 'nofrictionai', 'daycoval', 'starbem', 'pefisa']

export type CaseFlag = 'restricted' | 'hidden'
type Flags = { restricted: Set<string>; hidden: Set<string> }

const cachedFlags = readCachedFlags()
let restricted = cachedFlags?.restricted ?? new Set<string>(DEFAULT_RESTRICTED)
let hidden = cachedFlags?.hidden ?? new Set<string>(DEFAULT_HIDDEN)
let isAdmin = false
let flagsLoaded = false

type Listener = () => void
const listeners = new Set<Listener>()
export function onAccessChange(cb: Listener): void { listeners.add(cb) }
function notify(): void { listeners.forEach((cb) => cb()) }

// Never let a slow/paused Supabase hang the UI: bound every network call.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

// ---- token ----------------------------------------------------------------
function storedToken(): string | null {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}
export function tokenUnlocked(): boolean {
  const t = storedToken()
  return t !== null && ACCESS_TOKENS.includes(t)
}
export function canManageView(): boolean {
  return tokenUnlocked() || isAdmin
}
export function getIsAdmin(): boolean { return isAdmin }
export function isRestricted(slug: string): boolean { return restricted.has(slug) }
export function isHidden(slug: string): boolean { return hidden.has(slug) }
export function restrictedSlugs(): string[] { return [...restricted] }

/** Can the current visitor see this case (home card and internal page)? */
function canView(slug: string): boolean {
  if (hidden.has(slug)) return isAdmin
  if (restricted.has(slug)) return canManageView()
  return true
}

// ---- flags cache (per session) --------------------------------------------
function readCachedFlags(): Flags | null {
  try {
    const raw = sessionStorage.getItem(FLAGS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { restricted?: string[]; hidden?: string[] }
    if (!Array.isArray(parsed.restricted) || !Array.isArray(parsed.hidden)) return null
    return { restricted: new Set(parsed.restricted), hidden: new Set(parsed.hidden) }
  } catch { return null }
}
function writeCachedFlags(): void {
  try {
    sessionStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify({ restricted: [...restricted], hidden: [...hidden] }))
  } catch { /* ignore */ }
}

// ---- Supabase read/write --------------------------------------------------
async function fetchFlags(): Promise<Flags | null> {
  try {
    const res = await withTimeout(
      supabase.from('case_flags').select('slug,restricted,hidden'),
      4000,
      { data: null, error: true } as any,
    )
    const { data, error } = res as { data: { slug: string; restricted: boolean; hidden: boolean }[] | null; error: unknown }
    if (error || !data) return null
    return {
      restricted: new Set(data.filter((r) => r.restricted).map((r) => r.slug)),
      hidden: new Set(data.filter((r) => r.hidden).map((r) => r.slug)),
    }
  } catch { return null }
}

/** Write one of a case's flags. Returns true on success. Admin only (RLS). */
export async function setFlag(slug: string, flag: CaseFlag, value: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('case_flags')
      .upsert({ slug, [flag]: value, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
    if (error) return false
    const set = flag === 'hidden' ? hidden : restricted
    if (value) set.add(slug); else set.delete(slug)
    writeCachedFlags()
    applyHomeGrid()
    notify()
    return true
  } catch { return false }
}

// ---- auth -----------------------------------------------------------------
export async function signInWithPassword(email: string, password: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      8000,
      { data: null, error: { message: 'Tempo esgotado. Tente novamente.' } } as any,
    )
    if (error || !data?.session) {
      return { ok: false, message: (error as any)?.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : ((error as any)?.message || 'Falha no login.') }
    }
    isAdmin = data.session.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    applyHomeGrid()
    notify()
    return { ok: true, message: '' }
  } catch {
    return { ok: false, message: 'Falha no login.' }
  }
}
export async function signOut(): Promise<void> {
  try { await supabase.auth.signOut() } catch { /* ignore */ }
  isAdmin = false
  applyHomeGrid()
  notify()
}

async function refreshSession(): Promise<void> {
  try {
    const data = await withTimeout(
      supabase.auth.getSession().then((r) => r.data),
      4000,
      { session: null } as any,
    )
    isAdmin = data.session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  } catch { isAdmin = false }
}

// ---- home grid ------------------------------------------------------------
function applyHomeGrid(): void {
  document.querySelectorAll<HTMLElement>('[data-case-slug]').forEach((card) => {
    const slug = card.getAttribute('data-case-slug') || ''
    card.classList.toggle('pa-hidden', !canView(slug))
  })
}

// ---- internal case page gate ----------------------------------------------
function currentCaseSlug(): string | null {
  if (!window.location.pathname.includes('/case/')) return null
  const file = window.location.pathname.split('/').pop() || ''
  const slug = file.replace(/\.html$/, '')
  return slug || null
}
function reveal(): void { document.documentElement.classList.remove('pa-locked') }
function redirectHome(): void { window.location.replace('../index.html#cases') }

// ---- init -----------------------------------------------------------------
export function initCaseAccess(): void {
  // 1) Consume ?preview=<token>, persist, then strip it from the URL.
  const params = new URLSearchParams(window.location.search)
  const param = params.get('preview')
  if (param !== null) {
    if (ACCESS_TOKENS.includes(param)) {
      try { localStorage.setItem(STORAGE_KEY, param) } catch { /* ignore */ }
    }
    params.delete('preview')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash)
  }

  const slug = currentCaseSlug()
  const unlocked = tokenUnlocked()

  // 2) Synchronous first pass using cache/fallback (no flash for known state).
  applyHomeGrid()

  if (slug) {
    // Internal case page. Token unlock => reveal now. Otherwise decide with the
    // best info we have synchronously; confirm (and correct) asynchronously.
    if (!hidden.has(slug) && (unlocked || !restricted.has(slug))) {
      reveal()
    }
    // else: stay hidden (pa-locked) until the async check below.
  }

  // 3) Asynchronous reconcile: real session + fresh flags from Supabase.
  ;(async () => {
    await refreshSession()
    const fresh = await fetchFlags()
    if (fresh) { restricted = fresh.restricted; hidden = fresh.hidden; writeCachedFlags() }
    flagsLoaded = true

    applyHomeGrid()

    if (slug) {
      if (canView(slug)) reveal()
      else redirectHome()
    }

    notify()
  })()

  // 4) React to login/logout completing (e.g. after the magic-link redirect).
  supabase.auth.onAuthStateChange((_event, session) => {
    isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    applyHomeGrid()
    if (slug && flagsLoaded && canView(slug)) reveal()
    notify()
  })
}
