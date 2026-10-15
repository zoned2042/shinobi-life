/* npm test: serve the built game, run every suite in tests/, report.
   node tests/run.cjs              all suites, two at a time
   node tests/run.cjs v13 strike   just those
   LANES=1 node tests/run.cjs      one at a time (slower, steadier)
   SL_LOGS=dir node tests/run.cjs  also keep each suite's full output in dir */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(0, '127.0.0.1', async () => {
  const url = 'http://127.0.0.1:' + server.address().port + '/index.html';
  const want = process.argv.slice(2);
  const all = fs.readdirSync(__dirname).filter((f) => f.endsWith('.cjs') && f !== 'run.cjs').map((f) => f.replace(/\.cjs$/, '')).sort();
  const suites = want.length ? all.filter((s) => want.includes(s)) : all;
  const lanes = Math.max(1, +(process.env.LANES || 2));
  const results = [];
  const run = (s) => new Promise((resolve) => {
    const t0 = Date.now(); let out = '';
    const p = spawn(process.execPath, [path.join(__dirname, s + '.cjs')], { env: { ...process.env, SL_URL: url } });
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => {
      if (process.env.SL_LOGS) { try { fs.mkdirSync(process.env.SL_LOGS, { recursive: true }); fs.writeFileSync(path.join(process.env.SL_LOGS, s + '.log'), out); } catch (e) { /* the log is a convenience */ } }
      const fails = out.split('\n').filter((l) => /: FAIL/.test(l));
      const passes = (out.match(/: PASS/g) || []).length;
      const errs = (out.match(/^ERRORS (\d+)/m) || [])[1];
      results.push({ s, code, passes, fails, errs: +(errs || 0), secs: Math.round((Date.now() - t0) / 1000) });
      console.log((code === 0 ? 'ok   ' : 'FAIL ') + s + '  ' + passes + ' passed' + (fails.length ? ', ' + fails.length + ' failed' : '') + (+errs ? ', ' + errs + ' page errors' : '') + '  (' + Math.round((Date.now() - t0) / 1000) + 's)');
      fails.forEach((l) => console.log('       ' + l.slice(0, 300)));
      if (code !== 0 && !fails.length) console.log(out.split('\n').slice(-12).map((l) => '       ' + l).join('\n'));
      resolve();
    });
  });
  const queue = suites.slice();
  await Promise.all(Array.from({ length: lanes }, async () => { while (queue.length) await run(queue.shift()); }));
  server.close();
  const bad = results.filter((r) => r.code !== 0);
  console.log('\n' + (results.length - bad.length) + ' of ' + results.length + ' suites passed.');
  process.exit(bad.length ? 1 : 0);
});
