// =========================================================
// 2048 — game.js
// 순수 바닐라 JS(ES 모듈). 블로그 본체 JS에 의존하지 않는 자체 완결 앱.
// =========================================================

const SIZE = 4;
const BEST_SCORE_KEY = "2048-best-score";

/* ---------------------------------------------------------
 * 상태
 * ------------------------------------------------------- */
let board = createEmptyBoard();
let score = 0;
let best = loadBestScore();
let isGameOver = false;
let hasWon = false;
let keepPlayingAfterWin = false;
let inputLocked = false;

/* tile 식별을 위한 간단한 id 카운터 (렌더링/애니메이션용) */
let tileIdCounter = 0;

/* ---------------------------------------------------------
 * DOM 참조
 * ------------------------------------------------------- */
const boardContainer = document.getElementById("board-container");
const gridBackground = document.getElementById("grid-background");
const tileLayer = document.getElementById("tile-layer");
const scoreValueEl = document.getElementById("score-value");
const bestValueEl = document.getElementById("best-value");
const scoreBoxEl = scoreValueEl.closest(".score-box");
const overlayEl = document.getElementById("overlay");
const overlayMessageEl = document.getElementById("overlay-message");
const overlayRestartBtn = document.getElementById("overlay-restart-btn");
const overlayKeepPlayingBtn = document.getElementById("overlay-keep-playing-btn");
const newGameBtn = document.getElementById("new-game-btn");

/* ---------------------------------------------------------
 * localStorage 헬퍼 (시크릿 모드 등 접근 불가 환경 대비)
 * ------------------------------------------------------- */
function loadBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (e) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch (e) {
    // 세션 내 메모리 변수(best)로만 유지
  }
}

/* ---------------------------------------------------------
 * 보드 유틸
 * ------------------------------------------------------- */
function createEmptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneBoard(b) {
  return b.map((row) => row.slice());
}

function boardsEqual(a, b) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function getEmptyCells(b) {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

/* ---------------------------------------------------------
 * 랜덤 타일 생성
 * ------------------------------------------------------- */
function spawnRandomTile() {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) return null;
  const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  board[r][c] = value;
  return { r, c, value };
}

/* ---------------------------------------------------------
 * 한 줄(row) 슬라이드 + 병합 — "왼쪽으로 밀기" 기준 연산
 * ------------------------------------------------------- */
function slideAndMergeRow(row) {
  const original = row.slice();
  const tiles = row.filter((v) => v !== 0);
  const merged = [];
  let scoreGained = 0;

  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const mergedValue = tiles[i] * 2;
      merged.push(mergedValue);
      scoreGained += mergedValue;
      i += 2;
    } else {
      merged.push(tiles[i]);
      i += 1;
    }
  }

  while (merged.length < SIZE) {
    merged.push(0);
  }

  const moved = !original.every((v, idx) => v === merged[idx]);

  return { newRow: merged, scoreGained, moved };
}

/* ---------------------------------------------------------
 * 방향별 회전/역회전 매핑
 * 모든 방향을 "왼쪽 밀기"로 통일해 처리한 뒤 되돌린다.
 * ------------------------------------------------------- */
function rotateBoardToTreatAsLeft(b, direction) {
  switch (direction) {
    case "left":
      return cloneBoard(b);
    case "right":
      return b.map((row) => row.slice().reverse());
    case "up":
      return transpose(b);
    case "down":
      return transpose(b).map((row) => row.slice().reverse());
    default:
      throw new Error(`Unknown direction: ${direction}`);
  }
}

function rotateBack(rotated, direction) {
  switch (direction) {
    case "left":
      return rotated;
    case "right":
      return rotated.map((row) => row.slice().reverse());
    case "up":
      return transpose(rotated);
    case "down":
      return transpose(rotated.map((row) => row.slice().reverse()));
    default:
      throw new Error(`Unknown direction: ${direction}`);
  }
}

function transpose(b) {
  const result = createEmptyBoard();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      result[c][r] = b[r][c];
    }
  }
  return result;
}

