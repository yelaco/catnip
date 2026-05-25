(function () {
  if (!window.Catnip) throw new Error('powerups.js: window.Catnip missing — load constants.js first.');
  if (!window.Catnip.constants) throw new Error('powerups.js: Catnip.constants missing — load constants.js before powerups.js.');
  if (!window.Catnip.state) throw new Error('powerups.js: Catnip.state missing — load state.js before powerups.js.');
  if (!window.Catnip.entities) throw new Error('powerups.js: Catnip.entities missing — load entities.js before powerups.js.');

  var C = window.Catnip.constants;

  var EXPLOSIVE_RADIUS = 80;
  var EXPLOSIVE_LIFETIME = 0.4; // seconds
  var MAGNET_ACCEL = 600;       // px/s²
  var MAGNET_MAX_SPEED = 900;   // px/s
  var MULTIBALL_SPREAD = Math.PI / 6; // 30° fan between children (±30°)

  function _rollType(state) {
    var lc = state.persistent.lifetimeCoins;
    var pool = [{ type: 'normal', w: 70 }];
    if (lc >= C.POWERUP_UNLOCK_EXPLOSIVE) pool.push({ type: 'explosive', w: 12 });
    if (lc >= C.POWERUP_UNLOCK_MULTIBALL) pool.push({ type: 'multiball', w: 10 });
    if (lc >= C.POWERUP_UNLOCK_MAGNET)    pool.push({ type: 'magnet', w: 8 });
    var total = pool.reduce(function (s, e) { return s + e.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r <= 0) return pool[i].type;
    }
    return 'normal';
  }

  // Populate powerupQueue with INITIAL_BALLS entries
  function rollQueue(state) {
    state.run.powerupQueue = [];
    for (var i = 0; i < C.INITIAL_BALLS; i++) {
      state.run.powerupQueue.push(_rollType(state));
    }
  }

  // Push `count` new entries onto queue tail (called on cat hit BALLS_PER_HIT refill)
  function refillQueue(state, count) {
    for (var i = 0; i < count; i++) {
      state.run.powerupQueue.push(_rollType(state));
    }
  }

  // Spawn explosion zone + 8 particles + audio (Beast flag 10: called before normal hits)
  function handleExplosive(ball, state) {
    if (!state.run.explosionZones) state.run.explosionZones = [];
    state.run.explosionZones.push({
      x: ball.x,
      y: ball.y,
      radius: EXPLOSIVE_RADIUS,
      age: 0,
      lifetime: EXPLOSIVE_LIFETIME,
    });

    var run = state.run;
    var ents = window.Catnip.entities;
    if (ents) {
      for (var p = 0; p < 8; p++) {
        if (run.particles.length >= C.PARTICLE_POOL_MAX) run.particles.shift();
        var angle = (Math.PI * 2 * p) / 8;
        var speed = 120 + Math.random() * 100;
        run.particles.push(ents.makeParticle(
          ball.x, ball.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          5 + Math.random() * 4,
          '#ff6600'
        ));
      }
    }

    run.screenShake = Math.max(run.screenShake || 0, 12);
    run.pendingAudio.push('powerup');
  }

  // Spawn 3 child balls fanned ±30° apart
  function handleMultiball(ball, state) {
    var run = state.run;
    var speed = Math.hypot(ball.vx, ball.vy);
    if (speed === 0) speed = 240;
    var baseAngle = Math.atan2(ball.vy, ball.vx);
    var offsets = [-MULTIBALL_SPREAD, 0, MULTIBALL_SPREAD];
    for (var i = 0; i < offsets.length; i++) {
      var angle = baseAngle + offsets[i];
      run.activeBalls.push({
        x: ball.x, y: ball.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        bounces: 0, type: 'normal', trail: [], shieldReflectCount: 0,
      });
    }
    run.pendingAudio.push('powerup');
    ball._multiballSpawned = true;
  }

  // Steer magnet ball toward cat — acceleration 600 px/s², clamp 900 px/s; convert after 1 bounce
  function applyMagnetSteering(ball, cat, dt) {
    if (ball.bounces >= 1) { ball.type = 'normal'; return; }
    var dx = cat.x - ball.x;
    var dy = cat.y - ball.y;
    var dist = Math.hypot(dx, dy);
    if (dist > 0) {
      ball.vx += (dx / dist) * MAGNET_ACCEL * dt;
      ball.vy += (dy / dist) * MAGNET_ACCEL * dt;
      var spd = Math.hypot(ball.vx, ball.vy);
      if (spd > MAGNET_MAX_SPEED) {
        ball.vx = (ball.vx / spd) * MAGNET_MAX_SPEED;
        ball.vy = (ball.vy / spd) * MAGNET_MAX_SPEED;
      }
    }
  }

  // Tick explosion zones; test cat overlap; award score+coins via per-frame cap
  function updateExplosionZones(state, dt) {
    if (!state.run.explosionZones) return;
    var run = state.run;
    var cat = run.cat;
    for (var i = run.explosionZones.length - 1; i >= 0; i--) {
      var z = run.explosionZones[i];
      z.age += dt;
      if (z.age >= z.lifetime) { run.explosionZones.splice(i, 1); continue; }
      var catShielded = cat && cat.activeAbility === 'shield';
      if (!run.catHitThisFrame && cat && !catShielded) {
        var dx = cat.x - z.x;
        var dy = cat.y - z.y;
        if (Math.hypot(dx, dy) < z.radius + cat.r) {
          run.catHitThisFrame = true;
          run.score += 1;
          var _cb = (window.Catnip.abilities && window.Catnip.abilities.getCoinBonus)
            ? window.Catnip.abilities.getCoinBonus(state) : 0;
          state.persistent.coins += 2 + _cb;
          state.persistent.lifetimeCoins += 2 + _cb;
          if (window.Catnip.store) window.Catnip.store.saveState();
        }
      }
    }
  }

  window.Catnip.powerups = {
    rollQueue: rollQueue,
    refillQueue: refillQueue,
    handleExplosive: handleExplosive,
    handleMultiball: handleMultiball,
    applyMagnetSteering: applyMagnetSteering,
    updateExplosionZones: updateExplosionZones,
  };
}());
