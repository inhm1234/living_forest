// 살아있는 숲 V1.6 test
// 프로젝트명: 살아있는 숲
// 버전명: V1.6 test
// 목적: 방문자 흔적 확장 테스트판
// 저장 방식: localStorage 유지

const APP_CONFIG = {
  name: "살아있는 숲",
  version: "V1.6 test",
  dataSchemaVersion: 3,
  baseStorageKey: "livingForestV012",
  testStorageKey: "livingForestV012_TEST"
};

const STORAGE_CONFIG = {
  mode: "local-only",
  provider: "browser-localStorage",
  storageVersion: 1,
  ownerType: "anonymous-local-device",
  serverReady: false
};

const BASE_STORAGE_KEY = APP_CONFIG.baseStorageKey;
const TEST_STORAGE_KEY = APP_CONFIG.testStorageKey;
const urlParams = new URLSearchParams(window.location.search);
const isTestMode = urlParams.get("test") === "1";
const STORAGE_KEY = isTestMode ? TEST_STORAGE_KEY : BASE_STORAGE_KEY;
const VISITOR_STORAGE_KEY = `${STORAGE_KEY}_VISITOR_V12`;
const OWNER_STORAGE_KEY = `${STORAGE_KEY}_OWNER_V15`;

const moodRules = {
  good: {
    label: "좋음",
    icon: "😄",
    state: "leaf-strong",
    leaf: 2,
    trunk: 1,
    root: 0,
    message: "잎이 풍성하게 자랐어요."
  },
  normal: {
    label: "보통",
    icon: "😐",
    state: "balanced",
    leaf: 1,
    trunk: 1,
    root: 1,
    message: "고르게 균형 있게 자랐어요."
  },
  tired: {
    label: "피곤",
    icon: "😵",
    state: "root-strong",
    leaf: 0,
    trunk: 1,
    root: 2,
    message: "뿌리가 깊게 자라며 회복하고 있어요."
  }
};

const growthStageRules = [
  { minDays: 0, maxDays: 0, name: "첫 기록을 기다리는 씨앗" },
  { minDays: 1, maxDays: 2, name: "작은 새싹" },
  { minDays: 3, maxDays: 6, name: "빛을 찾는 새싹" },
  { minDays: 7, maxDays: 13, name: "숲에 자리 잡은 어린 나무" },
  { minDays: 14, maxDays: 20, name: "자라는 나무" },
  { minDays: 21, maxDays: 29, name: "깊어지는 나무" },
  { minDays: 30, maxDays: Infinity, name: "작은 숲의 중심나무" }
];

const growthMilestoneRules = [
  {
    day: 1,
    title: "첫 변화",
    message: "첫 기록만 남겨도 내 나무가 바로 반응해요."
  },
  {
    day: 3,
    title: "월드 숲 예고",
    message: "월드 숲의 내 자리 주변에 작은 빛이 생겨요."
  },
  {
    day: 7,
    title: "숲에 자리 잡기",
    message: "내 나무가 월드 숲에 정식으로 자리 잡아요."
  },
  {
    day: 14,
    title: "중간 성장",
    message: "어린 나무가 더 뚜렷하게 자라기 시작해요."
  },
  {
    day: 21,
    title: "깊어지는 나무",
    message: "내 나무의 기운이 숲 안에서 더 선명해져요."
  },
  {
    day: 30,
    title: "성숙한 나무",
    message: "작은 숲의 중심나무로 완성돼요."
  }
];


const visitorRules = {
  bird: {
    label: "작은 새",
    className: "visitor-bird-flight",
    message: "작은 새가 날아와 가지 근처에서 잠시 쉬었다가 다시 숲 위로 날아갔어요.",
    recordMessage: "작은 새가 가지 근처에서 잠시 쉬어갔어요.",
    traceLabel: "깃털빛",
    traceIcon: "✦",
    traceMessage: "가지 근처에 아주 작은 깃털빛이 남아 있어요. 오늘의 정원이 누군가에게 잠시 쉬어갈 만큼 편안했다는 흔적이에요."
  },
  squirrel: {
    label: "다람쥐",
    className: "visitor-squirrel-walk",
    message: "다람쥐가 뿌리 근처까지 다가와 잠시 쉬었다가 숲 아래로 사라졌어요.",
    recordMessage: "다람쥐가 뿌리 근처에서 조용히 머물다 갔어요.",
    traceLabel: "도토리 흔적",
    traceIcon: "✧",
    traceMessage: "뿌리 근처에 작은 도토리 흔적이 남아 있어요. 내 나무가 천천히 뿌리내리고 있다는 조용한 표시예요."
  }
};

const forestEffectRules = {
  "leaf-strong": {
    className: "effect-leaf",
    symbols: ["✦", "·", "✦", "·", "✦", "·"]
  },
  balanced: {
    className: "effect-balanced",
    symbols: ["✦", "✧", "✦", "✧", "✦", "✧"]
  },
  "root-strong": {
    className: "effect-root",
    symbols: ["✧", "·", "✧", "·", "✧", "·"]
  },
  "trunk-strong": {
    className: "effect-balanced",
    symbols: ["✦", "✧", "✦", "✧", "✦", "✧"]
  }
};

const worldForestSlots = [
  {
    id: "quiet-sprout",
    name: "조용한 새싹",
    state: "balanced",
    days: 3,
    x: 24,
    y: 58,
    scale: 0.74,
    opacity: 0.62,
    mobileX: 18,
    mobileY: 60,
    mobileScale: 0.58
  },
  {
    id: "resting-tree",
    name: "쉬어가는 나무",
    state: "root-strong",
    days: 9,
    x: 73,
    y: 55,
    scale: 0.66,
    opacity: 0.58,
    mobileX: 80,
    mobileY: 58,
    mobileScale: 0.56
  },
  {
    id: "bright-leaf",
    name: "빛나는 잎",
    state: "leaf-strong",
    days: 6,
    x: 37,
    y: 46,
    scale: 0.52,
    opacity: 0.46,
    mobileX: 36,
    mobileY: 47,
    mobileScale: 0.42
  },
  {
    id: "small-center",
    name: "작은 중심",
    state: "balanced",
    days: 14,
    x: 63,
    y: 44,
    scale: 0.48,
    opacity: 0.43,
    mobileX: 66,
    mobileY: 46,
    mobileScale: 0.4
  },
  {
    id: "slow-root",
    name: "천천한 뿌리",
    state: "root-strong",
    days: 22,
    x: 17,
    y: 72,
    scale: 0.58,
    opacity: 0.5,
    mobileX: 16,
    mobileY: 74,
    mobileScale: 0.46
  }
];

const worldScreenElement = document.querySelector("#worldScreen");
const gardenScreenElement = document.querySelector("#gardenScreen");
const goGardenBtnElement = document.querySelector("#goGardenBtn");
const backToWorldBtnTopElement = document.querySelector("#backToWorldBtnTop");
const backToWorldBtnBottomElement = document.querySelector("#backToWorldBtnBottom");
const myWorldSpotElement = document.querySelector("#myWorldSpot");
const worldNeighborSpotsElement = document.querySelector("#worldNeighborSpots");
const mySpotAuraElement = document.querySelector("#mySpotAura");
const mySpotVisualElement = document.querySelector("#mySpotVisual");
const mySpotNameElement = document.querySelector("#mySpotName");
const mySpotStatusElement = document.querySelector("#mySpotStatus");
const worldSummaryNameElement = document.querySelector("#worldSummaryName");
const worldSummaryTodayElement = document.querySelector("#worldSummaryToday");
const worldSummaryTextElement = document.querySelector("#worldSummaryText");
const worldCommunityHintElement = document.querySelector("#worldCommunityHint");
const dailyLoopCardElement = document.querySelector("#dailyLoopCard");
const dailyLoopTitleElement = document.querySelector("#dailyLoopTitle");
const dailyLoopTextElement = document.querySelector("#dailyLoopText");
const flowTitleElement = document.querySelector("#flowTitle");
const flowDescriptionElement = document.querySelector("#flowDescription");
const flowStepWorldElement = document.querySelector("#flowStepWorld");
const flowStepNameElement = document.querySelector("#flowStepName");
const flowStepMoodElement = document.querySelector("#flowStepMood");
const flowStepReturnElement = document.querySelector("#flowStepReturn");

