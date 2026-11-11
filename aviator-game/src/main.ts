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
        <div class="brand-sub">Instant Flight · démo crash</div>
        <div class="demo-pill">Démo · crédits fictifs seulement</div>
      </div>
      <div class="balance-box">
        <div class="balance-label">Solde</div>
        <div class="balance-value"><span>HTG</span> <strong id="balance">5,000.00</strong></div>
        <div class="balance-actions">
          <button type="button" class="linkish" id="reset-balance">Réinitialiser le solde</button>
        </div>
      </div>
    </header>

    <div class="history" id="history" aria-label="Historique des multiplicateurs"></div>

    <div class="stage">
      <section class="panel flight" id="flight">
        <canvas id="sky"></canvas>
        <div class="flight-overlay">
          <div class="phase-label" id="phase-label">Prochaine manche</div>
          <div class="multiplier" id="multiplier">1.00x</div>
          <div class="countdown" id="countdown"></div>
          <div class="toast" id="toast"></div>
        </div>
      </section>

      <aside class="panel live">
        <div class="live-head">
          <h2>Paris en direct</h2>
          <span id="live-count">0 joueurs</span>
        </div>
        <div class="live-list" id="live-list"></div>
      </aside>
    </div>

    <div class="bets">
      ${betPanel('a', 'Paris 1')}
      ${betPanel('b', 'Paris 2')}
    </div>

    <section class="panel test-panel" aria-label="Mode test démo">
      <div class="test-head">
        <h3>Mode test (démo seulement)</h3>
        <p>Force le crash de la prochaine manche. Ne marche pas sur le site réel.</p>
      </div>
      <div class="test-row">
        <div class="field test-force">
          <label for="force-crash">Crash forcé</label>
          <input id="force-crash" type="number" min="1" step="0.01" placeholder="ex. 2.00" />
        </div>
        <label class="lock-label"><input type="checkbox" id="force-lock" /> Répéter chaque manche</label>
      </div>
      <div class="test-presets" id="test-presets">
        <button type="button" class="chip-btn" data-force="1.00">1.00x</button>
        <button type="button" class="chip-btn" data-force="1.50">1.50x</button>
        <button type="button" class="chip-btn" data-force="2.00">2.00x</button>
        <button type="button" class="chip-btn" data-force="5.00">5.00x</button>
        <button type="button" class="chip-btn" data-force="10.00">10.00x</button>
        <button type="button" class="chip-btn" data-force="50.00">50.00x</button>
      </div>
      <div class="test-actions">
        <button type="button" class="btn btn-bet" id="apply-force">Appliquer</button>
        <button type="button" class="btn btn-cancel" id="clear-force">Aléatoire</button>
      </div>
      <div class="status-line" id="force-status">Crash actuel : aléatoire</div>
    </section>

    <p class="footer-note">
      Démo inspirée des jeux crash type Aviator. Résultats locaux avec house edge —
      l’historique ne prédit pas la suite. Pas de dépôt, retrait, ni vrai argent.
    </p>
  </div>
`

function betPanel(slot: BetSlotId, title: string): string {
  return `
    <section class="panel bet-panel" data-slot="${slot}">
      <h3>${title}</h3>
      <div class="field">
        <label for="amount-${slot}">Mise</label>
        <div class="stake-row">
          <input id="amount-${slot}" type="number" min="1" step="1" value="100" inputmode="decimal" />
          <button type="button" class="chip-btn" data-adjust="${slot}" data-delta="-10">−</button>
          <button type="button" class="chip-btn" data-adjust="${slot}" data-delta="10">+</button>
        </div>
        <div class="quick-stakes" data-quick="${slot}">
          <button type="button" data-stake="50">50</button>
          <button type="button" data-stake="100">100</button>
          <button type="button" data-stake="500">500</button>
          <button type="button" data-stake="1000">1K</button>
        </div>
      </div>
      <div class="field">
        <label for="auto-${slot}">Auto encaisser à</label>
        <input id="auto-${slot}" type="number" min="1.01" step="0.01" value="2.00" inputmode="decimal" />
      </div>
      <div class="toggles">
        <label><input type="checkbox" id="use-auto-${slot}" /> Auto encaisser</label>
        <label><input type="checkbox" id="auto-bet-${slot}" /> Auto miser</label>
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
  forceStatus: document.querySelector<HTMLElement>('#force-status')!,
  forceInput: document.querySelector<HTMLInputElement>('#force-crash')!,
  forceLock: document.querySelector<HTMLInputElement>('#force-lock')!,
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

  document.querySelector(`[data-quick="${slot}"]`)?.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-stake]')
    if (!btn) return
    const input = document.querySelector<HTMLInputElement>(`#amount-${slot}`)!
    input.value = btn.dataset.stake ?? '100'
  })
}

