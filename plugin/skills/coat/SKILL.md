---
name: coat
description: |
  최현우's Agent Team — 개인 개발 방법론 통합 스킬.
  PLAN→DESIGN→CAST→LOOP→ALIGN→WRAP 6단계 사이클 관리.
  Auto-triggered by keywords: "coat", "plan", "cast", "loop", "align", "wrap".

  Use proactively when user mentions COAT cycle, feature development,
  team composition, loop iteration, or alignment verification.

  Triggers: coat, plan, design, cast, loop, align, wrap, 기획, 개발, 검증,
  팀구성, 반복, 합의, 백로그, 스냅샷, 미니코트
user-invocable: true
argument-hint: "plan|design|cast|loop|align|wrap|status|next|snapshot|team|history|backlog|mini|p1-records|github|commit|config [feature]"
---

# COAT Skill

> 최현우's Agent Team — 개인 개발 방법론 통합 스킬
> **Spec Reference**: https://github.com/WooCH16/ClaudeDev/blob/master/docs/coat-spec.md

## Arguments

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `plan {기능명}` | PLAN 단계 시작 | `/coat plan 소셜로그인` |
| `design {기능명}` | DESIGN 단계 시작 | `/coat design 소셜로그인` |
| `cast {기능명}` | CAST (팀 구성) | `/coat cast 소셜로그인` |
| `loop {기능명}` | LOOP 시작 | `/coat loop 소셜로그인` |
| `align {기능명}` | ALIGN 판단 | `/coat align 소셜로그인` |
| `wrap {기능명}` | WRAP 완료 처리 | `/coat wrap 소셜로그인` |
| `{기능명}` | 현재 상태 + 다음 단계 제안 | `/coat 소셜로그인` |
| `status` | 전체 현황 + 체크리스트 | `/coat status` |
| `next` | 다음 단계 가이드 | `/coat next` |
| `snapshot` | 전체 스냅샷 확인 | `/coat snapshot` |
| `snapshot {Round N}` | 특정 라운드 스냅샷 | `/coat snapshot 6` |
| `team` | 현재 팀 구성 확인 | `/coat team` |
| `team security` | 보안 전문가 수동 투입 | `/coat team security` |
| `history` | 완료 기능 목록 + 히스토리 | `/coat history` |
| `backlog` | 전체 백로그 확인 | `/coat backlog` |
| `backlog p1` | P1*/P1 필터 | `/coat backlog p1` |
| `mini {이슈명}` | 미니 COAT 사이클 시작 | `/coat mini 토큰갱신오류` |
| `p1-records` | 미니 COAT 성공/실패 기록 | `/coat p1-records` |
| `github on/off` | GitHub 연동 활성/비활성 | `/coat github on` |
| `commit` | 현재 라운드 커밋 | `/coat commit` |
| `config` | 설정 확인/변경 | `/coat config` |

---

## Action Details

### plan (PLAN 단계)

1. `.coat/state/memory.json` 확인 — 진행 중인 기능 있으면 알림
2. `docs/coat/{기능명}.plan.md` 생성 (plan.template.md 기반)
3. 기획자가 요구사항 정의:
   - 핵심 목표 (1~2줄)
   - 요구사항 목록
   - 성공 기준
4. 완료 시 사용자에게 확인:
   ```
   "PLAN 완료됐습니다. DESIGN으로 넘어갈까요?"
   [다음 단계] [중단] [추가 입력 → 텍스트]
   ```
5. GitHub 연동 ON 시:
   - `.coat/config.json` 읽기 → `github.enabled`, `github.repo` 확인
   - `github.repo`가 비어있으면 → "repo를 입력해주세요:" → 입력받아 저장
   - Bash: `gh issue create --repo {github.repo} --title "[COAT] {기능명} — PLAN" --body "## 핵심 목표\n{핵심목표}\n\n## 요구사항\n{요구사항목록}" --label "coat:plan"`
   - 성공: "Issue 생성됨: {URL}" / 실패: "⚠️ Issue 생성 실패 — 수동으로 생성해주세요."
