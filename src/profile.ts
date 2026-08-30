import { supabase, ALLOWED_EMAIL } from './supabase'
import type { Session } from '@supabase/supabase-js'
import { especialistaData, coordenadorData, defaultLetterData } from './profileDefaults'
import type { ResumeData, LetterData } from './profileDefaults'

type Lang = 'pt' | 'en'
type Style = 'linkedin' | 'ats'
type Tab = 'profile' | 'carta' | 'links'
type Localized = { pt: string; en: string }
type Experience = ResumeData['experience'][number]

/* ─── State ──────────────────────────────────────────────────────────── */

const state = {
  lang:       (localStorage.getItem('cv:lang')   as Lang)  || 'pt',
  style:      (localStorage.getItem('cv:style')  as Style) || 'linkedin',
  tab:        (localStorage.getItem('cv:tab')    as Tab)   || 'profile',
  resumeKey:  localStorage.getItem('cv:key')   || 'especialista',
  letterKey:  localStorage.getItem('cv:lkey')  || 'carta-padrao',
  resumes:    new Map<string, { id?: string; profile_key: string; profile_name: string; data: ResumeData }>(),
  letters:    new Map<string, { id?: string; profile_key: string; profile_name: string; data: LetterData }>(),
  session:    null as Session | null,
  dirty:      false,
}

const DEFAULT_RESUMES = [
  { key: 'especialista', name: 'Especialista', seed: especialistaData },
  { key: 'coordenador',  name: 'Coordenador',  seed: coordenadorData  },
]
const DEFAULT_LETTERS = [
  { key: 'carta-padrao', name: 'Padrão', seed: defaultLetterData },
]

/* ─── Auth ───────────────────────────────────────────────────────────── */

async function bootstrap() {
  const { data } = await supabase.auth.getSession()
  handleSession(data.session)
  supabase.auth.onAuthStateChange((_e, s) => handleSession(s))
}

function handleSession(session: Session | null) {
  state.session = session
  const auth   = document.getElementById('auth-screen')!
  const editor = document.getElementById('editor-screen')!
  if (session && session.user.email === ALLOWED_EMAIL) {
    auth.classList.add('hidden')
    editor.classList.remove('hidden')
    loadAll()
  } else {
    auth.classList.remove('hidden')
    editor.classList.add('hidden')
    if (session) { supabase.auth.signOut(); setMsg('Este email não tem acesso.') }
  }
}

function setMsg(t: string) {
  const el = document.getElementById('auth-msg')
  if (el) el.textContent = t
}

function initAuthForm() {
  const form = document.getElementById('auth-form') as HTMLFormElement
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email    = (document.getElementById('auth-email')    as HTMLInputElement).value.trim()
    const password = (document.getElementById('auth-password') as HTMLInputElement).value
    const action   = (e.submitter as HTMLButtonElement | null)?.dataset.action || 'signin'
    if (action === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message)
    } else {
      await sendMagicLink(email)
    }
  })
  document.querySelector<HTMLButtonElement>('[data-action="magic"]')!.addEventListener('click', async () => {
    const email = (document.getElementById('auth-email') as HTMLInputElement).value.trim()
    if (!email) return setMsg('Informe o email.')
    await sendMagicLink(email)
  })
}

async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } })
  if (error) setMsg(error.message); else setMsg('Verifique seu email para o link mágico.')
}

/* ─── Data loading ───────────────────────────────────────────────────── */

async function loadAll() {
  const { data, error } = await supabase.from('resumes').select('*').order('profile_name')
  if (error) return setSaveStatus('Erro ao carregar: ' + error.message)

  state.resumes.clear()
  state.letters.clear()

  for (const row of (data || [])) {
    if (row.data?.kind === 'letter') {
      const ld = row.data as any
      if (Array.isArray(ld.paragraphs) && !ld.body) {
        ld.body = { pt: ld.paragraphs.map((p: any) => p.pt || '').join('\n\n'), en: ld.paragraphs.map((p: any) => p.en || '').join('\n\n') }
        delete ld.paragraphs
      }
      state.letters.set(row.profile_key, { id: row.id, profile_key: row.profile_key, profile_name: row.profile_name, data: ld as LetterData })
    } else {
      const rd = { ...emptyResume(), ...row.data } as ResumeData
      migrateExperienceLocation(rd)
      state.resumes.set(row.profile_key, { id: row.id, profile_key: row.profile_key, profile_name: row.profile_name, data: rd })
    }
  }

  for (const p of DEFAULT_RESUMES) {
    if (!state.resumes.has(p.key)) state.resumes.set(p.key, { profile_key: p.key, profile_name: p.name, data: p.seed() })
  }
  for (const p of DEFAULT_LETTERS) {
    if (!state.letters.has(p.key)) state.letters.set(p.key, { profile_key: p.key, profile_name: p.name, data: p.seed() })
  }

  if (!state.resumes.has(state.resumeKey)) state.resumeKey = state.resumes.keys().next().value!
  if (!state.letters.has(state.letterKey)) state.letterKey = state.letters.keys().next().value!

  renderAll()
}

// Experience.location used to be a single string, so a stored row could render
// "São Paulo, Brazil · Presencial" inside an English CV. Split it per language on
// load, translating the work-model suffix so existing rows come out right in
// English without hand-editing every entry.
const WORK_MODEL: Record<string, string> = { 'Presencial': 'On-site', 'Híbrido': 'Hybrid', 'Hibrido': 'Hybrid', 'Remoto': 'Remote' }

function migrateExperienceLocation(d: ResumeData) {
  for (const exp of d.experience) {
    const loc = exp.location as unknown
    if (typeof loc !== 'string') continue
    let en = loc
    for (const [pt, translated] of Object.entries(WORK_MODEL)) {
      if (en.includes(pt)) en = en.replace(pt, translated)
    }
    exp.location = { pt: loc, en }
  }
}

