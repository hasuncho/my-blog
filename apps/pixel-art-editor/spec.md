# 픽셀 아트 에디터 — Plan 단계 산출물 (spec.md)

> 이 문서는 계획(Plan) 단계 산출물이다. 코드는 구현하지 않으며, 이후 Build 단계에서
> 이 문서를 기준으로 실제 파일(`index.html`, `style.css`, `app.js` 등)을 작성한다.

## 1. 개요

- **목표**: 16x16 격자에 마우스 클릭 또는 터치로 도트(픽셀)를 찍어 그림을 그리고,
  색상 팔레트에서 원하는 색을 선택해 칠하며, 완성한 그림을 PNG 파일로 저장(다운로드)할
  수 있는 픽셀 아트 에디터를 만든다.
- **위치**: `/apps/pixel-art-editor/` 폴더 안에 자체 완결(self-contained)된 형태로
  존재한다. 블로그 본체(`index.html`, `css/`, `js/`, `posts/`)와는 독립적으로 동작해야
  하며, 블로그의 JS 모듈(`js/theme.js` 등)을 import하거나 의존하지 않는다.
- **기술 제약 준수**: React/Vue/Next.js, Webpack/Vite 등 프레임워크·번들러 금지.
  순수 HTML/CSS/바닐라 JS(ES 모듈 가능)만 사용. 외부 라이브러리는 사용하지 않는다
  (그리기 로직과 PNG 저장은 표준 DOM/Canvas API만으로 충분).
- **핵심 기능**
  - 16x16 그리드 상태 관리 및 렌더링(확대된 UI 셀)
  - 기본 제공 색상 팔레트 + 커스텀 색상 선택(`<input type="color">`)
  - 클릭/터치로 한 칸 찍기, 드래그로 연속 칠하기
  - 지우개 도구, 전체 지우기 버튼
  - 그림을 16x16 원본 해상도 PNG로 저장(다운로드), 배율 선택 가능
  - 모바일 터치 지원(스크롤과 그리기 동작 충돌 방지)
  - 라이트/다크 모드 대응 (CSS 변수 + `prefers-color-scheme`)

## 2. 파일 구조

```
/apps/pixel-art-editor/
├── index.html      # 마크업 (툴바, 팔레트, 캔버스 그리드, 저장 버튼)
├── style.css       # 스타일 (CSS 변수, 그리드 레이아웃, 반응형, 다크모드)
├── app.js          # 상태 관리 + 렌더링 + 입력 처리 + PNG 저장 (ES 모듈)
└── spec.md         # (이번 단계 산출물, 본 문서)
```

- `app.js`는 하나의 파일 안에서 역할을 함수/섹션 단위로 명확히 구분한다
  (상태(state) → 렌더링(render) → 입력 처리(pointer/touch handlers) → 팔레트 관리 →
  PNG 내보내기). 앱 규모상 파일을 여러 개로 쪼갤 필요는 없다고 판단되며, Build
  단계에서 실제 복잡도를 보고 분리 여부(`grid.js`/`palette.js`/`export.js` 등)를
  재검토할 수 있다.
- 이미지/폰트 등 추가 에셋은 사용하지 않는다. 아이콘은 유니코드 문자나 간단한
  SVG 인라인으로 표현한다(지우개, 다운로드 버튼 등).

## 3. 데이터 모델(그리드 상태) 설계

### 3.1 상태 표현

- 그리드는 16x16 = 256개 셀의 색상 값을 1차원 배열로 관리한다(2차원 배열도 가능하지만,
  인덱스 계산이 단순하고 배열 순회가 쉬운 1차원 배열을 기본으로 채택).
  ```js
  const GRID_SIZE = 16;
  // 각 셀은 색상 문자열(hex) 또는 null(투명/미채색)을 저장
  // 인덱스 변환: index = row * GRID_SIZE + col
  let pixels = new Array(GRID_SIZE * GRID_SIZE).fill(null);

  let currentColor = '#000000';   // 현재 선택된 팔레트 색상
  let currentTool = 'pencil';     // 'pencil' | 'eraser'
  let isPointerDown = false;      // 드래그 중인지 여부
  ```
