# DESIGN — Claude API 팀 자동화

> 작성일: 2026-04-03
> 담당: 기획자

---

## 컴포넌트 / 모듈 목록

```
plugin/
  auto-loop.js        ← 핵심 모듈 (신규)
    - runAutoLoop()   : 자동 루프 진입점
    - callRole()      : 역할별 Claude API 호출
    - judgeMatchRate(): 기획자 역할이 체크리스트 달성도 평가
    - saveRoundLog()  : 라운드 로그 파일 저장

commands/
  coat.md             ← /coat loop 명령에 --auto 플래그 처리 추가

.coat/
  config.json         ← claude.auto_loop 필드 추가
  state/
    memory.json       ← autoLog 배열 필드 추가
  audit/
    auto-loop/        ← 라운드별 로그 저장 디렉토리 (신규)
      {기능명}-R1.md
      {기능명}-R2.md
      ...
```

---

## 데이터 흐름

```
사용자: /coat loop {기능명} --auto
          │
          ▼
auto-loop.js: runAutoLoop()
  ├─ config.json 읽기 (model, auto_loop)
  ├─ memory.json 읽기 (feature, checklist)
  ├─ ANTHROPIC_API_KEY 환경변수 확인
  │    없으면 → 오류 출력 후 중단
  │
  └─ Round Loop (R1 → R2 → ... → 체크포인트)
       ├─ [개발자] callRole('developer', round, checklist)
       │     → Claude API 호출
       │     → 응답: 구현한 항목 + 이슈
       │
       ├─ [검증자] callRole('validator', round, devResponse)
       │     → Claude API 호출
       │     → 응답: 검증 결과 + 발견 이슈
       │
       ├─ [기획자] judgeMatchRate(round, validatorResponse, checklist)
       │     → Claude API 호출
       │     → 응답: 기능/UX/속도 % + 체크리스트 달성 여부
       │
       ├─ memory.json 업데이트 (round, matchRate, autoLog 추가)
       ├─ 터미널 출력: 역할별 요약 1~2줄
       ├─ saveRoundLog() → .coat/audit/auto-loop/{기능명}-R{N}.md
       │
       └─ 체크포인트(R6, R12...)이면?
            YES → 사용자에게 요약 출력 + 승인 대기 (readline)
            NO  → 다음 라운드 자동 진행
```

---

## 역할별 프롬프트 구조

### 개발자 (developer)
```
시스템: "너는 {기능명} 기능을 개발하는 개발자다."
사용자: "Round {N}. 다음 체크리스트 항목을 구현하라: {미완료 항목들}
         이전 이슈: {전 라운드 validator 응답}
         구현한 항목과 남은 이슈를 JSON으로 답하라."
```

### 검증자 (validator)
```
시스템: "너는 {기능명} 기능을 검증하는 QA 엔지니어다."
사용자: "Round {N}. 개발자 구현 결과를 검증하라: {developer 응답}
         발견된 이슈와 심각도를 JSON으로 답하라."
```

### 기획자 (planner)
```
시스템: "너는 {기능명} 기능의 기획자다. Match Rate를 판단한다."
사용자: "Round {N}. 검증 결과를 보고 Match Rate를 평가하라.
         체크리스트: {전체 항목}
         검증 결과: {validator 응답}
         기능/UX/속도 퍼센트와 완료된 체크리스트 항목을 JSON으로 답하라."
```

---

## 체크포인트 출력 포맷

```
─────────────────────────────
Round 6 체크포인트 (자동 모드)
─────────────────────────────
기능: 62%  UX: 55%  속도: 70%
완료 항목: 4 / 8
잔여 이슈: 2개

[개발자] 인증 토큰 갱신 로직 구현 완료. SSE 재연결 미완료.
[검증자] 토큰 만료 케이스 통과. 동시 요청 시 race condition 발견.
[기획자] 기능 62% — 핵심 흐름은 동작하나 엣지 케이스 잔여.

계속 진행할까요? [y] [n]
─────────────────────────────
```

---

## 체크리스트

| ID | 항목 | 비고 |
|----|------|------|
| a-01 | `plugin/auto-loop.js` 생성 — `runAutoLoop()` 구현 | 핵심 |
| a-02 | `callRole()` — 역할별 Claude API 호출 (Anthropic SDK) | 핵심 |
| a-03 | `judgeMatchRate()` — 기획자 역할 Match Rate 산출 | 핵심 |
| a-04 | `--auto` 플래그 감지 → `auto-loop.js` 진입 분기 | |
| a-05 | 체크포인트(R6, R12) 자동 중단 + readline 승인 대기 | |
| a-06 | `memory.json` → `autoLog` 배열 업데이트 | |
| a-07 | `.coat/audit/auto-loop/{기능명}-R{N}.md` 라운드 로그 저장 | |
| a-08 | `ANTHROPIC_API_KEY` 없을 때 안전 중단 + 오류 메시지 | |
| a-09 | `config.json` → `claude.auto_loop` 필드 추가 | |
| a-10 | 기존 수동 `/coat loop` 동작 회귀 없음 확인 | 검증 |

---

## CAST 힌트

- Q1. UI 인터랙션 3개 이상? **N** (터미널 출력만)
- Q2. 외부 API/서드파티 연동? **Y** → Claude API (Anthropic SDK)
- Q3. DB 관계 3개 이상? **N**

→ **통합 전문가** 후보 (Claude API 연동)
