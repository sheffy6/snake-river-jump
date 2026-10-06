// Careers with the river rules: flips only pay if the jump ends upright, each flip pays less than the last, sponsor contracts.
// Usage: node src/sim/career.js [growth] [level]     env: SEEDS, PRICE (multiplier on base prices), NOCON=1 (no contracts)
const S = require('../core.js');
const DT = 1 / 120, G = S.W.G;
const growth = +process.argv[2] || 0, PRICE = +process.env.PRICE || 1, SEEDS = +process.env.SEEDS || 12;
function rng(seed) { let s = seed; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pd = (target, s) => { const e = target - s.a - 0.22 * s.w; return e > 0.04 ? 1 : e < -0.04 ? -1 : 0; };
function tLeft(s) { // seconds until the wheels reach the river, or the far side if he will get there
  const h = s.y - S.W.COM_H - S.W.RIVER, t = (s.vy + Math.sqrt(s.vy * s.vy + 2 * G * h)) / G;
  if (s.x + s.vx * t < S.W.FAR) return t;
  const h2 = Math.max(0, s.y - S.W.COM_H - S.W.LAND); return (s.vy + Math.sqrt(s.vy * s.vy + 2 * G * h2)) / G;
}
const winged = () => !!S.LEVELS[S.level].wings;
// Each pilot returns {tilt, boost} for the air phase.
const PILOTS = {
  none: s => ({ tilt: 0, boost: true }),
  spinner: s => ({ tilt: 1, boost: true }),                       // holds lean back from the lip to the water
  glider(s) {                                                     // steers for distance, never flips, levels out to land
    const va = Math.atan2(s.vy, s.vx), t = tLeft(s);
    const aim = t < 0.6 ? 0.1 : winged() ? va + 0.45 : s.fuel > 0 ? 0.95 : va + 0.5;
    return { tilt: pd(aim, s), boost: true };
  },
  flipper(s, m) {                                                 // burns nose-up, spins while there is time, then rights himself
    if (m.goFar) return PILOTS.glider(s);
    const t = tLeft(s);
    if (s.fuel > 0.05 && s.rot < 1.2) return { tilt: pd(winged() ? Math.atan2(s.vy, s.vx) + 0.45 : 0.95, s), boost: true };
    const stop = m.stop || 0.95;
    if (t > stop && !m.settle) return { tilt: 1, boost: true };
    m.settle = true;
    if (m.aim === undefined) m.aim = Math.ceil((s.a + s.w * 0.25 - 0.5) / (2 * Math.PI)) * 2 * Math.PI + 0.12;
    return { tilt: pd(m.aim, s), boost: true };
  },
  careful(s, m) {                                                 // glides, and adds flips only when there is plenty of height
    if (m.goFar) return PILOTS.glider(s);
    const t = tLeft(s);
    if (s.fuel <= 0.05 && t > 1.9 && !m.settle) return { tilt: 1, boost: true };
    if (s.rot > 3 || m.settle) { m.settle = true; if (m.aim === undefined) m.aim = Math.ceil((s.a + s.w * 0.25 - 0.5) / (2 * Math.PI)) * 2 * Math.PI + 0.12; return { tilt: pd(m.aim, s), boost: true }; }
    return PILOTS.glider(s);
  },
};
const METER = { perfect: () => 1, human: r => { const u = r(); return u < 0.6 ? 1 : u < 0.85 ? 0.8 + r() * 0.12 : 0.62; }, random: r => S.meterPower(r()) };
function fly(up, power, pilot, goFar, stop) {
  if (pilot === 'showoff') pilot = 'flipper'; else stop = 0; // showoff: a flipper who misjudges when to stop spinning
  const s = S.newRun(up, power), m = { goFar, stop }; let n = 0;
  while (!s.done && n++ < 120 * 60) S.step(s, s.mode === 'air' ? PILOTS[pilot](s, m) : { tilt: 0, boost: false }, DT);
  return s;
}
function career(pilot, meter, seed, lvl, cap = 150) {
  S.setLevel(lvl); const r = rng(seed), up = { launcher: 0, engine: 0, frame: 0, rocket: 0 };
  if (growth) for (const k of S.ORDER) S.UPGRADES[k].growth = growth;
  for (const k of S.ORDER) S.UPGRADES[k].base = S.LEVELS[lvl].base[k] * PRICE;
  const st = S.newStats(), con = S.newContracts(st, up); let cash = 0, earned = 0, trick = 0, bonus = 0, flops = 0, tries = 0;
  for (let j = 1; j <= cap; j++) {
    const far = st.best >= 0.62 * S.W.GAP_FT || S.ORDER.every(k => up[k] >= 4); // a build that might cross: stop showing off and go for it
    const s = fly(up, METER[meter](r), pilot, far, 0.55 + r() * 0.8), pay = S.payout(s.distFt, s.clean ? s.flips : 0, st.best);
    if (s.flips) { tries++; if (!s.clean) flops++; }
    let c = 0; if (!process.env.NOCON) for (const p of S.settleContracts(con, st, s, up)) c += p.pay; else S.record(st, s);
    cash += pay.total + c; earned += pay.total + c; trick += pay.trick; bonus += c;
    if (s.outcome === 'landed') return { j, up: S.ORDER.map(k => up[k]).join(''), trick: trick / earned, bonus: bonus / earned, flop: tries ? flops / tries : 0 };
    for (;;) { const k = S.ORDER.filter(k => up[k] < S.MAX_LVL).sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b]))[0]; if (!k || S.cost(k, up[k]) > cash) break; cash -= S.cost(k, up[k]); up[k]++; }
  }
  return { j: cap, up: S.ORDER.map(k => up[k]).join(''), trick: trick / earned, bonus: bonus / earned, flop: tries ? flops / tries : 0, best: st.best };
}
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const pct = v => Math.round(v * 100) + '%';
for (const lvl of process.argv[3] ? [+process.argv[3]] : [0, 1]) {
  console.log('--- ' + S.LEVELS[lvl].name + (growth ? ' growth ' + growth : '') + (PRICE !== 1 ? ' price x' + PRICE : ''));
  for (const [pilot, meter] of [['flipper', 'perfect'], ['flipper', 'human'], ['showoff', 'human'], ['careful', 'human'], ['glider', 'human'], ['spinner', 'human'], ['spinner', 'random'], ['none', 'random']]) {
    const rs = []; for (let i = 0; i < SEEDS; i++) rs.push(career(pilot, meter, 100 + i * 7, lvl));
    const js = rs.map(r => r.j);
    console.log((pilot + '/' + meter).padEnd(17), 'jumps', String(med(js)).padStart(3), ('(' + Math.min(...js) + '-' + Math.max(...js) + ')').padEnd(10), 'up', rs[0].up, 'tricks', pct(med(rs.map(r => r.trick))).padStart(4), 'sponsors', pct(med(rs.map(r => r.bonus))).padStart(4), 'flops', pct(med(rs.map(r => r.flop))).padStart(4), rs[0].best ? 'best ' + rs[0].best : '');
  }
}
