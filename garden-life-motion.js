/* 오늘의숲 · 살아 있는 정원 모션 v0.3
   나무를 계속 위아래로 흔들지 않습니다.
   성장 단계별로 가끔 옆바람에 반응하고, 나머지 생명감은 하늘·빛·동물·장식이 나눠 가집니다. */

const LIFE_LAYER_ID = "gardenAmbientLayer";
const MAX_AMBIENT_PARTICLES = 1;

const STAGE_PROFILES = {
  1: { lightMinDelay: 13000, lightMaxDelay: 21000, breezeMinDelay: 6500, breezeMaxDelay: 10500, breezeDuration: 2050, xMin: .30, xMax: .72, yMin: .50, yMax: .82 },
  2: { lightMinDelay: 12000, lightMaxDelay: 19000, breezeMinDelay: 7000, breezeMaxDelay: 11500, breezeDuration: 2150, xMin: .27, xMax: .75, yMin: .34, yMax: .74 },
  3: { lightMinDelay: 10000, lightMaxDelay: 17000, breezeMinDelay: 7600, breezeMaxDelay: 12500, breezeDuration: 2250, xMin: .29, xMax: .74, yMin: .22, yMax: .72 },
  4: { lightMinDelay: 9000, lightMaxDelay: 15500, breezeMinDelay: 8200, breezeMaxDelay: 13500, breezeDuration: 2350, xMin: .22, xMax: .80, yMin: .16, yMax: .68 },
  5: { lightMinDelay: 8000, lightMaxDelay: 14000, breezeMinDelay: 9000, breezeMaxDelay: 14500, breezeDuration: 2550, xMin: .18, xMax: .84, yMin: .13, yMax: .65 },
  6: { lightMinDelay: 7500, lightMaxDelay: 13500, breezeMinDelay: 9500, breezeMaxDelay: 15500, breezeDuration: 2700, xMin: .18, xMax: .84, yMin: .12, yMax: .64 },
};

const TREE_CONFLICT_CLASSES = [
  "wind-active",
  "tree-pulse",
  "is-tree-call-tapped",
  "is-tree-call-sending",
  "is-heart-fruit-revealing",
];

let lightTimer = null;
let breezeTimer = null;
let breezeCleanupTimer = null;
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

function treeCanTakeAmbientMotion(tree) {
  if (!tree) return false;
  return !TREE_CONFLICT_CLASSES.some((className) => tree.classList.contains(className));
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

  if (changed) restartAmbientMotion();
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

function triggerTreeBreeze() {
  const stage = document.querySelector("#gardenStage");
  const tree = document.querySelector("#treeWrap");
  if (!stage || !tree || !gardenIsVisible(stage)) return;
  if (reducedMotionQuery?.matches || !treeCanTakeAmbientMotion(tree)) return;

  const profile = STAGE_PROFILES[activeStage] || STAGE_PROFILES[1];
  tree.classList.remove("garden-life-breeze");
  void tree.offsetWidth;
  tree.classList.add("garden-life-breeze");

  window.clearTimeout(breezeCleanupTimer);
  breezeCleanupTimer = window.setTimeout(() => {
    tree.classList.remove("garden-life-breeze");
  }, profile.breezeDuration + 120);
}

function scheduleTreeLight() {
  window.clearTimeout(lightTimer);
  const profile = STAGE_PROFILES[activeStage] || STAGE_PROFILES[1];
  lightTimer = window.setTimeout(() => {
    createTreeLight();
    scheduleTreeLight();
  }, randomBetween(profile.lightMinDelay, profile.lightMaxDelay));
}

function scheduleTreeBreeze() {
  window.clearTimeout(breezeTimer);
  const profile = STAGE_PROFILES[activeStage] || STAGE_PROFILES[1];
  breezeTimer = window.setTimeout(() => {
    triggerTreeBreeze();
    scheduleTreeBreeze();
  }, randomBetween(profile.breezeMinDelay, profile.breezeMaxDelay));
}

function stopAmbientMotion() {
  window.clearTimeout(lightTimer);
  window.clearTimeout(breezeTimer);
  window.clearTimeout(breezeCleanupTimer);
  lightTimer = null;
  breezeTimer = null;
  breezeCleanupTimer = null;
  document.querySelector("#treeWrap")?.classList.remove("garden-life-breeze");
}

function restartAmbientMotion() {
  stopAmbientMotion();
  document.querySelectorAll(".garden-ambient-particle").forEach((particle) => particle.remove());
  if (document.hidden || reducedMotionQuery?.matches) return;
  scheduleTreeLight();
  scheduleTreeBreeze();
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
  reducedMotionQuery?.addEventListener?.("change", restartAmbientMotion);
  document.addEventListener("visibilitychange", restartAmbientMotion);
  window.addEventListener("pageshow", () => {
    syncTreeStage();
    restartAmbientMotion();
  });
  window.addEventListener("pagehide", stopAmbientMotion);

  restartAmbientMotion();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGardenLifeMotion, { once: true });
} else {
  initGardenLifeMotion();
}
