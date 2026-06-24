(() => {
  "use strict";

  const STORAGE_KEY = "todayforest_forest_walk_example_v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    introCard: $("#introCard"),
    walkShell: $("#walkShell"),
    startWalk: $("#startWalk"),
    sceneHome: $("#sceneHome"),
    activeScene: $("#activeScene"),
    sceneKicker: $("#sceneKicker"),
    sceneHeading: $("#sceneHeading"),
    sceneInstruction: $("#sceneInstruction"),
    scenePlayground: $("#scenePlayground"),
    leaveScene: $("#leaveScene"),
    sceneResult: $("#sceneResult"),
    resultIcon: $("#resultIcon"),
    resultTitle: $("#resultTitle"),
    resultCopy: $("#resultCopy"),
    backToWalk: $("#backToWalk"),
    openJournal: $("#openJournal"),
    closeJournal: $("#closeJournal"),
    closeJournalDim: $("#closeJournalDim"),
    journalSheet: $("#journalSheet"),
    journalList: $("#journalList"),
    journalCount: $("#journalCount"),
    resetExample: $("#resetExample"),
  };

  const scenes = {
    feather: {
      icon: "🪶",
      kicker: "바람이 가볍게 부는 날",
      heading: "깃털이 가지를 찾고 있어요",
      instruction: "바람을 타고 움직이는 깃털을 한 번 눌러 잡아주세요.",
      resultTitle: "작은 깃털을 가지에 걸어주었어요.",
      resultCopy: "잠시 뒤 작은 새가 같은 가지에 앉았다가 날아갔어요.",
      journal: "바람을 타던 깃털을 가지에 걸어주었어요.",
    },
    leaves: {
      icon: "🦔",
      kicker: "낙엽이 바스락거리는 날",
      heading: "낙엽 더미가 살짝 움직여요",
      instruction: "낙엽 더미 위를 살며시 쓸어보세요. 너무 급하게 하지 않아도 돼요.",
      resultTitle: "낙엽 속 고슴도치가 인사했어요.",
      resultCopy: "고슴도치는 잠깐 고개를 내밀었다가 다시 따뜻한 낙엽 속으로 들어갔어요.",
      journal: "낙엽 더미에서 잠시 쉬던 고슴도치를 만났어요.",
    },
    fireflies: {
      icon: "✨",
      kicker: "해가 조금 기울 무렵",
      heading: "반딧불이 길을 잃었어요",
      instruction: "작은 빛 세 개를 드래그해서 반딧불 병 곁으로 데려가주세요.",
      resultTitle: "작은 빛들이 병 안에서 잠시 쉬어가요.",
      resultCopy: "병은 오늘 밤에만 은은하게 반짝일 거예요.",
      journal: "흩어진 반딧불을 병 곁으로 데려다주었어요.",
    },
  };

  let activeSceneKey = null;
  let dragState = null;
  let leafProgress = 0;

  function readHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-12)));
    renderJournalCount();
  }

  function renderJournalCount() {
    els.journalCount.textContent = String(readHistory().length);
  }

  function showWalk() {
    els.introCard.classList.add("hidden");
    els.walkShell.classList.remove("hidden");
    showSceneHome();
  }

  function hideAllSceneLayers() {
    els.sceneHome.classList.add("hidden");
    els.activeScene.classList.add("hidden");
    els.sceneResult.classList.add("hidden");
    els.scenePlayground.innerHTML = "";
    activeSceneKey = null;
    dragState = null;
  }

  function showSceneHome() {
    hideAllSceneLayers();
    els.sceneHome.classList.remove("hidden");
  }

  function openScene(key) {
    const scene = scenes[key];
    if (!scene) return;
    hideAllSceneLayers();
    activeSceneKey = key;
    els.activeScene.classList.remove("hidden");
    els.sceneKicker.textContent = scene.kicker;
    els.sceneHeading.textContent = scene.heading;
    els.sceneInstruction.textContent = scene.instruction;

    if (key === "feather") buildFeatherScene();
    if (key === "leaves") buildLeavesScene();
    if (key === "fireflies") buildFirefliesScene();
  }

  function completeScene() {
    const scene = scenes[activeSceneKey];
    if (!scene) return;

    const history = readHistory();
    const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
    history.push({
      id: `${Date.now()}-${activeSceneKey}`,
      key: activeSceneKey,
      date: today,
      title: scene.resultTitle,
      text: scene.journal,
    });
    saveHistory(history);

    els.activeScene.classList.add("hidden");
    els.sceneResult.classList.remove("hidden");
    els.resultIcon.textContent = scene.icon;
    els.resultTitle.textContent = scene.resultTitle;
    els.resultCopy.textContent = scene.resultCopy;
  }

  function buildFeatherScene() {
    const feather = document.createElement("button");
    feather.className = "feather-target";
    feather.type = "button";
    feather.setAttribute("aria-label", "바람에 날리는 깃털 잡기");
    feather.addEventListener("click", () => {
      feather.classList.add("caught");
      const mark = document.createElement("div");
      mark.className = "branch-mark";
      mark.textContent = "🪶";
      els.scenePlayground.append(mark);
      window.setTimeout(completeScene, 520);
    }, { once: true });
    els.scenePlayground.append(feather);
  }

  function buildLeavesScene() {
    leafProgress = 0;
    const hedgehog = document.createElement("div");
    hedgehog.className = "hedgehog";
    hedgehog.textContent = "🦔";
    const pile = document.createElement("div");
    pile.className = "leaf-pile";
    pile.setAttribute("aria-label", "낙엽 더미를 쓸어보기");
    pile.setAttribute("role", "button");
    const meter = document.createElement("div");
    meter.className = "rustle-meter";
    meter.innerHTML = "<i></i>";

    const start = (event) => {
      event.preventDefault();
      pile.classList.add("is-rustling");
      dragState = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      pile.setPointerCapture?.(event.pointerId);
    };
    const move = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const dx = Math.abs(event.clientX - dragState.x);
      const dy = Math.abs(event.clientY - dragState.y);
      const distance = Math.min(34, Math.hypot(dx, dy));
      if (distance > 3) {
        leafProgress = Math.min(100, leafProgress + distance * 0.75);
        meter.firstElementChild.style.width = `${leafProgress}%`;
        dragState.x = event.clientX;
        dragState.y = event.clientY;
      }
      if (leafProgress >= 100) {
        finishLeaves(pile, hedgehog, meter);
      }
    };
    const end = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      pile.classList.remove("is-rustling");
      try { pile.releasePointerCapture?.(event.pointerId); } catch {}
      dragState = null;
    };

    pile.addEventListener("pointerdown", start);
    pile.addEventListener("pointermove", move);
    pile.addEventListener("pointerup", end);
    pile.addEventListener("pointercancel", end);

    els.scenePlayground.append(hedgehog, pile, meter);
  }

  function finishLeaves(pile, hedgehog, meter) {
    if (pile.classList.contains("is-open")) return;
    pile.classList.remove("is-rustling");
    pile.classList.add("is-open");
    hedgehog.classList.add("is-visible");
    meter.style.opacity = "0";
    window.setTimeout(completeScene, 900);
  }

  function buildFirefliesScene() {
    const jar = document.createElement("div");
    jar.className = "jar";
    jar.setAttribute("aria-label", "반딧불이 쉬어갈 병");
    els.scenePlayground.append(jar);

    ["one", "two", "three"].forEach((className, index) => {
      const firefly = document.createElement("div");
      firefly.className = `firefly ${className}`;
      firefly.dataset.firefly = String(index);
      firefly.setAttribute("role", "button");
      firefly.setAttribute("aria-label", `${index + 1}번째 반딧불 옮기기`);
      firefly.addEventListener("pointerdown", (event) => beginFireflyDrag(event, firefly, jar));
      els.scenePlayground.append(firefly);
    });
  }

  function beginFireflyDrag(event, firefly, jar) {
    event.preventDefault();
    const rect = firefly.getBoundingClientRect();
    dragState = {
      type: "firefly",
      pointerId: event.pointerId,
      element: firefly,
      jar,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    firefly.style.animation = "none";
    firefly.style.zIndex = "9";
    firefly.setPointerCapture?.(event.pointerId);
  }

  function moveFirefly(event) {
    if (!dragState || dragState.type !== "firefly" || dragState.pointerId !== event.pointerId) return;
    const stage = els.scenePlayground.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - stage.left - dragState.offsetX, 0), stage.width - 37);
    const y = Math.min(Math.max(event.clientY - stage.top - dragState.offsetY, 0), stage.height - 37);
    dragState.element.style.left = `${x}px`;
    dragState.element.style.top = `${y}px`;
    dragState.element.style.transform = "none";
  }

  function endFirefly(event) {
    if (!dragState || dragState.type !== "firefly" || dragState.pointerId !== event.pointerId) return;
    const { element, jar } = dragState;
    try { element.releasePointerCapture?.(event.pointerId); } catch {}
    const elementRect = element.getBoundingClientRect();
    const jarRect = jar.getBoundingClientRect();
    const centerX = elementRect.left + elementRect.width / 2;
    const centerY = elementRect.top + elementRect.height / 2;
    const insideJar = centerX > jarRect.left && centerX < jarRect.right && centerY > jarRect.top && centerY < jarRect.bottom;

    if (insideJar) {
      element.classList.add("is-home");
      const moved = $$(".firefly.is-home", els.scenePlayground).length;
      if (moved === 3) window.setTimeout(completeScene, 350);
    } else {
      element.style.left = "";
      element.style.top = "";
      element.style.transform = "";
      element.style.animation = "";
      element.style.zIndex = "";
    }
    dragState = null;
  }

  function openJournal() {
    renderJournal();
    els.journalSheet.classList.remove("hidden");
  }

  function closeJournal() {
    els.journalSheet.classList.add("hidden");
  }

  function renderJournal() {
    const history = readHistory().slice().reverse();
    if (!history.length) {
      els.journalList.innerHTML = '<div class="journal-empty">아직 숲에 남은 장면이 없어요.<br />작은 장면 하나를 직접 해보세요.</div>';
      return;
    }
    els.journalList.innerHTML = history.map((entry) => {
      const scene = scenes[entry.key] || scenes.feather;
      return `<article class="journal-entry"><span class="entry-icon" aria-hidden="true">${scene.icon}</span><div><b>${entry.date} · ${entry.title}</b><p>${entry.text}</p></div></article>`;
    }).join("");
  }

  els.startWalk.addEventListener("click", showWalk);
  $$(".scene-choice").forEach((button) => button.addEventListener("click", () => openScene(button.dataset.scene)));
  els.leaveScene.addEventListener("click", showSceneHome);
  els.backToWalk.addEventListener("click", showSceneHome);
  els.openJournal.addEventListener("click", openJournal);
  els.closeJournal.addEventListener("click", closeJournal);
  els.closeJournalDim.addEventListener("click", closeJournal);
  els.resetExample.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderJournal();
    renderJournalCount();
  });
  document.addEventListener("pointermove", (event) => {
    if (dragState?.type === "firefly") moveFirefly(event);
  });
  document.addEventListener("pointerup", (event) => {
    if (dragState?.type === "firefly") endFirefly(event);
  });
  document.addEventListener("pointercancel", (event) => {
    if (dragState?.type === "firefly") endFirefly(event);
  });

  renderJournalCount();
})();
