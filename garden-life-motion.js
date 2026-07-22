/* 오늘의숲 · 살아 있는 정원 모션 v0.2
   성장 단계에 따라 정원의 호흡을 다르게 적용합니다.
   원칙: 낙엽은 기본 상시 효과에서 제거하고, 나무의 현재 성장 단계에 맞는 미세 모션만 사용합니다. */

const LIFE_LAYER_ID = "gardenAmbientLayer";
const MAX_AMBIENT_PARTICLES = 1;

const STAGE_PROFILES = {
  1: { lightMinDelay: 13000, lightMaxDelay: 21000, xMin: .30, xMax: .72, yMin: .50, yMax: .82 },
  2: { lightMinDelay: 12000, lightMaxDelay: 19000, xMin: .27, xMax: .75, yMin: .34, yMax: .74 },
  3: { lightMinDelay: 10000, lightMaxDelay: 17000, xMin: .29, xMax: .74, yMin: .22, yMax: .72 },
  4: { lightMinDelay: 9000, lightMaxDelay: 15500, xMin: .22, xMax: .80, yMin: .16, yMax: .68 },
  5: { lightMinDelay: 8000, lightMaxDelay: 14000, xMin: .18, xMax: .84, yMin: .13, yMax: .65 },
  6: { lightMinDelay: 7500, lightMaxDelay: 13500, xMin: .18, xMax: .84, yMin: .12, yMax: .64 },
};

let lightTimer = null;
let reducedMotionQuery = null;
let treeObserver = null;
let activeStage = 1;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clampStage(value) {
  const stage = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(stage) ? Math.min(6, Math.max(1, stage)) : 1;
}

function stageFromTreeImage(treeImage) {
  const source = treeImage?.getAttribute("src") || treeImage?.currentSrc || "";
  const match = source.match(/tree_stage([1-6])_/i);
  return clampStage(match?.[1]);
}

function gardenIsVisible(stage) {
  if (!stage || document.hidden) return false;
  const app = stage.closest("#gardenApp");
  return Boolean(app && !app.classList.contains("hidden"));
}

function ensureAmbientLayer() {
  const world = document.querySelector("#gardenWorld");
  if (!world) return null;
  let layer = world.querySelector(`#${LIFE_LAYER_ID}`);
  if (layer) return layer;

  layer = document.createElement("div");
  layer.id = LIFE_LAYER_ID;
  layer.className = "garden-ambient-layer";
  layer.setAttribute("aria-hidden", "true");
  world.appendChild(layer);
  return layer;
}

function activeParticleCount(layer) {
  return layer?.querySelectorAll(".garden-ambient-particle").length || 0;
}

function syncTreeStage() {
  const stage = document.querySelector("#gardenStage");
  const treeWrap = document.querySelector("#treeWrap");
  const treeImage = document.querySelector("#treeImage");
  if (!stage || !treeWrap || !treeImage) return;

  const nextStage = stageFromTreeImage(treeImage);
  const changed = nextStage !== activeStage;
  activeStage = nextStage;

  stage.dataset.treeStage = String(nextStage);
  treeWrap.dataset.treeStage = String(nextStage);

  if (changed) restartAmbientTimer();
}

function createTreeLight() {
  const stage = document.querySelector("#gardenStage");
  const world = document.querySelector("#gardenWorld");
  const tree = document.querySelector("#treeWrap");
  const layer = ensureAmbientLayer();
  if (!stage || !world || !tree || !layer || !gardenIsVisible(stage)) return;
  if (reducedMotionQuery?.matches) return;
  if (activeParticleCount(layer) >= MAX_AMBIENT_PARTICLES) return;

  const profile = STAGE_PROFILES[activeStage] || STAGE_PROFILES[1];
  const worldRect = world.getBoundingClientRect();
  const treeRect = tree.getBoundingClientRect();
  const scaleX = world.offsetWidth ? worldRect.width / world.offsetWidth : 1;
  const scaleY = world.offsetHeight ? worldRect.height / world.offsetHeight : 1;
  if (!scaleX || !scaleY) return;

  const treeLeft = (treeRect.left - worldRect.left) / scaleX;
  const treeTop = (treeRect.top - worldRect.top) / scaleY;
  const treeWidth = treeRect.width / scaleX;
  const treeHeight = treeRect.height / scaleY;

  const particle = document.createElement("i");
  particle.className = `garden-ambient-particle is-light is-stage-${activeStage}`;
  particle.style.left = `${treeLeft + treeWidth * randomBetween(profile.xMin, profile.xMax)}px`;
  particle.style.top = `${treeTop + treeHeight * randomBetween(profile.yMin, profile.yMax)}px`;
  particle.style.setProperty("--life-duration", `${randomBetween(4.4, 6.3).toFixed(2)}s`);
  particle.style.setProperty("--life-drift-mid", `${randomBetween(-10, 11).toFixed(1)}px`);
  particle.style.setProperty("--life-drift-end", `${randomBetween(-16, 18).toFixed(1)}px`);
  particle.style.setProperty("--life-rise-end", `${randomBetween(-23, -34).toFixed(1)}px`);
  particle.style.scale = randomBetween(.74, activeStage >= 5 ? 1.05 : .92).toFixed(2);

  particle.addEventListener("animationend", () => particle.remove(), { once: true });
  layer.appendChild(particle);
}

function scheduleTreeLight() {
  window.clearTimeout(lightTimer);
  const profile = STAGE_PROFILES[activeStage] || STAGE_PROFILES[1];
  lightTimer = window.setTimeout(() => {
    createTreeLight();
    scheduleTreeLight();
  }, randomBetween(profile.lightMinDelay, profile.lightMaxDelay));
}

function stopAmbientTimer() {
  window.clearTimeout(lightTimer);
  lightTimer = null;
}

function restartAmbientTimer() {
  stopAmbientTimer();
  document.querySelectorAll(".garden-ambient-particle").forEach((particle) => particle.remove());
  if (document.hidden || reducedMotionQuery?.matches) return;
  scheduleTreeLight();
}

function initGardenLifeMotion() {
  const stage = document.querySelector("#gardenStage");
  const treeImage = document.querySelector("#treeImage");
  if (!stage || !treeImage) return;

  stage.classList.add("garden-life-enabled");
  ensureAmbientLayer();
  syncTreeStage();

  treeObserver = new MutationObserver(syncTreeStage);
  treeObserver.observe(treeImage, { attributes: true, attributeFilter: ["src"] });

  reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  reducedMotionQuery?.addEventListener?.("change", restartAmbientTimer);
  document.addEventListener("visibilitychange", restartAmbientTimer);
  window.addEventListener("pageshow", () => {
    syncTreeStage();
    restartAmbientTimer();
  });
  window.addEventListener("pagehide", stopAmbientTimer);

  restartAmbientTimer();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGardenLifeMotion, { once: true });
} else {
  initGardenLifeMotion();
}
