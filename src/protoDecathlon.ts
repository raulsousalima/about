/* =====================================================
   Protótipo Decathlon: the Clube Decathlon app as a navigable prototype,
   drawn in HTML/CSS (only the two campaign photos are images).

   Flow: Splash → Clube → (profile icon) Entrar → Login → Código, and back
   to Clube once the 6-digit code is in. Sheets close on ✕, the dimmed top
   area or Esc.

   The app is a fixed 393×852 surface (iPhone 15 points) with no device
   chrome, so the same mount works in a preview frame, in the /designsystem
   simulator or on the 3D phone's screen; the host scales it.
   Brand colors are the app's own (Decathlon), scoped to .dkt-app.
   ===================================================== */
import './protoDecathlon.css'
import clubeHero from '../img/cases/decathlon/prototipo/clube-hero.webp'
import offerCashback from '../img/cases/decathlon/prototipo/beneficio-cashback.webp'
import offerAniversario from '../img/cases/decathlon/prototipo/beneficio-aniversario.webp'
import offerFrete from '../img/cases/decathlon/prototipo/beneficio-frete.webp'
import produtoBarraca from '../img/cases/decathlon/prototipo/produto-barraca.webp'
import produtoSaco from '../img/cases/decathlon/prototipo/produto-saco.webp'
import memberHero1 from '../img/cases/decathlon/prototipo/logado-hero-1.webp'
import memberHero2 from '../img/cases/decathlon/prototipo/logado-hero-2.webp'
import memberHero3 from '../img/cases/decathlon/prototipo/logado-hero-3.webp'
import memberPerks from '../img/cases/decathlon/prototipo/logado-beneficios.webp'
import entrarHero from '../img/cases/decathlon/prototipo/entrar-hero.webp'

export type DktScreen = 'splash' | 'clube' | 'entrar' | 'login' | 'codigo'
export const DKT_SCREENS: [DktScreen, string, string][] = [
  ['splash', 'Splash', 'Splash'], ['clube', 'Clube', 'Club'], ['entrar', 'Entrar', 'Sign in'],
  ['login', 'Login', 'Login'], ['codigo', 'Código', 'Code'],
]
export const DKT_WIDTH = 393
export const DKT_HEIGHT = 852

export interface DktApp {
  go: (screen: DktScreen, moveFocus?: boolean) => void
  restart: () => void
  readonly screen: DktScreen
  destroy: () => void
}

const CODE_LENGTH = 6
const RESEND_SECONDS = 7
const SPLASH_MS = 1600

const ti = (name: string) => `<i class="ti ti-${name}" aria-hidden="true"></i>`

// Decathlon logo (wordmark + mark), from img/cases/decathlon/logo_*.svg, in currentColor.
const MARK = 'M68.3222 58C49.5152 58 26.1211 77.4588 26.1211 93.586C26.1211 101.915 32.5189 106.116 40.9687 106.116C47.1733 106.116 54.6816 103.847 61.9244 99.4768V67.2948C59.993 70.6024 50.9154 83.929 43.6244 91.0269C39.9065 94.6483 36.9611 96.2175 34.4261 96.2175C31.5773 96.2175 30.2253 94.2861 30.2253 91.4132C30.2253 78.3762 52.1708 61.4282 66.7046 61.4282C72.6919 61.4282 76.5547 64.0839 76.5547 69.2504C76.5547 73.9823 73.3438 79.9214 67.8635 85.4017V95.3725C77.4239 87.816 83.1456 78.1831 83.1456 70.4092C83.1456 62.2249 76.772 58 68.3222 58Z'
const WORDMARK = 'M123.896 98.8986H146.655V91.5849H132.557V85.4501H145.043V78.6417H132.557V72.507H146.655V65.2174H123.896V98.8986ZM174.899 84.3916C171.603 89.6362 168.403 91.8255 164.289 91.8255C158.948 91.8255 155.845 88.0725 155.845 81.5527C155.845 75.3699 158.708 72.2904 163.11 72.2904C166.021 72.2904 168.427 73.5896 169.173 77.92H177.834C176.895 69.6681 171.627 64.5438 163.206 64.5438C153.439 64.5438 147.015 71.4484 147.015 82.0339C147.015 92.6916 153.439 99.5722 164 99.5722C170.905 99.5722 175.596 96.6852 178.7 92.7878H190.512V98.8986H199.125V65.2174H186.904L174.899 84.3916ZM190.512 86.0275H182.886L190.512 73.6377V86.0275ZM105.419 65.2174H92.7647V98.8986H105.419C115.451 98.8986 121.923 92.2826 121.923 82.058C121.923 71.8333 115.451 65.2174 105.419 65.2174ZM105.299 91.5849H101.426V72.507H105.299C110.303 72.507 113.118 76.0435 113.118 82.058C113.118 88.0484 110.303 91.5849 105.299 91.5849ZM298.533 64.5438C288.356 64.5438 281.524 71.4484 281.524 82.058C281.524 92.6675 288.356 99.5722 298.533 99.5722C308.733 99.5722 315.542 92.6675 315.542 82.058C315.542 71.4484 308.733 64.5438 298.533 64.5438ZM298.533 91.8255C293.528 91.8255 290.377 88.4815 290.377 82.058C290.377 75.6345 293.528 72.2904 298.533 72.2904C303.561 72.2904 306.688 75.6345 306.688 82.058C306.688 88.4815 303.561 91.8255 298.533 91.8255ZM201.29 72.507H209.783V98.8986H218.444V72.507H226.936V65.2174H201.29L201.29 72.507ZM337.651 65.2174V83.7661L326.488 65.2174H317.514V98.8986H325.886V79.58L337.506 98.8986H346.023V65.2174L337.651 65.2174ZM269.254 65.2174H260.593V98.8986H282.317V91.609H269.254V65.2174ZM249.43 78.0643H237.762V65.2174H229.101V98.8986H237.762V85.3299H249.43V98.8986H258.091V65.2174H249.43V78.0643Z'
const logo = (cls: string) => `<svg class="dkt-logo ${cls}" viewBox="25 58 322.4 48.1" role="img" aria-label="Decathlon"><path fill="currentColor" d="${MARK}"/><path fill="currentColor" d="${WORDMARK}"/></svg>`