- 셀 값을 `null`(미채색/투명)로 표현하는 이유: PNG 저장 시 투명 배경을 지원하기
  위함이다(캔버스 `clearRect` 후 색이 있는 셀만 `fillRect`). 지우개는 해당 셀을
  `null`로 되돌리는 동작으로 정의한다.
- 상태와 렌더링을 분리한다: `pixels` 배열이 단일 진실 원천(single source of truth)이고,
  화면의 DOM 셀은 이 배열을 기반으로 다시 그려진다. 셀 하나가 바뀔 때마다 배열
  전체를 다시 순회하지 않고, 변경된 셀 하나만 갱신하는 방식(부분 렌더링)을 우선
  고려하되, 256개 수준의 작은 그리드이므로 성능 이슈는 없어 구현 단순성을 우선한다.

### 3.2 화면 표시 방식: DOM 그리드 vs Canvas

- **채택안**: 화면에 보이는 편집 캔버스는 **DOM 기반 그리드**(`display: grid`로 배치한
  256개의 `<div class="cell">`)로 구현한다. 이유:
  - 클릭/터치 대상 판별(어느 셀인지)이 `event.target`이나 `elementFromPoint`로 간단하고
    직관적이다.
  - CSS로 셀 테두리, 호버 효과, 다크모드 대응이 쉽다.
  - 별도의 `<canvas>`는 **저장 전용(오프스크린)**으로 두어, "화면에 보이는 확대된
    그리드"와 "저장용 16x16 원본 해상도 데이터"를 역할 분리한다(요구사항 5번 반영).
- 대안으로 `<canvas>` 하나로 편집+저장을 모두 처리하는 방식도 가능하지만, 좌표 →
  셀 인덱스 변환 로직을 직접 계산해야 하고 CSS 스타일링(다크모드, 호버 등)이
  어려워지므로 채택하지 않는다. DOM 그리드 방식이 이 프로젝트의 "프레임워크 없이
  단순하게" 원칙에 더 부합한다.

## 4. UI/UX 설계

### 4.1 레이아웃 구성 (index.html 구조 개략)

```
<body>
  <header>                     # 타이틀("Pixel Art Editor"), 간단 설명
  <main>
    <section class="toolbar">
        <div class="tool-group">
            <button id="tool-pencil" aria-pressed="true">연필</button>
            <button id="tool-eraser" aria-pressed="false">지우개</button>
        </div>
        <div class="tool-group">
            <button id="clear-btn">전체 지우기</button>
            <button id="download-btn">PNG로 저장</button>
        </div>
    </section>

    <section class="palette">
        <div class="swatches">      # 기본 제공 색상 버튼들 (예: 16색)
            <button class="swatch" data-color="#000000" style="--sw-color:#000000"></button>
            ... (반복)
        </div>
        <label class="custom-color">
            커스텀
            <input type="color" id="custom-color-input" value="#ff0000">
        </label>
        <div class="current-color-preview" id="current-color-preview">
            # 현재 선택된 색상을 크게 보여주는 미리보기 박스
        </div>
    </section>

    <section class="canvas-area">
        <div id="pixel-grid" class="pixel-grid" role="grid" aria-label="16x16 픽셀 캔버스">
            # JS가 동적으로 256개의 <div class="cell" role="gridcell"> 생성
        </div>
    </section>
  </main>

  <canvas id="export-canvas" width="16" height="16" hidden></canvas>
  <a id="download-link" hidden></a>

  <footer>            # 조작 안내(클릭/드래그로 그리기, 모바일 터치 안내)
</body>
```

- `export-canvas`는 화면에 보이지 않는(`hidden`) 오프스크린 캔버스로, 다운로드
  시점에만 `pixels` 배열 내용을 그려 넣고 데이터를 생성하는 용도로 쓴다.
- `download-link`는 보이지 않는 `<a>` 태그로, `href`에 생성된 URL을 설정하고
  프로그래밍적으로 `click()`하여 다운로드를 트리거하는 표준 패턴을 사용한다.

### 4.2 팔레트 및 그리드 스타일

- 그리드는 CSS Grid(`display: grid; grid-template-columns: repeat(16, 1fr)`)로
  16x16 셀을 배치하고, 컨테이너에 `aspect-ratio: 1 / 1`을 지정해 정사각형을 유지한다.
