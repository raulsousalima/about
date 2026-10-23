/* =====================================================
   Simulador: Kalion Bank, a navigable mobile banking prototype built only
   with DS Kalion components (ui-*) and tokens.

   Flow: Splash → Acesso → Login (PIN) → Home, with logout back to Splash.

   Theme and language follow the docs page (data-theme / langchange), like
   every other component here. Token overrides from the panel are written as
   inline custom properties on the app root (.sim-app) only, so they cascade
   into the prototype and never reach :root: the library and the rest of
   /designsystem stay untouched.
   ===================================================== */

type T = (pt: string, en: string) => string
type Screen = 'splash' | 'acesso' | 'login' | 'home'
type Tab = 'inicio' | 'extrato' | 'pagamentos' | 'pravoce' | 'menu'

interface Tokens {
  accent: string | null
  font: 'padrao' | 'playfair' | 'system' | 'mono'
  text: string
  space: string
  radius: string
}

const DEFAULT_TOKENS: Tokens = { accent: null, font: 'padrao', text: '1', space: '1', radius: '1' }
const DEMO_PIN = '123456'
const PIN_LENGTH = 6

const state = {
  screen: 'splash' as Screen,
  tab: 'inicio' as Tab,
  hidden: false,
  seg: 'conta' as 'conta' | 'cartao',
  pin: '',
  error: '',
  loading: false,
  intent: '',
  logout: false,
  tokens: { ...DEFAULT_TOKENS },
}

let L: T = (pt) => pt
let host: HTMLElement
let lastView = ''
let splashTimer = 0
let snackTimer = 0
let loginTimer = 0
const bound = new WeakSet<HTMLElement>()

/* ---------------- Brand ---------------- */

// Kalion Bank icon: the ring follows the text color, the chameleon the accent token.
const ICON = `<svg class="sim-icon" viewBox="0 0 190 190" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M94.3214 135.701C121.986 135.701 144.62 113.067 144.62 85.4025C144.62 57.7381 121.986 35.1035 94.3214 35.1035C66.657 35.1035 44.0225 57.7381 44.0225 85.4025C44.0225 113.067 66.657 135.701 94.3214 135.701ZM94.3214 57.5446C109.798 57.5446 122.179 69.9259 122.179 85.4025C122.179 100.879 109.798 113.26 94.3214 113.26C78.8448 113.26 66.4635 100.879 66.4635 85.4025C66.4635 69.9259 78.8448 57.5446 94.3214 57.5446ZM138.43 172.458V150.017H49.0523V172.458H138.43Z"/>
  <path class="sim-icon__mark" fill-rule="evenodd" clip-rule="evenodd" d="M136.101 43.2747C133.715 43.2747 131.775 45.2114 131.775 47.5982C131.775 49.9898 133.715 51.9241 136.101 51.9241C138.49 51.9241 140.427 49.9898 140.427 47.5982C140.427 45.2114 138.49 43.2747 136.101 43.2747ZM142.215 71.5436L114.415 71.5313L113.657 75.3339C111.596 84.3086 98.8309 83.7975 97.4272 75.0576L96.8599 71.5436H87.7361L87.2152 76.5053C86.3104 85.1889 73.653 86.4923 70.8897 78.3051L70.1756 76.1972C64.1404 88.7983 66.016 103.896 75.1471 114.639C80.5099 120.946 88.0271 125.364 96.5493 126.741C98.4372 127.04 99.7259 128.815 99.4276 130.703C99.1904 132.194 98.0361 133.307 96.6325 133.564C63.2747 139.125 32.5825 111.384 32.5825 78.0043C32.5825 37.3959 75.1594 9.71396 112.422 27.1057L112.332 21.7013C112.283 18.2851 115.152 15.6049 118.504 15.8495C127.42 16.4828 136.649 21.694 143.56 29.8519C149.825 37.2492 154.246 47.1238 154.836 58.2308C155.217 65.4912 149.485 71.5436 142.215 71.5436Z"/>
</svg>`

const brand = (size: 'sm' | 'lg') =>
  `<div class="sim-brand sim-brand--${size}">${ICON}<span class="sim-brand__name">Kalion <strong>Bank</strong></span></div>`

