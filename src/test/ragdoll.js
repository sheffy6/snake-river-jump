// Frames of the rider ragdolling after a crash landing and after hitting the far wall.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 600 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html')); await p.waitForTimeout(700);
  await p.click('#start'); await p.click('#gotit'); await p.waitForTimeout(300);
  const crash = async (name, x, y, vx, vy, a, cape) => {
    await p.evaluate(c => { window.__srj.save.won = c; window.__srj.setMeter(0.78); window.__srj.press(); }, cape);
    await p.waitForFunction(() => window.__srj.run.mode === 'air', null, { timeout: 15000 });
    await p.evaluate(v => { const s = window.__srj.run; [s.x, s.y, s.vx, s.vy, s.a] = v; s.w = 0; }, [x, y, vx, vy, a]);
    await p.waitForFunction(() => window.__srj.state === 'after', null, { timeout: 15000 });
    for (let i = 0; i < 6; i++) { await p.waitForTimeout(i ? 260 : 60); await p.screenshot({ path: `rag-${name}-${i}.png` }); }
    await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 15000 }); await p.click('#again'); await p.waitForTimeout(200);
  };
  await crash('land', 23608 + 500, 300, 900, -250, 2.6, false);
  await crash('wall', 23608 - 300, -120, 900, -150, 0.2, true);
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
