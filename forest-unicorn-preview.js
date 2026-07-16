/* -------------------------------------------------------------------------
   FOREST UNICORN PREVIEW v3.3
   ?forestFriendPreview=1 를 붙였을 때만 실행됩니다.
   목적: 프레임 기반 생활 루틴 검수 + 유니콘 전용 실제 배송 상태 검수.
   ?forestFriendPreview=1 에서만 유니콘 UI가 나타납니다.
   실제 배송 기록은 일반 동물 편지와 분리된 특별 친구 전용 RPC에 저장됩니다.
   ------------------------------------------------------------------------- */
const previewParams = new URLSearchParams(window.location.search);
const forestFriendPreviewEnabled = previewParams.get("forestFriendPreview") === "1";
let forestFriendLiveEnabled = Boolean(window.__todayForestSpecialFriendLiveState?.isMet);
let forestFriendLiveMetAt = window.__todayForestSpecialFriendLiveState?.metAt || null;
  const CONFIG = {
    assetBase: "assets/friends/forest-unicorn",
    zones: [
      { id: "forest-path", x: 313, y: 420, depth: "back", label: "오른쪽 숲길" },
      // 나무의 오른쪽 빈 풀밭. 나무/장식에 너무 붙지 않도록 아래쪽으로 내렸습니다.
      { id: "tree-rest", x: 231, y: 430, depth: "middle", label: "나무 곁 쉼터" },
      // 꽃밭의 앞쪽 가장자리. 꽃을 볼 때만 멈추고, 꽃 장식은 유니콘보다 앞에 남습니다.
      { id: "flower-watch", x: 118, y: 446, depth: "middle", label: "왼쪽 꽃 구경" },
      // 가장 앞 산책길. 이 위치에서는 유니콘이 앞쪽 레이어로 올라옵니다.
      { id: "front-walk", x: 198, y: 466, depth: "front", label: "앞쪽 산책길" },
    ],
    // 평소 루틴: 나무 곁 → 꽃 구경 → 앞쪽 산책길 → 나무 곁.
    // 오른쪽 숲길은 실제 편지 출발/귀환 때에만 사용합니다.
    roamRoute: [1, 2, 3, 1],
    idleFrames: ["idle_base", "idle_tall", "idle_base", "idle_down"],
    // walk_1은 고개를 숙인 포즈라 걷기 루프에서 제외합니다.
    walkFrames: ["walk_2", "walk_3", "walk_4", "walk_3"],
    walkFrameMs: 170,
  };

  let unicorn = null;
  let interactionHit = null;
  let statusNode = null;
  let imgNode = null;
  let deliveryCard = null;
  let memoryChipButton = null;
  let memoryPopover = null;
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
  let replayButton = null;
  let metDateNode = null;
  let cinematicReady = false;
  const FIRST_MET_AT_KEY = "todayforest.dev.forest_unicorn.first_met_at";

  function getWorld() { return document.getElementById("gardenWorld"); }
  function getStage() { return document.getElementById("gardenStage"); }
  function asset(name) { return `${CONFIG.assetBase}/forest-unicorn-${name}.png`; }

  function getFirstMetAt() {
    if (forestFriendLiveEnabled && forestFriendLiveMetAt && Number.isFinite(new Date(forestFriendLiveMetAt).getTime())) {
      return forestFriendLiveMetAt;
    }
    const saved = window.localStorage.getItem(FIRST_MET_AT_KEY);
    if (saved && Number.isFinite(new Date(saved).getTime())) return saved;
    const now = new Date().toISOString();
    window.localStorage.setItem(FIRST_MET_AT_KEY, now);
    return now;
  }

  function formatFirstMetDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "오늘";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function updateMemoryCard() {
    const metDateText = `${formatFirstMetDate(getFirstMetAt())} · 숲 유니콘과 처음 만났어요`;
    if (metDateNode) metDateNode.textContent = metDateText;
    if (memoryChipButton) memoryChipButton.setAttribute("aria-label", `특별친구 정보 보기 · 숲 유니콘 · ${metDateText}`);
    if (replayButton) replayButton.disabled = !cinematicReady && typeof window.__todayForestReplayFriendCinematic !== "function";
  }

  function toggleMemoryPopover(force) {
    if (!memoryPopover || !memoryChipButton) return;
    const shouldOpen = typeof force === "boolean" ? force : memoryPopover.hidden;
    memoryPopover.hidden = !shouldOpen;
    memoryPopover.classList.toggle("is-open", shouldOpen);
    memoryChipButton.setAttribute("aria-expanded", String(shouldOpen));
  }

  function replayFirstMeeting() {
    const play = window.__todayForestReplayFriendCinematic;
    if (typeof play !== "function") {
      setStatus("첫 만남 장면을 준비하고 있어요. 잠시 뒤 다시 눌러주세요.");
      return;
    }
    stopCharacterMotion();
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    play({ mode: "replay" });
  }

  function createScene() {
    const world = getWorld();
    const stage = getStage();
    if (!world || !stage || unicorn) return;

    document.body.classList.add("forest-unicorn-preview-enabled");
    document.body.classList.toggle("forest-unicorn-live-enabled", forestFriendLiveEnabled && !forestFriendPreviewEnabled);

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
      <span class="forest-unicorn-letter" aria-hidden="true">✉</span>
    `;
    world.appendChild(unicorn);
    imgNode = unicorn.querySelector(".forest-unicorn-image");

    // 장식 레이어에 가려져 있어도 눌림이 사라지지 않도록,
    // 화면에는 보이지 않는 별도 클릭 영역을 유니콘과 함께 이동시킵니다.
    interactionHit = document.createElement("button");
    interactionHit.type = "button";
    interactionHit.className = "forest-unicorn-hit";
    interactionHit.setAttribute("aria-label", "숲 유니콘에게 말 걸기");
    world.appendChild(interactionHit);

    const requestInteraction = (event) => {
      event?.preventDefault();
      event?.stopPropagation();
      if (!isTravelling) openInteraction();
    };
    interactionHit.addEventListener("pointerdown", requestInteraction);
    interactionHit.addEventListener("click", requestInteraction);
    unicorn.addEventListener("click", requestInteraction);
    unicorn.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !isTravelling) {
        requestInteraction(event);
      }
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

    deliveryCard = document.createElement("aside");
    deliveryCard.className = "forest-unicorn-delivery-card";
    deliveryCard.setAttribute("aria-live", "polite");
    deliveryCard.innerHTML = `
      <span class="forest-unicorn-delivery-icon" aria-hidden="true">✉</span>
      <div>
        <p class="forest-unicorn-delivery-kicker">FOREST FRIEND DELIVERY</p>
        <strong></strong>
        <p class="forest-unicorn-delivery-note"></p>
      </div>
    `;
    stage.appendChild(deliveryCard);

    const headerActions = document.querySelector(".header-actions");
    const shouldShowFriendMemory = forestFriendPreviewEnabled || forestFriendLiveEnabled;
    if (headerActions && shouldShowFriendMemory) {
      const memorySlot = document.createElement("div");
      memorySlot.className = "forest-unicorn-header-slot";
      memorySlot.innerHTML = `
        <button type="button" class="forest-unicorn-header-chip" data-unicorn-memory-toggle aria-haspopup="dialog" aria-expanded="false">
          <span class="forest-unicorn-header-chip-icon" aria-hidden="true">✨</span>
          <span class="forest-unicorn-header-chip-text">특별친구</span>
        </button>
        <section class="forest-unicorn-memory-popover" aria-label="특별친구 정보" hidden>
          <div class="forest-unicorn-memory-popover-head">
            <div>
              <p class="kicker">${forestFriendPreviewEnabled ? "SPECIAL FRIEND PREVIEW v3.3" : "MY SPECIAL FRIEND"}</p>
              <strong>나와 함께 지내는 특별친구</strong>
            </div>
            <button type="button" class="forest-unicorn-memory-close" data-unicorn-memory-close aria-label="특별친구 정보창 닫기">✕</button>
          </div>

          <article class="forest-unicorn-profile-card">
            <div class="forest-unicorn-profile-portrait" aria-hidden="true">
              <img src="assets/friends/forest-unicorn-idle.png" alt="" />
            </div>
            <div class="forest-unicorn-profile-copy">
              <p class="forest-unicorn-profile-kicker">CURRENT FRIEND</p>
              <strong>숲 유니콘</strong>
              <span>마음을 따라 찾아온 첫 번째 특별친구</span>
            </div>
            <span class="forest-unicorn-profile-badge">함께 지내는 중</span>
          </article>

          <div class="forest-unicorn-status-card">
            <div class="forest-unicorn-status-head">
              <span class="forest-unicorn-status-dot" aria-hidden="true"></span>
              <strong>현재 상태</strong>
            </div>
            <p class="forest-unicorn-preview-status">${forestFriendPreviewEnabled ? "유니콘을 눌러 마음을 맡기면 30분 뒤 도착하고, 유니콘은 30분 더 숲길을 지나 돌아와요." : "숲 유니콘이 나무 곁에서 당신과 함께 지내고 있어요."}</p>
          </div>

          <div class="forest-unicorn-memory-card compact">
            <span class="forest-unicorn-memory-icon" aria-hidden="true">🌙</span>
            <div class="forest-unicorn-memory-copy">
              <p class="forest-unicorn-memory-kicker">OUR FIRST DAY</p>
              <strong>우리가 처음 만난 날</strong>
              <p class="forest-unicorn-memory-date" data-unicorn-met-date></p>
            </div>
          </div>

          <div class="forest-unicorn-memory-popover-actions">
            <button type="button" class="forest-unicorn-memory-replay" data-unicorn-replay>
              <span aria-hidden="true">✨</span> 첫 만남 다시 보기
            </button>
            <button type="button" class="forest-unicorn-future-action" disabled>
              <span aria-hidden="true">🏡</span> 친구 공간 준비 중
            </button>
          </div>
          <p class="forest-unicorn-future-note">앞으로 꾸미기·돌보기와 여러 특별친구 전환 기능이 이곳에 이어져요.</p>
        </section>
      `;
      const weatherButton = headerActions.querySelector("#weatherButton");
      if (weatherButton) headerActions.insertBefore(memorySlot, weatherButton);
      else headerActions.appendChild(memorySlot);
      memoryChipButton = memorySlot.querySelector("[data-unicorn-memory-toggle]");
      memoryPopover = memorySlot.querySelector(".forest-unicorn-memory-popover");
      statusNode = memorySlot.querySelector(".forest-unicorn-preview-status");
      replayButton = memorySlot.querySelector("[data-unicorn-replay]");
      metDateNode = memorySlot.querySelector("[data-unicorn-met-date]");
      memoryChipButton?.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleMemoryPopover();
      });
      memorySlot.querySelector("[data-unicorn-memory-close]")?.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleMemoryPopover(false);
      });
      replayButton?.addEventListener("click", () => {
        toggleMemoryPopover(false);
        replayFirstMeeting();
      });
      document.addEventListener("click", (event) => {
        if (!memorySlot.contains(event.target)) toggleMemoryPopover(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") toggleMemoryPopover(false);
      });
      cinematicReady = typeof window.__todayForestReplayFriendCinematic === "function";
      updateMemoryCard();
    }

    setAbsolutePosition(0, { visible: false });
    installSpecialFriendDeliveryBridge();
    const activeJourney = findActiveJourney(window.__todayForestSpecialFriendJourneys);
    if (activeJourney) {
      restoreServerJourney(activeJourney);
    } else if (forestFriendPreviewEnabled && previewParams.get("firstMeeting") === "1") {
      // 전체 시네마틱이 끝나고 사용자가 인사하기를 누르면 정원 속 생활을 시작합니다.
      setStatus("첫 만남을 준비하고 있어요.");
    } else if (forestFriendLiveEnabled) {
      window.setTimeout(settleAfterFirstMeeting, 320);
    } else {
      window.setTimeout(playFirstArrival, 700);
    }
  }

  function setStatus(text) { if (statusNode) statusNode.textContent = text; }

  function setDeliveryCard(title = "", note = "", open = false) {
    if (!deliveryCard) return;
    const titleNode = deliveryCard.querySelector("strong");
    const noteNode = deliveryCard.querySelector(".forest-unicorn-delivery-note");
    if (titleNode) titleNode.textContent = title;
    if (noteNode) noteNode.textContent = note;
    deliveryCard.classList.toggle("is-open", Boolean(open));
  }

  function getArrivalLayer() { return getStage()?.querySelector(".forest-unicorn-arrival"); }
  function setSprite(name) { if (imgNode) imgNode.src = asset(name); }

  function setFacing(direction) {
    currentFacing = direction === "right" ? "right" : "left";
    unicorn?.setAttribute("data-facing", currentFacing);
  }

  function setZoneDepth(index) {
    const zone = CONFIG.zones[index];
    if (!unicorn || !zone) return;
    unicorn.setAttribute("data-depth", zone.depth || "middle");
  }

  function setAbsolutePosition(index, { visible = true } = {}) {
    currentZone = index;
    const zone = CONFIG.zones[index];
    if (!unicorn) return;
    setZoneDepth(index);
    unicorn.style.left = `${zone.x}px`;
    unicorn.style.top = `${zone.y}px`;
    syncInteractionHit(zone.x, zone.y);
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
    if (!unicorn) return;
    moveToken += 1;
    const world = getWorld();
    const worldRect = world?.getBoundingClientRect();
    const unicornRect = unicorn.getBoundingClientRect();
    if (!worldRect || !worldRect.width || !worldRect.height) return;

    const scaleX = worldRect.width / 390;
    const scaleY = worldRect.height / 540;
    const anchorLeft = (unicornRect.left - worldRect.left) / scaleX + 52;
    const anchorTop = (unicornRect.top - worldRect.top) / scaleY + 95;

    // 진행 중인 CSS 이동을 현재 프레임에서 즉시 끊습니다.
    unicorn.style.transition = "none";
    unicorn.style.left = `${anchorLeft}px`;
    unicorn.style.top = `${anchorTop}px`;
    syncInteractionHit(anchorLeft, anchorTop);
    currentZone = getNearestZoneIndex(anchorLeft, anchorTop);
    setZoneDepth(currentZone);

    void unicorn.offsetWidth;
    unicorn.style.transition = "";
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
    // 이동 중에도 목적지의 깊이를 먼저 적용합니다.
    // 꽃밭에서는 꽃 장식 뒤, 앞쪽 산책길에서는 장식 앞에 자연스럽게 보이게 합니다.
    setZoneDepth(index);
    startWalkCycle();
    unicorn.style.transition = `left ${duration}ms cubic-bezier(.22,.72,.27,1), top ${duration}ms cubic-bezier(.22,.72,.27,1), opacity .45s ease`;
    unicorn.style.left = `${to.x}px`;
    unicorn.style.top = `${to.y}px`;
    if (interactionHit) {
      interactionHit.style.transition = `left ${duration}ms cubic-bezier(.22,.72,.27,1), top ${duration}ms cubic-bezier(.22,.72,.27,1)`;
      syncInteractionHit(to.x, to.y);
    }
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

  function resumeRoamingAfterInteraction() {
    if (!unicorn || isTravelling) return;
    isInteracting = false;
    unicorn.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
    playIdleLoop();
    setStatus("유니콘이 잠시 더 정원에 머물러요.");
    // 눌렀다고 바로 걸어가 버리지 않도록 잠깐 더 머뭅니다.
    roamTimer = window.setTimeout(continueRoaming, 6500);
  }

  function openInteraction() {
    if (!unicorn || isTravelling || isInteracting) return;
    // 특별친구 정보창이 열려 있어도 클릭을 가리지 않도록 먼저 닫고 만남 카드를 엽니다.
    toggleMemoryPopover(false);
    isInteracting = true;
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    clearTimeout(interactionTimer);
    freezeAtCurrentPosition();
    stopCharacterMotion();
    unicorn.setAttribute("data-interacting", "true");
    interactionHit?.setAttribute("data-interacting", "true");
    setSprite("idle_tall");
    setStatus("유니콘이 편지를 기다리며 잠깐 멈춰 있어요.");

    // 운영에서도 개발 서버와 동일하게 만남 카드를 거쳐 편지 작성 화면을 엽니다.
    window.dispatchEvent(new CustomEvent("todayforest:open-special-friend-letter", {
      detail: { key: "forest_unicorn" },
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
          setStatus("유니콘이 꽃밭 앞에 멈춰서 조용히 꽃을 바라봐요.");
          showLookPose(4800, scheduleRoaming);
        } else if (zone.id === "front-walk") {
          setStatus("유니콘이 앞쪽 산책길에서 잠깐 쉬고 있어요.");
          playIdleLoop();
          roamTimer = window.setTimeout(continueRoaming, 8500 + Math.round(Math.random() * 3500));
        } else {
          // 이 상태가 가장 길어야 정원에 사는 느낌이 납니다.
          setStatus("유니콘이 나무 곁에서 편안히 쉬고 있어요.");
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
    return items.find((item) => item?.key === "forest_unicorn" && new Date(item.returnAt || 0).getTime() > Date.now()) || null;
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
      setStatus("유니콘이 편지를 품고 숲길을 지나고 있어요.");
      setDeliveryCard(
        `유니콘이 ${journey.recipientName || "친구"}에게 마음을 전하러 가고 있어요.`,
        `도착까지 ${compactRemaining(new Date(journey.availableAt).getTime() - Date.now())} · 도착한 뒤에도 유니콘은 숲길을 지나 돌아와요.`,
        true
      );
      return;
    }
    if (phase === "returning") {
      setStatus("편지는 도착했고, 유니콘은 숲길을 지나 돌아오고 있어요.");
      setDeliveryCard(
        "편지는 도착했어요.",
        `유니콘이 숲을 지나 돌아오고 있어요 · 귀환까지 ${compactRemaining(new Date(journey.returnAt).getTime() - Date.now())}`,
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
        window.dispatchEvent(new CustomEvent("todayforest:special-friend-journey-phase", { detail: { key: "forest_unicorn", phase: "returning" } }));
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
    if (!unicorn || !journey) return;
    clearAllTimers();
    isTravelling = true;
    isInteracting = false;
    unicorn.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
    unicorn.classList.add("is-departed");
    interactionHit?.classList.add("is-hidden");
    setDeliveryCard("", "", false);
    updateServerDeliveryCard(journey);
    scheduleServerJourney(journey);
  }

  function returnHomeAfterJourney() {
    if (!unicorn) return;
    clearAllTimers();
    setAbsolutePosition(0, { visible: false });
    setFacing("left");
    unicorn.removeAttribute("data-has-letter");
    unicorn.classList.remove("is-departed");
    interactionHit?.classList.remove("is-hidden");
    setSprite("return");
    unicorn.classList.add("is-visible");
    setStatus("오른쪽 숲길에서 작은 빛과 함께 유니콘이 돌아왔어요.");
    setDeliveryCard("유니콘이 정원으로 돌아왔어요.", "잠시 뒤 다시 나무 곁에서 쉬어요.", true);
    stateTimer = window.setTimeout(() => {
      moveTo(1, {
        duration: 2200,
        afterMove: () => {
          isTravelling = false;
          setDeliveryCard("", "", false);
          setStatus("유니콘이 다시 정원을 천천히 둘러봐요.");
          playIdleLoop();
          currentRouteIndex = 0;
          scheduleRoaming();
          window.dispatchEvent(new CustomEvent("todayforest:special-friend-returned", { detail: { key: "forest_unicorn" } }));
        }
      });
    }, 850);
  }

  function departFromPath(journey) {
    if (!unicorn) return;
    isTravelling = true;
    closeBubble();
    stopCharacterMotion();
    setFacing("right");
    unicorn.setAttribute("data-has-letter", "true");
    setSprite("send");
    setStatus("유니콘이 편지를 품고 오른쪽 숲길로 떠나요.");
    updateServerDeliveryCard(journey);
    stateTimer = window.setTimeout(() => {
      unicorn.classList.add("is-departed");
      interactionHit?.classList.add("is-hidden");
      updateServerDeliveryCard(journey);
      scheduleServerJourney(journey);
    }, 850);
  }

  function beginServerDeparture(journey) {
    if (!unicorn || !journey) return;
    isTravelling = true;
    isInteracting = false;
    unicorn.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    clearTimeout(interactionTimer);
    stopCharacterMotion();
    closeBubble();

    if (currentZone !== 0) {
      setStatus("유니콘이 편지를 품고 먼저 오른쪽 숲길로 걸어가고 있어요.");
      unicorn.setAttribute("data-has-letter", "true");
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
      if (journey?.key !== "forest_unicorn") return;
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
      if (detail.key !== "forest_unicorn" || !isInteracting || isTravelling) return;
      resumeRoamingAfterInteraction();
    });

    window.addEventListener("todayforest:special-friend-encounter-close", (event) => {
      const detail = event?.detail || {};
      if (detail.key !== "forest_unicorn" || !isInteracting || isTravelling) return;
      resumeRoamingAfterInteraction();
    });

    window.addEventListener("todayforest:friend-cinematic-ready", (event) => {
      if (event?.detail?.key !== "forest_unicorn") return;
      cinematicReady = true;
      updateMemoryCard();
    });

    window.addEventListener("todayforest:friend-cinematic-closed", (event) => {
      const detail = event?.detail || {};
      if (detail.key !== "forest_unicorn") return;
      if (detail.mode === "first-meeting") {
        if (!forestFriendLiveEnabled) window.localStorage.setItem(FIRST_MET_AT_KEY, new Date().toISOString());
        updateMemoryCard();
        settleAfterFirstMeeting();
        return;
      }
      if (!isTravelling && !isInteracting) {
        setStatus("첫 만남의 기억을 다시 보고 왔어요. 유니콘이 나무 곁에서 기다리고 있어요.");
        playIdleLoop();
        roamTimer = window.setTimeout(continueRoaming, 6000);
      }
    });
  }

  function settleAfterFirstMeeting() {
    if (!unicorn) return;
    clearAllTimers();
    isTravelling = false;
    isInteracting = false;
    unicorn.removeAttribute("data-interacting");
    unicorn.removeAttribute("data-has-letter");
    interactionHit?.removeAttribute("data-interacting");
    interactionHit?.classList.remove("is-hidden");
    setDeliveryCard("", "", false);
    closeBubble();
    setFacing("left");
    setAbsolutePosition(1, { visible: false });
    setSprite("look");
    unicorn.classList.remove("is-departed");
    window.requestAnimationFrame(() => {
      unicorn?.classList.add("is-visible");
      setStatus("숲 유니콘이 나무 곁에 자리를 잡았어요. 이제 이 정원에서 함께 지내요.");
    });
    stateTimer = window.setTimeout(() => {
      playIdleLoop();
      currentRouteIndex = 0;
      roamTimer = window.setTimeout(continueRoaming, 7000);
    }, 1500);
  }

  function playFirstArrival() {
    const activeJourney = findActiveJourney(window.__todayForestSpecialFriendJourneys);
    if (activeJourney) {
      restoreServerJourney(activeJourney);
      return;
    }
    if (!unicorn) return;
    clearAllTimers();
    isTravelling = false;
    isInteracting = false;
    unicorn?.removeAttribute("data-interacting");
    unicorn?.removeAttribute("data-has-letter");
    interactionHit?.removeAttribute("data-interacting");
    interactionHit?.classList.remove("is-hidden");
    setDeliveryCard("", "", false);
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
  function initWhenReady() {
    if (getWorld() && getStage()) {
      createScene();
      return;
    }
    window.setTimeout(initWhenReady, 250);
  }

  function bootPreview() {
    if (!forestFriendPreviewEnabled && !forestFriendLiveEnabled) return;
    initWhenReady();
  }

  window.addEventListener("todayforest:special-friend-live-state", (event) => {
    const detail = event?.detail || {};
    if (detail.friendKey !== "forest_unicorn") return;
    forestFriendLiveEnabled = Boolean(detail.isMet);
    forestFriendLiveMetAt = detail.metAt || forestFriendLiveMetAt;
    if (forestFriendLiveEnabled) {
      document.body.classList.add("forest-unicorn-live-enabled");
      bootPreview();
      updateMemoryCard();
    }
  });

  // 초기화 예약을 한 번만 둡니다. 미리보기 주소이거나 서버에서 실제 만남이 완료된 경우에만 나타납니다.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPreview, { once: true });
  } else {
    bootPreview();
  }
