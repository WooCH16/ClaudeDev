'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3030;

// --projects /a,/b,/c  (복수) 또는 --project /a (단수, 하위 호환)
const projectsArgIdx = process.argv.indexOf('--projects');
const projectArgIdx  = process.argv.indexOf('--project');

let PROJECT_LIST;
if (projectsArgIdx !== -1) {
  PROJECT_LIST = process.argv[projectsArgIdx + 1]
    .split(',')
    .map(p => path.resolve(p.trim()));
} else if (projectArgIdx !== -1) {
  PROJECT_LIST = [path.resolve(process.argv[projectArgIdx + 1])];
} else {
  PROJECT_LIST = [process.cwd()];
}

const MULTI_MODE = PROJECT_LIST.length > 1;
const HTML_FILE  = path.join(__dirname, 'dashboard.html');

// Claude Code 세션 경로 인코딩
// C:\Develop\COAT → c--Develop-COAT
function encodeClaudePath(absPath) {
  return absPath
    .replace(/^([A-Za-z]):[\\/]/, (_, d) => d.toLowerCase() + '--')
    .replace(/[\\/]/g, '-');
}

// 현재 세션 usage 합산 (Sonnet 4.6 기준 요금)
// https://www.anthropic.com/pricing
const PRICE = {
  input:          3.00  / 1_000_000,
  output:         15.00 / 1_000_000,
  cacheRead:      0.30  / 1_000_000,
  cacheCreation:  3.75  / 1_000_000,
};

function sumUsageFromLines(lines, todayPrefix) {
  let input = 0, output = 0, cacheRead = 0, cacheCreate = 0;
  let dailyInput = 0, dailyOutput = 0, dailyCacheRead = 0, dailyCacheCreate = 0;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const u   = obj?.message?.usage;
      if (!u) continue;
      const i  = u.input_tokens                || 0;
      const o  = u.output_tokens               || 0;
      const cr = u.cache_read_input_tokens     || 0;
      const cc = u.cache_creation_input_tokens || 0;
      input       += i;  output      += o;
      cacheRead   += cr; cacheCreate += cc;
      if (todayPrefix && obj.timestamp && obj.timestamp.startsWith(todayPrefix)) {
        dailyInput += i;  dailyOutput += o;
        dailyCacheRead += cr; dailyCacheCreate += cc;
      }
    } catch { /* 파싱 실패 무시 */ }
  }
  return { input, output, cacheRead, cacheCreate, dailyInput, dailyOutput, dailyCacheRead, dailyCacheCreate };
}

function getClaudeUsage(projectRoot) {
  try {
    const encoded  = encodeClaudePath(projectRoot);
    const homeDir  = process.env.USERPROFILE || process.env.HOME || '';
    const dir      = path.join(homeDir, '.claude', 'projects', encoded);
    const files    = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'));
    if (!files.length) return null;

    // 오늘 날짜 prefix (YYYY-MM-DD, 로컬 기준)
    const now         = new Date();
    const todayPrefix = now.getFullYear() + '-'
      + String(now.getMonth() + 1).padStart(2, '0') + '-'
      + String(now.getDate()).padStart(2, '0');

    // 현재 세션 = 가장 최근 수정 파일
    const latest = files
      .map(f => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0].f;
    const sessionLines = fs.readFileSync(path.join(dir, latest), 'utf8').split('\n').filter(Boolean);
    const session = sumUsageFromLines(sessionLines, null);

    // 오늘 전체 = 오늘 수정된 모든 파일 합산
    const todayStart = new Date(todayPrefix + 'T00:00:00.000Z').getTime()
      - now.getTimezoneOffset() * 60000; // 로컬 자정 → UTC
    const todayFiles = files.filter(f =>
      fs.statSync(path.join(dir, f)).mtimeMs >= todayStart
    );
    let daily = { dailyInput: 0, dailyOutput: 0, dailyCacheRead: 0, dailyCacheCreate: 0 };
    for (const f of todayFiles) {
      const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean);
      const s = sumUsageFromLines(lines, todayPrefix);
      daily.dailyInput       += s.dailyInput;
      daily.dailyOutput      += s.dailyOutput;
      daily.dailyCacheRead   += s.dailyCacheRead;
      daily.dailyCacheCreate += s.dailyCacheCreate;
    }

    const dailyTotal = daily.dailyInput + daily.dailyOutput + daily.dailyCacheRead + daily.dailyCacheCreate;
    const sessionTotal = session.input + session.output + session.cacheRead + session.cacheCreate;

    const cost = session.input       * PRICE.input
               + session.output      * PRICE.output
               + session.cacheRead   * PRICE.cacheRead
               + session.cacheCreate * PRICE.cacheCreation;

    // 한도 읽기
    const config     = readJSON(path.join(coatDir(projectRoot), 'config.json'), {});
    const dailyLimit = config?.claude?.daily_token_limit || null;
    const dailyPct   = dailyLimit ? Math.min(100, Math.round(dailyTotal / dailyLimit * 100)) : null;

    return {
      input: session.input, output: session.output,
      cacheRead: session.cacheRead, cacheCreate: session.cacheCreate,
      cost: Math.round(cost * 10000) / 10000,
      sessionTotal, dailyTotal, dailyLimit, dailyPct,
    };
  } catch {
    return null;
  }
}

