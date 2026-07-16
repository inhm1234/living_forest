/* -------------------------------------------------------------------------
   SPECIAL FOREST FRIEND CINEMATIC PREVIEW v0.1
   ?forestFriendCinematic=1 을 붙였을 때만 실행됩니다.
   검수 전용이며 DB/로그인/특별친구 보유 상태를 변경하지 않습니다.
   ------------------------------------------------------------------------- */
const ffCinematicParams = new URLSearchParams(window.location.search);
const ffCinematicEnabled = ffCinematicParams.get("forestFriendCinematic") === "1";

if (ffCinematicEnabled) {
  const COPY = [
    { at: 350, kicker: "A QUIET FOREST NIGHT", line: "숲이 잠시 고요해지고,\n나무가 조용히 빛나기 시작했어요." },
    { at: 1900, kicker: "THE TREE REMEMBERS", line: "나무가 기억한 따뜻한 마음들이\n하나둘 빛으로 모여요." },
    { at: 3650, kicker: "A PATH OF HEARTS", line: "모인 빛이 숲길을 만들고,\n누군가를 이곳으로 이끌고 있어요." },
    { at: 5550, kicker: "SOMEONE IS COMING", line: "저 멀리, 특별한 친구의 모습이\n조금씩 보이기 시작했어요." },
    { at: 7600, kicker: "OUR FIRST MEETING", line: "네가 숲에 남긴 마음을 따라\n내가 여기까지 왔어." },
    { at: 9550, kicker: "A NEW FOREST FRIEND", line: "오늘부터 숲 유니콘은\n당신과 함께할 특별한 친구예요." },
  ];

  let root = null;
  let copyLine = null;
  let copyKicker = null;
  let timers = [];
  let completeTimer = null;

  function makeParticles(count = 34) {
    return Array.from({ length: count }, (_, index) => {
      const x = 12 + Math.random() * 76;
      const y = 35 + Math.random() * 54;
      const size = 3 + Math.random() * 7;
      const duration = 2.7 + Math.random() * 3.2;
      const delay = 1.8 + Math.random() * 7.5;
      const dx = `${-28 + Math.random() * 56}px`;
      return `<i class="ff-cinematic-particle" style="--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%;--s:${size.toFixed(1)}px;--d:${duration.toFixed(2)}s;--delay:${delay.toFixed(2)}s;--dx:${dx}"></i>`;
    }).join("");
  }

  function makePetals(count = 18) {
    return Array.from({ length: count }, () => {
      const x = Math.random() * 100;
      const width = 7 + Math.random() * 9;
      const duration = 6.5 + Math.random() * 5.5;
      const delay = 1.1 + Math.random() * 7.2;
      const dx = `${-70 + Math.random() * 140}px`;
      const rotation = `${180 + Math.random() * 650}deg`;
      return `<i class="ff-cinematic-petal" style="--x:${x.toFixed(2)}%;--w:${width.toFixed(1)}px;--d:${duration.toFixed(2)}s;--delay:${delay.toFixed(2)}s;--dx:${dx};--r:${rotation}"></i>`;
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
      <svg class="ff-cinematic-path" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="ffPathGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#d8d8ff" stop-opacity="0" />
            <stop offset="22%" stop-color="#efc9ff" stop-opacity=".94" />
            <stop offset="58%" stop-color="#fff0b5" stop-opacity="1" />
            <stop offset="100%" stop-color="#fff8dd" stop-opacity=".98" />
          </linearGradient>
        </defs>
        <path class="ff-cinematic-path-soft" d="M 930 92 C 820 145, 825 242, 720 278 S 620 337, 555 382 S 515 426, 500 478" />
        <path class="ff-cinematic-path-main" d="M 930 92 C 820 145, 825 242, 720 278 S 620 337, 555 382 S 515 426, 500 478" />
      </svg>
      <div class="ff-cinematic-particles" aria-hidden="true">${makeParticles()}</div>
      <div class="ff-cinematic-petals" aria-hidden="true">${makePetals()}</div>
      <div class="ff-cinematic-unicorn-wrap" aria-hidden="true">
        <span class="ff-cinematic-unicorn-glow"></span>
        <span class="ff-cinematic-unicorn-shadow"></span>
        <img class="ff-cinematic-unicorn" src="../../assets/friends/forest-unicorn-idle.png" alt="" />
      </div>
      <div class="ff-cinematic-flash" aria-hidden="true"></div>
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
    root.querySelector(".ff-cinematic-skip")?.addEventListener("click", finishCinematic);
    root.querySelector("[data-ff-replay]")?.addEventListener("click", playCinematic);
    root.querySelector("[data-ff-close]")?.addEventListener("click", closeCinematic);
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCinematic();
    });
  }

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
    window.clearTimeout(completeTimer);
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

  function playCinematic() {
    createCinematic();
    clearTimers();
    document.body.classList.add("ff-cinematic-lock");
    root.classList.remove("is-running", "is-complete");
    root.classList.add("is-open");
    if (copyLine) copyLine.classList.remove("is-visible");
    void root.offsetWidth;
    root.classList.add("is-running");
    COPY.forEach((item) => timers.push(window.setTimeout(() => setCopy(item), item.at)));
    completeTimer = window.setTimeout(() => root?.classList.add("is-complete"), 10850);
  }

  function finishCinematic() {
    if (!root) return;
    clearTimers();
    setCopy(COPY[COPY.length - 1]);
    root.classList.add("is-complete");
  }

  function closeCinematic() {
    if (!root) return;
    clearTimers();
    root.classList.remove("is-open", "is-running", "is-complete");
    document.body.classList.remove("ff-cinematic-lock");
  }

  function init() {
    createCinematic();
    window.setTimeout(playCinematic, 220);
    window.__todayForestReplayFriendCinematic = playCinematic;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}
