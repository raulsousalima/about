import { supabase, ALLOWED_EMAIL } from './supabase'
import type { Session } from '@supabase/supabase-js'

type Lang = 'pt' | 'en'
type Style = 'linkedin' | 'ats'

interface Localized { pt: string; en: string }

interface Experience {
  company: string
  role: Localized
  location: string
  start: string
  end: string
  current: boolean
  summary: Localized
  achievements: Localized[]
}

interface Education {
  school: string
  degree: Localized
  start: string
  end: string
}

interface Certification {
  name: string
  issuer: string
  year: string
}

interface LangSkill { name: Localized; level: Localized }

interface Header {
  name: string
  headline: Localized
  location: string
  email: string
  phone: string
  website: string
  linkedin: string
  github: string
  photo: string
}

interface ResumeData {
  header: Header
  summary: Localized
  experience: Experience[]
  education: Education[]
  skills: { category: Localized; items: string[] }[]
  languages: LangSkill[]
  certifications: Certification[]
}

interface ResumeRow {
  id?: string
  profile_key: string
  profile_name: string
  data: ResumeData
}

const DEFAULT_PROFILES: { key: string; name: string }[] = [
  { key: 'especialista', name: 'Especialista' },
  { key: 'coordenador', name: 'Coordenador' },
]

function empty(): ResumeData {
  return {
    header: { name: '', headline: { pt: '', en: '' }, location: '', email: '', phone: '', website: '', linkedin: '', github: '', photo: '' },
    summary: { pt: '', en: '' },
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
  }
}

const state = {
  lang: (localStorage.getItem('cv:lang') as Lang) || 'pt',
  style: (localStorage.getItem('cv:style') as Style) || 'linkedin',
  currentKey: localStorage.getItem('cv:key') || 'especialista',
  resumes: new Map<string, ResumeRow>(),
  session: null as Session | null,
  dirty: false,
}

/* ---------- auth ---------- */

async function bootstrap() {
  const { data } = await supabase.auth.getSession()
  handleSession(data.session)
  supabase.auth.onAuthStateChange((_e, session) => handleSession(session))
}

function handleSession(session: Session | null) {
  state.session = session
  const auth = document.getElementById('auth-screen')!
  const editor = document.getElementById('editor-screen')!
  if (session && session.user.email === ALLOWED_EMAIL) {
    auth.classList.add('hidden')
    editor.classList.remove('hidden')
    loadAll()
  } else {
    auth.classList.remove('hidden')
    editor.classList.add('hidden')
    if (session) {
      supabase.auth.signOut()
      msg('Este email não tem acesso.')
    }
  }
}

function msg(t: string) {
  const el = document.getElementById('auth-msg')
  if (el) el.textContent = t
}

function initAuthForm() {
  const form = document.getElementById('auth-form') as HTMLFormElement
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const submitter = (e.submitter as HTMLButtonElement | null)?.dataset.action || 'signin'
    const email = (document.getElementById('auth-email') as HTMLInputElement).value.trim()
    const password = (document.getElementById('auth-password') as HTMLInputElement).value
    if (submitter === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) msg(error.message)
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } })
      if (error) msg(error.message); else msg('Verifique seu email para o link mágico.')
    }
  })

  document.querySelector('[data-action="magic"]')!.addEventListener('click', async () => {
    const email = (document.getElementById('auth-email') as HTMLInputElement).value.trim()
    if (!email) return msg('Informe o email.')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } })
    if (error) msg(error.message); else msg('Verifique seu email para o link mágico.')
  })
}

/* ---------- data ---------- */

async function loadAll() {
  const { data, error } = await supabase.from('resumes').select('*').order('profile_name')
  if (error) return setSaveStatus('Erro ao carregar: ' + error.message)
  state.resumes.clear()
  ;(data || []).forEach((row: any) => {
    state.resumes.set(row.profile_key, { id: row.id, profile_key: row.profile_key, profile_name: row.profile_name, data: { ...empty(), ...row.data } })
  })
  // seed defaults locally if missing
  for (const p of DEFAULT_PROFILES) {
    if (!state.resumes.has(p.key)) {
      state.resumes.set(p.key, { profile_key: p.key, profile_name: p.name, data: empty() })
    }
  }
  if (!state.resumes.has(state.currentKey)) {
    state.currentKey = state.resumes.keys().next().value || 'especialista'
  }
  renderAll()
}

