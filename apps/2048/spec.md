# 2048 게임 — Plan 단계 산출물 (spec.md)

> 이 문서는 계획(Plan) 단계 산출물이다. 코드는 구현하지 않으며, 이후 Build 단계에서
> 이 문서를 기준으로 실제 파일(`index.html`, `style.css`, `game.js` 등)을 작성한다.

## 1. 개요

- **목표**: 방향키(↑ ↓ ← →) 또는 모바일 터치 스와이프로 4x4 그리드의 숫자 타일을
  밀어서 같은 숫자끼리 합치는 2048 클론 게임을 만든다.
- **위치**: `/apps/2048/` 폴더 안에 자체 완결(self-contained)된 형태로 존재한다.
  블로그 본체(`index.html`, `css/`, `js/`, `posts/`)와는 독립적으로 동작해야 하며,
  블로그의 JS 모듈(`js/theme.js` 등)을 import하거나 의존하지 않는다.
- **기술 제약 준수**: React/Vue/Next.js, Webpack/Vite 등 프레임워크·번들러 금지.
  순수 HTML/CSS/바닐라 JS(ES 모듈 가능)만 사용. 외부 CDN 라이브러리는 사용하지 않는다
  (2048 로직은 매우 단순해서 직접 구현이 충분하고, 새 의존성 추가 전 사용자 확인 원칙에도 부합).
- **핵심 기능**
  - 4x4 그리드 상태 관리 및 렌더링
  - 방향키 기반 타일 이동/병합 로직
  - 이동 후 빈 칸에 랜덤 타일(2 또는 4) 생성
  - 현재 점수 / 최고 점수(localStorage) 표시
  - 게임 오버 판정, 2048 타일 등장 시 승리 판정(계속하기 옵션 포함)
  - 모바일 터치 스와이프 입력 지원
  - 라이트/다크 모드 대응 (CSS 변수 + `prefers-color-scheme`)
  - 새 게임(재시작) 버튼

## 2. 파일 구조

```
/apps/2048/
├── index.html      # 게임 마크업 (보드, 점수판, 버튼, 오버레이)
├── style.css       # 스타일 (CSS 변수, 반응형, 다크모드, 타일 애니메이션)
├── game.js         # 게임 로직 + 렌더링 + 입력 처리 (ES 모듈)
└── spec.md         # (이번 단계 산출물, 본 문서)
```

- `game.js`는 필요 시 내부적으로 역할을 구분하되(상태/로직 함수 vs 렌더링 함수 vs 입력 핸들러),
  프레임워크 없이 순수 JS 함수/모듈 스코프로 나눈다. 파일을 여러 개로 쪼갤 필요가 있다면
  `board.js`(로직) / `render.js`(DOM 반영) / `input.js`(키보드·터치) / `game.js`(엔트리포인트)
  형태의 분리도 고려할 수 있으나, 앱 규모상 `game.js` 한 파일로도 충분하다고 판단된다.
  Build 단계에서 실제 복잡도를 보고 분리 여부를 결정한다.
- 이미지/폰트 등 추가 에셋은 사용하지 않는 것을 기본으로 한다 (타일 색상은 CSS로 표현).

## 3. 게임 로직 설계

### 3.1 상태 표현

- 보드는 4x4 2차원 배열로 표현한다: `board[row][col]`, 값은 `0`(빈 칸) 또는 2의 거듭제곱수.
  ```js
  // 상태 예시
  let board = [
    [0, 2, 0, 0],
    [0, 0, 4, 0],
    [0, 0, 0, 0],
    [2, 0, 0, 8],
  ];
  let score = 0;
  let best = 0; // localStorage에서 로드
  let isGameOver = false;
  let hasWon = false;       // 2048 타일 등장 여부
  let keepPlayingAfterWin = false; // 승리 후에도 계속 진행할지
  ```

### 3.2 이동/병합 알고리즘

- 네 방향(위/아래/왼쪽/오른쪽) 이동 로직은 "왼쪽으로 밀기"를 기준 연산으로 구현하고,
  다른 방향은 배열을 회전(rotate)하거나 뒤집은(reverse) 뒤 동일한 "왼쪽 밀기"를 적용하고
  다시 원래 방향으로 되돌리는 방식으로 재사용한다 (중복 코드 최소화).