const ti = (name: string) => `<i class="ti ti-${name}" aria-hidden="true"></i>`

const bankCard = (cls = '') => `
  <div class="sim-card ${cls}" aria-hidden="true">
    <span class="sim-card__top">${ICON}<span>Kalion</span></span>
    <span class="sim-card__chip"></span>
    <span class="sim-card__num">•••• 4008</span>
    <span class="sim-card__tier">Infinite</span>
  </div>`

/* ---------------- Formatting ---------------- */

const money = (v: number) => state.hidden
  ? 'R$ ••••••'
  : new Intl.NumberFormat(L('pt-BR', 'en-US'), { style: 'currency', currency: 'BRL' }).format(v)

/* ---------------- Screens ---------------- */

function splash() {
  return `<section class="sim-screen sim-splash" aria-labelledby="sim-title">
    <h2 id="sim-title" class="sr-only" tabindex="-1" data-sim-focus>Kalion Bank</h2>
    ${brand('lg')}
    <span class="sr-only" role="status">${L('Carregando', 'Loading')}</span>
  </section>`
}

function acesso(behind = false) {
  const quick: [string, string, string][] = [
    ['pix', 'arrows-exchange', L('Fazer Pix', 'Send Pix')],
    ['virtual', 'credit-card', L('Cartão virtual', 'Virtual card')],
    ['boleto', 'qrcode', L('Boleto e QR', 'Bills & QR')],
  ]
  return `<section class="sim-screen sim-access" aria-labelledby="sim-title" ${behind ? 'inert' : ''}>
    <header class="sim-access__brand">${brand('sm')}</header>
    <div class="sim-access__art">${bankCard('sim-card--float')}</div>
    <div class="sim-sheet">
      <h2 id="sim-title" class="sim-h1" tabindex="-1" data-sim-focus>${L('Olá, Raul', 'Hi, Raul')}</h2>
      <p class="sim-muted">${L('Agência 0001 · Conta 12345-6', 'Branch 0001 · Account 12345-6')}</p>
      <div class="sim-quick">
        ${quick.map(([id, icon, label]) => `<button type="button" class="sim-quick__item" data-sim="quick" data-intent="${id}">${ti(icon)}<span>${label}</span></button>`).join('')}
      </div>
      <button type="button" class="ui-btn ui-btn--primary ui-btn--lg sim-block" data-sim="login">${L('Acessar conta', 'Sign in')}</button>
      <button type="button" class="ui-btn ui-btn--link sim-tap sim-center" data-sim="soon">${L('Abrir nova conta PF ou PJ', 'Open a new account')}</button>
    </div>
  </section>`
}

function login() {
  const intents: Record<string, string> = {
    pix: L('Entre para fazer seu Pix.', 'Sign in to send your Pix.'),
    virtual: L('Entre para ver seu cartão virtual.', 'Sign in to see your virtual card.'),
    boleto: L('Entre para pagar boletos e QR.', 'Sign in to pay bills and QR codes.'),
  }
  const dots = Array.from({ length: PIN_LENGTH }, (_, i) =>
    `<span class="sim-pin__dot${i < state.pin.length ? ' is-filled' : ''}"></span>`).join('')
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    .map(k => `<button type="button" class="sim-key" data-sim="digit" data-digit="${k}">${k}</button>`).join('')
  return `${acesso(true)}
    <div class="sim-scrim" data-sim="close-login" aria-hidden="true"></div>
    <section class="sim-sheet sim-sheet--modal sim-login" role="dialog" aria-modal="true" aria-labelledby="sim-login-title">
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon sim-sheet__close" data-sim="close-login" aria-label="${L('Fechar', 'Close')}">${ti('x')}</button>
      <h2 id="sim-login-title" class="sim-h2" tabindex="-1" data-sim-focus>${L('Insira sua senha de acesso', 'Enter your passcode')}</h2>
      <p class="sim-muted">${intents[state.intent] ?? L('Senha de 6 dígitos.', '6-digit passcode.')}</p>
      <div class="sim-pin${state.error ? ' is-error' : ''}" role="img" aria-label="${L(`${state.pin.length} de ${PIN_LENGTH} dígitos`, `${state.pin.length} of ${PIN_LENGTH} digits`)}">${state.loading ? `<span class="ui-spinner" aria-hidden="true"></span>` : dots}</div>
      <p class="sim-pin__msg${state.error ? ' is-error' : ''}" role="status">${state.loading ? L('Entrando…', 'Signing in…') : state.error || L(`Senha de teste: ${DEMO_PIN}`, `Test passcode: ${DEMO_PIN}`)}</p>
      <div class="sim-keypad"${state.loading ? ' inert' : ''}>
        ${keys}
        <button type="button" class="sim-key sim-key--icon" data-sim="bio" aria-label="${L('Entrar com Face ID', 'Sign in with Face ID')}">${ti('face-id')}</button>
        <button type="button" class="sim-key" data-sim="digit" data-digit="0">0</button>
        <button type="button" class="sim-key sim-key--icon" data-sim="erase" aria-label="${L('Apagar dígito', 'Delete digit')}" ${state.pin ? '' : 'disabled'}>${ti('backspace')}</button>
      </div>
      <button type="button" class="ui-btn ui-btn--ghost sim-center sim-login__forgot" data-sim="soon">${L('Esqueci minha senha', 'Forgot passcode')}</button>
    </section>`
}