6. `.coat/state/memory.json` 업데이트: phase = "plan"

**Output**: `docs/coat/{기능명}.plan.md`

---

### design (DESIGN 단계)

1. PLAN 문서 존재 확인 (없으면 `/coat plan` 먼저 실행 안내)
2. `docs/coat/{기능명}.design.md` 생성 (design.template.md 기반)
3. 기획자가 구조 설계:
   - 컴포넌트/모듈 목록
   - 데이터 흐름
   - 체크리스트 항목 정의
   - CAST 힌트 (Q1/Q2/Q3)
4. 완료 시 사용자 확인:
   ```
   "DESIGN 완료됐습니다. CAST로 넘어갈까요?"
   [다음 단계] [중단] [추가 입력 → 텍스트]
   ```
5. `.coat/state/memory.json` 업데이트: phase = "design"

**Output**: `docs/coat/{기능명}.design.md`

---

### cast (CAST 단계)

1. DESIGN 문서 읽기 — A+C 방식으로 팀 구성 분석

**투입 판단 알고리즘:**
```
Step 1. 체크리스트
  Q1. UI 인터랙션이 3개 이상인가?      Y → UX 전문가 후보
  Q2. 외부 API/서드파티 연동이 있는가?  Y → 통합 전문가 후보
  Q3. DB 관계가 3개 이상인가?           Y → 데이터 모델러 후보

Step 2. 예시 참조
  소셜 로그인   → 통합 전문가
  대시보드 차트 → UX 전문가
  단순 게시판   → 기본 3명으로 충분

Step 3. 기획자 최종 확정 (최대 2명)
  2명 초과 시 핵심 복잡도 높은 전문가 우선
```

2. 팀 구성 결과 사용자에게 보고:
   ```
   [CAST 결과]
   기본: 기획자 · 개발자 · 검증자
   추가: 통합 전문가 (OAuth 연동 감지)
   총원: 4명

   "이 팀 구성으로 시작할까요?"
   [다음 단계] [중단] [추가 입력 → 텍스트]
   ```
3. GitHub 연동 ON 시:
   - `.coat/config.json` 읽기 → `github.enabled`, `github.repo` 확인
   - Bash: `git checkout -b coat/{기능명}/{YYYY-MM-DD}`
   - 성공: "브랜치 생성됨: coat/{기능명}/{YYYY-MM-DD}" / 실패: "⚠️ 브랜치 생성 실패 — 수동으로 생성해주세요."
4. `.coat/state/memory.json` 업데이트: phase = "cast", team 정보

---

### loop (LOOP 단계)

1. CAST 완료 확인
2. LOOP 시작 — 개발자가 구현, 검증자가 검증 반복

**라운드별 검증 깊이:**
```
Round  1~5:  기본 검증 (기능 동작 확인)
Round  6~10: 엣지 케이스 검증
Round 11+:   심층 품질 모드
```

**스냅샷 스케줄:**
```
Round 3  → 기획자 스냅샷 (자동, 사용자 개입 없음)
Round 6  → 검증자 스냅샷 + 사용자 체크포인트
Round 9  → 기획자 스냅샷 (자동, 사용자 개입 없음)
Round 12 → 검증자 스냅샷 + 사용자 체크포인트
Round 12+ → 3라운드마다 반복
```

**체크포인트 (Round 6, 12, 18...) 포맷:**
```
"Round 6 체크포인트입니다."
[현재 상태 요약]
기능: N% · UX: N% · 속도: N%
잔여 이슈: N개

[다음 단계] [중단] [추가 입력 → 텍스트]
```

**종료 조건 (모두 충족 시 ALIGN 진입 제안):**
```
1. 기능 97% + UX 85% + 속도 80% 충족
2. 연속 3라운드 새 이슈 없음
3. 최소 12라운드 완료
```

3. `.coat/state/memory.json` 업데이트: phase = "loop", round, matchRate

---

### align (ALIGN 단계)

