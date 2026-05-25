(function () {
  if (!window.Catnip) throw new Error('catnip: window.Catnip missing — load constants.js first');
  if (!window.Catnip.constants) throw new Error('catnip: Catnip.constants missing — load constants.js before catalog.js');

  window.Catnip.catalog = Object.freeze({
    cats: Object.freeze([
      Object.freeze({
        id: 'cat-default',
        name: 'Default',
        price: 0,
        palette: Object.freeze({
          bodyColor: '#e8a87c',
          outlineColor: '#c47c3c',
          earInnerColor: '#f4c89e',
          eyeColor: '#4a9eff',
          accessory: null,
        }),
      }),
      Object.freeze({
        id: 'cat-tabby',
        name: 'Tabby',
        price: 25,
        palette: Object.freeze({
          bodyColor: '#d4893a',
          outlineColor: '#a05c20',
          earInnerColor: '#e8b07a',
          eyeColor: '#f5c542',
          accessory: null,
        }),
      }),
      Object.freeze({
        id: 'cat-tuxedo',
        name: 'Tuxedo',
        price: 50,
        palette: Object.freeze({
          bodyColor: '#1a1a1a',
          outlineColor: '#000000',
          earInnerColor: '#ff80c0',
          eyeColor: '#00e0ff',
          accessory: 'bowtie',
        }),
      }),
      Object.freeze({
        id: 'cat-void',
        name: 'Void',
        price: 200,
        milestone: 'lifetimeCoins >= 500',
        palette: Object.freeze({
          bodyColor: '#0d0010',
          outlineColor: '#3b0060',
          earInnerColor: '#7c00c8',
          eyeColor: '#bf5fff',
          accessory: 'crown',
        }),
      }),
    ]),

    balls: Object.freeze([
      Object.freeze({
        id: 'ball-default',
        name: 'Default',
        price: 0,
        palette: Object.freeze({
          fillColor: '#ffffff',
          strokeColor: '#cccccc',
          glowColor: 'rgba(255,255,255,0.3)',
          trailColor: 'rgba(255,255,255,0.15)',
        }),
      }),
      Object.freeze({
        id: 'ball-comet',
        name: 'Comet',
        price: 40,
        palette: Object.freeze({
          fillColor: '#ff8c00',
          strokeColor: '#cc5500',
          glowColor: 'rgba(255,140,0,0.4)',
          trailColor: 'rgba(255,180,60,0.35)',
        }),
      }),
      Object.freeze({
        id: 'ball-bubble',
        name: 'Bubble',
        price: 75,
        palette: Object.freeze({
          fillColor: 'rgba(100,220,255,0.45)',
          strokeColor: '#22d3ee',
          glowColor: 'rgba(100,220,255,0.25)',
          trailColor: null,
        }),
      }),
      Object.freeze({
        id: 'ball-prism',
        name: 'Prism',
        price: 150,
        palette: Object.freeze({
          fillColor: '#e040fb',
          strokeColor: '#aa00ff',
          glowColor: 'rgba(224,64,251,0.45)',
          trailColor: 'rgba(224,64,251,0.3)',
        }),
      }),
    ]),

    arenas: Object.freeze([
      Object.freeze({
        id: 'arena-default',
        name: 'Default',
        price: 0,
        palette: Object.freeze({
          bgColor: '#0d0d0f',
          gridColor: 'rgba(255,255,255,0.03)',
          wallHue: '#1a1a2e',
        }),
        bumperLayout: Object.freeze({
          count: 3,
          zones: Object.freeze([Object.freeze({ x: 200, y: 150, w: 600, h: 400 })]),
          movingCount: 0,
        }),
      }),
      Object.freeze({
        id: 'arena-cosmos',
        name: 'Cosmos',
        price: 60,
        palette: Object.freeze({
          bgColor: '#020818',
          gridColor: 'rgba(80,100,255,0.04)',
          wallHue: '#0a0a40',
        }),
        bumperLayout: Object.freeze({
          count: 5,
          zones: Object.freeze([Object.freeze({ x: 150, y: 100, w: 700, h: 500 })]),
          movingCount: 2,
        }),
      }),
      Object.freeze({
        id: 'arena-dojo',
        name: 'Dojo',
        price: 120,
        palette: Object.freeze({
          bgColor: '#1a0f08',
          gridColor: 'rgba(180,120,60,0.04)',
          wallHue: '#3d1f0a',
        }),
        bumperLayout: Object.freeze({
          count: 4,
          zones: Object.freeze([Object.freeze({ x: 180, y: 130, w: 640, h: 440 })]),
          movingCount: 1,
        }),
      }),
    ]),

    artifacts: Object.freeze([
      Object.freeze({
        id: 'artifact-lucky-paw',
        name: 'Lucky Paw',
        price: 100,
        effect: Object.freeze({ type: 'coin_per_hit_bonus', value: 1 }),
      }),
      Object.freeze({
        id: 'artifact-iron-claw',
        name: 'Iron Claw',
        price: 150,
        effect: Object.freeze({ type: 'starting_balls_bonus', value: 1 }),
      }),
      Object.freeze({
        id: 'artifact-slow-mo',
        name: 'Slow-Mo',
        price: 200,
        effect: Object.freeze({ type: 'cat_speed_cap_multiplier', value: 2.5 }),
      }),
    ]),
  });
}());
