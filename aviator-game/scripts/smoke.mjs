/**
 * Headless smoke test: place bet → see Encaisser → cash out → balance rises.
 * Run with Vite up: npm run smoke
 */
import { chromium } from 'playwright'

const url = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173/?slow=1'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const balText = async () =>
  Number((await page.locator('#balance').innerText()).replace(/,/g, ''))

try {
  await page.goto(url, { waitUntil: 'networkidle' })

  await page.click('#toggle-test')
  await page.click('[data-force="10.00"]')

  // Wait specifically for the betting window (not mid-flight queue CTA)
  await page.waitForFunction(
    () => document.querySelector('#phase-label')?.textContent?.includes('Placez'),
    null,
    { timeout: 45000 },
  )
  await page.waitForSelector('#actions-a [data-act="bet"]', { timeout: 5000 })

  const before = await balText()
  await page.click('#actions-a [data-act="bet"]')

  await page.waitForFunction(
    () => document.querySelector('#actions-a [data-act="cancel"]'),
    null,
    { timeout: 3000 },
  )
  const afterBet = await balText()
  if (afterBet !== before - 100) {
    throw new Error(`Bet did not deduct 100 (before=${before}, afterBet=${afterBet})`)
  }

  // Flight should lock the pending bet and show Encaisser
  await page.waitForSelector('#actions-a [data-act="cash"]', { timeout: 40000 })
  await page.click('#actions-a [data-act="cash"]')

  await page.waitForFunction(
    () => document.querySelector('#actions-a')?.textContent?.includes('Encaissé'),
    null,
    { timeout: 5000 },
  )

  const after = await balText()
  if (!(after > before)) {
    throw new Error(`Expected balance to rise after cash out (before=${before}, after=${after})`)
  }

  console.log(
    JSON.stringify({
      ok: true,
      before,
      afterBet,
      after,
      profit: Number((after - before).toFixed(2)),
    }),
  )
} catch (err) {
  const dump = {
    phase: await page.locator('#phase-label').innerText().catch(() => null),
    actions: await page.locator('#actions-a').innerText().catch(() => null),
    balance: await page.locator('#balance').innerText().catch(() => null),
    status: await page.locator('#status-a').innerText().catch(() => null),
  }
  await page.screenshot({ path: '/tmp/aviator-smoke-fail.png', fullPage: true })
  console.error('SMOKE_FAIL', err)
  console.error('STATE', dump)
  process.exitCode = 1
} finally {
  await browser.close()
}
