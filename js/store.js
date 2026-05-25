(function () {
  if (!window.Catnip) throw new Error('store.js: window.Catnip missing — load constants.js first.');
  if (!window.Catnip.state) throw new Error('store.js: Catnip.state missing — load state.js before store.js.');

  var SAVE_KEY = 'catnip:save:v1';
  var DEFAULT_UNLOCKED = ['cat-default', 'ball-default', 'arena-default'];
  var DEFAULT_EQUIPPED = { catSkinId: 'cat-default', ballSkinId: 'ball-default', arenaId: 'arena-default', artifactId: null };

  function safeNonNegInt(val) {
    if (typeof val !== 'number' || !isFinite(val) || val < 0) return 0;
    return Math.floor(val);
  }

  function validateUnlockedIds(arr) {
    if (!Array.isArray(arr)) return DEFAULT_UNLOCKED.slice();
    var ids = arr.filter(function (x) { return typeof x === 'string'; });
    // Ensure all three defaults are always present
    DEFAULT_UNLOCKED.forEach(function (d) {
      if (ids.indexOf(d) === -1) ids.push(d);
    });
    return ids;
  }

  function validateEquipped(raw, unlockedIds) {
    var equipped = { catSkinId: 'cat-default', ballSkinId: 'ball-default', arenaId: 'arena-default', artifactId: null };
    if (!raw || typeof raw !== 'object') return equipped;

    if (typeof raw.catSkinId === 'string' && unlockedIds.indexOf(raw.catSkinId) !== -1) {
      equipped.catSkinId = raw.catSkinId;
    }
    if (typeof raw.ballSkinId === 'string' && unlockedIds.indexOf(raw.ballSkinId) !== -1) {
      equipped.ballSkinId = raw.ballSkinId;
    }
    if (typeof raw.arenaId === 'string' && unlockedIds.indexOf(raw.arenaId) !== -1) {
      equipped.arenaId = raw.arenaId;
    }
    // artifactId may be null or a string in unlockedIds
    if (raw.artifactId === null || (typeof raw.artifactId === 'string' && unlockedIds.indexOf(raw.artifactId) !== -1)) {
      equipped.artifactId = raw.artifactId;
    }
    return equipped;
  }

  function _applyDefaults(p) {
    p.coins = 0;
    p.lifetimeCoins = 0;
    p.highScore = 0;
    p.isMuted = false;
    p.unlockedIds = DEFAULT_UNLOCKED.slice();
    p.equipped = { catSkinId: 'cat-default', ballSkinId: 'ball-default', arenaId: 'arena-default', artifactId: null };
  }

  function loadState() {
    var p = window.Catnip.state.persistent;
    // Always reset to clean defaults first — saved values overwrite on top
    _applyDefaults(p);
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw === null) return;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;

      p.coins = safeNonNegInt(data.coins);
      p.lifetimeCoins = safeNonNegInt(data.lifetimeCoins);
      p.highScore = safeNonNegInt(data.highScore);
      p.isMuted = data.isMuted === true;
      p.unlockedIds = validateUnlockedIds(data.unlockedIds);
      p.equipped = validateEquipped(data.equipped, p.unlockedIds);
    } catch (e) {
      console.warn('catnip: loadState failed, using defaults.', e);
      _applyDefaults(p);
    }
  }

  function saveState() {
    try {
      var p = window.Catnip.state.persistent;
      var data = {
        version: 1,
        coins: p.coins,
        lifetimeCoins: p.lifetimeCoins,
        highScore: p.highScore,
        isMuted: p.isMuted,
        unlockedIds: p.unlockedIds,
        equipped: p.equipped,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('catnip: saveState failed.', e);
    }
  }

  function loadMutePref() {
    // Legacy key migration — reads old catnip:mute if new save absent
    try {
      if (localStorage.getItem(SAVE_KEY) !== null) return; // new save takes precedence
      var raw = localStorage.getItem('catnip:mute');
      if (raw !== null) {
        window.Catnip.state.persistent.isMuted = raw === '1';
      }
    } catch (e) {}
  }

  function saveMutePref() {
    saveState();
  }

  function _catalogForTab(tab) {
    var catalog = window.Catnip.catalog;
    if (tab === 'cats')      return catalog.cats;
    if (tab === 'balls')     return catalog.balls;
    if (tab === 'arenas')    return catalog.arenas;
    if (tab === 'artifacts') return catalog.artifacts;
    return [];
  }

  function _equippedKeyForTab(tab) {
    if (tab === 'cats')      return 'catSkinId';
    if (tab === 'balls')     return 'ballSkinId';
    if (tab === 'arenas')    return 'arenaId';
    if (tab === 'artifacts') return 'artifactId';
    return null;
  }

  function _tabForId(id) {
    var catalog = window.Catnip.catalog;
    if (catalog.cats.some(function(x) { return x.id === id; }))      return 'cats';
    if (catalog.balls.some(function(x) { return x.id === id; }))     return 'balls';
    if (catalog.arenas.some(function(x) { return x.id === id; }))    return 'arenas';
    if (catalog.artifacts.some(function(x) { return x.id === id; })) return 'artifacts';
    return null;
  }

  function _findItem(id) {
    var tab = _tabForId(id);
    if (!tab) return null;
    return _catalogForTab(tab).filter(function(x) { return x.id === id; })[0] || null;
  }

  function _setToast(state, text, color) {
    if (state && state.ui && state.ui.toast) {
      state.ui.toast.text = text;
      state.ui.toast.color = color || 'green';
      state.ui.toast.untilTime = Date.now() + 2000;
    }
  }

  function buy(id, state) {
    state = state || window.Catnip.state;
    var p = state.persistent;

    if (p.unlockedIds.indexOf(id) !== -1) {
      _setToast(state, 'Already unlocked!', 'gray');
      return false;
    }

    var item = _findItem(id);
    if (!item) {
      _setToast(state, 'Item not found.', 'red');
      return false;
    }

    // Check milestone requirement
    if (item.milestone) {
      var meetsReq = false;
      if (item.milestone === 'lifetimeCoins >= 500') {
        meetsReq = p.lifetimeCoins >= 500;
      }
      if (!meetsReq) {
        _setToast(state, 'Milestone not reached!', 'red');
        return false;
      }
    }

    if (p.coins < item.price) {
      _setToast(state, 'Not enough coins!', 'red');
      return false;
    }

    p.coins -= item.price;
    p.unlockedIds = p.unlockedIds.concat([id]);
    saveState();
    _setToast(state, 'Unlocked: ' + item.name + '!', 'green');
    return true;
  }

  function equip(id, state) {
    state = state || window.Catnip.state;
    var p = state.persistent;

    if (p.unlockedIds.indexOf(id) === -1) {
      _setToast(state, 'Not unlocked!', 'red');
      return false;
    }

    var tab = _tabForId(id);
    if (!tab) {
      _setToast(state, 'Item not found.', 'red');
      return false;
    }

    var key = _equippedKeyForTab(tab);
    if (!key) return false;

    p.equipped[key] = id;
    saveState();
    var item = _findItem(id);
    _setToast(state, 'Equipped: ' + (item ? item.name : id) + '!', 'green');
    return true;
  }

  function getTabItems(tab, state) {
    state = state || window.Catnip.state;
    var p = state.persistent;
    var items = _catalogForTab(tab);
    var equippedKey = _equippedKeyForTab(tab);
    return items.map(function(item) {
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        palette: item.palette || null,
        effect: item.effect || null,
        bumperLayout: item.bumperLayout || null,
        milestone: item.milestone || null,
        unlocked: p.unlockedIds.indexOf(item.id) !== -1,
        equipped: equippedKey ? p.equipped[equippedKey] === item.id : false,
      };
    });
  }

  window.Catnip.store = {
    loadState: loadState,
    saveState: saveState,
    loadMutePref: loadMutePref,
    saveMutePref: saveMutePref,
    buy: buy,
    equip: equip,
    getTabItems: getTabItems,
  };
}());
