// 오늘의숲 DEV v0.3.0 · 시간대별 성장 나무 적용
// 프로젝트명: 살아있는 숲
// 버전명: DEV v0.3.0 · 시간대별 성장 나무 적용
// 목적: 전체숲 시간대별 전용 배경 이미지를 연결하고 오버레이 실험을 원복
// 저장 방식: localStorage + Google Sheets friend_seats/friend_links 연동
// 저장 방식: localStorage 유지

const APP_CONFIG = {
  name: "살아있는 숲",
  version: "DEV v0.3.0 · 시간대별 성장 나무 적용",
  dataSchemaVersion: 12,
  baseStorageKey: "livingForestV012",
  testStorageKey: "livingForestV012_TEST",
  serviceTimeZoneOffsetMinutes: 9 * 60
};

const APP_ENV = "development";
const IS_DEV_BUILD = APP_ENV === "development";

const KAKAO_SHARE_CONFIG = {
  javascriptKey: "a8e1dde7570cf9d030b20628c29e75a4",
  enabled: true
};


// V1.70.3 test: GA4 관리자 데이터 연결 유지 헬퍼

// V1.70.3 test: 관리자 대시보드용 Google Sheets 연결 유지
// 기존에 연결한 Apps Script 웹 앱 URL을 유지합니다.
// 비어 있으면 GA4만 기록되고, Google Sheets 자동 집계는 실행되지 않습니다.
const ADMIN_TRACKING_CONFIG = {
  endpointUrl: "https://script.google.com/macros/s/AKfycbyeqnUwroduXytKBFMs9Tpl2gngoJ0f6JmF9oKbEA-QAoJY0aFJ-bvOUWS15SFeErgkiA/exec",
  projectKey: "living_forest_v1",
};

function getAdminAnonId() {
  try {
    const key = IS_DEV_BUILD ? "livingForestAdminAnonId_DEV" : (isTestMode ? "livingForestAdminAnonId_TEST" : "livingForestAdminAnonId");
    let anonId = localStorage.getItem(key);

    if (!anonId) {
      const randomPart = Math.random().toString(36).slice(2, 10);
      const timePart = Date.now().toString(36);
      anonId = `lf_${timePart}_${randomPart}`;
      localStorage.setItem(key, anonId);
    }

    return anonId;
  } catch (error) {
    return "unknown";
  }
}

function sendAdminTrackingEvent(eventName, params = {}) {
  try {
    if (!ADMIN_TRACKING_CONFIG.endpointUrl) {
      return;
    }

    const url = new URL(ADMIN_TRACKING_CONFIG.endpointUrl);
    url.searchParams.set("action", "track");
    url.searchParams.set("key", ADMIN_TRACKING_CONFIG.projectKey);
    url.searchParams.set("event_name", eventName);
    url.searchParams.set("anon_id", getAdminAnonId());
    url.searchParams.set("app_version", APP_CONFIG.version);
    url.searchParams.set("schema", String(APP_CONFIG.dataSchemaVersion));
    url.searchParams.set("is_test_mode", isTestMode ? "yes" : "no");
    url.searchParams.set("page_path", window.location.pathname || "/");
    url.searchParams.set("growth_days", String(Array.isArray(treeData?.history) ? treeData.history.length : 0));
    url.searchParams.set("tree_stage", getTreeStageName(Array.isArray(treeData?.history) ? treeData.history.length : 0));

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      const safeValue = String(value).slice(0, 80);
      url.searchParams.set(`p_${key}`, safeValue);
    });

    const beacon = new Image();
    beacon.referrerPolicy = "no-referrer-when-downgrade";
    beacon.src = url.toString();
  } catch (error) {
    console.warn("Admin tracking skipped:", error);
  }
}

const ANALYTICS_CONFIG = {
  measurementId: "G-YC872G7MH1",
  eventCategory: "living_forest",
};

function getForestInviteSource() {
  const inviteValue = (urlParams.get("invite") || urlParams.get("from") || urlParams.get("source") || "").toLowerCase();
  const hasOnlineInviteParams = Boolean(
    (urlParams.get("forest") || urlParams.get("forestId") || urlParams.get("forest_id"))
    && (urlParams.get("seat") || urlParams.get("seatId") || urlParams.get("seat_id"))
  );

  if (["forest_sentence", "forest-sentence", "forest_share", "forest-share", "sentence_share", "sentence-share"].includes(inviteValue)) {
    return "forest_sentence";
  }

  if (["friend-forest", "friend_forest", "online-friend", "online_friend"].includes(inviteValue) || hasOnlineInviteParams) {
    return "friend_forest";
  }

  return "";
}

function isForestInviteVisit() {
  return forestInviteSource === "forest_sentence";
}

function getTreeStageName(days) {
  if (days >= 30) return "hero";
  if (days >= 21) return "young";
  if (days >= 14) return "early_tree";
  if (days >= 7) return "sapling";
  if (days >= 3) return "seedling";
  if (days >= 1) return "sprout";
  return "germination";
}

function trackForestEvent(eventName, params = {}) {
  try {
    sendAdminTrackingEvent(eventName, params);
    if (typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", eventName, {
      event_category: ANALYTICS_CONFIG.eventCategory,
      app_name: APP_CONFIG.name,
      app_version: APP_CONFIG.version,
      data_schema_version: APP_CONFIG.dataSchemaVersion,
      is_test_mode: isTestMode ? "yes" : "no",
      growth_days: Array.isArray(treeData?.history) ? treeData.history.length : 0,
      tree_stage: getTreeStageName(Array.isArray(treeData?.history) ? treeData.history.length : 0),
      ...params,
    });
  } catch (error) {
    console.warn("Analytics tracking skipped:", error);
  }
}

const trackedMilestones = new Set();

function trackGrowthMilestones() {
  const days = Array.isArray(treeData?.history) ? treeData.history.length : 0;
  const milestones = [1, 3, 7, 14, 21, 30];

  milestones.forEach((milestone) => {
    const key = `growth_day_${milestone}`;
    if (days >= milestone && !trackedMilestones.has(key)) {
      trackedMilestones.add(key);
      trackForestEvent("growth_milestone_reached", {
        milestone_day: milestone,
      });

      if (milestone === 7) {
        trackForestEvent("growth_day_7_reached", {
          milestone_day: 7,
        });
      }
    }
  });
}

function trackReturnVisitIfNeeded() {
  try {
    const today = getTodayKey();
    const lastVisitKey = IS_DEV_BUILD ? "livingForestAnalyticsLastVisit_DEV" : (isTestMode ? "livingForestAnalyticsLastVisit_TEST" : "livingForestAnalyticsLastVisit");
    const firstVisitKey = IS_DEV_BUILD ? "livingForestAnalyticsFirstVisit_DEV" : (isTestMode ? "livingForestAnalyticsFirstVisit_TEST" : "livingForestAnalyticsFirstVisit");

    const firstVisit = localStorage.getItem(firstVisitKey);
    const lastVisit = localStorage.getItem(lastVisitKey);

    if (!firstVisit) {
      localStorage.setItem(firstVisitKey, today);
      trackForestEvent("first_visit_living_forest");
    } else if (lastVisit && lastVisit !== today) {
      trackForestEvent("return_visit", {
        previous_visit_date: lastVisit,
        current_visit_date: today,
      });
    }

    localStorage.setItem(lastVisitKey, today);
  } catch (error) {
    console.warn("Return visit tracking skipped:", error);
  }
}

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
const forestInviteSource = getForestInviteSource();
const STORAGE_KEY = IS_DEV_BUILD ? `${BASE_STORAGE_KEY}_DEV` : (isTestMode ? TEST_STORAGE_KEY : BASE_STORAGE_KEY);
const ONLINE_FOREST_STORAGE_KEY = `${STORAGE_KEY}_ONLINE_FOREST_ID_V1`;
const ONLINE_FRIEND_STORAGE_KEY = `${STORAGE_KEY}_ONLINE_FRIEND_ID_V1`;
let onlineFriendSeats = {};
let onlineFriendLoadState = "idle";
let onlineFriendLastError = "";
let onlineFriendLinks = [];
let onlineFriendLinksLoadState = "idle";
let onlineFriendLinksLastError = "";
let friendLinkAssignState = "idle";
let friendLinkAssignMessage = "";
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


const forestDiaryRules = {
  good: {
    dayTitle: "잎이 밝아진 날",
    shortLabel: "밝은 잎",
    sentences: [
      "오늘의 밝은 마음이 잎 끝에 오래 머물렀어요.",
      "가벼운 마음이 숲 안쪽까지 부드럽게 번졌어요.",
      "나무가 오늘의 좋은 기운을 잎사귀 빛으로 간직했어요."
    ],
    flowText: "최근 밝은 기록이 많아요. 잎이 더 쉽게 빛을 받아들이는 흐름이에요."
  },
  normal: {
    dayTitle: "균형을 회복한 날",
    shortLabel: "고른 숨",
    sentences: [
      "조용한 균형이 나무 안쪽에 차분히 남았어요.",
      "크게 흔들리지 않는 하루가 줄기를 천천히 단단하게 했어요.",
      "오늘의 보통 마음도 숲에는 안정된 숨으로 쌓였어요."
    ],
    flowText: "최근 균형 잡힌 기록이 많아요. 나무가 무리하지 않고 고르게 자라는 흐름이에요."
  },
  tired: {
    dayTitle: "뿌리가 깊어진 날",
    shortLabel: "깊은 뿌리",
    sentences: [
      "오늘은 위로 자라기보다 아래로 단단해진 날이에요.",
      "피곤한 마음도 뿌리 가까이에 조용한 힘으로 남았어요.",
      "쉬어가고 싶은 마음이 나무를 더 깊이 붙잡아 주었어요."
    ],
    flowText: "최근 피곤한 기록이 많아요. 잎보다 뿌리가 먼저 깊어지는 회복의 흐름이에요."
  }
};

const TREE_GROWTH_ASSET_BASE = "assets/garden/tree_growth";

const growthStageRules = [
  { minDays: 0, maxDays: 2, name: "처음 깨어난 새싹" },
  { minDays: 3, maxDays: 6, name: "봉오리가 올라온 새싹" },
  { minDays: 7, maxDays: 13, name: "줄기가 자란 어린 나무" },
  { minDays: 14, maxDays: 20, name: "꽃이 피는 작은 나무" },
  { minDays: 21, maxDays: 29, name: "풍성해지는 나무" },
  { minDays: 30, maxDays: Infinity, name: "완성된 마음 나무" }
];

