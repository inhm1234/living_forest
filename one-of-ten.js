(() => {
  "use strict";

  const OPERATIONS = ["+", "−", "×", "÷"];
  const TURN_LIMIT_MS = 30000;
  const AI_THINK_MS = 1050;
  const EQUATION_REVEAL_MS = 800;
  const SHOWDOWN_REVEAL_MS = 1150;
  const INTRO_KEY = "todayforest-one-of-ten-intro-seen-v1";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const els = {
    aiStatus: $("#aiStatus"),
    aiCardCount: $("#aiCardCount"),
    aiHand: $("#aiHand"),
    aiReaction: $("#aiReaction"),
    difficultyButtons: $$('[data-difficulty]'),
    resultDifficultyButtons: $$('[data-result-difficulty]'),
    history: $("#history"),
    historyToggle: $("#historyToggle"),
    operationCount: $("#operationCount"),
    turnPill: $("#turnPill"),
    turnTimer: $("#turnTimer"),
    timerText: $("#timerText"),
    timerBar: $("#timerBar"),
    timeoutHint: $("#timeoutHint"),
    currentValue: $("#currentValue"),
    selectedOperationPreview: $("#selectedOperationPreview"),
    selectedNumberPreview: $("#selectedNumberPreview"),
    arenaMessage: $("#arenaMessage"),
    calculationNote: $("#calculationNote"),
    operations: $("#operations"),
    actionPanel: $("#actionPanel"),
    decisionActions: $("#decisionActions"),
    newGameActions: $("#newGameActions"),
    stopButton: $("#stopButton"),
    drawButton: $("#drawButton"),
    newGameButtonInline: $("#newGameButtonInline"),
    humanHand: $("#humanHand"),
    deckCount: $("#deckCount"),
    handHelp: $("#handHelp"),
    resultOverlay: $("#resultOverlay"),
    resultSymbol: $("#resultSymbol"),
    resultTitle: $("#resultTitle"),
    resultDesc: $("#resultDesc"),
    resultReaction: $("#resultReaction"),
    resultEquation: $("#resultEquation"),
    resultFinalValue: $("#resultFinalValue"),
    humanTargetResult: $("#humanTargetResult"),
    humanDistanceResult: $("#humanDistanceResult"),
    aiTargetResult: $("#aiTargetResult"),
    aiDistanceResult: $("#aiDistanceResult"),
    newGameButton: $("#newGameButton"),
    changeDifficultyButton: $("#changeDifficultyButton"),
    resultDifficultyPicker: $("#resultDifficultyPicker"),
    introOverlay: $("#introOverlay"),
    introStartButton: $("#introStartButton"),
    rulesModal: $("#rulesModal"),
    rulesButton: $("#rulesButton"),
    closeRulesButton: $("#closeRulesButton"),
    rulesConfirmButton: $("#rulesConfirmButton"),
  };

  let selectedDifficulty = "normal";
  let state = null;
  let turnTimerInterval = null;
  let pendingTimeout = null;

  function shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }
    return result;
  }

  function randomItem(values) {
    return values[Math.floor(Math.random() * values.length)];
  }

  function drawCard() {
    return state.deck.length ? state.deck.pop() : null;
  }

  function removeOne(hand, number) {
    const index = hand.indexOf(number);
    if (index < 0) throw new Error("손패에 없는 카드입니다.");
    hand.splice(index, 1);
  }

  function applyOperation(current, operation, number) {
    if (operation === "+") return current + number;
    if (operation === "−") return current - number;
    if (operation === "×") return current * number;
    if (operation === "÷") return Math.trunc(current / number);
    throw new Error("지원하지 않는 수식입니다.");
  }

  function closestCard(hand, value) {
    if (!hand.length) return null;
    return [...hand].sort((left, right) => {
      const distance = Math.abs(left - value) - Math.abs(right - value);
      return distance || left - right;
    })[0];
  }

  function clearPendingTimeout() {
    if (pendingTimeout) window.clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }

  function resetGame({ deferOpening = false } = {}) {
    clearHumanTimer();
    clearPendingTimeout();

    state = {
      deck: shuffle(Array.from({ length: 10 }, (_, index) => index + 1)),
      humanHand: [],
      aiHand: [],
      availableOperations: [...OPERATIONS],
      currentValue: null,
      history: [],
      phase: "ai-opening",
      selectedOperation: null,
      selectedNumber: null,
      pendingShowdownReason: "",
      difficulty: selectedDifficulty,
      turnDeadline: 0,
      aiReaction: "도토리를 가지런히 놓고 있어요.",
      lastCalculationNote: "",
      historyExpanded: false,
      gameOver: false,
    };

    state.humanHand.push(drawCard(), drawCard());
    state.aiHand.push(drawCard(), drawCard());
    els.resultOverlay.classList.add("is-hidden");
    els.resultDifficultyPicker.classList.add("is-hidden");
    render();
    if (!deferOpening) pendingTimeout = window.setTimeout(runAiOpeningTurn, 700);
  }

  function render() {
    renderOpponent();
    renderDifficulty();
    renderHistory();
    renderArena();
    renderOperations();
    renderActions();
    renderHumanHand();
    renderTimer();
  }

  function renderOpponent() {
    els.aiHand.innerHTML = "";
    const reveal = state.phase === "showdown-resolving" || state.gameOver;
    state.aiHand.forEach((number) => {
      const card = document.createElement("span");
      card.className = `oot-card-back${reveal ? " is-revealed" : ""}`;
      card.textContent = reveal ? String(number) : "";
      els.aiHand.appendChild(card);
    });
    els.aiCardCount.textContent = `손패 ${state.aiHand.length}장`;

    const status = {
      "ai-opening": "첫 카드를 고르는 중이에요.",
      "ai-thinking": "스톱할지 계산을 이어갈지 생각 중이에요.",
      "showdown-resolving": "남은 카드를 펼쳤어요.",
      "game-over": "승부가 끝났어요.",
    };
    els.aiStatus.textContent = status[state.phase] || "상대 카드는 아직 보이지 않아요.";
    els.aiReaction.textContent = state.aiReaction || "";
  }

  function renderDifficulty() {
    els.difficultyButtons.forEach((button) => {
      const selected = button.dataset.difficulty === selectedDifficulty;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    els.resultDifficultyButtons.forEach((button) => {
      const selected = button.dataset.resultDifficulty === selectedDifficulty;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function renderHistory() {
    els.history.innerHTML = "";
    const compact = document.body.classList.contains("oot-compact");
    const source = compact && !state.historyExpanded && state.history.length
      ? [state.history[state.history.length - 1]]
      : state.history;

    if (!source.length) {
      const empty = document.createElement("span");
      empty.className = "oot-history-empty";
      empty.textContent = "아직 놓인 카드가 없어요.";
      els.history.appendChild(empty);
    } else {
      source.forEach((item) => {
        const step = document.createElement("span");
        step.className = `oot-history-step ${item.player === "ai" ? "is-ai" : "is-human"}`;
        if (item.type === "opening") {
          step.textContent = `🐿 첫 카드 ${item.number}`;
        } else {
          const owner = item.player === "ai" ? "🐿" : "나";
          step.textContent = `${owner} · ${item.before} ${item.operation} ${item.number} = ${item.after}`;
        }
        els.history.appendChild(step);
      });
      requestAnimationFrame(() => { els.history.scrollLeft = els.history.scrollWidth; });
    }

    const canToggle = compact && state.history.length > 1;
    els.historyToggle.classList.toggle("is-hidden", !canToggle);
    els.historyToggle.textContent = state.historyExpanded ? "간단히" : "전체 보기";
    els.operationCount.textContent = `수식 ${OPERATIONS.length - state.availableOperations.length} / ${OPERATIONS.length}`;
  }

  function renderArena() {
    const hasOperation = ["human-play", "human-resolving"].includes(state.phase) && state.selectedOperation;
    const hasNumber = hasOperation && state.selectedNumber !== null;

    els.currentValue.textContent = state.currentValue === null ? "?" : String(state.currentValue);
    els.currentValue.classList.toggle("is-empty", state.currentValue === null);

    els.selectedOperationPreview.textContent = hasOperation ? state.selectedOperation : "";
    els.selectedOperationPreview.classList.toggle("is-hidden", !hasOperation);
    els.selectedOperationPreview.classList.toggle("is-cancelable", Boolean(hasOperation && !hasNumber && state.phase === "human-play"));
    els.selectedOperationPreview.disabled = !(hasOperation && !hasNumber && state.phase === "human-play");

    els.selectedNumberPreview.textContent = hasNumber ? String(state.selectedNumber) : "";
    els.selectedNumberPreview.classList.toggle("is-hidden", !hasNumber);

    const phaseCopy = {
      "ai-opening": ["다람쥐 선공", "숲 다람쥐가 첫 숫자카드를 내고 있어요."],
      "human-play": ["내 차례", "수식카드를 고른 뒤 손에 있는 숫자카드를 내세요."],
      "human-resolving": ["계산 중", "놓인 수식의 결과가 잠시 뒤 나타나요."],
      "human-decision": ["내 차례", "지금 승부하거나 카드 한 장을 받고 계산을 이어갈 수 있어요."],
      "ai-thinking": ["다람쥐 차례", "다람쥐가 자기 카드와 결과값을 비교하고 있어요."],
      "showdown-resolving": ["승부 확인", "두 사람의 남은 카드와 최종 결과값을 비교하고 있어요."],
      "game-over": ["승부 종료", "한 판 더 하거나 내 정원으로 돌아갈 수 있어요."],
    };
    let [pill, message] = phaseCopy[state.phase] || ["원오브텐", ""];
    if (state.phase === "human-play" && state.selectedOperation && state.selectedNumber === null) {
      message = `선택한 ${state.selectedOperation}가 놓였어요. 잘못 골랐다면 중앙의 수식을 눌러 취소하세요.`;
    }
    if (state.phase === "human-resolving") {
      message = `${state.currentValue} ${state.selectedOperation} ${state.selectedNumber}…`;
    }
    els.turnPill.textContent = pill;
    els.arenaMessage.textContent = message;
    els.calculationNote.textContent = state.lastCalculationNote || "";
    els.calculationNote.classList.toggle("is-hidden", !state.lastCalculationNote);
  }

  function renderOperations() {
    els.operations.innerHTML = "";
    OPERATIONS.forEach((operation) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "oot-operation-card";
      button.textContent = operation;

      const available = state.availableOperations.includes(operation);
      const lockedByChoice = state.selectedOperation !== null;
      const selectable = state.phase === "human-play" && available && !lockedByChoice;
      button.disabled = !selectable;
      button.classList.toggle("is-selected", state.selectedOperation === operation);
      button.addEventListener("click", () => {
        if (!selectable) return;
        state.selectedOperation = operation;
        state.selectedNumber = null;
        render();
      });
      els.operations.appendChild(button);
    });
  }

  function renderActions() {
    const showDecision = state.phase === "human-decision";
    const showNewGame = state.phase === "game-over";
    els.actionPanel.classList.toggle("is-hidden", !showDecision && !showNewGame);
    els.decisionActions.classList.toggle("is-hidden", !showDecision);
    els.newGameActions.classList.toggle("is-hidden", !showNewGame);
    els.drawButton.disabled = !state.deck.length || !state.availableOperations.length;
  }

  function renderHumanHand() {
    els.humanHand.innerHTML = "";
    state.humanHand.forEach((number) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "oot-number-card";
      button.textContent = number;
      const selectable = state.phase === "human-play" && state.selectedOperation !== null && state.selectedNumber === null;
      button.disabled = !selectable;
      button.classList.toggle("is-selected", state.selectedNumber === number);
      button.classList.toggle("is-showdown", state.phase === "showdown-resolving");
      button.addEventListener("click", () => handleHumanNumber(number));
      els.humanHand.appendChild(button);
    });
    els.deckCount.textContent = `더미 ${state.deck.length}장`;

    let help = "다람쥐의 차례예요.";
    if (state.phase === "human-play" && !state.selectedOperation) help = "먼저 수식카드를 선택하세요.";
    if (state.phase === "human-play" && state.selectedOperation) help = "이제 계산에 사용할 숫자카드를 선택하세요.";
    if (state.phase === "human-resolving") help = "잠시 뒤 결과가 자동으로 나타나요.";
    if (state.phase === "human-decision") help = "스톱 또는 카드 받기를 선택하세요.";
    if (state.phase === "showdown-resolving") help = "남은 카드 중 결과값에 가장 가까운 카드를 찾고 있어요.";
    if (state.phase === "game-over") help = "이번 판의 카드 기록은 결과창에 남아 있어요.";
    els.handHelp.textContent = help;
  }

  function isHumanTimedPhase() {
    return state && ["human-play", "human-decision"].includes(state.phase) && state.turnDeadline > 0;
  }

  function startHumanTimer({ preserveDeadline = false } = {}) {
    clearHumanTimer({ keepDeadline: preserveDeadline });
    if (!preserveDeadline || !state.turnDeadline) state.turnDeadline = Date.now() + TURN_LIMIT_MS;
    turnTimerInterval = window.setInterval(updateHumanTimer, 100);
    updateHumanTimer();
  }

  function clearHumanTimer({ keepDeadline = false } = {}) {
    if (turnTimerInterval) window.clearInterval(turnTimerInterval);
    turnTimerInterval = null;
    if (state && !keepDeadline) state.turnDeadline = 0;
  }

  function updateHumanTimer() {
    if (!isHumanTimedPhase()) {
      renderTimer();
      return;
    }
    const remaining = Math.max(0, state.turnDeadline - Date.now());
    if (remaining <= 0) {
      clearHumanTimer();
      handleHumanTimeout();
      return;
    }
    renderTimer(remaining);
  }

  function renderTimer(forcedRemaining = null) {
    const active = isHumanTimedPhase();
    els.turnTimer.classList.toggle("is-hidden", !active);
    els.timeoutHint.classList.toggle("is-hidden", true);
    if (!active) return;
    const remaining = forcedRemaining ?? Math.max(0, state.turnDeadline - Date.now());
    const seconds = Math.max(0, Math.ceil(remaining / 1000));
    const ratio = Math.max(0, Math.min(1, remaining / TURN_LIMIT_MS));
    els.timerText.textContent = `${seconds}초`;
    els.timerBar.style.width = `${ratio * 100}%`;
    els.turnTimer.classList.toggle("is-warning", seconds <= 10 && seconds > 5);
    els.turnTimer.classList.toggle("is-danger", seconds <= 5);

    if (seconds <= 5) {
      const hint = state.phase === "human-decision"
        ? "시간이 끝나면 자동으로 스톱해요."
        : "시간이 끝나면 가능한 카드가 자동으로 나가요.";
      els.timeoutHint.textContent = hint;
      els.timeoutHint.classList.remove("is-hidden");
    }
  }

  function handleHumanTimeout() {
    if (state.phase === "human-decision") {
      beginShowdown("시간이 다 되어 자동으로 스톱했어요.");
      return;
    }
    if (state.phase === "human-play") autoSubmitTimedOutMove();
  }

  function autoSubmitTimedOutMove() {
    if (!state.availableOperations.length || !state.humanHand.length) {
      beginShowdown("더 이상 계산을 이어갈 카드가 없어요.");
      return;
    }
    const operation = state.selectedOperation && state.availableOperations.includes(state.selectedOperation)
      ? state.selectedOperation
      : randomItem(state.availableOperations);
    const number = randomItem(state.humanHand);
    state.selectedOperation = operation;
    state.selectedNumber = number;
    state.phase = "human-resolving";
    render();
    pendingTimeout = window.setTimeout(() => commitHumanPlay({ timedOut: true }), 650);
  }

  function runAiOpeningTurn() {
    if (state.phase !== "ai-opening" || state.gameOver) return;
    const openingNumber = randomItem(state.aiHand);
    removeOne(state.aiHand, openingNumber);
    state.currentValue = openingNumber;
    state.history.push({ player: "ai", type: "opening", number: openingNumber });
    state.aiReaction = `첫 카드로 ${openingNumber}을 내밀었어요.`;
    state.phase = "human-play";
    state.selectedOperation = null;
    state.selectedNumber = null;
    render();
    startHumanTimer();
  }

  function handleHumanNumber(number) {
    if (state.phase !== "human-play" || !state.selectedOperation || state.selectedNumber !== null) return;
    state.selectedNumber = number;
    state.phase = "human-resolving";
    clearHumanTimer();
    render();
    pendingTimeout = window.setTimeout(() => commitHumanPlay({ timedOut: false }), EQUATION_REVEAL_MS);
  }

  function cancelOperationFromPreview() {
    if (state.phase !== "human-play" || !state.selectedOperation || state.selectedNumber !== null) return;
    state.selectedOperation = null;
    render();
  }

  function commitHumanPlay({ timedOut = false } = {}) {
    if (state.phase !== "human-resolving") return;
    const operation = state.selectedOperation;
    const number = state.selectedNumber;
    if (!operation || number === null) return;

    const before = state.currentValue;
    const after = applyOperation(before, operation, number);
    removeOne(state.humanHand, number);
    state.availableOperations.splice(state.availableOperations.indexOf(operation), 1);
    state.currentValue = after;
    state.history.push({ player: "human", type: "calculation", before, operation, number, after, timedOut });
    state.lastCalculationNote = operation === "÷" && before % number !== 0
      ? `${before} ÷ ${number}은 소수점을 버려 ${after}로 계산했어요.`
      : "";
    state.aiReaction = randomItem([
      "결과값을 보며 꼬리를 살랑였어요.",
      "도토리를 만지작거리며 다음 수를 생각해요.",
      "놓인 수식을 가만히 바라보고 있어요.",
    ]);
    state.selectedOperation = null;
    state.selectedNumber = null;

    if (!state.availableOperations.length) {
      beginShowdown("수식카드 네 장을 모두 사용했어요.");
      return;
    }
    state.phase = "ai-thinking";
    render();
    pendingTimeout = window.setTimeout(runAiTurn, AI_THINK_MS);
  }

  function startHumanDraw() {
    if (state.phase !== "human-decision") return;
    const drawn = drawCard();
    if (drawn === null || !state.availableOperations.length) {
      beginShowdown("더 이상 계산을 이어갈 수 없어요.");
      return;
    }
    state.humanHand.push(drawn);
    state.phase = "human-play";
    state.selectedOperation = null;
    state.selectedNumber = null;
    render();
    startHumanTimer({ preserveDeadline: true });
  }

  function evaluateAiStop() {
    const target = closestCard(state.aiHand, state.currentValue);
    const distance = Math.abs(target - state.currentValue);
    let chance = 0;

    if (state.difficulty === "easy") {
      chance = distance === 0 ? 1 : distance === 1 ? .65 : distance === 2 ? .35 : .04;
    } else if (state.difficulty === "hard") {
      chance = distance <= 2 ? 1 : distance === 3 ? .65 : distance === 4 ? .28 : .06;
    } else {
      chance = distance === 0 ? 1 : distance === 1 ? .98 : distance === 2 ? .9 : distance === 3 ? .16 : .04;
    }
    return { target, distance, shouldStop: state.history.length >= 2 && Math.random() < chance };
  }

  function chooseAiMove() {
    const candidates = [];
    state.availableOperations.forEach((operation) => {
      state.aiHand.forEach((number) => {
        const result = applyOperation(state.currentValue, operation, number);
        const remainingHand = [...state.aiHand];
        remainingHand.splice(remainingHand.indexOf(number), 1);
        const ownDistance = remainingHand.length
          ? Math.min(...remainingHand.map((card) => Math.abs(card - result)))
          : 999;
        const magnitudePenalty = Math.abs(result) > 70 ? (Math.abs(result) - 70) * .04 : 0;
        const exactBonus = ownDistance === 0 ? 4 : 0;
        candidates.push({
          operation,
          number,
          score: -ownDistance - magnitudePenalty + exactBonus + Math.random() * .35,
        });
      });
    });

    if (state.difficulty === "easy") return randomItem(candidates);
    candidates.sort((left, right) => right.score - left.score);
    if (state.difficulty === "normal") return randomItem(candidates.slice(0, Math.min(3, candidates.length)));
    return candidates[0];
  }

  function runAiTurn() {
    if (state.phase !== "ai-thinking" || state.gameOver) return;
    if (!state.availableOperations.length || !state.deck.length) {
      beginShowdown("더 이상 계산을 이어갈 수 없어요.");
      return;
    }

    const stopDecision = evaluateAiStop();
    if (stopDecision.shouldStop) {
      state.aiReaction = "꼬리를 번쩍 세우며 스톱을 외쳤어요.";
      beginShowdown(`다람쥐가 자기 카드와 결과값의 차이 ${stopDecision.distance}을 보고 스톱했어요.`);
      return;
    }

    const drawn = drawCard();
    if (drawn === null) {
      beginShowdown("다람쥐가 더 받을 카드가 없어 스톱했어요.");
      return;
    }
    state.aiHand.push(drawn);
    const move = chooseAiMove();
    const before = state.currentValue;
    const after = applyOperation(before, move.operation, move.number);
    removeOne(state.aiHand, move.number);
    state.availableOperations.splice(state.availableOperations.indexOf(move.operation), 1);
    state.currentValue = after;
    state.history.push({ player: "ai", type: "calculation", before, operation: move.operation, number: move.number, after });
    state.lastCalculationNote = move.operation === "÷" && before % move.number !== 0
      ? `${before} ÷ ${move.number}은 소수점을 버려 ${after}로 계산했어요.`
      : "";
    state.aiReaction = `${move.operation} ${move.number} 카드를 조심스럽게 내려놓았어요.`;

    if (!state.availableOperations.length) {
      beginShowdown("수식카드 네 장을 모두 사용했어요.");
      return;
    }
    state.phase = "human-decision";
    render();
    startHumanTimer();
  }

  function beginShowdown(reason) {
    if (state.gameOver || state.phase === "showdown-resolving") return;
    clearHumanTimer();
    clearPendingTimeout();
    state.pendingShowdownReason = reason;
    state.aiReaction = "남은 카드를 한 장씩 펼치고 있어요.";
    state.phase = "showdown-resolving";
    state.selectedOperation = null;
    state.selectedNumber = null;
    render();
    pendingTimeout = window.setTimeout(finishAutomaticShowdown, SHOWDOWN_REVEAL_MS);
  }

  function renderResultHistory() {
    els.resultEquation.innerHTML = "";
    state.history.forEach((item) => {
      const line = document.createElement("span");
      line.className = "oot-result-step";
      if (item.type === "opening") {
        line.innerHTML = `<b>다람쥐가 낸 숫자카드:</b> ${item.number}`;
      } else {
        const owner = item.player === "ai" ? "다람쥐 차례" : "내 차례";
        const timeoutLabel = item.timedOut ? " · 시간 종료 자동 제출" : "";
        line.innerHTML = `<b>${owner}:</b> ${item.before} ${item.operation} ${item.number} = ${item.after}<small>${timeoutLabel}</small>`;
      }
      els.resultEquation.appendChild(line);
    });
    els.resultFinalValue.textContent = `최종 결과값: ${state.currentValue}`;
  }

  function finishAutomaticShowdown() {
    if (state.phase !== "showdown-resolving" || state.gameOver) return;
    const humanTarget = closestCard(state.humanHand, state.currentValue);
    const aiTarget = closestCard(state.aiHand, state.currentValue);
    if (humanTarget === null || aiTarget === null) throw new Error("승부에 사용할 남은 카드가 없습니다.");

    const humanDistance = Math.abs(humanTarget - state.currentValue);
    const aiDistance = Math.abs(aiTarget - state.currentValue);
    state.gameOver = true;
    state.phase = "game-over";

    let title = "무승부예요";
    let symbol = "🤝";
    let description = `${state.pendingShowdownReason} 두 카드가 최종 결과값 ${state.currentValue}에서 같은 거리였어요.`;
    let reaction = "다람쥐도 같은 거리라며 신기해해요.";
    if (humanDistance < aiDistance) {
      title = "당신이 이겼어요";
      symbol = "🏆";
      description = `${state.pendingShowdownReason} 남은 카드를 펼쳐 보니 내 카드가 최종 결과값 ${state.currentValue}에 더 가까웠어요.`;
      reaction = "다람쥐가 고개를 갸웃하며 다음 판을 기다려요.";
    } else if (humanDistance > aiDistance) {
      title = "숲 다람쥐가 이겼어요";
      symbol = "🐿️";
      description = `${state.pendingShowdownReason} 남은 카드를 펼쳐 보니 다람쥐 카드가 최종 결과값 ${state.currentValue}에 더 가까웠어요.`;
      reaction = "다람쥐가 꼬리를 살랑이며 기뻐해요.";
    }

    els.resultSymbol.textContent = symbol;
    els.resultTitle.textContent = title;
    els.resultDesc.textContent = description;
    els.resultReaction.textContent = reaction;
    els.humanTargetResult.textContent = humanTarget;
    els.humanDistanceResult.textContent = `거리 ${humanDistance}`;
    els.aiTargetResult.textContent = aiTarget;
    els.aiDistanceResult.textContent = `거리 ${aiDistance}`;
    renderResultHistory();
    render();
    els.resultOverlay.classList.remove("is-hidden");
  }

  function toggleResultDifficulty() {
    els.resultDifficultyPicker.classList.toggle("is-hidden");
  }

  function selectResultDifficulty(difficulty) {
    if (!["easy", "normal", "hard"].includes(difficulty)) return;
    selectedDifficulty = difficulty;
    resetGame();
  }

  function applyViewportMode() {
    const compact = window.innerWidth <= 600 && window.innerHeight <= 900;
    document.body.classList.toggle("oot-compact", compact);
    if (state) renderHistory();
  }

  function isIntroSeen() {
    if (new URLSearchParams(window.location.search).get("skipIntro") === "1") return true;
    try {
      return window.localStorage.getItem(INTRO_KEY) === "true";
    } catch (_) {
      return false;
    }
  }

  function markIntroSeen() {
    try {
      window.localStorage.setItem(INTRO_KEY, "true");
    } catch (_) {
      // 저장이 막혀 있어도 게임은 계속 진행합니다.
    }
  }

  function startAfterIntro() {
    markIntroSeen();
    els.introOverlay.classList.add("is-hidden");
    if (state.phase === "ai-opening" && !pendingTimeout) {
      pendingTimeout = window.setTimeout(runAiOpeningTurn, 350);
    }
  }

  function setDifficulty(difficulty) {
    if (!["easy", "normal", "hard"].includes(difficulty)) return;
    selectedDifficulty = difficulty;
    resetGame();
  }

  function openRules() { els.rulesModal.classList.remove("is-hidden"); }
  function closeRules() { els.rulesModal.classList.add("is-hidden"); }

  els.difficultyButtons.forEach((button) => button.addEventListener("click", () => setDifficulty(button.dataset.difficulty)));
  els.resultDifficultyButtons.forEach((button) => {
    button.addEventListener("click", () => selectResultDifficulty(button.dataset.resultDifficulty));
  });
  els.historyToggle.addEventListener("click", () => {
    state.historyExpanded = !state.historyExpanded;
    renderHistory();
  });
  els.changeDifficultyButton.addEventListener("click", toggleResultDifficulty);
  els.introStartButton.addEventListener("click", startAfterIntro);
  els.stopButton.addEventListener("click", () => beginShowdown("당신이 스톱했어요."));
  els.drawButton.addEventListener("click", startHumanDraw);
  els.selectedOperationPreview.addEventListener("click", cancelOperationFromPreview);
  els.newGameButton.addEventListener("click", resetGame);
  els.newGameButtonInline.addEventListener("click", resetGame);
  els.rulesButton.addEventListener("click", openRules);
  els.closeRulesButton.addEventListener("click", closeRules);
  els.rulesConfirmButton.addEventListener("click", closeRules);
  els.rulesModal.addEventListener("click", (event) => { if (event.target === els.rulesModal) closeRules(); });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && isHumanTimedPhase()) updateHumanTimer();
  });
  window.addEventListener("resize", applyViewportMode);

  applyViewportMode();
  const showIntro = !isIntroSeen();
  resetGame({ deferOpening: showIntro });
  els.introOverlay.classList.toggle("is-hidden", !showIntro);
})();
