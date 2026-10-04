// If the mower had real wings (more lift), how much would piloting matter? Compares pilots at several lift multipliers, wind off.
const S = require('../core.js'); const { W } = S;
S.LEVELS[1].zones = []; S.setLevel(1);
const CL0 = S.T.CL;
function fly(up, lead, mode) {
  const s = S.newRun(up, 1);
  while (!s.done && s.t < 200) {
    const input = { tilt: 0, boost: true };
    if (s.mode === 'air' && mode !== 'none') {
      const va = Math.atan2(s.vy, s.vx), sp = Math.hypot(s.vx, s.vy);
      let L = lead;
      if (mode === 'pump') L = sp < 900 ? -0.1 : lead;            // dive to get speed back when slow, then pull up again
      if (mode === 'yank') L = 1.3;                                // hauls the nose up and stalls
      const t = Math.max(-0.9, Math.min(1.2, va + L)), c = Math.atan2(Math.sin(s.a), Math.cos(s.a)), e = t - c - s.w * 0.25;
      input.tilt = e > 0.05 ? 1 : e < -0.05 ? -1 : 0;
    }
    S.step(s, input, 1 / 120);
  }
  return s;
}
const lv = n => ({ launcher: n, engine: n, frame: n, rocket: n });
for (const k of [1, 3, 5, 8]) {
  S.T.CL = CL0 * k; console.log('\nlift x' + k);
  for (const n of [0, 2, 4, 5]) {
    const none = fly(lv(n), 0, 'none').distFt, yank = fly(lv(n), 0, 'yank').distFt, plain = fly(lv(n), 0.42, 'hold').distFt;
    let best = 0, bl = 0; for (let l = 0.05; l <= 0.9; l += 0.05) { const d = fly(lv(n), l, 'hold').distFt; if (d > best) { best = d; bl = l; } }
    let pump = 0; for (let l = 0.2; l <= 0.8; l += 0.1) pump = Math.max(pump, fly(lv(n), l, 'pump').distFt);
    const t = fly(lv(n), bl, 'hold').t;
    console.log('  all L' + n, '| never steers', String(none).padStart(5), '| hauls nose up', String(yank).padStart(5), '| holds a so-so angle', String(plain).padStart(5), '| holds the best angle', String(best).padStart(5), '(nose ' + Math.round(bl * 57) + '° up, ' + t.toFixed(0) + 's flight)', '| dives and pulls up', String(pump).padStart(5));
  }
}