function coatDir(projectRoot) {
  return path.join(projectRoot, '.coat');
}

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function getState(projectRoot) {
  const dir = coatDir(projectRoot);
  const memory = readJSON(path.join(dir, 'state', 'memory.json'), {
    feature: '(없음)', phase: 'plan', round: 0,
    matchRate: { '기능': 0, 'UX': 0, '속도': 0 },
    team: { base: ['기획자', '개발자', '검증자'], dynamic: [], security: false },
    alignFailCount: 0, checklist: []
  });
  const backlog = readJSON(path.join(dir, 'state', 'backlog.json'), { items: [] });
  const history = readJSON(path.join(dir, 'state', 'history.json'), { items: [] });
  const config  = readJSON(path.join(dir, 'config.json'), { github: { enabled: false, repo: '' } });

  let snapshots = [];
  try {
    snapshots = fs.readdirSync(path.join(dir, 'snapshots'))
      .filter(f => f.endsWith('.md')).sort().reverse();
  } catch { /* 없으면 빈 배열 */ }

  return { memory, backlog, history, github: config.github, snapshots };
}

function getProjectsSummary() {
  return PROJECT_LIST.map((root, index) => {
    const memory = readJSON(
      path.join(coatDir(root), 'state', 'memory.json'),
      { feature: '(없음)', phase: 'plan', round: 0 }
    );
    return {
      index,
      name: path.basename(root),
      path: root,
      feature: memory.feature,
      phase: memory.phase,
      round: memory.round || 0,
    };
  });
}

// ── SSE ───────────────────────────────────────────────────

const sseClients = new Map(); // projectIndex → Set<res>

function getSseClients(idx) {
  if (!sseClients.has(idx)) sseClients.set(idx, new Set());
  return sseClients.get(idx);
}

const fsWatchers = new Map(); // projectIndex → FSWatcher

function ensureWatcher(idx) {
  if (fsWatchers.has(idx)) return;
  const stateDir = path.join(coatDir(PROJECT_LIST[idx]), 'state');
  try {
    const watcher = fs.watch(stateDir, { persistent: false }, () => {
      for (const client of getSseClients(idx)) {
        try { client.write('data: update\n\n'); } catch { getSseClients(idx).delete(client); }
      }
      // 멀티 모드: projects 요약도 갱신 알림 (index -1 관례)
      if (MULTI_MODE) {
        for (const client of getSseClients(-1)) {
          try { client.write('data: update\n\n'); } catch { getSseClients(-1).delete(client); }
        }
      }
    });
    fsWatchers.set(idx, watcher);
  } catch { /* state 디렉토리 없으면 무시 */ }
}

// ── HTTP Server ───────────────────────────────────────────

const server = http.createServer((req, res) => {
  const urlObj   = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;
  const projectParam = parseInt(urlObj.searchParams.get('project') || '0', 10);
  const idx = (projectParam >= 0 && projectParam < PROJECT_LIST.length) ? projectParam : 0;

  res.setHeader('Access-Control-Allow-Origin', '*');

  // SSE — 프로젝트별
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: connected\n\n');
    getSseClients(idx).add(res);
    ensureWatcher(idx);
    req.on('close', () => getSseClients(idx).delete(res));
    return;
  }

  // SSE — projects 요약 전용 (멀티 모드)
  if (pathname === '/api/events/projects') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: connected\n\n');
    getSseClients(-1).add(res);
    PROJECT_LIST.forEach((_, i) => ensureWatcher(i));
    req.on('close', () => getSseClients(-1).delete(res));
    return;
  }

  // Claude 세션 usage
  if (pathname === '/api/claude-usage') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getClaudeUsage(PROJECT_LIST[idx]) || {}));
    return;
  }

  // 전체 프로젝트 요약
  if (pathname === '/api/projects') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projects: getProjectsSummary(), multiMode: MULTI_MODE }));
    return;
  }

  // 단일 프로젝트 상태
  if (pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
      res.end(JSON.stringify(getState(PROJECT_LIST[idx])));
    } catch (e) {
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 스냅샷
  const snapshotMatch = pathname.match(/^\/api\/snapshot\/(.+\.md)$/);
  if (snapshotMatch) {
    const name     = path.basename(snapshotMatch[1]);
    const filePath = path.join(coatDir(PROJECT_LIST[idx]), 'snapshots', name);
    try {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(fs.readFileSync(filePath, 'utf8'));
    } catch {
      res.writeHead(404);
      res.end('Snapshot not found');
    }
    return;
  }

  // HTML
  if (pathname === '/' || pathname === '/dashboard.html') {
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(HTML_FILE, 'utf8'));
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
  console.log(`\n🧥 COAT Dashboard → ${url}`);
  if (MULTI_MODE) {
    console.log(`   프로젝트 ${PROJECT_LIST.length}개:`);
    PROJECT_LIST.forEach((p, i) => console.log(`   [${i}] ${p}`));
  }
  console.log();
  if (process.argv.includes('--open')) {
    const cmd = process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(cmd);
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} already in use.\n`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
