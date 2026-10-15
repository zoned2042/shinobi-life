/* Shared Playwright harness for Great Shinobi Life.
   Every suite drives the real built game (index.html + bundle.js) in Chromium:
   it starts a life, uses the owner panel for cheats where a test needs them,
   rewrites the save directly when a test needs a precise situation, and reports
   one PASS or FAIL line per check. Run them all with `npm test`. */
const { chromium } = require('playwright');

const URL = process.env.SL_URL || 'http://localhost:8793/index.html';
const CHROMIUM = process.env.SL_CHROMIUM || '/opt/pw-browsers/chromium';

async function open(opts = {}) {
  const browser = await chromium.launch({
    executablePath: CHROMIUM, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1200, height: 950 } });
  page.setDefaultTimeout(15000);
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'load' });
  /* prefs: quiet visuals so tests are fast. opts.ui pins an interface; leaving it out
     lets the game choose, which is how a returning player sees it */
  const prefs = { engineMode: 'off', motion: 'reduced', themeId: 'deep', bgMode: 'none', layout: 'stacked', cinema: 'off', touchFx: 'off', ...(opts.prefs || {}) };
  if (opts.ui) { prefs.ui = opts.ui; prefs.v13 = true; }
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('shinobiLife.prefs.v1', JSON.stringify(p)); }, prefs);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(350);
  return helpers(page, browser, errs);
}

