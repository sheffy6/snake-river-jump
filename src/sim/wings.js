// Tuning the winged mower: hands-off must be the worst way to fly it, and good flying must clearly beat average.
const S = require('../core.js'); const { W } = S;
if (process.env.L2) Object.assign(S.LEVELS[1], JSON.parse(process.env.L2));
if (process.env.T) Object.assign(S.T, JSON.parse(process.env.T));
S.setLevel(1);
let seed = 1; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
// pilot: {mode, lead, wob}: 'none' hands off; 'hold' keeps the nose `lead` radians above the flight path with a wobble of `wob`; 'yank' holds it far too high
function fly(up, power, p) {
  const s = S.newRun(up, power); const ph = rnd() * 6;
  while (!s.done && s.t < 200) {
    const input = { tilt: 0, boost: true };
    if (s.mode === 'air' && p.mode !== 'none') {
      const va = Math.atan2(s.vy, s.vx), lead = p.mode === 'yank' ? 1.3 : p.lead + (p.wob || 0) * Math.sin(s.t * 2.3 + ph);
      const t = Math.max(-0.9, Math.min(1.2, va + lead)), c = Math.atan2(Math.sin(s.a), Math.cos(s.a)), e = t - c - s.w * 0.25;
      input.tilt = e > 0.05 ? 1 : e < -0.05 ? -1 : 0;
    }
    S.step(s, input, 1 / 120);
  }
  return s;
}
const PIL = { none: { mode: 'none' }, yank: { mode: 'yank' }, sloppy: { mode: 'hold', lead: 0.55, wob: 0.45 }, average: { mode: 'hold', lead: 0.45, wob: 0.2 }, good: { mode: 'hold', lead: 0.3, wob: 0.05 } };
const lv = n => ({ launcher: n, engine: n, frame: n, rocket: n });
const tag = s => s.distFt + (s.outcome === 'landed' ? '*' : s.outcome === 'crashland' ? 'x' : '');
console.log('          ' + Object.keys(PIL).map(k => k.padStart(8)).join('') + '   best angle   (* landed across, x crashed the landing; gap 2800)');
for (const n of [0, 1, 2, 3, 4, 5]) {
  seed = 5; const row = Object.values(PIL).map(p => tag(fly(lv(n), 1, p)).padStart(8)).join('');
  let best = 0, bl = 0, bt = 0; for (let l = 0.05; l <= 0.9; l += 0.05) { const r = fly(lv(n), 1, { mode: 'hold', lead: l }); if (r.distFt > best) { best = r.distFt; bl = l; bt = r.t; } }
  console.log('all L' + n + '    ' + row + '   ' + best + ' at ' + Math.round(bl * 57) + '° (' + bt.toFixed(0) + 's)');
}
seed = 5; console.log('wings only L5, rest L2:', Object.values(PIL).map(p => tag(fly({ launcher: 2, engine: 2, frame: 5, rocket: 2 }, 1, p)).padStart(7)).join(''), '| no wings, rest L5:', Object.values(PIL).map(p => tag(fly({ launcher: 5, engine: 5, frame: 0, rocket: 5 }, 1, p)).padStart(7)).join(''));
function career(p, green, cash) {
  const up = lv(0); let best = 0, jumps = 0;
  while (jumps < 120) { jumps++; const r = rnd(); const power = r < green ? 1 : (r < green + 0.1 ? 0.62 : 0.78 + rnd() * 0.14);
    const s = fly(up, power, p); cash += S.payout(s.distFt, s.flips, best).total; best = Math.max(best, s.distFt);
    if (s.outcome === 'landed') break;
    for (;;) { const o = S.ORDER.filter(k => up[k] < S.MAX_LVL && S.cost(k, up[k]) <= cash).sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b])); if (!o.length) break; cash -= S.cost(o[0], up[o[0]]); up[o[0]]++; } }
  return [jumps, S.ORDER.map(k => up[k]).join('')];
}
for (const k of ['good', 'average', 'sloppy', 'none']) { const rs = []; for (let i = 0; i < 12; i++) { seed = 100 + i * 17; rs.push(career(PIL[k], k === 'good' ? 0.65 : 0.5, 1500)); } rs.sort((a, b) => a[0] - b[0]);
  console.log(k.padEnd(8), 'jumps to cross: median', rs[6][0], 'range', rs[0][0] + '-' + rs[11][0], '| upgrades', rs[6][1]); }