기획자 + 검증자 동시 합의로 LOOP 종료 여부 판단.

```
ALIGN_FAIL 1회 → LOOP 재개
ALIGN_FAIL 2회 → 기획자 요구사항 재검토 후 LOOP 재개
ALIGN_FAIL 3회 → 사용자 개입:
  "3회 연속 합의 실패. 어떻게 할까요?"
  [요구사항 수정 → LOOP 재개]
  [조건부 통과 → P1* 이월]
  [중단]
```

**조건부 통과 선택 시:**
```
미해결 이슈 전부 → P1* (backlog.json)
WRAP에 "⚠️ 조건부 통과" 표시
다음 PLAN에서 강력 경고
```

---

### wrap (WRAP 단계)

1. 백로그 자동 분류:
   ```
   P1*: 조건부 통과 이월 이슈
   P1:  LOOP 미해결 잔여 이슈
   P2:  검증자 "아쉬움" 표시 항목
   P3:  기획자 "나중에" 표시 항목
   ```
2. `.coat/state/backlog.json` 저장
3. GitHub 연동 ON 시:
   - `.coat/config.json` 읽기 → `github.enabled`, `github.repo` 확인
   - Bash: `gh pr create --repo {github.repo} --title "[COAT] {기능명}" --body "## 완료된 것\n{체크리스트 완료 항목}\n\n## 최종 Match Rate\n기능: {N}% · UX: {N}% · 속도: {N}%\n\n## 백로그\n{P1*/P1/P2/P3 목록}" --label "coat:wrap"`
   - 성공: "PR 생성됨: {URL}" / 실패: "⚠️ PR 생성 실패 — 수동으로 생성해주세요."
   - 백로그 items 순회:
     - P1* → `gh issue create --repo {repo} --title "[COAT-P1*] {title}" --body "{description}" --label "coat:p1-star"`
     - P2  → `gh issue create --repo {repo} --title "[COAT-P2] {title}"  --body "{description}" --label "coat:p2"`
     - P3  → `gh issue create --repo {repo} --title "[COAT-P3] {title}"  --body "{description}" --label "coat:p3"`
     - (P1은 다음 PLAN에서 사용자 결정 — Issue 생성 안 함)
4. `.coat/state/history.json` 업데이트:
   - 파일 없으면 `{ "items": [] }` 로 생성
   - items 배열에 추가:
     ```json
     {
       "feature": "{기능명}",
       "completedAt": "{YYYY-MM-DD}",
       "matchRate": { "기능": N, "UX": N, "속도": N },
       "backlog": { "p1star": N, "p1": N, "p2": N, "p3": N }
     }
     ```
5. 완료 보고:
   ```
   [WRAP 완료]
   기능: {기능명}
   최종 Match Rate: 기능 N% · UX N% · 속도 N%
   백로그: P1* N개 · P1 N개 · P2 N개 · P3 N개
   ```
6. `.coat/state/memory.json` 업데이트: phase = "completed"

---

### mini (미니 COAT 사이클)

P1* 이슈를 격리해서 확실하게 처리.

```
구조: CAST → LOOP(6+) → ALIGN → WRAP
팀:   기본 3명만 (전문가 추가 없음)
조건부 통과: 불가
```

**ALIGN 실패 시:**
```
ALIGN_FAIL 1회 → LOOP 재개
ALIGN_FAIL 2회 → 기획자 문제 재정의
ALIGN_FAIL 3회 → 사용자 개입:
  [요구사항 축소 → LOOP 재개]
  [포기 → 기록 보존 후 제거]
```

**결과 자동 기록** (성공/실패 모두):
```
.coat/audit/p1-records/{이슈명}-{날짜}.md
  - 시도별 방법 + 결과 + 실패 이유
  - 해결 시: 핵심 원인 + 해결 방법 + 유사 케이스
.coat/audit/p1-records/_INDEX.md
  - 전체 목록 + 해결률
```

---

### status (현황 확인)

