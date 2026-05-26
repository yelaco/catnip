// js/render.js — Catnip.render
// LOAD ORDER: must come after constants.js, state.js, catalog.js
(function () {
  if (!window.Catnip) throw new Error('render.js: window.Catnip is not defined. Load constants.js first.');
  if (!window.Catnip.constants) throw new Error('render.js: Catnip.constants is not defined. Load constants.js first.');
  if (!window.Catnip.state) throw new Error('render.js: Catnip.state is not defined. Load state.js first.');
  if (!window.Catnip.catalog) throw new Error('render.js: Catnip.catalog is not defined. Load catalog.js first.');

  const C = window.Catnip.constants;

  // buildPalette — reads equipped IDs from state.persistent, looks them up in catalog.
  // Returns a palette object consumed by all draw functions this frame.
  // Called once per frame at the top of the render loop.
  function buildPalette(state) {
    const catalog = window.Catnip.catalog;
    const equipped = (state && state.persistent && state.persistent.equipped)
      ? state.persistent.equipped
      : {};

    const catSkin = catalog.cats.find(c => c.id === equipped.catSkinId)
      || catalog.cats[0]
      || { palette: { bodyColor: '#e8a84a', outlineColor: '#c07830', earInnerColor: '#ff80c0', eyeColor: '#1a1a2e', accessory: null } };

    const ballSkin = catalog.balls.find(b => b.id === equipped.ballSkinId)
      || catalog.balls[0]
      || { palette: { fillColor: '#4ade80', strokeColor: '#16a34a', glowColor: 'rgba(74,222,128,0.4)', trailColor: null } };

    const arena = catalog.arenas.find(a => a.id === equipped.arenaId)
      || catalog.arenas[0]
      || { palette: { bgColor: '#050510', gridColor: 'rgba(100,80,180,0.035)', wallHue: null } };

    return {
      cat: {
        bodyColor: catSkin.palette.bodyColor,
        outlineColor: catSkin.palette.outlineColor,
        earInnerColor: catSkin.palette.earInnerColor,
        eyeColor: catSkin.palette.eyeColor,
        accessory: catSkin.palette.accessory || null,
        // Glow is derived from bodyColor at runtime in drawCat
      },
      ball: {
        fillColor: ballSkin.palette.fillColor,
        strokeColor: ballSkin.palette.strokeColor,
        glowColor: ballSkin.palette.glowColor,
        trailColor: ballSkin.palette.trailColor,
      },
      arena: {
        bgColor: arena.palette.bgColor,
        gridColor: arena.palette.gridColor,
        // wallHue: hex tint string or null (null = keep fully-animated hue)
        wallHue: arena.palette.wallHue || null,
        starColors: C.STAR_COLORS,
      },
    };
  }

  function drawBackground(ctx, now, palette) {
    const W = C.W;
    const H = C.H;
    const stars = Catnip.render._stars;
    const bgColor = (palette && palette.arena && palette.arena.bgColor) ? palette.arena.bgColor : '#050510';
    const gridColor = (palette && palette.arena && palette.arena.gridColor) ? palette.arena.gridColor : 'rgba(100,80,180,0.035)';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72);
    grd.addColorStop(0, 'rgba(40, 10, 80, 0.4)');
    grd.addColorStop(1, 'rgba(0, 20, 40, 0.0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    const grd2 = ctx.createRadialGradient(W * 0.75, H * 0.75, 0, W * 0.75, H * 0.75, Math.max(W, H) * 0.5);
    grd2.addColorStop(0, 'rgba(0, 50, 60, 0.2)');
    grd2.addColorStop(1, 'rgba(0, 50, 60, 0)');
    ctx.fillStyle = grd2;
    ctx.fillRect(0, 0, W, H);

    const t = now * 0.001;
    for (const s of stars) {
      const alpha = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy <= H; gy += 50) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
  }

  function drawWalls(ctx, now, palette) {
    const W = C.W;
    const H = C.H;
    const WALL_THICKNESS = C.WALL_THICKNESS;
    const wallHue = (palette && palette.arena && palette.arena.wallHue) ? palette.arena.wallHue : null;

    const pulse = 0.55 + 0.18 * Math.sin(now * 0.0018);
    ctx.save();

    if (wallHue) {
      // Arena skin provides a fixed hue tint — use it with a subtle pulse on opacity only.
      ctx.shadowBlur = 18;
      ctx.shadowColor = wallHue;
      ctx.strokeStyle = wallHue;
      ctx.globalAlpha = 0.7 + pulse * 0.3;
    } else {
      // Default: fully animated rainbow hue.
      const hue = (now * 0.05) % 360;
      ctx.shadowBlur = 18;
      ctx.shadowColor = `hsla(${hue}, 85%, 55%, ${pulse})`;
      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${pulse + 0.15})`;
    }

    ctx.lineWidth = WALL_THICKNESS;
    ctx.lineJoin = 'miter';
    ctx.strokeRect(
      WALL_THICKNESS / 2,
      WALL_THICKNESS / 2,
      W - WALL_THICKNESS,
      H - WALL_THICKNESS
    );

    ctx.shadowBlur = 24;
    if (wallHue) {
      ctx.fillStyle = wallHue;
    } else {
      const hue = (now * 0.05) % 360;
      ctx.fillStyle = `hsla(${(hue + 60) % 360}, 90%, 75%, ${pulse + 0.2})`;
    }
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBumpers(ctx, state, palette) {
    const bumpers = (state.run && state.run.bumpers) ? state.run.bumpers : [];
    if (!bumpers.length) return;
    const now = Date.now();
    for (const bmp of bumpers) {
      const isFlashing = bmp.hitFlash > 0;
      const pulse = 0.6 + 0.25 * Math.sin((bmp.pulsePhase || 0) + now * 0.002);

      ctx.save();

      if (isFlashing) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffff00';
        ctx.globalAlpha = 1;
        // Fill — bright yellow flash
        ctx.beginPath();
        ctx.arc(bmp.x, bmp.y, bmp.r, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(60, 100%, 70%)';
        ctx.fill();
        // Ring stroke — slightly lighter
        ctx.strokeStyle = 'hsl(60, 100%, 85%)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.globalAlpha = pulse;
        // Fill
        ctx.beginPath();
        ctx.arc(bmp.x, bmp.y, bmp.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${bmp.hue}, 70%, 55%)`;
        ctx.fill();
        // Ring stroke — slightly lighter lightness
        ctx.strokeStyle = `hsl(${bmp.hue}, 70%, 72%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Directional indicator for moving bumpers
      if (bmp.motion) {
        let dirX = 0, dirY = 0;
        if (bmp.motion.type === 'linear') {
          const spd = Math.hypot(bmp.motion.vx, bmp.motion.vy);
          if (spd > 0) { dirX = bmp.motion.vx / spd; dirY = bmp.motion.vy / spd; }
        } else if (bmp.motion.type === 'orbit') {
          // Tangent direction: perpendicular to radius, in direction of omega
          const dx = bmp.x - bmp.motion.cx;
          const dy = bmp.y - bmp.motion.cy;
          const r2 = Math.hypot(dx, dy);
          if (r2 > 0) {
            const sign = bmp.motion.omega >= 0 ? 1 : -1;
            dirX = -sign * dy / r2;
            dirY = sign * dx / r2;
          }
        }
        if (dirX !== 0 || dirY !== 0) {
          const tipX = bmp.x + dirX * (bmp.r - 4);
          const tipY = bmp.y + dirY * (bmp.r - 4);
          const perpX = -dirY;
          const perpY = dirX;
          const triSize = 5;
          ctx.globalAlpha = isFlashing ? 1 : pulse;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(tipX + dirX * triSize, tipY + dirY * triSize);
          ctx.lineTo(tipX + perpX * triSize * 0.6, tipY + perpY * triSize * 0.6);
          ctx.lineTo(tipX - perpX * triSize * 0.6, tipY - perpY * triSize * 0.6);
          ctx.closePath();
          ctx.fillStyle = isFlashing ? '#ffffff' : `hsl(${bmp.hue}, 70%, 85%)`;
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  function drawClones(ctx, state, palette) {
    const clones = (state.run && state.run.clones) ? state.run.clones : [];
    if (!clones.length) return;
    for (const clone of clones) {
      const lifeFrac = clone.lifetime > 0 ? clone.age / clone.lifetime : 0;
      const alpha = lifeFrac > 0.8 ? 0.65 * (1 - (lifeFrac - 0.8) / 0.2) : 0.65;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 18;
      ctx.shadowColor = 'rgba(167,139,250,0.7)';
      ctx.strokeStyle = 'rgba(167,139,250,0.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(clone.x, clone.y, clone.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      const ghostState = { run: { catHitFlash: 0 } };
      const ghostPalette = {
        cat: {
          bodyColor: '#9d7fd4',
          outlineColor: '#6b4fa0',
          earInnerColor: '#c8a0f0',
          eyeColor: '#1a1a2e',
          accessory: null,
        }
      };
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      drawCat(ctx, { x: clone.x, y: clone.y, r: clone.r, activeAbility: null, vx: 0, vy: 0 }, ghostState, ghostPalette);
      ctx.restore();
    }
  }

  function drawExplosionZones(ctx, state) {
    if (!state.run || !state.run.explosionZones) return;
    for (const zone of state.run.explosionZones) {
      const progress = zone.age / zone.lifetime;
      const drawR = (zone.radius || zone.r || 80) * progress;
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ff8800';
      ctx.strokeStyle = `rgba(255, 140, 0, ${(1 - progress) * 0.9})`;
      ctx.lineWidth = 3 + (1 - progress) * 4;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, drawR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawThrower(ctx, state, palette) {
    const THROWER_X = C.THROWER_X;
    const THROWER_Y = C.THROWER_Y;
    const THROWER_RADIUS = C.THROWER_RADIUS;

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#6366f1';
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.roundRect(THROWER_X - 40, THROWER_Y - 6, 80, 14, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(THROWER_X, THROWER_Y - 10, THROWER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(THROWER_X, THROWER_Y - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function _computeTrajectory(startX, startY, vx, vy, maxBounces) {
    const W = C.W;
    const H = C.H;
    const BALL_RADIUS = C.BALL_RADIUS;
    const WALL_THICKNESS = C.WALL_THICKNESS;
    const BALL_MIN_SPEED = C.BALL_MIN_SPEED;
    const BALL_DECAY_EARLY = C.BALL_DECAY_EARLY;
    const BALL_DECAY_LATE = C.BALL_DECAY_LATE;

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

    for (let i = 0; i < maxPoints && bounceCount <= maxBounces && simSpeed >= BALL_MIN_SPEED; i++) {
      x += dvx * STEP;
      y += dvy * STEP;

      const wInner = WALL_THICKNESS / 2;
      let bounced = false;
      if (x - BALL_RADIUS < wInner) {
        dvx = Math.abs(dvx);
        x = wInner + BALL_RADIUS;
        bounceCount++;
        bounced = true;
      } else if (x + BALL_RADIUS > W - wInner) {
        dvx = -Math.abs(dvx);
        x = W - wInner - BALL_RADIUS;
        bounceCount++;
        bounced = true;
      }
      if (y - BALL_RADIUS < wInner) {
        dvy = Math.abs(dvy);
        y = wInner + BALL_RADIUS;
        if (!bounced) bounceCount++;
        bounced = true;
      } else if (y + BALL_RADIUS > H - wInner) {
        dvy = -Math.abs(dvy);
        y = H - wInner - BALL_RADIUS;
        if (!bounced) bounceCount++;
        bounced = true;
      }

      if (bounced) simSpeed *= bounceCount <= 3 ? BALL_DECAY_EARLY : BALL_DECAY_LATE;
      if (bounceCount > maxBounces || simSpeed < BALL_MIN_SPEED) break;
      points.push({ x, y, bounceIndex: bounceCount, isBounce: bounced });
    }
    return points;
  }

  function drawAimGuide(ctx, state, palette) {
    const inp = state.input;
    if (!inp || !inp.drag || !inp.dragCurrent) return;

    const BALL_MIN_DRAG = C.BALL_MIN_DRAG;
    const BALL_MAX_DRAG = C.BALL_MAX_DRAG;
    const BALL_MAX_SPEED = C.BALL_MAX_SPEED;
    const THROWER_X = C.THROWER_X;
    const THROWER_Y = C.THROWER_Y;
    const GUIDE_MAX_BOUNCES = C.GUIDE_MAX_BOUNCES;

    const dx = inp.drag.x - inp.dragCurrent.x;
    const dy = inp.drag.y - inp.dragCurrent.y;
    const m = Math.sqrt(dx * dx + dy * dy);
    if (m < BALL_MIN_DRAG) return;

    const clampedM = Math.min(m, BALL_MAX_DRAG);
    const speed = (clampedM / BALL_MAX_DRAG) * BALL_MAX_SPEED;
    const vx = (dx / m) * speed;
    const vy = (dy / m) * speed;
    const powerRatio = clampedM / BALL_MAX_DRAG;

    const guideBounces = Math.max(1, Math.ceil(powerRatio * GUIDE_MAX_BOUNCES));
    const trajectory = _computeTrajectory(THROWER_X, THROWER_Y - 10, vx, vy, guideBounces);

    const segmentOpacities = [0.8, 0.5, 0.25, 0.1];
    const segColors = ['rgba(74,222,128,', 'rgba(56,189,248,', 'rgba(167,139,250,', 'rgba(244,114,182,', 'rgba(251,146,60,'];
    const bouncePoints = [];

    ctx.save();
    ctx.lineWidth = 1.5 + powerRatio * 2.5;
    ctx.setLineDash([8, 6]);
    const dashOffset = (state.run && state.run.guideDashOffset != null)
      ? state.run.guideDashOffset
      : (state.ui ? state.ui.guideDashOffset : 0);
    ctx.lineDashOffset = dashOffset;

    let segStart = 0;
    for (let i = 1; i < trajectory.length; i++) {
      const pt = trajectory[i];
      if (pt.isBounce || i === trajectory.length - 1) {
        const segIdx = trajectory[segStart].bounceIndex;
        const opacity = segmentOpacities[Math.min(segIdx, segmentOpacities.length - 1)];
        ctx.strokeStyle = segColors[Math.min(segIdx, segColors.length - 1)] + opacity + ')';
        ctx.beginPath();
        ctx.moveTo(trajectory[segStart].x, trajectory[segStart].y);
        for (let j = segStart + 1; j <= i; j++) {
          ctx.lineTo(trajectory[j].x, trajectory[j].y);
        }
        ctx.stroke();
        if (pt.isBounce) {
          bouncePoints.push({ x: pt.x, y: pt.y, bounceIndex: pt.bounceIndex });
        }
        segStart = i;
      }
    }

    ctx.setLineDash([]);
    for (const bp of bouncePoints) {
      const segIdx = bp.bounceIndex - 1;
      const opacity = segmentOpacities[Math.min(segIdx, segmentOpacities.length - 1)];
      ctx.strokeStyle = segColors[Math.min(segIdx, segColors.length - 1)] + opacity + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (trajectory.length > 1) {
      const endPt = trajectory[trajectory.length - 1];
      const endSegIdx = endPt.bounceIndex;
      const endOpacity = segmentOpacities[Math.min(endSegIdx, segmentOpacities.length - 1)];
      ctx.fillStyle = segColors[Math.min(endSegIdx, segColors.length - 1)] + endOpacity + ')';
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPowerBar(ctx, powerRatio, THROWER_X, THROWER_Y);

    ctx.restore();
  }

  function drawPowerBar(ctx, powerRatio, throwerX, throwerY) {
    const barW = 80;
    const barH = 10;
    const barX = throwerX - barW / 2;
    const barY = throwerY + 30;

    ctx.save();

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('POWER', throwerX, barY - 4);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();

    if (powerRatio > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#4ade80');
      grad.addColorStop(0.5, '#facc15');
      grad.addColorStop(1, '#f87171');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * powerRatio, barH, 3);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(Math.round(powerRatio * 100) + '%', barX + barW - 3, barY + barH - 2);

    ctx.restore();
  }

  function drawBall(ctx, ball, palette) {
    const BALL_RADIUS = C.BALL_RADIUS;
    const b = ball;

    // When a skin is equipped, use its single color for all bounces.
    // Default skin (fillColor === '#ffffff') falls back to the v1 bounce-indexed rainbow.
    const isDefaultSkin = !palette || !palette.ball || palette.ball.fillColor === '#ffffff';
    const trailColor = palette && palette.ball ? palette.ball.trailColor : null;

    let ballColor, ballStroke, glowColor;
    if (isDefaultSkin) {
      const bounceColors = ['#4ade80', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c'];
      const bounceStrokes = ['#16a34a', '#0369a1', '#7c3aed', '#be185d', '#c2410c'];
      ballColor = bounceColors[Math.min(b.bounces, bounceColors.length - 1)];
      ballStroke = bounceStrokes[Math.min(b.bounces, bounceStrokes.length - 1)];
      glowColor = ballColor;
    } else {
      ballColor = palette.ball.fillColor;
      ballStroke = palette.ball.strokeColor;
      glowColor = palette.ball.glowColor || ballColor;
    }

    // Trail — skip entirely when trailColor is null (Bubble skin)
    if (trailColor !== null && b.trail && b.trail.length > 0) {
      const tColor = trailColor || ballColor;
      for (let i = 0; i < b.trail.length; i++) {
        const t = b.trail[i];
        const frac = (i + 1) / b.trail.length;
        const alpha = frac * 0.35;
        const radius = BALL_RADIUS * (0.35 + frac * 0.55);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = tColor;
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = glowColor;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    ctx.fill();
    ctx.strokeStyle = ballStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Magnet indicator — dashed line + arrow tip toward cat (approx via velocity direction)
    if (b.type === 'magnet') {
      const spd = Math.hypot(b.vx, b.vy);
      if (spd > 0) {
        const nx = b.vx / spd;
        const ny = b.vy / spd;
        const endX = b.x + nx * 20;
        const endY = b.y + ny * 20;
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = 'rgba(180, 80, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        // Arrow tip triangle at end point
        const perpX = -ny;
        const perpY = nx;
        const triSize = 5;
        ctx.fillStyle = 'rgba(180, 80, 255, 0.7)';
        ctx.beginPath();
        ctx.moveTo(endX + nx * triSize, endY + ny * triSize);
        ctx.lineTo(endX + perpX * triSize * 0.6, endY + perpY * triSize * 0.6);
        ctx.lineTo(endX - perpX * triSize * 0.6, endY - perpY * triSize * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(b.x - 2, b.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCat(ctx, cat, state, palette) {
    const { x, y, r } = cat;
    const catHitFlash = (state.run && state.run.catHitFlash != null) ? state.run.catHitFlash : 0;

    const bodyColor = (palette && palette.cat && palette.cat.bodyColor) ? palette.cat.bodyColor : '#e8a84a';
    const outlineColor = (palette && palette.cat && palette.cat.outlineColor) ? palette.cat.outlineColor : '#c07830';
    const earInnerColor = (palette && palette.cat && palette.cat.earInnerColor) ? palette.cat.earInnerColor : '#ff80c0';
    const eyeColor = (palette && palette.cat && palette.cat.eyeColor) ? palette.cat.eyeColor : '#1a1a2e';

    ctx.save();

    const glowGrd = ctx.createRadialGradient(x, y, r, x, y, r * 1.8);
    glowGrd.addColorStop(0, 'rgba(255,200,80,0.18)');
    glowGrd.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = glowGrd;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    const pulseBlur = 14 + Math.sin(Date.now() * 0.003) * 6;
    ctx.shadowBlur = pulseBlur;
    ctx.shadowColor = `hsl(${30 + 20 * Math.sin(Date.now() * 0.002)}, 90%, 65%)`;

    // Body
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ears
    const earW = r * 0.55;
    const earH = r * 0.75;
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y - r * 0.72);
    ctx.lineTo(x - r * 0.45 - earW, y - r * 0.72 - earH);
    ctx.lineTo(x - r * 0.05, y - r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.45, y - r * 0.72);
    ctx.lineTo(x + r * 0.45 + earW, y - r * 0.72 - earH);
    ctx.lineTo(x + r * 0.05, y - r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner ears
    ctx.fillStyle = earInnerColor;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.42, y - r * 0.76);
    ctx.lineTo(x - r * 0.42 - earW * 0.55, y - r * 0.76 - earH * 0.55);
    ctx.lineTo(x - r * 0.08, y - r * 0.84);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.42, y - r * 0.76);
    ctx.lineTo(x + r * 0.42 + earW * 0.55, y - r * 0.76 - earH * 0.55);
    ctx.lineTo(x + r * 0.08, y - r * 0.84);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y - r * 0.1, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, y - r * 0.1, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.18, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.36, y - r * 0.18, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#ff6090';
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.12);
    ctx.lineTo(x - r * 0.1, y + r * 0.22);
    ctx.lineTo(x + r * 0.1, y + r * 0.22);
    ctx.closePath();
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    for (let s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.1, y + r * 0.18);
      ctx.lineTo(x + s * r * 0.9, y + r * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.1, y + r * 0.22);
      ctx.lineTo(x + s * r * 0.9, y + r * 0.25);
      ctx.stroke();
    }

    // Accessories — drawn after face features, before hit flash overlay
    const accessory = (palette && palette.cat) ? palette.cat.accessory : null;
    if (accessory === 'bowtie') {
      // Two filled triangles meeting at a center knot, positioned at chin area
      const bx = x;
      const by = y + r * 0.38;
      const hw = r * 0.38; // half-width of each wing
      const th = r * 0.22; // triangle height
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e03050';
      ctx.strokeStyle = '#8a0020';
      ctx.lineWidth = 1;
      // Left wing
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - hw, by - th);
      ctx.lineTo(bx - hw, by + th);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Right wing
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + hw, by - th);
      ctx.lineTo(bx + hw, by + th);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Center knot
      ctx.beginPath();
      ctx.arc(bx, by, r * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = '#ff8080';
      ctx.fill();
      ctx.restore();
    } else if (accessory === 'crown') {
      // Jagged polygon with 3 spikes drawn above the cat's head
      const earH = r * 0.75;
      const cx = x;
      const baseY = y - r - earH * 0.1; // sits just above ear root
      const crownW = r * 1.1;
      const baseH = r * 0.22; // height of the crown band
      const spikeH = r * 0.55;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Base: bottom-left → spike1 → valley → spike2 → valley → spike3 → bottom-right
      ctx.moveTo(cx - crownW, baseY);
      ctx.lineTo(cx - crownW, baseY - baseH);
      ctx.lineTo(cx - crownW * 0.55, baseY - baseH - spikeH);
      ctx.lineTo(cx - crownW * 0.18, baseY - baseH);
      ctx.lineTo(cx, baseY - baseH - spikeH * 1.25);
      ctx.lineTo(cx + crownW * 0.18, baseY - baseH);
      ctx.lineTo(cx + crownW * 0.55, baseY - baseH - spikeH);
      ctx.lineTo(cx + crownW, baseY - baseH);
      ctx.lineTo(cx + crownW, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Small gem dots on spike tips
      ctx.fillStyle = '#ff4488';
      ctx.shadowColor = '#ff4488';
      for (const [gx, gy] of [
        [cx - crownW * 0.55, baseY - baseH - spikeH],
        [cx, baseY - baseH - spikeH * 1.25],
        [cx + crownW * 0.55, baseY - baseH - spikeH],
      ]) {
        ctx.beginPath();
        ctx.arc(gx, gy, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (accessory === 'glasses') {
      // Two ellipses on eye positions, connected by a bridge line
      const lx = x - r * 0.3;
      const rx2 = x + r * 0.3;
      const ey = y - r * 0.1;
      const erx = r * 0.2;
      const ery = r * 0.14;
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#555577';
      ctx.lineWidth = r * 0.06;
      // Left lens
      ctx.beginPath();
      ctx.ellipse(lx, ey, erx, ery, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Right lens
      ctx.beginPath();
      ctx.ellipse(rx2, ey, erx, ery, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(lx + erx, ey);
      ctx.lineTo(rx2 - erx, ey);
      ctx.stroke();
      // Left temple arm (short line extending outward)
      ctx.beginPath();
      ctx.moveTo(lx - erx, ey);
      ctx.lineTo(lx - erx - r * 0.18, ey - r * 0.05);
      ctx.stroke();
      // Right temple arm
      ctx.beginPath();
      ctx.moveTo(rx2 + erx, ey);
      ctx.lineTo(rx2 + erx + r * 0.18, ey - r * 0.05);
      ctx.stroke();
      ctx.restore();
    }

    // Hit flash
    if (catHitFlash > 0) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = (catHitFlash / 0.3) * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Ability overlays — drawn above hit flash so they are always visible
    var abilityActive = cat.activeAbility;
    if (abilityActive === 'shield') {
      var shieldPulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006);
      ctx.save();
      ctx.shadowBlur = 22;
      ctx.shadowColor = 'rgba(56,189,248,0.85)';
      ctx.strokeStyle = 'rgba(56,189,248,' + shieldPulse + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (abilityActive === 'clone') {
      var clonePulse = 0.5 + 0.35 * Math.sin(Date.now() * 0.008);
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = 'rgba(167,139,250,0.8)';
      ctx.strokeStyle = 'rgba(167,139,250,' + clonePulse + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawParticles(ctx, state, palette) {
    const particles = (state.run && state.run.particles) ? state.run.particles : [];
    for (const p of particles) {
      const frac = 1 - p.age / p.lifetime;
      ctx.save();
      ctx.globalAlpha = frac * 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * frac, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();
    }
  }

  function drawComboPopups(ctx, state, palette) {
    const comboPopups = (state.run && state.run.comboPopups) ? state.run.comboPopups : [];
    for (const p of comboPopups) {
      const frac = p.age / p.lifetime;
      const opacity = Math.max(0, 1 - frac);

      let entryScale = 1;
      if (frac < 0.08) {
        entryScale = 2 - (frac / 0.08) * 0.85;
      } else if (frac < 0.18) {
        entryScale = 1.15 - ((frac - 0.08) / 0.1) * 0.15;
      }

      const baseScale = 0.85 + p.bounces * 0.18;
      const fontSize = Math.round(28 * baseScale * entryScale);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';

      const isHighCombo = p.bounces >= 3;
      ctx.shadowBlur = isHighCombo ? 28 : 18;
      ctx.shadowColor = isHighCombo ? '#f97316' : '#facc15';

      ctx.font = `bold ${fontSize}px Impact, Arial, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = isHighCombo ? '#fb923c' : '#fde047';
      ctx.fillText(p.text, p.x, p.y);

      ctx.shadowBlur = 8;
      const subSize = Math.round(fontSize * 0.58);
      ctx.font = `bold ${subSize}px Arial, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(p.subtext, p.x, p.y + fontSize * 0.88);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.subtext, p.x, p.y + fontSize * 0.88);

      ctx.restore();
    }
  }

  function drawHUD(ctx, state, palette) {
    const score = (state.run && state.run.score != null) ? state.run.score : 0;
    const ballsRemaining = (state.run && state.run.ballsRemaining != null) ? state.run.ballsRemaining : 0;
    const coins = (state.persistent && state.persistent.coins != null) ? state.persistent.coins : 0;

    ctx.save();
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(`Score: ${score}`, 17, 17);
    ctx.fillText(`Balls: ${ballsRemaining}`, 17, 43);

    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Score: ${score}`, 16, 16);
    ctx.shadowBlur = 0;

    ctx.fillStyle = ballsRemaining <= 1 ? '#f87171' : '#a3e635';
    ctx.fillText(`Balls: ${ballsRemaining}`, 16, 42);

    // Coin display — top right
    ctx.textAlign = 'right';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Coins: ${coins}`, C.W - 56, 16);
    ctx.shadowBlur = 0;

    // Power-up queue — NEXT ball prominent, upcoming queue to the right
    const queue = (state.run && state.run.powerupQueue) ? state.run.powerupQueue : [];
    const queueColors = { normal: '#ffffff', explosive: '#ff6600', multiball: '#00ccff', magnet: '#cc44ff' };
    const queueLabels = { normal: 'NRM', explosive: 'EXP', multiball: 'MLT', magnet: 'MAG' };
    const nextType = queue[0] || null;
    const nextColor = nextType ? (queueColors[nextType] || '#888888') : 'rgba(255,255,255,0.2)';
    const nextX = C.W / 2 - 70;
    const queueY = 28;

    ctx.save();

    // "NEXT" label above the next ball
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('NEXT', nextX, queueY - 20);

    // NEXT ball — large circle with glow ring
    ctx.beginPath();
    ctx.arc(nextX, queueY, 16, 0, Math.PI * 2);
    ctx.fillStyle = nextColor;
    ctx.shadowBlur = 12;
    ctx.shadowColor = nextColor;
    ctx.fill();
    ctx.shadowBlur = 0;
    // White pulsing ring
    ctx.beginPath();
    ctx.arc(nextX, queueY, 20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(nextX, queueY, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Type label below NEXT ball
    if (nextType) {
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.shadowBlur = 0;
      ctx.fillText(queueLabels[nextType] || nextType.slice(0,3).toUpperCase(), nextX, queueY + 26);
    }

    // Upcoming balls (queue[1..4]) — smaller, to the right
    const upcomingStartX = C.W / 2 - 10;
    for (let i = 1; i <= 4; i++) {
      const type = queue[i] || null;
      const color = type ? (queueColors[type] || '#888888') : 'rgba(255,255,255,0.12)';
      const ix = upcomingStartX + (i - 1) * 22;
      ctx.globalAlpha = type ? 0.7 : 0.4;
      ctx.beginPath();
      ctx.arc(ix, queueY, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      if (type) { ctx.shadowBlur = 5; ctx.shadowColor = color; }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ix, queueY, 8, 0, Math.PI * 2);
      ctx.stroke();
      if (type) {
        ctx.globalAlpha = 0.65;
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fillText(queueLabels[type] || type.slice(0,3).toUpperCase(), ix, queueY + 17);
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    ctx.restore();
  }

  function drawGameOver(ctx, state, palette) {
    const W = C.W;
    const H = C.H;
    const score = (state.run && state.run.score != null) ? state.run.score : 0;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 48px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText('Game Over', W / 2, H / 2 - 60);

    ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`Score: ${score}`, W / 2, H / 2 - 5);

    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText('Press R to restart', W / 2, H / 2 + 45);

    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText('M · Esc — Main Menu', W / 2, H / 2 + 80);

    ctx.restore();
  }

  function _drawBackButton(ctx, state) {
    const ui = state.ui || {};
    const btn = ui.backButtonRect || { x: C.W / 2 - 80, y: C.H - 100, w: 160, h: 52 };
    const hover = ui.backHover || false;

    ctx.save();
    ctx.shadowBlur = hover ? 18 : 0;
    ctx.shadowColor = '#6366f1';
    ctx.fillStyle = hover ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.strokeStyle = hover ? '#818cf8' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = hover ? '#e0e7ff' : '#c8c8d8';
    ctx.fillText('← Back', btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  function drawMuteButton(ctx, state, palette) {
    const ui = state.ui || {};
    const muteBtnRect = ui.muteBtnRect || { x: C.W - 48, y: 10, w: 36, h: 36 };
    const muteBtnHover = ui.muteBtnHover || false;
    const isMuted = (state.persistent && state.persistent.isMuted != null)
      ? state.persistent.isMuted
      : false;

    const { x, y, w, h } = muteBtnRect;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = w / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = muteBtnHover ? 'rgba(99,102,241,0.38)' : 'rgba(255,255,255,0.07)';
    ctx.shadowBlur = muteBtnHover ? 14 : 0;
    ctx.shadowColor = '#6366f1';
    ctx.fill();
    ctx.strokeStyle = muteBtnHover ? '#818cf8' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;
    const iconColor = isMuted ? '#f87171' : '#c8d8ff';
    ctx.fillStyle = iconColor;
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 1.5;

    const bx = cx - 6;
    const by = cy;
    ctx.beginPath();
    ctx.moveTo(bx - 4, by - 4);
    ctx.lineTo(bx,     by - 4);
    ctx.lineTo(bx + 5, by - 8);
    ctx.lineTo(bx + 5, by + 8);
    ctx.lineTo(bx,     by + 4);
    ctx.lineTo(bx - 4, by + 4);
    ctx.closePath();
    ctx.fill();

    if (!isMuted) {
      ctx.beginPath();
      ctx.arc(bx + 5, by, 6, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx + 5, by, 10, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    } else {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 7, by - 5);
      ctx.lineTo(bx + 13, by + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + 13, by - 5);
      ctx.lineTo(bx + 7, by + 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawMenu(ctx, state, now) {
    const W = C.W;
    const H = C.H;
    const ui = state.ui || {};
    const menuButtons = ui.menuButtons || [];
    const menuHoverIndex = ui.menuHoverIndex != null ? ui.menuHoverIndex : -1;
    const menuFocusIndex = ui.menuFocusIndex != null ? ui.menuFocusIndex : 0;

    drawBackground(ctx, now, null);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
    ctx.shadowBlur = 36;
    ctx.shadowColor = `hsl(${(now * 0.05) % 360}, 90%, 65%)`;
    ctx.fillStyle = '#ffd700';
    ctx.textBaseline = 'middle';
    ctx.fillText('CATNIP', W / 2, H * 0.17);

    ctx.shadowBlur = 0;
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText("don't miss.", W / 2, H * 0.24);

    ctx.restore();

    for (const btn of menuButtons) {
      const isActive = btn.index === menuHoverIndex || btn.index === menuFocusIndex;
      ctx.save();
      ctx.shadowBlur = isActive ? 22 : 0;
      ctx.shadowColor = '#6366f1';
      ctx.fillStyle = isActive ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
      ctx.fill();
      ctx.strokeStyle = isActive ? '#818cf8' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${isActive ? 'bold' : '500'} 20px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = isActive ? '#e0e7ff' : '#c8c8d8';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(160,160,176,0.45)';
    ctx.fillText('↑ ↓ arrow keys · Enter to select', W / 2, H - 24);
    ctx.restore();

    drawMuteButton(ctx, state, null);
  }

  function drawSettings(ctx, state, now) {
    const W = C.W;
    const H = C.H;
    const isMuted = (state.persistent && state.persistent.isMuted != null)
      ? state.persistent.isMuted
      : false;

    drawBackground(ctx, now, null);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#e8e8e8';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#6366f1';
    ctx.fillText('Settings', W / 2, 120);
    ctx.shadowBlur = 0;

    const rowY = H / 2 - 20;
    ctx.font = '22px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#c8c8d8';
    ctx.textAlign = 'left';
    ctx.fillText('Sound', W / 2 - 120, rowY);

    const pillX = W / 2 + 30;
    const pillY = rowY - 14;
    const pillW = 56;
    const pillH = 28;
    ctx.fillStyle = isMuted ? 'rgba(255,255,255,0.1)' : '#6366f1';
    ctx.shadowBlur = isMuted ? 0 : 12;
    ctx.shadowColor = '#818cf8';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    const circleX = isMuted ? pillX + 14 : pillX + pillW - 14;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(circleX, pillY + pillH / 2, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = isMuted ? '#f87171' : '#4ade80';
    ctx.fillText(isMuted ? 'Off' : 'On', pillX + pillW + 12, rowY);

    ctx.restore();
    _drawBackButton(ctx, state);
    drawMuteButton(ctx, state, null);
  }

  function drawGuide(ctx, state, now) {
    const W = C.W;
    const H = C.H;

    drawBackground(ctx, now, null);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#e8e8e8';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#6366f1';
    ctx.fillText('How to Play', W / 2, 120);
    ctx.shadowBlur = 0;

    const lines = [
      { icon: '🐱', text: 'A cat bounces around the arena.' },
      { icon: '🎱', text: 'Drag and release to throw a ball at the cat.' },
      { icon: '🏓', text: 'Bounce off walls for bonus points (+1 per wall).' },
      { icon: '🎯', text: 'Hitting the cat gives you 2 extra balls.' },
      { icon: '⚡', text: "Each hit makes the cat faster — don't miss!" },
      { icon: '💀', text: "Run out of balls and it's game over." },
    ];

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const startY = 200;
    const lineH = 52;
    for (let i = 0; i < lines.length; i++) {
      const y = startY + i * lineH;
      ctx.font = '22px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.fillText(lines[i].icon, W / 2 - 260, y);
      ctx.fillStyle = '#c8c8d8';
      ctx.fillText(lines[i].text, W / 2 - 220, y);
    }

    ctx.restore();
    _drawBackButton(ctx, state);
    drawMuteButton(ctx, state, null);
  }

  function drawStore(ctx, state) {
    const W = C.W;
    const H = C.H;
    const now = Date.now();
    const ui = state.ui || {};
    const p = state.persistent || {};
    const coins = p.coins || 0;
    const unlockedIds = p.unlockedIds || [];
    const equipped = p.equipped || {};
    const activeTab = ui.focusedTab || 'cats';
    const focusedId = ui.focusedItemId || null;
    const hoveredId = ui.hoveredItemId || null;

    // Rebuild storeLayout each frame so input.js can hit-test it
    const layout = [];

    // ── Background ───────────────────────────────────────────────────────────
    drawBackground(ctx, now, null);

    // ── Top bar (y 0–52) ─────────────────────────────────────────────────────
    // Divider
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(W, 52);
    ctx.stroke();
    ctx.restore();

    // Back button (top-left, smaller than settings back button)
    const backBtn = { x: 12, y: 8, w: 90, h: 36 };
    const backHover = ui.backHover || false;
    ctx.save();
    ctx.shadowBlur = backHover ? 14 : 0;
    ctx.shadowColor = '#6366f1';
    ctx.fillStyle = backHover ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 8);
    ctx.fill();
    ctx.strokeStyle = backHover ? '#818cf8' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = backHover ? 2 : 1;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = backHover ? '#e0e7ff' : '#c8c8d8';
    ctx.fillText('← Back', backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2);
    ctx.restore();
    layout.push({ type: 'back', id: 'back', bounds: backBtn });

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#e8e8e8';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#6366f1';
    ctx.fillText('STORE', W / 2, 26);
    ctx.restore();

    // Coin display — top right
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Coins: ${coins}`, W - 56, 26);
    ctx.restore();

    // ── Tab strip (y 52–102) ─────────────────────────────────────────────────
    const TABS = ['cats', 'balls', 'arenas', 'artifacts'];
    const TAB_LABELS = { cats: 'Cats', balls: 'Balls', arenas: 'Arenas', artifacts: 'Artifacts' };
    const tabW = W / TABS.length;
    for (let i = 0; i < TABS.length; i++) {
      const tab = TABS[i];
      const tx = i * tabW;
      const ty = 52;
      const th = 50;
      const isActive = tab === activeTab;
      ctx.save();
      ctx.fillStyle = isActive ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(tx, ty, tabW, th);
      // Bottom indicator
      ctx.fillStyle = isActive ? '#6366f1' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(tx, ty + th - (isActive ? 3 : 1), tabW, isActive ? 3 : 1);
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${isActive ? 'bold' : '400'} 17px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = isActive ? '#e0e7ff' : '#a0a0b0';
      ctx.fillText(TAB_LABELS[tab], tx + tabW / 2, ty + th / 2);
      ctx.restore();
      layout.push({ type: 'tab', id: tab, bounds: { x: tx, y: ty, w: tabW, h: th } });
    }

    // ── Card grid (y 110–570) ────────────────────────────────────────────────
    const items = (window.Catnip.store && window.Catnip.store.getTabItems)
      ? window.Catnip.store.getTabItems(activeTab, state)
      : [];

    const CARD_W = 280;
    const CARD_H = 165;
    const CARD_GAP = 20;
    const PREVIEW_H = 90;
    const COLS = Math.min(items.length, 3);
    const gridTotalW = COLS * CARD_W + (COLS - 1) * CARD_GAP;
    const gridX = (W - gridTotalW) / 2;
    const gridStartY = 112;

    // Two rows: first row up to 3 cards, second row remainder centered
    const rows = [];
    if (items.length <= 3) {
      rows.push(items);
    } else {
      // 2+2 for 4 items
      const half = Math.ceil(items.length / 2);
      rows.push(items.slice(0, half));
      rows.push(items.slice(half));
    }

    let focusedItem = null;

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const rowCols = row.length;
      const rowTotalW = rowCols * CARD_W + (rowCols - 1) * CARD_GAP;
      const rowX = (W - rowTotalW) / 2;
      const rowY = gridStartY + ri * (CARD_H + CARD_GAP);

      for (let ci = 0; ci < row.length; ci++) {
        const item = row[ci];
        const cx = rowX + ci * (CARD_W + CARD_GAP);
        const cy = rowY;
        const isFocused = item.id === focusedId || item.id === hoveredId;
        const isUnlocked = item.unlocked;
        const isEquipped = item.equipped;

        // Card bg
        ctx.save();
        if (isEquipped) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#6366f1';
          ctx.fillStyle = 'rgba(99,102,241,0.16)';
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
        } else if (isFocused) {
          ctx.shadowBlur = 18;
          ctx.shadowColor = '#6366f1';
          ctx.fillStyle = 'rgba(99,102,241,0.20)';
          ctx.strokeStyle = '#818cf8';
          ctx.lineWidth = 2;
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.strokeStyle = 'rgba(255,255,255,0.10)';
          ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.roundRect(cx, cy, CARD_W, CARD_H, 10);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Preview area
        _drawItemPreview(ctx, item, activeTab, cx, cy, CARD_W, PREVIEW_H);

        // Lock overlay for locked items
        if (!isUnlocked) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.roundRect(cx, cy, CARD_W, PREVIEW_H, [10, 10, 0, 0]);
          ctx.fill();
          // Lock icon
          const lx = cx + CARD_W / 2;
          const ly = cy + PREVIEW_H / 2;
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath();
          ctx.arc(lx, ly + 4, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(lx, ly - 4, 6, Math.PI, 0);
          ctx.stroke();
          ctx.restore();
        }

        // Preview divider
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + 8, cy + PREVIEW_H);
        ctx.lineTo(cx + CARD_W - 8, cy + PREVIEW_H);
        ctx.stroke();
        ctx.restore();

        // Item name
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = isUnlocked ? '#e8e8e8' : '#888899';
        ctx.fillText(item.name, cx + 12, cy + PREVIEW_H + 8);
        ctx.restore();

        // Price / status
        ctx.save();
        ctx.textBaseline = 'top';
        ctx.font = '13px "Segoe UI", system-ui, sans-serif';
        if (isEquipped) {
          ctx.textAlign = 'right';
          ctx.fillStyle = '#4ade80';
          ctx.fillText('Equipped ✓', cx + CARD_W - 12, cy + PREVIEW_H + 8);
        } else if (isUnlocked) {
          ctx.textAlign = 'right';
          ctx.fillStyle = '#a0a0b0';
          ctx.fillText('Owned', cx + CARD_W - 12, cy + PREVIEW_H + 8);
        } else if (item.price === 0) {
          ctx.textAlign = 'right';
          ctx.fillStyle = '#4ade80';
          ctx.fillText('Free', cx + CARD_W - 12, cy + PREVIEW_H + 8);
        } else {
          ctx.textAlign = 'right';
          ctx.fillStyle = coins >= item.price ? '#ffd700' : '#666677';
          ctx.fillText(`${item.price} coins`, cx + CARD_W - 12, cy + PREVIEW_H + 8);
        }
        ctx.restore();

        // Milestone hint (if milestone-locked)
        if (!isUnlocked && item.milestone) {
          ctx.save();
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.font = '11px "Segoe UI", system-ui, sans-serif';
          ctx.fillStyle = '#fb923c';
          ctx.fillText('Milestone required', cx + 12, cy + PREVIEW_H + 26);
          ctx.restore();
        }

        // Action button row
        const btnY = cy + CARD_H - 34;
        const btnH = 26;
        const btnX = cx + 12;
        const btnW = CARD_W - 24;

        if (!isEquipped) {
          const canAfford = isUnlocked || coins >= (item.price || 0);
          const milestoneLocked = !isUnlocked && !!item.milestone &&
            !(item.milestone === 'lifetimeCoins >= 500' && (p.lifetimeCoins || 0) >= 500);
          const btnDisabled = milestoneLocked || (!isUnlocked && !canAfford);

          ctx.save();
          if (btnDisabled) {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          } else {
            ctx.fillStyle = 'rgba(99,102,241,0.28)';
            ctx.strokeStyle = '#818cf8';
            if (isFocused) { ctx.shadowBlur = 10; ctx.shadowColor = '#6366f1'; }
          }
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(btnX, btnY, btnW, btnH, 6);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
          ctx.fillStyle = btnDisabled ? '#606070' : '#e0e7ff';
          const btnLabel = isUnlocked
            ? 'Equip'
            : (milestoneLocked ? 'Locked' : `Buy — ${item.price} coins`);
          ctx.fillText(btnLabel, btnX + btnW / 2, btnY + btnH / 2);
          ctx.restore();

          if (!btnDisabled) {
            const btnType = isUnlocked ? 'equip' : 'buy';
            layout.push({ type: btnType, id: item.id, bounds: { x: btnX, y: btnY, w: btnW, h: btnH } });
          }
        }

        // Card hit area
        layout.push({ type: 'card', id: item.id, bounds: { x: cx, y: cy, w: CARD_W, h: CARD_H } });

        if (isFocused) focusedItem = item;
      }
    }

    // ── Toast ────────────────────────────────────────────────────────────────
    const toast = ui.toast;
    if (toast && toast.text && now < toast.untilTime) {
      const toastW = 260;
      const toastH = 44;
      const toastX = W - toastW - 12;
      const toastY = 58;
      const fade = Math.min(1, (toast.untilTime - now) / 500);
      ctx.save();
      ctx.globalAlpha = fade;
      const toastColors = {
        green: { bg: 'rgba(34,197,94,0.22)', border: '#4ade80', text: '#a3e635' },
        red:   { bg: 'rgba(239,68,68,0.22)', border: '#f87171', text: '#f87171' },
        gray:  { bg: 'rgba(148,163,184,0.18)', border: 'rgba(255,255,255,0.18)', text: '#a0a0b0' },
      };
      const tc = toastColors[toast.color] || toastColors.gray;
      ctx.fillStyle = tc.bg;
      ctx.strokeStyle = tc.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(toastX, toastY, toastW, toastH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = tc.text;
      ctx.fillText(toast.text, toastX + toastW / 2, toastY + toastH / 2);
      ctx.restore();
    }

    // ── Keyboard hint ────────────────────────────────────────────────────────
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(160,160,176,0.40)';
    ctx.fillText('← → ↑ ↓ navigate · Tab category · Enter buy/equip · Esc back', W / 2, H - 8);
    ctx.restore();

    // Mute button
    drawMuteButton(ctx, state, null);

    // Write layout for input.js hit-testing
    if (state.ui) state.ui.storeLayout = layout;
  }

  // Draws the preview area inside a store card (top PREVIEW_H px of the card).
  function _drawItemPreview(ctx, item, tab, cx, cy, cardW, previewH) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cx, cy, cardW, previewH, [10, 10, 0, 0]);
    ctx.clip();

    if (tab === 'cats' && item.palette) {
      // Mini cat centered in preview
      const miniR = 22;
      const mx = cx + cardW / 2;
      const my = cy + previewH / 2 + 4;
      const fakeCat = { x: mx, y: my, r: miniR };
      const fakePalette = { cat: { ...item.palette } };
      const fakeState = { run: { catHitFlash: 0 } };
      drawCat(ctx, fakeCat, fakeState, fakePalette);
    } else if (tab === 'balls' && item.palette) {
      // Mini ball with trail arc in center
      const bx = cx + cardW / 2;
      const by = cy + previewH / 2;
      const fakeBall = { x: bx, y: by, bounces: 0, trail: [
        { x: bx - 28, y: by + 12 },
        { x: bx - 18, y: by + 6 },
        { x: bx - 8, y: by + 2 },
      ]};
      const fakePalette = { ball: { ...item.palette } };
      drawBall(ctx, fakeBall, fakePalette);
    } else if (tab === 'arenas' && item.palette) {
      // Color swatch: fill with bgColor, wall-color strip at bottom
      ctx.fillStyle = item.palette.bgColor || '#050510';
      ctx.fillRect(cx, cy, cardW, previewH);
      ctx.fillStyle = item.palette.gridColor || 'rgba(100,80,180,0.1)';
      for (let gx = cx; gx < cx + cardW; gx += 30) {
        ctx.fillRect(gx, cy, 1, previewH);
      }
      for (let gy = cy; gy < cy + previewH; gy += 30) {
        ctx.fillRect(cx, gy, cardW, 1);
      }
      if (item.palette.wallHue) {
        ctx.fillStyle = item.palette.wallHue;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(cx, cy + previewH - 8, cardW, 8);
        ctx.globalAlpha = 1;
      }
    } else if (tab === 'artifacts' && item.effect) {
      // Artifact icon glyph centered
      const ax = cx + cardW / 2;
      const ay = cy + previewH / 2;
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(cx, cy, cardW, previewH);
      _drawArtifactIcon(ctx, item.id, ax, ay, 28);
    } else {
      // Fallback: dim panel
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(cx, cy, cardW, previewH);
    }

    ctx.restore();
  }

  // Draws a simple glyph for each artifact type.
  function _drawArtifactIcon(ctx, id, cx, cy, size) {
    ctx.save();
    ctx.shadowBlur = 14;
    if (id === 'artifact-lucky-paw') {
      // Paw print: large circle + four toe beans
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.2, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      const toes = [[-0.45, -0.3], [0, -0.52], [0.45, -0.3], [0.65, 0.05]];
      for (const [dx, dy] of toes) {
        ctx.beginPath();
        ctx.arc(cx + dx * size, cy + dy * size, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'artifact-iron-claw') {
      // Three downward claw lines
      ctx.shadowColor = '#94a3b8';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = size * 0.18;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * size * 0.35, cy - size * 0.4);
        ctx.quadraticCurveTo(cx + i * size * 0.5, cy + size * 0.1, cx + i * size * 0.38, cy + size * 0.5);
        ctx.stroke();
      }
    } else if (id === 'artifact-slow-mo') {
      // Hourglass shape
      ctx.shadowColor = '#818cf8';
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.45, cy - size * 0.55);
      ctx.lineTo(cx + size * 0.45, cy - size * 0.55);
      ctx.lineTo(cx + size * 0.08, cy);
      ctx.lineTo(cx + size * 0.45, cy + size * 0.55);
      ctx.lineTo(cx - size * 0.45, cy + size * 0.55);
      ctx.lineTo(cx - size * 0.08, cy);
      ctx.closePath();
      ctx.fill();
      // Hourglass outline
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Generic star
      ctx.fillStyle = '#a0a0b0';
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Shared starfield — initialized once, reused by drawBackground each frame.
  function _initStars() {
    const W = C.W;
    const H = C.H;
    const STAR_COUNT = 18;
    const STAR_COLORS = ['#00f5ff', '#ff00ff', '#ffff00', '#ff8c00', '#00ff88', '#bf5fff'];
    const stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.8 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.2,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      });
    }
    return stars;
  }

  window.Catnip.render = {
    buildPalette,
    drawBackground,
    drawWalls,
    drawBumpers,
    drawClones,
    drawExplosionZones,
    drawThrower,
    drawAimGuide,
    drawBall,
    drawCat,
    drawParticles,
    drawComboPopups,
    drawHUD,
    drawGameOver,
    drawMenu,
    drawSettings,
    drawGuide,
    drawStore,
    drawMuteButton,
    _stars: _initStars(),
    _computeTrajectory,
  };
})();
