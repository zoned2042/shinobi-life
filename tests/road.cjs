/* The Road: a missing-nin's Explore. The poster, the places with one true thing each, the
   people left behind, and three ways home that move with what you do, ending at the gate. */
const { open } = require('./lib/harness.cjs');

(async () => {
  const H = await open({ viewport: { width: 1440, height: 900 } });
  const { page, T, wait, save, inject, dest, ageOnce, settle, newLife } = H;
  const main = () => page.evaluate(() => (document.querySelector('.v13-main') || {}).innerText || '');
  const cardKeys = () => page.evaluate(() => [...document.querySelectorAll('.rd-card')].map((b) => b.dataset.place));
  const btnIn = (sel, re) => page.evaluate(([sel, re]) => {
    const el = document.querySelector(sel);
    const b = el && [...el.querySelectorAll('button')].find((x) => new RegExp(re).test(x.innerText.trim()) && !x.disabled);
    if (b) { b.click(); return b.innerText.split('\n')[0]; }
    return null;
  }, [sel, re]);
  const txt = (sel) => page.evaluate((sel) => (document.querySelector(sel) || {}).innerText || '', sel);
  const ovOpen = () => page.evaluate(() => !!document.querySelector('.fixed.inset-0.z-50'));
  const yen = (n) => '¥' + Number(n).toLocaleString('en-US');
  /* the Akatsuki can recruit a missing-nin this notorious in any year; that case has its own check at the end */
  const calm = "c.dilemma=null; c.eyeAwake=null; c.broadcast=null; c.hit=null; c.raid=null; c.canonRun=null; c.akatsuki=null;";

  /* ---------- a jonin walks out ---------- */
  await newLife({ name: 'Raven' });
  await inject("const c=s.c; " + calm + " c.age=22; c.cheats.infActions=false; c.actions=4; c.team=[{ name: 'Kaito Mori', gender: 'm', alive: true, rel: 50, per: 'quiet' }, { name: 'Emi Sato', gender: 'f', alive: true, rel: 50, per: 'loud' }]; c.sensei={ name: 'Jiro Takeda', alive: true, rel: 64, per: 'stern' };");
  await ageOnce(); await settle();
  await inject("const c=s.c; " + calm + " c.rogue=true; c.rankName='Missing-nin'; c.infamy=55; c.bingo='B'; c.bounty=300000; c.ryo=400000; c.actions=4;");
  await ageOnce(); await settle();
  let sv = await save();
  const leftE = (sv.c.chron || []).find((x) => x.id === (sv.c.v13m || {}).leftRoot);
  T('R1 walking out is remembered: the leaving is in the record, as yours', !!leftE && /left .+ and did not come back/.test(leftE.txt) && leftE.line === sv.c.name, leftE && leftE.txt);
  await inject("const c=s.c; " + calm + " c.actions=4; c.health=100;");
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.v13-tab')].map((b) => b.getAttribute('aria-label')));
  T('R2 for a missing-nin, Explore is The Road', tabs.includes('The Road') && !tabs.includes('Explore'), tabs);

  /* ---------- the poster and the road ---------- */
  await dest('The Road'); await wait(400);
  let m = await main(); sv = await save();
  T('R3 the poster carries the real name, rank and bounty, and how long you have been gone', /WANTED/.test(m) && m.includes(sv.c.name) && m.includes('Bounty ' + yen(sv.c.bounty)) && m.includes(sv.c.bingo ? 'Rank ' + sv.c.bingo : 'Unranked') && /Gone from \S+ \d+ year/.test(m), m.slice(0, 260));
  const ks = await cardKeys();
  T('R4 the road: the hideout first, the places you can still use, and a town that knows your face now', ks[0] === 'hideout' && ['market', 'towns', 'underworld', 'village'].every((k) => ks.includes(k)) && ks.includes('closed') && /Closed · They know your face there now/.test(m), ks);
  T('R5 each place says one true thing: the bounties posted, your purse', m.includes((sv.c.bounties || []).length + ' bount') && m.includes('Your purse: ' + yen(sv.c.ryo)));
  await page.click('.rd-card[data-place="underworld"]'); await wait(250);
  let p = await txt('.rd-panel');
  T('R6 a place opens where it is: the underworld and its contracts', /The Underworld/.test(p) && /Low-risk contract/.test(p) && /High-risk contract/.test(p) && !(await ovOpen()), p.slice(0, 160));
  await page.click('.rd-card[data-place="hideout"]'); await wait(250);
  sv = await save(); const cha0 = sv.c.stats.cha; const a0 = sv.c.actions;
  await btnIn('.rd-panel', '^Meditation'); await wait(350);
  sv = await save(); p = await txt('.rd-panel');
  T('R7 the hideout is where you train while you lie low, and it says what happened', sv.c.stats.cha > cha0 && sv.c.actions === a0 - 1 && /JUST NOW/.test(p), { cha0, cha: sv.c.stats.cha, a0, a: sv.c.actions });

  /* ---------- what you left behind ---------- */
  sv = await save(); const rel0 = sv.c.team.map((t) => t.rel); const a1 = sv.c.actions;
  await btnIn('.rd-person[data-who="squad"]', '^Send word$'); await wait(300);
  sv = await save();
  T('R8 word to your old squad: free, once a year, and they feel it', sv.c.team.every((t, i) => t.rel > rel0[i]) && sv.c.actions === a1 && /Word sent this year/.test(await txt('.rd-person[data-who="squad"]')), { rel0, rel: sv.c.team.map((t) => t.rel) });
  const imgs = await page.evaluate(() => [...document.querySelectorAll('.rd-face')].map((i) => [i.getAttribute('src'), i.naturalWidth || 0]));
  const srcs = imgs.map((x) => x[0]);
  T('R9 the faces come from img/faces by role, and they load', ['img/faces/wanted-1.webp', 'img/faces/squad-1.webp', 'img/faces/sensei-1.webp', 'img/faces/family-f-1.webp', 'img/faces/street-1.webp'].every((f) => srcs.includes(f)) && imgs.filter((x) => x[0]).every((x) => x[1] > 0), imgs);
  sv = await save(); const sr0 = sv.c.sensei.rel; const a2 = sv.c.actions;
  const visit = await btnIn('.rd-person[data-who="sensei"]', '^Visit \\(');
  await wait(300); sv = await save();
  T('R10 visiting your sensei costs the year an action, says the risk in words, and moves them', !!visit && /unlikely to be seen|they may notice you|they are watching the road/.test(visit) && sv.c.sensei.rel > sr0 && sv.c.actions === a2 - 1 && /Seen this year/.test(await txt('.rd-person[data-who="sensei"]')), { visit, sr0, rel: sv.c.sensei.rel });

  /* ---------- the way back ---------- */
  await inject("const c=s.c; " + calm + " c.actions=4; c.ryo=400000;");
  await dest('The Road'); await wait(300);
  sv = await save();
  const owed = Math.max(100000, Math.round(sv.c.bounty / 1000) * 1000);
  let way = await txt('.rd-way');
  T('R11 the debt is your bounty, nothing paid yet', way.includes(yen(0) + ' / ' + yen(owed)), way.slice(0, 300));
  const paid = await btnIn('.rd-path[data-path="debt"]', '^Pay ');
  await wait(300); sv = await save(); way = await txt('.rd-way');
  const amt = paid ? +paid.replace(/[^0-9]/g, '') : 0;
  T('R12 paying into the debt takes exactly that from your purse and moves the bar', amt > 0 && sv.c.ryo === 400000 - amt && sv.c.road.paid === amt && way.includes(yen(amt) + ' / ' + yen(owed)), { paid, ryo: sv.c.ryo, road: sv.c.road });
  let fav = 0;
  for (let k = 0; k < 8 && !fav; k++) {
    await inject("const c=s.c; " + calm + " c.actions=4; if (c.road) c.road.favourYear=null;");
    await dest('The Road');
    await btnIn('.rd-path[data-path="pardon"]', '^Do them a quiet favour$'); await wait(300);
    fav = ((await save()).c.road || {}).favours || 0;
  }
  T('R13 a quiet favour for the old village counts toward a pardon', fav === 1 && /1 \/ 5 favours/.test(await txt('.rd-way')), { fav });
  sv = await save();
  const home = sv.c.v13m.vid; const other = home === 'iwa' ? 'kumo' : 'iwa';
  const notYet = /Opens if .+ goes to war/.test(await txt('.rd-path[data-path="cause"]'));
  await inject("const c=s.c; " + calm + " c.actions=4; c.world.wars=(c.world.wars||[]).concat([{ a: '" + home + "', b: '" + other + "', years: 3, great: false, no: 0 }]);");
  await dest('The Road');
  const cause = await txt('.rd-path[data-path="cause"]');
  T('R14 a greater cause opens when the village you left goes to war', /is at war\. Fight for them, unasked\./.test(cause) && !!(await page.evaluate(() => { const b = document.querySelector('.rd-path[data-path="cause"] button'); return b && !b.disabled; })), { notYet, cause });
  T('R15 the way back names the closest road home and what an envoy would hear', /Closest: .+% of the way\./.test(await txt('.rd-return')) && /An envoy now: /.test(await txt('.rd-return')), await txt('.rd-return'));

  /* ---------- home ---------- */
  await inject("const c=s.c; " + calm + " c.actions=4; c.road.paid=" + (owed + 1000000) + "; c.bounty=" + sv.c.bounty + ";");
  await dest('The Road');
  way = await txt('.rd-return');
  T('R16 with one road finished, they are ready to take you back', /They are ready to take you back\./.test(way) && /Go home to /.test(way), way);
  await btnIn('.rd-return', '^Go home to '); await wait(500);
  sv = await save();
  const back = (sv.c.chron || []).find((x) => /came home to/.test(x.txt) && x.line === sv.c.name);
  T('R17 you go home: off the road, the bounty cleared, and the record says it was the leaving that this ends', !sv.c.rogue && !sv.c.bounty && !!back && back.cause === (leftE && leftE.id) && !sv.c.road, { rogue: sv.c.rogue, bounty: sv.c.bounty, back: back && back.txt, cause: back && back.cause });
  const tabs2 = await page.evaluate(() => [...document.querySelectorAll('.v13-tab')].map((b) => b.getAttribute('aria-label')));
  T('R18 and Explore is Explore again', tabs2.includes('Explore') && !tabs2.includes('The Road'), tabs2);

  /* ---------- an Akatsuki member cannot just walk back ---------- */
  await inject("const c=s.c; " + calm + " c.rogue=true; c.akatsuki={ ring:'Kuu', ringName:'Sky', since:c.year-2, partner:'Kisame Hoshigaki', partnerId:'kisame', jobs:3, sealed:0, taken:[] };");
  await dest('The Road');
  way = await txt('.rd-way');
  T('R19 for the Akatsuki the way back says what stands in it, and offers no envoy', /You would have to leave the Akatsuki first\./.test(way) && !/Send an envoy home/.test(way) && /The Akatsuki Hideout/.test(await main()), way.slice(0, 200));

  /* ---------- a narrow window still works ---------- */
  await page.setViewportSize({ width: 390, height: 844 }); await wait(300);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  T('R20 on a narrow window it stacks instead of spilling sideways', over <= 1, { over });

  await H.done();
})();
