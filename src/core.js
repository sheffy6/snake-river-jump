// Snake River Jump: physics and economy. No DOM, so the same file runs in the page and in the tuning script.
const SRJ = (() => {
  // World units are art pixels (SMOOTH ROCKS scale). y is up, 0 is the launch-side ground.
  const W = {
    START: 720,        // scooter centre at rest, just in front of the launcher
    RAMP_X0: 3310,     // ramp foot
    RAMP_X1: 3860,     // ramp lip
    RAMP_H: 174,
    NEAR: 4020,        // near canyon rim
    FAR: 23608,        // far canyon rim
    LAND: -8,          // far-side ground level
    COM_H: 95,         // centre of mass above the wheel contact line
    HALF_WB: 97,       // half wheelbase
    G: 900,
  };
  W.GAP = W.FAR - W.NEAR;
  W.GAP_FT = 1600;
  W.PXFT = W.GAP / W.GAP_FT;
  W.ZONES = [];        // wind: stretches of rising or sinking air over the canyon
  W.LB = 240;          // what the stock vehicle weighs, for the shop label

  const A = 0.15; // fraction of the ramp that eases in
  function rampH(x) {
    const u = (x - W.RAMP_X0) / (W.RAMP_X1 - W.RAMP_X0);
    if (u <= 0) return 0;
    if (u >= 1) return W.RAMP_H;
    return W.RAMP_H * (u < A ? (u * u) / (A * (2 - A)) : (2 * u - A) / (2 - A));
  }
  // Solid ground height at x, or -Infinity over the canyon.
  function terrain(x) {
    if (x <= W.RAMP_X1) return rampH(x);
    if (x < W.NEAR) return W.RAMP_H * (1 - (x - W.RAMP_X1) / (W.NEAR - W.RAMP_X1));
    if (x < W.FAR) return -Infinity;
    return W.LAND;
  }
  function slope(x) {
    return Math.atan2(rampH(x + 4) - rampH(x - 4), 8);
  }

  // ---- Upgrades -------------------------------------------------------
  const UPGRADES = {
    launcher: {
      name: 'Launcher spring', blurb: 'Leaves the launcher faster',
      vals: [1000, 1160, 1336, 1528, 1736, 1960], unit: v => Math.round(v / W.PXFT * 0.68) + ' mph',
      base: 80, growth: 2.4,
    },
    engine: {
      name: 'Engine', blurb: 'Builds speed on the run-up',
      vals: [96, 176, 264, 360, 464, 576], unit: v => Math.round(v / 16) + ' hp',
      base: 100, growth: 2.4,
    },
    frame: {
      name: 'Lighter frame', blurb: 'Launches faster, glides further, flips quicker',
      vals: [1, 0.92, 0.85, 0.78, 0.72, 0.66], unit: v => Math.round(v * W.LB) + ' lb',
      base: 120, growth: 2.4,
    },
    rocket: {
      name: 'Rocket', blurb: 'Burns in the air while you hold boost',
      vals: [0, 0.8, 1.4, 2.0, 2.7, 3.5], unit: v => (v ? v.toFixed(1) + ' s of fuel' : 'none'),
      base: 150, growth: 2.4,
    },
  };
  const ORDER = ['launcher', 'engine', 'frame', 'rocket'];
  const MAX_LVL = 5;
  const cost = (k, lvl) => Math.round(UPGRADES[k].base * Math.pow(UPGRADES[k].growth, lvl) / 5) * 5;
  const val = (k, up) => UPGRADES[k].vals[up[k]];

  // ---- Levels --------------------------------------------------------
  // Each canyon has its own gap, vehicle, pay rate and wind. A new vehicle starts the shop again from a higher floor.
  const T = { CD: 1.5e-5, CL: 1.8e-5, CDI: 2e-5, ROCKET_A: 800, TORQUE: 16, SPIN_DAMP: 2.2, RATE: 1, FLIP_MULT: 0.5, PB_RATE: 2, FRAME_SPIN: 0.2 };
  const LEVELS = [
    {
      id: 'snake', name: 'Snake River Canyon', place: 'Twin Falls, Idaho', gapFt: 1600, vehicle: 'scooter', vehicleName: 'scooter', rate: 1, lb: 240,
      vals: { launcher: [1000, 1160, 1336, 1528, 1736, 1960], engine: [96, 176, 264, 360, 464, 576], frame: [1, 0.92, 0.85, 0.78, 0.72, 0.66], rocket: [0, 0.8, 1.4, 2.0, 2.7, 3.5] },
      base: { launcher: 80, engine: 100, frame: 120, rocket: 150 }, zones: [],
    },
    {
      id: 'hells', name: 'Hells Canyon', place: 'Idaho and Oregon', gapFt: 2800, vehicle: 'mower', vehicleName: 'lawnmower', rate: 2, lb: 520,
      vals: { launcher: [1500, 1660, 1820, 1990, 2170, 2360], engine: [300, 390, 490, 600, 720, 850], frame: [0.9, 0.84, 0.78, 0.72, 0.67, 0.62], rocket: [1.0, 1.5, 2.0, 2.6, 3.2, 3.8] },
      base: { launcher: 400, engine: 500, frame: 600, rocket: 750 },
      // fractions of the gap, and lift in px/s^2 (gravity is 900): three thermals to ride and two sinks to get through
      zones: [[0.16, 0.24, 620], [0.33, 0.40, -480], [0.47, 0.56, 620], [0.64, 0.70, -480], [0.76, 0.85, 620]],
    },
  ];
  let level = 0;
  function setLevel(i) {
    level = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
    const L = LEVELS[level];
    W.GAP_FT = L.gapFt; W.GAP = Math.round(L.gapFt * W.PXFT); W.FAR = W.NEAR + W.GAP; W.LB = L.lb;
    W.ZONES = L.zones.map(([a, b, up]) => ({ x0: W.NEAR + a * W.GAP, x1: W.NEAR + b * W.GAP, up }));
    for (const k of ORDER) { UPGRADES[k].vals = L.vals[k]; UPGRADES[k].base = L.base[k]; }
    T.RATE = L.rate; T.PB_RATE = 2 * L.rate;
    return L;
  }

  // ---- Meter ----------------------------------------------------------
  // m in 0..1 along the bar. Green is the sweet spot; red is an over-wound spring.
  const GREEN0 = 0.716, GREEN1 = 0.869;
  function meterPower(m) {
    if (m > GREEN1) return 0.62;
    if (m >= GREEN0) return 1;
    return 0.5 + 0.42 * (m / GREEN0);
  }

  // ---- A run ----------------------------------------------------------
  function newRun(up, power) {
    const m = val('frame', up);
    return {
      mode: 'ground', t: 0, up, mass: m,
      x: W.START, y: W.COM_H, a: 0, w: 0,
      v: val('launcher', up) * power / Math.sqrt(m), vx: 0, vy: 0,
      fuel: val('rocket', up), boosting: false,
      rot: 0, maxRot: 0, flips: 0,
      maxAlt: 0, distPx: 0, rimDone: false, below: 0, zone: 0,
      done: false, outcome: null,
    };
  }

  function finish(s, outcome, distPx) {
    s.done = true; s.outcome = outcome;
    s.distPx = Math.max(0, distPx);
    s.distFt = Math.round(s.distPx / W.PXFT);
    if (outcome === 'wall') s.distFt = W.GAP_FT - 1;
    if (outcome === 'landed' || outcome === 'crashland') s.distFt = Math.max(W.GAP_FT, s.distFt);
  }

  function step(s, input, dt) {
    if (s.done) return;
    s.t += dt;
    if (s.mode === 'ground') {
      const th = slope(s.x);
      const acc = val('engine', s.up) / s.mass - W.G * Math.sin(th);
      s.v += acc * dt;
      if (s.v < 30) { finish(s, 'stall', 0); return; }
      s.x += s.v * Math.cos(th) * dt;
      // lean the scooter to the surface under both wheels
      const hb = rampH(s.x - W.HALF_WB), hf = rampH(Math.min(s.x + W.HALF_WB, W.RAMP_X1));
      s.a = Math.atan2(hf - hb, 2 * W.HALF_WB);
      s.y = rampH(s.x) + W.COM_H;
      if (s.x >= W.RAMP_X1) {
        s.mode = 'air';
        s.vx = s.v * Math.cos(th); s.vy = s.v * Math.sin(th);
        s.a = th; s.w = 0; s.takeoffV = s.v;
      }
      return;
    }
    // ---- air ----
    const sp = Math.hypot(s.vx, s.vy) || 1;
    const va = Math.atan2(s.vy, s.vx);
    const aoa = s.a - va;
    let ax = 0, ay = -W.G;
    // wings only work near the flight path: past 45 degrees the lift fades out, and a tumbling scooter is just a brick
    let wa = Math.atan2(Math.sin(aoa), Math.cos(aoa));
    const aw = Math.abs(wa);
    const liftK = aw < Math.PI / 4 ? Math.sin(2 * wa) : aw < Math.PI / 2 ? Math.sign(wa) * (1 - (aw - Math.PI / 4) / (Math.PI / 4)) : 0;
    const sa = Math.min(aw, Math.PI / 4);
    const drag = (T.CD + T.CDI * Math.sin(sa) * Math.sin(sa)) * sp;
    ax -= drag * s.vx; ay -= drag * s.vy;
    const lift = T.CL / s.mass * sp * sp * liftK;
    ax += -lift * Math.sin(va); ay += lift * Math.cos(va);
    s.boosting = !!(input.boost && s.fuel > 0);
    if (s.boosting) {
      s.fuel = Math.max(0, s.fuel - dt);
      ax += T.ROCKET_A * Math.cos(s.a); ay += T.ROCKET_A * Math.sin(s.a);
    }
    s.zone = 0;
    for (const z of W.ZONES) if (s.x > z.x0 && s.x < z.x1) { // the air eases in over the first and last 250 px of a zone
      ay += z.up * Math.min(1, Math.min(s.x - z.x0, z.x1 - s.x) / 250); s.zone = z.up > 0 ? 1 : -1;
    }
    s.vx += ax * dt; s.vy += ay * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    // a lighter frame spins up faster once a flip is under way; the first touch of the lean control is unchanged, so steering feels the same
    const tilt = input.tilt || 0;
    const commit = tilt * s.w > 0 ? Math.min(1, Math.abs(s.w) / 4) : 0;
    s.w += tilt * T.TORQUE * (1 + T.FRAME_SPIN * s.up.frame * commit) * dt;
    s.w *= Math.exp(-T.SPIN_DAMP * dt);
    s.a += s.w * dt; s.rot += s.w * dt;
    if (!s.rimDone) { // spins on the way down into the canyon don't count
      s.maxRot = Math.max(s.maxRot, Math.abs(s.rot));
      s.flips = Math.floor((s.maxRot + 0.35) / (2 * Math.PI));
    }
    s.maxAlt = Math.max(s.maxAlt, s.y);

    // distance is measured where the scooter drops back below rim height
    if (!s.rimDone && s.x > W.NEAR && s.vy < 0 && s.y - W.COM_H < 0) {
      s.rimDone = true; s.rimX = s.x;
    }
    // contact points: two wheels and the rider's head
    const c = Math.cos(s.a), sn = Math.sin(s.a);
    const pts = [[-W.HALF_WB, -W.COM_H], [W.HALF_WB, -W.COM_H], [10, 105]];
    let hit = -1;
    for (let i = 0; i < 3; i++) {
      const px = s.x + pts[i][0] * c - pts[i][1] * sn;
      const py = s.y + pts[i][0] * sn + pts[i][1] * c;
      if (px < W.NEAR && s.vy > 0) continue; // still climbing off the lip
      if (py < terrain(px) - 6) { hit = i; break; }
    }
    if (hit >= 0) {
      if (s.x < W.NEAR + 40) { finish(s, 'near', 0); return; }
      if (s.y - W.COM_H < W.LAND - 60) { finish(s, 'wall', W.GAP - 1); return; }
      let ang = s.a % (2 * Math.PI);
      if (ang > Math.PI) ang -= 2 * Math.PI; if (ang < -Math.PI) ang += 2 * Math.PI;
      finish(s, (hit < 2 && Math.abs(ang) < 0.6) ? 'landed' : 'crashland', s.x - W.NEAR);
      return;
    }
    if (s.rimDone && s.y - W.COM_H > 0 && s.x < W.FAR) { s.rimDone = false; s.below = 0; } // a thermal carried him back above the rim
    if (s.rimDone) {
      s.below += dt;
      if (s.x < W.FAR - 300 && (s.y < -1300 || s.below > 1.6)) finish(s, 'canyon', s.rimX - W.NEAR);
    }
  }

  // ---- Money ----------------------------------------------------------
  function payout(distFt, flips, bestFt) {
    const base = Math.round(distFt * T.RATE);
    const trick = Math.round(base * T.FLIP_MULT * flips);
    const pb = distFt > bestFt ? Math.round((distFt - bestFt) * T.PB_RATE) : 0;
    return { base, trick, pb, total: base + trick + pb };
  }

  return { W, LEVELS, setLevel, get level() { return level; }, UPGRADES, ORDER, MAX_LVL, cost, val, GREEN0, GREEN1, meterPower, newRun, step, terrain, rampH, slope, payout, T };
})();
if (typeof module !== 'undefined') module.exports = SRJ;