const skyElement = document.querySelector("#sky");
const effectLayerElement = document.querySelector("#effectLayer");
const treeElement = document.querySelector("#tree");
const treeImageElement = document.querySelector("#treeImage");
const birdElement = document.querySelector("#bird");
const squirrelElement = document.querySelector("#squirrel");
const growthMessageElement = document.querySelector("#growthMessage");
const creatureMessageElement = document.querySelector("#creatureMessage");
const todayStatusElement = document.querySelector("#todayStatus");
const moodGuideElement = document.querySelector("#moodGuide");
const moodCardElement = document.querySelector(".mood-card");
const totalDaysElement = document.querySelector("#totalDays");
const stageBadgeElement = document.querySelector("#stageBadge");
const todayDateChipElement = document.querySelector("#todayDateChip");
const todayStateChipElement = document.querySelector("#todayStateChip");
const treeNameDisplayElement = document.querySelector("#treeNameDisplay");
const nameCardElement = document.querySelector("#nameCard");
const treeNameFormElement = document.querySelector("#treeNameForm");
const treeNameInputElement = document.querySelector("#treeNameInput");
const treeNameMessageElement = document.querySelector("#treeNameMessage");
const completeCardElement = document.querySelector("#completeCard");
const completeMessageElement = document.querySelector("#completeMessage");
const visitorTraceCardElement = document.querySelector("#visitorTraceCard");
const visitorTraceTitleElement = document.querySelector("#visitorTraceTitle");
const visitorTraceTextElement = document.querySelector("#visitorTraceText");
const visitorTraceMetaElement = document.querySelector("#visitorTraceMeta");
const visitorLogCardElement = document.querySelector("#visitorLogCard");
const visitorLogTitleElement = document.querySelector("#visitorLogTitle");
const visitorLogListElement = document.querySelector("#visitorLogList");
const visitorLogEmptyElement = document.querySelector("#visitorLogEmpty");
const moodButtons = document.querySelectorAll("[data-mood]");
const testModePanelElement = document.querySelector("#testModePanel");
const testModeStorageKeyElement = document.querySelector("#testModeStorageKey");
const testModeDataInfoElement = document.querySelector("#testModeDataInfo");
const clearTestDataBtnElement = document.querySelector("#clearTestDataBtn");
const testPresetButtons = document.querySelectorAll("[data-test-preset]");

let treeData = loadTreeData();
let shouldHighlightWorldSpot = false;
let todayVisitorEvent = null;
let visitorAnimationTimer = null;
let visitorPlayedSessionDate = null;

function createTreeId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `local-tree-${Date.now()}-${randomPart}`;
}

function createLocalOwnerId() {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `local-owner-${Date.now()}-${randomPart}`;
}

function getOrCreateLocalOwnerId() {
  const savedOwnerId = localStorage.getItem(OWNER_STORAGE_KEY);

  if (typeof savedOwnerId === "string" && savedOwnerId.trim()) {
    return savedOwnerId;
  }

  const ownerId = createLocalOwnerId();
  localStorage.setItem(OWNER_STORAGE_KEY, ownerId);
  return ownerId;
}

function createStorageInfo(updatedAt = getNowIsoString()) {
  return {
    mode: STORAGE_CONFIG.mode,
    provider: STORAGE_CONFIG.provider,
    storageVersion: STORAGE_CONFIG.storageVersion,
    ownerType: STORAGE_CONFIG.ownerType,
    localOwnerId: getOrCreateLocalOwnerId(),
    serverUserId: null,
    serverTreeId: null,
    lastSyncedAt: null,
    updatedAt
  };
}

function normalizeStorageInfo(sourceData, updatedAt = getNowIsoString()) {
  const sourceStorage = sourceData && typeof sourceData.storageInfo === "object" ? sourceData.storageInfo : {};
  const storageVersion = Number(sourceStorage.storageVersion);

  return {
    mode: typeof sourceStorage.mode === "string" && sourceStorage.mode.trim() ? sourceStorage.mode : STORAGE_CONFIG.mode,
    provider: typeof sourceStorage.provider === "string" && sourceStorage.provider.trim() ? sourceStorage.provider : STORAGE_CONFIG.provider,
    storageVersion: Number.isFinite(storageVersion) && storageVersion > 0 ? storageVersion : STORAGE_CONFIG.storageVersion,
    ownerType: typeof sourceStorage.ownerType === "string" && sourceStorage.ownerType.trim() ? sourceStorage.ownerType : STORAGE_CONFIG.ownerType,
    localOwnerId: typeof sourceStorage.localOwnerId === "string" && sourceStorage.localOwnerId.trim() ? sourceStorage.localOwnerId : getOrCreateLocalOwnerId(),
    serverUserId: typeof sourceStorage.serverUserId === "string" && sourceStorage.serverUserId.trim() ? sourceStorage.serverUserId : null,
    serverTreeId: typeof sourceStorage.serverTreeId === "string" && sourceStorage.serverTreeId.trim() ? sourceStorage.serverTreeId : null,
    lastSyncedAt: typeof sourceStorage.lastSyncedAt === "string" && sourceStorage.lastSyncedAt.trim() ? sourceStorage.lastSyncedAt : null,
    updatedAt
  };
}

function getNowIsoString() {
  return new Date().toISOString();
}

function createNewTreeData(overrides = {}) {
  const now = getNowIsoString();

  return {
    appName: APP_CONFIG.name,
    appVersion: APP_CONFIG.version,
    dataSchemaVersion: APP_CONFIG.dataSchemaVersion,
    treeId: createTreeId(),
    createdAt: now,
    updatedAt: now,
    storageInfo: createStorageInfo(now),
    leaf: 1,
    trunk: 1,
    root: 1,
    lastCheckDate: null,
    history: [],
    treeName: "",
    ...overrides
  };
}

function getDateKeyFromDate(dateValue) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const date = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function getUtcDateKeyFromDate(dateValue) {
  const year = dateValue.getUTCFullYear();
  const month = String(dateValue.getUTCMonth() + 1).padStart(2, "0");
  const date = String(dateValue.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function getRelativeDateKey(daysAgo) {
  const dateValue = new Date();
  dateValue.setDate(dateValue.getDate() - daysAgo);
  return getDateKeyFromDate(dateValue);
}

function getTodayKey() {
  return getDateKeyFromDate(new Date());
}

function formatDate(dateText) {
  const [year, month, date] = dateText.split("-");
  return `${year}.${month}.${date}`;
}

function toSafeNumber(value, fallbackValue) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return fallbackValue;
  }

  return numberValue;
}

function isValidDateKey(dateText) {
  return typeof dateText === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateText);
}

function normalizeHistoryRecord(record, fallbackIndex = 0) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const mood = moodRules[record.mood] ? record.mood : "normal";
  const rule = moodRules[mood];

  return {
    date: isValidDateKey(record.date) ? record.date : getRelativeDateKey(fallbackIndex),
    mood,
    label: typeof record.label === "string" && record.label.trim() ? record.label : rule.label,
    icon: typeof record.icon === "string" && record.icon.trim() ? record.icon : rule.icon,
    message: typeof record.message === "string" && record.message.trim() ? record.message : rule.message
  };
}