function current(): ResumeRow {
  return state.resumes.get(state.currentKey)!
}

async function save() {
  const row = current()
  if (!state.session) return
  const payload = {
    user_id: state.session.user.id,
    profile_key: row.profile_key,
    profile_name: row.profile_name,
    data: row.data,
  }
  setSaveStatus('Salvando…')
  const { data, error } = await supabase
    .from('resumes')
    .upsert(payload, { onConflict: 'user_id,profile_key' })
    .select()
    .single()
  if (error) return setSaveStatus('Erro: ' + error.message)
  row.id = (data as any).id
  state.dirty = false
  setSaveStatus('Salvo às ' + new Date().toLocaleTimeString())
}

async function deleteProfile() {
  const row = current()
  if (!confirm(`Excluir perfil "${row.profile_name}"?`)) return
  if (row.id) {
    const { error } = await supabase.from('resumes').delete().eq('id', row.id)
    if (error) return setSaveStatus('Erro: ' + error.message)
  }
  state.resumes.delete(row.profile_key)
  state.currentKey = state.resumes.keys().next().value || 'especialista'
  if (!state.resumes.has(state.currentKey)) {
    state.resumes.set('especialista', { profile_key: 'especialista', profile_name: 'Especialista', data: empty() })
    state.currentKey = 'especialista'
  }
  renderAll()
}

function newProfile() {
  const name = prompt('Nome do novo perfil (ex: Product Design Lead)')?.trim()
  if (!name) return
  const key = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
  state.resumes.set(key, { profile_key: key, profile_name: name, data: empty() })
  state.currentKey = key
  state.dirty = true
  renderAll()
}

function renameProfile() {
  const row = current()
  const name = prompt('Novo nome do perfil', row.profile_name)?.trim()
  if (!name) return
  row.profile_name = name
  state.dirty = true
  renderAll()
}

function setSaveStatus(t: string) {
  const el = document.getElementById('save-status')
  if (el) el.textContent = t
}

/* ---------- rendering ---------- */

function renderAll() {
  localStorage.setItem('cv:key', state.currentKey)
  localStorage.setItem('cv:lang', state.lang)
  localStorage.setItem('cv:style', state.style)
  renderProfileSelect()
  renderToggles()
  renderEditor()
  renderPreview()
}

function renderProfileSelect() {
  const sel = document.getElementById('profile-select') as HTMLSelectElement
  sel.innerHTML = ''
  for (const row of state.resumes.values()) {
    const o = document.createElement('option')
    o.value = row.profile_key
    o.textContent = row.profile_name
    if (row.profile_key === state.currentKey) o.selected = true
    sel.appendChild(o)
  }
}

function renderToggles() {
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(b => {
    b.classList.toggle('bg-accent', b.dataset.lang === state.lang)
    b.classList.toggle('text-black', b.dataset.lang === state.lang)
  })
  document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b => {
    b.classList.toggle('bg-accent', b.dataset.style === state.style)
    b.classList.toggle('text-black', b.dataset.style === state.style)
  })
}

/* ---------- editor form ---------- */

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

function input(label: string, value: string, onchange: (v: string) => void, type = 'text'): HTMLDivElement {
  const wrap = el<HTMLDivElement>('div', { class: 'space-y-1' })
  wrap.appendChild(el('label', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, label))
  const i = el<HTMLInputElement>('input', {
    type, value,
    class: 'w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-accent'
  })
  i.addEventListener('input', () => { onchange(i.value); markDirty(); renderPreview() })
  wrap.appendChild(i)
  return wrap
}

function textarea(label: string, value: string, onchange: (v: string) => void, rows = 3): HTMLDivElement {
  const wrap = el<HTMLDivElement>('div', { class: 'space-y-1' })
  wrap.appendChild(el('label', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, label))
  const t = el<HTMLTextAreaElement>('textarea', {
    rows: String(rows),
    class: 'w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-accent'
  })
  t.value = value
  t.addEventListener('input', () => { onchange(t.value); markDirty(); renderPreview() })
  wrap.appendChild(t)
  return wrap
}

function localizedInput(label: string, val: Localized, kind: 'input' | 'area' = 'input'): HTMLDivElement {
  const wrap = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  const build = (lang: Lang) => kind === 'input'
    ? input(`${label} (${lang.toUpperCase()})`, val[lang] || '', v => val[lang] = v)
    : textarea(`${label} (${lang.toUpperCase()})`, val[lang] || '', v => val[lang] = v, 3)
  wrap.appendChild(build('pt'))
  wrap.appendChild(build('en'))
  return wrap
}

