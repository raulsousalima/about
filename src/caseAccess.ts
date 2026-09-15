import { supabase, ADMIN_EMAIL } from './supabaseClient'

// ---------------------------------------------------------------------------
// Case access model
//
//  - Which cases are "restricted" lives in Supabase (table case_flags), so the
//    owner can flip them from the admin tab without a redeploy. Reads are
//    public; writes are locked to the owner's account by RLS.
//  - VIEWING restricted cases is unlocked either by the share token
//    (?preview=rl-cases, persisted in localStorage) or by being the logged-in
//    admin.
//  - EVERYTHING degrades gracefully: before Supabase answers, and whenever it
//    is unreachable (e.g. the free-tier project is paused), we fall back to
//    DEFAULT_RESTRICTED and a per-session cache, so the site never breaks.
// ---------------------------------------------------------------------------

const ACCESS_TOKENS = ['rl-cases']
const STORAGE_KEY = 'pa_unlock'
const FLAGS_CACHE_KEY = 'case_flags_cache'

// Fallback restricted set (used until Supabase responds, and if it never does).
const DEFAULT_RESTRICTED = ['daycoval']

export const ALL_CASES = ['pernambucanas', 'decathlon', 'nofrictionai', 'daycoval', 'starbem']

let restricted = new Set<string>(readCachedFlags() ?? DEFAULT_RESTRICTED)
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
export function restrictedSlugs(): string[] { return [...restricted] }

// ---- flags cache (per session) --------------------------------------------
function readCachedFlags(): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(FLAGS_CACHE_KEY)
    if (!raw) return null
    return new Set(JSON.parse(raw) as string[])
  } catch { return null }
}
function writeCachedFlags(set: Set<string>): void {
  try { sessionStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify([...set])) } catch { /* ignore */ }
}

// ---- Supabase read/write --------------------------------------------------
async function fetchFlags(): Promise<Set<string> | null> {
  try {
    const res = await withTimeout(
      supabase.from('case_flags').select('slug,restricted'),
      4000,
      { data: null, error: true } as any,
    )
    const { data, error } = res as { data: { slug: string; restricted: boolean }[] | null; error: unknown }
    if (error || !data) return null
    return new Set(data.filter((r) => r.restricted).map((r) => r.slug))
  } catch { return null }
}

/** Write a case's restricted flag. Returns true on success. Admin only (RLS). */
export async function setRestricted(slug: string, value: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('case_flags')
      .upsert({ slug, restricted: value, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
    if (error) return false
    if (value) restricted.add(slug); else restricted.delete(slug)
    writeCachedFlags(restricted)
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
    const show = !restricted.has(slug) || canManageView()
    card.classList.toggle('pa-hidden', !show)
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
    if (unlocked || !restricted.has(slug)) {
      reveal()
    }
    // else: stay hidden (pa-locked) until the async check below.
  }

  // 3) Asynchronous reconcile: real session + fresh flags from Supabase.
  ;(async () => {
    await refreshSession()
    const fresh = await fetchFlags()
    if (fresh) { restricted = fresh; writeCachedFlags(fresh) }
    flagsLoaded = true

    applyHomeGrid()

    if (slug) {
      if (canManageView() || !restricted.has(slug)) reveal()
      else redirectHome()
    }

    notify()
  })()

  // 4) React to login/logout completing (e.g. after the magic-link redirect).
  supabase.auth.onAuthStateChange((_event, session) => {
    isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    applyHomeGrid()
    if (slug && (canManageView() || (flagsLoaded && !restricted.has(slug)))) reveal()
    notify()
  })
}