function normalizeTreeData(rawData) {
  const baseData = createNewTreeData();
  const sourceData = rawData && typeof rawData === "object" ? rawData : {};
  const history = Array.isArray(sourceData.history)
    ? sourceData.history
        .map((record, index) => normalizeHistoryRecord(record, index))
        .filter(Boolean)
    : [];
  const treeName = typeof sourceData.treeName === "string" ? sourceData.treeName.trim().slice(0, 16) : "";
  const createdAt = typeof sourceData.createdAt === "string" && sourceData.createdAt.trim()
    ? sourceData.createdAt
    : baseData.createdAt;
  const updatedAt = typeof sourceData.updatedAt === "string" && sourceData.updatedAt.trim() ? sourceData.updatedAt : createdAt;

  return {
    appName: APP_CONFIG.name,
    appVersion: APP_CONFIG.version,
    dataSchemaVersion: APP_CONFIG.dataSchemaVersion,
    treeId: typeof sourceData.treeId === "string" && sourceData.treeId.trim() ? sourceData.treeId : baseData.treeId,
    createdAt,
    updatedAt,
    storageInfo: normalizeStorageInfo(sourceData, updatedAt),
    leaf: toSafeNumber(sourceData.leaf, baseData.leaf),
    trunk: toSafeNumber(sourceData.trunk, baseData.trunk),
    root: toSafeNumber(sourceData.root, baseData.root),
    lastCheckDate: isValidDateKey(sourceData.lastCheckDate) ? sourceData.lastCheckDate : null,
    history,
    treeName
  };
}

function loadTreeData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return createNewTreeData();
  }

  try {
    return normalizeTreeData(JSON.parse(savedData));
  } catch {
    return createNewTreeData();
  }
}

function saveTreeData() {
  treeData = normalizeTreeData({
    ...treeData,
    appVersion: APP_CONFIG.version,
    dataSchemaVersion: APP_CONFIG.dataSchemaVersion,
    updatedAt: getNowIsoString()
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(treeData));
}

function hasCheckedToday() {
  return treeData.lastCheckDate === getTodayKey();
}

function getTodayRecord() {
  return treeData.history.find((item) => item.date === getTodayKey()) || null;
}

function getTodayMoodState() {
  const todayRecord = getTodayRecord();
  if (!todayRecord) {
    return null;
  }

  return moodRules[todayRecord.mood]?.state || null;
}

function getGrowthStage() {
  const totalDays = treeData.history.length;

  return growthStageRules.find((stage) => {
    return totalDays >= stage.minDays && totalDays <= stage.maxDays;
  }) || growthStageRules[growthStageRules.length - 1];
}

function getNextGrowthMilestone() {
  const totalDays = treeData.history.length;
  return growthMilestoneRules.find((milestone) => totalDays < milestone.day) || null;
}

function getCurrentGrowthMilestone() {
  const totalDays = treeData.history.length;
  return [...growthMilestoneRules].reverse().find((milestone) => totalDays >= milestone.day) || null;
}

function getNextGoalMessage() {
  const totalDays = treeData.history.length;
  const nextMilestone = getNextGrowthMilestone();

  if (!nextMilestone) {
    return "30일 성숙 이후에는 숲의 방문자와 계절 변화로 긴 성장을 이어갈 수 있어요.";
  }

  const remainingDays = nextMilestone.day - totalDays;

  if (remainingDays <= 1) {
    return `다음 기록으로 ${nextMilestone.day}일차 ${nextMilestone.title}에 닿아요. ${nextMilestone.message}`;
  }

  return `${nextMilestone.day}일차 ${nextMilestone.title}까지 ${remainingDays}일 남았어요. ${nextMilestone.message}`;
}

function getWorldProgressMessage() {
  const totalDays = treeData.history.length;
  const currentMilestone = getCurrentGrowthMilestone();
  const nextMessage = getNextGoalMessage();

  if (totalDays === 0) {
    return "첫 기록을 남기면 내 나무가 바로 반응하고, 3일차에는 월드 숲에 작은 빛이 생겨요.";
  }

  if (currentMilestone) {
    return `${totalDays}일째 성장 중이에요. ${nextMessage}`;
  }

  return nextMessage;
}


function loadVisitorState() {
  const savedData = localStorage.getItem(VISITOR_STORAGE_KEY);

  if (!savedData) {
    return { events: [] };
  }

  try {
    const parsedData = JSON.parse(savedData);
    return {
      events: Array.isArray(parsedData.events) ? parsedData.events.slice(0, 21) : []
    };
  } catch {
    return { events: [] };
  }
}

function saveVisitorState(visitorState) {
  const events = Array.isArray(visitorState.events) ? visitorState.events.slice(0, 21) : [];
  localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify({ events }));
}

