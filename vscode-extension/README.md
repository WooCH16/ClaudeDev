# COAT Status Bar — VSCode Extension

COAT 개발 사이클 현황을 VSCode 하단 상태바에 실시간 표시.

## 표시 형태

```
🧥 소셜로그인 · LOOP R8 | 기능97%   ← LOOP 중
🧥 소셜로그인 · PLAN                 ← 기타 단계
🧥 완료: 소셜로그인                  ← 완료
```

## 설치 (로컬)

```bash
cd vscode-extension
npm install
npm run compile
```

VSCode에서 `F5` → Extension Development Host 실행
또는 `.vsix` 패키징 후 설치:
```bash
npm install -g @vscode/vsce
vsce package
code --install-extension coat-statusbar-2.0.0.vsix
```

## 기능

| 동작 | 결과 |
|------|------|
| 상태바 클릭 | 체크리스트 + Match Rate 패널 |
| `Ctrl+Shift+P` → "COAT: 대시보드 열기" | http://localhost:3030 |
| `.coat/` 없는 폴더 | 상태바 자동 숨김 |
| `memory.json` 변경 | 1초 내 상태바 자동 갱신 |
