// How much longer does a playthrough take if only a wheels-down landing counts as crossing?
const S = require('../core.js'); const { fly, skills } = require('./tune.js');
let seed = 1; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
function career(skill, strict) {
  const up = { launcher: 0, engine: 0, frame: 0, rocket: 0 }; let cash = 0, best = 0, jumps = 0, crashes = 0;
  while (jumps < 150) {
    jumps++; const r = rnd(); const power = r < skill.green ? 1 : (r < skill.green + 0.1 ? 0.62 : 0.78 + rnd() * 0.14);
    const s = fly(up, power, skill); cash += S.payout(s.distFt, s.flips, best).total; best = Math.max(best, s.distFt);
    if (s.outcome === 'landed') break;
    if (s.outcome === 'crashland') { if (!strict) break; crashes++; }
    for (;;) { const o = S.ORDER.filter(k => up[k] < S.MAX_LVL && S.cost(k, up[k]) <= cash).sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b])); if (!o.length) break; cash -= S.cost(o[0], up[o[0]]); up[o[0]]++; }
  }
  return [jumps, crashes];
}
for (const sk of ['late', 'steady', 'casual']) for (const strict of [false, true]) {
  const rs = []; for (let i = 0; i < 20; i++) { seed = 100 + i * 17; rs.push(career(skills[sk], strict)); }
  rs.sort((a, b) => a[0] - b[0]);
  console.log(sk.padEnd(7), strict ? 'must land  ' : 'any arrival', 'median', rs[10][0], 'range', rs[0][0] + '-' + rs[19][0], '| crash landings before the clean one: median', rs.map(r => r[1]).sort((a, b) => a - b)[10], 'max', Math.max(...rs.map(r => r[1])));
}