function helpers(page, browser, errs) {
  let pass = 0, fail = 0;
  const wait = (ms) => page.waitForTimeout(ms);
  const T = (name, ok, extra) => {
    if (ok) pass += 1; else fail += 1;
    console.log(name + ': ' + (ok ? 'PASS' : 'FAIL') + (extra !== undefined ? ' ' + JSON.stringify(extra).slice(0, 600) : ''));
  };
  /* close whatever overlay is open, the way a player would: Back if there is one */
  const clear = async () => {
    for (let g = 0; g < 6; g++) {
      const has = await page.evaluate(() => !!document.querySelector('.fixed.inset-0.z-50'));
      if (!has) return;
      await page.evaluate(() => {
        const ov = document.querySelector('.fixed.inset-0.z-50');
        const bk = ov.querySelector('button[aria-label="Back"]');
        if (bk) { bk.click(); return; }
        const bs = [...ov.querySelectorAll('button')].filter((x) => !x.disabled);
        if (bs.length) bs[0].click();
      });
      await wait(210);
    }
  };
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('shinobiLife.save.v1')));
  const prefs = () => page.evaluate(() => JSON.parse(localStorage.getItem('shinobiLife.prefs.v1') || 'null'));
  /* rewrite the save and reload, for a precise situation */
  const inject = async (js) => {
    await page.evaluate((fs) => {
      const s = JSON.parse(localStorage.getItem('shinobiLife.save.v1'));
      (new Function('s', fs))(s);
      localStorage.setItem('shinobiLife.save.v1', JSON.stringify(s));
    }, js);
    await page.reload({ waitUntil: 'load' });
    await wait(700);
  };
  const modalTxt = () => page.evaluate(() => { const o = document.querySelector('.fixed.inset-0.z-50'); return o ? o.innerText : ''; });
  const ovTxt = () => page.evaluate(() => [...document.querySelectorAll('.fixed.inset-0')].map((o) => o.innerText).join('\n'));
  const bodyTxt = () => page.evaluate(() => document.body.innerText);
  /* press an enabled, visible button whose text matches, inside overlays only */
  const clickOv = (re) => page.evaluate((re) => {
    const r = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => new RegExp(re).test(x.innerText.trim()) && !x.disabled && x.offsetParent !== null);
    if (r) { const t = r.innerText.split('\n')[0]; r.click(); return t; }
    return null;
  }, re);
  /* press an enabled, visible button anywhere */
  const press = (re) => page.evaluate((re) => {
    const r = [...document.querySelectorAll('button')].find((x) => new RegExp(re).test(x.innerText.trim()) && !x.disabled && x.offsetParent !== null);
    if (r) { const t = r.innerText.split('\n')[0]; r.click(); return t; }
    return null;
  }, re);
  const tile = async (re) => { await clear(); return press(re); };
  /* the V13 destinations, by name */
  const dest = async (n) => {
    await clear();
    const ok = await page.evaluate((n) => {
      const b = [...document.querySelectorAll('.v13-tab, .v13-bt')].find((x) => x.getAttribute('aria-label') === n && x.offsetParent !== null);
      if (b) { b.click(); return true; }
      return false;
    }, n);
    await wait(250);
    return ok;
  };
  const ageOnce = async () => {
    await clear();
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('button')].find((x) => /Age up →|^Advance year|^Advance to/.test(x.innerText.trim()) && !x.disabled && x.offsetParent !== null);
      if (a) a.click();
    });
    await wait(500);
    await clear();
  };
  const age = async (n) => { for (let y = 0; y < n; y++) await ageOnce(); };
  /* one step of a battle: form the current seal, continue, or use the strongest move */
  const step = () => page.evaluate(() => {
    const cur = document.querySelector('.sl-seal-step[data-state="current"]');
    if (cur) {
      const id = cur.getAttribute('data-seal');
      const sb = id ? document.querySelector('.sl-seal-btn[data-seal="' + id + '"]') : document.querySelector('.sl-seal-btn');
      if (sb) { sb.click(); return 1; }
    }
    const done = [...document.querySelectorAll('button')].find((x) => !x.disabled && x.offsetParent !== null && x.innerText.trim() === 'Continue');
    if (done) { done.click(); return 1; }
    const moves = [...document.querySelectorAll('button')].filter((x) => !x.disabled && x.offsetParent !== null && /pow \d+/.test(x.innerText));
    const pw = (x) => +((x.innerText.match(/pow (\d+)/) || [])[1] || 0);
    const inst = moves.filter((x) => /instant/.test(x.innerText));
    const pk = (inst.length ? inst : moves).sort((a, b) => pw(b) - pw(a));
    if (pk.length) { pk[0].click(); return 1; }
    return 0;
  });
  const inBattle = () => page.evaluate(() => /Turn \d+/.test(document.body.innerText));
  /* fight until the battle is over and the text re appears (a window, a heading) */
  const fightTo = async (re, flee) => {
    for (let s = 0; s < 160; s++) {
      const st = await page.evaluate((re) => ({ vs: !!document.querySelector('.vs-wrap'), turn: /Turn \d+/.test(document.body.innerText), back: new RegExp(re).test([...document.querySelectorAll('.fixed.inset-0')].map((o) => o.innerText).join(' ') + ' ' + document.body.innerText) }), re);
      if (st.back && !st.turn) return true;
      if (st.vs) { await page.mouse.click(600, 500); await wait(250); continue; }
      if (flee) {
        const f = await page.evaluate(() => {
          const w = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Withdraw' && !x.disabled && x.offsetParent !== null);
          if (w) { w.click(); return 1; }
          const d = [...document.querySelectorAll('button')].find((x) => !x.disabled && x.offsetParent !== null && x.innerText.trim() === 'Continue');
          if (d) { d.click(); return 1; }
          return 0;
        });
        if (f) { await wait(250); continue; }
      }
      await step(); await wait(250);
    }
    return false;
  };
  /* finish any fight the year threw at us and close stray windows */
  const settle = async () => {
    for (let s = 0; s < 120; s++) {
      const st = await page.evaluate(() => ({ vs: !!document.querySelector('.vs-wrap'), turn: /Turn \d+/.test(document.body.innerText) }));
      if (!st.turn && !st.vs) break;
      if (st.vs) { await page.mouse.click(600, 500); await wait(250); continue; }
      await step(); await wait(250);
    }
    await clear();
  };
  /* the owner panel: five taps on the headband, then its toggles */
  const ownerPanel = async () => {
    const hb = page.locator('div[style*="cursor: pointer"][style*="flex-shrink"]').first();
    for (let i = 0; i < 6; i++) { await hb.click().catch(() => {}); await wait(160); }
    await wait(300);
  };
  const cheat = async (names) => {
    for (const n of names) {
      let ok = await page.evaluate((nn) => { const x = [...document.querySelectorAll('button')].find((y) => y.innerText.split('\n')[0].trim() === nn); if (x) { x.click(); return true; } return false; }, n);
      if (!ok) { await ownerPanel(); ok = await page.evaluate((nn) => { const x = [...document.querySelectorAll('button')].find((y) => y.innerText.split('\n')[0].trim() === nn); if (x) { x.click(); return true; } return false; }, n); }
      await wait(160);
    }
  };
  /* a fresh life: civilian-born, nobody from the histories, then the cheats a suite asks for */
  const newLife = async (o = {}) => {
    await page.locator('text=Nobody yet').first().click();
    await page.click('text=Continue →'); await page.click('text=Continue →');
    await page.fill('input[placeholder*="Name"]', o.name || 'Summit');
    await page.click('text=Continue →');
    await page.click('button:has-text("Civilian-born")');
    await page.click('text=Begin life');
    await wait(500);
    for (let i = 0; i < 6 && await page.locator('.arr-wrap').count(); i++) { await page.mouse.click(600, 700); await wait(280); }
    if (o.cheats !== false) {
      await ownerPanel();
      await cheat(o.cheats || ['God mode', 'Infinite actions', 'Learn every jutsu']);
      if (o.rank !== null) await cheat([o.rank || 'Jonin']);
      await clear();
    }
  };
  const shot = (file) => page.screenshot({ path: file });
  const done = async () => {
    console.log('ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
    console.log('SUMMARY pass=' + pass + ' fail=' + fail);
    await browser.close();
    process.exitCode = fail || errs.length ? 1 : 0;
  };
  return { page, browser, errs, wait, T, clear, save, prefs, inject, modalTxt, ovTxt, bodyTxt, clickOv, press, tile, dest, ageOnce, age, step, inBattle, fightTo, settle, ownerPanel, cheat, newLife, shot, done };
}

module.exports = { open, URL };