function emptyResume(): ResumeData {
  return {
    header: { name: '', headline: { pt: '', en: '' }, location: '', email: '', phone: '', website: '', linkedin: '', github: '', figma: '', photo: '' },
    summary: { pt: '', en: '' }, experience: [], education: [], skills: [], languages: [], certifications: [],
  }
}

/* ─── Persistence ────────────────────────────────────────────────────── */

async function saveResume() {
  if (!state.session) return
  const row = state.resumes.get(state.resumeKey)!
  const payload = { user_id: state.session.user.id, profile_key: row.profile_key, profile_name: row.profile_name, data: row.data }
  setSaveStatus('Salvando…')
  const { data, error } = await supabase.from('resumes').upsert(payload, { onConflict: 'user_id,profile_key' }).select().single()
  if (error) return setSaveStatus('Erro: ' + error.message)
  row.id = (data as any).id
  state.dirty = false
  setSaveStatus('Salvo às ' + new Date().toLocaleTimeString())
}

async function saveLetter() {
  if (!state.session) return
  const row = state.letters.get(state.letterKey)!
  const payload = { user_id: state.session.user.id, profile_key: row.profile_key, profile_name: row.profile_name, data: row.data }
  setSaveStatus('Salvando…')
  const { data, error } = await supabase.from('resumes').upsert(payload, { onConflict: 'user_id,profile_key' }).select().single()
  if (error) return setSaveStatus('Erro: ' + error.message)
  row.id = (data as any).id
  state.dirty = false
  setSaveStatus('Salvo às ' + new Date().toLocaleTimeString())
}

async function deleteResume() {
  const row = state.resumes.get(state.resumeKey)!
  if (!confirm(`Excluir perfil "${row.profile_name}"?`)) return
  if (row.id) {
    const { error } = await supabase.from('resumes').delete().eq('id', row.id)
    if (error) return setSaveStatus('Erro: ' + error.message)
  }
  state.resumes.delete(row.profile_key)
  state.resumeKey = state.resumes.keys().next().value || 'especialista'
  if (!state.resumes.has(state.resumeKey)) {
    state.resumes.set('especialista', { profile_key: 'especialista', profile_name: 'Especialista', data: especialistaData() })
    state.resumeKey = 'especialista'
  }
  renderAll()
}

async function deleteLetter() {
  const row = state.letters.get(state.letterKey)!
  if (!confirm(`Excluir carta "${row.profile_name}"?`)) return
  if (row.id) {
    const { error } = await supabase.from('resumes').delete().eq('id', row.id)
    if (error) return setSaveStatus('Erro: ' + error.message)
  }
  state.letters.delete(row.profile_key)
  state.letterKey = state.letters.keys().next().value || 'carta-padrao'
  if (!state.letters.has(state.letterKey)) {
    state.letters.set('carta-padrao', { profile_key: 'carta-padrao', profile_name: 'Padrão', data: defaultLetterData() })
    state.letterKey = 'carta-padrao'
  }
  renderAll()
}

function newResume() {
  const name = prompt('Nome do novo perfil (ex: Product Design Lead)')?.trim()
  if (!name) return
  const key = 'custom-' + Date.now().toString(36)
  // Clone current profile — new profiles share the same experience, education,
  // certifications and languages; only headline, summary and skills typically change.
  const base = JSON.parse(JSON.stringify(state.resumes.get(state.resumeKey)!.data)) as ResumeData
  base.header.headline = { pt: '', en: '' }
  base.summary = { pt: '', en: '' }
  base.skills = []
  state.resumes.set(key, { profile_key: key, profile_name: name, data: base })
  state.resumeKey = key
  markDirty(); renderAll()
}

function newLetter() {
  const name = prompt('Nome da nova carta (ex: Fintech Senior)')?.trim()
  if (!name) return
  const key = 'carta-' + Date.now().toString(36)
  state.letters.set(key, { profile_key: key, profile_name: name, data: defaultLetterData() })
  state.letterKey = key
  markDirty(); renderAll()
}

function renameResume() {
  const row = state.resumes.get(state.resumeKey)!
  const name = prompt('Novo nome do perfil', row.profile_name)?.trim()
  if (!name) return
  row.profile_name = name; markDirty(); renderAll()
}

function renameLetter() {
  const row = state.letters.get(state.letterKey)!
  const name = prompt('Novo nome da carta', row.profile_name)?.trim()
  if (!name) return
  row.profile_name = name; markDirty(); renderAll()
}

function setSaveStatus(t: string) {
  const el = document.getElementById('save-status')
  if (el) el.textContent = t
}

function markDirty() { state.dirty = true; setSaveStatus('Alterações não salvas') }

/* ─── Render all ─────────────────────────────────────────────────────── */

function renderAll() {
  localStorage.setItem('cv:key',   state.resumeKey)
  localStorage.setItem('cv:lkey',  state.letterKey)
  localStorage.setItem('cv:lang',  state.lang)
  localStorage.setItem('cv:style', state.style)
  localStorage.setItem('cv:tab',   state.tab)

  renderTabs()
  renderLangStyleToggles()

  if (state.tab === 'profile') {
    renderResumeSelect()
    renderResumeEditor()
    renderResumePreview()
  } else if (state.tab === 'carta') {
    renderLetterSelect()
    renderLetterEditor()
    renderLetterPreview()
  } else {
    renderLinks()
  }
}

/* ─── Tab switching ──────────────────────────────────────────────────── */

