# COAT — 최현우's Agent Team

> 개인 개발 방법론 플러그인
> **버전**: v2.0.0
> **작성일**: 2026-03-31

---

## COAT란?

```
C — 최현우의 최 (Choi)
O — of
A — Agent
T — Team
```

AI 에이전트 3명(기획자, 개발자, 검증자)이 실제 팀처럼 협업하는 개인 개발 방법론.
설계와 구현의 일치를 보장하고, 사용자가 항상 최종 결정권을 가진다.

### 3가지 철학

| 원칙 | 설명 |
|------|------|
| **사용자 친절성** | AI가 강제하지 않는다. 사용자가 항상 최종 결정권을 가진다 |
| **일치 검증** | 설계와 구현이 일치할 때까지 반복한다. 타협은 기록으로 남긴다 |
| **가상 팀** | 에이전트가 각자의 역할로 실제 팀처럼 협업한다 |

---

## 6단계 사이클

```
PLAN → DESIGN → CAST → LOOP → ALIGN → WRAP
                          ↑_____________↓
```

| 단계 | 설명 |
|------|------|
| PLAN | 목표 정의, 요구사항 작성 |
| DESIGN | 구조 설계, 체크리스트 정의 |
| CAST | 기능에 맞는 팀 자동 구성 |
| LOOP | 반복 개발 + 검증 (최소 12라운드) |
| ALIGN | 기획자 + 검증자 합의 판단 |
| WRAP | 완료 처리, 백로그 정리 |

---

## 설치

### 1. 스킬 설치

Windows
```cmd
curl -L https://raw.githubusercontent.com/WooCH16/ClaudeDev/master/commands/coat.md -o "%USERPROFILE%\.claude\commands\coat.md"
```

Mac/Linux
```bash
curl -L https://raw.githubusercontent.com/WooCH16/ClaudeDev/master/commands/coat.md -o ~/.claude/commands/coat.md
```

> Claude Code 재시작 후 `/coat` 활성화

---

### 2. 프로젝트 초기화

개발 프로젝트 루트에서 실행.

Windows
```cmd
mkdir .coat\state && mkdir .coat\snapshots && mkdir .coat\audit\p1-records && curl -L https://raw.githubusercontent.com/WooCH16/ClaudeDev/master/plugin/skills/coat/schemas/config.json -o .coat\config.json
```

Mac/Linux
```bash
mkdir -p .coat/state .coat/snapshots .coat/audit/p1-records && curl -L https://raw.githubusercontent.com/WooCH16/ClaudeDev/master/plugin/skills/coat/schemas/config.json -o .coat/config.json
```

---

### 3. 대시보드 실행 (선택)

```bash
git clone https://github.com/WooCH16/ClaudeDev.git
cd ClaudeDev
npm run dashboard -- --project /path/to/your/project
```

> http://localhost:3030
>
> `--project` 생략 시 현재 디렉토리 기준

---

## 사용법

### 기본 흐름

```bash
/coat plan 소셜로그인     # 1. PLAN 작성
/coat design 소셜로그인   # 2. DESIGN 작성
/coat cast 소셜로그인     # 3. 팀 자동 구성
/coat loop 소셜로그인     # 4. 개발 + 검증 반복
/coat align 소셜로그인    # 5. 합의 판단
/coat wrap 소셜로그인     # 6. 완료 처리
```

### 현황 확인

```bash
/coat status             # 전체 현황 + 체크리스트
/coat snapshot           # 전체 스냅샷 확인
/coat snapshot 6         # Round 6 스냅샷
/coat team               # 현재 팀 구성
/coat history            # 완료 기능 목록
```

### 백로그 관리

```bash
/coat backlog            # 전체 백로그
/coat backlog p1         # P1*/P1만 필터
/coat mini 토큰갱신오류   # P1* 미니 COAT 시작
/coat p1-records         # 성공/실패 기록 확인
```

### GitHub 연동

```bash
/coat github on          # 연동 활성화
/coat github off         # 연동 비활성화
/coat commit             # 현재 라운드 커밋 (요청 시만)
```

### 설정

```bash
/coat config             # 설정 확인/변경
```

---

## ALIGN 통과 기준

| 축 | 기준 |
|----|------|
| 기능 | 97% |
| UX | 85% |
| 속도 | 80% |

세 축 모두 충족 + 연속 3라운드 새 이슈 없음 + 최소 12라운드 → ALIGN 진입

---

## 백로그 등급

| 등급 | 내용 | 다음 처리 |
|------|------|----------|
| P1* | 조건부 통과 이월 이슈 | 미니 COAT (조건부 통과 불가) |
| P1 | LOOP 미해결 잔여 이슈 | 다음 PLAN에서 사용자 결정 |
| P2 | 검증자 아쉬움 표시 항목 | 다음 PLAN에서 제안 |
| P3 | 기획자 나중에 표시 항목 | 다음 PLAN에서 선택 목록 |

---

## 파일 구조

```
c:/Develop/COAT/
├── docs/
│   └── coat-spec.md              ← 설계 스펙 전문
└── plugin/
    └── skills/
        └── coat/
            ├── SKILL.md          ← 플러그인 핵심 (명령어 + 알고리즘)
            ├── schemas/
            │   ├── memory.json   ← 상태 파일 스키마
            │   ├── backlog.json  ← 백로그 스키마
            │   └── config.json   ← 설정 스키마
            └── templates/
                ├── plan.template.md
                ├── design.template.md
                ├── snapshot.template.md
                └── p1-record.template.md

{프로젝트 루트}/
└── .coat/
    ├── config.json
    ├── state/
    │   ├── memory.json
    │   └── backlog.json
    ├── snapshots/
    └── audit/
        └── p1-records/
```

---

## 버전 히스토리

| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0.0 | 2026-03-31 | 최초 릴리즈 |
| v2.0.0 | 2026-03-31 | COAT Web Dashboard (진행 현황 시각화) |
| v1.1.0 | 2026-04-01 | GitHub 연동 (Issue / Branch / PR 자동화) |
| v1.2.0 | 2026-04-02 | 테마 토글, _INDEX.md 자동 생성, history round 필드 |
| v1.3.0 | 2026-04-02 | /coat next 자동 실행, 대시보드 SSE 전환, wrap README 업데이트 |
| v2.0.0 | 2026-04-03 | 멀티프로젝트 대시보드 사이드바, VSCode 상태바 Extension |
