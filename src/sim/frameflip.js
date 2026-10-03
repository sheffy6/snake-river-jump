const S = require('../core.js'); const { W } = S;
let seed = 1; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const air = s => { const h = Math.max(0, s.y - W.COM_H); return (s.vy + Math.sqrt(s.vy * s.vy + 2 * W.G * h)) / W.G; };
function fly(up, power, doFlips, boostPer) {
  const f = 1 + boostPer * up.frame; S.T.TORQUE = 16 * f;
  const flipTime = 0.86 / f + 0.3;
  const s = S.newRun(up, power); let n = -1;
  while (!s.done && s.t < 90) {
    const input = { tilt: 0, boost: false };
    if (s.mode === 'air') {
      input.boost = true; const tl = air(s);
      if (n < 0) n = doFlips ? Math.min(4, Math.floor((tl - 0.2) / flipTime)) : 0;
      if (n > 0 && tl <= n * flipTime + 0.25 && s.rot < n * 2 * Math.PI - 0.5) { input.tilt = 1; input.boost = false; }
      else { const va = Math.atan2(s.vy, s.vx); const t = Math.max(-0.5, Math.min(0.75, va + 0.42)); const c = Math.atan2(Math.sin(s.a), Math.cos(s.a)); const e = t - c - s.w * 0.25; input.tilt = e > 0.05 ? 1 : e < -0.05 ? -1 : 0; }
    }
    S.step(s, input, 1 / 120);
  }
  return s;
}
function career(doFlips, boostPer, mult) {
  const up = { launcher: 0, engine: 0, frame: 0, rocket: 0 }; let cash = 0, best = 0, jumps = 0, flips = 0, first = 0;
  while (jumps < 150) {
    jumps++; const r = rnd(); const power = r < 0.55 ? 1 : (r < 0.65 ? 0.62 : 0.78 + rnd() * 0.14);
    const s = fly(up, power, doFlips, boostPer); flips += s.flips; if (s.flips && !first) first = jumps;
    cash += s.distFt * (1 + mult * s.flips) + (s.distFt > best ? (s.distFt - best) * 2 : 0); best = Math.max(best, s.distFt);
    if (s.outcome === 'landed' || s.outcome === 'crashland') break;
    for (;;) { const o = S.ORDER.filter(k => up[k] < S.MAX_LVL && S.cost(k, up[k]) <= cash).sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b])); if (!o.length) break; cash -= S.cost(o[0], up[o[0]]); up[o[0]]++; }
  }
  return [jumps, flips, first];
}
const run = (label, a, b, c) => { const rs = []; for (let i = 0; i < 20; i++) { seed = 100 + i * 17; rs.push(career(a, b, c)); } rs.sort((x, y) => x[0] - y[0]); const m = rs[10];
  console.log(label.padEnd(46), 'median', m[0], 'range', rs[0][0] + '-' + rs[19][0], '| flips in the run', m[1], '| first flip on jump', m[2]); };
run('no flips', false, 0, 0.25);
run('+25%, flip speed fixed (now)', true, 0, 0.25);
run('+25%, frame adds 20% flip speed per level', true, 0.2, 0.25);
run('+50%, flip speed fixed', true, 0, 0.5);
run('+50%, frame adds 20% flip speed per level', true, 0.2, 0.5);
// how many flips fit in one jump at each all-round level
for (const b of [0, 0.2]) console.log('flips per jump by level, frame boost', b, [0,1,2,3,4,5].map(l => { const s = fly({launcher:l,engine:l,frame:l,rocket:l}, 1, true, b); return s.flips + ' (' + s.distFt + 'ft)'; }).join('  '));
