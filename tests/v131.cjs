/* V13.1: places you use where they are, one war screen, one law screen, notices sized to
   what happened, and the world answering what you did years later. */
const { open } = require('./lib/harness.cjs');

(async () => {
  const H = await open();
  const { page, T, wait, clear, save, inject, modalTxt, bodyTxt, clickOv, press, dest, ageOnce, settle, fightTo, newLife } = H;
  const card = (k) => page.evaluate((k) => (document.querySelector('.v13-place[data-place="' + k + '"]') || {}).innerText || '', k);
  const cardBtn = (k, re) => page.evaluate(([k, re]) => {
    const el = document.querySelector('.v13-place[data-place="' + k + '"]');
    const b = el && [...el.querySelectorAll('button')].find((x) => new RegExp(re).test(x.innerText.trim()) && !x.disabled);
    if (b) { b.click(); return b.innerText.split('\n')[0]; }
    return null;
  }, [k, re]);
  const main = () => page.evaluate(() => (document.querySelector('.v13-main') || {}).innerText || '');
  const ovOpen = () => page.evaluate(() => !!document.querySelector('.fixed.inset-0.z-50'));

  await newLife({ name: 'Aoi' });
  await inject("const c=s.c; c.dilemma=null; c.cheats.infActions=false; c.cheats.oneShot=true; c.actions=4; c.age=22; c.examCooldown=1; c.war=null; c.field=null; c.patrol=null;");

  /* ---------- the mission desk, used where it is ---------- */
  await dest('Explore');
  await cardBtn('desk', '^See the board$'); await wait(250);
  let t = await card('desk');
  T('X1 the mission desk opens in place with the whole board and the duties of the rank', /D-rank mission/.test(t) && /S-rank mission/.test(t) && /Duty of the rank/.test(t) && !(await ovOpen()), t.slice(0, 300));
  let sv = await save(); const ms0 = sv.c.missions || 0;
  await cardBtn('desk', '^C-rank mission'); await wait(400);
  await clickOv('check · you have'); await wait(500);
  const fought = await fightTo('EXPLORE');
  await settle();
  sv = await save(); t = await card('desk');
  T('X2 a mission from the card is the real mission, and what happened shows under the card', fought && (sv.c.missions || 0) === ms0 + 1 && /JUST NOW/.test(t), { fought, ms0, ms: sv.c.missions, t: t.slice(0, 260) });

  /* ---------- the training ground ---------- */
  await inject("const c=s.c; c.actions=4; c.dilemma=null;");
  await dest('Explore');
  sv = await save(); const cha0 = sv.c.stats.cha;
  await cardBtn('train', '^Pick a regimen$'); await wait(250);
  await cardBtn('train', '^Meditation'); await wait(350);
  sv = await save(); t = await card('train');
  T('X3 training from the card spends the action, raises the stats and says so, without a window', sv.c.stats.cha > cha0 && sv.c.actions === 3 && /JUST NOW[\s\S]*Meditation/.test(t) && !(await ovOpen()), { cha0, cha: sv.c.stats.cha, actions: sv.c.actions });
  T('X4 one place is open at a time, across the full width', (await page.$$('.v13-place.is-open')).length === 1 && !!(await page.$('.v13-place.is-open[data-place="train"]')));

  /* ---------- the streets ---------- */
  if (!(await cardBtn('streets', '^See who is about$'))) { await cardBtn('streets', '^(Walk through|The whole street)$'); await wait(300); await clear(); await dest('Explore'); await cardBtn('streets', '^See who is about$'); }
  await wait(250);
  await cardBtn('streets', 'Stop by$'); await wait(300);
  sv = await save();
  T('X5 stopping by somebody happens on the street card', (sv.c.folk.list || []).some((f) => f.seen === sv.c.year) && /Seen this year/.test(await card('streets')), (await card('streets')).slice(0, 200));

  /* ---------- your people, on Character ---------- */
  await inject("const c=s.c; c.actions=4; c.dilemma=null; c.team=[{ name: 'Kaito Mori', alive: true, rel: 30, per: 'the quiet one' }, { name: 'Emi Sato', alive: true, rel: 64, per: 'the loud one' }];");
  await dest('Character');
  await press('^Spar with Kaito'); await wait(300);
  sv = await save();
  const ch = await main();
  T('X6 sparring a teammate from Character moves the bond and shows what happened there', sv.c.team[0].rel > 30 && /JUST NOW/.test(ch) && /Confide in Emi/.test(ch) && !(await ovOpen()), { rel: sv.c.team[0].rel });

  /* ---------- one war screen ---------- */
  const WAR = "c.war = { id: c.era, name: 'The war against Iwagakure', no: 0, years: 6, momentum: 50, contribution: 0, stage: 0, side: 'Konohagakure', great: false, allied: false, foes: [{ kind: 'village', key: 'iwa', name: 'Iwagakure', army: \"Iwagakure's forces\", leaderName: 'Onoki', leaderTitle: 'Third Tsuchikage', leaderId: 'onoki', strength: 52, pressure: 12, front: 'Kannabi Bridge', out: false, will: 70 }], allies: [], active: 0, pool: ['chunin'], champs: null, reinforced: 0, called: 0, joined: 0, blurb: '', enemyName: 'Iwagakure', enemyArmy: \"Iwagakure's forces\", leaderName: 'Onoki', leaderTitle: 'Third Tsuchikage', leader: 'onoki', front: 'Kannabi Bridge', vid: 'iwa' };";
  await inject("const c=s.c; c.rank=4; c.rankName='Jonin'; c.actions=4; c.dilemma=null; " + WAR);
  await dest('World');
  t = await main();
  const doors = await page.evaluate(() => [...document.querySelectorAll('.v13-door')].map((d) => d.innerText.split('\n')[0]));
  T('W1 World has one door for the war, not two', /YOUR WAR/.test(t) && doors.filter((d) => /war against Iwagakure|War Room/.test(d)).length === 1, doors);
  await press('^The war against Iwagakure'); await wait(400);
  let m = await modalTxt();
  T('W2 for a jonin it opens on the War Room, with a switch to your own part', /THE WAR ROOM/.test(m) && /Your part in it/.test(m), m.slice(0, 200));
  await clickOv('^Your part in it$'); await wait(300);
  m = await modalTxt();
  T('W3 the switch shows your part in the war, and switches back', /THE WAR AGAINST IWAGAKURE/.test(m) && !/Open the War Room/.test(m) && !!(await clickOv('^The War Room$')) && /THE WAR ROOM/.test(await (async () => { await wait(300); return modalTxt(); })()), m.slice(0, 160));
  await clear();
  await press('^More$'); await wait(250);
  m = await modalTxt();
  T('W4 More lists the war once', (m.match(/The war against Iwagakure/g) || []).length === 1 && !/^The War$/m.test(m), m.slice(m.indexOf('THE WORLD'), m.indexOf('THE WORLD') + 300));
  await clear();

  /* ---------- one law screen ---------- */
  await inject("const c=s.c; c.war=null; c.dilemma=null;");
  await dest('World');
  await press('^The law'); await wait(300);
  m = await modalTxt();
  T('J1 the law is one screen: the Iron Scales, the Vault and the standing orders', /The Iron Scales/.test(m) && /The Iron Vault/.test(m) && /The Standing Orders/.test(m), m.slice(0, 200));
  await clear();

  /* ---------- notices sized to what happened ---------- */
  await inject("const c=s.c; c.dilemma=null; c.moment={ t: 'A NAMED CRISIS', sub: 'The Ash Road Affair', tone: 'gold', y: c.year };");
  await wait(200);
  let toast = await page.evaluate(() => (document.querySelector('.v13-toast') || {}).innerText || '');
  T('N1 a moment is a notice at the edge of the screen, not a takeover', /A NAMED CRISIS/.test(toast) && !(await page.$('.sl-moment')), toast);
  await wait(3200);
  T('N2 and it goes away on its own', !(await page.$('.v13-toast')));
  await inject("const c=s.c; c.dilemma=null; c.killFlash={ name: 'Gozu', title: 'Demon Brother', tier: 1, count: 3, ryo: 4000 };");
  toast = await page.evaluate(() => (document.querySelector('.v13-toast') || {}).innerText || '');
  T('N3 a small kill is a notice', /BINGO BOOK ENTRY CLOSED/.test(toast) && /Gozu/.test(toast), toast);
  await inject("const c=s.c; c.dilemma=null; c.killFlash={ name: 'Madara Uchiha', title: 'Ghost of the Uchiha', tier: 4, count: 9, ryo: 90000000 };");
  t = await bodyTxt();
  T('N4 a legendary one still takes the whole screen', /LEGENDARY KILL/.test(t) && !(await page.$('.v13-toast')));
  await inject("const c=s.c; c.killFlash=null; c.moment=null;");

  /* ---------- cause and effect: the seat ---------- */
  await inject("const c=s.c; c.dilemma=null; c.rank=4; c.rankName='Jonin'; c.v13m={ name: c.name, rogue: false, seat: false, vid: c.village };");
  await inject("const c=s.c; c.dilemma=null; c.rank=6; c.rankName='Hokage';");
  const before = await save();
  await ageOnce(); await settle();
  sv = await save();
  if (sv.c.age === before.c.age) console.log('NOTURN ' + JSON.stringify({ body: (await bodyTxt()).slice(0, 700), adv: await page.evaluate(() => [...document.querySelectorAll('button')].filter((x) => /Advance/.test(x.innerText)).map((x) => [x.innerText.slice(0, 30), x.disabled])) }));
  const root = (sv.c.chron || []).find((x) => /took the seat of/.test(x.txt) && x.line === sv.c.name);
  const ech = (sv.c.echoes || []).filter((e) => ['seatFive', 'seatLegacy'].includes(e.kind));
  T('C1 taking the seat goes in the Chronicle as yours, with what follows scheduled', !!root && ech.length === 2 && ech.every((e) => e.root === root.id), { root: root && root.txt, ech: ech.map((e) => e.kind + '@' + e.due) });
  await inject("const c=s.c; c.dilemma=null; (c.echoes||[]).forEach((e) => { if (e.kind === 'seatFive') e.due = c.year + 1; });");
  await ageOnce(); await settle();
  sv = await save();
  const five = (sv.c.chron || []).find((x) => /Five years into/.test(x.txt));
  T('C2 five years on, the village answers, and the record says why', !!five && five.cause === (root && root.id), five && five.txt);
  t = await main();
  T('C3 the year in review says what came back because of you', /AND BECAUSE OF WHAT YOU DID/.test(t) && /Five years into/.test(t) && /Your doing/.test(t), t.slice(0, 400));
  await page.evaluate(() => { const b = document.querySelector('button[aria-label="Dismiss the year in review"]'); if (b) b.click(); });
  await wait(200);
  t = await main();
  T('C4 Home keeps it under Because of you', /BECAUSE OF YOU/.test(t) && /Five years into/.test(t));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.v13-because')].find((x) => /Five years into/.test(x.innerText)); if (b) b.click(); });
  await wait(300);
  m = await modalTxt();
  T('C5 and it opens on its full record, cause first', /took the seat of/.test(m) && /Five years into/.test(m), m.slice(0, 300));
  await clear();
  await dest('Chronicle');
  t = await main();
  T('C6 the Chronicle shows what you set in motion, and what is still on its way', /WHAT YOU SET IN MOTION/.test(t) && /took the seat of/.test(t) && /still working its way through the world|still working their way through the world/.test(t), t.slice(t.indexOf('WHAT YOU SET'), t.indexOf('WHAT YOU SET') + 400));

  /* ---------- cause and effect: the kid you teach ---------- */
  await inject("const c=s.c; c.dilemma=null; c.actions=4; c.rank=4; c.rankName='Jonin'; const ap=(c.folk.list||[]).find((f) => f.role==='apprentice'); ap.req='teach'; ap.rank=0; ap.age=11; ap.bond=40; ap.root=null;");
  await dest('Explore');
  await cardBtn('streets', '^See who is about$'); await wait(250);
  const helped = await cardBtn('streets', '^Help .*teach them a technique');
  await wait(300);
  sv = await save();
  const ap = sv.c.folk.list.find((f) => f.role === 'apprentice');
  const aroot = ap && (sv.c.chron || []).find((x) => x.id === ap.root);
  T('A1 teaching the kid is where their story starts, and it is yours', !!helped && !!aroot && aroot.line === sv.c.name && /started teaching/.test(aroot.txt), { helped, root: aroot && aroot.txt });
  await inject("const c=s.c; c.dilemma=null; const ap=c.folk.list.find((f) => f.role==='apprentice'); ap.age=12; ap.rank=0;");
  await ageOnce(); await settle();
  sv = await save();
  const grad = (sv.c.chron || []).find((x) => x.cause === (aroot && aroot.id) && /taught them/.test(x.txt));
  T('A2 when they graduate, the record ties it to you', !!grad, grad && grad.txt);

  await H.done();
})();
