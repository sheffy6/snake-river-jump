const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const errs = [];
  for (const [name, vp, touch] of [['desk', { width: 1200, height: 700 }, false], ['phone', { width: 400, height: 760 }, true]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
    await p.goto('file://' + require('path').resolve(__dirname, '../../index.html')); await p.waitForTimeout(900);
    await p.screenshot({ path: `shot-${name}-1title.png` });
    await p.click('#start'); await p.click('#gotit'); await p.waitForTimeout(300);
    await p.evaluate(() => window.__srj.setMeter(0.78)); await p.screenshot({ path: `shot-${name}-2aim.png` });
    await p.evaluate(() => { window.__srj.setMeter(0.78); window.__srj.press(); });
    await p.waitForTimeout(2600); await p.screenshot({ path: `shot-${name}-3ramp.png` });
    await p.evaluate(() => { window.__srj.held.back = true; }); await p.waitForTimeout(700); await p.screenshot({ path: `shot-${name}-4air.png` });
    await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 15000 });
    await p.waitForTimeout(200); await p.screenshot({ path: `shot-${name}-5shop.png` });
    console.log(name, 'after jump 1:', JSON.stringify(await p.evaluate(() => window.__srj.save)), 'overflowX', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    // mid-level scooter: glide, then fall short
    await p.evaluate(() => { const s = window.__srj.save; s.up = { launcher: 3, engine: 3, frame: 3, rocket: 2 }; });
    await p.click('#again'); await p.evaluate(() => { window.__srj.setMeter(0.78); window.__srj.press(); });
    await p.evaluate(() => { window.__mode = 'glide'; window.__pilot = setInterval(() => { const g = window.__srj, s = g.run; if (!s || s.mode !== 'air' || g.state !== 'run') return; if (window.__mode === 'flip') { g.held.back = s.vy < 0 && s.rot < 5.6; g.held.fwd = false; if (g.held.back) return; } const va = Math.atan2(s.vy, s.vx); let t = Math.max(-0.5, Math.min(0.75, va + 0.42)); let c = Math.atan2(Math.sin(s.a), Math.cos(s.a)); const e = t - c - s.w * 0.25; g.held.back = e > 0.05; g.held.fwd = e < -0.05; g.held.boost = true; }, 8); });
    await p.waitForFunction(() => window.__srj.run && window.__srj.run.mode === 'air' && window.__srj.run.vy < 0, null, { timeout: 15000 }); await p.screenshot({ path: `shot-${name}-6apex.png` });
    await p.waitForFunction(() => window.__srj.run.rimDone, null, { timeout: 15000 }); await p.waitForTimeout(900); await p.screenshot({ path: `shot-${name}-7fall.png` });
    await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 15000 });
    console.log(name, 'mid jump:', await p.textContent('#s-eyebrow'), await p.textContent('#s-pay'));
    if (name === 'desk') {
      await p.evaluate(() => { const s = window.__srj.save; s.up = { launcher: 5, engine: 5, frame: 5, rocket: 3 }; window.__mode = 'flip'; });
      await p.click('#again'); await p.evaluate(() => { window.__srj.setMeter(0.78); window.__srj.press(); });
      await p.waitForFunction(() => window.__srj.state === 'after', null, { timeout: 25000 }); await p.waitForTimeout(450); await p.screenshot({ path: 'shot-desk-8end.png' });
      await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 15000 });
      console.log('late flip jump:', await p.textContent('#s-head'), '|', await p.textContent('#s-pay'));
    }
    await ctx.close();
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
