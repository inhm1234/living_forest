(() => {
  "use strict";

  const GAME_SECONDS = 30;
  const WAVE_SECONDS = 10;
  const BEST_SCORE_KEY = "todayforest-letter-wind-best-v1";
  const $ = (selector) => document.querySelector(selector);

  const els = {
    board: $("#gameBoard"),
    itemLayer: $("#itemLayer"),
    burstLayer: $("#burstLayer"),
    mailbox: $("#mailbox"),
    readyPanel: $("#readyPanel"),
    startButton: $("#startButton"),
    waveLabel: $("#waveLabel"),
    timeLabel: $("#timeLabel"),
    scoreLabel: $("#scoreLabel"),
    comboBadge: $("#comboBadge"),
    comboNumber: $("#comboNumber"),
    playHint: $("#playHint"),
    bestScoreLabel: $("#bestScoreLabel"),
    resultModal: $("#resultModal"),
    resultTitle: $("#resultTitle"),
    resultCopy: $("#resultCopy"),
    resultScore: $("#resultScore"),
    resultLetters: $("#resultLetters"),
    resultCombo: $("#resultCombo"),
    againButton: $("#againButton"),
    closeButton: $("#closeButton"),
  };

  const typeConfig = {
    letter: { className: "letter", icon: "✉", score: 100, combo: 1, label: "+100" },
    star: { className: "star", icon: "✦", score: 250, combo: 2, label: "별편지 +250" },
    leaf: { className: "leaf", icon: "🍂", score: 0, combo: 0, label: "낙엽! 콤보 끊김" },
    blank: { className: "blank", icon: "〰", score: 0, combo: 0, label: "바람에 흩어졌어요" },
  };

  let game = null;
  let items = [];
  let rafId = null;
  let lastFrame = 0;
  let spawnCarry = 0;
  let pointerInside = false;

  function loadBestScore() {
    try {
      const best = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
      els.bestScoreLabel.textContent = best > 0 ? `최고 ${best.toLocaleString()}점` : "아직 첫 바람길을 열지 않았어요";
    } catch {
      els.bestScoreLabel.textContent = "이 브라우저에서 첫 기록을 기다려요";
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function resetBoard() {
    cancelAnimationFrame(rafId);
    rafId = null;
    items.forEach((item) => item.el.remove());
    items = [];
    els.itemLayer.replaceChildren();
    els.burstLayer.replaceChildren();
    els.board.classList.remove("game-playing");
    els.comboBadge.classList.add("hidden");
    els.playHint.classList.add("hidden");
    els.mailbox.style.left = "50%";
    els.waveLabel.textContent = "준비";
    els.timeLabel.textContent = String(GAME_SECONDS);
    els.scoreLabel.textContent = "0";
  }

  function startGame() {
    resetBoard();
    els.resultModal.classList.add("hidden");
    els.readyPanel.classList.add("hidden");
    els.board.classList.add("game-playing");
    els.playHint.classList.remove("hidden");

    game = {
      running: true,
      startedAt: performance.now(),
      score: 0,
      letters: 0,
      combo: 0,
      maxCombo: 0,
      mailboxX: 50,
      wave: 1,
    };

    setMailboxPosition(game.mailboxX);
    lastFrame = performance.now();
    rafId = requestAnimationFrame(tick);
    els.board.focus({ preventScroll: true });
  }

  function endGame() {
    if (!game || !game.running) return;
    game.running = false;
    cancelAnimationFrame(rafId);
    rafId = null;
    els.board.classList.remove("game-playing");
    els.playHint.classList.add("hidden");
    els.comboBadge.classList.add("hidden");
    items.forEach((item) => item.el.remove());
    items = [];

    const grade = getGrade(game.score, game.letters, game.maxCombo);
    els.resultTitle.textContent = grade.title;
    els.resultCopy.textContent = grade.copy;
    els.resultScore.textContent = game.score.toLocaleString();
    els.resultLetters.textContent = `${game.letters}통`;
    els.resultCombo.textContent = `${game.maxCombo} 콤보`;
    els.resultModal.classList.remove("hidden");

    try {
      const best = Math.max(Number(localStorage.getItem(BEST_SCORE_KEY) || 0), game.score);
      localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch {
      // 브라우저 저장 차단은 게임 플레이에 영향을 주지 않습니다.
    }
    loadBestScore();
  }

  function getGrade(score, letters, maxCombo) {
    if (score >= 2600 || maxCombo >= 12) {
      return { title: "숲의 전령", copy: `${letters}통을 바람길 끝까지 데려왔어요. 오늘의 숲이 당신을 기억할 거예요.` };
    }
    if (score >= 1500 || maxCombo >= 7) {
      return { title: "바람길 길잡이", copy: `${letters}통의 편지가 무사히 숲길을 지나갔어요. 다음 바람도 기다려질 것 같아요.` };
    }
    return { title: "처음 만난 바람", copy: `${letters}통의 편지를 받아주었어요. 한 번 더 하면 더 긴 바람길을 만날 수 있을 거예요.` };
  }

  function tick(now) {
    if (!game?.running) return;
    const dt = Math.min(40, now - lastFrame);
    lastFrame = now;

    const elapsed = (now - game.startedAt) / 1000;
    const remaining = Math.max(0, GAME_SECONDS - elapsed);
    const nextWave = Math.min(3, Math.floor(elapsed / WAVE_SECONDS) + 1);
    if (nextWave !== game.wave) {
      game.wave = nextWave;
      showFloatingText("바람이 조금 더 빨라져요", 50, 27, "good");
    }

    els.waveLabel.textContent = `${game.wave} / 3`;
    els.timeLabel.textContent = String(Math.ceil(remaining));

    spawnCarry += dt;
    const interval = 760 - (game.wave - 1) * 135;
    while (spawnCarry > interval) {
      spawnCarry -= interval;
      spawnItem();
    }

    updateItems(dt);
    if (remaining <= 0) {
      endGame();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function chooseType() {
    const roll = Math.random();
    const leafChance = 0.18 + (game.wave - 1) * 0.045;
    const blankChance = 0.08;
    const starChance = 0.075;
    if (roll < starChance) return "star";
    if (roll < starChance + leafChance) return "leaf";
    if (roll < starChance + leafChance + blankChance) return "blank";
    return "letter";
  }

  function spawnItem() {
    const type = chooseType();
    const rect = els.board.getBoundingClientRect();
    const width = rect.width;
    const left = 7 + Math.random() * 86;
    const baseSpeed = 92 + game.wave * 25 + Math.random() * 34;
    const drift = (Math.random() - 0.5) * (18 + game.wave * 5);
    const itemEl = document.createElement("div");
    itemEl.className = `wind-item ${typeConfig[type].className}`;
    itemEl.innerHTML = `<span class="item-face" style="--tilt:${Math.round((Math.random() - .5) * 18)}deg">${typeConfig[type].icon}</span>`;
    els.itemLayer.appendChild(itemEl);

    items.push({
      type,
      x: left / 100 * width,
      y: -54,
      vy: baseSpeed,
      drift,
      size: 44,
      el: itemEl,
      wobble: Math.random() * Math.PI * 2,
      counted: false,
    });
  }

  function updateItems(dt) {
    const rect = els.board.getBoundingClientRect();
    const boardWidth = rect.width;
    const boardHeight = rect.height;
    const mailboxCenter = game.mailboxX / 100 * boardWidth;
    const mailboxHalf = 35;
    const mailboxY = boardHeight - 78;

    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      item.y += item.vy * dt / 1000;
      item.x += Math.sin(item.y / 52 + item.wobble) * item.drift * dt / 1000;
      item.x = clamp(item.x, 4, boardWidth - 48);
      item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) rotate(${Math.sin(item.y / 65 + item.wobble) * 11}deg)`;

      const itemCenterX = item.x + item.size / 2;
      const itemCenterY = item.y + item.size / 2;
      const isNearMailbox = itemCenterY >= mailboxY - 24 && itemCenterY <= mailboxY + 28;
      const isHorizontallyCaught = Math.abs(itemCenterX - mailboxCenter) <= mailboxHalf;

      if (!item.counted && isNearMailbox && isHorizontallyCaught) {
        item.counted = true;
        resolveCatch(item, itemCenterX, itemCenterY);
        item.el.remove();
        items.splice(i, 1);
        continue;
      }

      if (item.y > boardHeight + 52) {
        item.el.remove();
        items.splice(i, 1);
      }
    }
  }

  function resolveCatch(item, x, y) {
    const config = typeConfig[item.type];
    if (item.type === "leaf" || item.type === "blank") {
      game.combo = 0;
      updateCombo();
      showFloatingText(config.label, x / els.board.clientWidth * 100, y / els.board.clientHeight * 100, "bad");
      createBurst(x, y, "#f5d8cc");
      return;
    }

    game.combo += config.combo;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    const multiplier = Math.min(4, 1 + Math.floor((game.combo - 1) / 4));
    const earned = config.score * multiplier;
    game.score += earned;
    game.letters += item.type === "star" ? 2 : 1;
    els.scoreLabel.textContent = game.score.toLocaleString();
    updateCombo();

    const label = multiplier > 1 ? `${config.label} ×${multiplier}` : config.label;
    showFloatingText(label, x / els.board.clientWidth * 100, y / els.board.clientHeight * 100, item.type === "star" ? "bonus" : "good");
    createBurst(x, y, item.type === "star" ? "#ffe694" : "#ffd9e5");
  }

  function updateCombo() {
    if (game.combo > 1) {
      els.comboNumber.textContent = String(game.combo);
      els.comboBadge.classList.remove("hidden");
    } else {
      els.comboBadge.classList.add("hidden");
    }
  }

  function showFloatingText(text, xPercent, yPercent, kind = "good") {
    const el = document.createElement("span");
    el.className = `float-text ${kind}`;
    el.textContent = text;
    el.style.left = `${xPercent}%`;
    el.style.top = `${yPercent}%`;
    els.burstLayer.appendChild(el);
    window.setTimeout(() => el.remove(), 780);
  }

  function createBurst(x, y, color) {
    for (let i = 0; i < 7; i += 1) {
      const spark = document.createElement("i");
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 25;
      spark.className = "spark";
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.background = color;
      spark.style.boxShadow = `0 0 8px ${color}`;
      spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      els.burstLayer.appendChild(spark);
      window.setTimeout(() => spark.remove(), 600);
    }
  }

  function setMailboxPosition(percent) {
    if (!game) return;
    game.mailboxX = clamp(percent, 10, 90);
    els.mailbox.style.left = `${game.mailboxX}%`;
  }

  function moveMailboxFromClientX(clientX) {
    if (!game?.running) return;
    const rect = els.board.getBoundingClientRect();
    const percent = (clientX - rect.left) / rect.width * 100;
    setMailboxPosition(percent);
  }

  function handlePointerDown(event) {
    // 시작 안내창의 버튼도 gameBoard 안에 있습니다.
    // 게임이 시작되기 전에는 포인터를 잡지 않아야 버튼의 click 이벤트가 정상으로 전달됩니다.
    if (!game?.running) return;

    pointerInside = true;
    els.board.setPointerCapture?.(event.pointerId);
    moveMailboxFromClientX(event.clientX);
  }

  function handlePointerMove(event) {
    if (!game?.running) return;
    if (pointerInside || event.pointerType === "mouse") moveMailboxFromClientX(event.clientX);
  }

  function handlePointerEnd(event) {
    pointerInside = false;
    try { els.board.releasePointerCapture?.(event.pointerId); } catch { /* no capture */ }
  }

  function handleKeyboard(event) {
    if (!game?.running) return;
    const step = event.shiftKey ? 10 : 5;
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      setMailboxPosition(game.mailboxX - step);
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      setMailboxPosition(game.mailboxX + step);
    }
  }

  els.startButton.addEventListener("click", startGame);
  els.againButton.addEventListener("click", startGame);
  els.closeButton.addEventListener("click", () => {
    els.resultModal.classList.add("hidden");
    els.readyPanel.classList.remove("hidden");
    resetBoard();
  });
  els.board.addEventListener("pointerdown", handlePointerDown);
  els.board.addEventListener("pointermove", handlePointerMove);
  els.board.addEventListener("pointerup", handlePointerEnd);
  els.board.addEventListener("pointercancel", handlePointerEnd);
  els.board.addEventListener("keydown", handleKeyboard);
  window.addEventListener("resize", () => {
    if (game?.running) setMailboxPosition(game.mailboxX);
  });

  loadBestScore();
})();
