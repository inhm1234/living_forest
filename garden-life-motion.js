/* 오늘의숲 · 살아 있는 정원 장면 시스템 v0.4
   목표: 1초마다 무엇인가가 움직이되, 거대한 나무는 완전히 고정합니다.
   생명감은 하늘·빛·공기·작은 생명체·장식 반응이 나눠 가집니다. */

const SCENE_ID = "gardenLifeScene";
const EVENT_LAYER_ID = "gardenLifeEventLayer";
const MICRO_EVENT_MIN = 4200;
const MICRO_EVENT_MAX = 7200;
const SKY_EVENT_MIN = 15000;
const SKY_EVENT_MAX = 26000;

let reducedMotionQuery = null;
let treeObserver = null;
let foundItemsObserver = null;
let stageObserver = null;
let microTimer = null;
let skyTimer = null;
let activeStage = 1;
let activePeriod = "morning";
let previousMicroEvent = "";

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clampStage(value) {
  const stage = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(stage) ? Math.min(6, Math.max(1, stage)) : 1;
}

function readTreeState(treeImage) {
  const source = treeImage?.getAttribute("src") || treeImage?.currentSrc || "";
  const stageMatch = source.match(/tree_stage([1-6])_/i);
  const periodMatch = source.match(/_(morning|sunset|night)\./i);
  return {
    stage: clampStage(stageMatch?.[1]),
    period: periodMatch?.[1]?.toLowerCase() || "morning",
  };
}

function gardenIsVisible(stage) {
  if (!stage || document.hidden) return false;
  const app = stage.closest("#gardenApp");
  return Boolean(app && !app.classList.contains("hidden"));
}

function createElement(tag, className, parent) {
  const element = document.createElement(tag);
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  parent.appendChild(element);
  return element;
}

function buildScene() {
  const world = document.querySelector("#gardenWorld");
  if (!world) return null;

  const oldScene = world.querySelector(`#${SCENE_ID}`);
  if (oldScene) oldScene.remove();

  const scene = createElement("div", "garden-life-scene", world);
  scene.id = SCENE_ID;

  createElement("div", "garden-life-sunwash sunwash-one", scene);
  createElement("div", "garden-life-sunwash sunwash-two", scene);
  createElement("div", "garden-life-ground-current", scene);

  const moteField = createElement("div", "garden-life-mote-field", scene);
  for (let index = 0; index < 12; index += 1) {
    const mote = createElement("i", "garden-life-mote", moteField);
    mote.style.setProperty("--life-x", `${randomBetween(5, 95).toFixed(1)}%`);
    mote.style.setProperty("--life-y", `${randomBetween(18, 88).toFixed(1)}%`);
    mote.style.setProperty("--life-dx", `${randomBetween(-30, 38).toFixed(1)}px`);
    mote.style.setProperty("--life-dy", `${randomBetween(-42, -18).toFixed(1)}px`);
    mote.style.setProperty("--life-size", `${randomBetween(2.2, 5.2).toFixed(1)}px`);
    mote.style.setProperty("--life-duration", `${randomBetween(7.2, 13.5).toFixed(2)}s`);
    mote.style.setProperty("--life-delay", `${randomBetween(-13, 0).toFixed(2)}s`);
  }

  const butterflyField = createElement("div", "garden-life-butterfly-field", scene);
  ["butterfly-one", "butterfly-two"].forEach((name) => {
    const butterfly = createElement("i", `garden-life-butterfly ${name}`, butterflyField);
    createElement("b", "garden-life-butterfly-body", butterfly);
  });

  const fireflyField = createElement("div", "garden-life-firefly-field", scene);
  for (let index = 0; index < 8; index += 1) {
    const firefly = createElement("i", "garden-life-firefly", fireflyField);
    firefly.style.setProperty("--firefly-x", `${randomBetween(12, 88).toFixed(1)}%`);
    firefly.style.setProperty("--firefly-y", `${randomBetween(38, 84).toFixed(1)}%`);
    firefly.style.setProperty("--firefly-dx", `${randomBetween(-25, 28).toFixed(1)}px`);
    firefly.style.setProperty("--firefly-dy", `${randomBetween(-18, 24).toFixed(1)}px`);
    firefly.style.setProperty("--firefly-duration", `${randomBetween(5.8, 10.5).toFixed(2)}s`);
    firefly.style.setProperty("--firefly-delay", `${randomBetween(-10, 0).toFixed(2)}s`);
  }

  const eventLayer = createElement("div", "garden-life-event-layer", scene);
  eventLayer.id = EVENT_LAYER_ID;
  return scene;
}

