/* One whole life, end to end, lived through the new interface the way a player would:
   childhood, training, the Academy, a squad, missions, the Chunin Exams, promotion, love
   and a child, a war and a battle won, the seat, the world answering it years later, old
   age, death, and the child playing on into what their parent set going.
   The save is touched only to skip the years in between (and to make a young shinobi
   strong enough to pass); every step itself goes through the real screens. */
const { open } = require('./lib/harness.cjs');

(async () => {
  const H = await open();
  const { page, T, wait, clear, save, inject, bodyTxt, press, dest, ageOnce, settle, fightTo, newLife, clickOv, modalTxt } = H;
  const chapter = () => page.evaluate(() => (document.querySelector('.v13-chapter') || {}).innerText || '');
  const main = () => page.evaluate(() => (document.querySelector('.v13-main') || {}).innerText || '');
  const cardBtn = (k, re) => page.evaluate(([k, re]) => {
    const el = document.querySelector('.v13-place[data-place="' + k + '"]');
    const b = el && [...el.querySelectorAll('button')].find((x) => new RegExp(re).test(x.innerText.trim()) && !x.disabled);
    if (b) { b.click(); return b.innerText.split('\n')[0]; }
    return null;
  }, [k, re]);
  const calm = "c.dilemma=null; c.eyeAwake=null; c.broadcast=null; c.patrol=null; c.hit=null; c.raid=null; c.canonRun=null;";
  /* an exam is a run of attempts and fights; play it through */
  const EXAM_BACK = 'Attempt ·|Step into the ring|CHOOSE YOUR PATH|YOUR NEXT CHAPTER';
  const examThrough = async () => {
    for (let i = 0; i < 24; i++) {
      const t = await bodyTxt();
      let ok = true;
      if (/Step into the ring/.test(t)) { await press('^Step into the ring'); await wait(400); ok = await fightTo(EXAM_BACK); }
      else if (/Attempt ·/.test(t)) { await press('^Attempt ·'); await wait(350); continue; }
      else if (/Turn \d+/.test(t)) ok = await fightTo(EXAM_BACK);
      else break;
      if (!ok) { console.log('STUCK ' + JSON.stringify((await bodyTxt()).slice(0, 900))); await H.shot(process.env.SL_SHOT || '/tmp/stuck.png'); break; }
    }
    await settle();
  };

  /* ---------- childhood ---------- */
  await newLife({ name: 'Sora', cheats: false });
  let sv = await save();
  T('F1 a life starts small, on Home, with the chapter for a child', sv.c.rank <= 1 && /GROWING UP|THE ACADEMY|THE TRAINING YARD/.test(await chapter()), { age: sv.c.age, ch: (await chapter()).slice(0, 80) });
  for (let y = 0; y < 7 && (await save()).c.age < 6; y++) { await ageOnce(); await settle(); }
  await inject("const c=s.c; " + calm + " c.actions=4;");
  sv = await save(); const con0 = sv.c.stats.con;
  await dest('Explore');
  await cardBtn('train', '^Pick a regimen$'); await wait(250);
  await cardBtn('train', '^Tree Climbing'); await wait(350);
  sv = await save();
  T('F2 a child trains at the training grounds, right on the card', sv.c.stats.con > con0 && sv.c.actions === 3, { con0, con: sv.c.stats.con, age: sv.c.age });

  /* ---------- the Academy and graduation ---------- */
  await inject("const c=s.c; " + calm + " c.field=null; c.war=null; c.rank=1; c.rankName='Academy Student'; c.age=12; c.year=(c.birthYear||0)+12; ['nin','tai','gen','cha','con','spd','str','int'].forEach(k=>c.stats[k]=88); c.cheats=c.cheats||{}; c.cheats.oneShot=true; c.cheats.god=true; c.actions=4;");
  await dest('Home');
  T('F3 at twelve the next chapter is graduation', /GRADUATION|YOUR FIRST BATTLE/.test(await chapter()), (await chapter()).slice(0, 120));
  await press('^(Take the exam|Go to the line)'); await wait(400);
  await examThrough();
  sv = await save();
  T('F4 graduating gives a rank, a squad and a sensei', sv.c.rank === 2 && (sv.c.team || []).length > 0, { rank: sv.c.rank, team: (sv.c.team || []).map((t) => t.name) });
  await clear();

  /* ---------- a genin's year: missions and a squad ---------- */
  await inject("const c=s.c; " + calm + " c.actions=4; c.examCooldown=1; c.pending=null;");
  await dest('Explore');
  sv = await save(); const ms0 = sv.c.missions || 0;
  await cardBtn('desk', '^See the board$'); await wait(250);
  await cardBtn('desk', '^C-rank mission'); await wait(400);
  await clickOv('check · you have'); await wait(500);
  await fightTo('EXPLORE'); await settle();
  sv = await save();
  T('F5 a C-rank from the mission desk card is fought and counted', (sv.c.missions || 0) === ms0 + 1, { ms0, ms: sv.c.missions });
  await dest('Character');
  const mate = sv.c.team.find((t) => t.alive); const rel0 = mate.rel;
  await press('^(Spar with|Confide in) ' + mate.name.split(' ')[0]); await wait(300);
  sv = await save();
  T('F6 your squad lives on Character: a spar with a teammate moves the bond', sv.c.team.find((t) => t.name === mate.name).rel > rel0, { rel0, rel: sv.c.team.find((t) => t.name === mate.name).rel });

  /* ---------- the Chunin Exams, and jonin ---------- */
  await inject("const c=s.c; " + calm + " c.actions=4; c.age=14; c.year=(c.birthYear||0)+14; c.examCooldown=0;");
  await dest('Home');
  T('F7 when the exams open they are the next chapter', /THE CHUNIN EXAMS|THE CLAN HEAD/.test(await chapter()), (await chapter()).slice(0, 100));
  await press('^Enter$'); await wait(400);
  await examThrough();
  sv = await save();
  T('F8 the Chunin Exams, played through, make you chunin', sv.c.rank === 3, { rank: sv.c.rank, name: sv.c.rankName });
  await clear();
  /* the council's answer is a roll on power, standing and techniques, so a strong file and a few tries */
  let jon = false; const tries = [];
  for (let k = 0; k < 12 && !jon; k++) {
    await inject("const c=s.c; " + calm + " c.actions=4; c.chuninYears=3; c.joninVacancy=true; c.standing=100; ['nin','tai','gen','cha','con','spd','str','int'].forEach(x=>c.stats[x]=99); c.age=Math.max(c.age,19); c.year=(c.birthYear||0)+c.age;");
    await dest('Explore');
    const opened = await cardBtn('desk', '^Rank and promotion$'); await wait(300);
    const asked = await clickOv('^Accept '); await wait(400); await settle();
    const sv2 = await save();
    jon = sv2.c.rank >= 4;
    tries.push([opened, asked, ((sv2.log || []).slice(-1)[0] || {}).txt]);
  }
  T('F9 a chunin with the years and a vacancy is made jonin from the tower', jon, { rank: (await save()).c.rank, tries: tries.length, last: tries.slice(-1) });

  /* ---------- love, and a child ---------- */
  await inject("const c=s.c; " + calm + " c.actions=4; c.age=Math.max(c.age, 24); c.year=(c.birthYear||0)+c.age; c.crush=null; c.spouse=null;");
  await dest('Character');
  await press('^Look for someone'); await wait(300);
  for (let k = 0; k < 6 && ((await save()).c.crush || {}).rel <= 70; k++) {
    await inject("const c=s.c; " + calm + " c.actions=4;");
    await dest('Character'); await press('^Spend the day with'); await wait(300);
  }
  await press('^Propose to'); await wait(300);
  await inject("const c=s.c; " + calm + " c.actions=4;");
  await dest('Character'); await press('^Have a child with'); await wait(300);
  sv = await save();
  T('F10 meeting someone, the days together, the proposal and a child, all from Character', !!sv.c.spouse && (sv.c.kids || []).length === 1, { spouse: sv.c.spouse && sv.c.spouse.name, kids: (sv.c.kids || []).map((k) => k.name) });
  const heir = sv.c.kids[0].name;

  /* ---------- a war, and a battle won ---------- */
  const WAR = "c.war = { id: c.era, name: 'The war against Iwagakure', no: 0, years: 6, momentum: 50, contribution: 0, stage: 0, side: 'Konohagakure', great: false, allied: false, foes: [{ kind: 'village', key: 'iwa', name: 'Iwagakure', army: \"Iwagakure's forces\", leaderName: 'Onoki', leaderTitle: 'Third Tsuchikage', leaderId: 'onoki', strength: 52, pressure: 12, front: 'Kannabi Bridge', out: false, will: 70 }], allies: [], active: 0, pool: ['chunin'], champs: null, reinforced: 0, called: 0, joined: 0, blurb: '', enemyName: 'Iwagakure', enemyArmy: \"Iwagakure's forces\", leaderName: 'Onoki', leaderTitle: 'Third Tsuchikage', leader: 'onoki', front: 'Kannabi Bridge', vid: 'iwa' };";
  let won = false;
  for (let k = 0; k < 4 && !won; k++) {
    await inject("const c=s.c; " + calm + " c.actions=4; c.field=null; ['nin','tai','gen','cha','con','spd','str','int'].forEach(x=>c.stats[x]=99); " + (k ? "" : WAR));
    await dest('Home');
    await press('^Take command in the field'); await wait(400);
    for (let r = 0; r < 14; r++) {
      if (await clickOv('^Back to the war$')) break;
      if (!(await clickOv('^Lead from the front'))) await clickOv('^Order|Again$');
      await wait(250);
    }
    await clear();
    won = ((await save()).c.fieldRec || {}).won >= 1;
  }
  sv = await save();
  const battle = (sv.c.chron || []).find((x) => x.cat === 'war' && x.line === sv.c.name && /Iwagakure|broke|held|took the field/.test(x.txt));
  const memorial = (sv.c.echoes || []).find((e) => e.kind === 'battlefield' && battle && e.root === battle.id);
  T('F11 a field battle won goes in the record as yours, and the ground is set to remember it', won && !!battle && !!memorial, { won, battle: battle && battle.txt.slice(0, 100), due: memorial && memorial.due });

  /* ---------- the seat ---------- */
  await inject("const c=s.c; " + calm + " c.war=null; c.field=null; c.rank=6; c.rankName='Hokage'; c.actions=4;");
  await ageOnce(); await settle();
  sv = await save();
  const seat = (sv.c.chron || []).find((x) => /took the seat of/.test(x.txt) && x.line === sv.c.name);
  T('F12 taking the seat is a turning point in the record, with its own years to come', !!seat && (sv.c.echoes || []).filter((e) => e.root === (seat && seat.id)).length === 2, seat && seat.txt);
  T('F13 Home is a Kage\'s now', /THE SEAT|Rule the Village|Hokage/.test(await main()));

  /* ---------- the years answer ---------- */
  await inject("const c=s.c; " + calm + " (c.echoes||[]).forEach((e) => { if (e.kind === 'battlefield' || e.kind === 'seatFive') e.due = c.year + 1; });");
  await ageOnce(); await settle();
  let hm = await main();
  T('F14 years later the memorial and the verdict on your rule come back, and Home says they are yours', /AND BECAUSE OF WHAT YOU DID/.test(hm) && /memorial/i.test(hm) && /Five years into/.test(hm) && /Your doing/.test(hm), hm.slice(0, 500));

  /* ---------- old age ---------- */
  await inject("const c=s.c; " + calm + " c.age=74; c.year=(c.birthYear||0)+74; c.kids.forEach((k)=>{ k.age=Math.max(k.age,30); });");
  for (let y = 0; y < 2; y++) { await ageOnce(); await settle(); }
  sv = await save();
  T('F15 an old Hokage still gets years, and Home still knows who they are', sv.c.alive !== false && sv.c.age >= 76 && /Sora/.test(await main()), { age: sv.c.age });

  /* ---------- death ---------- */
  let t = '';
  for (let k = 0; k < 6 && !/THE MISSION ENDS/.test(t); k++) {
    await inject("const c=s.c; " + calm + " c.cheats.god=false; c.health=0; c.actions=0;");
    await ageOnce(); await wait(900);
    t = await bodyTxt();
  }
  T('F16 death ends on the record of the whole life', /THE MISSION ENDS/.test(t), t.slice(0, 160));

  /* ---------- the child plays on ---------- */
  /* with a grown child the record screen offers them by name; otherwise, a relative */
  const played = (await press('^Play on as ' + heir)) || (await press('^Play on as a relative'));
  await wait(900);
  for (let i = 0; i < 6 && await page.locator('.arr-wrap').count(); i++) { await page.mouse.click(600, 700); await wait(300); }
  await clear();
  sv = await save();
  T('F17 their child plays on, at Home, with the family\'s record carried over', !!played && !!(await page.$('.v13-hero')) && sv.c.name === heir && (sv.c.ancestors || []).some((a) => a.name === 'Sora') && (sv.c.chron || []).some((x) => x.line === 'Sora'), { played, name: sv.c.name, anc: (sv.c.ancestors || []).map((a) => a.name) });
  await inject("const c=s.c; " + calm + " (c.echoes||[]).forEach((e) => { if (e.kind === 'seatLegacy') e.due = c.year + 1; });");
  await ageOnce(); await settle();
  sv = await save();
  hm = await main();
  const legacy = (sv.c.chron || []).find((x) => x.cause === (seat && seat.id) && /took the seat of/.test(x.txt) && /start at the Academy/.test(x.txt));
  /* Home shows the latest three, whatever they are; the Chronicle lists every turning point */
  await dest('Chronicle');
  const ch = await main();
  const mo = ch.slice(ch.indexOf('WHAT YOU SET IN MOTION'));
  T('F18 what the parent set going lands in the child\'s life, and says whose doing it was', !!legacy && /BECAUSE OF YOU/.test(hm) && /Your (father|mother)'s doing/.test(hm) && /(FATHER|MOTHER)'S DOING/.test(mo) && /took the seat of/.test(mo) && /start at the Academy/.test(mo), { legacy: legacy && legacy.txt, home: hm.slice(hm.indexOf('BECAUSE OF'), hm.indexOf('BECAUSE OF') + 200), mo: mo.slice(0, 300) });

  await H.done();
})();
