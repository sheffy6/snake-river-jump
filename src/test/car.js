// The Grand Canyon: the roadster fires its rear jets on the ramp, belly jets in the air, and a maxed car flown well can cross.
const { chromium } = require('playwright'), path = require('path');
const OUT = process.env.SHOTS || require('os').tmpdir();
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  const shot = n => p.screenshot({ path: path.join(OUT, 'car-' + n + '.png') });
  await p.goto('file://' + path.resolve(__dirname, '../../index.html')); await p.waitForTimeout(700);
  await p.click('#start'); await p.click('#gotit');
  await p.evaluate(() => { window.__srj.goLevel(2); const s = window.__srj.save; s.up.launcher = s.up.engine = s.up.frame = s.up.rocket = 5; });
  await p.waitForTimeout(500); await shot('1aim');
  const title = await p.evaluate(() => [document.getElementById('t-eyebrow').textContent, [...document.querySelectorAll('.up h3')].map(e => e.textContent)]);
  // fly: rear jets for a third of the tank, then belly jets aimed forward, then hands off and let the stabilizers level it
  await p.evaluate(() => { window.__srj.setMeter(0.78); window.__srj.press(); window.__srj.held.boost = true; });
  await p.waitForFunction(() => window.__srj.run.fuel < 5.4 * 0.7 || window.__srj.run.mode === 'air'); await shot('2ramp');
  const ramp = await p.evaluate(() => ({ mode: window.__srj.run.mode, fuel: window.__srj.run.fuel.toFixed(2) }));
  await p.evaluate(() => { window.__srj.held.boost = false; });
  await p.waitForFunction(() => window.__srj.run.mode === 'air');
  await p.evaluate(() => { window.__srj.held.boost = true; });
  const steer = setInterval(() => p.evaluate(() => { const r = window.__srj.run, h = window.__srj.held; if (!r || r.done) return; const va = Math.atan2(r.vy, r.vx), aim = r.fuel > 0.02 ? va - 0.6 : null, e = aim === null ? 0 : aim - r.a - 0.22 * r.w; h.back = e > 0.04; h.fwd = e < -0.04; h.boost = r.fuel > 0.02; }).catch(() => {}), 30);
  await p.waitForTimeout(700); await shot('3jets');
  await p.waitForFunction(() => window.__srj.state !== 'run', null, { timeout: 30000 }); clearInterval(steer);
  await p.evaluate(() => { Object.assign(window.__srj.held, { back: false, fwd: false, boost: false }); });
  await p.waitForTimeout(600); await shot('4end');
  const end = await p.evaluate(() => ({ outcome: window.__srj.run.outcome, dist: window.__srj.run.distFt, gap: 3200 }));
  console.log(JSON.stringify(title), JSON.stringify(ramp), JSON.stringify(end));
  console.log(+ramp.fuel < 5.4 && end.outcome === 'landed' ? 'PASS' : 'FAIL', '| errors:', errs.length ? errs : 'none'); await b.close();
})();
