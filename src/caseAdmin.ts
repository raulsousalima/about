import {
  ALL_CASES,
  canManageView,
  getIsAdmin,
  isHidden,
  isRestricted,
  setFlag,
  type CaseFlag,
  signInWithPassword,
  signOut,
  onAccessChange,
} from './caseAccess'
import { ALLOWED_EMAIL as ADMIN_EMAIL } from './supabase'

const CASE_NAMES: Record<string, string> = {
  pernambucanas: 'Pernambucanas',
  decathlon: 'Decathlon',
  nofrictionai: 'No Friction AI',
  daycoval: 'Banco Daycoval',
  starbem: 'Starbem',
  pefisa: 'Pefisa',
}

export function initCaseAdmin(): void {
  const tabs = document.getElementById('cases-tabs')
  const tabProjetos = document.getElementById('cases-tab-projetos')
  const tabGerenciar = document.getElementById('cases-tab-gerenciar')
  const grid = document.getElementById('cases-grid')
  const panel = document.getElementById('cases-admin')
  if (!tabs || !tabProjetos || !tabGerenciar || !grid || !panel) return

  function setActiveTab(which: 'projetos' | 'gerenciar') {
    const active = 'bg-black text-white'
    const idle = 'text-text-muted-light'
    if (which === 'gerenciar') {
      grid!.classList.add('hidden')
      panel!.classList.remove('hidden')
      tabGerenciar!.className = tabBtnClass(active)
      tabProjetos!.className = tabBtnClass(idle)
      renderPanel()
    } else {
      panel!.classList.add('hidden')
      grid!.classList.remove('hidden')
      tabProjetos!.className = tabBtnClass(active)
      tabGerenciar!.className = tabBtnClass(idle)
    }
  }

  tabProjetos.addEventListener('click', () => setActiveTab('projetos'))
  tabGerenciar.addEventListener('click', () => setActiveTab('gerenciar'))

  function refreshTabsVisibility() {
    tabs!.classList.toggle('hidden', !canManageView())
    tabs!.classList.toggle('flex', canManageView())
    // If the manage view is no longer allowed, fall back to the grid.
    if (!canManageView() && !panel!.classList.contains('hidden')) setActiveTab('projetos')
    // Keep the panel fresh if it is open.
    if (!panel!.classList.contains('hidden')) renderPanel()
  }

  function renderPanel() {
    panel!.innerHTML = getIsAdmin() ? adminMarkup() : loginMarkup()
    if (getIsAdmin()) wireToggles()
    else wireLogin()
  }

  function wireLogin() {
    const form = panel!.querySelector<HTMLFormElement>('#admin-login-form')
    const email = panel!.querySelector<HTMLInputElement>('#admin-login-email')
    const pass = panel!.querySelector<HTMLInputElement>('#admin-login-pass')
    const status = panel!.querySelector<HTMLElement>('#admin-login-status')
    const btn = panel!.querySelector<HTMLButtonElement>('#admin-login-btn')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const em = (email?.value || '').trim()
      const pw = pass?.value || ''
      if (!em || !pw) return
      if (btn) { btn.disabled = true; btn.textContent = 'Entrando…' }
      const res = await signInWithPassword(em, pw)
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar' }
      if (!res.ok && status) {
        status.textContent = res.message
        status.className = 'text-sm mt-3 text-red-600'
      }
      // On success, onAccessChange re-renders the panel into the toggle list.
    })
  }

  function wireToggles() {
    panel!.querySelectorAll<HTMLInputElement>('input[data-toggle-slug]').forEach((cb) => {
      cb.addEventListener('change', async () => {
        const slug = cb.getAttribute('data-toggle-slug')!
        const flag = cb.getAttribute('data-toggle-flag') as CaseFlag
        const wanted = cb.checked // checked = flag on
        cb.disabled = true
        const ok = await setFlag(slug, flag, wanted)
        cb.disabled = false
        if (!ok) {
          cb.checked = !wanted // revert on failure
          flashError(cb)
        }
        // On success, onAccessChange re-renders the panel with the new state.
      })
    })
    panel!.querySelector<HTMLButtonElement>('#admin-logout-btn')?.addEventListener('click', async () => {
      await signOut()
    })
  }

  onAccessChange(refreshTabsVisibility)
  refreshTabsVisibility()
}