function renderTabs() {
  document.querySelectorAll<HTMLElement>('.tab-panel').forEach(p => p.classList.add('hidden'))
  document.getElementById('tab-' + state.tab)?.classList.remove('hidden')

  document.querySelectorAll<HTMLElement>('[id^="ctrl-"]').forEach(c => {
    c.classList.add('hidden')
    c.classList.remove('flex')
  })
  const ctrl = document.getElementById('ctrl-' + state.tab)
  if (ctrl) { ctrl.classList.remove('hidden'); ctrl.classList.add('flex') }

  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(b => {
    const active = b.dataset.tab === state.tab
    b.classList.toggle('bg-accent', active)
    b.classList.toggle('text-black', active)
  })
}

/* ─── Language / style toggles ───────────────────────────────────────── */

function renderLangStyleToggles() {
  document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach(b => {
    b.classList.toggle('bg-accent', b.dataset.lang === state.lang)
    b.classList.toggle('text-black', b.dataset.lang === state.lang)
  })
  document.querySelectorAll<HTMLButtonElement>('.style-btn').forEach(b => {
    b.classList.toggle('bg-accent', b.dataset.style === state.style)
    b.classList.toggle('text-black', b.dataset.style === state.style)
  })
}

/* ─── DOM helpers ────────────────────────────────────────────────────── */

function el<T extends HTMLElement>(tag: string, attrs: Record<string, any> = {}, ...children: (Node | string)[]): T {
  const e = document.createElement(tag) as T
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v)
    else if (v !== undefined && v !== null) e.setAttribute(k, String(v))
  }
  for (const c of children) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  return e
}

function inp(label: string, value: string, onchange: (v: string) => void, type = 'text'): HTMLDivElement {
  const wrap = el<HTMLDivElement>('div', { class: 'space-y-1' })
  wrap.appendChild(el('label', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, label))
  const i = el<HTMLInputElement>('input', {
    type, value,
    class: 'w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-accent'
  })
  i.addEventListener('input', () => { onchange(i.value); markDirty() })
  wrap.appendChild(i)
  return wrap
}

function autoGrowTextarea(t: HTMLTextAreaElement) {
  t.style.height = 'auto'
  t.style.height = t.scrollHeight + 'px'
}

function textarea(label: string, value: string, onchange: (v: string) => void, rows = 3, preview?: () => void): HTMLDivElement {
  const wrap = el<HTMLDivElement>('div', { class: 'space-y-1' })
  wrap.appendChild(el('label', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, label))
  const t = el<HTMLTextAreaElement>('textarea', {
    rows: String(rows),
    class: 'w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-2 text-sm resize-none overflow-hidden focus:outline-none focus:border-accent'
  })
  t.value = value
  t.addEventListener('input', () => { onchange(t.value); markDirty(); autoGrowTextarea(t); preview?.() })
  wrap.appendChild(t)
  requestAnimationFrame(() => autoGrowTextarea(t))
  return wrap
}

function localized(label: string, val: Localized, kind: 'input' | 'area' = 'input', preview?: () => void): HTMLDivElement {
  const wrap = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  const build = (lang: 'pt' | 'en') => kind === 'input'
    ? inp(`${label} (${lang.toUpperCase()})`, val[lang] || '', v => { val[lang] = v; preview?.() })
    : textarea(`${label} (${lang.toUpperCase()})`, val[lang] || '', v => { val[lang] = v; preview?.() }, 3, preview)
  wrap.appendChild(build('pt'))
  wrap.appendChild(build('en'))
  return wrap
}

function sectionTitle(title: string, onAdd?: () => void): HTMLElement {
  const h = el<HTMLDivElement>('div', { class: 'flex items-center justify-between border-b border-[var(--color-border)] pb-2 mb-4' })
  h.appendChild(el('h2', { class: 'font-serif text-xl' }, title))
  if (onAdd) {
    const b = el<HTMLButtonElement>('button', { class: 'text-xs px-3 py-1 border border-[var(--color-border)] rounded hover:border-accent' }, '+ Adicionar')
    b.addEventListener('click', () => { onAdd(); renderResumeEditor(); renderResumePreview(); markDirty() })
    h.appendChild(b)
  }
  return h
}

function removeBtn(onclick: () => void): HTMLButtonElement {
  const b = el<HTMLButtonElement>('button', { class: 'text-xs text-red-500 hover:underline' }, 'Remover')
  b.addEventListener('click', () => { onclick(); renderResumeEditor(); renderResumePreview(); markDirty() })
  return b
}

/* ─── Resume select ──────────────────────────────────────────────────── */

function renderResumeSelect() {
  const sel = document.getElementById('profile-select') as HTMLSelectElement
  sel.innerHTML = ''
  for (const row of state.resumes.values()) {
    const o = document.createElement('option')
    o.value = row.profile_key
    o.textContent = row.profile_name
    if (row.profile_key === state.resumeKey) o.selected = true
    sel.appendChild(o)
  }
}

function renderLetterSelect() {
  const sel = document.getElementById('letter-select') as HTMLSelectElement
  sel.innerHTML = ''
  for (const row of state.letters.values()) {
    const o = document.createElement('option')
    o.value = row.profile_key
    o.textContent = row.profile_name
    if (row.profile_key === state.letterKey) o.selected = true
    sel.appendChild(o)
  }
}

/* ─── Resume editor ──────────────────────────────────────────────────── */