function sectionTitle(title: string, onAdd?: () => void): HTMLElement {
  const h = el<HTMLDivElement>('div', { class: 'flex items-center justify-between border-b border-[var(--color-border)] pb-2 mb-4' })
  h.appendChild(el('h2', { class: 'font-serif text-xl' }, title))
  if (onAdd) {
    const b = el<HTMLButtonElement>('button', { class: 'text-xs px-3 py-1 border border-[var(--color-border)] rounded hover:border-accent' }, '+ Adicionar')
    b.addEventListener('click', () => { onAdd(); renderEditor(); renderPreview(); markDirty() })
    h.appendChild(b)
  }
  return h
}

function removeBtn(onclick: () => void): HTMLButtonElement {
  const b = el<HTMLButtonElement>('button', { class: 'text-xs text-red-500 hover:underline' }, 'Remover')
  b.addEventListener('click', () => { onclick(); renderEditor(); renderPreview(); markDirty() })
  return b
}

function markDirty() { state.dirty = true; setSaveStatus('Alterações não salvas') }

function renderEditor() {
  const pane = document.getElementById('editor-pane')!
  pane.innerHTML = ''
  const d = current().data

  // Header
  const hs = el<HTMLDivElement>('section', { class: 'space-y-3' })
  hs.appendChild(sectionTitle('Cabeçalho'))
  hs.appendChild(input('Nome completo', d.header.name, v => d.header.name = v))
  hs.appendChild(localizedInput('Headline', d.header.headline))
  const row1 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  row1.appendChild(input('Localização', d.header.location, v => d.header.location = v))
  row1.appendChild(input('Email', d.header.email, v => d.header.email = v, 'email'))
  hs.appendChild(row1)
  const row2 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  row2.appendChild(input('Telefone', d.header.phone, v => d.header.phone = v))
  row2.appendChild(input('Website', d.header.website, v => d.header.website = v))
  hs.appendChild(row2)
  const row3 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  row3.appendChild(input('LinkedIn', d.header.linkedin, v => d.header.linkedin = v))
  row3.appendChild(input('GitHub', d.header.github, v => d.header.github = v))
  hs.appendChild(row3)
  hs.appendChild(input('Foto (URL)', d.header.photo, v => d.header.photo = v))
  pane.appendChild(hs)

  // Summary
  const ss = el<HTMLDivElement>('section', { class: 'space-y-3' })
  ss.appendChild(sectionTitle('Resumo'))
  ss.appendChild(localizedInput('Resumo profissional', d.summary, 'area'))
  pane.appendChild(ss)

  // Experience
  const es = el<HTMLDivElement>('section', { class: 'space-y-4' })
  es.appendChild(sectionTitle('Experiência', () => d.experience.unshift({
    company: '', role: { pt: '', en: '' }, location: '', start: '', end: '', current: false,
    summary: { pt: '', en: '' }, achievements: [],
  })))
  d.experience.forEach((exp, i) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Experiência #${i + 1}`))
    head.appendChild(removeBtn(() => d.experience.splice(i, 1)))
    c.appendChild(head)
    c.appendChild(input('Empresa', exp.company, v => exp.company = v))
    c.appendChild(localizedInput('Cargo', exp.role))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-3 gap-3' })
    r.appendChild(input('Local', exp.location, v => exp.location = v))
    r.appendChild(input('Início (MM/AAAA)', exp.start, v => exp.start = v))
    r.appendChild(input('Fim (MM/AAAA)', exp.end, v => exp.end = v))
    c.appendChild(r)
    const cur = el<HTMLLabelElement>('label', { class: 'flex items-center gap-2 text-xs' })
    const chk = el<HTMLInputElement>('input', { type: 'checkbox' })
    chk.checked = exp.current
    chk.addEventListener('change', () => { exp.current = chk.checked; markDirty(); renderPreview() })
    cur.appendChild(chk); cur.appendChild(document.createTextNode('Emprego atual'))
    c.appendChild(cur)
    c.appendChild(localizedInput('Resumo do cargo', exp.summary, 'area'))

    // Achievements
    const ach = el<HTMLDivElement>('div', { class: 'space-y-2' })
    const ahead = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    ahead.appendChild(el('span', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, 'Conquistas / bullets'))
    const add = el<HTMLButtonElement>('button', { class: 'text-xs px-2 py-1 border border-[var(--color-border)] rounded hover:border-accent' }, '+ Bullet')
    add.addEventListener('click', () => { exp.achievements.push({ pt: '', en: '' }); renderEditor(); renderPreview(); markDirty() })
    ahead.appendChild(add)
    ach.appendChild(ahead)
    exp.achievements.forEach((a, ai) => {
      const line = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-[1fr_1fr_auto] gap-2 items-start' })
      const tpt = el<HTMLInputElement>('input', { type: 'text', placeholder: 'PT', class: 'bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm' })
      tpt.value = a.pt
      tpt.addEventListener('input', () => { a.pt = tpt.value; markDirty(); renderPreview() })
      const ten = el<HTMLInputElement>('input', { type: 'text', placeholder: 'EN', class: 'bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm' })
      ten.value = a.en
      ten.addEventListener('input', () => { a.en = ten.value; markDirty(); renderPreview() })
      line.appendChild(tpt); line.appendChild(ten)
      line.appendChild(removeBtn(() => exp.achievements.splice(ai, 1)))
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
    c.appendChild(input('Instituição', ed.school, v => ed.school = v))
    c.appendChild(localizedInput('Grau / Curso', ed.degree))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
    r.appendChild(input('Início', ed.start, v => ed.start = v))
    r.appendChild(input('Fim', ed.end, v => ed.end = v))
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
    c.appendChild(localizedInput('Categoria', sk.category))
    c.appendChild(textarea('Itens (separados por vírgula)', sk.items.join(', '), v => sk.items = v.split(',').map(s => s.trim()).filter(Boolean), 2))
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
    c.appendChild(localizedInput('Idioma', lg.name))
    c.appendChild(localizedInput('Nível', lg.level))
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
    c.appendChild(input('Nome', ct.name, v => ct.name = v))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
    r.appendChild(input('Emissor', ct.issuer, v => ct.issuer = v))
    r.appendChild(input('Ano', ct.year, v => ct.year = v))
    c.appendChild(r)
    cs.appendChild(c)
  })
  pane.appendChild(cs)
}

/* ---------- preview / print ---------- */

function esc(s: string) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)) }
function L(v: Localized): string { return esc(v?.[state.lang] || v?.pt || v?.en || '') }