const GOOGLE = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>`

/* ---------------- Screens ---------------- */

interface State { screen: DktScreen; email: string; emailError: string; code: string; resendIn: number; signedIn: boolean; clubeScroll: number }

function splash() {
  return `<section class="dkt-screen dkt-splash" data-dkt="next" aria-label="Splash">
    <h1 class="dkt-sr" tabindex="-1">Decathlon</h1>
    ${logo('dkt-logo--splash')}
  </section>`
}

// Tab bars follow each design: logged in swaps Favoritos for Descontos and marks Clube with the DE tile.
function tabBar(signedIn: boolean) {
  const tabs: [string, string, string][] = signedIn
    ? [['home', 'Início', ti('home')], ['explorar', 'Explorar', ti('list-search')], ['descontos', 'Descontos', ti('tag')], ['clube', 'Clube', '<span class="dkt-de" aria-hidden="true">DE</span>'], ['carrinho', 'Carrinho', ti('shopping-bag')]]
    : [['home', 'Início', ti('home')], ['explorar', 'Explorar', ti('list-search')], ['clube', 'Clube', ti('circle-dot')], ['favoritos', 'Favoritos', ti('heart')], ['carrinho', 'Carrinho', ti('shopping-bag')]]
  return `<nav class="dkt-tabs${signedIn ? ' dkt-tabs--member' : ''}" aria-label="Menu principal">${tabs.map(([id, label, icon]) =>
    `<button type="button" class="dkt-tab"${id === 'clube' ? ' aria-current="page"' : ' data-dkt="soon"'}>${icon}<span>${label}</span></button>`).join('')}</nav>`
}

// Club tier medal: hexagon + star, drawn so it stays sharp at any scale.
type Tier = 'pro' | 'elite' | 'legend'
const TIERS: Record<Tier, [string, string, string, string]> = {
  //       label     outer      edge       inner
  pro: ['Pro', '#E8C08C', '#C08A4E', '#F3D4A6'],
  elite: ['Elite', '#F5C629', '#C99A06', '#FFDA55'],
  legend: ['Legend', '#5B67DE', '#2F3AA6', '#7380F0'],
}
const LOCKED = `<path d="M16.5 21.5v-2.2a3.5 3.5 0 0 1 7 0v2.2M15 21.5h10v7.5H15z" fill="none" stroke="#B5B5B8" stroke-width="1.8" stroke-linejoin="round"/>`
const medal = (tier: Tier | 'locked', cls = '') => {
  if (tier === 'locked') return `<svg class="dkt-medal ${cls}" viewBox="0 0 40 44" aria-hidden="true" focusable="false"><path d="M20 2.5 36.5 12v20L20 41.5 3.5 32V12z" fill="#EEEEF0" stroke="#C9C9CD" stroke-width="2" stroke-linejoin="round"/><path d="M20 9 30.5 15v14L20 35 9.5 29V15z" fill="#FAFAFB"/>${LOCKED}</svg>`
  const [, outer, edge, inner] = TIERS[tier]
  return `<svg class="dkt-medal ${cls}" viewBox="0 0 40 44" aria-hidden="true" focusable="false"><path d="M20 2.5 36.5 12v20L20 41.5 3.5 32V12z" fill="${outer}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/><path d="M20 9 30.5 15v14L20 35 9.5 29V15z" fill="${inner}"/><path d="M20 15.2l1.9 3.9 4.3.6-3.1 3 .7 4.2-3.8-2-3.8 2 .7-4.2-3.1-3 4.3-.6z" fill="${edge}"/></svg>`
}

