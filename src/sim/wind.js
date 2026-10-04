// Is there a way to fly the wind in Hells Canyon that beats simply gliding? Tries steering and rocket-timing policies on several builds.
const S = require('../core.js'); const { W } = S; S.setLevel(1);
function fly(up, pol) {
  const s = S.newRun(up, 1); let burned = false;
  while (!s.done && s.t < 120) {
    const input = { tilt: 0, boost: false };
    if (s.mode === 'air') {
      const va = Math.atan2(s.vy, s.vx);
      const lead = s.zone > 0 ? pol.up : s.zone < 0 ? pol.down : 0.42;
      const t = Math.max(-0.6, Math.min(1.1, va + lead)), c = Math.atan2(Math.sin(s.a), Math.cos(s.a)), e = t - c - s.w * 0.25;
      input.tilt = e > 0.05 ? 1 : e < -0.05 ? -1 : 0;
      input.boost = pol.rocket === 'start' ? true : pol.rocket === 'sink' ? (s.zone < 0 || s.x > W.NEAR + 0.86 * W.GAP) : pol.rocket === 'thermal' ? s.zone > 0 : pol.rocket === 'apex' ? s.vy < 0 : true;
    }
    S.step(s, input, 1 / 120);
  }
  return s.distFt + (s.outcome === 'landed' ? '*' : '');
}
const lv = n => ({ launcher: n, engine: n, frame: n, rocket: n });
const builds = [2, 3, 4, 5];
const row = (name, pol) => console.log(name.padEnd(46), builds.map(n => String(fly(lv(n), pol)).padStart(6)).join(' '));
console.log('policy'.padEnd(46), builds.map(n => ('all L' + n).padStart(6)).join(' '), '  (* = landed across)');
row('glide, burn rocket at once (baseline)', { up: 0.42, down: 0.42, rocket: 'start' });
row('nose up hard in green', { up: 0.9, down: 0.42, rocket: 'start' });
row('nose level in green (keep speed)', { up: 0.15, down: 0.42, rocket: 'start' });
row('dive through red', { up: 0.42, down: 0.0, rocket: 'start' });
row('nose up in red', { up: 0.42, down: 0.8, rocket: 'start' });
row('nose up in green + dive through red', { up: 0.9, down: 0.0, rocket: 'start' });
row('save the rocket for the red bands', { up: 0.42, down: 0.42, rocket: 'sink' });
row('burn the rocket only in green', { up: 0.42, down: 0.42, rocket: 'thermal' });
row('hold the rocket until past the top', { up: 0.42, down: 0.42, rocket: 'apex' });
row('rocket in red + dive through red', { up: 0.42, down: 0.0, rocket: 'sink' });
// and the same baseline with the wind switched off, to show what the wind is worth
const z = S.LEVELS[1].zones; S.LEVELS[1].zones = []; S.setLevel(1);
row('baseline with no wind at all', { up: 0.42, down: 0.42, rocket: 'start' });
S.LEVELS[1].zones = z; S.setLevel(1);
