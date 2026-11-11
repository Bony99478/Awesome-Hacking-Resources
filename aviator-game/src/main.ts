import './style.css'
import { FlightCanvas } from './game/canvas'
import { CrashEngine } from './game/engine'
import { formatMoney, formatMultiplier, historyTone } from './game/rng'
import type { BetSlotId, RoundState } from './game/types'

const engine = new CrashEngine()

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">PARYAJ LAKAY</div>
        <div class="brand-sub">Instant Flight · crash demo</div>
        <div class="demo-pill">Demo credits only — not real-money play</div>
      </div>
      <div class="balance-box">
        <div class="balance-label">Credits</div>
        <div class="balance-value"><span>HTG</span> <strong id="balance">5,000.00</strong></div>
        <div class="balance-actions">
          <button type="button" class="linkish" id="reset-balance">Reset demo balance</button>
        </div>
      </div>
    </header>

    <div class="history" id="history" aria-label="Recent crash multipliers"></div>

    <div class="stage">
      <aside class="panel live">
        <div class="live-head">
          <h2>Live bets</h2>
          <span id="live-count">0 players</span>
        </div>
        <div class="live-list" id="live-list"></div>
      </aside>

      <section class="panel flight" id="flight">
        <canvas id="sky"></canvas>
        <div class="flight-overlay">
          <div class="phase-label" id="phase-label">Next round</div>
          <div class="multiplier" id="multiplier">1.00x</div>
          <div class="countdown" id="countdown"></div>
          <div class="toast" id="toast"></div>
        </div>
      </section>
    </div>

    <div class="bets">
      ${betPanel('a', 'Bet panel 1')}
      ${betPanel('b', 'Bet panel 2')}
    </div>

    <p class="footer-note">
      Inspired by Aviator-style instant crash games. Random demo outcomes with a house edge —
      past multipliers do not predict the next round. No deposits, withdrawals, or real gambling.
    </p>
  </div>
`

function betPanel(slot: BetSlotId, title: string): string {
  return `
    <section class="panel bet-panel" data-slot="${slot}">
      <h3>${title}</h3>
      <div class="field">
        <label for="amount-${slot}">Stake</label>
        <div class="stake-row">
          <input id="amount-${slot}" type="number" min="1" step="1" value="100" />
          <button type="button" class="chip-btn" data-adjust="${slot}" data-delta="-10">−</button>
          <button type="button" class="chip-btn" data-adjust="${slot}" data-delta="10">+</button>
        </div>
      </div>
      <div class="field">
        <label for="auto-${slot}">Auto cash out at</label>
        <input id="auto-${slot}" type="number" min="1.01" step="0.01" value="2.00" />
      </div>
      <div class="toggles">
        <label><input type="checkbox" id="use-auto-${slot}" /> Use auto cash out</label>
        <label><input type="checkbox" id="auto-bet-${slot}" /> Auto bet next rounds</label>
      </div>
      <div class="actions" id="actions-${slot}"></div>
      <div class="status-line" id="status-${slot}"></div>
    </section>
  `
}

const canvas = new FlightCanvas(document.querySelector<HTMLCanvasElement>('#sky')!)
canvas.start()
engine.start()

const els = {
  balance: document.querySelector<HTMLElement>('#balance')!,
  history: document.querySelector<HTMLElement>('#history')!,
  liveList: document.querySelector<HTMLElement>('#live-list')!,
  liveCount: document.querySelector<HTMLElement>('#live-count')!,
  phaseLabel: document.querySelector<HTMLElement>('#phase-label')!,
  multiplier: document.querySelector<HTMLElement>('#multiplier')!,
  countdown: document.querySelector<HTMLElement>('#countdown')!,
  toast: document.querySelector<HTMLElement>('#toast')!,
}

document.querySelector('#reset-balance')!.addEventListener('click', () => {
  engine.resetBalance()
})

for (const slot of ['a', 'b'] as BetSlotId[]) {
  document.querySelectorAll(`[data-adjust="${slot}"]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.querySelector<HTMLInputElement>(`#amount-${slot}`)!
      const delta = Number((btn as HTMLElement).dataset.delta)
      input.value = String(Math.max(1, Number(input.value || 0) + delta))
    })
  })
}

function readConfig(slot: BetSlotId) {
  const amount = Number(document.querySelector<HTMLInputElement>(`#amount-${slot}`)!.value)
  const useAuto = document.querySelector<HTMLInputElement>(`#use-auto-${slot}`)!.checked
  const autoVal = Number(document.querySelector<HTMLInputElement>(`#auto-${slot}`)!.value)
  const autoBet = document.querySelector<HTMLInputElement>(`#auto-bet-${slot}`)!.checked
  return {
    amount,
    autoCashout: useAuto && autoVal >= 1.01 ? autoVal : null,
    autoBet,
  }
}

function setStatus(slot: BetSlotId, message: string, isError = false) {
  const el = document.querySelector<HTMLElement>(`#status-${slot}`)!
  el.textContent = message
  el.classList.toggle('error', isError)
}

