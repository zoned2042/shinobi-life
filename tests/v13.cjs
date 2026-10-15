/* V13 — A Life Worth Living: the new interface.
   Navigation, Home, the stages of life, the year turning, More, the classic interfaces,
   saves and preferences from before V13, and phones. */
const { open } = require('./lib/harness.cjs');

(async () => {
  const H = await open();
  const { page, T, wait, clear, save, prefs, inject, modalTxt, ovTxt, bodyTxt, clickOv, press, dest, ageOnce, fightTo, newLife, cheat, ownerPanel } = H;
  const home = () => page.evaluate(() => { const m = document.querySelector('.v13-main'); return m ? m.innerText : ''; });
  const chapterTxt = () => page.evaluate(() => { const m = document.querySelector('.v13-chapter'); return m ? m.innerText : ''; });
  const places = () => page.evaluate(() => [...document.querySelectorAll('.v13-place')].map((p) => p.getAttribute('data-place')));

  /* ---------- a brand new player lands in the new interface ---------- */
  await newLife({ name: 'Haruki' });
  let m = await home();
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.v13-tab')].map((b) => b.getAttribute('aria-label')));
  T('N1 a new life opens on Home in the new interface, with five destinations', !!(await page.$('.v13')) && JSON.stringify(tabs) === JSON.stringify(['Home', 'Explore', 'Character', 'World', 'Chronicle']) && /YOUR NEXT CHAPTER/.test(m) && /Haruki/.test(m), { tabs, head: m.slice(0, 200) });
  T('N2 the old header (hub doors, quick chips) is gone from the main screen', !(await page.$('.sl-hubs')) && !(await page.$('.sl-worldstate')));
  let p = await prefs();
  T('N3 the choice is remembered: prefs say life, v13', p && p.ui === 'life' && p.v13 === true, p);
  const heroImg = await page.evaluate(() => { const d = document.querySelector('.v13-hero-img'); return d ? getComputedStyle(d).backgroundImage : ''; });
  T('N4 Home uses the new office art', /img\/home\.webp/.test(heroImg), heroImg);
  const imgOk = await page.evaluate(async () => { const r = await fetch('img/home.webp'); return r.ok && (await r.blob()).size > 50000; });
  T('N5 the art file ships with the game', imgOk);

  /* ---------- each destination has its own screen ---------- */
  await dest('Explore'); m = await home();
  const pl0 = await places();
  T('N6 Explore is places: the desk, the border, the market, beyond the walls', ['desk', 'border', 'market', 'beyond'].every((k) => pl0.includes(k)) && /EXPLORE/.test(m), pl0);
  await dest('Character'); m = await home();
  T('N7 Character: the body with all eight stats, abilities, people, path, gear', /THE BODY/.test(m) && ['Ninjutsu', 'Taijutsu', 'Genjutsu', 'Chakra', 'Control', 'Speed', 'Strength', 'Intellect'].every((x) => m.includes(x)) && /ABILITIES/.test(m) && /YOUR PEOPLE/.test(m) && /YOUR PATH/.test(m) && /GEAR AND RECORD/.test(m), m.slice(0, 160));
  await dest('World'); m = await home();
  T('N8 World: the Times, everything ongoing, the map, politics, society, the Bingo Book', ['The Shinobi Times', 'Everything ongoing', 'The world map', 'Politics', 'Society', 'The Bingo Book'].every((x) => m.includes(x)), m.slice(0, 200));
  await dest('Chronicle'); m = await home();
  T('N9 Chronicle: your story so far, the Chronicle, the story of this save, your line, Kage lines', ['YOUR STORY SO FAR', 'The Shinobi Chronicle', 'The story of this save', 'Your line', 'Kage lines'].every((x) => m.includes(x)), m.slice(0, 200));
  /* a hub opened from World only shows World's tabs */
  await dest('World'); await press('^Politics'); await wait(300);
  m = await modalTxt();
  T('N10 Politics opens the hub with only the World tabs', /THE WORLD/.test(m) && !/Your Life\n/.test(m) && !/\nRecords\n/.test(m) && /Society/.test(m), m.slice(0, 200));
  await clear();

  /* ---------- More holds everything ---------- */
  await press('^More$'); await wait(300);
  m = await modalTxt();
  T('N11 More lists every screen in groups: this year, you, the world, history, settings', ['THIS YEAR', 'YOU', 'THE WORLD', 'HISTORY', 'SETTINGS'].every((x) => m.includes(x)) && ['The scroll broker', 'Everything ongoing', 'The Shinobi Chronicle', 'Appearance', 'Profile and titles', 'Walk the border patrol'].every((x) => m.includes(x)), m.slice(0, 300));
  await clickOv('^Character$'); await wait(300);
  T('N12 a destination chip in More goes there', /THE BODY/.test(await home()) && !(await modalTxt()));

  /* ---------- the year turns, and Home says what mattered ---------- */
  await dest('Home');
  let sv = await save(); const y0 = sv.c.year;
  const adv = await page.evaluate(() => { const b = document.querySelector('.v13-adv-big'); return b ? b.innerText : ''; });
  const notes = await page.evaluate(() => { const n = document.querySelector('.v13-notes'); return n ? n.innerText : ''; });
  T('N13 Advance says where it goes and what will resolve', new RegExp('Advance to ' + (y0 + 1) + ' AH').test(adv) && /When the year turns:/.test(notes), { adv, notes });
  await page.evaluate(() => document.querySelector('.v13-adv-big').click()); await wait(900); await clear();
  sv = await save(); m = await home();
  T('N14 the year turns and the Year in review appears on Home', sv.c.year === y0 + 1 && new RegExp('THE YEAR THAT WAS · ' + (y0 + 1) + ' AH').test(m), { y0, y: sv.c.year, m: m.slice(0, 260) });
  await page.evaluate(() => { const b = document.querySelector('button[aria-label="Dismiss the year in review"]'); if (b) b.click(); }); await wait(200);
  T('N15 the review can be dismissed', !/THE YEAR THAT WAS/.test(await home()));
  await dest('Explore');
  await page.evaluate(() => { const b = [...document.querySelectorAll('.v13-adv')][0]; if (b) b.click(); }); await wait(900); await clear();
  T('N16 advancing from any destination goes Home for the review', /THE YEAR THAT WAS/.test(await home()) && !!(await page.$('.v13-hero')));

  /* ---------- the stages of a life put different things first ---------- */
  const stage = async (js) => { await inject('const c=s.c; c.dilemma=null; c.eyeAwake=null; c.scene=null; c.war=null; c.field=null; c.patrol=null; c.hit=null; c.raid=null; c.canonRun=null; c.broadcast=null; c.akatsuki=null; c.rogue=false; c.anbu=null; c.iron=null; c.actions=4; c.examCooldown=0; c.folk=null; ' + js); await dest('Home'); };
  await stage("c.rank=1; c.rankName='Academy Student'; c.age=12;");
  m = await chapterTxt();
  T('S1 an Academy student of twelve: graduation is the next chapter', /GRADUATION/.test(m) && /Take the exam/.test(m), m);
  await dest('Explore'); let pl = await places();
  T('S2 their Explore has the Academy and no mission desk or border', pl.includes('academy') && !pl.includes('desk') && !pl.includes('border'), pl);
  await stage("c.rank=2; c.rankName='Genin'; c.age=13; c.examCooldown=1;");
  m = await chapterTxt(); let hm = await home();
  T('S3 a genin: a mission is waiting, and the suggestions are about the work', /A MISSION IS WAITING/.test(m) && /Take a mission/.test(m) && /OR SPEND THE YEAR ON/.test(hm), m);
  await dest('Explore'); pl = await places();
  T('S4 a genin explores the mission desk and the border, not the tribunal', pl[0] === 'desk' && pl.includes('border') && !pl.includes('tribunal'), pl);
  await stage("c.rank=4; c.rankName='Jonin'; c.age=30;");
  m = await chapterTxt();
  await dest('Explore'); pl = await places();
  T('S5 a jonin: the village leans on them, and the tribunal and the court are open to them', /THE VILLAGE LEANS ON YOU/.test(m) && pl.includes('tribunal') && pl.includes('court'), { m, pl });
  await stage("c.rank=4; c.rogue=true; c.rankName='Missing-nin'; c.infamy=60; c.bingo='A'; c.bounty=900000; c.age=30;");
  m = await chapterTxt(); hm = await home();
  await dest('Explore'); pl = await places();
  T('S6 a missing-nin: hunted; the hideout and the underworld come first, no desk, no border', /HUNTED/.test(m) && /Find a contract/.test(m) && pl[0] === 'hideout' && pl.includes('underworld') && !pl.includes('desk') && !pl.includes('border') && /Bounty ¥900,000/.test(hm), { m, pl });
  await stage("c.rank=4; c.rogue=true; c.rankName='Missing-nin'; c.infamy=90; c.bingo='S'; c.akatsuki={ ring:'Kuu', ringName:'Sky', since:c.year-2, partner:'Kisame Hoshigaki', partnerId:'kisame', jobs:3, sealed:0, taken:[] }; c.age=30;");
  m = await chapterTxt(); hm = await home();
  T('S7 an Akatsuki member: the organisation is the chapter, with the strike beside it, and it is not repeated under what needs you', /THE ORGANISATION/.test(m) && /Ring Kuu of the Akatsuki/.test(m) && /Strike at someone/.test(m) && !/WHAT NEEDS YOU[\s\S]*Akatsuki ·/.test(hm), m);
  await dest('Explore'); pl = await places();
  T('S8 their hideout is the Akatsuki hideout', pl[0] === 'hideout' && /The Akatsuki Hideout/.test(await home()), pl);
  await stage("c.rank=6; c.rankName='Third Hokage'; c.standing=100; c.age=45;");
  m = await chapterTxt();
  T('S9 a Kage: the seat is the chapter', /THE SEAT/.test(m) && /Rule the/.test(m), m);
  await dest('Explore'); pl = await places();
  T('S10 the Kage explores the tower first', pl[0] === 'tower', pl);

  /* ---------- what is happening outranks where you are in life ---------- */
  const WAR = "c.war = { id: c.era, name: 'The war against Iwagakure', no: 0, years: 6, momentum: 50, contribution: 0, stage: 0, side: 'Konohagakure', great: false, allied: false, foes: [{ kind: 'village', key: 'iwa', name: 'Iwagakure', army: \"Iwagakure's forces\", leaderName: 'Onoki', leaderTitle: 'Third Tsuchikage', leaderId: 'onoki', strength: 52, pressure: 12, front: 'Kannabi Bridge', out: false, will: 70 }], allies: [], active: 0, pool: ['chunin'], champs: null, reinforced: 0, called: 0, joined: 0, blurb: '', enemyName: 'Iwagakure', enemyArmy: \"Iwagakure's forces\", leaderName: 'Onoki', leaderTitle: 'Third Tsuchikage', leader: 'onoki', front: 'Kannabi Bridge', vid: 'iwa' };";
  await stage("c.rank=4; c.rankName='Jonin'; c.age=30; " + WAR);
  m = await chapterTxt(); hm = await home();
  T('W1 at war, the war is the chapter, with field command as the way in', /AT WAR/.test(m) && /The war against Iwagakure/.test(m) && /Take command in the field/.test(m), m);
  T('W2 the war is not listed twice', !/WHAT NEEDS YOU[\s\S]{0,400}The war against Iwagakure/.test(hm), hm.slice(hm.indexOf('WHAT NEEDS YOU'), hm.indexOf('WHAT NEEDS YOU') + 200));
  await press('^Take command in the field'); await wait(400);
  T('W3 the chapter button opens the real field battle', /FIELD COMMAND · KANNABI BRIDGE/.test(await modalTxt()));
  await clickOv('^Fall back'); await wait(250); await clickOv('^Back to the war$'); await wait(250); await clear();
  await dest('World'); m = await home();
  T('W4 World shows your war and, for a jonin, the War Room', /YOUR WAR/.test(m) && /The War Room/.test(m), m.slice(0, 260));
  await press('^More$'); await wait(250);
  T('W5 More adds the War Room while there is a war', /The War Room/.test(await modalTxt()));
  await clear();

  /* ---------- a spent year points at the one thing left ---------- */
  await stage("c.rank=2; c.rankName='Genin'; c.age=14; c.actions=0; c.examCooldown=1; c.cheats.infActions=false;");
  m = await chapterTxt(); hm = await home();
  const sugL = await page.evaluate(() => [...document.querySelectorAll('.v13-sug')].map((b) => b.innerText.split('\n')[0]));
  T('Y1 with no actions left, the next chapter is advancing the year, and nothing that costs an action is suggested', /THE YEAR IS SPENT/.test(m) && /Advance to/.test(m) && /nothing left to give this year/.test(m) && !sugL.some((x) => /^(Train|Missions|Study jutsu|Walk the border)$/.test(x)), { m, sugL });

  /* ---------- a fight, from Explore, through the real mission flow ---------- */
  await inject("const c=s.c; c.rank=3; c.rankName='Chunin'; c.actions=4; c.cheats.infActions=true; c.cheats.oneShot=true; c.cheats.god=true; c.dilemma=null; c.examCooldown=1;");
  await dest('Explore');
  sv = await save(); const ms0 = sv.c.missions || 0;
  await page.evaluate(() => { const card = document.querySelector('.v13-place[data-place="desk"]'); const b = card && [...card.querySelectorAll('button')].find((x) => /^Missions$/.test(x.innerText.trim())); if (b) b.click(); }); await wait(300);
  await clickOv('^C-rank mission'); await wait(400);
  await clickOv('check · you have'); await wait(500);
  const fought = await fightTo('YOUR NEXT CHAPTER|EXPLORE');
  sv = await save();
  T('C1 a mission from the Explore desk runs the real battle and counts', fought && (sv.c.missions || 0) === ms0 + 1, { fought, before: ms0, after: sv.c.missions });

  /* ---------- the classic interfaces are still there ---------- */
  await clear(); await press('^More$'); await wait(250); await clickOv('^Appearance'); await wait(300);
  m = await modalTxt();
  T('K1 Appearance offers A Life Worth Living, the Dossier and the Scroll', /A Life Worth Living/.test(m) && /The Dossier/.test(m) && /The Scroll/.test(m));
  await page.evaluate(() => { const r = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => /^The Dossier/.test(x.innerText.trim())); if (r) r.click(); }); await wait(300); await clear();
  T('K2 the Dossier still works', !!(await page.$('.sl-hubs')) && !(await page.$('.v13')));
  await page.reload({ waitUntil: 'load' }); await wait(600);
  T('K3 and that choice survives a reload', !!(await page.$('.sl-hubs')) && (await prefs()).ui === 'dossier');
  await press('^Appearance'); await wait(200);
  if (!(await modalTxt())) { await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Appearance/.test(x.innerText)); if (b) b.click(); }); await wait(300); }
  await page.evaluate(() => { const r = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => /^A Life Worth Living/.test(x.innerText.trim())); if (r) r.click(); }); await wait(300); await clear();
  T('K4 and back again', !!(await page.$('.v13')));

  /* ---------- a save and preferences from before V13 ---------- */
  sv = await save();
  await page.evaluate(() => localStorage.setItem('shinobiLife.prefs.v1', JSON.stringify({ ui: 'dossier', layout: 'stacked', themeId: 'deep', bgMode: 'none', engineMode: 'off', motion: 'reduced' })));
  await page.reload({ waitUntil: 'load' }); await wait(700);
  const sv2 = await save();
  T('O1 a player from before V13 lands in the new interface once', !!(await page.$('.v13')) && (await prefs()).v13 === true);
  T('O2 and their life is untouched', sv2.c.name === sv.c.name && sv2.c.year === sv.c.year && sv2.c.age === sv.c.age && sv2.c.ryo === sv.c.ryo && (sv2.log || []).length === (sv.log || []).length);

  /* ---------- phones ---------- */
  await page.setViewportSize({ width: 390, height: 844 }); await wait(300);
  const phone = await page.evaluate(() => ({ bottom: getComputedStyle(document.querySelector('.v13-bottom')).display, tabs: getComputedStyle(document.querySelector('.v13-tabs')).display, wide: document.documentElement.scrollWidth <= window.innerWidth + 1 }));
  T('P1 on a phone the destinations move to a bottom bar and nothing scrolls sideways', phone.bottom !== 'none' && phone.tabs === 'none' && phone.wide, phone);
  await dest('World');
  T('P2 the bottom bar switches destinations', /THE WORLD ·/.test(await home()));
  await page.setViewportSize({ width: 1200, height: 950 }); await wait(200);

  await H.done();
})();
