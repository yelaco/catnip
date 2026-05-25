(function () {
  if (!window.Catnip) throw new Error('entities.js: window.Catnip missing — load constants.js first.');
  if (!window.Catnip.constants) throw new Error('entities.js: Catnip.constants missing — load constants.js before entities.js.');
  if (!window.Catnip.state) throw new Error('entities.js: Catnip.state missing — load state.js before entities.js.');

  const C = window.Catnip.constants;

  const HIT_COLORS = [
    '#ff4d4d','#ff9a3c','#ffe94d','#a3e635','#4ade80',
    '#22d3ee','#818cf8','#e879f9','#f472b6','#ffffff',
  ];

  function makeCat() {
    const angle = Math.random() * Math.PI * 2;
    const spd = C.CAT_INITIAL_SPEED;
    return {
      x: C.CAT_RADIUS + 10 + Math.random() * (C.W - 2 * (C.CAT_RADIUS + 10)),
      y: C.CAT_RADIUS + 10 + Math.random() * (C.H / 3 - 2 * (C.CAT_RADIUS + 10)),
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      speed: spd,
      r: C.CAT_RADIUS,
      initialSpeed: spd,
      speedTier: 0,
      activeAbility: null,
      abilityTimer: 0,
      abilityCooldowns: { shield: 0, clone: 0 },
      pendingAbility: null,
    };
  }

  // type: 'normal'|'explosive'|'multiball'|'magnet'
  // bounces = canonical field name (Beast flag 1)
  // shieldReflectCount per-ball (Beast flag 4)
  function makeBall(x, y, vx, vy, type) {
    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      type: type || 'normal',
      bounces: 0,
      trail: [],
      shieldReflectCount: 0,
    };
  }

  function makeBumper(x, y, motion) {
    return {
      x: x,
      y: y,
      r: C.BUMPER_RADIUS,
      hue: Math.floor(Math.random() * 360),
      pulsePhase: Math.random() * Math.PI * 2,
      hitFlash: 0,
      motion: motion || null,
    };
  }

  function makeParticle(x, y, vx, vy, r, color) {
    return {
      x: x, y: y,
      vx: vx, vy: vy,
      r: r,
      age: 0,
      lifetime: 28 + Math.floor(Math.random() * 20),
      color: color,
    };
  }

  function spawnHitParticles(x, y, state) {
    const run = state.run;
    const count = 18;
    for (let i = 0; i < count; i++) {
      // FIFO cull at pool max — Beast flag (particle pool)
      if (run.particles.length >= C.PARTICLE_POOL_MAX) {
        run.particles.shift();
      }
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.6 - 0.3);
      const speed = 80 + Math.random() * 140;
      run.particles.push(makeParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        4 + Math.random() * 5,
        HIT_COLORS[Math.floor(Math.random() * HIT_COLORS.length)]
      ));
    }
  }

  // Spawns bumpers from equipped arena's bumperLayout.
  // Placement: 500-attempt cap + zone-center fallback (Beast flag #6).
  // Cats pass through bumpers — no cat-bumper collision.
  function spawnBumpers(state) {
    state.run.bumpers = [];

    const arenaId = state.persistent.equipped.arenaId || 'arena-default';
    const catalog = window.Catnip.catalog;
    let arena = null;
    for (let i = 0; i < catalog.arenas.length; i++) {
      if (catalog.arenas[i].id === arenaId) { arena = catalog.arenas[i]; break; }
    }
    if (!arena || !arena.bumperLayout) return;

    const layout = arena.bumperLayout;
    const count = layout.count || 0;
    const movingCount = layout.movingCount || 0;
    const zones = layout.zones && layout.zones.length ? layout.zones : [{ x: 150, y: 100, w: 700, h: 500 }];
    const zone = zones[0];

    const placed = [];
    const MIN_SPACING = C.BUMPER_RADIUS * 4;   // 72px between bumpers
    const EXCL_R = 100;                          // exclusion around thrower
    const THROWER_X = C.THROWER_X;
    const THROWER_Y = C.THROWER_Y;
    const wI = C.WALL_THICKNESS / 2 + C.BUMPER_RADIUS + 4;

    function tooClose(x, y) {
      // Exclusion zone around thrower
      if (Math.hypot(x - THROWER_X, y - THROWER_Y) < EXCL_R) return true;
      // Min spacing between bumpers
      for (let k = 0; k < placed.length; k++) {
        if (Math.hypot(x - placed[k].x, y - placed[k].y) < MIN_SPACING) return true;
      }
      return false;
    }

    for (let i = 0; i < count; i++) {
      let px = zone.x + zone.w / 2;
      let py = zone.y + zone.h / 2;
      let found = false;
      for (let attempt = 0; attempt < 500; attempt++) {
        const cx = zone.x + Math.random() * zone.w;
        const cy = zone.y + Math.random() * zone.h;
        // Keep within wall bounds
        if (cx < wI || cx > C.W - wI || cy < wI || cy > C.H - wI) continue;
        if (!tooClose(cx, cy)) { px = cx; py = cy; found = true; break; }
      }
      // If 500 attempts exhausted, px/py is zone center (Beast flag #6 fallback)

      let motion = null;
      if (i < movingCount) {
        if (i % 2 === 0) {
          // linear — horizontal bounce at 60px/s
          motion = {
            type: 'linear',
            vx: 60,
            vy: 0,
            minX: zone.x + C.BUMPER_RADIUS,
            maxX: zone.x + zone.w - C.BUMPER_RADIUS,
            minY: zone.y + C.BUMPER_RADIUS,
            maxY: zone.y + zone.h - C.BUMPER_RADIUS,
          };
        } else {
          // orbit around zone center
          const cx = zone.x + zone.w / 2;
          const cy = zone.y + zone.h / 2;
          motion = {
            type: 'orbit',
            cx: cx,
            cy: cy,
            radius: 50,
            omega: 0.8,
            theta: Math.random() * Math.PI * 2,
          };
          px = cx + 50 * Math.cos(motion.theta);
          py = cy + 50 * Math.sin(motion.theta);
        }
      }

      const bumper = makeBumper(px, py, motion);
      placed.push({ x: px, y: py });
      state.run.bumpers.push(bumper);
    }
  }

  window.Catnip.entities = {
    makeCat: makeCat,
    makeBall: makeBall,
    makeBumper: makeBumper,
    makeParticle: makeParticle,
    spawnHitParticles: spawnHitParticles,
    spawnBumpers: spawnBumpers,
  };
}());