function hashStringToUnitInterval(text) {
  let hash = 2166136261;
  const source = String(text);

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

async function getVisitorDateKey() {
  if (isTestMode) {
    return getTodayKey();
  }

  try {
    const response = await fetch(window.location.href.split("#")[0], {
      method: "HEAD",
      cache: "no-store"
    });
    const serverDateHeader = response.headers.get("Date");

    if (serverDateHeader) {
      const serverDate = new Date(serverDateHeader);
      if (!Number.isNaN(serverDate.getTime())) {
        return getUtcDateKeyFromDate(serverDate);
      }
    }
  } catch {
    // GitHub Pages 서버 시간 확인에 실패하면 체험판에서는 기기 날짜로 자연스럽게 대체합니다.
  }

  return getTodayKey();
}

function getVisitorProbability(visitorState) {
  const totalDays = treeData.history.length;

  if (!treeData.treeName?.trim() || totalDays < 3 || !hasCheckedToday()) {
    return 0;
  }

  let probability = 0.24;

  if (totalDays >= 7) {
    probability += 0.08;
  }

  if (totalDays >= 14) {
    probability += 0.05;
  }

  const recentMisses = (visitorState.events || [])
    .slice(0, 3)
    .filter((event) => event && event.hasVisitor === false)
    .length;

  probability += recentMisses * 0.06;

  return Math.min(probability, 0.52);
}

function chooseVisitorType(dateKey) {
  const totalDays = treeData.history.length;

  if (totalDays < 7) {
    return "bird";
  }

  const state = getTreeState();

  if (state === "leaf-strong") {
    return hashStringToUnitInterval(`${treeData.treeId}-${dateKey}-visitor-type`) < 0.72 ? "bird" : "squirrel";
  }

  if (state === "root-strong") {
    return hashStringToUnitInterval(`${treeData.treeId}-${dateKey}-visitor-type`) < 0.72 ? "squirrel" : "bird";
  }

  return hashStringToUnitInterval(`${treeData.treeId}-${dateKey}-visitor-type`) < 0.5 ? "bird" : "squirrel";
}

function getVisitorTraceInfo(visitorEvent) {
  if (!visitorEvent?.hasVisitor || !visitorRules[visitorEvent.type]) {
    return null;
  }

  const rule = visitorRules[visitorEvent.type];
  const savedTrace = visitorEvent.trace && typeof visitorEvent.trace === "object" ? visitorEvent.trace : {};

  return {
    label: typeof savedTrace.label === "string" && savedTrace.label.trim() ? savedTrace.label : rule.traceLabel,
    icon: typeof savedTrace.icon === "string" && savedTrace.icon.trim() ? savedTrace.icon : rule.traceIcon,
    message: typeof savedTrace.message === "string" && savedTrace.message.trim() ? savedTrace.message : rule.traceMessage
  };
}

function createVisitorTrace(type) {
  if (!visitorRules[type]) {
    return null;
  }

  const rule = visitorRules[type];

  return {
    label: rule.traceLabel,
    icon: rule.traceIcon,
    message: rule.traceMessage
  };
}

function createVisitorEvent(dateKey, forceType = null) {
  const visitorState = loadVisitorState();
  const probability = forceType ? 1 : getVisitorProbability(visitorState);
  const roll = hashStringToUnitInterval(`${treeData.treeId}-${dateKey}-visitor-roll`);
  const hasVisitor = Boolean(forceType) || roll < probability;
  const type = hasVisitor ? (forceType || chooseVisitorType(dateKey)) : null;
  const trace = hasVisitor ? createVisitorTrace(type) : null;

  return {
    dateKey,
    hasVisitor,
    type,
    trace,
    probability: Number(probability.toFixed(2)),
    createdAt: getNowIsoString()
  };
}

function getStoredVisitorEvent(dateKey) {
  const visitorState = loadVisitorState();
  return visitorState.events.find((event) => event && event.dateKey === dateKey) || null;
}

function saveTodayVisitorEvent(visitorEvent) {
  const visitorState = loadVisitorState();
  const events = visitorState.events.filter((event) => event && event.dateKey !== visitorEvent.dateKey);
  saveVisitorState({ events: [visitorEvent, ...events] });
}

function resetVisitorElements() {
  window.clearTimeout(visitorAnimationTimer);
  visitorAnimationTimer = null;

  [birdElement, squirrelElement].forEach((element) => {
    if (!element) {
      return;
    }

    element.classList.remove(
      "active",
      "visitor-ready",
      "visitor-playing",
      "visitor-bird-flight",
      "visitor-squirrel-walk"
    );
  });
}

function getVisitorIdleMessage(visitorEvent) {
  if (!treeData.treeName?.trim()) {
    return "나무 이름을 정하면 언젠가 작은 방문자가 찾아올 수도 있어요.";
  }

  if (treeData.history.length < 3) {
    return "나무가 조금 더 자라면 숲의 작은 방문자가 찾아올 수 있어요.";
  }

  if (!hasCheckedToday()) {
    return "오늘의 마음을 남긴 뒤, 숲의 작은 방문자가 찾아올 수도 있어요.";
  }

  if (visitorEvent?.hasVisitor && visitorEvent.type && visitorRules[visitorEvent.type]) {
    const trace = getVisitorTraceInfo(visitorEvent);
    return trace
      ? `오늘은 ${visitorRules[visitorEvent.type].label}가 다녀가고 ${trace.label}을 남겼어요.`
      : `오늘은 ${visitorRules[visitorEvent.type].label}가 다녀간 흔적이 정원에 남아 있어요.`;
  }

  return "오늘은 조용한 밤 정원이에요. 방문자가 없어도 나무는 천천히 숨 쉬고 있어요.";
}

function updateVisitorMessage(visitorEvent = todayVisitorEvent) {
  if (!creatureMessageElement) {
    return;
  }

  creatureMessageElement.textContent = getVisitorIdleMessage(visitorEvent);
}

function playVisitorEvent(visitorEvent, force = false) {
  if (!visitorEvent?.hasVisitor || !visitorRules[visitorEvent.type]) {
    updateVisitorMessage(visitorEvent);
    return;
  }

  if (!force && visitorPlayedSessionDate === visitorEvent.dateKey) {
    updateVisitorMessage(visitorEvent);
    return;
  }

  visitorPlayedSessionDate = visitorEvent.dateKey;
  resetVisitorElements();

  const visitorRule = visitorRules[visitorEvent.type];
  const visitorElement = visitorEvent.type === "bird" ? birdElement : squirrelElement;

  if (!visitorElement) {
    return;
  }

  visitorAnimationTimer = window.setTimeout(() => {
    visitorElement.classList.add("visitor-ready", "visitor-playing", visitorRule.className);
    creatureMessageElement.textContent = visitorRule.message;
  }, force ? 80 : 850);
}

async function prepareDailyVisitor({ forcePlay = false, allowCreate = false, allowPlay = false } = {}) {
  if (!gardenScreenElement.classList.contains("screen-active")) {
    return;
  }

  const dateKey = await getVisitorDateKey();
  let visitorEvent = getStoredVisitorEvent(dateKey);

  if (!visitorEvent && allowCreate) {
    visitorEvent = createVisitorEvent(dateKey);
    saveTodayVisitorEvent(visitorEvent);
  }

  todayVisitorEvent = visitorEvent || null;
  updateVisitorMessage(todayVisitorEvent);
  renderVisitorTrace(todayVisitorEvent);
  renderVisitorLog();

  if (visitorEvent && (allowPlay || forcePlay)) {
    playVisitorEvent(visitorEvent, forcePlay);
  }
}

function forceVisitorForTest(type) {
  if (!isTestMode || !visitorRules[type]) {
    return;
  }

  const dateKey = getTodayKey();
  const visitorEvent = createVisitorEvent(dateKey, type);
  saveTodayVisitorEvent(visitorEvent);
  todayVisitorEvent = visitorEvent;
  visitorPlayedSessionDate = null;
  renderAll();
  showGardenScreen();
  playVisitorEvent(visitorEvent, true);
}

function formatVisitorDate(dateKey) {
  if (!isValidDateKey(dateKey)) {
    return "어느 날";
  }

  if (dateKey === getTodayKey()) {
    return "오늘";
  }

  if (dateKey === getRelativeDateKey(1)) {
    return "어제";
  }

  return formatDate(dateKey);
}

function getRecentVisitorRecords(limit = 3) {
  const visitorState = loadVisitorState();

  return (visitorState.events || [])
    .filter((event) => event?.hasVisitor && visitorRules[event.type])
    .slice(0, limit)
    .map((event) => {
      const rule = visitorRules[event.type];
      const trace = getVisitorTraceInfo(event);
      return {
        ...event,
        label: rule.label,
        recordMessage: rule.recordMessage || rule.message,
        traceLabel: trace?.label || rule.traceLabel,
        traceIcon: trace?.icon || rule.traceIcon,
        displayDate: formatVisitorDate(event.dateKey)
      };
    });
}

function renderVisitorTrace(visitorEvent = todayVisitorEvent) {
  if (!visitorTraceCardElement || !visitorTraceTitleElement || !visitorTraceTextElement || !visitorTraceMetaElement) {
    return;
  }

  const trace = getVisitorTraceInfo(visitorEvent);
  visitorTraceCardElement.classList.toggle("visitor-trace-ready", Boolean(trace));

  if (!treeData.treeName?.trim()) {
    visitorTraceTitleElement.textContent = "오늘 남은 흔적은 아직 없어요";
    visitorTraceTextElement.textContent = "내 나무 이름을 정하면 언젠가 방문자가 작은 흔적을 남기고 갈 수 있어요.";
    visitorTraceMetaElement.textContent = "이름을 정한 뒤 열려요";
    return;
  }

  if (treeData.history.length < 3) {
    visitorTraceTitleElement.textContent = "방문자 흔적은 조금 뒤에 열려요";
    visitorTraceTextElement.textContent = "나무가 3일차 이상 자라면 새나 다람쥐가 찾아와 작은 흔적을 남길 수 있어요.";
    visitorTraceMetaElement.textContent = "3일차 이후 가능";
    return;
  }

  if (!hasCheckedToday()) {
    visitorTraceTitleElement.textContent = "오늘 마음을 남기면 흔적이 생길 수 있어요";
    visitorTraceTextElement.textContent = "방문자는 오늘 감정을 기록한 뒤 확률에 따라 찾아와요. 찾아오면 정원에 작은 흔적이 남아요.";
    visitorTraceMetaElement.textContent = "오늘 기록 전";
    return;
  }

  if (!trace) {
    visitorTraceTitleElement.textContent = "오늘은 조용한 정원이에요";
    visitorTraceTextElement.textContent = "방문자가 없어도 괜찮아요. 오늘의 나무는 조용히 숨 쉬며 다음 방문을 기다리고 있어요.";
    visitorTraceMetaElement.textContent = "방문자 없음";
    return;
  }

  const rule = visitorRules[visitorEvent.type];
  visitorTraceTitleElement.textContent = `${trace.icon} ${trace.label}`;
  visitorTraceTextElement.textContent = trace.message;
  visitorTraceMetaElement.textContent = `${formatVisitorDate(visitorEvent.dateKey)} · ${rule.label}가 남긴 흔적`;
}

function renderVisitorLog() {
  if (!visitorLogCardElement || !visitorLogTitleElement || !visitorLogListElement || !visitorLogEmptyElement) {
    return;
  }

  const hasName = Boolean(treeData.treeName?.trim());
  const totalDays = treeData.history.length;
  const records = getRecentVisitorRecords(3);

  visitorLogCardElement.classList.toggle("visitor-log-ready", records.length > 0);

  if (!hasName) {
    visitorLogTitleElement.textContent = "방문 기록은 나무 이름을 정한 뒤 열려요";
    visitorLogListElement.innerHTML = "";
    visitorLogEmptyElement.textContent = "내 나무가 생기면 언젠가 작은 방문자의 흔적도 남을 수 있어요.";
    visitorLogEmptyElement.classList.remove("hidden");
    return;
  }

  if (totalDays < 3) {
    visitorLogTitleElement.textContent = "방문자는 나무가 조금 자란 뒤 찾아와요";
    visitorLogListElement.innerHTML = "";
    visitorLogEmptyElement.textContent = "3일차 이후부터 새나 다람쥐가 정원에 잠시 들를 수 있어요.";
    visitorLogEmptyElement.classList.remove("hidden");
    return;
  }

  if (records.length === 0) {
    visitorLogTitleElement.textContent = "아직 남은 방문 기록이 없어요";
    visitorLogListElement.innerHTML = "";
    visitorLogEmptyElement.textContent = "방문자가 없어도 나무는 천천히 자라고 있어요. 가끔 숲의 작은 친구가 찾아올 거예요.";
    visitorLogEmptyElement.classList.remove("hidden");
    return;
  }

  visitorLogTitleElement.textContent = "최근 숲에 다녀간 친구들";
  visitorLogEmptyElement.classList.add("hidden");
  visitorLogListElement.innerHTML = records
    .map((record) => {
      const typeClass = record.type === "bird" ? "visitor-log-bird" : "visitor-log-squirrel";
      return `
        <li class="visitor-log-item ${typeClass}">
          <span class="visitor-log-icon" aria-hidden="true">${record.type === "bird" ? "✦" : "✧"}</span>
          <div>
            <strong>${record.displayDate} · ${record.label}</strong>
            <p>${record.recordMessage}</p>
            <small class="visitor-log-trace">${record.traceIcon} ${record.traceLabel}</small>
          </div>
        </li>
      `;
    })
    .join("");
}

function createVisitorConditionTestTreeId() {
  const dateKey = getTodayKey();

  for (let index = 0; index < 100; index += 1) {
    const candidateTreeId = `visitor-condition-tree-${dateKey}-${index}`;
    const roll = hashStringToUnitInterval(`${candidateTreeId}-${dateKey}-visitor-roll`);

    if (roll < 0.32) {
      return candidateTreeId;
    }
  }

  return `visitor-condition-tree-${dateKey}`;
}

function seedVisitorHistoryForTest() {
  if (!isTestMode) {
    return;
  }

  const moods = ["good", "normal", "tired"];
  const history = Array.from({ length: 12 }, (_, index) => {
    return createHistoryRecord(index, moods[index % moods.length]);
  });

  treeData = normalizeTreeData(createNewTreeData({
    leaf: 13,
    trunk: 13,
    root: 13,
    lastCheckDate: getTodayKey(),
    history,
    treeName: "방문 기록 테스트 나무"
  }));
  saveTreeData();

  const events = [
    createVisitorEvent(getTodayKey(), "bird"),
    createVisitorEvent(getRelativeDateKey(1), "squirrel"),
    createVisitorEvent(getRelativeDateKey(3), "bird")
  ];

  saveVisitorState({ events });
  todayVisitorEvent = events[0];
  visitorPlayedSessionDate = null;
  shouldHighlightWorldSpot = false;
  renderAll();
  showGardenScreen();
}

function getServiceFlowInfo() {
  const hasName = Boolean(treeData.treeName?.trim());
  const hasHistory = treeData.history.length > 0;
  const checkedToday = hasCheckedToday();

  if (!hasName && !hasHistory) {
    return {
      title: "내 자리에서 시작하기",
      description: "숲 한가운데 기다리는 내 자리를 보고, 개인 정원으로 들어가요.",
      activeStep: "world",
      doneSteps: ["world"]
    };
  }

  if (!hasName) {
    return {
      title: "내 나무 이름 정하기",
      description: "이름을 한 번 정하면, 그다음 오늘의 마음을 남길 수 있어요.",
      activeStep: "name",
      doneSteps: ["world"]
    };
  }

  if (!checkedToday) {
    return {
      title: "오늘 마음 기록하기",
      description: "좋음, 보통, 피곤 중 지금의 나와 가까운 상태 하나만 골라요. 어떤 선택도 성장으로 남아요.",
      activeStep: "mood",
      doneSteps: ["world", "name"]
    };
  }

  return {
    title: "월드 숲에 반영됨",
    description: "오늘의 마음은 숲에 남았어요. 이제 그만 쉬어도 괜찮아요.",
    activeStep: "return",
    doneSteps: ["world", "name", "mood", "return"]
  };
}


function getDailyLoopInfo() {
  const hasName = Boolean(treeData.treeName?.trim());
  const checkedToday = hasCheckedToday();
  const todayRecord = getTodayRecord();
  const totalDays = treeData.history.length;
  const nextGoalMessage = getNextGoalMessage();

  if (checkedToday && todayRecord) {
    return {
      state: "done",
      title: "오늘은 여기까지",
      text: `오늘의 ${todayRecord.label} 기운이 숲에 남았어요. 이제 그만 쉬어도 괜찮아요. ${nextGoalMessage}`
    };
  }

  if (!hasName && totalDays === 0) {
    return {
      state: "start",
      title: "숲 한가운데 내 자리가 기다려요",
      text: "이름을 정하고 첫 마음을 남기면 나무가 바로 반응해요. 3일차에는 월드 숲에 작은 빛이 생겨요."
    };
  }

  if (!hasName) {
    return {
      state: "name",
      title: "내 나무 이름 정하기",
      text: "이름을 한 번 정하면, 오늘의 마음을 남기고 다음 성장 목표를 볼 수 있어요."
    };
  }

  return {
    state: "waiting",
    title: "오늘 내 나무 돌보기",
    text: `좋음, 보통, 피곤 중 지금과 가까운 마음 하나만 골라도 충분해요. ${nextGoalMessage}`
  };
}

function getTreeImageInfo() {
  const totalDays = treeData.history.length;

  if (totalDays === 0) {
    return {
      className: "tree-stage-seed",
      src: "assets/garden/tree-seed.svg",
      alt: "첫 기록을 기다리는 씨앗"
    };
  }

  if (totalDays <= 3) {
    return {
      className: "tree-stage-sprout",
      src: "assets/garden/tree-sprout.svg",
      alt: "밤 정원에서 자라는 작은 새싹"
    };
  }

  if (totalDays <= 14) {
    return {
      className: "tree-stage-young",
      src: "assets/garden/tree-young.svg",
      alt: "밤 정원에 자리 잡은 어린 나무"
    };
  }

  return {
    className: "tree-stage-grown",
    src: "assets/garden/tree-grown.svg",
    alt: "밤 정원 안에서 깊어진 나무"
  };
}

function getTreeState() {
  const todayMoodState = getTodayMoodState();

  if (todayMoodState) {
    return todayMoodState;
  }

  const { leaf, trunk, root } = treeData;
  const max = Math.max(leaf, trunk, root);
  const min = Math.min(leaf, trunk, root);

  if (max - min <= 1) {
    return "balanced";
  }

  if (leaf === max) {
    return "leaf-strong";
  }

  if (root === max) {
    return "root-strong";
  }

  return "trunk-strong";
}

function getWorldSpotInfo() {
  const days = treeData.history.length;
  const hasName = Boolean(treeData.treeName?.trim());

  if (days === 0) {
    return {
      className: "world-seed",
      visual: "•",
      status: hasName
        ? "이름을 얻은 작은 자리가 오늘의 마음을 기다리고 있어요."
        : "숲 한가운데, 아직 이름 없는 작은 자리가 기다리고 있어요."
    };
  }

  if (days <= 2) {
    return {
      className: "world-sprout",
      visual: "✦",
      status: "월드 숲에 들어갈 준비를 하고 있어요. 3일차에는 작은 빛이 생겨요."
    };
  }

  if (days <= 6) {
    return {
      className: "world-sprout world-preview",
      visual: "✦",
      status: "월드 숲의 내 자리 주변에 작은 빛이 생겼어요. 7일차에는 정식으로 자리 잡아요."
    };
  }

  if (days < 30) {
    return {
      className: "world-tree",
      visual: "✧",
      status: "내 나무가 월드 숲에 정식으로 자리 잡았어요."
    };
  }

  return {
    className: "world-tree world-mature",
    visual: "✺",
    status: "작은 숲의 중심나무로 깊게 뿌리내렸어요."
  };
}

function chooseMood(mood) {
  if (!treeData.treeName?.trim()) {
    renderAll();
    return;
  }

  if (hasCheckedToday()) {
    updateTodayStatus();
    renderAll();
    return;
  }

  const rule = moodRules[mood];

  treeData.leaf += rule.leaf;
  treeData.trunk += rule.trunk;
  treeData.root += rule.root;
  treeData.lastCheckDate = getTodayKey();
  treeData.history.unshift({
    date: getTodayKey(),
    mood,
    label: rule.label,
    icon: rule.icon,
    message: rule.message
  });

  saveTreeData();
  shouldHighlightWorldSpot = true;

  renderWorld();
  renderDailyLoop();
  renderHeader();
  renderTreeName();
  renderTree(true);
  renderForestEffect(rule.state, true);
  renderMessages(`오늘은 ${rule.message} 오늘의 기운이 밤 정원과 숲에 조용히 스며들었어요. ${getNextGoalMessage()}`);
  renderServiceFlow();
  renderCompleteCard();
  updateTodayStatus();
  prepareDailyVisitor({ forcePlay: true, allowCreate: true, allowPlay: true });
}

function getWorldSlotVisual(slot) {
  if (slot.days <= 0) {
    return "•";
  }

  if (slot.days <= 3) {
    return "✦";
  }

  if (slot.days <= 14) {
    return "✧";
  }

  return "✺";
}

function getWorldSlotStateLabel(state) {
  if (state === "leaf-strong") {
    return "잎의 기운";
  }

  if (state === "root-strong") {
    return "뿌리의 기운";
  }

  return "고른 기운";
}

function renderWorldNeighbors() {
  if (!worldNeighborSpotsElement) {
    return;
  }

  worldNeighborSpotsElement.innerHTML = worldForestSlots
    .map((slot) => {
      const visual = getWorldSlotVisual(slot);
      const stateLabel = getWorldSlotStateLabel(slot.state);

      return `
        <article
          class="neighbor-spot slot-${slot.state}"
          style="--slot-x: ${slot.x}%; --slot-y: ${slot.y}%; --slot-scale: ${slot.scale}; --slot-opacity: ${slot.opacity}; --slot-mobile-x: ${slot.mobileX}%; --slot-mobile-y: ${slot.mobileY}%; --slot-mobile-scale: ${slot.mobileScale};"
          aria-label="${slot.name}, ${slot.days}일째 자라는 자리, ${stateLabel}"
        >
          <span aria-hidden="true"></span>
          <em aria-hidden="true">${visual}</em>
          <small>${slot.name}</small>
        </article>
      `;
    })
    .join("");
}

function renderWorldCommunityHint(todayRecord) {
  if (!worldCommunityHintElement) {
    return;
  }

  const slotCount = worldForestSlots.length;

  if (todayRecord) {
    worldCommunityHintElement.textContent = `주변의 ${slotCount}개 자리 사이에 오늘의 ${todayRecord.label} 기운이 함께 머물고 있어요.`;
    return;
  }

  if (treeData.history.length === 0) {
    worldCommunityHintElement.textContent = `이미 ${slotCount}개의 작은 자리가 숲에서 조용히 숨 쉬고 있어요.`;
    return;
  }

  worldCommunityHintElement.textContent = `주변의 ${slotCount}개 자리와 함께, 내 나무도 오늘의 기운을 기다리고 있어요.`;
}

function renderWorld() {
  const name = treeData.treeName?.trim() || "이름 없는 나무";
  const todayRecord = getTodayRecord();
  const spotInfo = getWorldSpotInfo();

  renderWorldNeighbors();
  renderWorldCommunityHint(todayRecord);

  myWorldSpotElement.className = `my-world-spot ${spotInfo.className}`;
  mySpotVisualElement.textContent = spotInfo.visual;
  mySpotNameElement.textContent = name;
  mySpotStatusElement.textContent = spotInfo.status;

  if (todayRecord) {
    const moodClass = `mood-${todayRecord.mood}`;
    mySpotAuraElement.innerHTML = `<span class="${moodClass}"></span><span class="${moodClass}"></span><span class="${moodClass}"></span>`;
    worldSummaryTodayElement.textContent = `오늘 ${todayRecord.label}`;
    worldSummaryTextElement.textContent = `오늘의 ${todayRecord.label} 기운이 내 자리 주변에 조용히 머물고 있어요.`;
  } else {
    mySpotAuraElement.innerHTML = "";
    worldSummaryTodayElement.textContent = "오늘 기록 전";

    if (treeData.history.length === 0) {
      worldSummaryTextElement.textContent = treeData.treeName?.trim()
        ? "이름을 얻은 작은 자리가 오늘의 마음을 기다리고 있어요."
        : "숲 한가운데, 아직 이름 없는 작은 자리가 기다리고 있어요.";
    } else {
      worldSummaryTextElement.textContent = getWorldProgressMessage();
    }
  }

  worldSummaryNameElement.textContent = name;
  myWorldSpotElement.setAttribute("aria-label", `${name}의 월드 숲 자리`);

  if (hasCheckedToday()) {
    goGardenBtnElement.textContent = "내 정원 조용히 둘러보기";
  } else if (!treeData.treeName?.trim()) {
    goGardenBtnElement.textContent = treeData.history.length === 0 ? "내 자리에서 시작하기" : "내 나무 이름 정하러 가기";
  } else {
    goGardenBtnElement.textContent = "오늘 내 나무 돌보기";
  }
}

function renderServiceFlow() {
  const flowElements = [
    flowTitleElement,
    flowDescriptionElement,
    flowStepWorldElement,
    flowStepNameElement,
    flowStepMoodElement,
    flowStepReturnElement
  ];

  if (flowElements.some((element) => !element)) {
    return;
  }

  const flow = getServiceFlowInfo();

  flowTitleElement.textContent = flow.title;
  flowDescriptionElement.textContent = flow.description;

  const steps = [
    { key: "world", element: flowStepWorldElement },
    { key: "name", element: flowStepNameElement },
    { key: "mood", element: flowStepMoodElement },
    { key: "return", element: flowStepReturnElement }
  ];

  steps.forEach((step) => {
    step.element.classList.remove("done", "active", "waiting");

    if (flow.activeStep === step.key) {
      step.element.classList.add("active");
    } else if (flow.doneSteps.includes(step.key)) {
      step.element.classList.add("done");
    } else {
      step.element.classList.add("waiting");
    }
  });
}

function renderDailyLoop() {
  if (!dailyLoopCardElement || !dailyLoopTitleElement || !dailyLoopTextElement) {
    return;
  }

  const loop = getDailyLoopInfo();
  dailyLoopCardElement.classList.toggle("done", loop.state === "done");
  dailyLoopTitleElement.textContent = loop.title;
  dailyLoopTextElement.textContent = loop.text;
}

function renderCompleteCard() {
  const todayRecord = getTodayRecord();

  if (!todayRecord) {
    completeCardElement.classList.add("hidden");
    completeMessageElement.textContent = "오늘의 기운이 월드 숲에 조용히 스며들었어요.";
    return;
  }

  completeCardElement.classList.remove("hidden");
  completeMessageElement.textContent = `오늘의 ${todayRecord.label} 기운이 내 나무와 월드 숲의 내 자리에 조용히 스며들었어요. 오늘의 마음은 숲에 남았어요. 이제 그만 쉬어도 괜찮아요. ${getNextGoalMessage()}`;
}

function renderHeader() {
  const name = treeData.treeName?.trim() || "이름 없는 나무";
  const stage = getGrowthStage();
  const todayRecord = getTodayRecord();

  treeNameDisplayElement.textContent = name;
  stageBadgeElement.textContent = stage.name;
  totalDaysElement.textContent = `${treeData.history.length}일`;
  todayDateChipElement.textContent = `오늘 ${formatDate(getTodayKey())}`;

  if (todayRecord) {
    todayStateChipElement.textContent = `기록 완료 · ${todayRecord.label}`;
  } else {
    todayStateChipElement.textContent = "오늘 기록 전";
  }
}

function renderTree(animate = false) {
  const state = getTreeState();
  const imageInfo = getTreeImageInfo();
  treeElement.className = `tree tree-image-layer ${imageInfo.className} ${state}`;
  treeImageElement.src = imageInfo.src;
  treeImageElement.alt = imageInfo.alt;
  skyElement.classList.remove("garden-mood-leaf", "garden-mood-balanced", "garden-mood-root");

  if (state === "leaf-strong") {
    skyElement.classList.add("garden-mood-leaf");
  }

  if (state === "balanced") {
    skyElement.classList.add("garden-mood-balanced");
  }

  if (state === "root-strong") {
    skyElement.classList.add("garden-mood-root");
  }

  if (animate) {
    treeElement.classList.remove("grow-animate");
    void treeElement.offsetWidth;
    treeElement.classList.add("grow-animate");
  }

  birdElement.classList.remove("active");
  squirrelElement.classList.remove("active");
}

function renderForestEffect(state = null, animate = false) {
  effectLayerElement.className = "effect-layer";

  if (!state || !forestEffectRules[state]) {
    effectLayerElement.innerHTML = "";
    return;
  }

  const effect = forestEffectRules[state];
  effectLayerElement.classList.add(effect.className);
  effectLayerElement.innerHTML = effect.symbols
    .map((symbol) => `<span class="effect-particle">${symbol}</span>`)
    .join("");

  if (animate) {
    effectLayerElement.classList.remove("burst");
    void effectLayerElement.offsetWidth;
    effectLayerElement.classList.add("burst");
  }
}

function renderMessages(customMessage) {
  if (customMessage) {
    growthMessageElement.textContent = customMessage;
  } else if (treeData.history.length > 0) {
    growthMessageElement.textContent = `가장 최근 기록: ${treeData.history[0].message}`;
  } else if (!treeData.treeName?.trim()) {
    growthMessageElement.textContent = "먼저 내 나무 이름을 정하면 오늘의 마음을 남길 수 있어요.";
  } else {
    growthMessageElement.textContent = "오늘의 상태를 선택하면 나무가 자라요.";
  }

  updateVisitorMessage(todayVisitorEvent);
}

function renderTreeName() {
  const name = treeData.treeName?.trim();

  if (name) {
    treeNameInputElement.value = name;
    treeNameMessageElement.textContent = `${name}는 오늘도 천천히 자라고 있어요.`;
    nameCardElement.classList.add("hidden");
  } else {
    treeNameInputElement.value = "";
    treeNameMessageElement.textContent = "이름을 정하면 오늘 마음을 남길 수 있어요. 이름은 한 번만 정할 수 있어요.";
    nameCardElement.classList.remove("hidden");
  }
}

function saveTreeName() {
  const name = treeNameInputElement.value.trim();

  if (!name || treeData.treeName?.trim()) {
    return;
  }

  treeData.treeName = name;
  saveTreeData();
  renderTreeName();
  renderAll();
}

function updateTodayStatus() {
  const checked = hasCheckedToday();
  const todayRecord = getTodayRecord();
  const hasName = Boolean(treeData.treeName?.trim());

  moodButtons.forEach((button) => {
    const isSelected = todayRecord?.mood === button.dataset.mood;
    button.disabled = checked || !hasName;
    button.classList.toggle("selected", Boolean(isSelected));
  });

  if (moodCardElement) {
    moodCardElement.classList.toggle("mood-locked", !hasName && !checked);
  }

  if (!hasName) {
    todayStatusElement.textContent = "먼저 나무 이름을 정하면 오늘의 마음을 남길 수 있어요.";
    if (moodGuideElement) {
      moodGuideElement.textContent = "이름을 정한 뒤, 좋음 / 보통 / 피곤 중 하나를 고르면 돼요.";
    }
    backToWorldBtnBottomElement.textContent = "전체 숲으로 돌아가기";
    return;
  }

  if (checked) {
    const label = todayRecord ? todayRecord.label : "기록됨";
    todayStatusElement.textContent = `오늘(${formatDate(getTodayKey())})은 이미 "${label}" 상태를 기록했어요.`;
    if (moodGuideElement) {
      moodGuideElement.textContent = "오늘의 기록은 완료됐어요. 더 고르지 않아도 괜찮아요.";
    }
    backToWorldBtnBottomElement.textContent = "전체 숲에서 내 자리 보기";
  } else {
    todayStatusElement.textContent = `오늘(${formatDate(getTodayKey())})의 상태를 아직 기록하지 않았어요.`;
    if (moodGuideElement) {
      moodGuideElement.textContent = `하루에 한 번, 지금의 나와 가까운 상태를 골라주세요. ${getNextGoalMessage()}`;
    }
    backToWorldBtnBottomElement.textContent = "전체 숲으로 돌아가기";
  }
}

function createHistoryRecord(daysAgo, mood) {
  const rule = moodRules[mood] || moodRules.normal;

  return {
    date: getRelativeDateKey(daysAgo),
    mood,
    label: rule.label,
    icon: rule.icon,
    message: rule.message
  };
}

function createTestPresetData(preset) {
  if (preset === "named") {
    return {
      ...createNewTreeData(),
      treeName: "테스트 나무"
    };
  }

  if (preset === "waiting") {
    return createNewTreeData({
      leaf: 3,
      trunk: 3,
      root: 3,
      lastCheckDate: getRelativeDateKey(1),
      history: [createHistoryRecord(1, "normal")],
      treeName: "테스트 나무"
    });
  }

  if (preset === "done") {
    return createNewTreeData({
      leaf: 4,
      trunk: 3,
      root: 1,
      lastCheckDate: getTodayKey(),
      history: [createHistoryRecord(0, "good")],
      treeName: "테스트 나무"
    });
  }

  if (preset === "grown") {
    const moods = ["good", "normal", "tired"];
    const history = Array.from({ length: 30 }, (_, index) => {
      return createHistoryRecord(index, moods[index % moods.length]);
    });

    return createNewTreeData({
      leaf: 31,
      trunk: 31,
      root: 31,
      lastCheckDate: getTodayKey(),
      history,
      treeName: "깊어진 테스트 나무"
    });
  }

  return createNewTreeData();
}

function applyTestPreset(preset) {
  if (!isTestMode) {
    return;
  }

  if (preset === "visitor-before-care") {
    const moods = ["good", "normal", "tired"];
    const history = Array.from({ length: 8 }, (_, index) => {
      return createHistoryRecord(index + 1, moods[index % moods.length]);
    });

    treeData = normalizeTreeData(createNewTreeData({
      leaf: 9,
      trunk: 9,
      root: 9,
      treeId: createVisitorConditionTestTreeId(),
      lastCheckDate: getRelativeDateKey(1),
      history,
      treeName: "조건 테스트 나무"
    }));
    saveTreeData();
    saveVisitorState({ events: [] });
    todayVisitorEvent = null;
    visitorPlayedSessionDate = null;
    shouldHighlightWorldSpot = false;
    renderAll();
    showGardenScreen();
    return;
  }

  if (preset === "visitor-after-care") {
    const moods = ["good", "normal", "tired"];
    const history = Array.from({ length: 8 }, (_, index) => {
      return createHistoryRecord(index, moods[index % moods.length]);
    });

    treeData = normalizeTreeData(createNewTreeData({
      leaf: 9,
      trunk: 9,
      root: 9,
      treeId: createVisitorConditionTestTreeId(),
      lastCheckDate: getTodayKey(),
      history,
      treeName: "기록 완료 테스트 나무"
    }));
    saveTreeData();
    saveVisitorState({ events: [] });
    todayVisitorEvent = null;
    visitorPlayedSessionDate = null;
    shouldHighlightWorldSpot = false;
    renderAll();
    showGardenScreen();
    return;
  }

  if (preset === "visitor-history") {
    seedVisitorHistoryForTest();
    return;
  }

  if (preset === "visitor-bird" || preset === "visitor-squirrel") {
    const moods = ["good", "normal", "tired"];
    const history = Array.from({ length: 8 }, (_, index) => {
      return createHistoryRecord(index, moods[index % moods.length]);
    });
    treeData = normalizeTreeData(createNewTreeData({
      leaf: 9,
      trunk: 9,
      root: 9,
      lastCheckDate: getTodayKey(),
      history,
      treeName: "방문자 테스트 나무"
    }));
    saveTreeData();
    shouldHighlightWorldSpot = false;
    forceVisitorForTest(preset === "visitor-bird" ? "bird" : "squirrel");
    return;
  }

  if (preset === "legacy") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      leaf: 5,
      trunk: 4,
      root: 3,
      lastCheckDate: getRelativeDateKey(1),
      history: [createHistoryRecord(1, "tired"), createHistoryRecord(2, "normal")],
      treeName: "구버전 테스트"
    }));
    treeData = loadTreeData();
    saveTreeData();
    shouldHighlightWorldSpot = false;
    renderAll();
    showWorldScreen();
    return;
  }

  treeData = normalizeTreeData(createTestPresetData(preset));
  saveTreeData();
  shouldHighlightWorldSpot = preset === "done" || preset === "grown";
  renderAll();
  showWorldScreen();
}

