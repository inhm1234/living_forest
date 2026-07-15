(() => {
  "use strict";

  const OPERATIONS = ["+", "−", "×", "÷"];
  const TURN_LIMIT_MS = 30000;
  const AI_THINK_MS = 1050;
  const EQUATION_REVEAL_MS = 800;
  const SHOWDOWN_REVEAL_MS = 1150;
  const AI_PERSONALITIES = {
    cautious: {
      name: "겁많은 다람쥐",
      badge: "안전형",
      icon: "🌿",
      intro: "결과값이 가까워지면 위험을 피하고 일찍 멈추는 편이에요.",
      mistakeRate: 0.15,
      stopChance(distance) {
        if (distance <= 3) return 0.80;
        if (distance <= 6) return 0.45;
        return 0.06;
      },
      opening: [
        "{number}이면 무리하지 않고 시작할 수 있겠어요.",
        "조심조심 {number} 카드를 내밀었어요.",
      ],
      thinking: [
        "더 했다가 멀어질까 봐 꼼꼼히 살펴봐요.",
        "안전한 수식이 남았는지 가만히 확인해요.",
        "도토리를 꼭 쥐고 결과값을 바라봐요.",
      ],
      play: [
        "크게 흔들리지 않는 계산을 골랐어요.",
        "조심스럽게 {operation} {number} 카드를 내려놓았어요.",
      ],
      stop: [
        "이 정도면 괜찮지 않을까…? 여기서 멈출래요!",
        "더 했다가 멀어지면 무서워요. 스톱!",
      ],
      mistake: [
        "앗, 긴장해서 조금 서둘러 골랐나 봐요.",
        "조심하려다 오히려 계산이 꼬였어요.",
      ],
      reveal: [
        "두 손으로 남은 카드를 조심조심 펼쳐요.",
        "결과를 확인하며 살짝 눈을 감았어요.",
      ],
      result: {
        humanWin: "안전하게 가려다 기회를 놓쳤다며 다음 판을 준비해요.",
        aiWin: "휴, 무리하지 않길 잘했다며 안도의 숨을 쉬어요.",
        draw: "같은 거리라서 다행이라며 방긋 웃어요.",
      },
    },
    greedy: {
      name: "욕심쟁이 다람쥐",
      badge: "도전형",
      icon: "🔥",
      intro: "좋은 숫자가 나와도 한 번 더 도전하고 큰 변화를 좋아해요.",
      mistakeRate: 0.20,
      stopChance(distance) {
        if (distance === 0) return 1;
        if (distance === 1) return 0.60;
        if (distance <= 3) return 0.30;
        return 0.05;
      },
      opening: [
        "{number}부터 크게 키워볼까요?",
        "신나게 {number} 카드를 탁 내려놓았어요.",
      ],
      thinking: [
        "한 번만 더 하면 딱 맞을 것 같다며 눈을 반짝여요.",
        "아직 부족하다며 더 큰 계산을 찾고 있어요.",
        "곱셈 카드 쪽으로 자꾸 시선이 가요.",
      ],
      play: [
        "과감하게 {operation} {number} 카드를 내려놓았어요!",
        "결과가 크게 움직이자 신나서 꼬리를 흔들어요.",
      ],
      stop: [
        "딱 맞았어요! 이번에는 욕심내지 않고 스톱!",
        "조금 더 하고 싶지만… 이번에는 여기서 멈출래요!",
      ],
      mistake: [
        "앗… 너무 욕심냈나 봐요!",
        "큰 수만 보다가 가까운 길을 놓쳤어요.",
      ],
      reveal: [
        "자신만만하게 남은 카드를 한꺼번에 펼쳐요.",
        "이번에도 이길 거라며 꼬리를 힘껏 세워요.",
      ],
      result: {
        humanWin: "한 번만 덜 욕심낼 걸 그랬다며 도토리를 굴려요.",
        aiWin: "과감한 도전이 통했다며 신나게 폴짝 뛰어요.",
        draw: "다음에는 한 번 더 가겠다며 벌써 승부욕을 보여요.",
      },
    },
    genius: {
      name: "계산왕 다람쥐",
      badge: "분석형",
      icon: "🧠",
      intro: "가능한 수식을 비교하고 목표에 가장 가까운 선택을 찾아요.",
      mistakeRate: 0.05,
      stopChance(distance) {
        if (distance <= 1) return 0.95;
        if (distance === 2) return 0.70;
        if (distance === 3) return 0.28;
        return 0.05;
      },
      opening: [
        "첫 수는 {number}. 가능한 경우를 계산해볼게요.",
        "{number}에서 시작하는 경로를 머릿속에 그렸어요.",
      ],
      thinking: [
        "가능한 경우를 하나씩 계산 중이에요.",
        "남은 카드와 수식을 빠르게 비교하고 있어요.",
        "가장 가까운 수식을 찾기 위해 집중해요.",
      ],
      play: [
        "비교를 마치고 {operation} {number}을 선택했어요.",
        "가장 안정적인 계산을 찾아 카드를 내려놓았어요.",
      ],
      stop: [
        "계산 완료. 이 값이면 여기서 멈추는 게 좋아요.",
        "남은 경우를 비교했어요. 스톱할게요.",
      ],
      mistake: [
        "드물게 계산 하나를 놓치고 말았어요.",
        "너무 빠르게 비교하다 작은 경우를 지나쳤어요.",
      ],
      reveal: [
        "계산한 순서대로 남은 카드를 차분히 펼쳐요.",
        "마지막 거리까지 확인하며 고개를 끄덕여요.",
      ],
      result: {
        humanWin: "이번 계산은 당신이 더 정확했다며 정중히 박수쳐요.",
        aiWin: "예상한 범위 안이었다며 조용히 고개를 끄덕여요.",
        draw: "같은 답에 도착했다며 흥미롭게 기록해둬요.",
      },
    },
  };
  const AI_SKILL_BY_DIFFICULTY = { easy: 0.55, normal: 0.75, hard: 0.92 };
  const AI_DISCIPLINE_BY_DIFFICULTY = { easy: 0.65, normal: 0.85, hard: 1 };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const els = {
    modeGate: $("#modeGate"),
    computerGameArea: $("#computerGameArea"),
    modeBadge: $("#modeBadge"),
    computerModeButton: $("#computerModeButton"),
    aiStatus: $("#aiStatus"),
    aiName: $("#aiName"),
    aiPersonalityBadge: $("#aiPersonalityBadge"),
    personalityIntro: $("#personalityIntro"),
    personalityIntroIcon: $("#personalityIntroIcon"),
    personalityIntroName: $("#personalityIntroName"),
    personalityIntroDesc: $("#personalityIntroDesc"),
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
    resultPersonality: $("#resultPersonality"),
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
    introKicker: $("#introKicker"),
    introOpponentIcon: $("#introOpponentIcon"),
    introOpponentName: $("#introOpponentName"),
    introOpponentBadge: $("#introOpponentBadge"),
    introOpponentDesc: $("#introOpponentDesc"),
    introDifficultyButtons: $$('[data-intro-difficulty]'),
    introCountdown: $("#introCountdown"),
    introNote: $("#introNote"),
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
  let personalityIntroTimeout = null;
  let pregameCountdownInterval = null;
  let lastPersonalityKey = null;

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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatAiLine(line, values = {}) {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
      line,
    );
  }

  function pickAiPersonality() {
    const keys = Object.keys(AI_PERSONALITIES);
    const choices = lastPersonalityKey && keys.length > 1
      ? keys.filter((key) => key !== lastPersonalityKey)
      : keys;
    const selected = randomItem(choices);
    lastPersonalityKey = selected;
    return selected;
  }

  function getAiPersonality() {
    return AI_PERSONALITIES[state?.aiPersonality] || AI_PERSONALITIES.cautious;
  }

  function clearPersonalityIntroTimeout() {
    if (personalityIntroTimeout) window.clearTimeout(personalityIntroTimeout);
    personalityIntroTimeout = null;
  }

  function showPersonalityIntro() {
    if (!state) return;
    clearPersonalityIntroTimeout();
    state.personalityIntroVisible = true;
    renderOpponent();
    personalityIntroTimeout = window.setTimeout(() => {
      if (!state) return;
      state.personalityIntroVisible = false;
      renderOpponent();
      personalityIntroTimeout = null;
    }, 4200);
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

  function clearPregameCountdown() {
    if (pregameCountdownInterval) window.clearInterval(pregameCountdownInterval);
    pregameCountdownInterval = null;
  }

  function renderPreparation() {
    if (!state) return;
    const personality = getAiPersonality();
    els.introOpponentIcon.textContent = personality.icon;
    els.introOpponentName.textContent = personality.name;
    els.introOpponentBadge.textContent = personality.badge;
    els.introOpponentBadge.dataset.personality = state.aiPersonality;
    els.introOpponentDesc.textContent = personality.intro;
    els.introDifficultyButtons.forEach((button) => {
      const selected = button.dataset.introDifficulty === selectedDifficulty;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.disabled = Boolean(pregameCountdownInterval);
    });
  }

  function openPreparation() {
    clearPregameCountdown();
    els.introKicker.textContent = "TODAY'S OPPONENT";
    els.introCountdown.classList.add("is-hidden");
    els.introCountdown.textContent = "3";
    els.introNote.textContent = "버튼을 누르면 3초 뒤 다람쥐가 첫 카드를 냅니다.";
    els.introStartButton.disabled = false;
    els.introStartButton.textContent = "게임 시작";
    renderPreparation();
    els.introOverlay.classList.remove("is-hidden");
  }

  function prepareNewGame() {
    clearPregameCountdown();
    resetGame({ deferOpening: true });
    openPreparation();
  }

  function resetGame({ deferOpening = false } = {}) {
    clearHumanTimer();
    clearPendingTimeout();
    clearPersonalityIntroTimeout();
    clearPregameCountdown();

    const aiPersonality = pickAiPersonality();
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
      aiPersonality,
      personalityIntroVisible: true,
      turnDeadline: 0,
      aiReaction: `${AI_PERSONALITIES[aiPersonality].name}가 자기 방식대로 카드를 정리하고 있어요.`,
      lastCalculationNote: "",
      historyExpanded: false,
      gameOver: false,
    };

    // 실제 카드 배정은 준비 카운트다운이 끝난 뒤에만 진행합니다.
    els.resultOverlay.classList.add("is-hidden");
    els.resultDifficultyPicker.classList.add("is-hidden");
    render();
    renderPreparation();
    if (!deferOpening) {
      showPersonalityIntro();
      pendingTimeout = window.setTimeout(runAiOpeningTurn, 700);
    }
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
    const personality = getAiPersonality();
    els.aiName.textContent = personality.name;
    els.aiPersonalityBadge.textContent = personality.badge;
    els.aiPersonalityBadge.dataset.personality = state.aiPersonality;
    els.personalityIntro.dataset.personality = state.aiPersonality;
    els.personalityIntroIcon.textContent = personality.icon;
    els.personalityIntroName.textContent = `오늘의 상대 · ${personality.name}`;
    els.personalityIntroDesc.textContent = personality.intro;
    els.personalityIntro.classList.toggle("is-hidden", !state.personalityIntroVisible);

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
    els.introDifficultyButtons.forEach((button) => {
      const selected = button.dataset.introDifficulty === selectedDifficulty;
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
    const personality = getAiPersonality();
    const openingNumber = randomItem(state.aiHand);
    removeOne(state.aiHand, openingNumber);
    state.currentValue = openingNumber;
    state.history.push({ player: "ai", type: "opening", number: openingNumber });
    state.aiReaction = formatAiLine(randomItem(personality.opening), { number: openingNumber });
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
    state.aiReaction = randomItem(getAiPersonality().thinking);
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
    const personality = getAiPersonality();
    const target = closestCard(state.aiHand, state.currentValue);
    const distance = Math.abs(target - state.currentValue);
    const baseChance = personality.stopChance(distance);
    const discipline = AI_DISCIPLINE_BY_DIFFICULTY[state.difficulty] ?? 0.85;
    const chance = clamp(0.5 + (baseChance - 0.5) * discipline, 0.02, 1);
    return {
      target,
      distance,
      chance,
      shouldStop: state.history.length >= 2 && Math.random() < chance,
    };
  }

  function chooseAiMove() {
    const personality = getAiPersonality();
    const candidates = [];
    state.availableOperations.forEach((operation) => {
      state.aiHand.forEach((number) => {
        const result = applyOperation(state.currentValue, operation, number);
        const remainingHand = [...state.aiHand];
        remainingHand.splice(remainingHand.indexOf(number), 1);
        const ownDistance = remainingHand.length
          ? Math.min(...remainingHand.map((card) => Math.abs(card - result)))
          : 999;
        const changeSize = Math.abs(result - state.currentValue);
        const magnitudePenalty = Math.abs(result) > 70 ? (Math.abs(result) - 70) * 0.05 : 0;
        const exactBonus = ownDistance === 0 ? 5 : ownDistance === 1 ? 1.4 : 0;
        let personalityBias = 0;

        if (state.aiPersonality === "cautious") {
          if (["+", "−"].includes(operation)) personalityBias += 0.8;
          if (operation === "×") personalityBias -= 0.65;
          if (changeSize <= 10) personalityBias += 0.55;
          if (Math.abs(result) > 40) personalityBias -= 0.45;
        } else if (state.aiPersonality === "greedy") {
          if (operation === "×") personalityBias += 1.15;
          if (operation === "+") personalityBias += 0.35;
          personalityBias += Math.min(1.1, changeSize * 0.025);
        } else if (state.aiPersonality === "genius") {
          if (ownDistance <= 2) personalityBias += 1.1;
          if (ownDistance === 0) personalityBias += 1.8;
          if (operation === "÷" && state.currentValue % number === 0) personalityBias += 0.25;
        }

        candidates.push({
          operation,
          number,
          result,
          ownDistance,
          score: -ownDistance * 1.25 - magnitudePenalty + exactBonus + personalityBias + Math.random() * 0.12,
        });
      });
    });

    candidates.sort((left, right) => right.score - left.score);
    const madeMistake = Math.random() < personality.mistakeRate;
    if (madeMistake) return { ...randomItem(candidates), decision: "mistake" };

    const skill = AI_SKILL_BY_DIFFICULTY[state.difficulty] ?? 0.75;
    if (Math.random() < skill) return { ...candidates[0], decision: "best" };

    const uncertainPoolSize = Math.max(2, Math.ceil(candidates.length * 0.35));
    return { ...randomItem(candidates.slice(0, uncertainPoolSize)), decision: "uncertain" };
  }

  function runAiTurn() {
    if (state.phase !== "ai-thinking" || state.gameOver) return;
    const personality = getAiPersonality();
    if (!state.availableOperations.length || !state.deck.length) {
      beginShowdown("더 이상 계산을 이어갈 수 없어요.");
      return;
    }

    const stopDecision = evaluateAiStop();
    if (stopDecision.shouldStop) {
      const stopLine = randomItem(personality.stop);
      beginShowdown(
        `${personality.name}가 자기 카드와 결과값의 차이 ${stopDecision.distance}을 보고 스톱했어요.`,
        stopLine,
      );
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
    state.aiReaction = move.decision === "mistake"
      ? randomItem(personality.mistake)
      : formatAiLine(randomItem(personality.play), { operation: move.operation, number: move.number });

    if (!state.availableOperations.length) {
      beginShowdown("수식카드 네 장을 모두 사용했어요.");
      return;
    }
    state.phase = "human-decision";
    render();
    startHumanTimer();
  }

  function beginShowdown(reason, reaction = "") {
    if (state.gameOver || state.phase === "showdown-resolving") return;
    clearHumanTimer();
    clearPendingTimeout();
    state.pendingShowdownReason = reason;
    state.aiReaction = reaction || randomItem(getAiPersonality().reveal);
    state.phase = "showdown-resolving";
    state.selectedOperation = null;
    state.selectedNumber = null;
    render();
    pendingTimeout = window.setTimeout(finishAutomaticShowdown, SHOWDOWN_REVEAL_MS);
  }

  function renderResultHistory() {
    const personality = getAiPersonality();
    els.resultEquation.innerHTML = "";
    state.history.forEach((item) => {
      const line = document.createElement("span");
      line.className = "oot-result-step";
      if (item.type === "opening") {
        line.innerHTML = `<b>${personality.name}가 낸 숫자카드:</b> ${item.number}`;
      } else {
        const owner = item.player === "ai" ? `${personality.name} 차례` : "내 차례";
        const timeoutLabel = item.timedOut ? " · 시간 종료 자동 제출" : "";
        line.innerHTML = `<b>${owner}:</b> ${item.before} ${item.operation} ${item.number} = ${item.after}<small>${timeoutLabel}</small>`;
      }
      els.resultEquation.appendChild(line);
    });
    els.resultFinalValue.textContent = `최종 결과값: ${state.currentValue}`;
  }

  function finishAutomaticShowdown() {
    if (state.phase !== "showdown-resolving" || state.gameOver) return;
    const personality = getAiPersonality();
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
    let reaction = personality.result.draw;
    if (humanDistance < aiDistance) {
      title = "당신이 이겼어요";
      symbol = "🏆";
      description = `${state.pendingShowdownReason} 남은 카드를 펼쳐 보니 내 카드가 최종 결과값 ${state.currentValue}에 더 가까웠어요.`;
      reaction = personality.result.humanWin;
    } else if (humanDistance > aiDistance) {
      title = `${personality.name}가 이겼어요`;
      symbol = "🐿️";
      description = `${state.pendingShowdownReason} 남은 카드를 펼쳐 보니 ${personality.name}의 카드가 최종 결과값 ${state.currentValue}에 더 가까웠어요.`;
      reaction = personality.result.aiWin;
    }

    els.resultSymbol.textContent = symbol;
    els.resultTitle.textContent = title;
    els.resultDesc.textContent = description;
    els.resultPersonality.textContent = `${personality.icon} 오늘의 상대 · ${personality.name} · ${personality.badge}`;
    els.resultPersonality.dataset.personality = state.aiPersonality;
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
    prepareNewGame();
  }

  function applyViewportMode() {
    const compact = window.innerWidth <= 600 && window.innerHeight <= 900;
    document.body.classList.toggle("oot-compact", compact);
    if (state) renderHistory();
  }

  function startAfterIntro() {
    if (pregameCountdownInterval || !state || state.gameOver) return;
    els.introStartButton.disabled = true;
    els.introDifficultyButtons.forEach((button) => { button.disabled = true; });
    els.introKicker.textContent = "MATCH START";
    els.introCountdown.classList.remove("is-hidden");
    els.introNote.textContent = `${getAiPersonality().name}가 카드를 준비하고 있어요.`;

    const countdownStartedAt = Date.now();
    const countdownMs = 3000;
    const updateCountdown = () => {
      const remaining = Math.max(0, countdownMs - (Date.now() - countdownStartedAt));
      const count = Math.max(1, Math.ceil(remaining / 1000));
      els.introCountdown.textContent = remaining > 0 ? String(count) : "시작!";
      if (remaining > 0) return;

      clearPregameCountdown();
      if (!state.humanHand.length && !state.aiHand.length) {
        state.humanHand.push(drawCard(), drawCard());
        state.aiHand.push(drawCard(), drawCard());
      }
      els.introOverlay.classList.add("is-hidden");
      els.introDifficultyButtons.forEach((button) => { button.disabled = false; });
      render();
      showPersonalityIntro();
      if (state.phase === "ai-opening" && !pendingTimeout) {
        pendingTimeout = window.setTimeout(runAiOpeningTurn, 250);
      }
    };

    updateCountdown();
    pregameCountdownInterval = window.setInterval(updateCountdown, 100);
  }

  function setDifficulty(difficulty) {
    if (!["easy", "normal", "hard"].includes(difficulty)) return;
    selectedDifficulty = difficulty;
    prepareNewGame();
  }

  function setIntroDifficulty(difficulty) {
    if (!["easy", "normal", "hard"].includes(difficulty) || pregameCountdownInterval) return;
    selectedDifficulty = difficulty;
    state.difficulty = difficulty;
    renderDifficulty();
    renderPreparation();
  }


  function enterComputerMode() {
    els.modeGate.classList.add("is-hidden");
    els.computerGameArea.classList.remove("is-hidden");
    els.modeBadge.textContent = "다람쥐 대전";
    resetGame({ deferOpening: true });
    openPreparation();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openRules() { els.rulesModal.classList.remove("is-hidden"); }
  function closeRules() { els.rulesModal.classList.add("is-hidden"); }

  els.computerModeButton.addEventListener("click", enterComputerMode);
  els.difficultyButtons.forEach((button) => button.addEventListener("click", () => setDifficulty(button.dataset.difficulty)));
  els.introDifficultyButtons.forEach((button) => {
    button.addEventListener("click", () => setIntroDifficulty(button.dataset.introDifficulty));
  });
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
  els.newGameButton.addEventListener("click", prepareNewGame);
  els.newGameButtonInline.addEventListener("click", prepareNewGame);
  els.rulesButton.addEventListener("click", openRules);
  els.closeRulesButton.addEventListener("click", closeRules);
  els.rulesConfirmButton.addEventListener("click", closeRules);
  els.rulesModal.addEventListener("click", (event) => { if (event.target === els.rulesModal) closeRules(); });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && isHumanTimedPhase()) updateHumanTimer();
  });
  window.addEventListener("resize", applyViewportMode);

  applyViewportMode();
  resetGame({ deferOpening: true });
  els.modeGate.classList.remove("is-hidden");
  els.computerGameArea.classList.add("is-hidden");
  els.modeBadge.textContent = "대전 선택";
})();