const treeImageStageRules = [
  { minDays: 0, maxDays: 2, className: "tree-stage-germination", stage: 1, alt: "꽃밭 위에서 작게 깨어난 새싹" },
  { minDays: 3, maxDays: 6, className: "tree-stage-sprout", stage: 2, alt: "봉오리와 잎을 펼친 새싹" },
  { minDays: 7, maxDays: 13, className: "tree-stage-seedling", stage: 3, alt: "줄기와 가지가 자라난 어린 나무" },
  { minDays: 14, maxDays: 20, className: "tree-stage-sapling", stage: 4, alt: "꽃과 잎이 돋아난 작은 나무" },
  { minDays: 21, maxDays: 29, className: "tree-stage-young", stage: 5, alt: "잎과 꽃이 풍성해지는 나무" },
  { minDays: 30, maxDays: Infinity, className: "tree-stage-hero", stage: 6, alt: "한 달의 마음 기록으로 완성된 나무" }
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


const streakRewardRules = [
  {
    day: 3,
    title: "작은 빛",
    teaser: "내 나무 주변에 작은 빛이 머물기 시작해요.",
    reached: "3일째 이어진 마음이 작은 빛으로 남았어요."
  },
  {
    day: 7,
    title: "방문자의 기척",
    teaser: "숲의 방문자가 내 나무를 더 자주 알아차릴 수 있어요.",
    reached: "7일째 숲을 돌본 흔적이 방문자의 기척으로 이어졌어요."
  },
  {
    day: 14,
    title: "선명해지는 자리",
    teaser: "월드 숲에서 내 자리의 빛과 그림자가 더 선명해져요.",
    reached: "14일째 이어진 기록이 내 자리를 더 또렷하게 만들었어요."
  },
  {
    day: 30,
    title: "오래 돌본 나무",
    teaser: "내 나무가 작은 숲의 중심처럼 더 깊게 자리 잡아요.",
    reached: "30일 동안 이어진 마음이 오래 돌본 나무의 분위기를 만들었어요."
  }
];

const worldEvolutionRules = [
  {
    day: 1,
    title: "첫 월드 흔적",
    teaser: "월드 숲의 내 자리에 작은 씨앗빛이 남아요.",
    reached: "첫 기록이 월드 숲의 내 자리에 작은 씨앗빛으로 남았어요.",
    className: "world-growth-seed"
  },
  {
    day: 3,
    title: "작은 빛 자리",
    teaser: "내 자리 주변에 작은 빛이 맴돌기 시작해요.",
    reached: "3일의 기록이 내 자리 주변에 작은 빛을 만들었어요.",
    className: "world-growth-light"
  },
  {
    day: 7,
    title: "숲길에 자리 잡기",
    teaser: "월드 숲길 근처에서 내 나무의 존재감이 더 분명해져요.",
    reached: "7일의 기록으로 내 나무가 월드 숲길에 조금 더 단단히 자리 잡았어요.",
    className: "world-growth-rooted"
  },
  {
    day: 14,
    title: "선명한 빈터",
    teaser: "내 나무 주변 풀과 빛이 더 선명하게 살아나요.",
    reached: "14일의 기록이 내 나무 주변의 빈터를 더 선명하게 만들었어요.",
    className: "world-growth-clearing"
  },
  {
    day: 30,
    title: "오래 돌본 자리",
    teaser: "내 나무가 월드 숲 안에서 오래 돌본 나무처럼 깊어져요.",
    reached: "30일의 기록이 내 자리를 오래 돌본 나무의 분위기로 바꾸었어요.",
    className: "world-growth-mature"
  },
  {
    day: 60,
    title: "대표 나무의 기운",
    teaser: "월드 숲 안에서 내 나무가 대표 나무처럼 조용한 존재감을 가져요.",
    reached: "60일의 기록이 내 나무를 월드 숲의 대표 나무처럼 깊게 만들었어요.",
    className: "world-growth-hero"
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

const treeCareRules = {
  water: {
    label: "물 주기",
    icon: "💧",
    title: "물을 머금은 나무",
    message: "오늘의 마음 위에 맑은 물을 조금 더해줬어요. 내 나무가 조용히 숨을 고르고 있어요."
  },
  light: {
    label: "빛 쬐기",
    icon: "☀️",
    title: "빛을 받은 나무",
    message: "오늘의 마음 위로 따뜻한 빛이 내려앉았어요. 잎 끝에 작은 밝기가 머물렀어요."
  },
  rest: {
    label: "쉬게 하기",
    icon: "🌙",
    title: "쉬어가는 나무",
    message: "오늘은 더 자라라고 재촉하지 않고 나무를 쉬게 했어요. 쉬는 시간도 숲의 일부로 남았어요."
  }
};


const gardenMarkerRules = {
  wildflower: {
    label: "들꽃",
    icon: "🌼",
    title: "나무 곁의 들꽃",
    message: "내 나무 곁에 작은 들꽃을 놓았어요. 정원이 조금 더 말랑하고 환한 자리로 느껴져요.",
    className: "garden-marker-wildflower",
    imageSrc: ""
  },
  pebble: {
    label: "조약돌",
    icon: "🪨",
    title: "나무 곁의 조약돌",
    message: "내 나무 곁에 동그란 조약돌을 놓았어요. 조용히 기대어 쉬어갈 수 있는 느낌이 남아요.",
    className: "garden-marker-pebble",
    imageSrc: ""
  },
  lantern: {
    label: "작은 등불",
    icon: "🕯️",
    title: "나무 곁의 작은 등불",
    message: "내 나무 곁에 작은 등불을 밝혔어요. 저녁에도 정원이 포근하게 빛나는 느낌이 남아요.",
    className: "garden-marker-lantern",
    imageSrc: "../assets/garden/deco-lantern-v2.png"
  }
};

const legacyGardenMarkerMap = {
  ribbon: "wildflower",
  garland: "wildflower",
  picnic: "pebble"
};

const forestTrailRules = {
  moss: {
    label: "이끼길",
    icon: "🌿",
    title: "이끼가 부드러운 길",
    message: "발밑의 이끼가 오늘의 마음을 조용히 받아줬어요. 서두르지 않아도 괜찮은 길을 걸었어요."
  },
  sunbeam: {
    label: "햇살길",
    icon: "✨",
    title: "햇살이 내려앉은 길",
    message: "나무 사이로 들어온 빛을 따라 걸었어요. 오늘의 숲에 작은 밝기가 하나 더 남았어요."
  },
  quiet: {
    label: "고요한 길",
    icon: "🍃",
    title: "바람이 낮게 지나간 길",
    message: "소리가 적은 길을 천천히 걸었어요. 마음이 조용히 가라앉는 시간이 숲에 남았어요."
  }
};

const forestSoundRules = {
  wind: {
    label: "바람",
    icon: "🍃",
    title: "잎 사이를 지나가는 바람",
    message: "가벼운 바람 소리가 내 정원 위를 천천히 지나가요. 잠깐 멈춰 숨을 고르기 좋은 소리예요."
  },
  water: {
    label: "물방울",
    icon: "💧",
    title: "작은 물방울 소리",
    message: "맑은 물방울이 멀리서 톡톡 떨어져요. 오늘의 마음이 조금씩 가라앉는 느낌을 줘요."
  },
  night: {
    label: "밤벌레",
    icon: "🌙",
    title: "밤 숲의 작은 소리",
    message: "밤벌레의 짧은 울림이 숲을 조용히 채워요. 너무 밝지도, 너무 무겁지도 않은 밤의 소리예요."
  }
};

const selfCareRules = {
  breathe: {
    label: "숨 고르기",
    icon: "🫧",
    title: "숨을 고른 하루",
    message: "잠깐 숨을 천천히 고르기로 했어요. 오늘의 마음이 조금 더 넓은 자리를 찾을 수 있어요."
  },
  sip: {
    label: "물 한 모금",
    icon: "🥤",
    title: "나에게 물을 건넨 하루",
    message: "내 나무뿐 아니라 나에게도 작은 물 한 모금을 건넸어요. 몸이 아주 조금 가벼워질 수 있어요."
  },
  stretch: {
    label: "어깨 풀기",
    icon: "🧘",
    title: "몸을 조금 풀어준 하루",
    message: "굳어 있던 어깨와 목을 천천히 풀어주기로 했어요. 내 숲을 돌보듯 나도 잠깐 돌봤어요."
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

const friendForestProfiles = [
  { name: "꽃길 자리", mood: "왼쪽 아래 꽃길 근처에 있는 온라인 친구 자리", badge: "친구 자리 A" },
  { name: "햇살 자리", mood: "왼쪽 위 밝은 잔디 위에 있는 온라인 친구 자리", badge: "친구 자리 B" },
  { name: "연못 자리", mood: "가운데 위 물가와 가까운 온라인 친구 자리", badge: "친구 자리 C" },
  { name: "그네 자리", mood: "오른쪽 중간 그네와 가까운 온라인 친구 자리", badge: "친구 자리 D" },
  { name: "꽃담 자리", mood: "오른쪽 아래 꽃담 근처에 있는 온라인 친구 자리", badge: "친구 자리 E" }
];

const friendInviteSeatSlots = [
  { id: "flower_path", label: "꽃길 자리", mark: "친구 자리 A", emoji: "🌸", description: "왼쪽 아래 꽃길 근처에 있는 온라인 친구 자리" },
  { id: "sunny_spot", label: "햇살 자리", mark: "친구 자리 B", emoji: "☀️", description: "왼쪽 위 밝은 잔디 위에 있는 온라인 친구 자리" },
  { id: "pond_spot", label: "연못 자리", mark: "친구 자리 C", emoji: "💧", description: "가운데 위 물가와 가까운 온라인 친구 자리" },
  { id: "swing_spot", label: "그네 자리", mark: "친구 자리 D", emoji: "🎀", description: "오른쪽 중간 그네와 가까운 온라인 친구 자리" },
  { id: "flower_fence", label: "꽃담 자리", mark: "친구 자리 E", emoji: "🌷", description: "오른쪽 아래 꽃담 근처에 있는 온라인 친구 자리" }
];

let selectedFriendInviteSeatId = "flower_path";

const worldForestSlots = [
  // DEV v0.2.11: 길 위에 나무가 올라가는 문제를 우선 해결한 path-safe 배치.
  // 원칙:
  // 1) 왼쪽 아래에서 뒤쪽 중앙으로 이어지는 산책길 위에는 나무를 두지 않는다.
  // 2) 나무는 길의 오른쪽 공터, 중앙 잔디, 오른쪽 꽃밭 가장자리, 뒤쪽 숲 가장자리 위주로 배치한다.
  // 3) 이전보다 나무 크기를 키워서 테스트용 스프라이트처럼 작아 보이지 않게 한다.
  // 4) 내 나무는 #myWorldSpot에서 따로 렌더링되므로, 여기에는 주변/친구/일반/배경 나무만 둔다.

  // 뒤쪽 숲 가장자리 — 작지만 길 위를 피해서 좌우 숲 쪽으로 배치
  { id: "world-back-01", name: "먼빛 나무", ownerName: "숲친구", state: "balanced", days: 38, x: 14, y: 39, scale: 0.58, mobileX: 12, mobileY: 40, mobileScale: 0.44, depth: 1, tilt: -4, opacity: 0.58, blur: 0.42, brightness: 0.96, sat: 0.96 },
  { id: "world-back-02", name: "안개잎 나무", ownerName: "숲친구", state: "leaf-strong", days: 46, x: 25, y: 37, scale: 0.56, mobileX: 23, mobileY: 38, mobileScale: 0.43, depth: 1, tilt: 3, opacity: 0.56, blur: 0.46, brightness: 0.96, sat: 0.96 },
  { id: "world-back-03", name: "새벽꽃 나무", ownerName: "숲친구", state: "balanced", days: 54, x: 36, y: 38, scale: 0.58, mobileX: 35, mobileY: 39, mobileScale: 0.44, depth: 1, tilt: -2, opacity: 0.58, blur: 0.42, brightness: 0.97, sat: 0.97 },
  { id: "world-back-04", name: "구름잎 나무", ownerName: "숲친구", state: "leaf-strong", days: 49, x: 66, y: 38, scale: 0.58, mobileX: 67, mobileY: 39, mobileScale: 0.44, depth: 1, tilt: 3, opacity: 0.58, blur: 0.42, brightness: 0.97, sat: 0.97 },
  { id: "world-back-05", name: "작은숲 나무", ownerName: "숲친구", state: "root-strong", days: 44, x: 77, y: 38, scale: 0.56, mobileX: 79, mobileY: 39, mobileScale: 0.43, depth: 1, tilt: -3, opacity: 0.56, blur: 0.46, brightness: 0.96, sat: 0.96 },
  { id: "world-back-06", name: "숲끝 나무", ownerName: "숲친구", state: "balanced", days: 52, x: 88, y: 41, scale: 0.60, mobileX: 89, mobileY: 42, mobileScale: 0.46, depth: 1, tilt: 4, opacity: 0.60, blur: 0.40, brightness: 0.98, sat: 0.97 },

  // 뒤-중간층 — 길의 윗부분과 왼쪽 곡선을 피해서 잔디/꽃밭 안쪽에 배치
  { id: "world-midback-01", name: "산들 나무", ownerName: "민트", state: "balanced", days: 63, x: 55, y: 52, scale: 0.72, mobileX: 56, mobileY: 53, mobileScale: 0.55, depth: 3, tilt: -2, opacity: 0.72, blur: 0.18, brightness: 1.00, sat: 1.00 },
  { id: "world-midback-02", name: "잔잔한 나무", ownerName: "하루", state: "leaf-strong", days: 72, x: 68, y: 52, scale: 0.74, mobileX: 70, mobileY: 53, mobileScale: 0.56, depth: 3, tilt: 3, opacity: 0.74, blur: 0.16, brightness: 1.01, sat: 1.01 },
  { id: "world-midback-03", name: "숨결 나무", ownerName: "초록", state: "root-strong", days: 58, x: 82, y: 54, scale: 0.72, mobileX: 84, mobileY: 55, mobileScale: 0.55, depth: 3, tilt: -3, opacity: 0.72, blur: 0.18, brightness: 1.00, sat: 1.00 },
  { id: "world-midback-04", name: "달빛 나무", ownerName: "나린", state: "balanced", days: 81, x: 43, y: 58, scale: 0.76, mobileX: 41, mobileY: 59, mobileScale: 0.58, depth: 4, tilt: 2, opacity: 0.76, blur: 0.12, brightness: 1.02, sat: 1.02 },
  { id: "world-midback-05", name: "보라꽃 나무", ownerName: "유나", state: "leaf-strong", days: 77, x: 74, y: 60, scale: 0.78, mobileX: 77, mobileY: 61, mobileScale: 0.59, depth: 4, tilt: -3, opacity: 0.78, blur: 0.10, brightness: 1.02, sat: 1.02 },

  // 중간 공터층 — 파란색으로 표시한 길 안쪽을 피하고, 중앙/오른쪽 잔디 공터 위주
  { id: "world-mid-01", name: "햇살 나무", ownerName: "루나", state: "leaf-strong", days: 94, x: 40, y: 68, scale: 0.90, mobileX: 37, mobileY: 69, mobileScale: 0.68, depth: 6, tilt: -3, opacity: 0.88, blur: 0.02, brightness: 1.03, sat: 1.04 },
  { id: "world-mid-02", name: "다정한 나무", ownerName: "모모", state: "balanced", days: 88, x: 56, y: 68, scale: 0.92, mobileX: 56, mobileY: 69, mobileScale: 0.70, depth: 6, tilt: 2, opacity: 0.89, blur: 0.01, brightness: 1.03, sat: 1.04 },
  { id: "world-mid-03", name: "풀잎 나무", ownerName: "은하", state: "root-strong", days: 89, x: 70, y: 69, scale: 0.92, mobileX: 72, mobileY: 70, mobileScale: 0.70, depth: 6, tilt: -2, opacity: 0.89, blur: 0.01, brightness: 1.03, sat: 1.04 },
  { id: "world-mid-04", name: "꽃잠 나무", ownerName: "소미", state: "balanced", days: 96, x: 84, y: 70, scale: 0.90, mobileX: 87, mobileY: 71, mobileScale: 0.68, depth: 6, tilt: 3, opacity: 0.88, blur: 0.02, brightness: 1.03, sat: 1.04 },

  // 앞쪽 관계층 — 길을 침범하지 않도록 x 38% 이상으로 제한
  { id: "world-front-01", name: "푸른별 나무", ownerName: "나래", state: "leaf-strong", days: 124, x: 42, y: 82, scale: 1.06, mobileX: 38, mobileY: 82, mobileScale: 0.78, depth: 8, tilt: -4, opacity: 0.96, blur: 0, brightness: 1.05, sat: 1.06 },
  { id: "world-front-02", name: "작은기록 나무", ownerName: "다온", state: "root-strong", days: 109, x: 61, y: 82, scale: 1.04, mobileX: 62, mobileY: 82, mobileScale: 0.77, depth: 8, tilt: 2, opacity: 0.95, blur: 0, brightness: 1.05, sat: 1.05 },
  { id: "world-front-03", name: "마음결 나무", ownerName: "로미", state: "balanced", days: 112, x: 78, y: 81, scale: 1.02, mobileX: 82, mobileY: 81, mobileScale: 0.76, depth: 8, tilt: 4, opacity: 0.95, blur: 0, brightness: 1.05, sat: 1.05 }
];


const worldCommunitySeatSlots = {
  flower_path: { id: "community-seat-flower_path", name: "기다리는 꽃길나무", className: "row-community community-left trail-edge", state: "balanced", days: 16, x: 26, y: 76, scale: 1.22, opacity: 0.72, depth: 10, tilt: -5, lift: 10, groundOpacity: 0.062, mobileX: 25, mobileY: 77, mobileScale: 0.98 },
  sunny_spot: { id: "community-seat-sunny_spot", name: "기다리는 햇살나무", className: "row-community community-back trail-edge", state: "leaf-strong", days: 22, x: 36, y: 48, scale: 1.00, opacity: 0.64, depth: 9, tilt: -3, lift: 5, groundOpacity: 0.048, mobileX: 35, mobileY: 49, mobileScale: 0.80 },
  pond_spot: { id: "community-seat-pond_spot", name: "기다리는 연못나무", className: "row-community community-back trail-edge", state: "root-strong", days: 36, x: 64, y: 48, scale: 1.02, opacity: 0.64, depth: 9, tilt: 3, lift: 5, groundOpacity: 0.048, mobileX: 65, mobileY: 49, mobileScale: 0.82 },
  swing_spot: { id: "community-seat-swing_spot", name: "기다리는 그네나무", className: "row-community community-right trail-edge", state: "balanced", days: 52, x: 74, y: 76, scale: 1.24, opacity: 0.72, depth: 10, tilt: 5, lift: 10, groundOpacity: 0.062, mobileX: 75, mobileY: 77, mobileScale: 1.00 },
  flower_fence: { id: "community-seat-flower_fence", name: "기다리는 꽃담나무", className: "row-community community-front trail-edge", state: "leaf-strong", days: 74, x: 50, y: 71, scale: 1.14, opacity: 0.66, depth: 10, tilt: 0, lift: 9, groundOpacity: 0.056, mobileX: 50, mobileY: 72, mobileScale: 0.92 }
};

const worldScreenElement = document.querySelector("#worldScreen");
const gardenScreenElement = document.querySelector("#gardenScreen");
const goGardenBtnElement = document.querySelector("#goGardenBtn");
const backToWorldBtnTopElement = document.querySelector("#backToWorldBtnTop");
const backToWorldBtnBottomElement = document.querySelector("#backToWorldBtnBottom");
const myWorldSpotElement = document.querySelector("#myWorldSpot");
const worldNeighborSpotsElement = document.querySelector("#worldNeighborSpots");
const worldStageElement = document.querySelector("#worldStage");
const worldTimeBadgeElement = document.querySelector("#worldTimeBadge");
const worldAtmosphereHintElement = document.querySelector("#worldAtmosphereHint");
const worldLifeLayerElement = document.querySelector("#worldLifeLayer");
const worldParticleLayerElement = document.querySelector("#worldParticleLayer");
const focusMyTreeBtnElement = document.querySelector("#focusMyTreeBtn");
const worldInviteBtnElement = document.querySelector("#worldInviteBtn");
const mySpotAuraElement = document.querySelector("#mySpotAura");
const mySpotVisualElement = document.querySelector("#mySpotVisual");
const mySpotNameElement = document.querySelector("#mySpotName");
const mySpotStatusElement = document.querySelector("#mySpotStatus");
const worldSummaryNameElement = document.querySelector("#worldSummaryName");
const worldSummaryTodayElement = document.querySelector("#worldSummaryToday");
const worldSummaryTextElement = document.querySelector("#worldSummaryText");
const worldCommunityHintElement = document.querySelector("#worldCommunityHint");
const worldGrowthCardElement = document.querySelector("#worldGrowthCard");
const worldGrowthTitleElement = document.querySelector("#worldGrowthTitle");
const worldGrowthTextElement = document.querySelector("#worldGrowthText");
const worldGrowthMetaElement = document.querySelector("#worldGrowthMeta");
const worldGrowthFillElement = document.querySelector("#worldGrowthFill");
const friendForestCardElement = document.querySelector("#friendForestCard");
const friendForestTitleElement = document.querySelector("#friendForestTitle");
const friendForestTextElement = document.querySelector("#friendForestText");
const friendForestListElement = document.querySelector("#friendForestList");
const friendForestMetaElement = document.querySelector("#friendForestMeta");
const friendLinksCardElement = document.querySelector("#friendLinksCard");
const friendLinksTitleElement = document.querySelector("#friendLinksTitle");
const friendLinksTextElement = document.querySelector("#friendLinksText");
const friendLinksListElement = document.querySelector("#friendLinksList");
const friendLinksMetaElement = document.querySelector("#friendLinksMeta");
const friendInviteCardElement = document.querySelector("#friendInviteCard");
const friendInviteTitleElement = document.querySelector("#friendInviteTitle");
const friendInviteTextElement = document.querySelector("#friendInviteText");
const friendInvitePreviewElement = document.querySelector("#friendInvitePreview");
const friendInviteLinkTextElement = document.querySelector("#friendInviteLinkText");
const friendInviteMetaElement = document.querySelector("#friendInviteMeta");
const kakaoFriendInviteBtnElement = document.querySelector("#kakaoFriendInviteBtn");
const copyFriendInviteBtnElement = document.querySelector("#copyFriendInviteBtn");
const previewFriendInviteBtnElement = document.querySelector("#previewFriendInviteBtn");
const clearFriendSeatBtnElement = document.querySelector("#clearFriendSeatBtn");
const friendSeatOptionsElement = document.querySelector("#friendSeatOptions");
const selectedFriendSeatTextElement = document.querySelector("#selectedFriendSeatText");
const onlineFriendJoinCardElement = document.querySelector("#onlineFriendJoinCard");
const onlineFriendJoinTitleElement = document.querySelector("#onlineFriendJoinTitle");
const onlineFriendJoinTextElement = document.querySelector("#onlineFriendJoinText");
const onlineFriendJoinFormElement = document.querySelector("#onlineFriendJoinForm");
const onlineFriendNameInputElement = document.querySelector("#onlineFriendNameInput");
const onlineFriendTreeInputElement = document.querySelector("#onlineFriendTreeInput");
const onlineFriendMoodSelectElement = document.querySelector("#onlineFriendMoodSelect");
const onlineFriendJoinMessageElement = document.querySelector("#onlineFriendJoinMessage");
const onlineFriendExistingPanelElement = document.querySelector("#onlineFriendExistingPanel");
const onlineFriendExistingSummaryElement = document.querySelector("#onlineFriendExistingSummary");
const onlineFriendUseExistingBtnElement = document.querySelector("#onlineFriendUseExistingBtn");
const onlineFriendNewTreeToggleBtnElement = document.querySelector("#onlineFriendNewTreeToggleBtn");
const worldStarterFriendsElement = document.querySelector("#worldStarterFriends");
const firstVisitGuideElement = document.querySelector("#firstVisitGuide");
const forestInviteCardElement = document.querySelector("#forestInviteCard");
const forestInviteTitleElement = document.querySelector("#forestInviteTitle");
const forestInviteTextElement = document.querySelector("#forestInviteText");
const forestInviteStartBtnElement = document.querySelector("#forestInviteStartBtn");
const forestInviteMetaElement = document.querySelector("#forestInviteMeta");
const dailyLoopCardElement = document.querySelector("#dailyLoopCard");
const dailyLoopTitleElement = document.querySelector("#dailyLoopTitle");
const dailyLoopTextElement = document.querySelector("#dailyLoopText");

const launchGuideCardElement = document.querySelector("#launchGuideCard");
const startTodayRecordBtnElement = document.querySelector("#startTodayRecordBtn");
const openOnboardingBtnElement = document.querySelector("#openOnboardingBtn");
const onboardingOverlayElement = document.querySelector("#onboardingOverlay");
const closeOnboardingBtnElement = document.querySelector("#closeOnboardingBtn");
const onboardingStartBtnElement = document.querySelector("#onboardingStartBtn");
const onboardingLaterBtnElement = document.querySelector("#onboardingLaterBtn");
const ONBOARDING_STORAGE_KEY = IS_DEV_BUILD ? "livingForestOnboardingV159_DEV" : (isTestMode ? "livingForestOnboardingV159_TEST" : "livingForestOnboardingV159");
const gardenHubElement = document.querySelector("#gardenHub");
const gardenHubSheetElement = document.querySelector("#gardenHubSheet");
const gardenPanelTitleElement = document.querySelector("#gardenPanelTitle");
const closeGardenPanelBtnElement = document.querySelector("#closeGardenPanelBtn");
const gardenHubTabButtons = document.querySelectorAll("[data-garden-tab]");
const gardenActionModalElement = document.querySelector("#gardenActionModal");
const gardenActionModalTitleElement = document.querySelector("#gardenActionModalTitle");
const gardenActionModalDescElement = document.querySelector("#gardenActionModalDesc");
const gardenActionModalBodyElement = document.querySelector("#gardenActionModalBody");
const closeGardenActionModalBtnElement = document.querySelector("#closeGardenActionModalBtn");

const skyElement = document.querySelector("#sky");
const gardenCardElement = document.querySelector(".garden-card");
const forestHeadElement = document.querySelector(".forest-head");
const stageMessageElement = document.querySelector(".stage-message");
const gardenTitleElement = document.querySelector("#gardenTitle");
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
const returnMemoryCardElement = document.querySelector("#returnMemoryCard");
const returnMemoryTitleElement = document.querySelector("#returnMemoryTitle");
const returnMemoryTextElement = document.querySelector("#returnMemoryText");
const returnStreakTextElement = document.querySelector("#returnStreakText");
const streakRewardCardElement = document.querySelector("#streakRewardCard");
const streakRewardTitleElement = document.querySelector("#streakRewardTitle");
const streakRewardTextElement = document.querySelector("#streakRewardText");
const streakRewardMetaElement = document.querySelector("#streakRewardMeta");
const streakRewardFillElement = document.querySelector("#streakRewardFill");
const todayChangeCardElement = document.querySelector("#todayChangeCard");
const todayChangeTitleElement = document.querySelector("#todayChangeTitle");
const todayChangeTextElement = document.querySelector("#todayChangeText");
const tomorrowPromiseCardElement = document.querySelector("#tomorrowPromiseCard");
const tomorrowPromiseTitleElement = document.querySelector("#tomorrowPromiseTitle");
const tomorrowPromiseTextElement = document.querySelector("#tomorrowPromiseText");
const finishGuideCardElement = document.querySelector("#finishGuideCard");
const finishGuideTitleElement = document.querySelector("#finishGuideTitle");
const finishGuideTextElement = document.querySelector("#finishGuideText");
const finishGuideMetaElement = document.querySelector("#finishGuideMeta");
const finishSeedBtnElement = document.querySelector("#finishSeedBtn");
const finishForestBtnElement = document.querySelector("#finishForestBtn");
const tomorrowSeedCardElement = document.querySelector("#tomorrowSeedCard");
const tomorrowSeedTitleElement = document.querySelector("#tomorrowSeedTitle");
const tomorrowSeedTextElement = document.querySelector("#tomorrowSeedText");
const tomorrowSeedFormElement = document.querySelector("#tomorrowSeedForm");
const tomorrowSeedInputElement = document.querySelector("#tomorrowSeedInput");
const tomorrowSeedMessageElement = document.querySelector("#tomorrowSeedMessage");
const saveTomorrowSeedBtnElement = document.querySelector("#saveTomorrowSeedBtn");
const forestDiaryCardElement = document.querySelector("#forestDiaryCard");
const forestDiaryTodayElement = document.querySelector("#forestDiaryToday");
const forestDiaryListElement = document.querySelector("#forestDiaryList");
const forestDiaryEmptyElement = document.querySelector("#forestDiaryEmpty");
const forestDiaryFlowElement = document.querySelector("#forestDiaryFlow");
const forestShareCardElement = document.querySelector("#forestShareCard");
const forestShareTitleElement = document.querySelector("#forestShareTitle");
const forestShareTextElement = document.querySelector("#forestShareText");
const forestSharePreviewElement = document.querySelector("#forestSharePreview");
const copyForestShareBtnElement = document.querySelector("#copyForestShareBtn");
const nativeForestShareBtnElement = document.querySelector("#nativeForestShareBtn");
const forestShareMessageElement = document.querySelector("#forestShareMessage");
const forestBadgeCardElement = document.querySelector("#forestBadgeCard");
const forestBadgeTitleElement = document.querySelector("#forestBadgeTitle");
const forestBadgeTextElement = document.querySelector("#forestBadgeText");
const forestBadgeListElement = document.querySelector("#forestBadgeList");
const forestBadgeMetaElement = document.querySelector("#forestBadgeMeta");
const treeCareCardElement = document.querySelector("#treeCareCard");
const treeCareTitleElement = document.querySelector("#treeCareTitle");
const treeCareTextElement = document.querySelector("#treeCareText");
const treeCareMessageElement = document.querySelector("#treeCareMessage");
const treeCareStageDockElement = document.querySelector("#treeCareStageDock");
const treeCareStageTextElement = document.querySelector("#treeCareStageText");
const treeCareButtons = document.querySelectorAll("[data-care-action]");
const forestTrailCardElement = document.querySelector("#forestTrailCard");
const forestTrailTitleElement = document.querySelector("#forestTrailTitle");
const forestTrailTextElement = document.querySelector("#forestTrailText");
const forestTrailMessageElement = document.querySelector("#forestTrailMessage");
const forestTrailButtons = document.querySelectorAll("[data-forest-trail]");
const selfCareCardElement = document.querySelector("#selfCareCard");
const selfCareTitleElement = document.querySelector("#selfCareTitle");
const selfCareTextElement = document.querySelector("#selfCareText");
const selfCareMessageElement = document.querySelector("#selfCareMessage");
const selfCareButtons = document.querySelectorAll("[data-self-care]");
const weeklyForestLetterCardElement = document.querySelector("#weeklyForestLetterCard");
const weeklyForestLetterTitleElement = document.querySelector("#weeklyForestLetterTitle");
const weeklyForestLetterTextElement = document.querySelector("#weeklyForestLetterText");
const weeklyForestLetterStatsElement = document.querySelector("#weeklyForestLetterStats");
const weeklyForestLetterMetaElement = document.querySelector("#weeklyForestLetterMeta");
const forestArchiveCardElement = document.querySelector("#forestArchiveCard");
const forestArchiveTitleElement = document.querySelector("#forestArchiveTitle");
const forestArchiveTextElement = document.querySelector("#forestArchiveText");
const forestArchiveStatsElement = document.querySelector("#forestArchiveStats");
const forestArchiveMessageElement = document.querySelector("#forestArchiveMessage");
const downloadForestArchiveBtnElement = document.querySelector("#downloadForestArchiveBtn");
const copyForestArchiveBtnElement = document.querySelector("#copyForestArchiveBtn");
const importForestArchiveBtnElement = document.querySelector("#importForestArchiveBtn");
const forestArchiveImportInputElement = document.querySelector("#forestArchiveImportInput");
const forestCalendarCardElement = document.querySelector("#forestCalendarCard");
const forestCalendarTitleElement = document.querySelector("#forestCalendarTitle");
const forestCalendarTextElement = document.querySelector("#forestCalendarText");
const forestCalendarGridElement = document.querySelector("#forestCalendarGrid");
const forestCalendarMessageElement = document.querySelector("#forestCalendarMessage");
const forestMemoryCardElement = document.querySelector("#forestMemoryCard");
const forestMemoryTitleElement = document.querySelector("#forestMemoryTitle");
const forestMemoryTextElement = document.querySelector("#forestMemoryText");
const forestMemoryListElement = document.querySelector("#forestMemoryList");
const forestMemoryMessageElement = document.querySelector("#forestMemoryMessage");
const forestMemoryFilterButtons = document.querySelectorAll("[data-memory-filter]");
let selectedForestMemoryFilter = "all";
const forestSoundCardElement = document.querySelector("#forestSoundCard");
const forestSoundTitleElement = document.querySelector("#forestSoundTitle");
const forestSoundTextElement = document.querySelector("#forestSoundText");
const forestSoundMessageElement = document.querySelector("#forestSoundMessage");
const forestSoundButtons = document.querySelectorAll("[data-forest-sound]");
const stopForestSoundBtnElement = document.querySelector("#stopForestSoundBtn");

const gardenMarkerLayerElement = document.querySelector("#gardenMarkerLayer");
const gardenActivityLogElement = document.querySelector("#gardenActivityLog");
const gardenMarkerCardElement = document.querySelector("#gardenMarkerCard");
const gardenMarkerTitleElement = document.querySelector("#gardenMarkerTitle");
const gardenMarkerTextElement = document.querySelector("#gardenMarkerText");
const gardenMarkerMessageElement = document.querySelector("#gardenMarkerMessage");
const gardenMarkerButtons = document.querySelectorAll("[data-garden-marker]");
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
let forestSoundRuntime = {
  context: null,
  timers: [],
  activeSound: ""
};
let gardenHubLayoutBuilt = false;
let gardenActivityLogTimer = null;
let activeGardenHubTab = "record";

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
    careHistory: [],
    trailHistory: [],
    selfCareHistory: [],
    sharedForestSentenceDates: [],
    inviteStartedAt: null,
    gardenMarker: "",
    tomorrowSeeds: [],
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

function getServiceDateKeyFromDate(dateValue) {
  const serviceTime = new Date(dateValue.getTime() + APP_CONFIG.serviceTimeZoneOffsetMinutes * 60 * 1000);
  return getUtcDateKeyFromDate(serviceTime);
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

function addDaysToDateKey(dateText, dayOffset) {
  if (!isValidDateKey(dateText)) {
    return null;
  }

  const [year, month, date] = dateText.split("-").map(Number);
  const dateValue = new Date(year, month - 1, date);
  dateValue.setDate(dateValue.getDate() + dayOffset);
  return getDateKeyFromDate(dateValue);
}

function getPreviousRecordBeforeToday() {
  const today = getTodayKey();
  return treeData.history.find((item) => item.date !== today) || null;
}

function getYesterdayRecord() {
  const yesterday = getRelativeDateKey(1);
  return treeData.history.find((item) => item.date === yesterday) || null;
}

function getLatestPastRecord() {
  return getYesterdayRecord() || getPreviousRecordBeforeToday();
}

function getConsecutiveRecordDays() {
  const dateSet = new Set(
    treeData.history
      .map((item) => item.date)
      .filter((dateText) => isValidDateKey(dateText))
  );

  if (!dateSet.size) {
    return 0;
  }

  let currentDate = hasCheckedToday() ? getTodayKey() : getRelativeDateKey(1);
  let count = 0;

  while (currentDate && dateSet.has(currentDate)) {
    count += 1;
    currentDate = addDaysToDateKey(currentDate, -1);
  }

  return count;
}

function getReturnMemoryInfo() {
  const hasName = Boolean(treeData.treeName?.trim());
  const checkedToday = hasCheckedToday();
  const pastRecord = getLatestPastRecord();

  if (!hasName || checkedToday || !pastRecord) {
    return null;
  }

  const isYesterday = pastRecord.date === getRelativeDateKey(1);
  const streakDays = getConsecutiveRecordDays();
  const dayLabel = isYesterday ? "어제" : `${formatDate(pastRecord.date)}의 기록`;
  const title = isYesterday
    ? `${dayLabel} 남긴 ${pastRecord.label} 마음이 아직 숲에 남아 있어요`
    : `${dayLabel}이 아직 내 나무 곁에 남아 있어요`;
  const text = isYesterday
    ? `${dayLabel}의 ${pastRecord.label} 기운 위에 오늘의 마음을 더하면 성장이 자연스럽게 이어져요.`
    : `마지막으로 남긴 ${pastRecord.label} 마음을 이어받아, 오늘 다시 한 번 나무를 돌볼 수 있어요.`;
  const streakText = streakDays >= 2
    ? `최근 ${streakDays}일 흐름이 이어지는 중`
    : isYesterday
      ? "어제의 기록을 이어갈 차례"
      : "오늘 다시 이어갈 수 있어요";

  return { title, text, streakText, pastRecord, isYesterday, streakDays };
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
    message: typeof record.message === "string" && record.message.trim() ? record.message : rule.message,
    forestTitle: typeof record.forestTitle === "string" && record.forestTitle.trim() ? record.forestTitle.slice(0, 32) : "",
    forestSentence: typeof record.forestSentence === "string" && record.forestSentence.trim() ? record.forestSentence.slice(0, 120) : ""
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
  const careHistory = Array.isArray(sourceData.careHistory)
    ? sourceData.careHistory
        .map((record) => normalizeCareRecord(record))
        .filter(Boolean)
        .slice(0, 60)
    : [];
  const trailHistory = Array.isArray(sourceData.trailHistory)
    ? sourceData.trailHistory
        .map((record) => normalizeTrailRecord(record))
        .filter(Boolean)
        .slice(0, 60)
    : [];
  const selfCareHistory = Array.isArray(sourceData.selfCareHistory)
    ? sourceData.selfCareHistory
        .map((record) => normalizeSelfCareRecord(record))
        .filter(Boolean)
        .slice(0, 60)
    : [];
  const sharedForestSentenceDates = Array.isArray(sourceData.sharedForestSentenceDates)
    ? [...new Set(sourceData.sharedForestSentenceDates.filter((dateText) => isValidDateKey(dateText)))].slice(0, 60)
    : [];
  const inviteStartedAt = typeof sourceData.inviteStartedAt === "string" && sourceData.inviteStartedAt.trim()
    ? sourceData.inviteStartedAt.slice(0, 40)
    : null;

  const rawGardenMarker = typeof sourceData.gardenMarker === "string" ? sourceData.gardenMarker : "";
  const migratedGardenMarker = legacyGardenMarkerMap[rawGardenMarker] || rawGardenMarker;
  const gardenMarker = gardenMarkerRules[migratedGardenMarker] ? migratedGardenMarker : "";
  const tomorrowSeeds = Array.isArray(sourceData.tomorrowSeeds)
    ? sourceData.tomorrowSeeds
        .map((seed) => normalizeTomorrowSeed(seed))
        .filter(Boolean)
        .slice(0, 60)
    : [];

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
    treeName,
    careHistory,
    trailHistory,
    selfCareHistory,
    sharedForestSentenceDates,
    inviteStartedAt,
    gardenMarker,
    tomorrowSeeds
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

function normalizeTomorrowSeed(seed) {
  if (!seed || typeof seed !== "object") {
    return null;
  }

  const date = isValidDateKey(seed.date) ? seed.date : null;
  const targetDate = isValidDateKey(seed.targetDate) ? seed.targetDate : null;
  const text = typeof seed.text === "string" ? seed.text.trim().slice(0, 64) : "";

  if (!date || !targetDate || !text) {
    return null;
  }

  return {
    date,
    targetDate,
    text,
    createdAt: typeof seed.createdAt === "string" && seed.createdAt.trim() ? seed.createdAt : getNowIsoString()
  };
}

function getTomorrowSeedForDate(dateText) {
  const records = Array.isArray(treeData.tomorrowSeeds) ? treeData.tomorrowSeeds : [];
  return records.find((seed) => seed.targetDate === dateText) || null;
}

function getTomorrowSeedWrittenToday() {
  const today = getTodayKey();
  const tomorrow = addDaysToDateKey(today, 1);
  const records = Array.isArray(treeData.tomorrowSeeds) ? treeData.tomorrowSeeds : [];
  return records.find((seed) => seed.date === today && seed.targetDate === tomorrow) || null;
}

function hasTomorrowSeedWrittenToday() {
  return Boolean(getTomorrowSeedWrittenToday());
}

function sanitizeTomorrowSeedText(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 64);
}

function showGardenActivityLog(message, options = {}) {
  if (!gardenActivityLogElement || !message) {
    return;
  }

  const prefix = options.prefix || "방금 전";
  gardenActivityLogElement.textContent = `${prefix} · ${message}`;
  gardenActivityLogElement.classList.remove("is-visible");
  window.clearTimeout(gardenActivityLogTimer);

  window.requestAnimationFrame(() => {
    gardenActivityLogElement.classList.add("is-visible");
  });

  gardenActivityLogTimer = window.setTimeout(() => {
    gardenActivityLogElement.classList.remove("is-visible");
  }, options.duration || 3200);
}

function renderTomorrowSeedCard() {
  if (!tomorrowSeedCardElement || !tomorrowSeedTitleElement || !tomorrowSeedTextElement || !tomorrowSeedMessageElement || !tomorrowSeedInputElement || !saveTomorrowSeedBtnElement) {
    return;
  }

  const today = getTodayKey();
  const checked = hasCheckedToday();
  const seedForToday = getTomorrowSeedForDate(today);
  const seedWrittenToday = getTomorrowSeedWrittenToday();
  const tomorrow = addDaysToDateKey(today, 1);

  tomorrowSeedCardElement.classList.toggle("seed-from-yesterday", Boolean(seedForToday) && !checked);
  tomorrowSeedCardElement.classList.toggle("seed-ready", checked && !seedWrittenToday);
  tomorrowSeedCardElement.classList.toggle("seed-saved", Boolean(seedWrittenToday));

  if (seedForToday && !checked) {
    tomorrowSeedTitleElement.textContent = "어제 남긴 씨앗이 오늘 숲에 도착했어요";
    tomorrowSeedTextElement.textContent = `“${seedForToday.text}”`;
    tomorrowSeedMessageElement.textContent = "오늘의 마음을 기록하면 이 씨앗 위에 새로운 하루가 이어져요.";
    tomorrowSeedInputElement.value = "";
    tomorrowSeedInputElement.disabled = true;
    saveTomorrowSeedBtnElement.disabled = true;
    saveTomorrowSeedBtnElement.textContent = "오늘 기록 후 새 씨앗";
    return;
  }

  if (!checked) {
    tomorrowSeedTitleElement.textContent = "내일의 나에게 한마디";
    tomorrowSeedTextElement.textContent = "내일 다시 왔을 때 먼저 보여줄게요.";
    tomorrowSeedMessageElement.textContent = "오늘 기분을 고르면 열려요.";
    tomorrowSeedInputElement.value = "";
    tomorrowSeedInputElement.disabled = true;
    saveTomorrowSeedBtnElement.disabled = true;
    saveTomorrowSeedBtnElement.textContent = "남기기";
    return;
  }

  if (seedWrittenToday) {
    tomorrowSeedTitleElement.textContent = "내일 한마디 저장!";
    tomorrowSeedTextElement.textContent = `“${seedWrittenToday.text}”`;
    tomorrowSeedMessageElement.textContent = `${formatDate(tomorrow)}에 다시 오면 이 문장이 먼저 보여요.`;
    tomorrowSeedInputElement.value = seedWrittenToday.text;
    tomorrowSeedInputElement.disabled = true;
    saveTomorrowSeedBtnElement.disabled = true;
    saveTomorrowSeedBtnElement.textContent = "완료";
    return;
  }

  tomorrowSeedTitleElement.textContent = "내일의 나에게 작은 씨앗을 남겨요";
  tomorrowSeedTextElement.textContent = "오늘의 기록 끝에 내일 다시 보고 싶은 짧은 문장을 하나 남길 수 있어요.";
  tomorrowSeedMessageElement.textContent = "최대 64자까지 저장돼요. 이 기기에만 남아요.";
  tomorrowSeedInputElement.disabled = false;
  saveTomorrowSeedBtnElement.disabled = false;
  saveTomorrowSeedBtnElement.textContent = "남기기";
}

function saveTomorrowSeed() {
  if (!hasCheckedToday() || hasTomorrowSeedWrittenToday()) {
    renderTomorrowSeedCard();
    return;
  }

  const text = sanitizeTomorrowSeedText(tomorrowSeedInputElement?.value);
  if (!text) {
    if (tomorrowSeedMessageElement) {
      tomorrowSeedMessageElement.textContent = "내일의 나에게 남길 짧은 문장을 적어주세요.";
    }
    tomorrowSeedInputElement?.focus?.();
    return;
  }

  const today = getTodayKey();
  const tomorrow = addDaysToDateKey(today, 1);
  const records = Array.isArray(treeData.tomorrowSeeds) ? [...treeData.tomorrowSeeds] : [];

  records.unshift({
    date: today,
    targetDate: tomorrow,
    text,
    createdAt: getNowIsoString()
  });

  treeData.tomorrowSeeds = records.slice(0, 60);
  saveTreeData();
  renderTomorrowSeedCard();
  renderWeeklyForestLetterCard();
  renderForestMemoryCard();
  showGardenActivityLog("내일 한마디를 남겼어요");
  closeGardenHubPanel();
  trackForestEvent("tomorrow_seed_saved", { source: "garden", target_date: tomorrow });
}


function normalizeCareRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const care = treeCareRules[record.care] ? record.care : null;
  const date = isValidDateKey(record.date) ? record.date : null;

  if (!care || !date) {
    return null;
  }

  const rule = treeCareRules[care];

  return {
    date,
    care,
    label: typeof record.label === "string" && record.label.trim() ? record.label.slice(0, 24) : rule.label,
    icon: typeof record.icon === "string" && record.icon.trim() ? record.icon.slice(0, 8) : rule.icon,
    title: typeof record.title === "string" && record.title.trim() ? record.title.slice(0, 40) : rule.title,
    message: typeof record.message === "string" && record.message.trim() ? record.message.slice(0, 140) : rule.message
  };
}

function getTodayCareRecord() {
  const records = Array.isArray(treeData.careHistory) ? treeData.careHistory : [];
  return records.find((item) => item.date === getTodayKey()) || null;
}

function hasCaredToday() {
  return Boolean(getTodayCareRecord());
}

function getLatestCareRecord() {
  const records = Array.isArray(treeData.careHistory) ? treeData.careHistory : [];
  return records[0] || null;
}

function normalizeTrailRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const trail = forestTrailRules[record.trail] ? record.trail : null;
  const date = isValidDateKey(record.date) ? record.date : null;

  if (!trail || !date) {
    return null;
  }

  const rule = forestTrailRules[trail];

  return {
    date,
    trail,
    label: typeof record.label === "string" && record.label.trim() ? record.label.slice(0, 24) : rule.label,
    icon: typeof record.icon === "string" && record.icon.trim() ? record.icon.slice(0, 8) : rule.icon,
    title: typeof record.title === "string" && record.title.trim() ? record.title.slice(0, 40) : rule.title,
    message: typeof record.message === "string" && record.message.trim() ? record.message.slice(0, 150) : rule.message
  };
}

function getTodayTrailRecord() {
  const records = Array.isArray(treeData.trailHistory) ? treeData.trailHistory : [];
  return records.find((item) => item.date === getTodayKey()) || null;
}

function hasWalkedTrailToday() {
  return Boolean(getTodayTrailRecord());
}

function getLatestTrailRecord() {
  const records = Array.isArray(treeData.trailHistory) ? treeData.trailHistory : [];
  return records[0] || null;
}

function normalizeSelfCareRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const action = selfCareRules[record.action] ? record.action : null;
  const date = isValidDateKey(record.date) ? record.date : null;

  if (!action || !date) {
    return null;
  }

  const rule = selfCareRules[action];

  return {
    date,
    action,
    label: typeof record.label === "string" && record.label.trim() ? record.label.slice(0, 24) : rule.label,
    icon: typeof record.icon === "string" && record.icon.trim() ? record.icon.slice(0, 8) : rule.icon,
    title: typeof record.title === "string" && record.title.trim() ? record.title.slice(0, 40) : rule.title,
    message: typeof record.message === "string" && record.message.trim() ? record.message.slice(0, 150) : rule.message
  };
}

function getTodaySelfCareRecord() {
  const records = Array.isArray(treeData.selfCareHistory) ? treeData.selfCareHistory : [];
  return records.find((item) => item.date === getTodayKey()) || null;
}

function hasSelfCaredToday() {
  return Boolean(getTodaySelfCareRecord());
}

function getLatestSelfCareRecord() {
  const records = Array.isArray(treeData.selfCareHistory) ? treeData.selfCareHistory : [];
  return records[0] || null;
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


function getNextGrowthPreviewMessage() {
  const totalDays = treeData.history.length;
  const nextMilestone = getNextGrowthMilestone();

  if (!nextMilestone) {
    return "이제부터는 오래 돌볼수록 나무와 주변 숲이 더 깊어져요.";
  }

  const remainingDays = Math.max(nextMilestone.day - totalDays, 0);

  if (remainingDays <= 1) {
    return `내일 한 번 더 기록하면 ${nextMilestone.day}일차 ${nextMilestone.title}에 닿아요.`;
  }

  return `${remainingDays}번 더 기록하면 ${nextMilestone.day}일차 ${nextMilestone.title}에 가까워져요.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getForestDiaryRule(mood) {
  return forestDiaryRules[mood] || forestDiaryRules.normal;
}

function getDiarySentenceIndex(dateText, mood = "normal") {
  const source = `${dateText || ""}-${mood}`;
  let sum = 0;

  for (let i = 0; i < source.length; i += 1) {
    sum += source.charCodeAt(i);
  }

  return sum;
}

function createForestDiaryNote(mood, dateText = getTodayKey()) {
  const rule = getForestDiaryRule(mood);
  const index = getDiarySentenceIndex(dateText, mood) % rule.sentences.length;

  return {
    forestTitle: rule.dayTitle,
    forestSentence: rule.sentences[index]
  };
}

function getForestDiaryDisplayDate(dateText, fallbackIndex = 0) {
  const safeDate = isValidDateKey(dateText) ? dateText : getRelativeDateKey(fallbackIndex);

  if (safeDate === getTodayKey()) {
    return "오늘";
  }

  if (safeDate === getRelativeDateKey(1)) {
    return "어제";
  }

  return formatDate(safeDate);
}

function getForestDiaryEntry(record, index = 0) {
  const mood = record?.mood || "normal";
  const rule = getForestDiaryRule(mood);
  const fallback = createForestDiaryNote(mood, record?.date || getRelativeDateKey(index));
  const title = record?.forestTitle || fallback.forestTitle || rule.dayTitle;
  const sentence = record?.forestSentence || fallback.forestSentence || rule.sentences[0];

  return {
    ...record,
    mood,
    title,
    sentence,
    displayDate: getForestDiaryDisplayDate(record?.date, index),
    shortLabel: rule.shortLabel
  };
}

function getRecentForestDiaryEntries(limit = 3) {
  return (Array.isArray(treeData.history) ? treeData.history : [])
    .slice(0, limit)
    .map((record, index) => getForestDiaryEntry(record, index));
}

function getForestDiaryFlowInfo() {
  const history = Array.isArray(treeData.history) ? treeData.history : [];

  if (history.length <= 0) {
    return "첫 마음을 남기면 이곳에 숲 일기장이 열려요.";
  }

  const recent = history.slice(0, Math.min(7, history.length));
  const counts = recent.reduce((acc, record) => {
    const mood = moodRules[record.mood] ? record.mood : "normal";
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, { good: 0, normal: 0, tired: 0 });

  const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "normal";
  const topRule = getForestDiaryRule(topMood);
  const streakDays = getConsecutiveRecordDays();
  const streakText = streakDays >= 2 ? ` 최근 ${streakDays}일의 기록이 이어지고 있어요.` : "";

  if (recent.length < 3) {
    return `아직 기록이 적지만, ${moodRules[topMood].label} 마음이 숲에 먼저 남기 시작했어요.${streakText}`;
  }

  return `${topRule.flowText}${streakText}`;
}

function getWeeklyForestLetterInfo() {
  const history = Array.isArray(treeData.history) ? treeData.history : [];
  const recentRecords = history.slice(0, Math.min(7, history.length));
  const recentEntries = recentRecords.map((record, index) => getForestDiaryEntry(record, index));
  const recentDates = new Set(recentEntries.map((entry) => entry.date).filter((dateText) => isValidDateKey(dateText)));
  const totalRecords = history.length;

  if (recentEntries.length < 3) {
    const remaining = Math.max(3 - recentEntries.length, 0);
    return {
      ready: false,
      title: "주간 숲 편지는 기록 3개부터 열려요",
      text: recentEntries.length <= 0
        ? "오늘의 마음을 하나씩 남기면, 며칠 뒤 내 숲이 짧은 편지처럼 흐름을 정리해줘요."
        : `지금 ${recentEntries.length}개의 숲 기록이 쌓였어요. ${remaining}번 더 기록하면 최근 흐름을 편지로 볼 수 있어요.`,
      stats: [
        `최근 기록 ${recentEntries.length}/3`,
        "아직 편지 준비 중"
      ],
      meta: "기록이 3개 이상 쌓이면 자동으로 열려요."
    };
  }

  const counts = recentEntries.reduce((acc, entry) => {
    const mood = moodRules[entry.mood] ? entry.mood : "normal";
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, { good: 0, normal: 0, tired: 0 });
  const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "normal";
  const topMoodRule = moodRules[topMood] || moodRules.normal;
  const diaryRule = getForestDiaryRule(topMood);
  const streakDays = getConsecutiveRecordDays();

  const recentCare = (Array.isArray(treeData.careHistory) ? treeData.careHistory : [])
    .filter((record) => recentDates.has(record.date));
  const recentTrails = (Array.isArray(treeData.trailHistory) ? treeData.trailHistory : [])
    .filter((record) => recentDates.has(record.date));
  const recentSelfCare = (Array.isArray(treeData.selfCareHistory) ? treeData.selfCareHistory : [])
    .filter((record) => recentDates.has(record.date));
  const recentSeeds = (Array.isArray(treeData.tomorrowSeeds) ? treeData.tomorrowSeeds : [])
    .filter((record) => recentDates.has(record.date));

  const actionPieces = [];
  if (recentCare[0]) actionPieces.push(`${recentCare[0].icon} ${recentCare[0].label}`);
  if (recentTrails[0]) actionPieces.push(`${recentTrails[0].icon} ${recentTrails[0].label}`);
  if (recentSelfCare[0]) actionPieces.push(`${recentSelfCare[0].icon} ${recentSelfCare[0].label}`);
  if (recentSeeds[0]) actionPieces.push("🌱 내일의 씨앗");

  const moodOpening = {
    good: "최근 너의 숲은 밝은 잎을 자주 펼쳤어요.",
    normal: "최근 너의 숲은 크게 흔들리지 않고 고른 숨을 이어갔어요.",
    tired: "최근 너의 숲은 위로 빨리 자라기보다 뿌리를 깊게 내리고 있었어요."
  }[topMood] || diaryRule.flowText;

  const actionText = actionPieces.length > 0
    ? `${actionPieces.slice(0, 3).join(" · ")} 같은 작은 선택들이 숲의 하루를 더 또렷하게 남겼어요.`
    : "아직 작은 돌봄과 실천은 적지만, 마음을 기록한 것만으로도 숲은 흐름을 기억하고 있어요.";
  const streakText = streakDays >= 2
    ? ` ${streakDays}일째 이어진 기록은 숲에 조용한 길을 만들고 있어요.`
    : " 하루하루의 기록은 아직 느리지만, 숲은 이미 방향을 잡기 시작했어요.";
  const closing = {
    good: "이번 주의 숲은 가볍고 밝은 쪽으로 잎을 열고 있어요.",
    normal: "이번 주의 숲은 무리하지 않는 균형을 배우고 있어요.",
    tired: "이번 주의 숲은 쉬어가면서도 단단해지는 법을 배우고 있어요."
  }[topMood] || "이번 주의 숲은 천천히 자기 흐름을 만들고 있어요.";

  const totalActionCount = recentCare.length + recentTrails.length + recentSelfCare.length + recentSeeds.length;

  return {
    ready: true,
    title: `${treeData.treeName?.trim() || "내 나무"}에게 온 주간 숲 편지`,
    text: `${moodOpening} ${actionText}${streakText} ${closing}`,
    stats: [
      `최근 기록 ${recentEntries.length}개`,
      `가장 많은 마음 ${topMoodRule.icon} ${topMoodRule.label}`,
      totalActionCount > 0 ? `작은 선택 ${totalActionCount}개` : "작은 선택 준비 중"
    ],
    meta: `전체 ${totalRecords}번째 기록까지, 최근 ${recentEntries.length}개의 흐름을 바탕으로 쓴 편지예요.`
  };
}

function renderWeeklyForestLetterCard() {
  if (!weeklyForestLetterCardElement || !weeklyForestLetterTitleElement || !weeklyForestLetterTextElement || !weeklyForestLetterStatsElement || !weeklyForestLetterMetaElement) {
    return;
  }

  const info = getWeeklyForestLetterInfo();
  weeklyForestLetterCardElement.classList.toggle("weekly-letter-ready", info.ready);
  weeklyForestLetterCardElement.classList.toggle("weekly-letter-waiting", !info.ready);
  weeklyForestLetterTitleElement.textContent = info.title;
  weeklyForestLetterTextElement.textContent = info.text;
  weeklyForestLetterStatsElement.innerHTML = info.stats
    .map((stat) => `<span>${escapeHtml(stat)}</span>`)
    .join("");
  weeklyForestLetterMetaElement.textContent = info.meta;
}

function getCurrentStreakReward(streakDays) {
  return [...streakRewardRules].reverse().find((reward) => streakDays >= reward.day) || null;
}

function getNextStreakReward(streakDays) {
  return streakRewardRules.find((reward) => streakDays < reward.day) || null;
}

function getStreakRewardInfo() {
  const hasName = Boolean(treeData.treeName?.trim());
  const totalDays = Array.isArray(treeData.history) ? treeData.history.length : 0;

  if (!hasName || totalDays <= 0) {
    return null;
  }

  const streakDays = getConsecutiveRecordDays();
  const currentReward = getCurrentStreakReward(streakDays);
  const nextReward = getNextStreakReward(streakDays);

  if (!nextReward) {
    return {
      title: `${streakDays}일째 이어진 긴 성장`,
      text: "이제 정해진 초반 보상은 지나갔어요. 앞으로는 오래 돌볼수록 나무와 월드 숲의 분위기가 더 깊어져요.",
      meta: "장기 성장 중",
      percent: 100,
      state: "complete"
    };
  }

  const remaining = Math.max(nextReward.day - streakDays, 0);
  const percent = Math.max(8, Math.min(100, Math.round((streakDays / nextReward.day) * 100)));

  if (currentReward && hasCheckedToday() && currentReward.day === streakDays) {
    return {
      title: `${streakDays}일 연속 보상 · ${currentReward.title}`,
      text: `${currentReward.reached} 다음 목표는 ${nextReward.day}일차 ${nextReward.title}이에요. ${nextReward.teaser}`,
      meta: `다음 변화까지 ${remaining}번 남음`,
      percent,
      state: "reached"
    };
  }

  if (remaining <= 1) {
    return {
      title: `${streakDays}일째 이어 키우는 중`,
      text: `다음 기록으로 ${nextReward.day}일차 ${nextReward.title}에 닿아요. ${nextReward.teaser}`,
      meta: `다음 보상: ${nextReward.day}일차 ${nextReward.title}`,
      percent,
      state: "near"
    };
  }

  return {
    title: `${streakDays}일째 이어 키우는 중`,
    text: `${remaining}번 더 기록하면 ${nextReward.day}일차 ${nextReward.title}에 가까워져요. ${nextReward.teaser}`,
    meta: `다음 변화까지 ${remaining}번 남음`,
    percent,
    state: "progress"
  };
}

function getCurrentWorldEvolution(totalDays = treeData.history.length) {
  return [...worldEvolutionRules].reverse().find((rule) => totalDays >= rule.day) || null;
}

function getNextWorldEvolution(totalDays = treeData.history.length) {
  return worldEvolutionRules.find((rule) => totalDays < rule.day) || null;
}

function getWorldEvolutionInfo() {
  const totalDays = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const currentWorld = getCurrentWorldEvolution(totalDays);
  const nextWorld = getNextWorldEvolution(totalDays);

  if (totalDays <= 0) {
    const firstGoal = worldEvolutionRules[0];
    return {
      title: "월드 숲은 첫 흔적을 기다려요",
      text: "첫 마음을 기록하면 내 나무의 작은 자리에도 씨앗빛이 남기 시작해요.",
      meta: `첫 월드 변화: ${firstGoal.day}일차 ${firstGoal.title}`,
      percent: 0,
      state: "empty",
      className: "world-growth-empty",
      nextTitle: firstGoal.title,
      remaining: firstGoal.day
    };
  }

  if (!nextWorld) {
    return {
      title: `${totalDays}일째 월드 숲에 남은 자리`,
      text: currentWorld
        ? `${currentWorld.reached} 이제부터는 오래 돌볼수록 내 나무 주변의 빛과 그림자가 더 깊어져요.`
        : "오래 돌본 기록이 월드 숲의 내 자리에 조용히 쌓이고 있어요.",
      meta: "장기 월드 성장 중",
      percent: 100,
      state: "complete",
      className: currentWorld?.className || "world-growth-hero",
      nextTitle: null,
      remaining: 0
    };
  }

  const remaining = Math.max(nextWorld.day - totalDays, 0);
  const percent = Math.max(8, Math.min(100, Math.round((totalDays / nextWorld.day) * 100)));

  if (currentWorld) {
    return {
      title: `${totalDays}일째 월드 숲에 쌓인 기록`,
      text: `${currentWorld.reached} ${remaining}번 더 기록하면 ${nextWorld.day}일차 ${nextWorld.title}에 가까워져요. ${nextWorld.teaser}`,
      meta: `다음 월드 변화까지 ${remaining}번 남음`,
      percent,
      state: remaining <= 1 ? "near" : "progress",
      className: currentWorld.className,
      nextTitle: nextWorld.title,
      remaining
    };
  }

  return {
    title: `${totalDays}일째 월드 숲에 닿는 중`,
    text: `${remaining}번 더 기록하면 ${nextWorld.day}일차 ${nextWorld.title}에 닿아요. ${nextWorld.teaser}`,
    meta: `다음 월드 변화까지 ${remaining}번 남음`,
    percent,
    state: "progress",
    className: "world-growth-seed",
    nextTitle: nextWorld.title,
    remaining
  };
}

function getWorldEvolutionSummaryText() {
  const info = getWorldEvolutionInfo();

  if (info.state === "empty") {
    return "첫 기록을 남기면 월드 숲의 내 자리에도 작은 흔적이 생기고, 주변 자리들과 함께 숲을 이루기 시작해요.";
  }

  if (info.remaining <= 0) {
    return "내 나무는 이제 월드 숲 안에서 오래 돌본 자리처럼 조용히 깊어지고, 주변 자리들과 함께 하나의 숲을 이루고 있어요.";
  }

  return `${info.meta}. ${info.nextTitle}을 향해 내 자리가 주변 자리들 사이에서 조금씩 더 선명해지고 있어요.`;
}

function getWorldFocusMessage() {
  const days = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const info = getWorldEvolutionInfo();

  if (days <= 0) {
    return "아직은 빈 자리예요. 첫 마음을 기록하면 이곳이 주변 자리들 사이에서 내 나무의 자리로 깨어나요.";
  }

  if (info.remaining <= 0) {
    return `${days}일 동안 돌본 내 나무가 월드 숲 안에서 오래 남는 자리로 깊어지고 있어요. 주변 나무들 사이에서 내 자리가 더 자연스럽게 숲의 일부가 되었어요.`;
  }

  return `지금 내 자리는 주변 나무들 사이에서 ${days}일의 기록을 품고 있어요. ${info.meta}`;
}

function getStreakRewardPreviewText() {
  const info = getStreakRewardInfo();

  if (!info) {
    return "첫 기록을 남기면 3일차 작은 빛 목표가 시작돼요.";
  }

  return `${info.meta}. ${info.text}`;
}

function getAfterRecordExperience(record) {
  const mood = record?.mood || "normal";
  const previousRecord = getPreviousRecordBeforeToday();
  const consecutiveDays = getConsecutiveRecordDays();
  const returnPrefix = previousRecord
    ? `이전 ${previousRecord.label} 기록 위에 오늘의 마음이 더해졌어요.`
    : "오늘의 첫 기록이 내 나무의 새로운 시작이 되었어요.";
  const streakSuffix = consecutiveDays >= 2
    ? ` 지금 ${consecutiveDays}일째 숲을 이어 돌보고 있어요.`
    : " 내일 다시 오면 오늘의 변화가 다음 성장으로 이어져요.";
  const experienceRules = {
    good: {
      complete: "오늘의 밝은 마음이 잎사귀에 닿아 나무가 조금 더 환해졌어요.",
      changeTitle: "잎이 가볍게 반응했어요",
      changeText: "좋음의 기운이 잎과 빛으로 퍼졌어요. 월드 숲의 내 자리에도 은은한 밝기가 남았어요.",
      tomorrowText: "내일 다시 오면 오늘의 밝은 기운 위에 새로운 잎이 이어져요."
    },
    normal: {
      complete: "오늘의 차분한 마음이 줄기와 잎 사이로 고르게 스며들었어요.",
      changeTitle: "나무가 균형 있게 자랐어요",
      changeText: "보통의 기운이 나무를 천천히 안정시켰어요. 월드 숲의 내 자리도 조용히 균형을 잡고 있어요.",
      tomorrowText: "내일 다시 오면 오늘의 차분한 성장 위에 다음 변화가 이어져요."
    },
    tired: {
      complete: "오늘의 피곤함도 뿌리로 스며들어 나무가 더 단단해졌어요.",
      changeTitle: "뿌리가 조금 더 깊어졌어요",
      changeText: "피곤한 마음도 성장으로 남았어요. 보이지 않는 아래쪽에서 내 나무가 천천히 버틸 힘을 얻었어요.",
      tomorrowText: "내일 다시 오면 오늘 깊어진 뿌리 위에 새로운 회복이 이어져요."
    }
  };

  const rule = experienceRules[mood] || experienceRules.normal;

  return {
    complete: rule.complete,
    changeTitle: rule.changeTitle,
    changeText: `${returnPrefix} ${rule.changeText}`,
    tomorrowTitle: consecutiveDays >= 2 ? `${consecutiveDays}일째 이어지는 성장` : "내일의 마음도 성장으로 이어져요",
    tomorrowText: `${rule.tomorrowText} ${getNextGrowthPreviewMessage()} ${getStreakRewardPreviewText()}${streakSuffix}`
  };
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
        return getServiceDateKeyFromDate(serverDate);
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

function isTodayVisitorEvent(visitorEvent) {
  return Boolean(visitorEvent && visitorEvent.dateKey === getTodayKey());
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

  if (isTodayVisitorEvent(visitorEvent) && visitorEvent?.hasVisitor && visitorEvent.type && visitorRules[visitorEvent.type]) {
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

  const trace = isTodayVisitorEvent(visitorEvent) ? getVisitorTraceInfo(visitorEvent) : null;
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
  trackForestEvent("tree_name_saved");

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

function getDailyLoopInfo() {
  const hasName = Boolean(treeData.treeName?.trim());
  const checkedToday = hasCheckedToday();
  const todayRecord = getTodayRecord();
  const totalDays = treeData.history.length;
  const nextGoalMessage = getNextGoalMessage();

  if (checkedToday && todayRecord) {
    const diaryEntry = getForestDiaryEntry(todayRecord);
    return {
      state: "done",
      title: "오늘의 숲 문장까지 남았어요",
      text: `오늘의 ${todayRecord.label} 마음이 내 나무와 숲 일기장에 남았어요. “${diaryEntry.sentence}” 내일 다시 오면 이 문장 위에 새로운 기록이 이어져요.`
    };
  }

  if (!hasName && totalDays === 0) {
    return {
      state: "start",
      title: "오늘의 마음으로 내 나무 시작하기",
      text: "이름을 정하고 좋음·보통·피곤 중 하나만 골라보세요. 첫 기록만 남겨도 내 나무가 바로 반응해요."
    };
  }

  if (!hasName) {
    return {
      state: "name",
      title: "내 나무 이름 정하기",
      text: "이름을 한 번 정하면, 오늘의 마음을 남기고 다음 성장 목표를 볼 수 있어요."
    };
  }

  const returnMemory = getReturnMemoryInfo();

  if (returnMemory) {
    const pastDiary = getForestDiaryEntry(returnMemory.pastRecord);
    return {
      state: "returning",
      title: returnMemory.isYesterday ? "어제의 숲 문장 이어쓰기" : "이전 숲 기록 이어쓰기",
      text: `${pastDiary.displayDate}의 숲 문장 “${pastDiary.sentence}” 위에 오늘의 마음을 더하면 흐름이 이어져요. ${nextGoalMessage}`
    };
  }

  return {
    state: "waiting",
    title: "오늘 마음 기록하기",
    text: `좋음, 보통, 피곤 중 지금과 가까운 마음 하나만 골라도 충분해요. ${nextGoalMessage}`
  };
}

function getTreeTimeKey() {
  const atmosphere = getWorldAtmosphereInfo();

  if (atmosphere.key === "sunset") {
    return "sunset";
  }

  if (atmosphere.key === "night") {
    return "night";
  }

  return "morning";
}

function getTreeImageInfoByDays(totalDays = 0, timeKey = getTreeTimeKey()) {
  const stage = treeImageStageRules.find((rule) => {
    return totalDays >= rule.minDays && totalDays <= rule.maxDays;
  }) || treeImageStageRules[treeImageStageRules.length - 1];

  return {
    ...stage,
    timeKey,
    src: `${TREE_GROWTH_ASSET_BASE}/tree_stage${stage.stage}_${timeKey}.png`
  };
}

function getTreeImageInfo() {
  return getTreeImageInfoByDays(treeData.history.length, getTreeTimeKey());
}

function getWorldTreeSizeClass(days) {
  if (days <= 0) {
    return "world-tree-seed";
  }

  if (days <= 2) {
    return "world-tree-sprout";
  }

  if (days <= 6) {
    return "world-tree-sapling";
  }

  return "world-tree-young";
}

function getWorldDisplayDays(days) {
  if (!Number.isFinite(days) || days <= 0) {
    return 0;
  }

  /*
    성장 단계는 내 정원과 전체숲에서 동일하게 유지한다.
    전체숲에서는 단계 보정을 하지 않고 실제 기록 횟수만 반영한다.
    시각적인 차이는 CSS 크기/위치 조정으로만 처리한다.
  */
  return Math.max(0, Math.round(days));
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
  const worldInfo = getWorldEvolutionInfo();
  const evolutionClass = worldInfo.className || "world-growth-empty";

  if (days === 0) {
    return {
      className: `world-seed world-level-0 ${evolutionClass}`,
      visual: "•",
      status: hasName
        ? "이름을 얻은 작은 자리가 오늘의 첫 마음을 기다리고 있어요."
        : "숲 한가운데, 아직 이름 없는 작은 자리가 첫 기록을 기다리고 있어요."
    };
  }

  if (days <= 2) {
    return {
      className: `world-sprout world-level-1 ${evolutionClass}`,
      visual: "✦",
      status: "첫 기록이 월드 숲의 내 자리에 씨앗빛으로 남았어요. 3일차에는 작은 빛이 더 선명해져요."
    };
  }

  if (days <= 6) {
    return {
      className: `world-sprout world-preview world-level-2 ${evolutionClass}`,
      visual: "✦",
      status: "내 자리 주변에 작은 빛이 돌기 시작했어요. 7일차에는 숲길에 더 단단히 자리 잡아요."
    };
  }

  if (days <= 13) {
    return {
      className: `world-tree world-level-3 ${evolutionClass}`,
      visual: "✧",
      status: "내 나무가 월드 숲길 근처에 뿌리내리는 중이에요. 기록이 쌓일수록 주변 풀이 더 살아나요."
    };
  }

  if (days < 30) {
    return {
      className: `world-tree world-level-4 ${evolutionClass}`,
      visual: "✧",
      status: "내 나무 주변 빈터가 더 선명해졌어요. 이제 월드 숲 안에서 내 자리의 분위기가 조금씩 보이기 시작해요."
    };
  }

  return {
    className: `world-tree world-mature world-level-5 ${evolutionClass}`,
    visual: "✺",
    status: "오래 돌본 대표 나무가 월드 숲의 큰 흐름 속에서도 분명한 존재감을 가지게 되었어요."
  };
}


function playAfterRecordReward(experience) {
  const rewardTargets = [
    gardenCardElement,
    skyElement,
    treeElement,
    stageMessageElement,
    completeCardElement,
    todayChangeCardElement
  ].filter(Boolean);

  rewardTargets.forEach((element) => {
    element.classList.remove("after-record-reward", "after-record-focus", "after-record-tree", "after-record-card");
  });

  window.setTimeout(() => {
    gardenCardElement?.classList.add("after-record-focus");
    skyElement?.classList.add("after-record-reward");
    treeElement?.classList.add("after-record-tree");
    stageMessageElement?.classList.add("after-record-reward");
    completeCardElement?.classList.add("after-record-card");
    todayChangeCardElement?.classList.add("after-record-card");
    finishGuideCardElement?.classList.add("after-record-card");

    // V1.72.5 test: 기록 직후 화면을 자동 스크롤하지 않고, 현재 보던 정원 무대를 유지합니다.
    closeGardenHubPanel();

    if (growthMessageElement && experience?.complete) {
      growthMessageElement.textContent = `${experience.complete} 방금 고른 마음이 내 나무 주변에 작은 빛으로 남았어요.`;
    }
  }, 420);

  window.setTimeout(() => {
    rewardTargets.forEach((element) => {
      element.classList.remove("after-record-reward", "after-record-focus", "after-record-tree", "after-record-card");
    });
  }, 3600);
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
  const diaryNote = createForestDiaryNote(mood, getTodayKey());

  treeData.leaf += rule.leaf;
  treeData.trunk += rule.trunk;
  treeData.root += rule.root;
  treeData.lastCheckDate = getTodayKey();
  treeData.history.unshift({
    date: getTodayKey(),
    mood,
    label: rule.label,
    icon: rule.icon,
    message: rule.message,
    forestTitle: diaryNote.forestTitle,
    forestSentence: diaryNote.forestSentence
  });

  saveTreeData();
  trackForestEvent("mood_recorded", { mood_type: mood });
  shouldHighlightWorldSpot = true;

  renderWorld();
  renderFirstVisitGuide();
  renderForestInviteCard();
  renderDailyLoop();
  renderHeader();
  renderTreeName();
  renderTree(true);
  renderForestEffect(rule.state, true);
  const afterRecordExperience = getAfterRecordExperience({ mood, label: rule.label });
  renderMessages(`${afterRecordExperience.complete} 오늘의 변화는 월드 숲에도 조용히 남았어요. ${getNextGrowthPreviewMessage()}`);
  renderReturnMemoryCard();
  renderStreakRewardCard();
  renderCompleteCard();
  renderTomorrowSeedCard();
  renderForestDiaryCard();
  renderForestShareCard();
  renderTreeCareCard();
  renderForestTrailCard();
  renderSelfCareCard();
  renderWeeklyForestLetterCard();
  renderForestArchiveCard();
  renderForestCalendarCard();
  renderForestMemoryCard();
  updateTodayStatus();
  updateOneActionStepUI();
  prepareDailyVisitor({ forcePlay: true, allowCreate: true, allowPlay: true });
  showGardenActivityLog("오늘 마음이 숲에 남았어요");
  playAfterRecordReward(afterRecordExperience);
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

function createWorldAtmosphere(key, forced = false) {
  const atmosphereMap = {
    day: {
      key: "day",
      label: "낮 숲",
      shortLabel: "낮",
      description: forced ? "테스트 모드에서 밝은 낮 분위기를 확인하고 있어요." : "햇빛이 숲길과 빈터까지 환하게 비추는 시간이에요.",
      hint: "낮 숲은 확실히 밝게 보여요. 숲길, 빈터, 내 자리까지 햇빛이 들어와 생명력이 살아나요.",
      particleCount: 11,
      quietChance: 0.06
    },
    sunset: {
      key: "sunset",
      label: "노을 숲",
      shortLabel: "노을",
      description: forced ? "테스트 모드에서 노을 분위기를 확인하고 있어요." : "밝은 낮에서 밤으로 넘어가기 전, 따뜻한 빛과 그림자가 함께 내려앉는 시간이에요.",
      hint: "노을 숲은 낮보다 차분하지만 어둡지 않게, 따뜻한 빛과 긴 그림자로 하루의 마무리 느낌을 줘요.",
      particleCount: 12,
      quietChance: 0.13
    },
    night: {
      key: "night",
      label: "밤 숲",
      shortLabel: "밤",
      description: forced ? "테스트 모드에서 밤 분위기를 확인하고 있어요." : "달빛과 반딧불이가 숲을 은은하게 밝혀주는 시간이에요.",
      hint: "달빛과 안개가 깊어지고, 반딧불이와 작은 빛 입자가 숲 안에서 더 선명하게 보여요.",
      particleCount: 16,
      quietChance: 0.18
    }
  };

  return atmosphereMap[key] || atmosphereMap.day;
}

function getWorldAtmosphereInfo() {
  const forcedWorldTime = (urlParams.get("worldTime") || "").toLowerCase();
  const isExplicitTestMode = ["1", "true", "yes"].includes((urlParams.get("test") || "").toLowerCase());

  // V1.73.2 hotfix:
  // worldTime은 테스트 링크에서만 강제 적용한다.
  // 일반 방문 URL에 worldTime=sunset/night 값이 남아 있으면 실제 시간대와 어긋나므로 무시한다.
  if (isExplicitTestMode && ["day", "sunset", "night"].includes(forcedWorldTime)) {
    return createWorldAtmosphere(forcedWorldTime, true);
  }

  const hour = new Date().getHours();

  if (hour >= 6 && hour < 17) {
    return createWorldAtmosphere("day");
  }

  if (hour >= 17 && hour < 20) {
    return createWorldAtmosphere("sunset");
  }

  return createWorldAtmosphere("night");
}

function renderWorldAtmosphere() {
  const atmosphere = getWorldAtmosphereInfo();

  if (worldStageElement) {
    worldStageElement.classList.remove("world-time-day", "world-time-sunset", "world-time-night", "world-focus-active");
    worldStageElement.classList.add(`world-time-${atmosphere.key}`);
    worldStageElement.dataset.worldTime = atmosphere.key;
    worldStageElement.setAttribute("aria-label", `전체 월드 숲, 현재 ${atmosphere.label}`);
  }

  if (document.body) {
    document.body.dataset.worldTime = atmosphere.key;
    document.body.dataset.forestTime = atmosphere.key;
    document.body.classList.remove("forest-time-day", "forest-time-sunset", "forest-time-night");
    document.body.classList.add(`forest-time-${atmosphere.key}`);
  }

  if (worldTimeBadgeElement) {
    worldTimeBadgeElement.textContent = atmosphere.label;
    worldTimeBadgeElement.setAttribute("aria-label", atmosphere.description);
  }

  if (worldAtmosphereHintElement) {
    worldAtmosphereHintElement.textContent = atmosphere.hint;
  }

  return atmosphere;
}

function getWorldLifeCount(seed, maxCount, chance) {
  let count = 0;

  for (let index = 0; index < maxCount; index += 1) {
    if (hashStringToUnitInterval(`${seed}-${index}`) < chance) {
      count += 1;
    }
  }

  return count;
}

function getWorldLifeStyle(seed, index, zone = "air") {
  const x = 12 + hashStringToUnitInterval(`${seed}-x-${index}`) * 76;
  const baseY = zone === "ground" ? 60 : zone === "high" ? 18 : 26;
  const ySpread = zone === "ground" ? 18 : zone === "high" ? 20 : 34;
  const y = baseY + hashStringToUnitInterval(`${seed}-y-${index}`) * ySpread;
  const scale = 0.72 + hashStringToUnitInterval(`${seed}-scale-${index}`) * 0.72;
  const delay = hashStringToUnitInterval(`${seed}-delay-${index}`) * -7;
  const duration = 6 + hashStringToUnitInterval(`${seed}-duration-${index}`) * 8;

  return `--life-x: ${x.toFixed(1)}%; --life-y: ${y.toFixed(1)}%; --life-scale: ${scale.toFixed(2)}; --life-delay: ${delay.toFixed(2)}s; --life-duration: ${duration.toFixed(2)}s;`;
}

function createWorldLifeMarkup(type, index, seed) {
  const labels = {
    bird: "새가 숲 위를 지나가요",
    squirrel: "다람쥐가 숲길 근처를 지나가요",
    butterfly: "나비가 빛 사이를 지나가요",
    firefly: "반딧불이가 숲 안에서 빛나요",
    light: "빛 입자가 숲 안에 떠 있어요"
  };
  const zone = type === "squirrel" ? "ground" : type === "bird" ? "high" : "air";
  const style = getWorldLifeStyle(`${seed}-${type}`, index, zone);

  if (type === "bird") {
    return `<span class="world-life-item world-life-bird" style="${style}" aria-label="${labels[type]}"><img src="../assets/garden/bird-silhouette-v3.png" alt="" /></span>`;
  }

  if (type === "squirrel") {
    return `<span class="world-life-item world-life-squirrel" style="${style}" aria-label="${labels[type]}"><img src="../assets/garden/squirrel-silhouette-v3.png" alt="" /></span>`;
  }

  const symbol = type === "butterfly" ? "✧" : type === "firefly" ? "•" : "✦";
  return `<span class="world-life-item world-life-${type}" style="${style}" aria-label="${labels[type]}">${symbol}</span>`;
}

function getWorldTimeCycleKey() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.floor(minutes / 20);
}

function renderWorldLife(atmosphere = getWorldAtmosphereInfo()) {
  if (worldLifeLayerElement) {
    worldLifeLayerElement.innerHTML = "";
  }
}

function renderWorldParticles(atmosphere = getWorldAtmosphereInfo()) {
  if (worldParticleLayerElement) {
    worldParticleLayerElement.innerHTML = "";
  }
}

function renderWorldVisualLayers() {
  const atmosphere = renderWorldAtmosphere();
  renderWorldLife(atmosphere);
  renderWorldParticles(atmosphere);
}

let worldFocusTimer = null;
let worldFocusButtonTimer = null;

function showWorldFocusToast(message = "여기가 내 자리예요") {
  const host = worldStageElement || worldScreenElement || document.body;
  if (!host) return;

  let toast = document.querySelector("#worldFocusToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "worldFocusToast";
    toast.className = "world-focus-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    host.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
}

function focusMyWorldSpot() {
  trackForestEvent("focus_my_tree_click", { source: "focus_my_tree_button" });

  if (!worldStageElement || !myWorldSpotElement) {
    highlightWorldSpot();
    showWorldFocusToast();
    return;
  }

  if (worldFocusTimer) {
    window.clearTimeout(worldFocusTimer);
  }
  if (worldFocusButtonTimer) {
    window.clearTimeout(worldFocusButtonTimer);
  }

  worldStageElement.classList.remove("world-focus-active");
  myWorldSpotElement.classList.remove("world-spot-highlight");
  void worldStageElement.offsetWidth;

  document.body.classList.add("world-focus-running");
  worldStageElement.classList.add("world-focus-active");
  myWorldSpotElement.classList.add("world-spot-highlight");

  try {
    myWorldSpotElement.setAttribute("tabindex", "-1");
    myWorldSpotElement.focus({ preventScroll: true });
  } catch (error) {
    myWorldSpotElement.focus?.();
  }

  highlightWorldSpot();
  showWorldFocusToast(getWorldFocusMessage() || "여기가 내 자리예요");

  if (focusMyTreeBtnElement) {
    focusMyTreeBtnElement.setAttribute("aria-pressed", "true");
    focusMyTreeBtnElement.textContent = "내 자리 ✓";
  }

  if (worldCommunityHintElement) {
    worldCommunityHintElement.textContent = getWorldFocusMessage();
  }

  if (worldSummaryTextElement) {
    worldSummaryTextElement.textContent = getWorldEvolutionSummaryText();
  }

  worldFocusTimer = window.setTimeout(() => {
    worldStageElement.classList.remove("world-focus-active");
    document.body.classList.remove("world-focus-running");
    myWorldSpotElement.classList.remove("world-spot-highlight");
    const toast = document.querySelector("#worldFocusToast");
    toast?.classList.remove("show");
  }, 3200);

  worldFocusButtonTimer = window.setTimeout(() => {
    if (focusMyTreeBtnElement) {
      focusMyTreeBtnElement.setAttribute("aria-pressed", "false");
      focusMyTreeBtnElement.textContent = "내 자리";
    }
  }, 1800);
}

function getOnlineSeatDays(record) {
  const rawDays = Number(record?.growthDays || record?.growth_days || record?.days || 0);
  if (!Number.isFinite(rawDays) || rawDays < 0) {
    return 0;
  }
  return Math.min(999, Math.round(rawDays));
}

function getOnlineSeatMoodState(record) {
  const mood = sanitizeOnlineText(record?.mood || record?.moodType || record?.mood_type || "", 24);
  if (mood === "good") return "leaf-strong";
  if (mood === "tired") return "root-strong";
  return "balanced";
}

function createWorldCommunitySeatSlot(seat) {
  const baseSlot = worldCommunitySeatSlots[seat.id];
  if (!baseSlot) {
    return null;
  }

  const record = getOnlineSeatRecord(seat.id);
  if (!record) {
    return {
      ...baseSlot,
      source: "seat-dummy",
      seatId: seat.id,
      seatLabel: seat.label,
      name: baseSlot.name,
      ariaSource: `${seat.label}에서 친구를 기다리는 더미 나무`
    };
  }

  const friendName = sanitizeOnlineText(record.friendName || record.friend_name || "친구", 12) || "친구";
  const treeName = sanitizeOnlineText(record.treeName || record.tree_name || `${friendName}의 나무`, 16) || `${friendName}의 나무`;
  const days = getOnlineSeatDays(record);

  return {
    ...baseSlot,
    source: "real",
    seatId: seat.id,
    seatLabel: seat.label,
    name: treeName,
    ownerName: friendName,
    state: getOnlineSeatMoodState(record),
    days,
    opacity: Math.min(0.96, Math.max(0.82, (baseSlot.opacity || 0.72) + 0.16)),
    scale: Math.min(1.12, (baseSlot.scale || 0.84) + 0.14),
    mobileScale: Math.min(0.92, (baseSlot.mobileScale || 0.74) + 0.12),
    className: `${baseSlot.className || ""} is-occupied-seat`,
    ariaSource: `${seat.label}에 들어온 ${friendName}님의 실제 나무`
  };
}

function getWorldCommunityForestSlots() {
  const baseSlots = worldForestSlots.map((slot, index) => ({
    ...slot,
    source: "dummy",
    dummyIndex: index,
    ariaSource: "숲을 채우는 더미 나무"
  }));

  const communitySlots = friendInviteSeatSlots
    .map(createWorldCommunitySeatSlot)
    .filter(Boolean);

  return [...baseSlots, ...communitySlots].sort((a, b) => {
    if ((a.depth || 0) !== (b.depth || 0)) return (a.depth || 0) - (b.depth || 0);
    return (a.y || 0) - (b.y || 0);
  });
}

function renderWorldNeighbors() {
  if (!worldNeighborSpotsElement) {
    return;
  }

  const dummySlots = worldForestSlots.map((slot) => ({
    ...slot,
    source: "dummy",
    treeName: slot.name,
    displayOwner: slot.ownerName || "숲친구"
  }));

  const realSlots = friendInviteSeatSlots
    .map((seat) => {
      const baseSlot = worldCommunitySeatSlots[seat.id];
      const record = getOnlineSeatRecord(seat.id);
      if (!baseSlot || !record) return null;
      const friendName = sanitizeOnlineText(record.friendName || record.friend_name || "친구", 12) || "친구";
      const treeName = sanitizeOnlineText(record.treeName || record.tree_name || `${friendName}의 나무`, 16) || `${friendName}의 나무`;
      return {
        ...baseSlot,
        source: "real",
        treeName,
        displayOwner: friendName,
        days: Math.max(60, getOnlineSeatDays(record)),
        scale: Math.max(0.88, baseSlot.scale || 0.88),
        mobileScale: Math.max(0.72, baseSlot.mobileScale || 0.72),
        depth: Math.max(7, baseSlot.depth || 7),
        tilt: baseSlot.tilt || 0
      };
    })
    .filter(Boolean);

  const slots = [...dummySlots, ...realSlots].sort((a, b) => (a.depth || 0) - (b.depth || 0));

  worldNeighborSpotsElement.innerHTML = slots.map((slot) => {
    const imageInfo = getTreeImageInfoByDays(Math.max(1, slot.days || 1));
    const label = `${slot.displayOwner || "숲친구"}의 ${slot.treeName || "나무"}`;
    return `
      <article
        class="forest-citizen-tree ${slot.source === "real" ? "is-real" : "is-dummy"}"
        data-world-slot-source="${escapeHtml(slot.source)}"
        style="--citizen-x:${slot.x}%; --citizen-y:${slot.y}%; --citizen-scale:${slot.scale}; --citizen-mobile-x:${slot.mobileX || slot.x}%; --citizen-mobile-y:${slot.mobileY || slot.y}%; --citizen-mobile-scale:${slot.mobileScale || slot.scale}; --citizen-z:${slot.depth || 4}; --citizen-tilt:${slot.tilt || 0}deg; --citizen-opacity:${slot.opacity ?? 1}; --citizen-blur:${slot.blur ?? 0}px; --citizen-brightness:${slot.brightness ?? 1}; --citizen-sat:${slot.sat ?? 1};"
        aria-label="${escapeHtml(label)}"
      >
        <span class="citizen-tree-ground" aria-hidden="true"></span>
        <img class="citizen-tree-image" src="${imageInfo.src}" alt="" />
        <span class="citizen-tree-label">${escapeHtml(slot.source === "real" ? label : "")}</span>
      </article>
    `;
  }).join("");
}

function getFriendForestPreview() {
  const days = treeData.history.length;
  const startIndex = days % friendForestProfiles.length;
  const previewCount = 5;
  const profiles = Array.from({ length: previewCount }, (_, index) => friendForestProfiles[(startIndex + index) % friendForestProfiles.length]);

  let title = "아직 친구가 없어도 숲은 기다리는 중";
  let text = "꽃길 자리, 햇살 자리, 연못 자리, 그네 자리, 꽃담 자리는 나중에 실제 온라인 친구가 들어올 수 있는 고정 자리예요.";
  let meta = "실제 친구가 생기면 이 자리는 친구의 나무와 방문 흔적으로 자연스럽게 이어질 수 있어요.";

  if (days === 0) {
    title = "친구가 오기 전, 다섯 온라인 친구 자리가 먼저 준비되어 있어요";
    text = "첫 마음을 남기면 A~E 다섯 자리도 온라인 친구가 들어올 수 있는 자리처럼 더 또렷하게 보여요.";
    meta = "지금은 실제 친구가 없다는 점을 숨기지 않고, 대신 숲 친구가 빈자리를 외롭지 않게 채워주는 단계예요.";
  } else if (days < 7) {
    title = `월드 숲에 다섯 온라인 친구 자리가 보여요`;
    text = `${days}일째 쌓인 기록 덕분에 꽃길, 햇살, 연못, 그네, 꽃담 자리가 온라인 친구를 기다리는 자리처럼 선명해지고 있어요.`;
    meta = "오늘도 마음을 남기면 비어 있던 자리가 조금 더 따뜻하게 살아나요.";
  } else if (days < 14) {
    title = `친구 숲에서 다섯 온라인 자리가 먼저 반응하고 있어요`;
    text = `${days}일째 이어진 기록 덕분에 내 주변 자리들이 서로 인사하는 숲처럼 보여요. 함께 모일 친구 분위기가 자라고 있어요.`;
    meta = "지금은 자리 이름만 보이지만, 나중에는 친구 닉네임과 나무가 붙을 수 있는 구조예요.";
  } else {
    title = `친구 숲이 ${days}일의 기록을 따라 더 또렷해졌어요`;
    text = `이제 내 자리 주변의 빈자리도 단순 장식이 아니라 친구의 나무, 선물, 장식이 이어질 자리처럼 느껴져요.`;
    meta = "다음 단계에서는 이 분위기를 바탕으로 친구 흔적이나 공동체 느낌을 더 확장할 수 있어요.";
  }

  return { profiles, title, text, meta };
}

function renderFriendForestCard() {
  if (!friendForestCardElement) {
    return;
  }

  const preview = getFriendForestPreview();

  if (friendForestTitleElement) {
    friendForestTitleElement.textContent = preview.title;
  }

  if (friendForestTextElement) {
    friendForestTextElement.textContent = preview.text;
  }

  if (friendForestListElement) {
    friendForestListElement.innerHTML = preview.profiles
      .map((profile) => `
        <li class="friend-forest-item">
          <strong>${profile.name}</strong>
          <span>${profile.mood}</span>
          <em>${profile.badge}</em>
        </li>
      `)
      .join("");
  }

  if (friendForestMetaElement) {
    friendForestMetaElement.textContent = preview.meta;
  }
}


function getFriendLinkId(link) {
  return sanitizeOnlineText(link?.friendId || link?.friend_id || "", 80);
}

function getFriendLinkName(link) {
  return sanitizeOnlineText(link?.friendName || link?.friend_name || "친구", 12) || "친구";
}

function getFriendLinkTreeName(link) {
  return sanitizeOnlineText(link?.treeName || link?.tree_name || "친구 나무", 16) || "친구 나무";
}

function getFriendLinkCurrentSeatId(link) {
  return sanitizeOnlineText(link?.currentSeatId || link?.current_seat_id || "", 40);
}

function getFriendLinkPlacementText(link) {
  const placement = sanitizeOnlineText(link.placementStatus || link.placement_status || "", 24);
  const seatLabel = sanitizeOnlineText(link.currentSeatLabel || link.current_seat_label || "", 30);

  if (placement === "placed" && seatLabel) {
    return `${seatLabel}에 배치됨`;
  }

  if (placement === "unplaced") {
    return "친구 목록에 있음 · 자리 없음";
  }

  return seatLabel ? `${seatLabel} 연결됨` : "친구 목록에 있음";
}

function getFriendLinkById(friendId) {
  const safeFriendId = sanitizeOnlineText(friendId, 80);
  return (Array.isArray(onlineFriendLinks) ? onlineFriendLinks : []).find((link) => getFriendLinkId(link) === safeFriendId) || null;
}

function isSeatOccupiedByOtherFriend(seatId, friendId) {
  const record = getOnlineSeatRecord(seatId);
  if (!record) return false;

  const currentFriendId = sanitizeOnlineText(record.friendId || record.friend_id || "", 80);
  const safeFriendId = sanitizeOnlineText(friendId, 80);

  if (!currentFriendId) {
    return true;
  }

  return currentFriendId !== safeFriendId;
}

function getFriendSeatOccupantName(seatId) {
  const record = getOnlineSeatRecord(seatId);
  return record ? (sanitizeOnlineText(record.friendName || record.friend_name || "친구", 12) || "친구") : "";
}

function getFriendSeatStatusClass(seatId) {
  return getOnlineSeatRecord(seatId) ? "is-filled" : "is-empty";
}

function getFriendSeatStatusText(seatId) {
  const record = getOnlineSeatRecord(seatId);
  if (!record) {
    return "비어 있음";
  }

  const friendName = sanitizeOnlineText(record.friendName || record.friend_name || "친구", 12) || "친구";
  return `${friendName}님 있음`;
}

function getFriendSeatLabelById(seatId) {
  const seat = getFriendInviteSeatById(seatId);
  return seat ? seat.label : "자리 없음";
}

function getFriendSeatActionKind(link, seat) {
  const friendId = getFriendLinkId(link);
  const currentSeatId = getFriendLinkCurrentSeatId(link);
  const occupiedByOther = isSeatOccupiedByOtherFriend(seat.id, friendId);

  if (currentSeatId === seat.id) {
    return "current";
  }

  if (occupiedByOther) {
    return "replace";
  }

  if (currentSeatId) {
    return "move";
  }

  return "place";
}

function getFriendSeatActionHint(actionKind) {
  if (actionKind === "current") return "현재 자리";
  if (actionKind === "replace") return "교체";
  if (actionKind === "move") return "이동";
  return "빈 자리";
}

function getFriendSeatActionGuide(link, seat, actionKind) {
  if (actionKind === "current") return "이미 이 친구가 있는 자리예요.";
  if (actionKind === "replace") return `${getFriendSeatOccupantName(seat.id)}님과 교체돼요.`;
  if (actionKind === "move") return `${getFriendSeatLabelById(getFriendLinkCurrentSeatId(link))}에서 이동해요.`;
  return "누르면 이 자리로 배치돼요.";
}

function renderFriendSeatStatusGuide() {
  return `
    <li class="friend-seat-guide-row" aria-label="현재 친구 자리 현황">
      <div class="friend-seat-guide-head">
        <strong>자리 현황</strong>
        <span>현재 자리·이동·교체 상태를 보고 누르면 돼요. 교체는 확인창을 한 번 더 물어봐요.</span>
      </div>
      <div class="friend-seat-guide-chips">
        ${friendInviteSeatSlots.map((seat) => `
          <span class="friend-seat-guide-chip ${getFriendSeatStatusClass(seat.id)}">
            <b>${escapeHtml(seat.emoji)} ${escapeHtml(seat.label)}</b>
            <small>${escapeHtml(getFriendSeatStatusText(seat.id))}</small>
          </span>
        `).join("")}
      </div>
    </li>
  `;
}

function renderFriendPlacementButtons(link) {
  const friendId = getFriendLinkId(link);
  const currentSeatId = getFriendLinkCurrentSeatId(link);
  const isAssigning = friendLinkAssignState === "saving";

  if (!friendId) {
    return `<p class="friend-link-warning">친구 ID가 없어 자리 배치를 할 수 없어요.</p>`;
  }

  return `
    <div class="friend-link-seat-actions" role="group" aria-label="${escapeHtml(getFriendLinkName(link))} 자리 배치">
      ${friendInviteSeatSlots.map((seat) => {
        const actionKind = getFriendSeatActionKind(link, seat);
        const isCurrent = actionKind === "current";
        const needsConfirm = actionKind === "replace";
        const statusClass = isCurrent
          ? " is-current"
          : (needsConfirm ? " needs-confirm" : (actionKind === "move" ? " is-move" : " is-open"));
        const hint = getFriendSeatActionHint(actionKind);
        const guide = getFriendSeatActionGuide(link, seat, actionKind);
        const actionLabel = actionKind === "replace" ? "교체" : (actionKind === "move" ? "이동" : "배치");
        return `
          <button
            type="button"
            class="friend-link-seat-btn${statusClass}"
            data-friend-link-id="${escapeHtml(friendId)}"
            data-friend-link-seat="${escapeHtml(seat.id)}"
            data-friend-link-action="${escapeHtml(actionKind)}"
            aria-label="${escapeHtml(getFriendLinkName(link))}님을 ${escapeHtml(seat.label)}로 ${escapeHtml(actionLabel)}"
            ${isCurrent ? 'aria-current="true"' : ""}
            ${isCurrent || isAssigning ? "disabled" : ""}
          >
            <span><b>${escapeHtml(seat.emoji)}</b> ${escapeHtml(seat.label)}</span>
            <small>${escapeHtml(hint)}</small>
            <i>${escapeHtml(guide)}</i>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderFriendLinksCard() {
  if (!friendLinksCardElement) {
    return;
  }

  const links = Array.isArray(onlineFriendLinks) ? onlineFriendLinks : [];
  const totalCount = links.length;
  const placedCount = links.filter((link) => (link.placementStatus || link.placement_status) === "placed").length;
  const waitingCount = Math.max(0, totalCount - placedCount);

  if (onlineFriendLinksLoadState === "loading") {
    if (friendLinksTitleElement) friendLinksTitleElement.textContent = "친구 관계 저장소를 불러오는 중이에요";
    if (friendLinksTextElement) friendLinksTextElement.textContent = "friend_links 시트에서 친구 목록을 확인하고 있어요.";
    if (friendLinksListElement) friendLinksListElement.innerHTML = "";
    if (friendLinksMetaElement) friendLinksMetaElement.textContent = "잠시만 기다려 주세요.";
    return;
  }

  if (onlineFriendLinksLoadState === "error") {
    if (friendLinksTitleElement) friendLinksTitleElement.textContent = "친구 관계 저장소 확인이 필요해요";
    if (friendLinksTextElement) friendLinksTextElement.textContent = "Apps Script 배포 상태를 확인해 주세요. V1.73.1 whitepaper는 시간대별 전체숲 배경 이미지, 백서 페이지 연결, 기존 Apps Script 저장 구조로 동작해요.";
    if (friendLinksListElement) friendLinksListElement.innerHTML = "";
    if (friendLinksMetaElement) friendLinksMetaElement.textContent = `불러오기 실패: ${onlineFriendLinksLastError || "unknown"}`;
    return;
  }

  if (friendLinksTitleElement) {
    friendLinksTitleElement.textContent = totalCount > 0
      ? `친구 ${totalCount}명 중 ${placedCount}명이 숲 자리에 보여요`
      : "아직 친구 목록은 비어 있어요";
  }

  if (friendLinksTextElement) {
    friendLinksTextElement.textContent = totalCount > 0
      ? "친구 카드에서 현재 자리·이동·교체 상태를 확인한 뒤 눌러 주세요. 현재 자리는 눌리지 않게 막아두었어요."
      : "친구가 초대 링크로 들어오면 먼저 친구 목록에 저장되고, 빈 숲 자리에는 대표 친구로 배치돼요.";
  }

  if (friendLinksListElement) {
    if (totalCount === 0) {
      friendLinksListElement.innerHTML = `
        ${renderFriendSeatStatusGuide()}
        <li class="friend-links-empty">
          <strong>친구 목록 대기 중</strong>
          <span>친구가 들어오면 이곳에 관계가 먼저 저장돼요.</span>
        </li>
      `;
    } else {
      const orderedLinks = links.slice(0, 12).sort((a, b) => {
        const seatA = getFriendLinkCurrentSeatId(a);
        const seatB = getFriendLinkCurrentSeatId(b);
        if (!!seatA !== !!seatB) return seatA ? -1 : 1;
        return getFriendLinkName(a).localeCompare(getFriendLinkName(b), "ko");
      });
      friendLinksListElement.innerHTML = `
        ${renderFriendSeatStatusGuide()}
        ${orderedLinks.map((link) => {
          const friendName = getFriendLinkName(link);
          const treeName = getFriendLinkTreeName(link);
          const placementText = getFriendLinkPlacementText(link);
          const currentSeatId = getFriendLinkCurrentSeatId(link);
          return `
            <li class="friend-links-item${currentSeatId ? " is-placed" : " is-unplaced"}">
              <div class="friend-link-summary">
                <strong>${escapeHtml(friendName)}</strong>
                <span>${escapeHtml(treeName)}</span>
                <em>${escapeHtml(placementText)}</em>
              </div>
              ${renderFriendPlacementButtons(link)}
            </li>
          `;
        }).join("")}
      `;
    }
  }

  if (friendLinksMetaElement) {
    if (friendLinkAssignState === "saving") {
      friendLinksMetaElement.textContent = friendLinkAssignMessage || "친구 자리를 저장하는 중이에요.";
    } else if (friendLinkAssignState === "success") {
      friendLinksMetaElement.textContent = friendLinkAssignMessage || "친구 자리 배치를 저장했어요.";
    } else if (friendLinkAssignState === "error") {
      friendLinksMetaElement.textContent = friendLinkAssignMessage || "친구 자리 배치에 실패했어요.";
    } else {
      friendLinksMetaElement.textContent = totalCount > 0
        ? `배치됨 ${placedCount}명 · 자리 없음 ${waitingCount}명. 현재 자리는 잠금, 이동은 파랑, 교체는 노랑으로 보여요.`
        : "친구 관계 저장소는 준비됐어요. 초대 테스트를 하면 friend_links 시트가 생겨야 해요.";
    }
  }
}

async function loadOnlineFriendLinks() {
  onlineFriendLinksLoadState = "loading";
  onlineFriendLinksLastError = "";
  renderFriendLinksCard();

  try {
    const forestId = getOrCreateOnlineForestId();
    const result = await requestOnlineForestStorage("list_friend_links", { forest_id: forestId });

    if (!result || result.ok === false) {
      throw new Error(result?.error || "load_links_failed");
    }

    onlineFriendLinks = Array.isArray(result.links) ? result.links : [];
    onlineFriendLinksLoadState = "loaded";
  } catch (error) {
    onlineFriendLinks = [];
    onlineFriendLinksLoadState = "error";
    onlineFriendLinksLastError = error?.message || "unknown";
  }

  renderFriendLinksCard();
}

async function assignFriendLinkToSeat(friendId, seatId) {
  if (friendLinkAssignState === "saving") {
    return;
  }

  const link = getFriendLinkById(friendId);
  const seat = getFriendInviteSeatById(seatId);

  if (!link || !seat) {
    friendLinkAssignState = "error";
    friendLinkAssignMessage = "친구나 자리를 찾지 못했어요. 새로고침 후 다시 확인해 주세요.";
    renderFriendLinksCard();
    return;
  }

  const friendName = getFriendLinkName(link);
  const currentSeatId = getFriendLinkCurrentSeatId(link);
  const currentSeatLabel = currentSeatId ? getFriendSeatLabelById(currentSeatId) : "아직 자리 없음";
  const actionKind = getFriendSeatActionKind(link, seat);

  if (actionKind === "current") {
    friendLinkAssignState = "success";
    friendLinkAssignMessage = `${friendName}님은 이미 ${seat.label}에 있어요. 현재 자리는 다시 저장하지 않았어요.`;
    selectedFriendInviteSeatId = seat.id;
    renderFriendLinksCard();
    renderFriendInviteCard(true);
    return;
  }

  if (actionKind === "replace") {
    const occupantName = getFriendSeatOccupantName(seat.id);
    const ok = window.confirm(`${seat.label}에는 지금 ${occupantName}님이 있어요.

확인을 누르면
- ${friendName}님: ${currentSeatLabel} → ${seat.label}
- ${occupantName}님: 자리에서만 빠짐

친구 목록에서는 아무도 삭제되지 않아요.`);
    if (!ok) {
      friendLinkAssignState = "idle";
      friendLinkAssignMessage = `${seat.label} 교체를 취소했어요. 친구 자리에는 아무 변화가 없어요.`;
      renderFriendLinksCard();
      return;
    }
  }

  const actionText = actionKind === "move" ? "이동" : (actionKind === "replace" ? "교체" : "배치");
  friendLinkAssignState = "saving";
  friendLinkAssignMessage = `${friendName}님을 ${seat.label}에 ${actionText}하는 중이에요...`;
  renderFriendLinksCard();

  try {
    const result = await requestOnlineForestStorage("assign_friend_seat", {
      forest_id: getOrCreateOnlineForestId(),
      friend_id: getFriendLinkId(link),
      seat_id: seat.id,
      seat_label: seat.label,
      source: "owner_assign_friend_link",
    });

    if (!result || result.ok === false) {
      throw new Error(result?.error || "assign_failed");
    }

    selectedFriendInviteSeatId = seat.id;

    await loadOnlineFriendSeats();
    await loadOnlineFriendLinks();
    syncFriendInviteSeatSelection();
    renderFriendInviteCard(true);

    const replacedText = result.replaced ? " 교체된 친구도 친구 목록에는 남아요." : "";
    friendLinkAssignState = "success";
    friendLinkAssignMessage = `${friendName}님을 ${seat.label}에 ${actionText}했어요.${replacedText}`;

    trackForestEvent("online_friend_link_assigned", {
      seat_id: seat.id,
      friend_id: getFriendLinkId(link),
      action: actionKind,
      from_seat_id: currentSeatId || "none",
      replaced: result.replaced ? "yes" : "no",
    });

    renderFriendLinksCard();
  } catch (error) {
    friendLinkAssignState = "error";
    friendLinkAssignMessage = `친구 자리를 저장하지 못했어요. Apps Script 배포 상태를 확인해 주세요. (${error?.message || "unknown"})`;
    renderFriendLinksCard();
  }
}

function renderWorldCommunityHint(todayRecord) {
  if (!worldCommunityHintElement) {
    return;
  }

  const worldInfo = getWorldEvolutionInfo();

  if (todayRecord) {
    worldCommunityHintElement.textContent = `오늘의 ${todayRecord.label} 기운이 내 자리 주변 숲에도 남았어요. 친구가 들어오면 가까운 더미 나무 자리가 실제 친구 나무로 바뀌어요.`;
    return;
  }

  if (treeData.history.length === 0) {
    worldCommunityHintElement.textContent = `멀리 보이는 나무들은 초반 더미 나무예요. 실제 친구가 들어오면 가까운 다섯 자리가 친구 나무로 바뀌어요.`;
    return;
  }

  worldCommunityHintElement.textContent = `${treeData.history.length}일의 기록이 월드 숲에 쌓였어요. 더미 나무 사이에 내 나무와 친구 나무가 함께 자리 잡을 수 있어요. ${worldInfo.meta}`;
}

function renderWorldGrowthCard() {
  if (!worldGrowthCardElement) {
    return;
  }

  const info = getWorldEvolutionInfo();
  worldGrowthCardElement.classList.remove("world-growth-empty", "world-growth-progress", "world-growth-near", "world-growth-complete", "world-growth-seed", "world-growth-light", "world-growth-rooted", "world-growth-clearing", "world-growth-mature", "world-growth-hero");
  worldGrowthCardElement.classList.add(`world-growth-${info.state}`, info.className);

  if (worldGrowthTitleElement) {
    worldGrowthTitleElement.textContent = info.title;
  }

  if (worldGrowthTextElement) {
    worldGrowthTextElement.textContent = info.text;
  }

  if (worldGrowthMetaElement) {
    worldGrowthMetaElement.textContent = info.meta;
  }

  if (worldGrowthFillElement) {
    worldGrowthFillElement.style.width = `${info.percent}%`;
  }
}



function getOrCreateOnlineForestId() {
  try {
    let forestId = localStorage.getItem(ONLINE_FOREST_STORAGE_KEY);
    if (!forestId) {
      const randomPart = Math.random().toString(36).slice(2, 9);
      const timePart = Date.now().toString(36);
      forestId = `forest_${timePart}_${randomPart}`;
      localStorage.setItem(ONLINE_FOREST_STORAGE_KEY, forestId);
    }
    return forestId;
  } catch (error) {
    return `forest_${Date.now().toString(36)}`;
  }
}

function getOrCreateOnlineFriendId() {
  try {
    let friendId = localStorage.getItem(ONLINE_FRIEND_STORAGE_KEY);
    if (!friendId) {
      const randomPart = Math.random().toString(36).slice(2, 9);
      const timePart = Date.now().toString(36);
      friendId = `friend_${timePart}_${randomPart}`;
      localStorage.setItem(ONLINE_FRIEND_STORAGE_KEY, friendId);
    }
    return friendId;
  } catch (error) {
    return `friend_${Date.now().toString(36)}`;
  }
}

function getOnlineInviteForestId() {
  return (urlParams.get("forest") || urlParams.get("forestId") || urlParams.get("forest_id") || "").trim();
}

function getOnlineInviteSeatId() {
  return (urlParams.get("seat") || urlParams.get("seatId") || urlParams.get("seat_id") || "").trim();
}

function isOnlineFriendInviteVisit() {
  return forestInviteSource === "friend_forest" && !!getOnlineInviteForestId() && !!getOnlineInviteSeatId();
}

function sanitizeOnlineText(value, maxLength = 40) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function getOnlineSeatRecord(seatId) {
  return onlineFriendSeats && onlineFriendSeats[seatId] ? onlineFriendSeats[seatId] : null;
}

function getSelectedFriendSeatRecord() {
  return getOnlineSeatRecord(getSelectedFriendInviteSeat().id);
}

function requestOnlineForestStorage(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!ADMIN_TRACKING_CONFIG.endpointUrl) {
      reject(new Error("missing_endpoint"));
      return;
    }

    const callbackName = `livingForestJsonp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const url = new URL(ADMIN_TRACKING_CONFIG.endpointUrl);
    url.searchParams.set("action", action);
    url.searchParams.set("key", ADMIN_TRACKING_CONFIG.projectKey);
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("app_version", APP_CONFIG.version);
    url.searchParams.set("is_test_mode", isTestMode ? "yes" : "no");

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value).slice(0, 300));
    });

    const script = document.createElement("script");
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("timeout"));
    }, 9000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = (data) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(data || {});
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("network_error"));
    };

    script.src = url.toString();
    document.head.appendChild(script);
  });
}

