/* 오늘의숲 · 살아 있는 정원 장면 시스템 v0.5
   목표: 나무는 안정적으로 고정하고, 하늘·빛·공기·곤충·열매·편지·장식이
   서로 다른 리듬으로 움직여 어느 순간에도 정지 화면처럼 보이지 않게 합니다. */

const SCENE_ID = "gardenLifeScene";
const EVENT_LAYER_ID = "gardenLifeEventLayer";
const MICRO_EVENT_MIN = 2800;
const MICRO_EVENT_MAX = 4600;
const SKY_EVENT_MIN = 11000;
const SKY_EVENT_MAX = 20000;
const MAX_TRANSIENT_EVENTS = 3;

let reducedMotionQuery = null;
let treeObserver = null;
let foundItemsObserver = null;
let stageObserver = null;
let microTimer = null;
let skyTimer = null;
let activeStage = 1;
let activePeriod = "morning";
let recentMicroEvents = [];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled(items) {
  return [...items].sort(() => Math.random() - 0.5);
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

function isLiteDevice() {
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  return (memory > 0 && memory <= 2) || (cores > 0 && cores <= 2);
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
  scene.classList.toggle("is-lite", isLiteDevice());

  createElement("div", "garden-life-sunwash sunwash-one", scene);
  createElement("div", "garden-life-sunwash sunwash-two", scene);
  createElement("div", "garden-life-cloud-shadow", scene);
  createElement("div", "garden-life-ground-current", scene);

  const starField = createElement("div", "garden-life-star-field", scene);
  for (let index = 0; index < 10; index += 1) {
    const star = createElement("i", "garden-life-star", starField);
    star.style.setProperty("--star-x", `${randomBetween(7, 93).toFixed(1)}%`);
    star.style.setProperty("--star-y", `${randomBetween(8, 48).toFixed(1)}%`);
    star.style.setProperty("--star-size", `${randomBetween(1.5, 3.6).toFixed(1)}px`);
    star.style.setProperty("--star-duration", `${randomBetween(2.2, 5.6).toFixed(2)}s`);
    star.style.setProperty("--star-delay", `${randomBetween(-5.5, 0).toFixed(2)}s`);
  }

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

  const dewField = createElement("div", "garden-life-dew-field", scene);
  const dewPositions = [
    [37, 70], [44, 67], [50, 73], [56, 68], [63, 71], [48, 63],
  ];
  dewPositions.forEach(([x, y], index) => {
    const dew = createElement("i", "garden-life-dew", dewField);
    dew.style.setProperty("--dew-x", `${x}%`);
    dew.style.setProperty("--dew-y", `${y}%`);
    dew.style.setProperty("--dew-delay", `${(-index * 0.63).toFixed(2)}s`);
  });

  const butterflyField = createElement("div", "garden-life-butterfly-field", scene);
  ["butterfly-one", "butterfly-two"].forEach((name) => {
    const butterfly = createElement("i", `garden-life-butterfly ${name}`, butterflyField);
    createElement("b", "garden-life-butterfly-body", butterfly);
  });

  const beeField = createElement("div", "garden-life-bee-field", scene);
  const bee = createElement("i", "garden-life-bee", beeField);
  createElement("b", "garden-life-bee-body", bee);

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

function hasTransientCapacity(layer = activeEventLayer()) {
  return Boolean(layer && layer.querySelectorAll(".garden-life-transient").length < MAX_TRANSIENT_EVENTS);
}

function removeAfterAnimation(element, fallbackMs = 12000) {
  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    element.remove();
  };
  element.addEventListener("animationend", (event) => {
    if (event.target === element) cleanup();
  });
  window.setTimeout(cleanup, fallbackMs);
}

function spawnSkyBird() {
  const stage = document.querySelector("#gardenStage");
  const layer = activeEventLayer();
  if (!stage || !layer || !gardenIsVisible(stage) || stage.classList.contains("weather-rain")) return false;
  if (activePeriod === "night" || !hasTransientCapacity(layer)) return false;
  if (layer.querySelector(".garden-life-sky-bird")) return false;

  const bird = createElement("i", `garden-life-sky-bird garden-life-transient ${Math.random() > .5 ? "from-left" : "from-right"}`, layer);
  bird.style.setProperty("--bird-y", `${randomBetween(11, 28).toFixed(1)}%`);
  bird.style.setProperty("--bird-duration", `${randomBetween(6.8, 9.2).toFixed(2)}s`);
  createElement("b", "garden-life-sky-bird-body", bird);
  removeAfterAnimation(bird, 11000);
  return true;
}

function spawnLightGlint() {
  const stage = document.querySelector("#gardenStage");
  const layer = activeEventLayer();
  if (!stage || !layer || !gardenIsVisible(stage) || !hasTransientCapacity(layer)) return false;
  if (layer.querySelector(".garden-life-glint-trail")) return false;

  const glint = createElement("i", "garden-life-glint-trail garden-life-transient", layer);
  glint.style.setProperty("--glint-x", `${randomBetween(24, 72).toFixed(1)}%`);
  glint.style.setProperty("--glint-y", `${randomBetween(activeStage <= 2 ? 57 : 30, 72).toFixed(1)}%`);
  glint.style.setProperty("--glint-turn", `${randomBetween(-18, 18).toFixed(1)}deg`);
  removeAfterAnimation(glint, 4000);
  return true;
}

function spawnTreePetal() {
  const stage = document.querySelector("#gardenStage");
  const layer = activeEventLayer();
  if (!stage || !layer || !gardenIsVisible(stage) || !hasTransientCapacity(layer)) return false;
  if (activeStage < 4 || activePeriod === "night" || stage.classList.contains("weather-rain")) return false;
  if (layer.querySelector(".garden-life-tree-petal")) return false;

  const petal = createElement("i", `garden-life-tree-petal garden-life-transient ${Math.random() > .5 ? "drift-left" : "drift-right"}`, layer);
  petal.style.setProperty("--petal-x", `${randomBetween(35, 65).toFixed(1)}%`);
  petal.style.setProperty("--petal-y", `${randomBetween(27, 48).toFixed(1)}%`);
  petal.style.setProperty("--petal-turn", `${randomBetween(-24, 24).toFixed(1)}deg`);
  petal.style.setProperty("--petal-duration", `${randomBetween(4.6, 6.2).toFixed(2)}s`);
  removeAfterAnimation(petal, 7500);
  return true;
}

function triggerGroundCurrent() {
  const current = document.querySelector(".garden-life-ground-current");
  if (!current) return false;
  current.classList.remove("is-passing");
  void current.offsetWidth;
  current.classList.add("is-passing");
  window.setTimeout(() => current.classList.remove("is-passing"), 3600);
  return true;
}

function triggerDecorationMoment() {
  const stage = document.querySelector("#gardenStage");
  if (!stage || stage.classList.contains("is-garden-decorating")) return false;

  const candidates = [...document.querySelectorAll(
    "#foundItemsLayer .garden-life-item-flower, #foundItemsLayer .garden-life-item-ribbon, #foundItemsLayer .garden-life-item-letter, #foundItemsLayer .garden-life-item-animal",
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

function triggerFruitMoment() {
  const candidates = [...document.querySelectorAll("#heartFruitLayer .heart-fruit")]
    .filter((element) => element.offsetParent !== null);
  if (!candidates.length) return false;

  const target = randomItem(candidates);
  target.classList.remove("garden-life-fruit-moment");
  void target.offsetWidth;
  target.classList.add("garden-life-fruit-moment");
  window.setTimeout(() => target.classList.remove("garden-life-fruit-moment"), 1600);
  return true;
}

function triggerLetterMoment() {
  const candidates = [...document.querySelectorAll("#branchLetters .branch-letter-item, #branchLetters .branch-letter-bundle")]
    .filter((element) => element.offsetParent !== null);
  if (!candidates.length) return false;

  const target = randomItem(candidates);
  target.classList.remove("garden-life-letter-moment");
  void target.offsetWidth;
  target.classList.add("garden-life-letter-moment");
  window.setTimeout(() => target.classList.remove("garden-life-letter-moment"), 1700);
  return true;
}

function rememberMicroEvent(name) {
  recentMicroEvents = [name, ...recentMicroEvents.filter((item) => item !== name)].slice(0, 2);
}

function runMicroEvent() {
  const stage = document.querySelector("#gardenStage");
  if (!stage || !gardenIsVisible(stage) || reducedMotionQuery?.matches) return;

  const events = shuffled([
    ["fruit", triggerFruitMoment],
    ["letter", triggerLetterMoment],
    ["petal", spawnTreePetal],
    ["decoration", triggerDecorationMoment],
    ["animal", triggerAnimalMoment],
    ["glint", spawnLightGlint],
    ["ground", triggerGroundCurrent],
  ]).filter(([name]) => !recentMicroEvents.includes(name));

  let selected = "ground";
  let completed = false;
  for (const [name, handler] of events) {
    if (handler()) {
      selected = name;
      completed = true;
      break;
    }
  }
  if (!completed) triggerGroundCurrent();
  rememberMicroEvent(selected);
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
    // 분류 함수가 붙이는 class는 감시하지 않습니다. 장식 추가·삭제와 이미지 교체만 확인합니다.
    foundItemsObserver.observe(foundItemsLayer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
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