function clearTestData() {
  if (!isTestMode) {
    return;
  }

  localStorage.removeItem(TEST_STORAGE_KEY);
  localStorage.removeItem(VISITOR_STORAGE_KEY);
  localStorage.removeItem(OWNER_STORAGE_KEY);
  treeData = loadTreeData();
  shouldHighlightWorldSpot = false;
  renderAll();
  showWorldScreen();
}

function renderTestModeStatus() {
  if (!isTestMode || !testModeDataInfoElement) {
    return;
  }

  const shortTreeId = treeData.treeId ? treeData.treeId.slice(0, 22) : "tree-id 없음";
  const storageMode = treeData.storageInfo?.mode || STORAGE_CONFIG.mode;
  testModeDataInfoElement.textContent = `${APP_CONFIG.version} · schema ${treeData.dataSchemaVersion} · ${storageMode} · ${shortTreeId}`;
}

function setupTestMode() {
  if (!testModePanelElement) {
    return;
  }

  if (!isTestMode) {
    testModePanelElement.classList.add("hidden");
    return;
  }

  document.body.classList.add("dev-test-mode");
  testModePanelElement.classList.remove("hidden");

  if (testModeStorageKeyElement) {
    testModeStorageKeyElement.textContent = STORAGE_KEY;
  }

  testPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyTestPreset(button.dataset.testPreset);
    });
  });

  if (clearTestDataBtnElement) {
    clearTestDataBtnElement.addEventListener("click", clearTestData);
  }
}