function renderResumeEditor() {
  const pane = document.getElementById('editor-pane')!
  pane.innerHTML = ''
  const d = state.resumes.get(state.resumeKey)!.data
  sortExperienceByDate(d.experience)
  const refresh = () => renderResumePreview()

  // Header
  const hs = el<HTMLDivElement>('section', { class: 'space-y-3' })
  hs.appendChild(sectionTitle('Cabeçalho'))
  hs.appendChild(inp('Nome completo', d.header.name, v => { d.header.name = v; refresh() }))
  hs.appendChild(localized('Headline', d.header.headline, 'input', refresh))
  const r1 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  r1.appendChild(inp('Localização', d.header.location, v => { d.header.location = v; refresh() }))
  r1.appendChild(inp('Email', d.header.email, v => { d.header.email = v; refresh() }, 'email'))
  hs.appendChild(r1)
  const r2 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  r2.appendChild(inp('Telefone', d.header.phone, v => { d.header.phone = v; refresh() }))
  r2.appendChild(inp('Website / Portfólio', d.header.website, v => { d.header.website = v; refresh() }))
  hs.appendChild(r2)
  const r3 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  r3.appendChild(inp('LinkedIn', d.header.linkedin, v => { d.header.linkedin = v; refresh() }))
  r3.appendChild(inp('Figma Portfólio', d.header.figma || '', v => { d.header.figma = v; refresh() }))
  hs.appendChild(r3)
  const r4 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  r4.appendChild(inp('GitHub', d.header.github, v => { d.header.github = v; refresh() }))
  r4.appendChild(inp('Foto (URL)', d.header.photo, v => { d.header.photo = v; refresh() }))
  hs.appendChild(r4)
  pane.appendChild(hs)

  // Summary
  const ss = el<HTMLDivElement>('section', { class: 'space-y-3' })
  ss.appendChild(sectionTitle('Resumo'))
  ss.appendChild(localized('Resumo profissional', d.summary, 'area', refresh))
  pane.appendChild(ss)

  // Experience
  const es = el<HTMLDivElement>('section', { class: 'space-y-4' })
  es.appendChild(sectionTitle('Experiência', () => d.experience.unshift({
    company: '', role: { pt: '', en: '' }, location: { pt: '', en: '' }, start: '', end: '', current: false,
    summary: { pt: '', en: '' }, achievements: [],
  })))
  d.experience.forEach((exp: Experience, i: number) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Experiência #${i + 1}`))
    head.appendChild(removeBtn(() => d.experience.splice(i, 1)))
    c.appendChild(head)
    c.appendChild(inp('Empresa', exp.company, v => { exp.company = v; refresh() }))
    c.appendChild(localized('Cargo', exp.role, 'input', refresh))
    c.appendChild(localized('Local', exp.location, 'input', refresh))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
    r.appendChild(inp('Início (MM/AAAA)', exp.start, v => { exp.start = v; refresh() }))
    r.appendChild(inp('Fim (MM/AAAA)', exp.end, v => { exp.end = v; refresh() }))
    c.appendChild(r)
    const cur = el<HTMLLabelElement>('label', { class: 'flex items-center gap-2 text-xs' })
    const chk = el<HTMLInputElement>('input', { type: 'checkbox' })
    chk.checked = exp.current
    chk.addEventListener('change', () => { exp.current = chk.checked; markDirty(); refresh() })
    cur.appendChild(chk); cur.appendChild(document.createTextNode('Emprego atual'))
    c.appendChild(cur)
    c.appendChild(localized('Resumo do cargo', exp.summary, 'area', refresh))
    // Achievements
    const ach = el<HTMLDivElement>('div', { class: 'space-y-2' })
    const ahead = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    ahead.appendChild(el('span', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, 'Bullets / Conquistas'))
    const addA = el<HTMLButtonElement>('button', { class: 'text-xs px-2 py-1 border border-[var(--color-border)] rounded hover:border-accent' }, '+ Bullet')
    addA.addEventListener('click', () => { exp.achievements.push({ pt: '', en: '' }); renderResumeEditor(); refresh(); markDirty() })
    ahead.appendChild(addA)
    ach.appendChild(ahead)
    exp.achievements.forEach((a, ai) => {
      const line = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-[1fr_1fr_auto] gap-2 items-start' })
      const tpt = el<HTMLInputElement>('input', { type: 'text', placeholder: 'PT', class: 'bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm' })
      tpt.value = a.pt
      tpt.addEventListener('input', () => { a.pt = tpt.value; markDirty(); refresh() })
      const ten = el<HTMLInputElement>('input', { type: 'text', placeholder: 'EN', class: 'bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm' })
      ten.value = a.en
      ten.addEventListener('input', () => { a.en = ten.value; markDirty(); refresh() })
      const rb = el<HTMLButtonElement>('button', { class: 'text-xs text-red-500 hover:underline' }, 'Rem')
      rb.addEventListener('click', () => { exp.achievements.splice(ai, 1); renderResumeEditor(); refresh(); markDirty() })
      line.appendChild(tpt); line.appendChild(ten); line.appendChild(rb)
      ach.appendChild(line)
    })
    c.appendChild(ach)
    es.appendChild(c)
  })
  pane.appendChild(es)

  // Education
  const eds = el<HTMLDivElement>('section', { class: 'space-y-4' })
  eds.appendChild(sectionTitle('Formação', () => d.education.unshift({ school: '', degree: { pt: '', en: '' }, start: '', end: '' })))
  d.education.forEach((ed, i) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Formação #${i + 1}`))
    head.appendChild(removeBtn(() => d.education.splice(i, 1)))
    c.appendChild(head)
    c.appendChild(inp('Instituição', ed.school, v => { ed.school = v; refresh() }))
    c.appendChild(localized('Grau / Curso', ed.degree, 'input', refresh))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
    r.appendChild(inp('Início', ed.start, v => { ed.start = v; refresh() }))
    r.appendChild(inp('Fim', ed.end, v => { ed.end = v; refresh() }))
    c.appendChild(r)
    eds.appendChild(c)
  })
  pane.appendChild(eds)

  // Skills
  const sks = el<HTMLDivElement>('section', { class: 'space-y-4' })
  sks.appendChild(sectionTitle('Competências', () => d.skills.push({ category: { pt: '', en: '' }, items: [] })))
  d.skills.forEach((sk, i) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Categoria #${i + 1}`))
    head.appendChild(removeBtn(() => d.skills.splice(i, 1)))
    c.appendChild(head)
    c.appendChild(localized('Categoria', sk.category, 'input', refresh))
    c.appendChild(textarea('Itens (separados por vírgula)', sk.items.join(', '), v => { sk.items = v.split(',').map(s => s.trim()).filter(Boolean); refresh() }, 2, refresh))
    sks.appendChild(c)
  })
  pane.appendChild(sks)

  // Languages
  const ls = el<HTMLDivElement>('section', { class: 'space-y-4' })
  ls.appendChild(sectionTitle('Idiomas', () => d.languages.push({ name: { pt: '', en: '' }, level: { pt: '', en: '' } })))
  d.languages.forEach((lg, i) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Idioma #${i + 1}`))
    head.appendChild(removeBtn(() => d.languages.splice(i, 1)))
    c.appendChild(head)
    c.appendChild(localized('Idioma', lg.name, 'input', refresh))
    c.appendChild(localized('Nível', lg.level, 'input', refresh))
    ls.appendChild(c)
  })
  pane.appendChild(ls)

  // Certifications
  const cs = el<HTMLDivElement>('section', { class: 'space-y-4' })
  cs.appendChild(sectionTitle('Certificações', () => d.certifications.push({ name: '', issuer: '', year: '' })))
  d.certifications.forEach((ct, i) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Certificação #${i + 1}`))
    head.appendChild(removeBtn(() => d.certifications.splice(i, 1)))
    c.appendChild(head)
    c.appendChild(inp('Nome', ct.name, v => { ct.name = v; refresh() }))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
    r.appendChild(inp('Emissor', ct.issuer, v => { ct.issuer = v; refresh() }))
    r.appendChild(inp('Ano', ct.year, v => { ct.year = v; refresh() }))
    c.appendChild(r)
    cs.appendChild(c)
  })
  pane.appendChild(cs)
}