// "Ganhe descontos" carousel: the cards are campaign art (text baked in).
const OFFERS: [string, string][] = [
  [offerCashback, 'Receba 5% de cashback em suas compras'],
  [offerAniversario, 'Cupom para usar no seu mês de aniversário'],
  [offerFrete, 'O frete grátis é por nossa conta'],
]

const PRODUCTS: { img: string; name: string; price: string; badge: [string, string] | null }[] = [
  { img: produtoBarraca, name: 'Barraca de trilha Arpenaz Fresh&Black 3 pessoas', price: 'R$ 569,99', badge: ['Oferta Clube Decathlon', 'club'] },
  { img: produtoSaco, name: 'Saco-cama de campismo Arpenaz 20°', price: 'R$ 99,99', badge: null },
]

// "Confira outros benefícios": two rows that scroll sideways together; wide cards span two columns.
const PERKS: [string, string, boolean][][] = [
  [['coin', 'Cashback', true], ['bike', '1º revisão da Bike', false], ['ball-tennis', 'Encordoamento de raquete', false], ['star', 'Acesso exclusivo a eventos', true], ['arrows-exchange', 'Troca estendida e sem cupom', false], ['sparkles', 'Sorteios dedicados', false]],
  [['package', 'Frete Grátis', false], ['gift', 'Desconto de aniversário', false], ['tools', 'Desconto na oficina', true], ['building-store', 'Evento em lojas', false], ['trophy', 'Dicas de esportes', false], ['shirt', 'Divulgação de lançamentos', true]],
]

const PRO_VALUES: [string, string | null][] = [['Cashback de 5%', '60 dias de uso'], ['Frete grátis', 'Acima de R$ 200'], ['Desconto de aniversário', '5% OFF'], ['Eventos pagos', null]]
const PRO_VALUES_MEMBER: [string, string | null][] = [['Cashback', '5% (60 dias)'], ['Frete grátis', 'Acima de R$ 200'], ['Desconto de aniversário', '5%'], ['Eventos pagos', null]]
const PRO_INCLUDED = ['Descontos exclusivos', 'Descontos na oficina', '1º Revisão da Bike', 'Encordoamento de raquete', 'Troca estendida e sem cupom', 'Convite para evento em lojas', 'Dicas de esportes', 'Divulgação antecipada de lançamentos']

// Member hero: three campaign slides that advance on their own (see the mount).
const MEMBER_SLIDES: [string, string][] = [
  [memberHero1, 'Tenista em quadra. Estamos com você a cada conquista'],
  [memberHero2, 'Alpinista no alto da montanha. A cada vitória um novo benefício'],
  [memberHero3, 'Atleta escalando. É hora de ir para o próximo level'],
]

const progress = (label: string) => `<div class="dkt-progress" aria-hidden="true" data-dkt-progress="${label}"><span></span></div>`
const included = `${ti('circle-check')}<span class="dkt-sr">Incluso</span>`
const notIncluded = `${ti('circle-x')}<span class="dkt-sr">Não incluso</span>`

/* Sections shared by both Clube variants */

function clubeHeader(s: State) {
  return `<header class="dkt-bar">
      <h1 class="dkt-bar__title" id="dkt-clube-title" tabindex="-1">Clube Decathlon</h1>
      <span class="dkt-bar__actions">
        <button type="button" class="dkt-icon-btn dkt-bell" data-dkt="soon" aria-label="Notificações, 3 novas">${ti('bell')}<span class="dkt-bell__badge" aria-hidden="true">3</span></button>
        <button type="button" class="dkt-icon-btn" data-dkt="entrar" aria-label="${s.signedIn ? 'Minha conta' : 'Entrar ou cadastrar'}">${ti('user')}</button>
      </span>
    </header>`
}

function perksRail() {
  const card = ([icon, label, wide]: [string, string, boolean]) =>
    `<button type="button" class="dkt-perk${wide ? ' dkt-perk--wide' : ''}" data-dkt="soon">${ti(icon)}<span>${label}</span>${ti('chevron-right')}</button>`
  return `<div class="dkt-rail dkt-perks" data-dkt-rail="perks">${PERKS.map(row => `<div class="dkt-perks__row">${row.map(card).join('')}</div>`).join('')}</div>
      ${progress('perks')}`
}

