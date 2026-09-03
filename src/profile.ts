import { supabase, ALLOWED_EMAIL } from './supabase'
import type { Session } from '@supabase/supabase-js'
import { especialistaData, coordenadorData, defaultLetterData, defaultInterviewData, defaultBaseData, emptyResumeVersion } from './profileDefaults'
import type { ResumeData, LetterData, InterviewData, InterviewCase, BaseData, ComposedResume, SkillGroup, Certification, Header, Experience } from './profileDefaults'

type Lang = 'pt' | 'en'
type Style = 'linkedin' | 'ats'
type Tab = 'profile' | 'carta' | 'links' | 'interview'
type Localized = { pt: string; en: string }

/* ─── State ──────────────────────────────────────────────────────────── */

const state = {
  lang:       (localStorage.getItem('cv:lang')   as Lang)  || 'pt',
  style:      (localStorage.getItem('cv:style')  as Style) || 'linkedin',
  tab:        (localStorage.getItem('cv:tab')    as Tab)   || 'profile',
  // The document itself is the point of the page, so it opens as a plain
  // preview; the form only takes half the screen once you ask to edit.
  editing:    localStorage.getItem('cv:editing') === '1',
  resumeKey:  localStorage.getItem('cv:key')   || 'especialista',
  letterKey:  localStorage.getItem('cv:lkey')  || 'carta-padrao',
  interviewKey: localStorage.getItem('cv:ikey') || 'interview-padrao',
  // Header, experience, education, languages and the skill/certification
  // catalogues live here once and feed every version.
  base:       { row: null as { id?: string } | null, data: defaultBaseData(), dirty: false },
  resumes:    new Map<string, { id?: string; profile_key: string; profile_name: string; data: ResumeData; legacy?: unknown }>(),
  letters:    new Map<string, { id?: string; profile_key: string; profile_name: string; data: LetterData }>(),
  interviews: new Map<string, { id?: string; profile_key: string; profile_name: string; data: InterviewData }>(),
  session:    null as Session | null,
  dirty:      false,
}

const DEFAULT_RESUMES = [
  { key: 'especialista', name: 'Especialista', seed: especialistaData },
  { key: 'coordenador',  name: 'Coordenador',  seed: coordenadorData  },
]
// Which saved CV supplies the career when the shared base is first built.
const BASE_SOURCE_KEY = 'especialista'
const BASE_KEY = 'base'
const DEFAULT_LETTERS = [
  { key: 'carta-padrao', name: 'Padrão', seed: defaultLetterData },
]
const DEFAULT_INTERVIEWS = [
  { key: 'interview-padrao', name: 'Padrão', seed: defaultInterviewData },
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
  state.interviews.clear()

  const resumeRows: any[] = []
  let baseRow: any = null

  for (const row of (data || [])) {
    if (row.data?.kind === 'base') {
      baseRow = row
    } else if (row.data?.kind === 'letter') {
      const ld = row.data as any
      if (Array.isArray(ld.paragraphs) && !ld.body) {
        ld.body = { pt: ld.paragraphs.map((p: any) => p.pt || '').join('\n\n'), en: ld.paragraphs.map((p: any) => p.en || '').join('\n\n') }
        delete ld.paragraphs
      }
      state.letters.set(row.profile_key, { id: row.id, profile_key: row.profile_key, profile_name: row.profile_name, data: ld as LetterData })
    } else if (row.data?.kind === 'interview') {
      const iv = { ...defaultInterviewData(), ...row.data } as InterviewData
      if (!Array.isArray(iv.cases)) iv.cases = []
      state.interviews.set(row.profile_key, { id: row.id, profile_key: row.profile_key, profile_name: row.profile_name, data: iv })
    } else {
      resumeRows.push(row)
    }
  }

  const legacyRows = resumeRows.filter(r => isLegacyResume(r.data))

  if (baseRow) {
    state.base = { row: { id: baseRow.id }, data: normalizeBase(baseRow.data), dirty: false }
  } else {
    // First load after the shared-base change: fold the saved CVs into one base.
    state.base = { row: null, data: buildBaseFromLegacy(legacyRows), dirty: true }
  }
  migrateExperienceLocation(state.base.data.experience)

  for (const row of resumeRows) {
    const data = isLegacyResume(row.data)
      ? versionFromLegacy(row.data, state.base.data)
      : normalizeVersion(row.data)
    state.resumes.set(row.profile_key, {
      id: row.id, profile_key: row.profile_key, profile_name: row.profile_name, data,
      // The pre-base payload is kept verbatim so nothing a version used to hold
      // is lost the first time it is saved in the new shape.
      legacy: isLegacyResume(row.data) ? row.data : row.data?.legacy,
    })
  }

  for (const p of DEFAULT_RESUMES) {
    if (!state.resumes.has(p.key)) state.resumes.set(p.key, { profile_key: p.key, profile_name: p.name, data: p.seed() })
  }
  for (const p of DEFAULT_LETTERS) {
    if (!state.letters.has(p.key)) state.letters.set(p.key, { profile_key: p.key, profile_name: p.name, data: p.seed() })
  }
  for (const p of DEFAULT_INTERVIEWS) {
    if (!state.interviews.has(p.key)) state.interviews.set(p.key, { profile_key: p.key, profile_name: p.name, data: p.seed() })
  }

  if (!state.resumes.has(state.resumeKey)) state.resumeKey = state.resumes.keys().next().value!
  if (!state.letters.has(state.letterKey)) state.letterKey = state.letters.keys().next().value!
  if (!state.interviews.has(state.interviewKey)) state.interviewKey = state.interviews.keys().next().value!

  renderAll()

  // The base has to exist as a row before a version can point at it, so it is
  // written once, on its own — the CV versions still wait for Salvar.
  if (state.base.dirty) await saveBase('Base compartilhada criada a partir do Especialista.')
}

