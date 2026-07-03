/* -------------------------------------------------------------------------
   FOREST UNICORN PREVIEW v2
   ?forestFriendPreview=1 를 붙였을 때만 실행됩니다.
   목적: 프레임 기반 걷기/idle/꽃 구경 루틴 검수. 평소에는 오른쪽 숲길로 가지 않습니다.
   DB/편지 데이터에는 어떤 쓰기 작업도 하지 않습니다.
   ------------------------------------------------------------------------- */
const previewParams = new URLSearchParams(window.location.search);
const forestFriendPreviewEnabled = previewParams.get("forestFriendPreview") === "1";

if (forestFriendPreviewEnabled) {
  const CONFIG = {
    assetBase: "../../assets/friends/forest-unicorn",
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
    testReturnMs: 8000,
    walkFrameMs: 170,
  };

  let unicorn = null;
  let interactionHit = null;
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
  let isInteracting = false;
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
      <span class="forest-unicorn-bubble" aria-live="polite"><p></p></span>
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
      <p class="forest-unicorn-preview-status">크기 · 자리 · 앞뒤 깊이를 먼저 검수하는 화면이에요.</p>
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

  function getInteractionCopy() {
    const zoneId = CONFIG.zones[currentZone]?.id;
    if (zoneId === "flower-watch") return "꽃향기가 좋아서, 잠깐 더 보고 있었어요.";
    if (zoneId === "front-walk") return "천천히 걷고 있었어요. 같이 쉬어 갈래요?";
    return "응, 여기 있어요. 나무 곁은 포근하네요.";
  }

  function resumeRoamingAfterInteraction() {
    if (!unicorn || isTravelling) return;
    isInteracting = false;
    unicorn.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
    closeBubble();
    playIdleLoop();
    setStatus("유니콘이 잠시 더 나무 곁에서 쉬어요.");
    // 눌렀다고 바로 걸어가 버리지 않도록 잠깐 더 머뭅니다.
    roamTimer = window.setTimeout(continueRoaming, 6500);
  }

  function openInteraction() {
    if (!unicorn || isTravelling || isInteracting) return;
    isInteracting = true;
    clearTimeout(roamTimer);
    clearTimeout(stateTimer);
    clearTimeout(interactionTimer);
    freezeAtCurrentPosition();
    stopCharacterMotion();
    unicorn.setAttribute("data-interacting", "true");
    interactionHit?.setAttribute("data-interacting", "true");
    setSprite("idle_tall");
    const bubble = unicorn.querySelector(".forest-unicorn-bubble");
    const copy = bubble?.querySelector("p");
    if (copy) copy.textContent = getInteractionCopy();
    bubble?.classList.add("is-open");
    setStatus("유니콘이 멈춰 서서 당신을 바라봐요 · 5초 동안 쉬어요.");
    // 클릭이 먹혔는지 분명히 알 수 있도록 5초간 완전히 정지합니다.
    interactionTimer = window.setTimeout(resumeRoamingAfterInteraction, 5000);
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

  function playFirstArrival() {
    if (!unicorn) return;
    clearAllTimers();
    isTravelling = false;
    isInteracting = false;
    unicorn?.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
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
    isInteracting = false;
    unicorn.removeAttribute("data-interacting");
    interactionHit?.removeAttribute("data-interacting");
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