- 각 셀은 `background-color`로 현재 색상 상태를 표현한다(`null`이면 배경색 없음 ·
  체커보드 패턴 배경으로 "투명"을 시각적으로 표시하는 것을 고려 — 이미지 편집
  툴에서 흔한 관례).
- 팔레트 스와치는 정사각형 버튼으로 균일하게 배치하고(`display: flex; flex-wrap: wrap`
  또는 소형 grid), 현재 선택된 색상의 스와치에는 `.selected` 클래스로 테두리/체크
  표시를 강조한다(요구사항 6번: "팔레트에서 선택된 색상 표시").
- 기본 제공 색상 팔레트(예시, Build 단계에서 최종 확정): 검정, 흰색, 회색 계열,
  빨강, 주황, 노랑, 초록, 청록, 파랑, 남색, 보라, 분홍, 갈색, 살구색(피부톤) 등
  12~16색 내외로 구성한다. 흑백/그레이스케일과 원색 계열을 고루 포함한다.
- 커스텀 색상(`<input type="color">`)을 선택하면 해당 값이 `currentColor`가 되고,
  기본 스와치의 선택 표시는 해제된다(둘 중 하나만 "현재 선택"으로 강조).
- 현재 선택된 색상은 팔레트 옆의 별도 미리보기 박스(`current-color-preview`)에도
  크게 표시하여 어떤 색으로 그리고 있는지 명확히 인지할 수 있게 한다.

### 4.3 반응형 (모바일 우선)

- 그리드 컨테이너의 폭은 뷰포트 기준 가변(`min(92vw, 480px)` 등)으로 설정하여
  모바일 화면에서도 셀이 너무 작아지지 않게 한다.
- 툴바와 팔레트는 좁은 화면에서 세로로 쌓이는 레이아웃(`flex-direction: column`),
  넓은 화면에서는 그리드 좌/우 또는 상단에 가로로 배치하는 레이아웃을 미디어
  쿼리로 분기한다.
- 팔레트 스와치와 버튼의 터치 타깃 크기는 최소 44x44px 이상을 권장 기준으로
  삼는다(모바일 접근성).

### 4.4 다크모드

- 자체 완결 원칙에 따라 블로그의 `js/theme.js`/`[data-theme]` 토글에 의존하지 않고,
  `@media (prefers-color-scheme: dark)`로 시스템 설정을 기본 반영한다.
- CSS 커스텀 프로퍼티(`--bg`, `--fg`, `--cell-border`, `--toolbar-bg` 등)를
  `/apps/pixel-art-editor/style.css` 자체에 정의하고, 다크모드에서는 그리드 테두리
  색상 대비를 낮추되 팔레트 스와치 자체의 색상(사용자가 그리는 색)은 절대 값이므로
  테마와 무관하게 그대로 표시한다.
- 앱 자체 라이트/다크 토글 버튼은 필수 요구사항이 아니므로, 1차 범위에서는
  시스템 설정 자동 반영만 구현하고 필요 시 Build 단계에서 추가 여부를 판단한다.

## 5. 그리기 입력 처리 (마우스/터치)

### 5.1 처리 방식 결정

- **한 칸 클릭**과 **드래그로 연속 칠하기**를 모두 지원한다 (요구사항 4번).
- 마우스와 터치를 통합적으로 처리하기 위해 Pointer Events(`pointerdown`,
  `pointermove`, `pointerup`, `pointercancel`)를 우선 사용한다. Pointer Events는
  마우스/터치/펜 입력을 하나의 API로 처리할 수 있어 별도의 마우스/터치 분기
  코드를 줄여준다(모던 브라우저 지원 양호). 구형 브라우저 대비 폴백은 이 프로젝트의
  범위상 고려하지 않는다.

### 5.2 의사코드

