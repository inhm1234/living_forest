/* 오늘의숲 · 함께 키우는 나무 v2 운영 모션 v1.1
   - 실제 growth_version=2 나무에만 적용
   - 돌봄 클릭이 아니라 저장 성공 이후에만 반응
   - 성장 프레임/단계가 바뀔 때 이전 장면과 새 장면을 조용히 교차 전환
   - 화면 비가시/탭 숨김/저사양/reduced-motion 대응 */

const MOTION_ENABLED_CLASS = "shared-tree-motion-enabled";
const MOTION_LITE_CLASS = "shared-tree-motion-lite";
const MOTION_PAUSED_CLASS = "shared-tree-motion-paused";
const OFFSCREEN_CLASS = "shared-tree-motion-offscreen";
const CARE_REACTION_CLASS = "shared-tree-motion-care-reacting";
const GROWTH_PREPARING_CLASS = "shared-tree-growth-preparing";
const GROWTH_TRANSITION_CLASS = "shared-tree-growth-transitioning";
const GROWTH_STAGE_CLASS = "shared-tree-growth-stage-change";
const GROWTH_COMPLETE_CLASS = "shared-tree-growth-complete";
const GROWTH_PREVIOUS_CLASS = "shared-tree-growth-previous";
const GROWTH_MOMENT_CLASS = "shared-tree-growth-moment";

const GROWTH_WILL_CHANGE_EVENT = "todayforest:shared-tree-growth-will-change";
const GROWTH_DID_CHANGE_EVENT = "todayforest:shared-tree-growth-did-change";
const CARE_SAVED_EVENT = "todayforest:shared-tree-care-saved";

let growthCleanupTimer = null;
let careReactionTimer = null;

function isLiteEnvironment() {
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const saveData = Boolean(navigator.connection?.saveData);
  return saveData || (memory > 0 && memory <= 2) || (cores > 0 && cores <= 2);
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
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

function growthFrameLeft(frame) {
  const safeFrame = Math.min(2, Math.max(0, Number(frame || 0)));
  return `${safeFrame * -100}%`;
}

function ensureGrowthMomentLayer(view) {
  const stage = view?.querySelector(".shared-tree-stage");
  if (!stage) return null;
  let layer = stage.querySelector(`.${GROWTH_MOMENT_CLASS}`);
  if (layer) return layer;

  layer = document.createElement("div");
  layer.className = GROWTH_MOMENT_CLASS;
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = "<i></i><i></i><i></i><i></i><i></i>";
  stage.appendChild(layer);
  return layer;
}

function clearGrowthTransition(view) {
  if (!view) return;
  if (growthCleanupTimer !== null) {
    window.clearTimeout(growthCleanupTimer);
    growthCleanupTimer = null;
  }
  view.classList.remove(
    GROWTH_PREPARING_CLASS,
    GROWTH_TRANSITION_CLASS,
    GROWTH_STAGE_CLASS,
    GROWTH_COMPLETE_CLASS,
  );
  view.querySelectorAll(`.${GROWTH_PREVIOUS_CLASS}`).forEach((node) => node.remove());
}

function canPlayMoment(view) {
  return Boolean(
    view
    && !document.hidden
    && !view.classList.contains("hidden")
    && !prefersReducedMotion()
  );
}

function prepareGrowthTransition(view, detail) {
  if (!canPlayMoment(view)) return;
  const plant = view.querySelector(".shared-tree-plant");
  const currentImage = view.querySelector(".shared-tree-image");
  const previous = detail?.previous;
  if (!plant || !currentImage || !previous?.src) return;

  clearGrowthTransition(view);
  ensureGrowthMomentLayer(view);

  const previousImage = document.createElement("img");
  previousImage.className = GROWTH_PREVIOUS_CLASS;
  previousImage.alt = "";
  previousImage.setAttribute("aria-hidden", "true");
  previousImage.src = previous.src;
  previousImage.style.left = growthFrameLeft(previous.frame);
  plant.appendChild(previousImage);

  view.classList.toggle(GROWTH_STAGE_CLASS, Boolean(detail?.stageChanged));
  view.classList.toggle(GROWTH_COMPLETE_CLASS, Boolean(detail?.completed));
  view.classList.add(GROWTH_PREPARING_CLASS);
}

function playGrowthTransition(view, detail) {
  if (!canPlayMoment(view)) {
    clearGrowthTransition(view);
    return;
  }

  const previousImage = view.querySelector(`.${GROWTH_PREVIOUS_CLASS}`);
  if (!previousImage) return;

  view.classList.toggle(GROWTH_STAGE_CLASS, Boolean(detail?.stageChanged));
  view.classList.toggle(GROWTH_COMPLETE_CLASS, Boolean(detail?.completed));

  // 준비 상태에서 새 장면을 숨긴 뒤, 다음 프레임에 교차 전환을 시작합니다.
  void view.offsetWidth;
  view.classList.add(GROWTH_TRANSITION_CLASS);
  view.classList.remove(GROWTH_PREPARING_CLASS);

  const duration = detail?.stageChanged ? 1120 : 900;
  growthCleanupTimer = window.setTimeout(() => clearGrowthTransition(view), duration);
}

function playSavedCareReaction(view) {
  if (!canPlayMoment(view)) return;
  if (careReactionTimer !== null) window.clearTimeout(careReactionTimer);
  view.classList.remove(CARE_REACTION_CLASS);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => view.classList.add(CARE_REACTION_CLASS));
  });
  careReactionTimer = window.setTimeout(() => {
    view.classList.remove(CARE_REACTION_CLASS);
    careReactionTimer = null;
  }, 900);
}

function installCareAndGrowthReactions(view) {
  if (!view) return;

  view.addEventListener(GROWTH_WILL_CHANGE_EVENT, (event) => {
    prepareGrowthTransition(view, event.detail || {});
  });

  view.addEventListener(GROWTH_DID_CHANGE_EVENT, (event) => {
    playGrowthTransition(view, event.detail || {});
  });

  view.addEventListener(CARE_SAVED_EVENT, (event) => {
    if (event.detail?.visualChanged) return;
    playSavedCareReaction(view);
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
  installCareAndGrowthReactions(view);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSharedTreeMotion, { once: true });
} else {
  initSharedTreeMotion();
}
