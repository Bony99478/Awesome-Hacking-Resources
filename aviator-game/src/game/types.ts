export type RoundPhase = 'betting' | 'flying' | 'crashed'

export type BetSlotId = 'a' | 'b'

export interface BetConfig {
  amount: number
  autoCashout: number | null
  autoBet: boolean
}

export interface ActiveBet {
  slot: BetSlotId
  amount: number
  autoCashout: number | null
  cashedOutAt: number | null
  payout: number | null
}

export interface HistoryItem {
  id: string
  crashAt: number
}

export interface LivePlayer {
  id: string
  name: string
  amount: number
  cashedOutAt: number | null
  payout: number | null
}

export interface RoundState {
  phase: RoundPhase
  roundId: number
  countdownMs: number
  multiplier: number
  crashAt: number
  startedAt: number | null
  history: HistoryItem[]
  bets: ActiveBet[]
  livePlayers: LivePlayer[]
  balance: number
  lastWin: number | null
  flash: 'win' | 'crash' | null
}
