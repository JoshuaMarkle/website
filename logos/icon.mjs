// The site icon: JM in the lit Halo type, drawn by the site itself and saved to public/ as favicon.ico,
// favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, and icon-192.png and icon-512.png for the manifest. Needs a build served on PORT (npm run build, then npm run preview),
// Chromium and ImageMagick.  node logos/icon.mjs [port]
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const PORT = process.argv[2] || '4321', OUT = new URL('../public/', import.meta.url).pathname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-'));
const ch = spawn('chromium', ['--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${tmp}/prof`, '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code) => { ch.kill('SIGKILL'); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(code); };
setTimeout(() => { console.error('timed out'); done(1); }, 60000);
for (let i = 0; i < 40; i++) { try { await fetch('http://127.0.0.1:9335/json/version'); break; } catch { await sleep(250); } }
const page = (await (await fetch('http://127.0.0.1:9335/json')).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const wait = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) { wait.get(m.id)?.(m.result); wait.delete(m.id); } };
const cdp = (method, params = {}) => new Promise((r) => { wait.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await cdp('Emulation.setDeviceMetricsOverride', { width: 560, height: 560, deviceScaleFactor: 2, mobile: false });
await cdp('Page.navigate', { url: `http://localhost:${PORT}/icon-render-404` }); await sleep(2500);
// the 404 page's lit number, alone on the screen, saying JM
await cdp('Runtime.evaluate', { expression: `{const s=document.createElement('style');s.textContent='#over,.foot,.nowhere,#nav{display:none!important}html{scrollbar-width:none!important;scrollbar-gutter:auto!important}.lost .hero{height:100vh!important}.lost .hero .halo{top:50%!important;left:56px!important;right:56px!important;height:330px!important}';document.head.append(s);document.querySelector('h1.halo').dataset.halo='JM';dispatchEvent(new Event('resize'))}` });
await sleep(3800);
const shot = await cdp('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(`${tmp}/raw.png`, Buffer.from(shot.data, 'base64'));
const sq = `${tmp}/sq.png`;
execFileSync('magick', [`${tmp}/raw.png`, '-crop', '1120x1060+0+40', '+repage', '-fuzz', '6%', '-trim', '+repage', '-gravity', 'center', '-background', 'black', '-extent', '106%x106%', '-resize', '1024x1024', '-extent', '1024x1024', sq]);
const png = (n, name) => execFileSync('magick', [sq, '-filter', 'Lanczos', '-resize', `${n}x${n}`, '-strip', `${OUT}${name}`]);
png(16, 'favicon-16x16.png'); png(32, 'favicon-32x32.png'); png(180, 'apple-touch-icon.png'); png(192, 'icon-192.png'); png(512, 'icon-512.png');
execFileSync('magick', [sq, '-filter', 'Lanczos', '-define', 'icon:auto-resize=48,32,16', `${OUT}favicon.ico`]);
console.log('wrote the icons to public/');
done(0);
