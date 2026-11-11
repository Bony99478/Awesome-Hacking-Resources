import { maybeCashOutBots, spawnLivePlayers } from './players'
import { generateCrashPoint } from './rng'
import type { ActiveBet, BetConfig, BetSlotId, RoundState } from './types'

const params = new URLSearchParams(window.location.search)
const SLOW = params.has('slow')
const BETTING_MS = SLOW ? 30000 : 12000
const CRASH_PAUSE_MS = SLOW ? 4000 : 2500
const START_BALANCE = 5000
const TICK_MS = 50

/** Multiplier growth curve: slow start, accelerates (feels like Aviator). */
export function multiplierAt(elapsedMs: number): number {
  const t = elapsedMs / 1000
  const m = Math.pow(Math.E, 0.06 * t)
  return Math.max(1, Math.floor(m * 100) / 100)
}

export function elapsedForMultiplier(target: number): number {
  if (target <= 1) return 0
  return (Math.log(target) / 0.06) * 1000
}

type Listener = (state: RoundState) => void

export class CrashEngine {
  private state: RoundState
  private listeners = new Set<Listener>()
  private timer: number | null = null
  /** Paid bets waiting to lock into the next/current takeoff. */
  private pending: Record<BetSlotId, BetConfig | null> = { a: null, b: null }
  /** Auto-bet templates (not paid until re-armed). */
  private autoTemplates: Record<BetSlotId, BetConfig | null> = { a: null, b: null }
  private roundSeed = 1
  private crashTimer: number | null = null

  constructor() {
    this.state = {
      phase: 'betting',
      roundId: 1,
      countdownMs: BETTING_MS,
      multiplier: 1,
      crashAt: generateCrashPoint(),
      startedAt: null,
      history: [
        { id: 'h0', crashAt: 1.42 },
        { id: 'h1', crashAt: 3.18 },
        { id: 'h2', crashAt: 1.07 },
        { id: 'h3', crashAt: 8.64 },
        { id: 'h4', crashAt: 2.05 },
        { id: 'h5', crashAt: 1.91 },
        { id: 'h6', crashAt: 14.2 },
        { id: 'h7', crashAt: 1.23 },
      ],
      bets: [],
      livePlayers: spawnLivePlayers(),
      balance: START_BALANCE,
      lastWin: null,
      flash: null,
      forcedCrashAt: null,
      forceLocked: false,
    }
  }

  private nextCrashPoint(): number {
    if (this.state.forcedCrashAt != null) {
      const forced = this.state.forcedCrashAt
      if (!this.state.forceLocked) {
        this.state = { ...this.state, forcedCrashAt: null }
      }
      return forced
    }
    return generateCrashPoint()
  }

  setForcedCrash(crashAt: number | null, lock = false): string | null {
    if (crashAt != null && (Number.isNaN(crashAt) || crashAt < 1)) {
      return 'Crash must be ≥ 1.00'
    }
    const value =
      crashAt == null ? null : Math.max(1, Math.floor(crashAt * 100) / 100)

    if (this.state.phase === 'betting' && value != null) {
      this.set({
        forcedCrashAt: lock ? value : null,
        forceLocked: lock && value != null,
        crashAt: value,
      })
      return null
    }

    this.set({
      forcedCrashAt: value,
      forceLocked: lock && value != null,
    })
    return null
  }

  clearForcedCrash() {
    this.set({ forcedCrashAt: null, forceLocked: false })
  }