function home() {
  const tabs: [Tab, string, string][] = [
    ['inicio', 'home', L('Início', 'Home')],
    ['extrato', 'list-details', L('Extrato', 'Statement')],
    ['pagamentos', 'arrows-left-right', L('Pagamentos', 'Payments')],
    ['pravoce', 'gift', L('Pra você', 'For you')],
    ['menu', 'layout-grid', 'Menu'],
  ]
  const actions: [string, string, string?][] = [
    ['arrows-exchange', L('Pix e transferir', 'Pix & transfer')],
    ['barcode', L('Pagar', 'Pay')],
    ['cash', L('Crédito disponível', 'Available credit'), L('Oferta', 'Offer')],
    ['credit-card', L('Cartão virtual', 'Virtual card')],
    ['plug-connected', L('Conectar contas', 'Connect accounts')],
  ]
  const balance = state.seg === 'conta'
    ? `<p class="sim-muted">${L('Saldo disponível', 'Available balance')}</p>
       <p class="sim-balance" data-sim-money>${money(328.46)}</p>`
    : `<p class="sim-muted">${L('Fatura aberta', 'Open bill')}</p>
       <p class="sim-balance" data-sim-money>${money(384.40)}</p>
       <p class="sim-note">${L('Melhor data de compras: 31 out', 'Best purchase date: Oct 31')}</p>`

  const body = state.tab === 'inicio' ? `
      <div class="ui-segmented sim-seg" role="radiogroup" aria-label="${L('Produto', 'Product')}">
        <button type="button" class="ui-segmented__item" role="radio" aria-checked="${state.seg === 'conta'}" data-sim="seg" data-seg="conta">${L('Conta corrente', 'Checking')}</button>
        <button type="button" class="ui-segmented__item" role="radio" aria-checked="${state.seg === 'cartao'}" data-sim="seg" data-seg="cartao">${L('Cartão', 'Card')}</button>
      </div>
      <div class="sim-balance-block" aria-live="polite">${balance}</div>
      <ul class="sim-actions" aria-label="${L('Atalhos', 'Shortcuts')}">
        ${actions.map(([icon, label, badge]) => `<li><button type="button" class="sim-action" data-sim="soon">${badge ? `<span class="ui-badge ui-badge--status ui-badge--info ui-badge--sm sim-action__badge">${badge}</span>` : ''}${ti(icon)}<span>${label}</span></button></li>`).join('')}
      </ul>
      <button type="button" class="sim-row" data-sim="soon">
        <span>${L('Limite disponível', 'Available limit')}</span><strong data-sim-money>${money(4000)}</strong>${ti('chevron-right')}
      </button>
      <h3 class="sim-h3">${L('Meus cartões', 'My cards')}</h3>
      <div class="sim-cards">
        <button type="button" class="sim-cards__item" data-sim="soon">${bankCard('sim-card--mini')}<strong>Virtual</strong><span class="ui-badge ui-badge--status ui-badge--success ui-badge--sm">${L('Ativo', 'Active')}</span></button>
        <button type="button" class="sim-cards__item" data-sim="soon"><span class="sim-cards__add">${ti('plus')}</span><strong>${L('Físico', 'Physical')}</strong><span class="sim-muted">${L('Solicitar', 'Request')}</span></button>
        <button type="button" class="sim-cards__item" data-sim="soon"><span class="sim-cards__more">${ti('dots')}</span><strong>${L('Ver todos', 'See all')}</strong></button>
      </div>`
    : `<div class="sim-empty">${ti(tabs.find(t => t[0] === state.tab)![1])}<strong>${tabs.find(t => t[0] === state.tab)![2]}</strong><p class="sim-muted">${L('Esta área não faz parte do simulador.', 'This area is not part of the simulator.')}</p></div>`

  return `<section class="sim-screen sim-home" aria-labelledby="sim-title">
    <header class="sim-home__head">
      <span class="sim-avatar" aria-hidden="true">RL</span>
      <div class="sim-home__hello"><h2 id="sim-title" class="sim-h2" tabindex="-1" data-sim-focus>${L('Olá, Raul', 'Hi, Raul')}</h2><span class="sim-muted">Kalion Bank</span></div>
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" data-sim="eye" aria-pressed="${state.hidden}" aria-label="${L('Ocultar valores', 'Hide amounts')}">${ti(state.hidden ? 'eye-off' : 'eye')}</button>
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon sim-bell" data-sim="soon" aria-label="${L('Notificações, 2 novas', 'Notifications, 2 new')}">${ti('bell')}<span class="sim-bell__dot" aria-hidden="true"></span></button>
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" data-sim="logout" aria-label="${L('Sair da conta', 'Sign out')}">${ti('logout')}</button>
    </header>
    <div class="sim-home__body">${body}</div>
    <nav class="sim-tabbar" aria-label="${L('Navegação do app', 'App navigation')}">
      ${tabs.map(([id, icon, label]) => `<button type="button" class="sim-tab" data-sim="tab" data-tab="${id}" ${state.tab === id ? 'aria-current="page"' : ''}>${ti(icon)}<span>${label}</span></button>`).join('')}
    </nav>
    ${state.logout ? `
      <div class="sim-scrim" data-sim="cancel-logout" aria-hidden="true"></div>
      <section class="sim-sheet sim-sheet--modal" role="alertdialog" aria-modal="true" aria-labelledby="sim-logout-title" aria-describedby="sim-logout-desc">
        <h2 id="sim-logout-title" class="sim-h2" tabindex="-1" data-sim-focus>${L('Sair da conta?', 'Sign out?')}</h2>
        <p id="sim-logout-desc" class="sim-muted">${L('Você volta para a tela inicial e precisa da senha para entrar de novo.', 'You go back to the start screen and need your passcode to sign in again.')}</p>
        <button type="button" class="ui-btn ui-btn--primary ui-btn--lg sim-block" data-sim="confirm-logout">${L('Sair', 'Sign out')}</button>
        <button type="button" class="ui-btn ui-btn--secondary ui-btn--lg sim-block" data-sim="cancel-logout">${L('Cancelar', 'Cancel')}</button>
      </section>` : ''}
  </section>`
}

