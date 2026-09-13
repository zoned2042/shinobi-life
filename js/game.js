/* ============================================================
   SHINOBI LIFE — game state machine, menus, world map, training
   ============================================================ */
(function () {
  'use strict';
  var Data, FX, Audio, Save, Combat;

  var canvas, ctx;
  var state = {
    screen: 'title',
    profile: null,
    createVillage: null,
    createName: 'Shinobi',
    mapVillage: null,
    currentMissionPreview: null,
    currentMission: null,
    lastResultSummary: null,
    train: null
  };

  var TIER_RANK_REQ = [0, 0, 1, 2];
  var TIER_LEVEL_REQ = [0, 4, 8, 14];
  var TIER_COST = [1, 2, 3, 5];
  var RANK_EXAMS = ['chunin_hunter', 'jonin_duelist', 'boss_ember_general', 'boss_stormlord'];
  var RANK_COLORS = { D: '#7bd66b', C: '#4aa3ff', B: '#f5e642', A: '#ff9a3d', S: '#ff5c5c', RANK: '#ff5c5c' };

  var keyState = {}, prevKeyState = {};
  var lastTs = 0;
  var ambientTimer = 0;

  // ---------------- boot ----------------
  function boot() {
    Data = window.Game.Data; FX = window.Game.FX; Audio = window.Game.Audio; Save = window.Game.Save; Combat = window.Game.Combat;
    canvas = document.getElementById('stage');
    ctx = canvas.getContext('2d');

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', function () { Audio.resume(); });
    window.addEventListener('keydown', function () { Audio.resume(); });

    var muteBtn = document.getElementById('mute-btn');
    muteBtn.addEventListener('click', function () {
      var m = !Audio.isMuted();
      Audio.setMuted(m);
      muteBtn.textContent = m ? '🔇' : '🔊';
    });

    var existing = Save.load();
    if (existing) state.profile = existing;

    setScreen('title');
    requestAnimationFrame(frame);
  }

  function onKeyDown(e) {
    var active = document.activeElement;
    if (active && active.tagName === 'INPUT') {
      if (e.code === 'Escape') active.blur();
      return;
    }
    var gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyJ', 'KeyK', 'KeyU', 'KeyI', 'KeyO', 'Escape'];
    if (gameKeys.indexOf(e.code) >= 0) e.preventDefault();
    keyState[e.code] = true;
    if (e.code === 'Space' && state.screen === 'train') trainStrike();
  }
  function onKeyUp(e) { keyState[e.code] = false; }

  function buildFrameKeys() {
    var k = {
      w: !!(keyState.KeyW || keyState.ArrowUp),
      a: !!(keyState.KeyA || keyState.ArrowLeft),
      s: !!(keyState.KeyS || keyState.ArrowDown),
      d: !!(keyState.KeyD || keyState.ArrowRight),
      guard: !!keyState.KeyK,
      guardJustPressed: !!keyState.KeyK && !prevKeyState.KeyK,
      dodgePressed: !!keyState.Space && !prevKeyState.Space,
      attackPressed: !!keyState.KeyJ && !prevKeyState.KeyJ,
      slot1Pressed: !!keyState.KeyU && !prevKeyState.KeyU,
      slot2Pressed: !!keyState.KeyI && !prevKeyState.KeyI,
      slot3Pressed: !!keyState.KeyO && !prevKeyState.KeyO,
      escPressed: !!keyState.Escape && !prevKeyState.Escape
    };
    prevKeyState = { KeyW: keyState.KeyW, KeyA: keyState.KeyA, KeyS: keyState.KeyS, KeyD: keyState.KeyD,
      KeyK: keyState.KeyK, Space: keyState.Space, KeyJ: keyState.KeyJ, KeyU: keyState.KeyU,
      KeyI: keyState.KeyI, KeyO: keyState.KeyO, Escape: keyState.Escape };
    return k;
  }

  // ---------------- canvas / loop ----------------
  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth, h = window.innerHeight;
    if (canvas._cw === w && canvas._ch === h) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas._cw = w; canvas._ch = h; canvas._dpr = dpr;
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastTs) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    resizeCanvas();
    var dpr = canvas._dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas._cw, canvas._ch);

    var keys = buildFrameKeys();

    if (state.screen === 'combat') {
      Combat.update(dt, keys);
      Combat.render(ctx);
      if (keys.escPressed) Combat.flee();
    } else {
      if (state.screen === 'train') updateTrain(dt);
      renderAmbient(dt);
    }
  }

  function renderAmbient(dt) {
    var w = canvas._cw, h = canvas._ch;
    ambientTimer -= dt;
    if (ambientTimer <= 0) { ambientTimer = 0.12; FX.ember(Math.random() * w, h + 10); }
    FX.update(dt);
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#141721');
    grad.addColorStop(1, '#05060a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    FX.draw(ctx);
  }

  // ---------------- screen management ----------------
  function setScreen(name) {
    state.screen = name;
    render();
  }

  function render() {
    var root = document.getElementById('ui-root');
    if (state.screen === 'combat') { root.classList.add('hidden'); root.innerHTML = ''; return; }
    root.classList.remove('hidden');
    switch (state.screen) {
      case 'title': root.innerHTML = renderTitle(); break;
      case 'create': root.innerHTML = renderCreate(); break;
      case 'hub': root.innerHTML = renderHub(); break;
      case 'map': root.innerHTML = renderMap(); break;
      case 'missions': root.innerHTML = renderMissions(); break;
      case 'missionIntro': root.innerHTML = renderMissionIntro(); break;
      case 'train': root.innerHTML = renderTrain(); break;
      case 'jutsu': root.innerHTML = renderJutsu(); break;
      case 'dojo': root.innerHTML = renderDojo(); break;
      case 'results': root.innerHTML = renderResults(); break;
      default: root.innerHTML = '';
    }
  }

  function toast(msg) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity 0.3s';
      el.style.opacity = '0';
      setTimeout(function () { if (el.parentNode) root.removeChild(el); }, 300);
    }, 2200);
  }

  // ---------------- TITLE ----------------
  function renderTitle() {
    var hasSave = Save.hasSave();
    return '' +
      '<div class="panel title-screen">' +
        '<div class="game-logo">SHINOBI LIFE</div>' +
        '<div class="game-tagline">An Original Action-RPG of Hidden Villages &amp; Chakra</div>' +
        (hasSave ?
          '<div class="btn-row">' +
            '<button class="btn btn-primary" onclick="UI.continueGame()">Continue Your Path</button>' +
            '<button class="btn" onclick="UI.newGamePrompt()">New Shinobi</button>' +
          '</div>' :
          '<div class="btn-row"><button class="btn btn-primary" onclick="UI.startCreate()">Begin Your Journey</button></div>') +
        '<div class="hint">WASD move &middot; Space dodge &middot; J taijutsu &middot; K guard &middot; U I O jutsu</div>' +
      '</div>';
  }

  function continueGame() { if (state.profile) setScreen('hub'); }
  function newGamePrompt() {
    if (Save.hasSave() && !window.confirm('Starting a new shinobi will erase your current save. Continue?')) return;
    Save.clear();
    state.profile = null;
    startCreate();
  }
  function startCreate() { state.createVillage = null; state.createName = 'Shinobi'; setScreen('create'); }

  // ---------------- CHARACTER CREATION ----------------
  function renderCreate() {
    var villages = Data.VILLAGES;
    var cards = villages.map(function (v) {
      var clan = Data.CLANS.filter(function (c) { return c.village === v.id; })[0];
      var info = Data.NATURE_INFO[v.nature];
      var sel = state.createVillage === v.id;
      return '<div class="village-card' + (sel ? ' selected' : '') + '" style="--nature-color:' + info.color + '" onclick="UI.selectVillage(\'' + v.id + '\')">' +
        '<div class="village-name">' + v.name + '</div>' +
        '<div class="village-nature">' + info.name + ' Village</div>' +
        '<div class="village-desc">' + v.desc + '</div>' +
        (clan ? '<div class="clan-block"><div class="clan-name">' + clan.name + ' Clan</div><div class="clan-passive">' + clan.passiveName + ': ' + clan.passiveDesc + '</div></div>' : '') +
      '</div>';
    }).join('');

    return '' +
      '<div class="panel" style="max-width:720px;">' +
        '<div class="screen-title">Character Creation</div>' +
        '<div class="screen-heading">Who will you become?</div>' +
        '<label style="font-size:12px;color:var(--text-dim);">Shinobi Name</label>' +
        '<input class="text-input" maxlength="16" value="' + escapeHtml(state.createName) + '" oninput="UI.setCreateName(this.value)" placeholder="Enter your name" />' +
        '<label style="font-size:12px;color:var(--text-dim);">Choose your home village &amp; bloodline</label>' +
        '<div class="card-grid">' + cards + '</div>' +
        '<div class="btn-row">' +
          '<button class="btn btn-primary" ' + (state.createVillage ? '' : 'disabled') + ' onclick="UI.confirmCreate()">Take the Oath</button>' +
        '</div>' +
      '</div>';
  }

  function setCreateName(v) { state.createName = v.slice(0, 16); }
  function selectVillage(id) { state.createVillage = id; render(); }
  function confirmCreate() {
    if (!state.createVillage) return;
    var clan = Data.CLANS.filter(function (c) { return c.village === state.createVillage; })[0];
    var name = (state.createName || '').trim() || 'Shinobi';
    state.profile = Save.newProfile(name, state.createVillage, clan.id);
    Save.save(state.profile);
    toast('Welcome, ' + name + ' of ' + Data.getVillage(state.createVillage).name + '!');
    setScreen('hub');
  }

  // ---------------- HUB ----------------
  function renderHub() {
    var p = state.profile;
    var village = Data.getVillage(p.villageId);
    var clan = Data.getClan(p.clanId);
    var rank = Data.RANKS[p.rankIndex];
    var nextRank = Data.RANKS[p.rankIndex + 1];
    var xpPct = nextRank ? clamp01(p.xp / rank.xpToNext) : 1;
    var dojoReady = nextRank && p.xp >= rank.xpToNext;

    return '' +
      '<div class="panel" style="max-width:760px; width:100%;">' +
        '<div class="screen-title">' + village.name + ' &middot; ' + clan.name + ' Clan</div>' +
        '<div class="screen-heading">' + p.name + '</div>' +
        '<div class="stat-strip">' +
          '<span>Rank: <b>' + rank.name + '</b></span>' +
          '<span>Gold: <b>' + p.gold + '</b></span>' +
          '<span>Training Points: <b>' + p.trainingPoints + '</b></span>' +
          '<span>' + Data.NATURE_INFO[village.nature].name + ' Level: <b>' + (p.natureLevels[village.nature] || 0) + '</b></span>' +
        '</div>' +
        (nextRank ? '<div class="progress-bar"><div style="width:' + (xpPct * 100) + '%"></div></div><div class="hint">' + p.xp + ' / ' + rank.xpToNext + ' XP to ' + nextRank.name + '</div>' : '<div class="hint">You have reached the pinnacle rank: Village Shadow.</div>') +
        '<div class="hub-grid">' +
          '<div class="hub-btn" onclick="UI.openMap()"><span class="icon">🏞️</span><span class="label">World Map</span><span class="sub">Travel &amp; accept missions</span></div>' +
          '<div class="hub-btn" onclick="UI.openTrain()"><span class="icon">🔥</span><span class="label">Chakra Training</span><span class="sub">Raise your ' + Data.NATURE_INFO[village.nature].name + ' affinity</span></div>' +
          '<div class="hub-btn" onclick="UI.openJutsu()"><span class="icon">📜</span><span class="label">Jutsu &amp; Loadout</span><span class="sub">Unlock and equip techniques</span></div>' +
          '<div class="hub-btn' + (dojoReady ? ' glow' : '') + '" onclick="UI.openDojo()"><span class="icon">⚔️</span><span class="label">Rank Dojo</span><span class="sub">' + (dojoReady ? 'Exam ready!' : 'Rank-up duels') + '</span></div>' +
        '</div>' +
        '<div class="hint" style="margin-top:18px;">' + village.desc + '</div>' +
      '</div>';
  }

  function openMap() { state.mapVillage = state.profile.villageId; setScreen('map'); }
  function openTrain() { setScreen('train'); }
  function openJutsu() { setScreen('jutsu'); }
  function openDojo() { setScreen('dojo'); }
  function backToHub() { setScreen('hub'); }

  // ---------------- WORLD MAP ----------------
  function missionsForVillage(vid) {
    return Data.MISSIONS.filter(function (m) { return m.village === vid || m.village === null; });
  }

  function renderMap() {
    var home = state.profile.villageId;
    var cards = Data.VILLAGES.map(function (v) {
      var info = Data.NATURE_INFO[v.nature];
      var count = missionsForVillage(v.id).filter(isMissionAvailable).length;
      var sel = state.mapVillage === v.id;
      return '<div class="village-card' + (sel ? ' selected' : '') + '" style="--nature-color:' + info.color + '" onclick="UI.travelTo(\'' + v.id + '\')">' +
        '<div class="village-name">' + v.name + (v.id === home ? ' <span style="font-size:10px;color:var(--text-dim);">(Home)</span>' : '') + '</div>' +
        '<div class="village-nature">' + info.name + ' Village</div>' +
        '<div class="village-desc">' + v.desc + '</div>' +
        '<div class="clan-block"><span style="font-size:11px;color:var(--accent-glow);">' + count + ' mission' + (count === 1 ? '' : 's') + ' available</span></div>' +
      '</div>';
    }).join('');
    return '' +
      '<div class="panel" style="max-width:760px; width:100%;">' +
        '<div class="screen-title">World Map</div>' +
        '<div class="screen-heading">Choose a destination</div>' +
        '<div class="card-grid">' + cards + '</div>' +
        '<div class="btn-row"><button class="btn" onclick="UI.backToHub()">Back to Village</button></div>' +
      '</div>';
  }

  function travelTo(vid) { state.mapVillage = vid; setScreen('missions'); }

  function isMissionAvailable(m) { return Data.getRankIndex(m.rankReq) <= state.profile.rankIndex; }

  function renderMissions() {
    var v = Data.getVillage(state.mapVillage);
    var list = missionsForVillage(state.mapVillage);
    var rows = list.map(function (m) {
      var avail = isMissionAvailable(m);
      var cleared = state.profile.missionsCompleted.indexOf(m.id) >= 0;
      var color = RANK_COLORS[m.letter] || '#888';
      return '<div class="mission-row" style="' + (avail ? '' : 'opacity:0.45;cursor:not-allowed;') + '" ' + (avail ? 'onclick="UI.openMission(\'' + m.id + '\')"' : '') + '>' +
        '<div class="mission-rank" style="color:' + color + ';border:1px solid ' + color + ';">' + m.letter + '</div>' +
        '<div class="mission-info">' +
          '<div class="mission-title">' + m.title + (cleared ? ' ✓' : '') + '</div>' +
          '<div class="mission-giver">' + m.giver + (avail ? '' : ' — requires ' + Data.RANKS[Data.getRankIndex(m.rankReq)].name) + '</div>' +
        '</div>' +
        '<div class="mission-reward">+' + m.xp + ' XP<br/>+' + m.gold + 'g</div>' +
      '</div>';
    }).join('') || '<div class="hint">No missions here yet. Check back after ranking up.</div>';

    return '' +
      '<div class="panel" style="max-width:640px; width:100%;">' +
        '<div class="screen-title">' + v.name + '</div>' +
        '<div class="screen-heading">Mission Board</div>' +
        '<div class="mission-list">' + rows + '</div>' +
        '<div class="btn-row"><button class="btn" onclick="UI.openMap()">Back to Map</button></div>' +
      '</div>';
  }

  function openMission(id) {
    state.currentMissionPreview = Data.MISSIONS.filter(function (m) { return m.id === id; })[0];
    setScreen('missionIntro');
  }

  function renderMissionIntro() {
    var m = state.currentMissionPreview;
    var color = RANK_COLORS[m.letter] || '#888';
    var enemyNames = m.enemyWaves.map(function (wave, i) {
      return '<div>Wave ' + (i + 1) + ': ' + wave.map(function (eid) { return Data.getEnemy(eid).name; }).join(', ') + '</div>';
    }).join('');
    return '' +
      '<div class="panel" style="max-width:560px;">' +
        '<div class="screen-title" style="color:' + color + '">' + m.letter + '-RANK MISSION</div>' +
        '<div class="screen-heading">' + m.title + '</div>' +
        '<div class="hint" style="font-size:13px;color:var(--text);line-height:1.6;">' + m.briefing + '</div>' +
        '<div class="hint" style="margin-top:14px;">' + enemyNames + '</div>' +
        '<div class="stat-strip" style="margin-top:16px;"><span>Reward: <b>+' + m.xp + ' XP</b></span><span><b>+' + m.gold + ' gold</b></span><span><b>+' + m.trainingPoints + ' training</b></span></div>' +
        '<div class="btn-row">' +
          '<button class="btn" onclick="UI.backFromIntro()">Back</button>' +
          '<button class="btn btn-primary" onclick="UI.acceptMission()">Accept Mission</button>' +
        '</div>' +
      '</div>';
  }

  function backFromIntro() { setScreen('missions'); }
  function acceptMission() { startCombat(state.currentMissionPreview); }

  // ---------------- COMBAT BRIDGE ----------------
  function startCombat(mission) {
    state.currentMission = mission;
    Audio.resume();
    FX.clear();
    var w = canvas._cw || window.innerWidth, h = canvas._ch || window.innerHeight;
    Combat.start({ profile: state.profile, mission: mission, width: w, height: h, onEnd: onCombatEnd });
    state.screen = 'combat';
    render();
  }

  function onCombatEnd(result) {
    var mission = state.currentMission;
    var summary = { mission: mission, result: result, xp: 0, gold: 0, trainingPoints: 0, rankedUp: false, newRankName: null };
    if (result === 'victory') {
      summary.xp = mission.xp; summary.gold = mission.gold; summary.trainingPoints = mission.trainingPoints;
      state.profile.xp += mission.xp;
      state.profile.gold += mission.gold;
      state.profile.trainingPoints += mission.trainingPoints;
      if (mission.rankUp) {
        state.profile.rankIndex = Math.min(state.profile.rankIndex + 1, Data.RANKS.length - 1);
        state.profile.xp = 0;
        summary.rankedUp = true;
        summary.newRankName = Data.RANKS[state.profile.rankIndex].name;
        Audio.sfx.rankUp();
      } else if (mission.id && state.profile.missionsCompleted.indexOf(mission.id) === -1) {
        state.profile.missionsCompleted.push(mission.id);
      }
      Save.save(state.profile);
    }
    state.lastResultSummary = summary;
    FX.clear();
    setScreen('results');
  }

  function renderResults() {
    var s = state.lastResultSummary;
    var titleText = s.result === 'victory' ? 'Mission Complete' : (s.result === 'defeat' ? 'You Were Defeated' : 'Retreated');
    var titleColor = s.result === 'victory' ? 'var(--good)' : (s.result === 'defeat' ? 'var(--bad)' : 'var(--text-dim)');
    var body = '';
    if (s.result === 'victory') {
      body = '<div class="result-row"><span>Experience</span><b>+' + s.xp + ' XP</b></div>' +
             '<div class="result-row"><span>Gold</span><b>+' + s.gold + 'g</b></div>' +
             '<div class="result-row"><span>Training Points</span><b>+' + s.trainingPoints + '</b></div>' +
             (s.rankedUp ? '<div class="hint" style="margin-top:14px;color:var(--accent-glow);font-weight:700;">You have been promoted to ' + s.newRankName + '!</div>' : '');
    } else if (s.result === 'defeat') {
      body = '<div class="hint">You limp back to the village to recover. No rewards were earned this time.</div>';
    } else {
      body = '<div class="hint">You withdrew from the fight safely.</div>';
    }
    return '' +
      '<div class="panel" style="max-width:460px;">' +
        '<div class="screen-title" style="color:' + titleColor + '">' + (s.mission ? s.mission.title : '') + '</div>' +
        '<div class="screen-heading" style="color:' + titleColor + '">' + titleText + '</div>' +
        body +
        '<div class="btn-row"><button class="btn btn-primary" onclick="UI.backToHub()">Return to Village</button></div>' +
      '</div>';
  }

  // ---------------- CHAKRA TRAINING ----------------
  function newTrainRound() {
    var speed = 70 + Math.min((state.profile.natureLevels[currentNature()] || 0) * 1.5, 40);
    var width = Math.max(20 - Math.min((state.profile.natureLevels[currentNature()] || 0), 12), 10);
    state.train = { pos: 0, dir: 1, speed: speed, zoneStart: 10 + Math.random() * (90 - width - 10), zoneWidth: width };
  }
  function currentNature() { return Data.getVillage(state.profile.villageId).nature; }

  function renderTrain() {
    if (!state.train) newTrainRound();
    var nature = currentNature();
    var info = Data.NATURE_INFO[nature];
    var level = state.profile.natureLevels[nature] || 0;
    return '' +
      '<div class="panel" style="max-width:520px;">' +
        '<div class="screen-title">Chakra Training</div>' +
        '<div class="screen-heading" style="color:' + info.color + '">' + info.name + ' Affinity &middot; Level ' + level + '</div>' +
        '<div class="hint">Press <b>Strike</b> (or Space) the instant the marker crosses the glowing zone to deepen your affinity.</div>' +
        '<div class="train-bar-track">' +
          '<div class="train-zone" id="train-zone" style="left:' + state.train.zoneStart + '%;width:' + state.train.zoneWidth + '%;"></div>' +
          '<div class="train-marker" id="train-marker" style="left:0%;background:' + info.color + ';"></div>' +
        '</div>' +
        '<div class="btn-row">' +
          '<button class="btn btn-primary" onclick="UI.trainStrike()">Strike!</button>' +
          '<button class="btn" onclick="UI.backToHub()">Back to Village</button>' +
        '</div>' +
      '</div>';
  }

  function updateTrain(dt) {
    if (!state.train) return;
    var t = state.train;
    t.pos += t.dir * t.speed * dt;
    if (t.pos > 100) { t.pos = 100; t.dir = -1; }
    if (t.pos < 0) { t.pos = 0; t.dir = 1; }
    var marker = document.getElementById('train-marker');
    if (marker) marker.style.left = t.pos + '%';
  }

  function trainStrike() {
    if (state.screen !== 'train' || !state.train) return;
    var t = state.train;
    var nature = currentNature();
    var hit = t.pos >= t.zoneStart && t.pos <= t.zoneStart + t.zoneWidth;
    if (hit) {
      state.profile.natureLevels[nature] = Math.min((state.profile.natureLevels[nature] || 0) + 1, 24);
      Audio.sfx.trainTick(true);
      toast('+1 ' + Data.NATURE_INFO[nature].name + ' affinity!');
    } else {
      Audio.sfx.trainTick(false);
      toast('Missed the timing...');
    }
    Save.save(state.profile);
    newTrainRound();
    render();
  }

  // ---------------- JUTSU & LOADOUT ----------------
  function jutsuStatus(j) {
    var idx = j.tier - 1;
    var unlocked = state.profile.unlockedJutsu.indexOf(j.id) >= 0;
    var rankOk = state.profile.rankIndex >= TIER_RANK_REQ[idx];
    var levelOk = (state.profile.natureLevels[j.nature] || 0) >= TIER_LEVEL_REQ[idx];
    var cost = TIER_COST[idx];
    var costOk = state.profile.trainingPoints >= cost;
    return { unlocked: unlocked, rankOk: rankOk, levelOk: levelOk, cost: cost, costOk: costOk, levelReq: TIER_LEVEL_REQ[idx], rankReq: TIER_RANK_REQ[idx] };
  }

  function renderJutsu() {
    var nature = currentNature();
    var info = Data.NATURE_INFO[nature];
    var list = Data.jutsuForNature(nature);
    var rows = list.map(function (j) {
      var st = jutsuStatus(j);
      var meta;
      if (st.unlocked) {
        meta = '<span style="color:var(--good);">Unlocked</span>';
      } else if (!st.rankOk) {
        meta = '<span>Requires ' + Data.RANKS[st.rankReq].name + '</span>';
      } else if (!st.levelOk) {
        meta = '<span>Requires level ' + st.levelReq + '</span>';
      } else {
        meta = '<button class="btn" style="padding:6px 12px;font-size:11px;" ' + (st.costOk ? '' : 'disabled') + ' onclick="UI.unlockJutsu(\'' + j.id + '\')">Unlock (' + st.cost + ' pts)</button>';
      }
      return '<div class="jutsu-row" ' + (st.unlocked ? 'onclick="UI.equipJutsu(\'' + j.id + '\')" style="cursor:pointer;"' : '') + '>' +
        '<div class="jutsu-dot" style="background:' + info.color + ';"></div>' +
        '<div><div class="jutsu-name">' + j.name + ' <span style="color:var(--text-dim);font-weight:400;">(' + j.rank + '-rank)</span></div>' +
        '<div class="jutsu-desc">' + j.desc + ' &middot; ' + j.chakraCost + ' chakra &middot; ' + j.cooldown + 's cd</div></div>' +
        '<div class="jutsu-meta">' + meta + '</div>' +
      '</div>';
    }).join('');

    var slots = state.profile.equippedJutsu.map(function (id, i) {
      var j = id ? Data.getJutsu(id) : null;
      return '<div class="equip-slot' + (j ? ' filled' : '') + '" onclick="UI.unequipSlot(' + i + ')">' + (j ? j.name : 'Empty Slot ' + (i + 1)) + '</div>';
    }).join('');

    return '' +
      '<div class="panel" style="max-width:620px; width:100%;">' +
        '<div class="screen-title">Jutsu &amp; Loadout</div>' +
        '<div class="screen-heading" style="color:' + info.color + '">' + info.name + ' Technique Tree</div>' +
        '<div class="hint">Training Points: <b>' + state.profile.trainingPoints + '</b> &middot; Click an unlocked technique to equip it.</div>' +
        '<div class="jutsu-list">' + rows + '</div>' +
        '<div class="hint" style="margin-top:14px;">Equipped (slots U / I / O):</div>' +
        '<div class="equip-slots">' + slots + '</div>' +
        '<div class="btn-row"><button class="btn" onclick="UI.backToHub()">Back to Village</button></div>' +
      '</div>';
  }

  function unlockJutsu(id) {
    var j = Data.getJutsu(id);
    var st = jutsuStatus(j);
    if (st.unlocked || !st.rankOk || !st.levelOk || !st.costOk) return;
    state.profile.trainingPoints -= st.cost;
    state.profile.unlockedJutsu.push(id);
    var slots = state.profile.equippedJutsu;
    var emptyIdx = slots.indexOf(null);
    if (emptyIdx >= 0) slots[emptyIdx] = id;
    Save.save(state.profile);
    toast('Unlocked ' + j.name + '!');
    render();
  }

  function equipJutsu(id) {
    var slots = state.profile.equippedJutsu;
    if (slots.indexOf(id) >= 0) { render(); return; }
    var emptyIdx = slots.indexOf(null);
    if (emptyIdx >= 0) slots[emptyIdx] = id; else slots[2] = id;
    Save.save(state.profile);
    render();
  }
  function unequipSlot(i) { state.profile.equippedJutsu[i] = null; Save.save(state.profile); render(); }

  // ---------------- RANK DOJO ----------------
  function renderDojo() {
    var p = state.profile;
    var rank = Data.RANKS[p.rankIndex];
    var nextRank = Data.RANKS[p.rankIndex + 1];
    if (!nextRank) {
      return '<div class="panel" style="max-width:480px;">' +
        '<div class="screen-title">Rank Dojo</div>' +
        '<div class="screen-heading">Village Shadow</div>' +
        '<div class="hint">You have reached the highest rank a shinobi can attain. Your legend is complete.</div>' +
        '<div class="btn-row"><button class="btn" onclick="UI.backToHub()">Back to Village</button></div>' +
      '</div>';
    }
    var ready = p.xp >= rank.xpToNext;
    var examId = RANK_EXAMS[p.rankIndex];
    var examEnemy = Data.getEnemy(examId);
    return '' +
      '<div class="panel" style="max-width:480px;">' +
        '<div class="screen-title">Rank Dojo</div>' +
        '<div class="screen-heading">' + rank.name + ' → ' + nextRank.name + '</div>' +
        (ready ?
          '<div class="hint" style="color:var(--text);">You are ready to face <b>' + examEnemy.name + '</b> to earn the rank of ' + nextRank.name + '.</div>' +
          '<div class="btn-row"><button class="btn btn-primary" onclick="UI.beginRankUp()">Begin Rank-Up Duel</button></div>' :
          '<div class="progress-bar"><div style="width:' + (clamp01(p.xp / rank.xpToNext) * 100) + '%"></div></div>' +
          '<div class="hint">' + p.xp + ' / ' + rank.xpToNext + ' XP required. Complete missions to qualify for your exam.</div>') +
        '<div class="btn-row"><button class="btn" onclick="UI.backToHub()">Back to Village</button></div>' +
      '</div>';
  }

  function beginRankUp() {
    var idx = state.profile.rankIndex;
    if (idx >= Data.RANKS.length - 1) return;
    var examId = RANK_EXAMS[idx];
    var enemy = Data.getEnemy(examId);
    var mission = {
      id: 'rankup_' + idx, title: 'Rank-Up Duel', giver: 'Village Shadow', letter: 'RANK',
      briefing: 'Defeat ' + enemy.name + ' in single combat to prove you are ready for the rank of ' + Data.RANKS[idx + 1].name + '.',
      enemyWaves: [[examId]], xp: 0, gold: 150, trainingPoints: 4, rankUp: true
    };
    state.currentMissionPreview = mission;
    setScreen('missionIntro');
  }

  // ---------------- helpers ----------------
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  window.UI = {
    continueGame: continueGame, newGamePrompt: newGamePrompt, startCreate: startCreate,
    setCreateName: setCreateName, selectVillage: selectVillage, confirmCreate: confirmCreate,
    openMap: openMap, openTrain: openTrain, openJutsu: openJutsu, openDojo: openDojo, backToHub: backToHub,
    travelTo: travelTo, openMission: openMission, backFromIntro: backFromIntro, acceptMission: acceptMission,
    trainStrike: trainStrike, unlockJutsu: unlockJutsu, equipJutsu: equipJutsu, unequipSlot: unequipSlot,
    beginRankUp: beginRankUp
  };
  window.Game.UI = window.UI;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
