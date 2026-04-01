# PLAN: COAT-대시보드

> **작성일**: 2026-03-31
> **작성자**: 기획자
> **단계**: PLAN

---

## 1. 핵심 목표

COAT 사이클(PLAN→DESIGN→CAST→LOOP→ALIGN→WRAP)의 진행 상태를 시각화하고,
현재 Round·Match Rate·백로그를 한눈에 파악할 수 있는 로컬 웹 대시보드를 만든다.

---

## 2. 요구사항

| 번호 | 요구사항 | 우선순위 |
|------|---------|---------|
| R-01 | 현재 단계(PLAN/DESIGN/CAST/LOOP/ALIGN/WRAP) 시각화 | P1 |
| R-02 | LOOP 진행률 표시 (Round N / 12+, Match Rate 기능/UX/속도) | P1 |
| R-03 | 체크리스트 항목 표시 및 완료 상태 | P1 |
| R-04 | 백로그 목록 표시 (P1*/P1/P2/P3 구분) | P1 |
| R-05 | 스냅샷 히스토리 뷰어 (Round별 기획자/검증자 스냅샷) | P2 |
| R-06 | GitHub 연동 상태 표시 (ON/OFF, 연결된 repo) | P2 |
| R-07 | `.coat/state/memory.json` 파일 변경 시 실시간 갱신 | P1 |
| R-08 | 단일 HTML 파일 or 경량 로컬 서버 (설치 최소화) | P1 |

---

## 3. 성공 기준

- [ ] `npm run dashboard` (또는 `open dashboard.html`) 한 줄로 실행 가능
- [ ] COAT 사이클 6단계가 진행 흐름으로 시각화됨
- [ ] `.coat/state/memory.json` 수정 즉시 UI 반영 (polling 또는 watch)
- [ ] Match Rate 3개 수치(기능/UX/속도) + 목표선이 명확히 표시됨
- [ ] 백로그 P1*/P1/P2/P3 색상 구분

---

## 4. 범위

### 포함 (In Scope)
- COAT 상태 시각화 (단계 + Round + Match Rate)
- 체크리스트 뷰 (읽기 전용)
- 백로그 뷰 (읽기 전용)
- 스냅샷 히스토리 목록
- `.coat/state/` 파일 기반 데이터 읽기
- 로컬 전용 (인터넷 불필요)

### 제외 (Out of Scope)
- 대시보드에서 직접 상태 편집 (읽기 전용)
- 원격 배포 / 클라우드 호스팅
- GitHub API 직접 호출 (상태 표시만, 액션 없음)
- 인증/로그인

---

## 5. 참고 백로그

> 이전 WRAP에서 이월된 항목 (없음 — 첫 번째 기능)

| 등급 | 항목 | 출처 |
|------|------|------|
| — | 없음 | — |