const SCREENS: Record<Screen, () => string> = { splash, acesso, login, home }

/* ---------------- Render ---------------- */

const STEPS: [Screen, string, string][] = [['splash', 'Splash', 'Splash'], ['acesso', 'Acesso', 'Welcome'], ['login', 'Login', 'Login'], ['home', 'Home', 'Home']]

function renderSteps() {
  const el = host.querySelector<HTMLElement>('[data-sim-steps]')!
  el.innerHTML = STEPS.map(([id, pt, en]) =>
    `<button type="button" class="ui-segmented__item" role="radio" aria-checked="${state.screen === id}" data-sim="goto" data-screen="${id}">${L(pt, en)}</button>`).join('')
}

function render(moveFocus = false) {
  const app = host.querySelector<HTMLElement>('[data-sim-app]')!
  const view = app.querySelector<HTMLElement>('[data-sim-view]')!
  // Enter animations only when the screen or a modal changes, not on every
  // re-render (each PIN digit, the eye toggle, a tab switch).
  const key = state.screen + (state.logout ? ':logout' : '')
  view.dataset.anim = String(key !== lastView)
  lastView = key
  view.innerHTML = SCREENS[state.screen]()
  renderSteps()

  clearTimeout(splashTimer)
  if (state.screen === 'splash') {
    const wait = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1200 : 1800
    splashTimer = window.setTimeout(() => go('acesso', app.contains(document.activeElement)), wait)
  }
  // Move focus only for user-driven navigation, so loading the page never jumps into the phone.
  if (moveFocus) {
    const modal = view.querySelector<HTMLElement>('[aria-modal] [data-sim-focus]')
    ;(modal ?? view.querySelector<HTMLElement>('[data-sim-focus]'))?.focus({ preventScroll: true })
  }
}