```
let isPointerDown = false;

gridElement.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    const cell = e.target.closest('.cell');
    if (cell) paintCell(cell);
    gridElement.setPointerCapture(e.pointerId); // 드래그 중 포인터를 그리드에 고정
});

gridElement.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;
    // setPointerCapture를 사용하면 pointermove의 target이 캡처한 요소로 고정되므로
    // elementFromPoint로 실제 아래 있는 셀을 다시 조회해야 함
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const cell = target && target.closest('.cell');
    if (cell) paintCell(cell);
});

window.addEventListener('pointerup', () => { isPointerDown = false; });
window.addEventListener('pointercancel', () => { isPointerDown = false; });

function paintCell(cellEl) {
    const index = Number(cellEl.dataset.index);
    const newColor = (currentTool === 'eraser') ? null : currentColor;
    if (pixels[index] === newColor) return; // 동일하면 리렌더 생략(작은 최적화)
    pixels[index] = newColor;
    renderCell(index); // 해당 셀 하나만 DOM 업데이트
}
```

- **스크롤 충돌 방지**: 그리드 컨테이너에 `touch-action: none;`을 CSS로 지정하여
  그리드 위에서의 터치 드래그가 페이지 스크롤로 해석되지 않도록 한다(요구사항 6번).
  전체 페이지 스크롤은 그리드 바깥 영역에서는 정상 동작해야 하므로 `touch-action`은
  그리드 요소에만 한정해서 적용한다.
- `pointerdown` 시 `e.preventDefault()`를 호출해 텍스트 선택/롱프레스 컨텍스트 메뉴
  등의 부가 동작을 막는 것도 고려한다.
- 그림을 그리다가 포인터가 그리드 바깥으로 나갔다가 다시 들어와도(`setPointerCapture`
  덕분에) 계속 같은 스트로크로 인식되며, 버튼을 뗄 때(`pointerup`)까지 이어진다.
- 우클릭 드래그, 다중 터치(멀티터치로 인한 오작동) 등은 1차 범위에서 특별 처리하지
  않고 단일 포인터 흐름만 고려한다(간단한 앱 특성상 충분).

## 6. 색상 팔레트 설계

- **팔레트 데이터**: JS 배열 상수로 기본 색상 목록을 정의한다.
  ```js
  const DEFAULT_PALETTE = [
    '#000000', '#ffffff', '#808080', '#c0c0c0',
    '#ff0000', '#ff8000', '#ffff00', '#00ff00',
    '#008000', '#00ffff', '#0000ff', '#000080',
    '#800080', '#ff00ff', '#a0522d', '#ffc0a0',
  ];
  ```
  (정확한 색상 값과 개수는 Build 단계에서 시각적으로 조정 가능. 흑백/그레이스케일,
  원색, 피부톤 계열을 고루 포함하는 것을 원칙으로 한다.)
- **렌더링**: 팔레트 컨테이너에 각 색상마다 버튼 요소를 동적으로 생성하고,
  `data-color` 속성 또는 클로저로 색상 값을 바인딩한다.
- **선택 동작**:
  ```js
  function selectColor(color) {
      currentColor = color;
      currentTool = 'pencil';               // 색상 선택 시 자동으로 연필 도구로 전환
      updateSelectedSwatchUI(color);
      updateToolButtonsUI();
      updateCurrentColorPreview(color);
  }
  ```
- **커스텀 색상**: `<input type="color">`의 `input` 이벤트에서 `selectColor(e.target.value)`를
  호출한다. 커스텀 색상은 기본 팔레트에 없는 임의의 hex 값을 지원한다.
- **지우개 도구**: 별도 버튼(`#tool-eraser`)으로 `currentTool = 'eraser'`로 전환한다.
  지우개가 활성화된 동안에는 팔레트 선택 강조를 일시적으로 해제하고 지우개 버튼을
  강조 표시하여 현재 도구 상태를 명확히 보여준다.
- **전체 지우기**: `clear-btn` 클릭 시 확인 없이(또는 간단한 `confirm()` 대화상자로)
  `pixels` 배열 전체를 `null`로 초기화하고 그리드를 다시 렌더링한다. 실수로 인한
  전체 삭제를 방지하기 위해 `confirm()` 사용을 권장하되, UX 단순성을 위해 생략도
  가능(Build 단계에서 결정).

## 7. PNG 저장 설계

### 7.1 기본 방식

- 화면에 보이는 그리드는 확대된 DOM 셀들이고, 저장은 별도의 오프스크린
  `<canvas width="16" height="16">`(`export-canvas`)를 이용한다.