/* ─── Letter editor ──────────────────────────────────────────────────── */

function renderLetterEditor() {
  const pane = document.getElementById('letter-editor-pane')!
  pane.innerHTML = ''
  const d = state.letters.get(state.letterKey)!.data
  const refresh = () => renderLetterPreview()

  const hs = el<HTMLDivElement>('section', { class: 'space-y-3' })
  hs.appendChild(sectionTitle('Destinatário'))
  hs.appendChild(localized('Saudação', d.salutation, 'input', refresh))
  hs.appendChild(inp('Empresa', d.company, v => { d.company = v; refresh() }))
  hs.appendChild(localized('Cargo pretendido', d.role, 'input', refresh))
  pane.appendChild(hs)

  const ps = el<HTMLDivElement>('section', { class: 'space-y-3' })
  ps.appendChild(sectionTitle('Corpo da carta'))
  ps.appendChild(el('p', { class: 'text-[11px] text-text-muted-dark' }, 'Separe parágrafos com uma linha em branco.'))
  const bodyWrap = localized('Texto', d.body, 'area', refresh)
  bodyWrap.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(t => { t.rows = 14 })
  ps.appendChild(bodyWrap)
  pane.appendChild(ps)

  const cs = el<HTMLDivElement>('section', { class: 'space-y-3' })
  cs.appendChild(sectionTitle('Encerramento'))
  cs.appendChild(localized('Encerramento', d.closing, 'area', refresh))
  pane.appendChild(cs)
}

/* ─── Links tab ──────────────────────────────────────────────────────── */

function renderLinks() {
  const panel = document.getElementById('links-panel')!
  panel.innerHTML = ''

  const header = state.resumes.get(state.resumeKey)?.data.header

  const links: { label: string; key: keyof typeof header; placeholder: string }[] = [
    { label: 'LinkedIn',          key: 'linkedin', placeholder: 'linkedin.com/in/...' },
    { label: 'Portfolio (Website)', key: 'website',  placeholder: 'raullima.vercel.app' },
    { label: 'Figma Portfólio',   key: 'figma',    placeholder: 'figma.com/proto/...' },
    { label: 'GitHub',            key: 'github',   placeholder: 'github.com/...' },
  ]

  panel.appendChild(el('h2', { class: 'font-serif text-2xl font-semibold mb-2' }, 'Links'))
  panel.appendChild(el('p', { class: 'text-xs text-text-muted-dark mb-6' }, 'Clique em Copiar para copiar o link. Os valores são lidos do Curriculum ativo.'))

  for (const link of links) {
    const value = (header?.[link.key] || '') as string
    const row = el<HTMLDivElement>('div', { class: 'flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg' })

    const info = el<HTMLDivElement>('div', { class: 'flex-1 min-w-0' })
    info.appendChild(el('p', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, link.label))
    info.appendChild(el('p', { class: `text-sm truncate ${value ? '' : 'text-text-muted-dark italic'}` }, value || link.placeholder))
    row.appendChild(info)

    if (value) {
      const open = el<HTMLAnchorElement>('a', {
        href: value.startsWith('http') ? value : 'https://' + value,
        target: '_blank', rel: 'noopener',
        class: 'text-xs px-3 py-2 border border-[var(--color-border)] rounded-lg hover:border-accent shrink-0',
      }, 'Abrir')
      row.appendChild(open)

      const copy = el<HTMLButtonElement>('button', {
        class: 'text-xs px-3 py-2 bg-accent text-black font-semibold rounded-lg hover:opacity-90 shrink-0',
      }, 'Copiar')
      copy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(value.startsWith('http') ? value : 'https://' + value)
        copy.textContent = 'Copiado!'
        setTimeout(() => copy.textContent = 'Copiar', 1800)
      })
      row.appendChild(copy)
    } else {
      row.appendChild(el('span', { class: 'text-xs text-text-muted-dark shrink-0' }, 'Não preenchido'))
    }

    panel.appendChild(row)
  }
}

