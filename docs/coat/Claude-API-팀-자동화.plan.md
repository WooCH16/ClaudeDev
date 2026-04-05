# PLAN — Claude API 팀 자동화

> 작성일: 2026-04-03
> 담당: 기획자

---

## 핵심 목표

COAT의 가상 팀(기획자·개발자·검증자)이 Claude API를 실제로 호출해
LOOP 라운드를 자동으로 진행한다.
사람은 체크포인트(R6, R12…)에서만 판단·승인하면 된다.

---

## 요구사항

### 핵심 기능
- [ ] `plugin/` 디렉토리에 `auto-loop.js` 모듈 추가
- [ ] `/coat loop {기능명} --auto` 플래그로 자동 모드 진입
- [ ] 라운드마다 3개 역할(기획자·개발자·검증자)이 순서대로 Claude API 호출
- [ ] 각 역할의 응답을 `.coat/state/memory.json` → `autoLog` 배열에 기록
- [ ] 체크포인트(R6, R12)에서 자동 중단 → 사용자에게 요약 보고 후 승인 대기
- [ ] `--auto` 없이 `/coat loop` 실행 시 기존 수동 방식 그대로 유지

### 설정
- [ ] `.coat/config.json`에 `claude.auto_loop` 필드 추가 (기본값: false)
- [ ] API Key는 환경변수 `ANTHROPIC_API_KEY` 사용 (설정 파일에 저장 안 함)
- [ ] 사용할 모델은 기존 `claude.model` 필드 재사용

### 출력
- [ ] 각 라운드 종료 후 터미널에 역할별 요약 1~2줄 출력
- [ ] Match Rate 자동 산출 (기획자가 체크리스트 달성도 판단)
- [ ] 라운드별 로그 `.coat/audit/auto-loop/{기능명}-R{N}.md` 저장

---

## 성공 기준

1. `/coat loop {기능명} --auto` 실행 시 R1~R5 라운드가 사람 개입 없이 자동 진행됨
2. R6 체크포인트에서 자동 중단되고 사용자에게 요약이 출력됨
3. 기존 수동 `/coat loop` 동작에 영향 없음 (회귀 없음)
4. API 오류 시 자동 중단 + 오류 메시지 출력 (무한 루프 없음)

---

## 범위 외 (이번 버전 제외)

- VSCode 익스텐션 UI 변경 없음
- 대시보드 변경 없음
- PLAN/DESIGN/CAST/ALIGN/WRAP 단계 자동화 없음 (LOOP만)