function getLocalOnlineTreeSnapshot() {
  const days = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const todayRecord = getTodayRecord();
  return {
    treeName: treeData.treeName?.trim() || "이름 없는 나무",
    days,
    treeStage: getTreeStageName(days),
    moodLabel: todayRecord?.label || "기록 전",
  };
}

function getOnlineSeatDisplayText(seat) {
  const record = getOnlineSeatRecord(seat.id);
  if (!record) {
    return { title: seat.label, subtitle: seat.mark, filled: false };
  }

  const friendName = sanitizeOnlineText(record.friendName || record.friend_name || "친구", 12) || "친구";
  const days = sanitizeOnlineText(record.growthDays || record.growth_days || "0", 4) || "0";
  const mood = sanitizeOnlineText(record.moodLabel || record.mood_label || "기록 전", 12) || "기록 전";

  return {
    title: `${seat.label} · ${friendName}`,
    subtitle: `${days}일째 · ${mood}`,
    filled: true,
  };
}

function syncClearFriendSeatButton() {
  if (!clearFriendSeatBtnElement) {
    return;
  }

  const seat = getSelectedFriendInviteSeat();
  const record = getOnlineSeatRecord(seat.id);
  const friendName = record
    ? sanitizeOnlineText(record.friendName || record.friend_name || "친구", 12) || "친구"
    : "";

  clearFriendSeatBtnElement.disabled = !record;
  clearFriendSeatBtnElement.textContent = record
    ? `${seat.label} 비우기`
    : "선택한 자리 비우기";
  clearFriendSeatBtnElement.setAttribute(
    "aria-label",
    record ? `${seat.label}에 저장된 ${friendName}님 자리를 비우기` : `${seat.label}은 아직 비어 있어요`
  );
}

