'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3030;

// --project 인자로 프로젝트 경로 지정 가능
// 예: node server.js --project /path/to/myproject
// 미지정 시 현재 작업 디렉토리 기준
const projectArgIdx = process.argv.indexOf('--project');
const PROJECT_ROOT = projectArgIdx !== -1
  ? path.resolve(process.argv[projectArgIdx + 1])
  : process.cwd();

const COAT_DIR = path.join(PROJECT_ROOT, '.coat');
const HTML_FILE = path.join(__dirname, 'dashboard.html');

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function getState() {
  const memory = readJSON(path.join(COAT_DIR, 'state', 'memory.json'), {
    feature: '(없음)',
    phase: 'plan',
    round: 0,
    matchRate: { '기능': 0, 'UX': 0, '속도': 0 },
    team: { base: ['기획자', '개발자', '검증자'], dynamic: [], security: false },
    alignFailCount: 0,
    checklist: []
  });

  const backlog  = readJSON(path.join(COAT_DIR, 'state', 'backlog.json'),  { items: [] });
  const history  = readJSON(path.join(COAT_DIR, 'state', 'history.json'), { items: [] });
  const config   = readJSON(path.join(COAT_DIR, 'config.json'), {
    github: { enabled: false, repo: '' }
  });

  let snapshots = [];
  const snapshotsDir = path.join(COAT_DIR, 'snapshots');
  try {
    snapshots = fs.readdirSync(snapshotsDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
  } catch { /* 디렉토리 없으면 빈 배열 */ }

  return { memory, backlog, history, github: config.github, snapshots };
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
      res.end(JSON.stringify(getState()));
    } catch (e) {
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  const snapshotMatch = pathname.match(/^\/api\/snapshot\/(.+\.md)$/);
  if (snapshotMatch) {
    const name = path.basename(snapshotMatch[1]);
    const filePath = path.join(COAT_DIR, 'snapshots', name);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Snapshot not found');
    }
    return;
  }

  if (pathname === '/' || pathname === '/dashboard.html') {
    try {
      const html = fs.readFileSync(HTML_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(500);
      res.end('dashboard.html not found: ' + e.message);
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🧥 COAT Dashboard → ${url}\n`);
  if (process.argv.includes('--open')) {
    const cmd = process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open ${url}`
        : `xdg-open ${url}`;
    exec(cmd);
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} already in use. Kill the existing process and retry.\n`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