- **한 줄(row) 처리 의사코드** (왼쪽 방향 기준):
  ```
  function slideAndMergeRow(row):
      # 1. 0을 제거하고 값만 압축
      tiles = row.filter(v => v != 0)

      # 2. 왼쪽부터 인접한 두 값이 같으면 병합 (한 타일은 한 턴에 한 번만 병합)
      merged = []
      i = 0
      scoreGained = 0
      while i < tiles.length:
          if i + 1 < tiles.length and tiles[i] == tiles[i+1]:
              mergedValue = tiles[i] * 2
              merged.push(mergedValue)
              scoreGained += mergedValue
              i += 2
          else:
              merged.push(tiles[i])
              i += 1

      # 3. 남은 칸을 0으로 채워 길이 4 유지
      while merged.length < 4:
          merged.push(0)

      return { newRow: merged, scoreGained, moved: (newRow != row) }
  ```

- **전체 보드 이동**:
  ```
  function move(direction):
      rotated = rotateBoardToTreatAsLeft(board, direction)
      moved = false
      totalScoreGained = 0
      for each row in rotated:
          result = slideAndMergeRow(row)
          if result.moved: moved = true
          totalScoreGained += result.scoreGained
          replace row with result.newRow

      board = rotateBack(rotated, direction)

      if moved:
          score += totalScoreGained
          spawnRandomTile()
          updateBestScore()
          checkWin()
          checkGameOver()
          render()
      # moved == false면 아무 변화 없으므로 새 타일 생성/렌더링 생략
  ```
  - 방향별 회전 매핑 예: `left`는 회전 없음, `right`는 각 행을 reverse,
    `up`은 보드를 전치(transpose) 후 left 처리, `down`은 전치 후 reverse 처리 등.
    (정확한 회전 방식은 Build 단계에서 구현하며, 핵심은 "4방향 로직을 하나의 함수로 재사용"하는 것.)

### 3.3 랜덤 타일 생성

```
function spawnRandomTile():
    emptyCells = 좌표 목록 중 board[r][c] == 0 인 곳
    if emptyCells.length == 0: return
    (r, c) = emptyCells 중 무작위 선택
    board[r][c] = (Math.random() < 0.9) ? 2 : 4   # 90% 확률 2, 10% 확률 4
```
- 게임 시작 시 초기 타일 2개를 동일한 방식으로 생성한다.

### 3.4 게임 오버 / 승리 판정

```
function checkWin():
    if not hasWon and board에 2048 이상 값 존재:
        hasWon = true
        # 승리 오버레이 표시, "계속하기" / "새 게임" 선택 제공

function checkGameOver():
    if 빈 칸이 하나라도 있으면: return false
    for each cell (r, c):
        인접한 (상하좌우) 칸과 값이 같으면 return false  # 병합 가능 = 아직 이동 가능
    isGameOver = true
    # 게임 오버 오버레이 표시
```

## 4. UI/UX 설계

### 4.1 레이아웃 구성 (index.html 구조 개략)

```
<body>
  <header>            # 타이틀("2048"), 간단 설명
  <div class="scoreboard">
      <div class="score-box">SCORE / 현재 점수</div>
      <div class="score-box">BEST / 최고 점수</div>
  </div>
  <div class="controls">
      <button id="new-game-btn">새 게임</button>
  </div>
  <div class="board-container">
      <div class="grid-background">  # 4x4 빈 칸 배경 셀 16개
      <div class="tile-layer">       # JS가 동적으로 타일 요소를 그리는 레이어
  </div>
  <div class="overlay" hidden>       # 게임 오버 / 승리 메시지 공용 오버레이
  <footer>            # 조작 안내(방향키 / 스와이프)
</body>
```

- 보드는 CSS Grid(4x4, `aspect-ratio: 1 / 1`)로 구성하여 정사각형을 유지한다.
- 타일은 절대 위치(absolute) + `transform: translate(x, y)` 방식으로 배치하여
  이동 애니메이션(`transition`)을 자연스럽게 처리한다. (단, "장식적 애니메이션 최소화"
  원칙에 따라 과도한 효과 없이 짧고 담백한 트랜지션만 적용한다.)

### 4.2 타일 색상/숫자 스타일

- 값별로 CSS 클래스(`.tile-2`, `.tile-4`, `.tile-8`, … `.tile-2048`, `.tile-super`)를 두고
  CSS 변수로 배경색/글자색을 지정한다. 예:
  ```css
  --tile-2-bg: ...;   --tile-2-text: ...;
  --tile-4-bg: ...;   --tile-4-text: ...;
  ...
  --tile-2048-bg: ...; --tile-2048-text: ...;
  --tile-super-bg: ...; /* 2048 초과 값(4096, 8192...) 공통 처리 */
  ```
