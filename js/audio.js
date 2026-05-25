(function () {
  if (!window.Catnip) throw new Error('audio.js: window.Catnip missing — load constants.js first.');
  if (!window.Catnip.state) throw new Error('audio.js: Catnip.state missing — load state.js before audio.js.');

  var audioCtx = null;
  var masterGain = null;

  function init() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = window.Catnip.state.persistent.isMuted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
  }

  function setMuted(isMuted) {
    if (masterGain) masterGain.gain.value = isMuted ? 0 : 1;
  }

  function playLaunch() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  }

  function playBounce() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
  }

  function playCatHit(bounces) {
    if (!audioCtx) return;
    var pitch = 200 + (bounces || 0) * 50;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
  }

  function playGameOver() {
    if (!audioCtx) return;
    [400, 300, 200, 100].forEach(function (freq, i) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var t = audioCtx.currentTime + i * 0.15;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain); gain.connect(masterGain);
      osc.start(t); osc.stop(t + 0.15);
    });
  }

  function playPowerUp() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
  }

  function playBumperHit() {
    if (!audioCtx) return;
    var bufSize = audioCtx.sampleRate * 0.04;
    var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    var src = audioCtx.createBufferSource();
    src.buffer = buf;
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    var gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
    src.connect(filter); filter.connect(gain); gain.connect(masterGain);
    src.start(); src.stop(audioCtx.currentTime + 0.04);
  }

  // toneIndex: 0=shield(400Hz square), 1=clone(600Hz square), 2=unused(800Hz square)
  function playAbilityTone(toneIndex) {
    if (!audioCtx) return;
    var freqs = [400, 600, 800];
    var freq = freqs[toneIndex] || 400;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
  }

  function playPurchaseChime() {
    if (!audioCtx) return;
    // C-major arpeggio: C4, E4, G4, C5
    var notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach(function (freq, i) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var t = audioCtx.currentTime + i * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain); gain.connect(masterGain);
      osc.start(t); osc.stop(t + 0.18);
    });
  }

  // Drains state.run.pendingAudio[] once per frame — called by game.js after physics
  function drainPendingAudio(state) {
    var queue = state.run.pendingAudio;
    for (var i = 0; i < queue.length; i++) {
      var ev = queue[i];
      if (ev === 'bounce') {
        playBounce();
      } else if (ev === 'launch') {
        playLaunch();
      } else if (ev === 'gameOver' || ev === 'game_over') {
        playGameOver();
      } else if (ev === 'powerup') {
        playPowerUp();
      } else if (ev === 'bumperHit') {
        playBumperHit();
      } else if (ev === 'purchaseChime') {
        playPurchaseChime();
      } else if (ev.indexOf('cat_hit:') === 0) {
        var bounces = parseInt(ev.slice(8), 10) || 0;
        playCatHit(bounces);
      } else if (ev.indexOf('abilityTone:') === 0) {
        var idx = parseInt(ev.slice(12), 10) || 0;
        playAbilityTone(idx);
      }
    }
    state.run.pendingAudio = [];
  }

  window.Catnip.audio = {
    init: init,
    setMuted: setMuted,
    drainPendingAudio: drainPendingAudio,
    playLaunch: playLaunch,
    playBounce: playBounce,
    playCatHit: playCatHit,
    playGameOver: playGameOver,
    playPowerUp: playPowerUp,
    playBumperHit: playBumperHit,
    playAbilityTone: playAbilityTone,
    playPurchaseChime: playPurchaseChime,
  };
}());