/* ─── Preview helpers ────────────────────────────────────────────────── */

function esc(s: string) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
function L(v: Localized): string { return esc(v?.[state.lang] || v?.pt || v?.en || '') }
function parseDateKey(s: string): number {
  const m = (s || '').match(/(\d{1,2})\s*\/\s*(\d{4})/)
  if (m) return parseInt(m[2], 10) * 12 + parseInt(m[1], 10)
  const y = (s || '').match(/(\d{4})/)
  return y ? parseInt(y[1], 10) * 12 : 0
}
function sortExperienceByDate(experience: Experience[]) {
  experience.sort((a, b) => {
    const aKey = a.current ? Infinity : parseDateKey(a.end)
    const bKey = b.current ? Infinity : parseDateKey(b.end)
    if (aKey !== bKey) return bKey - aKey
    return parseDateKey(b.start) - parseDateKey(a.start)
  })
}
const MONTHS = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

// ATS date parsers key off month names and a plain hyphen. "07/2025 — Present"
// (numeric, em dash) is far weaker than "July 2025 - Present", which is what the
// LinkedIn export that parses correctly uses. Anything that is not MM/YYYY is
// passed through untouched, so free-form entries still render as typed.
function fmtMonth(value: string): string {
  const m = (value || '').trim().match(/^(\d{1,2})\s*\/\s*(\d{4})$/)
  if (!m) return value || ''
  const idx = parseInt(m[1], 10) - 1
  const name = MONTHS[state.lang][idx]
  return name ? `${name} ${m[2]}` : value
}

function fmtDate(exp: { start: string; end: string; current: boolean }): string {
  const endLabel = state.lang === 'pt' ? 'Atual' : 'Present'
  const start = esc(fmtMonth(exp.start))
  const end = exp.current ? endLabel : esc(fmtMonth(exp.end))
  if (!start) return end
  if (!end) return start
  return `${start} - ${end}`
}