function productsSection() {
  return `<h2 class="dkt-sec-title">Preços exclusivos<br />do <strong>Clube Decathlon</strong></h2>
      <div class="dkt-rail dkt-rail--products" data-dkt-rail="products">${PRODUCTS.map(p =>
        `<button type="button" class="dkt-product" data-dkt="soon"><span class="dkt-product__img"><img src="${p.img}" alt="" />${p.badge ? `<span class="dkt-product__badge dkt-product__badge--${p.badge[1]}">${p.badge[0]}</span>` : ''}</span><span class="dkt-product__name">${p.name}</span><span class="dkt-product__price">${p.price}</span></button>`).join('')}</div>
      ${progress('products')}
      <button type="button" class="dkt-outline-pill" data-dkt="soon">Ver todos os produtos</button>`
}

function levelSection(member: boolean) {
  const values = member ? PRO_VALUES_MEMBER : PRO_VALUES
  return `<h2 class="dkt-sec-title dkt-sec-title--level"><strong>Avance de nível</strong><br />e ganhe novos benefícios!</h2>
      <div class="dkt-level-tabs" role="tablist" aria-label="Níveis do Clube">${(Object.keys(TIERS) as Tier[]).map(t =>
        `<button type="button" class="dkt-level-tab" role="tab" aria-selected="${t === 'pro'}"${t === 'pro' ? '' : ' data-dkt="soon"'}>${TIERS[t][0]}</button>`).join('')}</div>
      <div class="dkt-level" role="tabpanel" aria-label="Nível Pro">
        <div class="dkt-level__head">${medal('pro', 'dkt-medal--lg')}<span class="dkt-level__here">Você começa aqui</span></div>
        <h3 class="dkt-level__name">PRO</h3>
        ${member
          ? `<p class="dkt-level__lead">Comprou entrou.</p><p class="dkt-level__note">A partir da sua primeira compra,<br />você já faz parte do <strong>Clube Decathlon.</strong></p>`
          : `<p class="dkt-level__note"><strong>Comprou, entrou!</strong> A partir da sua primeira compra, você já faz parte do Clube</p>`}
        <h3 class="dkt-level__sub">Benefícios exclusivos</h3>
        <dl class="dkt-level__values${member ? ' dkt-level__values--checked' : ''}">${values.map(([k, v]) =>
          `<div><dt>${k}</dt><dd>${v === null ? notIncluded : member ? `<span>${v}</span>${included}` : v}</dd></div>`).join('')}</dl>
        <ul class="dkt-level__list">${PRO_INCLUDED.map(k => `<li><span>${k}</span>${included}</li>`).join('')}</ul>
        <div class="dkt-progress dkt-progress--static" aria-hidden="true"><span></span></div>
        <p class="dkt-level__foot">* Período do gasto ou número de compras: 12 meses.</p>
      </div>
      <button type="button" class="dkt-cta dkt-cta--block" data-dkt="entrar">Me tornar membro clube</button>
      <button type="button" class="dkt-faq" data-dkt="soon">${ti('help-circle')}<span>Dúvidas frequentes</span>${ti('chevron-right')}</button>`
}

function clube(s: State, behind = false) {
  const body = s.signedIn ? clubeMember(s) : clubeGuest()
  return `<section class="dkt-screen dkt-clube" aria-labelledby="dkt-clube-title"${behind ? ' inert' : ''}>
    ${clubeHeader(s)}
    <div class="dkt-clube__scroll" data-dkt-scroll>
      <p class="dkt-ribbon${s.signedIn ? ' dkt-ribbon--light' : ''}">O Clube está de cara nova, confira!</p>
      ${body}
    </div>
    ${tabBar(s.signedIn)}
  </section>`
}

function clubeGuest() {
  return `<div class="dkt-hero">
        <img src="${clubeHero}" alt="Atleta pulando em trilha na montanha. Eleve o jogo com Clube Decathlon. Entre jogando no 1º Nível e já tem benefícios para aproveitar." />
        <button type="button" class="dkt-cta dkt-hero__cta" data-dkt="entrar">Me tornar membro clube</button>
      </div>

      <h2 class="dkt-sec-title dkt-sec-title--center">Quanto mais você compra mais benefícios ganha!</h2>
      <ul class="dkt-tiers">${(Object.keys(TIERS) as Tier[]).map(t => `<li>${medal(t)}<span>${TIERS[t][0]}</span></li>`).join('')}</ul>

      <h2 class="dkt-sec-title">Ganhe descontos e <strong>benefícios exclusivos.</strong></h2>
      <div class="dkt-rail dkt-rail--offers" data-dkt-rail="offers">${OFFERS.map(([img, alt]) =>
        `<button type="button" class="dkt-offer" data-dkt="soon"><img src="${img}" alt="${alt}. Saiba mais" /></button>`).join('')}</div>
      ${progress('offers')}

      ${productsSection()}

      <h2 class="dkt-sec-title">Confira outros benefícios</h2>
      ${perksRail()}

      ${levelSection(false)}`
}