function go(screen: Screen, moveFocus = true) {
  clearTimeout(loginTimer)
  state.screen = screen
  state.pin = ''
  state.error = ''
  state.loading = false
  state.logout = false
  if (screen !== 'login') state.intent = ''
  if (screen === 'splash' || screen === 'acesso') { state.tab = 'inicio'; state.seg = 'conta'; state.hidden = false }
  render(moveFocus)
}

function snack(msg: string) {
  const el = host.querySelector<HTMLElement>('[data-sim-snack]')!
  el.textContent = msg
  el.classList.add('is-visible')
  clearTimeout(snackTimer)
  snackTimer = window.setTimeout(() => el.classList.remove('is-visible'), 2400)
}

/* ---------------- PIN ---------------- */

function signIn() {
  state.loading = true
  state.error = ''
  render()
  loginTimer = window.setTimeout(() => go('home'), 700)
}

function typeDigit(d: string) {
  if (state.loading || state.pin.length >= PIN_LENGTH) return
  state.pin += d
  state.error = ''
  if (state.pin.length < PIN_LENGTH) { render(); keepKeyFocus(d); return }
  if (state.pin === DEMO_PIN) { signIn(); return }
  state.pin = ''
  state.error = L('Senha incorreta. Tente novamente.', 'Wrong passcode. Try again.')
  render()
  keepKeyFocus(d)
}

function erase() {
  if (state.loading || !state.pin) return
  state.pin = state.pin.slice(0, -1)
  render()
  host.querySelector<HTMLElement>(state.pin ? '[data-sim="erase"]' : '[data-digit="0"]')?.focus()
}

// The sheet re-renders on every key; keep focus on the key that was pressed.
function keepKeyFocus(d: string) {
  if (host.contains(document.activeElement) || document.activeElement === document.body)
    host.querySelector<HTMLElement>(`[data-digit="${d}"]`)?.focus({ preventScroll: true })
}

/* ---------------- Events ---------------- */

function onClick(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-sim]')
  if (!el || !host.contains(el)) return
  const soon = () => snack(L('Disponível em breve no simulador.', 'Coming soon to the simulator.'))
  switch (el.dataset.sim) {
    case 'goto': go(el.dataset.screen as Screen); break
    case 'restart': go('splash'); break
    case 'login': state.intent = ''; go('login'); break
    case 'quick': go('login'); state.intent = el.dataset.intent!; render(true); break
    case 'close-login': go('acesso'); break
    case 'digit': typeDigit(el.dataset.digit!); break
    case 'erase': erase(); break
    case 'bio': signIn(); break
    case 'seg': state.seg = el.dataset.seg as 'conta' | 'cartao'; render(); host.querySelector<HTMLElement>(`[data-seg="${state.seg}"]`)?.focus(); break
    case 'eye': state.hidden = !state.hidden; render(); host.querySelector<HTMLElement>('[data-sim="eye"]')?.focus(); break
    case 'tab': state.tab = el.dataset.tab as Tab; render(); host.querySelector<HTMLElement>(`[data-tab="${state.tab}"]`)?.focus(); break
    case 'logout': state.logout = true; render(true); break
    case 'cancel-logout': state.logout = false; render(); host.querySelector<HTMLElement>('[data-sim="logout"]')?.focus(); break
    case 'confirm-logout': go('splash'); break
    case 'soon': soon(); break
  }
}

