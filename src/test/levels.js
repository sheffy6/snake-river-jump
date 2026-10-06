// Level hand-off, Hells Canyon scenery, the mower and the wind, plus an old save from before levels existed.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const url = 'file://' + require('path').resolve(__dirname, '../../index.html'); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1200, height: 700 } });
  // an old save: crossed once, no level fields
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('srj-save-v1')) localStorage.setItem('srj-save-v1', JSON.stringify({ cash: 4200, best: 1700, jumps: 17, won: true, up: { launcher: 5, engine: 4, frame: 4, rocket: 4 } })); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(800);
  console.log('old save →', JSON.stringify(await p.evaluate(() => { const s = window.__srj.save; return { lvl: s.lvl, cleared: s.cleared, won: s.won, ljumps: s.ljumps, cash: s.cash }; })), '| title:', await p.textContent('#t-eyebrow'));
  await p.click('#start'); await p.click('#gotit'); await p.waitForTimeout(300);
  const fly = async (shots) => {
    await p.evaluate(() => { window.__srj.setMeter(0.78); window.__srj.press(); });
    await p.evaluate(() => { clearInterval(window.__pilot); window.__pilot = setInterval(() => { const g = window.__srj, s = g.run; if (!s || s.mode !== 'air' || g.state !== 'run') return; const va = Math.atan2(s.vy, s.vx); let t = Math.max(-0.5, Math.min(0.75, va + 0.42)); let c = Math.atan2(Math.sin(s.a), Math.cos(s.a)); const e = t - c - s.w * 0.25; g.held.back = e > 0.05; g.held.fwd = e < -0.05; g.held.boost = true; }, 8); });
    for (const [cond, file] of shots) { await p.waitForFunction(cond, null, { timeout: 40000 }); await p.screenshot({ path: file }); }
    await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 40000 }); await p.waitForTimeout(200);
  };
  // cross the Snake River on the old maxed-ish scooter
  await p.evaluate(() => { window.__srj.save.up = { launcher: 5, engine: 5, frame: 5, rocket: 5 }; });
  await fly([]); await p.screenshot({ path: 'lv-1shop.png' });
  console.log('after crossing L1:', await p.textContent('#s-head'), '|', await p.textContent('#s-note'), '| next:', await p.isVisible('#next') ? await p.textContent('#next') : 'hidden');
  await p.click('#next'); await p.waitForTimeout(700); await p.screenshot({ path: 'lv-2aim.png' });
  console.log('level 2 →', JSON.stringify(await p.evaluate(() => { const s = window.__srj.save; return { lvl: s.lvl, up: s.up, best: s.best, cash: s.cash, ljumps: s.ljumps }; })), '| hint:', await p.textContent('#hinttext'));
  await fly([[() => window.__srj.run.mode === 'ground' && window.__srj.run.x > 2200, 'lv-3run.png'], [() => window.__srj.run.mode === 'air' && window.__srj.run.x > 5200, 'lv-4air.png']]);
  await p.screenshot({ path: 'lv-5shop.png' }); console.log('stock mower:', await p.textContent('#s-eyebrow'), '| prices', await p.textContent('#buy-launcher'), await p.textContent('#buy-rocket'));
  await p.click('#again'); await p.evaluate(() => { window.__srj.save.up = { launcher: 5, engine: 5, frame: 5, rocket: 5 }; });
  await fly([[() => window.__srj.run.mode === 'air' && window.__srj.run.x > 9000, 'lv-6glide.png'], [() => window.__srj.run.x > 38300 - 1500, 'lv-8far.png']]);
  await p.screenshot({ path: 'lv-9shop.png' });
  console.log('maxed mower:', await p.textContent('#s-head'), '|', await p.textContent('#s-note'), '| next:', await p.isVisible('#next'), '| cleared', await p.evaluate(() => window.__srj.save.cleared));
  // reload keeps the level
  await p.reload(); await p.waitForTimeout(700); console.log('after reload: lvl', await p.evaluate(() => window.__srj.save.lvl), '| title:', await p.textContent('#t-eyebrow'));
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
