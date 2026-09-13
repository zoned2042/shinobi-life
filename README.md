# Shinobi Life

An original action-RPG of hidden villages, chakra, and blades — built as a
single-page browser game with no build step and no external assets.

## Running it

Just open `index.html` in a browser, or serve the folder with any static
file server, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000/`.

## What's in it

- **Character creation** — pick your name and one of five original hidden
  villages (Emberleaf/Fire, Duskwind/Wind, Stormpeak/Lightning,
  Ironroot/Earth, Tideveil/Water), each with a matching clan/bloodline and
  passive ability.
- **Real-time action combat** — WASD movement, dodge-roll with i-frames,
  a 3-hit taijutsu combo chain, guard/block, and 3 equippable jutsu with
  chakra costs and cooldowns. Elemental advantage follows a 5-way power
  cycle (Fire > Wind > Lightning > Earth > Water > Fire). Combat is driven
  entirely by hand-rolled Canvas 2D rendering with hit-stop, screen shake,
  particle VFX, and procedural sound effects (Web Audio API — no audio
  files).
- **World map & missions** — travel between villages and accept D through
  S-rank missions, each with its own enemies and rewards.
- **Chakra nature training** — a timing minigame that raises your village's
  chakra-nature affinity, which gates which jutsu you can unlock.
- **Jutsu tree & loadout** — unlock techniques (4 tiers per nature) with
  training points and equip up to 3 into your action bar.
- **Rank Dojo** — once you've earned enough XP, fight a rank-up duel to
  progress Genin → Chūnin → Jōnin → Elite Jōnin → Village Shadow.

Progress is saved to `localStorage` automatically.

## Project structure

```
index.html      entry point
style.css       UI theme
js/data.js      villages, clans, jutsu, enemies, missions, ranks
js/audio.js     procedural Web Audio sound effects
js/particles.js particle/VFX system (hits, jutsu casts, screen shake, hit-stop)
js/save.js      localStorage profile persistence
js/combat.js    real-time action combat engine
js/game.js      screen/state machine, menus, world map, training minigame
```

All names (villages, clans, jutsu, characters) are original and not drawn
from any existing licensed property.
