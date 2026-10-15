/* 12.3 Marked: strikes for missing-nin and Akatsuki members (ported into the repo; runs on the classic Dossier so that layout keeps its coverage) */
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

  await age(3);
  const BASE = `c.dilemma=null; c.eyeAwake=null; c.scene=null; c.age=Math.max(c.age,30); c.birthYear=998-c.age; c.year=998; c.era='naruto'; c.rogue=true; c.rankName='Missing-nin'; c.infamy=60; c.bingo='A'; c.akatsuki=null; c.hit=null; c.hits=0; c.raid=null; c.dead=[]; c.held=[]; c.roster=['kakashi','guy','naruto','sasuke','sakura','itachi','kisame','deidara','sasori','lee','neji','tenten','danzo','pain','konan','hidan','kakuzu']; c.cheats.oneShot=true; c.cheats.god=true; c.cheats.infActions=true; c.actions=4; c.health=100; ['nin','tai','gen','cha','con','spd','str','int'].forEach(k=>c.stats[k]=95);`;
  await inject(`const c=s.c; ${BASE}`);
  await clear(); await tile('^Ninja path'); await page.waitForTimeout(300);
  let m = await modalTxt();
  T('S1 a missing-nin sees STRIKES on the Ninja Path', await page.evaluate(()=>!!document.querySelector('.sl-strikes')) && /Choose a target/.test(m), (m.match(/STRIKES\n[\s\S]{0,220}/)||[''])[0]);
  await clickOv('^Choose a target'); await page.waitForTimeout(300);
  m = await modalTxt();
  T('S2 the Strike window lists named shinobi strongest first, each rated against you', /A person and their people/.test(m) && /Itachi Uchiha/.test(m) && m.indexOf('Naruto Uzumaki') < m.indexOf('Kakashi Hatake') && /an even fight|below you|well above you/.test(m) && !/Kaguya Otsutsuki/.test(m), m.slice(0, 500));
  const once = (nm) => ('\n' + m + '\n').split('\n' + nm + '\n').length - 1;
  T('S2b young and grown files of the same person show once (Kakashi, Obito, Might Guy)', once('Kakashi Hatake') === 1 && once('Obito Uchiha') === 1 && once('Might Guy') === 1, { kakashi: once('Kakashi Hatake'), obito: once('Obito Uchiha'), guy: once('Might Guy') });
  await clickOv('^A person and their people$'); await page.waitForTimeout(250);
  m = await modalTxt();
  T('S3 a person and their people: Kakashi comes with his team, Itachi with Kisame', /Kakashi Hatake and their people\s*With (Sasuke Uchiha and Naruto Uzumaki|Naruto Uzumaki and Sasuke Uchiha)/.test(m) && /Itachi Uchiha and their people\s*With [^\n]*Kisame Hoshigaki/.test(m), (m.match(/Kakashi Hatake and their people[^\n]*\n[^\n]*/)||[''])[0] + ' | ' + (m.match(/Itachi Uchiha and their people[^\n]*\n[^\n]*/)||[''])[0]);
  await clickOv('^A group$'); await page.waitForTimeout(250);
  m = await modalTxt();
  T('S4 groups: the Akatsuki, teams, Root, hunter-nin, samurai, a bandit company', ['The Akatsuki', 'Team Kakashi', 'Team Guy', 'Root', 'hunter-nin', 'samurai of the Land of Iron', 'bandit company'].every((x)=>m.includes(x)), m.split('\n').filter(l=>/^(The |Team |Root|Kara|Orochimaru)/.test(l)).slice(0,14));
  await clickOv('^A village$'); await page.waitForTimeout(250);
  m = await modalTxt();
  T('S4b the village tab offers the march and the terror strikes', /March on /.test(m) && /Hit a village once/.test(m), m.split('\n').filter(l=>/March on|Hit a village/.test(l)).slice(0,6));
  /* a person, called out in the open */
  await clickOv('^A person$'); await page.waitForTimeout(250);
  await clickOv('^Deidara'); await page.waitForTimeout(300);
  m = await modalTxt();
  T('S5a picking a person shows the fight and the ways in', /MARK: DEIDARA/.test(m) && /THE FIGHTS, IN ORDER/.test(m) && /Ambush them on the road/.test(m) && /Call them out in the open/.test(m) && !/Bring your partner/.test(m), m.slice(0, 400));
  let sv = await save(); const inf0 = sv.c.infamy;
  await clickOv('^Call them out in the open'); await page.waitForTimeout(400);
  m = await ovTxt();
  T('S5b the mark window opens on fight 1 of 1', /MARKED: DEIDARA/.test(m) && /FIGHT 1 OF 1/.test(m), m.slice(0, 300));
  let r = await runHit(1);
  sv = await save(); m = await ovTxt();
  const nws = (sv.c.news||[]).map(x=>x.txt);
  T('S5c winning kills the mark, pays out, raises infamy and the Bingo Book reports the challenge', r==='ok' && sv.c.hit && sv.c.hit.done==='won' && sv.c.dead.includes('deidara') && sv.c.hits===1 && sv.c.infamy >= Math.min(100, inf0 + 16) && nws.some(t=>/Deidara/.test(t) && /(called Deidara out|accepted a challenge)/.test(t)) && /IT IS DONE/.test(m), { r, hit: sv.c.hit && sv.c.hit.done, hits: sv.c.hits, inf0, inf: sv.c.infamy, news: nws.filter(t=>/Deidara/.test(t)).slice(0,3) });
  await clickOv('^Close$'); await page.waitForTimeout(300);
  sv = await save();
  T('S5d closing the finished mark clears it', !sv.c.hit, sv.c.hit);
  /* a person and their people, from ambush */
  await openStrike(); await clickOv('^A person and their people$'); await page.waitForTimeout(250);
  await clickOv('^Itachi Uchiha and their people'); await page.waitForTimeout(300);
  m = await modalTxt();
  T('S6a the plan for Itachi lists three fights with Itachi last', /1\. Kisame Hoshigaki[\s\S]*2\. [\s\S]*3\. Itachi Uchiha/.test(m), (m.match(/THE FIGHTS[\s\S]{0,260}/)||[''])[0]);
  await clickOv('^Ambush them on the road'); await page.waitForTimeout(400);
  sv = await save();
  const first = sv.c.hit && sv.c.hit.first;
  r = await runHit(3);
  sv = await save(); m = await ovTxt();
  const nw2 = (sv.c.news||[]).map(x=>x.txt);
  T('S6b three fights: Kisame, then the second escort, then Itachi; all gone, title and a party story', r==='ok' && (first===1||first===-1) && sv.c.hit && sv.c.hit.done==='won' && ['itachi','kisame'].every(x=>sv.c.dead.includes(x)) && sv.c.titles.includes("Went Through Itachi Uchiha's Guard") && nw2.some(t=>/Itachi Uchiha/.test(t) && /(taken down together|Itachi Uchiha's party)/.test(t)), { r, first, beat: sv.c.hit && sv.c.hit.beat, titles: sv.c.titles.slice(-4), news: nw2.filter(t=>/Itachi/.test(t)).slice(0,3) });
  await clickOv('^Close$'); await page.waitForTimeout(300);
  /* a group */
  await openStrike(); await clickOv('^A group$'); await page.waitForTimeout(250);
  await clickOv('bandit company'); await page.waitForTimeout(300);
  sv = await save(); const ryo0 = sv.c.ryo;
  await clickOv('^Call them out in the open'); await page.waitForTimeout(400);
  r = await runHit(3);
  sv = await save();
  T('S7 a bandit company: three fights, their chest, and the title for breaking them', r==='ok' && sv.c.hit && sv.c.hit.done==='won' && sv.c.ryo - ryo0 >= 180000 && sv.c.titles.some(t=>/^Broke the .* bandit company$/.test(t)) && (sv.c.news||[]).some(x=>/bandit company/.test(x.txt)), { r, gain: sv.c.ryo - ryo0, titles: sv.c.titles.slice(-3) });
  await clickOv('^Close$'); await page.waitForTimeout(300);
  /* the Akatsuki, with a partner */
  await inject(`const c=s.c; c.hit=null; c.dilemma=null; c.akatsuki={ ring:'Ku', ringName:'Sky', since:c.year-3, partner:'Kakuzu', partnerId:'kakuzu', jobs:2, sealed:0, taken:[] }; c.actions=4;`);
  await clear(); await tile('^The Ring'); await page.waitForTimeout(300);
  m = await modalTxt();
  T('S8a the Akatsuki panel has Strike at someone', /Strike at someone/.test(m), (m.match(/Strike at someone[^\n]*\n[^\n]*/)||[''])[0]);
  await clickOv('^Strike at someone'); await page.waitForTimeout(300);
  m = await modalTxt();
  const noPartner = !/\nKakuzu\n/.test('\n' + m + '\n');
  await clickOv('^A group$'); await page.waitForTimeout(250);
  const m2 = await modalTxt();
  T('S8b your own partner is not on the list, and the Akatsuki is not a group target from inside it', noPartner && !/The Akatsuki\n/.test(m2), { noPartner, groups: m2.split('\n').filter(l=>/^(The |Team |Root|Kara)/.test(l)).slice(0,10) });
  await clickOv('^A person$'); await page.waitForTimeout(250);
  await clickOv('^Neji Hyuga'); await page.waitForTimeout(300);
  m = await modalTxt();
  T('S8c members can bring their partner', /Bring your partner/.test(m) && /Kakuzu comes with you/.test(m), (m.match(/Bring your partner[^\n]*\n[^\n]*/)||[''])[0]);
  await clickOv('^Bring your partner'); await page.waitForTimeout(400);
  m = await ovTxt();
  const edge = /Kakuzu is with you/.test(m);
  r = await runHit(1);
  sv = await save();
  const nw3 = (sv.c.news||[]).map(x=>x.txt).filter(t=>/Neji Hyuga/.test(t));
  T('S8d the strike counts as a job, and the paper names the cloaks and the partner', r==='ok' && edge && sv.c.akatsuki.jobs===3 && sv.c.hit.all===1 && nw3.some(t=>/black cloaks with red clouds/.test(t) && /Kakuzu was seen with them/.test(t)), { r, edge, jobs: sv.c.akatsuki.jobs, news: nw3.slice(0,2) });
  await clickOv('^Close$'); await page.waitForTimeout(300);
  await inject(`const c=s.c; c.hit=null; c.dilemma=null; c.dead=(c.dead||[]).concat(['kakuzu']); c.actions=4;`);
  await clear(); await tile('^The Ring'); await page.waitForTimeout(300);
  await clickOv('^Strike at someone'); await page.waitForTimeout(300);
  await clickOv('^A person$'); await page.waitForTimeout(250);
  await clickOv('^Tenten'); await page.waitForTimeout(300);
  m = await modalTxt();
  T('S8e with your partner dead there is no partner to bring', /Call them out in the open/.test(m) && !/Bring your partner/.test(m), m.slice(0, 300));
  await clickOv('^Back to the list'); await page.waitForTimeout(200);
  /* a failed attempt */
  await inject(`const c=s.c; c.hit=null; c.dilemma=null; c.akatsuki=null; c.cheats.oneShot=false; c.stats.spd=100; c.actions=4;`);
  await openStrike(); await clickOv('^Pain'); await page.waitForTimeout(300);
  await clickOv('^Call them out in the open'); await page.waitForTimeout(400);
  r = await runHit(1, true);
  sv = await save(); m = await ovTxt();
  T('S9 breaking off ends the strike as a failure, reported as a survived attempt', r==='ok' && sv.c.hit && sv.c.hit.done==='lost' && /IT FAILED/.test(m) && !sv.c.dead.includes('pain') && (sv.c.news||[]).some(x=>/Pain survived an attempt by/.test(x.txt)), { r, hit: sv.c.hit && sv.c.hit.done, ov: m.slice(0, 200) });
  await clickOv('^Close$'); await page.waitForTimeout(300);
  /* a mark goes cold */
  await inject(`const c=s.c; c.dilemma=null; c.cheats.oneShot=true; c.hit={ kind:'person', key:'konan', label:'Konan', tgt:'Konan', tid:'konan', stages:[{ key:'konan', id:'konan', n:'Konan', t:"God's Angel" }], i:0, first:0, all:0, how:'open', year:c.year-1, done:null, beat:[], pay:0 };`);
  await ageOnce();
  sv = await save();
  const body = await page.evaluate(()=>document.body.innerText);
  T('S10 a mark left too long goes cold at the new year', !sv.c.hit && /trail on Konan went cold/.test(body), { hit: sv.c.hit });
  /* a village shinobi does not get any of this */
  await inject(`const c=s.c; c.dilemma=null; c.rogue=false; c.akatsuki=null; c.hit=null; c.rankName='Jonin';`);
  await clear(); await tile('^Ninja path'); await page.waitForTimeout(300);
  T('S11 a shinobi with a village does not see STRIKES', !(await page.evaluate(()=>!!document.querySelector('.sl-strikes'))) && /NINJA PATH/.test(await modalTxt()));
    await H.done();
})();