/* ─── Shared base: building and migration ────────────────────────────── */

// Before the shared base, every version carried its own full CV; those rows are
// the ones with a `header` inside `data`.
function isLegacyResume(data: any): boolean {
  return !!data && typeof data === 'object' && !data.kind && !!data.header
}

function slugId(prefix: string, text: string, taken: Set<string>): string {
  const slug = (text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item'
  let id = `${prefix}-${slug}`
  let n = 2
  while (taken.has(id)) id = `${prefix}-${slug}-${n++}`
  taken.add(id)
  return id
}

const skillKey = (g: any) => (g?.category?.pt || g?.category?.en || '').trim().toLowerCase()
const certKey = (c: any) => `${(c?.name || '').trim().toLowerCase()}|${(c?.issuer || '').trim().toLowerCase()}`

// The chosen base profile supplies the career itself; the skill and
// certification catalogues take everything every version had, so switching a
// group off in one version never deletes it for the others.
function buildBaseFromLegacy(legacyRows: any[]): BaseData {
  const source = legacyRows.find(r => r.profile_key === BASE_SOURCE_KEY) || legacyRows[0]
  if (!source) return defaultBaseData()
  const d = source.data

  const { headline, ...header } = d.header || {}
  void headline // headline is per version now

  const skillIds = new Set<string>()
  const skills: SkillGroup[] = []
  const seenSkill = new Set<string>()
  const certIds = new Set<string>()
  const certifications: Certification[] = []
  const seenCert = new Set<string>()

  for (const row of [source, ...legacyRows.filter(r => r !== source)]) {
    for (const g of (row.data?.skills || [])) {
      const key = skillKey(g)
      if (!key || seenSkill.has(key)) continue
      seenSkill.add(key)
      skills.push({ id: slugId('sk', g.category?.pt || g.category?.en, skillIds), category: g.category, items: [...(g.items || [])] })
    }
    for (const c of (row.data?.certifications || [])) {
      const key = certKey(c)
      if (key === '|' || seenCert.has(key)) continue
      seenCert.add(key)
      certifications.push({ id: slugId('ct', `${c.name} ${c.issuer}`, certIds), name: c.name, issuer: c.issuer, year: c.year })
    }
  }

  return {
    kind: 'base',
    header: { ...defaultBaseData().header, ...header } as Header,
    experience: d.experience || [],
    education: d.education || [],
    languages: d.languages || [],
    skills,
    certifications,
  }
}

function normalizeBase(data: any): BaseData {
  const seed = defaultBaseData()
  const b = { ...seed, ...data, kind: 'base' as const }
  b.header = { ...seed.header, ...(data?.header || {}) }
  for (const k of ['experience', 'education', 'languages', 'skills', 'certifications'] as const) {
    if (!Array.isArray(b[k])) (b as any)[k] = []
  }
  const skillIds = new Set<string>()
  b.skills = b.skills.map((g: any) => g.id ? g : { ...g, id: slugId('sk', g.category?.pt || g.category?.en, skillIds) })
  const certIds = new Set<string>()
  b.certifications = b.certifications.map((c: any) => c.id ? c : { ...c, id: slugId('ct', `${c.name} ${c.issuer}`, certIds) })
  return b
}

function normalizeVersion(data: any): ResumeData {
  const v = emptyResumeVersion()
  return {
    headline: { ...v.headline, ...(data?.headline || {}) },
    summary: { ...v.summary, ...(data?.summary || {}) },
    skills: Array.isArray(data?.skills) ? data.skills.filter((s: any) => typeof s === 'string') : [],
    certifications: Array.isArray(data?.certifications) ? data.certifications.filter((s: any) => typeof s === 'string') : [],
  }
}

// A version keeps its headline and About; what it used to carry of the shared
// sections becomes the set of catalogue entries it switches on.
function versionFromLegacy(data: any, base: BaseData): ResumeData {
  const skillByKey = new Map(base.skills.map(g => [skillKey(g), g.id]))
  const certByKey = new Map(base.certifications.map(c => [certKey(c), c.id]))
  const pick = <T,>(items: any[], key: (x: any) => string, index: Map<string, T>) =>
    [...new Set((items || []).map(x => index.get(key(x))).filter(Boolean) as T[])]

  return {
    headline: { pt: data.header?.headline?.pt || '', en: data.header?.headline?.en || '' },
    summary: { pt: data.summary?.pt || '', en: data.summary?.en || '' },
    skills: pick(data.skills, skillKey, skillByKey),
    certifications: pick(data.certifications, certKey, certByKey),
  }
}

/* ─── Composing base + version ───────────────────────────────────────── */

function composeResume(version: ResumeData): ComposedResume {
  const b = state.base.data
  return {
    header: b.header,
    headline: version.headline,
    summary: version.summary,
    experience: b.experience,
    education: b.education,
    languages: b.languages,
    skills: b.skills.filter(g => version.skills.includes(g.id)),
    certifications: b.certifications.filter(c => version.certifications.includes(c.id)),
  }
}

function currentVersion(): ResumeData { return state.resumes.get(state.resumeKey)!.data }

// Experience.location used to be a single string, so a stored row could render
// "São Paulo, Brazil · Presencial" inside an English CV. Split it per language on
// load, translating the work-model suffix so existing rows come out right in
// English without hand-editing every entry.
const WORK_MODEL: Record<string, string> = { 'Presencial': 'On-site', 'Híbrido': 'Hybrid', 'Hibrido': 'Hybrid', 'Remoto': 'Remote' }

function migrateExperienceLocation(experience: Experience[]) {
  for (const exp of experience) {
    const loc = exp.location as unknown
    if (typeof loc !== 'string') continue
    let en = loc
    for (const [pt, translated] of Object.entries(WORK_MODEL)) {
      if (en.includes(pt)) en = en.replace(pt, translated)
    }
    exp.location = { pt: loc, en }
  }
}

/* ─── Persistence ────────────────────────────────────────────────────── */

async function saveBase(note?: string): Promise<boolean> {
  if (!state.session) return false
  const payload = {
    user_id: state.session.user.id,
    profile_key: BASE_KEY,
    profile_name: 'Base compartilhada',
    data: state.base.data,
  }
  const { data, error } = await supabase.from('resumes').upsert(payload, { onConflict: 'user_id,profile_key' }).select().single()
  if (error) { setSaveStatus('Erro ao salvar a base: ' + error.message); return false }
  state.base.row = { id: (data as any).id }
  state.base.dirty = false
  if (note) setSaveStatus(note)
  return true
}

async function saveResume() {
  if (!state.session) return
  const row = state.resumes.get(state.resumeKey)!
  setSaveStatus('Salvando…')
  // The base carries the sections every version shares, so it goes with any
  // save from the Curriculum tab.
  if (!await saveBase()) return
  const payload = {
    user_id: state.session.user.id,
    profile_key: row.profile_key,
    profile_name: row.profile_name,
    data: row.legacy ? { ...row.data, legacy: row.legacy } : row.data,
  }
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

async function saveInterview() {
  if (!state.session) return
  const row = state.interviews.get(state.interviewKey)!
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

async function deleteInterview() {
  const row = state.interviews.get(state.interviewKey)!
  if (!confirm(`Excluir interview "${row.profile_name}"?`)) return
  if (row.id) {
    const { error } = await supabase.from('resumes').delete().eq('id', row.id)
    if (error) return setSaveStatus('Erro: ' + error.message)
  }
  state.interviews.delete(row.profile_key)
  state.interviewKey = state.interviews.keys().next().value || 'interview-padrao'
  if (!state.interviews.has(state.interviewKey)) {
    state.interviews.set('interview-padrao', { profile_key: 'interview-padrao', profile_name: 'Padrão', data: defaultInterviewData() })
    state.interviewKey = 'interview-padrao'
  }
  renderAll()
}

function newResume() {
  const name = prompt('Nome do novo perfil (ex: Product Design Lead)')?.trim()
  if (!name) return
  const key = 'custom-' + Date.now().toString(36)
  // Experience, education and languages already come from the shared base, so a
  // new version starts with everything switched on and only needs its own
  // headline and About.
  state.resumes.set(key, {
    profile_key: key,
    profile_name: name,
    data: {
      headline: { pt: '', en: '' },
      summary: { pt: '', en: '' },
      skills: state.base.data.skills.map(g => g.id),
      certifications: state.base.data.certifications.map(c => c.id),
    },
  })
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

function newInterview() {
  const name = prompt('Nome do novo interview (ex: Nubank — Design Lead)')?.trim()
  if (!name) return
  const key = 'interview-' + Date.now().toString(36)
  state.interviews.set(key, { profile_key: key, profile_name: name, data: defaultInterviewData() })
  state.interviewKey = key
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

function renameInterview() {
  const row = state.interviews.get(state.interviewKey)!
  const name = prompt('Novo nome do interview', row.profile_name)?.trim()
  if (!name) return
  row.profile_name = name; markDirty(); renderAll()
}

function setSaveStatus(t: string) {
  const el = document.getElementById('save-status')
  if (el) el.textContent = t
}

function markDirty() { state.dirty = true; setSaveStatus('Alterações não salvas') }

// An edit to a shared section changes every version, so the base row has to go
// out with the next save too.
function markBaseDirty() { state.base.dirty = true; markDirty() }

/* ─── Render all ─────────────────────────────────────────────────────── */

function renderAll() {
  localStorage.setItem('cv:key',   state.resumeKey)
  localStorage.setItem('cv:lkey',  state.letterKey)
  localStorage.setItem('cv:ikey',  state.interviewKey)
  localStorage.setItem('cv:lang',  state.lang)
  localStorage.setItem('cv:style', state.style)
  localStorage.setItem('cv:tab',   state.tab)
  localStorage.setItem('cv:editing', state.editing ? '1' : '0')

  renderTabs()
  renderLangStyleToggles()
  // Before rendering: the preview scales itself to its column, so the column
  // has to be at its final width first.
  applyEditingLayout()

  if (state.tab === 'profile') {
    renderResumeSelect()
    if (state.editing) renderResumeEditor()
    renderResumePreview()
  } else if (state.tab === 'carta') {
    renderLetterSelect()
    if (state.editing) renderLetterEditor()
    renderLetterPreview()
  } else if (state.tab === 'interview') {
    renderInterviewSelect()
    renderInterview()
  } else {
    renderLinks()
  }
}

/* ─── Preview / edit mode ────────────────────────────────────────────── */

function applyEditingLayout() {
  const panes: [string, string][] = [
    ['tab-profile', 'editor-pane'],
    ['tab-carta', 'letter-editor-pane'],
  ]
  for (const [panelId, paneId] of panes) {
    const panel = document.getElementById(panelId)
    const pane = document.getElementById(paneId)
    if (!panel || !pane) continue
    pane.classList.toggle('hidden', !state.editing)
    // Dropping the two-column split lets the preview use the full width.
    panel.classList.toggle('lg:grid-cols-2', state.editing)
  }

  document.querySelectorAll<HTMLElement>('.edit-btn').forEach(b => {
    b.classList.toggle('bg-accent', state.editing)
    b.classList.toggle('text-black', state.editing)
    const label = b.querySelector('.edit-btn__label')
    if (label) label.textContent = state.editing ? 'Fechar edição' : 'Editar'
  })
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

function renderInterviewSelect() {
  const sel = document.getElementById('interview-select') as HTMLSelectElement
  sel.innerHTML = ''
  for (const row of state.interviews.values()) {
    const o = document.createElement('option')
    o.value = row.profile_key
    o.textContent = row.profile_name
    if (row.profile_key === state.interviewKey) o.selected = true
    sel.appendChild(o)
  }
}

/* ─── Resume editor ──────────────────────────────────────────────────── */

// A card that is switched off still shows its fields — the content is shared,
// so it stays editable — but reads as excluded from the version on screen.
function includeToggle(isOn: () => boolean, set: (on: boolean) => void, card: HTMLElement): HTMLLabelElement {
  const wrap = el<HTMLLabelElement>('label', { class: 'flex items-center gap-2 text-xs shrink-0 cursor-pointer select-none' })
  const cb = el<HTMLInputElement>('input', { type: 'checkbox', class: 'accent-[var(--color-accent)] w-4 h-4' })
  const label = el<HTMLSpanElement>('span', {})
  const paint = () => {
    const on = isOn()
    cb.checked = on
    label.textContent = on ? 'Incluído' : 'Fora desta versão'
    label.className = on ? 'text-text-primary-dark' : 'text-text-muted-dark'
    card.classList.toggle('opacity-45', !on)
  }
  cb.addEventListener('change', () => { set(cb.checked); paint(); markDirty(); renderResumePreview() })
  paint()
  wrap.appendChild(cb)
  wrap.appendChild(label)
  return wrap
}

// Section heading for a shared catalogue: add a new entry, or switch the whole
// catalogue on or off for this version in one go.
function catalogTitle(title: string, onAdd: () => void, onAll: () => void, onNone: () => void): HTMLElement {
  const h = el<HTMLDivElement>('div', { class: 'flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 mb-4' })
  h.appendChild(el('h2', { class: 'font-serif text-xl' }, title))
  const acts = el<HTMLDivElement>('div', { class: 'flex items-center gap-2' })
  const btn = (text: string, fn: () => void) => {
    const b = el<HTMLButtonElement>('button', { class: 'text-xs px-3 py-1 border border-[var(--color-border)] rounded hover:border-accent' }, text)
    b.addEventListener('click', () => { fn(); markDirty(); renderResumeEditor(); renderResumePreview() })
    return b
  }
  acts.appendChild(btn('Todas', onAll))
  acts.appendChild(btn('Nenhuma', onNone))
  acts.appendChild(btn('+ Adicionar', onAdd))
  h.appendChild(acts)
  return h
}

function sharedBanner(text: string): HTMLElement {
  return el('p', { class: 'text-[11px] leading-relaxed text-text-muted-dark border border-[var(--color-border)] rounded-lg px-3 py-2' }, text)
}

function renderResumeEditor() {
  const pane = document.getElementById('editor-pane')!
  pane.innerHTML = ''
  const v = currentVersion()
  const b = state.base.data
  sortExperienceByDate(b.experience)
  const refresh = () => renderResumePreview()
  // Everything below the version block is shared, so editing it has to mark the
  // base for saving as well.
  const refreshBase = () => { state.base.dirty = true; renderResumePreview() }

  /* ── This version ── */
  const vs = el<HTMLDivElement>('section', { class: 'space-y-3' })
  vs.appendChild(sectionTitle('Esta versão'))
  vs.appendChild(sharedBanner('Só a Headline e o About mudam de uma versão para outra. Todo o resto vem da base compartilhada abaixo.'))
  vs.appendChild(localized('Headline (cargo)', v.headline, 'input', refresh))
  vs.appendChild(localized('About / Resumo', v.summary, 'area', refresh))
  pane.appendChild(vs)

  /* ── Skills: shared catalogue, per-version switches ── */
  const sks = el<HTMLDivElement>('section', { class: 'space-y-4' })
  sks.appendChild(catalogTitle('Competências',
    () => { const g = { id: 'sk-' + Date.now().toString(36), category: { pt: '', en: '' }, items: [] }; b.skills.push(g); v.skills.push(g.id); state.base.dirty = true },
    () => { v.skills = b.skills.map(g => g.id) },
    () => { v.skills = [] }))
  sks.appendChild(sharedBanner('As categorias são a mesma base em todas as versões: editar o conteúdo reflete em todas. O que muda por versão é quais entram no currículo.'))
  b.skills.forEach((sk: SkillGroup, i: number) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3 transition-opacity' })
    const head = el<HTMLDivElement>('div', { class: 'flex flex-wrap items-center justify-between gap-2' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Categoria #${i + 1}`))
    const right = el<HTMLDivElement>('div', { class: 'flex items-center gap-3' })
    right.appendChild(includeToggle(
      () => v.skills.includes(sk.id),
      on => { v.skills = on ? [...v.skills, sk.id] : v.skills.filter(id => id !== sk.id) },
      c))
    right.appendChild(removeBtn(() => { b.skills.splice(i, 1); v.skills = v.skills.filter(id => id !== sk.id); state.base.dirty = true }))
    head.appendChild(right)
    c.appendChild(head)
    c.appendChild(localized('Categoria', sk.category, 'input', refreshBase))
    c.appendChild(textarea('Itens (separados por vírgula)', sk.items.join(', '), val => { sk.items = val.split(',').map(s => s.trim()).filter(Boolean); refreshBase() }, 2, refreshBase))
    sks.appendChild(c)
  })
  pane.appendChild(sks)

  /* ── Certifications: shared catalogue, per-version switches ── */
  const cs = el<HTMLDivElement>('section', { class: 'space-y-4' })
  cs.appendChild(catalogTitle('Certificações',
    () => { const ct = { id: 'ct-' + Date.now().toString(36), name: '', issuer: '', year: '' }; b.certifications.push(ct); v.certifications.push(ct.id); state.base.dirty = true },
    () => { v.certifications = b.certifications.map(x => x.id) },
    () => { v.certifications = [] }))
  cs.appendChild(sharedBanner('Mesma base para todas as versões. Marque as que entram nesta.'))
  b.certifications.forEach((ct: Certification, i: number) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3 transition-opacity' })
    const head = el<HTMLDivElement>('div', { class: 'flex flex-wrap items-center justify-between gap-2' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Certificação #${i + 1}`))
    const right = el<HTMLDivElement>('div', { class: 'flex items-center gap-3' })
    right.appendChild(includeToggle(
      () => v.certifications.includes(ct.id),
      on => { v.certifications = on ? [...v.certifications, ct.id] : v.certifications.filter(id => id !== ct.id) },
      c))
    right.appendChild(removeBtn(() => { b.certifications.splice(i, 1); v.certifications = v.certifications.filter(id => id !== ct.id); state.base.dirty = true }))
    head.appendChild(right)
    c.appendChild(head)
    c.appendChild(inp('Nome', ct.name, val => { ct.name = val; refreshBase() }))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
    r.appendChild(inp('Emissor', ct.issuer, val => { ct.issuer = val; refreshBase() }))
    r.appendChild(inp('Ano', ct.year, val => { ct.year = val; refreshBase() }))
    c.appendChild(r)
    cs.appendChild(c)
  })
  pane.appendChild(cs)

  /* ── Shared base ── */
  const baseIntro = el<HTMLDivElement>('section', { class: 'space-y-3 pt-2' })
  baseIntro.appendChild(sectionTitle('Base compartilhada'))
  baseIntro.appendChild(sharedBanner('Cabeçalho, Experiência, Formação e Idiomas são os mesmos em todas as versões. Editar aqui altera todas elas.'))
  pane.appendChild(baseIntro)

  // Header
  const hs = el<HTMLDivElement>('section', { class: 'space-y-3' })
  hs.appendChild(sectionTitle('Cabeçalho'))
  hs.appendChild(inp('Nome completo', b.header.name, val => { b.header.name = val; refreshBase() }))
  const r1 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  r1.appendChild(inp('Localização', b.header.location, val => { b.header.location = val; refreshBase() }))
  r1.appendChild(inp('Email', b.header.email, val => { b.header.email = val; refreshBase() }, 'email'))
  hs.appendChild(r1)
  const r2 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  r2.appendChild(inp('Telefone', b.header.phone, val => { b.header.phone = val; refreshBase() }))
  r2.appendChild(inp('Website / Portfólio', b.header.website, val => { b.header.website = val; refreshBase() }))
  hs.appendChild(r2)
  const r3 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  r3.appendChild(inp('LinkedIn', b.header.linkedin, val => { b.header.linkedin = val; refreshBase() }))
  r3.appendChild(inp('Figma Portfólio', b.header.figma || '', val => { b.header.figma = val; refreshBase() }))
  hs.appendChild(r3)
  const r4 = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
  r4.appendChild(inp('GitHub', b.header.github, val => { b.header.github = val; refreshBase() }))
  r4.appendChild(inp('Foto (URL)', b.header.photo, val => { b.header.photo = val; refreshBase() }))
  hs.appendChild(r4)
  pane.appendChild(hs)

  // Experience
  const es = el<HTMLDivElement>('section', { class: 'space-y-4' })
  es.appendChild(sectionTitle('Experiência', () => { b.experience.unshift({
    company: '', role: { pt: '', en: '' }, location: { pt: '', en: '' }, start: '', end: '', current: false,
    summary: { pt: '', en: '' }, achievements: [],
  }); state.base.dirty = true }))
  b.experience.forEach((exp: Experience, i: number) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Experiência #${i + 1}`))
    head.appendChild(removeBtn(() => { b.experience.splice(i, 1); state.base.dirty = true }))
    c.appendChild(head)
    c.appendChild(inp('Empresa', exp.company, val => { exp.company = val; refreshBase() }))
    c.appendChild(localized('Cargo', exp.role, 'input', refreshBase))
    c.appendChild(localized('Local', exp.location, 'input', refreshBase))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
    r.appendChild(inp('Início (MM/AAAA)', exp.start, val => { exp.start = val; refreshBase() }))
    r.appendChild(inp('Fim (MM/AAAA)', exp.end, val => { exp.end = val; refreshBase() }))
    c.appendChild(r)
    const cur = el<HTMLLabelElement>('label', { class: 'flex items-center gap-2 text-xs' })
    const chk = el<HTMLInputElement>('input', { type: 'checkbox' })
    chk.checked = exp.current
    chk.addEventListener('change', () => { exp.current = chk.checked; markBaseDirty(); renderResumePreview() })
    cur.appendChild(chk); cur.appendChild(document.createTextNode('Emprego atual'))
    c.appendChild(cur)
    c.appendChild(localized('Resumo do cargo', exp.summary, 'area', refreshBase))
    // Achievements
    const ach = el<HTMLDivElement>('div', { class: 'space-y-2' })
    const ahead = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    ahead.appendChild(el('span', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, 'Bullets / Conquistas'))
    const addA = el<HTMLButtonElement>('button', { class: 'text-xs px-2 py-1 border border-[var(--color-border)] rounded hover:border-accent' }, '+ Bullet')
    addA.addEventListener('click', () => { exp.achievements.push({ pt: '', en: '' }); markBaseDirty(); renderResumeEditor(); renderResumePreview() })
    ahead.appendChild(addA)
    ach.appendChild(ahead)
    exp.achievements.forEach((a, ai) => {
      const line = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-[1fr_1fr_auto] gap-2 items-start' })
      const tpt = el<HTMLInputElement>('input', { type: 'text', placeholder: 'PT', class: 'bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm' })
      tpt.value = a.pt
      tpt.addEventListener('input', () => { a.pt = tpt.value; markBaseDirty(); renderResumePreview() })
      const ten = el<HTMLInputElement>('input', { type: 'text', placeholder: 'EN', class: 'bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm' })
      ten.value = a.en
      ten.addEventListener('input', () => { a.en = ten.value; markBaseDirty(); renderResumePreview() })
      const rb = el<HTMLButtonElement>('button', { class: 'text-xs text-red-500 hover:underline' }, 'Rem')
      rb.addEventListener('click', () => { exp.achievements.splice(ai, 1); markBaseDirty(); renderResumeEditor(); renderResumePreview() })
      line.appendChild(tpt); line.appendChild(ten); line.appendChild(rb)
      ach.appendChild(line)
    })
    c.appendChild(ach)
    es.appendChild(c)
  })
  pane.appendChild(es)

  // Education
  const eds = el<HTMLDivElement>('section', { class: 'space-y-4' })
  eds.appendChild(sectionTitle('Formação', () => { b.education.unshift({ school: '', degree: { pt: '', en: '' }, start: '', end: '' }); state.base.dirty = true }))
  b.education.forEach((ed, i) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Formação #${i + 1}`))
    head.appendChild(removeBtn(() => { b.education.splice(i, 1); state.base.dirty = true }))
    c.appendChild(head)
    c.appendChild(inp('Instituição', ed.school, val => { ed.school = val; refreshBase() }))
    c.appendChild(localized('Grau / Curso', ed.degree, 'input', refreshBase))
    const r = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3' })
    r.appendChild(inp('Início', ed.start, val => { ed.start = val; refreshBase() }))
    r.appendChild(inp('Fim', ed.end, val => { ed.end = val; refreshBase() }))
    c.appendChild(r)
    eds.appendChild(c)
  })
  pane.appendChild(eds)

  // Languages
  const ls = el<HTMLDivElement>('section', { class: 'space-y-4' })
  ls.appendChild(sectionTitle('Idiomas', () => { b.languages.push({ name: { pt: '', en: '' }, level: { pt: '', en: '' } }); state.base.dirty = true }))
  b.languages.forEach((lg, i) => {
    const c = el<HTMLDivElement>('div', { class: 'p-4 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between' })
    head.appendChild(el('h3', { class: 'text-sm font-semibold' }, `Idioma #${i + 1}`))
    head.appendChild(removeBtn(() => { b.languages.splice(i, 1); state.base.dirty = true }))
    c.appendChild(head)
    c.appendChild(localized('Idioma', lg.name, 'input', refreshBase))
    c.appendChild(localized('Nível', lg.level, 'input', refreshBase))
    ls.appendChild(c)
  })
  pane.appendChild(ls)
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

/* ─── Interview tab ──────────────────────────────────────────────────── */
// Free-form study notes: one About block plus as many Case blocks as needed.
// Every block is written in both languages side by side — PT on the left, EN on
// the right — so a translation can be checked against its source without
// flipping the top-bar toggle. Each column carries its own Copiar button, so a
// block can be pasted straight into an application form or an interview prep doc.

const LANGS: Lang[] = ['pt', 'en']

function copyBtn(getText: () => string): HTMLButtonElement {
  const b = el<HTMLButtonElement>('button', {
    class: 'text-xs px-3 py-1.5 border border-[var(--color-border)] rounded-lg hover:border-accent shrink-0',
  }, 'Copiar')
  b.addEventListener('click', async () => {
    const text = getText()
    if (!text.trim()) { b.textContent = 'Vazio'; setTimeout(() => b.textContent = 'Copiar', 1500); return }
    try {
      await navigator.clipboard.writeText(text)
      b.textContent = 'Copiado!'
    } catch {
      b.textContent = 'Falhou'
    }
    setTimeout(() => b.textContent = 'Copiar', 1800)
  })
  return b
}

// Keeps the PT and EN textareas of one field the same height, so the two
// columns stay aligned however unevenly the translations grow. Below the md
// breakpoint the columns stack, where a matched height is only wasted space, so
// each textarea grows on its own there.
const sideBySide = () => window.matchMedia('(min-width: 768px)').matches

function growPair(pair: HTMLTextAreaElement[]) {
  let tallest = 0
  for (const t of pair) {
    t.style.height = 'auto'
    tallest = Math.max(tallest, t.scrollHeight)
  }
  for (const t of pair) t.style.height = (sideBySide() ? tallest : t.scrollHeight) + 'px'
}

// Every pair on screen, so a resize that crosses the breakpoint re-measures.
let interviewPairs: HTMLTextAreaElement[][] = []
window.addEventListener('resize', () => interviewPairs.forEach(growPair))

function interviewTextField(label: string, val: Localized, rows: number): HTMLDivElement {
  const wrap = el<HTMLDivElement>('div', { class: 'space-y-2' })
  wrap.appendChild(el('span', { class: 'block text-[11px] uppercase tracking-widest text-text-muted-dark' }, label))

  const grid = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3 items-start' })
  const pair: HTMLTextAreaElement[] = []

  for (const lang of LANGS) {
    const col = el<HTMLDivElement>('div', { class: 'space-y-2 min-w-0' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between gap-3' })
    head.appendChild(el('span', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, lang.toUpperCase()))
    head.appendChild(copyBtn(() => val[lang] || ''))
    col.appendChild(head)

    const t = el<HTMLTextAreaElement>('textarea', {
      rows: String(rows),
      placeholder: lang === 'pt' ? 'Texto corrido…' : 'Running text…',
      class: 'w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-2 text-sm leading-relaxed resize-none overflow-hidden focus:outline-none focus:border-accent',
    })
    t.value = val[lang] || ''
    t.addEventListener('input', () => { val[lang] = t.value; markDirty(); growPair(pair) })
    pair.push(t)
    col.appendChild(t)
    grid.appendChild(col)
  }

  wrap.appendChild(grid)
  interviewPairs.push(pair)
  requestAnimationFrame(() => growPair(pair))
  return wrap
}

function interviewTitleField(c: InterviewCase, onTitleChange: () => void): HTMLDivElement {
  const wrap = el<HTMLDivElement>('div', { class: 'space-y-2' })
  wrap.appendChild(el('span', { class: 'block text-[11px] uppercase tracking-widest text-text-muted-dark' }, 'Título'))

  const grid = el<HTMLDivElement>('div', { class: 'grid md:grid-cols-2 gap-3 items-start' })
  for (const lang of LANGS) {
    const col = el<HTMLDivElement>('div', { class: 'space-y-1 min-w-0' })
    col.appendChild(el('label', { class: 'text-[11px] uppercase tracking-widest text-text-muted-dark' }, lang.toUpperCase()))
    const ti = el<HTMLInputElement>('input', {
      type: 'text',
      placeholder: lang === 'pt' ? 'Ex: Onboarding Daycoval — conversão +25%' : 'Ex: Daycoval onboarding — +25% conversion',
      class: 'w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-accent',
    })
    ti.value = c.title[lang] || ''
    ti.addEventListener('input', () => { c.title[lang] = ti.value; markDirty(); onTitleChange() })
    col.appendChild(ti)
    grid.appendChild(col)
  }

  wrap.appendChild(grid)
  return wrap
}

// The card heading needs one name for a case written in two languages: prefer
// the active language, then whichever side has been filled in.
function caseLabel(c: InterviewCase, i: number): string {
  return c.title[state.lang]?.trim() || c.title.pt?.trim() || c.title.en?.trim() || `Case #${i + 1}`
}

function renderInterview() {
  const panel = document.getElementById('interview-panel')!
  panel.innerHTML = ''
  interviewPairs = []
  const d = state.interviews.get(state.interviewKey)!.data
  if (!Array.isArray(d.cases)) d.cases = []

  panel.appendChild(el('h2', { class: 'font-serif text-2xl font-semibold' }, 'Interview'))
  panel.appendChild(el('p', { class: 'text-xs text-text-muted-dark' },
    'Seu About e os cases para estudar antes da entrevista. Português e inglês ficam lado a lado, e cada coluna tem seu próprio botão Copiar. Lembre de Salvar.'))

  // About
  const about = el<HTMLElement>('section', { class: 'p-4 sm:p-5 border border-[var(--color-border)] rounded-lg space-y-3' })
  about.appendChild(el('h3', { class: 'font-serif text-lg' }, 'About'))
  about.appendChild(interviewTextField('Sobre mim', d.about, 8))
  panel.appendChild(about)

  // Cases
  const casesHead = el<HTMLDivElement>('div', { class: 'flex items-center justify-between border-b border-[var(--color-border)] pb-2' })
  casesHead.appendChild(el('h3', { class: 'font-serif text-lg' }, 'Cases'))
  const add = el<HTMLButtonElement>('button', { class: 'text-xs px-3 py-1 border border-[var(--color-border)] rounded hover:border-accent' }, '+ Adicionar case')
  add.addEventListener('click', () => {
    d.cases.push({ title: { pt: '', en: '' }, body: { pt: '', en: '' } })
    markDirty(); renderInterview()
  })
  casesHead.appendChild(add)
  panel.appendChild(casesHead)

  if (!d.cases.length) {
    panel.appendChild(el('p', { class: 'text-sm text-text-muted-dark italic' }, 'Nenhum case ainda. Use “+ Adicionar case”.'))
  }

  d.cases.forEach((c: InterviewCase, i: number) => {
    const card = el<HTMLDivElement>('div', { class: 'p-4 sm:p-5 border border-[var(--color-border)] rounded-lg space-y-3' })
    const head = el<HTMLDivElement>('div', { class: 'flex items-center justify-between gap-3' })
    const heading = el<HTMLHeadingElement>('h4', { class: 'text-sm font-semibold min-w-0 truncate' }, caseLabel(c, i))
    head.appendChild(heading)
    const rm = el<HTMLButtonElement>('button', { class: 'text-xs text-red-500 hover:underline shrink-0' }, 'Remover')
    rm.addEventListener('click', () => {
      if (!confirm(`Remover ${caseLabel(c, i)}?`)) return
      d.cases.splice(i, 1); markDirty(); renderInterview()
    })
    head.appendChild(rm)
    card.appendChild(head)

    card.appendChild(interviewTitleField(c, () => { heading.textContent = caseLabel(c, i) }))
    card.appendChild(interviewTextField('Case', c.body, 8))
    panel.appendChild(card)
  })
}

/* ─── Links tab ──────────────────────────────────────────────────────── */

function renderLinks() {
  const panel = document.getElementById('links-panel')!
  panel.innerHTML = ''

  const header = state.base.data.header

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
  const d = composeResume(currentVersion())
  sortExperienceByDate(d.experience)
  p.innerHTML = state.style === 'linkedin' ? linkedinTemplate(d) : atsTemplate(d)
  p.className = `shadow-2xl bg-white ${state.style === 'linkedin' ? 'cv-linkedin' : 'cv-ats'}`
  fitPreviewToViewport('preview-frame', 'preview')
}

function linkedinTemplate(d: ComposedResume): string {
  const l = labels()
  const contacts = [d.header.email, d.header.phone, d.header.location, d.header.website, d.header.linkedin, d.header.github, d.header.figma].filter(Boolean).map(esc).join(' · ')
  return `<article class="cv-page">
    <header class="cv-linkedin__header">
      ${d.header.photo ? `<img src="${esc(d.header.photo)}" alt="" class="cv-linkedin__photo"/>` : ''}
      <div>
        <h1 class="cv-linkedin__name">${esc(d.header.name)}</h1>
        <p class="cv-linkedin__headline">${L(d.headline)}</p>
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

function atsTemplate(d: ComposedResume): string {
  const l = labels()
  const contacts = [d.header.email, d.header.phone, d.header.location, d.header.linkedin, d.header.github, d.header.figma, d.header.website].filter(Boolean).map(esc).join(' | ')
  return `<article class="cv-page cv-ats__page">
    <h1 class="cv-ats__name">${esc(d.header.name)}</h1>
    <p class="cv-ats__headline">${L(d.headline)}</p>
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
  const header = state.base.data.header
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

  // Preview / edit mode
  document.querySelectorAll<HTMLButtonElement>('.edit-btn').forEach(b => b.addEventListener('click', () => {
    state.editing = !state.editing; renderAll()
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

  // Interview controls
  document.getElementById('interview-save-btn')!.addEventListener('click', saveInterview)
  document.getElementById('interview-new')!.addEventListener('click', newInterview)
  document.getElementById('interview-rename')!.addEventListener('click', renameInterview)
  document.getElementById('interview-delete')!.addEventListener('click', deleteInterview)
  ;(document.getElementById('interview-select') as HTMLSelectElement).addEventListener('change', (e) => {
    state.interviewKey = (e.target as HTMLSelectElement).value; renderAll()
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