// Logged-in Clube: greeting, cashback and progress to the next level, then the shared sections.
function clubeMember(s: State) {
  return `<div class="dkt-rail dkt-slides" data-dkt-rail="slides" data-dkt-slides aria-roledescription="carrossel" aria-label="Campanhas do Clube">${MEMBER_SLIDES.map(([img, alt], i) =>
        `<img src="${img}" alt="${alt}" aria-roledescription="slide" aria-label="${i + 1} de ${MEMBER_SLIDES.length}" />`).join('')}</div>
      <div class="dkt-hello">
        <p class="dkt-hello__name">Olá, Raul!</p>
        <p class="dkt-hello__tier">Nível Pro</p>
      </div>
      <div class="dkt-status-card">
        <div class="dkt-status-card__cash">
          <p><span>Cashback disponível</span><strong>R$ 4,00</strong></p>
          <svg class="dkt-cash-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M25.2 9.2A12 12 0 1 0 28 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M28.6 7.4 25.6 9.8l-3-2.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 11.6c-.6-1.2-1.9-1.9-3.4-1.9-2 0-3.4 1.1-3.4 2.7 0 3.7 7 1.9 7 5.7 0 1.6-1.6 2.8-3.6 2.8-1.6 0-3-.7-3.6-2M16 7.8v2M16 20.9v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </div>
        <div class="dkt-status-card__level">
          <div class="dkt-meter__labels"><span class="dkt-meter__from">Pro</span><strong>50%</strong><span class="dkt-meter__to">Elite</span></div>
          <div class="dkt-meter" role="progressbar" aria-label="Progresso para o nível Elite" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            ${medal('pro')}<span class="dkt-meter__track"><span class="dkt-meter__fill"></span><span class="dkt-meter__thumb"></span></span>${medal('locked')}
          </div>
          <div class="dkt-details" id="dkt-details" hidden>
            <p class="dkt-details__lead">Faltam <strong>R$583,00</strong> ou <strong>2 compras</strong><br />para você subir de nível*</p>
            <dl class="dkt-details__box">
              <div><dt>Compras</dt><dd><span class="dkt-steps" aria-hidden="true"><i class="is-on"></i><i class="is-on"></i><i></i><i></i></span><span>2 de 4</span></dd></div>
              <div><dt>Valor gasto</dt><dd><span class="dkt-spend" aria-hidden="true"><i></i></span><span>R$ 417 de 1.000</span></dd></div>
            </dl>
            <p class="dkt-details__note">*Seu progresso é calculado com base a cada compra ou valor gasto em 12 meses.<br /><strong>Continue acumulando!</strong></p>
            <p class="dkt-details__expire"><strong>-05%</strong>1 compra expira em <b>20 dias</b>.</p>
          </div>
          <button type="button" class="dkt-details__toggle" data-dkt="details" aria-expanded="false" aria-controls="dkt-details"><span>Ver mais detalhes</span>${ti('chevron-down')}</button>
        </div>
      </div>

      <div class="dkt-perks-banner">
        <img src="${memberPerks}" alt="Pai e filho pedalando juntos" />
        <p>Os melhores benefícios, você encontra aqui</p>
      </div>
      ${perksRail()}

      ${productsSection()}

      ${levelSection(true)}`
}

// Home header seen dimmed behind the sign-in sheets.
function dimmedHeader() {
  return `<div class="dkt-behind" aria-hidden="true">
      <span class="dkt-behind__cep">${ti('truck-delivery')}06414-000${ti('chevron-right')}</span>
      <span class="dkt-behind__icons"><span class="dkt-bolt">${ti('bolt')}</span>${ti('user')}</span>
    </div>
    <button type="button" class="dkt-scrim" data-dkt="close" aria-label="Fechar e voltar ao Clube" tabindex="-1"></button>`
}

function entrar() {
  return `<section class="dkt-screen dkt-sheet-screen" aria-labelledby="dkt-entrar-title">
    ${dimmedHeader()}
    <div class="dkt-sheet dkt-sheet--entrar" role="dialog" aria-modal="true" aria-labelledby="dkt-entrar-title">
      <div class="dkt-entrar__hero">
        <img src="${entrarHero}" alt="" />
        <h1 class="dkt-sr" id="dkt-entrar-title" tabindex="-1">Eleve o jogo com Decathlon Clube</h1>
        <button type="button" class="dkt-close" data-dkt="close" aria-label="Fechar">${ti('x')}</button>
      </div>
      <p class="dkt-cashback">Cashback de 5% em produtos Decathlon</p>
      <div class="dkt-entrar__actions">
        <button type="button" class="dkt-btn dkt-btn--black" data-dkt="login">Fazer login ou cadastro</button>
        <button type="button" class="dkt-btn dkt-btn--outline" data-dkt="soon">${ti('headphones')}Preciso de ajuda</button>
        <p class="dkt-legal-links"><button type="button" data-dkt="soon">Lojas Decathlon</button><span aria-hidden="true">|</span><button type="button" data-dkt="soon">Termos e políticas</button></p>
      </div>
    </div>
  </section>`
}

