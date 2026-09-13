/* ============================================================
   SHINOBI LIFE — particle / VFX system
   Global namespace: window.Game.FX
   ============================================================ */
(function () {
  'use strict';
  window.Game = window.Game || {};

  var particles = [];
  var floaters = []; // floating damage / text numbers
  var shakeTime = 0;
  var shakeMag = 0;
  var hitStopTime = 0;

  function spawn(opts) {
    var count = opts.count || 1;
    for (var i = 0; i < count; i++) {
      var ang = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread || Math.PI * 2)
                                          : Math.random() * Math.PI * 2;
      var spd = (opts.speedMin || 40) + Math.random() * ((opts.speedMax || 160) - (opts.speedMin || 40));
      particles.push({
        x: opts.x, y: opts.y,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        life: opts.life || 0.5, maxLife: opts.life || 0.5,
        size: (opts.size || 4) * (0.7 + Math.random() * 0.6),
        color: Array.isArray(opts.color) ? opts.color[(Math.random() * opts.color.length) | 0] : opts.color,
        gravity: opts.gravity || 0,
        drag: opts.drag !== undefined ? opts.drag : 2.0,
        shape: opts.shape || 'circle',
        fade: opts.fade !== false
      });
    }
  }

  function floatText(x, y, text, opts) {
    opts = opts || {};
    floaters.push({
      x: x, y: y, text: text,
      color: opts.color || '#ffffff',
      size: opts.size || 20,
      vy: opts.vy !== undefined ? opts.vy : -55,
      life: opts.life || 0.9, maxLife: opts.life || 0.9,
      crit: !!opts.crit
    });
  }

  function shake(mag, time) {
    shakeMag = Math.max(shakeMag, mag);
    shakeTime = Math.max(shakeTime, time);
  }

  function hitStop(t) { hitStopTime = Math.max(hitStopTime, t); }

  function getShakeOffset() {
    if (shakeTime <= 0) return { x: 0, y: 0 };
    var m = shakeMag * (shakeTime > 0.5 ? 1 : shakeTime / 0.5);
    return { x: (Math.random() - 0.5) * m, y: (Math.random() - 0.5) * m };
  }

  // Returns effective dt after applying hit-stop slowdown; also decays timers.
  function update(rawDt) {
    var dt = rawDt;
    if (hitStopTime > 0) {
      hitStopTime -= rawDt;
      dt = rawDt * 0.08;
    }
    if (shakeTime > 0) shakeTime -= rawDt;

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt * 0.3;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (var j = floaters.length - 1; j >= 0; j--) {
      var f = floaters[j];
      f.life -= dt;
      if (f.life <= 0) { floaters.splice(j, 1); continue; }
      f.y += f.vy * dt;
      f.vy *= (1 - 1.5 * dt);
    }
    return dt;
  }

  function draw(ctx) {
    ctx.save();
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'square') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a + p.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    for (var j = 0; j < floaters.length; j++) {
      var f = floaters[j];
      var a = Math.max(0, f.life / f.maxLife);
      ctx.globalAlpha = a;
      ctx.font = (f.crit ? 'bold ' : '') + f.size + 'px "Segoe UI", sans-serif';
      ctx.fillStyle = '#000';
      ctx.fillText(f.text, f.x + 2, f.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---- preset effect bundles ----
  function natureColors(nature) {
    var map = {
      fire: ['#ff6a3d', '#ffb35c', '#ffe07a'],
      wind: ['#e8fbff', '#ffffff', '#bfeeff'],
      lightning: ['#f5e642', '#fff9b0', '#ffffff'],
      earth: ['#b98a4b', '#8a6d3b', '#e0bd82'],
      water: ['#3da9ff', '#9fdcff', '#dff3ff']
    };
    return map[nature] || ['#ffffff', '#cccccc'];
  }

  function hitSpark(x, y, color) {
    spawn({ x: x, y: y, count: 10, color: color || '#ffffff', speedMin: 80, speedMax: 260, life: 0.35, size: 3, drag: 3 });
  }

  function jutsuCastFX(x, y, nature) {
    spawn({ x: x, y: y, count: 18, color: natureColors(nature), speedMin: 30, speedMax: 140, life: 0.5, size: 5, drag: 1.5 });
  }

  function jutsuImpactFX(x, y, nature) {
    spawn({ x: x, y: y, count: 26, color: natureColors(nature), speedMin: 100, speedMax: 320, life: 0.55, size: 5, drag: 2.2 });
    shake(10, 0.25);
    hitStop(0.05);
  }

  function dodgeAfterimage(x, y, color) {
    spawn({ x: x, y: y, count: 3, color: color || '#88ccff', speedMin: 5, speedMax: 20, life: 0.3, size: 8, drag: 3, shape: 'square' });
  }

  function dustStep(x, y) {
    spawn({ x: x, y: y, count: 2, color: '#8a8a7a', speedMin: 10, speedMax: 40, life: 0.35, size: 3, gravity: 20, drag: 2 });
  }

  function ember(x, y) {
    spawn({ x: x, y: y, count: 1, color: ['#ff6a3d', '#ffb35c'], speedMin: 10, speedMax: 30, life: 2.5, size: 2.5, gravity: -8, drag: 0.3, fade: true });
  }

  function clear() { particles.length = 0; floaters.length = 0; shakeTime = 0; shakeMag = 0; hitStopTime = 0; }

  window.Game.FX = {
    spawn: spawn,
    floatText: floatText,
    shake: shake,
    hitStop: hitStop,
    getShakeOffset: getShakeOffset,
    update: update,
    draw: draw,
    natureColors: natureColors,
    hitSpark: hitSpark,
    jutsuCastFX: jutsuCastFX,
    jutsuImpactFX: jutsuImpactFX,
    dodgeAfterimage: dodgeAfterimage,
    dustStep: dustStep,
    ember: ember,
    clear: clear
  };
})();