function renderActions(state: RoundState, slot: BetSlotId) {
  const wrap = document.querySelector<HTMLElement>(`#actions-${slot}`)!
  const pending = engine.getPending(slot)
  const active = state.bets.find((b) => b.slot === slot)

  if (state.phase === 'betting') {
    if (pending) {
      wrap.innerHTML = `
        <button type="button" class="btn btn-cancel" data-act="cancel" data-slot="${slot}">
          Cancel bet · ${formatMoney(pending.amount)}
        </button>
      `
    } else {
      wrap.innerHTML = `
        <button type="button" class="btn btn-bet" data-act="bet" data-slot="${slot}">
          Place bet
        </button>
      `
    }
    return
  }

  if (state.phase === 'flying' && active && active.cashedOutAt == null) {
    const potential = Math.floor(active.amount * state.multiplier * 100) / 100
    wrap.innerHTML = `
      <button type="button" class="btn btn-cash" data-act="cash" data-slot="${slot}">
        Cash out
        <span class="sub">${formatMoney(potential)} HTG @ ${formatMultiplier(state.multiplier)}</span>
      </button>
    `
    return
  }

  if (active?.cashedOutAt != null) {
    wrap.innerHTML = `
      <button type="button" class="btn btn-bet" disabled>
        Cashed out @ ${formatMultiplier(active.cashedOutAt)} · +${formatMoney(active.payout ?? 0)}
      </button>
    `
    return
  }

  if (state.phase === 'flying' || state.phase === 'crashed') {
    wrap.innerHTML = `
      <button type="button" class="btn btn-bet" disabled>Waiting for next round…</button>
    `
    return
  }

  wrap.innerHTML = `
    <button type="button" class="btn btn-bet" data-act="bet" data-slot="${slot}">Place bet</button>
  `
}

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null
  const btn = target?.closest<HTMLElement>('[data-act]')
  if (!btn) return
  const slot = btn.dataset.slot as BetSlotId
  const act = btn.dataset.act

  if (act === 'bet') {
    const err = engine.queueBet(slot, readConfig(slot))
    setStatus(slot, err ?? 'Bet locked for this round.', Boolean(err))
  } else if (act === 'cancel') {
    const err = engine.cancelBet(slot)
    setStatus(slot, err ?? 'Bet cancelled.', Boolean(err))
  } else if (act === 'cash') {
    const err = engine.cashOut(slot)
    setStatus(slot, err ?? 'Cashed out!', Boolean(err))
  }
})

let lastHistoryId = ''

function render(state: RoundState) {
  els.balance.textContent = formatMoney(state.balance)

  const newest = state.history[0]?.id ?? ''
  if (newest !== lastHistoryId) {
    lastHistoryId = newest
    els.history.innerHTML = state.history
      .map((h, i) => {
        const tone = historyTone(h.crashAt)
        return `<div class="history-chip ${tone}" style="animation-delay:${i * 30}ms">${formatMultiplier(h.crashAt)}</div>`
      })
      .join('')
  }

  els.liveCount.textContent = `${state.livePlayers.length} players`
  const sorted = [...state.livePlayers].sort((a, b) => {
    const ao = a.cashedOutAt != null ? 0 : 1
    const bo = b.cashedOutAt != null ? 0 : 1
    return ao - bo
  })
  els.liveList.innerHTML = sorted
    .map((p) => {
      const out =
        p.cashedOutAt != null
          ? `<span class="out">${formatMultiplier(p.cashedOutAt)}</span>`
          : state.phase === 'crashed'
            ? `<span class="out lost">—</span>`
            : `<span class="out">…</span>`
      return `<div class="live-row"><span class="name">${p.name}</span><span class="amt">${formatMoney(p.amount)}</span>${out}</div>`
    })
    .join('')

  canvas.setFrame({
    phase: state.phase,
    multiplier: state.multiplier,
    crashAt: state.crashAt,
    flash: state.flash,
  })

  els.multiplier.classList.remove('flying', 'crashed')
  if (state.phase === 'betting') {
    els.phaseLabel.textContent = 'Place your bets'
    els.multiplier.textContent = '1.00x'
    els.countdown.innerHTML = `Starting in <strong>${Math.ceil(state.countdownMs / 1000)}s</strong>`
  } else if (state.phase === 'flying') {
    els.phaseLabel.textContent = 'In flight'
    els.multiplier.textContent = formatMultiplier(state.multiplier)
    els.multiplier.classList.add('flying')
    els.countdown.textContent = 'Cash out before it flies away'
  } else {
    els.phaseLabel.textContent = 'Flew away'
    els.multiplier.textContent = formatMultiplier(state.crashAt)
    els.multiplier.classList.add('crashed')
    els.countdown.textContent = 'Next round coming up…'
  }

  if (state.flash === 'win' && state.lastWin != null) {
    els.toast.className = 'toast show win'
    els.toast.textContent = `Win +${formatMoney(state.lastWin)} HTG`
  } else if (state.flash === 'crash') {
    els.toast.className = 'toast show crash'
    els.toast.textContent = `Flew away at ${formatMultiplier(state.crashAt)}`
  } else if (state.phase !== 'crashed') {
    els.toast.className = 'toast'
    els.toast.textContent = ''
  }

  renderActions(state, 'a')
  renderActions(state, 'b')
}

engine.subscribe(render)
