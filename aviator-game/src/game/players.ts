import type { LivePlayer } from './types'

const NAMES = [
  'Marc',
  'Nadia',
  'Kev',
  'Sophia',
  'Junior',
  'Lila',
  'Roberto',
  'Amina',
  'Theo',
  'Carla',
  'Yves',
  'Maya',
  'Diego',
  'Priya',
  'Sam',
  'Elena',
  'Omar',
  'Jade',
]

function pickName(used: Set<string>): string {
  for (let i = 0; i < 20; i++) {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)]
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  return `Player${Math.floor(Math.random() * 900) + 100}`
}

function stake(): number {
  const tiers = [10, 20, 50, 100, 200, 500, 1000, 2500]
  return tiers[Math.floor(Math.random() * tiers.length)]
}

export function spawnLivePlayers(count = 12): LivePlayer[] {
  const used = new Set<string>()
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${Date.now()}-${i}`,
    name: pickName(used),
    amount: stake(),
    cashedOutAt: null,
    payout: null,
  }))
}

/** Simulate other players cashing out as the multiplier climbs. */
export function maybeCashOutBots(
  players: LivePlayer[],
  multiplier: number,
  crashAt: number,
): LivePlayer[] {
  return players.map((p) => {
    if (p.cashedOutAt != null) return p
    // Target cashout roughly log-distributed below crash
    const nerve = 1.05 + Math.random() * Math.min(8, crashAt * 0.85)
    if (multiplier >= nerve && multiplier < crashAt) {
      const at = Math.floor(multiplier * 100) / 100
      return {
        ...p,
        cashedOutAt: at,
        payout: Math.floor(p.amount * at * 100) / 100,
      }
    }
    return p
  })
}
