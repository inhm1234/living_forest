/* -------------------------------------------------------------------------
   FOREST UNICORN PREVIEW v1
   테스트 주소에 ?forestFriendPreview=1 를 붙였을 때만 실행됩니다.
   서버/DB/편지 데이터에는 어떤 쓰기 작업도 하지 않습니다.
   목적: 실제 정원 안에서 첫 등장 · idle · 생활 이동 · 출발/귀환 감각 검수.
   ------------------------------------------------------------------------- */
const previewParams = new URLSearchParams(window.location.search);
const forestFriendPreviewEnabled = previewParams.get("forestFriendPreview") === "1";

if (forestFriendPreviewEnabled) {
  const CONFIG = {
    asset: "../../assets/friends/forest-unicorn-idle.png",
    // 390×540 coordinate world 기준. 오른쪽 숲길 → 나무 곁 → 꽃 → 앞쪽 산책길.
    zones: [
      { id: "forest-path", x: 313, y: 420, label: "오른쪽 숲길" },
      { id: "tree-rest", x: 246, y: 404, label: "나무 곁 쉼터" },
      { id: "flower-watch", x: 124, y: 428, label: "왼쪽 꽃 구경" },
      { id: "front-walk", x: 202, y: 458, label: "앞쪽 산책길" },
    ],
    testReturnMs: 8000,
  };

  let unicorn = null;
  let statusNode = null;
  let currentZone = 0;
  let roamingTimer = null;
  let blinkTimer = null;
  let returnTimer = null;
  let interactionTimer = null;
  let isTravelling = false;
  let firstArrivalPlayed = false;

  function getWorld() {
    return document.getElementById("gardenWorld");
  }

  function getStage() {
    return document.getElementById("gardenStage");
  }

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
      <span class="forest-unicorn-ground-glow" aria-hidden="true"></span>
      <span class="forest-unicorn-sprite" aria-hidden="true">
        <img src="${CONFIG.asset}" alt="" />
        <span class="forest-unicorn-eye-close"></span>
        <span class="forest-unicorn-sparkles"><i></i><i></i><i></i><i></i><i></i></span>
      </span>
      <span class="forest-unicorn-bubble" aria-live="polite"><p></p><button type="button">숲길로 떠나 보기</button></span>
    `;
    world.appendChild(unicorn);
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
        <p>당신의 숲에 함께 있을게요.</p>
      </div>
    `;
    stage.appendChild(arrival);

    const panel = document.createElement("section");
    panel.className = "forest-unicorn-preview-panel";
    panel.setAttribute("aria-label", "숲 유니콘 생활 테스트 제어");
    panel.innerHTML = `
      <div class="forest-unicorn-preview-panel-head">
        <div><p class="kicker">FOREST FRIEND PREVIEW</p><strong>숲 유니콘 생활 테스트</strong></div>
      </div>
      <div class="forest-unicorn-preview-actions">
        <button type="button" data-unicorn-replay>첫 만남 다시 보기</button>
        <button type="button" data-unicorn-depart>숲길로 떠나 보기</button>
      </div>
      <p class="forest-unicorn-preview-status">정원 안에서 idle · 꽃 구경 · 산책 · 출발·귀환을 체험하는 검수 화면이에요.</p>
    `;
    stage.insertAdjacentElement("afterend", panel);
    statusNode = panel.querySelector(".forest-unicorn-preview-status");
    panel.querySelector("[data-unicorn-replay]").addEventListener("click", playFirstArrival);
    panel.querySelector("[data-unicorn-depart]").addEventListener("click", beginTestDeparture);

    setPosition(0, { instant: true, visible: false });
    window.setTimeout(playFirstArrival, 700);
  }

  function setStatus(text) {
    if (statusNode) statusNode.textContent = text;
  }

  function setPosition(index, { instant = false, visible = true } = {}) {
    if (!unicorn) return;
    currentZone = ((index % CONFIG.zones.length) + CONFIG.zones.length) % CONFIG.zones.length;
    const zone = CONFIG.zones[currentZone];
    unicorn.classList.toggle("is-walking", !instant);
    unicorn.classList.toggle("is-flower-looking", zone.id === "flower-watch");
    if (instant) unicorn.style.transition = "none";
    unicorn.style.left = `${zone.x}px`;
    unicorn.style.top = `${zone.y}px`;
    if (visible) unicorn.classList.add("is-visible");
    if (instant) {
      requestAnimationFrame(() => {
        if (unicorn) unicorn.style.transition = "";
      });
    }
    window.setTimeout(() => unicorn?.classList.remove("is-walking"), instant ? 0 : 3350);
  }

  function closeBubble() {
    unicorn?.querySelector(".forest-unicorn-bubble")?.classList.remove("is-open");
  }

  function openInteraction() {
    if (!unicorn) return;
    clearTimeout(interactionTimer);
    const bubble = unicorn.querySelector(".forest-unicorn-bubble");
    const copy = bubble?.querySelector("p");
    if (copy) copy.textContent = "편지를 기다리고 있어요.";
    bubble?.classList.add("is-open");
    unicorn.classList.add("is-flower-looking");
    interactionTimer = window.setTimeout(() => {
      closeBubble();
      unicorn?.classList.remove("is-flower-looking");
    }, 5500);
  }

  function blinkOnce() {
    if (!unicorn || isTravelling) return;
    unicorn.classList.add("is-blinking");
    window.setTimeout(() => unicorn?.classList.remove("is-blinking"), 135);
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    const delay = 4200 + Math.round(Math.random() * 4200);
    blinkTimer = window.setTimeout(() => {
      blinkOnce();
      scheduleBlink();
    }, delay);
  }

  function stopRoaming() {
    clearTimeout(roamingTimer);
    clearTimeout(blinkTimer);
    clearTimeout(interactionTimer);
  }

  function startRoaming({ delay = 4800 } = {}) {
    if (!unicorn || isTravelling) return;
    stopRoaming();
    scheduleBlink();
    const step = () => {
      if (!unicorn || isTravelling) return;
      const next = (currentZone + 1) % CONFIG.zones.length;
      setPosition(next);
      const zone = CONFIG.zones[next];
      const wait = zone.id === "flower-watch" ? 11500 : 8500 + Math.round(Math.random() * 4800);
      roamingTimer = window.setTimeout(step, wait);
    };
    roamingTimer = window.setTimeout(step, delay);
  }

  function getArrivalLayer() {
    return getStage()?.querySelector(".forest-unicorn-arrival");
  }

  function playFirstArrival() {
    if (!unicorn) return;
    stopRoaming();
    clearTimeout(returnTimer);
    isTravelling = false;
    closeBubble();
    unicorn.classList.remove("is-visible", "is-departing", "is-arriving", "is-walking", "is-flower-looking");
    const arrival = getArrivalLayer();
    arrival?.classList.add("is-open");
    setStatus("숲의 빛이 나무 곁에 모이고 있어요.");
    window.setTimeout(() => {
      setPosition(0, { instant: true, visible: true });
      unicorn?.classList.add("is-arriving");
      setStatus("숲 유니콘이 숲길에서 조용히 나타났어요.");
    }, 1650);
    window.setTimeout(() => blinkOnce(), 2650);
    window.setTimeout(() => {
      arrival?.classList.remove("is-open");
      firstArrivalPlayed = true;
      setStatus("숲 유니콘이 이 숲을 기억하게 되었어요. 이제 정원을 천천히 둘러봐요.");
      startRoaming({ delay: 5200 });
    }, 4400);
  }

  function beginTestDeparture() {
    if (!unicorn || isTravelling) return;
    isTravelling = true;
    stopRoaming();
    closeBubble();
    setStatus("유니콘이 편지를 안고 오른쪽 숲길로 떠났어요. 체험에서는 8초 뒤 돌아와요.");
    unicorn.classList.add("is-departing", "is-walking");
    unicorn.style.left = "445px";
    unicorn.style.top = "318px";
    returnTimer = window.setTimeout(() => {
      if (!unicorn) return;
      setStatus("오른쪽 숲길에서 작은 빛이 먼저 돌아왔어요.");
      unicorn.classList.remove("is-departing", "is-visible", "is-walking");
      unicorn.style.left = "402px";
      unicorn.style.top = "354px";
      window.setTimeout(() => {
        unicorn.classList.add("is-visible", "is-arriving");
        setPosition(0);
        blinkOnce();
        isTravelling = false;
        setStatus("숲 유니콘이 돌아와 다시 정원을 둘러봐요.");
        startRoaming({ delay: 6200 });
      }, 550);
    }, CONFIG.testReturnMs);
  }

  function initWhenReady() {
    if (getWorld() && getStage()) {
      createScene();
      return;
    }
    window.setTimeout(initWhenReady, 250);
  }

  // GitHub Pages에서 모듈이 늦게 도착해 load 이벤트가 이미 지나간 경우에도
  // 반드시 시작되도록, DOM 준비 상태와 짧은 재시도를 함께 사용합니다.
  function bootPreview() {
    initWhenReady();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(bootPreview, 300), { once: true });
  } else {
    window.setTimeout(bootPreview, 120);
  }

  window.addEventListener("load", () => window.setTimeout(bootPreview, 700), { once: true });
  window.setTimeout(bootPreview, 1500);
}
