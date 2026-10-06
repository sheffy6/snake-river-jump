// A crash landing on the far side must not count as a crossing; a wheels-down landing must.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 700 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html')); await p.waitForTimeout(700);
  await p.click('#start'); await p.click('#gotit'); await p.waitForTimeout(300);
  const arrive = async angle => {
    await p.evaluate(() => { window.__srj.setMeter(0.78); window.__srj.press(); });
    await p.waitForFunction(() => window.__srj.run.mode === 'air', null, { timeout: 15000 });
    await p.evaluate(a => { const s = window.__srj.run; s.x = 23608 + 500; s.y = 260; s.vx = 700; s.vy = -200; s.a = a; s.w = 0; }, angle);
    await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 15000 }); await p.waitForTimeout(150);
    const r = { head: await p.textContent('#s-head'), note: await p.isVisible('#s-note') ? await p.textContent('#s-note') : '', won: await p.evaluate(() => window.__srj.save.won), again: await p.textContent('#again') };
    return r;
  };
  const crash = await arrive(Math.PI); console.log('upside down :', JSON.stringify(crash));
  await p.screenshot({ path: 'crashland.png' });
  await p.click('#again'); await p.waitForTimeout(200);
  const clean = await arrive(0.1); console.log('wheels down :', JSON.stringify(clean));
  console.log(crash.won === false && clean.won === true ? 'PASS' : 'FAIL', '| errors:', errs.length ? errs : 'none'); await b.close();
})();