```
─────────────────────────────
🧥 COAT Status
─────────────────────────────
기능: {기능명}
단계: {현재 단계} (Round N / 12+)
팀:   기획자 · 개발자 · 검증자 · {전문가}

진행:
  [PLAN ✅] → [DESIGN ✅] → [CAST ✅] → [LOOP 🔄] → [ALIGN ·] → [WRAP ·]

Match Rate:
  기능: N%  (목표 97%)
  UX:   N%  (목표 85%)
  속도: N%  (목표 80%)

체크리스트:
  ✅ 완료 항목
  ⚠️ 진행 중 항목
  ❌ 미완료 항목

다음 체크포인트: Round N
백로그: P1* N개 · P1 N개 · P2 N개 · P3 N개
─────────────────────────────
```

---

### next (다음 단계 가이드)

1. `.coat/state/memory.json` 읽기 → `phase`, `round`, `matchRate` 확인
2. 현재 단계에 따라 안내:

```
phase = "plan"    → "DESIGN으로 넘어가세요: /coat design {기능명}"
phase = "design"  → "CAST로 넘어가세요: /coat cast {기능명}"
phase = "cast"    → "LOOP를 시작하세요: /coat loop {기능명}"
phase = "loop"
  종료조건 미충족  → "Round N 진행 중. 계속 개발하세요."
                     현재 Match Rate + 부족한 항목 표시
  종료조건 충족    → "ALIGN 진입 가능: /coat align {기능명}"
phase = "align"   → "WRAP으로 넘어가세요: /coat wrap {기능명}"
phase = "completed" → "완료된 기능입니다. 새 기능: /coat plan {새기능명}"
memory 없음       → "시작하세요: /coat plan {기능명}"
```

---

### history (완료 기능 목록)

1. `.coat/state/history.json` 읽기 (없으면 "완료된 기능 없음")
2. 목록 출력:

```
─────────────────────────────
🧥 COAT History
─────────────────────────────
#1  소셜로그인        2026-03-31  기능 97% · UX 86% · 속도 82%
#2  대시보드          2026-04-01  기능 100% · UX 100% · 속도 100%
─────────────────────────────
총 2개 완료
```

3. WRAP 완료 시 자동으로 `.coat/state/history.json`에 기록:

```json
{
  "items": [
    {
      "feature": "소셜로그인",
      "completedAt": "2026-03-31",
      "matchRate": { "기능": 97, "UX": 86, "속도": 82 },
      "backlog": { "p1star": 0, "p1": 1, "p2": 2, "p3": 1 }
    }
  ]
}
```

---

### config (설정 확인/변경)

```
🧥 COAT Config
─────────────────────────────
GitHub 연동:    ON / OFF
  auto_issue:   true / false
  auto_branch:  true / false
  auto_pr:      true / false
  repo:         {저장소}

ALIGN 기준:
  기능:  97%
  UX:    85%
  속도:  80%

LOOP 최소 라운드: 12
─────────────────────────────
변경하려면 항목을 말씀해주세요.
```

---

### commit (커밋 — 사용자 요청 시만)

1. 현재 변경사항 요약 자동 생성
2. 커밋 메시지 초안 제시:
   ```
   [COAT-{Round}] {핵심 변경 한 줄}
   - {세부1}
   - {세부2}
   ```
3. 사용자 확인 후 커밋 실행:
   ```
   "이 메시지로 커밋할까요?"
   [확인] [메시지 수정] [취소]
   ```

---

### github on/off

