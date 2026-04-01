# PLAN: GitHub Actions 연동

> **작성일**: 2026-04-01
> **작성자**: 기획자
> **단계**: PLAN

---

## 1. 핵심 목표

COAT 사이클의 GitHub 연동 기능(`/coat github on`)을 실제로 동작시킨다.
PLAN 시 Issue, CAST 시 Branch, WRAP 시 PR/백로그 Issue가 GitHub에 자동 생성된다.

---

## 2. 요구사항

| 번호 | 요구사항 | 우선순위 |
|------|---------|---------|
| R-01 | `/coat github on` → `.coat/config.json` 업데이트 + repo 입력 안내 | P1 |
| R-02 | PLAN 완료 시 GitHub Issue 자동 생성 (라벨: `coat:plan`) | P1 |
| R-03 | CAST 시 Branch 자동 생성 (`coat/{기능명}/{날짜}`) | P1 |
| R-04 | WRAP 시 PR 자동 생성 (라벨: `coat:wrap`) | P1 |
| R-05 | WRAP 시 백로그 항목 → GitHub Issue 자동 등록 (라벨: `coat:p1*` / `coat:p2` / `coat:p3`) | P2 |
| R-06 | GitHub 연동 OFF 시 모든 자동화 무음 스킵 | P1 |
| R-07 | `gh` CLI 사용 (토큰 관리 불필요, 기설치 가정) | P1 |

---

## 3. 성공 기준

- [ ] `/coat github on` + repo 설정 후 다음 PLAN에서 Issue 자동 생성
- [ ] CAST 시 브랜치 생성 확인 (`git branch -a`)
- [ ] WRAP 시 PR + 백로그 Issue GitHub에서 확인
- [ ] GitHub OFF 상태에서 모든 단계 정상 동작 (연동 없이)

---

## 4. 범위

### 포함 (In Scope)
- `gh` CLI 기반 Issue / Branch / PR 생성
- `.coat/config.json` github 설정 읽기/쓰기
- COAT 스킬(commands/coat.md) 내 GitHub 연동 로직 명세
- 라벨 자동 생성 (없으면 생성)

### 제외 (Out of Scope)
- GitHub Actions CI/CD 워크플로우 파일 (`.github/workflows/`)
- GitHub API 직접 호출 (gh CLI로 대체)
- 웹훅 / 자동 트리거
- GitHub 외 플랫폼 (GitLab, Bitbucket)

---

## 5. 참고 백로그

> 이전 WRAP에서 이월된 항목 없음

| 등급 | 항목 | 출처 |
|------|------|------|
| — | 없음 | — |