function syncOnlineFriendSeatDisplays() {
  friendInviteSeatSlots.forEach((seat) => {
    const display = getOnlineSeatDisplayText(seat);
    document.querySelectorAll(`[data-friend-seat="${seat.id}"]`).forEach((button) => {
      const title = button.querySelector("b");
      const subtitle = button.querySelector("small");
      if (title) title.textContent = display.title;
      if (subtitle) subtitle.textContent = display.subtitle;
      button.classList.toggle("seat-filled", display.filled);
      button.setAttribute("aria-label", display.filled ? `${display.title}, ${display.subtitle}` : `${seat.label}, 비어 있는 온라인 친구 자리`);
    });

    document.querySelectorAll(`[data-friend-seat-option="${seat.id}"]`).forEach((button) => {
      const title = button.querySelector("strong");
      const subtitle = button.querySelector("span");
      if (title) title.textContent = display.title;
      if (subtitle) subtitle.textContent = display.filled ? display.subtitle : `${seat.description} · 비어 있음`;
      button.classList.toggle("seat-filled", display.filled);
    });
  });

  syncClearFriendSeatButton();

  if (friendForestMetaElement) {
    const filledCount = Object.keys(onlineFriendSeats || {}).length;
    if (onlineFriendLoadState === "loaded") {
      friendForestMetaElement.textContent = filledCount > 0
        ? `온라인 저장소에서 ${filledCount}개의 친구 자리를 불러왔어요.`
        : "온라인 저장소는 연결됐고, 아직 채워진 친구 자리는 없어요.";
    } else if (onlineFriendLoadState === "error") {
      friendForestMetaElement.textContent = `온라인 친구 자리 불러오기에 실패했어요. Apps Script 배포 상태를 확인해 주세요. (${onlineFriendLastError})`;
    }
  }
}

