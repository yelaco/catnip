(function () {
  if (!window.Catnip) window.Catnip = {};

  window.Catnip.constants = Object.freeze({
    W: 1280,
    H: 800,
    CAT_RADIUS: 24,
    CAT_INITIAL_SPEED: 180,
    CAT_SPEED_MULTIPLIER: 1.18,
    CAT_MAX_SPEED: 540,
    BALL_RADIUS: 8,
    BALL_MAX_SPEED: 700,
    BALL_MAX_DRAG: 200,
    BALL_MIN_DRAG: 20,
    BALL_DECAY_EARLY: 0.92,
    BALL_DECAY_LATE: 0.55,
    BALL_MIN_SPEED: 80,
    GUIDE_MAX_BOUNCES: 5,
    INITIAL_BALLS: 5,
    BALLS_PER_HIT: 2,
    WALL_THICKNESS: 8,
    THROWER_X: 640,   // W / 2
    THROWER_Y: 400,   // H / 2
    THROWER_RADIUS: 18,
    STAR_COUNT: 18,
    STAR_COLORS: ['#00f5ff','#ff00ff','#ffff00','#ff8c00','#00ff88','#bf5fff'],
    GameState: Object.freeze({
      MENU: 'menu',
      PLAYING: 'playing',
      SETTINGS: 'settings',
      GUIDE: 'guide',
      STORE: 'store',
    }),
    // Expansion constants
    BUMPER_RADIUS: 18,
    PARTICLE_POOL_MAX: 200,
    TRAIL_RING_LENGTH: 12,
    POWERUP_UNLOCK_EXPLOSIVE: 10,
    POWERUP_UNLOCK_MULTIBALL: 25,
    POWERUP_UNLOCK_MAGNET: 50,
    ABILITY_TIER_SHIELD: 2.0,
    ABILITY_TIER_CLONE: 2.5,
    ABILITY_DURATION_SHIELD: 4,
    ABILITY_DURATION_CLONE: 15.0,
    ABILITY_COOLDOWN_SHIELD: 12,
    ABILITY_COOLDOWN_CLONE: 12,
    CLONE_SPEED: 120,
    CLONE_SPAWN_INTERVAL: 6.0,
    CLONE_MAX_COUNT: 5,
    EXPLOSIVE_RADIUS: 80,
    EXPLOSIVE_LIFETIME: 0.4,
  });
}());
