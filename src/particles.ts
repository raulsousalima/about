const PARTICLE_COUNT = 70
const MOUSE_RADIUS = 140
const REPEL_STRENGTH = 1800
const DAMPING = 0.9

type Particle = {
  baseX: number
  baseY: number
  vx: number
  vy: number
  dx: number
  dy: number
  radius: number
  alpha: number
}

type FieldState = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  section: HTMLElement
  particles: Particle[]
  mouseX: number | null
  mouseY: number | null
  active: boolean
}

function randomParticle(width: number, height: number): Particle {
  return {
    baseX: Math.random() * width,
    baseY: Math.random() * height,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.5) * 14,
    dx: 0,
    dy: 0,
    radius: 1 + Math.random() * 1.5,
    alpha: 0.25 + Math.random() * 0.5,
  }
}

function resize(field: FieldState) {
  field.canvas.width = field.section.clientWidth
  field.canvas.height = field.section.clientHeight
}

function step(field: FieldState, dt: number) {
  const { canvas, ctx, particles, mouseX, mouseY } = field
  const width = canvas.width
  const height = canvas.height
  if (width <= 0 || height <= 0) return

  const rgb = getComputedStyle(document.documentElement).getPropertyValue('--particle-rgb').trim() || '255,255,255'

  ctx.clearRect(0, 0, width, height)

  particles.forEach((p) => {
    p.baseX += p.vx * dt
    p.baseY += p.vy * dt

    if (p.baseX < -10) p.baseX = width + 10
    if (p.baseX > width + 10) p.baseX = -10
    if (p.baseY < -10) p.baseY = height + 10
    if (p.baseY > height + 10) p.baseY = -10

    const px = p.baseX + p.dx
    const py = p.baseY + p.dy

    if (mouseX !== null && mouseY !== null) {
      const ddx = px - mouseX
      const ddy = py - mouseY
      const dist = Math.sqrt(ddx * ddx + ddy * ddy)
      if (dist < MOUSE_RADIUS && dist > 0.01) {
        const force = (1 - dist / MOUSE_RADIUS) * REPEL_STRENGTH
        p.dx += (ddx / dist) * force * dt
        p.dy += (ddy / dist) * force * dt
      }
    }

    p.dx *= DAMPING
    p.dy *= DAMPING

    ctx.beginPath()
    ctx.arc(p.baseX + p.dx, p.baseY + p.dy, p.radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${rgb},${p.alpha})`
    ctx.fill()
  })
}

export function initGalleryParticles() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) return

  const canvases = document.querySelectorAll<HTMLCanvasElement>('.gallery-particles-canvas')
  if (canvases.length === 0) return

  const fields: FieldState[] = Array.from(canvases).flatMap((canvas) => {
    const section = canvas.closest('.gallery-section') as HTMLElement | null
    const ctx = canvas.getContext('2d')
    if (!section || !ctx) return []

    const field: FieldState = {
      canvas,
      ctx,
      section,
      particles: [],
      mouseX: null,
      mouseY: null,
      active: true,
    }

    resize(field)
    field.particles = Array.from({ length: PARTICLE_COUNT }, () => randomParticle(canvas.width, canvas.height))

    new ResizeObserver(() => resize(field)).observe(section)

    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { field.active = entry.isIntersecting }),
      { threshold: 0.01 }
    )
    io.observe(section)

    section.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect()
      field.mouseX = e.clientX - rect.left
      field.mouseY = e.clientY - rect.top
    })
    section.addEventListener('pointerleave', () => {
      field.mouseX = null
      field.mouseY = null
    })

    return [field]
  })

  if (fields.length === 0) return

  let lastTime: number | null = null
  function tick(time: number) {
    if (lastTime === null) lastTime = time
    const dt = (time - lastTime) / 1000
    lastTime = time

    fields.forEach((field) => {
      if (field.active) step(field, dt)
    })

    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