async function loadOnlineFriendSeats() {
  onlineFriendLoadState = "loading";
  onlineFriendLastError = "";
  syncOnlineFriendSeatDisplays();

  try {
    const forestId = getOrCreateOnlineForestId();
    const result = await requestOnlineForestStorage("list_friend_seats", { forest_id: forestId });

    if (!result || result.ok === false) {
      throw new Error(result?.error || "load_failed");
    }

    onlineFriendSeats = {};
    (result.seats || []).forEach((seat) => {
      if (seat && seat.seatId) {
        onlineFriendSeats[seat.seatId] = seat;
      }
    });
    onlineFriendLoadState = "loaded";
  } catch (error) {
    onlineFriendSeats = {};
    onlineFriendLoadState = "error";
    onlineFriendLastError = error?.message || "unknown";
  }

  syncOnlineFriendSeatDisplays();
  renderWorldNeighbors();
  renderWorldCommunityHint(getTodayRecord());
  renderFriendLinksCard();
  renderFriendInviteCard(true);
}

function syncOnlineFriendInviteMode(active) {
  document.body.classList.toggle("online-friend-invite-mode", Boolean(active));

  if (!onlineFriendJoinCardElement) {
    return;
  }

  const worldCardElement = document.querySelector("#worldScreen .world-card");
  if (active && worldCardElement && onlineFriendJoinCardElement.previousElementSibling !== worldCardElement.previousElementSibling) {
    worldCardElement.before(onlineFriendJoinCardElement);
  }
}

function focusOnlineFriendJoinCardOnce() {
  if (!onlineFriendJoinCardElement || window.__livingForestInviteCardFocused) {
    return;
  }

  window.__livingForestInviteCardFocused = true;
  window.setTimeout(() => {
    try {
      onlineFriendJoinCardElement.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      onlineFriendJoinCardElement.scrollIntoView();
    }
  }, 260);
}


function hasExistingLocalTreeForOnlineInvite() {
  return Boolean(treeData.treeName?.trim()) || (Array.isArray(treeData.history) && treeData.history.length > 0);
}

function getExistingInviteTreeName() {
  return sanitizeOnlineText(treeData.treeName?.trim(), 16) || "이름 없는 나무";
}

function guessFriendNameFromExistingTree() {
  const treeName = getExistingInviteTreeName();
  const guessed = treeName
    .replace(/의\s*나무$/u, "")
    .replace(/나무$/u, "")
    .replace(/숲$/u, "")
    .trim();

  return sanitizeOnlineText(guessed || treeName || "친구", 12) || "친구";
}

function getExistingInviteSummaryText() {
  const treeName = getExistingInviteTreeName();
  const days = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const stageLabel = getTreeImageInfo().label || "새싹";
  const latestRecord = treeData.history?.[0];
  const moodText = latestRecord?.label ? ` · 최근 마음 ${latestRecord.label}` : "";

  return `${treeName} · ${days}일째 · ${stageLabel}${moodText}`;
}

function setOnlineFriendJoinMessage(text, status = "") {
  if (!onlineFriendJoinMessageElement) return;
  onlineFriendJoinMessageElement.textContent = text;
  onlineFriendJoinMessageElement.classList.remove("join-success", "join-error");
  if (status === "success") {
    onlineFriendJoinMessageElement.classList.add("join-success");
  } else if (status === "error") {
    onlineFriendJoinMessageElement.classList.add("join-error");
  }
}

async function saveOnlineFriendSeatJoin({ forestId, seat, friendName, treeName, source }) {
  const snapshot = getLocalOnlineTreeSnapshot();

  setOnlineFriendJoinMessage("온라인 친구 자리 저장소에 기록하는 중이에요...");

  const result = await requestOnlineForestStorage("join_friend_seat", {
    forest_id: forestId,
    seat_id: seat.id,
    seat_label: seat.label,
    friend_id: getOrCreateOnlineFriendId(),
    friend_forest_id: getOrCreateOnlineForestId(),
    friend_name: friendName,
    tree_name: treeName,
    growth_days: snapshot.days,
    tree_stage: snapshot.treeStage,
    mood_label: snapshot.moodLabel,
    source,
  });

  if (!result || result.ok === false) {
    throw new Error(result?.error || "save_failed");
  }

  setOnlineFriendJoinMessage(`${seat.label}에 ${friendName}님의 나무를 저장했어요. 초대한 사람이 숲을 새로고침하면 이 자리가 채워져 보여요.`, "success");

  loadOnlineFriendLinks();
  trackForestEvent("online_friend_seat_joined", { seat_id: seat.id, source });
  return result;
}

