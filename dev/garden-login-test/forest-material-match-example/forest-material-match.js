(() => {
  "use strict";

  // 체험판: 실제 서비스 기준은 4시간 / 최대 3묶음이다.
  // 빠른 검수를 위해 이 체험판에서는 25초마다 다음 묶음이 준비된다.
  const DEMO_INTERVAL_MS = 25_000;
  const MAX_BUNDLES = 3;
  const GAME_SECONDS = 40;
  const ROWS = 7;
  const COLS = 6;
  const STORAGE_KEY = "todayForest.materialMatch.demo.v1";

  const MATERIALS = {
    seed: { key: "seed", label: "씨앗", mark: "◒", resultMark: "◒" },
    moss: { key: "moss", label: "이끼 조각", mark: "◐", resultMark: "◐" },
    sparkle: { key: "sparkle", label: "반짝 조각", mark: "✦", resultMark: "✦" },
  };
  const materialKeys = Object.keys(MATERIALS);

  const els = {
    bundleStatus: document.getElementById("bundleStatus"),
    bundleTitle: document.getElementById("bundleTitle"),
    bundleDescription: document.getElementById("bundleDescription"),
    bundleCount: document.getElementById("bundleCount"),
    bundleDots: document.getElementById("bundleDots"),
    seedCount: document.getElementById("seedCount"),
    mossCount: document.getElementById("mossCount"),
    sparkleCount: document.getElementById("sparkleCount"),
    gameIntro: document.getElementById("gameIntro"),
    playArea: document.getElementById("playArea"),
    gameResult: document.getElementById("gameResult"),
    gameHint: document.getElementById("gameHint"),
    board: document.getElementById("board"),
    timeValue: document.getElementById("timeValue"),
    clearValue: document.getElementById("clearValue"),
    comboValue: document.getElementById("comboValue"),
    resultKicker: document.getElementById("resultKicker"),
    resultTitle: document.getElementById("resultTitle"),
    resultSummary: document.getElementById("resultSummary"),
    startGame: document.getElementById("startGame"),
    closeResult: document.getElementById("closeResult"),
    replayGame: document.getElementById("replayGame"),
    resetDemo: document.getElementById("resetDemo"),
    toast: document.getElementById("toast"),
  };

  const state = {
    bundles: 1,
    lastGeneratedAt: Date.now(),
    materials: { seed: 0, moss: 0, sparkle: 0 },
    board: [],
    isPlaying: false,
    isRewardRound: false,
    timeLeft: GAME_SECONDS,
    cleared: 0,
    combo: 0,
    lastClearAt: 0,
    roundMaterials: { seed: 0, moss: 0, sparkle: 0 },
    timerId: null,
    toastId: null,
  };

  function safeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      state.bundles = Math.max(0, Math.min(MAX_BUNDLES, safeNumber(saved.bundles, 1)));
      state.lastGeneratedAt = safeNumber(saved.lastGeneratedAt, Date.now());
      state.materials = {
        seed: Math.max(0, safeNumber(saved.materials?.seed)),
        moss: Math.max(0, safeNumber(saved.materials?.moss)),
        sparkle: Math.max(0, safeNumber(saved.materials?.sparkle)),
      };
    } catch (error) {
      console.warn("숲 정리 체험판 저장값을 불러오지 못했어요.", error);
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bundles: state.bundles,
        lastGeneratedAt: state.lastGeneratedAt,
        materials: state.materials,
      }));
    } catch (error) {
      console.warn("숲 정리 체험판 저장값을 남기지 못했어요.", error);
    }
  }

  function applyIdleBundles(now = Date.now()) {
    if (state.bundles >= MAX_BUNDLES) return;
    const elapsed = Math.max(0, now - state.lastGeneratedAt);
    const newBundles = Math.floor(elapsed / DEMO_INTERVAL_MS);
    if (newBundles <= 0) return;
    const room = MAX_BUNDLES - state.bundles;
    const added = Math.min(room, newBundles);
    state.bundles += added;
    state.lastGeneratedAt += added * DEMO_INTERVAL_MS;
    persistState();
    if (added > 0 && !state.isPlaying) showToast(`숲에 재료 묶음 ${added}개가 새로 준비됐어요.`);
  }

  function timeUntilNextBundle() {
    if (state.bundles >= MAX_BUNDLES) return 0;
    const elapsed = Math.max(0, Date.now() - state.lastGeneratedAt);
    return Math.max(0, DEMO_INTERVAL_MS - elapsed);
  }

  function formatSeconds(ms) {
    const seconds = Math.max(1, Math.ceil(ms / 1000));
    return `${seconds}초`;
  }

  function renderStatus() {
    applyIdleBundles();
    els.bundleCount.textContent = `${state.bundles} / ${MAX_BUNDLES}`;
    els.bundleDots.innerHTML = Array.from({ length: MAX_BUNDLES }, (_, index) => (
      `<span class="${index < state.bundles ? "is-full" : ""}"></span>`
    )).join("");

    if (state.bundles > 0) {
      els.bundleStatus.textContent = state.bundles === MAX_BUNDLES
        ? "숲에 준비된 재료가 가득해요"
        : "작은 재료 묶음이 준비됐어요";
      els.bundleTitle.textContent = state.bundles === 1
        ? "오늘 숲에 떨어진 작은 것들을 정리해볼까요?"
        : `지금 ${state.bundles}묶음의 작은 것들이 기다리고 있어요.`;
      els.bundleDescription.textContent = "같은 재료가 이어진 곳을 눌러 모으면, 정원을 꾸밀 재료가 돼요.";
      els.startGame.disabled = false;
      els.startGame.textContent = "재료 정리 시작";
    } else {
      const nextIn = timeUntilNextBundle();
      els.bundleStatus.textContent = "숲이 다음 재료를 준비하고 있어요";
      els.bundleTitle.textContent = `다음 재료 묶음은 약 ${formatSeconds(nextIn)} 뒤에 준비돼요.`;
      els.bundleDescription.textContent = "체험판에서는 25초마다 한 묶음이 준비돼요. 실제 서비스에서는 4시간 간격을 가정해요.";
      els.startGame.disabled = false;
      els.startGame.textContent = "점수 연습하기";
    }

    els.seedCount.textContent = state.materials.seed;
    els.mossCount.textContent = state.materials.moss;
    els.sparkleCount.textContent = state.materials.sparkle;
  }

  function showToast(message) {
    if (!message) return;
    window.clearTimeout(state.toastId);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    state.toastId = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 2200);
  }

  function randomMaterial() {
    return materialKeys[Math.floor(Math.random() * materialKeys.length)];
  }

  function makePlayableBoard() {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const banned = new Set();
        if (col >= 2 && board[row][col - 1] === board[row][col - 2]) banned.add(board[row][col - 1]);
        if (row >= 2 && board[row - 1][col] === board[row - 2][col]) banned.add(board[row - 1][col]);
        const allowed = materialKeys.filter((key) => !banned.has(key));
        board[row][col] = allowed[Math.floor(Math.random() * allowed.length)];
      }
    }

    // 시작 시 최소 한 덩어리를 보장한다.
    const row = Math.floor(Math.random() * (ROWS - 1));
    const col = Math.floor(Math.random() * (COLS - 1));
    const key = randomMaterial();
    board[row][col] = key;
    board[row][col + 1] = key;
    board[row + 1][col] = key;
    return board;
  }

  function renderBoard() {
    els.board.innerHTML = state.board.map((row, rowIndex) => row.map((key, colIndex) => {
      const material = MATERIALS[key];
      return `<button class="tile ${material.key}" type="button" data-row="${rowIndex}" data-col="${colIndex}" role="gridcell" aria-label="${material.label}"><span class="tile-mark" aria-hidden="true">${material.mark}</span></button>`;
    }).join("")).join("");
  }

  function getCluster(startRow, startCol) {
    const key = state.board[startRow]?.[startCol];
    if (!key) return [];
    const queue = [[startRow, startCol]];
    const visited = new Set();
    const cluster = [];
    while (queue.length) {
      const [row, col] = queue.shift();
      const id = `${row}:${col}`;
      if (visited.has(id) || state.board[row]?.[col] !== key) continue;
      visited.add(id);
      cluster.push([row, col]);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dRow, dCol]) => {
        const nextRow = row + dRow;
        const nextCol = col + dCol;
        if (nextRow >= 0 && nextRow < ROWS && nextCol >= 0 && nextCol < COLS) queue.push([nextRow, nextCol]);
      });
    }
    return cluster;
  }

  function collapseBoard() {
    for (let col = 0; col < COLS; col += 1) {
      const remaining = [];
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        if (state.board[row][col]) remaining.push(state.board[row][col]);
      }
      while (remaining.length < ROWS) remaining.push(randomMaterial());
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        state.board[row][col] = remaining[ROWS - 1 - row];
      }
    }
  }

  function updateStats() {
    els.timeValue.textContent = state.timeLeft;
    els.clearValue.textContent = state.cleared;
    els.comboValue.textContent = state.combo;
  }

  function describeCombo(clusterSize) {
    if (clusterSize >= 7) return "큰 묶음!";
    if (clusterSize >= 5) return "기분 좋은 정리!";
    return "차곡차곡 담았어요.";
  }

  function clickTile(row, col, button) {
    if (!state.isPlaying) return;
    const cluster = getCluster(row, col);
    if (cluster.length < 2) {
      button?.classList.add("is-shake");
      window.setTimeout(() => button?.classList.remove("is-shake"), 260);
      els.gameHint.textContent = "같은 재료가 2개 이상 붙은 곳을 찾아주세요.";
      return;
    }

    const now = Date.now();
    state.combo = now - state.lastClearAt <= 1700 ? state.combo + 1 : 1;
    state.lastClearAt = now;
    const key = state.board[row][col];
    const materialGain = cluster.length + (cluster.length >= 5 ? 1 : 0);
    state.roundMaterials[key] += materialGain;
    state.cleared += cluster.length;
    els.gameHint.textContent = `${describeCombo(cluster.length)} ${MATERIALS[key].label} ${materialGain}개를 담았어요.`;
    updateStats();

    cluster.forEach(([r, c]) => {
      const tile = els.board.querySelector(`[data-row="${r}"][data-col="${c}"]`);
      tile?.classList.add("is-clearing");
      state.board[r][c] = null;
    });

    window.setTimeout(() => {
      if (!state.isPlaying) return;
      collapseBoard();
      renderBoard();
    }, 165);
  }

  function startGame() {
    if (state.isPlaying) return;
    applyIdleBundles();
    state.isRewardRound = state.bundles > 0;
    if (state.isRewardRound) {
      state.bundles -= 1;
      persistState();
    }
    state.isPlaying = true;
    state.timeLeft = GAME_SECONDS;
    state.cleared = 0;
    state.combo = 0;
    state.lastClearAt = 0;
    state.roundMaterials = { seed: 0, moss: 0, sparkle: 0 };
    state.board = makePlayableBoard();
    els.gameIntro.classList.add("is-hidden");
    els.gameResult.classList.add("is-hidden");
    els.playArea.classList.remove("is-hidden");
    els.gameHint.textContent = state.isRewardRound
      ? "오늘의 재료 묶음을 정리해볼까요? 큰 묶음일수록 더 많이 얻어요."
      : "지금은 연습판이에요. 다음 재료 묶음이 준비되면 실제 재료를 담을 수 있어요.";
    updateStats();
    renderBoard();
    renderStatus();

    window.clearInterval(state.timerId);
    state.timerId = window.setInterval(() => {
      state.timeLeft -= 1;
      updateStats();
      if (state.timeLeft <= 0) finishGame();
    }, 1000);
  }

  function resultMaterialHtml(key) {
    const material = MATERIALS[key];
    return `<div class="result-material"><span aria-hidden="true">${material.resultMark}</span><strong>${material.label}</strong><b>+${state.roundMaterials[key]}</b></div>`;
  }

  function finishGame() {
    if (!state.isPlaying) return;
    state.isPlaying = false;
    window.clearInterval(state.timerId);

    const total = Object.values(state.roundMaterials).reduce((sum, value) => sum + value, 0);
    if (state.isRewardRound) {
      materialKeys.forEach((key) => { state.materials[key] += state.roundMaterials[key]; });
      persistState();
      els.resultKicker.textContent = state.cleared >= 35 ? "아주 말끔해진 오늘의 숲" : "오늘의 숲 정리";
      els.resultTitle.textContent = total > 0
        ? "작은 것들이 바구니에 차곡차곡 담겼어요."
        : "다음 묶음에서는 더 큰 재료를 찾아볼까요?";
    } else {
      els.resultKicker.textContent = "점수 연습 결과";
      els.resultTitle.textContent = "다음 재료 묶음이 준비되면, 이 실력으로 진짜 재료를 담을 수 있어요.";
    }

    els.resultSummary.innerHTML = materialKeys.map(resultMaterialHtml).join("");
    els.playArea.classList.add("is-hidden");
    els.gameResult.classList.remove("is-hidden");
    renderStatus();
  }

  function closeResult() {
    els.gameResult.classList.add("is-hidden");
    els.gameIntro.classList.remove("is-hidden");
    renderStatus();
    document.getElementById("gameCard")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetDemo() {
    const proceed = window.confirm("체험판의 재료와 준비된 묶음을 처음 상태로 되돌릴까요?");
    if (!proceed) return;
    window.clearInterval(state.timerId);
    localStorage.removeItem(STORAGE_KEY);
    state.bundles = 1;
    state.lastGeneratedAt = Date.now();
    state.materials = { seed: 0, moss: 0, sparkle: 0 };
    state.isPlaying = false;
    state.board = [];
    els.playArea.classList.add("is-hidden");
    els.gameResult.classList.add("is-hidden");
    els.gameIntro.classList.remove("is-hidden");
    renderStatus();
    showToast("체험판을 처음 상태로 되돌렸어요.");
  }

  function bindEvents() {
    els.startGame.addEventListener("click", startGame);
    els.board.addEventListener("click", (event) => {
      const button = event.target.closest(".tile");
      if (!button || !els.board.contains(button)) return;
      const row = Number(button.dataset.row);
      const col = Number(button.dataset.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) return;
      clickTile(row, col, button);
    });
    els.closeResult.addEventListener("click", closeResult);
    els.replayGame.addEventListener("click", startGame);
    els.resetDemo.addEventListener("click", resetDemo);
  }

  function boot() {
    loadState();
    bindEvents();
    renderStatus();
    window.setInterval(renderStatus, 1000);
  }

  boot();
})();