function labels() {
  return state.lang === 'pt'
    ? { contact: 'Contato', summary: 'Resumo', experience: 'Experiência', education: 'Formação', skills: 'Competências', languages: 'Idiomas', certifications: 'Certificações' }
    : { contact: 'Contact', summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications' }
}

/* ─── Resume preview ─────────────────────────────────────────────────── */

function renderResumePreview() {
  const p = document.getElementById('preview')!
  const d = state.resumes.get(state.resumeKey)!.data
  sortExperienceByDate(d.experience)
  p.innerHTML = state.style === 'linkedin' ? linkedinTemplate(d) : atsTemplate(d)
  p.className = `shadow-2xl bg-white ${state.style === 'linkedin' ? 'cv-linkedin' : 'cv-ats'}`
  fitPreviewToViewport('preview-frame', 'preview')
}

function linkedinTemplate(d: ResumeData): string {
  const l = labels()
  const contacts = [d.header.email, d.header.phone, d.header.location, d.header.website, d.header.linkedin, d.header.github, d.header.figma].filter(Boolean).map(esc).join(' · ')
  return `<article class="cv-page">
    <header class="cv-linkedin__header">
      ${d.header.photo ? `<img src="${esc(d.header.photo)}" alt="" class="cv-linkedin__photo"/>` : ''}
      <div>
        <h1 class="cv-linkedin__name">${esc(d.header.name)}</h1>
        <p class="cv-linkedin__headline">${L(d.header.headline)}</p>
        <p class="cv-linkedin__contacts">${contacts}</p>
      </div>
    </header>
    ${L(d.summary) ? `<section class="cv-section"><h2>${l.summary}</h2><p>${L(d.summary).replace(/\n/g, '<br/>')}</p></section>` : ''}
    ${d.experience.length ? `<section class="cv-section"><h2>${l.experience}</h2>${d.experience.map(x => `
      <div class="cv-item">
        <div class="cv-item__head"><strong>${L(x.role)}</strong><span class="cv-item__meta">${fmtDate(x)}</span></div>
        <div class="cv-item__sub">${esc(x.company)}${L(x.location) ? ' · ' + L(x.location) : ''}</div>
        ${L(x.summary) ? `<p class="cv-item__body">${L(x.summary)}</p>` : ''}
        ${x.achievements.length ? `<ul class="cv-list">${x.achievements.map(a => `<li>${L(a)}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}</section>` : ''}
    ${d.education.length ? `<section class="cv-section"><h2>${l.education}</h2>${d.education.map(ed => `
      <div class="cv-item">
        <div class="cv-item__head"><strong>${esc(ed.school)}</strong><span class="cv-item__meta">${esc(fmtMonth(ed.start))}${ed.end ? ' - ' + esc(fmtMonth(ed.end)) : ''}</span></div>
        <div class="cv-item__sub">${L(ed.degree)}</div>
      </div>`).join('')}</section>` : ''}
    ${d.skills.length ? `<section class="cv-section"><h2>${l.skills}</h2>${d.skills.map(sk => `<div class="cv-skill"><strong>${L(sk.category)}:</strong> ${sk.items.map(esc).join(' · ')}</div>`).join('')}</section>` : ''}
    ${d.languages.length ? `<section class="cv-section"><h2>${l.languages}</h2><ul class="cv-inline">${d.languages.map(lg => `<li>${L(lg.name)} — <em>${L(lg.level)}</em></li>`).join('')}</ul></section>` : ''}
    ${d.certifications.length ? `<section class="cv-section"><h2>${l.certifications}</h2>${d.certifications.map(c => `<div class="cv-item"><strong>${esc(c.name)}</strong> — ${esc(c.issuer)}${c.year ? ' (' + esc(c.year) + ')' : ''}</div>`).join('')}</section>` : ''}
  </article>`
}

function atsTemplate(d: ResumeData): string {
  const l = labels()
  const contacts = [d.header.email, d.header.phone, d.header.location, d.header.linkedin, d.header.github, d.header.figma, d.header.website].filter(Boolean).map(esc).join(' | ')
  return `<article class="cv-page cv-ats__page">
    <h1 class="cv-ats__name">${esc(d.header.name)}</h1>
    <p class="cv-ats__headline">${L(d.header.headline)}</p>
    <h2>${l.contact}</h2>
    <p class="cv-ats__contacts">${contacts}</p>
    ${L(d.summary) ? `<h2>${l.summary}</h2><p>${L(d.summary).replace(/\n/g, '<br/>')}</p>` : ''}
    ${d.experience.length ? `<h2>${l.experience}</h2>${d.experience.map(x => `
      <p><strong>${L(x.role)}</strong> — ${esc(x.company)}${L(x.location) ? ', ' + L(x.location) : ''}<br/><em>${fmtDate(x)}</em></p>
      ${L(x.summary) ? `<p>${L(x.summary)}</p>` : ''}
      ${x.achievements.length ? `<ul>${x.achievements.map(a => `<li>${L(a)}</li>`).join('')}</ul>` : ''}`).join('')}` : ''}
    ${d.education.length ? `<h2>${l.education}</h2>${d.education.map(ed => `<p><strong>${esc(ed.school)}</strong><br/>${L(ed.degree)}<br/><em>${esc(fmtMonth(ed.start))}${ed.end ? ' - ' + esc(fmtMonth(ed.end)) : ''}</em></p>`).join('')}` : ''}
    ${d.skills.length ? `<h2>${l.skills}</h2>${d.skills.map(sk => `<p><strong>${L(sk.category)}:</strong> ${sk.items.map(esc).join(', ')}</p>`).join('')}` : ''}
    ${d.languages.length ? `<h2>${l.languages}</h2><p>${d.languages.map(lg => `${L(lg.name)} (${L(lg.level)})`).join(', ')}</p>` : ''}
    ${d.certifications.length ? `<h2>${l.certifications}</h2>${d.certifications.map(c => `<p>${esc(c.name)} — ${esc(c.issuer)}${c.year ? ', ' + esc(c.year) : ''}</p>`).join('')}` : ''}
  </article>`
}

/* ─── Letter preview ─────────────────────────────────────────────────── */

function renderLetterPreview() {
  const p = document.getElementById('letter-preview')!
  if (!p) return
  const d = state.letters.get(state.letterKey)!.data
  const header = state.resumes.get(state.resumeKey)?.data.header
  const isLinkedin = state.style === 'linkedin'

  const contacts = header
    ? [header.email, header.phone, header.location, header.linkedin].filter(Boolean).map(esc).join(isLinkedin ? ' · ' : ' | ')
    : ''

  const bodyParagraphs = (d.body?.[state.lang] || d.body?.pt || '')
    .split(/\n\n+/)
    .filter(Boolean)
    .map(para => `<p style="margin-bottom:10px;color:#111;line-height:1.65">${esc(para).replace(/\n/g, '<br/>')}</p>`)
    .join('')

  const titleLabel = state.lang === 'pt' ? 'Carta de Apresentação' : 'Cover Letter'

  p.innerHTML = isLinkedin
    ? `<article class="cv-page">
        <header class="cv-linkedin__header" style="margin-bottom:20px">
          ${header?.photo ? `<img src="${esc(header.photo)}" alt="" class="cv-linkedin__photo"/>` : ''}
          <div>
            <h1 class="cv-linkedin__name">${esc(header?.name || 'Raul Lima')}</h1>
            <p class="cv-linkedin__contacts">${contacts}</p>
          </div>
        </header>
        <h2 style="font-size:13pt;text-transform:none;letter-spacing:0;border-bottom:1px solid #d0d0d0;padding-bottom:4px;margin-bottom:14px;color:#111">${titleLabel}</h2>
        ${d.company ? `<p style="margin-bottom:8px;color:#111"><strong>${esc(d.company)}</strong>${L(d.role) ? ' — ' + L(d.role) : ''}</p>` : ''}
        <p style="margin-bottom:14px;color:#111">${L(d.salutation)}</p>
        <div style="margin-bottom:20px">${bodyParagraphs}</div>
        <p style="white-space:pre-line;color:#111">${L(d.closing)}</p>
      </article>`
    : `<article class="cv-page cv-ats__page">
        <h1 class="cv-ats__name" style="color:#111">${esc(header?.name || 'Raul Lima')}</h1>
        <p class="cv-ats__contacts" style="color:#333">${contacts}</p>
        <h2 style="font-size:13pt;text-transform:none;letter-spacing:0;border-bottom:1px solid #999;padding-bottom:4px;margin:14px 0 10px;color:#111">${titleLabel}</h2>
        ${d.company ? `<p style="margin-bottom:8px;color:#111"><strong>${esc(d.company)}</strong>${L(d.role) ? ' — ' + L(d.role) : ''}</p>` : ''}
        <p style="margin-bottom:14px;color:#111">${L(d.salutation)}</p>
        <div style="margin-bottom:20px">${bodyParagraphs}</div>
        <p style="white-space:pre-line;color:#111">${L(d.closing)}</p>
      </article>`

  p.className = `shadow-2xl bg-white ${isLinkedin ? 'cv-linkedin' : 'cv-ats'}`
  fitPreviewToViewport('letter-preview-frame', 'letter-preview')
}

/* ─── Print / PDF ────────────────────────────────────────────────────── */

function exportPDF(which: 'resume' | 'letter') {
  const sourceId = which === 'resume' ? 'preview' : 'letter-preview'
  const source = document.getElementById(sourceId)!
  const target = document.getElementById('print-target')!
  // Clone the full element (with cv-linkedin/cv-ats class) so that CSS padding/color apply in print
  const clone = source.cloneNode(true) as HTMLElement
  clone.removeAttribute('id')
  clone.style.transform = 'none' // undo the mobile fit-to-viewport scale — PDF is always full size
  // replaceChildren, not appendChild: each export supersedes whatever the last
  // one left behind, so nothing accumulates even if cleanup never runs.
  target.replaceChildren(clone)

  // Safari stamps the document URL into the printed page's header/footer and
  // gives no CSS hook to suppress it, so every exported PDF would carry the
  // private /profile.html path. It reads that URL when the sheet is composed,
  // so show the site root for the duration of the print and restore after.
  const realUrl = location.pathname + location.search + location.hash
  const setUrl = (url: string) => {
    try { history.replaceState(null, '', url) } catch { /* non-fatal: only affects the printed header */ }
  }
  setUrl('/')

  // Never clear synchronously after print(). Desktop browsers block inside
  // print() until the dialog closes, but iOS Safari returns immediately and
  // composes the sheet afterwards — clearing here empties the page before it
  // is captured, which is why Safari exported a blank sheet. Clean up on
  // afterprint instead; if that never fires the clone simply stays in the
  // hidden #print-target until the next export replaces it.
  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    clearTimeout(fallback)
    setUrl(realUrl)
    target.replaceChildren()
    window.removeEventListener('afterprint', cleanup)
  }
  // iOS Safari does not reliably fire afterprint, and the address bar must not
  // be left pointing at the site root. The delay only has to outlast the
  // browser capturing the sheet, which happens right after print() is called.
  const fallback = setTimeout(cleanup, 10000)
  window.addEventListener('afterprint', cleanup)
  window.print()
}

/* ─── Mobile fit-to-viewport ─────────────────────────────────────────── */
// Below the lg breakpoint the A4 preview (794px) is wider than the phone
// screen, so we scale it down to fit and shrink its frame to match — the
// export path always resets the clone's transform, so PDFs stay full size.
const LG_BREAKPOINT = 1024

function fitPreviewToViewport(frameId: string, previewId: string) {
  const frame = document.getElementById(frameId)
  const preview = document.getElementById(previewId) as HTMLElement | null
  if (!frame || !preview) return
  const column = frame.parentElement as HTMLElement | null
  if (!column) return

  if (window.innerWidth >= LG_BREAKPOINT) {
    preview.style.transform = ''
    frame.style.width = ''
    frame.style.height = ''
    return
  }

  const naturalWidth = preview.offsetWidth
  const naturalHeight = preview.offsetHeight
  if (!naturalWidth || !naturalHeight) return

  const available = column.clientWidth - 24
  const scale = Math.min(1, available / naturalWidth)
  preview.style.transformOrigin = 'top left'
  preview.style.transform = `scale(${scale})`
  frame.style.width = `${naturalWidth * scale}px`
  frame.style.height = `${naturalHeight * scale}px`
}

function fitActivePreview() {
  if (state.tab === 'profile') fitPreviewToViewport('preview-frame', 'preview')
  else if (state.tab === 'carta') fitPreviewToViewport('letter-preview-frame', 'letter-preview')
}

/* ─── Wiring ─────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initAuthForm()
  bootstrap()

  // Signout
  document.getElementById('signout-btn')!.addEventListener('click', () => supabase.auth.signOut())

  // Tabs
  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(b => b.addEventListener('click', () => {
    state.tab = b.dataset.tab as Tab; renderAll()
  }))

  // Lang / Style
  document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach(b => b.addEventListener('click', () => {
    state.lang = b.dataset.lang as Lang; renderAll()
  }))
  document.querySelectorAll<HTMLButtonElement>('.style-btn').forEach(b => b.addEventListener('click', () => {
    state.style = b.dataset.style as Style; renderAll()
  }))

  // Resume controls
  document.getElementById('save-btn')!.addEventListener('click', saveResume)
  document.getElementById('export-btn')!.addEventListener('click', () => exportPDF('resume'))
  document.getElementById('profile-new')!.addEventListener('click', newResume)
  document.getElementById('profile-rename')!.addEventListener('click', renameResume)
  document.getElementById('profile-delete')!.addEventListener('click', deleteResume)
  ;(document.getElementById('profile-select') as HTMLSelectElement).addEventListener('change', (e) => {
    state.resumeKey = (e.target as HTMLSelectElement).value; renderAll()
  })

  // Letter controls
  document.getElementById('letter-save-btn')!.addEventListener('click', saveLetter)
  document.getElementById('letter-export-btn')!.addEventListener('click', () => exportPDF('letter'))
  document.getElementById('letter-new')!.addEventListener('click', newLetter)
  document.getElementById('letter-rename')!.addEventListener('click', renameLetter)
  document.getElementById('letter-delete')!.addEventListener('click', deleteLetter)
  ;(document.getElementById('letter-select') as HTMLSelectElement).addEventListener('change', (e) => {
    state.letterKey = (e.target as HTMLSelectElement).value; renderAll()
  })

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) { e.preventDefault(); e.returnValue = '' }
  })

  let resizeRaf = 0
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf)
    resizeRaf = requestAnimationFrame(fitActivePreview)
  })
})
