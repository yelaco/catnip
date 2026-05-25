(function () {
  if (!window.Catnip) throw new Error('catnip: window.Catnip missing — load constants.js first');
  if (!window.Catnip.constants) throw new Error('catnip: Catnip.constants missing — load constants.js before state.js');

  const C = window.Catnip.constants;

  function makeDefaultPersistent() {
    return {
      version: 1,
      coins: 0,
      lifetimeCoins: 0,
      highScore: 0,
      isMuted: false,
      unlockedIds: ['cat-default', 'ball-default', 'arena-default'],
      equipped: {
        catSkinId: 'cat-default',
        ballSkinId: 'ball-default',
        arenaId: 'arena-default',
        artifactId: null,
      },
    };
  }

  function makeDefaultRun() {
    return {
      cat: null,
      activeBalls: [],
      score: 0,
      ballsRemaining: 0,
      gameOver: false,
      catHitFlash: 0,
      // Reset to false at TOP of frame() before physics — Beast flag 2
      catHitThisFrame: false,
      // Guards against double-award of +5 game-over bonus — Beast flag 5
      completionBonusAwarded: false,
      guideDashOffset: 0,
      comboPopups: [],
      particles: [],
      screenShake: 0,
      bumpers: [],
      powerupQueue: [],
      explosionZones: [],
      pendingAudio: [],
      clones: [],
    };
  }

  window.Catnip.state = {
    persistent: makeDefaultPersistent(),
    run: makeDefaultRun(),
    input: {
      drag: null,
      dragCurrent: null,
    },
    ui: {
      currentState: C.GameState.MENU,
      menuFocusIndex: 0,
      menuHoverIndex: -1,
      menuButtons: [],
      backButtonRect: { x: C.W / 2 - 80, y: C.H - 100, w: 160, h: 52 },
      backHover: false,
      muteBtnHover: false,
      stars: [],
      guideDashOffset: 0,
      // Store UI state
      focusedTab: 'cats',      // active tab: 'cats'|'balls'|'arenas'|'artifacts'
      focusedItemId: null,     // keyboard-focused item id (string) within current tab
      hoveredItemId: null,     // mouse-hovered item id (string)
      storeLayout: [],         // hit-test rects populated by drawStore each frame
      toast: { text: '', color: 'green', untilTime: 0 },
    },
  };

  // Resets run state AND clears stale input drag — Beast flag 9
  window.Catnip.resetRunState = function () {
    const state = window.Catnip.state;
    const run = makeDefaultRun();

    const angle = Math.random() * Math.PI * 2;
    const spd = C.CAT_INITIAL_SPEED;
    run.cat = {
      x: C.CAT_RADIUS + 10 + Math.random() * (C.W - 2 * (C.CAT_RADIUS + 10)),
      y: C.CAT_RADIUS + 10 + Math.random() * (C.H / 3 - 2 * (C.CAT_RADIUS + 10)),
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      speed: spd,
      r: C.CAT_RADIUS,
      // Ability state
      initialSpeed: spd,
      speedTier: 0,
      activeAbility: null,
      abilityTimer: 0,
      abilityCooldowns: { shield: 0, clone: 0 },
      pendingAbility: null,
    };
    run.ballsRemaining = C.INITIAL_BALLS;

    state.run = run;
    // Clear stale drag state (Beast flag 9)
    state.input.drag = null;
    state.input.dragCurrent = null;
  };
}());
