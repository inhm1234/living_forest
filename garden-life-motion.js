/* 오늘의숲 · 살아 있는 정원 모션 v0.1.1
   CSS 상시 모션에 더해, 드문 잎/빛 사건만 가볍게 생성합니다.
   v0.1.1: 낙엽이 하늘이 아니라 실제 나무 수관에서 시작하도록 좌표를 보정합니다. */

const LIFE_LAYER_ID = "gardenAmbientLayer";
const MAX_AMBIENT_PARTICLES = 2;
const LEAF_MIN_DELAY = 9000;
const LEAF_MAX_DELAY = 15500;
const LIGHT_MIN_DELAY = 6500;
const LIGHT_MAX_DELAY = 12000;

let leafTimer = null;
let lightTimer = null;
let reducedMotionQuery = null;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
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

function createParticle(kind) {
  const stage = document.querySelector("#gardenStage");
  const layer = ensureAmbientLayer();
  if (!stage || !layer || !gardenIsVisible(stage)) return;
  if (reducedMotionQuery?.matches) return;
  if (activeParticleCount(layer) >= MAX_AMBIENT_PARTICLES) return;

  // 비 오는 날은 빗방울 자체가 충분한 생명감을 가지므로 잎 사건을 줄입니다.
  if (kind === "leaf" && stage.classList.contains("weather-rain") && Math.random() < .78) return;

  const particle = document.createElement("i");
  particle.className = `garden-ambient-particle is-${kind}`;

  if (kind === "leaf") {
    const world = document.querySelector("#gardenWorld");
    const tree = document.querySelector("#treeWrap");
    if (!world || !tree) return;

    // 화면 전체의 맨 위가 아니라, 실제 나무 수관 안에서 잎이 떨어지기 시작합니다.
    // gardenWorld에는 scale 변환이 있으므로 화면 좌표를 로컬 좌표로 되돌립니다.
    const worldRect = world.getBoundingClientRect();
    const treeRect = tree.getBoundingClientRect();
    const scaleX = world.offsetWidth ? worldRect.width / world.offsetWidth : 1;
    const scaleY = world.offsetHeight ? worldRect.height / world.offsetHeight : 1;
    if (!scaleX || !scaleY) return;

    const treeLeft = (treeRect.left - worldRect.left) / scaleX;
    const treeTop = (treeRect.top - worldRect.top) / scaleY;
    const treeWidth = treeRect.width / scaleX;
    const treeHeight = treeRect.height / scaleY;
    const fallEnd = randomBetween(185, 245);

    particle.style.left = `${treeLeft + treeWidth * randomBetween(.22, .78)}px`;
    particle.style.top = `${treeTop + treeHeight * randomBetween(.10, .34)}px`;
    particle.style.setProperty("--life-duration", `${randomBetween(4.9, 6.5).toFixed(2)}s`);
    particle.style.setProperty("--life-drift-mid", `${randomBetween(-18, 20).toFixed(1)}px`);
    particle.style.setProperty("--life-drift-end", `${randomBetween(-30, 34).toFixed(1)}px`);
    particle.style.setProperty("--life-fall-mid", `${(fallEnd * .43).toFixed(1)}px`);
    particle.style.setProperty("--life-fall-end", `${fallEnd.toFixed(1)}px`);
    particle.style.scale = randomBetween(.72, 1.02).toFixed(2);
  } else {
    particle.style.left = `${randomBetween(24, 76).toFixed(1)}%`;
    particle.style.top = `${randomBetween(30, 68).toFixed(1)}%`;
    particle.style.setProperty("--life-duration", `${randomBetween(4.2, 6.1).toFixed(2)}s`);
    particle.style.setProperty("--life-drift-mid", `${randomBetween(-14, 15).toFixed(1)}px`);
    particle.style.setProperty("--life-drift-end", `${randomBetween(-20, 22).toFixed(1)}px`);
  }

  particle.addEventListener("animationend", () => particle.remove(), { once: true });
  layer.appendChild(particle);
}

function scheduleLeaf() {
  window.clearTimeout(leafTimer);
  leafTimer = window.setTimeout(() => {
    createParticle("leaf");
    scheduleLeaf();
  }, randomBetween(LEAF_MIN_DELAY, LEAF_MAX_DELAY));
}

function scheduleLight() {
  window.clearTimeout(lightTimer);
  lightTimer = window.setTimeout(() => {
    createParticle("light");
    scheduleLight();
  }, randomBetween(LIGHT_MIN_DELAY, LIGHT_MAX_DELAY));
}

function stopAmbientTimers() {
  window.clearTimeout(leafTimer);
  window.clearTimeout(lightTimer);
  leafTimer = null;
  lightTimer = null;
}

function restartAmbientTimers() {
  stopAmbientTimers();
  if (document.hidden || reducedMotionQuery?.matches) return;
  scheduleLeaf();
  scheduleLight();
}

function initGardenLifeMotion() {
  const stage = document.querySelector("#gardenStage");
  if (!stage) return;

  stage.classList.add("garden-life-enabled");
  ensureAmbientLayer();

  reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  reducedMotionQuery?.addEventListener?.("change", restartAmbientTimers);
  document.addEventListener("visibilitychange", restartAmbientTimers);
  window.addEventListener("pageshow", restartAmbientTimers);
  window.addEventListener("pagehide", stopAmbientTimers);

  restartAmbientTimers();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGardenLifeMotion, { once: true });
} else {
  initGardenLifeMotion();
}
