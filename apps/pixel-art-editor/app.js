// ============================================================
// Pixel Art Editor — app.js
// 순서: 상태(state) → 렌더링(render) → 팔레트 → 입력 처리 → PNG 내보내기
// ============================================================

// ---------- 상태 (state) ----------
const GRID_SIZE = 16;
const EXPORT_SCALE = 16; // 16배 확대 저장 (256x256)

const DEFAULT_PALETTE = [
  '#000000', '#ffffff', '#808080', '#c0c0c0',
  '#ff0000', '#ff8000', '#ffff00', '#00ff00',
  '#008000', '#00ffff', '#0000ff', '#000080',
  '#800080', '#ff00ff', '#a0522d', '#ffc0a0',
];

let pixels = new Array(GRID_SIZE * GRID_SIZE).fill(null); // 색상 hex 또는 null(투명)
let currentColor = '#000000';
let currentTool = 'pencil'; // 'pencil' | 'eraser'
let isPointerDown = false;

// ---------- DOM 참조 ----------
const gridEl = document.getElementById('pixel-grid');
const swatchesEl = document.getElementById('swatches');
const customColorInput = document.getElementById('custom-color-input');
const currentColorPreview = document.getElementById('current-color-preview');
const toolPencilBtn = document.getElementById('tool-pencil');
const toolEraserBtn = document.getElementById('tool-eraser');
const clearBtn = document.getElementById('clear-btn');
const downloadBtn = document.getElementById('download-btn');
const exportCanvas = document.getElementById('export-canvas');
const downloadLink = document.getElementById('download-link');

let cellEls = []; // index -> DOM 셀 요소
let swatchEls = new Map(); // color -> DOM 스와치 요소

// ---------- 렌더링 (render) ----------
function buildGrid() {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < GRID_SIZE * GRID_SIZE; index++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = String(index);
    cell.setAttribute('role', 'gridcell');
    fragment.appendChild(cell);
    cellEls.push(cell);
  }
  gridEl.appendChild(fragment);
}

function renderCell(index) {
  const cell = cellEls[index];
  const color = pixels[index];
  cell.style.backgroundColor = color || '';
}

function renderAllCells() {
  for (let i = 0; i < pixels.length; i++) {
    renderCell(i);
  }
}

// ---------- 팔레트 ----------
function buildPalette() {
  DEFAULT_PALETTE.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.style.setProperty('--sw-color', color);
    swatch.dataset.color = color;
    swatch.setAttribute('aria-label', `색상 ${color}`);
    swatch.addEventListener('click', () => selectColor(color));
    swatchesEl.appendChild(swatch);
    swatchEls.set(color, swatch);
  });
}

function updateSelectedSwatchUI(color) {
  swatchEls.forEach((el, swColor) => {
    el.classList.toggle('selected', swColor === color);
  });
}

function updateToolButtonsUI() {
  toolPencilBtn.setAttribute('aria-pressed', String(currentTool === 'pencil'));
  toolEraserBtn.setAttribute('aria-pressed', String(currentTool === 'eraser'));
}

function updateCurrentColorPreview(color) {
  currentColorPreview.style.backgroundColor = color;
}

function selectColor(color) {
  currentColor = color;
  currentTool = 'pencil';
  updateSelectedSwatchUI(color);
  updateToolButtonsUI();
  updateCurrentColorPreview(color);
}

function selectEraser() {
  currentTool = 'eraser';
  updateSelectedSwatchUI(null); // 스와치 선택 해제
  updateToolButtonsUI();
}

function selectPencil() {
  currentTool = 'pencil';
  updateSelectedSwatchUI(currentColor);
  updateToolButtonsUI();
}

// ---------- 입력 처리 (pointer handlers) ----------
function paintCell(cellEl) {
  const index = Number(cellEl.dataset.index);
  const newColor = currentTool === 'eraser' ? null : currentColor;
  if (pixels[index] === newColor) return;
  pixels[index] = newColor;
  renderCell(index);
}

function handlePointerDown(e) {
  isPointerDown = true;
  const cell = e.target.closest('.cell');
  if (cell) paintCell(cell);
  if (gridEl.setPointerCapture) {
    try {
      gridEl.setPointerCapture(e.pointerId);
    } catch (err) {
      // 캡처 실패는 무시(일부 환경에서 지원 제한)
    }
  }
  e.preventDefault();
}

function handlePointerMove(e) {
  if (!isPointerDown) return;
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const cell = target && target.closest && target.closest('.cell');
  if (cell) paintCell(cell);
  e.preventDefault();
}

function handlePointerUp() {
  isPointerDown = false;
}

function attachInputHandlers() {
  gridEl.addEventListener('pointerdown', handlePointerDown);
  gridEl.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);
}

function attachToolHandlers() {
  toolPencilBtn.addEventListener('click', selectPencil);
  toolEraserBtn.addEventListener('click', selectEraser);

  clearBtn.addEventListener('click', () => {
    const ok = window.confirm('전체 그림을 지울까요?');
    if (!ok) return;
    pixels.fill(null);
    renderAllCells();
  });

  customColorInput.addEventListener('input', (e) => {
    selectColor(e.target.value);
  });

  downloadBtn.addEventListener('click', downloadAsPNG);
}

// ---------- PNG 내보내기 (export) ----------
function downloadAsPNG() {
  const isEmpty = pixels.every((c) => c === null);
  if (isEmpty) {
    const proceed = window.confirm('그림이 비어 있습니다. 그래도 저장할까요?');
    if (!proceed) return;
  }

  const size = GRID_SIZE * EXPORT_SCALE;
  exportCanvas.width = size;
  exportCanvas.height = size;

  const ctx = exportCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const color = pixels[row * GRID_SIZE + col];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(col * EXPORT_SCALE, row * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE);
      }
    }
  }

  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = `pixel-art-${Date.now()}.png`;
    downloadLink.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ---------- 초기화 ----------
function init() {
  buildGrid();
  renderAllCells();
  buildPalette();
  selectColor(currentColor);
  attachInputHandlers();
  attachToolHandlers();
}

init();
