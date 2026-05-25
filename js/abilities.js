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

  // Returns effective cat speed cap accounting for dash exemption (Cerebro decision)
  function getEffectiveCatSpeedCap(state) {
    if (state.run.cat && (state.run.cat.activeAbility === 'dash')) return C.CAT_MAX_SPEED;
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
    } else if (name === 'dash') {
      // Rotate velocity to random angle, scale by 2.5, clamp to CAT_MAX_SPEED
      var dashAngle = Math.random() * Math.PI * 2;
      var dashSpd = Math.hypot(cat.vx, cat.vy) * 2.5;
      if (dashSpd > C.CAT_MAX_SPEED) dashSpd = C.CAT_MAX_SPEED;
      cat.vx = Math.cos(dashAngle) * dashSpd;
      cat.vy = Math.sin(dashAngle) * dashSpd;
      cat.speed = dashSpd;
      cat.activeAbility = 'dash';
      cat.abilityTimer = 0.5;
      cat.abilityCooldowns.dash = 8;
      state.run.pendingAudio.push('abilityTone:1');
    } else if (name === 'teleport') {
      cat.activeAbility = 'teleport_fade';
      cat.abilityTimer = 0.3;
      cat.abilityCooldowns.teleport = 15;
      state.run.pendingAudio.push('abilityTone:2');
    }
  }

  function _repositionCatRandom(cat, state) {
    var wI = C.WALL_THICKNESS / 2 + cat.r + 4;
    var bumpers = state.run.bumpers || [];
    var attempts = 0;
    while (attempts < 50) {
      var nx = wI + Math.random() * (C.W - 2 * wI);
      var ny = wI + Math.random() * (C.H - 2 * wI);
      var clear = true;
      for (var i = 0; i < bumpers.length; i++) {
        var bmp = bumpers[i];
        if (Math.hypot(nx - bmp.x, ny - bmp.y) < C.BUMPER_RADIUS + cat.r + 4) {
          clear = false;
          break;
        }
      }
      if (clear) { cat.x = nx; cat.y = ny; return; }
      attempts++;
    }
    // Fallback to center
    cat.x = C.W / 2;
    cat.y = C.H / 2;
  }

  // Per-frame ability system: tick timers, tick cooldowns, trigger speed-tier abilities.
  function updateAbilities(state, dt) {
    var cat = state.run.cat;
    if (!cat || state.run.gameOver) return;

    // Tick timers (seconds)
    if (cat.abilityTimer > 0) cat.abilityTimer = Math.max(0, cat.abilityTimer - dt);
    cat.abilityCooldowns.shield   = Math.max(0, cat.abilityCooldowns.shield   - dt);
    cat.abilityCooldowns.dash     = Math.max(0, cat.abilityCooldowns.dash     - dt);
    cat.abilityCooldowns.teleport = Math.max(0, cat.abilityCooldowns.teleport - dt);

    // Handle active ability expiry
    if (cat.activeAbility && cat.abilityTimer <= 0) {
      if (cat.activeAbility === 'teleport_fade') {
        // Phase 2: reposition and switch to appear phase
        _repositionCatRandom(cat, state);
        cat.activeAbility = 'teleport_appear';
        cat.abilityTimer = 0.15;
      } else {
        // Ability ended — activate pending if queued
        cat.activeAbility = null;
        if (cat.pendingAbility) {
          var p = cat.pendingAbility;
          cat.pendingAbility = null;
          _activateAbility(cat, p, state);
        }
      }
    }

    // Apply slow-mo speed cap before tier check — ensures cap suppresses ability
    // triggers from speed spikes (dash exempt during active dash window)
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
      if (ratio > C.ABILITY_TIER_TELEPORT && cat.abilityCooldowns.teleport === 0) {
        _activateAbility(cat, 'teleport', state);
      } else if (ratio > C.ABILITY_TIER_DASH && cat.abilityCooldowns.dash === 0) {
        _activateAbility(cat, 'dash', state);
      } else if (ratio > C.ABILITY_TIER_SHIELD && cat.abilityCooldowns.shield === 0) {
        _activateAbility(cat, 'shield', state);
      }
    } else if (!wasCapped && cat.activeAbility) {
      // Queue pending — highest unlocked threshold wins
      var want = ratio > C.ABILITY_TIER_TELEPORT ? 'teleport'
        : ratio > C.ABILITY_TIER_DASH ? 'dash'
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
