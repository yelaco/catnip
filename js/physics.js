(function () {
  if (!window.Catnip) throw new Error('physics.js: window.Catnip missing — load constants.js first.');
  if (!window.Catnip.constants) throw new Error('physics.js: Catnip.constants missing — load constants.js before physics.js.');
  if (!window.Catnip.state) throw new Error('physics.js: Catnip.state missing — load state.js before physics.js.');
  if (!window.Catnip.entities) throw new Error('physics.js: Catnip.entities missing — load entities.js before physics.js.');

  const C = window.Catnip.constants;

  function updateCat(cat, state, dt) {
    cat.x += cat.vx * dt;
    cat.y += cat.vy * dt;

    const wI = C.WALL_THICKNESS / 2;
    if (cat.x - cat.r < wI)         { cat.vx =  Math.abs(cat.vx); cat.x = wI + cat.r; }
    if (cat.x + cat.r > C.W - wI)   { cat.vx = -Math.abs(cat.vx); cat.x = C.W - wI - cat.r; }
    if (cat.y - cat.r < wI)         { cat.vy =  Math.abs(cat.vy); cat.y = wI + cat.r; }
    if (cat.y + cat.r > C.H - wI)   { cat.vy = -Math.abs(cat.vy); cat.y = C.H - wI - cat.r; }

    state.run.catHitFlash = Math.max(0, state.run.catHitFlash - dt);
  }

  // No direct audio calls — queues events into pendingAudio (Beast flag, Task #4 spec)
  function stepBall(b, state, dt) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    let bounced = false;
    const wJ = C.WALL_THICKNESS / 2;

    if (b.x - C.BALL_RADIUS < wJ) {
      b.vx = Math.abs(b.vx);
      b.x = wJ + C.BALL_RADIUS;
      b.bounces++;
      bounced = true;
    } else if (b.x + C.BALL_RADIUS > C.W - wJ) {
      b.vx = -Math.abs(b.vx);
      b.x = C.W - wJ - C.BALL_RADIUS;
      b.bounces++;
      bounced = true;
    }

    if (b.y - C.BALL_RADIUS < wJ) {
      b.vy = Math.abs(b.vy);
      b.y = wJ + C.BALL_RADIUS;
      if (!bounced) b.bounces++;
      bounced = true;
    } else if (b.y + C.BALL_RADIUS > C.H - wJ) {
      b.vy = -Math.abs(b.vy);
      b.y = C.H - wJ - C.BALL_RADIUS;
      if (!bounced) b.bounces++;
      bounced = true;
    }

    if (bounced) {
      // Queue audio — no direct call (pendingAudio pattern)
      state.run.pendingAudio.push('bounce');

      const _spd = Math.hypot(b.vx, b.vy);
      if (_spd > 0) {
        const _factor = b.bounces <= 3 ? C.BALL_DECAY_EARLY : C.BALL_DECAY_LATE;
        b.vx = (b.vx / _spd) * _spd * _factor;
        b.vy = (b.vy / _spd) * _spd * _factor;
      }
    }
  }

  function updateBalls(state, dt) {
    const run = state.run;
    const pw = window.Catnip.powerups;
    run.activeBalls = run.activeBalls.filter(b => Math.hypot(b.vx, b.vy) >= C.BALL_MIN_SPEED);

    const toExplode = [];
    const toMultiball = [];

    for (const b of run.activeBalls) {
      // Ring-buffer trail — capped at TRAIL_RING_LENGTH (Beast perf flag)
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > C.TRAIL_RING_LENGTH) b.trail.shift();

      // Magnet steering before movement
      if (b.type === 'magnet' && pw && run.cat) {
        pw.applyMagnetSteering(b, run.cat, dt);
      }

      const prevBounces = b.bounces;
      const speed = Math.hypot(b.vx, b.vy);
      const displacement = speed * dt;
      const steps = displacement > C.BALL_RADIUS ? 2 : 1;
      const subDt = dt / steps;
      for (let s = 0; s < steps; s++) {
        if (Math.hypot(b.vx, b.vy) < C.BALL_MIN_SPEED) break;
        stepBall(b, state, subDt);
      }

      // Explosive detonates after 3 wall bounces (or on cat hit in checkCollisions)
      if (b.type === 'explosive' && b.bounces >= 3 && prevBounces < 3 && !b._exploded) {
        b._exploded = true;
        toExplode.push(b);
      }

      // Multiball splits at first wall bounce; parent despawned, 3 children spawned
      if (b.type === 'multiball' && b.bounces === 1 && prevBounces < 1 && !b._multiballSpawned) {
        toMultiball.push(b);
      }

      // Magnet converts to normal after 1 wall bounce (handled in applyMagnetSteering)
    }

    // Trigger detonation for bounce-expired explosives (no cat overlap — visual only)
    for (const b of toExplode) {
      if (pw) pw.handleExplosive(b, state);
    }

    // Split multiball parents at first wall bounce
    for (const b of toMultiball) {
      if (pw) pw.handleMultiball(b, state);
    }

    run.activeBalls = run.activeBalls.filter(b => {
      if (b._exploded) return false;
      if (b.type === 'multiball' && b._multiballSpawned) return false;
      return Math.hypot(b.vx, b.vy) >= C.BALL_MIN_SPEED;
    });
  }

  // catHitThisFrame reset happens at TOP of frame() before this is called (Beast flag 2)
  // Explosive detonations processed first for tie-break priority (Beast flag 10)
  function checkCollisions(state) {
    const run = state.run;
    const cat = run.cat;
    const pw = window.Catnip.powerups;
    const toRemove = [];
    const shielded = cat.activeAbility === 'shield';
    // Snapshot length so newly-spawned multiball children aren't tested this frame
    const ballCount = run.activeBalls.length;

    for (let i = 0; i < ballCount; i++) {
      const b = run.activeBalls[i];
      const dx = b.x - cat.x;
      const dy = b.y - cat.y;
      const dist2 = dx * dx + dy * dy;
      const radSum = cat.r + C.BALL_RADIUS;
      if (dist2 > radSum * radSum) continue;

      // ── SHIELD active ─────────────────────────────────────────────────────────
      if (shielded) {
        if (b.type === 'explosive') {
          // Detonate visually but skip radial test against shielded cat (no score/coin)
          if (pw) pw.handleExplosive(b, state);
          toRemove.push(i);
          continue;
        }

        // Reflect ball off shield: v' = v - 2*(v·n)*n
        const dist = Math.sqrt(dist2) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = b.vx * nx + b.vy * ny;
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
        // Eject ball to prevent sticking
        b.x = cat.x + nx * (radSum + 0.5);
        b.y = cat.y + ny * (radSum + 0.5);
        b.bounces++;

        // Per-ball sentinel: force despawn after 3 shield reflections this window
        b.shieldReflectCount = (b.shieldReflectCount || 0) + 1;
        if (b.shieldReflectCount >= 3) {
          toRemove.push(i);
        }
        // No score, no coin during shield
        continue;
      }

      // ── NORMAL collision ───────────────────────────────────────────────────────
      toRemove.push(i);

      if (b.type === 'explosive') {
        // Explosive: detonate on cat contact — zone overlap awards score/coin (Beast flag 10)
        if (!b._exploded) { b._exploded = true; if (pw) pw.handleExplosive(b, state); }
        continue;
      }

      // multiball parent reaching cat without bouncing → treat as normal ball
      // (split into 3 children happens at first wall bounce in updateBalls)

      // Per-frame cap: only one hit awards score/coin per frame (Beast flag 2)
      if (!run.catHitThisFrame) {
        run.catHitThisFrame = true;
        const earned = 1 + b.bounces;
        run.score += earned;
        run.ballsRemaining += C.BALLS_PER_HIT;

        // Coin award: +1 base + artifact bonus (getCoinBonus)
        const coinBonus = window.Catnip.abilities ? window.Catnip.abilities.getCoinBonus(state) : 0;
        const coinsEarned = 1 + coinBonus;
        state.persistent.coins += coinsEarned;
        state.persistent.lifetimeCoins += coinsEarned;
        if (window.Catnip.store) window.Catnip.store.saveState();
        // Refill powerup queue with BALLS_PER_HIT new types
        if (pw) pw.refillQueue(state, C.BALLS_PER_HIT);
        run.catHitFlash = 0.3;
        run.screenShake = 8;

        // Queue audio — no direct call
        run.pendingAudio.push('cat_hit:' + b.bounces);

        window.Catnip.entities.spawnHitParticles(cat.x, cat.y, state);

        // Speed up cat
        cat.speed = Math.min(cat.speed * C.CAT_SPEED_MULTIPLIER, C.CAT_MAX_SPEED);
        const curSpeed = Math.hypot(cat.vx, cat.vy);
        if (curSpeed > 0) {
          cat.vx = (cat.vx / curSpeed) * cat.speed;
          cat.vy = (cat.vy / curSpeed) * cat.speed;
        }

        // Combo popup
        if (b.bounces > 0) {
          const wallWord = b.bounces === 1 ? 'WALL' : 'WALLS';
          run.comboPopups.push({
            text: b.bounces + '\xD7 ' + wallWord + '!',
            subtext: '+' + earned,
            x: b.x,
            y: b.y - 20,
            age: 0,
            lifetime: 100,
            bounces: b.bounces,
          });
        }
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      run.activeBalls.splice(toRemove[i], 1);
    }

    // Real cat hit clears all clones
    if (run.catHitThisFrame) {
      state.run.clones = [];
    }

    // Clone-ball collision — removes clone and ball, no score, no coins
    const clones = run.clones;
    if (clones && clones.length > 0) {
      const cloneToRemove = [];
      const ballToRemove = [];
      for (let ci = 0; ci < clones.length; ci++) {
        const clone = clones[ci];
        for (let bi = 0; bi < run.activeBalls.length; bi++) {
          const b = run.activeBalls[bi];
          const dx2 = b.x - clone.x;
          const dy2 = b.y - clone.y;
          const radSum2 = clone.r + C.BALL_RADIUS;
          if (dx2 * dx2 + dy2 * dy2 <= radSum2 * radSum2) {
            if (cloneToRemove.indexOf(ci) === -1) cloneToRemove.push(ci);
            if (ballToRemove.indexOf(bi) === -1) ballToRemove.push(bi);
          }
        }
      }
      for (let ci2 = cloneToRemove.length - 1; ci2 >= 0; ci2--) clones.splice(cloneToRemove[ci2], 1);
      for (let bi2 = ballToRemove.length - 1; bi2 >= 0; bi2--) run.activeBalls.splice(ballToRemove[bi2], 1);
    }

    // Ball-ball collision — both balls disappear, no score, no coins
    const balls = run.activeBalls;
    const bbRemove = [];
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const bdx = balls[i].x - balls[j].x;
        const bdy = balls[i].y - balls[j].y;
        if (bdx * bdx + bdy * bdy <= (C.BALL_RADIUS * 2) * (C.BALL_RADIUS * 2)) {
          if (bbRemove.indexOf(i) === -1) bbRemove.push(i);
          if (bbRemove.indexOf(j) === -1) bbRemove.push(j);
        }
      }
    }
    for (let ri = bbRemove.length - 1; ri >= 0; ri--) balls.splice(bbRemove[ri], 1);
  }

  function updateClones(state, dt) {
    const clones = state.run.clones;
    if (!clones) return;
    const wI = C.WALL_THICKNESS / 2 + C.CAT_RADIUS;
    const toSpawn = [];
    for (let i = clones.length - 1; i >= 0; i--) {
      const cl = clones[i];
      cl.x += cl.vx * dt;
      cl.y += cl.vy * dt;
      if (cl.x < wI)         { cl.x = wI;         cl.vx =  Math.abs(cl.vx); }
      if (cl.x > C.W - wI)   { cl.x = C.W - wI;   cl.vx = -Math.abs(cl.vx); }
      if (cl.y < wI)         { cl.y = wI;         cl.vy =  Math.abs(cl.vy); }
      if (cl.y > C.H - wI)   { cl.y = C.H - wI;   cl.vy = -Math.abs(cl.vy); }
      cl.age += dt;
      if (cl.age >= cl.lifetime) { clones.splice(i, 1); continue; }
      cl.spawnTimer -= dt;
      if (cl.spawnTimer <= 0) {
        cl.spawnTimer = C.CLONE_SPAWN_INTERVAL;
        if (clones.length + toSpawn.length < C.CLONE_MAX_COUNT) {
          const th = Math.random() * Math.PI * 2;
          toSpawn.push({
            x: cl.x, y: cl.y, r: cl.r,
            vx: C.CLONE_SPEED * Math.cos(th),
            vy: C.CLONE_SPEED * Math.sin(th),
            age: 0, lifetime: cl.lifetime,
            spawnTimer: C.CLONE_SPAWN_INTERVAL,
          });
        }
      }
    }
    for (let j = 0; j < toSpawn.length; j++) clones.push(toSpawn[j]);
  }

  function updateComboPopups(state, dt) {
    const popups = state.run.comboPopups;
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.age++;
      p.y -= 1.8;
      if (p.age >= p.lifetime) popups.splice(i, 1);
    }
  }

  function updateParticles(state, dt) {
    const particles = state.run.particles;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age++;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      if (p.age >= p.lifetime) particles.splice(i, 1);
    }
  }

  function updateBumperPhysics(state, dt) {
    const run = state.run;
    const bumpers = run.bumpers;
    const BALL_MAX_SPEED_BUMPER = 1000;

    for (let bi = 0; bi < bumpers.length; bi++) {
      const bump = bumpers[bi];

      // Tick hitFlash (ms countdown)
      if (bump.hitFlash > 0) bump.hitFlash = Math.max(0, bump.hitFlash - dt * 1000);

      // Move bumper
      if (bump.motion) {
        if (bump.motion.type === 'linear') {
          const m = bump.motion;
          bump.x += m.vx * dt;
          bump.y += m.vy * dt;
          if (bump.x <= m.minX) { bump.x = m.minX; m.vx = Math.abs(m.vx); }
          if (bump.x >= m.maxX) { bump.x = m.maxX; m.vx = -Math.abs(m.vx); }
          if (bump.y <= m.minY) { bump.y = m.minY; m.vy = Math.abs(m.vy); }
          if (bump.y >= m.maxY) { bump.y = m.maxY; m.vy = -Math.abs(m.vy); }
        } else if (bump.motion.type === 'orbit') {
          const m = bump.motion;
          m.theta += m.omega * dt;
          bump.x = m.cx + m.radius * Math.cos(m.theta);
          bump.y = m.cy + m.radius * Math.sin(m.theta);
        }
      }

      // Ball-bumper collision
      for (let i = 0; i < run.activeBalls.length; i++) {
        const b = run.activeBalls[i];
        const dx = b.x - bump.x;
        const dy = b.y - bump.y;
        const dist2 = dx * dx + dy * dy;
        const minDist = C.BALL_RADIUS + bump.r;
        if (dist2 >= minDist * minDist) continue;

        const dist = Math.sqrt(dist2) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        // Eject ball 0.5px along normal to prevent sticking
        b.x = bump.x + nx * (minDist + 0.5);
        b.y = bump.y + ny * (minDist + 0.5);

        // Reflect: v' = v - 2*(v·n)*n, scaled by 1.05
        const dot = b.vx * nx + b.vy * ny;
        b.vx = (b.vx - 2 * dot * nx) * 1.05;
        b.vy = (b.vy - 2 * dot * ny) * 1.05;

        // Clamp to max speed
        const spd = Math.hypot(b.vx, b.vy);
        if (spd > BALL_MAX_SPEED_BUMPER) {
          b.vx = (b.vx / spd) * BALL_MAX_SPEED_BUMPER;
          b.vy = (b.vy / spd) * BALL_MAX_SPEED_BUMPER;
        }

        b.bounces++;
        bump.hitFlash = 150;
        run.pendingAudio.push('bumperHit');

        // 4 burst particles
        if (window.Catnip.entities) {
          const ents = window.Catnip.entities;
          for (let p = 0; p < 4; p++) {
            if (run.particles.length >= C.PARTICLE_POOL_MAX) run.particles.shift();
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 80;
            run.particles.push(ents.makeParticle(
              b.x, b.y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              3 + Math.random() * 3,
              `hsl(${bump.hue},90%,65%)`
            ));
          }
        }

        // +1 coin per bumper hit
        state.persistent.coins += 1;
        state.persistent.lifetimeCoins += 1;
        if (window.Catnip.store) window.Catnip.store.saveState();
      }
    }
  }

  function computeTrajectory(startX, startY, vx, vy, maxBounces) {
    const points = [{ x: startX, y: startY, bounceIndex: 0 }];
    let x = startX, y = startY;
    let bounceCount = 0;
    const STEP = 4;
    const initialSpeed = Math.hypot(vx, vy);
    if (initialSpeed === 0) return points;
    let dvx = vx / initialSpeed;
    let dvy = vy / initialSpeed;
    let simSpeed = initialSpeed;
    const maxPoints = 3000;
    const wInner = C.WALL_THICKNESS / 2;

    for (let i = 0; i < maxPoints && bounceCount <= maxBounces && simSpeed >= C.BALL_MIN_SPEED; i++) {
      x += dvx * STEP;
      y += dvy * STEP;

      let bounced = false;
      if (x - C.BALL_RADIUS < wInner) {
        dvx = Math.abs(dvx); x = wInner + C.BALL_RADIUS; bounceCount++; bounced = true;
      } else if (x + C.BALL_RADIUS > C.W - wInner) {
        dvx = -Math.abs(dvx); x = C.W - wInner - C.BALL_RADIUS; bounceCount++; bounced = true;
      }
      if (y - C.BALL_RADIUS < wInner) {
        dvy = Math.abs(dvy); y = wInner + C.BALL_RADIUS; if (!bounced) bounceCount++; bounced = true;
      } else if (y + C.BALL_RADIUS > C.H - wInner) {
        dvy = -Math.abs(dvy); y = C.H - wInner - C.BALL_RADIUS; if (!bounced) bounceCount++; bounced = true;
      }

      if (bounced) simSpeed *= bounceCount <= 3 ? C.BALL_DECAY_EARLY : C.BALL_DECAY_LATE;
      if (bounceCount > maxBounces || simSpeed < C.BALL_MIN_SPEED) break;
      points.push({ x: x, y: y, bounceIndex: bounceCount, isBounce: bounced });
    }
    return points;
  }

  window.Catnip.physics = {
    updateCat: updateCat,
    stepBall: stepBall,
    updateBalls: updateBalls,
    checkCollisions: checkCollisions,
    updateComboPopups: updateComboPopups,
    updateParticles: updateParticles,
    updateBumperPhysics: updateBumperPhysics,
    updateClones: updateClones,
    computeTrajectory: computeTrajectory,
  };
}());