- 저장 절차:
  ```js
  function downloadAsPNG() {
      const canvas = document.getElementById('export-canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE); // 투명 배경 초기화

      for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
              const color = pixels[row * GRID_SIZE + col];
              if (color) {
                  ctx.fillStyle = color;
                  ctx.fillRect(col, row, 1, 1); // 1픽셀씩 채움 (원본 해상도)
              }
              // color가 null이면 투명하게 남겨둠
          }
      }

      canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.getElementById('download-link');
          link.href = url;
          link.download = `pixel-art-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url); // 메모리 정리 (약간의 지연 후 또는 즉시)
      }, 'image/png');
  }
  ```
- `toBlob`을 `toDataURL`보다 우선 사용한다(대용량 데이터 URL 문자열 생성을 피하고
  메모리 효율이 더 좋음). `toBlob`이 지원되지 않는 아주 오래된 환경에 대한 폴백은
  이 프로젝트 범위에서 고려하지 않는다.

### 7.2 배율(업스케일) 옵션

- 16x16 원본 그대로 저장하면 이미지가 매우 작아(일반적인 뷰어에서 흐릿하게 확대되어
  보일 수 있음) 실사용성이 떨어질 수 있으므로, **저장 배율 선택 옵션**을 제공하는
  것을 권장한다.
  - UI: 다운로드 버튼 옆에 배율 선택 `<select id="export-scale">` (예: 1x, 8x, 16x, 32x)
    또는 간단히 고정 배율(예: 16x = 256x256px) 하나만 기본 제공하고 향후 확장 여지를
    남긴다.
  - 구현: `export-canvas`의 `width`/`height`를 `GRID_SIZE * scale`로 설정하고,
    `ctx.imageSmoothingEnabled = false`로 안티앨리어싱을 끈 뒤 `fillRect(col * scale,
    row * scale, scale, scale)`로 각 픽셀을 확대해서 그린다. 이렇게 하면 픽셀아트
    특유의 각진 느낌을 유지하면서 실사용에 적합한 해상도로 저장할 수 있다.
  - 1차 범위(MVP)에서는 고정 배율(예: 16배 = 256x256) 하나만 제공하고, 여유가
    있으면 Build 단계에서 배율 선택 드롭다운을 추가하는 것으로 범위를 조정한다.
- 최종 결정: **기본은 16배 확대(256x256px) PNG로 저장**하며, `imageSmoothingEnabled
  = false`를 필수로 적용해 경계가 흐려지지 않게 한다. 원본 16x16 그대로 저장하는
  옵션은 우선순위를 낮춘다(선택적 기능으로 Build 단계 여유에 따라 추가).

## 8. 엣지케이스

- **빈 캔버스로 저장 시도**: 전체가 `null`(미채색)인 상태에서 저장 버튼을 누르면
  완전히 투명한 PNG가 생성된다. 이를 막을 필요는 없지만(투명 PNG도 유효한 결과물),
  사용자에게 혼란을 줄 수 있으므로 모든 셀이 비어 있을 때 저장 버튼 클릭 시 간단한
  안내 메시지(예: "그림이 비어 있습니다. 그래도 저장할까요?" `confirm()` 또는
  비활성화 상태 표시)를 고려한다. 필수는 아니며 Build 단계에서 UX 판단.
- **팔레트 선택 색상 표시**: 현재 선택된 색상은 (1) 해당 스와치에 테두리/체크 강조,
  (2) 별도 미리보기 박스, 두 가지 방식으로 이중 표시하여 명확성을 높인다.
- **다크모드**: 그리드 배경/테두리 색은 테마에 따라 바뀌되, 사용자가 그린 픽셀
  색상 자체는 절대값이므로 테마 전환과 무관하게 항상 그대로 보여야 한다(테마
  전환이 그림 데이터에 영향을 주지 않도록 저장(`pixels` 배열)과 표시(CSS 변수)를
  분리해서 설계).
- **모바일 터치 시 스크롤 충돌**: 그리드에 `touch-action: none`을 적용하고,
  `pointerdown`에서 `preventDefault()`를 호출하여 그리기 동작 중 페이지가 스크롤되지
  않도록 한다. 반대로 그리드 바깥(팔레트, 버튼 영역, 페이지 전체)의 스크롤은 정상
  동작해야 하므로 `touch-action` 제한을 그리드 요소에만 국한한다.
- **리사이즈/회전 대응**: 그리드는 CSS 비율 기반(`aspect-ratio`, `%` 단위)으로
  크기가 결정되므로 화면 회전이나 리사이즈 시에도 셀 크기가 자동으로 재계산된다.
  셀 크기를 px로 하드코딩하지 않는다.
- **연속 빠른 클릭/드래그**: 동일한 셀에 이미 같은 색이 칠해져 있으면 리렌더링을
  생략하는 가벼운 최적화로 불필요한 DOM 업데이트를 줄인다(256개 셀 규모에서는
  성능이 문제 되지 않지만 코드 품질 차원에서 반영).
- **다운로드 파일명 중복**: 파일명에 타임스탬프(`Date.now()`)를 포함하여 여러 번
  저장해도 이전 파일을 덮어쓰지 않도록 한다.
- **접근성**: 그리드에 `role="grid"`/`role="gridcell"`과 `aria-label`을 부여하고,
  도구 버튼(연필/지우개)에는 `aria-pressed`로 현재 활성 도구 상태를 알린다. 팔레트
  스와치 버튼에는 색상 이름 또는 hex 값을 `aria-label`로 제공한다. (스크린리더로
  픽셀 아트를 "그리는" 행위 자체의 접근성에는 한계가 있으나, 최소한 도구 상태와
  현재 색상 정보는 전달한다.)
- **브라우저 호환성**: Pointer Events, `canvas.toBlob`, `<input type="color">`는
  모던 브라우저(Chrome, Safari, Firefox, Edge 최신 버전)에서 폭넓게 지원되므로
  별도 폴리필 없이 진행한다.

## 9. 향후 Build 단계에서 참고할 구현 순서

1. `index.html` 뼈대 작성 (헤더, 툴바, 팔레트 컨테이너, 그리드 컨테이너, 숨겨진
   export-canvas와 download-link, 푸터 안내문).
2. `style.css` 기본 레이아웃/타이포그래피/CSS 변수(라이트) 작성 후,
   `prefers-color-scheme: dark` 다크 팔레트 추가. 그리드 CSS Grid(16x16) 및
   `aspect-ratio` 적용. 반응형 미디어 쿼리 정리.
3. `app.js`에서 `pixels` 상태 배열 초기화 + 그리드 DOM 256개 셀 생성(초기 렌더링
   함수)부터 구현하여, 빈 캔버스가 화면에 정상적으로 그려지는지 먼저 확인한다.
4. 팔레트 스와치 동적 생성 및 클릭 시 `currentColor` 갱신, 선택 강조 UI 연결.
   커스텀 색상 `<input type="color">` 연동.
5. `paintCell` 함수와 Pointer Events(`pointerdown`/`pointermove`/`pointerup`) 연결 →
   클릭 한 칸 찍기부터 확인 후 드래그 연속 칠하기로 확장.
6. 지우개 도구 토글 및 전체 지우기 버튼 연결.
7. `touch-action: none` 및 `preventDefault()` 적용 후 실제 모바일 기기 또는
   브라우저 개발자도구 터치 시뮬레이션으로 스크롤 충돌 여부 확인.
8. `export-canvas`를 이용한 PNG 저장 로직 구현(16배 확대, `imageSmoothingEnabled =
   false`, `toBlob` + 다운로드 링크 클릭). 저장된 PNG 파일을 직접 열어 픽셀이
   깨지지 않고 의도한 색으로 저장되는지 확인.
9. 접근성 속성(`aria-pressed`, `aria-label`, `role="grid"`) 부여.
10. 엣지케이스 점검: 빈 캔버스 저장, 다크모드에서 그림 색상 유지 확인, 리사이즈/
    화면 회전 시 레이아웃 확인.
11. 모바일 화면 크기 및 라이트/다크 모드에서 실제 브라우저로 최종 확인
    (CLAUDE.md의 "기능 구현 후 반드시 브라우저에서 라이트/다크·모바일 확인" 원칙 준수).
