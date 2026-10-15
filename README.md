# Shinobi Life

An original Naruto-inspired, BitLife-style shinobi life simulator. One life,
one year at a time — graduate the academy, take the exams, fight things that
fight back, then tame what's sealed inside you, slash your headband, or
build a village of your own.

This is a single large React component (`src/ShinobiLife.jsx`) covering
character creation, the calendar/world simulation, clans and kage lines,
missions and crime, the hand-seal combat engine, training, jutsu, tailed
beasts, wars, and more.

Since V13 the screen is organised into five destinations: **Home** (who you
are, your next chapter, what needs you, advancing the year), **Explore**
(places and what you can do in each), **Character**, **World** and
**Chronicle**, with every other screen under **More**. The older Dossier and
Scroll interfaces are still available under Appearance. Since V13.1 most
places can be used right on their card, and the world comes back to what you
did years later, tied in the Chronicle to the deed that caused it. See
`docs/V13.md` for the interface map and the plan.

## Running it

The game ships pre-built as static files, so you can just **open
`index.html`** in a browser — no Node, no server, nothing to install.

If you want to make changes to `src/ShinobiLife.jsx` and rebuild:

```
npm install
npm run build
```

This regenerates `bundle.js` (the game, bundled with esbuild) and
`style.css` (Tailwind, compiled to only the classes actually used). Both are
committed so the built game always works standalone.

## Tests

```
npm test                 # every suite, two at a time
node tests/run.cjs v13   # just one
node tests/run.cjs lifefull   # one whole life, start to finish
```

The suites drive the built game in Chromium with Playwright (installed
globally here; `npm i -g playwright` elsewhere, and point `SL_CHROMIUM` at a
Chromium binary if it is not at `/opt/pw-browsers/chromium`). The runner
serves the game itself, so nothing else needs to be running.

## Project structure

```
index.html          static entry point — open this to play
bundle.js            built game bundle (React + the game, IIFE, not a module)
style.css            built Tailwind stylesheet
img/home.webp        the Home screen art
img/road/            The Road's place art
img/faces/           portraits, by role: <role>-<n>.webp or <role>-m|f-<n>.webp
                     (roles: wanted, squad, sensei, family, apprentice, street);
                     add more files and the game uses them, no code changes
audio/               music
src/ShinobiLife.jsx  the game itself
src/main.jsx         mounts <ShinobiLife /> into #root
src/index.css        Tailwind entry (source for style.css)
esbuild.config.js    bundles src/main.jsx -> bundle.js
tailwind.config.js   scans src/**/*.jsx for classes used
tests/               Playwright suites (npm test) and their shared harness
docs/V13.md          the V13 interface map and migration plan
```

## Combat

Battles are menu-driven and tactical, not real-time twitch combat:

- **Range**: close / mid / long, shiftable mid-fight for chakra.
- **Hand-seal weaving**: many jutsu require forming seals across multiple
  turns before they fire — get hit while weaving and the sequence breaks.
- **Momentum**: pressing an advantage or getting pushed onto the back foot
  changes how a fight plays out.
- **Forms**: temporary empowered states (Sage-Mode/Susanoo-style) with
  upkeep costs and turn limits.
- **Chakra economy**: every jutsu costs chakra; Focus recovers it at the
  cost of a turn.
- Status effects (stunned, burning, guarding, evasion, genjutsu layers),
  elemental natures, items, and the option to withdraw from a losing fight.

All names/characters are drawn from the Naruto universe as a fan-made,
non-commercial tribute — this project is not affiliated with or endorsed by
the rights holders.