/* ---------------------------------------------------------
 * 전체 보드 이동
 * ------------------------------------------------------- */
function move(direction) {
  if (isGameOver) return;
  if (hasWon && !keepPlayingAfterWin) return;

  const previousBoard = cloneBoard(board);
  const rotated = rotateBoardToTreatAsLeft(board, direction);
  let moved = false;
  let totalScoreGained = 0;

  const newRotated = rotated.map((row) => {
    const result = slideAndMergeRow(row);
    if (result.moved) moved = true;
    totalScoreGained += result.scoreGained;
    return result.newRow;
  });

  const newBoard = rotateBack(newRotated, direction);

  if (!moved || boardsEqual(previousBoard, newBoard)) {
    return; // 변화 없음: 새 타일 생성/렌더링 생략
  }

  board = newBoard;
  score += totalScoreGained;

  const spawned = spawnRandomTile();

  updateBestScore();
  render({ spawned, scoreGained: totalScoreGained });
  checkWin();
  checkGameOver();
}

/* ---------------------------------------------------------
 * 점수 관리
 * ------------------------------------------------------- */
function updateBestScore() {
  if (score > best) {
    best = score;
    saveBestScore(best);
  }
}

/* ---------------------------------------------------------
 * 게임 오버 / 승리 판정
 * ------------------------------------------------------- */
function checkWin() {
  if (hasWon) return;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] >= 2048) {
        hasWon = true;
        showOverlay("win");
        return;
      }
    }
  }
}

function boardHasMoves(b) {
  if (getEmptyCells(b).length > 0) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = b[r][c];
      if (c + 1 < SIZE && b[r][c + 1] === value) return true;
      if (r + 1 < SIZE && b[r + 1][c] === value) return true;
    }
  }
  return false;
}

function checkGameOver() {
  if (boardHasMoves(board)) return;
  isGameOver = true;
  showOverlay("gameover");
}

/* ---------------------------------------------------------
 * 오버레이 표시/숨김
 * ------------------------------------------------------- */
function showOverlay(kind) {
  if (kind === "win") {
    overlayMessageEl.textContent = "2048 달성! 승리했습니다.";
    overlayKeepPlayingBtn.hidden = false;
  } else {
    overlayMessageEl.textContent = "게임 오버! 더 이상 이동할 수 없습니다.";
    overlayKeepPlayingBtn.hidden = true;
  }
  overlayEl.hidden = false;
}

function hideOverlay() {
  overlayEl.hidden = true;
}

/* ---------------------------------------------------------
 * 새 게임 / 계속하기
 * ------------------------------------------------------- */
function startNewGame() {
  board = createEmptyBoard();
  score = 0;
  isGameOver = false;
  hasWon = false;
  keepPlayingAfterWin = false;
  inputLocked = false;
  hideOverlay();

  spawnRandomTile();
  spawnRandomTile();

  render({ initial: true });
}

function keepPlaying() {
  keepPlayingAfterWin = true;
  hideOverlay();
}

/* ---------------------------------------------------------
 * 렌더링
 * ------------------------------------------------------- */
function buildGridBackground() {
  gridBackground.innerHTML = "";
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "grid-cell";
    gridBackground.appendChild(cell);
  }
}

function getLayoutMetrics() {
  const containerRect = boardContainer.getBoundingClientRect();
  const styles = getComputedStyle(boardContainer);
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

  // CSS 변수는 rem 단위 문자열(예: "0.7rem")로 되어 있으므로 px로 환산한다.
  const paddingPx = parseCssLength(styles.getPropertyValue("--board-padding"), rootFontSize);
  const gapPx = parseCssLength(styles.getPropertyValue("--board-gap"), rootFontSize);

  const innerSize = containerRect.width - paddingPx * 2;
  const tileSize = (innerSize - gapPx * (SIZE - 1)) / SIZE;

  return { tileSize, gap: gapPx };
}