function onKey(e: KeyboardEvent) {
  if (state.screen === 'login') {
    if (/^\d$/.test(e.key)) { e.preventDefault(); typeDigit(e.key) }
    else if (e.key === 'Backspace') { e.preventDefault(); erase() }
    else if (e.key === 'Escape') { e.preventDefault(); go('acesso') }
  } else if (state.screen === 'home' && state.logout && e.key === 'Escape') {
    state.logout = false
    render()
    host.querySelector<HTMLElement>('[data-sim="logout"]')?.focus()
  } else if (state.screen === 'home' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    // Arrow keys move between the segmented options, like a native radio group.
    const seg = (e.target as HTMLElement).closest('[data-sim="seg"]')
    if (!seg) return
    e.preventDefault()
    state.seg = state.seg === 'conta' ? 'cartao' : 'conta'
    render()
    host.querySelector<HTMLElement>(`[data-seg="${state.seg}"]`)?.focus()
  }
}

/* ---------------- Tokens ---------------- */

const ACCENTS: [string, string, string][] = [
  ['#C8F04E', 'Lime', 'Lime'], ['#2DD4BF', 'Turquesa', 'Teal'], ['#60A5FA', 'Azul', 'Blue'],
  ['#FB923C', 'Laranja', 'Orange'], ['#F472B6', 'Rosa', 'Pink'], ['#A78BFA', 'Violeta', 'Violet'],
]
// 'padrao' is the DS pairing: Playfair on titles (--sim-font-title), Inter on body and figures.
// Any other choice sets one family for both.
const FONTS: Record<Exclude<Tokens['font'], 'padrao'>, [string, string]> = {
  playfair: ['Playfair', "'Playfair Display', serif"],
  system: ['System', "system-ui, -apple-system, 'Segoe UI', sans-serif"],
  mono: ['Mono', "ui-monospace, 'SF Mono', Menlo, monospace"],
}
const TEXT_STEPS = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl']
const SPACE_STEPS = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16']
// pill is included so ui-* buttons, chips and segmented follow 'Reto'; scaled up it stays a pill.
const RADIUS_STEPS = ['xs', 'sm', 'base', 'md', 'lg', 'pill']

const rootVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const hexRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const rgbHex = (rgb: number[]) => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
const parseRgb = (css: string) => (css.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number)

function lum(rgb: number[]) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

/** Accent as text needs 4.5:1 on the app background: mix toward white (dark) or black (light) until it passes. */
function accentText(accent: number[], bg: number[]) {
  const target = lum(bg) < 0.5 ? 255 : 0
  let c = accent
  for (let t = 0; t <= 1 && ratio(c, bg) < 4.5; t += 0.05) c = accent.map(v => v + (target - v) * t)
  return rgbHex(c)
}

function tokenOverrides(app: HTMLElement): [string, string][] {
  const t = state.tokens
  const out: [string, string][] = []
  if (t.accent) {
    const acc = hexRgb(t.accent)
    const bg = parseRgb(getComputedStyle(app).backgroundColor)
    out.push(['--color-accent', t.accent],
      ['--color-accent-hover', `color-mix(in srgb, ${t.accent} 85%, white)`],
      ['--color-accent-muted', `color-mix(in srgb, ${t.accent} 18%, transparent)`],
      ['--color-accent-text', accentText(acc, bg)],
      ['--color-on-accent', lum(acc) > 0.18 ? 'var(--color-text-primary-light)' : 'var(--color-surface-light)'])
  }
  if (t.font !== 'padrao') out.push(['--font-sans', FONTS[t.font][1]], ['--font-serif', FONTS[t.font][1]], ['--sim-font-title', 'var(--font-sans)'])
  if (t.text !== '1') TEXT_STEPS.forEach(s => out.push([`--text-${s}`, `calc(${rootVar(`--text-${s}`)} * ${t.text})`]))
  if (t.space !== '1') SPACE_STEPS.forEach(s => out.push([`--space-${s}`, `calc(${rootVar(`--space-${s}`)} * ${t.space})`]))
  if (t.radius !== '1') RADIUS_STEPS.forEach(s => out.push([`--radius-${s}`, `calc(${rootVar(`--radius-${s}`)} * ${t.radius})`]))
  return out
}

