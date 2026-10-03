const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const errs = [];
  for (const [name, vp] of [['l844', { width: 844, height: 390 }], ['l667', { width: 667, height: 375 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('file://' + require('path').resolve(__dirname, '../../index.html')); await p.waitForTimeout(800);
    await p.screenshot({ path: `ls-${name}-1title.png` });
    await p.tap('#start'); await p.waitForTimeout(300); await p.evaluate(() => window.__srj.setMeter(0.6)); await p.screenshot({ path: `ls-${name}-2aim.png` });
    await p.evaluate(() => { window.__srj.setMeter(0.78); window.__srj.press(); });
    await p.waitForFunction(() => window.__srj.run && window.__srj.run.mode === 'air', null, { timeout: 15000 }); await p.waitForTimeout(400); await p.screenshot({ path: `ls-${name}-3air.png` });
    await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 15000 }); await p.waitForTimeout(200); await p.screenshot({ path: `ls-${name}-4shop.png` });
    const m = await p.evaluate(() => { const c = document.querySelector('#shop .card'); return { scrolls: c.scrollHeight > c.clientHeight + 1, card: c.clientHeight, vh: innerHeight, overflowX: document.documentElement.scrollWidth > innerWidth }; });
    console.log(name, JSON.stringify(m));
    await ctx.close();
  }
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