function fmtDate(exp: { start: string; end: string; current: boolean }): string {
  const endLabel = state.lang === 'pt' ? 'Atual' : 'Present'
  return `${esc(exp.start)} — ${exp.current ? endLabel : esc(exp.end)}`.replace(/^ — /, '')
}

function labels() {
  return state.lang === 'pt'
    ? { summary: 'Resumo', experience: 'Experiência', education: 'Formação', skills: 'Competências', languages: 'Idiomas', certifications: 'Certificações' }
    : { summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications' }
}

function renderPreview() {
  const p = document.getElementById('preview')!
  const d = current().data
  p.innerHTML = state.style === 'linkedin' ? linkedinTemplate(d) : atsTemplate(d)
  p.className = 'mx-auto my-6 shadow-2xl bg-white'
  if (state.style === 'linkedin') p.classList.add('cv-linkedin')
  else p.classList.add('cv-ats')
}

function linkedinTemplate(d: ResumeData): string {
  const l = labels()
  const contacts = [d.header.email, d.header.phone, d.header.location, d.header.website, d.header.linkedin, d.header.github].filter(Boolean).map(esc).join(' · ')
  return `
  <article class="cv-page">
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
        <div class="cv-item__head">
          <strong>${L(x.role)}</strong>
          <span class="cv-item__meta">${fmtDate(x)}</span>
        </div>
        <div class="cv-item__sub">${esc(x.company)}${x.location ? ' · ' + esc(x.location) : ''}</div>
        ${L(x.summary) ? `<p class="cv-item__body">${L(x.summary)}</p>` : ''}
        ${x.achievements.length ? `<ul class="cv-list">${x.achievements.map(a => `<li>${L(a)}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}</section>` : ''}

    ${d.education.length ? `<section class="cv-section"><h2>${l.education}</h2>${d.education.map(ed => `
      <div class="cv-item">
        <div class="cv-item__head"><strong>${L(ed.degree)}</strong><span class="cv-item__meta">${esc(ed.start)}${ed.end ? ' — ' + esc(ed.end) : ''}</span></div>
        <div class="cv-item__sub">${esc(ed.school)}</div>
      </div>`).join('')}</section>` : ''}

    ${d.skills.length ? `<section class="cv-section"><h2>${l.skills}</h2>${d.skills.map(sk => `
      <div class="cv-skill"><strong>${L(sk.category)}:</strong> ${sk.items.map(esc).join(' · ')}</div>`).join('')}</section>` : ''}

    ${d.languages.length ? `<section class="cv-section"><h2>${l.languages}</h2><ul class="cv-inline">${d.languages.map(lg => `<li>${L(lg.name)} — <em>${L(lg.level)}</em></li>`).join('')}</ul></section>` : ''}

    ${d.certifications.length ? `<section class="cv-section"><h2>${l.certifications}</h2>${d.certifications.map(c => `
      <div class="cv-item"><strong>${esc(c.name)}</strong> — ${esc(c.issuer)}${c.year ? ' (' + esc(c.year) + ')' : ''}</div>`).join('')}</section>` : ''}
  </article>`
}

function atsTemplate(d: ResumeData): string {
  const l = labels()
  const contactLines = [
    d.header.email, d.header.phone, d.header.location,
    d.header.linkedin, d.header.github, d.header.website
  ].filter(Boolean).map(esc).join(' | ')
  return `
  <article class="cv-page cv-ats__page">
    <h1 class="cv-ats__name">${esc(d.header.name)}</h1>
    <p class="cv-ats__headline">${L(d.header.headline)}</p>
    <p class="cv-ats__contacts">${contactLines}</p>

    ${L(d.summary) ? `<h2>${l.summary}</h2><p>${L(d.summary).replace(/\n/g, '<br/>')}</p>` : ''}

    ${d.experience.length ? `<h2>${l.experience}</h2>${d.experience.map(x => `
      <p><strong>${L(x.role)}</strong> — ${esc(x.company)}${x.location ? ', ' + esc(x.location) : ''}<br/>
      <em>${fmtDate(x)}</em></p>
      ${L(x.summary) ? `<p>${L(x.summary)}</p>` : ''}
      ${x.achievements.length ? `<ul>${x.achievements.map(a => `<li>${L(a)}</li>`).join('')}</ul>` : ''}
    `).join('')}` : ''}

    ${d.education.length ? `<h2>${l.education}</h2>${d.education.map(ed => `
      <p><strong>${L(ed.degree)}</strong> — ${esc(ed.school)}<br/><em>${esc(ed.start)}${ed.end ? ' — ' + esc(ed.end) : ''}</em></p>`).join('')}` : ''}

    ${d.skills.length ? `<h2>${l.skills}</h2>${d.skills.map(sk => `<p><strong>${L(sk.category)}:</strong> ${sk.items.map(esc).join(', ')}</p>`).join('')}` : ''}

    ${d.languages.length ? `<h2>${l.languages}</h2><p>${d.languages.map(lg => `${L(lg.name)} (${L(lg.level)})`).join(', ')}</p>` : ''}

    ${d.certifications.length ? `<h2>${l.certifications}</h2>${d.certifications.map(c => `<p>${esc(c.name)} — ${esc(c.issuer)}${c.year ? ', ' + esc(c.year) : ''}</p>`).join('')}` : ''}
  </article>`
}

/* ---------- print ---------- */

function exportPDF() {
  document.body.classList.add('printing-cv')
  window.print()
  setTimeout(() => document.body.classList.remove('printing-cv'), 500)
}

/* ---------- wiring ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initAuthForm()
  bootstrap()

  document.getElementById('signout-btn')!.addEventListener('click', () => supabase.auth.signOut())
  document.getElementById('save-btn')!.addEventListener('click', save)
  document.getElementById('export-btn')!.addEventListener('click', exportPDF)
  document.getElementById('profile-new')!.addEventListener('click', newProfile)
  document.getElementById('profile-rename')!.addEventListener('click', renameProfile)
  document.getElementById('profile-delete')!.addEventListener('click', deleteProfile)
  ;(document.getElementById('profile-select') as HTMLSelectElement).addEventListener('change', (e) => {
    state.currentKey = (e.target as HTMLSelectElement).value
    renderAll()
  })
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(b => b.addEventListener('click', () => {
    state.lang = b.dataset.lang as Lang; renderAll()
  }))
  document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b => b.addEventListener('click', () => {
    state.style = b.dataset.style as Style; renderAll()
  }))

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) { e.preventDefault(); e.returnValue = '' }
  })
})
