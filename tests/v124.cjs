/* 12.4 Among Your People: Field Command, Border Patrol, the Village (ported into the repo; runs on the classic Dossier so that layout keeps its coverage) */
const { open } = require('./lib/harness.cjs');

(async () => {
  const H = await open({ ui: 'dossier' });
  const { page, T, clear, save, inject, modalTxt, tile, age, ageOnce, newLife } = H;
  await newLife();
  const ovTxt = () => page.evaluate(()=>[...document.querySelectorAll('.fixed.inset-0')].map(o=>o.innerText).join('\n'));
  const clickOv = (re) => page.evaluate((re)=>{ const r=[...document.querySelectorAll('.fixed.inset-0 button')].find(x=>new RegExp(re).test(x.innerText.trim())&&!x.disabled&&x.offsetParent!==null); if(r){const t=r.innerText.split('\n')[0]; r.click(); return t;} return null; }, re);
  const step = () => page.evaluate(()=>{ const cur=document.querySelector('.sl-seal-step[data-state="current"]'); if(cur){ const id=cur.getAttribute('data-seal'); const sb=id?document.querySelector('.sl-seal-btn[data-seal="'+id+'"]'):document.querySelector('.sl-seal-btn'); if(sb){ sb.click(); return 1; } }
        const done=[...document.querySelectorAll('button')].find(x=>!x.disabled&&x.offsetParent!==null&&x.innerText.trim()==='Continue'); if(done){done.click();return 1;}
        const moves=[...document.querySelectorAll('button')].filter(x=>!x.disabled&&x.offsetParent!==null&&/pow \d+/.test(x.innerText));
        const pw=(x)=>+((x.innerText.match(/pow (\d+)/)||[])[1]||0); const inst=moves.filter(x=>/instant/.test(x.innerText));
        const pk=(inst.length?inst:moves).sort((a,b)=>pw(b)-pw(a)); if(pk.length){pk[0].click();return 1;} return 0;});
  /* fight until the strike window is back up */
  const fight = async (flee) => {
    for (let s=0;s<160;s++){
      const st = await page.evaluate(()=>({ vs: !!document.querySelector('.vs-wrap'), turn: /Turn \d+/.test(document.body.innerText), hit: /FIGHT \d+ OF \d+|IT IS DONE|IT FAILED/.test([...document.querySelectorAll('.fixed.inset-0')].map(o=>o.innerText).join(' ')) }));
      if (st.hit && !st.turn) return true;
      if (st.vs) { await page.mouse.click(600,500); await page.waitForTimeout(250); continue; }
      if (flee) { const f = await page.evaluate(()=>{ const w=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Withdraw'&&!x.disabled&&x.offsetParent!==null); if(w){w.click();return 1;} const d=[...document.querySelectorAll('button')].find(x=>!x.disabled&&x.offsetParent!==null&&x.innerText.trim()==='Continue'); if(d){d.click();return 1;} return 0; }); if (f) { await page.waitForTimeout(250); continue; } }
      await step(); await page.waitForTimeout(250);
    }
    return false;
  };
  const runHit = async (n, flee) => { for (let i=0;i<n;i++){ const ok = await clickOv('^Fight$'); if (!ok) return 'no fight button at ' + i; await page.waitForTimeout(400); const r = await fight(flee); if (!r) return 'stuck in fight ' + i; await page.waitForTimeout(300); } return 'ok'; };
  const openStrike = async () => { await clear(); await tile('^Ninja path'); await page.waitForTimeout(300); await clickOv('^Choose a target'); await page.waitForTimeout(300); };

  const anyBtn = (re) => page.evaluate((re)=>{ const r=[...document.querySelectorAll('button')].find(x=>new RegExp(re).test(x.innerText.trim())&&!x.disabled&&x.offsetParent!==null); if(r){ r.click(); return r.innerText.split('\n')[0]; } return null; }, re);
  /* fight until the given window is back up */
  const fightTo = async (re) => {
    for (let s=0;s<160;s++){
      const st = await page.evaluate((re)=>({ vs: !!document.querySelector('.vs-wrap'), turn: /Turn \d+/.test(document.body.innerText), back: new RegExp(re).test([...document.querySelectorAll('.fixed.inset-0')].map(o=>o.innerText).join(' ')) }), re);
      if (st.back && !st.turn) return true;
      if (st.vs) { await page.mouse.click(600,500); await page.waitForTimeout(250); continue; }
      await step(); await page.waitForTimeout(250);
    }
    return false;
  };
  const openWar = async () => { await clear(); await tile('^The War'); await page.waitForTimeout(300); };
  const openPeople = async () => { await clear(); await anyBtn('^Your people'); await page.waitForTimeout(300); };

  await age(3);
  const BASE = `c.dilemma=null; c.eyeAwake=null; c.scene=null; c.age=Math.max(c.age,30); c.rogue=false; c.akatsuki=null; c.hit=null; c.field=null; c.patrol=null; c.folk=null; c.rank=4; c.rankName='Jonin'; c.anbu=null; c.cheats.oneShot=true; c.cheats.god=true; c.cheats.infActions=true; c.actions=4; c.health=100; ['nin','tai','gen','cha','con','spd','str','int'].forEach(k=>c.stats[k]=80);`;
  const WARX = `c.war = { id: c.era, name: 'The war against Iwagakure', no: 0, years: 6, momentum: 50, contribution: 0, stage: 0, side: 'Konohagakure', great: false, allied: false,
      foes: [{ kind: 'village', key: 'iwa', name: 'Iwagakure', army: "Iwagakure's forces", leaderName: 'Onoki', leaderTitle: 'Third Tsuchikage', leaderId: 'onoki', strength: 52, pressure: 12, front: 'Kannabi Bridge', out: false, will: 70 }],
      allies: [], active: 0, pool: ['chunin', 'chunin', 'chunin'], champs: null, reinforced: 0, called: 0, joined: 0, blurb: '', enemyName: 'Iwagakure', enemyArmy: "Iwagakure's forces", leaderName: 'Onoki', leaderTitle: 'Third Tsuchikage', leader: 'onoki', front: 'Kannabi Bridge', vid: 'iwa' };`;
  await inject(`const c=s.c; ${BASE} ${WARX}`);

  /* ---------------- FIELD COMMAND ---------------- */
  await openWar();
  let m = await modalTxt();
  T('F1 the war window offers Take command in the field, sized to a jonin (a division)', /Take command in the field/.test(m) && /Lead your division/.test(m) && !/Command a division/.test(m), (m.match(/Take command in the field[^\n]*\n[^\n]*/)||[''])[0]);
  await clickOv('^Take command in the field'); await page.waitForTimeout(350);
  m = await modalTxt();
  T('F2 the field window: both sides, round 1 of 6, the scouts read with a confidence, the orders', /FIELD COMMAND · KANNABI BRIDGE/.test(m) && /YOUR DIVISION/.test(m) && /AGAINST YOU/.test(m) && /ROUND 1 OF 6/.test(m) && /scouts are about \d+% sure/.test(m) && ['Charge','Hold the line','Flank','Ninjutsu barrage','Lead from the front','Fall back'].every(x=>m.includes(x)) && /Go after /.test(m), m.slice(0, 700));
  let sv = await save(); const mom0 = sv.c.war.momentum;
  for (let i=0;i<6;i++){ const o = await page.evaluate(()=>!!document.querySelector('.sl-field-done')); if (o) break; await clickOv(i % 2 ? '^Lead from the front' : '^(Charge|Flank)$'); await page.waitForTimeout(250); }
  sv = await save(); m = await modalTxt();
  const F = sv.c.field;
  T('F3 orders play out round by round and the battle ends with a result, moving the war and the record', F && F.done && F.round >= 1 && F.log.length >= 3 && sv.c.fieldRec && (sv.c.fieldRec.won + sv.c.fieldRec.lost + sv.c.fieldRec.drawn) === 1 && sv.c.war.momentum === Math.max(0, Math.min(100, mom0 + F.dm)) && /THEIR LINE BROKE|THE FIELD IS YOURS|NEITHER SIDE GAVE|DRIVEN OFF|YOUR LINE BROKE/.test(m), { done: F && F.done, round: F && F.round, dm: F && F.dm, mom0, mom: sv.c.war.momentum, rec: sv.c.fieldRec, log: F && F.log.slice(0,3).map(x=>x.t) });
  const fnews = (sv.c.news||[]).filter(x=>/Kannabi Bridge|KANNABI BRIDGE/.test(x.txt)).map(x=>x.txt);
  T('F4 the paper writes the battle up', fnews.length >= 1 || F.done === 'withdrew', fnews.slice(0,2));
  await clickOv('^Back to the war$'); await page.waitForTimeout(300);
  sv = await save();
  T('F5 closing a finished battle clears it', !sv.c.field);
  /* the commander duel */
  await inject(`const c=s.c; c.dilemma=null; c.actions=4; c.war.momentum=50;`);
  await openWar(); await clickOv('^Take command in the field'); await page.waitForTimeout(350);
  sv = await save(); const cmdName = sv.c.field.cmdr.name;
  await clickOv('^Go after '); await page.waitForTimeout(400);
  const back = await fightTo('FIELD COMMAND');
  sv = await save(); m = await modalTxt();
  T('F6 going after their commander is a real fight; winning breaks their morale and comes back to the battle', back && sv.c.field && sv.c.field.dueled === 1 && sv.c.field.cmdrDown && sv.c.field.log.some(x=>/You went looking for/.test(x.t)) && /FIELD COMMAND/.test(m), { back, cmd: cmdName, dueled: sv.c.field && sv.c.field.dueled, fmor: sv.c.field && sv.c.field.fmor });
  const dueledAgain = await page.evaluate(()=>{ const b=[...document.querySelectorAll('.fixed.inset-0 button')].find(x=>/^Go after /.test(x.innerText.trim())); return b ? b.disabled : null; });
  T('F7 one duel per battle', dueledAgain === true || !!(sv.c.field && sv.c.field.done), dueledAgain);
  if (!(sv.c.field && sv.c.field.done)) { await clickOv('^Fall back'); await page.waitForTimeout(300); }
  sv = await save();
  T('F8 Fall back ends it at once', sv.c.field && sv.c.field.done, sv.c.field && sv.c.field.done);
  await clickOv('^Back to the war$'); await page.waitForTimeout(300);
  /* an unfinished battle does not survive the new year */
  await inject(`const c=s.c; c.dilemma=null; c.actions=4; c.war.momentum=50;`);
  await openWar(); await clickOv('^Take command in the field'); await page.waitForTimeout(350);
  await clickOv('^Hold the line'); await page.waitForTimeout(250);
  await clear(); await ageOnce();
  sv = await save();
  T('F9 a battle left half-fought is resolved as a withdrawal at the new year', !sv.c.field && sv.c.fieldRec && sv.c.fieldRec.drawn >= 1, sv.c.fieldRec);
  /* a clan war, Warring States */
  await inject(`const c=s.c; ${BASE} c.era='warring'; c.clan='Uchiha'; c.clanRole='War Captain'; c.rank=4; c.war = { id:'warring', name:'The war with the Senju', no:0, years:4, momentum:50, contribution:0, stage:0, side:'the Uchiha clan', great:false, allied:false, foes:[{ kind:'clan', key:'Senju', name:'the Senju clan', army:'the Senju war bands', leaderName:'Butsuma Senju', leaderTitle:'head of the Senju', leaderId:'butsuma', strength:50, pressure:10, front:'the Naka river', out:false, will:70 }], allies:[], active:0, pool:['chunin'], champs:null, reinforced:0, called:0, joined:0, blurb:'', enemyName:'the Senju clan', enemyArmy:'the Senju war bands', leaderName:'Butsuma Senju', leaderTitle:'head of the Senju', leader:'butsuma', front:'the Naka river', foeClan:'Senju' };`);
  await openWar(); m = await modalTxt();
  const clanRow = /Lead your war band/.test(m);
  await clickOv('^Take command in the field'); await page.waitForTimeout(350);
  sv = await save();
  T('F10 in a clan war a War Captain leads the clan war band against a Senju War Captain', clanRow && sv.c.field && /Uchiha war band/.test(sv.c.field.unit) && /War Captain of the Senju/.test(sv.c.field.cmdr.title), { clanRow, unit: sv.c.field && sv.c.field.unit, cmdr: sv.c.field && sv.c.field.cmdr });
  await clear();

  /* ---------------- BORDER PATROL ---------------- */
  await inject(`const c=s.c; ${BASE} c.war=null; c.era='naruto'; c.birthYear=998-c.age; c.year=998;`);
  await clear(); await tile('^Ninja path'); await page.waitForTimeout(300);
  m = await modalTxt();
  T('P1 the Ninja Path has BORDER PATROL, and the old one-line border watch is off the duty list', /BORDER PATROL/.test(m) && /Walk the border patrol/.test(m) && !/Take the border watch/.test(m), (m.match(/BORDER PATROL[\s\S]{0,260}/)||[''])[0]);
  await clickOv('^Walk the border patrol'); await page.waitForTimeout(350);
  m = await modalTxt();
  T('P2 the patrol window opens on stop 1 of 3 with choices', /BORDER PATROL/.test(m) && /STOP 1 OF 3/.test(m), m.slice(0, 400));
  for (let i=0;i<3;i++){
    const isFight = await page.evaluate(()=>{ const r=[...document.querySelectorAll('.sl-patrol-stop button')][0]; return r ? /Fight/.test(r.innerText) : null; });
    await page.evaluate(()=>{ const r=[...document.querySelectorAll('.sl-patrol-stop button')][0]; if(r) r.click(); });
    await page.waitForTimeout(350);
    if (isFight) await fightTo('BORDER PATROL');
    await page.waitForTimeout(200);
  }
  sv = await save(); m = await modalTxt();
  T('P3 three stops, then paid, with the patrol counted', sv.c.patrol && sv.c.patrol.done && sv.c.patrol.log.length === 3 && sv.c.patrols === 1 && sv.c.dutyLog && sv.c.dutyLog.border === 1 && /PATROL DONE/.test(m), { done: sv.c.patrol && sv.c.patrol.done, log: sv.c.patrol && sv.c.patrol.log.map(x=>x.t.slice(0,90)), patrols: sv.c.patrols });
  await clickOv('^Close$'); await page.waitForTimeout(300);
  /* chosen stops: a missing-nin, a named rogue, a courier */
  await inject(`const c=s.c; c.dilemma=null; c.roster=['kakashi','guy','kisame','itachi']; c.dead=[]; c.patrol={ where:'the Land of Wind border', step:0, list:[{ id:'missing', x:{ name:'Doku Haran', rank:'B', key:'chunin', pay:150000, from:'Kirigakure' } }, { id:'rogue', x:'kisame' }, { id:'courier', x:null }], log:[], ryo:0, stand:0, done:false, year:c.year };`);
  await clear(); await tile('^Ninja path'); await page.waitForTimeout(300); await clickOv('^Back to the patrol'); await page.waitForTimeout(300);
  m = await modalTxt();
  const sawPage = /Doku Haran, B-rank, formerly of Kirigakure/.test(m);
  sv = await save(); const ry0 = sv.c.ryo;
  await clickOv('^Take them'); await page.waitForTimeout(400); await fightTo('BORDER PATROL');
  m = await modalTxt();
  const sawKisame = /Kisame Hoshigaki is crossing/.test(m);
  await clickOv('^Confront them'); await page.waitForTimeout(400); await fightTo('BORDER PATROL');
  await clickOv('^Wave them through'); await page.waitForTimeout(300);
  sv = await save();
  const pn = (sv.c.news||[]).map(x=>x.txt);
  T('P4 a Bingo Book name at the ford is taken and the bounty paid', sawPage && pn.some(t=>/Doku Haran, B-rank missing-nin formerly of Kirigakure, was taken at the Land of Wind border/.test(t)), { sawPage, news: pn.filter(t=>/Doku/.test(t)) });
  T('P5 once you are strong, a named rogue crosses; confronting them is a real fight to the death', sawKisame && sv.c.dead.includes('kisame') && sv.c.patrol.done, { sawKisame, dead: sv.c.dead, log: sv.c.patrol.log.map(x=>x.t.slice(0,80)) });
  await clickOv('^Close$'); await page.waitForTimeout(300);

  /* ---------------- THE VILLAGE ---------------- */
  await inject(`const c=s.c; ${BASE} c.war=null; c.standing=60; c.folk=null; c.crush=null; c.spouse=null;`);
  await openPeople();
  m = await modalTxt();
  T('V1 the People window has a way into the village', /Walk through /.test(m), (m.match(/Walk through [^\n]*\n[^\n]*/)||[''])[0]);
  await clickOv('^Walk through '); await page.waitForTimeout(400);
  m = await modalTxt(); sv = await save();
  T('V2 nine people who live there, each with a role, an age and a bond', sv.c.folk && sv.c.folk.list.length === 9 && ['Noodle cook','Academy teacher','Weaponsmith','Old soldier','Medic','Merchant','Gate guard','Old neighbour','Your apprentice'].every(x=>m.includes(x)), m.slice(0, 500));
  const cook = sv.c.folk.list.find(f=>f.role==='cook'); const b0 = cook.bond;
  await page.evaluate(()=>{ const b=document.querySelector('.sl-folk .sl-folk-visit'); if(b) b.click(); });
  await page.waitForTimeout(300);
  sv = await save(); m = await modalTxt();
  const cook2 = sv.c.folk.list.find(f=>f.role==='cook');
  T('V3 stopping by is free, raises the bond and is once a year', cook2.bond > b0 && cook2.seen === sv.c.year && /Seen this year/.test(m) && sv.c.actions >= 4, { b0, b1: cook2.bond, seen: cook2.seen });
  /* a legend, with requests waiting */
  await inject(`const c=s.c; c.dilemma=null; c.rank=6; c.standing=97; const L=c.folk.list; const g=(r)=>L.find(f=>f.role===r); g('teacher').req='speech'; g('cook').req='racket'; g('smith').bond=58; g('smith').perked=false; c.stats.tai=50; g('apprentice').age=11; g('apprentice').rank=0; g('apprentice').bond=60;`);
  await openPeople(); await clickOv('^Walk through '); await page.waitForTimeout(400);
  m = await modalTxt();
  T('V4 at legend tier the street talks differently and asks for legend-sized things', /a living legend/.test(m) && /Give the graduation address/.test(m), (m.match(/In the street you are[^\n.]*/)||[''])[0]);
  await page.evaluate(()=>{ const b=[...document.querySelectorAll('.sl-folk button')].find(x=>/Give the graduation address/.test(x.innerText)); if(b) b.click(); });
  await page.waitForTimeout(350);
  sv = await save();
  T('V5 helping with the address makes the paper and the bond', !sv.c.folk.list.find(f=>f.role==='teacher').req && (sv.c.news||[]).some(x=>/graduation address/.test(x.txt)), (sv.c.news||[]).filter(x=>/graduation/.test(x.txt)).map(x=>x.txt));
  await page.evaluate(()=>{ const b=[...document.querySelectorAll('.sl-folk button')].find(x=>/leaning on the stall/.test(x.innerText)); if(b) b.click(); });
  await page.waitForTimeout(400);
  const fb = await fightTo('ALL STREET|In the street you are');
  sv = await save();
  T('V6 a request can be a fight; winning it helps the cook', fb && !sv.c.folk.list.find(f=>f.role==='cook').req && sv.c.folk.list.find(f=>f.role==='cook').bond >= 20, { fb, bond: sv.c.folk.list.find(f=>f.role==='cook').bond });
  /* the smith's blade is a one-time gift when the bond gets there */
  m = await modalTxt();
  if (!/In the street you are/.test(m)) { await openPeople(); await clickOv('^Walk through '); await page.waitForTimeout(400); }
  await page.evaluate(()=>{ const cards=[...document.querySelectorAll('.sl-folk')]; const sm=cards.find(x=>/Weaponsmith/.test(x.innerText)); const b=sm && sm.querySelector('.sl-folk-visit'); if(b) b.click(); });
  await page.waitForTimeout(300);
  sv = await save();
  const sm = sv.c.folk.list.find(f=>f.role==='smith');
  T('V7 close enough to the smith and you get a blade made for your hand (+4 Taijutsu)', sm.perked && sv.c.stats.tai >= 54, { bond: sm.bond, perked: sm.perked, tai: sv.c.stats.tai });
  await clear(); await ageOnce();
  sv = await save();
  const ap = sv.c.folk.list.find(f=>f.role==='apprentice');
  T('V8 the apprentice grows up: graduates at 12 and the paper credits you', ap.rank === 1 && ap.age === 12 && (sv.c.news||[]).some(x=>new RegExp(ap.name + ' graduated from the Academy').test(x.txt)), { rank: ap.rank, age: ap.age });
  T('V9 a living legend gets a festival day and the title', !!sv.c.folk.fest && sv.c.titles.some(t=>/^Pride of /.test(t)) && (sv.c.news||[]).some(x=>/festival day/.test(x.txt)), { fest: sv.c.folk.fest, titles: sv.c.titles.slice(-3) });
  /* the apprentice stands with you in a war */
  await inject(`const c=s.c; c.dilemma=null; c.actions=4; ${WARX}`);
  await openWar(); await clickOv('^Take command in the field'); await page.waitForTimeout(350);
  sv = await save();
  T('V10 once they wear a headband and trust you, your apprentice is one of your lieutenants', sv.c.field && sv.c.field.lt.includes(ap.name), { lt: sv.c.field && sv.c.field.lt, ap: ap.name });
  await clickOv('^Fall back'); await page.waitForTimeout(250); await clickOv('^Back to the war$'); await page.waitForTimeout(250);
  /* a wedding makes the paper */
  await inject(`const c=s.c; c.dilemma=null; c.war=null; c.field=null; c.crush={ name:'Aya Mori', rel:90 }; c.spouse=null; c.actions=4;`);
  await openPeople(); await clickOv('^Propose to '); await page.waitForTimeout(350);
  sv = await save();
  T('V11 a legend\'s wedding is front-page news', !!sv.c.spouse && (sv.c.news||[]).some(x=>/THE WEDDING OF THE YEAR/.test(x.txt) && x.big), (sv.c.news||[]).filter(x=>/married/.test(x.txt)).map(x=>x.txt));
  /* gone rogue */
  await inject(`const c=s.c; c.dilemma=null; c.rogue=true; c.rankName='Missing-nin'; c.folk.list.forEach(f=>{ f.seen=null; });`);
  await openPeople();
  m = await modalTxt();
  const rogueRow = /The people you left behind/.test(m);
  await clickOv('^The people you left behind'); await page.waitForTimeout(350);
  m = await modalTxt();
  T('V12 as a missing-nin you can only see them after dark, and they ask you for nothing', rogueRow && /THE PEOPLE YOU LEFT/.test(m) && /Visit after dark/.test(m) && !/\nHelp\n/.test(m), { rogueRow, head: m.slice(0, 260) });
    await H.done();
})();
