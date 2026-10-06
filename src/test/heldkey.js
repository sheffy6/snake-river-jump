// Boost still held when the shop opens must not press a button there, and Space never moves to the next canyon.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 700 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html')); await p.waitForTimeout(700);
  await p.click('#start'); await p.click('#gotit'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__srj.save.cash = 5000; window.__srj.setMeter(0.78); window.__srj.press(); });
  await p.waitForFunction(() => window.__srj.run.mode === 'air', null, { timeout: 15000 });
  await p.keyboard.down(' ');
  await p.evaluate(() => { const s = window.__srj.run; s.x = 23608 + 500; s.y = 260; s.vx = 700; s.vy = -200; s.a = 0.1; s.w = 0; });
  await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 15000 });
  for (let i = 0; i < 6; i++) { await p.keyboard.down(' '); await p.waitForTimeout(40); } // auto-repeat
  await p.keyboard.up(' '); await p.waitForTimeout(200);
  const held = await p.evaluate(() => [window.__srj.state, window.__srj.save.lvl, window.__srj.save.cash > 5000]);
  await p.keyboard.press(' '); await p.waitForTimeout(200);
  const after = await p.evaluate(() => [window.__srj.state, window.__srj.save.lvl, window.__srj.save.cash > 5000]);
  console.log('released in shop:', held, '| fresh Space:', after);
  const ok = held[0] === 'shop' && held[1] === 0 && held[2] && after[0] === 'aim' && after[1] === 0 && after[2];
  console.log(ok ? 'PASS' : 'FAIL', '| errors:', errs.length ? errs : 'none'); await b.close();
})();