- 값이 커질수록 폰트 크기를 살짝 줄여 4자리 이상 숫자도 타일 안에 들어가도록 한다
  (`font-size: clamp(...)` 또는 자릿수별 클래스 분기).
- 다크모드에서는 명도 대비를 낮춘 톤으로 팔레트를 별도 정의한다 (기존 블로그의
  `variables.css`처럼 라이트/다크 각각 색상 세트를 정의하는 방식을 참고하되, 앱은
  독립적이므로 자체 CSS 변수 세트를 `/apps/2048/style.css`에 둔다).

### 4.3 반응형 (모바일 우선)

- 보드 폭은 뷰포트 기준 가변(`min(90vw, 480px)` 등)으로 설정하고, 점수판/버튼도
  같은 최대 폭 안에서 세로로 쌓이는 레이아웃(모바일)과, 화면이 넓을 때는 여유
  여백을 두는 레이아웃(데스크톱)을 미디어 쿼리로 분기한다.
- 폰트/여백/버튼 크기는 `rem` 단위와 `clamp()`를 활용해 작은 화면에서도 잘리지 않게 한다.
- 터치 영역(스와이프 인식 범위)은 보드 컨테이너 전체로 지정한다.

### 4.4 다크모드

- 블로그 본체와 동일하게 CSS 커스텀 프로퍼티로 색상을 관리하되, 이 앱은
  자체 완결이어야 하므로 블로그의 `[data-theme]` 토글 스크립트(`js/theme.js`)에
  의존하지 않는다.
- 기본 전략: `@media (prefers-color-scheme: dark)`로 시스템 설정을 우선 반영한다.
- 앱 자체 토글이 필요하다고 판단되면(요구사항에서 "필요 없다면 생략 가능"이라 명시),
  아주 단순한 버튼 하나로 `data-theme` 속성을 토글하고 `localStorage`에
  (`2048-theme` 등 앱 전용 키로) 저장하는 방식만 추가한다. 이는 필수는 아니며,
  Build 단계에서 시간/범위에 따라 결정한다. 최소 요구사항은
  "시스템 설정을 따르는 다크모드 대응"이다.

## 5. 점수판 설계

- **현재 점수(score)**: 타일이 병합될 때마다 병합된 값만큼 누적된다
  (예: 2+2 병합 시 +4, 4+4 병합 시 +8). 새 게임 시작 시 0으로 초기화.
- **최고 점수(best)**:
  - `localStorage.getItem('2048-best-score')`로 페이지 로드 시 불러온다 (없으면 0).
  - 매 이동 후 `score > best`이면 `best = score`로 갱신하고
    `localStorage.setItem('2048-best-score', best)`로 저장한다.
  - 새 게임을 시작해도 최고 점수는 초기화하지 않는다 (score만 리셋).
- **UI 표시**: 점수판은 두 개의 박스(SCORE / BEST)로 구성하고, 점수가 오를 때
  간단한 강조(예: 짧은 스케일 애니메이션)를 줄 수 있으나 필수는 아니다.
- **키 네이밍**: localStorage 키는 다른 앱/블로그와 충돌하지 않도록
  `2048-best-score` 같은 접두사를 붙인 이름을 사용한다.

## 6. 입력 처리 (키보드/터치)

### 6.1 키보드

```
document.addEventListener('keydown', (e) => {
    const map = {
        ArrowUp: 'up', ArrowDown: 'down',
        ArrowLeft: 'left', ArrowRight: 'right',
    };
    if (map[e.key]) {
        e.preventDefault(); // 페이지 스크롤 방지
        move(map[e.key]);
    }
});
```
- 게임 오버/오버레이 표시 중에는 방향키 입력을 무시하거나 "새 게임"만 반응하도록 가드한다.
- 애니메이션 진행 중 중복 입력으로 상태가 꼬이지 않도록 "이동 처리 중" 플래그로
  짧은 입력 잠금(다음 이동은 애니메이션 종료 후 처리)을 둘 수 있다.

### 6.2 터치 스와이프

```
let touchStartX, touchStartY;

element.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

element.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const THRESHOLD = 20; // px, 오작동 방지 최소 이동 거리

    if (Math.max(absDx, absDy) < THRESHOLD) return; // 탭 등 무시

    if (absDx > absDy) {
        move(dx > 0 ? 'right' : 'left');
    } else {
        move(dy > 0 ? 'down' : 'up');
    }
});
```
- 스와이프 도중 페이지 자체가 스크롤되지 않도록 보드 영역에서는
  `touch-action: none;` (또는 `pan-y`/`pan-x` 조합) CSS를 적용하는 것을 고려한다.