function parseCssLength(value, rootFontSize) {
  const trimmed = value.trim();
  if (trimmed.endsWith("rem")) {
    return parseFloat(trimmed) * rootFontSize;
  }
  if (trimmed.endsWith("px")) {
    return parseFloat(trimmed);
  }
  return parseFloat(trimmed) || 0;
}

function tileClassForValue(value) {
  if (value <= 2048) return `tile-${value}`;
  return "tile-super";
}

function digitClassForValue(value) {
  const len = String(value).length;
  if (len >= 5) return "digits-5plus";
  if (len === 4) return "digits-4";
  return "";
}

function render({ spawned, initial } = {}) {
  scoreValueEl.textContent = String(score);
  bestValueEl.textContent = String(best);
  pulseScoreBox();

  tileLayer.innerHTML = "";
  const { tileSize, gap } = getLayoutMetrics();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = board[r][c];
      if (value === 0) continue;

      const tileEl = document.createElement("div");
      const digitClass = digitClassForValue(value);
      tileEl.className = `tile ${tileClassForValue(value)}${digitClass ? ` ${digitClass}` : ""}`;
      tileEl.textContent = String(value);
      tileEl.style.width = `${tileSize}px`;
      tileEl.style.height = `${tileSize}px`;
      tileEl.style.transform = `translate(${c * (tileSize + gap)}px, ${r * (tileSize + gap)}px)`;

      if (!initial && spawned && spawned.r === r && spawned.c === c) {
        tileEl.classList.add("tile-new");
      }

      tileLayer.appendChild(tileEl);
    }
  }
}

let pulseTimeoutId = null;
function pulseScoreBox() {
  if (!scoreBoxEl) return;
  scoreBoxEl.classList.remove("pulse");
  // 강제 리플로우로 애니메이션 재시작
  void scoreBoxEl.offsetWidth;
  scoreBoxEl.classList.add("pulse");
  if (pulseTimeoutId) clearTimeout(pulseTimeoutId);
  pulseTimeoutId = setTimeout(() => scoreBoxEl.classList.remove("pulse"), 160);
}

/* ---------------------------------------------------------
 * 입력 처리 — 키보드
 * ------------------------------------------------------- */
const KEY_DIRECTION_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function handleKeyDown(e) {
  const direction = KEY_DIRECTION_MAP[e.key];
  if (!direction) return;
  e.preventDefault();
  runLockedMove(direction);
}

function runLockedMove(direction) {
  if (inputLocked) return;
  inputLocked = true;
  move(direction);
  // 짧은 트랜지션 시간 동안 입력을 잠가 연속 입력으로 상태가 꼬이는 것을 방지한다.
  setTimeout(() => {
    inputLocked = false;
  }, 100);
}

/* ---------------------------------------------------------
 * 입력 처리 — 터치 스와이프
 * ------------------------------------------------------- */
let touchStartX = null;
let touchStartY = null;
const SWIPE_THRESHOLD = 20;

function handleTouchStart(e) {
  if (e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
  if (touchStartX === null || touchStartY === null) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  touchStartX = null;
  touchStartY = null;

  if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

  if (absDx > absDy) {
    runLockedMove(dx > 0 ? "right" : "left");
  } else {
    runLockedMove(dy > 0 ? "down" : "up");
  }
}

/* ---------------------------------------------------------
 * 리사이즈 대응 — 타일 위치/크기 재계산
 * ------------------------------------------------------- */
let resizeRafId = null;
function handleResize() {
  if (resizeRafId) cancelAnimationFrame(resizeRafId);
  resizeRafId = requestAnimationFrame(() => render());
}

/* ---------------------------------------------------------
 * 초기화
 * ------------------------------------------------------- */
function init() {
  buildGridBackground();

  newGameBtn.addEventListener("click", startNewGame);
  overlayRestartBtn.addEventListener("click", startNewGame);
  overlayKeepPlayingBtn.addEventListener("click", keepPlaying);

  document.addEventListener("keydown", handleKeyDown);

  boardContainer.addEventListener("touchstart", handleTouchStart, { passive: true });
  boardContainer.addEventListener("touchend", handleTouchEnd, { passive: true });

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  startNewGame();
}

init();
