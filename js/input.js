(function () {
  if (!window.Catnip) throw new Error('input.js: window.Catnip is not defined. Load constants.js first.');
  if (!window.Catnip.constants) throw new Error('input.js: Catnip.constants missing. Load constants.js before input.js.');
  if (!window.Catnip.state) throw new Error('input.js: Catnip.state missing. Load state.js before input.js.');
  if (!window.Catnip.store) throw new Error('input.js: Catnip.store missing. Load store.js before input.js.');
  if (!window.Catnip.audio) throw new Error('input.js: Catnip.audio missing. Load audio.js before input.js.');

  const C = window.Catnip.constants;
  const GS = C.GameState;
  const STORE_TABS = ['cats', 'balls', 'arenas', 'artifacts'];
  const muteBtnRect = { x: C.W - 48, y: 10, w: 36, h: 36 };

  function getState() { return window.Catnip.state; }

  // Returns the ordered list of item ids for the current focusedTab from catalog.
  function tabItems(state) {
    const catalog = window.Catnip.catalog;
    const tab = state.ui.focusedTab;
    if (tab === 'cats')      return catalog.cats.map(i => i.id);
    if (tab === 'balls')     return catalog.balls.map(i => i.id);
    if (tab === 'arenas')    return catalog.arenas.map(i => i.id);
    if (tab === 'artifacts') return catalog.artifacts.map(i => i.id);
    return [];
  }

  function firstItemInTab(state) {
    const items = tabItems(state);
    return items.length > 0 ? items[0] : null;
  }

  function switchTab(state, tab) {
    state.ui.focusedTab = tab;
    state.ui.focusedItemId = firstItemInTab(state);
    state.ui.hoveredItemId = null;
  }

  function moveFocusInRow(state, dir) {
    const items = tabItems(state);
    if (!items.length) return;
    const idx = items.indexOf(state.ui.focusedItemId);
    const current = idx < 0 ? 0 : idx;
    const cols = 3;
    const newCol = (current % cols) + dir;
    if (newCol < 0 || newCol >= cols) return; // don't wrap across rows
    const newIdx = Math.floor(current / cols) * cols + newCol;
    if (newIdx >= 0 && newIdx < items.length) {
      state.ui.focusedItemId = items[newIdx];
    }
  }

  function moveFocusInColumn(state, dir) {
    const items = tabItems(state);
    if (!items.length) return;
    const idx = items.indexOf(state.ui.focusedItemId);
    const current = idx < 0 ? 0 : idx;
    const cols = 3;
    const newIdx = current + dir * cols;
    if (newIdx >= 0 && newIdx < items.length) {
      state.ui.focusedItemId = items[newIdx];
    }
  }

  function triggerFocusedItem(state) {
    const id = state.ui.focusedItemId;
    if (!id) return;
    const persistent = state.persistent;
    const store = window.Catnip.store;
    if (persistent.unlockedIds.includes(id)) {
      if (store && store.equip) store.equip(id, state);
      else console.log('[store stub] equip', id);
    } else {
      if (store && store.buy) store.buy(id, state);
      else console.log('[store stub] buy', id);
    }
  }

  function hitTest(rects, mx, my) {
    for (const r of rects) {
      const b = r.bounds || r;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return r;
    }
    return null;
  }

  function toMenuState(state) {
    state.ui.currentState = GS.MENU;
    state.ui.backHover = false;
    // Clear stale drag — Beast flag 9
    state.input.drag = null;
    state.input.dragCurrent = null;
  }

  function init(canvas) {
    const state = getState();

    // ── pointerdown ────────────────────────────────────────────────────────────
    canvas.addEventListener('pointerdown', function (e) {
      window.Catnip.audio.init();
      if (state.ui.currentState !== GS.PLAYING) return;
      if (state.run.gameOver) return;
      const rect = canvas.getBoundingClientRect();
      state.input.drag = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      state.input.dragCurrent = { x: state.input.drag.x, y: state.input.drag.y };
      canvas.setPointerCapture(e.pointerId);
    });

    // ── pointermove ────────────────────────────────────────────────────────────
    canvas.addEventListener('pointermove', function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const mb = muteBtnRect;
      state.ui.muteBtnHover = mx >= mb.x && mx <= mb.x + mb.w && my >= mb.y && my <= mb.y + mb.h;

      const cs = state.ui.currentState;

      if (cs === GS.MENU) {
        state.ui.menuHoverIndex = -1;
        for (const btn of state.ui.menuButtons) {
          if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
            state.ui.menuHoverIndex = btn.index;
            break;
          }
        }
        return;
      }

      if (cs === GS.SETTINGS || cs === GS.GUIDE) {
        const b = state.ui.backButtonRect;
        state.ui.backHover = mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
        return;
      }

      if (cs === GS.STORE) {
        state.ui.backHover = false;
        state.ui.hoveredItemId = null;
        const hit = hitTest(state.ui.storeLayout, mx, my);
        if (hit) {
          if (hit.type === 'back') state.ui.backHover = true;
          else if (hit.type === 'card') state.ui.hoveredItemId = hit.id;
        }
        return;
      }

      if (cs === GS.PLAYING && state.input.drag) {
        state.input.dragCurrent = { x: mx, y: my };
      }
    });

    // ── pointerup ──────────────────────────────────────────────────────────────
    canvas.addEventListener('pointerup', function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Mute button — all states
      const mb = muteBtnRect;
      if (mx >= mb.x && mx <= mb.x + mb.w && my >= mb.y && my <= mb.y + mb.h) {
        window.Catnip.audio.init();
        const p = state.persistent;
        p.isMuted = !p.isMuted;
        window.Catnip.audio.setMuted(p.isMuted);
        if (window.Catnip.store && window.Catnip.store.saveState) {
          window.Catnip.store.saveState();
        }
        return;
      }

      const cs = state.ui.currentState;

      if (cs === GS.MENU) {
        for (const btn of state.ui.menuButtons) {
          if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
            _handleMenuSelect(btn.index, state);
            return;
          }
        }
        return;
      }

      if (cs === GS.SETTINGS || cs === GS.GUIDE) {
        const b = state.ui.backButtonRect;
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          toMenuState(state);
          _buildMenuButtons(state);
        }
        if (cs === GS.SETTINGS) {
          // Mute toggle pill
          const pillX = C.W / 2 + 30;
          const pillY = C.H / 2 - 34;
          const pillW = 56;
          const pillH = 28;
          if (mx >= pillX && mx <= pillX + pillW && my >= pillY && my <= pillY + pillH) {
            state.persistent.isMuted = !state.persistent.isMuted;
            window.Catnip.audio.setMuted(state.persistent.isMuted);
          }
        }
        return;
      }

      if (cs === GS.STORE) {
        const hit = hitTest(state.ui.storeLayout, mx, my);
        if (!hit) return;
        if (hit.type === 'back') {
          toMenuState(state);
          _buildMenuButtons(state);
        } else if (hit.type === 'tab') {
          switchTab(state, hit.id);
        } else if (hit.type === 'card') {
          state.ui.focusedItemId = hit.id;
        } else if (hit.type === 'buy') {
          const store = window.Catnip.store;
          if (store && store.buy) store.buy(hit.id, state);
        } else if (hit.type === 'equip') {
          const store = window.Catnip.store;
          if (store && store.equip) store.equip(hit.id, state);
        }
        return;
      }

      if (cs === GS.PLAYING) {
        if (state.run.gameOver) {
          window.Catnip.resetRunState();
          state.ui.currentState = GS.MENU;
          _buildMenuButtons(state);
          return;
        }
        if (!state.input.drag) return;
        const upX = mx;
        const upY = my;
        const dx = state.input.drag.x - upX;
        const dy = state.input.drag.y - upY;
        const m = Math.sqrt(dx * dx + dy * dy);
        if (m >= C.BALL_MIN_DRAG && state.run.ballsRemaining > 0) {
          const clampedM = Math.min(m, C.BALL_MAX_DRAG);
          const speed = (clampedM / C.BALL_MAX_DRAG) * C.BALL_MAX_SPEED;
          const ballType = state.run.powerupQueue.shift() || 'normal';
          state.run.activeBalls.push({
            x: C.THROWER_X,
            y: C.THROWER_Y - 10,
            vx: (dx / m) * speed,
            vy: (dy / m) * speed,
            bounces: 0,
            type: ballType,
            trail: [],
            shieldReflectCount: 0,
          });
          state.run.ballsRemaining--;
          state.run.pendingAudio.push('launch');
        }
        state.input.drag = null;
        state.input.dragCurrent = null;
      }
    });

    // ── pointercancel / pointerleave ───────────────────────────────────────────
    canvas.addEventListener('pointercancel', function () {
      state.input.drag = null;
      state.input.dragCurrent = null;
    });

    canvas.addEventListener('pointerleave', function () {
      state.ui.muteBtnHover = false;
      state.ui.menuHoverIndex = -1;
      state.ui.backHover = false;
      state.ui.hoveredItemId = null;
    });

    // ── keydown ────────────────────────────────────────────────────────────────
    document.addEventListener('keydown', function (e) {
      window.Catnip.audio.init();
      const cs = state.ui.currentState;

      if (cs === GS.MENU) {
        if (e.key === 'ArrowDown') {
          state.ui.menuFocusIndex = (state.ui.menuFocusIndex + 1) % state.ui.menuButtons.length;
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          state.ui.menuFocusIndex = (state.ui.menuFocusIndex - 1 + state.ui.menuButtons.length) % state.ui.menuButtons.length;
          e.preventDefault();
        } else if (e.key === 'Enter' || e.key === ' ') {
          _handleMenuSelect(state.ui.menuFocusIndex, state);
          e.preventDefault();
        }
        return;
      }

      if (cs === GS.SETTINGS || cs === GS.GUIDE) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          toMenuState(state);
          _buildMenuButtons(state);
        }
        return;
      }

      if (cs === GS.STORE) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          toMenuState(state);
          _buildMenuButtons(state);
          e.preventDefault();
        } else if (e.key === 'Tab') {
          const dir = e.shiftKey ? -1 : 1;
          const idx = STORE_TABS.indexOf(state.ui.focusedTab);
          switchTab(state, STORE_TABS[(idx + dir + STORE_TABS.length) % STORE_TABS.length]);
          e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
          moveFocusInRow(state, -1);
          e.preventDefault();
        } else if (e.key === 'ArrowRight') {
          moveFocusInRow(state, 1);
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          moveFocusInColumn(state, -1);
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          moveFocusInColumn(state, 1);
          e.preventDefault();
        } else if (e.key === 'Enter') {
          triggerFocusedItem(state);
          e.preventDefault();
        }
        return;
      }

      if (cs === GS.PLAYING) {
        if (e.key === 'Escape') {
          toMenuState(state);
          state.ui.menuFocusIndex = 0;
          state.ui.menuHoverIndex = -1;
          _buildMenuButtons(state);
          return;
        }
        if (e.key === 'r' || e.key === 'R') {
          window.Catnip.resetRunState();
        }
        if ((e.key === 'm' || e.key === 'M') && state.run.gameOver) {
          toMenuState(state);
          state.ui.menuFocusIndex = 0;
          state.ui.menuHoverIndex = -1;
          _buildMenuButtons(state);
        }
      }
    });
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  function _buildMenuButtons(state) {
    const btnW = 260;
    const btnH = 62;
    const gap = 78;
    const labels = ['Play Game', 'Store', 'Settings', 'Guide'];
    const totalH = (labels.length - 1) * gap + btnH;
    const startY = C.H / 2 - totalH / 2 - 20;
    state.ui.menuButtons = labels.map(function (label, i) {
      return {
        label: label,
        x: C.W / 2 - btnW / 2,
        y: startY + i * gap,
        w: btnW,
        h: btnH,
        index: i,
      };
    });
    state.ui.menuFocusIndex = 0;
    state.ui.menuHoverIndex = -1;
  }

  function _handleMenuSelect(index, state) {
    window.Catnip.audio.init();
    if (index === 0) {
      // Clear stale drag — Beast flag 9
      state.input.drag = null;
      state.input.dragCurrent = null;
      window.Catnip.resetRunState();
      state.ui.currentState = GS.PLAYING;
    } else if (index === 1) {
      state.ui.focusedTab = 'cats';
      state.ui.focusedItemId = null;
      state.ui.hoveredItemId = null;
      state.ui.storeLayout = [];
      state.ui.currentState = GS.STORE;
    } else if (index === 2) {
      state.ui.backHover = false;
      state.ui.currentState = GS.SETTINGS;
    } else if (index === 3) {
      state.ui.backHover = false;
      state.ui.currentState = GS.GUIDE;
    }
  }

  window.Catnip.input = {
    init: init,
    buildMenuButtons: _buildMenuButtons,
  };
}());
