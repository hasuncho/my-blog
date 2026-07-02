# Review 결과 — 2048 게임

담당: Review 단계 서브에이전트 (Build 서브에이전트와 독립적인 세션에서 수행)
대상: `/apps/2048/index.html`, `/apps/2048/style.css`, `/apps/2048/game.js`

## 1. 검증 방법

- **정적 분석**: `spec.md`의 요구사항 목록과 `index.html` / `style.css` / `game.js` 전체를 대조 검토.
- **로직 단위 검증**: `slideAndMergeRow`, `rotateBoardToTreatAsLeft`/`rotateBack`(4방향 회전·역회전),
  `boardHasMoves`(게임오버 판정) 등 순수 함수를 그대로 추출해 Node.js에서 별도 스크립트로
  단위 테스트를 실행함 (병합/미병합 케이스, 4방향 각각의 보드 변환, 회전-역회전 왕복 항등성,
  꽉 찬 보드의 게임오버/이동가능 판정 등). 모든 케이스 통과.
- **실제 브라우저 동작 확인 (가능한 환경이었음)**: `python3 -m http.server`로 정적 서버를 띄우고,
  로컬에 설치된 Google Chrome을 `--headless=new --remote-debugging-port`로 구동한 뒤
  Chrome DevTools Protocol(CDP)에 Node.js `WebSocket`/`fetch`로 직접 접속해
  - 페이지 로드 후 콘솔 예외 유무 (`Runtime.exceptionThrown`, `Runtime.consoleAPICalled` 구독)
  - 실제 키보드 이벤트 디스패치(`Input.dispatchKeyEvent`)로 방향키 입력 시뮬레이션
  - 터치 스와이프 핸들러 직접 호출을 통한 스와이프 동작 확인
  - `new-game-btn` 클릭 시뮬레이션 및 최고점수 유지 여부 확인
  - `Emulation.setDeviceMetricsOverride` / `setEmulatedMedia(prefers-color-scheme)`로
    모바일 뷰포트(390×844/700) · 라이트/다크 모드 전환 후 `Page.captureScreenshot`으로 스크린샷 촬영·육안 확인
  - 오버레이(승리) 강제 표시 후 레이아웃 확인
  을 모두 수행함. (브라우저 자동화 도구(Puppeteer/Playwright/jsdom)는 설치되어 있지 않아,
  로컬 Chrome 바이너리 + CDP 원시 프로토콜을 직접 구사하는 방식으로 대체함.)

## 2. 발견한 문제

### [심각 — Critical] 방향키/스와이프 입력이 전혀 동작하지 않는 치명적 버그
- **위치**: `game.js` `move()` 함수 180번째 줄, `runLockedMove()`와의 상호작용.
- **증상**: 실제 브라우저에서 방향키를 아무리 눌러도(또는 스와이프해도) 타일이 전혀 움직이지 않고
  점수도 오르지 않음. 콘솔 에러는 발생하지 않아 육안 관찰만으로는 원인 파악이 어려웠음.
- **원인**:
  ```js
  function runLockedMove(direction) {
    if (inputLocked) return;
    inputLocked = true;      // ← 여기서 먼저 true로 설정
    move(direction);         // ← 그 다음 move() 호출
    setTimeout(() => { inputLocked = false; }, 100);
  }

  function move(direction) {
    if (inputLocked || isGameOver) return;   // ← move()가 호출되는 시점엔 inputLocked가 항상 true라서 매번 즉시 return
    ...
  }
  ```
  `runLockedMove`가 재진입 방지를 위해 `inputLocked`를 `true`로 설정한 *직후* `move()`를 호출하는데,
  `move()` 내부에도 동일한 `inputLocked` 가드가 있어 호출 시점에 이미 `true`이므로 **모든 이동이
  예외 없이 즉시 종료**된다. 키보드 핸들러(`handleKeyDown`)와 터치 핸들러(`handleTouchStart`/`handleTouchEnd`)
  모두 `runLockedMove`를 경유하므로, 결과적으로 게임의 핵심 기능(이동/병합/점수/게임오버/승리 판정으로
  이어지는 모든 흐름)이 완전히 동작하지 않는 상태였다.
  실제 CDP 테스트로 재현: 90도 다른 방향으로 15라운드(60회) 방향키를 입력해도 타일 2개, 점수 0에서
  전혀 변화 없음을 확인했고, `getEventListeners`로 리스너가 정상 등록·호출됨(리스너 함수 직접 호출
  및 `e.preventDefault` 호출까지 확인)까지 검증해 원인을 `move()`의 이중 락 체크로 특정함.
