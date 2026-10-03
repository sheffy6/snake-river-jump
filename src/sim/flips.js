const S = require('../core.js'); const { fly, skills } = require('./tune.js');
let seed = 1; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
function career(skill, mult, onAll, maxFlips) {
  const up = { launcher: 0, engine: 0, frame: 0, rocket: 0 }; let cash = 0, best = 0, jumps = 0, flipJumps = 0;
  while (jumps < 150) {
    jumps++; const r = rnd();
    const power = r < skill.green ? 1 : (r < skill.green + 0.1 ? 0.62 : 0.78 + rnd() * 0.14);
    const s = fly(up, power, skill); if (s.flips) flipJumps++;
    const base = s.distFt, pb = s.distFt > best ? (s.distFt - best) * 2 : 0;
    cash += onAll ? (base + pb) * (1 + mult * s.flips) : base * (1 + mult * s.flips) + pb; best = Math.max(best, s.distFt);
    if (s.outcome === 'landed' || s.outcome === 'crashland') break;
    for (;;) { const o = S.ORDER.filter(k => up[k] < S.MAX_LVL && S.cost(k, up[k]) <= cash).sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b])); if (!o.length) break; cash -= S.cost(o[0], up[o[0]]); up[o[0]]++; }
  }
  return [jumps, flipJumps];
}
const run = (label, sk, mult, onAll) => { const rs = []; for (let i = 0; i < 20; i++) { seed = 100 + i * 17; rs.push(career(skills[sk], mult, onAll)); }
  rs.sort((a, b) => a[0] - b[0]); console.log(label.padEnd(44), 'median', rs[10][0], 'range', rs[0][0] + '-' + rs[19][0], '| jumps with a flip', rs[10][1]); };
run('no flips (steers only)', 'steady', 0.25, false);
run('flips, +25% of distance pay (current)', 'late', 0.25, false);
run('flips, +50% of distance pay', 'late', 0.5, false);
run('flips, +100% of distance pay', 'late', 1, false);
run('flips, +25% of the whole payout', 'late', 0.25, true);
run('flips, +50% of the whole payout', 'late', 0.5, true);