function login(s: State) {
  const err = s.emailError
  return `<section class="dkt-screen dkt-sheet-screen" aria-labelledby="dkt-login-title">
    ${dimmedHeader()}
    <div class="dkt-sheet dkt-sheet--form" role="dialog" aria-modal="true" aria-labelledby="dkt-login-title">
      ${logo('dkt-logo--sheet')}
      <h1 class="dkt-h1" id="dkt-login-title" tabindex="-1">Login</h1>
      <form class="dkt-form" data-dkt-form="login" novalidate>
        <label class="dkt-label" for="dkt-email">Digite seu email</label>
        <input class="dkt-input${err ? ' is-error' : ''}" id="dkt-email" type="email" inputmode="email" autocomplete="email" placeholder="Email" value="${esc(s.email)}"${err ? ' aria-invalid="true" aria-describedby="dkt-email-err"' : ''} />
        ${err ? `<p class="dkt-error" id="dkt-email-err">${ti('alert-circle')}${err}</p>` : ''}
        <button type="submit" class="dkt-btn dkt-btn--primary">Prosseguir</button>
      </form>
      <div class="dkt-social">
        <button type="button" class="dkt-btn dkt-btn--social" data-dkt="soon">${GOOGLE}Continuar com Google</button>
        <button type="button" class="dkt-btn dkt-btn--social" data-dkt="soon"><span class="dkt-fb">${ti('brand-facebook')}</span>Continuar com Facebook</button>
        <button type="button" class="dkt-btn dkt-btn--social dkt-btn--apple" data-dkt="soon">${ti('brand-apple')}Continuar com Apple</button>
      </div>
      <h2 class="dkt-h3">Não tem conta? Crie uma!</h2>
      <button type="button" class="dkt-link" data-dkt="soon">Criar uma conta</button>
      <h2 class="dkt-h3">Benefícios de fazer o login</h2>
      <ul class="dkt-benefits"><li>${ti('circle-check')}7 dias de devolução para produtos Decathlon</li></ul>
    </div>
  </section>`
}

function codigo(s: State) {
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => s.code[i] ?? '')
  const done = s.code.length === CODE_LENGTH
  return `<section class="dkt-screen dkt-sheet-screen" aria-labelledby="dkt-code-title">
    ${dimmedHeader()}
    <div class="dkt-sheet dkt-sheet--form" role="dialog" aria-modal="true" aria-labelledby="dkt-code-title">
      ${logo('dkt-logo--sheet')}
      <h1 class="dkt-h1 dkt-h1--code" id="dkt-code-title" tabindex="-1">Olá Esportista</h1>
      <p class="dkt-text">Digite o código de verificação de 6 dígitos que foi enviado por e-mail para:</p>
      <p class="dkt-email-row"><span>${esc(s.email)}</span><button type="button" class="dkt-link dkt-link--dark" data-dkt="login">Modificar</button></p>
      <p class="dkt-info" role="status" data-dkt-resend>${resendText(s)}</p>
      <form data-dkt-form="codigo" novalidate>
        <fieldset class="dkt-code">
          <legend class="dkt-sr">Código de verificação</legend>
          ${digits.map((d, i) => `<input class="dkt-code__box" data-dkt-digit="${i}" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="${i ? 'off' : 'one-time-code'}" aria-label="Dígito ${i + 1} de ${CODE_LENGTH}" value="${d}" />`).join('')}
        </fieldset>
        <button type="submit" class="dkt-btn dkt-btn--primary"${done ? '' : ' disabled'}>Prosseguir</button>
      </form>
      <p class="dkt-foot-links"><button type="button" data-dkt="soon">Ajuda</button><button type="button" data-dkt="soon">Políticas de Privacidade</button></p>
      <p class="dkt-lang"><svg class="dkt-flag" viewBox="0 0 30 21" aria-hidden="true" focusable="false"><rect width="30" height="21" fill="#009B3A"/><path d="M15 2.5 27.5 10.5 15 18.5 2.5 10.5z" fill="#FEDF00"/><circle cx="15" cy="10.5" r="4.6" fill="#002776"/></svg>Português</p>
      <p class="dkt-recaptcha">Este site encontra-se protegido com reCAPTCHA. A Política de Privacidade do Google se aplica, bem como seus termos de serviço.</p>
    </div>
  </section>`
}

const resendText = (s: State) => s.resendIn > 0
  ? `${ti('info-circle')}<span>O código será enviado em ${s.resendIn} segundo${s.resendIn === 1 ? '' : 's'}</span>`
  : `${ti('mail-check')}<span>Código enviado. Confira sua caixa de entrada.</span>`

