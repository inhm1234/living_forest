/* -------------------------------------------------------------------------
   LITTLE LIGHT DRAGON PREVIEW v2
   ?forestFriendPreview=light-dragon 에서만 실행됩니다.
   목적: 프레임 기반 생활 루틴과 첫 만남 카드 검수.
   실제 배송 저장은 특별 친구 전용 RPC가 little_light_dragon 키를 허용하는지
   확인한 뒤 별도로 검수합니다. 이 파일은 기존 유니콘 흐름을 건드리지 않습니다.
   ------------------------------------------------------------------------- */
const previewParams = new URLSearchParams(window.location.search);
const littleLightDragonPreviewEnabled = previewParams.get("forestFriendPreview") === "light-dragon";

if (littleLightDragonPreviewEnabled) {
  const CONFIG = {
    assetBase: "../../assets/friends/little-light-dragon",
    zones: [
      { id: "forest-path", x: 313, y: 420, depth: "back", label: "오른쪽 숲길" },
      // 작은 빛 용은 나무 왼쪽의 꽃밭 가까운 빈 풀밭을 주로 쉬는 자리로 씁니다.
      { id: "tree-rest", x: 158, y: 430, depth: "middle", label: "왼쪽 나무 곁" },
      { id: "flower-watch", x: 100, y: 452, depth: "middle", label: "작은 꽃밭" },
      { id: "front-walk", x: 205, y: 470, depth: "front", label: "앞쪽 산책길" },
    ],
    // 평소 루틴: 나무 곁 → 꽃 구경 → 앞쪽 산책길 → 나무 곁.
    // 오른쪽 숲길은 실제 편지 출발/귀환 때에만 사용합니다.
    roamRoute: [1, 2, 3, 1],
    idleFrames: ["idle_base", "idle_tall", "idle_base", "idle_down"],
    // walk_1은 고개를 숙인 포즈라 걷기 루프에서 제외합니다.
    walkFrames: ["walk_2", "walk_3", "walk_4", "walk_3"],
    walkFrameMs: 170,
  };

  let lightDragon = null;
  let interactionHit = null;
  let statusNode = null;
  let imgNode = null;
  let deliveryCard = null;
  let composerWatchTimer = null;
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
  let isInteracting = false;
  let currentFacing = "left";

  function getWorld() { return document.getElementById("gardenWorld"); }
  function getStage() { return document.getElementById("gardenStage"); }
  function asset(name) { return `${CONFIG.assetBase}/little-light-dragon-${name}.png`; }

  function createScene() {
    const world = getWorld();
    const stage = getStage();
    if (!world || !stage || lightDragon) return;

    document.body.classList.add("little-light-dragon-preview-enabled");

    lightDragon = document.createElement("div");
    lightDragon.className = "little-light-dragon-preview";
    lightDragon.setAttribute("role", "button");
    lightDragon.tabIndex = 0;
    lightDragon.setAttribute("aria-label", "작은 빛 용에게 말 걸기");
    lightDragon.innerHTML = `
      <span class="little-light-dragon-shadow" aria-hidden="true"></span>
      <span class="little-light-dragon-visual" aria-hidden="true">
        <span class="little-light-dragon-image-wrap"><img class="little-light-dragon-image" src="${asset("idle_base")}" alt="" /></span>
      </span>
      <span class="little-light-dragon-letter" aria-hidden="true">✉</span>
    `;
    world.appendChild(lightDragon);
    imgNode = lightDragon.querySelector(".little-light-dragon-image");

    // 장식 레이어에 가려져 있어도 눌림이 사라지지 않도록,
    // 화면에는 보이지 않는 별도 클릭 영역을 작은 빛 용과 함께 이동시킵니다.
    interactionHit = document.createElement("button");
    interactionHit.type = "button";
    interactionHit.className = "little-light-dragon-hit";
    interactionHit.setAttribute("aria-label", "작은 빛 용에게 말 걸기");
    world.appendChild(interactionHit);

    const requestInteraction = (event) => {
      event?.preventDefault();
      event?.stopPropagation();
      if (!isTravelling) openInteraction();
    };
    interactionHit.addEventListener("pointerdown", requestInteraction);
    interactionHit.addEventListener("click", requestInteraction);
    lightDragon.addEventListener("click", requestInteraction);
    lightDragon.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !isTravelling) {
        requestInteraction(event);
      }
    });
    const arrival = document.createElement("div");
    arrival.className = "little-light-dragon-arrival";
    arrival.setAttribute("aria-live", "polite");
    arrival.innerHTML = `
      <div class="little-light-dragon-arrival-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="little-light-dragon-arrival-copy">
        <p class="little-light-dragon-arrival-kicker">A NEW FOREST FRIEND</p>
        <p>작은 빛을 안고, 당신의 숲에 왔어요.</p>
      </div>
    `;
    stage.appendChild(arrival);

    deliveryCard = document.createElement("aside");
    deliveryCard.className = "little-light-dragon-delivery-card";
    deliveryCard.setAttribute("aria-live", "polite");
    deliveryCard.innerHTML = `
      <span class="little-light-dragon-delivery-icon" aria-hidden="true">✉</span>
      <div>
        <p class="little-light-dragon-delivery-kicker">FOREST FRIEND DELIVERY · DEV</p>
        <strong></strong>
        <p class="little-light-dragon-delivery-note"></p>
      </div>
    `;
    stage.appendChild(deliveryCard);

    const panel = document.createElement("section");
    panel.className = "little-light-dragon-preview-panel";
    panel.setAttribute("aria-label", "작은 빛 용 생활 테스트 제어");
    panel.innerHTML = `
      <div class="little-light-dragon-preview-panel-head">
        <div><p class="kicker">FOREST FRIEND PREVIEW v1</p><strong>작은 빛 용 생활 테스트</strong></div>
      </div>
      <div class="little-light-dragon-preview-actions">
        <button type="button" data-lightDragon-replay>첫 만남 다시 보기</button>
      </div>
      <p class="little-light-dragon-preview-status">작은 빛 용을 눌러 첫 만남과 정원 생활을 확인해요. 실제 배송 연결은 SQL 허용 여부를 확인한 뒤 검수합니다.</p>
    `;
    stage.insertAdjacentElement("afterend", panel);
    statusNode = panel.querySelector(".little-light-dragon-preview-status");
    panel.querySelector("[data-lightDragon-replay]").addEventListener("click", playFirstArrival);

    setAbsolutePosition(0, { visible: false });
    installSpecialFriendDeliveryBridge();
    const activeJourney = findActiveJourney(window.__todayForestSpecialFriendJourneys);
    if (activeJourney) {
      restoreServerJourney(activeJourney);
    } else {
      window.setTimeout(playFirstArrival, 700);
    }
  }

  function setStatus(text) { if (statusNode) statusNode.textContent = text; }

  function setDeliveryCard(title = "", note = "", open = false) {
    if (!deliveryCard) return;
    const titleNode = deliveryCard.querySelector("strong");
    const noteNode = deliveryCard.querySelector(".little-light-dragon-delivery-note");
    if (titleNode) titleNode.textContent = title;
    if (noteNode) noteNode.textContent = note;
    deliveryCard.classList.toggle("is-open", Boolean(open));
  }

  function getArrivalLayer() { return getStage()?.querySelector(".little-light-dragon-arrival"); }
  function setSprite(name) { if (imgNode) imgNode.src = asset(name); }

  function setFacing(direction) {
    currentFacing = direction === "right" ? "right" : "left";
    lightDragon?.setAttribute("data-facing", currentFacing);
  }

  function setZoneDepth(index) {
    const zone = CONFIG.zones[index];
    if (!lightDragon || !zone) return;
    lightDragon.setAttribute("data-depth", zone.depth || "middle");
  }

  function setAbsolutePosition(index, { visible = true } = {}) {
    currentZone = index;
    const zone = CONFIG.zones[index];
    if (!lightDragon) return;
    setZoneDepth(index);
    lightDragon.style.left = `${zone.x}px`;
    lightDragon.style.top = `${zone.y}px`;
    syncInteractionHit(zone.x, zone.y);
    if (visible) lightDragon.classList.add("is-visible");
  }

  function clearAllTimers() {
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    clearTimeout(interactionTimer);
    clearTimeout(returnTimer);
    clearInterval(walkTimer);
    clearInterval(idleTimer);
  }

  function getNearestZoneIndex(left, top) {
    let nearestIndex = 0;
    let shortestDistance = Number.POSITIVE_INFINITY;
    CONFIG.zones.forEach((zone, index) => {
      const distance = Math.hypot(zone.x - left, zone.y - top);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  }

  function syncInteractionHit(left, top) {
    if (!interactionHit) return;
    interactionHit.style.left = `${left}px`;
    interactionHit.style.top = `${top}px`;
  }

  // 걷는 중 눌러도 순간이동하지 않도록, 실제 화면의 위치를
  // 390×540 정원 좌표로 환산해 그 자리에서 확실히 정지합니다.
  function freezeAtCurrentPosition() {
    if (!lightDragon) return;
    moveToken += 1;
    const world = getWorld();
    const worldRect = world?.getBoundingClientRect();
    const lightDragonRect = lightDragon.getBoundingClientRect();
    if (!worldRect || !worldRect.width || !worldRect.height) return;

    const scaleX = worldRect.width / 390;
    const scaleY = worldRect.height / 540;
    const anchorLeft = (lightDragonRect.left - worldRect.left) / scaleX + 52;
    const anchorTop = (lightDragonRect.top - worldRect.top) / scaleY + 95;

    // 진행 중인 CSS 이동을 현재 프레임에서 즉시 끊습니다.
    lightDragon.style.transition = "none";
    lightDragon.style.left = `${anchorLeft}px`;
    lightDragon.style.top = `${anchorTop}px`;
    syncInteractionHit(anchorLeft, anchorTop);
    currentZone = getNearestZoneIndex(anchorLeft, anchorTop);
    setZoneDepth(currentZone);

    void lightDragon.offsetWidth;
    lightDragon.style.transition = "";
  }

  function stopCharacterMotion() {
    clearInterval(walkTimer);
    clearInterval(idleTimer);
    lightDragon?.classList.remove("is-moving");
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
    lightDragon?.classList.add("is-moving");
    let step = 0;
    setSprite(CONFIG.walkFrames[0]);
    walkTimer = window.setInterval(() => {
      step = (step + 1) % CONFIG.walkFrames.length;
      setSprite(CONFIG.walkFrames[step]);
    }, CONFIG.walkFrameMs);
  }

  function moveTo(index, { duration = 2200, afterMove } = {}) {
    if (!lightDragon) return;
    moveToken += 1;
    const token = moveToken;
    const from = CONFIG.zones[currentZone];
    const to = CONFIG.zones[index];
    setFacing(to.x > from.x ? "right" : "left");
    // 이동 중에도 목적지의 깊이를 먼저 적용합니다.
    // 꽃밭에서는 꽃 장식 뒤, 앞쪽 산책길에서는 장식 앞에 자연스럽게 보이게 합니다.
    setZoneDepth(index);
    startWalkCycle();
    lightDragon.style.transition = `left ${duration}ms cubic-bezier(.22,.72,.27,1), top ${duration}ms cubic-bezier(.22,.72,.27,1), opacity .45s ease`;
    lightDragon.style.left = `${to.x}px`;
    lightDragon.style.top = `${to.y}px`;
    if (interactionHit) {
      interactionHit.style.transition = `left ${duration}ms cubic-bezier(.22,.72,.27,1), top ${duration}ms cubic-bezier(.22,.72,.27,1)`;
      syncInteractionHit(to.x, to.y);
    }
    window.setTimeout(() => {
      if (!lightDragon || token !== moveToken) return;
      currentZone = index;
      lightDragon.classList.remove("is-moving");
      clearInterval(walkTimer);
      walkTimer = null;
      if (afterMove) afterMove();
    }, duration + 40);
  }

  function closeBubble() {
    lightDragon?.querySelector(".little-light-dragon-bubble")?.classList.remove("is-open");
  }

  function resumeRoamingAfterInteraction() {
    if (!lightDragon || isTravelling) return;
    isInteracting = false;
    lightDragon.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
    playIdleLoop();
    setStatus("작은 빛 용이 잠시 더 정원에 머물러요.");
    // 눌렀다고 바로 걸어가 버리지 않도록 잠깐 더 머뭅니다.
    roamTimer = window.setTimeout(continueRoaming, 6500);
  }

  function openInteraction() {
    if (!lightDragon || isTravelling || isInteracting) return;
    isInteracting = true;
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    clearTimeout(interactionTimer);
    freezeAtCurrentPosition();
    stopCharacterMotion();
    lightDragon.setAttribute("data-interacting", "true");
    interactionHit?.setAttribute("data-interacting", "true");
    setSprite("idle_tall");
    setStatus("작은 빛 용이 편지를 기다리며 잠깐 멈춰 있어요.");

    // garden.js가 이 이벤트를 받아 기존 편지 작성 화면을 작은 빛 용 전용 상태로 엽니다.
    window.dispatchEvent(new CustomEvent("todayforest:open-special-friend-letter", {
      detail: { key: "little_light_dragon" },
    }));
  }

  function continueRoaming() {
    if (isTravelling || isInteracting) return;
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
          // 고개 숙이는 포즈는 꽃 앞에 도착한 뒤에만 사용합니다.
          setStatus("작은 빛 용이 꽃밭 앞에 멈춰서 조용히 꽃을 바라봐요.");
          showLookPose(4800, scheduleRoaming);
        } else if (zone.id === "front-walk") {
          setStatus("작은 빛 용이 앞쪽 산책길에서 잠깐 쉬고 있어요.");
          playIdleLoop();
          roamTimer = window.setTimeout(continueRoaming, 8500 + Math.round(Math.random() * 3500));
        } else {
          // 이 상태가 가장 길어야 정원에 사는 느낌이 납니다.
          setStatus("작은 빛 용이 나무 곁에서 편안히 쉬고 있어요.");
          playIdleLoop();
          roamTimer = window.setTimeout(continueRoaming, 12000 + Math.round(Math.random() * 6000));
        }
      }
    });
  }

  function scheduleRoaming() {
    if (isTravelling || isInteracting) return;
    roamTimer = window.setTimeout(continueRoaming, 900);
  }

  function findActiveJourney(journeys) {
    const items = Array.isArray(journeys) ? journeys : [];
    return items.find((item) => item?.key === "little_light_dragon" && new Date(item.returnAt || 0).getTime() > Date.now()) || null;
  }

  function compactRemaining(milliseconds) {
    const minutes = Math.max(1, Math.ceil(Math.max(0, milliseconds) / 60000));
    return `${minutes}분`;
  }

  function deliveryPhase(journey) {
    const now = Date.now();
    const availableAt = new Date(journey?.availableAt || 0).getTime();
    const returnAt = new Date(journey?.returnAt || 0).getTime();
    if (!Number.isFinite(returnAt) || returnAt <= now) return "available";
    return Number.isFinite(availableAt) && availableAt > now ? "delivering" : "returning";
  }

  function updateServerDeliveryCard(journey) {
    const phase = deliveryPhase(journey);
    if (phase === "delivering") {
      setStatus("작은 빛 용이 편지를 품고 따뜻한 빛을 남기며 숲길을 지나고 있어요.");
      setDeliveryCard(
        `작은 빛 용이 ${journey.recipientName || "친구"}에게 따뜻한 빛을 전하러 가고 있어요.`,
        `도착까지 ${compactRemaining(new Date(journey.availableAt).getTime() - Date.now())} · 도착한 뒤에도 작은 빛 용은 숲길을 지나 돌아와요.`,
        true
      );
      return;
    }
    if (phase === "returning") {
      setStatus("편지는 도착했고, 작은 빛 용은 숲길을 지나 돌아오고 있어요.");
      setDeliveryCard(
        "편지는 도착했어요.",
        `작은 빛 용이 숲을 지나 돌아오고 있어요 · 귀환까지 ${compactRemaining(new Date(journey.returnAt).getTime() - Date.now())}`,
        true
      );
      return;
    }
    setDeliveryCard("", "", false);
  }

  function scheduleServerJourney(journey) {
    clearTimeout(returnTimer);
    const phase = deliveryPhase(journey);
    if (phase === "delivering") {
      const wait = Math.max(120, new Date(journey.availableAt).getTime() - Date.now() + 120);
      returnTimer = window.setTimeout(() => {
        updateServerDeliveryCard(journey);
        window.dispatchEvent(new CustomEvent("todayforest:special-friend-journey-phase", { detail: { key: "little_light_dragon", phase: "returning" } }));
        scheduleServerJourney(journey);
      }, wait);
      return;
    }
    if (phase === "returning") {
      const wait = Math.max(120, new Date(journey.returnAt).getTime() - Date.now() + 120);
      returnTimer = window.setTimeout(() => returnHomeAfterJourney(), wait);
      return;
    }
    returnHomeAfterJourney();
  }

  function restoreServerJourney(journey) {
    if (!lightDragon || !journey) return;
    clearAllTimers();
    isTravelling = true;
    isInteracting = false;
    lightDragon.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
    lightDragon.classList.add("is-departed");
    interactionHit?.classList.add("is-hidden");
    setDeliveryCard("", "", false);
    updateServerDeliveryCard(journey);
    scheduleServerJourney(journey);
  }

  function returnHomeAfterJourney() {
    if (!lightDragon) return;
    clearAllTimers();
    setAbsolutePosition(0, { visible: false });
    setFacing("left");
    lightDragon.removeAttribute("data-has-letter");
    lightDragon.classList.remove("is-departed");
    interactionHit?.classList.remove("is-hidden");
    setSprite("return");
    lightDragon.classList.add("is-visible");
    setStatus("오른쪽 숲길에서 작은 빛을 남기며 작은 빛 용이 돌아왔어요.");
    setDeliveryCard("작은 빛 용이 정원으로 돌아왔어요.", "잠시 뒤 다시 나무 곁에서 쉬어요.", true);
    stateTimer = window.setTimeout(() => {
      moveTo(1, {
        duration: 2200,
        afterMove: () => {
          isTravelling = false;
          setDeliveryCard("", "", false);
          setStatus("작은 빛 용이 다시 정원을 천천히 둘러봐요.");
          playIdleLoop();
          currentRouteIndex = 0;
          scheduleRoaming();
          window.dispatchEvent(new CustomEvent("todayforest:special-friend-returned", { detail: { key: "little_light_dragon" } }));
        }
      });
    }, 850);
  }

  function departFromPath(journey) {
    if (!lightDragon) return;
    isTravelling = true;
    closeBubble();
    stopCharacterMotion();
    setFacing("right");
    lightDragon.setAttribute("data-has-letter", "true");
    setSprite("send");
    setStatus("작은 빛 용이 편지를 품고 작은 빛을 남기며 숲길로 떠나요.");
    updateServerDeliveryCard(journey);
    stateTimer = window.setTimeout(() => {
      lightDragon.classList.add("is-departed");
      interactionHit?.classList.add("is-hidden");
      updateServerDeliveryCard(journey);
      scheduleServerJourney(journey);
    }, 850);
  }

  function beginServerDeparture(journey) {
    if (!lightDragon || !journey) return;
    isTravelling = true;
    isInteracting = false;
    lightDragon.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    clearTimeout(interactionTimer);
    stopCharacterMotion();
    closeBubble();

    if (currentZone !== 0) {
      setStatus("작은 빛 용이 편지를 품고 먼저 오른쪽 숲길로 걸어가고 있어요.");
      lightDragon.setAttribute("data-has-letter", "true");
      moveTo(0, {
        duration: 2400,
        afterMove: () => departFromPath(journey),
      });
      return;
    }
    departFromPath(journey);
  }

  function installSpecialFriendDeliveryBridge() {
    window.addEventListener("todayforest:special-friend-letter-started", (event) => {
      const journey = event?.detail || null;
      if (journey?.key !== "little_light_dragon") return;
      beginServerDeparture(journey);
    });

    window.addEventListener("todayforest:special-friend-state-ready", (event) => {
      const journey = findActiveJourney(event?.detail?.journeys);
      // 방금 출발한 장면은 끝까지 보여주고, 새로고침/재접속일 때만 부재 상태를 복원합니다.
      if (journey && !isTravelling) {
        restoreServerJourney(journey);
      }
    });

    window.addEventListener("todayforest:special-friend-letter-preview-cancel", (event) => {
      const detail = event?.detail || {};
      if (detail.key !== "little_light_dragon" || !isInteracting || isTravelling) return;
      resumeRoamingAfterInteraction();
    });

    window.addEventListener("todayforest:special-friend-encounter-close", (event) => {
      const detail = event?.detail || {};
      if (detail.key !== "little_light_dragon" || !isInteracting || isTravelling) return;
      resumeRoamingAfterInteraction();
    });
  }

  function playFirstArrival() {
    const activeJourney = findActiveJourney(window.__todayForestSpecialFriendJourneys);
    if (activeJourney) {
      restoreServerJourney(activeJourney);
      return;
    }
    if (!lightDragon) return;
    clearAllTimers();
    isTravelling = false;
    isInteracting = false;
    lightDragon?.removeAttribute("data-interacting");
    lightDragon?.removeAttribute("data-has-letter");
    interactionHit?.removeAttribute("data-interacting");
    interactionHit?.classList.remove("is-hidden");
    setDeliveryCard("", "", false);
    closeBubble();
    setFacing("left");
    lightDragon.classList.remove("is-visible", "is-departed");
    setAbsolutePosition(0, { visible: false });
    setSprite("return");
    const arrival = getArrivalLayer();
    arrival?.classList.add("is-open");
    setStatus("숲의 빛이 오른쪽 숲길에 모이고 있어요.");
    window.setTimeout(() => {
      lightDragon?.classList.add("is-visible");
      setStatus("작은 빛 용이 숲길에서 조용히 나타났어요.");
    }, 950);
    window.setTimeout(() => {
      arrival?.classList.remove("is-open");
      moveTo(1, {
        duration: 2200,
        afterMove: () => {
          setStatus("작은 빛 용이 나무 곁에 자리를 잡았어요. 이제 정원을 천천히 둘러봐요.");
          playIdleLoop();
          currentRouteIndex = 0;
          scheduleRoaming();
        }
      });
    }, 1800);
  }
  function initWhenReady() {
    if (getWorld() && getStage()) {
      createScene();
      return;
    }
    window.setTimeout(initWhenReady, 250);
  }

  function bootPreview() { initWhenReady(); }
  // 초기화 예약을 한 번만 둡니다. 이전에는 DOMContentLoaded·load·지연 타이머가
  // 모두 남아 같은 검수 스크립트를 여러 번 깨우고 있었습니다.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPreview, { once: true });
  } else {
    bootPreview();
  }
}