```
/coat github on
  1. .coat/config.json 읽기
  2. github.enabled = true 로 설정
  3. github.repo가 비어있으면:
     사용자에게 질문: "연동할 GitHub repo를 입력해주세요 (예: owner/repo):"
     → 사용자 입력을 github.repo 에 저장
  4. .coat/config.json 저장
  5. 라벨 자동 생성 (이미 존재해도 무시):
     gh label create "coat:plan"    --color "0075ca" --repo {repo} 2>/dev/null || true
     gh label create "coat:wrap"    --color "e4e669" --repo {repo} 2>/dev/null || true
     gh label create "coat:p1-star" --color "d93f0b" --repo {repo} 2>/dev/null || true
     gh label create "coat:p2"      --color "fbca04" --repo {repo} 2>/dev/null || true
     gh label create "coat:p3"      --color "c5def5" --repo {repo} 2>/dev/null || true
  6. "GitHub 연동 활성화됐습니다. ({repo})"

/coat github off
  1. .coat/config.json 읽기
  2. github.enabled = false 로 설정
  3. .coat/config.json 저장
  4. "GitHub 연동이 비활성화됐습니다."
```

---

### GitHub 연동 — 단계별 자동화

> github.enabled = false 이면 아래 모든 항목 무음 스킵. 나머지 흐름 정상 진행.

#### PLAN 완료 시 (github.enabled = true)

```
gh issue create \
  --repo {github.repo} \
  --title "[COAT] {기능명} — PLAN" \
  --body "## 핵심 목표\n{plan.핵심목표}\n\n## 요구사항\n{plan.요구사항 목록}" \
  --label "coat:plan"

→ 성공: "Issue 생성됨: {URL}"
→ 실패: "⚠️ Issue 생성 실패: {에러}. 수동으로 생성해주세요."
```

#### CAST 완료 시 (github.enabled = true)

```
git checkout -b coat/{기능명}/{YYYY-MM-DD}

→ 성공: "브랜치 생성됨: coat/{기능명}/{YYYY-MM-DD}"
→ 실패: "⚠️ 브랜치 생성 실패: {에러}. 수동으로 생성해주세요."
```

#### WRAP 완료 시 (github.enabled = true)

```
# 1. PR 생성
gh pr create \
  --repo {github.repo} \
  --title "[COAT] {기능명}" \
  --body "## 완료된 것\n{체크리스트 완료 항목}\n\n## 최종 Match Rate\n기능: {N}% · UX: {N}% · 속도: {N}%\n\n## 백로그\n{P1*/P1/P2/P3 목록}" \
  --label "coat:wrap"

→ 성공: "PR 생성됨: {URL}"
→ 실패: "⚠️ PR 생성 실패: {에러}."

# 2. 백로그 Issue 생성 (items 순회)
P1* → gh issue create --title "[COAT-P1*] {title}" --label "coat:p1-star"
P2  → gh issue create --title "[COAT-P2] {title}"  --label "coat:p2"
P3  → gh issue create --title "[COAT-P3] {title}"  --label "coat:p3"
(P1은 다음 PLAN에서 사용자 결정 — Issue 생성 안 함)

→ 각 성공: "{grade} Issue 생성됨: {URL}"
→ 각 실패: "⚠️ {grade} Issue 생성 실패. 수동으로 등록해주세요."
```

---

## COAT 철학 (항상 준수)

| 원칙 | 적용 |
|------|------|
| **사용자 친절성** | 모든 단계 전환 시 확인 요청. 강제 없음 |
| **일치 검증** | 타협은 P1*로 기록. 사라지지 않음 |
| **가상 팀** | 기획자/개발자/검증자가 각자 역할로 실제 팀처럼 동작 |

---

## 단계별 다음 단계 가이드

| 현재 | 다음 | 명령어 |
|------|------|--------|
| 없음 | PLAN | `/coat plan {기능명}` |
| PLAN | DESIGN | `/coat design {기능명}` |
| DESIGN | CAST | `/coat cast {기능명}` |
| CAST | LOOP | `/coat loop {기능명}` |
| LOOP (<종료조건) | LOOP 계속 | 자동 진행 |
| LOOP (종료조건 충족) | ALIGN | `/coat align {기능명}` |
| ALIGN (통과) | WRAP | `/coat wrap {기능명}` |
| ALIGN (실패) | LOOP 재개 | 자동 |
| WRAP | 다음 기능 | `/coat plan {새기능명}` |
| P1* 발생 | 미니 COAT | `/coat mini {이슈명}` |
