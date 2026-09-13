/* ============================================================
   SHINOBI LIFE — real-time action combat engine
   Global namespace: window.Game.Combat
   ============================================================ */
(function () {
  'use strict';
  window.Game = window.Game || {};
  var Data = null, FX = null, Audio = null;

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function ang(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var S = null; // active arena state

  function makeCombatant(base) {
    return {
      x: base.x, y: base.y, r: base.r || 20,
      facing: 0,
      hp: base.hp, maxHp: base.hp,
      chakra: base.chakra || 0, maxChakra: base.maxChakra || 0,
      speed: base.speed || 200,
      baseDamage: base.baseDamage || 10,
      nature: base.nature || null,
      isPlayer: !!base.isPlayer,
      name: base.name || '???',
      color: base.color || '#ffffff',
      state: 'idle',
      comboIndex: 0, comboTimer: 0, attackTimer: 0, attackWindup: 0, recover: 0,
      dodgeTimer: 0, dodgeDir: { x: 0, y: 0 }, iframes: 0, dodgeCd: 0,
      guarding: false, guardHeldTime: 0,
      stagger: 0,
      cooldowns: {},
      jutsuIds: base.jutsuIds || [],
      aiType: base.aiType || 'balanced',
      aiTimer: 0.4,
      castingJutsu: null, castTimer: 0,
      shieldBlock: 0, shieldTimer: 0, healOverTime: 0,
      knockbackX: 0, knockbackY: 0,
      dead: false,
      hitFlash: 0,
      liveWireStreak: 0
    };
  }

  function start(opts) {
    Data = window.Game.Data; FX = window.Game.FX; Audio = window.Game.Audio;
    var profile = opts.profile;
    var stats = window.Game.Save.computeStats(profile);
    var village = Data.getVillage(profile.villageId);
    var clan = Data.getClan(profile.clanId);
    var w = opts.width, h = opts.height;

    var player = makeCombatant({
      x: w * 0.28, y: h * 0.6, r: 20,
      hp: stats.maxHp, chakra: stats.maxChakra, maxChakra: stats.maxChakra,
      speed: stats.moveSpeed, baseDamage: stats.baseDamage,
      nature: village ? village.nature : null,
      isPlayer: true, name: profile.name, color: village ? Data.NATURE_INFO[village.nature].color : '#eee'
    });

    var waves = opts.mission.enemyWaves.map(function (wave, wi) {
      return wave.map(function (eid, i) {
        var tpl = Data.getEnemy(eid);
        var c = makeCombatant({
          x: w * (0.68 + i * 0.08), y: h * (0.4 + i * 0.16), r: tpl.boss ? 30 : 20,
          hp: tpl.hp, chakra: 100, maxChakra: 100,
          speed: tpl.speed, baseDamage: tpl.damage,
          nature: tpl.nature, name: tpl.name, color: tpl.color,
          jutsuIds: tpl.jutsuIds || [], aiType: tpl.aiType
        });
        c.template = tpl;
        return c;
      });
    });

    S = {
      w: w, h: h,
      profile: profile,
      clan: clan,
      player: player,
      waves: waves,
      waveIndex: 0,
      enemies: waves[0].slice(),
      projectiles: [],
      telegraphs: [],
      time: 0,
      result: null, // 'victory' | 'defeat' | 'fled'
      onEnd: opts.onEnd,
      floatTimer: 0,
      totalXp: 0, totalGold: 0,
      shakeInherent: 0,
      finisherTimer: 0,
      introTimer: 1.2,
      log: []
    };
    return S;
  }

  function isActive() { return !!S && !S.result; }
  function getState() { return S; }

  function equippedJutsuList() {
    return (S.profile.equippedJutsu || []).map(function (id) { return id ? Data.getJutsu(id) : null; });
  }

  function nearestEnemy(from) {
    var best = null, bd = Infinity;
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.dead) continue;
      var d = dist(from, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function chakraRegenRate(c) {
    var base = 14;
    if (c.isPlayer && S.clan) {
      if (S.clan.id === 'emberfang' && c.hp / c.maxHp < 0.35) base *= 1.25;
    }
    return base;
  }

  function damageCombatant(target, amount, attacker, opts) {
    opts = opts || {};
    if (target.dead) return 0;
    var mult = 1;
    if (attacker && attacker.nature && target.nature) mult = Data.elementalMultiplier(attacker.nature, target.nature);
    var dmg = amount * mult;
    if (target.shieldTimer > 0) dmg *= (1 - target.shieldBlock);
    if (target.guarding && !opts.ignoreGuard) {
      var reduce = 0.55;
      if (target.isPlayer && S.clan && S.clan.id === 'ironhide') reduce += 0.15;
      dmg *= (1 - reduce);
    }
    if (opts.pierceGuard) dmg = Math.max(dmg, amount * opts.pierceGuard);
    if (target.iframes > 0) dmg = 0;
    dmg = Math.round(dmg);
    if (dmg > 0) {
      target.hp = clamp(target.hp - dmg, 0, target.maxHp);
      target.hitFlash = 0.15;
      target.stagger = Math.max(target.stagger, opts.stagger || 0.15);
      var color = mult > 1 ? '#ffd23f' : (mult < 1 ? '#9fd8ff' : '#ffffff');
      FX.floatText(target.x, target.y - target.r - 10, String(dmg), { color: opts.jutsu ? FX.natureColors(attacker.nature)[0] : color, size: opts.heavy ? 26 : 18, crit: mult > 1 });
      if (target === S.player) Audio.sfx.hurt();
    } else {
      FX.floatText(target.x, target.y - target.r - 10, 'BLOCK', { color: '#9fd8ff', size: 14 });
      Audio.sfx.block();
    }
    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      target.state = 'dead';
    }
    return dmg;
  }

  function knock(target, fromX, fromY, force) {
    var a = Math.atan2(target.y - fromY, target.x - fromX);
    target.knockbackX += Math.cos(a) * force;
    target.knockbackY += Math.sin(a) * force;
  }

  // ---------------- PLAYER CONTROL ----------------
  function updatePlayer(dt, keys) {
    var p = S.player;
    if (p.dead) return;

    // timers
    p.comboTimer = Math.max(0, p.comboTimer - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.attackWindup = Math.max(0, p.attackWindup - dt);
    p.recover = Math.max(0, p.recover - dt);
    p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
    p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    p.iframes = Math.max(0, p.iframes - dt);
    p.stagger = Math.max(0, p.stagger - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.shieldTimer = Math.max(0, p.shieldTimer - dt);
    if (p.healOverTime > 0 && p.shieldTimer > 0) p.hp = clamp(p.hp + p.healOverTime * dt, 0, p.maxHp);
    Object.keys(p.cooldowns).forEach(function (k) { p.cooldowns[k] = Math.max(0, p.cooldowns[k] - dt); });
    p.chakra = clamp(p.chakra + chakraRegenRate(p) * dt, 0, p.maxChakra);

    var target = nearestEnemy(p);
    if (target) p.facing = ang(p, target);

    var canAct = p.stagger <= 0 && p.dodgeTimer <= 0;

    // movement
    var mx = 0, my = 0;
    if (canAct && p.recover <= 0) {
      if (keys.w) my -= 1;
      if (keys.s) my += 1;
      if (keys.a) mx -= 1;
      if (keys.d) mx += 1;
    }
    var moving = mx !== 0 || my !== 0;
    if (moving) {
      var len = Math.sqrt(mx * mx + my * my);
      mx /= len; my /= len;
      if (!target) p.facing = Math.atan2(my, mx);
      var spMul = p.attackWindup > 0 ? 0.3 : 1;
      p.x += mx * p.speed * spMul * dt;
      p.y += my * p.speed * spMul * dt;
      p.state = 'move';
      p._stepTimer = (p._stepTimer || 0) - dt;
      if (p._stepTimer <= 0) { p._stepTimer = 0.28; FX.dustStep(p.x, p.y + p.r * 0.7); }
    } else if (p.attackTimer <= 0 && p.stagger <= 0 && p.dodgeTimer <= 0) {
      p.state = 'idle';
    }

    // dodge
    if (keys.dodgePressed && p.dodgeCd <= 0 && p.dodgeTimer <= 0 && p.recover <= 0) {
      var dx = mx, dy = my;
      if (dx === 0 && dy === 0) { dx = Math.cos(p.facing); dy = Math.sin(p.facing); }
      var l = Math.sqrt(dx * dx + dy * dy) || 1;
      p.dodgeDir = { x: dx / l, y: dy / l };
      var distMul = (S.clan && S.clan.id === 'galewalker') ? 1.3 : 1;
      p.dodgeDist = 210 * distMul;
      p.dodgeTimer = 0.28;
      p.iframes = 0.24;
      p.dodgeCd = 0.55;
      p.state = 'dodge';
      Audio.sfx.dodge();
      FX.dodgeAfterimage(p.x, p.y, p.color);
      if (S.clan && S.clan.id === 'galewalker') p.chakra = clamp(p.chakra + 6, 0, p.maxChakra);
    }
    if (p.dodgeTimer > 0) {
      var t = p.dodgeTimer / 0.28;
      var speed = p.dodgeDist / 0.28;
      p.x += p.dodgeDir.x * speed * dt;
      p.y += p.dodgeDir.y * speed * dt;
      if (Math.random() < 0.6) FX.dodgeAfterimage(p.x, p.y, p.color);
    }

    // guard
    p.guarding = !!keys.guard && canAct && p.attackTimer <= 0 && p.recover <= 0 && p.dodgeTimer <= 0;
    if (p.guarding) {
      p.guardHeldTime += dt;
      if (keys.guardJustPressed) { Audio.sfx.guardUp(); p.state = 'guard'; }
    } else {
      p.guardHeldTime = 0;
    }

    // taijutsu combo
    if (keys.attackPressed && canAct && p.recover <= 0) {
      p.comboIndex = p.comboTimer > 0 ? Math.min(p.comboIndex + 1, 2) : 0;
      p.comboTimer = 0.7;
      var heavy = p.comboIndex === 2;
      p.attackWindup = heavy ? 0.16 : 0.1;
      p.attackTimer = p.attackWindup + 0.12;
      p.recover = p.attackWindup + (heavy ? 0.32 : 0.2);
      p.state = 'attack';
      p._pendingHit = { heavy: heavy, applied: false };
      Audio.sfx.footstep();
    }
    if (p._pendingHit && !p._pendingHit.applied && p.attackWindup <= 0 && p.attackTimer > 0) {
      p._pendingHit.applied = true;
      var e = nearestEnemy(p);
      if (e && dist(p, e) < p.r + e.r + 62 && Math.abs(normalizeAngle(ang(p, e) - p.facing)) < 0.9) {
        var base = p.baseDamage * (p._pendingHit.heavy ? 1.9 : 1);
        damageCombatant(e, base, p, { heavy: p._pendingHit.heavy, stagger: p._pendingHit.heavy ? 0.35 : 0.15 });
        knock(e, p.x, p.y, p._pendingHit.heavy ? 140 : 70);
        FX.hitSpark(e.x, e.y, '#fff');
        FX.shake(p._pendingHit.heavy ? 7 : 3, 0.15);
        Audio.sfx.taijutsuHit(p._pendingHit.heavy);
        if (S.clan && S.clan.id === 'stormcaller') {
          p.liveWireStreak = (p.liveWireStreak || 0) + 1;
          if (p.liveWireStreak >= 3) {
            p.liveWireStreak = 0;
            castJutsuEffect(p, Data.getJutsu('lightning_static_jolt'), e, true);
          }
        }
      }
    }

    // jutsu casting via slots
    ['slot1', 'slot2', 'slot3'].forEach(function (slot, i) {
      if (keys[slot + 'Pressed'] && canAct && p.recover <= 0) {
        var jid = S.profile.equippedJutsu[i];
        if (!jid) return;
        var j = Data.getJutsu(jid);
        if (!j) return;
        var cdKey = j.id;
        if ((p.cooldowns[cdKey] || 0) > 0) return;
        if (p.chakra < j.chakraCost) { FX.floatText(p.x, p.y - p.r - 20, 'no chakra', { color: '#88aaff', size: 13 }); return; }
        p.chakra -= j.chakraCost;
        p.cooldowns[cdKey] = j.cooldown;
        p.recover = 0.22;
        p.state = 'jutsu';
        var tgt = nearestEnemy(p);
        castJutsuEffect(p, j, tgt, false);
      }
    });

    // bounds & knockback integration
    p.x += p.knockbackX * dt; p.y += p.knockbackY * dt;
    p.knockbackX = lerp(p.knockbackX, 0, Math.min(1, dt * 8));
    p.knockbackY = lerp(p.knockbackY, 0, Math.min(1, dt * 8));
    clampToArena(p);
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function clampToArena(c) {
    var pad = 50;
    c.x = clamp(c.x, pad, S.w - pad);
    c.y = clamp(c.y, pad + 70, S.h - pad);
  }

  // ---------------- JUTSU EFFECTS ----------------
  function castJutsuEffect(caster, j, target, free) {
    if (!free) Audio.sfx.jutsuCast(j.nature);
    FX.jutsuCastFX(caster.x, caster.y, j.nature);
    var dirAngle = target ? ang(caster, target) : caster.facing;
    caster.facing = dirAngle;

    switch (j.type) {
      case 'projectile': {
        var hits = j.hits || 1;
        for (var i = 0; i < hits; i++) {
          (function (idx) {
            setTimeout(function () {
              if (!S || S.result) return;
              var a = dirAngle + (hits > 1 ? (idx - (hits - 1) / 2) * 0.18 : 0);
              S.projectiles.push({
                x: caster.x, y: caster.y,
                vx: Math.cos(a) * j.speed, vy: Math.sin(a) * j.speed,
                r: j.radius, damage: j.damage * caster.baseDamage / 10,
                nature: j.nature, owner: caster, pierceGuard: j.pierceGuard,
                life: (j.range / j.speed), traveled: 0
              });
            }, idx * 90);
          })(i);
        }
        break;
      }
      case 'beam': {
        S.telegraphs.push({ type: 'beam-flash', x: caster.x, y: caster.y, angle: dirAngle, width: j.width, range: j.range, life: 0.18, nature: j.nature });
        var targets = caster.isPlayer ? S.enemies : [S.player];
        targets.forEach(function (t) {
          if (t.dead) return;
          var d = ang(caster, t);
          var dd = dist(caster, t);
          if (dd <= j.range && Math.abs(normalizeAngle(d - dirAngle)) < Math.atan2(j.width / 2, Math.max(dd, 1))) {
            damageCombatant(t, j.damage * caster.baseDamage / 10, caster, { jutsu: true, heavy: true, stagger: 0.3 });
            FX.jutsuImpactFX(t.x, t.y, j.nature);
            Audio.sfx.jutsuImpact(j.nature);
          }
        });
        break;
      }
      case 'dash': {
        var dashTargetX = target ? target.x - Math.cos(dirAngle) * (caster.r + (target.r || 20) + 10) : caster.x + Math.cos(dirAngle) * j.range;
        var dashTargetY = target ? target.y - Math.sin(dirAngle) * (caster.r + (target.r || 20) + 10) : caster.y + Math.sin(dirAngle) * j.range;
        caster._dashTo = { x: dashTargetX, y: dashTargetY, t: 0.14, elapsed: 0, jutsu: j, target: target };
        break;
      }
      case 'shield': {
        caster.shieldBlock = j.block;
        caster.shieldTimer = j.duration;
        caster.healOverTime = j.heal || 0;
        FX.floatText(caster.x, caster.y - caster.r - 24, 'GUARD UP', { color: '#9fd8ff', size: 14 });
        break;
      }
      case 'aoe': {
        S.telegraphs.push({ type: 'aoe-warn', x: caster.x, y: caster.y, radius: j.radius, life: 0.5, nature: j.nature, onDone: function () {
          var targets = caster.isPlayer ? S.enemies : [S.player];
          targets.forEach(function (t) {
            if (t.dead) return;
            if (dist(caster, t) <= j.radius + t.r) {
              damageCombatant(t, j.damage * caster.baseDamage / 10, caster, { jutsu: true, heavy: true, stagger: 0.4 });
              knock(t, caster.x, caster.y, 160);
              FX.jutsuImpactFX(t.x, t.y, j.nature);
            }
          });
          Audio.sfx.jutsuImpact(j.nature);
          FX.shake(14, 0.3);
        } });
        break;
      }
    }
  }

  function updateProjectiles(dt) {
    for (var i = S.projectiles.length - 1; i >= 0; i--) {
      var pr = S.projectiles[i];
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      pr.life -= dt;
      var targets = pr.owner.isPlayer ? S.enemies : [S.player];
      var hit = false;
      for (var j = 0; j < targets.length; j++) {
        var t = targets[j];
        if (t.dead) continue;
        if (dist(pr, t) < pr.r + t.r) {
          damageCombatant(t, pr.damage, pr.owner, { jutsu: true, pierceGuard: pr.pierceGuard });
          FX.jutsuImpactFX(t.x, t.y, pr.nature);
          Audio.sfx.jutsuImpact(pr.nature);
          hit = true;
          break;
        }
      }
      if (hit || pr.life <= 0 || pr.x < -20 || pr.x > S.w + 20 || pr.y < -20 || pr.y > S.h + 20) {
        S.projectiles.splice(i, 1);
      }
    }
  }

  function updateTelegraphs(dt) {
    for (var i = S.telegraphs.length - 1; i >= 0; i--) {
      var tg = S.telegraphs[i];
      tg.life -= dt;
      if (tg.life <= 0) {
        if (tg.onDone) tg.onDone();
        S.telegraphs.splice(i, 1);
      }
    }
  }

  function updateDash(c, dt) {
    if (!c._dashTo) return;
    var d = c._dashTo;
    d.elapsed += dt;
    var t = clamp(d.elapsed / d.t, 0, 1);
    c.x = lerp(c._dashFromX !== undefined ? c._dashFromX : c.x, d.x, t);
    c.y = lerp(c._dashFromY !== undefined ? c._dashFromY : c.y, d.y, t);
    if (d._fx === undefined) { d._fx = c.x; d._fy = c.y; c._dashFromX = c.x; c._dashFromY = c.y; }
    if (t >= 1) {
      if (d.target && !d.target.dead && dist(c, d.target) < c.r + d.target.r + 30) {
        damageCombatant(d.target, d.jutsu.damage * c.baseDamage / 10, c, { jutsu: true, heavy: true, stagger: 0.3 });
        knock(d.target, c.x, c.y, 120);
        FX.jutsuImpactFX(d.target.x, d.target.y, d.jutsu.nature);
        Audio.sfx.jutsuImpact(d.jutsu.nature);
      }
      c._dashTo = null; c._dashFromX = undefined; c._dashFromY = undefined;
    }
  }

  // ---------------- ENEMY AI ----------------
  function updateEnemy(e, dt) {
    if (e.dead) return;
    e.stagger = Math.max(0, e.stagger - dt);
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.recover = Math.max(0, e.recover - dt);
    e.attackTimer = Math.max(0, e.attackTimer - dt);
    e.attackWindup = Math.max(0, e.attackWindup - dt);
    e.shieldTimer = Math.max(0, e.shieldTimer - dt);
    Object.keys(e.cooldowns).forEach(function (k) { e.cooldowns[k] = Math.max(0, e.cooldowns[k] - dt); });
    e.chakra = clamp(e.chakra + 10 * dt, 0, e.maxChakra);
    updateDash(e, dt);

    var p = S.player;
    if (p.dead) return;
    e.facing = ang(e, p);
    var d = dist(e, p);

    if (e.stagger > 0 || e._dashTo || e.recover > 0) {
      e.x += e.knockbackX * dt; e.y += e.knockbackY * dt;
      e.knockbackX = lerp(e.knockbackX, 0, Math.min(1, dt * 8));
      e.knockbackY = lerp(e.knockbackY, 0, Math.min(1, dt * 8));
      clampToArena(e);
      return;
    }

    e.aiTimer -= dt;
    var preferredRange = e.aiType === 'ranged' ? 420 : (e.aiType === 'boss' ? 320 : 70);
    var availableJutsu = e.jutsuIds.map(function (id) { return Data.getJutsu(id); }).filter(function (j) { return j && (e.cooldowns[j.id] || 0) <= 0 && e.chakra >= j.chakraCost; });

    if (e.aiTimer <= 0) {
      e.aiTimer = 0.5 + Math.random() * 0.4;
      var lowHp = e.hp / e.maxHp < 0.3;
      if (availableJutsu.length && (d > 110 || lowHp || e.aiType === 'boss') && Math.random() < (e.aiType === 'boss' ? 0.65 : 0.4)) {
        var j = availableJutsu[(Math.random() * availableJutsu.length) | 0];
        e.chakra -= j.chakraCost;
        e.cooldowns[j.id] = j.cooldown;
        e.recover = 0.35;
        castJutsuEffect(e, j, p, false);
        return;
      }
      if (d < e.r + p.r + 60 && (e.cooldowns.melee || 0) <= 0) {
        e.cooldowns.melee = 0.9;
        e.attackWindup = 0.22;
        e.attackTimer = 0.34;
        e._meleePending = true;
      }
    }

    if (e._meleePending && e.attackWindup <= 0 && e.attackTimer > 0) {
      e._meleePending = false;
      if (dist(e, p) < e.r + p.r + 65) {
        damageCombatant(p, e.baseDamage, e, { stagger: 0.2 });
        knock(p, e.x, e.y, 90);
        FX.hitSpark(p.x, p.y, '#ff8080');
        FX.shake(6, 0.15);
        Audio.sfx.taijutsuHit(false);
      }
    }

    // movement: approach or retreat to preferred range
    if (e.attackWindup <= 0) {
      var lowHpRetreat = (e.hp / e.maxHp < 0.25) && e.aiType !== 'boss';
      var wantDist = lowHpRetreat ? preferredRange * 1.4 : preferredRange;
      var diff = d - wantDist;
      if (Math.abs(diff) > 20) {
        var dirx = (p.x - e.x) / (d || 1), diry = (p.y - e.y) / (d || 1);
        var sign = diff > 0 ? 1 : -1;
        e.x += dirx * sign * e.speed * dt;
        e.y += diry * sign * e.speed * dt;
        e.state = 'move';
      } else {
        e.state = 'idle';
      }
    }

    e.x += e.knockbackX * dt; e.y += e.knockbackY * dt;
    e.knockbackX = lerp(e.knockbackX, 0, Math.min(1, dt * 8));
    e.knockbackY = lerp(e.knockbackY, 0, Math.min(1, dt * 8));
    clampToArena(e);
  }

  // ---------------- MAIN UPDATE ----------------
  function update(rawDt, keys) {
    if (!S || S.result) return;
    var dt = FX.update(Math.min(rawDt, 0.05));
    S.time += dt;

    if (S.introTimer > 0) { S.introTimer -= dt; return; }

    updatePlayer(dt, keys);
    updateDash(S.player, dt);
    S.enemies.forEach(function (e) { updateEnemy(e, dt); });
    updateProjectiles(dt);
    updateTelegraphs(dt);

    // wave clear check
    if (S.enemies.every(function (e) { return e.dead; })) {
      S.waveIndex++;
      if (S.waveIndex < S.waves.length) {
        S.enemies = S.waves[S.waveIndex].slice();
        FX.floatText(S.w / 2, S.h * 0.3, 'Wave ' + (S.waveIndex + 1), { color: '#ffd23f', size: 28, life: 1.3 });
      } else if (!S.result) {
        S.result = 'victory';
        Audio.sfx.victory();
        endCombat();
      }
    }
    if (S.player.dead && !S.result) {
      S.result = 'defeat';
      Audio.sfx.defeat();
      endCombat();
    }
  }

  function endCombat() {
    if (S.result === 'victory') {
      S.enemies = [];
    }
    setTimeout(function () {
      if (S && S.onEnd) S.onEnd(S.result);
    }, S.result === 'victory' ? 1400 : 1200);
  }

  function flee() {
    if (!S || S.result) return;
    S.result = 'fled';
    if (S.onEnd) S.onEnd('fled');
  }

  // ---------------- RENDER ----------------
  function drawBar(ctx, x, y, w, h, pct, colorBg, colorFg, border) {
    ctx.fillStyle = colorBg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = colorFg;
    ctx.fillRect(x, y, w * clamp(pct, 0, 1), h);
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
  }

  function drawCombatant(ctx, c) {
    if (c.dead) return;
    ctx.save();
    ctx.translate(c.x, c.y);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, c.r * 0.85, c.r * 0.9, c.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();

    // guard shield ring
    if (c.shieldTimer > 0) {
      ctx.strokeStyle = 'rgba(120,200,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, c.r + 10, 0, Math.PI * 2); ctx.stroke();
    }
    if (c.guarding) {
      ctx.strokeStyle = 'rgba(200,220,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, c.r + 6, 0, Math.PI * 2); ctx.stroke();
    }

    var bodyColor = c.color;
    if (c.hitFlash > 0) bodyColor = '#ffffff';
    if (c.iframes > 0) ctx.globalAlpha = 0.5;

    // body (stylized cloaked ninja silhouette)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(0, -c.r);
    ctx.quadraticCurveTo(c.r, -c.r * 0.2, c.r * 0.7, c.r);
    ctx.lineTo(-c.r * 0.7, c.r);
    ctx.quadraticCurveTo(-c.r, -c.r * 0.2, 0, -c.r);
    ctx.fill();
    // headband
    ctx.fillStyle = 'rgba(20,20,25,0.85)';
    ctx.fillRect(-c.r * 0.7, -c.r * 0.15, c.r * 1.4, c.r * 0.28);
    // facing indicator (eyes)
    ctx.fillStyle = '#fff';
    var fx = Math.cos(c.facing) * c.r * 0.35, fy = Math.sin(c.facing) * c.r * 0.35;
    ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();

    // name/hp for enemies
    if (!c.isPlayer) {
      ctx.save();
      ctx.translate(c.x, c.y - c.r - 22);
      ctx.textAlign = 'center';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#eee';
      ctx.fillText(c.name, 0, 0);
      drawBar(ctx, -28, 5, 56, 6, c.hp / c.maxHp, 'rgba(0,0,0,0.5)', c.template && c.template.boss ? '#ff5555' : '#7bd66b', 'rgba(255,255,255,0.3)');
      ctx.restore();
    }
  }

  function render(ctx) {
    if (!S) return;
    var off = FX.getShakeOffset();
    ctx.save();
    ctx.translate(off.x, off.y);

    // arena floor
    var grad = ctx.createLinearGradient(0, 0, 0, S.h);
    grad.addColorStop(0, '#1b1f2a');
    grad.addColorStop(1, '#0c0e14');
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, S.w + 40, S.h + 40);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (var gx = 0; gx < S.w; gx += 60) { ctx.beginPath(); ctx.moveTo(gx, 60); ctx.lineTo(gx, S.h); ctx.stroke(); }
    for (var gy = 70; gy < S.h; gy += 60) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(S.w, gy); ctx.stroke(); }

    // telegraphs
    S.telegraphs.forEach(function (tg) {
      if (tg.type === 'aoe-warn') {
        var a = 0.25 + 0.35 * (1 - tg.life / 0.5);
        ctx.strokeStyle = FX.natureColors(tg.nature)[0];
        ctx.globalAlpha = a;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.radius * (1 - tg.life / 0.5), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (tg.type === 'beam-flash') {
        ctx.save();
        ctx.globalAlpha = clamp(tg.life / 0.18, 0, 1);
        ctx.strokeStyle = FX.natureColors(tg.nature)[0];
        ctx.lineWidth = tg.width;
        ctx.beginPath();
        ctx.moveTo(tg.x, tg.y);
        ctx.lineTo(tg.x + Math.cos(tg.angle) * tg.range, tg.y + Math.sin(tg.angle) * tg.range);
        ctx.stroke();
        ctx.restore();
      }
    });

    // projectiles
    S.projectiles.forEach(function (pr) {
      var colors = FX.natureColors(pr.nature);
      ctx.save();
      ctx.shadowColor = colors[0]; ctx.shadowBlur = 12;
      ctx.fillStyle = colors[0];
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    drawCombatant(ctx, S.player);
    S.enemies.forEach(function (e) { drawCombatant(ctx, e); });

    FX.draw(ctx);
    ctx.restore();

    drawHud(ctx);

    if (S.introTimer > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(S.introTimer / 1.2, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, S.w, S.h);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 34px "Segoe UI", sans-serif';
      ctx.fillText(S.waves.length > 1 ? 'Wave 1' : 'Engage!', S.w / 2, S.h / 2);
      ctx.restore();
    }

    if (S.result) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, S.w, S.h);
      ctx.textAlign = 'center';
      ctx.font = 'bold 48px "Segoe UI", sans-serif';
      ctx.fillStyle = S.result === 'victory' ? '#7bd66b' : '#ff5c5c';
      ctx.fillText(S.result === 'victory' ? 'VICTORY' : (S.result === 'defeat' ? 'DEFEATED' : 'RETREATED'), S.w / 2, S.h / 2);
      ctx.restore();
    }
  }

  function drawHud(ctx) {
    var p = S.player;
    ctx.save();
    // player hp/chakra
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(p.name, 20, 22);
    drawBar(ctx, 20, 28, 220, 16, p.hp / p.maxHp, 'rgba(0,0,0,0.5)', '#7bd66b', 'rgba(255,255,255,0.25)');
    drawBar(ctx, 20, 47, 220, 10, p.chakra / p.maxChakra, 'rgba(0,0,0,0.5)', '#4aa3ff', 'rgba(255,255,255,0.25)');

    // jutsu slots
    var jl = equippedJutsuList();
    for (var i = 0; i < 3; i++) {
      var j = jl[i];
      var bx = 20 + i * 62, by = 66;
      ctx.fillStyle = 'rgba(10,12,18,0.75)';
      ctx.fillRect(bx, by, 54, 54);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeRect(bx + 0.5, by + 0.5, 53, 53);
      if (j) {
        var cd = p.cooldowns[j.id] || 0;
        ctx.fillStyle = FX.natureColors(j.nature)[0];
        ctx.globalAlpha = cd > 0 ? 0.35 : (p.chakra >= j.chakraCost ? 1 : 0.4);
        ctx.beginPath(); ctx.arc(bx + 27, by + 22, 14, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(j.name.split(' ')[0], bx + 27, by + 46);
        if (cd > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(cd.toFixed(1), bx + 27, by + 26);
        }
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#88bfff';
        ctx.fillText(['U', 'I', 'O'][i], bx + 8, by + 12);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('empty', bx + 27, by + 30);
      }
      ctx.textAlign = 'left';
    }

    // boss hp bar top center
    var boss = S.enemies.filter(function (e) { return e.template && e.template.boss && !e.dead; })[0];
    if (boss) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcccc';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(boss.name, S.w / 2, 20);
      drawBar(ctx, S.w / 2 - 160, 26, 320, 14, boss.hp / boss.maxHp, 'rgba(0,0,0,0.5)', '#ff5555', 'rgba(255,255,255,0.3)');
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px sans-serif';
    ctx.fillText('WASD move · Space dodge · J attack · K guard · U I O jutsu · Esc flee', S.w - 16, S.h - 14);
    ctx.restore();
  }

  window.Game.Combat = {
    start: start,
    update: update,
    render: render,
    isActive: isActive,
    getState: getState,
    flee: flee
  };
})();
