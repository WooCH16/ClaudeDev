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
let watcher: fs.FSWatcher | null = null;

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
    return;
  }
  const memory = readMemory(memPath);
  statusBarItem.text    = formatStatusBar(memory);
  statusBarItem.tooltip = `COAT — ${memory.feature || ''} (${memory.phase || ''})`;
  statusBarItem.show();
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
