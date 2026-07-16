/* -------------------------------------------------------------------------
   SPECIAL FOREST FRIEND CINEMATIC PREVIEW v0.3
   ?forestFriendCinematic=1 또는 ?forestFriendPreview=1 에서 준비됩니다.
   검수 전용이며 DB/로그인/특별친구 보유 상태를 변경하지 않습니다.

   v0.2
   - 전기처럼 보이던 SVG 빛줄기를 제거했습니다.
   - 꽃잎과 둥근 빛방울이 차례로 피어나는 '달빛 길'로 교체했습니다.
   - 기존 숲 유니콘 걷기 4프레임을 사용해 실제로 다가오는 느낌을 냈습니다.
   - 유니콘은 처음부터 멀리 보이며, 투명해졌다가 갑자기 나타나지 않습니다.
   ------------------------------------------------------------------------- */
const ffCinematicParams = new URLSearchParams(window.location.search);
const ffStandalonePreview = ffCinematicParams.get("forestFriendCinematic") === "1";
const ffFriendPreview = ffCinematicParams.get("forestFriendPreview") === "1";
const ffFirstMeetingPreview = ffCinematicParams.get("firstMeeting") === "1";
const ffCinematicEnabled = true;

if (ffCinematicEnabled) {
  const COPY = [
    { at: 350, kicker: "A QUIET FOREST NIGHT", line: "숲이 잠시 고요해지고,\n나무가 조용히 빛나기 시작했어요." },
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
  let copyLine = null;
  let copyKicker = null;
  let unicornImage = null;
  let timers = [];
  let completeTimer = null;
  let walkInterval = null;
  let walkFrameIndex = 0;
  let currentMode = "preview";
  let lastFocusedElement = null;
  let closeInProgress = false;

  function makeParticles(count = 30) {
    return Array.from({ length: count }, () => {
      const x = 10 + Math.random() * 80;
      const y = 34 + Math.random() * 56;
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

  function makeMoonlitTrail() {
    const points = [
      [49, 80], [50, 77], [52, 74], [53, 71], [55, 68], [57, 65],
      [59, 63], [62, 61], [65, 59], [68, 57], [71, 55], [74, 52],
      [76, 49], [78, 46], [79, 43], [80, 40],
    ];

    return points.map(([x, y], index) => {
      const size = 12 + (index % 4) * 2.2;
      const delay = 3.05 + index * 0.095;
      const flower = index % 3 === 1 ? " is-flower" : "";
      return `<i class="ff-cinematic-trail-mote${flower}" style="--x:${x}%;--y:${y}%;--s:${size.toFixed(1)}px;--delay:${delay.toFixed(2)}s"></i>`;
    }).join("");
  }

  function createCinematic() {
    if (root) return;
    root = document.createElement("section");
    root.className = "ff-cinematic";
    root.id = "forestFriendCinematic";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "숲 유니콘 첫 등장 미리보기");
    root.innerHTML = `
      <div class="ff-cinematic-scene" aria-hidden="true"></div>
      <div class="ff-cinematic-vignette" aria-hidden="true"></div>
      <div class="ff-cinematic-haze" aria-hidden="true"></div>
      <div class="ff-cinematic-moonbeam" aria-hidden="true"></div>
      <div class="ff-cinematic-tree-aura" aria-hidden="true"></div>
      <div class="ff-cinematic-tree" aria-hidden="true">
        <img src="../../assets/garden/tree_growth/tree_stage6_night.png" alt="" />
        <span class="ff-cinematic-tree-heart"></span>
      </div>
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
    copyLine = root.querySelector(".ff-cinematic-line");
    copyKicker = root.querySelector(".ff-cinematic-kicker");
    unicornImage = root.querySelector(".ff-cinematic-unicorn");
    root.querySelector(".ff-cinematic-skip")?.addEventListener("click", finishCinematic);
    root.querySelector("[data-ff-replay]")?.addEventListener("click", () => playCinematic({ mode: "replay" }));
    root.querySelector("[data-ff-close]")?.addEventListener("click", () => { void closeCinematic(); });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCinematic();
    });
  }

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
    window.clearTimeout(completeTimer);
    if (walkInterval) {
      window.clearInterval(walkInterval);
      walkInterval = null;
    }
  }

  function setCopy(item) {
    if (!copyLine || !copyKicker) return;
    copyLine.classList.remove("is-visible");
    window.setTimeout(() => {
      if (!copyLine || !copyKicker) return;
      copyKicker.textContent = item.kicker;
      copyLine.innerHTML = item.line.replace(/\n/g, "<br />");
      copyLine.classList.add("is-visible");
    }, 210);
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
    currentMode = options.mode === "first-meeting" ? "first-meeting" : (options.mode === "replay" ? "replay" : "preview");
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    clearTimers();
    document.body.classList.add("ff-cinematic-lock");
    root.classList.remove("is-running", "is-complete");
    root.classList.add("is-open");
    if (copyLine) copyLine.classList.remove("is-visible");
    if (unicornImage) unicornImage.src = WALK_FRAMES[0];
    void root.offsetWidth;
    root.dataset.mode = currentMode;
    root.dataset.preview = (ffStandalonePreview || ffFriendPreview) ? "true" : "false";
    root.classList.add("is-running");
    COPY.forEach((item) => timers.push(window.setTimeout(() => setCopy(item), item.at)));
    timers.push(window.setTimeout(startWalkingFrames, 5150));
    timers.push(window.setTimeout(stopWalkingFrames, 9250));
    completeTimer = window.setTimeout(() => root?.classList.add("is-complete"), 11200);
  }

  function finishCinematic() {
    if (!root) return;
    clearTimers();
    stopWalkingFrames();
    setCopy(COPY[COPY.length - 1]);
    root.classList.add("is-complete");
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
    root.classList.remove("is-open", "is-running", "is-complete");
    root.removeAttribute("data-mode");
    document.body.classList.remove("ff-cinematic-lock");
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

  function init() {
    createCinematic();
    window.__todayForestReplayFriendCinematic = (options = {}) => playCinematic({ mode: options.mode || "replay" });
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
