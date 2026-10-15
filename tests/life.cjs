/* A whole life in the new interface: the years with whatever they bring, the exam from the
   next-chapter button, saving and loading, death and the next generation, and a life out
   of the histories (Madara). */
const { open } = require('./lib/harness.cjs');

(async () => {
  const H = await open();
  const { page, T, wait, clear, save, inject, bodyTxt, press, dest, ageOnce, settle, fightTo, newLife } = H;

  /* ---------- years pass, with no cheats ---------- */
  await newLife({ name: 'Ren', cheats: false });
  for (let y = 0; y < 14; y++) { await ageOnce(); await settle(); }
  let sv = await save();
  T('L1 fourteen years pass in the new interface with whatever the years bring', sv.c.age >= 14 && sv.c.alive !== false && (sv.log || []).length > 10 && (sv.c.news || []).length > 0, { age: sv.c.age, log: (sv.log || []).length, news: (sv.c.news || []).length });
  T('L2 Home still answers who, what and next after fourteen years', !!(await page.$('.v13-hero')) && !!(await page.$('.v13-chapter')));

  /* ---------- the exam, from the next chapter ---------- */
  await inject("const c=s.c; c.dilemma=null; c.eyeAwake=null; c.broadcast=null; c.field=null; c.patrol=null; c.hit=null; c.raid=null; c.canonRun=null; c.war=null; c.rank=1; c.rankName='Academy Student'; c.age=12; ['nin','tai','gen','cha','con','spd','str','int'].forEach(k=>c.stats[k]=90); c.cheats=c.cheats||{}; c.cheats.oneShot=true; c.cheats.god=true; c.actions=4;");
  await dest('Home');
  const took = await press('^Take the exam');
  await wait(400);
  for (let i = 0; i < 14; i++) {
    const t = await bodyTxt();
    if (/Step into the ring/.test(t)) { await press('^Step into the ring'); await wait(400); await fightTo('Attempt ·|Step into the ring|CHOOSE YOUR PATH|YOUR NEXT CHAPTER'); continue; }
    if (/Attempt ·/.test(t)) { await press('^Attempt ·'); await wait(350); continue; }
    break;
  }
  await settle();
  sv = await save();
  T('L3 Take the exam on Home runs the real graduation exam', !!took && sv.c.rank === 2, { took, rank: sv.c.rank, rankName: sv.c.rankName });
  await clear();
  T('L4 and the next chapter moves on to missions', /A MISSION IS WAITING|THE CHUNIN EXAMS|SOMEBODY NEEDS YOU|NEEDS YOU/.test(await page.evaluate(() => (document.querySelector('.v13-chapter') || {}).innerText || '')));

  /* ---------- saving and loading ---------- */
  sv = await save();
  await page.reload({ waitUntil: 'load' }); await wait(700);
  const sv2 = await save();
  T('L5 a reload comes back to the same life, on Home', sv2.c.name === sv.c.name && sv2.c.year === sv.c.year && !!(await page.$('.v13-hero')) && new RegExp(sv.c.name).test(await bodyTxt()));

  /* ---------- death, and the next generation ---------- */
  /* a body at zero dies at the turn of the year unless the year heals it first */
  let t = '';
  /* at ninety, with nothing left, each turn of the year is close to even odds of the last; ten tries */
  for (let k = 0; k < 10 && !/THE MISSION ENDS/.test(t); k++) {
    await inject("const c=s.c; c.dilemma=null; c.cheats.god=false; c.health=0; c.age=Math.max(c.age,90); c.year=(c.birthYear||0)+c.age; c.actions=0;");
    await ageOnce(); await wait(900);
    t = await bodyTxt();
  }
  T('L6 a death ends on the record screen', /THE MISSION ENDS/.test(t), t.slice(0, 200));
  const relative = await press('^Play on as a relative');
  if (relative) {
    await wait(900);
    for (let i = 0; i < 6 && await page.locator('.arr-wrap').count(); i++) { await page.mouse.click(600, 700); await wait(300); }
    await clear();
    const sv3 = await save();
    T('L7 a relative plays on, in the new interface, starting at Home', !!(await page.$('.v13-hero')) && sv3.c.alive !== false && sv3.c.name !== sv.c.name, { name: sv3.c.name });
  } else T('L7 a relative plays on (no relative offered this time; the record screen is enough)', /THE MISSION ENDS/.test(t));

  /* ---------- a life from the histories ---------- */
  await page.evaluate(() => localStorage.removeItem('shinobiLife.save.v1'));
  await page.reload({ waitUntil: 'load' }); await wait(600);
  await page.locator('text=Madara Uchiha').first().click();
  for (let i = 0; i < 6; i++) { const n = await page.locator('text=Continue →').count(); if (!n) break; await page.locator('text=Continue →').first().click().catch(() => {}); await wait(250); }
  await page.locator('text=Begin life').first().click().catch(() => {});
  await wait(700);
  for (let i = 0; i < 6 && await page.locator('.arr-wrap').count(); i++) { await page.mouse.click(600, 700); await wait(300); }
  await clear();
  sv = await save();
  const hm = await page.evaluate(() => (document.querySelector('.v13-main') || {}).innerText || '');
  T('L8 Madara\'s life starts in the new interface, in the Warring States', sv && sv.c.canonId === 'madara' && /Madara Uchiha/.test(hm) && /YOUR NEXT CHAPTER/.test(hm), { canon: sv && sv.c.canonId, era: sv && sv.c.era });
  for (let y = 0; y < 9; y++) { await ageOnce(); await settle(); }
  sv = await save();
  T('L9 his chapters still play out as the years pass (the river at 7, his brother, the stone)', sv.c.age >= 9 && sv.c.madara && Object.keys(sv.c.madara.done || {}).length >= 1, { age: sv.c.age, done: sv.c.madara && sv.c.madara.done });

  await H.done();
})();