function syncSceneState() {
  const stage = document.querySelector("#gardenStage");
  const treeImage = document.querySelector("#treeImage");
  const treeWrap = document.querySelector("#treeWrap");
  const scene = document.querySelector(`#${SCENE_ID}`);
  if (!stage || !treeImage || !treeWrap || !scene) return;

  const state = readTreeState(treeImage);
  activeStage = state.stage;
  activePeriod = state.period;

  stage.dataset.treeStage = String(activeStage);
  stage.dataset.lifePeriod = activePeriod;
  treeWrap.dataset.treeStage = String(activeStage);
  scene.dataset.treeStage = String(activeStage);
  scene.dataset.lifePeriod = activePeriod;
  scene.classList.toggle("is-rain", stage.classList.contains("weather-rain"));
  scene.classList.toggle("is-decorating", stage.classList.contains("is-garden-decorating"));
}

function classifyFoundItems() {
  const layer = document.querySelector("#foundItemsLayer");
  if (!layer) return;

  layer.querySelectorAll(".found-item").forEach((item) => {
    const source = item.querySelector("img")?.getAttribute("src")?.toLowerCase() || "";
    item.classList.remove(
      "garden-life-item-flower",
      "garden-life-item-ribbon",
      "garden-life-item-letter",
      "garden-life-item-lantern",
      "garden-life-item-animal",
      "garden-life-item-sign",
      "garden-life-item-mushroom",
    );

    if (/flower|dais|blossom|meadow/.test(source)) item.classList.add("garden-life-item-flower");
    if (/ribbon|arch/.test(source)) item.classList.add("garden-life-item-ribbon");
    if (/letter|mailbox/.test(source)) item.classList.add("garden-life-item-letter");
    if (/firefly|lantern|moonlit/.test(source)) item.classList.add("garden-life-item-lantern");
    if (/squirrel|hedgehog|rabbit|bird/.test(source)) item.classList.add("garden-life-item-animal");
    if (/sign|gate/.test(source)) item.classList.add("garden-life-item-sign");
    if (/mushroom|mushrooms|grove|shelter/.test(source)) item.classList.add("garden-life-item-mushroom");
  });
}

function activeEventLayer() {
  return document.querySelector(`#${EVENT_LAYER_ID}`);
}

function removeAfterAnimation(element) {
  element.addEventListener("animationend", () => element.remove(), { once: true });
}

function spawnSkyBird() {
  const stage = document.querySelector("#gardenStage");
  const layer = activeEventLayer();
  if (!stage || !layer || !gardenIsVisible(stage) || stage.classList.contains("weather-rain")) return;
  if (activePeriod === "night") return;
  if (layer.querySelector(".garden-life-sky-bird")) return;

  const bird = createElement("i", `garden-life-sky-bird ${Math.random() > .5 ? "from-left" : "from-right"}`, layer);
  bird.style.setProperty("--bird-y", `${randomBetween(11, 28).toFixed(1)}%`);
  bird.style.setProperty("--bird-duration", `${randomBetween(6.8, 9.2).toFixed(2)}s`);
  createElement("b", "garden-life-sky-bird-body", bird);
  removeAfterAnimation(bird);
}

function spawnLightGlint() {
  const stage = document.querySelector("#gardenStage");
  const layer = activeEventLayer();
  if (!stage || !layer || !gardenIsVisible(stage)) return;
  if (layer.querySelector(".garden-life-glint-trail")) return;

  const glint = createElement("i", "garden-life-glint-trail", layer);
  glint.style.setProperty("--glint-x", `${randomBetween(24, 72).toFixed(1)}%`);
  glint.style.setProperty("--glint-y", `${randomBetween(activeStage <= 2 ? 57 : 30, 72).toFixed(1)}%`);
  glint.style.setProperty("--glint-turn", `${randomBetween(-18, 18).toFixed(1)}deg`);
  removeAfterAnimation(glint);
}

function triggerGroundCurrent() {
  const current = document.querySelector(".garden-life-ground-current");
  if (!current) return;
  current.classList.remove("is-passing");
  void current.offsetWidth;
  current.classList.add("is-passing");
  window.setTimeout(() => current.classList.remove("is-passing"), 3600);
}