- **수정**: `move()`의 가드에서 `inputLocked` 체크를 제거함 (재진입 방지는 `runLockedMove`가 이미
  전담하고 있으므로 중복/충돌하는 체크였음).
  ```diff
  -  if (inputLocked || isGameOver) return;
  +  if (isGameOver) return;
  ```
- **수정 후 재검증**: 동일한 CDP 스크립트로 방향키 연속 입력 시 타일 이동/병합/점수 누적
  (0 → 4 → 8 → … → 512 등 정상 누적), 새 타일 스폰, 최고점수 갱신·localStorage 저장,
  "새 게임" 클릭 시 점수만 초기화되고 최고점수는 유지되는 것, 터치 스와이프로도 동일하게 이동이
  일어나는 것을 모두 확인함. 라이트/다크·모바일/데스크톱 스크린샷도 정상 렌더링 확인.

### [경미 — Minor] 승리/게임오버 오버레이에 스크린리더 알림 속성 없음
- **위치**: `index.html`의 `<p class="overlay-message" id="overlay-message">`.
- **증상**: 오버레이가 나타날 때 스크린리더 사용자에게 상태 변화가 자동으로 안내되지 않을 수 있음
  (CLAUDE.md/spec.md의 "최소한의 접근성" 요구사항과 관련된 개선 여지).
- **수정**: `role="alert"`를 추가해 오버레이 메시지가 나타날 때 보조기술에 알림이 가도록 함.
  ```diff
  -  <p class="overlay-message" id="overlay-message"></p>
  +  <p class="overlay-message" id="overlay-message" role="alert"></p>
  ```

### [참고 — Note, 미수정] `.tile-merged` CSS 애니메이션 클래스가 정의되어 있으나 JS에서 한 번도 부여되지 않음
- `style.css`에 `.tile.tile-merged { animation: tile-pop ... }`가 정의되어 있지만, `game.js`
  `render()`에서 새로 생성된 타일에는 `tile-new` 클래스만 부여하고 병합된 타일에는 `tile-merged`를
  붙이는 코드가 없음. 즉 "병합 시 살짝 팝(pop)되는 연출"은 죽은 코드(dead CSS)로 남아있고 실제로는
  트리거되지 않음.
- spec.md 4.1은 "짧고 담백한 트랜지션"을 권장 사항(必須 아님)으로 명시하고 있고, 타일 이동 자체의
  `transform transition`은 정상 동작하므로 게임 플레이에는 지장이 없는 순수 시각적 폴리시 항목이라
  판단하여 이번 Review 범위에서는 수정하지 않음 (기능적 결함이 아니라 사소한 미완성 폴리시).
  필요 시 Embed 이후에도 손볼 수 있는 항목으로 남겨둠.

## 3. spec.md 대비 구현 확인 결과 (수정 반영 후)

| 요구사항 | 상태 |
|---|---|
| 4x4 그리드 상태 관리/렌더링 | OK |
| 4방향 이동/병합 (회전 기반 재사용 구조) | OK — 단위 테스트로 4방향 전부 검증 |
| 이동 후 랜덤 타일(2/4, 90%/10%) 생성 | OK |
| 현재 점수 / 최고 점수 (localStorage) | OK — 최고점수 유지, 새 게임 시 미초기화 확인 |
| 키보드 입력 | OK (버그 수정 후 정상 동작 확인) |
| 터치 스와이프 입력 | OK (버그 수정 후 정상 동작 확인) |
| 게임 오버 판정 | OK — `boardHasMoves` 로직 단위 테스트 통과 |
| 승리 판정(2048) + 계속하기 | OK — 오버레이 강제 렌더링으로 레이아웃까지 확인 |
| 다크모드 (`prefers-color-scheme`) | OK — 실제 스크린샷으로 확인 |
| 반응형 (모바일 뷰포트) | OK — 390px 폭에서 레이아웃 안 깨짐 확인 |
| 블로그 본체와 독립 (import 없음) | OK — 블로그 JS/CSS 참조 없음 확인 |
| CLAUDE.md 기술 제약 (프레임워크/CDN 금지) | OK — 순수 HTML/CSS/ES 모듈만 사용 |

## 4. 최종 결론

**수정 완료 (치명적 버그 1건 수정, 경미한 접근성 개선 1건 반영) — Embed 단계 진행 가능.**

발견 당시 게임이 사실상 "조작 불가" 상태였던 치명적 버그(`move()`의 중복 `inputLocked` 체크)를
수정하지 않았다면 배포가 불가능한 수준이었음. 수정 후 실제 브라우저(CDP) 재검증에서 키보드/터치
이동·병합·점수·최고점수·새 게임·오버레이·다크모드·모바일 반응형이 모두 정상 동작함을 확인했으므로
Embed 단계로 넘어가도 좋다고 판단함.
