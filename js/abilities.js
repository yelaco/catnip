(function () {
  if (!window.Catnip) throw new Error('abilities.js: window.Catnip missing — load constants.js first.');
  if (!window.Catnip.constants) throw new Error('abilities.js: Catnip.constants missing — load constants.js before abilities.js.');
  if (!window.Catnip.state) throw new Error('abilities.js: Catnip.state missing — load state.js before abilities.js.');
  if (!window.Catnip.catalog) throw new Error('abilities.js: Catnip.catalog missing — load catalog.js before abilities.js.');

  var C = window.Catnip.constants;

  function getEquippedArtifact(state) {
    var id = state.persistent.equipped.artifactId;
    if (!id) return null;
    var artifacts = window.Catnip.catalog.artifacts;
    for (var i = 0; i < artifacts.length; i++) {
      if (artifacts[i].id === id) return artifacts[i];
    }
    return null;
  }

  // Central dispatcher — switch on effectType, apply to context
  // context shape depends on effectType (see consumers below)
  function applyEquippedArtifact(effectType, value, context) {
    switch (effectType) {
      case 'coin_per_hit_bonus':
        // context: { run } — adds bonus coins to run.score and run.coins
        if (context && context.run) {
          context.run.score += value;
          // coin award tracked separately on state.persistent by caller
        }
        break;
      case 'starting_balls_bonus':
        // context: { run } — adds bonus to ballsRemaining at game start
        if (context && context.run) {
          context.run.ballsRemaining += value;
        }
        break;
      case 'cat_speed_cap_multiplier':
        // context: { cat } — clamps cat.speed to CAT_INITIAL_SPEED * value
        if (context && context.cat) {
          var cap = C.CAT_INITIAL_SPEED * value;
          if (context.cat.speed > cap) {
            context.cat.speed = cap;
            var curSpd = Math.hypot(context.cat.vx, context.cat.vy);
            if (curSpd > 0) {
              context.cat.vx = (context.cat.vx / curSpd) * cap;
              context.cat.vy = (context.cat.vy / curSpd) * cap;
            }
          }
        }
        break;
      default:
        break;
    }
  }

  function getEffectiveCatSpeedCap(state) {
    var artifact = getEquippedArtifact(state);
    if (artifact && artifact.effect && artifact.effect.type === 'cat_speed_cap_multiplier') {
      return C.CAT_INITIAL_SPEED * artifact.effect.value;
    }
    return C.CAT_MAX_SPEED;
  }

  // Returns bonus coins per cat hit from equipped artifact (0 if none)
  function getCoinBonus(state) {
    var artifact = getEquippedArtifact(state);
    if (artifact && artifact.effect && artifact.effect.type === 'coin_per_hit_bonus') {
      return artifact.effect.value;
    }
    return 0;
  }

  // Returns starting balls count including any artifact bonus
  function getEffectiveStartingBalls(state) {
    var base = C.INITIAL_BALLS;
    var artifact = getEquippedArtifact(state);
    if (artifact && artifact.effect && artifact.effect.type === 'starting_balls_bonus') {
      return base + artifact.effect.value;
    }
    return base;
  }

  function _activateAbility(cat, name, state) {
    if (name === 'shield') {
      cat.activeAbility = 'shield';
      cat.abilityTimer = 4;
      cat.abilityCooldowns.shield = 12;
      state.run.pendingAudio.push('abilityTone:0');
    } else if (name === 'clone') {
      var wI2 = C.WALL_THICKNESS / 2 + C.CAT_RADIUS + 8;
      var bumpers = state.run.bumpers || [];
      var cx2 = 0, cy2 = 0;
      var placed = false;
      for (var att = 0; att < 40; att++) {
        cx2 = wI2 + Math.random() * (C.W - 2 * wI2);
        cy2 = wI2 + Math.random() * (C.H - 2 * wI2);
        if (Math.hypot(cx2 - cat.x, cy2 - cat.y) < C.CAT_RADIUS * 3) continue;
        var ok = true;
        for (var bi2 = 0; bi2 < bumpers.length; bi2++) {
          if (Math.hypot(cx2 - bumpers[bi2].x, cy2 - bumpers[bi2].y) < C.BUMPER_RADIUS + C.CAT_RADIUS + 4) { ok = false; break; }
        }
        if (ok) { placed = true; break; }
      }
      if (!placed) { cx2 = C.W / 2; cy2 = C.H / 3; }
      var theta2 = Math.random() * Math.PI * 2;
      state.run.clones = state.run.clones || [];
      state.run.clones.push({
        x: cx2, y: cy2, r: cat.r,
        vx: C.CLONE_SPEED * Math.cos(theta2),
        vy: C.CLONE_SPEED * Math.sin(theta2),
        age: 0, lifetime: C.ABILITY_DURATION_CLONE,
        spawnTimer: C.CLONE_SPAWN_INTERVAL,
      });
      cat.activeAbility = 'clone';
      cat.abilityTimer = C.ABILITY_DURATION_CLONE;
      cat.abilityCooldowns.clone = C.ABILITY_COOLDOWN_CLONE;
      state.run.pendingAudio.push('abilityTone:1');
    }
  }

  // Per-frame ability system: tick timers, tick cooldowns, trigger speed-tier abilities.
  function updateAbilities(state, dt) {
    var cat = state.run.cat;
    if (!cat || state.run.gameOver) return;

    // Tick timers (seconds)
    if (cat.abilityTimer > 0) cat.abilityTimer = Math.max(0, cat.abilityTimer - dt);
    cat.abilityCooldowns.shield   = Math.max(0, cat.abilityCooldowns.shield   - dt);
    cat.abilityCooldowns.clone    = Math.max(0, cat.abilityCooldowns.clone    - dt);

    // Handle active ability expiry
    if (cat.activeAbility && cat.abilityTimer <= 0) {
      // Ability ended — activate pending if queued
      cat.activeAbility = null;
      if (cat.pendingAbility) {
        var p = cat.pendingAbility;
        cat.pendingAbility = null;
        _activateAbility(cat, p, state);
      }
    }

    // Apply slow-mo speed cap before tier check — ensures cap suppresses ability triggers
    var spd = Math.hypot(cat.vx, cat.vy);
    var cap = getEffectiveCatSpeedCap(state);
    var wasCapped = false;
    if (spd > cap) {
      cat.speed = cap;
      cat.vx = (cat.vx / spd) * cap;
      cat.vy = (cat.vy / spd) * cap;
      spd = cap;
      wasCapped = true;
    }

    // Speed ratio check — use uncapped natural speed for tier display, capped for triggers
    var ratio = spd / C.CAT_INITIAL_SPEED;
    cat.speedTier = Math.floor(ratio);

    // Ability triggers suppressed when artifact cap is actively clamping speed
    if (!wasCapped && !cat.activeAbility) {
      if (ratio > C.ABILITY_TIER_CLONE && cat.abilityCooldowns.clone === 0) {
        _activateAbility(cat, 'clone', state);
      } else if (ratio > C.ABILITY_TIER_SHIELD && cat.abilityCooldowns.shield === 0) {
        _activateAbility(cat, 'shield', state);
      }
    } else if (!wasCapped && cat.activeAbility) {
      // Queue pending — highest unlocked threshold wins
      var want = ratio > C.ABILITY_TIER_CLONE ? 'clone'
        : ratio > C.ABILITY_TIER_SHIELD ? 'shield' : null;
      if (want && want !== cat.activeAbility) cat.pendingAbility = want;
    }
  }

  window.Catnip.abilities = {
    updateAbilities: updateAbilities,
    applyEquippedArtifact: applyEquippedArtifact,
    getEffectiveStartingBalls: getEffectiveStartingBalls,
    getEffectiveCatSpeedCap: getEffectiveCatSpeedCap,
    getCoinBonus: getCoinBonus,
  };
}());
