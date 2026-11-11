/** Provably-fair-style crash point with ~3% house edge (demo RNG). */
export function generateCrashPoint(houseEdge = 0.03): number {
  // Instant crash chance mirrors common crash-game design
  if (Math.random() < houseEdge) return 1.0

  const r = Math.random()
  const raw = (1 - houseEdge) / (1 - r)
  return Math.max(1.0, Math.floor(raw * 100) / 100)
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`
}

export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function historyTone(crashAt: number): 'low' | 'mid' | 'high' | 'moon' {
  if (crashAt < 2) return 'low'
  if (crashAt < 5) return 'mid'
  if (crashAt < 10) return 'high'
  return 'moon'
}
