# DESIGN: COAT-대시보드

> **작성일**: 2026-03-31
> **작성자**: 기획자
> **단계**: DESIGN
> **Plan Reference**: `docs/coat/COAT-대시보드.plan.md`

---

## 1. 구조 개요

`server.js`(Node.js 빌트인만, npm 설치 없음)가 `.coat/state/*.json`과 `.coat/snapshots/*.md`를 읽어 REST API로 제공하고, `dashboard.html`이 2초 폴링으로 실시간 갱신한다.

```
.coat/state/memory.json   ──┐
.coat/state/backlog.json  ──┤→ server.js (GET /api/state)
.coat/config.json         ──┘        ↓
.coat/snapshots/*.md ──→ GET /api/snapshot/:name
                                     ↓
                         dashboard.html (폴링 2s)
                                     ↓
                    ┌────────────────────────────┐
                    │  PhaseBar                  │
                    │  LoopPanel │ ChecklistPanel │
                    │  BacklogPanel │ SnapshotPanel│
                    └────────────────────────────┘
```

---

## 2. 컴포넌트 목록

| 컴포넌트 | 역할 | 데이터 소스 |
|---------|------|------------|
| `PhaseBar` | PLAN→DESIGN→CAST→LOOP→ALIGN→WRAP 6단계 진행 표시 | `memory.phase` |
| `LoopPanel` | Round N / 12+, 기능/UX/속도 Match Rate 게이지 | `memory.round`, `memory.matchRate` |
| `ChecklistPanel` | 체크리스트 항목 (읽기 전용, 체크 상태) | `memory.checklist[]` |
| `BacklogPanel` | P1*/P1/P2/P3 색상 구분 목록 | `backlog.items[]` |
| `SnapshotPanel` | 스냅샷 파일 목록 + 클릭 시 내용 표시 | `/api/snapshot/:name` |
| `GitHubStatus` | ON/OFF + 연결된 repo 표시 | `config.github` |
| `TeamPanel` | 현재 팀 구성 (기본 3명 + 동적) | `memory.team` |

---

## 3. 데이터 흐름

```
[파일시스템]
  .coat/state/memory.json  → phase, round, matchRate, team, checklist, alignFailCount
  .coat/state/backlog.json → items (grade: p1*/p1/p2/p3)
  .coat/config.json        → github.enabled, github.repo
  .coat/snapshots/         → *.md 파일 목록

[server.js - GET /api/state]
  fs.readFileSync → JSON.parse → 단일 응답 객체로 병합
  {
    memory: {...},
    backlog: {...},
    github: {...},
    snapshots: ["round-3.md", "round-6.md", ...]
  }

[server.js - GET /api/snapshot/:name]
  fs.readFileSync(.coat/snapshots/:name) → text/plain 반환

[dashboard.html]
  setInterval(fetchAndRender, 2000)
  → fetch('/api/state') → renderAll(data)
  → 스냅샷 클릭 시 fetch('/api/snapshot/round-3.md') → 모달 표시
```

---

## 4. 체크리스트 (LOOP 검증 기준)

> 이 항목들이 LOOP에서 Match Rate 측정 기준이 됨

**기능 (97% 기준)**
- [ ] `npm run dashboard` 한 줄로 브라우저 자동 오픈
- [ ] PhaseBar: 현재 단계 하이라이트, 완료 단계 체크 표시
- [ ] LoopPanel: Round / 목표(12+) 표시, Match Rate 3개 게이지 + 목표선
- [ ] BacklogPanel: P1* 빨강 / P1 주황 / P2 노랑 / P3 회색 색상 구분
- [ ] ChecklistPanel: 체크 상태 반영 (읽기 전용)
- [ ] GitHubStatus: ON/OFF 뱃지 + repo 이름
- [ ] `/api/state` 응답 2초 이내
- [ ] `.coat/state/memory.json` 수정 후 2~4초 내 UI 반영

**UX (85% 기준)**
- [ ] SnapshotPanel: 파일 목록 클릭 → 모달에서 내용 확인
- [ ] TeamPanel: 팀원 역할 시각화 (아이콘 or 뱃지)
- [ ] Match Rate 게이지: 목표선(97%/85%/80%) 시각적 구분
- [ ] 다크 배경 or 밝은 배경 중 하나로 일관된 톤

**속도 (80% 기준, 감지만)**
- [ ] 초기 로드 1초 이내 (서버 사이드 JSON 병합)
- [ ] 폴링 응답 100ms 이내 (로컬 파일 읽기)

---

## 5. 파일 구조

```
c:\Develop\COAT\
├── dashboard/
│   ├── server.js       ← Node.js http 모듈만 사용 (npm install 불필요)
│   └── dashboard.html  ← 단일 HTML (CSS/JS 인라인)
└── package.json        ← "dashboard": "node dashboard/server.js --open"
```

**server.js 핵심 라우팅:**
```
GET /             → dashboard.html 서빙
GET /api/state    → memory.json + backlog.json + config.json + snapshots 목록 병합
GET /api/snapshot/:name → .coat/snapshots/:name.md 내용
```

**`.coat/state/memory.json` 체크리스트 필드 추가 (현재 스키마 확장):**
```json
"checklist": [
  { "id": "c-01", "label": "npm run dashboard 실행 확인", "done": false },
  ...
]
```

---

## 6. UI 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  COAT Dashboard  [feature명]          [GitHub: ON/OFF]  │
│  PLAN ──● DESIGN ──○ CAST ──○ LOOP ──○ ALIGN ──○ WRAP  │
├──────────────────────┬──────────────────────────────────┤
│  LOOP 진행           │  체크리스트                       │
│  Round: 7 / 12+      │  ✅ PhaseBar 구현                 │
│                      │  ✅ LoopPanel 구현                │
│  기능 ████████░ 84%  │  ⬜ BacklogPanel 구현             │
│  UX   ███████░░ 78%  │  ...                             │
│  속도 ██████░░░ 75%  │                                  │
├──────────────────────┼──────────────────────────────────┤
│  백로그              │  스냅샷 히스토리                   │
│  🔴 P1* 토큰갱신     │  📄 round-6.md  (검증자)          │
│  🟠 P1  에러메시지UX │  📄 round-3.md  (기획자)          │
│  🟡 P2  로딩스피너   │                                  │
│  ⚪ P3  애플로그인   │                                  │
└──────────────────────┴──────────────────────────────────┘
  팀: 기획자 · 개발자 · 검증자 · UX전문가     마지막 갱신: 2s전
```

---

## 7. CAST 힌트

| 질문 | 답변 | 근거 |
|------|------|------|
| UI 인터랙션이 3개 이상인가? | Y | PhaseBar 호버, 게이지 애니메이션, 스냅샷 모달 |
| 외부 API/서드파티 연동이 있는가? | N | 로컬 파일만 |
| DB 관계가 3개 이상인가? | N | JSON 파일 직접 읽기 |

**예상 팀 구성**: 기본 3명 + UX전문가

---

## 8. 구현 순서

1. `server.js` — `/api/state` 엔드포인트 + HTML 서빙 (Node.js 빌트인만)
2. `dashboard.html` — PhaseBar + LoopPanel (핵심 기능 먼저)
3. BacklogPanel — P1*/P1/P2/P3 색상 뱃지
4. ChecklistPanel — 읽기 전용 체크 상태
5. SnapshotPanel — 파일 목록 + 모달
6. GitHubStatus + TeamPanel — 상태 뱃지
7. `package.json` 스크립트 추가 + `--open` 옵션으로 브라우저 자동 오픈
