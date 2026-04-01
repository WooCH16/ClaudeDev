# DESIGN: GitHub Actions 연동

> **작성일**: 2026-04-01
> **작성자**: 기획자
> **단계**: DESIGN
> **Plan Reference**: `docs/coat/GitHub-Actions-연동.plan.md`

---

## 1. 구조 개요

`commands/coat.md` 스킬 내에서 각 단계(plan/cast/wrap) 완료 시 `.coat/config.json`의 `github.enabled` 값을 확인하고, `true`면 `gh` CLI 명령어를 실행한다. 별도 서버나 파일 없이 스킬 지시문 안에 조건부 로직으로 내장된다.

```
/coat plan → PLAN 완료
  ↓ github.enabled == true?
  → gh issue create --title "[COAT] {기능명} — PLAN" --label coat:plan

/coat cast → CAST 완료
  ↓ github.enabled == true?
  → git checkout -b coat/{기능명}/{YYYY-MM-DD}

/coat wrap → WRAP 완료
  ↓ github.enabled == true?
  → gh pr create --title "[COAT] {기능명}" --label coat:wrap
  → 백로그 items → gh issue create × N
```

---

## 2. 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| `github on/off` 핸들러 | config.json 업데이트 + repo 안내 + 라벨 초기화 | coat.md 스킬 |
| PLAN → Issue | gh issue create (coat:plan 라벨) | coat.md plan 섹션 |
| CAST → Branch | git checkout -b coat/{기능명}/{날짜} | coat.md cast 섹션 |
| WRAP → PR | gh pr create (coat:wrap 라벨) | coat.md wrap 섹션 |
| WRAP → 백로그 Issue | gh issue create × N (coat:p1-star / coat:p2 / coat:p3) | coat.md wrap 섹션 |
| 라벨 초기화 | gh label create (없으면 자동 생성) | github on 핸들러 |

---

## 3. 데이터 흐름

```
[사용자] /coat github on
  → .coat/config.json: github.enabled = true
  → "repo를 입력해주세요 (예: owner/repo):"
  → .coat/config.json: github.repo = "{입력값}"
  → gh label create coat:plan coat:wrap coat:p1-star coat:p2 coat:p3
  → "GitHub 연동 활성화됐습니다."

[사용자] /coat plan {기능명}
  → ... PLAN 작성 완료 ...
  → github.enabled == true?
     YES → gh issue create \
              --repo {github.repo} \
              --title "[COAT] {기능명} — PLAN" \
              --body "{PLAN 핵심 목표 + 요구사항}" \
              --label "coat:plan"
          → "Issue 생성: {URL}"

[사용자] /coat cast {기능명}
  → ... CAST 완료 ...
  → github.enabled == true?
     YES → git checkout -b coat/{기능명}/{YYYY-MM-DD}
          → "브랜치 생성: coat/{기능명}/{YYYY-MM-DD}"

[사용자] /coat wrap {기능명}
  → ... WRAP 완료 ...
  → github.enabled == true?
     YES → gh pr create \
              --repo {github.repo} \
              --title "[COAT] {기능명}" \
              --body "{완료 항목 + Match Rate + 백로그 요약}" \
              --label "coat:wrap"
          → "PR 생성: {URL}"
          → 백로그 items 순회:
              P1* → gh issue create --label "coat:p1-star"
              P2  → gh issue create --label "coat:p2"
              P3  → gh issue create --label "coat:p3"
```

---

## 4. 체크리스트 (LOOP 검증 기준)

**기능 (97% 기준)**
- [ ] `github.enabled = false` → 모든 gh 명령 스킵, 나머지 정상 동작
- [ ] `github.enabled = true` + repo 없음 → repo 입력 요청 후 진행
- [ ] PLAN → Issue 생성 (제목: `[COAT] {기능명} — PLAN`, 라벨: `coat:plan`)
- [ ] CAST → Branch 생성 (`coat/{기능명}/{YYYY-MM-DD}`)
- [ ] WRAP → PR 생성 (제목: `[COAT] {기능명}`, 라벨: `coat:wrap`)
- [ ] WRAP → 백로그 P1* Issue (라벨: `coat:p1-star`)
- [ ] WRAP → 백로그 P2 Issue (라벨: `coat:p2`)
- [ ] WRAP → 백로그 P3 Issue (라벨: `coat:p3`)
- [ ] 라벨 없으면 자동 생성 (`gh label create`)

**UX (85% 기준)**
- [ ] 각 gh 명령 실행 결과 URL 출력 (Issue/PR 링크)
- [ ] 실패 시 에러 메시지 + 수동 처리 안내

**속도 (80% 기준)**
- [ ] gh 명령 타임아웃 10초 이내 (gh CLI 특성상 감지만)

---

## 5. CAST 힌트

| 질문 | 답변 | 근거 |
|------|------|------|
| UI 인터랙션이 3개 이상인가? | N | 스킬 내 텍스트 로직 |
| 외부 API/서드파티 연동이 있는가? | Y | GitHub (gh CLI) |
| DB 관계가 3개 이상인가? | N | |

**예상 팀 구성**: 기본 3명 + 통합 전문가

---

## 6. 구현 순서

1. `commands/coat.md` — `github on/off` 핸들러 + 라벨 초기화 로직
2. `plan` 섹션 — Issue 생성 조건부 로직 추가
3. `cast` 섹션 — Branch 생성 조건부 로직 추가
4. `wrap` 섹션 — PR + 백로그 Issue 생성 로직 추가
5. `SKILL.md` 동기화 (본문 동일하게)
