const S = require('../core.js'); const { fly, skills } = require('./tune.js');
let seed = 1; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
function career(skill, pick) {
  const up = { launcher: 0, engine: 0, frame: 0, rocket: 0 }; let cash = 0, best = 0, jumps = 0;
  while (jumps < 150) {
    jumps++; const r = rnd();
    const power = r < skill.green ? 1 : (r < skill.green + 0.1 ? 0.62 : 0.78 + rnd() * 0.14);
    const s = fly(up, power, skill); cash += S.payout(s.distFt, s.flips, best).total; best = Math.max(best, s.distFt);
    if (s.outcome === 'landed' || s.outcome === 'crashland') break;
    for (;;) { const k = pick(up, cash); if (!k) break; cash -= S.cost(k, up[k]); up[k]++; }
  }
  return jumps;
}
const open = up => S.ORDER.filter(k => up[k] < S.MAX_LVL);
const strat = {
  'cheapest first': (up, cash) => open(up).filter(k => S.cost(k, up[k]) <= cash).sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b]))[0],
  'dearest affordable': (up, cash) => open(up).filter(k => S.cost(k, up[k]) <= cash).sort((a, b) => S.cost(b, up[b]) - S.cost(a, up[a]))[0],
};
for (const first of S.ORDER) strat['max ' + first + ' first'] = (up, cash) => {
  const order = [first, ...S.ORDER.filter(k => k !== first)];
  const k = order.find(k => up[k] < S.MAX_LVL); // save up for it, buy nothing else meanwhile
  return k && S.cost(k, up[k]) <= cash ? k : null;
};
for (const first of S.ORDER) strat['favour ' + first] = (up, cash) => {
  const aff = open(up).filter(k => S.cost(k, up[k]) <= cash); if (!aff.length) return null;
  return aff.includes(first) ? first : aff.sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b]))[0];
};
for (const sk of ['steady', 'casual']) { console.log('--', sk);
  for (const [n, f] of Object.entries(strat)) { const rs = []; for (let i = 0; i < 20; i++) { seed = 100 + i * 17; rs.push(career(skills[sk], f)); }
    rs.sort((a, b) => a - b); console.log(n.padEnd(22), 'median', rs[10], 'range', rs[0] + '-' + rs[19]); } }
