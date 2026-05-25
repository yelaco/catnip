(function () {
  if (!window.Catnip) throw new Error('game.js: window.Catnip is not defined. Load constants.js first.');
  if (!window.Catnip.constants) throw new Error('game.js: Catnip.constants missing.');
  if (!window.Catnip.state) throw new Error('game.js: Catnip.state missing. Load state.js before game.js.');
  if (!window.Catnip.catalog) throw new Error('game.js: Catnip.catalog missing. Load catalog.js before game.js.');
  if (!window.Catnip.render) throw new Error('game.js: Catnip.render missing. Load render.js before game.js.');
  if (!window.Catnip.store) throw new Error('game.js: Catnip.store missing. Load store.js before game.js.');
  if (!window.Catnip.audio) throw new Error('game.js: Catnip.audio missing. Load audio.js before game.js.');
  if (!window.Catnip.input) throw new Error('game.js: Catnip.input missing. Load input.js before game.js.');

  const C = window.Catnip.constants;
  const GS = C.GameState;

  let canvas, ctx, lastTime;

  // Patch resetRunState: apply artifact bonuses and fill powerup queue
  var _origResetRunState = window.Catnip.resetRunState;
  window.Catnip.resetRunState = function () {
    _origResetRunState();
    var state = window.Catnip.state;
    if (window.Catnip.abilities) {
      state.run.ballsRemaining = window.Catnip.abilities.getEffectiveStartingBalls(state);
    }
    if (window.Catnip.powerups) {
      window.Catnip.powerups.rollQueue(state);
    }
    if (window.Catnip.entities) {
      window.Catnip.entities.spawnBumpers(state);
    }
  };

  function frame(now) {
    if (lastTime === null) lastTime = now;
    const dtMs = Math.min(now - lastTime, 33);
    const dt = dtMs / 1000;
    lastTime = now;

    const state = window.Catnip.state;
    const cs = state.ui.currentState;

    // Reset per-frame hit cap — Beast flag 2
    state.run.catHitThisFrame = false;

    if (cs === GS.MENU) {
      window.Catnip.render.drawMenu(ctx, state, now);
      requestAnimationFrame(frame);
      return;
    }

    if (cs === GS.SETTINGS) {
      window.Catnip.render.drawSettings(ctx, state, now);
      requestAnimationFrame(frame);
      return;
    }

    if (cs === GS.GUIDE) {
      window.Catnip.render.drawGuide(ctx, state, now);
      requestAnimationFrame(frame);
      return;
    }

    if (cs === GS.STORE) {
      // Drain expired toast
      if (state.ui.toast && state.ui.toast.text && Date.now() >= state.ui.toast.untilTime) {
        state.ui.toast.text = '';
      }
      window.Catnip.render.drawStore(ctx, state);
      window.Catnip.audio.drainPendingAudio(state);
      requestAnimationFrame(frame);
      return;
    }

    // ── PLAYING state ──────────────────────────────────────────────────────────
    state.run.guideDashOffset -= 1;

    if (!state.run.gameOver) {
      if (window.Catnip.physics) {
        window.Catnip.physics.updateCat(state.run.cat, state, dt);
        window.Catnip.physics.updateBalls(state, dt);
        window.Catnip.physics.checkCollisions(state);
        window.Catnip.physics.updateComboPopups(state, dt);
        window.Catnip.physics.updateParticles(state, dt);
        if (window.Catnip.physics.updateBumperPhysics) {
          window.Catnip.physics.updateBumperPhysics(state, dt);
        }
      }

      if (window.Catnip.abilities) {
        window.Catnip.abilities.updateAbilities(state, dt);
      }

      if (window.Catnip.physics.updateClones) window.Catnip.physics.updateClones(state, dt);

      if (window.Catnip.powerups) {
        window.Catnip.powerups.updateExplosionZones(state, dt);
      }

      // Decay screen shake
      if (state.run.screenShake > 0.2) {
        state.run.screenShake *= 0.82;
      } else {
        state.run.screenShake = 0;
      }

      // Check lose condition — game over routes to MENU per plan decision
      if (state.run.ballsRemaining === 0 && state.run.activeBalls.length === 0) {
        if (!state.run.completionBonusAwarded) {
          state.persistent.coins += 5;
          state.persistent.lifetimeCoins += 5;
          state.run.completionBonusAwarded = true;
          if (window.Catnip.store && window.Catnip.store.saveState) {
            window.Catnip.store.saveState();
          }
        }
        state.run.gameOver = true;
        state.run.pendingAudio.push('gameOver');
      }
    }

    window.Catnip.audio.drainPendingAudio(state);

    const palette = window.Catnip.render.buildPalette(state);
    window.Catnip.render.drawBackground(ctx, now, palette);

    ctx.save();
    if (state.run.screenShake > 0) {
      ctx.translate(
        (Math.random() * 2 - 1) * state.run.screenShake,
        (Math.random() * 2 - 1) * state.run.screenShake
      );
    }

    window.Catnip.render.drawWalls(ctx, now, palette);
    window.Catnip.render.drawThrower(ctx);
    if (window.Catnip.render.drawBumpers) {
      window.Catnip.render.drawBumpers(ctx, state, palette);
    }
    window.Catnip.render.drawClones(ctx, state, palette);
    if (window.Catnip.render.drawExplosionZones) {
      window.Catnip.render.drawExplosionZones(ctx, state);
    }
    window.Catnip.render.drawAimGuide(ctx, state);
    for (const b of state.run.activeBalls) {
      window.Catnip.render.drawBall(ctx, b, palette);
    }
    window.Catnip.render.drawCat(ctx, state.run.cat, state, palette);
    window.Catnip.render.drawParticles(ctx, state);
    window.Catnip.render.drawComboPopups(ctx, state);
    ctx.restore();

    window.Catnip.render.drawHUD(ctx, state);
    window.Catnip.render.drawMuteButton(ctx, state, null);

    if (state.run.gameOver) {
      window.Catnip.render.drawGameOver(ctx, state);
    }

    requestAnimationFrame(frame);
  }

  function start() {
    // Canvas setup
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = C.W * dpr;
    canvas.height = C.H * dpr;
    ctx.scale(dpr, dpr);

    // Load persistent state
    window.Catnip.store.loadState();

    // Build menu and init run state
    window.Catnip.input.buildMenuButtons(window.Catnip.state);
    window.Catnip.resetRunState();

    // Wire input
    window.Catnip.input.init(canvas);

    // Start loop
    lastTime = null;
    requestAnimationFrame(frame);
  }

  window.Catnip.start = start;
}());
