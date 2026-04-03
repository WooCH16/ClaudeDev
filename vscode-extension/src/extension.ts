import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface Memory {
  feature?: string;
  phase?: string;
  round?: number;
  matchRate?: { '기능': number; 'UX': number; '속도': number };
  checklist?: Array<{ id: string; label: string; done: boolean }>;
}

let statusBarItem: vscode.StatusBarItem;
let usageBarItem:  vscode.StatusBarItem;
let watcher: fs.FSWatcher | null = null;

const PRICE = {
  input:         3.00  / 1_000_000,
  output:        15.00 / 1_000_000,
  cacheRead:     0.30  / 1_000_000,
  cacheCreation: 3.75  / 1_000_000,
};

function encodeClaudePath(absPath: string): string {
  return absPath
    .replace(/^([A-Za-z]):[\\/]/, (_: string, d: string) => d.toLowerCase() + '--')
    .replace(/[\\/]/g, '-');
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function readConfigDailyLimit(projectRoot: string): number | null {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.coat', 'config.json'), 'utf8'));
    return cfg?.claude?.daily_token_limit || null;
  } catch { return null; }
}

function sumLines(lines: string[], todayPrefix: string | null) {
  let input = 0, output = 0, cacheRead = 0, cacheCreate = 0;
  let dInput = 0, dOutput = 0, dCacheRead = 0, dCacheCreate = 0;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const u   = obj?.message?.usage;
      if (!u) continue;
      const i  = u.input_tokens                || 0;
      const o  = u.output_tokens               || 0;
      const cr = u.cache_read_input_tokens     || 0;
      const cc = u.cache_creation_input_tokens || 0;
      input += i; output += o; cacheRead += cr; cacheCreate += cc;
      if (todayPrefix && obj.timestamp?.startsWith(todayPrefix)) {
        dInput += i; dOutput += o; dCacheRead += cr; dCacheCreate += cc;
      }
    } catch { /* 무시 */ }
  }
  return { input, output, cacheRead, cacheCreate, dInput, dOutput, dCacheRead, dCacheCreate };
}

function getUsage(projectRoot: string): { total: number; cost: number; dailyPct: number | null } | null {
  try {
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    const dir     = path.join(homeDir, '.claude', 'projects', encodeClaudePath(projectRoot));
    const files   = fs.readdirSync(dir).filter((f: string) => f.endsWith('.jsonl'));
    if (!files.length) return null;

    const now         = new Date();
    const todayPrefix = now.getFullYear() + '-'
      + String(now.getMonth() + 1).padStart(2, '0') + '-'
      + String(now.getDate()).padStart(2, '0');

    const withStat = files.map((f: string) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }));
    const latest   = withStat.sort((a, b) => b.mtime - a.mtime)[0].f;
    const sessionLines = fs.readFileSync(path.join(dir, latest), 'utf8').split('\n').filter(Boolean);
    const s = sumLines(sessionLines, null);
    const total = s.input + s.output + s.cacheRead + s.cacheCreate;
    const cost  = s.input * PRICE.input + s.output * PRICE.output
                + s.cacheRead * PRICE.cacheRead + s.cacheCreate * PRICE.cacheCreation;

    const todayStart = new Date(todayPrefix + 'T00:00:00.000Z').getTime()
      - now.getTimezoneOffset() * 60000;
    const todayFiles = withStat.filter(x => x.mtime >= todayStart);
    let dTotal = 0;
    for (const { f } of todayFiles) {
      const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean);
      const d = sumLines(lines, todayPrefix);
      dTotal += d.dInput + d.dOutput + d.dCacheRead + d.dCacheCreate;
    }

    const limit    = readConfigDailyLimit(projectRoot);
    const dailyPct = limit ? Math.min(100, Math.round(dTotal / limit * 100)) : null;

    return { total, cost: Math.round(cost * 10000) / 10000, dailyPct };
  } catch {
    return null;
  }
}

function getMemoryPath(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  const p = path.join(folders[0].uri.fsPath, '.coat', 'state', 'memory.json');
  return fs.existsSync(p) ? p : null;
}

function readMemory(memPath: string): Memory {
  try {
    return JSON.parse(fs.readFileSync(memPath, 'utf8')) as Memory;
  } catch {
    return {};
  }
}

function formatStatusBar(memory: Memory): string {
  const feature = memory.feature || '(없음)';
  const phase   = (memory.phase || 'plan').toUpperCase();
  const round   = memory.round || 0;
  const mr      = memory.matchRate;

  if (memory.phase === 'loop' && mr) {
    return `🧥 ${feature} · LOOP R${round} | 기능${mr['기능']}%`;
  }
  if (memory.phase === 'completed') {
    return `🧥 완료: ${feature}`;
  }
  return `🧥 ${feature} · ${phase}`;
}

