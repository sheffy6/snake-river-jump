// The river: a hands-off jump ends in a clean splash, a spin held to the water is a belly flop that loses its flips.
// Screenshots go to SHOTS (default: the system temp dir) so they never land in the repo.
const { chromium } = require('playwright'), path = require('path');
const OUT = process.env.SHOTS || require('os').tmpdir();
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = []; let ok = true;
  for (const [tag, vp, touch] of [['desk', { width: 1280, height: 720 }, false], ['land', { width: 932, height: 430 }, true]]) {
    const p = await (await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch })).newPage();
    p.on('pageerror', e => errs.push(tag + ': ' + e.message));
    const shot = n => p.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') });
    await p.goto('file://' + path.resolve(__dirname, '../../index.html')); await p.waitForTimeout(700);
    await p.evaluate(() => { const s = window.__srj.save; s.up.launcher = s.up.engine = s.up.frame = s.up.rocket = 2; s.best = s.st.best = 300; s.ljumps = s.jumps = 5; });
    await p.click('#start'); await p.waitForTimeout(400); await shot('1aim');
    const jump = async (hold, name) => {
      await p.evaluate(() => { window.__srj.setMeter(0.78); window.__srj.press(); });
      await p.waitForFunction(() => window.__srj.run.mode === 'air', null, { timeout: 15000 });
      await p.evaluate(h => { Object.assign(window.__srj.held, h); }, hold);
      await p.waitForTimeout(900); await shot(name + '-a-air');
      await p.waitForFunction(() => window.__srj.run.y < -500, null, { timeout: 15000 }); await shot(name + '-b-fall');
      await p.waitForFunction(() => window.__srj.state === 'after', null, { timeout: 15000 });
      await p.waitForTimeout(250); await shot(name + '-c-hit'); await p.waitForTimeout(900); await shot(name + '-d-float');
      await p.waitForFunction(() => window.__srj.state === 'shop', null, { timeout: 15000 }); await p.waitForTimeout(200); await shot(name + '-e-shop');
      const r = await p.evaluate(() => ({ head: document.getElementById('s-head').textContent, pay: document.getElementById('s-pay').innerText.replace(/\n/g, ' | '), note: document.getElementById('s-note').hidden ? '' : document.getElementById('s-note').textContent, deals: document.getElementById('s-deals').innerText.replace(/\n/g, ' | ') }));
      console.log(tag, name, JSON.stringify(r)); return r;
    };
    const clean = await jump({ boost: true }, '2clean');
    await p.click('#again'); await p.waitForTimeout(200);
    const flop = await jump({ back: true, boost: true }, '3flop');
    ok = ok && /river|splash/i.test(clean.head) && flop.head === 'Belly flop' && /not landed upright/.test(flop.pay);
    await p.close();
  }
  console.log(ok ? 'PASS' : 'FAIL', '| errors:', errs.length ? errs : 'none'); await b.close();
})();