function applyForceFromUi(preset?: number) {
  const lock = els.forceLock.checked
  const raw = preset ?? Number(els.forceInput.value)
  if (preset != null) els.forceInput.value = preset.toFixed(2)
  const err = engine.setForcedCrash(raw, lock)
  els.forceStatus.textContent = err
    ? err
    : lock
      ? `Crash verrouillé à ${formatMultiplier(raw)} (chaque manche)`
      : `Prochaine manche forcée à ${formatMultiplier(raw)}`
  els.forceStatus.classList.toggle('error', Boolean(err))
}

document.querySelector('#test-presets')!.addEventListener('click', (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-force]')
  if (!btn) return
  applyForceFromUi(Number(btn.dataset.force))
})

document.querySelector('#apply-force')!.addEventListener('click', () => applyForceFromUi())

document.querySelector('#clear-force')!.addEventListener('click', () => {
  engine.clearForcedCrash()
  els.forceInput.value = ''
  els.forceLock.checked = false
  els.forceStatus.textContent = 'Crash actuel : aléatoire'
  els.forceStatus.classList.remove('error')
})

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
          Annuler · ${formatMoney(pending.amount)}
        </button>
      `
    } else {
      wrap.innerHTML = `
        <button type="button" class="btn btn-bet" data-act="bet" data-slot="${slot}">
          Miser
        </button>
      `
    }
    return
  }

  if (state.phase === 'flying' && active && active.cashedOutAt == null) {
    const potential = Math.floor(active.amount * state.multiplier * 100) / 100
    wrap.innerHTML = `
      <button type="button" class="btn btn-cash" data-act="cash" data-slot="${slot}">
        Encaisser
        <span class="sub">${formatMoney(potential)} HTG @ ${formatMultiplier(state.multiplier)}</span>
      </button>
    `
    return
  }

  if (active?.cashedOutAt != null) {
    wrap.innerHTML = `
      <button type="button" class="btn btn-bet" disabled>
        Encaissé @ ${formatMultiplier(active.cashedOutAt)} · +${formatMoney(active.payout ?? 0)}
      </button>
    `
    return
  }

  if (state.phase === 'flying' || state.phase === 'crashed') {
    wrap.innerHTML = `
      <button type="button" class="btn btn-bet" disabled>Prochaine manche…</button>
    `
    return
  }

  wrap.innerHTML = `
    <button type="button" class="btn btn-bet" data-act="bet" data-slot="${slot}">Miser</button>
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
    setStatus(slot, err ?? 'Mise enregistrée.', Boolean(err))
  } else if (act === 'cancel') {
    const err = engine.cancelBet(slot)
    setStatus(slot, err ?? 'Mise annulée.', Boolean(err))
  } else if (act === 'cash') {
    const err = engine.cashOut(slot)
    setStatus(slot, err ?? 'Encaissé !', Boolean(err))
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

  els.liveCount.textContent = `${state.livePlayers.length} joueurs`
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
    els.phaseLabel.textContent = 'Placez vos paris'
    els.multiplier.textContent = '1.00x'
    els.countdown.innerHTML = `Départ dans <strong>${Math.ceil(state.countdownMs / 1000)}s</strong>`
  } else if (state.phase === 'flying') {
    els.phaseLabel.textContent = 'En vol'
    els.multiplier.textContent = formatMultiplier(state.multiplier)
    els.multiplier.classList.add('flying')
    els.countdown.textContent = 'Encaissez avant qu’il ne vole'
  } else {
    els.phaseLabel.textContent = 'A volé'
    els.multiplier.textContent = formatMultiplier(state.crashAt)
    els.multiplier.classList.add('crashed')
    els.countdown.textContent = 'Prochaine manche…'
  }

  if (state.flash === 'win' && state.lastWin != null) {
    els.toast.className = 'toast show win'
    els.toast.textContent = `Gain +${formatMoney(state.lastWin)} HTG`
  } else if (state.flash === 'crash') {
    els.toast.className = 'toast show crash'
    els.toast.textContent = `A volé à ${formatMultiplier(state.crashAt)}`
  } else if (state.phase !== 'crashed') {
    els.toast.className = 'toast'
    els.toast.textContent = ''
  }

  if (state.forceLocked && state.forcedCrashAt != null) {
    els.forceStatus.textContent = `Crash verrouillé à ${formatMultiplier(state.forcedCrashAt)}`
  } else if (state.forcedCrashAt != null) {
    els.forceStatus.textContent = `Prochaine manche forcée à ${formatMultiplier(state.forcedCrashAt)}`
  }

  renderActions(state, 'a')
  renderActions(state, 'b')
}

engine.subscribe(render)
