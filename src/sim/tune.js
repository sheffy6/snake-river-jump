// Simulated players, to see how many jumps it takes to cross.
const S = require('../core.js');
const { W } = S;
if (process.env.CFG) { const c = JSON.parse(process.env.CFG); Object.assign(S.T, c.T || {}); for (const k in (c.U || {})) Object.assign(S.UPGRADES[k], c.U[k]); }
let seed = 1;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

function fly(up, power, skill) {
  const s = S.newRun(up, power);
  const dt = 1 / 120;
  let flipping = 0;
  while (!s.done && s.t < 90) {
    const input = { tilt: 0, boost: false };
    if (s.mode === 'air') {
      const va = Math.atan2(s.vy, s.vx);
      input.boost = true;
      // estimate air time left above rim
      const h = s.y - W.COM_H;
      const tLeft = (s.vy + Math.sqrt(Math.max(0, s.vy * s.vy + 2 * W.G * Math.max(h, 0)))) / W.G;
      if (skill.flips && flipping === 0) { const air = 2 * s.vy / W.G; flipping = air > 3.2 ? 2 : air > 1.5 ? 1 : -1; }
      if (flipping > 0 && (!skill.late || s.vy < 0) && s.rot < flipping * 2 * Math.PI - 0.7) {
        input.tilt = 1; input.boost = false;
      } else if (skill.glide) {
        let target = va + 0.42; // hold the nose a bit above the flight path
        target = Math.max(-0.5, Math.min(0.75, target));
        let cur = s.a % (2 * Math.PI); if (cur > Math.PI) cur -= 2 * Math.PI; if (cur < -Math.PI) cur += 2 * Math.PI;
        const err = target - cur - s.w * 0.25;
        input.tilt = err > 0.05 ? 1 : err < -0.05 ? -1 : 0;
      }
    }
    S.step(s, input, dt);
  }
  return s;
}

function career(skill, verbose) {
  const up = { launcher: 0, engine: 0, frame: 0, rocket: 0 };
  let cash = 0, best = 0, jumps = 0;
  const log = [];
  while (jumps < 200) {
    jumps++;
    const r = rnd();
    const power = r < skill.green ? 1 : (r < skill.green + 0.1 ? 0.62 : 0.78 + rnd() * 0.14);
    const s = fly(up, power, skill);
    const p = S.payout(s.distFt, s.flips, best);
    cash += p.total; best = Math.max(best, s.distFt);
    log.push(`${jumps}: ${s.outcome} ${s.distFt}ft flips ${s.flips} v0 ${Math.round(s.takeoffV || 0)} alt ${Math.round(s.maxAlt)} t ${s.t.toFixed(1)} +$${p.total} [${S.ORDER.map(k => up[k]).join('')}]`);
    if (s.outcome === 'landed' || s.outcome === 'crashland') break;
    // buy cheapest affordable, repeatedly
    for (;;) {
      const opts = S.ORDER.filter(k => up[k] < S.MAX_LVL && S.cost(k, up[k]) <= cash).sort((a, b) => S.cost(a, up[a]) - S.cost(b, up[b]));
      if (!opts.length) break;
      cash -= S.cost(opts[0], up[opts[0]]); up[opts[0]]++;
    }
  }
  if (verbose) console.log(log.join('\n'));
  return { jumps, up: S.ORDER.map(k => up[k]).join(''), best };
}

const skills = {
  good: { green: 0.7, glide: true, flips: true },
  late: { green: 0.7, glide: true, flips: true, late: true },
  steady: { green: 0.55, glide: true, flips: false },
  casual: { green: 0.35, glide: false, flips: false },
};
module.exports = { fly, career, skills, setSeed: v => { seed = v; } };
if (require.main !== module) return;
if (process.argv[2] === 'v') { seed = 7; career(skills[process.argv[3] || 'good'], true); }
for (const [name, sk] of Object.entries(skills)) {
  const rs = [];
  for (let i = 0; i < 12; i++) { seed = 100 + i * 17; rs.push(career(sk)); }
  console.log(name, 'jumps:', rs.map(r => r.jumps).join(' '), '| upgrades at win:', rs.slice(0, 4).map(r => r.up).join(' '));
}
// can a maxed scooter cross with no glide at all? and how far does a stock one go
const max = { launcher: 5, engine: 5, frame: 5, rocket: 5 }, zero = { launcher: 0, engine: 0, frame: 0, rocket: 0 };
for (const [n, sk] of Object.entries(skills)) {
  const a = fly(zero, 1, sk), b = fly(max, 1, sk);
  console.log(n, 'stock:', a.outcome, a.distFt, 'ft, air', a.t.toFixed(1), 's | maxed:', b.outcome, b.distFt, 'ft, top', Math.round(b.maxAlt / W.PXFT), 'ft, takeoff', Math.round(b.takeoffV), 'px/s, t', b.t.toFixed(1));
}