function applyTokens() {
  const app = host.querySelector<HTMLElement>('[data-sim-app]')!
  app.removeAttribute('style')
  const vars = tokenOverrides(app)
  vars.forEach(([k, v]) => app.style.setProperty(k, v))
  const code = host.querySelector<HTMLElement>('[data-sim-css]')!
  const lines = vars.map(([k, v]) => `  ${k}: ${v};`)
  code.textContent = lines.length
    ? `.sim-app {\n${lines.join('\n')}\n}`
    : L('/* Sem alterações: valores da biblioteca. */', '/* No changes: library values. */')
}

function seg(key: keyof Tokens, label: string, options: [string, string][], wide = false) {
  return `<div class="sim-ctrl${wide ? ' sim-ctrl--wide' : ''}"><span class="ui-field__label" id="sim-l-${key}">${label}</span>
    <div class="ui-segmented ui-segmented--sm" role="radiogroup" aria-labelledby="sim-l-${key}">
      ${options.map(([v, l]) => `<button type="button" class="ui-segmented__item" role="radio" aria-checked="${state.tokens[key] === v}" data-tok="${key}" data-val="${v}">${l}</button>`).join('')}
    </div></div>`
}

function renderPanel() {
  const t = state.tokens
  const panel = host.querySelector<HTMLElement>('[data-sim-panel]')!
  panel.innerHTML = `
    <div class="sim-ctrl sim-ctrl--wide"><span class="ui-field__label" id="sim-l-accent">${L('Cor de acento', 'Accent color')}</span>
      <div class="sim-swatches" role="radiogroup" aria-labelledby="sim-l-accent">
        ${ACCENTS.map(([hex, pt, en], i) => `<button type="button" class="sim-swatch" role="radio" aria-checked="${(t.accent ?? ACCENTS[0][0]) === hex}" data-tok="accent" data-val="${i === 0 ? '' : hex}" style="--sw:${hex}" aria-label="${L(pt, en)}"></button>`).join('')}
        <label class="sim-swatch sim-swatch--custom" title="${L('Outra cor', 'Custom color')}">${ti('color-picker')}<input type="color" value="${t.accent ?? ACCENTS[0][0]}" data-tok-color aria-label="${L('Outra cor', 'Custom color')}" /></label>
      </div></div>
    ${seg('font', L('Fonte', 'Font'), [['padrao', L('Padrão', 'Default')], ...(Object.keys(FONTS) as (keyof typeof FONTS)[]).map(k => [k, FONTS[k][0]] as [string, string])], true)}
    ${seg('text', L('Tamanho do texto', 'Text size'), [['0.9', '90%'], ['1', '100%'], ['1.1', '110%'], ['1.25', '125%']])}
    ${seg('space', L('Espaçamento', 'Spacing'), [['0.75', L('Compacto', 'Compact')], ['1', L('Padrão', 'Default')], ['1.25', L('Amplo', 'Roomy')]])}
    ${seg('radius', L('Raio', 'Radius'), [['0', L('Reto', 'Square')], ['1', L('Padrão', 'Default')], ['1.5', L('Arredondado', 'Rounded')]])}`
}

function onPanel(e: Event) {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tok]')
  if (el) {
    const key = el.dataset.tok as keyof Tokens
    ;(state.tokens as unknown as Record<string, string | null>)[key] = el.dataset.val || (key === 'accent' ? null : el.dataset.val!)
    renderPanel()
    applyTokens()
    host.querySelector<HTMLElement>(`[data-tok="${key}"][aria-checked="true"]`)?.focus()
    return
  }
  const action = (e.target as HTMLElement).closest<HTMLElement>('[data-sim-tokens]')?.dataset.simTokens
  if (action === 'reset') { state.tokens = { ...DEFAULT_TOKENS }; renderPanel(); applyTokens() }
  if (action === 'copy') {
    const text = host.querySelector<HTMLElement>('[data-sim-css]')!.textContent ?? ''
    navigator.clipboard?.writeText(text).then(() => snack(L('CSS copiado.', 'CSS copied.')), () => {})
  }
}

