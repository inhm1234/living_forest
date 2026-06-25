(() => {
  "use strict";

  const baseBoard = [
    "seed", "moss", "sparkle", "seed",
    "moss", "sparkle", "seed", "moss",
    "sparkle", "seed", "moss", "sparkle",
    null, null, null, null
  ];

  const itemMeta = {
    seed: { label: "씨앗", emoji: "🌱", next: "sprout" },
    sprout: { label: "새싹", emoji: "🌿", next: "flowerCluster" },
    flowerCluster: { label: "꽃무리", emoji: "🌷", target: "flowerCluster" },
    moss: { label: "이끼 조각", emoji: "🍃", next: "softMoss" },
    softMoss: { label: "폭신한 이끼", emoji: "🫧", next: "mossyRock" },
    mossyRock: { label: "이끼 돌", emoji: "🪨", target: "mossyRock" },
    sparkle: { label: "반짝 조각", emoji: "✨", next: "smallGlow" },
    smallGlow: { label: "작은 빛", emoji: "💫", next: "fireflyJar" },
    fireflyJar: { label: "빛병", emoji: "🏮", target: "fireflyJar" }
  };

  const targets = ["mossyRock", "flowerCluster", "fireflyJar"];
  const targetText = {
    mossyRock: { need: "needMoss", action: "actionMoss", scene: "sceneRock" },
    flowerCluster: { need: "needFlower", action: "actionFlower", scene: "sceneFlowers" },
    fireflyJar: { need: "needJar", action: "actionJar", scene: "sceneJar" }
  };

  const els = {
    workbench: document.querySelector("#workbench"),
    instruction: document.querySelector("#instruction"),
    movePill: document.querySelector("#movePill"),
    craftedItems: document.querySelector("#craftedItems"),
    craftedSummary: document.querySelector("#craftedSummary"),
    progress: document.querySelector("#projectProgress"),
    badge: document.querySelector("#projectBadge"),
    caption: document.querySelector("#sceneCaption"),
    hedgehog: document.querySelector("#sceneHedgehog"),
    completionCard: document.querySelector("#completionCard"),
    restart: document.querySelector("#restartButton"),
    helpButton: document.querySelector("#helpButton"),
    helpPanel: document.querySelector("#helpPanel")
  };

  let board;
  let selectedIndex;
  let moves;
  let completedItems;
  let placed;

  function reset() {
    board = [...baseBoard];
    selectedIndex = null;
    moves = 0;
    completedItems = [];
    placed = new Set();
    els.completionCard.hidden = true;
    els.hedgehog.hidden = true;
    document.querySelectorAll(".scene-rock, .scene-flowers, .scene-jar").forEach((node) => { node.hidden = true; });
    render();
  }

  function render() {
    renderBoard();
    renderCrafted();
    renderProject();
  }

  function renderBoard() {
    els.workbench.innerHTML = "";
    board.forEach((key, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "merge-tile";
      button.dataset.index = String(index);

      if (!key) {
        button.classList.add("empty");
        button.disabled = true;
        button.setAttribute("aria-label", "비어 있는 작업칸");
      } else {
        const meta = itemMeta[key];
        button.classList.add(`kind-${key}`);
        if (selectedIndex === index) button.classList.add("selected");
        button.setAttribute("aria-label", `${meta.label}${selectedIndex === index ? ", 선택됨" : ""}`);
        button.innerHTML = `<span class="tile-emoji" aria-hidden="true">${meta.emoji}</span><span class="tile-label">${meta.label}</span>`;
        button.addEventListener("click", () => handleTile(index));
      }
      els.workbench.append(button);
    });

    els.movePill.textContent = `합치기 ${moves}회`;
  }

  function handleTile(index) {
    const currentKey = board[index];
    if (!currentKey) return;

    if (selectedIndex === null) {
      selectedIndex = index;
      els.instruction.textContent = `${itemMeta[currentKey].label}을 골랐어요. 같은 것을 하나 더 눌러보세요.`;
      renderBoard();
      return;
    }

    if (selectedIndex === index) {
      selectedIndex = null;
      els.instruction.textContent = "선택을 취소했어요. 같은 재료 두 개를 차례로 눌러 합쳐보세요.";
      renderBoard();
      return;
    }

    const selectedKey = board[selectedIndex];
    if (selectedKey !== currentKey) {
      selectedIndex = index;
      els.instruction.textContent = `이건 ${itemMeta[currentKey].label}이에요. 같은 재료끼리만 합쳐져요.`;
      renderBoard();
      return;
    }

    const next = itemMeta[currentKey].next;
    if (!next) {
      selectedIndex = null;
      els.instruction.textContent = `${itemMeta[currentKey].label}은 이미 완성된 물건이에요. 아래 쉼터에 놓아보세요.`;
      renderBoard();
      return;
    }

    board[selectedIndex] = next;
    board[index] = null;
    selectedIndex = null;
    moves += 1;

    const nextMeta = itemMeta[next];
    if (nextMeta.target && !completedItems.includes(next)) {
      completedItems.push(next);
      els.instruction.textContent = `${nextMeta.emoji} ${nextMeta.label}을 만들었어요! 아래 쉼터에 놓아보세요.`;
    } else {
      els.instruction.textContent = `${nextMeta.emoji} ${nextMeta.label}이 되었어요. 같은 것을 한 번 더 합치면 다음 단계가 열려요.`;
    }

    render();
  }

  function renderCrafted() {
    if (!completedItems.length) {
      els.craftedSummary.textContent = "아직 만든 물건이 없어요.";
      els.craftedItems.innerHTML = "";
      return;
    }

    const unplaced = completedItems.filter((key) => !placed.has(key));
    els.craftedSummary.textContent = unplaced.length
      ? `완성한 물건 ${unplaced.length}개를 쉼터에 놓을 수 있어요.`
      : "오늘 만든 물건을 모두 쉼터에 놓았어요.";
    els.craftedItems.innerHTML = completedItems.map((key) => `<span class="crafted-chip" title="${itemMeta[key].label}">${itemMeta[key].emoji}</span>`).join("");
  }

  function renderProject() {
    const count = placed.size;
    els.progress.textContent = count === 0 ? "아직 비어 있어요 · 0 / 3" : `쉼터가 조금씩 완성되고 있어요 · ${count} / 3`;
    els.badge.textContent = count === 3 ? "완성" : count === 0 ? "만드는 중" : "조금씩 자라는 중";

    targets.forEach((target) => {
      const button = document.querySelector(`[data-project-target="${target}"]`);
      const ui = targetText[target];
      const canPlace = completedItems.includes(target) && !placed.has(target);
      const isPlaced = placed.has(target);
      button.disabled = !canPlace;
      button.classList.toggle("placed", isPlaced);
      document.querySelector(`#${ui.need}`).textContent = isPlaced
        ? "쉼터에 놓았어요"
        : canPlace
          ? "지금 놓을 수 있어요"
          : "아직 만들지 못했어요";
      document.querySelector(`#${ui.action}`).textContent = isPlaced ? "놓았어요" : canPlace ? "놓기" : "필요해요";
      document.querySelector(`#${ui.scene}`).hidden = !isPlaced;
    });

    if (count === 0) els.caption.textContent = "낙엽 아래, 아직 아무도 쉬어가지 않은 작은 자리예요.";
    if (count === 1) els.caption.textContent = "첫 물건이 놓였어요. 숲의 작은 자리가 조금 달라졌어요.";
    if (count === 2) els.caption.textContent = "이제 거의 완성이에요. 한 가지를 더 놓으면 고슴도치가 쉬어갈 거예요.";
    if (count === 3) {
      els.caption.textContent = "고슴도치가 좋아할 만한, 따뜻한 작은 쉼터가 되었어요.";
      els.hedgehog.hidden = false;
      els.completionCard.hidden = false;
      els.instruction.textContent = "쉼터가 완성됐어요. 내 정원에 남는 작은 풍경이 되었어요.";
    }
  }

  document.querySelectorAll("[data-project-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.projectTarget;
      if (button.disabled || placed.has(target) || !completedItems.includes(target)) return;
      placed.add(target);
      const meta = itemMeta[target];
      els.instruction.textContent = `${meta.emoji} ${meta.label}을 쉼터에 놓았어요. ${placed.size < 3 ? "한 가지를 더 만들어볼까요?" : ""}`;
      render();
    });
  });

  els.restart.addEventListener("click", reset);
  els.helpButton.addEventListener("click", () => {
    const isHidden = els.helpPanel.hidden;
    els.helpPanel.hidden = !isHidden;
    els.helpButton.setAttribute("aria-expanded", String(isHidden));
  });

  reset();
})();