- 마우스로도 유사 조작을 원할 수 있으나 필수 요구사항은 아니므로 1차 범위에서 제외한다.

## 7. 엣지케이스

- **게임 오버**: 보드가 가득 찼고, 인접한 칸끼리 병합 가능한 조합이 전혀 없으면
  게임 오버 오버레이를 띄우고 "다시 시작" 버튼을 제공한다. 이 상태에서는 이동 입력을 막는다.
- **승리(2048 타일 등장)**: 최초로 2048 타일이 생성되는 순간 승리 오버레이를 띄우되,
  게임을 강제 종료하지 않고 "계속하기" / "새 게임" 중 선택하게 한다.
  "계속하기"를 누르면 이후에는 승리 오버레이를 다시 띄우지 않고 계속 플레이할 수 있다
  (2048을 넘는 값, 예: 4096, 8192도 등장 가능하도록 타일 스타일을 일반화해 둔다).
- **리사이즈 대응**: 뷰포트 크기가 바뀌어도(모바일 회전 포함) 보드가 정사각형을
  유지하고 타일 위치가 CSS 비율 기반으로 재계산되도록 한다. 타일 위치를 px 고정값이
  아니라 그리드 셀의 상대 비율(%) 또는 리사이즈 시 재계산하는 방식으로 처리한다.
- **연속 빠른 입력**: 애니메이션이 끝나기 전에 다음 키 입력이 들어오는 경우를 대비해
  간단한 입력 잠금(락)을 둔다. (필수는 아니지만 UX상 권장)
- **새 게임 중 최고 점수 보존**: "새 게임" 버튼은 `board`/`score`/`hasWon`만 초기화하고
  `best`는 그대로 둔다.
- **localStorage 접근 불가 환경**: 시크릿 모드 등에서 localStorage 접근이 실패할 수
  있으므로 try/catch로 감싸고, 실패 시 최고 점수는 세션 내에서만(메모리 변수로) 유지한다.
- **빈 보드 초기 상태**: 페이지 최초 로드 시 보드가 전부 0인 상태에서 시작하지 않고,
  반드시 초기 타일 2개를 생성한 뒤 렌더링한다.
- **접근성**: 오버레이 메시지와 점수판에 의미 있는 텍스트를 제공하고,
  버튼에는 `aria-label` 등을 붙여 스크린리더 사용성을 최소한으로 보장한다.
  (본 프로젝트의 "콘텐츠 자체가 돋보이는 미니멀한 디자인" 원칙과 일치)

## 8. 향후 Build 단계에서 참고할 구현 순서

1. `index.html` 뼈대 작성 (헤더, 점수판, 보드 컨테이너 16칸 배경, 오버레이, 새 게임 버튼).
2. `style.css` 기본 레이아웃/타이포그래피/CSS 변수(라이트) 작성 후,
   `prefers-color-scheme: dark` 다크 팔레트 추가. 이후 반응형 미디어 쿼리 정리.
3. `game.js`에서 보드 상태 초기화 + 렌더링 함수(상태를 DOM 타일로 반영)부터 구현하여
   정적 상태를 화면에 그리는 것을 먼저 확인한다.
4. "왼쪽으로 밀기" 한 줄 처리 함수(`slideAndMergeRow`)를 순수 함수로 구현하고
   단독으로 콘솔에서 값 검증(수동 테스트) 한다.
5. 4방향 회전/역회전 매핑을 적용해 `move(direction)` 전체 보드 로직을 완성한다.
6. 랜덤 타일 생성(`spawnRandomTile`) 및 이동 후 호출 연결.
7. 점수 누적 로직과 점수판 DOM 업데이트, `localStorage` 최고 점수 연동.
8. 키보드 입력 핸들러 연결 → 실제 방향키로 게임이 동작하는지 확인.
9. 터치 스와이프 핸들러 연결 → 모바일/트랙패드 시뮬레이션으로 확인.
10. 게임 오버 판정 및 오버레이 표시, "다시 시작" 버튼 연결.
11. 승리 판정(2048 등장) 및 "계속하기" 흐름 연결.
12. 타일 이동/등장/병합 트랜지션(간단한 CSS `transition`) 다듬기.
13. 모바일 화면 크기 및 라이트/다크 모드에서 실제 브라우저로 최종 확인
    (CLAUDE.md의 "기능 구현 후 반드시 브라우저에서 라이트/다크·모바일 확인" 원칙 준수).