  getState(): RoundState {
    return this.state
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state)
  }

  private set(partial: Partial<RoundState>) {
    this.state = { ...this.state, ...partial }
    this.emit()
  }

  start() {
    if (this.timer != null) return
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
  }

  stop() {
    if (this.timer != null) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.crashTimer != null) {
      clearTimeout(this.crashTimer)
      this.crashTimer = null
    }
  }

  resetBalance() {
    this.set({ balance: START_BALANCE, lastWin: null })
  }

  /**
   * Place a paid bet for the current betting window, or queue for the next
   * takeoff while a round is already flying/crashed.
   */
  queueBet(slot: BetSlotId, config: BetConfig): string | null {
    if (config.amount < 1) return 'Mise minimum : 1.00'
    if (config.amount > this.state.balance) return 'Solde insuffisant.'
    if (this.pending[slot]) return 'Mise déjà placée sur ce panneau.'

    const active = this.state.bets.find((b) => b.slot === slot)
    if (
      (this.state.phase === 'flying' || this.state.phase === 'crashed') &&
      active &&
      active.cashedOutAt == null
    ) {
      return 'Encaissez d’abord la mise en cours sur ce panneau.'
    }

    this.pending[slot] = { ...config }
    this.autoTemplates[slot] = config.autoBet ? { ...config } : null
    this.set({ balance: this.state.balance - config.amount })
    return null
  }

  cancelBet(slot: BetSlotId): string | null {
    const pending = this.pending[slot]
    if (!pending) return 'Aucune mise à annuler.'
    // Pending is always pre-lock (current betting window or next-round queue)
    this.pending[slot] = null
    this.autoTemplates[slot] = null
    this.set({ balance: this.state.balance + pending.amount })
    return null
  }

  getPending(slot: BetSlotId): BetConfig | null {
    return this.pending[slot]
  }

  cashOut(slot: BetSlotId): string | null {
    if (this.state.phase !== 'flying') return 'La manche n’est pas en cours.'
    const bet = this.state.bets.find((b) => b.slot === slot)
    if (!bet) return 'Aucune mise active.'
    if (bet.cashedOutAt != null) return 'Déjà encaissé.'

    const at = this.state.multiplier
    const payout = Math.floor(bet.amount * at * 100) / 100
    const bets = this.state.bets.map((b) =>
      b.slot === slot ? { ...b, cashedOutAt: at, payout } : b,
    )
    this.set({
      bets,
      balance: this.state.balance + payout,
      lastWin: payout,
      flash: 'win',
    })
    window.setTimeout(() => {
      if (this.state.flash === 'win') this.set({ flash: null })
    }, 700)
    return null
  }

  private lockBets(): ActiveBet[] {
    const bets: ActiveBet[] = []
    for (const slot of ['a', 'b'] as BetSlotId[]) {
      const cfg = this.pending[slot]
      if (!cfg) continue
      bets.push({
        slot,
        amount: cfg.amount,
        autoCashout: cfg.autoCashout,
        cashedOutAt: null,
        payout: null,
      })
      // Pending consumed into the live round; autoTemplates may re-arm later
      this.pending[slot] = null
    }
    return bets
  }

  /** After a round, pay + queue the next auto-bet from templates. */
  private armAutoBets() {
    for (const slot of ['a', 'b'] as BetSlotId[]) {
      const tpl = this.autoTemplates[slot]
      if (!tpl) continue
      if (this.pending[slot]) continue // already queued/paid for next
      if (tpl.amount > this.state.balance) {
        this.autoTemplates[slot] = null
        continue
      }
      this.pending[slot] = { ...tpl }
      this.set({ balance: this.state.balance - tpl.amount })
    }
  }

  private tick() {
    const { phase } = this.state

    if (phase === 'betting') {
      const next = this.state.countdownMs - TICK_MS
      if (next <= 0) {
        const bets = this.lockBets()
        this.set({
          phase: 'flying',
          countdownMs: 0,
          multiplier: 1,
          startedAt: performance.now(),
          bets,
          livePlayers: spawnLivePlayers(),
          lastWin: null,
          flash: null,
        })
      } else {
        this.set({ countdownMs: next })
      }
      return
    }

    if (phase === 'flying') {
      const started = this.state.startedAt ?? performance.now()
      const elapsed = performance.now() - started
      let multiplier = multiplierAt(elapsed)

      let balance = this.state.balance
      let lastWin = this.state.lastWin
      let flash = this.state.flash
      let didAuto = false
      const bets = this.state.bets.map((b) => {
        if (b.cashedOutAt != null) return b
        if (
          b.autoCashout != null &&
          b.autoCashout < this.state.crashAt &&
          multiplier >= b.autoCashout
        ) {
          const at = b.autoCashout
          const payout = Math.floor(b.amount * at * 100) / 100
          balance += payout
          lastWin = payout
          flash = 'win'
          didAuto = true
          return { ...b, cashedOutAt: at, payout }
        }
        return b
      })

      if (multiplier >= this.state.crashAt) {
        multiplier = this.state.crashAt
        const history = [
          { id: `h-${this.roundSeed++}`, crashAt: this.state.crashAt },
          ...this.state.history,
        ].slice(0, 18)

        this.set({
          phase: 'crashed',
          multiplier,
          bets,
          balance,
          lastWin,
          flash: 'crash',
          history,
          livePlayers: maybeCashOutBots(
            this.state.livePlayers,
            multiplier,
            this.state.crashAt,
          ),
        })

        if (this.crashTimer != null) clearTimeout(this.crashTimer)
        this.crashTimer = window.setTimeout(() => this.beginNextRound(), CRASH_PAUSE_MS)
        return
      }

      // Avoid emitting every tick when nothing meaningful changed except multiplier
      this.set({
        multiplier,
        bets: didAuto ? bets : this.state.bets,
        balance,
        lastWin,
        flash,
        livePlayers: maybeCashOutBots(
          this.state.livePlayers,
          multiplier,
          this.state.crashAt,
        ),
      })
    }
  }

  private beginNextRound() {
    this.crashTimer = null
    this.armAutoBets()
    const crashAt = this.nextCrashPoint()
    this.set({
      phase: 'betting',
      roundId: this.state.roundId + 1,
      countdownMs: BETTING_MS,
      multiplier: 1,
      crashAt,
      startedAt: null,
      bets: [],
      livePlayers: spawnLivePlayers(),
      flash: null,
    })
  }
}
