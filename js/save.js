/* ============================================================
   SHINOBI LIFE — save/profile persistence (localStorage)
   Global namespace: window.Game.Save
   ============================================================ */
(function () {
  'use strict';
  window.Game = window.Game || {};
  var KEY = 'shinobiLifeSave_v1';

  function newProfile(name, villageId, clanId) {
    var clan = Game.Data.getClan(clanId);
    return {
      name: name || 'Unnamed',
      villageId: villageId,
      clanId: clanId,
      rankIndex: 0,
      xp: 0,
      gold: 50,
      trainingPoints: 2,
      natureLevels: { fire: 0, wind: 0, lightning: 0, earth: 0, water: 0 },
      unlockedJutsu: clan ? [clan.startJutsu] : [],
      equippedJutsu: clan ? [clan.startJutsu, null, null] : [null, null, null],
      missionsCompleted: [],
      createdAt: Date.now()
    };
  }

  function computeStats(profile) {
    var rankIdx = profile.rankIndex || 0;
    return {
      maxHp: 100 + rankIdx * 35,
      maxChakra: 100 + rankIdx * 25 + (extraChakra(profile)),
      baseDamage: 8 + rankIdx * 3,
      moveSpeed: 220
    };
  }

  function extraChakra(profile) {
    var clan = Game.Data.getClan(profile.clanId);
    return (clan && clan.id === 'tidecaller') ? 20 : 0;
  }

  function save(profile) {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.warn('Save failed', e);
      return false;
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      // defensive defaults for forward-compat
      if (!p.natureLevels) p.natureLevels = { fire: 0, wind: 0, lightning: 0, earth: 0, water: 0 };
      if (!p.unlockedJutsu) p.unlockedJutsu = [];
      if (!p.equippedJutsu) p.equippedJutsu = [null, null, null];
      if (!p.missionsCompleted) p.missionsCompleted = [];
      if (typeof p.trainingPoints !== 'number') p.trainingPoints = 0;
      if (typeof p.rankIndex !== 'number') p.rankIndex = 0;
      return p;
    } catch (e) {
      console.warn('Load failed', e);
      return null;
    }
  }

  function hasSave() {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  window.Game.Save = {
    newProfile: newProfile,
    computeStats: computeStats,
    save: save,
    load: load,
    hasSave: hasSave,
    clear: clear
  };
})();
