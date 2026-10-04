// Tuning Hells Canyon: how far each mower build goes, and how many jumps a playthrough takes.
const S = require('../core.js'); const { W } = S;
const cfg = process.env.L2 ? JSON.parse(process.env.L2) : null;
if (cfg) Object.assign(S.LEVELS[1], cfg);
let seed = 1; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
// pilots: 'none' never steers, 'glide' holds the nose above the flight path, 'soar' also slows down in rising air and dives through sinking air
function fly(up, power, pilot) {
  const s = S.newRun(up, power);
  while (!s.done && s.t < 120) {
    const input = { tilt: 0, boost: false };
    if (s.mode === 'air') {
      input.boost = true;
      if (pilot !== 'none') {
        const va = Math.atan2(s.vy, s.vx);
        let lead = 0.42; if (pilot === 'soar') lead = s.zone > 0 ? 0.75 : s.zone < 0 ? 0.15 : 0.42;
        const t = Math.max(-0.5, Math.min(pilot === 'soar' && s.zone > 0 ? 1.0 : 0.75, va + lead)), c = Math.atan2(Math.sin(s.a), Math.cos(s.a)), e = t - c - s.w * 0.25;
        input.tilt = e > 0.05 ? 1 : e < -0.05 ? -1 : 0;
      }
    }
    S.step(s, input, 1 / 120);
  }
  return s;
}
function career(pilot, green, startCash) {
  const up = { launcher: 0, engine: 0, frame: 0, rocket: 0 }; let cash = startCash, best = 0, jumps = 0;
  while (jumps < 150) {
    jumps++; const r = rnd(); const power = r < green ? 1 : (r < green + 0.1 ? 0.62 : 0.78 + rnd() * 0.14);
    const s = fly(up, power, pilot); cash += S.payout(s.distFt, s.flips, best).total; best = Math.max(best, s.distFt);
    if (s.outcome === 'landed') break;
    for (;;) { const o = S.ORDER.filter(k => up[k] < S.MAX_LVL && S.cost(k, up[k]) <= cash).sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b])); if (!o.length) break; cash -= S.cost(o[0], up[o[0]]); up[o[0]]++; }
  }
  return [jumps, S.ORDER.map(k => up[k]).join('')];
}
S.setLevel(1);
const lv = n => ({ launcher: n, engine: n, frame: n, rocket: n });
for (const n of [0, 1, 2, 3, 4, 5]) console.log('all level', n, ['none', 'glide', 'soar'].map(p => { const s = fly(lv(n), 1, p); return p + ' ' + s.distFt + (s.outcome === 'landed' ? ' landed' : s.outcome === 'wall' ? ' wall' : s.outcome === 'crashland' ? ' crash' : '') + ' ' + s.t.toFixed(0) + 's'; }).join(' | '));
for (const [p, g] of [['soar', 0.6], ['glide', 0.55], ['none', 0.35]]) { const rs = []; for (let i = 0; i < 16; i++) { seed = 100 + i * 17; rs.push(career(p, g, 1500)); } rs.sort((a, b) => a[0] - b[0]);
  console.log(p.padEnd(6), 'jumps: median', rs[8][0], 'range', rs[0][0] + '-' + rs[15][0], '| upgrades at the crossing', rs[8][1]); }
console.log('prices', S.ORDER.map(k => k + ' ' + [0, 1, 2, 3, 4].map(l => S.cost(k, l)).join('/')).join('  '));
