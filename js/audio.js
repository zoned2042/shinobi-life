/* ============================================================
   SHINOBI LIFE — procedural audio engine (Web Audio API only,
   no external sound files).
   Global namespace: window.Game.Audio
   ============================================================ */
(function () {
  'use strict';
  window.Game = window.Game || {};

  var ctx = null;
  var master = null;
  var sfxGain = null;
  var musicGain = null;
  var noiseBuffer = null;
  var muted = false;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.25;
    musicGain.connect(master);
    // pre-render a 1s white-noise buffer for whoosh/crackle sfx
    var len = ctx.sampleRate * 1;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function resume() {
    var c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function envGain(destination, startVal, t0, attack, decay, sustainVal, release, dur) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(startVal, 0.0001), t0 + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(sustainVal, 0.0001), t0 + attack + decay);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    g.connect(destination);
    return g;
  }

  function tone(freq, opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    var t0 = now();
    var dur = opts.dur || 0.15;
    var osc = ctx.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(opts.slideTo, 1), t0 + dur);
    var g = envGain(sfxGain, opts.peak || 0.5, t0, opts.attack || 0.005, opts.decay || 0.05, opts.sustain || 0.15, opts.release || 0.1, dur);
    osc.connect(g);
    osc.start(t0);
    osc.stop(t0 + dur + (opts.release || 0.1) + 0.05);
  }

  function noiseBurst(opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    var t0 = now();
    var dur = opts.dur || 0.2;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = opts.filterType || 'bandpass';
    filter.frequency.setValueAtTime(opts.freq || 1200, t0);
    if (opts.freqTo) filter.frequency.exponentialRampToValueAtTime(Math.max(opts.freqTo, 20), t0 + dur);
    filter.Q.value = opts.q || 1;
    var g = envGain(sfxGain, opts.peak || 0.4, t0, opts.attack || 0.005, opts.decay || 0.04, opts.sustain || 0.1, opts.release || 0.12, dur);
    src.connect(filter);
    filter.connect(g);
    src.start(t0);
    src.stop(t0 + dur + (opts.release || 0.12) + 0.05);
  }

  var SFX = {
    uiClick: function () { tone(520, { type: 'square', dur: 0.05, peak: 0.15, decay: 0.02 }); },
    uiHover: function () { tone(700, { type: 'sine', dur: 0.03, peak: 0.06 }); },
    footstep: function () { noiseBurst({ dur: 0.05, freq: 300, freqTo: 120, peak: 0.08, filterType: 'lowpass' }); },
    dodge: function () { noiseBurst({ dur: 0.22, freq: 1800, freqTo: 400, peak: 0.3, filterType: 'bandpass' }); },
    guardUp: function () { tone(220, { type: 'triangle', dur: 0.08, peak: 0.25 }); },
    parry: function () { tone(1400, { type: 'square', dur: 0.09, peak: 0.35 }); noiseBurst({ dur: 0.08, freq: 3000, peak: 0.2 }); },
    taijutsuHit: function (heavy) {
      noiseBurst({ dur: heavy ? 0.14 : 0.08, freq: heavy ? 500 : 900, freqTo: heavy ? 150 : 300, peak: heavy ? 0.5 : 0.32, filterType: 'lowpass' });
      tone(heavy ? 110 : 180, { type: 'triangle', dur: 0.08, peak: heavy ? 0.35 : 0.2 });
    },
    hurt: function () { tone(150, { type: 'sawtooth', dur: 0.15, peak: 0.25, slideTo: 90 }); },
    block: function () { noiseBurst({ dur: 0.1, freq: 2200, peak: 0.3, filterType: 'highpass' }); },
    jutsuCast: function (nature) {
      switch (nature) {
        case 'fire':
          noiseBurst({ dur: 0.3, freq: 800, freqTo: 200, peak: 0.35, filterType: 'lowpass' });
          tone(90, { type: 'sawtooth', dur: 0.3, peak: 0.25 });
          break;
        case 'wind':
          noiseBurst({ dur: 0.28, freq: 3000, freqTo: 1200, peak: 0.3, filterType: 'highpass' });
          break;
        case 'lightning':
          tone(1800, { type: 'square', dur: 0.06, peak: 0.3 });
          setTimeout(function () { tone(2400, { type: 'square', dur: 0.05, peak: 0.25 }); }, 40);
          noiseBurst({ dur: 0.12, freq: 4000, peak: 0.25 });
          break;
        case 'earth':
          tone(70, { type: 'sawtooth', dur: 0.35, peak: 0.35 });
          noiseBurst({ dur: 0.3, freq: 300, freqTo: 100, peak: 0.3, filterType: 'lowpass' });
          break;
        case 'water':
          noiseBurst({ dur: 0.35, freq: 1200, freqTo: 500, peak: 0.28, filterType: 'bandpass' });
          tone(300, { type: 'sine', dur: 0.3, peak: 0.15, slideTo: 180 });
          break;
        default:
          tone(440, { type: 'sine', dur: 0.2, peak: 0.2 });
      }
    },
    jutsuImpact: function (nature) {
      noiseBurst({ dur: 0.2, freq: 900, freqTo: 200, peak: 0.4, filterType: 'lowpass' });
      var f = { fire: 130, wind: 500, lightning: 700, earth: 90, water: 260 }[nature] || 220;
      tone(f, { type: 'triangle', dur: 0.15, peak: 0.3 });
    },
    victory: function () {
      var notes = [392, 494, 587, 784];
      notes.forEach(function (f, i) {
        setTimeout(function () { tone(f, { type: 'triangle', dur: 0.25, peak: 0.3, attack: 0.01 }); }, i * 110);
      });
    },
    defeat: function () {
      var notes = [330, 294, 247, 196];
      notes.forEach(function (f, i) {
        setTimeout(function () { tone(f, { type: 'sawtooth', dur: 0.35, peak: 0.25, attack: 0.02 }); }, i * 150);
      });
    },
    rankUp: function () {
      var notes = [523, 659, 784, 1046];
      notes.forEach(function (f, i) {
        setTimeout(function () { tone(f, { type: 'sine', dur: 0.3, peak: 0.28 }); }, i * 90);
      });
    },
    trainTick: function (good) {
      tone(good ? 900 : 260, { type: 'square', dur: 0.08, peak: 0.25 });
    }
  };

  // simple looping ambient drone; returns stop() function
  function startAmbient(baseFreq) {
    if (!ctx) return function () {};
    var o1 = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    o1.type = 'sine'; o2.type = 'sine';
    o1.frequency.value = baseFreq || 80;
    o2.frequency.value = (baseFreq || 80) * 1.5;
    var g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime(0.06, now() + 2);
    o1.connect(g); o2.connect(g); g.connect(musicGain);
    o1.start(); o2.start();
    return function stop() {
      var t = now();
      g.gain.linearRampToValueAtTime(0.0001, t + 1);
      o1.stop(t + 1.1); o2.stop(t + 1.1);
    };
  }

  window.Game.Audio = {
    init: resume,
    resume: resume,
    sfx: SFX,
    startAmbient: startAmbient,
    setMuted: function (m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
    isMuted: function () { return muted; }
  };
})();