function highlightWorldSpot() {
  myWorldSpotElement.classList.remove("world-spot-highlight");
  void myWorldSpotElement.offsetWidth;
  myWorldSpotElement.classList.add("world-spot-highlight");

  window.setTimeout(() => {
    myWorldSpotElement.classList.remove("world-spot-highlight");
  }, 1500);
}

function showWorldScreen() {
  renderWorld();
  worldScreenElement.classList.add("screen-active");
  gardenScreenElement.classList.remove("screen-active");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (shouldHighlightWorldSpot) {
    window.requestAnimationFrame(() => {
      highlightWorldSpot();
      shouldHighlightWorldSpot = false;
    });
  }
}

function showGardenScreen() {
  gardenScreenElement.classList.add("screen-active");
  worldScreenElement.classList.remove("screen-active");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const canCheckVisitorAfterCare = hasCheckedToday();
  prepareDailyVisitor({
    allowCreate: canCheckVisitorAfterCare,
    allowPlay: canCheckVisitorAfterCare
  });
}

function renderAll() {
  renderTestModeStatus();
  renderWorld();
  renderDailyLoop();
  renderServiceFlow();
  renderHeader();
  renderTreeName();
  renderTree();
  renderForestEffect(getTodayMoodState());
  renderMessages();
  renderCompleteCard();
  renderVisitorTrace();
  renderVisitorLog();
  updateTodayStatus();
}

treeNameFormElement.addEventListener("submit", (event) => {
  event.preventDefault();
  saveTreeName();
});

moodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chooseMood(button.dataset.mood);
  });
});

goGardenBtnElement.addEventListener("click", showGardenScreen);
backToWorldBtnTopElement.addEventListener("click", showWorldScreen);
backToWorldBtnBottomElement.addEventListener("click", showWorldScreen);

saveTreeData();
setupTestMode();
renderAll();
showWorldScreen();
