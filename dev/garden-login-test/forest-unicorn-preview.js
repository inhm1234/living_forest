/* -------------------------------------------------------------------------
   FOREST UNICORN PREVIEW v2
   ?forestFriendPreview=1 를 붙였을 때만 실행됩니다.
   목적: 둥둥 떠다니는 느낌을 줄이고, 프레임 기반 걷기/idle/출발/귀환 검수.
   DB/편지 데이터에는 어떤 쓰기 작업도 하지 않습니다.
   ------------------------------------------------------------------------- */
const previewParams = new URLSearchParams(window.location.search);
const forestFriendPreviewEnabled = previewParams.get("forestFriendPreview") === "1";

if (forestFriendPreviewEnabled) {
  const CONFIG = {
    assetBase: "../../assets/friends/forest-unicorn",
    zones: [
      { id: "forest-path", x: 313, y: 420, label: "오른쪽 숲길" },
      { id: "tree-rest", x: 246, y: 404, label: "나무 곁 쉼터" },
      { id: "flower-watch", x: 124, y: 428, label: "왼쪽 꽃 구경" },
      { id: "front-walk", x: 202, y: 458, label: "앞쪽 산책길" },
    ],
    roamRoute: [1, 2, 3, 1, 0, 1],
    idleFrames: ["idle_base", "idle_tall", "idle_base", "idle_down"],
    walkFrames: ["walk_1", "walk_2", "walk_3", "walk_4"],
    testReturnMs: 8000,
    walkFrameMs: 170,
  };

  let unicorn = null;
  let statusNode = null;
  let imgNode = null;
  let currentZone = 0;
  let currentRouteIndex = 0;
  let roamTimer = null;
  let stateTimer = null;
  let walkTimer = null;
  let idleTimer = null;
  let interactionTimer = null;
  let returnTimer = null;
  let moveToken = 0;
  let isTravelling = false;
  let currentFacing = "left";

  function getWorld() { return document.getElementById("gardenWorld"); }
  function getStage() { return document.getElementById("gardenStage"); }
  function asset(name) { return `${CONFIG.assetBase}/forest-unicorn-${name}.png`; }

  function createScene() {
    const world = getWorld();
    const stage = getStage();
    if (!world || !stage || unicorn) return;

    document.body.classList.add("forest-unicorn-preview-enabled");

    unicorn = document.createElement("div");
    unicorn.className = "forest-unicorn-preview";
    unicorn.setAttribute("role", "button");
    unicorn.tabIndex = 0;
    unicorn.setAttribute("aria-label", "숲 유니콘에게 말 걸기");
    unicorn.innerHTML = `
      <span class="forest-unicorn-shadow" aria-hidden="true"></span>
      <span class="forest-unicorn-visual" aria-hidden="true">
        <span class="forest-unicorn-image-wrap"><img class="forest-unicorn-image" src="${asset("idle_base")}" alt="" /></span>
      </span>
      <span class="forest-unicorn-bubble" aria-live="polite"><p></p><button type="button">숲길로 떠나 보기</button></span>
    `;
    world.appendChild(unicorn);
    imgNode = unicorn.querySelector(".forest-unicorn-image");

    unicorn.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      if (!isTravelling) openInteraction();
    });
    unicorn.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !isTravelling) {
        event.preventDefault();
        openInteraction();
      }
    });
    unicorn.querySelector(".forest-unicorn-bubble button").addEventListener("click", (event) => {
      event.stopPropagation();
      beginTestDeparture();
    });

    const arrival = document.createElement("div");
    arrival.className = "forest-unicorn-arrival";
    arrival.setAttribute("aria-live", "polite");
    arrival.innerHTML = `
      <div class="forest-unicorn-arrival-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="forest-unicorn-arrival-copy">
        <p class="forest-unicorn-arrival-kicker">A NEW FOREST FRIEND</p>
        <p>숲 유니콘이 조용히 찾아왔어요.</p>
      </div>
    `;
    stage.appendChild(arrival);

    const panel = document.createElement("section");
    panel.className = "forest-unicorn-preview-panel";
    panel.setAttribute("aria-label", "숲 유니콘 생활 테스트 제어");
    panel.innerHTML = `
      <div class="forest-unicorn-preview-panel-head">
        <div><p class="kicker">FOREST FRIEND PREVIEW v2</p><strong>숲 유니콘 걷기 테스트</strong></div>
      </div>
      <div class="forest-unicorn-preview-actions">
        <button type="button" data-unicorn-replay>첫 만남 다시 보기</button>
        <button type="button" data-unicorn-depart>숲길로 떠나 보기</button>
      </div>
      <p class="forest-unicorn-preview-status">걷기 프레임 · idle · 꽃 구경 · 출발/귀환을 정원에서 검수하는 화면이에요.</p>
    `;
    stage.insertAdjacentElement("afterend", panel);
    statusNode = panel.querySelector(".forest-unicorn-preview-status");
    panel.querySelector("[data-unicorn-replay]").addEventListener("click", playFirstArrival);
    panel.querySelector("[data-unicorn-depart]").addEventListener("click", beginTestDeparture);

    setAbsolutePosition(0, { visible: false });
    window.setTimeout(playFirstArrival, 700);
  }

  function setStatus(text) { if (statusNode) statusNode.textContent = text; }
  function getArrivalLayer() { return getStage()?.querySelector(".forest-unicorn-arrival"); }
  function setSprite(name) { if (imgNode) imgNode.src = asset(name); }

  function setFacing(direction) {
    currentFacing = direction === "right" ? "right" : "left";
    unicorn?.setAttribute("data-facing", currentFacing);
  }

  function setAbsolutePosition(index, { visible = true } = {}) {
    currentZone = index;
    const zone = CONFIG.zones[index];
    if (!unicorn) return;
    unicorn.style.left = `${zone.x}px`;
    unicorn.style.top = `${zone.y}px`;
    if (visible) unicorn.classList.add("is-visible");
  }

  function clearAllTimers() {
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    clearTimeout(interactionTimer);
    clearTimeout(returnTimer);
    clearInterval(walkTimer);
    clearInterval(idleTimer);
  }

  function stopCharacterMotion() {
    clearInterval(walkTimer);
    clearInterval(idleTimer);
    unicorn?.classList.remove("is-moving");
  }

  function playIdleLoop() {
    stopCharacterMotion();
    let step = 0;
    const loop = () => setSprite(CONFIG.idleFrames[step % CONFIG.idleFrames.length]);
    loop();
    idleTimer = window.setInterval(() => {
      step += 1;
      loop();
    }, 850);
  }

  function showLookPose(duration = 3200, next) {
    stopCharacterMotion();
    setSprite("look");
    stateTimer = window.setTimeout(() => next && next(), duration);
  }

  function startWalkCycle() {
    stopCharacterMotion();
    unicorn?.classList.add("is-moving");
    let step = 0;
    setSprite(CONFIG.walkFrames[0]);
    walkTimer = window.setInterval(() => {
      step = (step + 1) % CONFIG.walkFrames.length;
      setSprite(CONFIG.walkFrames[step]);
    }, CONFIG.walkFrameMs);
  }

  function moveTo(index, { duration = 2200, afterMove } = {}) {
    if (!unicorn) return;
    moveToken += 1;
    const token = moveToken;
    const from = CONFIG.zones[currentZone];
    const to = CONFIG.zones[index];
    setFacing(to.x > from.x ? "right" : "left");
    startWalkCycle();
    unicorn.style.transition = `left ${duration}ms cubic-bezier(.22,.72,.27,1), top ${duration}ms cubic-bezier(.22,.72,.27,1), opacity .45s ease`;
    unicorn.style.left = `${to.x}px`;
    unicorn.style.top = `${to.y}px`;
    window.setTimeout(() => {
      if (!unicorn || token !== moveToken) return;
      currentZone = index;
      unicorn.classList.remove("is-moving");
      clearInterval(walkTimer);
      walkTimer = null;
      if (afterMove) afterMove();
    }, duration + 40);
  }

  function closeBubble() {
    unicorn?.querySelector(".forest-unicorn-bubble")?.classList.remove("is-open");
  }

  function openInteraction() {
    if (!unicorn) return;
    clearTimeout(interactionTimer);
    const bubble = unicorn.querySelector(".forest-unicorn-bubble");
    const copy = bubble?.querySelector("p");
    if (copy) copy.textContent = "편지를 안고 숲길로 떠나 볼까요?";
    bubble?.classList.add("is-open");
    interactionTimer = window.setTimeout(() => closeBubble(), 5200);
  }

  function continueRoaming() {
    if (isTravelling) return;
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    currentRouteIndex = (currentRouteIndex + 1) % CONFIG.roamRoute.length;
    const nextZone = CONFIG.roamRoute[currentRouteIndex];
    moveTo(nextZone, {
      duration: nextZone === 0 ? 2550 : 2200,
      afterMove: () => {
        if (isTravelling) return;
        const zone = CONFIG.zones[nextZone];
        if (zone.id === "flower-watch") {
          setStatus("유니콘이 꽃밭 앞에 멈춰서 조용히 구경하고 있어요.");
          showLookPose(3800, scheduleRoaming);
        } else if (zone.id === "forest-path") {
          setStatus("유니콘이 오른쪽 숲길까지 산책했어요.");
          playIdleLoop();
          roamTimer = window.setTimeout(continueRoaming, 2600);
        } else if (zone.id === "front-walk") {
          setStatus("유니콘이 앞쪽 산책길에서 잠깐 쉬고 있어요.");
          playIdleLoop();
          roamTimer = window.setTimeout(continueRoaming, 3400);
        } else {
          setStatus("유니콘이 나무 곁에서 편안히 쉬고 있어요.");
          playIdleLoop();
          roamTimer = window.setTimeout(continueRoaming, 4200);
        }
      }
    });
  }

  function scheduleRoaming() {
    if (isTravelling) return;
    roamTimer = window.setTimeout(continueRoaming, 900);
  }

  function playFirstArrival() {
    if (!unicorn) return;
    clearAllTimers();
    isTravelling = false;
    closeBubble();
    setFacing("left");
    unicorn.classList.remove("is-visible", "is-departed");
    setAbsolutePosition(0, { visible: false });
    setSprite("return");
    const arrival = getArrivalLayer();
    arrival?.classList.add("is-open");
    setStatus("숲의 빛이 오른쪽 숲길에 모이고 있어요.");
    window.setTimeout(() => {
      unicorn?.classList.add("is-visible");
      setStatus("숲 유니콘이 숲길에서 조용히 나타났어요.");
    }, 950);
    window.setTimeout(() => {
      arrival?.classList.remove("is-open");
      moveTo(1, {
        duration: 2200,
        afterMove: () => {
          setStatus("숲 유니콘이 나무 곁에 자리를 잡았어요. 이제 정원을 천천히 둘러봐요.");
          playIdleLoop();
          currentRouteIndex = 0;
          scheduleRoaming();
        }
      });
    }, 1800);
  }

  function departFromPath() {
    if (!unicorn) return;
    isTravelling = true;
    closeBubble();
    stopCharacterMotion();
    setFacing("right");
    setSprite("send");
    setStatus("유니콘이 편지를 안고 숲길로 떠나요. 체험에서는 8초 뒤 돌아와요.");
    stateTimer = window.setTimeout(() => {
      unicorn.classList.add("is-departed");
    }, 850);

    returnTimer = window.setTimeout(() => {
      if (!unicorn) return;
      setAbsolutePosition(0, { visible: false });
      setFacing("left");
      unicorn.classList.remove("is-departed");
      setSprite("return");
      unicorn.classList.add("is-visible");
      setStatus("오른쪽 숲길에서 작은 빛과 함께 유니콘이 돌아왔어요.");
      stateTimer = window.setTimeout(() => {
        moveTo(1, {
          duration: 2200,
          afterMove: () => {
            isTravelling = false;
            setStatus("유니콘이 다시 정원을 천천히 둘러봐요.");
            playIdleLoop();
            currentRouteIndex = 0;
            scheduleRoaming();
          }
        });
      }, 850);
    }, CONFIG.testReturnMs);
  }

  function beginTestDeparture() {
    if (!unicorn || isTravelling) return;
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    clearTimeout(interactionTimer);
    stopCharacterMotion();
    closeBubble();

    if (currentZone !== 0) {
      setStatus("유니콘이 먼저 오른쪽 숲길로 걸어가고 있어요.");
      moveTo(0, {
        duration: 2400,
        afterMove: departFromPath,
      });
      return;
    }
    departFromPath();
  }

  function initWhenReady() {
    if (getWorld() && getStage()) {
      createScene();
      return;
    }
    window.setTimeout(initWhenReady, 250);
  }

  function bootPreview() { initWhenReady(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(bootPreview, 300), { once: true });
  } else {
    window.setTimeout(bootPreview, 120);
  }
  window.addEventListener("load", () => window.setTimeout(bootPreview, 700), { once: true });
  window.setTimeout(bootPreview, 1500);
}