async function joinOnlineInviteWithExistingTree() {
  if (!isOnlineFriendInviteVisit()) return;

  if (!hasExistingLocalTreeForOnlineInvite()) {
    setOnlineFriendJoinMessage("이 브라우저에는 아직 기존 나무가 없어요. 아래에서 새 나무를 만들어 주세요.", "error");
    if (onlineFriendJoinFormElement) {
      onlineFriendJoinFormElement.classList.remove("is-secondary-new-tree");
      onlineFriendJoinFormElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const forestId = getOnlineInviteForestId();
  const seat = getFriendInviteSeatById(getOnlineInviteSeatId());
  const treeName = getExistingInviteTreeName();
  const friendName = guessFriendNameFromExistingTree();

  if (onlineFriendUseExistingBtnElement) {
    onlineFriendUseExistingBtnElement.disabled = true;
    onlineFriendUseExistingBtnElement.textContent = "기존 나무 저장 중...";
  }

  try {
    await saveOnlineFriendSeatJoin({
      forestId,
      seat,
      friendName,
      treeName,
      source: "friend_invite_existing",
    });

    if (onlineFriendUseExistingBtnElement) {
      onlineFriendUseExistingBtnElement.textContent = "기존 나무로 들어갔어요";
    }
  } catch (error) {
    setOnlineFriendJoinMessage(`저장에 실패했어요. Apps Script 배포와 권한을 확인해 주세요. (${error?.message || "unknown"})`, "error");
    if (onlineFriendUseExistingBtnElement) {
      onlineFriendUseExistingBtnElement.disabled = false;
      onlineFriendUseExistingBtnElement.textContent = "기존 내 나무로 이 자리에 들어가기";
    }
  }
}

function revealNewTreeJoinForm() {
  if (onlineFriendJoinFormElement) {
    onlineFriendJoinFormElement.classList.remove("is-secondary-new-tree");
    onlineFriendJoinFormElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  setOnlineFriendJoinMessage("새 나무로 시작하려면 닉네임과 나무 이름을 적고 버튼을 눌러주세요.");
}

function renderOnlineFriendJoinCard() {
  if (!onlineFriendJoinCardElement) {
    syncOnlineFriendInviteMode(false);
    return;
  }

  if (!isOnlineFriendInviteVisit()) {
    syncOnlineFriendInviteMode(false);
    onlineFriendJoinCardElement.classList.add("hidden");
    return;
  }

  const seat = getFriendInviteSeatById(getOnlineInviteSeatId());
  syncOnlineFriendInviteMode(true);
  onlineFriendJoinCardElement.classList.remove("hidden");
  focusOnlineFriendJoinCardOnce();

  const hasExistingTree = hasExistingLocalTreeForOnlineInvite();

  if (onlineFriendJoinTitleElement) {
    onlineFriendJoinTitleElement.textContent = `${seat.label} 초대장이 도착했어요`;
  }

  if (onlineFriendJoinTextElement) {
    onlineFriendJoinTextElement.textContent = hasExistingTree
      ? `이 브라우저에 이미 내 나무가 있어요. 새로 만들지 않고 기존 나무로 초대한 사람의 ${seat.label}에 들어갈 수 있어요.`
      : `처음 온 친구라면 여기서 닉네임과 내 나무 이름만 정하면 돼요. 저장되면 초대한 사람의 ${seat.label}에 친구 나무가 들어가요.`;
  }

  if (onlineFriendExistingPanelElement) {
    onlineFriendExistingPanelElement.classList.toggle("hidden", !hasExistingTree);
  }

  if (onlineFriendExistingSummaryElement) {
    onlineFriendExistingSummaryElement.textContent = hasExistingTree
      ? getExistingInviteSummaryText()
      : "이 브라우저에는 아직 저장된 내 나무가 없어요.";
  }

  if (onlineFriendJoinFormElement) {
    onlineFriendJoinFormElement.classList.toggle("is-secondary-new-tree", hasExistingTree);
  }

  if (onlineFriendTreeInputElement && !onlineFriendTreeInputElement.value && !hasExistingTree) {
    onlineFriendTreeInputElement.value = "";
  }

  if (onlineFriendNameInputElement && !onlineFriendNameInputElement.value && hasExistingTree) {
    onlineFriendNameInputElement.value = guessFriendNameFromExistingTree();
  }

  if (onlineFriendJoinMessageElement) {
    onlineFriendJoinMessageElement.textContent = hasExistingTree
      ? "기존 내 나무로 들어가면 새 나무를 만들지 않고 현재 나무 상태가 친구 자리에 저장돼요."
      : "이 버튼을 누르면 내 나무가 만들어지고, 초대한 사람의 친구 자리에 저장돼요.";
    onlineFriendJoinMessageElement.classList.remove("join-success", "join-error");
  }
}

function ensureFirstTreeForOnlineInvite(treeName, mood) {
  const safeMood = moodRules[mood] ? mood : "normal";
  const rule = moodRules[safeMood] || moodRules.normal;

  if (treeName && !treeData.treeName?.trim()) {
    treeData.treeName = treeName;
  }

  if (!hasCheckedToday()) {
    const diaryNote = createForestDiaryNote(safeMood, getTodayKey());
    treeData.leaf += rule.leaf;
    treeData.trunk += rule.trunk;
    treeData.root += rule.root;
    treeData.lastCheckDate = getTodayKey();
    treeData.history.unshift({
      date: getTodayKey(),
      mood: safeMood,
      label: rule.label,
      icon: rule.icon,
      message: rule.message,
      forestTitle: diaryNote.forestTitle,
      forestSentence: diaryNote.forestSentence
    });
  }

  saveTreeData();
}

async function handleOnlineFriendJoin(event) {
  event.preventDefault();
  if (!isOnlineFriendInviteVisit()) return;

  const forestId = getOnlineInviteForestId();
  const seat = getFriendInviteSeatById(getOnlineInviteSeatId());
  const friendName = sanitizeOnlineText(onlineFriendNameInputElement?.value, 12);
  const treeName = sanitizeOnlineText(onlineFriendTreeInputElement?.value, 16) || `${friendName || "친구"}의 나무`;
  const selectedMood = moodRules[onlineFriendMoodSelectElement?.value] ? onlineFriendMoodSelectElement.value : "normal";

  if (!friendName) {
    setOnlineFriendJoinMessage("친구 닉네임을 먼저 적어주세요.", "error");
    return;
  }

  ensureFirstTreeForOnlineInvite(treeName, selectedMood);
  renderAll();

  try {
    await saveOnlineFriendSeatJoin({
      forestId,
      seat,
      friendName,
      treeName,
      source: "friend_invite_new_tree",
    });
  } catch (error) {
    setOnlineFriendJoinMessage(`저장에 실패했어요. Apps Script 배포와 권한을 확인해 주세요. (${error?.message || "unknown"})`, "error");
  }
}

function getFriendInviteSeatById(seatId) {
  return friendInviteSeatSlots.find((seat) => seat.id === seatId) || friendInviteSeatSlots[0];
}

function getSelectedFriendInviteSeat() {
  return getFriendInviteSeatById(selectedFriendInviteSeatId);
}

function syncFriendInviteSeatSelection() {
  const seat = getSelectedFriendInviteSeat();

  document.querySelectorAll("[data-friend-seat]").forEach((button) => {
    const selected = button.dataset.friendSeat === seat.id;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  document.querySelectorAll("[data-friend-seat-option]").forEach((button) => {
    const selected = button.dataset.friendSeatOption === seat.id;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  if (selectedFriendSeatTextElement) {
    selectedFriendSeatTextElement.textContent = `선택된 자리: ${seat.label} · ${seat.mark}`;
  }
}

function selectFriendInviteSeat(seatId, source = "option") {
  selectedFriendInviteSeatId = getFriendInviteSeatById(seatId).id;
  syncFriendInviteSeatSelection();
  syncClearFriendSeatButton();
  renderFriendInviteCard(true);

  if (friendInvitePreviewElement) {
    const seat = getSelectedFriendInviteSeat();
    friendInvitePreviewElement.textContent = `${seat.label}을 선택했어요. 카카오톡 초대 버튼을 누르면 이 자리 전용 초대장이 열려요.`;
    friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
  }

  if (source === "stage" && friendInviteCardElement) {
    friendInviteCardElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  trackForestEvent("friend_invite_seat_selected", {
    seat_id: selectedFriendInviteSeatId,
    source,
  });
}

function getFriendInviteUrl() {
  const seat = getSelectedFriendInviteSeat();
  const inviteUrl = new URL(window.location.pathname || "/living_forest/", window.location.origin);
  inviteUrl.searchParams.set("invite", "friend-forest");
  inviteUrl.searchParams.set("forest", getOrCreateOnlineForestId());
  inviteUrl.searchParams.set("seat", seat.id);
  inviteUrl.searchParams.set("join", "1");
  return inviteUrl.toString();
}

function getKakaoShareImageUrl() {
  return `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}assets/world/world-overview-day-v2.png`;
}

function updateFriendInviteLinkText() {
  if (!friendInviteLinkTextElement) return;
  const inviteUrl = getFriendInviteUrl();
  friendInviteLinkTextElement.textContent = `직접 초대 링크: ${inviteUrl}`;
}

function getKakaoFriendInviteDescription() {
  const days = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const todayRecord = getTodayRecord();
  const todayMood = todayRecord ? `${todayRecord.label} 기운` : "오늘의 마음";
  const seat = getSelectedFriendInviteSeat();

  if (days === 0) {
    return `${seat.label}가 비어 있어요. 내 나무를 심고 같이 숲을 채워볼래?`;
  }

  return `${days}일째 자라는 숲이에요. 오늘은 ${todayMood}이 남았고, ${seat.label}가 친구를 기다려요.`;
}

function initKakaoShareSdk() {
  try {
    if (!KAKAO_SHARE_CONFIG.enabled || !KAKAO_SHARE_CONFIG.javascriptKey) {
      return false;
    }

    if (!window.Kakao) {
      return false;
    }

    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_SHARE_CONFIG.javascriptKey);
    }

    return window.Kakao.isInitialized();
  } catch (error) {
    console.warn("Kakao SDK init skipped:", error);
    return false;
  }
}

function getFriendInviteMessage() {
  const name = treeData.treeName?.trim() || "이름 없는 나무";
  const days = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const todayRecord = getTodayRecord();
  const todayMood = todayRecord ? `${todayRecord.label} 기운` : "오늘의 마음";
  const seat = getSelectedFriendInviteSeat();
  const inviteUrl = getFriendInviteUrl();

  if (days === 0) {
    return `${seat.emoji} ${name}의 숲에서 ${seat.label}가 친구를 기다리고 있어요.\n${seat.description}예요.\n하루에 한 번 마음을 남기면 내 나무가 자라고, 친구 숲에도 작은 자리가 생겨요.\n이 자리에 같이 숲 시작하기: ${inviteUrl}`;
  }

  return `${seat.emoji} ${name}의 숲에서 ${seat.label}가 비어 있어요.\n${days}일째 기록이 쌓인 숲에 오늘은 ${todayMood}이 남았어요.\n너도 네 나무를 심고 이 자리를 채워볼래?\n${inviteUrl}`;
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch (error) {
    console.warn("Copy skipped:", error);
    return false;
  }
}

function renderFriendInviteCard(messageOnly = false) {
  if (!friendInviteCardElement) {
    return;
  }

  const days = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const name = treeData.treeName?.trim() || "이름 없는 나무";
  const seat = getSelectedFriendInviteSeat();
  const message = getFriendInviteMessage();

  const existingRecord = getOnlineSeatRecord(seat.id);
  const existingFriendName = existingRecord
    ? sanitizeOnlineText(existingRecord.friendName || existingRecord.friend_name || "친구", 12) || "친구"
    : "";
  const existingTreeName = existingRecord
    ? sanitizeOnlineText(existingRecord.treeName || existingRecord.tree_name || "친구 나무", 16) || "친구 나무"
    : "";

  if (friendInviteTitleElement) {
    friendInviteTitleElement.textContent = existingRecord
      ? `${seat.label}에 ${existingFriendName}님의 나무가 있어요`
      : (days === 0 ? `${seat.label}에 첫 친구를 초대할 수 있어요` : `${seat.label}에 친구를 초대할 수 있어요`);
  }

  if (friendInviteTextElement) {
    friendInviteTextElement.textContent = existingRecord
      ? `${existingTreeName}가 이 자리에 저장되어 있어요. 필요하면 이 자리를 비우고 다른 친구를 다시 초대할 수 있어요.`
      : `${seat.description}예요. 카카오톡으로 이 자리 전용 초대장을 바로 보낼 수 있어요. 나중에는 ${seat.label} · 친구 닉네임 형태로 이어질 수 있어요.`;
  }

  syncFriendInviteSeatSelection();

  if (friendInvitePreviewElement && !messageOnly) {
    friendInvitePreviewElement.textContent = "카카오톡으로 보낼 초대 내용을 미리 보려면 버튼을 눌러주세요. 아래 직접 링크도 같이 준비돼요.";
    friendInvitePreviewElement.classList.remove("friend-invite-preview-ready");
  }

  if (friendInviteMetaElement) {
    friendInviteMetaElement.textContent = existingRecord
      ? `현재 선택: ${seat.label}. 자리 비우기는 친구 데이터를 완전히 지우는 대신 숨김 처리해요.`
      : `현재 선택: ${seat.label} · ${seat.mark}. 카카오톡 카드가 안 열리면 직접 초대 링크를 보내면 돼요.`;
  }

  syncClearFriendSeatButton();
  updateFriendInviteLinkText();

  return message;
}

async function clearSelectedFriendSeat() {
  const seat = getSelectedFriendInviteSeat();
  const record = getOnlineSeatRecord(seat.id);

  if (!record) {
    if (friendInvitePreviewElement) {
      friendInvitePreviewElement.textContent = `${seat.label}은 아직 비어 있어요. 비울 친구 자리가 없어요.`;
      friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
    }
    syncClearFriendSeatButton();
    return;
  }

  const friendName = sanitizeOnlineText(record.friendName || record.friend_name || "친구", 12) || "친구";
  const ok = window.confirm(`${seat.label}에 저장된 ${friendName}님 자리를 비울까요?`);

  if (!ok) {
    return;
  }

  if (clearFriendSeatBtnElement) {
    clearFriendSeatBtnElement.disabled = true;
    clearFriendSeatBtnElement.textContent = "비우는 중...";
  }

  if (friendInvitePreviewElement) {
    friendInvitePreviewElement.textContent = `${seat.label}의 친구 자리를 비우는 중이에요...`;
    friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
  }

  try {
    const result = await requestOnlineForestStorage("delete_friend_seat", {
      forest_id: getOrCreateOnlineForestId(),
      seat_id: seat.id,
      source: "owner_clear_seat",
    });

    if (!result || result.ok === false) {
      throw new Error(result?.error || "delete_failed");
    }

    delete onlineFriendSeats[seat.id];
    onlineFriendLoadState = "loaded";
    syncOnlineFriendSeatDisplays();
    loadOnlineFriendLinks();
    renderFriendInviteCard(true);

    if (friendInvitePreviewElement) {
      friendInvitePreviewElement.textContent = `${seat.label}을 비웠어요. 이제 이 자리에 새 친구를 다시 초대할 수 있어요.`;
      friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
    }

    trackForestEvent("online_friend_seat_deleted", {
      seat_id: seat.id,
      friend_id: record.friendId || record.friend_id || "",
      source: "owner_clear_seat",
    });
  } catch (error) {
    if (friendInvitePreviewElement) {
      friendInvitePreviewElement.textContent = `자리를 비우지 못했어요. Apps Script 배포 상태를 확인해 주세요. (${error?.message || "unknown"})`;
      friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
    }
  }

  syncClearFriendSeatButton();
}

function showFriendInvitePreview() {
  const message = getFriendInviteMessage();

  if (friendInvitePreviewElement) {
    friendInvitePreviewElement.textContent = message;
    friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
  }

  trackForestEvent("friend_invite_preview_opened", {
    growth_days: Array.isArray(treeData.history) ? treeData.history.length : 0,
  });
}

async function copyFriendInviteMessage() {
  const inviteUrl = getFriendInviteUrl();
  const copied = await copyTextToClipboard(inviteUrl);
  const seat = getSelectedFriendInviteSeat();
  updateFriendInviteLinkText();

  if (friendInvitePreviewElement) {
    friendInvitePreviewElement.textContent = copied
      ? `${seat.label} 초대 링크를 복사했어요. 친구에게 이 링크를 보내면 초대받은 시작 화면이 열려요.`
      : getFriendInviteMessage();
    friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
  }

  trackForestEvent("friend_invite_link_copied", {
    copied: copied ? "yes" : "no",
    seat_id: seat.id,
    growth_days: Array.isArray(treeData.history) ? treeData.history.length : 0,
  });
}

async function shareFriendInviteToKakao() {
  const seat = getSelectedFriendInviteSeat();
  const inviteUrl = getFriendInviteUrl();
  const name = treeData.treeName?.trim() || "이름 없는 나무";
  const ready = initKakaoShareSdk();
  const directMessage = getFriendInviteMessage();

  updateFriendInviteLinkText();

  if (!ready || !window.Kakao?.Share?.sendDefault) {
    const copied = await copyTextToClipboard(inviteUrl);
    if (friendInvitePreviewElement) {
      friendInvitePreviewElement.textContent = copied
        ? "카카오톡 공유 준비가 아직 안 된 것 같아요. 대신 초대 링크를 복사했어요."
        : "카카오톡 공유 준비가 아직 안 된 것 같아요. 아래 직접 링크를 복사해서 보내주세요.\n\n" + directMessage;
      friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
    }
    trackForestEvent("friend_invite_kakao_fallback", { seat_id: seat.id, copied: copied ? "yes" : "no" });
    return;
  }

  try {
    window.Kakao.Share.sendDefault({
      objectType: "text",
      text: directMessage,
      link: {
        mobileWebUrl: inviteUrl,
        webUrl: inviteUrl
      },
      buttonTitle: "초대장 열기"
    });

    const copied = await copyTextToClipboard(inviteUrl);
    if (friendInvitePreviewElement) {
      friendInvitePreviewElement.textContent = copied
        ? `${seat.label} 초대장을 카카오톡으로 보냈어요. 혹시 카드가 안 열리면, 초대 링크도 복사해뒀어요.`
        : `${seat.label} 초대장을 카카오톡으로 보냈어요. 친구가 메시지 안의 링크나 초대장 열기를 누르면 돼요.`;
      friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
    }

    trackForestEvent("friend_invite_kakao_shared", {
      seat_id: seat.id,
      growth_days: Array.isArray(treeData.history) ? treeData.history.length : 0,
      share_type: "text_with_direct_url"
    });
  } catch (error) {
    console.warn("Kakao share skipped:", error);
    const copied = await copyTextToClipboard(inviteUrl);
    if (friendInvitePreviewElement) {
      friendInvitePreviewElement.textContent = copied
        ? "카카오톡 공유가 열리지 않아서 초대 링크를 대신 복사했어요. 이 링크를 친구에게 보내면 돼요."
        : directMessage;
      friendInvitePreviewElement.classList.add("friend-invite-preview-ready");
    }
    trackForestEvent("friend_invite_kakao_error", { seat_id: seat.id, copied: copied ? "yes" : "no" });
  }
}

function applyMyWorldSpotExactMatchSize() {
  if (!myWorldSpotElement || !mySpotVisualElement) {
    return;
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 560;

  /*
    기준: 사용자가 비교 대상으로 삼은 앞줄 더미 나무의 실제 표시 체급.
    더미 나무는 base width에 slot scale(앞줄 1.38)이 곱해져 크게 보이므로,
    내 나무도 최종 표시 크기를 그 체급에 직접 맞춘다.
  */
  const desktop = {
    spotWidth: 210,
    visualWidth: 210,
    visualHeight: 272,
    treeWrapWidth: 210,
    treeWrapHeight: 272,
    treeImageWidth: 200,
    shadowWidth: 124,
    shadowHeight: 30,
    shadowBottom: 6,
    spotBottom: 62,
    wrapBottom: -1
  };

  const mobile = {
    spotWidth: 132,
    visualWidth: 132,
    visualHeight: 170,
    treeWrapWidth: 132,
    treeWrapHeight: 170,
    treeImageWidth: 124,
    shadowWidth: 78,
    shadowHeight: 20,
    shadowBottom: 6,
    spotBottom: 71,
    wrapBottom: -1
  };

  const cfg = isMobile ? mobile : desktop;

  const treeWrap = mySpotVisualElement.querySelector('.my-spot-tree-wrap');
  const treeImage = mySpotVisualElement.querySelector('.my-spot-tree-image');
  const treeShadow = mySpotVisualElement.querySelector('.my-spot-tree-shadow');
  const groundShadow = mySpotVisualElement.querySelector('.my-spot-ground-shadow');

  myWorldSpotElement.classList.add('my-tree-exact-match');
  myWorldSpotElement.style.setProperty('width', `${cfg.spotWidth}px`, 'important');
  myWorldSpotElement.style.setProperty('bottom', `${cfg.spotBottom}px`, 'important');
  myWorldSpotElement.style.setProperty('min-height', `${cfg.visualHeight + 54}px`, 'important');

  mySpotVisualElement.style.setProperty('width', `${cfg.visualWidth}px`, 'important');
  mySpotVisualElement.style.setProperty('height', `${cfg.visualHeight}px`, 'important');

  if (groundShadow) {
    groundShadow.style.setProperty('width', `${cfg.shadowWidth}px`, 'important');
    groundShadow.style.setProperty('height', `${cfg.shadowHeight}px`, 'important');
    groundShadow.style.setProperty('bottom', `${cfg.shadowBottom}px`, 'important');
    groundShadow.style.setProperty('opacity', '1', 'important');
  }

  if (treeWrap) {
    treeWrap.style.setProperty('width', `${cfg.treeWrapWidth}px`, 'important');
    treeWrap.style.setProperty('height', `${cfg.treeWrapHeight}px`, 'important');
    treeWrap.style.setProperty('bottom', `${cfg.wrapBottom}px`, 'important');
    treeWrap.style.setProperty('left', '50%', 'important');
    treeWrap.style.setProperty('transform', 'translateX(-50%)', 'important');
  }

  if (treeShadow) {
    treeShadow.style.setProperty('width', `${cfg.treeImageWidth * 0.98}px`, 'important');
    treeShadow.style.setProperty('left', '50%', 'important');
    treeShadow.style.setProperty('bottom', '0', 'important');
    treeShadow.style.setProperty('transform', 'translateX(-50%)', 'important');
    treeShadow.style.setProperty('opacity', '0.94', 'important');
  }

  if (treeImage) {
    treeImage.style.setProperty('width', `${cfg.treeImageWidth}px`, 'important');
    treeImage.style.setProperty('max-width', 'none', 'important');
    treeImage.style.setProperty('height', 'auto', 'important');
    treeImage.style.setProperty('left', '50%', 'important');
    treeImage.style.setProperty('bottom', '0', 'important');
    treeImage.style.setProperty('transform', 'translateX(-50%)', 'important');
    treeImage.style.setProperty('filter', 'drop-shadow(0 18px 26px rgba(0,0,0,0.34))', 'important');
  }
}

function renderWorld() {
  renderWorldVisualLayers();

  const name = treeData.treeName?.trim() || "이름 없는 나무";
  const todayRecord = getTodayRecord();
  const spotInfo = getWorldSpotInfo();
  const myWorldDisplayDays = getWorldDisplayDays(treeData.history.length);
  const myTreeImageInfo = getTreeImageInfoByDays(myWorldDisplayDays);
  const myWorldTreeSizeClass = getWorldTreeSizeClass(myWorldDisplayDays);

  renderWorldNeighbors();
  renderWorldCommunityHint(todayRecord);
  renderWorldGrowthCard();
  renderFriendForestCard();
  renderFriendLinksCard();
  renderFriendInviteCard();
  renderOnlineFriendJoinCard();
  syncOnlineFriendSeatDisplays();

  myWorldSpotElement.className = `my-world-spot ${spotInfo.className} ${myWorldTreeSizeClass}`;
  mySpotVisualElement.innerHTML = `
    <div class="my-spot-ground-shadow" aria-hidden="true"></div>
    <div class="my-spot-tree-wrap" aria-hidden="true">
      <img class="my-spot-tree-shadow" src="../assets/garden/tree-shadow.svg" alt="" />
      <img class="my-spot-tree-image" src="${myTreeImageInfo.src}" alt="" />
    </div>
  `;
  mySpotNameElement.textContent = name;
  mySpotStatusElement.textContent = spotInfo.status;
  applyMyWorldSpotExactMatchSize();

  if (todayRecord) {
    const moodClass = `mood-${todayRecord.mood}`;
    mySpotAuraElement.innerHTML = `<span class="${moodClass}"></span><span class="${moodClass}"></span><span class="${moodClass}"></span>`;
    worldSummaryTodayElement.textContent = `오늘 ${todayRecord.label}`;
    worldSummaryTextElement.textContent = `오늘의 ${todayRecord.label} 기운이 큰 숲 안의 내 나무 자리에도 남았어요. ${getWorldEvolutionSummaryText()}`;
  } else {
    mySpotAuraElement.innerHTML = "";
    worldSummaryTodayElement.textContent = "오늘 기록 전";

    if (treeData.history.length === 0) {
      worldSummaryTextElement.textContent = treeData.treeName?.trim()
        ? "오늘의 마음을 하나 남기면 내 나무가 큰 숲 안의 작은 자리에서 자라기 시작해요."
        : "오늘의 마음을 하나 고르면 내 나무가 자라고, 친구 숲에도 작은 변화가 생겨요.";
    } else {
      worldSummaryTextElement.textContent = getWorldProgressMessage();
    }
  }

  worldSummaryNameElement.textContent = name;
  myWorldSpotElement.setAttribute("aria-label", `${name}의 월드 숲 자리`);

  if (launchGuideCardElement) {
    launchGuideCardElement.classList.toggle("launch-done", hasCheckedToday());
    launchGuideCardElement.classList.toggle("launch-start", !treeData.treeName?.trim() && treeData.history.length === 0);
  }

  if (hasCheckedToday()) {
    goGardenBtnElement.textContent = "내 정원";
  } else if (!treeData.treeName?.trim()) {
    goGardenBtnElement.textContent = "내 정원";
  } else {
    goGardenBtnElement.textContent = "내 정원";
  }
}

function renderForestInviteCard() {
  if (!forestInviteCardElement) {
    return;
  }

  if (!isForestInviteVisit()) {
    forestInviteCardElement.classList.add("hidden");
    return;
  }

  forestInviteCardElement.classList.remove("hidden");

  if (forestInviteTitleElement) {
    forestInviteTitleElement.textContent = "누군가의 숲 문장을 보고 오셨나요?";
  }

  if (forestInviteTextElement) {
    forestInviteTextElement.textContent = "이곳에서는 하루 한 번 마음을 남기고, 나만의 나무와 숲 일기장을 조용히 키울 수 있어요.";
  }

  if (forestInviteMetaElement) {
    forestInviteMetaElement.textContent = "초대 링크로 들어왔어요 · 로그인 없이 바로 시작할 수 있어요.";
  }
}

function startFromForestInvite() {
  if (!treeData.inviteStartedAt) {
    treeData.inviteStartedAt = getNowIsoString();
    saveTreeData();
  }

  trackForestEvent("go_garden_click", { source: "forest_invite_start" });
  renderForestBadgeCard();
  showGardenScreen();
}

function renderFirstVisitGuide() {
  if (!firstVisitGuideElement) {
    return;
  }

  const hasName = Boolean(treeData.treeName?.trim());
  const hasHistory = Array.isArray(treeData.history) && treeData.history.length > 0;
  const checkedToday = hasCheckedToday();

  firstVisitGuideElement.classList.remove("hidden", "guide-ready", "guide-done");

  const titleElement = firstVisitGuideElement.querySelector(".first-visit-title");
  const textElement = firstVisitGuideElement.querySelector(".first-visit-text");

  if (!hasName && !hasHistory) {
    firstVisitGuideElement.classList.add("guide-ready");
    if (titleElement) titleElement.textContent = "오늘의 마음을 고르면 내 나무가 자라요.";
    if (textElement) textElement.textContent = "먼저 내 나무 이름을 정하고, 좋음·보통·피곤 중 하나만 골라보세요.";
    return;
  }

  if (!hasName) {
    firstVisitGuideElement.classList.add("guide-ready");
    if (titleElement) titleElement.textContent = "이제 내 나무 이름만 정하면 돼요.";
    if (textElement) textElement.textContent = "나무 이름을 정하면 바로 오늘의 마음을 고를 수 있어요.";
    return;
  }

  if (!checkedToday) {
    firstVisitGuideElement.classList.add("guide-ready");
    if (titleElement) titleElement.textContent = "오늘 마음 하나만 남기면 충분해요.";
    if (textElement) textElement.textContent = "기록은 길게 쓰지 않아도 돼요. 지금과 가까운 상태 하나만 선택하면 내 나무가 반응해요.";
    return;
  }

  firstVisitGuideElement.classList.add("guide-done");
  if (titleElement) titleElement.textContent = "오늘의 변화가 숲에 남았어요.";
  if (textElement) textElement.textContent = `내 나무와 월드 숲에 오늘의 기운이 반영됐어요. ${getNextGrowthPreviewMessage()}`;
}

function renderDailyLoop() {
  if (!dailyLoopCardElement || !dailyLoopTitleElement || !dailyLoopTextElement) {
    return;
  }

  const loop = getDailyLoopInfo();
  dailyLoopCardElement.classList.toggle("done", loop.state === "done");
  dailyLoopCardElement.classList.toggle("returning", loop.state === "returning");
  dailyLoopTitleElement.textContent = loop.title;
  dailyLoopTextElement.textContent = loop.text;
}

function renderReturnMemoryCard() {
  const returnMemory = getReturnMemoryInfo();

  if (!returnMemoryCardElement) {
    return;
  }

  if (!returnMemory) {
    returnMemoryCardElement.classList.add("hidden");
    return;
  }

  returnMemoryCardElement.classList.remove("hidden");

  if (returnMemoryTitleElement) {
    returnMemoryTitleElement.textContent = returnMemory.title;
  }

  if (returnMemoryTextElement) {
    returnMemoryTextElement.textContent = returnMemory.text;
  }

  if (returnStreakTextElement) {
    returnStreakTextElement.textContent = returnMemory.streakText;
  }
}

function renderStreakRewardCard() {
  if (!streakRewardCardElement) {
    return;
  }

  const rewardInfo = getStreakRewardInfo();

  if (!rewardInfo) {
    streakRewardCardElement.classList.add("hidden");
    return;
  }

  streakRewardCardElement.classList.remove("hidden", "reward-near", "reward-reached", "reward-complete");

  if (rewardInfo.state === "near") {
    streakRewardCardElement.classList.add("reward-near");
  }

  if (rewardInfo.state === "reached") {
    streakRewardCardElement.classList.add("reward-reached");
  }

  if (rewardInfo.state === "complete") {
    streakRewardCardElement.classList.add("reward-complete");
  }

  if (streakRewardTitleElement) {
    streakRewardTitleElement.textContent = rewardInfo.title;
  }

  if (streakRewardTextElement) {
    streakRewardTextElement.textContent = rewardInfo.text;
  }

  if (streakRewardMetaElement) {
    streakRewardMetaElement.textContent = rewardInfo.meta;
  }

  if (streakRewardFillElement) {
    streakRewardFillElement.style.width = `${rewardInfo.percent}%`;
  }
}

function renderCompleteCard() {
  const todayRecord = getTodayRecord();

  const afterRecordCards = [
    completeCardElement,
    todayChangeCardElement,
    tomorrowPromiseCardElement,
    finishGuideCardElement
  ];

  if (!todayRecord) {
    afterRecordCards.forEach((element) => element?.classList.add("hidden"));
    if (completeMessageElement) {
      completeMessageElement.textContent = "오늘의 기운이 월드 숲에 조용히 스며들었어요.";
    }
    return;
  }

  const experience = getAfterRecordExperience(todayRecord);

  afterRecordCards.forEach((element) => element?.classList.remove("hidden"));

  if (completeMessageElement) {
    completeMessageElement.textContent = "오늘 마음이 숲에 남았어요.";
  }

  if (todayChangeTitleElement) {
    todayChangeTitleElement.textContent = experience.changeTitle;
  }

  if (todayChangeTextElement) {
    todayChangeTextElement.textContent = experience.changeText;
  }

  if (tomorrowPromiseTitleElement) {
    tomorrowPromiseTitleElement.textContent = experience.tomorrowTitle;
  }

  if (tomorrowPromiseTextElement) {
    tomorrowPromiseTextElement.textContent = experience.tomorrowText;
  }

  if (finishGuideTitleElement) {
    finishGuideTitleElement.textContent = "오늘 숲 완성!";
  }

  if (finishGuideTextElement) {
    finishGuideTextElement.textContent = "오늘 마음이 숲에 남았어요. 내일 다시 오면 나무가 조금 더 자라요.";
  }

  if (finishGuideMetaElement) {
    finishGuideMetaElement.textContent = "오늘은 기록 하나면 충분해요.";
  }
}

function renderForestDiaryCard() {
  if (!forestDiaryCardElement || !forestDiaryTodayElement || !forestDiaryListElement || !forestDiaryEmptyElement || !forestDiaryFlowElement) {
    return;
  }

  const hasName = Boolean(treeData.treeName?.trim());
  const checkedToday = hasCheckedToday();
  const entries = getRecentForestDiaryEntries(3);
  const todayEntry = entries.find((entry) => entry?.date === getTodayKey()) || null;
  const latestPastEntry = entries.find((entry) => entry?.date !== getTodayKey()) || null;
  const returnMemory = getReturnMemoryInfo();

  forestDiaryCardElement.classList.toggle("diary-ready", entries.length > 0);
  forestDiaryCardElement.classList.toggle("diary-waiting", entries.length > 0 && !checkedToday);
  forestDiaryCardElement.classList.toggle("diary-done", Boolean(todayEntry));

  if (!hasName && entries.length <= 0) {
    forestDiaryTodayElement.textContent = "나무 이름을 정하면 오늘의 숲 문장이 이곳에 남아요.";
    forestDiaryListElement.innerHTML = "";
    forestDiaryEmptyElement.textContent = "아직 쌓인 숲 기록이 없어요.";
    forestDiaryEmptyElement.classList.remove("hidden");
    forestDiaryFlowElement.textContent = "첫 기록 전 · 이름을 정한 뒤 오늘의 마음 하나를 남기면 시작돼요.";
    return;
  }

  if (entries.length <= 0) {
    forestDiaryTodayElement.textContent = "첫 마음을 고르면 오늘의 숲 문장이 생겨요.";
    forestDiaryListElement.innerHTML = "";
    forestDiaryEmptyElement.textContent = "아직 쌓인 숲 기록이 없어요. 오늘의 마음 하나가 첫 일기가 돼요.";
    forestDiaryEmptyElement.classList.remove("hidden");
    forestDiaryFlowElement.textContent = "오늘 기록 전 · 첫 숲 문장을 기다리는 중";
    return;
  }

  if (todayEntry) {
    forestDiaryTodayElement.textContent = `오늘의 숲 문장 · ${todayEntry.sentence}`;
  } else if (returnMemory && latestPastEntry) {
    const pastLabel = returnMemory.isYesterday ? "어제의 숲 문장" : "이전 숲 문장";
    forestDiaryTodayElement.textContent = `${pastLabel} · ${latestPastEntry.sentence} 오늘의 마음을 더하면 이 흐름 위에 새 문장이 이어져요.`;
  } else {
    const latestEntry = entries[0];
    forestDiaryTodayElement.textContent = `최근 숲 문장 · ${latestEntry.sentence}`;
  }

  forestDiaryEmptyElement.classList.add("hidden");
  forestDiaryListElement.innerHTML = entries
    .map((entry) => {
      const moodClass = `diary-mood-${entry.mood}`;
      return `
        <li class="forest-diary-item ${moodClass}">
          <span class="forest-diary-date">${escapeHtml(entry.displayDate)}</span>
          <div>
            <strong>${escapeHtml(entry.icon || "✦")} ${escapeHtml(entry.label)} · ${escapeHtml(entry.title)}</strong>
            <p>${escapeHtml(entry.sentence)}</p>
          </div>
        </li>
      `;
    })
    .join("");

  const flowPrefix = todayEntry ? "오늘 기록 완료" : "오늘 기록 전";
  const flowSuffix = todayEntry
    ? "내일 다시 오면 이 문장 위에 새 기록이 이어져요."
    : "오늘의 마음을 남기면 이 흐름이 이어져요.";
  forestDiaryFlowElement.textContent = `${flowPrefix} · ${getForestDiaryFlowInfo()} ${flowSuffix}`;
}

function getForestSharePayload() {
  const todayRecord = getTodayRecord();

  if (!todayRecord) {
    return null;
  }

  const entry = getForestDiaryEntry(todayRecord);
  const treeName = treeData.treeName?.trim() || "이름 없는 나무";
  const growthDays = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const url = "https://inhm1234.github.io/living_forest/?invite=forest_sentence";
  const title = "오늘의 숲 문장";
  const text = [
    `살아있는 숲 · ${treeName}`,
    `${entry.displayDate} ${entry.label} · ${entry.title}`,
    `“${entry.sentence}”`,
    `${growthDays}번째 기록이 내 숲에 남았어요.`,
    `나도 내 숲 시작하기: ${url}`
  ].join("\n");

  return {
    title,
    text,
    url,
    entry,
    treeName,
    growthDays
  };
}

function renderForestShareCard() {
  if (!forestShareCardElement || !forestSharePreviewElement || !forestShareMessageElement) {
    return;
  }

  const payload = getForestSharePayload();

  if (!payload) {
    forestShareCardElement.classList.add("hidden");
    forestShareMessageElement.textContent = "오늘 기록 후 사용 가능";
    return;
  }

  forestShareCardElement.classList.remove("hidden");

  if (forestShareTitleElement) {
    forestShareTitleElement.textContent = "오늘의 숲 문장이 준비됐어요";
  }

  if (forestShareTextElement) {
    forestShareTextElement.textContent = "오늘 남긴 문장을 복사하거나 공유해서, 내 숲의 하루를 가볍게 꺼낼 수 있어요.";
  }

  forestSharePreviewElement.textContent = `${payload.entry.displayDate} ${payload.entry.label} · ${payload.entry.title}\n“${payload.entry.sentence}”`;
  forestShareMessageElement.textContent = "복사하면 오늘의 숲 문장과 링크가 함께 담겨요.";

  if (nativeForestShareBtnElement) {
    nativeForestShareBtnElement.textContent = typeof navigator !== "undefined" && typeof navigator.share === "function"
      ? "공유하기"
      : "공유 문장 복사";
  }
}

function hasSharedForestSentenceToday() {
  const dates = Array.isArray(treeData.sharedForestSentenceDates) ? treeData.sharedForestSentenceDates : [];
  return dates.includes(getTodayKey());
}

function hasAnyForestSentenceShare() {
  return Array.isArray(treeData.sharedForestSentenceDates) && treeData.sharedForestSentenceDates.length > 0;
}

function markForestSentenceShared(source = "forest_sentence") {
  const today = getTodayKey();
  const dates = Array.isArray(treeData.sharedForestSentenceDates) ? [...treeData.sharedForestSentenceDates] : [];

  if (!dates.includes(today)) {
    dates.unshift(today);
    treeData.sharedForestSentenceDates = dates.slice(0, 60);
    saveTreeData();
  }

  renderForestBadgeCard();
  trackForestEvent("forest_badge_action", { source, action: "forest_sentence_shared" });
}

function getForestBadgeItems() {
  const days = Array.isArray(treeData.history) ? treeData.history.length : 0;
  const hasName = Boolean(treeData.treeName?.trim());
  const hasDiary = Array.isArray(treeData.history) && treeData.history.some((record) => Boolean(getForestDiaryEntry(record)?.sentence));
  const invited = isForestInviteVisit() || Boolean(treeData.inviteStartedAt);
  const sharedAny = hasAnyForestSentenceShare();

  return [
    {
      id: "named_tree",
      icon: "🏷️",
      title: "이름 붙인 나무",
      text: "내 나무가 이름을 얻었어요.",
      hint: "나무 이름 저장",
      unlocked: hasName
    },
    {
      id: "first_record",
      icon: "🌱",
      title: "첫 씨앗",
      text: "첫 마음이 숲에 남았어요.",
      hint: "첫 감정 기록",
      unlocked: days >= 1
    },
    {
      id: "forest_diary",
      icon: "📖",
      title: "숲 일기장",
      text: "오늘의 숲 문장이 기록으로 쌓이기 시작했어요.",
      hint: "숲 문장 생성",
      unlocked: hasDiary
    },
    {
      id: "three_records",
      icon: "✨",
      title: "작은 숲길",
      text: "세 번의 마음이 하나의 길처럼 이어졌어요.",
      hint: "3번 기록",
      unlocked: days >= 3
    },
    {
      id: "seven_records",
      icon: "🌿",
      title: "일곱 날의 숲",
      text: "일주일의 기록이 내 숲에 자리 잡았어요.",
      hint: "7번 기록",
      unlocked: days >= 7
    },
    {
      id: "forest_sentence_share",
      icon: "💌",
      title: "숲 문장 나눔",
      text: "오늘의 숲 문장을 밖으로 꺼내 나눴어요.",
      hint: "문장 복사/공유",
      unlocked: sharedAny
    },
    {
      id: "invite_seed",
      icon: "🕊️",
      title: "초대받은 씨앗",
      text: "누군가의 숲 문장에서 이곳으로 이어졌어요.",
      hint: "초대 링크로 시작",
      unlocked: invited
    }
  ];
}

function renderTreeCareCard() {
  if (!treeCareCardElement || !treeCareTitleElement || !treeCareTextElement || !treeCareMessageElement) {
    return;
  }

  const todayRecord = getTodayRecord();
  const todayCare = getTodayCareRecord();
  const latestCare = getLatestCareRecord();
  const canCare = Boolean(todayRecord) && !todayCare;

  if (treeCareStageDockElement) {
    treeCareStageDockElement.classList.toggle("hidden", !todayRecord);
    treeCareStageDockElement.classList.toggle("care-dock-ready", Boolean(todayRecord));
    treeCareStageDockElement.classList.toggle("care-dock-done", Boolean(todayCare));
  }

  if (skyElement) {
    skyElement.classList.remove("care-visual-water", "care-visual-light", "care-visual-rest");
    if (todayCare?.care) {
      skyElement.classList.add(`care-visual-${todayCare.care}`);
    }
  }

  treeCareCardElement.classList.toggle("care-ready", Boolean(todayRecord));
  treeCareCardElement.classList.toggle("care-done", Boolean(todayCare));

  treeCareButtons.forEach((button) => {
    const careKey = button.dataset.careAction;
    const selected = todayCare?.care === careKey;
    button.disabled = !canCare;
    button.classList.toggle("selected", selected);
  });

  if (!todayRecord) {
    treeCareTitleElement.textContent = "오늘 기록 후 내 나무를 돌볼 수 있어요";
    treeCareTextElement.textContent = "마음을 기록한 뒤, 물 주기·빛 쬐기·쉬게 하기 중 하나를 골라 오늘의 작은 돌봄을 남겨요.";
    treeCareMessageElement.textContent = latestCare
      ? `최근 돌봄 · ${latestCare.icon} ${latestCare.label} — ${latestCare.title}`
      : "오늘 기록 후 사용 가능";
    if (treeCareStageTextElement) {
      treeCareStageTextElement.textContent = "기록 후 나무 가까이에서 바로 돌볼 수 있어요.";
    }
    return;
  }

  if (todayCare) {
    treeCareTitleElement.textContent = `${todayCare.icon} ${todayCare.title}`;
    treeCareTextElement.textContent = todayCare.message;
    treeCareMessageElement.textContent = "오늘의 작은 돌봄이 내 숲에 남았어요. 내일 다시 다른 돌봄을 남길 수 있어요.";
    if (treeCareStageTextElement) {
      treeCareStageTextElement.textContent = `${todayCare.icon} ${todayCare.title}`;
    }
    return;
  }

  treeCareTitleElement.textContent = "오늘의 작은 돌봄을 골라주세요";
  treeCareTextElement.textContent = "감정 기록은 끝났어요. 이제 내 나무에게 오늘 어울리는 돌봄 하나를 남길 수 있어요.";
  treeCareMessageElement.textContent = "하루에 한 번만 선택돼요.";
  if (treeCareStageTextElement) {
    treeCareStageTextElement.textContent = "나무 가까이에서 바로 돌봄을 골라보세요.";
  }
}

function chooseTreeCare(care) {
  if (!treeCareRules[care] || !getTodayRecord() || hasCaredToday()) {
    renderTreeCareCard();
    return;
  }

  const rule = treeCareRules[care];
  const records = Array.isArray(treeData.careHistory) ? [...treeData.careHistory] : [];
  records.unshift({
    date: getTodayKey(),
    care,
    label: rule.label,
    icon: rule.icon,
    title: rule.title,
    message: rule.message
  });
  treeData.careHistory = records.slice(0, 60);
  saveTreeData();

  renderTreeCareCard();
  renderWeeklyForestLetterCard();
  renderForestCalendarCard();
  renderForestMemoryCard();
  renderForestEffect(getTodayMoodState(), true);
  renderMessages(`${rule.message} 오늘의 돌봄도 내 숲의 하루에 함께 남았어요.`);
  trackForestEvent("tree_care_selected", { care_type: care });
}



function renderForestSoundCard() {
  if (!forestSoundCardElement || !forestSoundTitleElement || !forestSoundTextElement || !forestSoundMessageElement) {
    return;
  }

  const activeRule = forestSoundRules[forestSoundRuntime.activeSound] || null;
  forestSoundCardElement.classList.toggle("sound-playing", Boolean(activeRule));

  forestSoundButtons.forEach((button) => {
    const soundKey = button.dataset.forestSound;
    const selected = forestSoundRuntime.activeSound === soundKey;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  if (activeRule) {
    forestSoundTitleElement.textContent = `${activeRule.icon} ${activeRule.title}`;
    forestSoundTextElement.textContent = activeRule.message;
    forestSoundMessageElement.textContent = "소리가 재생 중이에요. 화면을 떠나거나 끄기를 누르면 멈춰요.";
    return;
  }

  forestSoundTitleElement.textContent = "내 정원에 어울리는 소리를 켜보세요";
  forestSoundTextElement.textContent = "바람, 물방울, 밤벌레 중 하나를 누르면 이 기기에서만 짧은 숲 분위기가 재생돼요.";
  forestSoundMessageElement.textContent = "소리는 저장 데이터에 영향을 주지 않는 몰입용 기능이에요.";
}

function getForestAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  return new AudioContextClass();
}

function stopForestSound() {
  try {
    forestSoundRuntime.timers.forEach((timerId) => window.clearInterval(timerId));
    forestSoundRuntime.timers = [];

    const context = forestSoundRuntime.context;
    forestSoundRuntime.context = null;
    forestSoundRuntime.activeSound = "";

    if (context && context.state !== "closed") {
      context.close();
    }
  } catch (error) {
    console.warn("Forest sound stop skipped:", error);
  }

  renderForestSoundCard();
}

function createNoiseSource(context, seconds = 2) {
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function playSoftTone(context, destination, frequency, duration = 0.28, type = "sine") {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.04);
}

function startWindSound(context, masterGain) {
  const noise = createNoiseSource(context, 2.5);
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(520, context.currentTime);
  gain.gain.setValueAtTime(0.028, context.currentTime);
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(0.18, context.currentTime);
  lfoGain.gain.setValueAtTime(0.018, context.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  noise.start();
  lfo.start();
}

function startWaterSound(context, masterGain) {
  playSoftTone(context, masterGain, 980, 0.22, "sine");
  const timerId = window.setInterval(() => {
    const frequency = 760 + Math.random() * 520;
    playSoftTone(context, masterGain, frequency, 0.18 + Math.random() * 0.14, "sine");
  }, 520);
  forestSoundRuntime.timers.push(timerId);
}

function startNightSound(context, masterGain) {
  const timerId = window.setInterval(() => {
    const base = 1900 + Math.random() * 700;
    playSoftTone(context, masterGain, base, 0.075, "square");
    window.setTimeout(() => playSoftTone(context, masterGain, base * 1.08, 0.065, "square"), 95);
  }, 920);
  forestSoundRuntime.timers.push(timerId);
}

async function playForestSound(soundKey) {
  const rule = forestSoundRules[soundKey];
  if (!rule) {
    stopForestSound();
    return;
  }

  stopForestSound();

  const context = getForestAudioContext();
  if (!context) {
    if (forestSoundMessageElement) {
      forestSoundMessageElement.textContent = "이 브라우저에서는 숲의 소리를 재생할 수 없어요.";
    }
    return;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.0001, context.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.55, context.currentTime + 0.25);
    masterGain.connect(context.destination);

    forestSoundRuntime.context = context;
    forestSoundRuntime.activeSound = soundKey;

    if (soundKey === "wind") {
      startWindSound(context, masterGain);
    } else if (soundKey === "water") {
      startWaterSound(context, masterGain);
    } else if (soundKey === "night") {
      startNightSound(context, masterGain);
    }

    renderForestSoundCard();
    trackForestEvent("forest_sound_played", { sound_type: soundKey });
  } catch (error) {
    console.warn("Forest sound play skipped:", error);
    stopForestSound();
    if (forestSoundMessageElement) {
      forestSoundMessageElement.textContent = "소리를 재생하지 못했어요. 브라우저의 자동 재생 설정을 확인해주세요.";
    }
  }
}

function renderForestTrailCard() {
  if (!forestTrailCardElement || !forestTrailTitleElement || !forestTrailTextElement || !forestTrailMessageElement) {
    return;
  }

  const todayRecord = getTodayRecord();
  const todayTrail = getTodayTrailRecord();
  const latestTrail = getLatestTrailRecord();
  const canWalk = Boolean(todayRecord) && !todayTrail;

  forestTrailCardElement.classList.toggle("trail-ready", Boolean(todayRecord));
  forestTrailCardElement.classList.toggle("trail-done", Boolean(todayTrail));

  forestTrailButtons.forEach((button) => {
    const trailKey = button.dataset.forestTrail;
    const selected = todayTrail?.trail === trailKey;
    button.disabled = !canWalk;
    button.classList.toggle("selected", selected);
  });

  if (!todayRecord) {
    forestTrailTitleElement.textContent = "오늘 기록 후 숲길 하나를 걸을 수 있어요";
    forestTrailTextElement.textContent = "감정 기록을 마치면 이끼길, 햇살길, 고요한 길 중 하나를 골라 오늘의 산책 흔적을 남길 수 있어요.";
    forestTrailMessageElement.textContent = latestTrail
      ? `최근 산책 · ${latestTrail.icon} ${latestTrail.label} — ${latestTrail.title}`
      : "오늘 기록 후 사용 가능";
    return;
  }

  if (todayTrail) {
    forestTrailTitleElement.textContent = `${todayTrail.icon} ${todayTrail.title}`;
    forestTrailTextElement.textContent = todayTrail.message;
    forestTrailMessageElement.textContent = "오늘의 숲길 산책이 내 숲에 남았어요. 내일 다시 다른 길을 걸을 수 있어요.";
    return;
  }

  forestTrailTitleElement.textContent = "오늘 걸을 숲길을 골라주세요";
  forestTrailTextElement.textContent = "기록과 돌봄이 내 나무 주변에 머물렀다면, 이번에는 내 숲길을 한 번 걸으며 오늘의 흔적을 남겨요.";
  forestTrailMessageElement.textContent = "하루에 한 번만 선택돼요.";
}

function chooseForestTrail(trail) {
  if (!forestTrailRules[trail] || !getTodayRecord() || hasWalkedTrailToday()) {
    renderForestTrailCard();
    return;
  }

  const rule = forestTrailRules[trail];
  const records = Array.isArray(treeData.trailHistory) ? [...treeData.trailHistory] : [];
  records.unshift({
    date: getTodayKey(),
    trail,
    label: rule.label,
    icon: rule.icon,
    title: rule.title,
    message: rule.message
  });
  treeData.trailHistory = records.slice(0, 60);
  saveTreeData();

  renderForestTrailCard();
  renderWeeklyForestLetterCard();
  renderForestMemoryCard();
  renderMessages(`${rule.message} 오늘의 숲길 산책도 내 숲의 하루에 함께 남았어요.`);
  trackForestEvent("forest_trail_selected", { trail_type: trail });
}

function renderSelfCareCard() {
  if (!selfCareCardElement || !selfCareTitleElement || !selfCareTextElement || !selfCareMessageElement) {
    return;
  }

  const todayRecord = getTodayRecord();
  const todayAction = getTodaySelfCareRecord();
  const latestAction = getLatestSelfCareRecord();
  const canChoose = Boolean(todayRecord) && !todayAction;

  selfCareCardElement.classList.toggle("self-care-ready", Boolean(todayRecord));
  selfCareCardElement.classList.toggle("self-care-done", Boolean(todayAction));

  selfCareButtons.forEach((button) => {
    const actionKey = button.dataset.selfCare;
    const selected = todayAction?.action === actionKey;
    button.disabled = !canChoose;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  if (!todayRecord) {
    selfCareTitleElement.textContent = "오늘 기록 후 나를 위한 작은 실천을 고를 수 있어요";
    selfCareTextElement.textContent = "내 나무를 돌보는 것처럼, 오늘의 나에게도 아주 작은 행동 하나를 남겨요.";
    selfCareMessageElement.textContent = latestAction
      ? `최근 실천 · ${latestAction.icon} ${latestAction.label} — ${latestAction.title}`
      : "오늘 기록 후 사용 가능";
    return;
  }

  if (todayAction) {
    selfCareTitleElement.textContent = `${todayAction.icon} ${todayAction.title}`;
    selfCareTextElement.textContent = todayAction.message;
    selfCareMessageElement.textContent = "오늘의 작은 실천이 내 숲의 하루에 함께 남았어요. 내일 다시 하나를 고를 수 있어요.";
    return;
  }

  selfCareTitleElement.textContent = "오늘 나에게 할 작은 실천을 하나 골라주세요";
  selfCareTextElement.textContent = "기록과 돌봄이 숲에 남았다면, 이번에는 실제 나에게 돌아오는 작은 행동을 하나 정해요.";
  selfCareMessageElement.textContent = "하루에 한 번만 선택돼요.";
}

function chooseSelfCare(action) {
  if (!selfCareRules[action] || !getTodayRecord() || hasSelfCaredToday()) {
    renderSelfCareCard();
    return;
  }

  const rule = selfCareRules[action];
  const records = Array.isArray(treeData.selfCareHistory) ? [...treeData.selfCareHistory] : [];
  records.unshift({
    date: getTodayKey(),
    action,
    label: rule.label,
    icon: rule.icon,
    title: rule.title,
    message: rule.message
  });
  treeData.selfCareHistory = records.slice(0, 60);
  saveTreeData();

  renderSelfCareCard();
  renderWeeklyForestLetterCard();
  renderForestMemoryCard();
  renderMessages(`${rule.message} 오늘은 숲뿐 아니라 나도 조금 돌본 날이에요.`);
  trackForestEvent("self_care_selected", { self_care_type: action });
}


function getSelectedGardenMarker() {
  const marker = typeof treeData.gardenMarker === "string" ? treeData.gardenMarker : "";
  return gardenMarkerRules[marker] ? marker : "";
}

function renderGardenMarkerLayer() {
  if (!gardenMarkerLayerElement) {
    return;
  }

  const markerKey = getSelectedGardenMarker();
  const rule = markerKey ? gardenMarkerRules[markerKey] : null;

  if (!rule) {
    gardenMarkerLayerElement.innerHTML = "";
    gardenMarkerLayerElement.className = "garden-marker-layer";
    return;
  }

  gardenMarkerLayerElement.className = `garden-marker-layer marker-active ${rule.className}`;
  const markerVisual = rule.imageSrc
    ? `<img class="garden-marker-image" src="${escapeHtml(rule.imageSrc)}" alt="" />`
    : `<span class="garden-marker-emoji" aria-hidden="true">${escapeHtml(rule.icon || "✦")}</span>`;

  gardenMarkerLayerElement.innerHTML = `
    <span class="garden-marker-ground" aria-hidden="true"></span>
    <span class="garden-marker-item" aria-label="${escapeHtml(rule.label)}">${markerVisual}</span>
  `;
}

function renderGardenMarkerCard() {
  if (!gardenMarkerCardElement || !gardenMarkerTitleElement || !gardenMarkerTextElement || !gardenMarkerMessageElement) {
    return;
  }

  const markerKey = getSelectedGardenMarker();
  const rule = markerKey ? gardenMarkerRules[markerKey] : null;
  const hasRecord = Array.isArray(treeData.history) && treeData.history.length > 0;

  gardenMarkerCardElement.classList.toggle("marker-selected", Boolean(rule));

  gardenMarkerButtons.forEach((button) => {
    const buttonMarker = button.dataset.gardenMarker;
    const selected = markerKey === buttonMarker;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  if (rule) {
    gardenMarkerTitleElement.textContent = rule.title;
    gardenMarkerTextElement.textContent = rule.message;
    gardenMarkerMessageElement.textContent = "내 정원 무대에도 선택한 표식이 함께 보여요. 언제든 다른 표식으로 바꿀 수 있어요.";
    return;
  }

  gardenMarkerTitleElement.textContent = "내 정원에 귀여운 장식을 놓아보세요";
  gardenMarkerTextElement.textContent = hasRecord
    ? "기록이 쌓인 정원에 들꽃, 조약돌, 작은 등불 중 하나를 놓아 내 자리의 분위기를 정할 수 있어요."
    : "첫 기록 전에도 표식을 미리 정할 수 있어요. 내 나무가 자랄 자리의 분위기를 골라보세요.";
  gardenMarkerMessageElement.textContent = "표식은 성장 수치가 아니라 내 정원을 구분하는 작은 개인화 요소예요.";
}

function chooseGardenMarker(marker) {
  if (!gardenMarkerRules[marker]) {
    renderGardenMarkerCard();
    renderGardenMarkerLayer();
    return;
  }

  treeData.gardenMarker = marker;
  saveTreeData();
  renderGardenMarkerCard();
  renderGardenMarkerLayer();
  renderMessages(`${gardenMarkerRules[marker].message} 내 정원이 조금 더 나다운 자리로 남았어요.`);
  showGardenActivityLog(`${gardenMarkerRules[marker].label}을 놓았어요`);
  closeGardenHubPanel();
  trackForestEvent("garden_marker_selected", { marker_type: marker });
}

function renderForestBadgeCard() {
  if (!forestBadgeCardElement || !forestBadgeListElement || !forestBadgeMetaElement) {
    return;
  }

  const badges = getForestBadgeItems();
  const unlockedBadges = badges.filter((badge) => badge.unlocked);
  const nextBadge = badges.find((badge) => !badge.unlocked) || null;

  forestBadgeCardElement.classList.toggle("badge-ready", unlockedBadges.length > 0);
  forestBadgeCardElement.classList.toggle("badge-complete", unlockedBadges.length === badges.length);

  if (forestBadgeTitleElement) {
    forestBadgeTitleElement.textContent = unlockedBadges.length > 0
      ? `내 숲에 남은 배지 ${unlockedBadges.length}개`
      : "첫 배지를 기다리는 숲";
  }

  if (forestBadgeTextElement) {
    forestBadgeTextElement.textContent = unlockedBadges.length > 0
      ? "기록, 일기장, 나눔이 쌓인 흔적을 작은 배지로 모아 보여줘요."
      : "나무 이름을 정하고 첫 마음을 남기면 내 숲의 첫 배지가 열려요.";
  }

  forestBadgeListElement.innerHTML = badges
    .map((badge) => {
      const stateClass = badge.unlocked ? "badge-unlocked" : "badge-locked";
      const stateText = badge.unlocked ? "열림" : badge.hint;
      return `
        <article class="forest-badge-item ${stateClass}">
          <span class="forest-badge-icon" aria-hidden="true">${escapeHtml(badge.icon)}</span>
          <div>
            <strong>${escapeHtml(badge.title)}</strong>
            <p>${escapeHtml(badge.unlocked ? badge.text : badge.hint)}</p>
          </div>
          <em>${escapeHtml(stateText)}</em>
        </article>
      `;
    })
    .join("");

  if (unlockedBadges.length === badges.length) {
    forestBadgeMetaElement.textContent = "현재 준비된 숲 배지를 모두 열었어요.";
  } else if (nextBadge) {
    forestBadgeMetaElement.textContent = `다음 배지 · ${nextBadge.title} — ${nextBadge.hint}`;
  } else {
    forestBadgeMetaElement.textContent = "첫 배지를 기다리는 중";
  }
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyForestShareText() {
  const payload = getForestSharePayload();

  if (!payload) {
    if (forestShareMessageElement) {
      forestShareMessageElement.textContent = "오늘의 마음을 기록한 뒤 공유 문장을 만들 수 있어요.";
    }
    return;
  }

  try {
    await copyTextToClipboard(payload.text);
    if (forestShareMessageElement) {
      forestShareMessageElement.textContent = "오늘의 숲 문장을 복사했어요. 내 숲 배지에도 나눔 흔적이 남았어요.";
    }
    markForestSentenceShared("forest_sentence_copy");
    trackForestEvent("share_click", { source: "forest_sentence_copy" });
  } catch (error) {
    if (forestShareMessageElement) {
      forestShareMessageElement.textContent = "복사에 실패했어요. 문장을 길게 눌러 직접 복사해 주세요.";
    }
  }
}

async function shareForestSentence() {
  const payload = getForestSharePayload();

  if (!payload) {
    if (forestShareMessageElement) {
      forestShareMessageElement.textContent = "오늘의 마음을 기록한 뒤 공유할 수 있어요.";
    }
    return;
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url
      });
      if (forestShareMessageElement) {
        forestShareMessageElement.textContent = "오늘의 숲 문장을 공유했어요. 내 숲 배지에도 나눔 흔적이 남았어요.";
      }
      markForestSentenceShared("forest_sentence_native_share");
      trackForestEvent("share_click", { source: "forest_sentence_native_share" });
      return;
    }

    await copyTextToClipboard(payload.text);
    if (forestShareMessageElement) {
      forestShareMessageElement.textContent = "공유 문장을 복사했어요. 내 숲 배지에도 나눔 흔적이 남았어요.";
    }
    markForestSentenceShared("forest_sentence_share_fallback");
    trackForestEvent("share_click", { source: "forest_sentence_share_fallback" });
  } catch (error) {
    if (forestShareMessageElement) {
      forestShareMessageElement.textContent = "공유를 완료하지 않았어요. 필요하면 문장 복사를 사용해 주세요.";
    }
  }
}


function buildForestArchiveData() {
  const history = Array.isArray(treeData.history) ? treeData.history : [];
  const careHistory = Array.isArray(treeData.careHistory) ? treeData.careHistory : [];
  const trailHistory = Array.isArray(treeData.trailHistory) ? treeData.trailHistory : [];
  const selfCareHistory = Array.isArray(treeData.selfCareHistory) ? treeData.selfCareHistory : [];
  const tomorrowSeeds = Array.isArray(treeData.tomorrowSeeds) ? treeData.tomorrowSeeds : [];
  const sharedForestSentenceDates = Array.isArray(treeData.sharedForestSentenceDates) ? treeData.sharedForestSentenceDates : [];

  return {
    archiveType: "living_forest_local_archive",
    archiveVersion: "2.0",
    exportedAt: getNowIsoString(),
    appName: APP_CONFIG.name,
    appVersion: APP_CONFIG.version,
    dataSchemaVersion: APP_CONFIG.dataSchemaVersion,
    storageMode: STORAGE_CONFIG.mode,
    note: "이 파일은 살아있는 숲 로컬 기록 보관/복원용입니다. 서버로 자동 전송되지 않습니다.",
    backupPreparation: {
      status: "local_only_ready",
      message: "계정 백업으로 확장할 때 필요한 treeId와 기록 묶음이 포함되어 있어요."
    },
    tree: {
      treeId: treeData.treeId || "",
      treeName: treeData.treeName || "",
      createdAt: treeData.createdAt || "",
      updatedAt: treeData.updatedAt || "",
      lastCheckDate: treeData.lastCheckDate || null,
      leaf: treeData.leaf,
      trunk: treeData.trunk,
      root: treeData.root,
      totalRecords: history.length,
      currentStage: getTreeStageName(history.length),
      gardenMarker: treeData.gardenMarker || ""
    },
    records: {
      history,
      careHistory,
      trailHistory,
      selfCareHistory,
      tomorrowSeeds,
      sharedForestSentenceDates,
      inviteStartedAt: treeData.inviteStartedAt || null
    }
  };
}

function getForestArchiveInfo() {
  const history = Array.isArray(treeData.history) ? treeData.history : [];
  const totalRecords = history.length;
  const totalCare = Array.isArray(treeData.careHistory) ? treeData.careHistory.length : 0;
  const totalTrail = Array.isArray(treeData.trailHistory) ? treeData.trailHistory.length : 0;
  const totalSelfCare = Array.isArray(treeData.selfCareHistory) ? treeData.selfCareHistory.length : 0;
  const totalSeeds = Array.isArray(treeData.tomorrowSeeds) ? treeData.tomorrowSeeds.length : 0;
  const hasName = Boolean(treeData.treeName?.trim());

  if (totalRecords <= 0 && !hasName) {
    return {
      title: "내 숲 관리실은 첫 기록을 기다려요",
      text: "나무 이름을 정하거나 오늘의 마음을 남기면, 이 기기에 저장된 숲 기록을 보관하고 다시 불러올 수 있어요.",
      stats: ["기록 0개", "보관 준비 중"],
      message: "첫 기록 전에는 관리할 숲 기록이 거의 없어요."
    };
  }

  const actionCount = totalCare + totalTrail + totalSelfCare + totalSeeds;
  return {
    title: `${treeData.treeName?.trim() || "내 나무"}의 숲 관리실`,
    text: "지금 이 기기에 남아 있는 내 나무와 숲 일기장 기록을 파일로 보관하거나, 이전 보관 파일을 다시 불러올 수 있어요.",
    stats: [
      `감정 기록 ${totalRecords}개`,
      `작은 선택 ${actionCount}개`,
      treeData.gardenMarker ? "정원 표식 있음" : "정원 표식 없음"
    ],
    message: "보관 파일은 JSON 형식이에요. 복원 전에는 현재 숲을 먼저 내려받아두는 것을 추천해요."
  };
}

function renderForestArchiveCard() {
  if (!forestArchiveCardElement || !forestArchiveTitleElement || !forestArchiveTextElement || !forestArchiveStatsElement || !forestArchiveMessageElement) {
    return;
  }

  const info = getForestArchiveInfo();
  forestArchiveTitleElement.textContent = info.title;
  forestArchiveTextElement.textContent = info.text;
  forestArchiveStatsElement.innerHTML = info.stats.map((stat) => `<span>${escapeHtml(stat)}</span>`).join("");
  forestArchiveMessageElement.textContent = info.message;
}

function getForestArchiveFilename() {
  const safeDate = getTodayKey().replace(/-/g, "");
  const safeName = (treeData.treeName?.trim() || "living-forest")
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .slice(0, 24);
  return `${safeName}-archive-${safeDate}.json`;
}

function downloadForestArchive() {
  try {
    const data = buildForestArchiveData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getForestArchiveFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);

    if (forestArchiveMessageElement) {
      forestArchiveMessageElement.textContent = "내 숲 보관 파일을 만들었어요. 다운로드 폴더를 확인해 주세요.";
    }
    trackForestEvent("forest_archive_download", { source: "forest_archive_card" });
  } catch (error) {
    if (forestArchiveMessageElement) {
      forestArchiveMessageElement.textContent = "보관 파일을 만들지 못했어요. 브라우저 권한이나 저장 공간을 확인해 주세요.";
    }
  }
}

function buildForestArchiveSummaryText() {
  const data = buildForestArchiveData();
  const tree = data.tree;
  const records = data.records;
  const totalSmallActions = (records.careHistory?.length || 0) + (records.trailHistory?.length || 0) + (records.selfCareHistory?.length || 0) + (records.tomorrowSeeds?.length || 0);

  return [
    "살아있는 숲 · 내 숲 보관 요약",
    `나무 이름: ${tree.treeName || "이름 없는 나무"}`,
    `감정 기록: ${tree.totalRecords}개`,
    `작은 선택: ${totalSmallActions}개`,
    `현재 단계: ${tree.currentStage}`,
    `내보낸 시간: ${data.exportedAt}`,
    "기록은 이 기기에만 저장되어 있어요.",
    "보관 파일로 내려받아 직접 백업할 수 있어요."
  ].join("\n");
}

async function copyForestArchiveSummary() {
  try {
    await copyTextToClipboard(buildForestArchiveSummaryText());
    if (forestArchiveMessageElement) {
      forestArchiveMessageElement.textContent = "내 숲 보관 요약을 복사했어요.";
    }
    trackForestEvent("forest_archive_summary_copy", { source: "forest_archive_card" });
  } catch (error) {
    if (forestArchiveMessageElement) {
      forestArchiveMessageElement.textContent = "복사에 실패했어요. 브라우저 권한을 확인해 주세요.";
    }
  }
}


function getFlatDataFromForestArchive(archiveData) {
  if (!archiveData || typeof archiveData !== "object") {
    throw new Error("보관 파일 형식이 올바르지 않습니다.");
  }

  const isArchive = archiveData.archiveType === "living_forest_local_archive";
  const tree = isArchive && archiveData.tree && typeof archiveData.tree === "object" ? archiveData.tree : archiveData;
  const records = isArchive && archiveData.records && typeof archiveData.records === "object" ? archiveData.records : archiveData;

  const flatData = {
    appName: APP_CONFIG.name,
    appVersion: APP_CONFIG.version,
    dataSchemaVersion: APP_CONFIG.dataSchemaVersion,
    treeId: tree.treeId || archiveData.treeId || createTreeId(),
    createdAt: tree.createdAt || archiveData.createdAt || getNowIsoString(),
    updatedAt: getNowIsoString(),
    storageInfo: createStorageInfo(getNowIsoString()),
    leaf: tree.leaf ?? archiveData.leaf ?? 1,
    trunk: tree.trunk ?? archiveData.trunk ?? 1,
    root: tree.root ?? archiveData.root ?? 1,
    lastCheckDate: tree.lastCheckDate || archiveData.lastCheckDate || null,
    history: Array.isArray(records.history) ? records.history : [],
    treeName: tree.treeName || archiveData.treeName || "",
    careHistory: Array.isArray(records.careHistory) ? records.careHistory : [],
    trailHistory: Array.isArray(records.trailHistory) ? records.trailHistory : [],
    selfCareHistory: Array.isArray(records.selfCareHistory) ? records.selfCareHistory : [],
    sharedForestSentenceDates: Array.isArray(records.sharedForestSentenceDates) ? records.sharedForestSentenceDates : [],
    inviteStartedAt: records.inviteStartedAt || archiveData.inviteStartedAt || null,
    gardenMarker: tree.gardenMarker || archiveData.gardenMarker || "",
    tomorrowSeeds: Array.isArray(records.tomorrowSeeds) ? records.tomorrowSeeds : []
  };

  if (!flatData.treeName && !flatData.history.length && !flatData.careHistory.length && !flatData.trailHistory.length && !flatData.selfCareHistory.length && !flatData.tomorrowSeeds.length) {
    throw new Error("불러올 숲 기록을 찾지 못했습니다.");
  }

  return flatData;
}

function importForestArchiveFromText(fileText) {
  const parsed = JSON.parse(fileText);
  const nextData = normalizeTreeData(getFlatDataFromForestArchive(parsed));
  const currentName = treeData.treeName?.trim() || "현재 내 숲";
  const nextName = nextData.treeName?.trim() || "불러올 숲";
  const message = `${nextName} 기록을 불러오면 ${currentName}의 현재 로컬 기록을 덮어쓸 수 있어요.\n\n진행 전에 현재 숲 보관 파일을 받아두는 것을 추천해요. 계속할까요?`;

  if (!window.confirm(message)) {
    if (forestArchiveMessageElement) {
      forestArchiveMessageElement.textContent = "복원을 취소했어요. 현재 숲은 그대로 유지돼요.";
    }
    return;
  }

  treeData = nextData;
  saveTreeData();
  shouldHighlightWorldSpot = true;
  renderAll();

  if (forestArchiveMessageElement) {
    forestArchiveMessageElement.textContent = "보관 파일에서 내 숲을 불러왔어요. 화면의 기록과 달력을 확인해 주세요.";
  }

  trackForestEvent("forest_archive_import", { source: "forest_management_room" });
}

function handleForestArchiveImport(event) {
  const file = event?.target?.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      importForestArchiveFromText(String(reader.result || ""));
    } catch (error) {
      if (forestArchiveMessageElement) {
        forestArchiveMessageElement.textContent = `보관 파일을 불러오지 못했어요. ${error?.message || "파일 형식을 확인해 주세요."}`;
      }
    } finally {
      if (forestArchiveImportInputElement) {
        forestArchiveImportInputElement.value = "";
      }
    }
  };
  reader.onerror = () => {
    if (forestArchiveMessageElement) {
      forestArchiveMessageElement.textContent = "파일을 읽지 못했어요. 다시 선택해 주세요.";
    }
  };
  reader.readAsText(file, "utf-8");
}

function getMoodRecordByDate(dateText) {
  const history = Array.isArray(treeData.history) ? treeData.history : [];
  return history.find((record) => record.date === dateText) || null;
}

function getForestCalendarItems() {
  const items = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = getRelativeDateKey(offset);
    const record = getMoodRecordByDate(date);
    const isToday = date === getTodayKey();
    items.push({ date, record, isToday });
  }
  return items;
}

function renderForestCalendarCard() {
  if (!forestCalendarCardElement || !forestCalendarTitleElement || !forestCalendarTextElement || !forestCalendarGridElement || !forestCalendarMessageElement) {
    return;
  }

  const items = getForestCalendarItems();
  const recordedCount = items.filter((item) => item.record).length;
  forestCalendarCardElement.classList.toggle("calendar-has-records", recordedCount > 0);
  forestCalendarTitleElement.textContent = recordedCount > 0 ? `최근 14일 중 ${recordedCount}일의 숲 흔적` : "최근 14일 숲 달력이 비어 있어요";
  forestCalendarTextElement.textContent = recordedCount > 0
    ? "마음을 남긴 날은 작은 숲 점으로 표시돼요. 날짜를 따라 내 숲의 리듬을 볼 수 있어요."
    : "오늘의 마음을 남기면 숲 달력에 첫 점이 생겨요.";
  forestCalendarGridElement.innerHTML = items.map((item) => {
    const day = item.date.slice(8, 10);
    const label = item.record ? `${item.record.icon || "·"} ${item.record.label || "기록"}` : "기록 없음";
    const classes = ["forest-calendar-day"];
    if (item.record) classes.push("has-record");
    if (item.isToday) classes.push("today");
    return `<div class="${classes.join(" ")}" title="${escapeHtml(item.date)} ${escapeHtml(label)}"><span>${day}</span><strong>${escapeHtml(item.record?.icon || "·")}</strong><small>${escapeHtml(item.record?.label || "-")}</small></div>`;
  }).join("");
  forestCalendarMessageElement.textContent = recordedCount > 0
    ? "달력은 이 기기에 저장된 최근 감정 기록을 기준으로 보여줘요."
    : "기록이 쌓이면 여기에 최근 숲의 흐름이 보이기 시작해요.";
}

function buildForestMemoryItems() {
  const items = [];
  const pushItem = (type, date, icon, title, text) => {
    if (!isValidDateKey(date)) return;
    items.push({ type, date, icon: icon || "·", title: title || "숲 기억", text: text || "" });
  };

  (Array.isArray(treeData.history) ? treeData.history : []).forEach((record) => {
    pushItem("mood", record.date, record.icon, `${record.label || "마음"} · ${record.forestTitle || "숲 일기"}`, record.forestSentence || record.message || "");
  });
  (Array.isArray(treeData.careHistory) ? treeData.careHistory : []).forEach((record) => {
    pushItem("care", record.date, record.icon, record.title || record.label || "오늘의 작은 돌봄", record.message || "");
  });
  (Array.isArray(treeData.trailHistory) ? treeData.trailHistory : []).forEach((record) => {
    pushItem("trail", record.date, record.icon, record.title || record.label || "오늘의 숲길 산책", record.message || "");
  });
  (Array.isArray(treeData.selfCareHistory) ? treeData.selfCareHistory : []).forEach((record) => {
    pushItem("self", record.date, record.icon, record.title || record.label || "나를 위한 작은 실천", record.message || "");
  });
  (Array.isArray(treeData.tomorrowSeeds) ? treeData.tomorrowSeeds : []).forEach((record) => {
    pushItem("seed", record.date, "🌱", "내일의 씨앗", record.text || "");
  });

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

function getForestMemoryFilterLabel(filter) {
  return {
    all: "전체",
    mood: "감정",
    care: "돌봄",
    trail: "산책",
    self: "실천",
    seed: "씨앗"
  }[filter] || "전체";
}

function renderForestMemoryCard() {
  if (!forestMemoryCardElement || !forestMemoryTitleElement || !forestMemoryTextElement || !forestMemoryListElement || !forestMemoryMessageElement) {
    return;
  }

  forestMemoryFilterButtons.forEach((button) => {
    const isActive = button.dataset.memoryFilter === selectedForestMemoryFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  const allItems = buildForestMemoryItems();
  const filtered = selectedForestMemoryFilter === "all"
    ? allItems
    : allItems.filter((item) => item.type === selectedForestMemoryFilter);
  const visibleItems = filtered.slice(0, 6);
  const filterLabel = getForestMemoryFilterLabel(selectedForestMemoryFilter);

  forestMemoryCardElement.classList.toggle("memory-has-items", visibleItems.length > 0);
  forestMemoryTitleElement.textContent = visibleItems.length > 0 ? `${filterLabel} 기억 ${filtered.length}개` : `${filterLabel} 기억을 기다리는 중`;
  forestMemoryTextElement.textContent = visibleItems.length > 0
    ? "쌓인 기록을 다시 찾아보며 내 숲이 어떤 날들을 지나왔는지 확인해요."
    : "기록이 쌓이면 이곳에서 종류별로 다시 볼 수 있어요.";

  forestMemoryListElement.innerHTML = visibleItems.length
    ? visibleItems.map((item) => `<article class="forest-memory-item memory-${escapeHtml(item.type)}"><span>${escapeHtml(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p><small>${escapeHtml(formatDate(item.date))}</small></div></article>`).join("")
    : `<p class="forest-memory-empty">아직 보여줄 기억이 없어요. 오늘의 마음을 남기면 첫 기억이 생겨요.</p>`;

  forestMemoryMessageElement.textContent = filtered.length > 6
    ? `최근 6개만 표시 중이에요. 전체 ${filtered.length}개 기억이 이 기기에 저장돼 있어요.`
    : "내 숲 기억 찾기는 서버 전송 없이 이 기기의 기록만 읽어요.";
}

function setForestMemoryFilter(filter) {
  selectedForestMemoryFilter = ["all", "mood", "care", "trail", "self", "seed"].includes(filter) ? filter : "all";
  renderForestMemoryCard();
}

function renderVersionLabels() {
  const versionElements = document.querySelectorAll(".version");
  const demoPillElement = document.querySelector(".demo-pill");

  if (versionElements[0]) {
    versionElements[0].textContent = `${APP_CONFIG.name} ${APP_CONFIG.version}`;
  }

  if (versionElements[1]) {
    versionElements[1].textContent = `오늘 내 나무 돌보기 · ${APP_CONFIG.version}`;
  }

  if (demoPillElement) {
    demoPillElement.textContent = `${APP_CONFIG.version}`;
  }
}

function renderGardenAtmosphere() {
  const atmosphere = getWorldAtmosphereInfo();
  const gardenPlaceLabel = `${atmosphere.shortLabel} 숲속 자리`;

  if (skyElement) {
    skyElement.classList.remove("garden-time-day", "garden-time-sunset", "garden-time-night");
    skyElement.classList.add(`garden-time-${atmosphere.key}`);
    skyElement.dataset.gardenTime = atmosphere.key;
    skyElement.setAttribute("aria-label", `내 ${gardenPlaceLabel}`);
  }

  if (document.body) {
    document.body.dataset.gardenTime = atmosphere.key;
    document.body.dataset.forestTime = atmosphere.key;
    document.body.classList.remove("forest-time-day", "forest-time-sunset", "forest-time-night");
    document.body.classList.add(`forest-time-${atmosphere.key}`);
  }

  if (gardenTitleElement) {
    gardenTitleElement.textContent = gardenPlaceLabel;
  }

  return atmosphere;
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

function updateOneActionStepUI() {
  const hasName = Boolean(treeData.treeName?.trim());
  const checkedToday = hasCheckedToday();
  const step = !hasName ? "name" : checkedToday ? "done" : "mood";

  document.body.classList.remove("lf-step-name", "lf-step-mood", "lf-step-done");
  document.body.classList.add(`lf-step-${step}`);

  if (step !== "done") {
    document.body.classList.remove("lf-show-seed");
  }

  // V1.72.5 test: 화면 갱신 때마다 패널을 강제로 열지 않습니다.
  // 사용자가 누른 버튼/패널 상태를 유지해서 나무 무대가 갑자기 밀리거나 가려지는 느낌을 줄입니다.

  if (gardenPanelTitleElement && !gardenHubElement?.classList.contains("is-open")) {
    if (step === "name") {
      gardenPanelTitleElement.textContent = "나무 이름 짓기";
    } else if (step === "mood") {
      gardenPanelTitleElement.textContent = "오늘 기분은?";
    } else {
      gardenPanelTitleElement.textContent = "오늘 숲 완성!";
    }
  }

  if (closeGardenPanelBtnElement) {
    closeGardenPanelBtnElement.textContent = gardenHubElement?.classList.contains("is-open") ? "메뉴 닫기" : "메뉴 열기";
  }
}

function renderTree(animate = false) {
  const state = getTreeState();
  const imageInfo = getTreeImageInfo();
  treeElement.className = `tree tree-image-layer ${imageInfo.className} tree-time-${imageInfo.timeKey} ${state}`;
  treeElement.dataset.treeTime = imageInfo.timeKey;
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
  } else if (hasCheckedToday() && getTodayRecord()) {
    const experience = getAfterRecordExperience(getTodayRecord());
    growthMessageElement.textContent = `${experience.complete} ${getNextGrowthPreviewMessage()}`;
  } else if (treeData.history.length > 0) {
    const returnMemory = getReturnMemoryInfo();
    growthMessageElement.textContent = returnMemory
      ? `${returnMemory.title} 오늘의 마음을 더하면 내 나무가 다시 반응해요.`
      : `이전 기록이 숲에 남아 있어요. 오늘의 마음을 더하면 성장이 다시 이어져요.`;
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
    treeNameMessageElement.textContent = "마음에 드는 이름으로 시작해요.";
    nameCardElement.classList.remove("hidden");
  }
}

function saveTreeName() {
  trackForestEvent("tree_name_save_attempt");

  const name = treeNameInputElement.value.trim();

  if (!name || treeData.treeName?.trim()) {
    return;
  }

  treeData.treeName = name;
  saveTreeData();
  renderTreeName();
  renderAll();
  showGardenActivityLog("나무 이름을 정했어요");

  if (moodCardElement) {
    openGardenHubTab("record");
    moodCardElement.classList.add("mood-ready-highlight");
    try {
      moodCardElement.focus?.({ preventScroll: true });
    } catch (error) {
      // 포커스가 불가능한 요소여도 화면 위치는 유지합니다.
    }
    window.setTimeout(() => {
      moodCardElement.classList.remove("mood-ready-highlight");
    }, 1600);
  }
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
    moodCardElement.classList.toggle("mood-done", checked);
  }

  if (!hasName) {
    todayStatusElement.textContent = "이름을 정하면 기분을 고를 수 있어요.";
    if (moodGuideElement) {
      moodGuideElement.textContent = "오늘 기분은?";
    }
    backToWorldBtnBottomElement.textContent = "전체 숲으로 돌아가기";
    return;
  }

  if (checked) {
    const label = todayRecord ? todayRecord.label : "기록됨";
    todayStatusElement.textContent = `오늘은 "${label}" 기록 완료`;
    if (moodGuideElement) {
      moodGuideElement.textContent = "오늘 기록 완료";
    }
    backToWorldBtnBottomElement.textContent = "전체 숲에서 내 자리 보기";
  } else {
    const returnMemory = getReturnMemoryInfo();
    todayStatusElement.textContent = returnMemory
      ? `하나만 골라줘요.`
      : `하나만 골라줘요.`;
    if (moodGuideElement) {
      moodGuideElement.textContent = returnMemory
        ? `오늘 마음 고르기`
        : `오늘 마음 고르기`;
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
    const history = Array.from({ length: 60 }, (_, index) => {
      return createHistoryRecord(index, moods[index % moods.length]);
    });

    return createNewTreeData({
      leaf: 61,
      trunk: 61,
      root: 61,
      lastCheckDate: getTodayKey(),
      history,
      treeName: "깊어진 테스트 나무"
    });
  }

  return createNewTreeData();
}

function createGrowthDaysTestData(totalDays) {
  const safeDays = Math.max(0, Math.min(120, Number(totalDays) || 0));
  const moods = ["good", "normal", "tired"];
  const history = Array.from({ length: safeDays }, (_, index) => {
    return createHistoryRecord(index, moods[index % moods.length]);
  });

  return createNewTreeData({
    leaf: Math.max(1, safeDays + 1),
    trunk: Math.max(1, safeDays + 1),
    root: Math.max(1, safeDays + 1),
    lastCheckDate: safeDays > 0 ? getTodayKey() : null,
    history,
    treeName: safeDays > 0 ? `성장 ${safeDays}일 테스트 나무` : "성장 0일 테스트 나무"
  });
}

function applyGrowthDaysFromUrlForTest() {
  if (!isTestMode || !urlParams.has("growthDays")) {
    return;
  }

  treeData = normalizeTreeData(createGrowthDaysTestData(urlParams.get("growthDays")));
  saveTreeData();
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
    trackReturnVisitIfNeeded();
  trackGrowthMilestones();
  trackForestEvent("app_opened");
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
  document.body.classList.remove("lf-garden-active");
  document.body.classList.add("lf-world-active");
  trackForestEvent("screen_view_world");
  stopForestSound();

  renderWorld();
  worldScreenElement.classList.add("screen-active");
  gardenScreenElement.classList.remove("screen-active");
  window.scrollTo({ top: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  if (shouldHighlightWorldSpot) {
    window.requestAnimationFrame(() => {
      highlightWorldSpot();
      shouldHighlightWorldSpot = false;
    });
  }
}

function showGardenScreen(options = {}) {
  document.body.classList.remove("lf-world-active");
  document.body.classList.add("lf-garden-active");
  const shouldOpenRecordPanel = Boolean(options.openRecordPanel);
  trackForestEvent("screen_view_garden", { openRecordPanel: shouldOpenRecordPanel });

  gardenScreenElement.classList.add("screen-active");
  worldScreenElement.classList.remove("screen-active");
  window.scrollTo({ top: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  buildGardenHubLayout();
  if (shouldOpenRecordPanel) {
    openGardenHubTab("record");
    gardenHubElement?.classList.add("first-record-highlight");
    window.setTimeout(() => {
      gardenHubElement?.classList.remove("first-record-highlight");
    }, 2400);
  } else {
    // V1.41.1 test: 일반 진입에서는 패널을 얇게 접어 두어 나무/숲 무대를 먼저 보이게 합니다.
    closeGardenHubPanel();
  }

  const canCheckVisitorAfterCare = hasCheckedToday();
  prepareDailyVisitor({
    allowCreate: canCheckVisitorAfterCare,
    allowPlay: canCheckVisitorAfterCare
  });
}


function hasSeenFirstVisitOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "seen";
  } catch (error) {
    return false;
  }
}

function markFirstVisitOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "seen");
  } catch (error) {
    // 저장이 막힌 환경에서도 안내 닫기는 계속 동작해야 해요.
  }
}

function openFirstVisitOnboarding(source = "manual") {
  if (!onboardingOverlayElement) {
    return;
  }

  onboardingOverlayElement.classList.remove("hidden");
  document.body.classList.add("onboarding-open");
  trackForestEvent("first_visit_onboarding_open", { source });

  window.setTimeout(() => {
    onboardingStartBtnElement?.focus?.();
  }, 60);
}

function closeFirstVisitOnboarding(markSeen = true) {
  if (!onboardingOverlayElement) {
    return;
  }

  onboardingOverlayElement.classList.add("hidden");
  document.body.classList.remove("onboarding-open");

  if (markSeen) {
    markFirstVisitOnboardingSeen();
  }
}

function focusFirstRecordStep() {
  window.setTimeout(() => {
    openGardenHubTab("record");
    gardenHubElement?.classList.add("first-record-highlight");

    const hasTreeName = Boolean(treeData.treeName?.trim());
    const targetElement = !hasTreeName && treeNameInputElement ? treeNameInputElement : moodCardElement;

    // V1.72.5 test: 첫 기록 안내도 자동 스크롤 없이 플로팅 패널 안에서만 강조합니다.

    if (!hasTreeName && treeNameInputElement) {
      try {
        treeNameInputElement.focus({ preventScroll: true });
      } catch (error) {
        treeNameInputElement.focus();
      }
    }

    window.setTimeout(() => {
      gardenHubElement?.classList.remove("first-record-highlight");
    }, 2400);
  }, 220);
}

function startTodayRecordFromOnboarding(source = "launch") {
  closeFirstVisitOnboarding(true);
  markFirstVisitOnboardingSeen();
  trackForestEvent("go_garden_click", { source });
  showGardenScreen();
  gardenHubElement?.classList.add("first-record-highlight");
  window.setTimeout(() => {
    gardenHubElement?.classList.remove("first-record-highlight");
  }, 1800);
}

function maybeOpenFirstVisitOnboarding() {
  if (!onboardingOverlayElement || hasSeenFirstVisitOnboarding()) {
    return;
  }

  const isFirstLocalVisit = !treeData.treeName?.trim() && Array.isArray(treeData.history) && treeData.history.length === 0;

  if (!isFirstLocalVisit || isForestInviteVisit() || isOnlineFriendInviteVisit()) {
    return;
  }

  window.setTimeout(() => {
    openFirstVisitOnboarding("auto_first_visit");
  }, 650);
}

function renderAll() {
  renderVersionLabels();
  renderTestModeStatus();
  renderWorld();
  renderFirstVisitGuide();
  renderForestInviteCard();
  renderDailyLoop();
  renderGardenAtmosphere();
  renderHeader();
  renderTreeName();
  renderTree();
  renderForestEffect(getTodayMoodState());
  renderMessages();
  renderReturnMemoryCard();
  renderStreakRewardCard();
  renderCompleteCard();
  renderTomorrowSeedCard();
  renderForestDiaryCard();
  renderForestShareCard();
  renderTreeCareCard();
  renderForestTrailCard();
  renderSelfCareCard();
  renderWeeklyForestLetterCard();
  renderForestArchiveCard();
  renderForestCalendarCard();
  renderForestMemoryCard();
  renderForestSoundCard();
  renderGardenMarkerCard();
  renderGardenMarkerLayer();
  renderForestBadgeCard();
  renderVisitorTrace();
  renderVisitorLog();
  updateTodayStatus();
  updateOneActionStepUI();
}

treeNameFormElement.addEventListener("submit", (event) => {
  event.preventDefault();
  saveTreeName();
});

if (tomorrowSeedFormElement) {
  tomorrowSeedFormElement.addEventListener("submit", (event) => {
    event.preventDefault();
    saveTomorrowSeed();
  });
}

moodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chooseMood(button.dataset.mood);
  });
});

if (copyForestShareBtnElement) {
  copyForestShareBtnElement.addEventListener("click", copyForestShareText);
}

if (nativeForestShareBtnElement) {
  nativeForestShareBtnElement.addEventListener("click", shareForestSentence);
}

if (forestInviteStartBtnElement) {
  forestInviteStartBtnElement.addEventListener("click", startFromForestInvite);
}

treeCareButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chooseTreeCare(button.dataset.careAction);
  });
});


forestTrailButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chooseForestTrail(button.dataset.forestTrail);
  });
});

selfCareButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chooseSelfCare(button.dataset.selfCare);
  });
});

forestSoundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playForestSound(button.dataset.forestSound);
  });
});

if (stopForestSoundBtnElement) {
  stopForestSoundBtnElement.addEventListener("click", stopForestSound);
}



if (downloadForestArchiveBtnElement) {
  downloadForestArchiveBtnElement.addEventListener("click", downloadForestArchive);
}

if (copyForestArchiveBtnElement) {
  copyForestArchiveBtnElement.addEventListener("click", copyForestArchiveSummary);
}

if (importForestArchiveBtnElement && forestArchiveImportInputElement) {
  importForestArchiveBtnElement.addEventListener("click", () => {
    forestArchiveImportInputElement.click();
  });
  forestArchiveImportInputElement.addEventListener("change", handleForestArchiveImport);
}

forestMemoryFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setForestMemoryFilter(button.dataset.memoryFilter);
  });
});

gardenMarkerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chooseGardenMarker(button.dataset.gardenMarker);
  });
});


if (startTodayRecordBtnElement) {
  startTodayRecordBtnElement.addEventListener("click", () => startTodayRecordFromOnboarding("launch_primary"));
}

if (openOnboardingBtnElement) {
  openOnboardingBtnElement.addEventListener("click", () => openFirstVisitOnboarding("launch_help"));
}