function tabBtnClass(state: string): string {
  return `px-4 py-2 rounded-full text-sm font-medium transition-all ${state}`
}

function loginMarkup(): string {
  return `
    <div class="max-w-md rounded-2xl border border-black/10 bg-white p-8">
      <h3 class="font-serif text-xl font-bold mb-2" style="color:#111">Gerenciar cases</h3>
      <p class="text-sm text-text-muted-light mb-6">Entre com seu e-mail e senha de administrador para ativar ou desativar os cases restritos.</p>
      <form id="admin-login-form">
        <input id="admin-login-email" type="email" required value="${ADMIN_EMAIL}" autocomplete="username"
          class="w-full px-4 py-3 rounded-full border border-black/15 text-sm mb-3 focus:outline-none focus:border-black" />
        <input id="admin-login-pass" type="password" required placeholder="Senha" autocomplete="current-password"
          class="w-full px-4 py-3 rounded-full border border-black/15 text-sm mb-4 focus:outline-none focus:border-black" />
        <button id="admin-login-btn" type="submit"
          class="px-6 py-3 rounded-full bg-black text-white text-sm font-semibold hover:opacity-90 transition-all">Entrar</button>
        <p id="admin-login-status" class="text-sm mt-3"></p>
      </form>
    </div>`
}

function adminMarkup(): string {
  const rows = ALL_CASES.map((slug) => {
    const name = CASE_NAMES[slug] || slug
    const state = isHidden(slug) ? 'Oculto' : isRestricted(slug) ? 'Restrito' : 'Público'
    return `
      <div class="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-black/08 last:border-0">
        <span class="inline-flex items-center gap-3">
          <span class="text-base font-medium" style="color:#111">${name}</span>
          <span class="text-xs uppercase tracking-widest text-text-muted-light" data-state-for="${slug}">${state}</span>
        </span>
        <span class="inline-flex items-center gap-5">
          ${toggleMarkup(slug, 'restricted', 'Restrito', isRestricted(slug))}
          ${toggleMarkup(slug, 'hidden', 'Oculto', isHidden(slug))}
        </span>
      </div>`
  }).join('')
  return `
    <div class="max-w-xl rounded-2xl border border-black/10 bg-white p-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-serif text-xl font-bold" style="color:#111">Gerenciar cases</h3>
        <button id="admin-logout-btn" class="text-sm text-text-muted-light hover:text-black transition-colors underline underline-offset-4">Sair</button>
      </div>
      <p class="text-sm text-text-muted-light mb-2"><strong>Restrito</strong>: escondido do acesso normal; aparece com o link <code>?preview=rl-cases</code> ou logado aqui.</p>
      <p class="text-sm text-text-muted-light mb-4"><strong>Oculto</strong>: rascunho; não aparece para ninguém, nem com o link de preview. Só você vê, logado aqui. Vale para todos os visitantes.</p>
      <div>${rows}</div>
    </div>`
}

function toggleMarkup(slug: string, flag: CaseFlag, label: string, on: boolean): string {
  return `
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" data-toggle-slug="${slug}" data-toggle-flag="${flag}" ${on ? 'checked' : ''}
        class="h-5 w-5 accent-black cursor-pointer" />
      <span class="text-sm text-text-muted-light">${label}</span>
    </label>`
}

function flashError(cb: HTMLInputElement) {
  const slug = cb.getAttribute('data-toggle-slug')
  const state = document.querySelector(`[data-state-for="${slug}"]`) as HTMLElement | null
  if (state) {
    const prev = state.textContent
    state.textContent = 'Erro ao salvar'
    state.classList.add('text-red-600')
    setTimeout(() => { state.textContent = prev; state.classList.remove('text-red-600') }, 2000)
  }
}
