/* ============================================================
   SHINOBI LIFE — game data tables
   Global namespace: window.Game.Data
   ============================================================ */
(function () {
  'use strict';
  window.Game = window.Game || {};

  // Five chakra natures locked in a power cycle (each beats the next).
  var NATURE_ORDER = ['fire', 'wind', 'lightning', 'earth', 'water'];

  var NATURE_INFO = {
    fire:      { name: 'Fire',      color: '#ff6a3d', glow: '#ffb35c', desc: 'Aggressive, burns over time.' },
    wind:      { name: 'Wind',      color: '#d8f7ff', glow: '#ffffff', desc: 'Fast, cutting, low chakra cost.' },
    lightning: { name: 'Lightning', color: '#f5e642', glow: '#fff9b0', desc: 'Piercing bursts, high speed.' },
    earth:     { name: 'Earth',     color: '#b98a4b', glow: '#e0bd82', desc: 'Defensive, heavy damage.' },
    water:     { name: 'Water',     color: '#3da9ff', glow: '#9fdcff', desc: 'Control and sustain.' }
  };

  function elementalMultiplier(attacker, defender) {
    if (!attacker || !defender || attacker === defender) return 1;
    var i = NATURE_ORDER.indexOf(attacker);
    if (i === -1) return 1;
    var beats = NATURE_ORDER[(i + 1) % NATURE_ORDER.length];
    var beatenBy = NATURE_ORDER[(i + NATURE_ORDER.length - 1) % NATURE_ORDER.length];
    if (defender === beats) return 1.3;
    if (defender === beatenBy) return 0.75;
    return 1;
  }

  var VILLAGES = [
    { id: 'emberleaf', name: 'Emberleaf', nature: 'fire',
      desc: 'A village carved into a burning canyon; its shinobi favor bold, close-range aggression.' },
    { id: 'duskwind', name: 'Duskwind', nature: 'wind',
      desc: 'Built on cliffside terraces where the wind never stops; famed for speed and precision.' },
    { id: 'stormpeak', name: 'Stormpeak', nature: 'lightning',
      desc: 'A mountain fortress wreathed in permanent storm clouds; its shinobi strike like thunder.' },
    { id: 'ironroot', name: 'Ironroot', nature: 'earth',
      desc: 'A subterranean stronghold of tunnels and stone halls; patient, unbreakable defenders.' },
    { id: 'tideveil', name: 'Tideveil', nature: 'water',
      desc: 'A harbor village of mist and canals; masters of control, healing, and misdirection.' }
  ];

  var CLANS = [
    { id: 'emberfang', name: 'Emberfang', village: 'emberleaf', nature: 'fire',
      passiveName: 'Blaze Heart',
      passiveDesc: '+25% chakra regeneration while below 35% health.',
      startJutsu: 'fire_ember_spark' },
    { id: 'galewalker', name: 'Galewalker', village: 'duskwind', nature: 'wind',
      passiveName: 'Featherstep',
      passiveDesc: 'Dodge roll distance +30% and refunds a small burst of chakra.',
      startJutsu: 'wind_gale_slash' },
    { id: 'stormcaller', name: 'Stormcaller', village: 'stormpeak', nature: 'lightning',
      passiveName: 'Live Wire',
      passiveDesc: 'Landing 3 taijutsu hits in a row charges a free lightning strike.',
      startJutsu: 'lightning_static_jolt' },
    { id: 'ironhide', name: 'Ironhide', village: 'ironroot', nature: 'earth',
      passiveName: 'Bedrock Skin',
      passiveDesc: 'Guarding reduces incoming damage by an extra 15%.',
      startJutsu: 'earth_stone_spikes' },
    { id: 'tidecaller', name: 'Tidecaller', village: 'tideveil', nature: 'water',
      passiveName: 'Flowing Spirit',
      passiveDesc: 'Max chakra +20 and chakra regen never stops, even mid-combo.',
      startJutsu: 'water_water_whip' }
  ];

  // type: 'projectile' | 'melee' | 'shield' | 'dash' | 'aoe' | 'beam'
  var JUTSU = [
    // ---- FIRE ----
    { id: 'fire_ember_spark', name: 'Ember Spark', nature: 'fire', rank: 'D', tier: 1,
      chakraCost: 12, cooldown: 1.6, damage: 10, speed: 480, radius: 10, range: 620,
      type: 'projectile', desc: 'A quick burning spark hurled at the enemy.' },
    { id: 'fire_fireball', name: 'Fireball Jutsu', nature: 'fire', rank: 'C', tier: 2,
      chakraCost: 24, cooldown: 3.5, damage: 22, speed: 380, radius: 22, range: 620,
      type: 'projectile', desc: 'A roaring ball of flame that scorches on impact.' },
    { id: 'fire_phoenix_flare', name: 'Phoenix Flare', nature: 'fire', rank: 'B', tier: 3,
      chakraCost: 34, cooldown: 6, damage: 16, hits: 3, speed: 420, radius: 16, range: 620,
      type: 'projectile', desc: 'Three homing embers that burst in sequence.' },
    { id: 'fire_infernal_dragon', name: 'Infernal Dragon', nature: 'fire', rank: 'A', tier: 4,
      chakraCost: 55, cooldown: 10, damage: 48, speed: 300, radius: 40, range: 700,
      type: 'projectile', ultimate: true, desc: 'A dragon of flame that consumes everything in its path.' },
    // ---- WIND ----
    { id: 'wind_gale_slash', name: 'Gale Slash', nature: 'wind', rank: 'D', tier: 1,
      chakraCost: 10, cooldown: 1.2, damage: 9, speed: 620, radius: 10, range: 600,
      type: 'projectile', desc: 'A thin blade of compressed air.' },
    { id: 'wind_vacuum_blade', name: 'Vacuum Blade', nature: 'wind', rank: 'C', tier: 2,
      chakraCost: 20, cooldown: 2.6, damage: 18, speed: 700, radius: 14, range: 650,
      type: 'projectile', desc: 'A razor crescent that cuts clean through guard.', pierceGuard: 0.5 },
    { id: 'wind_cyclone_step', name: 'Cyclone Step', nature: 'wind', rank: 'B', tier: 3,
      chakraCost: 26, cooldown: 4.5, damage: 20, range: 260,
      type: 'dash', desc: 'A blurring dash-strike that closes distance instantly.' },
    { id: 'wind_tempest_requiem', name: 'Tempest Requiem', nature: 'wind', rank: 'A', tier: 4,
      chakraCost: 52, cooldown: 10, damage: 14, hits: 5, speed: 900, radius: 12, range: 700,
      type: 'projectile', ultimate: true, desc: 'A storm of blades that shred anything caught in it.' },
    // ---- LIGHTNING ----
    { id: 'lightning_static_jolt', name: 'Static Jolt', nature: 'lightning', rank: 'D', tier: 1,
      chakraCost: 11, cooldown: 1.3, damage: 10, speed: 900, radius: 8, range: 600,
      type: 'projectile', desc: 'A crackling bolt fired with barely a hand seal.' },
    { id: 'lightning_thunder_fang', name: 'Thunder Fang', nature: 'lightning', rank: 'C', tier: 2,
      chakraCost: 22, cooldown: 3, damage: 26, range: 180,
      type: 'dash', desc: 'A chakra-charged fist that arcs electricity on impact.' },
    { id: 'lightning_storm_rail', name: 'Storm Rail', nature: 'lightning', rank: 'B', tier: 3,
      chakraCost: 30, cooldown: 5, damage: 34, width: 26, range: 750,
      type: 'beam', desc: 'An instant piercing beam of lightning.' },
    { id: 'lightning_heavens_wrath', name: "Heaven's Wrath", nature: 'lightning', rank: 'A', tier: 4,
      chakraCost: 55, cooldown: 10, damage: 50, width: 60, range: 800,
      type: 'beam', ultimate: true, desc: 'A sky-splitting bolt that levels everything ahead.' },
    // ---- EARTH ----
    { id: 'earth_stone_spikes', name: 'Stone Spikes', nature: 'earth', rank: 'D', tier: 1,
      chakraCost: 13, cooldown: 1.8, damage: 12, speed: 340, radius: 14, range: 550,
      type: 'projectile', desc: 'Jagged spikes erupt from the ground toward the foe.' },
    { id: 'earth_mud_wall', name: 'Mud Wall', nature: 'earth', rank: 'C', tier: 2,
      chakraCost: 20, cooldown: 6, block: 0.7, duration: 2.5,
      type: 'shield', desc: 'A wall of hardened mud that blocks most incoming damage.' },
    { id: 'earth_quake_palm', name: 'Quake Palm', nature: 'earth', rank: 'B', tier: 3,
      chakraCost: 30, cooldown: 5, damage: 30, radius: 160, range: 150,
      type: 'aoe', desc: 'A ground-shattering palm strike that staggers nearby foes.' },
    { id: 'earth_titans_grasp', name: "Titan's Grasp", nature: 'earth', rank: 'A', tier: 4,
      chakraCost: 55, cooldown: 11, damage: 55, radius: 220, range: 200,
      type: 'aoe', ultimate: true, root: true, desc: 'Stone hands erupt and crush everything nearby.' },
    // ---- WATER ----
    { id: 'water_water_whip', name: 'Water Whip', nature: 'water', rank: 'D', tier: 1,
      chakraCost: 10, cooldown: 1.4, damage: 9, speed: 520, radius: 10, range: 560,
      type: 'projectile', desc: 'A lashing whip of pressurized water.' },
    { id: 'water_dragon_bullet', name: 'Water Dragon Bullet', nature: 'water', rank: 'C', tier: 2,
      chakraCost: 24, cooldown: 3.5, damage: 23, speed: 420, radius: 20, range: 620,
      type: 'projectile', desc: 'A serpent of water that slams into its target.' },
    { id: 'water_tidal_wall', name: 'Tidal Wall', nature: 'water', rank: 'B', tier: 3,
      chakraCost: 22, cooldown: 6, block: 0.6, duration: 2.5, heal: 8,
      type: 'shield', desc: 'A rising wall of water that guards and slowly mends wounds.' },
    { id: 'water_abyssal_tsunami', name: 'Abyssal Tsunami', nature: 'water', rank: 'A', tier: 4,
      chakraCost: 55, cooldown: 10, damage: 42, radius: 260, range: 220,
      type: 'aoe', ultimate: true, desc: 'A crushing wave that drowns the battlefield.' }
  ];

  var RANKS = [
    { id: 'genin', name: 'Genin', xpToNext: 120 },
    { id: 'chunin', name: 'Chūnin', xpToNext: 320 },
    { id: 'jonin', name: 'Jōnin', xpToNext: 700 },
    { id: 'elite', name: 'Elite Jōnin', xpToNext: 1400 },
    { id: 'shadow', name: 'Village Shadow', xpToNext: Infinity }
  ];

  // Enemy templates. aiType: 'aggressive' | 'ranged' | 'balanced' | 'boss'
  var ENEMIES = [
    { id: 'bandit', name: 'Wandering Bandit', hp: 40, damage: 6, speed: 150, aiType: 'aggressive', nature: null, color: '#8a8a8a', xp: 15, gold: 10 },
    { id: 'rogue_fire', name: 'Rogue Cinder-nin', hp: 55, damage: 9, speed: 160, aiType: 'ranged', nature: 'fire', color: '#ff6a3d', xp: 25, gold: 18, jutsuIds: ['fire_ember_spark'] },
    { id: 'rogue_wind', name: 'Rogue Gale-nin', hp: 50, damage: 8, speed: 190, aiType: 'ranged', nature: 'wind', color: '#d8f7ff', xp: 25, gold: 18, jutsuIds: ['wind_gale_slash'] },
    { id: 'rogue_lightning', name: 'Rogue Storm-nin', hp: 52, damage: 10, speed: 185, aiType: 'ranged', nature: 'lightning', color: '#f5e642', xp: 28, gold: 20, jutsuIds: ['lightning_static_jolt'] },
    { id: 'rogue_earth', name: 'Rogue Stone-nin', hp: 75, damage: 9, speed: 120, aiType: 'balanced', nature: 'earth', color: '#b98a4b', xp: 28, gold: 20, jutsuIds: ['earth_stone_spikes'] },
    { id: 'rogue_water', name: 'Rogue Mist-nin', hp: 60, damage: 8, speed: 150, aiType: 'balanced', nature: 'water', color: '#3da9ff', xp: 26, gold: 18, jutsuIds: ['water_water_whip'] },
    { id: 'chunin_hunter', name: 'Hunter-nin Squad Leader', hp: 110, damage: 13, speed: 175, aiType: 'balanced', nature: 'lightning', color: '#f5e642', xp: 55, gold: 40, jutsuIds: ['lightning_static_jolt', 'lightning_thunder_fang'] },
    { id: 'jonin_duelist', name: 'Exiled Jōnin Duelist', hp: 170, damage: 16, speed: 190, aiType: 'aggressive', nature: 'wind', color: '#e8fbff', xp: 90, gold: 70, jutsuIds: ['wind_gale_slash', 'wind_vacuum_blade', 'wind_cyclone_step'] },
    { id: 'boss_ember_general', name: 'General Ashveil', hp: 320, damage: 20, speed: 170, aiType: 'boss', nature: 'fire', color: '#ff8a4d', xp: 220, gold: 200, jutsuIds: ['fire_fireball', 'fire_phoenix_flare', 'fire_infernal_dragon'], boss: true },
    { id: 'boss_stormlord', name: 'Stormlord Kaigen', hp: 420, damage: 24, speed: 195, aiType: 'boss', nature: 'lightning', color: '#fff27a', xp: 320, gold: 300, jutsuIds: ['lightning_thunder_fang', 'lightning_storm_rail', "lightning_heavens_wrath"], boss: true }
  ];

  // Missions grouped by rank letter. enemyWaves: array of arrays (enemy ids per wave).
  var MISSIONS = [
    { id: 'd1', rankReq: 'genin', letter: 'D', title: 'Pest Control', giver: 'Village Elder', village: null,
      briefing: 'A bandit has been raiding the supply caravans on the outskirts. Drive him off.',
      enemyWaves: [['bandit']], xp: 30, gold: 25, trainingPoints: 1 },
    { id: 'd2', rankReq: 'genin', letter: 'D', title: 'Border Watch', giver: 'Gate Guard', village: 'duskwind',
      briefing: 'Rogue shinobi have been probing the village border. Deal with the scout.',
      enemyWaves: [['rogue_wind']], xp: 35, gold: 30, trainingPoints: 1 },
    { id: 'c1', rankReq: 'genin', letter: 'C', title: 'Escort Under Fire', giver: 'Merchant Guild', village: 'emberleaf',
      briefing: 'An escort mission has gone wrong — two rogue shinobi are closing in on the caravan.',
      enemyWaves: [['bandit', 'rogue_fire']], xp: 55, gold: 45, trainingPoints: 2 },
    { id: 'c2', rankReq: 'chunin', letter: 'C', title: 'The Hidden Camp', giver: 'Village Elder', village: 'ironroot',
      briefing: 'A rogue camp has been spotted nearby. Clear it out before it grows.',
      enemyWaves: [['rogue_earth'], ['rogue_water']], xp: 65, gold: 55, trainingPoints: 2 },
    { id: 'c3', rankReq: 'chunin', letter: 'C', title: 'Mist on the Canals', giver: 'Harbor Master', village: 'tideveil',
      briefing: 'Smugglers hiding in the canal mists have been ambushing patrol boats.',
      enemyWaves: [['rogue_water']], xp: 60, gold: 50, trainingPoints: 2 },
    { id: 'b1', rankReq: 'chunin', letter: 'B', title: 'Hunter-nin Ambush', giver: 'Jōnin Commander', village: 'stormpeak',
      briefing: 'A hunter-nin squad leader has been tracking genin teams. Turn the tables.',
      enemyWaves: [['chunin_hunter']], xp: 100, gold: 85, trainingPoints: 3 },
    { id: 'b2', rankReq: 'jonin', letter: 'B', title: 'Exile’s Duel', giver: 'Village Shadow', village: 'duskwind',
      briefing: 'An exiled Jōnin has challenged our shinobi to single combat. Answer the call.',
      enemyWaves: [['jonin_duelist']], xp: 130, gold: 110, trainingPoints: 3 },
    { id: 'a1', rankReq: 'jonin', letter: 'A', title: 'Fall of Ashveil', giver: 'Village Shadow', village: 'emberleaf',
      briefing: 'General Ashveil leads a warband threatening the eastern road. This ends now.',
      enemyWaves: [['rogue_fire', 'bandit'], ['boss_ember_general']], xp: 260, gold: 220, trainingPoints: 5, boss: true },
    { id: 's1', rankReq: 'elite', letter: 'S', title: 'Stormlord’s Challenge', giver: 'Village Shadow', village: 'stormpeak',
      briefing: 'Stormlord Kaigen has declared war on every hidden village. Only the strongest may face him.',
      enemyWaves: [['chunin_hunter', 'rogue_lightning'], ['boss_stormlord']], xp: 500, gold: 450, trainingPoints: 8, boss: true }
  ];

  window.Game.Data = {
    NATURE_ORDER: NATURE_ORDER,
    NATURE_INFO: NATURE_INFO,
    elementalMultiplier: elementalMultiplier,
    VILLAGES: VILLAGES,
    CLANS: CLANS,
    JUTSU: JUTSU,
    RANKS: RANKS,
    ENEMIES: ENEMIES,
    MISSIONS: MISSIONS,
    getJutsu: function (id) { return JUTSU.filter(function (j) { return j.id === id; })[0]; },
    getVillage: function (id) { return VILLAGES.filter(function (v) { return v.id === id; })[0]; },
    getClan: function (id) { return CLANS.filter(function (c) { return c.id === id; })[0]; },
    getEnemy: function (id) { return ENEMIES.filter(function (e) { return e.id === id; })[0]; },
    getRankIndex: function (id) { for (var i = 0; i < RANKS.length; i++) if (RANKS[i].id === id) return i; return 0; },
    jutsuForNature: function (nature) { return JUTSU.filter(function (j) { return j.nature === nature; }).sort(function (a, b) { return a.tier - b.tier; }); }
  };
})();
