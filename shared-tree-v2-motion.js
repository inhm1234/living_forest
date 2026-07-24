/* 오늘의숲 · 함께 키우는 나무 v2 운영 모션 v1.0
   - 실제 growth_version=2 나무에만 적용
   - 화면 비가시/탭 숨김/저사양/reduced-motion 대응 */

const MOTION_ENABLED_CLASS = "shared-tree-motion-enabled";
const MOTION_LITE_CLASS = "shared-tree-motion-lite";
const MOTION_PAUSED_CLASS = "shared-tree-motion-paused";
const OFFSCREEN_CLASS = "shared-tree-motion-offscreen";
const CARE_REACTION_CLASS = "shared-tree-motion-care-reacting";

function isLiteEnvironment() {
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const saveData = Boolean(navigator.connection?.saveData);
  return saveData || (memory > 0 && memory <= 2) || (cores > 0 && cores <= 2);
}

function setDocumentMotionState() {
  document.documentElement.classList.toggle(MOTION_PAUSED_CLASS, document.hidden);
}

function installVisibilityPause(view) {
  if (!("IntersectionObserver" in window) || !view) return null;

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    view.classList.toggle(OFFSCREEN_CLASS, !entry?.isIntersecting);
  }, { threshold: 0.08 });

  observer.observe(view);
  return observer;
}

function installCareReaction(view) {
  if (!view) return;

  let timer = null;
  view.addEventListener("click", (event) => {
    const button = event.target.closest("[data-v2-care-type], [data-v2-choice]");
    if (!button || button.disabled) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    view.classList.remove(CARE_REACTION_CLASS);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        view.classList.add(CARE_REACTION_CLASS);
      });
    });

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      view.classList.remove(CARE_REACTION_CLASS);
    }, 900);
  });
}

function initSharedTreeMotion() {
  const root = document.documentElement;
  root.classList.add(MOTION_ENABLED_CLASS);
  root.classList.toggle(MOTION_LITE_CLASS, isLiteEnvironment());

  setDocumentMotionState();
  document.addEventListener("visibilitychange", setDocumentMotionState);

  const view = document.querySelector("#sharedTreeView");
  if (!view) return;

  installVisibilityPause(view);
  installCareReaction(view);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSharedTreeMotion, { once: true });
} else {
  initSharedTreeMotion();
}