if (onboardingStartBtnElement) {
  onboardingStartBtnElement.addEventListener("click", () => startTodayRecordFromOnboarding("onboarding_start"));
}

if (onboardingLaterBtnElement) {
  onboardingLaterBtnElement.addEventListener("click", () => closeFirstVisitOnboarding(true));
}

if (closeOnboardingBtnElement) {
  closeOnboardingBtnElement.addEventListener("click", () => closeFirstVisitOnboarding(true));
}

if (onboardingOverlayElement) {
  onboardingOverlayElement.addEventListener("click", (event) => {
    if (event.target === onboardingOverlayElement) {
      closeFirstVisitOnboarding(true);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !onboardingOverlayElement.classList.contains("hidden")) {
      closeFirstVisitOnboarding(true);
    }
  });
}

goGardenBtnElement.addEventListener("click", () => showGardenScreen());
if (focusMyTreeBtnElement) {
  focusMyTreeBtnElement.addEventListener("click", focusMyWorldSpot);
}
if (worldInviteBtnElement) {
  worldInviteBtnElement.addEventListener("click", () => openGardenActionModal("letter"));
}
backToWorldBtnTopElement.addEventListener("click", showWorldScreen);
backToWorldBtnBottomElement.addEventListener("click", showWorldScreen);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopForestSound();
  }
});

window.addEventListener("beforeunload", stopForestSound);


const GARDEN_HUB_CONFIG = {
  record: {
    title: "오늘 기록",
    ids: [
      "nameCard", "returnMemoryCard", "streakRewardCard", "mood-card", "completeCard",
      "todayChangeCard", "tomorrowPromiseCard", "finishGuideCard", "tomorrowSeedCard", "forestDiaryCard"
    ]
  },
  decorate: {
    title: "정원 꾸미기",
    ids: ["gardenMarkerCard", "forestBadgeCard"]
  },
  letter: {
    title: "나누기",
    ids: ["forestShareCard", "weeklyForestLetterCard"]
  }
};

function buildGardenHubLayout() {
  if (!gardenHubElement || gardenHubLayoutBuilt) return;
  gardenHubLayoutBuilt = true;

  // V1.72.5 test: 하단 패널 대신 게임 HUD 버튼만 남기고 기능은 팝업에서 엽니다.
  // 접힌 상태와 열린 상태 모두 정원 무대 크기에 영향을 주지 않게 합니다.
  const gardenCardElement = document.querySelector(".garden-card.visual-card") || document.querySelector(".garden-card");
  if (gardenCardElement && gardenHubElement.parentElement !== gardenCardElement) {
    gardenHubElement.classList.remove("garden-stage-hub");
    gardenHubElement.classList.add("garden-bottom-hub", "garden-float-hub");
    gardenCardElement.appendChild(gardenHubElement);
  }

  Object.entries(GARDEN_HUB_CONFIG).forEach(([tabKey, config]) => {
    const panel = document.getElementById(`gardenPanel-${tabKey}`);
    if (!panel) return;

    config.ids.forEach((rawId) => {
      let targetId = rawId;
      if (rawId === "mood-card") {
        const moodCardElement = document.querySelector(".mood-card");
        if (moodCardElement && !panel.contains(moodCardElement)) {
          panel.appendChild(moodCardElement);
        }
        return;
      }

      const element = document.getElementById(targetId);
      if (element && !panel.contains(element)) {
        panel.appendChild(element);
      }
    });
  });

  const archivePanel = document.getElementById("gardenPanel-archive");
  if (archivePanel) {
    const storageNote = document.querySelector(".storage-note");
    if (backToWorldBtnBottomElement && !archivePanel.contains(backToWorldBtnBottomElement)) {
      backToWorldBtnBottomElement.classList.add("hub-inline-return");
      archivePanel.appendChild(backToWorldBtnBottomElement);
    }
    if (storageNote && !archivePanel.contains(storageNote)) {
      archivePanel.appendChild(storageNote);
    }
  }

  gardenHubTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openGardenHubTab(button.dataset.gardenTab);
    });
  });

  if (closeGardenActionModalBtnElement) {
    closeGardenActionModalBtnElement.addEventListener("click", closeGardenActionModal);
  }

  if (gardenActionModalElement) {
    gardenActionModalElement.addEventListener("click", (event) => {
      if (event.target === gardenActionModalElement) {
        closeGardenActionModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && gardenActionModalElement && !gardenActionModalElement.classList.contains("hidden")) {
      closeGardenActionModal();
    }
  });

  if (closeGardenPanelBtnElement) {
    closeGardenPanelBtnElement.setAttribute("aria-controls", "gardenHubSheet");
    closeGardenPanelBtnElement.addEventListener("click", () => {
      if (gardenHubElement.classList.contains("is-open")) {
        closeGardenHubPanel();
      } else {
        openGardenHubMenu();
      }
    });
  }

  bindGardenModalActions();

  // V1.72.5 test: 첫 진입에서는 나무가 먼저 보이도록 HUD만 보입니다.
  closeGardenHubPanel();
  updateOneActionStepUI();
}

function openGardenHubMenu() {
  if (!gardenHubElement) return;
  gardenHubElement.classList.add("is-open");
  if (gardenHubSheetElement) {
    gardenHubSheetElement.hidden = true;
  }
  if (closeGardenPanelBtnElement) {
    closeGardenPanelBtnElement.textContent = "메뉴 닫기";
    closeGardenPanelBtnElement.setAttribute("aria-expanded", "true");
  }
  if (gardenPanelTitleElement) {
    gardenPanelTitleElement.textContent = "기록, 꾸미기, 나눔만 열어요.";
  }
}

function restoreGardenPanelsToSheet() {
  if (!gardenHubSheetElement) return;

  document.querySelectorAll(".garden-hub-panel").forEach((panel) => {
    panel.classList.remove("active");
    panel.hidden = true;
    if (panel.parentElement !== gardenHubSheetElement) {
      gardenHubSheetElement.appendChild(panel);
    }
  });
}

function openGardenHubTab(tabKey) {
  if (!gardenHubElement) return;
  if (!Object.prototype.hasOwnProperty.call(GARDEN_HUB_CONFIG, tabKey)) {
    tabKey = "record";
  }

  activeGardenHubTab = tabKey;
  openGardenHubMenu();

  gardenHubTabButtons.forEach((button) => {
    const isActive = button.dataset.gardenTab === tabKey;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  openGardenActionModal(tabKey);
}

function getModalRecordHtml() {
  const hasName = Boolean(treeData.treeName?.trim());
  const checked = hasCheckedToday();
  const todayRecord = getTodayRecord();
  const seedWrittenToday = getTomorrowSeedWrittenToday();

  if (!hasName) {
    return `
      <div class="garden-modal-mini is-name-step">
        <span class="garden-modal-step">1분 시작</span>
        <h3>내 나무 이름을 먼저 정해요.</h3>
        <p>이름을 정하면 바로 오늘 마음을 고를 수 있어요.</p>
        <form class="garden-modal-form" data-garden-modal-form="name">
          <input id="modalTreeNameInput" type="text" maxlength="16" placeholder="예: 반짝이" autocomplete="off" aria-label="나무 이름 입력" />
          <button type="submit">시작</button>
        </form>
      </div>
    `;
  }

  if (!checked) {
    const moodItems = Object.entries(moodRules).map(([key, rule]) => `
      <button type="button" class="garden-modal-choice" data-garden-modal-action="mood" data-mood="${escapeHtml(key)}">
        <span>${rule.icon}</span>
        <strong>${escapeHtml(rule.label)}</strong>
      </button>
    `).join("");

    return `
      <div class="garden-modal-mini is-mood-step">
        <span class="garden-modal-step">오늘 기록</span>
        <h3>오늘 마음 하나만 골라요.</h3>
        <p>고른 마음은 내 나무의 오늘 성장으로 남아요.</p>
        <div class="garden-modal-choice-grid mood-choice-grid">${moodItems}</div>
      </div>
    `;
  }

  if (!seedWrittenToday) {
    return `
      <div class="garden-modal-mini is-complete-step">
        <span class="garden-modal-step">완료</span>
        <h3>오늘 마음을 남겼어요.</h3>
        <p>${todayRecord ? `${escapeHtml(todayRecord.icon)} ${escapeHtml(todayRecord.label)} 기운이 내 나무에 남았어요.` : "내 나무가 오늘의 마음을 기억하고 있어요."}</p>
        <form class="garden-modal-form stacked" data-garden-modal-form="tomorrow">
          <label for="modalTomorrowSeedInput">내일의 나에게 한마디</label>
          <textarea id="modalTomorrowSeedInput" maxlength="64" rows="3" placeholder="예: 내일은 조금 천천히 가자"></textarea>
          <button type="submit">내일 한마디 남기기</button>
        </form>
      </div>
    `;
  }

  return `
    <div class="garden-modal-mini is-done-step">
      <span class="garden-modal-step">오늘 완료</span>
      <h3>오늘 할 일은 끝났어요.</h3>
      <p>내일 다시 오면 남겨둔 한마디를 먼저 보여줄게요.</p>
      <div class="garden-modal-saved-line">“${escapeHtml(seedWrittenToday.text)}”</div>
      <button type="button" class="garden-modal-soft-btn" data-garden-modal-action="close">정원 보기</button>
    </div>
  `;
}

function getModalDecorateHtml() {
  const selected = getSelectedGardenMarker();
  const items = Object.entries(gardenMarkerRules).map(([key, rule]) => `
    <button type="button" class="garden-modal-choice ${selected === key ? "selected" : ""}" data-garden-modal-action="marker" data-marker="${escapeHtml(key)}" aria-pressed="${selected === key ? "true" : "false"}">
      <span>${rule.icon}</span>
      <strong>${escapeHtml(rule.label)}</strong>
      <small>${selected === key ? "놓아둠" : "놓기"}</small>
    </button>
  `).join("");

  return `
    <div class="garden-modal-mini is-decorate-step">
      <span class="garden-modal-step">꾸미기</span>
      <h3>나무 곁에 하나만 놓아요.</h3>
      <p>장식은 정원 분위기만 바꾸고, 성장 수치에는 영향을 주지 않아요.</p>
      <div class="garden-modal-choice-grid decorate-choice-grid">${items}</div>
    </div>
  `;
}

function getModalShareHtml() {
  const payload = getForestSharePayload();
  const seat = getSelectedFriendInviteSeat();
  const inviteUrl = getFriendInviteUrl();
  return `
    <div class="garden-modal-mini is-share-step">
      <span class="garden-modal-step">나눔</span>
      <h3>친구에게 숲 자리를 전해요.</h3>
      <p>${escapeHtml(seat.label)} 자리 초대 링크를 복사하거나, 오늘의 숲 문장을 나눌 수 있어요.</p>
      <div class="garden-modal-action-list">
        <button type="button" data-garden-modal-action="copy-invite">${escapeHtml(seat.emoji)} 초대 링크 복사</button>
        <button type="button" data-garden-modal-action="copy-sentence" ${payload ? "" : "disabled"}>오늘 숲 문장 복사</button>
      </div>
      <p class="garden-modal-note">${payload ? "복사 후 원하는 곳에 붙여넣으면 돼요." : "오늘 마음을 기록하면 숲 문장을 만들 수 있어요."}</p>
      <p class="garden-modal-url">${escapeHtml(inviteUrl)}</p>
    </div>
  `;
}

function getModalSimpleHtml(tabKey) {
  if (tabKey === "activity") {
    return `
      <div class="garden-modal-mini">
        <span class="garden-modal-step">활동</span>
        <h3>오늘은 기록만 해도 충분해요.</h3>
        <p>돌보기와 산책은 출시 후 단계에서 더 간단하게 정리할게요.</p>
        <button type="button" class="garden-modal-soft-btn" data-garden-modal-action="close">닫기</button>
      </div>
    `;
  }

  return `
    <div class="garden-modal-mini">
      <span class="garden-modal-step">보관함</span>
      <h3>기록은 조용히 저장되고 있어요.</h3>
      <p>처음 사용자는 지금 화면에서 길을 잃지 않도록 보관 기능은 작게 숨겨둬요.</p>
      <button type="button" class="garden-modal-soft-btn" data-garden-modal-action="close">닫기</button>
    </div>
  `;
}

function renderGardenActionModalContent(tabKey) {
  if (!gardenActionModalBodyElement) return;
  const htmlMap = {
    record: getModalRecordHtml,
    decorate: getModalDecorateHtml,
    letter: getModalShareHtml
  };

  gardenActionModalBodyElement.innerHTML = (htmlMap[tabKey] || htmlMap.record)();
}

function getGardenActionModalHeader(tabKey) {
  const headerMap = {
    record: { title: "오늘 기록", desc: "이 창에서 한 가지 행동만 끝내요." },
    decorate: { title: "꾸미기", desc: "나무를 가리지 않고 장식만 고릅니다." },
    letter: { title: "나눔", desc: "친구 초대와 오늘 문장을 짧게 처리해요." }
  };
  return headerMap[tabKey] || headerMap.record;
}

function openGardenActionModal(tabKey) {
  if (!gardenActionModalElement || !gardenActionModalBodyElement) return;
  if (!Object.prototype.hasOwnProperty.call(GARDEN_HUB_CONFIG, tabKey)) {
    tabKey = "record";
  }

  restoreGardenPanelsToSheet();
  const header = getGardenActionModalHeader(tabKey);

  if (gardenActionModalTitleElement) {
    gardenActionModalTitleElement.textContent = header.title;
  }
  if (gardenActionModalDescElement) {
    gardenActionModalDescElement.textContent = header.desc;
  }

  renderGardenActionModalContent(tabKey);
  gardenActionModalElement.classList.remove("hidden");
  document.body.classList.add("lf-garden-action-modal-open");

  window.setTimeout(() => {
    const focusTarget = gardenActionModalBodyElement.querySelector("input, textarea, button") || closeGardenActionModalBtnElement;
    try {
      focusTarget?.focus({ preventScroll: true });
    } catch (error) {
      focusTarget?.focus?.();
    }
  }, 30);
}

function closeGardenActionModal() {
  if (!gardenActionModalElement) return;
  gardenActionModalElement.classList.add("hidden");
  document.body.classList.remove("lf-garden-action-modal-open");
  if (gardenActionModalBodyElement) {
    gardenActionModalBodyElement.innerHTML = "";
  }
  restoreGardenPanelsToSheet();
}

function saveTreeNameFromGardenModal(name) {
  const safeName = String(name || "").trim().slice(0, 16);
  if (!safeName || treeData.treeName?.trim()) {
    renderGardenActionModalContent("record");
    return;
  }

  treeData.treeName = safeName;
  saveTreeData();
  renderAll();
  showGardenActivityLog("나무 이름을 정했어요");
  renderGardenActionModalContent("record");
}

function bindGardenModalActions() {
  if (!gardenActionModalBodyElement || window.__livingForestGardenModalActionsBound) return;
  window.__livingForestGardenModalActionsBound = true;

  gardenActionModalBodyElement.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-garden-modal-form]");
    if (!form) return;
    event.preventDefault();

    const formType = form.dataset.gardenModalForm;
    if (formType === "name") {
      saveTreeNameFromGardenModal(form.querySelector("#modalTreeNameInput")?.value || "");
      return;
    }

    if (formType === "tomorrow") {
      const input = form.querySelector("#modalTomorrowSeedInput");
      if (tomorrowSeedInputElement && input) {
        tomorrowSeedInputElement.value = input.value;
      }
      saveTomorrowSeed();
      closeGardenActionModal();
    }
  });

  gardenActionModalBodyElement.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-garden-modal-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.gardenModalAction;

    if (action === "close") {
      closeGardenActionModal();
      return;
    }

    if (action === "mood") {
      chooseMood(button.dataset.mood);
      closeGardenActionModal();
      return;
    }

    if (action === "marker") {
      chooseGardenMarker(button.dataset.marker);
      closeGardenActionModal();
      return;
    }

    if (action === "copy-invite") {
      const copied = await copyTextToClipboard(getFriendInviteUrl());
      showGardenActivityLog(copied ? "초대 링크를 복사했어요" : "초대 링크 복사를 다시 시도해 주세요");
      closeGardenActionModal();
      trackForestEvent("friend_invite_link_copied", { source: "garden_modal", copied: copied ? "yes" : "no" });
      return;
    }

    if (action === "copy-sentence") {
      const payload = getForestSharePayload();
      if (!payload) {
        showGardenActivityLog("오늘 마음을 먼저 기록해 주세요");
        return;
      }
      const copied = await copyTextToClipboard(payload.text);
      if (copied) {
        markForestSentenceShared("garden_modal_copy");
      }
      showGardenActivityLog(copied ? "오늘 숲 문장을 복사했어요" : "문장 복사를 다시 시도해 주세요");
      closeGardenActionModal();
      trackForestEvent("share_click", { source: "garden_modal_copy", copied: copied ? "yes" : "no" });
    }
  });
}

function closeGardenHubPanel() {
  if (!gardenHubElement) return;
  gardenHubElement.classList.remove("is-open");
  if (gardenHubSheetElement) {
    gardenHubSheetElement.hidden = true;
  }
  if (closeGardenPanelBtnElement) {
    closeGardenPanelBtnElement.textContent = "메뉴 열기";
    closeGardenPanelBtnElement.setAttribute("aria-expanded", "false");
  }
  if (gardenPanelTitleElement) {
    gardenPanelTitleElement.textContent = "필요할 때만 열고, 평소에는 나무를 크게 봐요.";
  }
}


if (finishSeedBtnElement) {
  finishSeedBtnElement.addEventListener("click", () => {
    document.body.classList.add("lf-show-seed");
    openGardenHubTab("record");
    window.setTimeout(() => {
      try {
        tomorrowSeedInputElement?.focus({ preventScroll: true });
      } catch (error) {
        tomorrowSeedInputElement?.focus?.();
      }
    }, 60);
  });
}

if (finishForestBtnElement) {
  finishForestBtnElement.addEventListener("click", () => {
    const focusTarget = forestHeadElement || gardenCardElement || document.querySelector("#gardenScreen .garden-hero");
    focusTarget?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

applyGrowthDaysFromUrlForTest();
saveTreeData();
setupTestMode();
renderAll();
buildGardenHubLayout();
showWorldScreen();
maybeOpenFirstVisitOnboarding();


function handleAnalyticsClickCapture(event) {
  const button = event.target?.closest?.("button, a");
  if (!button) {
    return;
  }

  const text = (button.textContent || "").trim();
  const aria = button.getAttribute("aria-label") || "";
  const id = button.id || "";
  const className = button.className || "";

  if (/내 나무|내 자리|정원|심으러|키우러|마음 기록/.test(text + aria + id + className)) {
    trackForestEvent("go_garden_click", { source: "click_capture" });
  }

  if (/전체 숲|월드|돌아/.test(text + aria + id + className)) {
    trackForestEvent("return_world_click", { source: "click_capture" });
  }

  if (/공유/.test(text + aria + id + className) && id !== "nativeForestShareBtn" && id !== "copyForestShareBtn") {
    trackForestEvent("share_click", { source: "click_capture" });
  }
}

document.addEventListener("click", handleAnalyticsClickCapture);



if (worldStarterFriendsElement) {
  worldStarterFriendsElement.addEventListener("click", (event) => {
    const seatButton = event.target?.closest?.("[data-friend-seat]");
    if (!seatButton) {
      return;
    }
    selectFriendInviteSeat(seatButton.dataset.friendSeat, "stage");
  });
}

if (friendSeatOptionsElement) {
  friendSeatOptionsElement.addEventListener("click", (event) => {
    const seatButton = event.target?.closest?.("[data-friend-seat-option]");
    if (!seatButton) {
      return;
    }
    selectFriendInviteSeat(seatButton.dataset.friendSeatOption, "card");
  });
}

if (friendLinksListElement) {
  friendLinksListElement.addEventListener("click", (event) => {
    const assignButton = event.target?.closest?.("[data-friend-link-seat]");
    if (!assignButton || assignButton.disabled || friendLinkAssignState === "saving") {
      return;
    }

    assignFriendLinkToSeat(assignButton.dataset.friendLinkId, assignButton.dataset.friendLinkSeat);
  });
}

if (kakaoFriendInviteBtnElement) {
  kakaoFriendInviteBtnElement.addEventListener("click", shareFriendInviteToKakao);
}

if (copyFriendInviteBtnElement) {
  copyFriendInviteBtnElement.addEventListener("click", copyFriendInviteMessage);
}

if (previewFriendInviteBtnElement) {
  previewFriendInviteBtnElement.addEventListener("click", showFriendInvitePreview);
}

if (clearFriendSeatBtnElement) {
  clearFriendSeatBtnElement.addEventListener("click", clearSelectedFriendSeat);
}


if (onlineFriendUseExistingBtnElement) {
  onlineFriendUseExistingBtnElement.addEventListener("click", joinOnlineInviteWithExistingTree);
}

if (onlineFriendNewTreeToggleBtnElement) {
  onlineFriendNewTreeToggleBtnElement.addEventListener("click", revealNewTreeJoinForm);
}

if (onlineFriendJoinFormElement) {
  onlineFriendJoinFormElement.addEventListener("submit", handleOnlineFriendJoin);
}

initKakaoShareSdk();
loadOnlineFriendSeats();
loadOnlineFriendLinks();
