const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 650 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html')); await p.waitForTimeout(600);
  await p.click('#start'); await p.click('#gotit'); await p.waitForTimeout(200);
  const r = await p.evaluate(async () => {
    const s = window.__srj.snd, out = {};
    for (const k of ['twang', 'flip', 'thud', 'fall', 'stopFall', 'poof', 'coin', 'buy', 'win', 'sad']) { try { s[k](k === 'twang' ? 1 : k === 'flip' ? 2 : true); out[k] = 'ok'; } catch (e) { out[k] = String(e); } }
    s.update('run', 2000, true, true, false); await new Promise(r => setTimeout(r, 300));
    return out;
  });
  console.log(JSON.stringify(r));
  await p.keyboard.press('m'); console.log('muted after M:', await p.getAttribute('#mute', 'aria-pressed'));
  await p.click('#mute'); console.log('after click:', await p.getAttribute('#mute', 'aria-pressed'));
  await p.screenshot({ path: 'shot-mute.png', clip: { x: 700, y: 0, width: 400, height: 50 } });
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
