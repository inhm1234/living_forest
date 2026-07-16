/* -------------------------------------------------------------------------
   TODAYFOREST · FOREST FRIEND CINEMATIC v1.1

   - 사용자가 현재 보고 있는 정원과 실제 성장 단계의 나무를 복제해 배경으로 사용합니다.
   - 별도의 완성 나무 이미지를 사용하지 않습니다.
   - 건너뛰기 시 모든 타이머·프레임·CSS 애니메이션을 멈추고 마지막 장면으로 이동합니다.
   ------------------------------------------------------------------------- */
const ffCinematicParams = new URLSearchParams(window.location.search);
const ffStandalonePreview = ffCinematicParams.get("forestFriendCinematic") === "1";
const ffFriendPreview = ffCinematicParams.get("forestFriendPreview") === "1";
const ffFirstMeetingPreview = ffCinematicParams.get("firstMeeting") === "1";

{
  const COPY = [
    { at: 350, kicker: "A QUIET FOREST NIGHT", line: "숲이 잠시 고요해지고,\n당신의 나무가 조용히 빛나기 시작했어요." },
    { at: 1900, kicker: "THE TREE REMEMBERS", line: "나무가 기억한 따뜻한 마음들이\n하나둘 빛으로 모여요." },
    { at: 3650, kicker: "A SOFT MOONLIT PATH", line: "꽃잎과 작은 빛들이 이어져\n부드러운 숲길을 만들어요." },
    { at: 5300, kicker: "SOMEONE IS COMING", line: "길 끝에서 작은 친구가\n천천히 이쪽으로 다가오고 있어요." },
    { at: 7600, kicker: "OUR FIRST MEETING", line: "네가 숲에 남긴 마음을 따라\n한 걸음씩 여기까지 왔어." },
    { at: 9800, kicker: "A NEW FOREST FRIEND", line: "오늘부터 숲 유니콘은\n당신과 함께할 특별한 친구예요." },
  ];

  const WALK_FRAMES = [
    "../../assets/friends/forest-unicorn/forest-unicorn-walk_1.png",
    "../../assets/friends/forest-unicorn/forest-unicorn-walk_2.png",
    "../../assets/friends/forest-unicorn/forest-unicorn-walk_3.png",
    "../../assets/friends/forest-unicorn/forest-unicorn-walk_4.png",
    "../../assets/friends/forest-unicorn/forest-unicorn-walk_3.png",
    "../../assets/friends/forest-unicorn/forest-unicorn-walk_2.png",
  ];
  const IDLE_FRAME = "../../assets/friends/forest-unicorn/forest-unicorn-look.png";

  let root = null;
  let gardenMount = null;
  let copyLine = null;
  let copyKicker = null;
  let unicornImage = null;
  let timers = new Set();
  let walkInterval = null;
  let walkFrameIndex = 0;
  let currentMode = "preview";
  let lastFocusedElement = null;
  let closeInProgress = false;
  let resizeTimer = null;

  function schedule(callback, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function makeParticles(count = 30) {
    return Array.from({ length: count }, () => {
      const x = 10 + Math.random() * 80;
      const y = 32 + Math.random() * 58;
      const size = 3 + Math.random() * 6;
      const duration = 3.2 + Math.random() * 3.5;
      const delay = 1.7 + Math.random() * 8;
      const dx = `${-24 + Math.random() * 48}px`;
      return `<i class="ff-cinematic-particle" style="--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%;--s:${size.toFixed(1)}px;--d:${duration.toFixed(2)}s;--delay:${delay.toFixed(2)}s;--dx:${dx}"></i>`;
    }).join("");
  }

  function makePetals(count = 20) {
    return Array.from({ length: count }, () => {
      const x = Math.random() * 100;
      const width = 7 + Math.random() * 9;
      const duration = 7 + Math.random() * 5.5;
      const delay = 1 + Math.random() * 8;
      const dx = `${-70 + Math.random() * 140}px`;
      const rotation = `${180 + Math.random() * 650}deg`;
      return `<i class="ff-cinematic-petal" style="--x:${x.toFixed(2)}%;--w:${width.toFixed(1)}px;--d:${duration.toFixed(2)}s;--delay:${delay.toFixed(2)}s;--dx:${dx};--r:${rotation}"></i>`;
    }).join("");
  }

  function makeMoonlitTrail(count = 17) {
    return Array.from({ length: count }, (_, index) => {
      const size = 11 + (index % 4) * 2.2;
      const delay = 3.05 + index * 0.095;
      const flower = index % 3 === 1 ? " is-flower" : "";
      return `<i class="ff-cinematic-trail-mote${flower}" style="--s:${size.toFixed(1)}px;--delay:${delay.toFixed(2)}s"></i>`;
    }).join("");
  }

  function createCinematic() {
    if (root) return;
    root = document.createElement("section");
    root.className = "ff-cinematic";
    root.id = "forestFriendCinematic";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "숲 유니콘과의 첫 만남");
    root.innerHTML = `
      <div class="ff-cinematic-scene" aria-hidden="true">
        <div class="ff-cinematic-garden-mount"></div>
      </div>
      <div class="ff-cinematic-vignette" aria-hidden="true"></div>
      <div class="ff-cinematic-haze" aria-hidden="true"></div>
      <div class="ff-cinematic-moonbeam" aria-hidden="true"></div>
      <div class="ff-cinematic-tree-aura" aria-hidden="true"></div>
      <span class="ff-cinematic-tree-heart" aria-hidden="true"></span>
      <div class="ff-cinematic-trail" aria-hidden="true">${makeMoonlitTrail()}</div>
      <div class="ff-cinematic-particles" aria-hidden="true">${makeParticles()}</div>
      <div class="ff-cinematic-petals" aria-hidden="true">${makePetals()}</div>
      <div class="ff-cinematic-unicorn-wrap" aria-hidden="true">
        <span class="ff-cinematic-unicorn-glow"></span>
        <span class="ff-cinematic-unicorn-shadow"></span>
        <img class="ff-cinematic-unicorn" src="${WALK_FRAMES[0]}" alt="" />
      </div>
      <div class="ff-cinematic-petal-veil" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <div class="ff-cinematic-copy" aria-live="polite">
        <p class="ff-cinematic-kicker"></p>
        <p class="ff-cinematic-line"></p>
      </div>
      <p class="ff-cinematic-preview-note">DEV · 실제 기록은 바뀌지 않아요</p>
      <button class="ff-cinematic-skip" type="button">건너뛰기</button>
      <div class="ff-cinematic-actions">
        <button class="ff-cinematic-action ff-cinematic-action-secondary" type="button" data-ff-replay>다시 보기</button>
        <button class="ff-cinematic-action ff-cinematic-action-primary" type="button" data-ff-close>인사하기 ♡</button>
      </div>
    `;
    document.body.appendChild(root);
    gardenMount = root.querySelector(".ff-cinematic-garden-mount");
    copyLine = root.querySelector(".ff-cinematic-line");
    copyKicker = root.querySelector(".ff-cinematic-kicker");
    unicornImage = root.querySelector(".ff-cinematic-unicorn");
    root.querySelector(".ff-cinematic-skip")?.addEventListener("click", () => finishCinematic({ skipped: true }));
    root.querySelector("[data-ff-replay]")?.addEventListener("click", () => playCinematic({ mode: "replay" }));
    root.querySelector("[data-ff-close]")?.addEventListener("click", () => { void closeCinematic(); });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") finishCinematic({ skipped: true });
    });
  }

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    window.clearTimeout(resizeTimer);
    resizeTimer = null;
    if (walkInterval) {
      window.clearInterval(walkInterval);
      walkInterval = null;
    }
  }

  function removeCloneIdentity(node) {
    node.removeAttribute?.("id");
    node.querySelectorAll?.("[id]").forEach((element) => element.removeAttribute("id"));
    node.querySelectorAll?.("button, input, textarea, select, a").forEach((element) => {
      element.setAttribute("tabindex", "-1");
      element.setAttribute("aria-hidden", "true");
      element.style.visibility = "hidden";
      element.style.pointerEvents = "none";
    });
  }

  function mountCurrentGarden() {
    if (!gardenMount) return;
    gardenMount.replaceChildren();
    root?.classList.remove("uses-fallback-garden");

    const source = document.getElementById("gardenStage");
    if (!source) {
      root?.classList.add("uses-fallback-garden");
      return;
    }

    const clone = source.cloneNode(true);
    removeCloneIdentity(clone);
    clone.classList.add("ff-cinematic-garden-clone");
    clone.classList.remove("is-garden-decorating");

    clone.querySelectorAll([
      ".stage-topline",
      ".stage-message",
      ".visitor-card",
      ".animal-encounter-card",
      ".special-friend-call-layer",
      ".special-friend-call-hint",
      ".forest-unicorn-preview",
      ".forest-unicorn-arrival",
      ".forest-unicorn-preview-panel",
      ".animal-v2-layer",
      ".animal-v2-trace-layer",
      ".active-animal",
      ".animal-trace",
      ".branch-letters",
      ".heart-fruit-reveal-message",
      ".found-item-hint",
      ".garden-decorate-item-action",
    ].join(",")).forEach((element) => element.remove());

    const treeTarget = clone.querySelector(".tree-wrap");
    treeTarget?.classList.remove(
      "special-friend-progress-1",
      "special-friend-progress-2",
      "special-friend-ready",
      "special-friend-beginning",
      "tree-pulse",
      "wind-active"
    );
    treeTarget?.classList.add("ff-cinematic-tree-target");

    const sourceRect = source.getBoundingClientRect();
    const width = Math.max(320, Math.min(window.innerWidth - 16, sourceRect.width || 640));
    const height = Math.max(480, Math.min(window.innerHeight - 16, sourceRect.height || 630));
    clone.style.width = `${Math.round(width)}px`;
    clone.style.height = `${Math.round(height)}px`;
    clone.style.minHeight = `${Math.round(height)}px`;

    gardenMount.appendChild(clone);
    requestAnimationFrame(() => requestAnimationFrame(positionEffects));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function positionEffects() {
    if (!root?.classList.contains("is-open")) return;
    const tree = root.querySelector(".ff-cinematic-tree-target");
    const treeRect = tree?.getBoundingClientRect();
    if (!treeRect || treeRect.width < 10 || treeRect.height < 10) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const treeX = treeRect.left + treeRect.width / 2;
    const treeHeartY = treeRect.top + treeRect.height * 0.58;
    const treeBaseY = treeRect.bottom - Math.max(8, treeRect.height * 0.035);
    const finalX = clamp(treeX + Math.min(treeRect.width * 0.30, 125), 82, viewportWidth - 76);
    const finalY = clamp(treeBaseY + 5, 220, viewportHeight - 82);
    const startX = clamp(finalX + Math.max(145, viewportWidth * 0.19), 120, viewportWidth - 35);
    const startY = clamp(finalY - Math.max(150, viewportHeight * 0.22), 70, viewportHeight - 230);

    root.style.setProperty("--ff-tree-x", `${treeX.toFixed(1)}px`);
    root.style.setProperty("--ff-tree-heart-y", `${treeHeartY.toFixed(1)}px`);
    root.style.setProperty("--ff-tree-mid-y", `${(treeRect.top + treeRect.height * 0.52).toFixed(1)}px`);
    root.style.setProperty("--ff-tree-aura-w", `${Math.min(treeRect.width * 1.35, viewportWidth * 0.76).toFixed(1)}px`);
    root.style.setProperty("--ff-tree-aura-h", `${Math.min(treeRect.height * 0.92, viewportHeight * 0.66).toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-x", `${finalX.toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-y", `${finalY.toFixed(1)}px`);
    const startDx = startX - finalX;
    const startDy = startY - finalY;
    root.style.setProperty("--ff-unicorn-start-dx", `${startDx.toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-start-dy", `${startDy.toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-dx-78", `${(startDx * 0.78).toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-dy-74", `${(startDy * 0.74).toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-dx-50", `${(startDx * 0.50).toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-dy-44", `${(startDy * 0.44).toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-dx-23", `${(startDx * 0.23).toFixed(1)}px`);
    root.style.setProperty("--ff-unicorn-dy-18", `${(startDy * 0.18).toFixed(1)}px`);
    root.style.setProperty("--ff-moonbeam-height", `${clamp(treeBaseY + 80, viewportHeight * 0.62, viewportHeight * 1.05).toFixed(1)}px`);

    const trail = [...root.querySelectorAll(".ff-cinematic-trail-mote")];
    trail.forEach((mote, index) => {
      const t = trail.length <= 1 ? 0 : index / (trail.length - 1);
      const curve = Math.sin(Math.PI * t);
      const x = treeX + (startX - treeX) * t + curve * Math.min(34, viewportWidth * 0.035);
      const y = treeBaseY + (startY - treeBaseY) * t - curve * Math.min(30, viewportHeight * 0.035);
      mote.style.left = `${x.toFixed(1)}px`;
      mote.style.top = `${y.toFixed(1)}px`;
    });
  }

  function setCopy(item, { immediate = false } = {}) {
    if (!copyLine || !copyKicker) return;
    const apply = () => {
      if (!copyLine || !copyKicker) return;
      copyKicker.textContent = item.kicker;
      copyLine.innerHTML = item.line.replace(/\n/g, "<br />");
      copyLine.classList.add("is-visible");
    };

    copyLine.classList.remove("is-visible");
    if (immediate) {
      apply();
    } else {
      schedule(apply, 210);
    }
  }

  function startWalkingFrames() {
    if (!unicornImage) return;
    walkFrameIndex = 0;
    unicornImage.src = WALK_FRAMES[walkFrameIndex];
    walkInterval = window.setInterval(() => {
      walkFrameIndex = (walkFrameIndex + 1) % WALK_FRAMES.length;
      unicornImage.src = WALK_FRAMES[walkFrameIndex];
    }, 245);
  }

  function stopWalkingFrames() {
    if (walkInterval) {
      window.clearInterval(walkInterval);
      walkInterval = null;
    }
    if (unicornImage) unicornImage.src = IDLE_FRAME;
  }

  function playCinematic(options = {}) {
    createCinematic();
    currentMode = options.mode === "first-meeting"
      ? "first-meeting"
      : (options.mode === "replay" ? "replay" : "preview");
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    clearTimers();
    closeInProgress = false;
    document.body.classList.add("ff-cinematic-lock");
    root.classList.remove("is-running", "is-complete", "is-skipped");
    root.classList.add("is-open");
    root.dataset.mode = currentMode;
    root.dataset.preview = (ffStandalonePreview || ffFriendPreview) ? "true" : "false";
    if (copyLine) copyLine.classList.remove("is-visible");
    if (copyKicker) copyKicker.textContent = "";
    if (unicornImage) unicornImage.src = WALK_FRAMES[0];

    mountCurrentGarden();
    void root.offsetWidth;
    root.classList.add("is-running");

    COPY.forEach((item) => schedule(() => setCopy(item), item.at));
    schedule(startWalkingFrames, 5150);
    schedule(stopWalkingFrames, 9250);
    schedule(() => finishCinematic({ skipped: false }), 11200);
  }

  function finishCinematic({ skipped = false } = {}) {
    if (!root?.classList.contains("is-open")) return;
    clearTimers();
    stopWalkingFrames();
    root.classList.remove("is-running");
    root.classList.toggle("is-skipped", skipped);
    root.classList.add("is-complete");
    setCopy(COPY[COPY.length - 1], { immediate: true });
    root.querySelector("[data-ff-close]")?.focus({ preventScroll: true });
  }

  async function closeCinematic() {
    if (!root || closeInProgress) return;
    closeInProgress = true;
    const primaryButton = root.querySelector("[data-ff-close]");
    const secondaryButton = root.querySelector("[data-ff-replay]");
    const previousLabel = primaryButton?.textContent || "인사하기 ♡";

    if (currentMode === "first-meeting" && typeof window.__todayForestCompleteFirstMeeting === "function") {
      if (primaryButton) {
        primaryButton.disabled = true;
        primaryButton.textContent = "인연을 기억하는 중…";
      }
      if (secondaryButton) secondaryButton.disabled = true;
      try {
        const completed = await window.__todayForestCompleteFirstMeeting();
        if (completed === false) {
          if (primaryButton) {
            primaryButton.disabled = false;
            primaryButton.textContent = previousLabel;
          }
          if (secondaryButton) secondaryButton.disabled = false;
          closeInProgress = false;
          return;
        }
      } catch (error) {
        console.error("TodayForest first-meeting completion error:", error);
        if (primaryButton) {
          primaryButton.disabled = false;
          primaryButton.textContent = previousLabel;
        }
        if (secondaryButton) secondaryButton.disabled = false;
        closeInProgress = false;
        return;
      }
    }

    clearTimers();
    const mode = currentMode;
    root.classList.remove("is-open", "is-running", "is-complete", "is-skipped");
    root.removeAttribute("data-mode");
    document.body.classList.remove("ff-cinematic-lock");
    gardenMount?.replaceChildren();
    if (primaryButton) {
      primaryButton.disabled = false;
      primaryButton.textContent = previousLabel;
    }
    if (secondaryButton) secondaryButton.disabled = false;
    closeInProgress = false;
    window.dispatchEvent(new CustomEvent("todayforest:friend-cinematic-closed", {
      detail: { key: "forest_unicorn", mode },
    }));
    window.setTimeout(() => lastFocusedElement?.focus?.(), 80);
  }

  function handleResize() {
    if (!root?.classList.contains("is-open")) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      mountCurrentGarden();
    }, 120);
  }

  function init() {
    createCinematic();
    window.__todayForestReplayFriendCinematic = (options = {}) => playCinematic({ mode: options.mode || "replay" });
    window.addEventListener("resize", handleResize, { passive: true });
    if (ffStandalonePreview) {
      window.setTimeout(() => playCinematic({ mode: "preview" }), 220);
    } else if (ffFriendPreview && ffFirstMeetingPreview) {
      window.setTimeout(() => playCinematic({ mode: "first-meeting" }), 850);
    }
    window.dispatchEvent(new CustomEvent("todayforest:friend-cinematic-ready", {
      detail: { key: "forest_unicorn" },
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}
