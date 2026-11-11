import { maybeCashOutBots, spawnLivePlayers } from './players'
import { generateCrashPoint } from './rng'
import type { ActiveBet, BetConfig, BetSlotId, RoundState } from './types'

const BETTING_MS = 5000
const START_BALANCE = 5000
const TICK_MS = 50

/** Multiplier growth curve: slow start, accelerates (feels like Aviator). */
export function multiplierAt(elapsedMs: number): number {
  const t = elapsedMs / 1000
  // e^(0.06 * t) style growth, floored to cents
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
  private pending: Record<BetSlotId, BetConfig | null> = { a: null, b: null }
  private roundSeed = 1

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
    }
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
  }

  resetBalance() {
    this.set({ balance: START_BALANCE, lastWin: null })
  }

  queueBet(slot: BetSlotId, config: BetConfig): string | null {
    if (this.state.phase !== 'betting') {
      return 'Wait for the next round to place a bet.'
    }
    if (config.amount < 1) return 'Minimum bet is 1.00'
    if (config.amount > this.state.balance) return 'Not enough credits.'
    if (this.pending[slot]) return 'Bet already placed in this panel.'

    // Reserve funds immediately
    this.pending[slot] = config
    this.set({ balance: this.state.balance - config.amount })
    return null
  }

  cancelBet(slot: BetSlotId): string | null {
    if (this.state.phase !== 'betting') return 'Too late to cancel.'
    const pending = this.pending[slot]
    if (!pending) return 'No bet to cancel.'
    this.pending[slot] = null
    this.set({ balance: this.state.balance + pending.amount })
    return null
  }

  getPending(slot: BetSlotId): BetConfig | null {
    return this.pending[slot]
  }

  cashOut(slot: BetSlotId): string | null {
    if (this.state.phase !== 'flying') return 'Round is not live.'
    const bet = this.state.bets.find((b) => b.slot === slot)
    if (!bet) return 'No active bet.'
    if (bet.cashedOutAt != null) return 'Already cashed out.'

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
      // Keep auto-bet for next round; clear one-shot
      if (!cfg.autoBet) this.pending[slot] = null
    }
    return bets
  }

  private requeueAutoBets() {
    for (const slot of ['a', 'b'] as BetSlotId[]) {
      const cfg = this.pending[slot]
      if (!cfg?.autoBet) continue
      if (cfg.amount > this.state.balance) {
        this.pending[slot] = null
        continue
      }
      this.set({ balance: this.state.balance - cfg.amount })
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

      // Auto cashouts
      let balance = this.state.balance
      let lastWin = this.state.lastWin
      let flash = this.state.flash
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

        window.setTimeout(() => this.beginNextRound(), 2200)
        return
      }

      this.set({
        multiplier,
        bets,
        balance,
        lastWin,
        flash,
        livePlayers: maybeCashOutBots(
          this.state.livePlayers,
          multiplier,
          this.state.crashAt,
        ),
      })
      return
    }
  }

  private beginNextRound() {
    this.requeueAutoBets()
    this.set({
      phase: 'betting',
      roundId: this.state.roundId + 1,
      countdownMs: BETTING_MS,
      multiplier: 1,
      crashAt: generateCrashPoint(),
      startedAt: null,
      bets: [],
      livePlayers: spawnLivePlayers(),
      flash: null,
    })
  }
}
