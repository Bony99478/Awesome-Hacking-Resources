import { elapsedForMultiplier } from './engine'
import type { RoundPhase } from './types'

export interface DrawFrame {
  phase: RoundPhase
  multiplier: number
  crashAt: number
  flash: 'win' | 'crash' | null
}

export class FlightCanvas {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private raf = 0
  private frame: DrawFrame = {
    phase: 'betting',
    multiplier: 1,
    crashAt: 2,
    flash: null,
  }
  private particles: { x: number; y: number; vx: number; vy: number; life: number }[] =
    []
  private crashBurstAt = 0

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')
    this.canvas = canvas
    this.ctx = ctx
    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  setFrame(frame: DrawFrame) {
    if (frame.phase === 'crashed' && this.frame.phase !== 'crashed') {
      this.spawnCrashBurst()
      this.crashBurstAt = performance.now()
    }
    this.frame = frame
  }

  start() {
    const loop = () => {
      this.paint()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }

  private resize() {
    const parent = this.canvas.parentElement
    if (!parent) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = parent.clientWidth
    const h = parent.clientHeight
    this.canvas.width = Math.floor(w * dpr)
    this.canvas.height = Math.floor(h * dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  private spawnCrashBurst() {
    const { x, y } = this.planePos(this.frame.multiplier)
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 1.5 + Math.random() * 4
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
      })
    }
  }

  private planePos(multiplier: number): { x: number; y: number; angle: number } {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const progress = Math.min(1, elapsedForMultiplier(multiplier) / elapsedForMultiplier(20))
    const x = w * 0.12 + progress * w * 0.7
    const y = h * 0.72 - Math.pow(progress, 1.15) * h * 0.55
    const angle = -0.55 + progress * 0.25
    return { x, y, angle }
  }

  private paint() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const ctx = this.ctx
    const { phase, multiplier, flash } = this.frame

    // Atmosphere
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#071422')
    sky.addColorStop(0.45, '#0d2740')
    sky.addColorStop(1, '#132a1f')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // Soft sun / horizon glow
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.85, 10, w * 0.7, h * 0.9, w * 0.55)
    glow.addColorStop(0, 'rgba(232, 93, 4, 0.28)')
    glow.addColorStop(0.45, 'rgba(244, 211, 94, 0.08)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97) % w) + (i % 7)
      const sy = ((i * 53) % (h * 0.55)) + 8
      const r = i % 5 === 0 ? 1.4 : 0.7
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Grid / runway perspective
    ctx.strokeStyle = 'rgba(120, 180, 200, 0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i < 8; i++) {
      const y = h * 0.55 + i * ((h * 0.45) / 8)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Flight path
    const endMult = phase === 'betting' ? 1 : Math.min(multiplier, 20)
    ctx.beginPath()
    ctx.strokeStyle =
      phase === 'crashed' ? 'rgba(232, 93, 4, 0.85)' : 'rgba(244, 211, 94, 0.75)'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    const steps = 48
    for (let i = 0; i <= steps; i++) {
      const m = 1 + ((endMult - 1) * i) / steps
      const p = this.planePos(m)
      if (i === 0) ctx.moveTo(w * 0.08, h * 0.78)
      ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()

    // Under-curve fill
    ctx.lineTo(this.planePos(endMult).x, h)
    ctx.lineTo(w * 0.08, h)
    ctx.closePath()
    const fill = ctx.createLinearGradient(0, h * 0.3, 0, h)
    fill.addColorStop(0, 'rgba(232, 93, 4, 0.22)')
    fill.addColorStop(1, 'rgba(232, 93, 4, 0.02)')
    ctx.fillStyle = fill
    ctx.fill()

    // Plane
    if (phase !== 'betting') {
      const plane = this.planePos(Math.min(multiplier, 20))
      this.drawPlane(plane.x, plane.y, plane.angle, phase === 'crashed')
    } else {
      // Idle plane on runway
      this.drawPlane(w * 0.16, h * 0.74, -0.15, false)
    }

    // Particles
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const p of this.particles) {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.03
      ctx.fillStyle = `rgba(255, 180, 80, ${Math.max(0, p.life)})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Flash overlays
    if (flash === 'crash' || phase === 'crashed') {
      const age = (performance.now() - this.crashBurstAt) / 1000
      const alpha = Math.max(0, 0.35 - age * 0.15)
      ctx.fillStyle = `rgba(180, 30, 20, ${alpha})`
      ctx.fillRect(0, 0, w, h)
    }
  }

  private drawPlane(x: number, y: number, angle: number, crashed: boolean) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    // Trail puff
    if (!crashed) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.beginPath()
      ctx.ellipse(-28, 4, 18, 5, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Body
    ctx.fillStyle = crashed ? '#9a3412' : '#f8fafc'
    ctx.beginPath()
    ctx.moveTo(22, 0)
    ctx.lineTo(-16, 7)
    ctx.lineTo(-18, 0)
    ctx.lineTo(-16, -7)
    ctx.closePath()
    ctx.fill()

    // Wing
    ctx.fillStyle = crashed ? '#c2410c' : '#e85d04'
    ctx.beginPath()
    ctx.moveTo(2, 0)
    ctx.lineTo(-8, 16)
    ctx.lineTo(-2, 0)
    ctx.lineTo(-8, -16)
    ctx.closePath()
    ctx.fill()

    // Tail
    ctx.fillStyle = crashed ? '#7c2d12' : '#f4d35e'
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.lineTo(-22, -10)
    ctx.lineTo(-18, 0)
    ctx.closePath()
    ctx.fill()

    // Nose accent
    ctx.fillStyle = '#e85d04'
    ctx.beginPath()
    ctx.moveTo(22, 0)
    ctx.lineTo(12, 3)
    ctx.lineTo(12, -3)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }
}
