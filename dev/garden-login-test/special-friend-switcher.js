/* -------------------------------------------------------------------------
   SPECIAL FOREST FRIEND SWITCHER v2
   DEV 전용: 특별 숲친구 미리보기 화면에서 유니콘 / 작은 빛 용을 바로 전환합니다.
   - 실제 편지, 배송 RPC, 친구·동물 방문 상태는 변경하지 않습니다.
   - 로그인·정원 초기화가 끝난 뒤 미리보기 패널이 늦게 만들어져도 MutationObserver로 기다립니다.
   ------------------------------------------------------------------------- */
(() => {
  const params = new URLSearchParams(window.location.search);
  const activeMode = params.get("forestFriendPreview");

  if (activeMode !== "1" && activeMode !== "light-dragon") return;
  if (!/\/dev(?:\/|$)/.test(window.location.pathname)) return;

  const friends = [
    { value: "1", icon: "🦄", shortLabel: "유니콘" },
    { value: "light-dragon", icon: "🐲", shortLabel: "작은 빛 용" },
  ];

  const anchorSelector = activeMode === "1"
    ? ".forest-unicorn-preview-panel"
    : ".little-light-dragon-preview-panel";

  let observer = null;

  function stopWatching() {
    observer?.disconnect();
    observer = null;
  }

  function mountSwitcher() {
    if (document.querySelector(".special-friend-switcher")) return true;

    const anchor = document.querySelector(anchorSelector);
    if (!anchor) return false;

    const current = friends.find((friend) => friend.value === activeMode) || friends[0];
    const switcher = document.createElement("section");
    switcher.className = "special-friend-switcher";
    switcher.setAttribute("aria-label", "특별 숲친구 빠른 전환");
    switcher.innerHTML = `
      <div class="special-friend-switcher-head">
        <div>
          <p class="special-friend-switcher-kicker">DEV QUICK SWITCH</p>
          <strong>특별 숲친구 빠른 전환</strong>
        </div>
        <span class="special-friend-switcher-current" aria-label="현재 선택된 친구">${current.icon} ${current.shortLabel}</span>
      </div>
      <div class="special-friend-switcher-actions" role="group" aria-label="미리보기 친구 고르기">
        ${friends.map((friend) => `
          <button
            type="button"
            class="${friend.value === activeMode ? "is-active" : ""}"
            data-special-friend-preview="${friend.value}"
            aria-pressed="${friend.value === activeMode ? "true" : "false"}"
          >
            <span aria-hidden="true">${friend.icon}</span>${friend.shortLabel} 보기
          </button>
        `).join("")}
      </div>
      <p class="special-friend-switcher-note">버튼을 누르면 실제 데이터는 건드리지 않고, 이 DEV 정원에서 친구 모습만 바꿔 보여줘요.</p>
    `;

    switcher.querySelectorAll("[data-special-friend-preview]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextMode = button.dataset.specialFriendPreview;
        if (!nextMode || nextMode === activeMode) return;

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("forestFriendPreview", nextMode);
        window.location.assign(nextUrl.toString());
      });
    });

    anchor.insertAdjacentElement("afterend", switcher);
    stopWatching();
    return true;
  }

  function watchForAnchor() {
    if (mountSwitcher()) return;

    observer = new MutationObserver(() => {
      mountSwitcher();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 드물게 패널이 렌더된 직후 바로 붙는 경우까지 한 번 더 확인합니다.
    window.setTimeout(mountSwitcher, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchForAnchor, { once: true });
  } else {
    watchForAnchor();
  }
})();
