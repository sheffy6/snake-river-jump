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
    RIVER: -1250,      // the river at the bottom of the canyon: every jump that falls short ends here
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
  // Ground height at x. Over the canyon that is the surface of the river.
  function terrain(x) {
    if (x <= W.RAMP_X1) return rampH(x);
    if (x < W.NEAR) return W.RAMP_H * (1 - (x - W.RAMP_X1) / (W.NEAR - W.RAMP_X1));
    if (x < W.FAR) return W.RIVER;
    return W.LAND;
  }
  function slope(x) {
    x = Math.min(x, W.RAMP_X1 - 4); // never sample past the lip, or the last few pixels read as a flatter ramp
    return Math.atan2(rampH(x + 4) - rampH(x - 4), 8);
  }

  // ---- Upgrades -------------------------------------------------------
  const UPGRADES = {
    launcher: {
      name: 'Launcher spring', blurb: 'A bigger boing off the line',
      vals: [1000, 1160, 1336, 1528, 1736, 1960], unit: v => Math.round(v / W.PXFT * 0.68) + ' mph',
      base: 160, growth: 2.4,
    },
    engine: {
      name: 'Engine', blurb: 'More shove on the run-up',
      vals: [96, 176, 264, 360, 464, 576], unit: v => Math.round(v / 16) + ' hp',
      base: 200, growth: 2.4,
    },
    frame: {
      name: 'Lighter frame', blurb: 'Less scooter to haul: faster, floatier, flippier',
      vals: [1, 0.92, 0.85, 0.78, 0.72, 0.66], unit: v => Math.round(v * W.LB) + ' lb',
      base: 240, growth: 2.4,
    },
    rocket: {
      name: 'Rocket', blurb: 'Hold boost in the air and hang on',
      vals: [0, 0.8, 1.4, 2.0, 2.7, 3.5], unit: v => (v ? v.toFixed(1) + ' s of fuel' : 'none'),
      base: 300, growth: 2.4,
    },
  };
  const ORDER = ['launcher', 'engine', 'frame', 'rocket'];
  const FRAME0 = { name: UPGRADES.frame.name, blurb: UPGRADES.frame.blurb, unit: UPGRADES.frame.unit };
  const MAX_LVL = 5;
  const cost = (k, lvl) => Math.round(UPGRADES[k].base * Math.pow(UPGRADES[k].growth, lvl) / 5) * 5;
  const val = (k, up) => UPGRADES[k].vals[up[k]];

  // ---- Levels --------------------------------------------------------
  // Each canyon has its own gap, vehicle, pay rate and par (jumps to cross for a gold and a silver medal). A new vehicle starts the shop again from a higher floor.
  const T = { CD: 1.5e-5, CL: 1.8e-5, CDI: 2e-5, ROCKET_A: 800, TORQUE: 16, SPIN_DAMP: 2.2, RATE: 1, FLIP_MULT: 0.5, FLIP_STEP: 0.1, FLIP_MIN: 0.1, CLEAN: 0.7, PB_RATE: 2, FRAME_SPIN: 0.2, NOSE: 7, NOSE_AT: -0.55 };
  const LEVELS = [
    {
      id: 'snake', name: 'Snake River Canyon', place: 'Twin Falls, Idaho', gapFt: 1600, vehicle: 'scooter', vehicleName: 'scooter', rate: 1, lb: 240,
      vals: { launcher: [1000, 1160, 1336, 1528, 1736, 1960], engine: [96, 176, 264, 360, 464, 576], frame: [1, 0.92, 0.85, 0.78, 0.72, 0.66], rocket: [0, 0.8, 1.4, 2.0, 2.7, 3.5] },
      base: { launcher: 160, engine: 200, frame: 240, rocket: 300 }, zones: [], par: [20, 27],
    },
    {
      id: 'hells', name: 'Hells Canyon', place: 'Idaho and Oregon', gapFt: 2800, vehicle: 'mower', vehicleName: 'lawnmower', rate: 2, lb: 520,
      mass: 0.9,   // fixed: on the mower the third upgrade is wings, not weight
      wings: { name: 'Wings', blurb: 'Lawnmowers can fly. Nose up to glide, too far up and it stalls' },
      vals: { launcher: [1500, 1660, 1820, 1990, 2170, 2360], engine: [300, 390, 490, 600, 720, 850], frame: [1, 1.5, 2, 2.5, 3, 3.5], rocket: [1.0, 1.5, 2.0, 2.6, 3.2, 3.8] },
      base: { launcher: 800, engine: 1000, frame: 1200, rocket: 1500 }, zones: [], par: [26, 33],
    },
  ];
  let level = 0;
  function setLevel(i) {
    level = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
    const L = LEVELS[level];
    W.GAP_FT = L.gapFt; W.GAP = Math.round(L.gapFt * W.PXFT); W.FAR = W.NEAR + W.GAP; W.LB = L.lb;
    W.ZONES = L.zones.map(([a, b, up]) => ({ x0: W.NEAR + a * W.GAP, x1: W.NEAR + b * W.GAP, up }));
    for (const k of ORDER) { UPGRADES[k].vals = L.vals[k]; UPGRADES[k].base = L.base[k]; }
    const f = UPGRADES.frame;
    if (L.wings) { f.name = L.wings.name; f.blurb = L.wings.blurb; f.unit = v => (v > 1 ? Math.round((v - 1) * 8) + ' ft span' : 'none'); }
    else { f.name = FRAME0.name; f.blurb = FRAME0.blurb; f.unit = FRAME0.unit; }
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
    const L = LEVELS[level], winged = !!L.wings;
    const m = winged ? L.mass : val('frame', up), wing = winged ? val('frame', up) : 1;
    return {
      mode: 'ground', t: 0, up, mass: m,
      wing,                                             // lift multiplier
      heavy: winged ? (wing - 1) / 2.5 : 0,             // 0 with no wings, 1 with the biggest: how hard the nose drops
      spinLvl: winged ? 0 : up.frame, stall: false,
      x: W.START, y: W.COM_H, a: 0, w: 0,
      v: val('launcher', up) * power / Math.sqrt(m), vx: 0, vy: 0,
      fuel: val('rocket', up), boosting: false,
      rot: 0, maxRot: 0, flips: 0, clean: false, airT: 0, boosted: false,
      maxAlt: 0, distPx: 0, rimDone: false, below: 0, zone: 0,
      done: false, outcome: null,
    };
  }

  function finish(s, outcome, distPx) {
    s.done = true; s.outcome = outcome;
    s.distPx = Math.max(0, distPx);
    s.distFt = Math.round(s.distPx / W.PXFT);
    if (outcome === 'wall') s.distFt = Math.min(s.distFt, W.GAP_FT - 1);
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
    s.airT += dt;
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
    const lift = T.CL * s.wing / s.mass * sp * sp * liftK;
    s.stall = s.wing > 1 && aw > 0.9 && aw < 2.2 && sp > 350;
    ax += -lift * Math.sin(va); ay += lift * Math.cos(va);
    s.boosting = !!(input.boost && s.fuel > 0);
    if (s.boosting) {
      s.fuel = Math.max(0, s.fuel - dt); s.boosted = true;
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
    s.w += tilt * T.TORQUE * (1 + T.FRAME_SPIN * s.spinLvl * commit) * dt;
    // wings make it nose-heavy: left alone it swings to point below its flight path and dives
    if (s.heavy) s.w += T.NOSE * s.heavy * Math.sin(va + T.NOSE_AT - s.a) * dt;
    s.w *= Math.exp(-T.SPIN_DAMP * dt);
    s.a += s.w * dt; s.rot += s.w * dt;
    // flips count all the way down, but they are only paid if he ends the jump the right way up (see finish)
    s.maxRot = Math.max(s.maxRot, Math.abs(s.rot));
    s.flips = Math.floor((s.maxRot + 0.35) / (2 * Math.PI));
    s.maxAlt = Math.max(s.maxAlt, s.y);

    // distance is measured where the scooter drops back below rim height
    if (!s.rimDone && s.x > W.NEAR && s.vy < 0 && s.y - W.COM_H < 0) {
      s.rimDone = true; s.rimX = s.x;
    }
    // contact points: two wheels and the rider's head
    const c = Math.cos(s.a), sn = Math.sin(s.a);
    const pts = [[-W.HALF_WB, -W.COM_H], [W.HALF_WB, -W.COM_H], [10, 105]];
    let hit = -1, wet = false;
    for (let i = 0; i < 3; i++) {
      const px = s.x + pts[i][0] * c - pts[i][1] * sn;
      const py = s.y + pts[i][0] * sn + pts[i][1] * c;
      if (px < W.NEAR && s.vy > 0) continue; // still climbing off the lip
      if (py < terrain(px) - 6) { hit = i; wet = px >= W.NEAR && px < W.FAR; break; }
    }
    if (hit >= 0) {
      let ang = s.a % (2 * Math.PI);
      if (ang > Math.PI) ang -= 2 * Math.PI; if (ang < -Math.PI) ang += 2 * Math.PI;
      if (wet) { // into the river: wheels first and roughly upright is a clean splash, anything else is a belly flop
        s.clean = hit < 2 && Math.abs(ang) < T.CLEAN;
        finish(s, 'canyon', (s.rimDone ? s.rimX : s.x) - W.NEAR); return;
      }
      if (s.x < W.NEAR + 40) { finish(s, 'near', 0); return; }
      if (s.y - W.COM_H < W.LAND - 60) { finish(s, 'wall', s.rimDone ? s.rimX - W.NEAR : W.GAP - 1); return; }
      s.clean = hit < 2 && Math.abs(ang) < 0.6;
      finish(s, s.clean ? 'landed' : 'crashland', s.x - W.NEAR);
      return;
    }
    if (s.rimDone && s.y - W.COM_H > 0 && s.x < W.FAR) { s.rimDone = false; s.below = 0; } // a thermal carried him back above the rim
    if (s.rimDone) s.below += dt;
  }

  // ---- Money ----------------------------------------------------------
  // Each flip is worth a little less than the one before: 50%, 40%, 30%, 20%, then 10% each.
  function flipBonus(n) { let b = 0; for (let i = 0; i < n; i++) b += Math.max(T.FLIP_MIN, T.FLIP_MULT - T.FLIP_STEP * i); return b; }
  // flips here means flips that were banked: pass 0 if he did not end the jump upright
  function payout(distFt, flips, bestFt) {
    const base = Math.round(distFt * T.RATE);
    const trick = Math.round(base * flipBonus(flips));
    const pb = distFt > bestFt ? Math.round((distFt - bestFt) * T.PB_RATE) : 0;
    return { base, trick, pb, total: base + trick + pb };
  }

  // ---- Sponsor contracts ---------------------------------------------
  // Two are always on offer: slot 0 asks for a bigger jump, slot 1 for style. Meeting one pays a bonus and brings the next.
  // st holds this canyon's records: best (ft), alt (ft above the rim), air (s), dry (ft without the rocket), fl (most flips banked).
  const up10 = v => Math.ceil(v / 10) * 10, r5 = v => Math.max(5, Math.round(v / 5) * 5);
  const altFt = s => Math.max(0, Math.round((s.maxAlt - W.COM_H) / W.PXFT));
  const CON_LIFE = 5;
  function makeContract(slot, n, st, up) {
    const unit = T.RATE * Math.max(80, st.best), c = { slot, left: CON_LIFE };
    if (slot === 0) {
      const kind = ['dist', 'alt', 'air', 'dry'][n % 4];
      if (kind === 'alt') { c.type = 'alt'; c.t = up10(st.alt * 1.1 + 15); c.pay = r5(unit * 0.4); }
      else if (kind === 'air') { c.type = 'air'; c.t = Math.ceil((st.air * 1.06 + 0.3) * 2) / 2; c.pay = r5(unit * 0.4); }
      else if (kind === 'dry' && up.rocket > 0) { c.type = 'dry'; c.t = Math.min(W.GAP_FT, up10(st.dry * 1.1 + 20)); c.pay = r5(unit * 0.6); }
      else { c.type = 'dist'; c.t = Math.min(W.GAP_FT, up10(st.best * 1.12 + 30)); c.pay = r5(unit * 0.5); }
    } else if (n % 2 === 1 && st.fl > 0 && st.best > 150) {
      c.type = 'farflip'; c.n = Math.max(1, st.fl - 1); c.t = Math.min(W.GAP_FT, up10(st.best * 0.8)); c.pay = r5(unit * (0.35 + 0.15 * c.n));
    } else { c.type = 'flips'; c.t = Math.min(9, st.fl + 1); c.pay = r5(unit * (0.2 + 0.2 * c.t)); }
    return c;
  }
  function contractMet(c, s) {
    const d = s.distFt;
    switch (c.type) {
      case 'dist': return d >= c.t;
      case 'alt': return altFt(s) >= c.t;
      case 'air': return s.airT >= c.t;
      case 'dry': return !s.boosted && d >= c.t;
      case 'flips': return s.clean && s.flips >= c.t;
      case 'farflip': return s.clean && s.flips >= c.n && d >= c.t;
    }
    return false;
  }
  const ft = v => v.toLocaleString('en-US') + ' ft', fl = n => (n === 1 ? '1 flip' : n + ' flips');
  function contractText(c) {
    switch (c.type) {
      case 'dist': return c.t >= W.GAP_FT ? 'Reach the far side' : 'Jump past ' + ft(c.t);
      case 'alt': return 'Climb ' + ft(c.t) + ' above the rim';
      case 'air': return 'Hang in the air ' + c.t.toFixed(1) + ' s';
      case 'dry': return ft(c.t) + ', no rocket';
      case 'flips': return fl(c.t) + ', landed upright';
      case 'farflip': return fl(c.n) + ' landed upright past ' + ft(c.t);
    }
    return '';
  }
  const medal = (lvl, jumps) => { const p = LEVELS[lvl].par; return jumps <= p[0] ? 'Gold' : jumps <= p[1] ? 'Silver' : 'Bronze'; };
  const helmets = (lvl, jumps) => { const p = LEVELS[lvl].par; return jumps <= p[0] ? 3 : jumps <= p[1] ? 2 : 1; }; // the rating for a crossing: three helmets is the best
  const newStats = () => ({ best: 0, alt: 0, air: 0, dry: 0, fl: 0 });
  const newContracts = (st, up) => ({ n: [0, 0], list: [makeContract(0, 0, st, up), makeContract(1, 0, st, up)] });
  // After a run: pay the contracts it met, retire the ones that have been on offer too long, update the records, deal replacements.
  function settleContracts(con, st, s, up) {
    const paid = [], swap = [];
    con.list.forEach((c, i) => { if (contractMet(c, s)) { paid.push(c); swap.push(i); } else if (--c.left <= 0) swap.push(i); });
    record(st, s);
    for (const i of swap) con.list[i] = makeContract(i, ++con.n[i], st, up);
    return paid;
  }
  // Fold a finished run into the records the contracts are built from.
  function record(st, s) {
    st.best = Math.max(st.best, s.distFt);
    st.alt = Math.max(st.alt, altFt(s)); st.air = Math.max(st.air, Math.round(s.airT * 10) / 10);
    if (!s.boosted) st.dry = Math.max(st.dry, s.distFt);
    if (s.clean) st.fl = Math.max(st.fl, s.flips);
  }

  return { medal, helmets, flipBonus, newStats, newContracts, settleContracts, makeContract, contractMet, contractText, record, altFt, CON_LIFE, W, LEVELS, setLevel, get level() { return level; }, UPGRADES, ORDER, MAX_LVL, cost, val, GREEN0, GREEN1, meterPower, newRun, step, terrain, rampH, slope, payout, T };
})();
if (typeof module !== 'undefined') module.exports = SRJ;
