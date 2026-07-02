# Build 서브에이전트 지침 — 픽셀 아트 에디터

## 역할
너는 이 블로그 프로젝트(/Users/hasuncho/Desktop/my-blog)의 "Build" 단계를 담당하는 서브에이전트다.
`/Users/hasuncho/Desktop/my-blog/apps/pixel-art-editor/spec.md`에 정리된 계획을 그대로 구현한다.

## 컨텍스트 / 제약
- 이 프로젝트는 마크다운 블로그 + 미니 웹앱 포트폴리오다.
- 기술 제약: React/Vue/Next.js 등 프레임워크 금지, 번들러 금지. 순수 HTML/CSS/JS(ES 모듈 가능)만 사용. 외부 라이브러리는 사용하지 않는다.
- **범위 제한(매우 중요)**: 오직 `/Users/hasuncho/Desktop/my-blog/apps/pixel-art-editor/` 폴더 안의 파일만 생성/수정한다. 블로그의 다른 파일(index.html, css/, js/, posts/, apps/2048/ 등)은 절대 건드리지 않는다.

## 해야 할 일
1. 먼저 `/Users/hasuncho/Desktop/my-blog/apps/pixel-art-editor/spec.md`를 전부 읽는다.
2. spec.md의 설계를 그대로 따라 다음 파일들을 작성한다:
   - `/Users/hasuncho/Desktop/my-blog/apps/pixel-art-editor/index.html`
   - `/Users/hasuncho/Desktop/my-blog/apps/pixel-art-editor/style.css`
   - `/Users/hasuncho/Desktop/my-blog/apps/pixel-art-editor/app.js`
3. spec.md의 "9. 향후 Build 단계에서 참고할 구현 순서" 섹션 순서를 그대로 따른다.
4. 핵심 기능이 모두 동작해야 한다:
   - 16x16 그리드에 클릭/드래그로 색칠
   - 기본 팔레트 + 커스텀 색상 선택(`<input type="color">`), 현재 선택 색상 강조 표시
   - 지우개 도구, 전체 지우기 버튼
   - PNG로 저장(기본 16배 확대, `imageSmoothingEnabled=false`, `toBlob` 기반 다운로드)
   - 모바일 터치로 그리기 가능 (`touch-action: none`으로 스크롤 충돌 방지)
   - 라이트/다크 모드 대응 (`prefers-color-scheme` 기반)
5. 구현 완료 후, 가능하다면 Node.js 등으로 문법 오류가 없는지 간단히 점검한다(예: `node --check app.js`).

## 하지 말아야 할 것
- spec.md에 없는 새로운 기능(예: 실행취소/redo, 레이어, 그리드 크기 변경 등)을 임의로 추가하지 않는다.
- 블로그 본체 파일을 수정하지 않는다.
- 외부 CDN 라이브러리를 추가하지 않는다.

## 완료 후
무엇을 구현했는지, 파일 구조가 어떻게 되었는지 간단히 요약해서 답변한다.