function updateStatusBar(): void {
  const memPath = getMemoryPath();
  if (!memPath) {
    statusBarItem.hide();
    usageBarItem.hide();
    return;
  }
  const memory = readMemory(memPath);
  statusBarItem.text    = formatStatusBar(memory);
  statusBarItem.tooltip = `COAT — ${memory.feature || ''} (${memory.phase || ''})`;
  statusBarItem.show();

  const folders = vscode.workspace.workspaceFolders;
  if (folders) {
    const usage = getUsage(folders[0].uri.fsPath);
    if (usage && usage.total > 0) {
      const dailyStr = usage.dailyPct != null ? `  일일 ${usage.dailyPct}%` : '';
      usageBarItem.text    = `🤖 ${fmtTokens(usage.total)}tok $${usage.cost.toFixed(4)}${dailyStr}`;
      usageBarItem.tooltip = `현재 세션 토큰 사용량 (Sonnet 4.6 기준 추정 비용)${usage.dailyPct != null ? `\n일일 한도 대비 ${usage.dailyPct}% 사용` : ''}`;
      usageBarItem.show();
    } else {
      usageBarItem.hide();
    }
  }
}

function startWatcher(): void {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) return;
  const stateDir = path.join(folders[0].uri.fsPath, '.coat', 'state');
  if (!fs.existsSync(stateDir)) return;

  if (watcher) watcher.close();
  watcher = fs.watch(stateDir, () => updateStatusBar());
}

function getChecklistHtml(memory: Memory): string {
  const items = memory.checklist || [];
  const mr    = memory.matchRate;
  const done  = items.filter(i => i.done).length;

  const gauges = mr ? `
    <div style="margin-bottom:16px">
      ${gaugeHtml('기능', mr['기능'], 97)}
      ${gaugeHtml('UX',   mr['UX'],   85)}
      ${gaugeHtml('속도', mr['속도'], 80)}
    </div>` : '';

  const list = items.length
    ? `<p style="font-size:12px;color:#94a3b8;margin-bottom:10px">${done} / ${items.length} 완료</p>` +
      items.map(i => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #334155">
          <span>${i.done ? '✅' : '⬜'}</span>
          <span style="font-size:13px;${i.done ? 'color:#94a3b8;text-decoration:line-through' : ''}">${i.label}</span>
        </div>`).join('')
    : '<p style="color:#94a3b8;font-size:13px">체크리스트 없음</p>';

  return `<!DOCTYPE html><html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui;padding:16px">
    <h2 style="font-size:14px;margin-bottom:16px">🧥 ${memory.feature || ''} — ${(memory.phase || '').toUpperCase()}</h2>
    ${gauges}${list}
  </body></html>`;
}

function gaugeHtml(name: string, val: number, target: number): string {
  const met   = val >= target;
  const color = met ? '#22c55e' : val >= target * 0.85 ? '#f59e0b' : '#e2e8f0';
  return `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px">${name}</span>
        <span style="font-size:13px;font-weight:700;color:${color}">${val}% <span style="font-size:11px;color:#94a3b8">/ ${target}%</span></span>
      </div>
      <div style="background:#334155;border-radius:4px;height:8px">
        <div style="background:${color};width:${Math.min(val, 100)}%;height:100%;border-radius:4px"></div>
      </div>
    </div>`;
}

export function activate(context: vscode.ExtensionContext): void {
  // 상태바 아이템 생성
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'coat.showChecklist';
  context.subscriptions.push(statusBarItem);

  usageBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  context.subscriptions.push(usageBarItem);

  // 초기 업데이트
  updateStatusBar();
  startWatcher();

  // .coat/ 디렉토리 감시 (없다가 생기는 경우)
  const coatWatcher = vscode.workspace.createFileSystemWatcher('**/.coat/state/memory.json');
  coatWatcher.onDidCreate(() => { updateStatusBar(); startWatcher(); });
  coatWatcher.onDidChange(() => updateStatusBar());
  coatWatcher.onDidDelete(() => { statusBarItem.hide(); });
  context.subscriptions.push(coatWatcher);

  // 커맨드: 체크리스트 패널
  context.subscriptions.push(
    vscode.commands.registerCommand('coat.showChecklist', () => {
      const memPath = getMemoryPath();
      const memory  = memPath ? readMemory(memPath) : {};
      const panel   = vscode.window.createWebviewPanel(
        'coatChecklist', `COAT — ${memory.feature || '현황'}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
      );
      panel.webview.html = getChecklistHtml(memory);
    })
  );

  // 커맨드: 대시보드 열기
  context.subscriptions.push(
    vscode.commands.registerCommand('coat.openDashboard', () => {
      vscode.env.openExternal(vscode.Uri.parse('http://localhost:3030'));
    })
  );
}

export function deactivate(): void {
  if (watcher) watcher.close();
}