function triggerDecorationMoment() {
  const stage = document.querySelector("#gardenStage");
  if (!stage || stage.classList.contains("is-garden-decorating")) return false;

  const candidates = [...document.querySelectorAll(
    "#foundItemsLayer .garden-life-item-flower, #foundItemsLayer .garden-life-item-ribbon, #foundItemsLayer .garden-life-item-letter, #foundItemsLayer .garden-life-item-lantern, #foundItemsLayer .garden-life-item-animal",
  )].filter((element) => element.offsetParent !== null);

  if (!candidates.length) return false;
  const target = randomItem(candidates);
  target.classList.remove("garden-life-moment");
  void target.offsetWidth;
  target.classList.add("garden-life-moment");
  window.setTimeout(() => target.classList.remove("garden-life-moment"), 1800);
  return true;
}

function triggerAnimalMoment() {
  const candidates = [...document.querySelectorAll(
    "#animalV2Layer .animal-v2-visitor:not(.is-arriving):not(.is-departing) .animal-v2-emoji",
  )].filter((element) => element.offsetParent !== null);
  if (!candidates.length) return false;

  const target = randomItem(candidates);
  target.classList.remove("garden-life-animal-moment");
  void target.offsetWidth;
  target.classList.add("garden-life-animal-moment");
  window.setTimeout(() => target.classList.remove("garden-life-animal-moment"), 1600);
  return true;
}

function runMicroEvent() {
  const stage = document.querySelector("#gardenStage");
  if (!stage || !gardenIsVisible(stage) || reducedMotionQuery?.matches) return;

  const eventNames = ["glint", "ground", "decoration", "animal"].filter((name) => name !== previousMicroEvent);
  let selected = randomItem(eventNames);

  if (selected === "decoration" && !triggerDecorationMoment()) selected = "glint";
  if (selected === "animal" && !triggerAnimalMoment()) selected = "ground";
  if (selected === "glint") spawnLightGlint();
  if (selected === "ground") triggerGroundCurrent();

  previousMicroEvent = selected;
}

function scheduleMicroEvent() {
  window.clearTimeout(microTimer);
  microTimer = window.setTimeout(() => {
    runMicroEvent();
    scheduleMicroEvent();
  }, randomBetween(MICRO_EVENT_MIN, MICRO_EVENT_MAX));
}

function scheduleSkyEvent() {
  window.clearTimeout(skyTimer);
  skyTimer = window.setTimeout(() => {
    spawnSkyBird();
    scheduleSkyEvent();
  }, randomBetween(SKY_EVENT_MIN, SKY_EVENT_MAX));
}

function stopSceneTimers() {
  window.clearTimeout(microTimer);
  window.clearTimeout(skyTimer);
  microTimer = null;
  skyTimer = null;
}

function restartSceneTimers() {
  stopSceneTimers();
  if (document.hidden || reducedMotionQuery?.matches) return;
  scheduleMicroEvent();
  scheduleSkyEvent();
}

function initGardenLifeScene() {
  const stage = document.querySelector("#gardenStage");
  const treeImage = document.querySelector("#treeImage");
  const foundItemsLayer = document.querySelector("#foundItemsLayer");
  if (!stage || !treeImage) return;

  stage.classList.add("garden-life-enabled");
  buildScene();
  classifyFoundItems();
  syncSceneState();

  treeObserver = new MutationObserver(syncSceneState);
  treeObserver.observe(treeImage, { attributes: true, attributeFilter: ["src"] });

  stageObserver = new MutationObserver(syncSceneState);
  stageObserver.observe(stage, { attributes: true, attributeFilter: ["class"] });

  if (foundItemsLayer) {
    foundItemsObserver = new MutationObserver(() => {
      classifyFoundItems();
      syncSceneState();
    });
    foundItemsObserver.observe(foundItemsLayer, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "class"] });
  }

  reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  reducedMotionQuery?.addEventListener?.("change", restartSceneTimers);
  document.addEventListener("visibilitychange", restartSceneTimers);
  window.addEventListener("pageshow", () => {
    syncSceneState();
    classifyFoundItems();
    restartSceneTimers();
  });
  window.addEventListener("pagehide", stopSceneTimers);

  restartSceneTimers();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGardenLifeScene, { once: true });
} else {
  initGardenLifeScene();
}