function esc(v: string) {
  return v.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

/* ---------------- Mount ---------------- */

export function mountDecathlonApp(el: HTMLElement, opts: { onChange?: (screen: DktScreen) => void; island?: boolean } = {}): DktApp {
  const s: State = { screen: 'splash', email: '', emailError: '', code: '', resendIn: RESEND_SECONDS, signedIn: false, clubeScroll: 0 }
  let splashTimer = 0, resendTimer = 0, snackTimer = 0
  // Member hero slides advance every few seconds unless someone is on them.
  const slidesTimer = window.setInterval(() => {
    const rail = view.querySelector<HTMLElement>('.dkt-screen:not([inert]) [data-dkt-slides]')
    if (!rail || rail.matches(':hover, :focus-within') || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const next = Math.round(rail.scrollLeft / rail.clientWidth) + 1
    rail.scrollTo({ left: next >= rail.children.length ? 0 : next * rail.clientWidth, behavior: 'smooth' })
  }, 4500)

  el.innerHTML = `<div class="dkt-app" role="region" aria-label="Protótipo do app Decathlon">
      <div class="dkt-status" aria-hidden="true"><span>9:41</span><span class="dkt-status__icons">${ti('antenna-bars-4')}${ti('wifi')}${ti('battery-3')}</span></div>
      <div class="dkt-view" data-dkt-view></div>
      <div class="dkt-snack" role="status" aria-live="polite" data-dkt-snack></div>
      <span class="dkt-home-indicator" aria-hidden="true"></span>${opts.island ? '<span class="dkt-island" aria-hidden="true"></span>' : ''}
    </div>`
  const app = el.querySelector<HTMLElement>('.dkt-app')!
  const view = el.querySelector<HTMLElement>('[data-dkt-view]')!
  const snackEl = el.querySelector<HTMLElement>('[data-dkt-snack]')!

  // Carousel progress bars: thumb width = visible share, offset = scroll share.
  const syncProgress = (rail: HTMLElement) => {
    const bar = view.querySelector<HTMLElement>(`[data-dkt-progress="${rail.dataset.dktRail}"] span`)
    if (!bar || !rail.scrollWidth) return
    // Nothing to scroll (e.g. two products): no bar.
    bar.parentElement!.hidden = rail.scrollWidth <= rail.clientWidth + 1
    bar.style.width = `${(rail.clientWidth / rail.scrollWidth) * 100}%`
    bar.style.left = `${(rail.scrollLeft / rail.scrollWidth) * 100}%`
  }
  app.addEventListener('scroll', e => {
    if (e.target instanceof HTMLElement && e.target.matches('[data-dkt-rail]')) syncProgress(e.target)
  }, true)

  const render = (moveFocus: boolean, from?: DktScreen) => {
    const sheet = s.screen === 'entrar' || s.screen === 'login' || s.screen === 'codigo'
    // Sheets sit over the Clube screen, which stays visible (and inert) behind the scrim;
    // its scroll position survives opening and closing them.
    const scroller = view.querySelector<HTMLElement>('[data-dkt-scroll]')
    if (scroller) s.clubeScroll = scroller.scrollTop
    view.innerHTML = (sheet ? clube(s, true) : '') + ({ splash, clube, entrar, login, codigo }[s.screen])(s)
    app.dataset.screen = s.screen
    const next = view.querySelector<HTMLElement>('[data-dkt-scroll]')
    if (next) next.scrollTop = s.clubeScroll
    view.querySelectorAll<HTMLElement>('[data-dkt-rail]').forEach(syncProgress)
    app.dataset.statusDark = String(s.screen !== 'splash')
    // Only the sheet's first appearance slides up; moving between sheets swaps in place.
    const fromSheet = from === 'entrar' || from === 'login' || from === 'codigo'
    view.lastElementChild?.setAttribute('data-enter', sheet && !fromSheet ? 'up' : 'fade')
    if (moveFocus) {
      const target = s.screen === 'login' && s.emailError ? view.querySelector<HTMLElement>('#dkt-email')
        : s.screen === 'codigo' ? view.querySelector<HTMLElement>(`[data-dkt-digit="${Math.min(s.code.length, CODE_LENGTH - 1)}"]`)
        : view.querySelector<HTMLElement>('.dkt-screen:not([inert]) [tabindex="-1"]')
      target?.focus({ preventScroll: true })
    }
  }

  const go = (screen: DktScreen, moveFocus = true) => {
    const from = s.screen
    clearTimeout(splashTimer); clearInterval(resendTimer)
    s.screen = screen
    if (screen === 'splash') {
      Object.assign(s, { email: '', emailError: '', code: '', signedIn: false, clubeScroll: 0 })
      splashTimer = window.setTimeout(() => go('clube', false), SPLASH_MS)
    }
    if (screen === 'codigo') {
      if (!s.email) s.email = 'esportista@email.com'
      s.code = ''; s.resendIn = RESEND_SECONDS
      resendTimer = window.setInterval(() => {
        s.resendIn = Math.max(0, s.resendIn - 1)
        const box = view.querySelector<HTMLElement>('[data-dkt-resend]')
        if (box) box.innerHTML = resendText(s)
        if (!s.resendIn) clearInterval(resendTimer)
      }, 1000)
    }
    render(moveFocus, from)
    opts.onChange?.(screen)
  }

  const snack = (msg: string) => {
    clearTimeout(snackTimer)
    snackEl.textContent = msg
    snackEl.classList.add('is-on')
    snackTimer = window.setTimeout(() => snackEl.classList.remove('is-on'), 2200)
  }

  const onClick = (e: MouseEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-dkt]')
    if (!t) return
    const action = t.dataset.dkt!
    if (action === 'next') go('clube')
    else if (action === 'entrar') s.signedIn ? snack('Você já está no Clube') : go('entrar')
    else if (action === 'close') go('clube')
    else if (action === 'login') { s.emailError = ''; go('login') }
    else if (action === 'soon') snack('Fora do fluxo deste protótipo')
    else if (action === 'details') {
      // Expands in place, so the Clube keeps its scroll position.
      const open = t.getAttribute('aria-expanded') !== 'true'
      t.setAttribute('aria-expanded', String(open))
      t.innerHTML = `<span>${open ? 'Esconder' : 'Ver mais detalhes'}</span>${ti(open ? 'chevron-up' : 'chevron-down')}`
      view.querySelector<HTMLElement>('#dkt-details')!.hidden = !open
    }
  }

  const onSubmit = (e: SubmitEvent) => {
    const form = (e.target as HTMLElement).closest<HTMLFormElement>('[data-dkt-form]')
    if (!form) return
    e.preventDefault()
    if (form.dataset.dktForm === 'login') {
      s.email = view.querySelector<HTMLInputElement>('#dkt-email')!.value.trim()
      s.emailError = !s.email ? 'Digite seu email' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email) ? '' : 'Digite um email válido'
      s.emailError ? render(true) : go('codigo')
    } else if (s.code.length === CODE_LENGTH) {
      s.signedIn = true
      s.clubeScroll = 0
      go('clube')
      snack('Login concluído. Boas-vindas ao Clube!')
    }
  }

  // Code boxes: one digit each, auto-advance, backspace goes back, paste fills all.
  const setCode = (code: string, focusAt: number) => {
    s.code = code.replace(/\D/g, '').slice(0, CODE_LENGTH)
    view.querySelectorAll<HTMLInputElement>('[data-dkt-digit]').forEach((b, i) => { b.value = s.code[i] ?? '' })
    view.querySelector<HTMLButtonElement>('[data-dkt-form="codigo"] [type="submit"]')!.disabled = s.code.length < CODE_LENGTH
    view.querySelector<HTMLElement>(`[data-dkt-digit="${Math.min(focusAt, CODE_LENGTH - 1)}"]`)?.focus()
  }
  const onInput = (e: Event) => {
    const box = (e.target as HTMLElement).closest<HTMLInputElement>('[data-dkt-digit]')
    if (!box) return
    const i = Number(box.dataset.dktDigit)
    const typed = box.value.replace(/\D/g, '')
    if (typed.length > 1) return setCode(s.code.slice(0, i) + typed, i + typed.length)
    const chars = s.code.padEnd(CODE_LENGTH, ' ').split('')
    chars[i] = typed || ' '
    setCode(chars.join('').trimEnd().replace(/ /g, ''), typed ? i + 1 : i)
  }
  const onKey = (e: KeyboardEvent) => {
    const box = (e.target as HTMLElement).closest<HTMLInputElement>('[data-dkt-digit]')
    if (box && e.key === 'Backspace' && !box.value) {
      const i = Number(box.dataset.dktDigit)
      if (i > 0) { e.preventDefault(); setCode(s.code.slice(0, i - 1) + s.code.slice(i), i - 1) }
    }
    if (e.key === 'Escape' && ['entrar', 'login', 'codigo'].includes(s.screen)) go('clube')
  }

  app.addEventListener('click', onClick)
  app.addEventListener('submit', onSubmit)
  app.addEventListener('input', onInput)
  app.addEventListener('keydown', onKey)
  go('splash', false)

  return {
    go,
    restart: () => go('splash'),
    get screen() { return s.screen },
    destroy: () => { clearInterval(slidesTimer); clearTimeout(splashTimer); clearInterval(resendTimer); clearTimeout(snackTimer); el.innerHTML = '' },
  }
}