/* ---------------- Fit to viewport ---------------- */

/** Scales the whole device (zoom keeps the app's 23rem layout intact) so the phone
 *  and its toolbar fit the window height on laptops instead of forcing a scroll,
 *  and the column width on phones. */
function fit() {
  const device = host?.querySelector<HTMLElement>('.sim-device')
  if (!device?.isConnected || !device.offsetParent) return
  const topbar = parseFloat(getComputedStyle(document.body).getPropertyValue('--ds-topbar')) || 64
  const toolbar = host.querySelector<HTMLElement>('.sim-toolbar')!.offsetHeight
  const stage = getComputedStyle(host.querySelector('.sim-stage')!)
  const chrome = topbar + toolbar + parseFloat(stage.paddingTop) + parseFloat(stage.paddingBottom) + 24
  device.style.zoom = '1'
  const { width, height } = device.getBoundingClientRect()
  const room = host.querySelector<HTMLElement>('.sim-stage')!.clientWidth - parseFloat(stage.paddingLeft) - parseFloat(stage.paddingRight)
  const scale = Math.min(1, room / width, Math.max(0.6, (window.innerHeight - chrome) / height))
  device.style.zoom = scale.toFixed(3)
}

/* ---------------- Mount ---------------- */

export function mountSimulator(el: HTMLElement, t: T) {
  L = t
  host = el
  el.innerHTML = `
    <div class="sim-frame">
      <div class="sim-toolbar">
        <div class="ui-segmented ui-segmented--sm" role="radiogroup" aria-label="${L('Telas do fluxo', 'Flow screens')}" data-sim-steps></div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-sim="restart">${ti('refresh')}<span class="ui-btn__label">${L('Reiniciar', 'Restart')}</span></button>
      </div>
      <div class="sim-stage">
        <div class="sim-device">
          <div class="sim-app" data-sim-app role="region" aria-label="${L('Protótipo Kalion Bank', 'Kalion Bank prototype')}">
            <div class="sim-status" aria-hidden="true"><span>9:41</span><span class="sim-status__icons">${ti('antenna-bars-5')}${ti('wifi')}${ti('battery-3')}</span></div>
            <div class="sim-view" data-sim-view></div>
            <div class="sim-snack" data-sim-snack role="status" aria-live="polite"></div>
            <span class="sim-home-indicator" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    </div>
    <h2 class="ds-h2">${L('Tokens do simulador', 'Simulator tokens')}</h2>
    <p class="ds-p">${L('Altere cor, fonte, texto, espaçamento e raio e veja o app responder. As mudanças valem só dentro do simulador: a biblioteca e esta documentação continuam com os valores originais. Tema e idioma seguem os da página.', 'Change color, font, text, spacing and radius and watch the app respond. Changes apply only inside the simulator: the library and these docs keep their original values. Theme and language follow the page.')}</p>
    <div class="sim-panel" data-sim-panel></div>
    <div class="sim-panel__foot">
      <button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-sim-tokens="reset">${ti('restore')}<span class="ui-btn__label">${L('Restaurar padrão', 'Reset to default')}</span></button>
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-sim-tokens="copy">${ti('copy')}<span class="ui-btn__label">${L('Copiar CSS', 'Copy CSS')}</span></button>
    </div>
    <pre class="sim-css"><code data-sim-css></code></pre>`

  if (!bound.has(el)) {
    bound.add(el)
    el.addEventListener('click', e => { onClick(e); onPanel(e) })
    el.addEventListener('keydown', e => { if ((e.target as HTMLElement).closest('[data-sim-app]')) onKey(e) })
    el.addEventListener('input', e => {
      const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-tok-color]')
      if (!input) return
      state.tokens.accent = input.value.toUpperCase()
      host.querySelectorAll<HTMLElement>('.sim-swatch[role="radio"]').forEach(s => s.setAttribute('aria-checked', 'false'))
      applyTokens()
    })
    // The accent-text contrast depends on the background, so recompute when the page theme flips.
    new MutationObserver(() => applyTokens()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.addEventListener('resize', fit)
    new ResizeObserver(fit).observe(el)
  }
  renderPanel()
  render()
  applyTokens()
  fit()
}
