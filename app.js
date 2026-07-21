/* Production mirror of dev/garden-login-test/garden.js v19. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://xdcsppaptcmgpvnzgoab.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oMrSqUFX9UM1n4Ks-AhYKw_OvcZOfPs";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// 나무 상호작용 모듈은 기존 인증 세션과 같은 Supabase 클라이언트를 공유합니다.
window.__todayForestSupabase = supabase;
window.__todayForestShowToast = (...args) => showToast(...args);

// 특별친구 모듈이 로그인한 정원의 데이터 준비 완료 시점을 안전하게 알 수 있도록 합니다.
function publishGardenSessionReady(origin = "garden") {
  window.dispatchEvent(new CustomEvent("todayforest:garden-session-ready", {
    detail: {
      origin,
      userId: currentUser?.id || null,
    },
  }));
}


// GA4에는 닉네임·편지 제목·본문·계정 ID처럼 개인을 식별할 수 있는 값은 보내지 않습니다.
// DEV에서는 ?analyticsDebug=1 일 때 콘솔에만 이벤트를 보여주고, 실제 GA4 전송은 하지 않습니다.
const TODAYFOREST_ANALYTICS = window.TODAYFOREST_ANALYTICS || {
  measurementId: "",
  enabled: false,
  debug: false,
  build: "unknown",
};

function analyticsSafeValue(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value).slice(0, 40);
}

function trackTodayForestEvent(eventName, params = {}) {
  try {
    const payload = {
      app_area: "my_garden",
      build: TODAYFOREST_ANALYTICS.build || "unknown",
    };

    Object.entries(params).forEach(([key, value]) => {
      const safeValue = analyticsSafeValue(value);
      if (safeValue !== undefined) payload[key] = safeValue;
    });

    if (TODAYFOREST_ANALYTICS.enabled && typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);
    }

    if (TODAYFOREST_ANALYTICS.debug) {
      window.__todayForestAnalyticsEvents = window.__todayForestAnalyticsEvents || [];
      window.__todayForestAnalyticsEvents.push({ eventName, payload, at: new Date().toISOString() });
      console.info("[TodayForest analytics]", eventName, payload);
    }
  } catch (error) {
    console.warn("TodayForest analytics skipped:", error);
  }
}

// Sheets에는 개인을 식별할 수 있는 값(닉네임, 계정 ID, 편지 제목·본문)을 보내지 않습니다.
// 새 운영 통계는 예전 events 시트와 분리된 todayforest_events 시트에만 기록합니다.
const TODAYFOREST_SHEETS = window.TODAYFOREST_SHEETS || {
  endpointUrl: "",
  projectKey: "",
  enabled: false,
  debug: false,
  environment: "dev",
  build: "unknown",
};

const TODAYFOREST_SHEETS_EVENT_NAMES = new Set([
  "garden_mood_saved",
  "garden_letter_sent",
  "garden_friend_connected",
]);

function sheetsSafeValue(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, 20);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value).slice(0, 40);
}

function trackTodayForestSheetsEvent(eventName, params = {}) {
  try {
    if (!TODAYFOREST_SHEETS_EVENT_NAMES.has(eventName)) return;

    const payload = {
      environment: TODAYFOREST_SHEETS.environment || "unknown",
      build: TODAYFOREST_SHEETS.build || "unknown",
      page_path: window.location.pathname || "/",
    };

    Object.entries(params).forEach(([key, value]) => {
      const safeValue = sheetsSafeValue(value);
      if (safeValue !== undefined) payload[key] = safeValue;
    });

    if (TODAYFOREST_SHEETS.debug) {
      window.__todayForestSheetsEvents = window.__todayForestSheetsEvents || [];
      window.__todayForestSheetsEvents.push({ eventName, payload, at: new Date().toISOString() });
      console.info("[TodayForest Sheets]", eventName, payload);
    }

    if (!TODAYFOREST_SHEETS.enabled || !TODAYFOREST_SHEETS.endpointUrl || !TODAYFOREST_SHEETS.projectKey) {
      return;
    }

    const url = new URL(TODAYFOREST_SHEETS.endpointUrl);
    url.searchParams.set("action", "track_todayforest_event");
    url.searchParams.set("key", TODAYFOREST_SHEETS.projectKey);
    url.searchParams.set("event_name", eventName);
    Object.entries(payload).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    // 기존 운영판과 같은 이미지 비콘 방식: CORS 응답을 읽지 않고도 기록 요청만 보냅니다.
    const beacon = new Image();
    beacon.referrerPolicy = "no-referrer-when-downgrade";
    beacon.src = url.toString();
  } catch (error) {
    console.warn("TodayForest Sheets tracking skipped:", error);
  }
}

function trackTodayForestOperationalEvent(eventName, params = {}) {
  trackTodayForestEvent(eventName, params);
  trackTodayForestSheetsEvent(eventName, params);
}

const DEFAULT_STATE = {
  growth: 0,
  records: [],
  letters: [],
  sentLetters: [],
  // 특별 숲 친구 편지는 일반 동물 편지와 분리된 서버 기록으로 관리합니다.
  specialFriendLetters: [],
  friends: [],
  sharedTrees: [],
  sharedTreeInvites: [],
  sharedTreeNotes: [],
  sharedTreeStartMoments: [],
  foundItems: [],
  profileName: "새 친구",
  treeName: "",
};

// 날씨는 한국 날짜가 바뀔 때마다 각 정원에 새로 정해집니다.
// 맑음 60% · 바람 20% · 비 20% 비율이며, 같은 날에는 새로고침해도 바뀌지 않습니다.
const weatherOptions = [
  { icon: "☀️", text: "햇살이 포근하게 내려와요", className: "sun", message: "햇살이 오늘의 잎을 따뜻하게 감싸요." },
  { icon: "🍃", text: "바람이 가볍게 불어요", className: "wind", message: "바람이 잎 끝을 살짝 흔들고 있어요." },
  { icon: "🌧️", text: "조용히 비가 내려요", className: "rain", message: "구름 아래로 빗방울이 조용히 정원에 내려앉아요." },
];

// 장식은 하루 기록마다 하나씩 발견합니다. 같은 종류가 다시 찾아와도
// 각 발견 기록의 id가 달라서 따로 표시·이동·저장됩니다.
const foundItemCatalog = {
  pink_wildflower: {
    name: "분홍 들꽃",
    detail: "작은 들꽃이 나무 가까이에 피었어요.",
    asset: "assets/decorations/pink-wildflower.png",
  },
  white_daisies: {
    name: "하얀 데이지",
    detail: "하얀 데이지가 풀밭에 조용히 머물러요.",
    asset: "assets/decorations/white-daisies.png",
  },
  mushroom_pair: {
    name: "작은 버섯 두 개",
    detail: "작은 버섯 두 개가 나무 아래에 자랐어요.",
    asset: "assets/decorations/mushroom-pair.png",
  },
  mossy_round_rock: {
    name: "이끼 낀 둥근 돌",
    detail: "이끼 낀 둥근 돌이 숲길 곁에 놓였어요.",
    asset: "assets/decorations/mossy-round-rock.png",
  },
  amber_mushroom: {
    name: "주황 버섯",
    detail: "햇살빛 주황 버섯이 풀숲에서 고개를 내밀었어요.",
    asset: "assets/decorations/amber-mushroom.png",
  },
  leafy_pile: {
    name: "낙엽 더미",
    detail: "바람이 모아둔 낙엽이 포근하게 쌓였어요.",
    asset: "assets/decorations/leafy-pile.png",
  },
  tiny_hedgehog: {
    name: "작은 고슴도치",
    detail: "작은 고슴도치가 잠시 정원 가장자리에 쉬어가요.",
    asset: "assets/decorations/tiny-hedgehog.png",
  },
  tiny_squirrel: {
    name: "작은 다람쥐",
    detail: "작은 다람쥐가 도토리를 꼭 안고 앉았어요.",
    asset: "assets/decorations/tiny-squirrel.png",
  },
  branch_letter: {
    name: "낮은 가지의 봉투",
    detail: "낮은 가지에 작은 봉투 하나가 살며시 걸렸어요.",
    asset: "assets/decorations/branch-letter.png",
  },
  forest_ribbon: {
    name: "숲 리본",
    detail: "바람에 살랑이는 리본이 정원을 꾸며줘요.",
    asset: "assets/decorations/forest-ribbon.png",
  },
  firefly_jar: {
    name: "반딧불 병",
    detail: "작은 빛들이 유리병 안에서 조용히 반짝여요.",
    asset: "assets/decorations/firefly-jar.png",
  },
  little_sign: {
    name: "작은 표지판",
    detail: "숲길을 가리키는 작은 표지판이 세워졌어요.",
    asset: "assets/decorations/little-sign.png",
  },
};

const animalVisitors = {
  bird: {
    kind: "bird",
    icon: "🐦",
    name: "작은 새",
    deliveryHours: 2,
    sceneClass: "bird",
    speech: "작은 새가 가지에서 편지를 기다리고 있어요.",
    traceIcon: "🪶",
    traceStory: "작은 새가 잠시 쉬어가며 깃털 하나를 남겼어요.",
    position: "branch",
  },
  squirrel: {
    kind: "squirrel",
    icon: "🐿️",
    name: "다람쥐",
    deliveryHours: 12,
    sceneClass: "squirrel",
    speech: "다람쥐가 나무 아래에서 편지를 기다리고 있어요.",
    traceIcon: "🌰",
    traceStory: "다람쥐가 도토리 하나를 두고 숲길로 돌아갔어요.",
    position: "trunk",
  },
  rabbit: {
    kind: "rabbit",
    icon: "🐇",
    name: "토끼",
    deliveryHours: 6,
    sceneClass: "rabbit",
    speech: "토끼가 풀밭에서 잠시 귀를 기울이고 있어요.",
    traceIcon: "〰️",
    traceStory: "토끼가 풀잎을 살짝 눌러두고 뛰어갔어요.",
    position: "ground",
  },
  hedgehog: {
    kind: "hedgehog",
    icon: "🦔",
    name: "고슴도치",
    deliveryHours: 24,
    sceneClass: "hedgehog",
    speech: "고슴도치가 조용히 편지를 기다리고 있어요.",
    traceIcon: "🍂",
    traceStory: "고슴도치가 작은 낙엽 길을 남기고 풀숲으로 돌아갔어요.",
    position: "ground",
  },
};

// 서버는 퇴장 뒤 animal_kind를 비워 둡니다. 다른 기기에서도 같은 짧은 흔적을 보여주기 위한 공용 표시입니다.
const genericAnimalTrace = {
  kind: "trace",
  name: "숲친구",
  sceneClass: "generic",
  traceIcon: "🍃",
  traceStory: "숲친구가 풀잎을 살짝 흔들어 두고 숲길로 돌아갔어요.",
};

const ANIMAL_DELIVERY_STORAGE_PREFIX = "todayforest-dev-animal-delivery-v2";
const ANIMAL_DELIVERY_QUEUE_STORAGE_PREFIX = "todayforest-dev-animal-delivery-queue-v3";
// 배송을 마친 편지는 보낸 편지함에 쌓지 않습니다.
// 사용자가 편지 화면을 열었을 때 한 번만 도착 장면을 보여주기 위한 짧은 보관함입니다.
const ANIMAL_DELIVERY_ARRIVAL_STORAGE_PREFIX = "todayforest-dev-animal-delivery-arrivals-v4";
// 홈 화면 안내는 기록을 남긴 다음 날부터, 계정별로 조용히 한 번씩 보여줍니다.
const PWA_INSTALL_LATER_STORAGE_PREFIX = "todayforest-pwa-install-later-v1";
const PWA_INSTALL_COMPLETE_STORAGE_PREFIX = "todayforest-pwa-install-complete-v1";
const PWA_INSTALL_LATER_MS = 7 * 24 * 60 * 60 * 1000;
// 받은 편지 1차 화면 검수용입니다. 실제 친구 편지 데이터는 건드리지 않고,
// URL에 ?receivedPreview=1~6 을 붙였을 때만 로컬 테스트 봉투를 추가합니다.
const RECEIVED_LETTER_PREVIEW_STORAGE_PREFIX = "todayforest-dev-received-preview-v1";
// 테스트 친구 계정으로 로그인할 수 없는 DEV 검수용 공유나무입니다.
// 실제 공유나무 테이블·제안·친구 데이터는 건드리지 않고, 현재 브라우저에만 저장합니다.
const DEV_SHARED_TREE_STORAGE_PREFIX = "todayforest-dev-shared-tree-preview-v1";
// 공유나무를 보고 있을 때 새로고침해도 같은 나무로 돌아오기 위한 주소 상태입니다.
const SHARED_TREE_URL_PARAM = "sharedTree";
const TOGETHER_FOREST_URL_PARAM = "togetherForest";
// 새 공유나무가 시작된 순간은 참여자마다 한 번만, 약 2초 동안 조용히 보여줍니다.
const SHARED_TREE_START_MOMENT_DURATION_MS = 2200;
// 오래된 편지 정책을 실제 시간으로 기다리지 않고 안전하게 검수하기 위한 DEV 전용 테스트입니다.
// 실제 garden_letters와 분리된 DEV 전용 테이블만 사용합니다.
// 준비는 ?retentionTest=21|wind|31&retentionReset=1 일 때만, 검수는 retentionTest 주소에서만 동작합니다.

const stageRules = [
  { min: 0, max: 2, label: "처음 깨어난 새싹", asset: "tree_stage1_morning.png" },
  { min: 3, max: 6, label: "봉오리가 올라온 새싹", asset: "tree_stage2_morning.png" },
  { min: 7, max: 13, label: "줄기가 자란 어린 나무", asset: "tree_stage3_morning.png" },
  { min: 14, max: 20, label: "꽃이 피는 작은 나무", asset: "tree_stage4_morning.png" },
  { min: 21, max: 29, label: "풍성해지는 나무", asset: "tree_stage5_morning.png" },
  { min: 30, max: Infinity, label: "완성된 마음 나무", asset: "tree_stage6_morning.png" },
];

const moodMap = {
  good: { icon: "🙂", label: "괜찮았어" },
  calm: { icon: "😌", label: "차분했어" },
  tired: { icon: "😮‍💨", label: "조금 지쳤어" },
  happy: { icon: "🌷", label: "기뻤어" },
};

// 특별친구 편지는 일반 방문 동물과 같은 작성 화면을 사용하지만,
// 저장·배송 상태는 특별친구 전용 RPC로 완전히 분리합니다.
const specialForestFriendPreviewCatalog = {
  forest_unicorn: {
    key: "forest_unicorn",
    icon: "🦄",
    name: "숲 유니콘",
    encounterText: "오늘, 누군가에게 마음을 전하고 싶나요?",
  },
};
let activeSpecialForestFriendPreviewKey = "";
let activeSpecialForestFriendEncounterKey = "";

function activeSpecialForestFriendPreview() {
  return specialForestFriendPreviewCatalog[activeSpecialForestFriendPreviewKey] || null;
}

function activeSpecialForestFriendEncounter() {
  return specialForestFriendPreviewCatalog[activeSpecialForestFriendEncounterKey] || null;
}

let currentUser = null;
let state = cloneDefault();
let selectedMood = "good";
let selectedFeedbackCategory = "idea";
let activeFeedbackTab = "write";
let activeLetterId = null;
let selectedLetterRecipientId = "";
let activeInviteLink = "";
let pendingFriendInvite = null;
let invitePreviewHandled = false;
let toastTimer = null;
let authBusy = false;
// 로그인하지 않은 방문자는 먼저 공개 소개 화면을 보고, 버튼을 눌렀을 때 로그인 화면으로 이동합니다.
let publicEntryView = "home";
let activeFriendGardenId = "";
let activeFriendFruitRecords = [];
let activeFriendFruitName = "";
let activeHeartFruitMode = "mine";
let activeHeartFruitRecordId = "";
let heartFruitVisibilityReady = true;
let heartFruitRevealForcedThisPage = false;
let pendingHeartFruitCompletionReveal = false;
let heartFruitRevealRunning = false;
let heartFruitRevealMessageTimer = null;
let heartFruitRevealHideTimer = null;
let heartFruitRevealFinishTimer = null;
const HEART_FRUIT_CEREMONY_DURATION_MS = 7000;
const HEART_FRUIT_CEREMONY_MESSAGE_DELAY_MS = 3000;
const HEART_FRUIT_CEREMONY_MESSAGE_HIDE_MS = 6100;

const HEART_FRUIT_COMPLETE_COUNT = 30;
const HEART_FRUIT_REVEAL_STORAGE_PREFIX = "todayforest-heart-fruit-revealed-v1";
const HEART_FRUIT_POSITIONS = Object.freeze([
  [35, 18], [48, 15], [61, 18], [27, 25], [42, 25], [55, 24], [70, 27],
  [21, 34], [34, 34], [48, 33], [61, 35], [76, 36], [18, 45], [30, 44],
  [43, 43], [56, 45], [69, 46], [80, 48], [24, 55], [37, 54], [50, 55],
  [63, 56], [75, 58], [31, 65], [44, 64], [57, 66], [69, 67], [39, 74],
  [52, 74], [63, 76]
]);
const HEART_FRUIT_VISIBLE_CAPACITY = HEART_FRUIT_POSITIONS.length;
const HEART_FRUIT_PREVIEW_MAX_COUNT = 120;
let activeSharedTreeId = "";
let activeTogetherForestFriendId = "";
let pendingSharedTreeInvite = null;
let sharedTreeStartMomentPlaying = false;
let sharedTreeStartMomentTimer = null;
// DEV Animal Visit v2: V1의 한 마리 상태와 분리된, 최대 두 마리의 계정 공통 방문 목록입니다.
let activeAnimalVisit = null;
let activeAnimalV2Visits = [];
let selectedAnimalV2VisitId = "";
let animalVisitSyncBusy = false;
let animalVisitArrivalTimer = null;
let animalDepartureTimer = null;
// 편지함을 열어 둔 동안에만 30초마다 배송 상태를 다시 읽습니다.
// 정원 전체 데이터를 주기적으로 다시 불러오지 않기 위한 별도 타이머입니다.
let lettersRefreshTimer = null;
let lettersRefreshBusy = false;
let animalEncounterVisitId = "";
let pendingExpiredLetterReturn = null;
let pendingRetentionNextVisitNoticeCount = 0;
let retentionWindTimer = null;
let retentionWindRefreshBusy = false;
let retentionCleanupRanOnThisPage = false;
let deferredInstallPrompt = null;
let installHelpVisible = false;
let treeNamePromptedForUserId = "";
let gardenWorldResizeObserver = null;
let friendGardenWorldResizeObserver = null;
// FIRST-WALK TUTORIAL v2.3
// 기록이 없는 계정에게만 “숲빛을 따라 첫 기록을 남기는” 짧은 산책을 보여줍니다.
// DB 컬럼 없이도 첫 기록·첫 발견이 끝나면 자동으로 사라지고, 중간에 나가면 다음 접속에 다시 이어집니다.
// 마지막에는 발견한 작은 것을 잠깐 바라볼 수 있는 마무리 카드를 보여줍니다.
let gardenTutorialPhase = "";
let gardenTutorialTimer = null;
let firstWalkGuideLayoutTimer = null;
let firstWalkGuideTravelTimer = null;
let firstWalkGuidePosition = null;
let firstWalkCompletionFoundItemId = "";
// ?tutorialPreview=intro 는 실제 기록·성장·장식을 건드리지 않는 검수 전용 산책입니다.
// 이미 오늘 기록한 계정에서도 처음부터 끝까지 확인할 수 있도록 메모리에서만 진행 상태를 가집니다.
const tutorialSandbox = { recorded: false, found: false };

// WELCOME PREVIEW v5
// ?welcomePreview=1 은 실제 카카오 계정·기록·친구·편지 DB를 읽거나 바꾸지 않는 손님맞이 전용 검수 모드입니다.
function isWelcomePreviewMode() {
  return new URL(window.location.href).searchParams.get("welcomePreview") === "1";
}

// COORDINATE-WORLD-V1: 모든 기기에서 같은 정원 구도를 쓰는 내부 기준 크기입니다.
const GARDEN_WORLD = Object.freeze({ width: 390, height: 540 });

// 발견한 작은 것은 평소에는 고정돼 있고, 꾸미기 모드에서만 사용자가 옮길 수 있습니다.
// 실제 저장 전의 위치는 별도 초안으로만 들고 있어 취소하면 바로 원래 자리로 돌아갑니다.
let gardenDecorateMode = false;
let gardenDecorateSaving = false;
let gardenDecorateDraftPositions = new Map();
let activeFoundItemDrag = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const els = {
  publicHome: $("#publicHome"),
  backToPublicHome: $("#backToPublicHome"),
  gardenStage: $("#gardenStage"),
  gardenWorld: $("#gardenWorld"),
  treeWrap: $("#treeWrap"),
  treeImage: $("#treeImage"),
  heartFruitLayer: $("#heartFruitLayer"),
  openHeartFruits: $("#openHeartFruits"),
  heartFruitCount: $("#heartFruitCount"),
  heartFruitRevealMessage: $("#heartFruitRevealMessage"),
  heartFruitCeremonyLock: $("#heartFruitCeremonyLock"),
  treeNameLabel: $("#treeNameLabel"),
  weatherButton: $("#weatherButton"),
  weatherIcon: $("#weatherIcon"),
  weatherText: $("#weatherText"),
  rainLayer: $("#rainLayer"),
  dayCount: $("#dayCount"),
  treeStageLabel: $("#treeStageLabel"),
  visitorButton: $("#visitorButton"),
  visitorImage: $("#visitorImage"),
  visitorEmoji: $("#visitorEmoji"),
  visitorName: $("#visitorName"),
  visitorHint: $("#visitorHint"),
  activeAnimal: $("#activeAnimal"),
  activeAnimalEmoji: $("#activeAnimalEmoji"),
  activeAnimalSpeech: $("#activeAnimalSpeech"),
  animalTrace: $("#animalTrace"),
  animalTraceIcon: $("#animalTraceIcon"),
  animalV2Layer: $("#animalV2Layer"),
  animalV2TraceLayer: $("#animalV2TraceLayer"),
  animalEncounterCard: $("#animalEncounterCard"),
  animalEncounterClose: $("#animalEncounterClose"),
  animalEncounterQuiet: $("#animalEncounterQuiet"),
  animalEncounterSend: $("#animalEncounterSend"),
  animalEncounterIcon: $("#animalEncounterIcon"),
  animalEncounterKicker: $("#animalEncounterKicker"),
  animalEncounterTitle: $("#animalEncounterTitle"),
  animalEncounterText: $("#animalEncounterText"),
  animalEncounterTime: $("#animalEncounterTime"),
  letterComposerTitle: $("#letterComposerTitle"),
  letterComposerFootnote: $("#letterComposerFootnote"),
  nextVisitorText: $("#nextVisitorText"),
  branchLetters: $("#branchLetters"),
  foundItemsLayer: $("#foundItemsLayer"),
  foundItemSparkle: $("#foundItemSparkle"),
  foundItemHint: $("#foundItemHint"),
  gardenDecorateControls: $("#gardenDecorateControls"),
  openGardenDecorate: $("#openGardenDecorate"),
  gardenDecorateEditActions: $("#gardenDecorateEditActions"),
  gardenDecorateGuide: $("#gardenDecorateGuide"),
  cancelGardenDecorate: $("#cancelGardenDecorate"),
  saveGardenDecorate: $("#saveGardenDecorate"),
  navLetterBadge: $("#navLetterBadge"),
  stageMessage: $("#stageMessage"),
  gardenApp: $("#gardenApp"),
  firstWalkTutorial: $("#firstWalkTutorial"),
  firstWalkTutorialTap: $("#firstWalkTutorialTap"),
  firstWalkGuideLight: $("#firstWalkGuideLight"),
  firstWalkGuideTrail: $("#firstWalkGuideTrail"),
  firstWalkTutorialLabel: $("#firstWalkTutorialLabel"),
  firstWalkTutorialCount: $("#firstWalkTutorialCount"),
  firstWalkTutorialTitle: $("#firstWalkTutorialTitle"),
  firstWalkTutorialBody: $("#firstWalkTutorialBody"),
  firstWalkTutorialHint: $("#firstWalkTutorialHint"),
  recordTutorialNote: $("#recordTutorialNote"),
  recordTutorialPreview: $("#recordTutorialPreview"),
  sheetOverlay: $("#sheetOverlay"),
  recordSheet: $("#recordSheet"),
  recordsSheet: $("#recordsSheet"),
  heartFruitSheet: $("#heartFruitSheet"),
  heartFruitSheetTitle: $("#heartFruitSheetTitle"),
  heartFruitSummary: $("#heartFruitSummary"),
  heartFruitPicker: $("#heartFruitPicker"),
  heartFruitDetail: $("#heartFruitDetail"),
  heartFruitDetailDate: $("#heartFruitDetailDate"),
  heartFruitDetailLine: $("#heartFruitDetailLine"),
  heartFruitDetailMore: $("#heartFruitDetailMore"),
  heartFruitVisibilityStatus: $("#heartFruitVisibilityStatus"),
  heartFruitVisibilityButton: $("#heartFruitVisibilityButton"),
  friendsSheet: $("#friendsSheet"),
  lettersSheet: $("#lettersSheet"),
  feedbackSheet: $("#feedbackSheet"),
  supportSheet: $("#supportSheet"),
  treeNameSheet: $("#treeNameSheet"),
  treeNameForm: $("#treeNameForm"),
  treeNameInput: $("#treeNameInput"),
  letterComposerSheet: $("#letterComposerSheet"),
  openFeedback: $("#openFeedback"),
  openSupport: $("#openSupport"),
  feedbackWriteTab: $("#feedbackWriteTab"),
  feedbackHistoryTab: $("#feedbackHistoryTab"),
  feedbackWritePanel: $("#feedbackWritePanel"),
  feedbackHistoryPanel: $("#feedbackHistoryPanel"),
  feedbackHistoryList: $("#feedbackHistoryList"),
  feedbackForm: $("#feedbackForm"),
  feedbackMessage: $("#feedbackMessage"),
  recordForm: $("#recordForm"),
  oneLine: $("#oneLine"),
  detailText: $("#detailText"),
  detailWrap: $("#detailWrap"),
  toggleDetail: $("#toggleDetail"),
  recordsSummary: $("#recordsSummary"),
  recordList: $("#recordList"),
  letterList: $("#letterList"),
  sentLetterList: $("#sentLetterList"),
  openLetterComposer: $("#openLetterComposer"),
  letterFriendHint: $("#letterFriendHint"),
  letterForm: $("#letterForm"),
  letterRecipientList: $("#letterRecipientList"),
  letterCarrierPreview: $("#letterCarrierPreview"),
  letterTitle: $("#letterTitle"),
  letterMessage: $("#letterMessage"),
  friendsList: $("#friendsList"),
  friendsTotal: $("#friendsTotal"),
  friendCount: $("#friendCount"),
  friendsOverview: $("#friendsOverview"),
  friendInvitePanel: $("#friendInvitePanel"),
  openFriendInvitePanel: $("#openFriendInvitePanel"),
  backToFriendsList: $("#backToFriendsList"),
  createInviteButton: $("#createInviteButton"),
  inviteLinkWrap: $("#inviteLinkWrap"),
  inviteLink: $("#inviteLink"),
  copyInviteLink: $("#copyInviteLink"),
  inviteExpiry: $("#inviteExpiry"),
  devTestFriendBox: $("#devTestFriendBox"),
  enableDevFriendButton: $("#enableDevFriendButton"),
  friendVisit: $("#friendVisit"),
  friendVisitStage: $("#friendVisitStage"),
  friendGardenWorld: $("#friendGardenWorld"),
  friendFoundItemsLayer: $("#friendFoundItemsLayer"),
  friendVisitName: $("#friendVisitName"),
  friendVisitTree: $("#friendVisitTree"),
  friendHeartFruitLayer: $("#friendHeartFruitLayer"),
  openFriendHeartFruits: $("#openFriendHeartFruits"),
  friendHeartFruitCount: $("#friendHeartFruitCount"),
  friendVisitDayCount: $("#friendVisitDayCount"),
  friendVisitStageLabel: $("#friendVisitStageLabel"),
  friendVisitWeatherIcon: $("#friendVisitWeatherIcon"),
  friendVisitWeatherText: $("#friendVisitWeatherText"),
  friendVisitRainLayer: $("#friendVisitRainLayer"),
  friendVisitTreeWrap: $("#friendVisitTreeWrap"),
  friendVisitMessage: $("#friendVisitMessage"),
  returnToMyGarden: $("#returnToMyGarden"),
  returnToMyGardenTop: $("#returnToMyGardenTop"),
  friendInviteModal: $("#friendInviteModal"),
  sharedTreeInviteModal: $("#sharedTreeInviteModal"),
  sharedTreeInviteFrom: $("#sharedTreeInviteFrom"),
  sharedTreeInviteTitle: $("#sharedTreeInviteTitle"),
  sharedTreeInviteBody: $("#sharedTreeInviteBody"),
  acceptSharedTreeInviteButton: $("#acceptSharedTreeInviteButton"),
  laterSharedTreeInviteButton: $("#laterSharedTreeInviteButton"),
  sharedTreeStartMoment: $("#sharedTreeStartMoment"),
  sharedTreeStartMomentTitle: $("#sharedTreeStartMomentTitle"),
  sharedTreeStartMomentBody: $("#sharedTreeStartMomentBody"),
  togetherForestView: $("#togetherForestView"),
  togetherForestFriendName: $("#togetherForestFriendName"),
  togetherForestSummary: $("#togetherForestSummary"),
  togetherForestCurrent: $("#togetherForestCurrent"),
  togetherForestCompletedList: $("#togetherForestCompletedList"),
  togetherForestCompletedCount: $("#togetherForestCompletedCount"),
  returnToFriendsFromTogetherForest: $("#returnToFriendsFromTogetherForest"),
  returnToFriendsFromTogetherForestBottom: $("#returnToFriendsFromTogetherForestBottom"),
  sharedTreeView: $("#sharedTreeView"),
  sharedTreePartnerName: $("#sharedTreePartnerName"),
  sharedTreeStageCopy: $("#sharedTreeStageCopy"),
  sharedTreeProgressCopy: $("#sharedTreeProgressCopy"),
  sharedTreeProgressCount: $("#sharedTreeProgressCount"),
  sharedTreeLifecycle: $("#sharedTreeLifecycle"),
  sharedTreeLifecycleBadge: $("#sharedTreeLifecycleBadge"),
  sharedTreeLifecycleDates: $("#sharedTreeLifecycleDates"),
  sharedTreeLeaves: $("#sharedTreeLeaves"),
  sharedTreeTodayRow: $("#sharedTreeTodayRow"),
  sharedTreeFireflies: $("#sharedTreeFireflies"),
  sharedTreeMyLight: $("#sharedTreeMyLight"),
  sharedTreePartnerLight: $("#sharedTreePartnerLight"),
  sharedTreeLightsMeet: $("#sharedTreeLightsMeet"),
  sharedTreeSeedGlow: $("#sharedTreeSeedGlow"),
  sharedTreeImage: $("#sharedTreeImage"),
  sharedTreeRecordLightButton: $("#sharedTreeRecordLightButton"),
  sharedTreeMemoryNote: $("#sharedTreeMemoryNote"),
  sharedTreeMyNoteText: $("#sharedTreeMyNoteText"),
  sharedTreePartnerNoteLabel: $("#sharedTreePartnerNoteLabel"),
  sharedTreePartnerNoteText: $("#sharedTreePartnerNoteText"),
  sharedTreeNoteForm: $("#sharedTreeNoteForm"),
  sharedTreeNoteInput: $("#sharedTreeNoteInput"),
  sharedTreeNoteCount: $("#sharedTreeNoteCount"),
  sharedTreeNoteSubmit: $("#sharedTreeNoteSubmit"),
  returnToFriendsFromSharedTree: $("#returnToFriendsFromSharedTree"),
  friendInviteFrom: $("#friendInviteFrom"),
  acceptFriendInviteButton: $("#acceptFriendInviteButton"),
  declineFriendInviteButton: $("#declineFriendInviteButton"),
  letterModal: $("#letterModal"),
  letterFrom: $("#letterFrom"),
  letterModalTitle: $("#letterModalTitle"),
  letterBody: $("#letterBody"),
  letterDelivery: $("#letterDelivery"),
  letterDate: $("#letterDate"),
  toast: $("#toast"),
  installCard: $("#installCard"),
  installAppButton: $("#installAppButton"),
  dismissInstallCard: $("#dismissInstallCard"),
  installHelp: $("#installHelp"),
  authScreen: $("#authScreen"),
  welcomePreview: $("#welcomePreview"),
  welcomePlantButton: $("#welcomePlantButton"),
  welcomeKakaoButton: $("#welcomeKakaoButton"),
  welcomeReplay: $("#welcomeReplay"),
  welcomePreviewHandoff: $("#welcomePreviewHandoff"),
  welcomeNameSheet: $("#welcomeNameSheet"),
  welcomeNameForm: $("#welcomeNameForm"),
  welcomeNameInput: $("#welcomeNameInput"),
  welcomeNameError: $("#welcomeNameError"),
  welcomeWalkLayer: $("#welcomeWalkLayer"),
  welcomeWalkIntro: $("#welcomeWalkIntro"),
  welcomeWalkTreeName: $("#welcomeWalkTreeName"),
  welcomeRecordCard: $("#welcomeRecordCard"),
  welcomeRecordLine: $("#welcomeRecordLine"),
  welcomeRecordSave: $("#welcomeRecordSave"),
  welcomeRecordPreviewNote: $("#welcomeRecordPreviewNote"),
  welcomeFirstTree: $("#welcomeFirstTree"),
  welcomeFirstFlower: $("#welcomeFirstFlower"),
  welcomeTreeBirthCopy: $("#welcomeTreeBirthCopy"),
  gardenApp: $("#gardenApp"),
  authError: $("#authError"),
  signInKakao: $("#signInKakao"),
  signOutButton: $("#signOutButton"),
  accountButton: $("#accountButton"),
  accountName: $("#accountName"),
  accountMenuSheet: $("#accountMenuSheet"),
  accountMenuName: $("#accountMenuName"),
  openInstallFromAccount: $("#openInstallFromAccount"),
  accountInstallHint: $("#accountInstallHint"),
  openFriends: $("#openFriends"),
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function pwaStorageKey(prefix) {
  return `${prefix}:${currentUser?.id || "guest"}`;
}

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIosBrowser() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
}

function isAndroidDevice() {
  return /android/i.test(window.navigator.userAgent || "");
}

function isKakaoTalkInAppBrowser() {
  return /kakaotalk/i.test(window.navigator.userAgent || "");
}

function updateInstallButtonLabel() {
  if (!els.installAppButton) return;

  const buttonLabel = isKakaoTalkInAppBrowser()
    ? (isAndroidDevice() ? "Chrome에서 열고 심기" : "Safari에서 열기")
    : "내 폰에 심기";

  els.installAppButton.textContent = buttonLabel;
  els.installAppButton.setAttribute("aria-label", buttonLabel);
}

function hasRecordBeforeToday() {
  const today = seoulDateKey();
  return Boolean(today) && state.records.some((record) => {
    const recordDay = seoulDateKey(record.createdAt);
    return recordDay && recordDay < today;
  });
}

function installLaterUntil() {
  const value = Number(window.localStorage.getItem(pwaStorageKey(PWA_INSTALL_LATER_STORAGE_PREFIX)) || 0);
  return Number.isFinite(value) ? value : 0;
}

function installMarkedComplete() {
  return window.localStorage.getItem(pwaStorageKey(PWA_INSTALL_COMPLETE_STORAGE_PREFIX)) === "1";
}

function resetInstallCardHelp() {
  installHelpVisible = false;
  els.installHelp?.classList.add("hidden");
  if (els.installHelp) els.installHelp.textContent = "";
}

function updateInstallCard() {
  if (!els.installCard) return;

  const shouldShow = Boolean(currentUser)
    && !isStandaloneApp()
    && !installMarkedComplete()
    && hasRecordBeforeToday()
    && Date.now() >= installLaterUntil();

  updateInstallButtonLabel();
  els.installCard.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) resetInstallCardHelp();
}

function dismissInstallCardForAWhile() {
  window.localStorage.setItem(
    pwaStorageKey(PWA_INSTALL_LATER_STORAGE_PREFIX),
    String(Date.now() + PWA_INSTALL_LATER_MS),
  );
  resetInstallCardHelp();
  updateInstallCard();
}

function showInstallHelp(message) {
  installHelpVisible = true;
  if (els.installHelp) {
    els.installHelp.textContent = message;
    els.installHelp.classList.remove("hidden");
  }
  // 자동 설치 카드가 숨겨진 상태에서도, 계정 메뉴에서 누른 안내는 보이도록 합니다.
  showToast(message);
}

function showIosInstallHelp() {
  showInstallHelp("Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해 주세요.");
}

function openChromeFromKakaoTalk() {
  if (!isAndroidDevice()) {
    showInstallHelp("카카오톡 안에서는 홈 화면에 심을 수 없어요. Safari에서 이 숲을 다시 열어 주세요.");
    return;
  }

  const pageUrl = new URL(window.location.href);
  const intentPath = `${pageUrl.host}${pageUrl.pathname}${pageUrl.search}`;
  const fallbackUrl = encodeURIComponent(pageUrl.href);
  const chromeIntentUrl = `intent://${intentPath}#Intent;scheme=${pageUrl.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${fallbackUrl};end`;

  window.location.href = chromeIntentUrl;

  window.setTimeout(() => {
    if (document.visibilityState === "visible") {
      showInstallHelp("Chrome이 열리지 않으면, 카카오톡을 닫은 뒤 Chrome에서 오늘의숲 링크를 다시 열어 주세요.");
    }
  }, 900);
}

async function requestAppInstall() {
  if (isStandaloneApp()) {
    showToast("이미 홈 화면에 심긴 오늘의숲을 열고 있어요.");
    return;
  }

  if (isKakaoTalkInAppBrowser()) {
    openChromeFromKakaoTalk();
    return;
  }

  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === "accepted") {
      window.localStorage.setItem(pwaStorageKey(PWA_INSTALL_COMPLETE_STORAGE_PREFIX), "1");
      updateInstallCard();
      return;
    }
    dismissInstallCardForAWhile();
    return;
  }

  if (isIosBrowser()) {
    showIosInstallHelp();
    return;
  }

  showToast("브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 눌러 주세요.");
}

function accountInstallHintText() {
  if (isStandaloneApp()) return "이미 홈 화면에 심겨 있어요.";
  if (isKakaoTalkInAppBrowser()) {
    return isAndroidDevice()
      ? "Chrome에서 열어 홈 화면에 심어요."
      : "Safari에서 열어 홈 화면에 추가해요.";
  }
  if (isIosBrowser()) return "Safari의 공유 메뉴에서 홈 화면에 추가해요.";
  return "브라우저에서 홈 화면에 추가할 수 있어요.";
}

function openAccountMenu() {
  if (!currentUser || !els.accountMenuSheet) return;
  const accountName = state.treeName || state.profileName || displayName(currentUser);
  if (els.accountMenuName) els.accountMenuName.textContent = `${accountName}의 정원`;
  if (els.accountInstallHint) els.accountInstallHint.textContent = accountInstallHintText();
  openSheet(els.accountMenuSheet);
}

async function requestAppInstallFromAccountMenu() {
  closeAllSheets();
  await requestAppInstall();
}

function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const register = () => navigator.serviceWorker.register("./sw.js", { scope: "./" })
    .catch((error) => console.warn("TodayForest PWA service worker registration skipped:", error));

  if (document.readyState === "complete") {
    void register();
  } else {
    window.addEventListener("load", () => { void register(); }, { once: true });
  }
}

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function databaseErrorMessage(error) {
  console.error("TodayForest database error:", error);
  const message = String(error?.message || "");
  if (message.includes("TODAY_RECORD_ALREADY_SAVED")) {
    return "오늘의 마음은 이미 나무에 남겼어요. 내일 다시 와요.";
  }
  if (message.includes("SPECIAL_FRIEND_AWAY")) {
    return "숲 유니콘이 아직 숲길을 지나고 있어요. 돌아오면 다시 마음을 맡길 수 있어요.";
  }
  if (message.includes("SPECIAL_FRIEND_LETTER_WAITING")) {
    return "그 친구의 나뭇가지에 아직 읽지 않은 마음이 있어요. 먼저 마음이 닿기를 기다려 주세요.";
  }
  if (message.includes("SPECIAL_FRIEND_RECIPIENT_NOT_FOUND")) {
    return "연결된 친구에게만 숲 유니콘이 마음을 전할 수 있어요.";
  }
  if (message.includes("garden_special_friend") || message.includes("special_friend")) {
    return "숲 유니콘의 편지 길을 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
  }
  if (message.includes("send_garden_letter") || message.includes("list_my_sent_garden_letters")) {
    return "편지 전달 준비를 하지 못했어요. 편지 기능 SQL 설정을 먼저 실행해 주세요.";
  }
  if (message.includes("bootstrap_my_garden_profile")) {
    return "새 정원을 준비하지 못했어요. 새 사용자 정원 보정 SQL을 먼저 실행해 주세요.";
  }
  if (message.includes("sync_my_garden_dev_animal_visits_v2") || message.includes("send_garden_letter_with_dev_animal_v2") || message.includes("garden_dev_animal_v2")) {
    return "숲친구 방문 v2 준비를 하지 못했어요. DEV 동물 방문 v2 SQL 설정을 먼저 확인해 주세요.";
  }
  if (message.includes("sync_my_garden_animal_visit") || message.includes("depart_my_garden_animal_visit") || message.includes("garden_animal_visit_states")) {
    return "숲친구 방문 준비를 하지 못했어요. 동물 방문 v1 SQL 설정을 먼저 확인해 주세요.";
  }
  if (message.includes("set_my_garden_record_visibility") || message.includes("list_my_garden_friend_fruits") || message.includes("is_public")) {
    return "마음 열매 공개 설정이 아직 준비되지 않았어요. SQL_HEART_FRUITS_V1.sql을 먼저 실행해 주세요.";
  }
  if (message.includes("garden_profiles") || message.includes("garden_records") || message.includes("garden_letters")) {
    return "내 정원 저장소가 아직 준비되지 않았어요. Supabase SQL 설정을 먼저 실행해 주세요.";
  }
  if (message.includes("garden_dev_test") || message.includes("enable_my_dev_test_friend") || message.includes("send_dev_test_garden_letter")) {
    return "테스트 새싹 준비를 하지 못했어요. DEV 테스트 친구 SQL 설정을 먼저 실행해 주세요.";
  }
  if (message.includes("SHARED_TREE_ALREADY_EXISTS")) {
    return "이 친구와는 이미 함께 키우는 나무가 있어요.";
  }
  if (message.includes("SHARED_TREE_INVITE_ALREADY_PENDING")) {
    return "이미 씨앗 제안을 기다리고 있어요.";
  }
  if (message.includes("SHARED_TREE_LIMIT_REACHED")) {
    return "함께 키우는 나무는 동시에 최대 3그루까지 만들 수 있어요.";
  }
  if (message.includes("SHARED_TREE_FRIEND_REQUIRED")) {
    return "현재 연결된 친구에게만 함께 키우는 나무를 제안할 수 있어요.";
  }
  if (message.includes("SHARED_TREE_INVITE_NOT_FOUND")) {
    return "이 씨앗 제안은 더 이상 기다리고 있지 않아요.";
  }
  if (message.includes("SHARED_TREE_LIGHT_ALREADY_RECORDED")) {
    return "오늘의 빛은 이미 이 나무에 남겼어요. 내일 다시 와요.";
  }
  if (message.includes("SHARED_TREE_LIGHT_COMPLETE")) {
    return "이 나무의 빛 조각은 이미 모두 모였어요.";
  }
  if (message.includes("SHARED_TREE_LIGHT_NOT_FOUND")) {
    return "이 함께 키우는 나무를 다시 불러와 주세요.";
  }
  if (message.includes("SHARED_TREE_NOTE_REQUIRED")) {
    return "한마디를 한 글자 이상 남겨 주세요.";
  }
  if (message.includes("SHARED_TREE_NOTE_TOO_LONG")) {
    return "한마디는 40자 안으로 남길 수 있어요.";
  }
  if (message.includes("SHARED_TREE_NOT_COMPLETED")) {
    return "완성된 나무에만 한마디를 남길 수 있어요.";
  }
  if (message.includes("upsert_my_garden_shared_tree_note") || message.includes("list_my_garden_shared_tree_notes") || message.includes("garden_shared_tree_notes")) {
    return "공유나무 한마디 저장소가 아직 준비되지 않았어요. v1.9 SQL 설정을 확인해 주세요.";
  }
  if (message.includes("setup_my_garden_retention_dev_test") || message.includes("run_my_garden_retention_dev_cleanup") || message.includes("list_my_garden_retention_dev_tests")) {
    return "오래된 편지 테스트를 준비하지 못했어요. v9 DEV 보관 정책 SQL을 먼저 실행해 주세요.";
  }
  if (message.includes("garden_friend") || message.includes("friend")) {
    return "친구 정원을 준비하지 못했어요. 친구 기능 SQL 설정을 먼저 확인해 주세요.";
  }
  return "내 정원 데이터를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

function profileNameFromUser(user) {
  return displayName(user);
}

function displayName(user) {
  const metadata = user?.user_metadata || {};
  const candidates = [
    metadata.nickname,
    metadata.preferred_username,
    metadata.full_name,
    metadata.name,
    user?.email?.split("@")[0],
  ];
  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || "새 친구";
}

async function ensureGardenProfile() {
  if (!currentUser) return null;
  const metadata = currentUser.user_metadata || {};
  const { data, error } = await supabase.rpc("bootstrap_my_garden_profile", {
    p_nickname: profileNameFromUser(currentUser),
    p_avatar_url: metadata.avatar_url || metadata.picture || null,
  });
  if (error) throw error;
  return normalizeRpcRow(data);
}

function deliveryText(kind) {
  const map = {
    little_bird: "작은 새가 전해줬어요",
    bird: "작은 새가 전해줬어요",
    squirrel: "다람쥐가 전해줬어요",
    rabbit: "토끼가 전해줬어요",
    hedgehog: "고슴도치가 전해줬어요",
    sprout_bird: "새싹새가 전해줬어요",
    swift_bird: "빠른 새가 전해줬어요",
    forest_unicorn: "숲 유니콘이 전해줬어요",
  };
  return map[kind] || "숲친구가 전해줬어요";
}

function carrierForGrowth(growth) {
  if (growth <= 2) return { kind: "little_bird", icon: "🐦", name: "작은 새" };
  if (growth <= 7) return { kind: "squirrel", icon: "🐿️", name: "다람쥐" };
  if (growth <= 17) return { kind: "sprout_bird", icon: "🕊️", name: "새싹새" };
  return { kind: "swift_bird", icon: "🕊️", name: "빠른 새" };
}

function deliveryStatus(sentLetter) {
  if (sentLetter.readAt) return "친구가 읽었어요";
  const availableAt = new Date(sentLetter.availableAt);
  if (availableAt.getTime() > Date.now()) return "새가 날아가는 중";
  return "나뭇가지에 도착";
}


function retentionTestModeFromUrl() {
  const raw = new URL(window.location.href).searchParams.get("retentionTest");
  return ["21", "wind", "31"].includes(raw) ? raw : "";
}

function retentionResetRequested() {
  return new URL(window.location.href).searchParams.get("retentionReset") === "1";
}

function retentionCleanupRequested() {
  return new URL(window.location.href).searchParams.get("retentionCleanup") === "1";
}

function clearRetentionUrlFlag(flagName) {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(flagName)) return;
  url.searchParams.delete(flagName);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function retentionDevLetterFromRow(row) {
  return {
    id: `retention-dev-${row.id}`,
    retentionTestId: Number(row.id),
    from: row.sender_name || "[DEV] 시간의 숲친구",
    title: row.title || "[DEV] 오래 기다린 마음 확인",
    body: row.body || "이 편지는 개발용 보관 정책 검수 편지예요.",
    bodyLoaded: true,
    delivery: deliveryText(row.delivery_kind),
    deliveryKind: row.delivery_kind,
    date: row.available_at || row.created_at,
    read: false,
    isRetentionTest: true,
  };
}

async function prepareRetentionTestIfRequested() {
  const mode = retentionTestModeFromUrl();
  if (!mode || !currentUser || !retentionResetRequested()) return;

  const { error } = await supabase.rpc("setup_my_garden_retention_dev_test", { p_mode: mode });
  if (error) {
    console.warn("TodayForest v9 retention test setup skipped:", error);
    return;
  }

  // 다음 새로고침은 준비된 DEV 봉투를 그대로 검수하도록 reset 표식만 지웁니다.
  clearRetentionUrlFlag("retentionReset");
}

async function loadRetentionDevLetters() {
  if (!retentionTestModeFromUrl() || !currentUser) return [];
  const { data, error } = await supabase.rpc("list_my_garden_retention_dev_tests");
  if (error) {
    console.warn("TodayForest v9 retention DEV letter load skipped:", error);
    return [];
  }
  return (data || []).map(retentionDevLetterFromRow);
}

function queueExpiredLetterReturnFromDevTests(expiredTests) {
  const returningLetters = (expiredTests || []).map(retentionDevLetterFromRow).filter(Boolean);
  if (!returningLetters.length) return;
  pendingExpiredLetterReturn = {
    count: returningLetters.length,
    letter: returningLetters[0],
  };
}

async function runRetentionDevCleanupIfRequested() {
  const mode = retentionTestModeFromUrl();
  const shouldRunWindCheck = mode === "wind";
  const shouldRun31Cleanup = mode === "31" && retentionCleanupRequested() && !retentionCleanupRanOnThisPage;
  if (!shouldRunWindCheck && !shouldRun31Cleanup) return;

  if (shouldRun31Cleanup) retentionCleanupRanOnThisPage = true;

  const { data, error } = await supabase.rpc("run_my_garden_retention_dev_cleanup", { p_mode: mode });
  if (error) {
    console.warn("TodayForest v9 retention DEV cleanup skipped:", error);
    return;
  }

  const cleanupInfo = normalizeRpcRow(data) || {};
  const expiredTests = Array.isArray(cleanupInfo.expired_tests) ? cleanupInfo.expired_tests : [];
  if (mode === "wind") queueExpiredLetterReturnFromDevTests(expiredTests);

  if (shouldRun31Cleanup) {
    clearRetentionUrlFlag("retentionCleanup");
    showToast("개발용 31일 편지를 정리했어요. 페이지를 새로고침하면 다음 방문 안내가 한 번 보여요.");
  }
}

async function consumeRetentionNextVisitNoticeIfNeeded() {
  if (!currentUser || retentionTestModeFromUrl() !== "31" || retentionCleanupRanOnThisPage) return;

  const { data, error } = await supabase.rpc("consume_my_garden_retention_dev_notices");
  if (error) {
    console.warn("TodayForest v9 retention next-visit notice skipped:", error);
    return;
  }

  const notice = normalizeRpcRow(data) || {};
  const count = Number(notice.expired_count || 0);
  if (count > 0) pendingRetentionNextVisitNoticeCount += count;
}

function playExpiredLetterReturnIfNeeded() {
  const pending = pendingExpiredLetterReturn;
  if (!pending || !els.branchLetters) return;
  pendingExpiredLetterReturn = null;

  const placement = receivedLetterPlacementForGrowth(visualGrowthForGarden());
  els.branchLetters.hidden = false;
  els.branchLetters.className = `branch-letters ${placement.className}`;
  els.branchLetters.setAttribute("aria-label", "숲으로 돌아가는 오래된 편지");

  const returning = document.createElement("span");
  returning.className = "branch-letter-return";
  returning.setAttribute("aria-hidden", "true");
  returning.innerHTML = `
    <span class="branch-letter-envelope">✉</span>
    <i class="letter-return-leaf leaf-a">🍃</i>
    <i class="letter-return-leaf leaf-b">✦</i>
    <i class="letter-return-leaf leaf-c">🍂</i>
  `;
  els.branchLetters.append(returning);

  window.requestAnimationFrame(() => returning.classList.add("is-returning"));
  window.setTimeout(() => {
    returning.remove();
    if (!getUnreadLetters().length && !els.branchLetters.querySelector(".branch-letter-return")) {
      els.branchLetters.hidden = true;
    }
  }, 1850);

  const suffix = pending.count > 1 ? "들이" : "이";
  showToast(`오래 머문 마음${suffix} 바람을 타고 숲으로 돌아갔어요.`);
}

function playRetentionNextVisitNoticeIfNeeded() {
  const count = pendingRetentionNextVisitNoticeCount;
  if (!count) return;
  pendingRetentionNextVisitNoticeCount = 0;
  const message = count === 1
    ? "오래 머문 마음 하나가 조용히 숲으로 돌아갔어요."
    : `오래 머문 마음 ${count}개가 조용히 숲으로 돌아갔어요.`;
  showToast(message);
}

function configureRetentionWindPolling() {
  if (retentionWindTimer) {
    window.clearInterval(retentionWindTimer);
    retentionWindTimer = null;
  }

  if (!currentUser || retentionTestModeFromUrl() !== "wind") return;

  // wind 검수 주소에서만 짧게 확인합니다. 일반 정원에서는 추가 정리 호출이 없습니다.
  retentionWindTimer = window.setInterval(async () => {
    if (retentionWindRefreshBusy || !currentUser || retentionTestModeFromUrl() !== "wind") return;
    retentionWindRefreshBusy = true;
    try {
      await loadGardenState();
      renderAll();
    } catch (error) {
      console.warn("TodayForest v9 retention wind refresh skipped:", error);
    } finally {
      retentionWindRefreshBusy = false;
    }
  }, 2000);
}

async function loadFoundGardenItems() {
  // DEV 전용 장식 테이블을 읽습니다. position_x / position_y가 없는 배포 순간에도
  // 기존 장식 표시가 사라지지 않도록 이전 열만 읽는 안전한 대체 경로를 둡니다.
  const positionedResult = await supabase
    .from("garden_dev_found_items")
    .select("id, record_id, item_key, placement_slot, position_x, position_y, found_at, created_at")
    .order("created_at", { ascending: true });

  if (!positionedResult.error) return positionedResult;

  const legacyResult = await supabase
    .from("garden_dev_found_items")
    .select("id, record_id, item_key, placement_slot, found_at, created_at")
    .order("created_at", { ascending: true });

  if (!legacyResult.error) {
    console.warn("TodayForest DEV found-item position columns are not ready yet:", positionedResult.error);
    return legacyResult;
  }

  return positionedResult;
}

function devSharedTreeStorageKey() {
  return currentUser ? `${DEV_SHARED_TREE_STORAGE_PREFIX}:${currentUser.id}` : "";
}

// DEV 공유나무도 실제 성장 데이터처럼 "누가 / 한국 날짜에" 빛을 남겼는지만 저장합니다.
// 테스트 친구 계정이나 실제 공유나무 DB에는 절대 쓰지 않습니다.
function normalizeDevSharedTreeLightRecords(records) {
  if (!Array.isArray(records)) return [];

  const unique = new Map();
  records.forEach((record) => {
    const userId = typeof record?.userId === "string" ? record.userId : "";
    const recordDate = typeof record?.recordDate === "string" ? record.recordDate : "";
    if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) return;
    unique.set(`${userId}:${recordDate}`, {
      userId,
      recordDate,
      createdAt: typeof record?.createdAt === "string" ? record.createdAt : null,
    });
  });

  return Array.from(unique.values())
    .sort((a, b) => String(a.createdAt || a.recordDate).localeCompare(String(b.createdAt || b.recordDate)))
    .slice(0, 20);
}

function readDevSharedTreePreview() {
  const key = devSharedTreeStorageKey();
  if (!key) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const preview = JSON.parse(raw);
    if (!preview || typeof preview !== "object" || !preview.partnerId || !preview.id) return null;
    return {
      ...preview,
      lightRecords: normalizeDevSharedTreeLightRecords(preview.lightRecords),
    };
  } catch (error) {
    console.warn("TodayForest DEV shared-tree preview read skipped:", error);
    return null;
  }
}

function saveDevSharedTreePreview(tree) {
  const key = devSharedTreeStorageKey();
  if (!key) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify({
      id: tree.id,
      partnerId: tree.partnerId,
      createdAt: tree.createdAt,
      lightRecords: normalizeDevSharedTreeLightRecords(tree.lightRecords),
    }));
    return true;
  } catch (error) {
    console.warn("TodayForest DEV shared-tree preview save skipped:", error);
    return false;
  }
}

// DEV 공유나무 화면에서 버튼을 눌렀을 때만 호출합니다.
// 개인 정원 마음 기록과는 연결하지 않습니다.
function recordDevSharedTreeLightForToday() {
  const preview = readDevSharedTreePreview();
  if (!preview || !currentUser) return false;

  const today = seoulDateKey();
  const lightRecords = normalizeDevSharedTreeLightRecords(preview.lightRecords);
  const alreadyRecorded = lightRecords.some((record) => record.userId === currentUser.id && record.recordDate === today);
  if (alreadyRecorded || lightRecords.length >= 20) return false;

  const nextPreview = {
    ...preview,
    lightRecords: [
      ...lightRecords,
      {
        userId: currentUser.id,
        recordDate: today,
        createdAt: new Date().toISOString(),
      },
    ],
  };
  return saveDevSharedTreePreview(nextPreview);
}

function mergeDevSharedTreePreview(devFriends) {
  const preview = readDevSharedTreePreview();
  if (!preview) return;

  const devFriend = (devFriends || []).find((friend) => friend.id === preview.partnerId);
  if (!devFriend) return;

  const alreadyLoaded = (state.sharedTrees || []).some((tree) => tree.partnerId === preview.partnerId);
  if (alreadyLoaded) return;

  const lightRecords = normalizeDevSharedTreeLightRecords(preview.lightRecords);
  const today = seoulDateKey();
  state.sharedTrees = [
    ...(state.sharedTrees || []),
    {
      id: preview.id,
      partnerId: preview.partnerId,
      progressCount: lightRecords.length,
      targetSteps: 20,
      createdAt: preview.createdAt || new Date().toISOString(),
      completedAt: null,
      myRecordedToday: lightRecords.some((record) => record.userId === currentUser?.id && record.recordDate === today),
      partnerRecordedToday: lightRecords.some((record) => record.userId === preview.partnerId && record.recordDate === today),
      isDevPreview: true,
    },
  ];
}

function createDevSharedTreePreview(friendId) {
  const friend = (state.friends || []).find((item) => item.id === friendId);
  if (!friend?.isDevTest) return;

  const existing = sharedTreeForFriend(friendId);
  if (existing) {
    openSharedTree(existing.id);
    return;
  }

  const tree = {
    id: `dev-shared-tree-${friendId}`,
    partnerId: friendId,
    createdAt: new Date().toISOString(),
    lightRecords: [],
  };

  if (!saveDevSharedTreePreview(tree)) {
    showToast("DEV 공유나무를 준비하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
    return;
  }

  const previewTree = {
    ...tree,
    progressCount: 0,
    targetSteps: 20,
    completedAt: null,
    myRecordedToday: false,
    partnerRecordedToday: false,
    isDevPreview: true,
  };
  state.sharedTrees = [...(state.sharedTrees || []), previewTree];
  renderAll();
  renderFriends();
  openSharedTree(previewTree.id);
  showToast(`${friend.name}와 DEV 검수용 씨앗을 함께 심었어요.`);
}

async function loadMyGardenProfile() {
  let result = await supabase
    .from("garden_profiles")
    .select("nickname, growth_count, tree_name")
    .eq("id", currentUser.id)
    .single();

  // SQL 적용 전 DEV도 기존 정원 자체는 계속 열리도록 합니다.
  if (result.error && String(result.error.message || "").includes("tree_name")) {
    result = await supabase
      .from("garden_profiles")
      .select("nickname, growth_count")
      .eq("id", currentUser.id)
      .single();
  }
  return result;
}

async function loadSpecialForestFriendLetters() {
  if (!currentUser) return { data: [], error: null };
  // 전용 SQL이 일시적으로 응답하지 않아도 기존 정원과 일반 편지는 계속 열립니다.
  return supabase.rpc("list_my_garden_special_friend_letters_v1");
}

function specialFriendDeliveryTracking(letter) {
  const now = Date.now();
  const sentAtMs = new Date(letter?.sentAt || 0).getTime();
  const availableAtMs = new Date(letter?.availableAt || 0).getTime();
  const returnAtMs = new Date(letter?.returnAt || 0).getTime();

  if (!Number.isFinite(returnAtMs) || returnAtMs <= now) {
    return { phase: "available", isActive: false, remainingMs: 0, progress: 100 };
  }

  if (Number.isFinite(availableAtMs) && availableAtMs > now) {
    const totalMs = Math.max(1, availableAtMs - sentAtMs);
    return {
      phase: "delivering",
      isActive: true,
      remainingMs: Math.max(0, availableAtMs - now),
      progress: Math.max(4, Math.min(100, ((now - sentAtMs) / totalMs) * 100)),
    };
  }

  const totalReturnMs = Math.max(1, returnAtMs - availableAtMs);
  return {
    phase: "returning",
    isActive: true,
    remainingMs: Math.max(0, returnAtMs - now),
    progress: Math.max(4, Math.min(100, ((now - availableAtMs) / totalReturnMs) * 100)),
  };
}

function activeSpecialFriendJourney(key) {
  return (state.specialFriendLetters || []).find((letter) => {
    const sameFriend = !key || letter.friendKey === key;
    return sameFriend && specialFriendDeliveryTracking(letter).isActive;
  }) || null;
}

function publishSpecialFriendJourneyState() {
  const journeys = (state.specialFriendLetters || [])
    .filter((letter) => specialFriendDeliveryTracking(letter).isActive)
    .map((letter) => ({
      key: letter.friendKey,
      recipientName: letter.to,
      sentAt: letter.sentAt,
      availableAt: letter.availableAt,
      returnAt: letter.returnAt,
      letterId: letter.id,
    }));

  window.__todayForestSpecialFriendJourneys = journeys;
  window.dispatchEvent(new CustomEvent("todayforest:special-friend-state-ready", { detail: { journeys } }));
}

async function loadMyGardenRecords() {
  let result = await supabase
    .from("garden_records")
    .select("id, mood, one_line, detail, is_public, created_at")
    .order("created_at", { ascending: false });

  if (result.error && String(result.error.message || "").includes("is_public")) {
    heartFruitVisibilityReady = false;
    result = await supabase
      .from("garden_records")
      .select("id, mood, one_line, detail, created_at")
      .order("created_at", { ascending: false });
  } else if (!result.error) {
    heartFruitVisibilityReady = true;
  }
  return result;
}

async function loadGardenState() {
  if (!currentUser) {
    state = cloneDefault();
    publishSpecialFriendJourneyState();
    return;
  }

  // v9 검수는 reset 주소에서만 DEV 봉투를 준비하며, public.garden_letters는 건드리지 않습니다.
  await prepareRetentionTestIfRequested();
  await runRetentionDevCleanupIfRequested();

  const nowIso = new Date().toISOString();
  const retentionTestActive = Boolean(retentionTestModeFromUrl());
  const [profileResult, recordsResult, foundItemsResult, lettersResult, sentLettersResult, friendsResult, sharedTreesResult, sharedTreeInvitesResult, sharedTreeNotesResult, sharedTreeStartMomentsResult, retentionDevLetters, specialFriendLettersResult] = await Promise.all([
    loadMyGardenProfile(),
    loadMyGardenRecords(),
    loadFoundGardenItems(),
    // 보관 정책 검수 주소에서는 실제 받은 편지를 아예 읽지 않습니다.
    // 그래서 DEV 봉투가 실제 친구 편지와 같은 목록이나 나뭇가지에 섞이지 않습니다.
    retentionTestActive
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("garden_letters").select("id, sender_name, title, delivery_kind, sent_at, available_at, read_at, created_at").lte("available_at", nowIso).is("read_at", null).order("available_at", { ascending: true }).limit(60),
    supabase.rpc("list_my_sent_garden_letters"),
    supabase.rpc("list_my_garden_friends"),
    supabase.rpc("list_my_garden_shared_trees"),
    supabase.rpc("list_my_garden_shared_tree_invites"),
    supabase.rpc("list_my_garden_shared_tree_notes"),
    supabase.rpc("list_my_unseen_garden_shared_tree_start_moments"),
    loadRetentionDevLetters(),
    loadSpecialForestFriendLetters(),
  ]);

  // 내 정원의 기본 정보와 기록은 핵심 데이터라서 실패를 화면에 알려야 합니다.
  if (profileResult.error) throw profileResult.error;
  if (recordsResult.error) throw recordsResult.error;

  // 작은 것 불러오기는 정원 기록과 분리합니다. 일시 오류가 있어도 기존 정원은 그대로 보여줍니다.
  if (foundItemsResult.error) console.warn("TodayForest found-item load skipped:", foundItemsResult.error);

  // 편지/친구는 각각 독립적으로 읽습니다.
  // 한 종류의 RPC가 잠시 실패해도 다른 저장 데이터를 0으로 초기화하지 않습니다.
  if (lettersResult.error) console.warn("TodayForest received-letter load skipped:", lettersResult.error);
  if (sentLettersResult.error) console.warn("TodayForest sent-letter load skipped:", sentLettersResult.error);
  if (friendsResult.error) console.warn("TodayForest friend load skipped:", friendsResult.error);
  if (sharedTreesResult.error) console.warn("TodayForest shared-tree load skipped:", sharedTreesResult.error);
  if (sharedTreeInvitesResult.error) console.warn("TodayForest shared-tree invite load skipped:", sharedTreeInvitesResult.error);
  if (sharedTreeNotesResult.error) console.warn("TodayForest shared-tree note load skipped:", sharedTreeNotesResult.error);
  if (sharedTreeStartMomentsResult.error) console.warn("TodayForest shared-tree start moment load skipped:", sharedTreeStartMomentsResult.error);
  if (specialFriendLettersResult.error) console.warn("TodayForest special-friend letter load skipped:", specialFriendLettersResult.error);

  const profile = profileResult.data;
  // 운영에서는 목록 RPC가 함께 돌려줄 수 있는 DEV 테스트 친구를 화면 데이터에서 제외합니다.
  // 실제 친구 관계와 테스트 친구를 서버에서 삭제하지 않고, 운영 UI에만 섞이지 않게 합니다.
  const realFriends = (friendsResult.data || [])
    .filter((friend) => !friend.is_dev_test)
    .map((friend) => ({
      id: friend.friend_id,
      name: friend.nickname || "친구",
      avatarUrl: friend.avatar_url || "",
      growth: Number(friend.growth_count || 0),
      becameFriendsAt: friend.became_friends_at,
      isDevTest: false,
    }));
  const friendsById = new Map();
  realFriends.forEach((friend) => {
    if (friend?.id) friendsById.set(friend.id, friend);
  });

  // 운영에서는 DEV 테스트 친구에게 보낸 편지도 일반 보낸 편지 목록에서 제외합니다.
  const realSentLetters = (sentLettersResult.data || [])
    .filter((letter) => !letter.is_dev_test)
    .map((letter) => ({
      id: letter.id,
      to: letter.recipient_name || "친구",
      title: letter.title,
      deliveryKind: letter.delivery_kind,
      sentAt: letter.sent_at,
      availableAt: letter.available_at,
      readAt: letter.read_at,
      isDevTest: false,
    }));
  const sentById = new Map();
  realSentLetters.forEach((letter) => {
    if (letter?.id) sentById.set(letter.id, letter);
  });

  // 특별친구 편지는 일반 garden_letters와 합치지 않고 화면에서만 함께 보여줍니다.
  const specialFriendRows = specialFriendLettersResult.error ? [] : (specialFriendLettersResult.data || []);
  const specialReceivedLetters = specialFriendRows
    .filter((letter) => letter.direction === "received")
    .map((letter) => ({
      id: `special-friend:${letter.id}`,
      specialLetterId: letter.id,
      isSpecialFriendLetter: true,
      specialFriendKey: letter.friend_key,
      from: letter.sender_name || "친구의 마음",
      title: letter.title || "작은 마음",
      body: null,
      bodyLoaded: false,
      delivery: deliveryText(letter.friend_key),
      deliveryKind: letter.friend_key,
      date: letter.available_at || letter.sent_at || letter.created_at,
      read: false,
    }));
  const specialSentLetters = specialFriendRows
    .filter((letter) => letter.direction === "sent")
    .map((letter) => ({
      id: letter.id,
      friendKey: letter.friend_key,
      to: letter.recipient_name || "친구",
      title: letter.title || "마음을 전해요",
      sentAt: letter.sent_at,
      availableAt: letter.available_at,
      returnAt: letter.return_at,
      readAt: letter.read_at || null,
    }));

  state = {
    growth: Number(profile?.growth_count || 0),
    profileName: profile?.nickname || profileNameFromUser(currentUser),
    treeName: profile?.tree_name || "",
    records: (recordsResult.data || []).map((record) => ({
      id: record.id,
      mood: record.mood,
      oneLine: record.one_line,
      detail: record.detail || "",
      isPublic: Boolean(record.is_public),
      createdAt: record.created_at,
    })),
    letters: [
      ...(lettersResult.data || []).map((letter) => ({
        id: letter.id,
        from: letter.sender_name || "친구의 마음",
        title: letter.title,
        // 일반 편지 본문은 봉투를 열 때 한 통만 읽습니다.
        body: null,
        bodyLoaded: false,
        delivery: deliveryText(letter.delivery_kind),
        deliveryKind: letter.delivery_kind,
        date: letter.available_at || letter.sent_at || letter.created_at,
        read: false,
      })),
      ...specialReceivedLetters,
    ],
    sentLetters: Array.from(sentById.values()).map(applyAnimalDeliveryMeta),
    specialFriendLetters: specialSentLetters,
    friends: Array.from(friendsById.values()),
    sharedTrees: (sharedTreesResult.data || []).map((tree) => ({
      id: tree.tree_id,
      partnerId: tree.partner_id,
      progressCount: Number(tree.progress_count || 0),
      targetSteps: Number(tree.target_steps || 20),
      createdAt: tree.created_at,
      completedAt: tree.completed_at || null,
      myRecordedToday: Boolean(tree.my_recorded_today),
      partnerRecordedToday: Boolean(tree.partner_recorded_today),
    })),
    sharedTreeInvites: (sharedTreeInvitesResult.data || []).map((invite) => ({
      id: invite.invite_id,
      direction: invite.direction,
      otherUserId: invite.other_user_id,
      createdAt: invite.created_at,
    })),
    sharedTreeNotes: (sharedTreeNotesResult.data || []).map((note) => ({
      treeId: note.tree_id,
      authorId: note.author_id,
      body: note.note_body || "",
      isMine: Boolean(note.is_mine),
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    })),
    sharedTreeStartMoments: (sharedTreeStartMomentsResult.data || []).map((moment) => ({
      treeId: moment.tree_id,
      partnerId: moment.partner_id,
      sceneRole: moment.scene_role === "accepted" ? "accepted" : "proposed",
      createdAt: moment.created_at,
    })),
    foundItems: (foundItemsResult.data || [])
      .filter((item) => foundItemCatalog[item.item_key])
      .map((item) => ({
        id: item.id,
        recordId: item.record_id,
        itemKey: item.item_key,
        placementSlot: item.placement_slot,
        positionX: item.position_x,
        positionY: item.position_y,
        foundAt: item.found_at || item.created_at,
      })),
  };

  // v9 보관 정책 검수 봉투도 실제 수신 편지와 분리된 DEV 전용 데이터입니다.
  if (retentionDevLetters.length) {
    const existing = new Set((state.letters || []).map((letter) => String(letter.id)));
    state.letters = [...state.letters, ...retentionDevLetters.filter((letter) => !existing.has(String(letter.id)))];
  }

  // 개발 미리보기는 실제 수신 데이터와 분리된 로컬 봉투입니다.
  mergeReceivedPreviewLetters();
  publishSpecialFriendJourneyState();
  await consumeRetentionNextVisitNoticeIfNeeded();
}

function promptForFirstTreeNameIfNeeded() {
  if (!currentUser || !isTreeNameSetupRequired()) return;
  if (treeNamePromptedForUserId === currentUser.id) return;
  treeNamePromptedForUserId = currentUser.id;
  window.setTimeout(() => {
    if (!currentUser || !isTreeNameSetupRequired()) return;
    openTreeNameSheet();
  }, 160);
}

async function hydrateGardenForCurrentUser() {
  if (!currentUser) return;
  try {
    await ensureGardenProfile();
    await loadGardenState();
    await syncMyGardenAnimalVisit({ beginWhenReady: true, silent: true });
    setAuthError("");
    configureRetentionWindPolling();

    // 카카오 로그인 뒤 처음 만든 계정만 실제 손님맞이로 보냅니다.
    // 이미 기록이나 성장이 있는 예전 사용자는 기존 정원으로 그대로 갑니다.
    if (isFirstGardenOnboardingRequired()) {
      startWelcomeOnboarding();
      return;
    }

    renderAuthUI();
    renderAll();
    restoreSharedTreeFromUrl();
    await previewFriendInviteFromUrl();
    promptForFirstTreeNameIfNeeded();
  } catch (error) {
    state = cloneDefault();
    renderAuthUI();
    renderAll();
    setAuthError(databaseErrorMessage(error));
  }
}

function openSheet(element) {
  closeAllSheets();
  els.sheetOverlay.classList.remove("hidden");
  element.classList.remove("hidden");
  window.setTimeout(() => element.querySelector("button, textarea, input")?.focus(), 60);
}

function showFriendsOverview() {
  els.friendsOverview?.classList.remove("hidden");
  els.friendInvitePanel?.classList.add("hidden");
}

function showFriendInvitePanel() {
  els.friendsOverview?.classList.add("hidden");
  els.friendInvitePanel?.classList.remove("hidden");
}

function openFriendsSheet() {
  renderFriends();
  showFriendsOverview();
  openSheet(els.friendsSheet);
}

function isTreeNameSetupRequired() {
  return Boolean(currentUser) && !String(state.treeName || "").trim();
}

// tree_name만 비어 있는 예전 사용자까지 신규 손님맞이로 보내지 않도록,
// 이름·기록·성장 모두 없는 첫 계정만 대상으로 삼습니다.
function isFirstGardenOnboardingRequired() {
  return Boolean(currentUser)
    && !String(state.treeName || "").trim()
    && Number(state.growth || 0) === 0
    && Array.isArray(state.records)
    && state.records.length === 0;
}

function closeAllSheets({ force = false } = {}) {
  const treeNameSheetIsOpen = els.treeNameSheet && !els.treeNameSheet.classList.contains("hidden");
  if (!force && treeNameSheetIsOpen && isTreeNameSetupRequired()) return;
  const wasViewingLetters = !els.lettersSheet.classList.contains("hidden");
  [els.recordSheet, els.recordsSheet, els.heartFruitSheet, els.friendsSheet, els.lettersSheet, els.feedbackSheet, els.supportSheet, els.accountMenuSheet, els.letterComposerSheet, els.treeNameSheet].filter(Boolean).forEach((sheet) => sheet.classList.add("hidden"));
  els.sheetOverlay.classList.add("hidden");
  clearSpecialForestFriendPreviewComposer();
  window.setTimeout(() => renderFirstWalkTutorial(), 0);
  // 봉투 화면을 닫을 때만 배송 도착 알림을 다음 진입 시점으로 넘기고,
  // 편지함 전용 30초 갱신도 함께 멈춥니다.
  if (wasViewingLetters) {
    clearAnimalDeliveryArrivals();
    stopLettersAutoRefresh();
  }
}

function getStage() {
  return stageRules.find((rule) => state.growth >= rule.min && state.growth <= rule.max) || stageRules.at(-1);
}

function stageForGrowth(growth) {
  return stageRules.find((rule) => growth >= rule.min && growth <= rule.max) || stageRules.at(-1);
}

function growthPreviewFromUrl() {
  // 개발 화면에서만 성장 단계별 편지 위치를 빠르게 확인하기 위한 시각 미리보기입니다.
  // ?growthPreview=0 / 7 / 21 처럼 붙여도 실제 성장 데이터는 바뀌지 않습니다.
  const raw = new URL(window.location.href).searchParams.get("growthPreview");
  const growth = Number.parseInt(raw || "", 10);
  return Number.isFinite(growth) && growth >= 0 && growth <= 999 ? growth : null;
}

function visualGrowthForGarden() {
  return growthPreviewFromUrl() ?? state.growth;
}

function clearAnimalVisitArrivalTimer() {
  if (animalVisitArrivalTimer) {
    window.clearTimeout(animalVisitArrivalTimer);
    animalVisitArrivalTimer = null;
  }
}

function animalVisitMs(value) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeAnimalV2Visit(row) {
  if (!row || typeof row !== "object") return null;
  const kind = String(row.animal_kind || row.animalKind || "");
  const visitState = String(row.visit_state || row.visitState || "");
  const habitatZone = String(row.habitat_zone || row.habitatZone || "");
  const traceKind = String(row.trace_kind || row.traceKind || "");
  if (!row.visit_id || !animalVisitors[kind]) return null;
  if (!["approaching", "visiting", "departing", "trace"].includes(visitState)) return null;
  return {
    id: String(row.visit_id),
    kind,
    habitatZone: ["branch", "ground"].includes(habitatZone) ? habitatZone : animalVisitors[kind].position,
    visitState,
    variant: String(row.visit_variant || row.visitVariant || "normal"),
    approachStartedAt: row.approach_started_at || row.approachStartedAt || null,
    arrivesAt: row.arrives_at || row.arrivesAt || null,
    arrivedAt: row.arrived_at || row.arrivedAt || null,
    leavesAt: row.leaves_at || row.leavesAt || null,
    departingAt: row.departing_at || row.departingAt || null,
    departureReason: row.departure_reason || row.departureReason || null,
    traceKind: traceKind || null,
    traceExpiresAt: row.trace_expires_at || row.traceExpiresAt || null,
  };
}

function normalizeAnimalV2Sync(data) {
  const row = normalizeRpcRow(data);
  const rawVisits = Array.isArray(row?.visits) ? row.visits : [];
  const visits = rawVisits
    .map(normalizeAnimalV2Visit)
    .filter(Boolean)
    .filter((visit) => visit.visitState !== "trace" || animalVisitMs(visit.traceExpiresAt) > Date.now());
  return {
    serverNow: row?.server_now || row?.serverNow || null,
    lastChangeAt: row?.last_change_at || row?.lastChangeAt || null,
    visits,
  };
}

function animalV2VisitsByState(...states) {
  return activeAnimalV2Visits.filter((visit) => states.includes(visit.visitState));
}

function currentAnimalV2Visit() {
  const visiting = animalV2VisitsByState("visiting");
  if (!visiting.length) return null;
  const selected = visiting.find((visit) => visit.id === selectedAnimalV2VisitId);
  return selected || visiting[0];
}

function currentAnimalVisitor() {
  const visit = currentAnimalV2Visit();
  return visit ? animalVisitors[visit.kind] || null : null;
}

function isAnimalApproaching() {
  return animalV2VisitsByState("approaching").length > 0;
}

function lastAnimalTrace() {
  const trace = animalV2VisitsByState("trace")[0];
  if (!trace) return null;
  const visitor = animalVisitors[trace.kind] || genericAnimalTrace;
  return {
    ...visitor,
    traceIcon: visitor.traceIcon || "🍃",
    traceStory: visitor.traceStory || genericAnimalTrace.traceStory,
    traceKind: trace.traceKind,
  };
}

function animalApproachMessage() {
  const count = animalV2VisitsByState("approaching").length;
  if (count >= 2) return "서로 다른 풀숲에서 작은 기척이 들려요.";
  return "풀잎과 가지 사이에서 작은 기척이 들려요.";
}

function animalIdleMessage() {
  return "정원을 보고 있으면 숲친구들이 자유롭게 찾아와요.";
}

function animalGrowthMessage() {
  if (state.growth <= 6) return "작은 나무에도 숲친구들이 자유롭게 드나들어요.";
  if (state.growth <= 13) return "나무가 자라며 빠른 숲친구를 조금 더 자주 만날 수 있어요.";
  if (state.growth <= 20) return "가끔 두 숲친구가 함께 머무는 장면을 만날 수 있어요.";
  if (state.growth <= 29) return "풍성한 숲에는 빛나는 작은 방문이 더해져요.";
  return "완성된 숲에는 빠르고 특별한 숲친구가 가끔 찾아와요.";
}

function animalV2TimingCandidates() {
  const targets = [];
  activeAnimalV2Visits.forEach((visit) => {
    if (visit.visitState === "approaching") targets.push(animalVisitMs(visit.arrivesAt));
    if (visit.visitState === "visiting") targets.push(animalVisitMs(visit.leavesAt));
    if (visit.visitState === "departing") targets.push(animalVisitMs(visit.departingAt) + 1600);
    if (visit.visitState === "trace") targets.push(animalVisitMs(visit.traceExpiresAt));
  });
  return targets.filter((time) => time > Date.now());
}

function scheduleAnimalVisitRefresh() {
  clearAnimalVisitArrivalTimer();
  if (!currentUser || document.hidden) return;
  const targets = animalV2TimingCandidates();
  if (!targets.length) return;
  const nextAt = Math.min(...targets);
  const wait = nextAt - Date.now();
  if (wait > 0 && wait <= 6 * 60 * 60 * 1000) {
    animalVisitArrivalTimer = window.setTimeout(() => {
      void syncMyGardenAnimalVisit({ silent: true, rerender: true });
    }, Math.max(150, wait + 150));
  }
}

function reconcileAnimalV2Selection() {
  const visiting = animalV2VisitsByState("visiting");
  if (!visiting.some((visit) => visit.id === selectedAnimalV2VisitId)) {
    selectedAnimalV2VisitId = visiting[0]?.id || "";
  }
  if (animalEncounterVisitId && !visiting.some((visit) => visit.id === animalEncounterVisitId)) {
    closeAnimalEncounterCard();
  }
}

async function syncMyGardenAnimalVisit({ silent = false, rerender = false } = {}) {
  if (!currentUser || animalVisitSyncBusy || document.hidden) return activeAnimalV2Visits;

  animalVisitSyncBusy = true;
  try {
    const { data, error } = await supabase.rpc("sync_my_garden_dev_animal_visits_v2");
    if (error) throw error;

    const synced = normalizeAnimalV2Sync(data);
    activeAnimalV2Visits = synced.visits;
    window.dispatchEvent(new CustomEvent("todayforest:animal-visits-updated", {
      detail: { visits: activeAnimalV2Visits.map((visit) => ({ ...visit })) },
    }));
    reconcileAnimalV2Selection();
    scheduleAnimalVisitRefresh();
    if (rerender) renderAll();
    return activeAnimalV2Visits;
  } catch (error) {
    console.warn("TodayForest DEV animal v2 sync skipped:", error);
    if (!silent) showToast("숲친구 방문 소식을 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요.");
    return activeAnimalV2Visits;
  } finally {
    animalVisitSyncBusy = false;
  }
}

function animalV2MoodLine(kind) {
  const lines = {
    bird: "가지를 살짝 고르며 당신을 바라보고 있어요.",
    rabbit: "풀잎 사이에서 귀를 쫑긋 세우고 있어요.",
    squirrel: "나무 곁에서 작은 발을 멈췄어요.",
    hedgehog: "낙엽 사이에서 조용히 숨을 고르고 있어요.",
  };
  return lines[kind] || "숲길을 걷다 잠시 쉬어가고 있어요.";
}

function animalV2DeliveryLine(animal) {
  const mood = animal?.deliveryHours <= 2
    ? "빠르게 전해줘요"
    : animal?.deliveryHours <= 6
      ? "가벼운 발걸음으로 전해줘요"
      : animal?.deliveryHours <= 12
        ? "숲길을 따라 전해줘요"
        : "천천히 정성껏 전해줘요";
  return `${mood} · 약 ${animal?.deliveryHours || 0}시간`;
}

function closeAnimalEncounterCard({ notifySpecialFriend = true } = {}) {
  const specialFriend = activeSpecialForestFriendEncounter();
  animalEncounterVisitId = "";
  activeSpecialForestFriendEncounterKey = "";
  if (els.animalEncounterCard) {
    els.animalEncounterCard.hidden = true;
    delete els.animalEncounterCard.dataset.animalKind;
    delete els.animalEncounterCard.dataset.specialFriend;
  }
  if (specialFriend && notifySpecialFriend) {
    window.dispatchEvent(new CustomEvent("todayforest:special-friend-encounter-close", {
      detail: { key: specialFriend.key },
    }));
  }
}

function openSpecialForestFriendEncounter(key) {
  const carrier = specialForestFriendPreviewCatalog[key];
  if (!carrier || !els.animalEncounterCard) return;

  closeAnimalEncounterCard({ notifySpecialFriend: false });
  activeSpecialForestFriendEncounterKey = carrier.key;

  if (els.animalEncounterIcon) els.animalEncounterIcon.textContent = carrier.icon;
  if (els.animalEncounterKicker) els.animalEncounterKicker.textContent = "숲에서 만난 특별한 친구";
  if (els.animalEncounterTitle) els.animalEncounterTitle.textContent = `${carrier.name}이 당신을 바라봐요.`;
  if (els.animalEncounterText) els.animalEncounterText.textContent = carrier.encounterText;
  if (els.animalEncounterTime) els.animalEncounterTime.textContent = "이 숲에 머무는 동안 바로 편지를 맡길 수 있어요.";
  if (els.animalEncounterSend) {
    els.animalEncounterSend.textContent = `${carrier.name}에게 편지 맡기기`;
    els.animalEncounterSend.disabled = false;
  }

  els.animalEncounterCard.dataset.specialFriend = carrier.key;
  els.animalEncounterCard.hidden = false;
}

function openEncounterLetterComposer() {
  const specialFriend = activeSpecialForestFriendEncounter();
  if (specialFriend) {
    closeAnimalEncounterCard({ notifySpecialFriend: false });
    openSpecialForestFriendPreviewComposer(specialFriend.key);
    return;
  }
  openAnimalLetterComposer();
}

function openAnimalEncounterForVisit(visitId) {
  const visit = animalV2VisitsByState("visiting").find((item) => item.id === visitId);
  const animal = visit ? animalVisitors[visit.kind] : null;
  if (!visit || !animal) {
    showToast("그 숲친구는 이미 숲길을 따라 떠났어요.");
    closeAnimalEncounterCard();
    return;
  }

  selectedAnimalV2VisitId = visit.id;
  animalEncounterVisitId = visit.id;
  if (els.animalEncounterIcon) els.animalEncounterIcon.textContent = animal.icon;
  if (els.animalEncounterKicker) els.animalEncounterKicker.textContent = "숲에서 만난 친구";
  if (els.animalEncounterTitle) els.animalEncounterTitle.textContent = `${animal.name}가 당신을 바라보고 있어요.`;
  if (els.animalEncounterText) els.animalEncounterText.textContent = animalV2MoodLine(animal.kind);
  if (els.animalEncounterTime) els.animalEncounterTime.textContent = animalV2DeliveryLine(animal);
  if (els.animalEncounterSend) {
    els.animalEncounterSend.textContent = "편지 맡기기";
    els.animalEncounterSend.disabled = false;
  }
  if (els.animalEncounterCard) {
    // 카드가 정원을 덮지 않도록 세계 안의 빈 하늘 위치에서 작게 보입니다.
    els.animalEncounterCard.dataset.animalKind = animal.kind;
    els.animalEncounterCard.hidden = false;
  }
}

function openAnimalLetterComposer() {
  const visit = currentAnimalV2Visit();
  const animal = currentAnimalVisitor();
  if (!visit || !animal) {
    if (isAnimalApproaching()) showToast("풀잎 사이의 기척이 조금 더 가까워지고 있어요.");
    else showToast("지금은 정원을 조용히 둘러보고 있어요.");
    return;
  }
  if (!(state.friends || []).length) {
    showToast("친구와 연결되면 숲친구에게 편지를 맡길 수 있어요.");
    return;
  }
  closeAnimalEncounterCard();
  renderLetterComposer();
  openSheet(els.letterComposerSheet);
}

function leaveAnimalWithLetter(animal, visitId) {
  if (!animal || !visitId) return Promise.resolve();
  const animalButton = els.animalV2Layer?.querySelector(`[data-animal-v2-visit="${CSS.escape(String(visitId))}"]`);
  if (animalButton) {
    animalButton.classList.add("is-departing", "is-letter-departing");
    animalButton.setAttribute("aria-label", `${animal.name}가 편지를 품고 출발하는 중`);
  }
  return new Promise((resolve) => {
    window.clearTimeout(animalDepartureTimer);
    animalDepartureTimer = window.setTimeout(resolve, 1050);
  });
}

function v2TraceMeta(visit) {
  const visitor = animalVisitors[visit.kind] || genericAnimalTrace;
  const icons = {
    feather: "🪶",
    footprints: "〰️",
    acorn_shell: "🌰",
    ruffled_leaves: "🍂",
  };
  return {
    icon: icons[visit.traceKind] || visitor.traceIcon || "🍃",
    story: visitor.traceStory || genericAnimalTrace.traceStory,
    sceneClass: visitor.sceneClass || "generic",
  };
}

function renderAnimalV2Scene() {
  if (!els.animalV2Layer || !els.animalV2TraceLayer) return;

  const allApproaching = animalV2VisitsByState("approaching");
  const allActive = animalV2VisitsByState("visiting", "departing");
  const traces = animalV2VisitsByState("trace");
  // 한 번에 한 마리만 보여주고, 겹친 다음 방문은 숲길의 기척으로만 남깁니다.
  const active = allActive.slice(0, 1);
  const approaching = active.length ? [] : allApproaching.slice(0, 1);
  const waitingCount = Math.max(0, allActive.length + allApproaching.length - active.length - approaching.length);

  els.animalV2Layer.innerHTML = [
    ...approaching.map((visit) => `
      <span class="animal-v2-approach approach-${escapeAttr(visit.kind)}" aria-label="${escapeAttr(`${animalVisitors[visit.kind]?.name || "숲친구"}가 다가오는 기척`)}"></span>
    `),
    ...active.map((visit) => {
      const animal = animalVisitors[visit.kind];
      if (!animal) return "";
      const isDeparting = visit.visitState === "departing";
      const isArriving = visit.visitState === "visiting"
        && animalVisitMs(visit.arrivedAt) > 0
        && Date.now() - animalVisitMs(visit.arrivedAt) < 4500;
      const classes = [
        "animal-v2-visitor",
        `animal-v2-${animal.sceneClass}`,
        isDeparting ? "is-departing" : "",
        visit.departureReason === "letter" ? "is-letter-departing" : "",
        isArriving ? "is-arriving" : "",
      ].filter(Boolean).join(" ");
      const aria = isDeparting
        ? `${animal.name}가 숲길을 따라 떠나는 중`
        : `${animal.name}에게 편지 맡기기`;
      return `
        <button class="${classes}" type="button" data-animal-v2-visit="${escapeAttr(visit.id)}" aria-label="${escapeAttr(aria)}" ${isDeparting ? "disabled" : ""}>
          <span class="animal-v2-emoji" aria-hidden="true">${animal.icon}</span>
          ${isDeparting ? "" : '<span class="animal-v2-envelope" aria-hidden="true">✉</span>'}
          ${visit.variant === "glimmer" ? '<span class="animal-v2-glimmer" aria-hidden="true">✦</span>' : ""}
        </button>
      `;
    }),
  ].join("");

  els.animalV2TraceLayer.innerHTML = traces.map((visit) => {
    const trace = v2TraceMeta(visit);
    return `
      <button class="animal-v2-trace trace-${escapeAttr(trace.sceneClass)}" type="button" data-animal-v2-trace="${escapeAttr(visit.id)}" aria-label="${escapeAttr(`${animalVisitors[visit.kind]?.name || "숲친구"}가 남긴 흔적 보기`)}">
        <span aria-hidden="true">${trace.icon}</span>
      </button>
    `;
  }).join("");

  els.animalV2Layer.hidden = !(approaching.length || active.length);
  els.animalV2TraceLayer.hidden = !traces.length;
  if (els.gardenWorld) {
    els.gardenWorld.classList.toggle("is-animal-v2-approaching", approaching.length > 0);
    els.gardenWorld.classList.toggle("is-animal-v2-waiting", waitingCount > 0);
  }
}

function handleAnimalV2LayerClick(event) {
  const button = event.target.closest("[data-animal-v2-visit]");
  if (!button || !els.animalV2Layer?.contains(button) || button.disabled) return;
  openAnimalEncounterForVisit(button.dataset.animalV2Visit);
}

function handleAnimalV2TraceClick(event) {
  const button = event.target.closest("[data-animal-v2-trace]");
  if (!button || !els.animalV2TraceLayer?.contains(button)) return;
  const visit = animalV2VisitsByState("trace").find((item) => item.id === button.dataset.animalV2Trace);
  if (!visit) return;
  showToast(v2TraceMeta(visit).story);
}

function animalDeliveryStorageKey() {
  return `${ANIMAL_DELIVERY_STORAGE_PREFIX}:${currentUser?.id || "guest"}`;
}

function readAnimalDeliveryMeta() {
  try {
    const raw = window.localStorage.getItem(animalDeliveryStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("TodayForest animal delivery metadata read skipped:", error);
    return {};
  }
}

function saveAnimalDeliveryMeta(next) {
  try {
    window.localStorage.setItem(animalDeliveryStorageKey(), JSON.stringify(next));
  } catch (error) {
    console.warn("TodayForest animal delivery metadata save skipped:", error);
  }
}

function animalDeliveryQueueStorageKey() {
  return `${ANIMAL_DELIVERY_QUEUE_STORAGE_PREFIX}:${currentUser?.id || "guest"}`;
}

function readAnimalDeliveryQueue() {
  try {
    const raw = window.localStorage.getItem(animalDeliveryQueueStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("TodayForest animal delivery queue read skipped:", error);
    return [];
  }
}

function saveAnimalDeliveryQueue(nextQueue) {
  try {
    window.localStorage.setItem(animalDeliveryQueueStorageKey(), JSON.stringify(nextQueue));
  } catch (error) {
    console.warn("TodayForest animal delivery queue save skipped:", error);
  }
}

function animalDeliveryArrivalStorageKey() {
  return `${ANIMAL_DELIVERY_ARRIVAL_STORAGE_PREFIX}:${currentUser?.id || "guest"}`;
}

function readAnimalDeliveryArrivals() {
  try {
    const raw = window.localStorage.getItem(animalDeliveryArrivalStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const valid = Array.isArray(parsed)
      ? parsed.filter((item) => {
        const arrivedAt = new Date(item?.arrivedAt || item?.availableAt || 0).getTime();
        return item?.localId && animalVisitors[item?.kind] && Number.isFinite(arrivedAt) && now - arrivedAt < 48 * 60 * 60 * 1000;
      })
      : [];
    if (Array.isArray(parsed) && valid.length !== parsed.length) {
      window.localStorage.setItem(animalDeliveryArrivalStorageKey(), JSON.stringify(valid));
    }
    return valid;
  } catch (error) {
    console.warn("TodayForest delivery arrival read skipped:", error);
    return [];
  }
}

function saveAnimalDeliveryArrivals(nextArrivals) {
  try {
    window.localStorage.setItem(animalDeliveryArrivalStorageKey(), JSON.stringify(nextArrivals.slice(0, 20)));
  } catch (error) {
    console.warn("TodayForest delivery arrival save skipped:", error);
  }
}

function rememberAnimalDeliveryArrival(item) {
  if (!item?.localId || !animalVisitors[item?.kind]) return;
  const arrivals = readAnimalDeliveryArrivals();
  const alreadyAdded = arrivals.some((arrival) => arrival.localId === item.localId || (item.remoteId && arrival.remoteId === item.remoteId));
  if (alreadyAdded) return;
  arrivals.unshift({ ...item, arrivedAt: new Date().toISOString() });
  saveAnimalDeliveryArrivals(arrivals);
}

function clearAnimalDeliveryArrivals() {
  try {
    window.localStorage.removeItem(animalDeliveryArrivalStorageKey());
  } catch (error) {
    console.warn("TodayForest delivery arrival clear skipped:", error);
  }
}

function animalDeliveryArrivalNotices() {
  return readAnimalDeliveryArrivals().map((item) => ({
    id: `animal-arrival:${item.localId}`,
    to: item.to || "친구",
    title: item.title || "마음을 전해요",
    deliveryKind: item.kind,
    sentAt: item.sentAt,
    availableAt: item.availableAt,
    actualDeliveryHours: Number(item.deliveryHours || 0) || null,
    hasAnimalTracking: true,
    isDevTest: Boolean(item.isDevTest),
    isAnimalArrivalNotice: true,
    animalDeliveryMeta: {
      kind: item.kind,
      sentAt: item.sentAt,
      availableAt: item.availableAt,
      deliveryHours: item.deliveryHours,
      rememberedAt: item.rememberedAt,
    },
  }));
}

function rememberAnimalDelivery(letterId, animal, sentAt, availableAt, snapshot = {}) {
  if (!animal) return;

  // 기존 보조 메타는 실제 DB 편지 id가 즉시 내려오는 경우를 위해 그대로 남깁니다.
  if (letterId) {
    const deliveries = readAnimalDeliveryMeta();
    deliveries[String(letterId)] = {
      kind: animal.kind,
      sentAt,
      availableAt,
      deliveryHours: animal.deliveryHours,
      rememberedAt: new Date().toISOString(),
    };
    const kept = Object.entries(deliveries)
      .sort(([, a], [, b]) => new Date(b?.rememberedAt || 0) - new Date(a?.rememberedAt || 0))
      .slice(0, 80);
    saveAnimalDeliveryMeta(Object.fromEntries(kept));
  }

  // RPC 재조회가 빨라 기존 보낸 편지 목록을 덮어써도, 배송 중 카드는 사라지지 않도록
  // 현재 브라우저에 별도의 '배송 중 임시 목록'을 보관합니다.
  const now = new Date().toISOString();
  const queue = readAnimalDeliveryQueue()
    .filter((item) => {
      const createdAt = new Date(item?.rememberedAt || item?.sentAt || 0).getTime();
      return Number.isFinite(createdAt) && Date.now() - createdAt < 48 * 60 * 60 * 1000;
    });

  const localId = `${letterId || "local"}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  queue.unshift({
    localId,
    remoteId: letterId || "",
    kind: animal.kind,
    sentAt,
    availableAt,
    deliveryHours: animal.deliveryHours,
    rememberedAt: now,
    to: snapshot.to || "친구",
    title: snapshot.title || "마음을 전해요",
    isDevTest: Boolean(snapshot.isDevTest),
  });
  saveAnimalDeliveryQueue(queue.slice(0, 40));
}

function queuedAnimalDeliveryLetters() {
  const now = Date.now();
  const validQueue = readAnimalDeliveryQueue().filter((item) => {
    if (!item?.localId || !animalVisitors[item.kind]) return false;
    const createdAt = new Date(item.rememberedAt || item.sentAt || 0).getTime();
    return Number.isFinite(createdAt) && now - createdAt < 48 * 60 * 60 * 1000;
  });

  // 도착한 편지는 보낸 편지함으로 쌓지 않습니다.
  // 다음에 편지 화면을 열었을 때만 '도착 완료' 장면으로 짧게 보여준 뒤 사라집니다.
  const inTransit = validQueue.filter((item) => {
    const isInTransit = new Date(item.availableAt || 0).getTime() > now;
    if (!isInTransit) rememberAnimalDeliveryArrival(item);
    return isInTransit;
  });
  if (inTransit.length !== validQueue.length) saveAnimalDeliveryQueue(inTransit);

  return inTransit.map((item) => ({
    id: `animal-local:${item.localId}`,
    to: item.to || "친구",
    title: item.title || "마음을 전해요",
    deliveryKind: item.kind,
    sentAt: item.sentAt,
    availableAt: item.availableAt,
    actualDeliveryHours: Number(item.deliveryHours || 0) || null,
    hasAnimalTracking: true,
    readAt: null,
    isDevTest: Boolean(item.isDevTest),
    isLocalAnimalDelivery: true,
    animalDeliveryMeta: {
      kind: item.kind,
      sentAt: item.sentAt,
      availableAt: item.availableAt,
      deliveryHours: item.deliveryHours,
      rememberedAt: item.rememberedAt,
    },
  }));
}

function isSameAnimalDeliveryLetter(letter, queuedLetter) {
  const sameRecipient = String(letter?.to || "") === String(queuedLetter?.to || "");
  const sameTitle = String(letter?.title || "") === String(queuedLetter?.title || "");
  const left = new Date(letter?.sentAt || 0).getTime();
  const right = new Date(queuedLetter?.sentAt || 0).getTime();
  const closeInTime = Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 2 * 60 * 1000;
  return sameRecipient && sameTitle && closeInTime;
}

function animalDeliveryMetaFor(letter) {
  const localMeta = letter?.animalDeliveryMeta;
  if (localMeta && animalVisitors[localMeta.kind]) return localMeta;
  if (!letter?.id) return null;
  const meta = readAnimalDeliveryMeta()[String(letter.id)];
  if (!meta || !animalVisitors[meta.kind]) return null;
  return meta;
}

function applyAnimalDeliveryMeta(letter) {
  const meta = animalDeliveryMetaFor(letter);
  if (!meta) return letter;
  return {
    ...letter,
    deliveryKind: meta.kind,
    sentAt: meta.sentAt || letter.sentAt,
    availableAt: meta.availableAt || letter.availableAt,
    actualDeliveryHours: Number(meta.deliveryHours || 0) || null,
    hasAnimalTracking: true,
  };
}

function formatDeliveryCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function animalDeliveryStory(animal) {
  const copy = {
    bird: "작은 새가 구름 사이를 가볍게 날고 있어요.",
    squirrel: "다람쥐가 나무 사이 숲길을 달리고 있어요.",
    rabbit: "토끼가 풀숲 사이를 조심히 뛰고 있어요.",
    hedgehog: "고슴도치가 천천히 숲길을 걷고 있어요.",
  };
  return copy[animal?.kind] || "숲친구가 편지를 품고 길을 가고 있어요.";
}

function animalDeliveryTracking(letter) {
  const meta = animalDeliveryMetaFor(letter);
  const carrier = meta ? animalVisitors[meta.kind] : carrierForKind(letter.deliveryKind);
  const sentAtMs = new Date(meta?.sentAt || letter.sentAt || Date.now()).getTime();
  const availableAtMs = new Date(meta?.availableAt || letter.availableAt || Date.now()).getTime();
  const now = Date.now();
  const totalMs = Math.max(1, availableAtMs - sentAtMs);
  const remainingMs = Math.max(0, availableAtMs - now);
  const progress = Math.max(4, Math.min(100, ((now - sentAtMs) / totalMs) * 100));
  return {
    meta,
    carrier,
    isInTransit: availableAtMs > now,
    remainingMs,
    progress,
  };
}

function getUnreadLetters() {
  return state.letters.filter((letter) => !letter.read);
}

function receivedPreviewCountFromUrl() {
  const raw = new URL(window.location.href).searchParams.get("receivedPreview");
  const count = Number.parseInt(raw || "0", 10);
  return Number.isFinite(count) ? Math.max(0, Math.min(6, count)) : 0;
}

function receivedPreviewStorageKey() {
  return `${RECEIVED_LETTER_PREVIEW_STORAGE_PREFIX}:${currentUser?.id || "guest"}:${seoulDateKey()}`;
}

function readReceivedPreviewDismissedIds() {
  try {
    const raw = window.localStorage.getItem(receivedPreviewStorageKey());
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch (error) {
    console.warn("TodayForest received preview read skipped:", error);
    return [];
  }
}

function dismissReceivedPreview(letterId) {
  try {
    const dismissed = new Set(readReceivedPreviewDismissedIds());
    dismissed.add(String(letterId));
    window.localStorage.setItem(receivedPreviewStorageKey(), JSON.stringify([...dismissed]));
  } catch (error) {
    console.warn("TodayForest received preview dismiss skipped:", error);
  }
}

function receivedPreviewLetters() {
  const count = receivedPreviewCountFromUrl();
  if (!count) return [];

  const dismissed = new Set(readReceivedPreviewDismissedIds());
  const templates = [
    { from: "테스트 새싹", title: "오늘도 수고했어", body: "오늘도 네 나무에 마음을 남겼다는 이야기를 들었어. 천천히 쉬어가도 괜찮아.", delivery: "다람쥐가 전해줬어요", hoursAgo: 72 },
    { from: "화이팅!", title: "작은 응원을 두고 갈게", body: "오늘이 조금 무거웠다면, 이 편지가 잠깐 쉬어갈 자리가 되었으면 좋겠어.", delivery: "작은 새가 전해줬어요", hoursAgo: 48 },
    { from: "숲친구", title: "비가 그치면", body: "비가 오는 날에도 네 나무는 잘 자라고 있을 거야. 오늘도 잘 버텼어.", delivery: "고슴도치가 전해줬어요", hoursAgo: 24 },
    { from: "민들레", title: "네가 생각났어", body: "바람이 불어서 네 정원에도 작은 인사를 남기고 싶었어.", delivery: "토끼가 전해줬어요", hoursAgo: 12 },
    { from: "봄날", title: "조용한 안부", body: "크게 말하지 않아도 마음은 전해진다고 믿어. 오늘도 좋은 밤 보내.", delivery: "작은 새가 전해줬어요", hoursAgo: 6 },
    { from: "초록빛", title: "나무가 자라는 날", body: "네가 남긴 마음이 모여서 숲이 더 따뜻해지는 것 같아.", delivery: "다람쥐가 전해줬어요", hoursAgo: 2 },
  ];

  return templates.slice(0, count).map((template, index) => {
    const id = `preview-received-${index + 1}`;
    return {
      id,
      ...template,
      date: new Date(Date.now() - template.hoursAgo * 60 * 60 * 1000).toISOString(),
      read: false,
      isPreview: true,
    };
  }).filter((letter) => !dismissed.has(letter.id));
}

function mergeReceivedPreviewLetters() {
  const previewLetters = receivedPreviewLetters();
  if (!previewLetters.length) return;
  const existing = new Set((state.letters || []).map((letter) => String(letter.id)));
  state.letters = [...(state.letters || []), ...previewLetters.filter((letter) => !existing.has(String(letter.id)))];
}

function relativeArrivalText(date) {
  const milliseconds = Date.now() - new Date(date).getTime();
  const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(days) || days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

function isWaitingLetter(letter) {
  const milliseconds = Date.now() - new Date(letter.date).getTime();
  return Number.isFinite(milliseconds) && milliseconds >= 21 * 24 * 60 * 60 * 1000;
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "기록한 날";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function formatShortDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "며칠 동안";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function seoulDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const valueFor = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
}

function hasSavedToday() {
  const today = seoulDateKey();
  return Boolean(today) && state.records.some((record) => seoulDateKey(record.createdAt) === today);
}

function todayGardenRecord() {
  const today = seoulDateKey();
  return state.records.find((record) => seoulDateKey(record.createdAt) === today) || null;
}

function foundItemForRecord(recordId) {
  return (state.foundItems || []).find((item) => item.recordId === recordId) || null;
}

function canDiscoverFoundItem() {
  // 첫날 튜토리얼 미리보기는 실제 기록·장식 DB와 분리된 한 번의 가상 발견만 보여줍니다.
  if (isTutorialSandboxPreview()) return tutorialSandbox.recorded && !tutorialSandbox.found;

  const todayRecord = todayGardenRecord();
  // 장식 수나 이미 가진 종류가 아니라, 오늘 기록에 아직 장식이 연결되지 않았는지만 봅니다.
  // 하루 1개 제한은 Supabase의 record_id UNIQUE 제약이 계속 지킵니다.
  return Boolean(todayRecord && !foundItemForRecord(todayRecord.id));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundedFoundItemPosition(value) {
  return Number(Number(value).toFixed(3));
}

function syncGardenWorldScale() {
  const stageRect = els.gardenStage?.getBoundingClientRect();
  const world = els.gardenWorld;
  if (!world || !stageRect?.width || !stageRect?.height) return;

  const scale = Math.min(
    stageRect.width / GARDEN_WORLD.width,
    stageRect.height / GARDEN_WORLD.height
  );
  world.style.setProperty("--garden-world-scale", String(Number(scale.toFixed(5))));
}

function setupGardenWorldSizing() {
  if (!els.gardenStage || !els.gardenWorld) return;
  syncGardenWorldScale();

  if ("ResizeObserver" in window) {
    gardenWorldResizeObserver?.disconnect();
    gardenWorldResizeObserver = new ResizeObserver(() => syncGardenWorldScale());
    gardenWorldResizeObserver.observe(els.gardenStage);
  }
  window.addEventListener("resize", syncGardenWorldScale, { passive: true });
  window.addEventListener("resize", () => {
    if (["intro", "record", "discovery", "complete"].includes(gardenTutorialPhase)) {
      positionFirstWalkGuide(gardenTutorialPhase, { animate: false });
    }
  }, { passive: true });
}

// 친구 정원도 내 정원과 같은 390×540 기준을 사용해야, 친구가 꾸민 실제 위치가 기기마다 어긋나지 않습니다.
function syncFriendGardenWorldScale() {
  const stageRect = els.friendVisitStage?.getBoundingClientRect();
  const world = els.friendGardenWorld;
  if (!world || !stageRect?.width || !stageRect?.height) return;

  const scale = Math.min(
    stageRect.width / GARDEN_WORLD.width,
    stageRect.height / GARDEN_WORLD.height
  );
  world.style.setProperty("--garden-world-scale", String(Number(scale.toFixed(5))));
}

function setupFriendGardenWorldSizing() {
  if (!els.friendVisitStage || !els.friendGardenWorld) return;

  if ("ResizeObserver" in window) {
    friendGardenWorldResizeObserver?.disconnect();
    friendGardenWorldResizeObserver = new ResizeObserver(() => syncFriendGardenWorldScale());
    friendGardenWorldResizeObserver.observe(els.friendVisitStage);
  }
  window.addEventListener("resize", syncFriendGardenWorldScale, { passive: true });
}

function gardenWorldPositionForFoundItemElement(element) {
  const worldRect = els.gardenWorld?.getBoundingClientRect();
  const itemRect = element?.getBoundingClientRect();
  if (!worldRect?.width || !worldRect?.height || !itemRect) return null;

  return {
    x: clamp(roundedFoundItemPosition(((itemRect.left + (itemRect.width / 2) - worldRect.left) / worldRect.width) * 100), 0, 100),
    y: clamp(roundedFoundItemPosition(((itemRect.top - worldRect.top) / worldRect.height) * 100), 0, 100),
  };
}

function savedFoundItemPosition(item) {
  const x = Number(item?.positionX);
  const y = Number(item?.positionY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: clamp(roundedFoundItemPosition(x), 0, 100),
    y: clamp(roundedFoundItemPosition(y), 0, 100),
  };
}

function foundItemDisplayPosition(item) {
  if (gardenDecorateMode && gardenDecorateDraftPositions.has(item.id)) {
    return gardenDecorateDraftPositions.get(item.id);
  }
  return savedFoundItemPosition(item);
}

function foundItemPositionStyle(item) {
  const position = foundItemDisplayPosition(item);
  if (!position) return "";
  return ` style="--found-item-x:${position.x}%; --found-item-y:${position.y}%;"`;
}

function renderGardenDecorateControls(foundItems) {
  const hasFoundItems = foundItems.length > 0;
  if (!els.gardenDecorateControls) return;

  els.gardenDecorateControls.hidden = !hasFoundItems;
  els.gardenStage?.classList.toggle("is-garden-decorating", gardenDecorateMode && hasFoundItems);
  els.foundItemsLayer?.classList.toggle("is-decorating", gardenDecorateMode && hasFoundItems);

  if (els.openGardenDecorate) {
    els.openGardenDecorate.hidden = gardenDecorateMode || !hasFoundItems;
    els.openGardenDecorate.setAttribute("aria-pressed", gardenDecorateMode ? "true" : "false");
  }
  if (els.gardenDecorateEditActions) {
    els.gardenDecorateEditActions.classList.toggle("hidden", !gardenDecorateMode || !hasFoundItems);
  }
  if (els.gardenDecorateGuide) {
    els.gardenDecorateGuide.textContent = gardenDecorateSaving
      ? "작은 것들을 정원에 고정하는 중이에요."
      : "발견한 작은 것만 원하는 곳으로 옮겨보세요.";
  }
}

function tutorialSandboxFoundItems() {
  if (!isTutorialSandboxPreview() || !tutorialSandbox.found) return [];
  // 첫날의 보상은 기존 장식 시스템과 같은 모양으로만 보이고, 실제 계정 장식에는 저장하지 않습니다.
  return [{
    id: 'tutorial-sandbox-pink-wildflower',
    recordId: 'tutorial-sandbox-record',
    itemKey: 'pink_wildflower',
    placementSlot: 'front_bed_left',
    foundAt: new Date().toISOString(),
  }];
}

function renderFoundItems() {
  if (!els.foundItemsLayer || !els.foundItemSparkle) return;

  const foundItems = [...(state.foundItems || []), ...tutorialSandboxFoundItems()]
    .filter((item) => foundItemCatalog[item.itemKey]);
  els.foundItemsLayer.innerHTML = foundItems.map((item) => {
    const catalogItem = foundItemCatalog[item.itemKey];
    const position = foundItemDisplayPosition(item);
    const positionClass = position ? " has-custom-position" : "";
    return `
      <div class="found-item found-item-${escapeAttr(item.placementSlot)}${positionClass}" data-found-item-id="${escapeAttr(item.id)}" data-found-item="${escapeAttr(item.itemKey)}" aria-label="${escapeAttr(catalogItem.name)}"${foundItemPositionStyle(item)}>
        <img src="${escapeAttr(catalogItem.asset)}" alt="" draggable="false" />
      </div>
    `;
  }).join("");

  renderGardenDecorateControls(foundItems);

  const canDiscover = canDiscoverFoundItem();
  const shouldShowDiscoveryGuide = !gardenDecorateMode && canDiscover;
  els.foundItemSparkle.hidden = !shouldShowDiscoveryGuide;
  if (els.foundItemHint) els.foundItemHint.hidden = !shouldShowDiscoveryGuide;
  els.foundItemSparkle.setAttribute(
    "aria-label",
    canDiscover ? "풀숲에서 반짝이는 작은 것 찾기" : "오늘의 작은 것을 모두 찾았어요"
  );
  if (shouldShowDiscoveryGuide && els.foundItemHint) {
    els.foundItemSparkle.setAttribute("aria-describedby", "foundItemHint");
  } else {
    els.foundItemSparkle.removeAttribute("aria-describedby");
  }
}

function startGardenDecorateMode() {
  const foundItems = (state.foundItems || []).filter((item) => foundItemCatalog[item.itemKey]);
  if (!foundItems.length || gardenDecorateSaving) return;

  // 꾸미기를 시작하는 순간, 눈에 보이는 현재 위치를 공통 정원 세계의 초안 좌표로 잡습니다.
  // 예전에 화면 전체 기준으로 저장된 위치도 이 단계에서는 화면에 보이는 자리 그대로
  // 새 좌표 세계로 옮길 수 있고, 취소하면 DB에는 아무것도 저장하지 않습니다.
  gardenDecorateDraftPositions = new Map();
  gardenDecorateMode = true;
  renderFoundItems();

  foundItems.forEach((item) => {
    const element = els.foundItemsLayer?.querySelector(`[data-found-item-id="${CSS.escape(String(item.id))}"]`);
    const visiblePosition = gardenWorldPositionForFoundItemElement(element);
    if (!visiblePosition) return;
    gardenDecorateDraftPositions.set(item.id, visiblePosition);
    applyFoundItemDraftPosition(element, visiblePosition);
  });

  showToast("작은 것을 잡아 원하는 자리에 옮겨보세요.");
}

function releaseFoundItemPointer(pointerId) {
  if (!Number.isFinite(pointerId) || !els.foundItemsLayer) return;
  try {
    if (els.foundItemsLayer.hasPointerCapture?.(pointerId)) {
      els.foundItemsLayer.releasePointerCapture(pointerId);
    }
  } catch (error) {
    // 브라우저가 이미 포인터를 정리한 경우에는 조용히 넘어갑니다.
  }
}

function cancelGardenDecorateMode() {
  if (gardenDecorateSaving) return;
  if (activeFoundItemDrag) {
    activeFoundItemDrag.element.classList.remove("is-moving");
    releaseFoundItemPointer(activeFoundItemDrag.pointerId);
  }
  activeFoundItemDrag = null;
  gardenDecorateMode = false;
  gardenDecorateDraftPositions = new Map();
  renderFoundItems();
  showToast("바꾸기 전 배치로 돌아왔어요.");
}

function applyFoundItemDraftPosition(element, position) {
  if (!element || !position) return;
  element.classList.add("has-custom-position");
  element.style.setProperty("--found-item-x", `${position.x}%`);
  element.style.setProperty("--found-item-y", `${position.y}%`);
}

function beginFoundItemDrag(event) {
  // 마우스는 왼쪽 버튼만, 터치는 pointerdown 한 번으로 바로 잡을 수 있게 합니다.
  if (!gardenDecorateMode || gardenDecorateSaving) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const element = event.target.closest(".found-item[data-found-item-id]");
  if (!element || !els.gardenWorld?.contains(element)) return;

  const worldRect = els.gardenWorld.getBoundingClientRect();
  const itemRect = element.getBoundingClientRect();
  if (!worldRect.width || !worldRect.height || !itemRect.width || !itemRect.height) return;

  event.preventDefault();
  const itemId = element.dataset.foundItemId;
  if (!itemId) return;

  // 이전 드래그가 남아 있으면 먼저 조용히 정리합니다.
  if (activeFoundItemDrag) {
    activeFoundItemDrag.element.classList.remove("is-moving");
    releaseFoundItemPointer(activeFoundItemDrag.pointerId);
  }

  const currentPosition = gardenWorldPositionForFoundItemElement(element);
  if (currentPosition) {
    gardenDecorateDraftPositions.set(itemId, currentPosition);
    applyFoundItemDraftPosition(element, currentPosition);
  }

  activeFoundItemDrag = {
    pointerId: event.pointerId,
    itemId,
    element,
    itemWidth: itemRect.width,
    itemHeight: itemRect.height,
    pointerOffsetX: event.clientX - (itemRect.left + (itemRect.width / 2)),
    pointerOffsetY: event.clientY - itemRect.top,
  };

  element.classList.add("is-moving");
  // 확대·축소되는 내부 정원에서도 포인터가 장식 밖으로 벗어나지 않도록
  // 레이어가 포인터를 계속 붙잡고, 이동·종료는 window에서 추적합니다.
  try {
    els.foundItemsLayer?.setPointerCapture?.(event.pointerId);
  } catch (error) {
    // Pointer Capture를 지원하지 않는 브라우저도 window 이벤트로 계속 동작합니다.
  }
}

function moveFoundItemDrag(event) {
  const drag = activeFoundItemDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();

  // 화면 회전·브라우저 UI 변화가 있어도 현재 내부 정원 실제 크기를 기준으로 계산합니다.
  const worldRect = els.gardenWorld?.getBoundingClientRect();
  if (!worldRect?.width || !worldRect?.height) return;

  const halfWidth = drag.itemWidth / 2;
  const centerX = clamp(
    event.clientX - worldRect.left - drag.pointerOffsetX,
    halfWidth,
    worldRect.width - halfWidth
  );
  const topY = clamp(
    event.clientY - worldRect.top - drag.pointerOffsetY,
    0,
    Math.max(0, worldRect.height - drag.itemHeight)
  );
  const position = {
    x: roundedFoundItemPosition((centerX / worldRect.width) * 100),
    y: roundedFoundItemPosition((topY / worldRect.height) * 100),
  };

  gardenDecorateDraftPositions.set(drag.itemId, position);
  applyFoundItemDraftPosition(drag.element, position);
}

function endFoundItemDrag(event) {
  const drag = activeFoundItemDrag;
  if (!drag || (event && drag.pointerId !== event.pointerId)) return;
  drag.element.classList.remove("is-moving");
  releaseFoundItemPointer(drag.pointerId);
  activeFoundItemDrag = null;
}

async function saveGardenDecorateMode() {
  if (!currentUser || !gardenDecorateMode || gardenDecorateSaving) return;
  const positions = (state.foundItems || [])
    .filter((item) => foundItemCatalog[item.itemKey])
    .map((item) => {
      const position = gardenDecorateDraftPositions.get(item.id) || savedFoundItemPosition(item);
      return position ? {
        id: item.id,
        position_x: position.x,
        position_y: position.y,
      } : null;
    })
    .filter(Boolean);

  if (!positions.length) {
    cancelGardenDecorateMode();
    return;
  }

  gardenDecorateSaving = true;
  if (els.saveGardenDecorate) {
    els.saveGardenDecorate.disabled = true;
    els.saveGardenDecorate.textContent = "저장 중";
  }
  renderGardenDecorateControls((state.foundItems || []).filter((item) => foundItemCatalog[item.itemKey]));

  const { error } = await supabase.rpc("save_my_garden_dev_found_item_positions", { p_positions: positions });

  gardenDecorateSaving = false;
  if (els.saveGardenDecorate) {
    els.saveGardenDecorate.disabled = false;
    els.saveGardenDecorate.textContent = "배치 저장";
  }

  if (error) {
    renderGardenDecorateControls((state.foundItems || []).filter((item) => foundItemCatalog[item.itemKey]));
    showToast("배치를 저장하지 못했어요. 잠시 뒤 다시 해주세요.");
    console.warn("TodayForest DEV found-item layout save failed:", error);
    return;
  }

  const savedById = new Map(positions.map((position) => [position.id, position]));
  state.foundItems = (state.foundItems || []).map((item) => {
    const position = savedById.get(item.id);
    return position
      ? { ...item, positionX: position.position_x, positionY: position.position_y }
      : item;
  });

  activeFoundItemDrag = null;
  gardenDecorateMode = false;
  gardenDecorateDraftPositions = new Map();
  renderFoundItems();
  showToast("작은 것들을 원하는 자리에 놓았어요.");
}

async function claimFoundItem() {
  if (isTutorialSandboxPreview()) {
    if (!tutorialSandbox.recorded || tutorialSandbox.found) return;
    tutorialSandbox.found = true;
    const sandboxFoundItemId = "tutorial-sandbox-pink-wildflower";
    renderFoundItems();
    // 마지막 카드를 가리는 토스트 대신, 발견한 들꽃 자체를 잠시 바라보게 합니다.
    showFirstWalkCompletion({ foundItemId: sandboxFoundItemId });
    return;
  }

  if (!currentUser) return;
  const record = todayGardenRecord();
  if (!record || foundItemForRecord(record.id)) return;

  els.foundItemSparkle.disabled = true;
  const { data, error } = await supabase.rpc("claim_garden_dev_found_item", { p_record_id: record.id });
  els.foundItemSparkle.disabled = false;

  if (error) {
    showToast(databaseErrorMessage(error));
    return;
  }

  const claimed = Array.isArray(data) ? data[0] : data;
  if (!claimed?.item_key || !foundItemCatalog[claimed.item_key]) {
    // SQL 반영 전이거나 서버가 오늘의 장식을 고르지 못한 경우입니다.
    renderFoundItems();
    showToast("오늘의 작은 것을 아직 찾지 못했어요. 잠시 뒤 다시 해주세요.");
    return;
  }

  const wasFirstWalkDiscovery = gardenTutorialPhase === "discovery" && firstDiscoveryGuideIsAvailable();
  const nextItem = {
    id: claimed.id,
    recordId: record.id,
    itemKey: claimed.item_key,
    placementSlot: claimed.placement_slot,
    positionX: claimed.position_x,
    positionY: claimed.position_y,
    foundAt: claimed.found_at,
  };
  const existingIndex = (state.foundItems || []).findIndex((item) => item.recordId === nextItem.recordId);
  if (existingIndex >= 0) state.foundItems.splice(existingIndex, 1, nextItem);
  else state.foundItems.push(nextItem);

  renderFoundItems();
  if (wasFirstWalkDiscovery) {
    // 첫 산책의 끝은 별도 토스트 없이 마무리 카드가 맡아, 발견의 여운을 남깁니다.
    showFirstWalkCompletion({ foundItemId: nextItem.id });
    return;
  }
  renderFirstWalkTutorial();
  const catalogItem = foundItemCatalog[nextItem.itemKey];
  showToast(`숲에서 작은 것을 찾았어요. ${catalogItem.detail}`);
}

function updateTodayRecordAction() {
  const action = $("#openRecord");
  const label = action?.querySelector("span:last-child");
  // 미리보기에서는 실제 오늘 기록 여부 대신 가상 산책의 진행 상태만 보여줍니다.
  const savedToday = isTutorialSandboxPreview() ? tutorialSandbox.recorded : hasSavedToday();
  if (!action || !label) return;
  action.classList.toggle("record-complete", savedToday);
  action.setAttribute("aria-label", savedToday ? "오늘 마음 남기기 완료" : "마음 남기기");
  label.textContent = savedToday ? "오늘 마음 남김" : "마음 남기기";
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function previewWeatherFromUrl() {
  // 개발 화면 검수용: ?weatherPreview=sun / wind / rain 을 붙인 경우에만 임시로 날씨를 고정합니다.
  const preview = new URL(window.location.href).searchParams.get("weatherPreview");
  return weatherOptions.find((weather) => weather.className === preview) || null;
}

function weatherForGarden(gardenId, dateKey = seoulDateKey()) {
  const preview = previewWeatherFromUrl();
  if (preview) return preview;

  // 정원 ID + 한국 날짜를 조합해, 그 정원만의 오늘 날씨를 안정적으로 정합니다.
  // 0~5: 맑음(60%), 6~7: 바람(20%), 8~9: 비(20%)
  const roll = stableHash(`${gardenId || "guest"}:${dateKey || "today"}`) % 10;
  if (roll < 6) return weatherOptions[0];
  if (roll < 8) return weatherOptions[1];
  return weatherOptions[2];
}

function currentWeather() {
  return weatherForGarden(currentUser?.id || "guest");
}

function seededRandom(seedValue) {
  let seed = stableHash(seedValue || "rain-seed") || 1;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function buildRainScene(layer, seedKey) {
  if (!layer) return;

  const rainSeed = String(seedKey || "guest-rain");
  const stageHeight = Math.max(420, Math.round(layer.getBoundingClientRect().height || layer.clientHeight || 520));
  const sceneKey = `${rainSeed}:${stageHeight}`;
  if (layer.dataset.rainSceneKey === sceneKey && layer.childElementCount > 0) return;

  const random = seededRandom(sceneKey);
  const fragment = document.createDocumentFragment();
  const dropCount = 20;

  layer.innerHTML = "";
  layer.dataset.rainSceneKey = sceneKey;

  for (let index = 0; index < dropCount; index += 1) {
    const x = 5 + random() * 90;
    const duration = 1.45 + random() * 0.72;
    const delay = -(random() * duration);
    const impactY = Math.round(stageHeight * (0.67 + random() * 0.18));
    const travel = impactY + 42;
    const length = 18 + random() * 12;
    const alpha = 0.45 + random() * 0.20;
    const drift = -1.5 + random() * 3;
    const splashScale = 0.88 + random() * 0.28;

    const dropItem = document.createElement("span");
    dropItem.className = "rain-drop-item";
    dropItem.style.setProperty("--x", `${x.toFixed(2)}%`);
    dropItem.style.setProperty("--delay", `${delay.toFixed(2)}s`);
    dropItem.style.setProperty("--duration", `${duration.toFixed(2)}s`);
    dropItem.style.setProperty("--travel", `${travel}px`);
    dropItem.style.setProperty("--length", `${length.toFixed(1)}px`);
    dropItem.style.setProperty("--alpha", alpha.toFixed(2));
    dropItem.style.setProperty("--drift", `${drift.toFixed(1)}px`);

    const drop = document.createElement("span");
    drop.className = "rain-drop";
    dropItem.appendChild(drop);

    const splashItem = document.createElement("span");
    splashItem.className = "rain-splash-item";
    splashItem.style.setProperty("--x", `${x.toFixed(2)}%`);
    splashItem.style.setProperty("--impact-y", `${impactY}px`);
    splashItem.style.setProperty("--duration", `${duration.toFixed(2)}s`);
    splashItem.style.setProperty("--splash-delay", `${(delay + duration - 0.09).toFixed(2)}s`);
    splashItem.style.setProperty("--splash-scale", splashScale.toFixed(2));

    fragment.append(dropItem, splashItem);
  }

  layer.appendChild(fragment);
}

function applyWeatherVisuals(stage, treeWrap, rainLayer, weather, rainSeed = "guest-rain") {
  if (stage) stage.classList.toggle("weather-rain", weather.className === "rain");
  if (treeWrap) treeWrap.classList.toggle("wind-active", weather.className === "wind");
  if (rainLayer) {
    if (weather.className === "rain") buildRainScene(rainLayer, rainSeed);
    rainLayer.classList.toggle("active", weather.className === "rain");
  }
}

function renderGarden() {
  const visualGrowth = visualGrowthForGarden();
  const stage = stageForGrowth(visualGrowth);
  const visiting = animalV2VisitsByState("visiting");
  const departing = animalV2VisitsByState("departing");
  const approaching = animalV2VisitsByState("approaching");
  const traces = animalV2VisitsByState("trace");
  const primaryVisit = currentAnimalV2Visit();
  const primaryAnimal = primaryVisit ? animalVisitors[primaryVisit.kind] : null;
  const weather = currentWeather();
  const unread = getUnreadLetters();

  const isGrowthPreview = growthPreviewFromUrl() !== null;
  els.dayCount.textContent = `마음 ${visualGrowth}일째${isGrowthPreview ? " · 미리보기" : ""}`;
  els.treeStageLabel.textContent = stage.label;
  if (els.treeNameLabel) els.treeNameLabel.textContent = state.treeName || "내 마음 나무";
  els.treeImage.src = `assets/garden/tree_growth/${stage.asset}`;
  els.treeImage.alt = stage.label;
  renderMyHeartFruits();
  window.setTimeout(maybePlayHeartFruitReveal, 140);

  // V1 버튼은 호환을 위해 DOM에만 남기고, DEV v2에서는 동적 레이어만 사용합니다.
  if (els.activeAnimal) els.activeAnimal.hidden = true;
  if (els.animalTrace) els.animalTrace.hidden = true;

  if (visiting.length) {
    const names = visiting.map((visit) => animalVisitors[visit.kind]?.name || "숲친구");
    els.visitorImage.hidden = true;
    els.visitorEmoji.hidden = false;
    els.visitorEmoji.textContent = primaryAnimal?.icon || "🌿";
    els.visitorName.textContent = visiting.length >= 2
      ? `${names.join("와 ")}가 정원에 머물러 있어요`
      : `${names[0]}가 정원에 놀러왔어요`;
    els.visitorHint.textContent = "살며시 누르면 이 아이에게 편지를 맡길 수 있어요.";
    els.visitorButton.setAttribute("aria-label", `${names[0]}에게 편지 맡기기`);
  } else if (departing.length) {
    const animal = animalVisitors[departing[0].kind];
    els.visitorImage.hidden = true;
    els.visitorEmoji.hidden = false;
    els.visitorEmoji.textContent = animal?.icon || "🍃";
    els.visitorName.textContent = `${animal?.name || "숲친구"}가 숲길로 돌아가고 있어요`;
    els.visitorHint.textContent = departing[0].departureReason === "letter"
      ? "마음을 품고 조용히 출발했어요."
      : "잠시 쉬어가던 발걸음이 멀어지고 있어요.";
    els.visitorButton.setAttribute("aria-label", "숲친구가 떠나는 중");
  } else if (approaching.length) {
    els.visitorImage.hidden = true;
    els.visitorEmoji.hidden = false;
    els.visitorEmoji.textContent = "🍃";
    els.visitorName.textContent = approaching.length >= 2
      ? "서로 다른 곳에서 작은 기척이 들려요"
      : "숲길에서 작은 기척이 들려요";
    els.visitorHint.textContent = "잠시 정원을 보고 있으면 숲친구가 모습을 드러낼 거예요.";
    els.visitorButton.setAttribute("aria-label", "숲친구가 다가오는 중");
  } else {
    els.visitorImage.hidden = true;
    els.visitorEmoji.hidden = false;
    els.visitorEmoji.textContent = traces.length ? v2TraceMeta(traces[0]).icon : "🌿";
    els.visitorName.textContent = traces.length ? "숲친구가 작은 흔적을 남겼어요" : "숲이 조용히 숨을 고르고 있어요";
    els.visitorHint.textContent = traces.length ? v2TraceMeta(traces[0]).story : animalIdleMessage();
    els.visitorButton.setAttribute("aria-label", "정원의 숲친구 소식 보기");
  }

  renderAnimalV2Scene();

  els.weatherIcon.textContent = weather.icon;
  els.weatherText.textContent = weather.text;
  applyWeatherVisuals(els.gardenStage, els.treeWrap, els.rainLayer, weather, `${currentUser?.id || "guest"}:${seoulDateKey()}:my-garden`);
  els.stageMessage.textContent = visiting.length
    ? visiting.length >= 2
      ? "두 숲친구가 각자의 자리에서 잠시 쉬어가고 있어요."
      : `${primaryAnimal?.name || "숲친구"}가 정원 어딘가에서 당신을 바라보고 있어요.`
    : departing.length
      ? "숲길 너머로 작은 발걸음이 멀어져요."
      : approaching.length
        ? animalApproachMessage()
        : weather.message;

  els.nextVisitorText.textContent = animalGrowthMessage();

  renderFoundItems();
  renderBranchLetters(unread);
  window.requestAnimationFrame(syncGardenWorldScale);
  playExpiredLetterReturnIfNeeded();
  playRetentionNextVisitNoticeIfNeeded();
  els.navLetterBadge.textContent = unread.length;
  els.navLetterBadge.classList.toggle("hidden", unread.length === 0);
  updateTodayRecordAction();
  updateInstallCard();
}

function receivedLetterPlacementForGrowth(growth) {
  // 편지는 나무가 자라면서 더 높은 곳에 도착합니다.
  // 1~2단계(0~6일): 나무 곁 / 3~4단계(7~20일): 낮은 가지 / 5단계 이상(21일~): 여러 가지
  if (growth <= 6) {
    return {
      className: "letter-placement-ground",
      placeName: "나무 곁",
      heading: "나무 곁에 도착한 마음",
      intro: "아직 열지 않은 마음이 나무 곁에 조용히 머물러요. 읽은 마음은 바람을 타고 정원에 스며들어요.",
    };
  }
  if (growth <= 20) {
    return {
      className: "letter-placement-low-branches",
      placeName: "낮은 가지",
      heading: "나뭇가지에 도착한 편지",
      intro: "아직 열지 않은 편지만 낮은 가지에 조용히 머물러요. 읽은 마음은 바람을 타고 정원에 스며들어요.",
    };
  }
  return {
    className: "letter-placement-high-branches",
    placeName: "나뭇가지",
    heading: "나뭇가지에 도착한 편지",
    intro: "아직 열지 않은 편지만 여러 가지에 조용히 머물러요. 읽은 마음은 바람을 타고 정원에 스며들어요.",
  };
}

function updateReceivedLetterCopy(placement) {
  const receivedTitle = $("#receivedLettersTitle");
  const receivedIntro = document.querySelector(".received-letter-section .letter-intro");
  if (receivedTitle) receivedTitle.textContent = placement.heading;
  if (receivedIntro) receivedIntro.textContent = placement.intro;
}

function renderBranchLetters(unreadLetters) {
  const letters = [...unreadLetters].sort((a, b) => new Date(a.date) - new Date(b.date));
  const placement = receivedLetterPlacementForGrowth(visualGrowthForGarden());
  updateReceivedLetterCopy(placement);
  if (!els.branchLetters) return;

  els.branchLetters.className = `branch-letters ${placement.className}`;
  els.branchLetters.setAttribute("aria-label", `${placement.placeName}에 도착한 새 편지`);

  if (!letters.length) {
    els.branchLetters.innerHTML = "";
    els.branchLetters.hidden = true;
    return;
  }

  els.branchLetters.hidden = false;
  if (letters.length >= 4) {
    els.branchLetters.innerHTML = `
      <button class="branch-letter-bundle" type="button" data-open-letters aria-label="${escapeAttr(`${placement.placeName}에 도착한 편지 ${letters.length}개 보기`)}">
        <span class="branch-bundle-envelopes" aria-hidden="true">✉ ✉ ✉</span>
        <span class="branch-bundle-count">+${letters.length}</span>
      </button>
    `;
  } else {
    els.branchLetters.innerHTML = letters.map((letter, index) => `
      <button class="branch-letter-item item-${index + 1}${isWaitingLetter(letter) ? " is-waiting" : ""}" type="button" data-open-letter="${escapeAttr(letter.id)}" aria-label="${escapeAttr(`${letter.from}님이 ${placement.placeName}에 남긴 새 편지 열기`)}">
        <span class="branch-letter-envelope" aria-hidden="true">✉</span>
        ${isWaitingLetter(letter) ? '<span class="branch-letter-old" aria-hidden="true">오래 기다린 마음</span>' : ""}
      </button>
    `).join("");
  }

  $$('[data-open-letter]').forEach((button) => button.addEventListener("click", () => openLetter(button.dataset.openLetter)));
  $$('[data-open-letters]').forEach((button) => button.addEventListener("click", () => { void openLettersSheet(); }));
}


function isHeartFruitTreeComplete(growth = null) {
  const resolvedGrowth = growth === null ? visualGrowthForGarden() : growth;
  return Number(resolvedGrowth || 0) >= HEART_FRUIT_COMPLETE_COUNT;
}

function heartFruitLayerMarkup(count, { records = [], markPublic = false } = {}) {
  const visibleCount = Math.min(HEART_FRUIT_VISIBLE_CAPACITY, Math.max(0, Number(count || 0)));
  return HEART_FRUIT_POSITIONS.slice(0, visibleCount).map(([x, y], index) => {
    const record = records[index] || null;
    const publicClass = markPublic && record?.isPublic ? " is-public" : "";
    return `
      <span class="heart-fruit fruit-${(index % 4) + 1}${publicClass}" style="--fruit-x:${x}%; --fruit-y:${y}%; --fruit-delay:${index * 42}ms; --public-glow-delay:-${(index % 11) * 0.53}s" aria-hidden="true"></span>
    `;
  }).join("");
}

function renderHeartFruitLayer(layer, count, { visible = true, records = [], markPublic = false } = {}) {
  if (!layer) return;
  const safeCount = Math.max(0, Number(count || 0));
  layer.innerHTML = heartFruitLayerMarkup(safeCount, { records, markPublic });
  layer.classList.toggle("hidden", !visible || safeCount <= 0);
}

function isHeartFruitPreviewMode() {
  return growthPreviewFromUrl() !== null && isHeartFruitTreeComplete();
}

function heartFruitPreviewRecordCountFromUrl() {
  const raw = new URL(window.location.href).searchParams.get("heartFruitCountPreview");
  const count = Number.parseInt(raw || "", 10);
  if (!Number.isFinite(count)) return HEART_FRUIT_COMPLETE_COUNT;
  return Math.min(HEART_FRUIT_PREVIEW_MAX_COUNT, Math.max(HEART_FRUIT_COMPLETE_COUNT, count));
}

function heartFruitPreviewRecords() {
  const targetCount = heartFruitPreviewRecordCountFromUrl();
  const realRecords = [...(state.records || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const result = realRecords.slice(0, targetCount);
  const base = new Date();
  while (result.length < targetCount) {
    const index = result.length;
    const date = new Date(base);
    date.setDate(base.getDate() - index);
    result.push({
      id: `heart-fruit-preview-${index + 1}`,
      mood: ["good", "calm", "tired"][index % 3],
      oneLine: index === 0 ? "이 기록은 마음 열매 화면을 확인하기 위한 미리보기예요." : `미리보기 마음 ${index + 1}`,
      detail: index === 0 ? "실제 나무가 완성되면 이 자리에는 그날 직접 남긴 마음이 보여요." : "",
      isPublic: false,
      isPreview: true,
      createdAt: date.toISOString(),
    });
  }
  return result;
}

function renderMyHeartFruits() {
  const complete = isHeartFruitTreeComplete();
  const previewMode = isHeartFruitPreviewMode();
  const records = complete ? (previewMode ? heartFruitPreviewRecords() : (state.records || [])) : [];
  const recordCount = records.length;
  // 첫 완성 모습은 열매 30개로 유지하되, 31번째 이후 마음은 데이터와 타임라인에 계속 쌓입니다.
  const decorativeCount = Math.min(recordCount, HEART_FRUIT_VISIBLE_CAPACITY);
  const decorativeRecords = previewMode
    ? records
    : [...records].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  renderHeartFruitLayer(els.heartFruitLayer, decorativeCount, {
    visible: complete,
    records: decorativeRecords,
    markPublic: true,
  });
  els.treeWrap?.classList.toggle("has-heart-fruits", complete && decorativeCount > 0);
  if (els.openHeartFruits) els.openHeartFruits.classList.toggle("hidden", !complete || recordCount <= 0);
  if (els.heartFruitCount) els.heartFruitCount.textContent = String(recordCount);
}

function renderFriendHeartFruits(growth, records = activeFriendFruitRecords) {
  const complete = isHeartFruitTreeComplete(growth);
  const count = complete ? (records || []).length : 0;
  renderHeartFruitLayer(els.friendHeartFruitLayer, count, { visible: complete });
  els.friendVisitTreeWrap?.classList.toggle("has-heart-fruits", complete && count > 0);
  if (els.openFriendHeartFruits) els.openFriendHeartFruits.classList.toggle("hidden", !complete || count <= 0);
  if (els.friendHeartFruitCount) els.friendHeartFruitCount.textContent = String(count);
}

function heartFruitRevealStorageKey() {
  const previewSuffix = growthPreviewFromUrl() !== null ? ":preview" : "";
  return `${HEART_FRUIT_REVEAL_STORAGE_PREFIX}:${currentUser?.id || "guest"}:first-tree${previewSuffix}`;
}

function clearHeartFruitRevealTimers() {
  window.clearTimeout(heartFruitRevealMessageTimer);
  window.clearTimeout(heartFruitRevealHideTimer);
  window.clearTimeout(heartFruitRevealFinishTimer);
  heartFruitRevealMessageTimer = null;
  heartFruitRevealHideTimer = null;
  heartFruitRevealFinishTimer = null;
}

function setHeartFruitCeremonyLocked(locked) {
  els.gardenApp?.classList.toggle("is-heart-fruit-ceremony", locked);
  if (locked) {
    els.gardenApp?.setAttribute("aria-busy", "true");
    els.heartFruitCeremonyLock?.classList.remove("hidden");
    document.documentElement.classList.add("heart-fruit-ceremony-locked");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    return;
  }

  els.gardenApp?.removeAttribute("aria-busy");
  els.heartFruitCeremonyLock?.classList.add("hidden");
  document.documentElement.classList.remove("heart-fruit-ceremony-locked");
}

function finishHeartFruitRevealCeremony() {
  clearHeartFruitRevealTimers();
  els.heartFruitRevealMessage?.classList.add("hidden");
  els.treeWrap?.classList.remove("is-heart-fruit-revealing");
  setHeartFruitCeremonyLocked(false);
  heartFruitRevealRunning = false;
}

function maybePlayHeartFruitReveal() {
  const previewMode = isHeartFruitPreviewMode();
  const records = previewMode ? heartFruitPreviewRecords() : (state.records || []);
  if (!currentUser || !isHeartFruitTreeComplete() || !records.length || !els.treeWrap) return;

  const forceReplayRequested = new URL(window.location.href).searchParams.get("heartFruitReveal") === "1";
  const forceReplay = forceReplayRequested && !heartFruitRevealForcedThisPage;
  const completionReveal = !previewMode && pendingHeartFruitCompletionReveal;

  if (forceReplayRequested && heartFruitRevealForcedThisPage) return;
  // 실제 계정에서는 30번째 마음을 막 저장한 순간에만 자동으로 보여줍니다.
  // 이미 완성된 나무를 새 기기나 새로고침으로 열었을 때는 다시 재생하지 않습니다.
  if (!forceReplay && !completionReveal && !previewMode) return;
  if (heartFruitRevealRunning) return;

  const key = heartFruitRevealStorageKey();
  if (forceReplay) heartFruitRevealForcedThisPage = true;

  try {
    // 미리보기의 평상시 재생은 브라우저당 한 번만 유지합니다.
    if (previewMode && !forceReplay && window.localStorage.getItem(key) === "1") return;
    window.localStorage.setItem(key, "1");
  } catch (error) {
    // 저장 공간이 막혀도 이번 완성 순간의 연출은 그대로 보여줍니다.
  }

  pendingHeartFruitCompletionReveal = false;
  clearHeartFruitRevealTimers();
  heartFruitRevealRunning = true;
  els.heartFruitRevealMessage?.classList.add("hidden");
  els.treeWrap.classList.remove("is-heart-fruit-revealing");
  els.gardenApp?.classList.remove("is-heart-fruit-ceremony");
  void (els.gardenStage || els.treeWrap).offsetWidth;

  // 완성 순간에는 정원만 남기고 모든 입력을 막은 뒤, 정원 세계 전체를 나무 중심으로 확대합니다.
  setHeartFruitCeremonyLocked(true);
  els.treeWrap.classList.add("is-heart-fruit-revealing");

  heartFruitRevealMessageTimer = window.setTimeout(() => {
    els.heartFruitRevealMessage?.classList.remove("hidden");
  }, HEART_FRUIT_CEREMONY_MESSAGE_DELAY_MS);

  heartFruitRevealHideTimer = window.setTimeout(() => {
    els.heartFruitRevealMessage?.classList.add("hidden");
  }, HEART_FRUIT_CEREMONY_MESSAGE_HIDE_MS);

  heartFruitRevealFinishTimer = window.setTimeout(
    finishHeartFruitRevealCeremony,
    HEART_FRUIT_CEREMONY_DURATION_MS
  );
}

function heartFruitRecordsForMode() {
  if (activeHeartFruitMode === "friend") return activeFriendFruitRecords;
  return isHeartFruitPreviewMode() ? heartFruitPreviewRecords() : (state.records || []);
}

function selectedHeartFruitRecord() {
  const records = heartFruitRecordsForMode();
  return records.find((record) => String(record.id) === String(activeHeartFruitRecordId)) || records[0] || null;
}

function renderHeartFruitDetail() {
  const record = selectedHeartFruitRecord();
  if (!record) {
    els.heartFruitDetailDate.textContent = "";
    els.heartFruitDetailLine.textContent = "아직 열어볼 마음 열매가 없어요.";
    els.heartFruitDetailMore.classList.add("hidden");
    els.heartFruitVisibilityStatus.textContent = "";
    els.heartFruitVisibilityButton.classList.add("hidden");
    return;
  }

  activeHeartFruitRecordId = String(record.id);
  els.heartFruitDetailDate.textContent = formatDate(record.createdAt);
  els.heartFruitDetailLine.textContent = record.oneLine || "";
  els.heartFruitDetailMore.textContent = record.detail || "";
  els.heartFruitDetailMore.classList.toggle("hidden", !record.detail);

  const isMine = activeHeartFruitMode === "mine";
  const isPreviewRecord = Boolean(record.isPreview);
  els.heartFruitVisibilityStatus.textContent = isPreviewRecord
    ? "화면 확인용 미리보기"
    : (isMine ? (record.isPublic ? "친구에게 공개 중" : "나만 볼 수 있어요") : "친구가 공개한 마음");
  els.heartFruitVisibilityStatus.classList.toggle("is-public", Boolean(record.isPublic) && !isPreviewRecord);
  els.heartFruitVisibilityButton.classList.toggle("hidden", !isMine || isPreviewRecord);
  if (isMine && !isPreviewRecord) {
    els.heartFruitVisibilityButton.disabled = false;
    els.heartFruitVisibilityButton.textContent = record.isPublic ? "나만 보기로 바꾸기" : "친구에게 공개하기";
    els.heartFruitVisibilityButton.setAttribute("aria-pressed", record.isPublic ? "true" : "false");
  }
}

function renderHeartFruitSheet() {
  const records = [...heartFruitRecordsForMode()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const previousPickerScrollLeft = els.heartFruitPicker?.scrollLeft || 0;
  const isMine = activeHeartFruitMode === "mine";
  els.heartFruitSheetTitle.textContent = isMine ? "내 마음 열매" : `${activeFriendFruitName || "친구"}의 마음 열매`;
  els.heartFruitSummary.textContent = isMine
    ? (isHeartFruitPreviewMode()
      ? (records.length > HEART_FRUIT_COMPLETE_COUNT
        ? `지속 기록 검수용으로 ${records.length}개의 마음을 보여주고 있어요. 나무는 첫 완성 모습으로 머물고, 31번째 이후 마음도 이곳에 계속 쌓여요.`
        : `완성 화면 미리보기예요. 실제 완성 뒤에는 직접 남긴 마음 ${HEART_FRUIT_COMPLETE_COUNT}개가 보여요.`)
      : (records.length > HEART_FRUIT_COMPLETE_COUNT
        ? `나무는 첫 완성 모습으로 머물고, 지금까지 ${records.length}개의 마음이 계속 쌓여 있어요.`
        : `이 나무에는 지금까지 ${records.length}개의 마음이 열매로 맺혀 있어요.`))
    : `${activeFriendFruitName || "친구"}가 공개한 마음 열매 ${records.length}개예요.`;

  if (!records.length) {
    els.heartFruitPicker.innerHTML = '<div class="empty-state">아직 열어볼 마음 열매가 없어요.</div>';
    activeHeartFruitRecordId = "";
    renderHeartFruitDetail();
    return;
  }

  if (!records.some((record) => String(record.id) === String(activeHeartFruitRecordId))) {
    activeHeartFruitRecordId = String(records[0].id);
  }

  els.heartFruitPicker.innerHTML = records.map((record) => {
    const mood = moodMap[record.mood] || moodMap.good;
    const selected = String(record.id) === String(activeHeartFruitRecordId);
    const showPublicBadge = isMine && Boolean(record.isPublic) && !record.isPreview;
    const publicClass = showPublicBadge ? " is-public" : "";
    const publicLabel = showPublicBadge ? " · 친구에게 공개 중" : "";
    return `
      <button class="heart-fruit-choice${selected ? " selected" : ""}${publicClass}" type="button" data-heart-fruit-id="${escapeAttr(record.id)}" aria-pressed="${selected ? "true" : "false"}" aria-label="${escapeAttr(formatDate(record.createdAt))} 마음 열매${publicLabel}">
        <span class="heart-fruit-choice-icon" aria-hidden="true">${mood.icon}</span>
        <span class="heart-fruit-choice-meta">
          <span>${escapeHTML(formatShortDate(record.createdAt))}</span>
          ${showPublicBadge ? '<span class="heart-fruit-choice-public" aria-hidden="true">공개</span>' : ""}
        </span>
      </button>
    `;
  }).join("");
  if (els.heartFruitPicker) {
    window.requestAnimationFrame(() => {
      els.heartFruitPicker.scrollLeft = previousPickerScrollLeft;
    });
  }
  renderHeartFruitDetail();
}

function openMyHeartFruits() {
  const records = isHeartFruitPreviewMode() ? heartFruitPreviewRecords() : (state.records || []);
  if (!isHeartFruitTreeComplete() || !records.length) {
    showToast("나무가 완성되면 마음 열매를 만날 수 있어요.");
    return;
  }
  activeHeartFruitMode = "mine";
  activeHeartFruitRecordId = String([...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.id || "");
  if (els.heartFruitPicker) els.heartFruitPicker.scrollLeft = 0;
  renderHeartFruitSheet();
  openSheet(els.heartFruitSheet);
}

function openFriendHeartFruits() {
  if (!activeFriendFruitRecords.length) {
    showToast("친구가 공개한 마음 열매가 아직 없어요.");
    return;
  }
  activeHeartFruitMode = "friend";
  activeHeartFruitRecordId = String([...activeFriendFruitRecords].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.id || "");
  if (els.heartFruitPicker) els.heartFruitPicker.scrollLeft = 0;
  renderHeartFruitSheet();
  openSheet(els.heartFruitSheet);
}

function handleHeartFruitPickerClick(event) {
  const button = event.target.closest("[data-heart-fruit-id]");
  if (!button || !els.heartFruitPicker?.contains(button)) return;
  activeHeartFruitRecordId = button.dataset.heartFruitId || "";
  renderHeartFruitSheet();
  window.setTimeout(() => els.heartFruitDetail?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
}

async function toggleHeartFruitVisibility() {
  if (activeHeartFruitMode !== "mine") return;
  const record = selectedHeartFruitRecord();
  if (!record) return;
  if (!heartFruitVisibilityReady) {
    showToast("마음 열매 공개 설정 SQL을 먼저 적용해 주세요.");
    return;
  }

  const button = els.heartFruitVisibilityButton;
  const nextValue = !record.isPublic;
  button.disabled = true;
  button.textContent = "공개 범위를 바꾸는 중이에요";
  const { error } = await supabase.rpc("set_my_garden_record_visibility", {
    p_record_id: record.id,
    p_is_public: nextValue,
  });

  if (error) {
    console.warn("TodayForest heart-fruit visibility update skipped:", error);
    button.disabled = false;
    renderHeartFruitDetail();
    showToast(databaseErrorMessage(error));
    return;
  }

  record.isPublic = nextValue;
  renderMyHeartFruits();
  renderHeartFruitSheet();
  showToast(nextValue ? "이 마음 열매를 친구에게 공개했어요." : "이 마음 열매를 나만 보도록 바꿨어요.");
}

function renderRecords() {
  const records = [...state.records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  els.recordsSummary.textContent = records.length
    ? `지금까지 ${records.length}개의 마음을 내 나무에 남겼어요. 짧은 한 줄도 충분히 소중한 기록이에요.`
    : "아직 남긴 기록이 없어요. 오늘의 마음 한 줄부터 가볍게 시작해볼래요?";

  if (!records.length) {
    els.recordList.innerHTML = '<div class="empty-state">아직 기록이 없어요.<br />오늘 마음에 남은 한 줄을 내 나무에 남겨보세요.</div>';
    return;
  }

  els.recordList.innerHTML = records.map((record) => {
    const mood = moodMap[record.mood] || moodMap.good;
    return `
      <article class="record-item">
        <div class="record-item-head">
          <div class="record-mood"><span>${mood.icon}</span>${escapeHTML(mood.label)}</div>
          <span class="record-date">${escapeHTML(formatDate(record.createdAt))}</span>
        </div>
        <p class="record-text">${escapeHTML(record.oneLine)}</p>
        ${record.detail ? `<p class="record-detail">${escapeHTML(record.detail)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderLetters() {
  // 받은 편지는 읽기 전까지만 나뭇가지와 편지 화면에 머뭅니다.
  const placement = receivedLetterPlacementForGrowth(visualGrowthForGarden());
  updateReceivedLetterCopy(placement);
  const letters = [...state.letters].sort((a, b) => new Date(a.date) - new Date(b.date));
  const friends = state.friends || [];
  const canWrite = friends.length > 0;

  const animal = currentAnimalVisitor();
  els.openLetterComposer.disabled = true;
  els.openLetterComposer.textContent = animal
    ? `${animal.icon} 정원에 있는 ${animal.name}에게 맡기기`
    : "다음 숲친구를 기다리고 있어요";
  els.letterFriendHint.textContent = !canWrite
    ? "친구와 연결되면 숲친구에게 편지를 맡길 수 있어요."
    : animal
      ? `정원에 온 ${animal.name}를 눌러 편지를 직접 맡겨 보세요.`
      : "편지는 다음에 찾아오는 숲친구에게 직접 맡길 수 있어요.";

  renderSentLetters();

  if (!letters.length) {
    els.letterList.innerHTML = '<div class="empty-state">지금 나뭇가지에 도착한 새 마음은 없어요.<br />누군가의 편지가 도착하면 봉투가 이곳에 조용히 머물러요.</div>';
    return;
  }

  els.letterList.innerHTML = `
    <p class="received-letter-guide">먼저 나뭇가지에 도착해 기다린 마음부터 열어볼까요?</p>
    ${letters.map((letter) => `
      <button class="letter-item unread${isWaitingLetter(letter) ? " is-waiting" : ""}" type="button" data-letter-id="${escapeAttr(letter.id)}">
        <div class="letter-item-head">
          <div class="letter-from-row"><span class="mail-mark">✉</span><span>${escapeHTML(letter.from)}${isWaitingLetter(letter) ? '<em class="waiting-letter-tag">오래 기다린 마음</em>' : ""}</span></div>
          <span class="letter-meta">${escapeHTML(relativeArrivalText(letter.date))}</span>
        </div>
        <span class="letter-meta letter-delivery-meta">${escapeHTML(shortDelivery(letter.delivery))}</span>
      </button>
    `).join("")}
  `;

  $$('[data-letter-id]').forEach((button) => button.addEventListener("click", () => openLetter(button.dataset.letterId)));
}

function specialFriendDeliveryCardMarkup(letter) {
  const tracking = specialFriendDeliveryTracking(letter);
  if (!tracking.isActive) return "";
  const carrier = specialForestFriendPreviewCatalog[letter.friendKey] || { icon: "🌿", name: "특별 숲 친구" };
  const isReturning = tracking.phase === "returning";
  const title = isReturning
    ? `${escapeHTML(letter.to)}에게 전한 마음`
    : `${escapeHTML(letter.to)}에게 · ${escapeHTML(letter.title)}`;
  const story = isReturning
    ? `편지는 도착했어요 · ${carrier.name}이 숲을 지나 돌아오고 있어요.`
    : `${carrier.name}이 ${letter.to}에게 마음을 전하러 가고 있어요.`;
  const countdownLabel = isReturning ? "귀환까지" : "도착까지";
  const badge = isReturning ? "돌아오는 중" : "전달 중";
  return `
    <article class="sent-letter-item has-animal-tracking special-friend-delivery">
      <div class="sent-letter-icon" aria-hidden="true">${carrier.icon}</div>
      <div class="sent-letter-main">
        <div class="sent-letter-title">${title}</div>
        <div class="sent-letter-detail">${escapeHTML(carrier.name)} · ${escapeHTML(formatDate(letter.sentAt))}</div>
        <div class="animal-delivery-tracking" aria-label="${escapeAttr(carrier.name)} 배송 진행 상태">
          <p class="animal-delivery-story">${escapeHTML(story)}</p>
          <div class="animal-delivery-time-row">
            <span>${countdownLabel} ${escapeHTML(formatDeliveryCountdown(tracking.remainingMs))}</span>
            <span>${Math.round(tracking.progress)}%</span>
          </div>
          <span class="animal-delivery-progress" aria-hidden="true"><span style="width:${tracking.progress.toFixed(2)}%"></span></span>
        </div>
      </div>
      <span class="sent-letter-status is-moving">${badge}</span>
    </article>
  `;
}

function renderSentLetters() {
  const specialFriendCards = (state.specialFriendLetters || [])
    .map(specialFriendDeliveryCardMarkup)
    .filter(Boolean)
    .join("");

  // 보낸 편지함은 만들지 않습니다. 배송 중인 편지와, 지금 확인한 도착 장면만 보여줍니다.
  const queuedLetters = queuedAnimalDeliveryLetters();
  const persistedLetters = (state.sentLetters || [])
    .map(applyAnimalDeliveryMeta)
    .filter((letter) => {
      const tracking = animalDeliveryTracking(letter);
      return Boolean(tracking.meta && tracking.isInTransit);
    })
    .filter((letter) => !queuedLetters.some((queued) => isSameAnimalDeliveryLetter(letter, queued)));
  const inTransitLetters = [...queuedLetters, ...persistedLetters]
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  const arrivalNotices = animalDeliveryArrivalNotices();

  if (!specialFriendCards && !inTransitLetters.length && !arrivalNotices.length) {
    els.sentLetterList.innerHTML = '<div class="empty-state">지금 숲길을 걷는 편지가 없어요.<br />정원에 온 숲친구에게 작은 마음을 부탁해볼래요?</div>';
    return;
  }

  const inTransitCards = inTransitLetters.map((letter) => {
    const tracking = animalDeliveryTracking(letter);
    const carrier = tracking.carrier;
    return `
      <article class="sent-letter-item ${letter.isDevTest ? "is-dev-test" : ""} has-animal-tracking">
        <div class="sent-letter-icon" aria-hidden="true">${carrier.icon}</div>
        <div class="sent-letter-main">
          <div class="sent-letter-title">${escapeHTML(letter.to)}에게 · ${escapeHTML(letter.title)}${letter.isDevTest ? '<span class="dev-test-tag">DEV</span>' : ""}</div>
          <div class="sent-letter-detail">${escapeHTML(carrier.name)} · ${escapeHTML(formatDate(letter.sentAt))}</div>
          <div class="animal-delivery-tracking" aria-label="${escapeAttr(`${carrier.name} 배송 진행 상태`)}">
            <p class="animal-delivery-story">${escapeHTML(animalDeliveryStory(carrier))}</p>
            <div class="animal-delivery-time-row">
              <span>${letter.isDevTest ? "DEV 도착까지" : "도착까지"} ${escapeHTML(formatDeliveryCountdown(tracking.remainingMs))}</span>
              <span>${Math.round(tracking.progress)}%</span>
            </div>
            <span class="animal-delivery-progress" aria-hidden="true"><span style="width:${tracking.progress.toFixed(2)}%"></span></span>
            ${letter.isDevTest ? `<p class="animal-delivery-dev-note">DEV 1분 테스트 · 실제 ${escapeHTML(String(tracking.meta.deliveryHours))}시간 배송</p>` : ""}
          </div>
        </div>
        <span class="sent-letter-status is-moving">배송 중</span>
      </article>
    `;
  }).join("");

  const arrivalCards = arrivalNotices.map((letter) => {
    const carrier = animalDeliveryTracking(letter).carrier;
    return `
      <article class="sent-letter-item is-arrival-notice ${letter.isDevTest ? "is-dev-test" : ""}">
        <div class="sent-letter-icon" aria-hidden="true">${carrier.icon}</div>
        <div class="sent-letter-main">
          <div class="sent-letter-title">${escapeHTML(letter.to)}에게 전한 마음</div>
          <p class="animal-arrival-note">${escapeHTML(`${carrier.name}가 친구의 나뭇가지에 편지를 걸어두었어요.`)}</p>
        </div>
        <span class="sent-letter-status is-arrived">도착 완료</span>
      </article>
    `;
  }).join("");

  els.sentLetterList.innerHTML = `${specialFriendCards}${inTransitCards}${arrivalCards}`;
}

function carrierForKind(kind) {
  const map = {
    little_bird: { icon: "🐦", name: "작은 새" },
    bird: { icon: "🐦", name: "작은 새" },
    squirrel: { icon: "🐿️", name: "다람쥐" },
    rabbit: { icon: "🐇", name: "토끼" },
    hedgehog: { icon: "🦔", name: "고슴도치" },
    sprout_bird: { icon: "🕊️", name: "새싹새" },
    swift_bird: { icon: "🕊️", name: "빠른 새" },
  };
  return map[kind] || { icon: "🕊️", name: "숲의 새" };
}

function clearSpecialForestFriendPreviewComposer({ notify = true } = {}) {
  const wasActive = Boolean(activeSpecialForestFriendPreviewKey);
  const previousKey = activeSpecialForestFriendPreviewKey;
  activeSpecialForestFriendPreviewKey = "";
  if (els.letterForm) delete els.letterForm.dataset.specialForestFriendPreview;

  const submitButton = els.letterForm?.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = false;

  if (wasActive && notify) {
    window.dispatchEvent(new CustomEvent("todayforest:special-friend-letter-preview-cancel", {
      detail: { key: previousKey },
    }));
  }
}

function renderSpecialForestFriendPreviewComposer() {
  const carrier = activeSpecialForestFriendPreview();
  if (!carrier) return;

  const realFriends = (state.friends || []).filter((friend) => !friend.isDevTest);
  if (!realFriends.length) {
    clearSpecialForestFriendPreviewComposer();
    showToast(`실제로 연결된 친구가 있어야 ${carrier.name}에게 편지를 맡길 수 있어요.`);
    return;
  }

  if (!realFriends.some((friend) => friend.id === selectedLetterRecipientId)) {
    selectedLetterRecipientId = realFriends[0].id;
  }

  els.letterRecipientList.innerHTML = realFriends.map((friend) => {
    const stage = stageForGrowth(friend.growth);
    const avatar = friend.avatarUrl
      ? `<img src="${escapeAttr(friend.avatarUrl)}" alt="${escapeAttr(friend.name)} 프로필 사진" />`
      : escapeHTML(friend.name.slice(0, 1));
    return `
      <button class="letter-recipient-choice ${friend.id === selectedLetterRecipientId ? "selected" : ""}" type="button" data-special-letter-recipient="${escapeAttr(friend.id)}">
        <span class="letter-recipient-avatar">${avatar}</span>
        <span>
          <span class="letter-recipient-name">${escapeHTML(friend.name)}</span>
          <span class="letter-recipient-stage">마음 ${friend.growth}일째 · ${escapeHTML(stage.label)}</span>
        </span>
      </button>
    `;
  }).join("");

  $$('[data-special-letter-recipient]').forEach((button) => {
    button.addEventListener("click", () => {
      selectedLetterRecipientId = button.dataset.specialLetterRecipient;
      renderSpecialForestFriendPreviewComposer();
    });
  });

  const submitButton = els.letterForm.querySelector('button[type="submit"]');
  els.letterForm.dataset.specialForestFriendPreview = carrier.key;
  els.letterComposerTitle.textContent = `${carrier.name}에게 편지를 맡기기`;
  els.letterCarrierPreview.innerHTML = `<span class="carrier-icon" aria-hidden="true">${carrier.icon}</span><p>${carrier.name}은 기다리는 동물 없이 바로 마음을 맡아 숲길로 떠나요. 편지는 30분 뒤 도착하고, ${carrier.name}은 다시 30분 동안 숲길을 지나 돌아와요.</p>`;
  submitButton.textContent = `${carrier.icon} ${carrier.name}에게 편지 맡기기 · 도착 30분`;
  submitButton.disabled = false;
  els.letterComposerFootnote.textContent = `편지가 도착한 뒤에도 ${carrier.name}은 30분 동안 돌아오는 중이에요. 귀환 전에는 새 편지를 맡길 수 없어요.`;
}

function openSpecialForestFriendPreviewComposer(key) {
  const carrier = specialForestFriendPreviewCatalog[key];
  if (!carrier) return;
  if (!currentUser) {
    showToast("내 정원을 먼저 로그인해 주세요.");
    window.dispatchEvent(new CustomEvent("todayforest:special-friend-letter-preview-cancel", { detail: { key: carrier.key } }));
    return;
  }
  const realFriends = (state.friends || []).filter((friend) => !friend.isDevTest);
  if (!realFriends.length) {
    showToast(`실제로 연결된 친구가 있어야 ${carrier.name}에게 편지를 맡길 수 있어요.`);
    window.dispatchEvent(new CustomEvent("todayforest:special-friend-letter-preview-cancel", { detail: { key: carrier.key } }));
    return;
  }
  const activeJourney = activeSpecialFriendJourney(carrier.key);
  if (activeJourney) {
    const tracking = specialFriendDeliveryTracking(activeJourney);
    const message = tracking.phase === "returning"
      ? `편지는 도착했어요. ${carrier.name}이 ${formatDeliveryCountdown(tracking.remainingMs)} 뒤 돌아와요.`
      : `${carrier.name}이 지금 마음을 전하러 가고 있어요. 도착까지 ${formatDeliveryCountdown(tracking.remainingMs)} 남았어요.`;
    showToast(message);
    window.dispatchEvent(new CustomEvent("todayforest:special-friend-letter-preview-cancel", { detail: { key: carrier.key } }));
    return;
  }

  openSheet(els.letterComposerSheet);
  activeSpecialForestFriendPreviewKey = carrier.key;
  els.letterForm.reset();
  renderSpecialForestFriendPreviewComposer();
}

async function submitSpecialForestFriendPreviewLetter() {
  const carrier = activeSpecialForestFriendPreview();
  if (!carrier) return false;

  if (!selectedLetterRecipientId) {
    showToast("편지를 받을 친구를 골라 주세요.");
    return true;
  }

  const title = els.letterTitle.value.trim();
  const body = els.letterMessage.value.trim();
  if (!title) {
    showToast("편지 제목을 적어 주세요.");
    els.letterTitle.focus();
    return true;
  }
  if (!body) {
    showToast("전하고 싶은 이야기를 적어 주세요.");
    els.letterMessage.focus();
    return true;
  }

  const recipient = (state.friends || []).find((friend) => friend.id === selectedLetterRecipientId);
  if (!recipient || recipient.isDevTest) {
    showToast(`${carrier.name} 편지는 실제로 연결된 친구에게만 보낼 수 있어요.`);
    return true;
  }
  const recipientName = recipient.name;
  const submitButton = els.letterForm.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = `${carrier.name}이 편지를 품고 있어요…`;

  try {
    const { data, error } = await supabase.rpc("send_my_garden_special_friend_letter_v1", {
      p_friend_key: carrier.key,
      p_recipient_id: selectedLetterRecipientId,
      p_title: title,
      p_body: body,
    });
    if (error) throw error;

    const result = normalizeRpcRow(data) || {};
    const journey = {
      key: carrier.key,
      recipientName: result.recipient_nickname || recipientName,
      sentAt: result.sent_at || new Date().toISOString(),
      availableAt: result.available_at,
      returnAt: result.return_at,
      letterId: result.letter_id || "",
    };
    if (!journey.availableAt || !journey.returnAt) {
      throw new Error("SPECIAL_FRIEND_DELIVERY_SETUP_FAILED");
    }

    trackTodayForestOperationalEvent("garden_letter_sent", {
      delivery_kind: carrier.key,
      delivery_minutes: 30,
    });

    clearSpecialForestFriendPreviewComposer({ notify: false });
    els.letterForm.reset();
    closeAllSheets();
    window.dispatchEvent(new CustomEvent("todayforest:special-friend-letter-started", { detail: journey }));
    showToast(`${carrier.name}이 ${journey.recipientName}에게 보낼 마음을 품고 숲길로 떠나요.`);

    try {
      await loadGardenState();
      renderAll();
    } catch (refreshError) {
      console.warn("TodayForest special-friend letter refresh skipped:", refreshError);
    }
  } catch (error) {
    console.error("TodayForest special-friend letter send error:", error);
    showToast(databaseErrorMessage(error), 7000);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText || `${carrier.name}에게 편지 맡기기`;
  }
  return true;
}

function renderLetterComposer() {
  const friends = state.friends || [];
  if (!friends.length) {
    els.letterRecipientList.innerHTML = '<div class="empty-state">편지를 맡길 친구가 아직 없어요.<br />먼저 친구 초대 링크로 정원을 이어 주세요.</div>';
    return;
  }

  if (!friends.some((friend) => friend.id === selectedLetterRecipientId)) {
    selectedLetterRecipientId = friends[0].id;
  }

  els.letterRecipientList.innerHTML = friends.map((friend) => {
    const stage = stageForGrowth(friend.growth);
    const avatar = friend.avatarUrl
      ? `<img src="${escapeAttr(friend.avatarUrl)}" alt="${escapeAttr(friend.name)} 프로필 사진" />`
      : escapeHTML(friend.name.slice(0, 1));
    return `
      <button class="letter-recipient-choice ${friend.id === selectedLetterRecipientId ? "selected" : ""}" type="button" data-letter-recipient="${escapeAttr(friend.id)}">
        <span class="letter-recipient-avatar">${avatar}</span>
        <span>
          <span class="letter-recipient-name">${escapeHTML(friend.name)}${friend.isDevTest ? '<span class="dev-test-tag">DEV</span>' : ""}</span>
          <span class="letter-recipient-stage">마음 ${friend.growth}일째 · ${escapeHTML(stage.label)}${friend.isDevTest ? " · 개발 확인용" : ""}</span>
        </span>
      </button>
    `;
  }).join("");

  $$('[data-letter-recipient]').forEach((button) => {
    button.addEventListener("click", () => {
      selectedLetterRecipientId = button.dataset.letterRecipient;
      renderLetterComposer();
    });
  });

  const animal = currentAnimalVisitor();
  const chosenFriend = friends.find((friend) => friend.id === selectedLetterRecipientId);
  const destination = chosenFriend?.isDevTest
    ? "테스트 새싹의 나뭇가지에 도착한 뒤, 이 화면에서 읽음 상태까지 확인할 수 있어요."
    : "친구의 나뭇가지에 걸어둘 거예요.";

  if (!animal) {
    els.letterComposerTitle.textContent = "다음 숲친구를 기다리는 중";
    els.letterCarrierPreview.innerHTML = '<span class="carrier-icon" aria-hidden="true">🌿</span><p>지금은 정원에 머무는 숲친구가 없어요. 다음 방문을 기다려 주세요.</p>';
    els.letterForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  const submitButton = els.letterForm.querySelector('button[type="submit"]');
  const isDevTestFriend = Boolean(chosenFriend?.isDevTest);
  els.letterComposerTitle.textContent = `${animal.name}에게 편지를 맡기기`;

  if (isDevTestFriend) {
    els.letterCarrierPreview.innerHTML = `<span class="carrier-icon" aria-hidden="true">${animal.icon}</span><p>${animal.name}에게 맡기면 바로 숲길로 출발해요. 테스트 새싹에게 보내는 편지는 DEV 확인용으로 1분 뒤 도착해요.</p>`;
    submitButton.textContent = `${animal.icon} 테스트 배송 · 1분`;
    els.letterComposerFootnote.textContent = "테스트 새싹에게만 적용되는 개발 확인용 배송이에요. 실제 친구에게 보내는 편지는 동물별 운영 시간으로 전해져요.";
  } else {
    els.letterCarrierPreview.innerHTML = `<span class="carrier-icon" aria-hidden="true">${animal.icon}</span><p>${animal.name}에게 맡기면 바로 숲길로 출발해요. 약 ${animal.deliveryHours}시간의 숲길을 따라 친구에게 전해져요.</p>`;
    submitButton.textContent = `${animal.icon} ${animal.name}에게 맡기기 · 약 ${animal.deliveryHours}시간`;
    els.letterComposerFootnote.textContent = "실제 친구에게 보내는 편지는 선택한 동물과 배송 시간이 함께 저장돼요.";
  }

  submitButton.disabled = false;
}

async function sendGardenLetter(event) {
  event.preventDefault();
  if (activeSpecialForestFriendPreview()) {
    await submitSpecialForestFriendPreviewLetter();
    return;
  }
  if (!currentUser) {
    showToast("내 정원을 먼저 로그인해 주세요.");
    return;
  }
  if (!selectedLetterRecipientId) {
    showToast("편지를 받을 친구를 골라 주세요.");
    return;
  }

  const title = els.letterTitle.value.trim();
  const body = els.letterMessage.value.trim();
  if (!title) {
    showToast("편지 제목을 적어 주세요.");
    els.letterTitle.focus();
    return;
  }
  if (!body) {
    showToast("전하고 싶은 이야기를 적어 주세요.");
    els.letterMessage.focus();
    return;
  }

  const visit = currentAnimalV2Visit();
  const animal = visit ? animalVisitors[visit.kind] : null;
  if (!visit || !animal) {
    showToast("그 숲친구는 이미 숲길을 따라 떠났어요.");
    closeAllSheets();
    return;
  }

  const selectedFriend = (state.friends || []).find((friend) => friend.id === selectedLetterRecipientId);
  const isDevTestFriend = Boolean(selectedFriend?.isDevTest);
  const submitButton = els.letterForm.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = `${animal.name}가 편지를 품고 출발해요…`;

  try {
    // 편지 저장과 선택한 한 마리의 출발을 같은 DEV v2 RPC 안에서 처리합니다.
    const result = isDevTestFriend
      ? await supabase.rpc("send_dev_test_garden_letter_with_dev_animal_v2", {
        p_visit_id: visit.id,
        p_test_friend_id: selectedLetterRecipientId,
        p_title: title,
        p_body: body,
      })
      : await supabase.rpc("send_garden_letter_with_dev_animal_v2", {
        p_visit_id: visit.id,
        p_recipient_id: selectedLetterRecipientId,
        p_title: title,
        p_body: body,
      });

    if (result.error) throw result.error;

    const letter = normalizeRpcRow(result.data) || {};
    if (!isDevTestFriend) {
      trackTodayForestOperationalEvent("garden_letter_sent", {
        delivery_kind: animal.kind,
        delivery_hours: animal.deliveryHours,
      });
    }

    const recipientName = letter.recipient_nickname || selectedFriend?.name || "친구";
    const fallbackDeliveryMs = isDevTestFriend
      ? 60000
      : animal.deliveryHours * 60 * 60 * 1000;
    const availableAt = letter.available_at || new Date(Date.now() + fallbackDeliveryMs).toISOString();
    const sentAt = new Date().toISOString();
    const outgoingId = letter.letter_id || `pending-${Date.now()}`;

    rememberAnimalDelivery(outgoingId, animal, sentAt, availableAt, {
      to: recipientName,
      title,
      isDevTest: isDevTestFriend,
    });

    state.sentLetters = [{
      id: outgoingId,
      to: recipientName,
      title,
      deliveryKind: animal.kind,
      sentAt,
      availableAt,
      actualDeliveryHours: animal.deliveryHours,
      hasAnimalTracking: true,
      readAt: null,
      isDevTest: isDevTestFriend,
    }, ...(state.sentLetters || [])];

    // 서버도 이미 departing으로 전환했지만, 현재 화면에서는 1초 수령 반응을 먼저 보여줍니다.
    activeAnimalV2Visits = activeAnimalV2Visits.map((item) => (
      item.id === visit.id
        ? {
          ...item,
          visitState: "departing",
          departingAt: letter.departing_at || new Date().toISOString(),
          departureReason: "letter",
        }
        : item
    ));
    closeAnimalEncounterCard();
    els.letterForm.reset();
    closeAllSheets();
    renderAll();
    await leaveAnimalWithLetter(animal, visit.id);

    await syncMyGardenAnimalVisit({ silent: true, rerender: true });
    openSheet(els.lettersSheet);
    showToast(`${animal.name}가 ${recipientName}에게 보낼 편지를 품고 숲길로 출발했어요.`);

    try {
      await loadGardenState();
      renderAll();
      openSheet(els.lettersSheet);
    } catch (refreshError) {
      console.warn("TodayForest sent-letter refresh skipped:", refreshError);
    }
  } catch (error) {
    console.error("TodayForest DEV animal v2 letter send error:", error);
    const detail = String(error?.message || "").trim();
    if (detail.includes("ANIMAL_NOT_AVAILABLE")) {
      showToast("그 숲친구가 막 숲길로 돌아갔어요. 다른 친구를 기다려 볼까요?");
    } else {
      showToast(detail || "편지를 보내지 못했어요. 제목과 내용은 그대로 두었어요.");
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText || "숲친구에게 편지 맡기기";
  }
}

function sharedTreeReachedTarget(tree) {
  const target = Math.max(1, Number(tree?.targetSteps || 20));
  const progress = Math.max(0, Number(tree?.progressCount || 0));
  return progress >= target;
}

function sharedTreeIsComplete(tree) {
  // completed_at is the authoritative server completion marker.
  // The progress fallback keeps a 20/20 tree safely locked if an older server response is briefly cached.
  return Boolean(tree?.completedAt) || sharedTreeReachedTarget(tree);
}

function formatSharedTreeLifecycleDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "날짜를 확인할 수 없어요";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function sharedTreesForFriend(friendId) {
  return (state.sharedTrees || [])
    .filter((tree) => tree.partnerId === friendId)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function sharedTreeForFriend(friendId) {
  const trees = sharedTreesForFriend(friendId);
  return trees.find((tree) => !sharedTreeIsComplete(tree)) || trees[0] || null;
}

function sharedTreeInviteForFriend(friendId) {
  return (state.sharedTreeInvites || []).find((invite) => invite.otherUserId === friendId) || null;
}

function sharedTreeActionMarkup(friend) {
  const trees = sharedTreesForFriend(friend.id);
  const currentTree = trees.find((tree) => !sharedTreeIsComplete(tree)) || null;
  const completedCount = trees.filter((tree) => sharedTreeIsComplete(tree)).length;
  const invite = sharedTreeInviteForFriend(friend.id);

  if (friend.isDevTest) {
    if (trees.length) {
      return `<button class="shared-tree-open-button shared-tree-dev-open-button" type="button" data-view-together-forest="${escapeAttr(friend.id)}">🌲 DEV · 함께한 숲 보기</button>`;
    }
    return `
      <button class="shared-tree-dev-create-button" type="button" data-create-dev-shared-tree="${escapeAttr(friend.id)}">
        🌱 DEV · 함께 심어 보기
      </button>
      <span class="shared-tree-status muted">검수용 자동 수락 · 실제 친구 데이터는 건드리지 않아요</span>
    `;
  }

  if (trees.length) {
    const status = currentTree
      ? "나무가 함께 자라고 있어요"
      : invite?.direction === "incoming"
        ? "친구가 다음 씨앗을 건넸어요"
        : invite?.direction === "outgoing"
          ? "다음 씨앗을 천천히 기다리는 중이에요"
          : completedCount > 0
            ? `완성한 나무 ${completedCount}그루가 머물러 있어요`
            : "함께한 시간이 머물러 있어요";
    return `
      <button class="shared-tree-open-button${currentTree ? "" : " is-complete"}" type="button" data-view-together-forest="${escapeAttr(friend.id)}">🌲 함께한 숲 보기</button>
      <span class="shared-tree-status together-forest-status">${escapeHTML(status)}</span>
    `;
  }

  if (invite?.direction === "incoming") {
    return `<button class="shared-tree-incoming-button" type="button" data-open-shared-tree-invite="${escapeAttr(invite.id)}">✦ 작은 씨앗이 도착했어요</button>`;
  }
  if (invite?.direction === "outgoing") {
    return '<span class="shared-tree-status">씨앗 제안을 기다리고 있어요</span>';
  }

  return `<button class="shared-tree-invite-button" type="button" data-invite-shared-tree="${escapeAttr(friend.id)}" data-friend-name="${escapeAttr(friend.name)}">🌱 같이 나무 키울래?</button>`;
}

function renderFriends() {
  const friends = state.friends || [];
  const hasDevTestFriend = friends.some((friend) => friend.isDevTest);
  els.friendCount.textContent = `친구 ${friends.length}명`;
  els.friendsTotal.textContent = `${friends.length}명`;
  els.devTestFriendBox.classList.toggle("is-active", hasDevTestFriend);

  if (!friends.length) {
    els.friendsList.innerHTML = '<div class="empty-state">아직 함께 자라는 친구가 없어요.<br />초대 링크를 보내면 친구의 나무도 이곳에 찾아와요.</div>';
    return;
  }

  els.friendsList.innerHTML = friends.map((friend) => {
    const stage = stageForGrowth(friend.growth);
    const avatar = friend.avatarUrl
      ? `<img src="${escapeAttr(friend.avatarUrl)}" alt="${escapeAttr(friend.name)} 프로필 사진" />`
      : escapeHTML(friend.name.slice(0, 1));
    const actionText = friend.isDevTest ? "테스트 친구 지우기" : "친구 삭제";
    return `
      <article class="friend-row ${friend.isDevTest ? "is-dev-test" : ""}">
        <div class="friend-row-main">
          <button class="friend-garden-open" type="button" data-view-friend="${escapeAttr(friend.id)}" aria-label="${escapeAttr(friend.name)}의 정원 보기">
            <span class="friend-avatar">${avatar}</span>
            <span class="friend-main">
              <span class="friend-name">${escapeHTML(friend.name)}${friend.isDevTest ? '<span class="dev-test-tag">DEV</span>' : ""}</span>
              <span class="friend-stage">마음 ${friend.growth}일째 · ${escapeHTML(stage.label)}${friend.isDevTest ? " · 개발 확인용" : ""}</span>
            </span>
            <span class="friend-view-arrow" aria-hidden="true">›</span>
          </button>
          <div class="friend-shared-tree-action">${sharedTreeActionMarkup(friend)}</div>
        </div>
        <button class="remove-friend-button" type="button" data-remove-friend="${escapeAttr(friend.id)}" data-friend-name="${escapeAttr(friend.name)}" data-dev-test="${friend.isDevTest ? "true" : "false"}">${actionText}</button>
      </article>
    `;
  }).join("");

  $$('[data-remove-friend]').forEach((button) => {
    button.addEventListener("click", () => {
      void removeFriend(button.dataset.removeFriend, button.dataset.friendName, button.dataset.devTest === "true");
    });
  });
  $$('[data-view-friend]').forEach((button) => {
    button.addEventListener("click", () => {
      void openFriendGarden(button.dataset.viewFriend);
    });
  });
  $$('[data-create-dev-shared-tree]').forEach((button) => {
    button.addEventListener("click", () => { createDevSharedTreePreview(button.dataset.createDevSharedTree); });
  });
  $$('[data-invite-shared-tree]').forEach((button) => {
    button.addEventListener("click", () => { void inviteSharedTree(button.dataset.inviteSharedTree); });
  });
  $$('[data-open-shared-tree-invite]').forEach((button) => {
    button.addEventListener("click", () => openSharedTreeInvite(button.dataset.openSharedTreeInvite));
  });
  $$('[data-view-together-forest]').forEach((button) => {
    button.addEventListener("click", () => openTogetherForest(button.dataset.viewTogetherForest));
  });
  $$('[data-view-shared-tree]').forEach((button) => {
    button.addEventListener("click", () => openSharedTree(button.dataset.viewSharedTree));
  });
}

function sharedTreeIdFromUrl() {
  return String(new URL(window.location.href).searchParams.get(SHARED_TREE_URL_PARAM) || "").trim();
}

function togetherForestFriendIdFromUrl() {
  return String(new URL(window.location.href).searchParams.get(TOGETHER_FOREST_URL_PARAM) || "").trim();
}

function setSharedTreeUrl(treeId = "") {
  const url = new URL(window.location.href);
  if (treeId) {
    url.searchParams.set(SHARED_TREE_URL_PARAM, treeId);
  } else {
    url.searchParams.delete(SHARED_TREE_URL_PARAM);
  }
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function setTogetherForestUrl(friendId = "") {
  const url = new URL(window.location.href);
  if (friendId) {
    url.searchParams.set(TOGETHER_FOREST_URL_PARAM, friendId);
  } else {
    url.searchParams.delete(TOGETHER_FOREST_URL_PARAM);
  }
  url.searchParams.delete(SHARED_TREE_URL_PARAM);
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function restoreSharedTreeFromUrl() {
  const forestFriendId = togetherForestFriendIdFromUrl();
  if (forestFriendId) activeTogetherForestFriendId = forestFriendId;

  const treeId = sharedTreeIdFromUrl();
  if (treeId) {
    return openSharedTree(treeId, { updateUrl: false, scroll: false, silent: true });
  }
  if (forestFriendId) {
    return openTogetherForest(forestFriendId, { updateUrl: false, scroll: false, silent: true });
  }
  return false;
}

function friendForSharedTree(tree) {
  return (state.friends || []).find((friend) => friend.id === tree.partnerId) || {
    id: tree.partnerId,
    name: "친구",
    avatarUrl: "",
  };
}

function openSharedTreeInvite(inviteId) {
  const invite = (state.sharedTreeInvites || []).find((item) => item.id === inviteId && item.direction === "incoming");
  if (!invite) {
    showToast("이 씨앗 제안은 더 이상 기다리고 있지 않아요.");
    return;
  }
  const friend = (state.friends || []).find((item) => item.id === invite.otherUserId);
  const trees = sharedTreesForFriend(invite.otherUserId);
  const hasCurrentTree = trees.some((tree) => !sharedTreeIsComplete(tree));
  const isNextTreeInvite = !hasCurrentTree && trees.some((tree) => sharedTreeIsComplete(tree));

  pendingSharedTreeInvite = invite;
  els.sharedTreeInviteFrom.textContent = `${friend?.name || "친구"}의 정원`;
  if (els.sharedTreeInviteTitle) {
    els.sharedTreeInviteTitle.textContent = isNextTreeInvite
      ? "다음 나무도 함께 심어볼래? 🌿"
      : "우리 둘만의 나무 하나 키워볼래? 🌿";
  }
  if (els.sharedTreeInviteBody) {
    els.sharedTreeInviteBody.textContent = isNextTreeInvite
      ? "완성한 나무는 함께한 숲에 그대로 남아요. 새 씨앗을 심으면 두 사람의 다음 시간이 새로운 나무로 천천히 자라요."
      : "각자의 하루가 닿을 때마다 조금씩 자라요. 서로의 기록 내용은 보이지 않고, 둘만의 작은 나무만 남아요.";
  }
  els.acceptSharedTreeInviteButton.textContent = isNextTreeInvite ? "다음 나무 함께 심기" : "함께 심기";
  els.sharedTreeInviteModal.classList.remove("hidden");
}

function closeSharedTreeInviteModal() {
  pendingSharedTreeInvite = null;
  els.sharedTreeInviteModal.classList.add("hidden");
}

async function inviteSharedTree(friendId, { nextTree = false } = {}) {
  const friend = (state.friends || []).find((item) => item.id === friendId);
  if (!friendId || !friend || friend.isDevTest) return;

  const { error } = await supabase.rpc("create_my_garden_shared_tree_invite", { p_friend_id: friendId });
  if (error) {
    console.warn("TodayForest shared-tree invite error:", error);
    showToast(databaseErrorMessage(error));
    return;
  }

  await loadGardenState();
  renderAll();
  renderFriends();
  if (activeTogetherForestFriendId === friendId) renderTogetherForest(friendId);
  showToast(nextTree
    ? `${friend.name}님에게 다음 나무의 씨앗을 제안했어요.`
    : `${friend.name}님에게 작은 씨앗을 보냈어요.`);
}

async function acceptSharedTreeInvite() {
  if (!pendingSharedTreeInvite) return;
  const invite = pendingSharedTreeInvite;
  const hadCompletedTree = sharedTreesForFriend(invite.otherUserId).some((tree) => sharedTreeIsComplete(tree));
  const button = els.acceptSharedTreeInviteButton;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "씨앗을 심는 중이에요";

  const { data, error } = await supabase.rpc("accept_my_garden_shared_tree_invite", { p_invite_id: invite.id });

  button.disabled = false;
  button.textContent = originalText || "함께 심기";
  if (error) {
    console.warn("TodayForest shared-tree accept error:", error);
    showToast(databaseErrorMessage(error));
    return;
  }

  const tree = normalizeRpcRow(data);
  const treeId = tree?.tree_id || "";
  closeSharedTreeInviteModal();
  await loadGardenState();
  renderAll();
  renderFriends();
  activeTogetherForestFriendId = invite.otherUserId;

  const openNewTree = () => {
    if (treeId) {
      openSharedTree(treeId);
    } else {
      openTogetherForest(invite.otherUserId);
    }
  };

  const moment = (state.sharedTreeStartMoments || []).find((item) => item.treeId === treeId)
    || (treeId ? {
      treeId,
      partnerId: invite.otherUserId,
      sceneRole: "accepted",
      createdAt: new Date().toISOString(),
    } : null);

  if (!playSharedTreeStartMoment(moment, { onComplete: openNewTree })) {
    openNewTree();
    showToast(hadCompletedTree ? "함께한 숲에 다음 씨앗을 심었어요." : "둘만의 작은 씨앗을 심었어요.");
  }
}

function sharedTreeStartMomentForFriend(friendId) {
  return (state.sharedTreeStartMoments || []).find((moment) => moment.partnerId === friendId) || null;
}

function removeSharedTreeStartMomentFromState(treeId) {
  state.sharedTreeStartMoments = (state.sharedTreeStartMoments || []).filter((moment) => moment.treeId !== treeId);
}

async function markSharedTreeStartMomentSeen(treeId) {
  if (!treeId || !currentUser) return false;

  const { error } = await supabase.rpc("mark_my_garden_shared_tree_start_moment_seen", {
    p_tree_id: treeId,
  });
  if (error) {
    // 화면은 막지 않습니다. 서버 기록이 실패하면 다음 방문에 한 번 더 나타날 수 있습니다.
    console.warn("TodayForest shared-tree start moment mark skipped:", error);
    return false;
  }
  return true;
}

function sharedTreeStartMomentCopy(moment) {
  const friend = (state.friends || []).find((item) => item.id === moment.partnerId);
  const friendName = friend?.name || "친구";
  const hasCompletedTree = sharedTreesForFriend(moment.partnerId)
    .some((tree) => tree.id !== moment.treeId && sharedTreeIsComplete(tree));

  if (moment.sceneRole === "accepted") {
    return {
      role: "accepted",
      title: hasCompletedTree
        ? "둘의 다음 나무가 이 숲에 심겼어요."
        : "둘의 나무가 이 숲에 심겼어요.",
      body: hasCompletedTree
        ? "완성한 나무 곁에서, 두 사람의 다음 시간이 천천히 자라기 시작해요."
        : "작은 씨앗이 두 사람의 하루를 기다리며 천천히 자라기 시작해요.",
    };
  }

  return {
    role: "proposed",
    title: "친구가 씨앗을 함께 심었어요.",
    body: `${friendName}님이 네가 건넨 씨앗을 받아주었어요. 새 나무가 함께한 숲에서 조용히 기다리고 있어요.`,
  };
}

function playSharedTreeStartMoment(moment, { onComplete = null } = {}) {
  if (!moment || sharedTreeStartMomentPlaying || !els.sharedTreeStartMoment) return false;

  sharedTreeStartMomentPlaying = true;
  removeSharedTreeStartMomentFromState(moment.treeId);

  const copy = sharedTreeStartMomentCopy(moment);
  els.sharedTreeStartMoment.dataset.role = copy.role;
  els.sharedTreeStartMomentTitle.textContent = copy.title;
  els.sharedTreeStartMomentBody.textContent = copy.body;
  els.sharedTreeStartMoment.classList.remove("hidden", "is-visible", "is-leaving");
  document.documentElement.classList.add("shared-tree-start-moment-open");

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => els.sharedTreeStartMoment?.classList.add("is-visible"));
  });

  void markSharedTreeStartMomentSeen(moment.treeId);

  if (sharedTreeStartMomentTimer) window.clearTimeout(sharedTreeStartMomentTimer);
  sharedTreeStartMomentTimer = window.setTimeout(() => {
    els.sharedTreeStartMoment?.classList.add("is-leaving");
    els.sharedTreeStartMoment?.classList.remove("is-visible");

    window.setTimeout(() => {
      els.sharedTreeStartMoment?.classList.add("hidden");
      els.sharedTreeStartMoment?.classList.remove("is-leaving");
      document.documentElement.classList.remove("shared-tree-start-moment-open");
      sharedTreeStartMomentPlaying = false;
      sharedTreeStartMomentTimer = null;
      if (typeof onComplete === "function") onComplete();
    }, 280);
  }, SHARED_TREE_START_MOMENT_DURATION_MS);

  return true;
}

function showSharedTreeStartMomentForFriend(friendId) {
  if (sharedTreeStartMomentPlaying) return false;
  const moment = sharedTreeStartMomentForFriend(friendId);
  return moment ? playSharedTreeStartMoment(moment) : false;
}

function sharedTreeStageForProgress(progress, target) {
  if (progress >= target) return 6;
  const ratio = target > 0 ? progress / target : 0;
  if (ratio >= 0.8) return 5;
  if (ratio >= 0.6) return 4;
  if (ratio >= 0.4) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

function sharedTreeImagePath(stage) {
  return `assets/garden/tree_growth/tree_stage${stage}_sunset.png`;
}

function togetherForestTreeCardMarkup(tree, { current = false, index = 0 } = {}) {
  const target = Math.max(1, Number(tree.targetSteps || 20));
  const progress = Math.min(target, Math.max(0, Number(tree.progressCount || 0)));
  const stage = sharedTreeStageForProgress(progress, target);
  const startDate = formatSharedTreeLifecycleDate(tree.createdAt);
  const completeDate = tree.completedAt ? formatSharedTreeLifecycleDate(tree.completedAt) : "";
  const title = current ? "지금 함께 자라는 나무" : `${completeDate || startDate}의 나무`;
  const meta = current
    ? `빛 ${progress} / ${target} · ${startDate}에 시작`
    : `${startDate}에 시작${completeDate ? ` · ${completeDate}에 완성` : ""}`;
  const aria = current ? "현재 함께 키우는 공유나무 보기" : `${index + 1}번째 완성 공유나무 보기`;

  return `
    <button class="together-forest-tree-card${current ? " is-current" : " is-complete"}" type="button" data-view-shared-tree="${escapeAttr(tree.id)}" aria-label="${escapeAttr(aria)}">
      <span class="together-forest-tree-thumb" aria-hidden="true">
        <img src="${escapeAttr(sharedTreeImagePath(stage))}" alt="" />
      </span>
      <span class="together-forest-tree-copy">
        <span class="together-forest-tree-kicker">${current ? "GROWING TOGETHER" : "OUR MEMORY TREE"}</span>
        <strong>${escapeHTML(title)}</strong>
        <span>${escapeHTML(meta)}</span>
      </span>
      <span class="together-forest-tree-arrow" aria-hidden="true">›</span>
    </button>
  `;
}

function togetherForestNextSeedMarkup(friend, invite) {
  if (invite?.direction === "incoming") {
    return `
      <div class="together-forest-next-seed is-incoming">
        <span class="together-forest-next-seed-icon" aria-hidden="true">✦</span>
        <div class="together-forest-next-seed-copy">
          <strong>${escapeHTML(friend.name)}님이 다음 씨앗을 건넸어요</strong>
          <p>원할 때 수락하면 완성한 나무 곁에서 새 나무가 자라기 시작해요.</p>
        </div>
        <button class="together-forest-next-seed-button" type="button" data-open-shared-tree-invite="${escapeAttr(invite.id)}">함께 심기</button>
      </div>
    `;
  }

  if (invite?.direction === "outgoing") {
    return `
      <div class="together-forest-next-seed is-waiting">
        <span class="together-forest-next-seed-icon" aria-hidden="true">🌱</span>
        <div class="together-forest-next-seed-copy">
          <strong>다음 씨앗을 건넸어요</strong>
          <p>친구가 원할 때 수락하면 새 나무가 시작돼요. 기다리는 동안 이전 나무는 그대로 머물러 있어요.</p>
        </div>
        <span class="together-forest-next-seed-state">천천히 기다리는 중</span>
      </div>
    `;
  }

  return `
    <div class="together-forest-next-seed">
      <span class="together-forest-next-seed-icon" aria-hidden="true">🌱</span>
      <div class="together-forest-next-seed-copy">
        <strong>다음 나무를 함께 심어볼까요?</strong>
        <p>완성한 나무는 이곳에 남고, 새 씨앗은 두 사람의 다음 시간을 담아요.</p>
      </div>
      <button class="together-forest-next-seed-button" type="button" data-invite-next-shared-tree="${escapeAttr(friend.id)}">다음 나무 제안하기</button>
    </div>
  `;
}

function renderTogetherForest(friendId = activeTogetherForestFriendId) {
  const friend = (state.friends || []).find((item) => item.id === friendId);
  if (!friend) return false;

  const trees = sharedTreesForFriend(friendId);
  const currentTrees = trees.filter((tree) => !sharedTreeIsComplete(tree));
  const completedTrees = trees
    .filter((tree) => sharedTreeIsComplete(tree))
    .sort((a, b) => new Date(b.completedAt || b.createdAt || 0).getTime() - new Date(a.completedAt || a.createdAt || 0).getTime());
  const invite = sharedTreeInviteForFriend(friendId);

  els.togetherForestFriendName.textContent = `${friend.name}와의 함께한 숲`;
  els.togetherForestCompletedCount.textContent = completedTrees.length
    ? `완성한 나무 ${completedTrees.length}그루`
    : "아직 완성한 나무가 없어요";

  if (currentTrees.length && completedTrees.length) {
    els.togetherForestSummary.textContent = `지금 자라는 나무와, 함께 완성한 ${completedTrees.length}그루의 나무가 같은 숲에 머물러 있어요.`;
  } else if (currentTrees.length) {
    els.togetherForestSummary.textContent = "두 사람의 빛을 기다리는 나무가 이 숲에서 조용히 자라고 있어요.";
  } else if (completedTrees.length) {
    els.togetherForestSummary.textContent = "함께 보낸 한 시절의 나무가 사라지지 않고 이 숲에 머물러 있어요.";
  } else {
    els.togetherForestSummary.textContent = "아직 이 숲에 머무는 나무가 없어요.";
  }

  els.togetherForestCurrent.innerHTML = currentTrees.length
    ? togetherForestTreeCardMarkup(currentTrees[0], { current: true })
    : completedTrees.length
      ? togetherForestNextSeedMarkup(friend, invite)
      : `
        <div class="together-forest-empty-current">
          <span aria-hidden="true">🌱</span>
          <div>
            <strong>지금 자라는 나무는 없어요</strong>
            <p>첫 씨앗 제안은 친구 목록에서 시작할 수 있어요.</p>
          </div>
        </div>
      `;

  els.togetherForestCompletedList.innerHTML = completedTrees.length
    ? completedTrees.map((tree, index) => togetherForestTreeCardMarkup(tree, { index })).join("")
    : '<div class="together-forest-empty-list">첫 번째 나무가 완성되면 이곳에 두 사람의 시간으로 남아요.</div>';

  els.togetherForestView.querySelectorAll('[data-view-shared-tree]').forEach((button) => {
    button.addEventListener("click", () => openSharedTree(button.dataset.viewSharedTree));
  });
  els.togetherForestView.querySelectorAll('[data-invite-next-shared-tree]').forEach((button) => {
    button.addEventListener("click", () => {
      void inviteSharedTree(button.dataset.inviteNextSharedTree, { nextTree: true });
    });
  });
  els.togetherForestView.querySelectorAll('[data-open-shared-tree-invite]').forEach((button) => {
    button.addEventListener("click", () => openSharedTreeInvite(button.dataset.openSharedTreeInvite));
  });
  return true;
}

function openTogetherForest(friendId, { updateUrl = true, scroll = true, silent = false } = {}) {
  activeTogetherForestFriendId = friendId;
  if (!renderTogetherForest(friendId)) {
    activeTogetherForestFriendId = "";
    if (!silent) showToast("함께한 숲을 찾지 못했어요.");
    return false;
  }

  if (updateUrl) setTogetherForestUrl(friendId);
  closeAllSheets();
  els.gardenApp.classList.add("hidden");
  els.friendVisit.classList.add("hidden");
  els.sharedTreeView.classList.add("hidden");
  els.togetherForestView.classList.remove("hidden");
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });

  // 제안자는 친구가 수락한 사실을 함께한 숲에 들어왔을 때 한 번 발견합니다.
  window.setTimeout(() => {
    if (activeTogetherForestFriendId !== friendId) return;
    if (els.togetherForestView.classList.contains("hidden")) return;
    showSharedTreeStartMomentForFriend(friendId);
  }, 140);
  return true;
}

function returnToFriendsFromTogetherForest() {
  setTogetherForestUrl("");
  els.togetherForestView.classList.add("hidden");
  els.sharedTreeView.classList.add("hidden");
  els.gardenApp.classList.remove("hidden");
  activeTogetherForestFriendId = "";
  activeSharedTreeId = "";
  renderFriends();
  openSheet(els.friendsSheet);
  window.scrollTo({ top: 0, behavior: "smooth" });
}


function sharedTreeNotesForTree(treeId) {
  return (state.sharedTreeNotes || []).filter((note) => note.treeId === treeId);
}

function updateSharedTreeNoteCount() {
  if (!els.sharedTreeNoteInput || !els.sharedTreeNoteCount) return;
  const length = Array.from(els.sharedTreeNoteInput.value || "").length;
  els.sharedTreeNoteCount.textContent = `${length} / 40`;
  els.sharedTreeNoteCount.classList.toggle("is-limit", length >= 40);
}

function renderSharedTreeMemoryNote(tree, friend, isComplete) {
  if (!els.sharedTreeMemoryNote) return;

  els.sharedTreeMemoryNote.classList.toggle("hidden", !isComplete);
  if (!isComplete) return;

  const notes = sharedTreeNotesForTree(tree.id);
  const myNote = notes.find((note) => note.isMine) || null;
  const partnerNote = notes.find((note) => !note.isMine) || null;

  els.sharedTreeMyNoteText.textContent = myNote?.body || "아직 한마디를 남기지 않았어요.";
  els.sharedTreeMyNoteText.classList.toggle("is-empty", !myNote);
  els.sharedTreePartnerNoteLabel.textContent = `${friend.name}의 한마디`;
  els.sharedTreePartnerNoteText.textContent = partnerNote?.body || "아직 남겨진 말이 없어요.";
  els.sharedTreePartnerNoteText.classList.toggle("is-empty", !partnerNote);

  const inputIsBeingEdited =
    document.activeElement === els.sharedTreeNoteInput &&
    els.sharedTreeNoteInput.dataset.treeId === tree.id;
  if (!inputIsBeingEdited) {
    els.sharedTreeNoteInput.value = myNote?.body || "";
  }
  els.sharedTreeNoteInput.dataset.treeId = tree.id;
  els.sharedTreeNoteInput.placeholder = "예: 함께해서 좋았어.";
  els.sharedTreeNoteSubmit.textContent = myNote ? "한마디 수정하기" : "한마디 남기기";
  updateSharedTreeNoteCount();
}

async function saveSharedTreeMemoryNote(event) {
  event.preventDefault();

  const tree = (state.sharedTrees || []).find((item) => item.id === activeSharedTreeId);
  if (!tree) {
    showToast("완성된 나무를 다시 불러와 주세요.");
    return;
  }
  if (!tree.completedAt) {
    showToast("완성된 나무에만 한마디를 남길 수 있어요.");
    return;
  }

  const body = String(els.sharedTreeNoteInput?.value || "").trim();
  const bodyLength = Array.from(body).length;
  if (!bodyLength) {
    showToast("한마디를 한 글자 이상 남겨 주세요.");
    els.sharedTreeNoteInput?.focus();
    return;
  }
  if (bodyLength > 40) {
    showToast("한마디는 40자 안으로 남길 수 있어요.");
    els.sharedTreeNoteInput?.focus();
    return;
  }

  const button = els.sharedTreeNoteSubmit;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "마음을 남기는 중이에요";

  try {
    const { error } = await supabase.rpc("upsert_my_garden_shared_tree_note", {
      p_tree_id: tree.id,
      p_body: body,
    });
    if (error) throw error;

    await loadGardenState();
    renderAll();
    renderSharedTreeView(tree.id);
    showToast("이 나무에 마음 한 줄을 남겼어요.");
  } catch (error) {
    console.warn("TodayForest shared-tree note save error:", error);
    showToast(databaseErrorMessage(error));
  } finally {
    if (activeSharedTreeId === tree.id) {
      renderSharedTreeView(tree.id);
    } else {
      button.disabled = false;
      button.textContent = originalText || "한마디 남기기";
    }
  }
}

function renderSharedTreeView(treeId = activeSharedTreeId) {
  const tree = (state.sharedTrees || []).find((item) => item.id === treeId);
  if (!tree) return false;

  const friend = friendForSharedTree(tree);
  const target = Math.max(1, Number(tree.targetSteps || 20));
  const progress = Math.min(target, Math.max(0, Number(tree.progressCount || 0)));
  const bothToday = tree.myRecordedToday && tree.partnerRecordedToday;
  const serverComplete = Boolean(tree.completedAt);
  const reachedTarget = progress >= target;
  const complete = serverComplete || reachedTarget;
  const stage = sharedTreeStageForProgress(progress, target);

  els.sharedTreePartnerName.textContent = serverComplete
    ? `${friend.name}와 함께 완성한 나무`
    : `${friend.name}와 함께 키우는 나무`;
  els.sharedTreeView.dataset.stage = String(stage);
  if (els.sharedTreeImage) {
    els.sharedTreeImage.src = sharedTreeImagePath(stage);
  }
  els.sharedTreeProgressCount.textContent = `${progress} / ${target}`;
  els.sharedTreeProgressCount.classList.toggle("is-complete", serverComplete);
  els.sharedTreeProgressCopy.textContent = serverComplete
    ? "스무 개의 빛 조각이 모여, 둘만의 나무가 완성됐어요."
    : reachedTarget
      ? "빛 조각은 모두 모였어요. 서버의 완성 기록을 확인하고 있어요."
      : "각자가 오늘의 빛을 남길 때마다 빛 조각이 하나씩 쌓여요.";

  const startedDate = formatSharedTreeLifecycleDate(tree.createdAt);
  els.sharedTreeLifecycle.classList.toggle("is-complete", serverComplete);
  els.sharedTreeLifecycle.classList.toggle("is-pending-completion", reachedTarget && !serverComplete);
  els.sharedTreeLifecycleBadge.textContent = serverComplete
    ? "완성된 나무"
    : reachedTarget
      ? "완성 확인 중"
      : "함께 자라는 중";
  els.sharedTreeLifecycleDates.textContent = serverComplete
    ? `시작 ${startedDate} · 완성 ${formatSharedTreeLifecycleDate(tree.completedAt)}`
    : `시작 ${startedDate}`;

  els.sharedTreeRecordLightButton.disabled = complete || Boolean(tree.myRecordedToday);
  els.sharedTreeRecordLightButton.textContent = serverComplete
    ? "이 나무는 완성되었어요"
    : reachedTarget
      ? "완성 상태를 확인하고 있어요"
      : tree.myRecordedToday
        ? "오늘의 빛을 남겼어요"
        : "오늘의 빛 남기기";
  els.sharedTreeRecordLightButton.setAttribute(
    "aria-label",
    serverComplete
      ? "완성된 공유나무예요"
      : reachedTarget
        ? "공유나무의 완성 상태를 확인하고 있어요"
        : tree.myRecordedToday
          ? "오늘의 빛을 이미 남겼어요"
          : "공유나무에 오늘의 빛을 남기기"
  );
  els.sharedTreeLeaves.innerHTML = Array.from({ length: target }, (_, index) => {
    const filled = index < progress;
    return `<span class="shared-tree-leaf ${filled ? "is-filled" : ""}" aria-hidden="true">${filled ? "✦" : "·"}</span>`;
  }).join("");
  els.sharedTreeLeaves.setAttribute("aria-label", `빛 조각 ${progress}개, 전체 ${target}개`);

  if (complete) {
    els.sharedTreeStageCopy.textContent = `${friend.name}와 함께 심은 나무가 두 사람의 하루를 조용히 기억하고 있어요.`;
  } else if (bothToday) {
    els.sharedTreeStageCopy.textContent = "오늘은 두 개의 빛이 만나, 반딧불이 나무 곁에 모였어요.";
  } else if (tree.myRecordedToday) {
    els.sharedTreeStageCopy.textContent = "네 빛 하나가 씨앗 곁에 닿았어요. 친구의 하루도 기다리고 있어요.";
  } else if (tree.partnerRecordedToday) {
    els.sharedTreeStageCopy.textContent = `${friend.name}의 빛이 먼저 씨앗 곁에 머물러 있어요.`;
  } else {
    els.sharedTreeStageCopy.textContent = "두 개의 작은 빛이 씨앗 곁에서 조용히 기다리고 있어요.";
  }

  els.sharedTreeTodayRow.innerHTML = serverComplete
    ? '<span class="shared-tree-today is-complete">✦ 두 사람의 빛이 모두 모였어요</span>'
    : `
      <span class="shared-tree-today ${tree.myRecordedToday ? "is-on" : ""}">${tree.myRecordedToday ? "✦ 내 빛이 닿았어요" : "○ 오늘의 빛을 기다려요"}</span>
      <span class="shared-tree-today ${tree.partnerRecordedToday ? "is-on" : ""}">${tree.partnerRecordedToday ? `✦ ${escapeHTML(friend.name)}의 빛이 닿았어요` : `○ ${escapeHTML(friend.name)}의 빛을 기다려요`}</span>
    `;
  els.sharedTreeFireflies.innerHTML = bothToday ? '<i>✦</i><i>✦</i><i>✦</i><i>✦</i><i>✦</i><i>✦</i>' : "";
  els.sharedTreeView.classList.toggle("my-recorded-today", Boolean(tree.myRecordedToday));
  els.sharedTreeView.classList.toggle("partner-recorded-today", Boolean(tree.partnerRecordedToday));
  els.sharedTreeView.classList.toggle("both-recorded-today", bothToday);
  els.sharedTreeView.classList.toggle("is-complete", complete);
  renderSharedTreeMemoryNote(tree, friend, serverComplete);
  return true;
}

async function leaveSharedTreeLight() {
  const tree = (state.sharedTrees || []).find((item) => item.id === activeSharedTreeId);
  if (!tree) {
    showToast("함께 키우는 나무를 찾지 못했어요.");
    return;
  }

  const target = Math.max(1, Number(tree.targetSteps || 20));
  const progress = Math.max(0, Number(tree.progressCount || 0));
  if (sharedTreeIsComplete(tree)) {
    showToast("이 나무의 빛 조각은 이미 모두 모였어요.");
    return;
  }
  if (tree.myRecordedToday) {
    showToast("오늘의 빛은 이미 이 나무에 남겼어요. 내일 다시 와요.");
    return;
  }

  const button = els.sharedTreeRecordLightButton;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "빛을 남기는 중이에요";

  try {
    if (tree.isDevPreview) {
      const saved = recordDevSharedTreeLightForToday();
      if (!saved) {
        showToast("오늘의 빛은 이미 이 나무에 남겼어요. 내일 다시 와요.");
        return;
      }
    } else {
      const { error } = await supabase.rpc("add_my_garden_shared_tree_light", { p_tree_id: tree.id });
      if (error) throw error;
    }

    await loadGardenState();
    renderAll();
    renderSharedTreeView(tree.id);
    showToast("오늘의 빛이 둘만의 나무에 닿았어요.");
  } catch (error) {
    console.warn("TodayForest shared-tree light save error:", error);
    showToast(databaseErrorMessage(error));
  } finally {
    // 재조회에 실패했을 때도 버튼이 계속 잠기지 않도록, 현재 상태로 한 번 다시 그립니다.
    if (activeSharedTreeId === tree.id) {
      renderSharedTreeView(tree.id);
    } else {
      button.disabled = false;
      button.textContent = originalText || "오늘의 빛 남기기";
    }
  }
}

function openSharedTree(treeId, { updateUrl = true, scroll = true, silent = false } = {}) {
  activeSharedTreeId = treeId;
  if (!renderSharedTreeView(treeId)) {
    activeSharedTreeId = "";
    if (!silent) showToast("함께 키우는 나무를 찾지 못했어요.");
    return false;
  }

  if (updateUrl) setSharedTreeUrl(treeId);
  closeAllSheets();
  els.gardenApp.classList.add("hidden");
  els.friendVisit.classList.add("hidden");
  els.togetherForestView.classList.add("hidden");
  els.sharedTreeView.classList.remove("hidden");
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  return true;
}

function returnToFriendsFromSharedTree() {
  setSharedTreeUrl("");
  els.sharedTreeView.classList.add("hidden");
  activeSharedTreeId = "";

  if (activeTogetherForestFriendId && renderTogetherForest(activeTogetherForestFriendId)) {
    els.gardenApp.classList.add("hidden");
    els.togetherForestView.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  els.togetherForestView.classList.add("hidden");
  els.gardenApp.classList.remove("hidden");
  renderFriends();
  openSheet(els.friendsSheet);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function friendFoundItemPositionStyle(item) {
  const position = savedFoundItemPosition(item);
  if (!position) return "";
  return ` style="--found-item-x:${position.x}%; --found-item-y:${position.y}%;"`;
}

function normalizeFriendFoundItem(row) {
  return {
    id: row?.id || "",
    itemKey: row?.item_key || "",
    placementSlot: row?.placement_slot || "front_bed_left",
    positionX: row?.position_x,
    positionY: row?.position_y,
  };
}

function renderFriendFoundItems(friendName, rows) {
  if (!els.friendFoundItemsLayer) return 0;

  const foundItems = (rows || [])
    .map(normalizeFriendFoundItem)
    .filter((item) => item.id && foundItemCatalog[item.itemKey]);

  els.friendFoundItemsLayer.innerHTML = foundItems.map((item) => {
    const catalogItem = foundItemCatalog[item.itemKey];
    const position = savedFoundItemPosition(item);
    const positionClass = position ? " has-custom-position" : "";
    const itemName = `${friendName}가 찾은 ${catalogItem.name}`;
    return `
      <button class="friend-found-item found-item found-item-${escapeAttr(item.placementSlot)}${positionClass}" type="button" data-friend-found-item-key="${escapeAttr(item.itemKey)}" data-friend-found-item-name="${escapeAttr(friendName)}" aria-label="${escapeAttr(itemName)}" title="${escapeAttr(itemName)}"${friendFoundItemPositionStyle(item)}>
        <img src="${escapeAttr(catalogItem.asset)}" alt="" draggable="false" />
      </button>
    `;
  }).join("");

  els.friendFoundItemsLayer.setAttribute(
    "aria-label",
    friendName
      ? `${friendName}가 정원에 놓아둔 작은 것 ${foundItems.length}개`
      : "친구가 정원에 놓아둔 작은 것"
  );

  return foundItems.length;
}

function handleFriendFoundItemClick(event) {
  const button = event.target.closest("[data-friend-found-item-key]");
  if (!button || !els.friendFoundItemsLayer?.contains(button)) return;

  const catalogItem = foundItemCatalog[button.dataset.friendFoundItemKey];
  if (!catalogItem) return;

  const friendName = button.dataset.friendFoundItemName || "친구";
  showToast(`${friendName}가 숲에서 찾은 ${catalogItem.name}이에요.`);
}

async function openFriendGarden(friendId) {
  const fallbackFriend = (state.friends || []).find((friend) => friend.id === friendId);
  if (!friendId || !fallbackFriend) {
    showToast("친구 정원을 찾지 못했어요.");
    return;
  }

  // 이전에 방문한 친구의 장식과 공개 열매가 잠깐 남아 보이지 않도록, 새 조회를 시작하기 전에 비웁니다.
  renderFriendFoundItems("", []);
  activeFriendFruitRecords = [];
  activeFriendFruitName = "";
  renderFriendHeartFruits(0, []);

  const [friendViewResult, friendItemsResult, friendFruitsResult] = await Promise.all([
    supabase.rpc("get_my_garden_friend_view", { p_friend_id: friendId }),
    supabase.rpc("list_my_garden_friend_dev_found_items", { p_friend_id: friendId }),
    supabase.rpc("list_my_garden_friend_fruits", { p_friend_id: friendId }),
  ]);

  const { data, error } = friendViewResult;
  if (error) {
    console.error("TodayForest friend garden load error:", error);
    showToast(databaseErrorMessage(error));
    return;
  }

  const friend = normalizeRpcRow(data);
  if (!friend) {
    showToast("친구 정원을 찾지 못했어요.");
    return;
  }

  const growth = Number(friend.growth_count ?? fallbackFriend.growth ?? 0);
  const weather = weatherForGarden(friend.friend_id || friendId);
  const stage = stageForGrowth(growth);
  const name = friend.nickname || fallbackFriend.name || "친구";
  const friendDecorationCount = friendItemsResult.error
    ? 0
    : renderFriendFoundItems(name, friendItemsResult.data || []);

  activeFriendFruitName = name;
  activeFriendFruitRecords = friendFruitsResult.error ? [] : (friendFruitsResult.data || []).map((record) => ({
    id: record.id,
    mood: record.mood,
    oneLine: record.one_line,
    detail: record.detail || "",
    isPublic: true,
    createdAt: record.created_at,
  }));
  renderFriendHeartFruits(growth, activeFriendFruitRecords);

  if (friendItemsResult.error) {
    // 친구 정원 본문은 계속 열되, DEV 읽기 RPC 연결 문제는 콘솔에서만 확인합니다.
    console.warn("TodayForest friend decoration load skipped:", friendItemsResult.error);
  }
  if (friendFruitsResult.error) {
    console.warn("TodayForest friend heart-fruit load skipped:", friendFruitsResult.error);
  }

  activeFriendGardenId = friend.friend_id || friendId;
  els.friendVisitName.textContent = `${name}의 정원`;
  els.friendVisitTree.src = `assets/garden/tree_growth/${stage.asset}`;
  els.friendVisitTree.alt = `${name}의 ${stage.label}`;
  els.friendVisitDayCount.textContent = `마음 ${growth}일째`;
  els.friendVisitStageLabel.textContent = stage.label;
  els.friendVisitWeatherIcon.textContent = weather.icon;
  els.friendVisitWeatherText.textContent = weather.text;
  els.friendVisitMessage.textContent = friendDecorationCount > 0
    ? `${name}의 정원에는 숲에서 찾은 작은 것 ${friendDecorationCount}개가 놓여 있어요.`
    : `${name}의 나무에도 ${weather.message}`;
  applyWeatherVisuals(els.friendVisitStage, els.friendVisitTreeWrap, els.friendVisitRainLayer, weather, `${friend.friend_id || friendId}:${seoulDateKey()}:friend-garden`);

  closeAllSheets();
  els.gardenApp.classList.add("hidden");
  els.friendVisit.classList.remove("hidden");
  window.requestAnimationFrame(syncFriendGardenWorldScale);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function returnToMyGarden() {
  els.friendVisit.classList.add("hidden");
  els.gardenApp.classList.remove("hidden");
  els.friendVisitRainLayer.classList.remove("active");
  els.friendVisitTreeWrap.classList.remove("wind-active");
  els.friendVisitStage.classList.remove("weather-rain");
  renderFriendFoundItems("", []);
  activeFriendFruitRecords = [];
  activeFriendFruitName = "";
  renderFriendHeartFruits(0, []);
  activeFriendGardenId = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function enableDevTestFriend() {
  if (!currentUser) {
    showToast("내 정원을 먼저 로그인해 주세요.");
    return;
  }

  const button = els.enableDevFriendButton;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "테스트 새싹을 심는 중이에요";

  try {
    const { data, error } = await supabase.rpc("enable_my_dev_test_friend");
    if (error) throw error;

    const row = normalizeRpcRow(data);
    if (!row?.friend_id) {
      throw new Error("테스트 친구 정보를 받지 못했어요.");
    }

    // 먼저 화면에 즉시 반영합니다. 이후의 목록 새로고침이 늦거나 실패해도
    // 사용자가 만든 테스트 친구가 사라진 것처럼 보이지 않게 합니다.
    const testFriend = {
      id: row.friend_id,
      name: row.nickname || "테스트 새싹",
      avatarUrl: "",
      growth: Number(row.growth_count || 5),
      becameFriendsAt: new Date().toISOString(),
      isDevTest: true,
    };
    state.friends = [
      testFriend,
      ...(state.friends || []).filter((friend) => !friend.isDevTest),
    ];
    selectedLetterRecipientId = testFriend.id;
    renderAll();
    showToast("테스트 새싹이 내 정원 친구 목록에 왔어요.");

    // 저장된 데이터도 다시 읽어와 다음 새로고침 뒤의 상태까지 맞춥니다.
    try {
      await loadGardenState();
      renderAll();
    } catch (refreshError) {
      console.warn("DEV test friend refresh skipped:", refreshError);
    }
  } catch (error) {
    console.error("DEV test friend creation error:", error);
    const detail = String(error?.message || "").trim();
    showToast(detail ? `테스트 새싹을 만들지 못했어요: ${detail}` : "테스트 새싹을 만들지 못했어요. 다시 시도해 주세요.");
  } finally {
    button.disabled = false;
    button.textContent = originalText || "테스트 새싹 친구 만들기";
  }
}

async function simulateDevFriendRead(letterId) {
  const { error } = await supabase.rpc("mark_dev_test_garden_letter_read", { p_letter_id: letterId });
  if (error) {
    showToast(databaseErrorMessage(error));
    return;
  }
  await loadGardenState();
  renderAll();
  showToast("테스트 새싹이 편지를 마음에 담았어요.");
}

function shortDelivery(text) {
  if (text.includes("고슴도치")) return "고슴도치가 전해줌";
  if (text.includes("토끼")) return "토끼가 전해줌";
  if (text.includes("다람쥐")) return "다람쥐가 전해줌";
  if (text.includes("빠른 새")) return "빠른 새가 전해줌";
  if (text.includes("새싹새")) return "새싹새가 전해줌";
  if (text.includes("작은 새")) return "작은 새가 전해줌";
  if (text.includes("숲 유니콘")) return "숲 유니콘이 전해줌";
  return "숲친구가 전해줌";
}

async function openLetter(letterId) {
  const letter = state.letters.find((item) => item.id === letterId);
  if (!letter) return;

  activeLetterId = letterId;
  els.letterFrom.textContent = letter.from;
  els.letterModalTitle.textContent = letter.title;
  els.letterDelivery.textContent = letter.delivery;
  els.letterDate.textContent = formatDate(letter.date);
  $("#readLetterButton").textContent = "마음을 받았어요";
  els.letterModal.classList.remove("hidden");

  if (letter.isPreview || letter.isRetentionTest || letter.bodyLoaded) {
    els.letterBody.textContent = letter.body || "";
    return;
  }

  els.letterBody.textContent = "봉투를 조심히 펼치는 중이에요…";
  const { data, error } = letter.isSpecialFriendLetter
    ? await supabase.rpc("get_my_garden_special_friend_letter_body_v1", { p_letter_id: letter.specialLetterId })
    : await supabase.rpc("get_my_garden_letter_body", { p_letter_id: letter.id });
  if (error) {
    console.warn("TodayForest letter body load skipped:", error);
    if (activeLetterId === letterId) {
      els.letterBody.textContent = "편지 내용을 펼치지 못했어요. 잠시 뒤 다시 열어봐요.";
    }
    return;
  }

  const loaded = normalizeRpcRow(data);
  if (!loaded || activeLetterId !== letterId) return;

  letter.body = loaded.body || "";
  letter.bodyLoaded = true;
  els.letterBody.textContent = letter.body;
}

function closeLetterModal() {
  els.letterModal.classList.add("hidden");
  activeLetterId = null;
}

async function markLetterRead() {
  const letter = state.letters.find((item) => item.id === activeLetterId);
  if (letter) {
    if (letter.isPreview) {
      dismissReceivedPreview(letter.id);
    } else if (letter.isRetentionTest) {
      const { data, error } = await supabase.rpc("dismiss_my_garden_retention_dev_test", { p_test_id: letter.retentionTestId });
      if (error || data !== true) {
        showToast("개발용 편지 상태를 정리하지 못했어요. 다시 시도해 주세요.");
        return;
      }
    } else if (letter.isSpecialFriendLetter) {
      const { data, error } = await supabase.rpc("receive_my_garden_special_friend_letter_v1", { p_letter_id: letter.specialLetterId });
      if (error || data !== true) {
        showToast("편지 상태를 저장하지 못했어요. 다시 시도해 주세요.");
        return;
      }
    } else {
      // '마음을 받았어요'를 누른 시각이 30일 보관 기준이 됩니다.
      const { data, error } = await supabase.rpc("receive_garden_letter", { p_letter_id: letter.id });
      if (error || data !== true) {
        showToast("편지 상태를 저장하지 못했어요. 다시 시도해 주세요.");
        return;
      }
    }
    // 받은 편지는 한 번 마음을 받으면 보관함에 쌓지 않고, 정원에서 조용히 사라집니다.
    state.letters = state.letters.filter((item) => item.id !== letter.id);
    renderGarden();
    renderLetters();
    closeLetterModal();
    showToast("마음이 바람을 타고 정원에 스며들었어요.");
    return;
  }
  closeLetterModal();
}

function renderMoodSelection() {
  $$(".mood-choice").forEach((button) => button.classList.toggle("selected", button.dataset.mood === selectedMood));
}

function renderFeedbackCategorySelection() {
  $$("[data-feedback-category]").forEach((button) => {
    const selected = button.dataset.feedbackCategory === selectedFeedbackCategory;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function feedbackCategoryLabel(category) {
  return ({ issue: "불편한 점", idea: "바라는 점", cheer: "응원 한마디" })[category] || "남긴 말";
}

function renderFeedbackTab() {
  const showingHistory = activeFeedbackTab === "history";
  els.feedbackWriteTab.classList.toggle("selected", !showingHistory);
  els.feedbackHistoryTab.classList.toggle("selected", showingHistory);
  els.feedbackWriteTab.setAttribute("aria-selected", String(!showingHistory));
  els.feedbackHistoryTab.setAttribute("aria-selected", String(showingHistory));
  els.feedbackWritePanel.classList.toggle("hidden", showingHistory);
  els.feedbackHistoryPanel.classList.toggle("hidden", !showingHistory);
}

function renderFeedbackHistory(items = []) {
  if (!items.length) {
    els.feedbackHistoryList.innerHTML = '<p class="feedback-history-empty">아직 남긴 말이 없어요. 이 숲에 바라는 마음이 생기면 언제든 들려주세요.</p>';
    return;
  }

  els.feedbackHistoryList.innerHTML = items.map((item) => {
    const reply = String(item.operator_reply || "").trim();
    const replyDate = item.operator_replied_at ? formatDate(item.operator_replied_at) : "";
    const replyMarkup = reply
      ? `
        <div class="feedback-operator-reply">
          <p class="feedback-reply-kicker">✦ 숲에서 답장이 도착했어요${replyDate ? ` · ${escapeHTML(replyDate)}` : ""}</p>
          <p>${escapeHTML(reply)}</p>
        </div>`
      : '<p class="feedback-awaiting-reply">운영자에게 잘 전달되었어요. 답장이 오면 이곳에서 확인할 수 있어요.</p>';

    return `
      <article class="feedback-history-item">
        <div class="feedback-history-head">
          <strong>${escapeHTML(feedbackCategoryLabel(item.category))}</strong>
          <time datetime="${escapeHTML(item.created_at || "")}">${escapeHTML(formatDate(item.created_at))}</time>
        </div>
        <p class="feedback-my-message">${escapeHTML(item.message || "")}</p>
        ${replyMarkup}
      </article>`;
  }).join("");
}

async function loadMyGardenFeedback() {
  if (!currentUser) return;
  els.feedbackHistoryList.innerHTML = '<p class="feedback-history-loading">내가 남긴 말을 불러오고 있어요.</p>';
  try {
    const { data, error } = await supabase.rpc("list_my_garden_feedback");
    if (error) throw error;
    renderFeedbackHistory(data || []);
  } catch (error) {
    console.error("TodayForest feedback history load error:", error);
    els.feedbackHistoryList.innerHTML = '<p class="feedback-history-empty">내가 남긴 말을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>';
  }
}

async function selectFeedbackTab(tab) {
  activeFeedbackTab = tab === "history" ? "history" : "write";
  renderFeedbackTab();
  if (activeFeedbackTab === "history") await loadMyGardenFeedback();
}

function openFeedbackSheet() {
  if (!currentUser) {
    showToast("내 정원을 먼저 로그인해 주세요.");
    return;
  }
  renderFeedbackCategorySelection();
  activeFeedbackTab = "write";
  renderFeedbackTab();
  openSheet(els.feedbackSheet);
}

function openSupportSheet() {
  openSheet(els.supportSheet);
}

async function submitGardenFeedback(event) {
  event.preventDefault();
  if (!currentUser) {
    showToast("내 정원을 먼저 로그인해 주세요.");
    return;
  }

  const message = els.feedbackMessage.value.trim();
  const validCategories = new Set(["issue", "idea", "cheer"]);
  if (!validCategories.has(selectedFeedbackCategory)) {
    selectedFeedbackCategory = "idea";
    renderFeedbackCategorySelection();
  }
  if (!message) {
    showToast("전하고 싶은 말을 짧게라도 적어 주세요.");
    els.feedbackMessage.focus();
    return;
  }

  const submitButton = els.feedbackForm.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "운영자에게 전하는 중이에요";

  try {
    const { error } = await supabase.rpc("submit_my_garden_feedback", {
      p_category: selectedFeedbackCategory,
      p_message: message,
    });
    if (error) throw error;

    els.feedbackForm.reset();
    selectedFeedbackCategory = "idea";
    renderFeedbackCategorySelection();
    await selectFeedbackTab("history");
    showToast("소중한 말을 잘 받았어요. 답장이 오면 여기에서 만날 수 있어요.");
  } catch (error) {
    console.error("TodayForest feedback save error:", error);
    showToast("말을 전하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText || "운영자에게 말 남기기";
  }
}

async function saveRecord(event) {
  event.preventDefault();
  const oneLine = els.oneLine.value.trim();
  const detail = els.detailText.value.trim();
  const submitButton = els.recordForm.querySelector('button[type="submit"]');

  if (isTutorialSandboxPreview()) {
    if (!oneLine) {
      showToast("튜토리얼에서도 오늘 마음에 남은 한 줄을 적어보세요.");
      els.oneLine.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "숲빛이 마음을 품고 있어요";
    await new Promise((resolve) => window.setTimeout(resolve, 460));
    tutorialSandbox.recorded = true;
    tutorialSandbox.found = false;
    submitButton.disabled = false;
    submitButton.textContent = "나무에 마음 남기기";

    els.recordForm.reset();
    selectedMood = "good";
    renderMoodSelection();
    els.detailWrap.classList.add("hidden");
    els.toggleDetail.innerHTML = '조금 더 적기 <span aria-hidden="true">⌄</span>';
    closeAllSheets({ force: true });
    renderAll();
    els.treeWrap.classList.remove("tree-pulse");
    void els.treeWrap.offsetWidth;
    els.treeWrap.classList.add("tree-pulse");
    showToast("미리보기에서 마음이 나무에 닿았어요. 이제 풀숲의 빛을 따라가요.");
    return;
  }

  if (hasSavedToday()) {
    closeAllSheets();
    renderGarden();
    showToast("오늘의 마음은 이미 나무에 남겼어요. 내일 다시 와요.");
    return;
  }
  if (!oneLine) {
    showToast("오늘 마음에 남은 한 줄을 적어주세요.");
    els.oneLine.focus();
    return;
  }
  if (!currentUser) {
    showToast("내 정원을 먼저 로그인해 주세요.");
    return;
  }

  const treeWasCompleteBeforeSave = Number(state.growth || 0) >= HEART_FRUIT_COMPLETE_COUNT;

  submitButton.disabled = true;
  submitButton.textContent = "나무에 마음을 남기는 중이에요";
  const { error } = await supabase.rpc("save_garden_record", {
    p_mood: selectedMood,
    p_one_line: oneLine,
    p_detail: detail || null,
  });
  submitButton.disabled = false;
  submitButton.textContent = "나무에 마음 남기기";

  if (error) {
    if (String(error?.message || "").includes("TODAY_RECORD_ALREADY_SAVED")) {
      try {
        await loadGardenState();
      } catch (loadError) {
        console.warn("TodayForest daily record refresh skipped:", loadError);
      }
      closeAllSheets();
      renderAll();
      showToast("오늘의 마음은 이미 나무에 남겼어요. 내일 다시 와요.");
      return;
    }
    showToast(databaseErrorMessage(error));
    return;
  }

  try {
    await loadGardenState();
  } catch (loadError) {
    showToast(databaseErrorMessage(loadError));
    return;
  }

  window.dispatchEvent(new CustomEvent("todayforest:garden-record-saved"));

  trackTodayForestOperationalEvent("garden_mood_saved", {
    mood: selectedMood,
    detail_added: detail ? "yes" : "no",
  });

  const treeCompletedWithThisRecord = !treeWasCompleteBeforeSave
    && Number(state.growth || 0) >= HEART_FRUIT_COMPLETE_COUNT;

  els.recordForm.reset();
  selectedMood = "good";
  renderMoodSelection();
  els.detailWrap.classList.add("hidden");
  els.toggleDetail.innerHTML = '조금 더 적기 <span aria-hidden="true">⌄</span>';
  closeAllSheets();

  // 30번째 마음은 일반 저장 반응 대신, 기록 화면이 닫힌 뒤 정원에서 완성 장면으로 이어집니다.
  pendingHeartFruitCompletionReveal = treeCompletedWithThisRecord;
  renderAll();

  if (treeCompletedWithThisRecord) {
    return;
  }

  els.treeWrap.classList.remove("tree-pulse");
  void els.treeWrap.offsetWidth;
  els.treeWrap.classList.add("tree-pulse");
  showToast(
    canDiscoverFoundItem()
      ? "오늘의 마음이 내 정원에 저장됐어요. 풀숲 어딘가가 반짝이고 있어요."
      : "오늘의 마음이 내 정원에 저장됐어요."
  );
}

function getInviteTokenFromUrl() {
  const tokenFromUrl = new URL(window.location.href).searchParams.get("invite");
  const tokenFromSession = window.sessionStorage.getItem("todayforest_pending_friend_invite");
  const token = tokenFromUrl || tokenFromSession || "";
  return /^[0-9a-fA-F-]{36}$/.test(token) ? token : "";
}

function clearInviteFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  window.sessionStorage.removeItem("todayforest_pending_friend_invite");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

async function previewFriendInviteFromUrl() {
  const token = getInviteTokenFromUrl();
  if (!currentUser || !token || invitePreviewHandled) return;
  invitePreviewHandled = true;

  const { data, error } = await supabase.rpc("preview_garden_friend_invite", { p_token: token });
  if (error) {
    showToast("친구 초대 링크를 확인하지 못했어요.");
    return;
  }

  const invite = normalizeRpcRow(data);
  if (!invite) {
    clearInviteFromUrl();
    showToast("이 친구 초대 링크는 이미 사용됐거나 만료되었어요.");
    return;
  }

  if (invite.inviter_id === currentUser.id) {
    clearInviteFromUrl();
    showToast("내가 만든 초대 링크예요. 친구에게 보내보세요.");
    return;
  }

  pendingFriendInvite = { token, inviterName: invite.inviter_nickname || "친구" };
  els.friendInviteFrom.textContent = `${pendingFriendInvite.inviterName}의 정원`;
  els.friendInviteModal.classList.remove("hidden");
}

function closeFriendInviteModal({ keepLink = false } = {}) {
  els.friendInviteModal.classList.add("hidden");
  if (!keepLink) clearInviteFromUrl();
  pendingFriendInvite = null;
}

async function acceptFriendInvite() {
  if (!pendingFriendInvite) return;
  const button = els.acceptFriendInviteButton;
  button.disabled = true;
  button.textContent = "친구 정원을 잇는 중이에요";

  const { data, error } = await supabase.rpc("accept_garden_friend_invite", { p_token: pendingFriendInvite.token });

  button.disabled = false;
  button.textContent = "친구 되기";
  if (error) {
    showToast(String(error.message || "친구 초대를 수락하지 못했어요."));
    return;
  }

  const friend = normalizeRpcRow(data);
  trackTodayForestOperationalEvent("garden_friend_connected", {
    connection_method: "invite_accept",
  });
  clearInviteFromUrl();
  pendingFriendInvite = null;
  els.friendInviteModal.classList.add("hidden");
  await loadGardenState();
  renderAll();
  showToast(`${friend?.friend_nickname || "친구"}님과 이제 함께 자라요.`);
}

async function createFriendInvite() {
  if (!currentUser) return;
  const button = els.createInviteButton;
  button.disabled = true;
  button.textContent = "초대 링크를 준비하는 중이에요";

  const { data, error } = await supabase.rpc("create_garden_friend_invite");

  button.disabled = false;
  button.textContent = "친구 초대 링크 만들기";
  if (error) {
    showToast(databaseErrorMessage(error));
    return;
  }

  const invite = normalizeRpcRow(data);
  if (!invite?.invite_token) {
    showToast("초대 링크를 만들지 못했어요. 다시 시도해 주세요.");
    return;
  }

  activeInviteLink = `${window.location.origin}${window.location.pathname}?invite=${invite.invite_token}`;
  els.inviteLink.value = activeInviteLink;
  els.inviteLinkWrap.classList.remove("hidden");
  els.inviteExpiry.classList.remove("hidden");
  els.inviteExpiry.textContent = `${formatShortDate(invite.expires_at)}까지 쓸 수 있는 1회용 초대 링크예요.`;
  showToast("친구 초대 링크를 만들었어요.");
}

async function copyFriendInviteLink() {
  const link = els.inviteLink.value || activeInviteLink;
  if (!link) {
    showToast("먼저 친구 초대 링크를 만들어 주세요.");
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    showToast("초대 링크를 복사했어요. 카카오톡에 붙여넣어 보내보세요.");
  } catch (error) {
    els.inviteLink.focus();
    els.inviteLink.select();
    showToast("링크를 선택했어요. 복사해서 카카오톡에 붙여넣어 주세요.");
  }
}

async function removeFriend(friendId, name, isDevTest = false) {
  if (!friendId) return;
  const prompt = isDevTest
    ? `${name || "테스트 새싹"}을 개발용 친구 목록에서 지울까요?\n테스트로 보낸 편지도 함께 지워져요.`
    : `${name || "이 친구"}님과의 친구 관계를 끝낼까요?\n서로 새 편지는 보낼 수 없게 돼요.`;
  const okay = window.confirm(prompt);
  if (!okay) return;

  const { error } = isDevTest
    ? await supabase.rpc("remove_my_dev_test_friend")
    : await supabase.rpc("remove_garden_friend", { p_friend_id: friendId });
  if (error) {
    showToast(databaseErrorMessage(error));
    return;
  }

  await loadGardenState();
  renderAll();
  showToast(isDevTest ? "테스트 새싹과 테스트 편지를 정리했어요." : `${name || "친구"}님과의 친구 관계를 정리했어요.`);
}

function showToast(message, duration = 3200) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  toastTimer = window.setTimeout(() => els.toast.classList.add("hidden"), duration);
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[char]));
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, "&#96;");
}

function setAuthError(message = "") {
  els.authError.textContent = message;
  els.authError.classList.toggle("hidden", !message);
}

function renderAuthUI() {
  const isSignedIn = Boolean(currentUser);
  const onboardingVisible = welcomeFlowMode === "onboarding";
  const welcomeSurfaceVisible = onboardingVisible || welcomeFlowMode === "transitioning";
  const showPublicHome = !isSignedIn && publicEntryView !== "auth";
  const showAuthScreen = !isSignedIn && publicEntryView === "auth";

  els.publicHome?.classList.toggle("hidden", !showPublicHome);
  els.authScreen.classList.toggle("hidden", !showAuthScreen);
  document.body.classList.toggle("is-public-home", showPublicHome);
  document.body.classList.toggle("is-auth-entry", showAuthScreen);

  // 신규 사용자는 손님맞이 장면을 마칠 때까지 실제 정원 UI를 뒤에만 준비합니다.
  els.gardenApp.classList.toggle("hidden", !isSignedIn || onboardingVisible);
  if (!welcomeSurfaceVisible && !isWelcomePreviewMode()) {
    els.welcomePreview?.classList.add("hidden");
  }

  if (isSignedIn) {
    const accountName = state.profileName || displayName(currentUser);
    const gardenName = state.treeName || accountName;
    els.accountName.textContent = `${gardenName}의 정원`;
    els.accountButton.setAttribute("aria-label", `${gardenName}의 정원`);
  }
}

function openPublicLogin() {
  if (currentUser) return;
  publicEntryView = "auth";
  renderAuthUI();
  window.scrollTo({ top: 0, behavior: "auto" });
  window.setTimeout(() => els.signInKakao?.focus(), 80);
}

function returnToPublicHome() {
  if (currentUser) return;
  publicEntryView = "home";
  setAuthError("");
  renderAuthUI();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function tutorialPreviewPhase() {
  const preview = new URL(window.location.href).searchParams.get("tutorialPreview") || "";
  return ["intro", "record", "discovery"].includes(preview) ? preview : "";
}

function isTutorialSandboxPreview() {
  // intro 주소는 첫 인사 → 기록 → 발견까지 전부 검수하는 안전한 샌드박스입니다.
  return tutorialPreviewPhase() === "intro";
}

function firstWalkGuideIsAvailable() {
  const preview = tutorialPreviewPhase();
  if (isTutorialSandboxPreview()) return !tutorialSandbox.recorded && !tutorialSandbox.found;
  if (preview === "record") return true;
  return Boolean(currentUser)
    && !isTreeNameSetupRequired()
    && Array.isArray(state.records)
    && state.records.length === 0;
}

function firstDiscoveryGuideIsAvailable() {
  const preview = tutorialPreviewPhase();
  if (isTutorialSandboxPreview()) return tutorialSandbox.recorded && !tutorialSandbox.found;
  if (preview === "discovery") return true;
  return Boolean(currentUser)
    && !isTreeNameSetupRequired()
    && Array.isArray(state.records)
    && state.records.length === 1
    && canDiscoverFoundItem();
}

function recordSheetIsOpen() {
  return Boolean(els.recordSheet && !els.recordSheet.classList.contains("hidden"));
}

function anotherSheetIsOpen() {
  const sheets = [
    els.recordsSheet,
    els.heartFruitSheet,
    els.friendsSheet,
    els.lettersSheet,
    els.feedbackSheet,
    els.supportSheet,
    els.accountMenuSheet,
    els.letterComposerSheet,
    els.treeNameSheet,
  ];
  return sheets.some((sheet) => sheet && !sheet.classList.contains("hidden"));
}

function clearGardenTutorialTimer() {
  if (gardenTutorialTimer) window.clearTimeout(gardenTutorialTimer);
  if (firstWalkGuideLayoutTimer) window.clearTimeout(firstWalkGuideLayoutTimer);
  if (firstWalkGuideTravelTimer) window.clearTimeout(firstWalkGuideTravelTimer);
  gardenTutorialTimer = null;
  firstWalkGuideLayoutTimer = null;
  firstWalkGuideTravelTimer = null;
  els.firstWalkTutorial?.classList.remove("is-guide-traveling");
}

const firstWalkScenes = Object.freeze({
  intro: {
    label: "첫날의 작은 산책",
    count: "1 / 3",
    title: "안녕, 이곳은 너의 작은 정원이야.",
    body: "오늘의 마음이 머무는 만큼, 나무도 천천히 자라요.",
    hint: "화면을 살짝 눌러 숲빛을 따라가요",
  },
  record: {
    label: "첫날의 작은 산책",
    count: "2 / 3",
    title: "숲빛이 오늘의 마음으로 내려갔어.",
    body: "지금 마음 하나만, 나무에 남겨볼래?",
    hint: "아래의 ‘마음 남기기’를 눌러주세요",
  },
  discovery: {
    label: "첫날의 작은 산책",
    count: "3 / 3",
    title: "오늘의 마음이 나무에 닿았어.",
    body: "풀숲에 작은 빛이 보여. 눌러서 오늘의 작은 것을 찾아봐.",
    hint: "반짝이는 별빛을 눌러주세요",
  },
  complete: {
    label: "첫날의 작은 산책",
    count: "마침",
    title: "오늘의 작은 산책을 마쳤어요.",
    body: "오늘 찾은 작은 것이 네 정원에 자리를 잡았어. 내일도 천천히 들러줘.",
    hint: "",
  },
});

function firstWalkCompletionItem() {
  if (!firstWalkCompletionFoundItemId || !els.foundItemsLayer) return null;
  return Array.from(els.foundItemsLayer.querySelectorAll(".found-item"))
    .find((item) => item.dataset.foundItemId === firstWalkCompletionFoundItemId) || null;
}

function firstWalkTargetForPhase(phase) {
  if (phase === "record") return $("#openRecord");
  if (phase === "discovery") return els.foundItemSparkle;
  if (phase === "complete") return firstWalkCompletionItem() || els.treeWrap;
  return els.treeWrap;
}

function setFirstWalkCardPosition(target, phase) {
  if (!els.firstWalkTutorial) return;
  if (phase !== "record" || !target?.getBoundingClientRect) {
    els.firstWalkTutorial.style.removeProperty("--first-walk-card-bottom");
    return;
  }
  const rect = target.getBoundingClientRect();
  // 카드와 버튼 사이에 숨 쉴 틈을 남겨, 시선이 카드 → 숲빛 → 버튼으로 이어지게 합니다.
  const desiredBottom = Math.max(22, window.innerHeight - rect.top + 34);
  const maxBottom = Math.max(22, window.innerHeight - 170);
  els.firstWalkTutorial.style.setProperty(
    "--first-walk-card-bottom",
    `${Math.round(Math.min(desiredBottom, maxBottom))}px`
  );
}

function showFirstWalkGuideTrail(from, to) {
  const tutorial = els.firstWalkTutorial;
  if (!tutorial || !from || !to) return;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const arc = Math.min(26, Math.max(10, Math.abs(dx) * 0.08 + 12));
  const points = [0.20, 0.42, 0.64, 0.82];

  points.forEach((ratio, index) => {
    const bend = Math.sin(ratio * Math.PI) * arc;
    tutorial.style.setProperty(`--first-walk-trail-x-${index + 1}`, `${Math.round(from.x + (dx * ratio) + bend)}px`);
    tutorial.style.setProperty(`--first-walk-trail-y-${index + 1}`, `${Math.round(from.y + (dy * ratio))}px`);
  });

  tutorial.classList.remove("is-guide-traveling");
  void tutorial.offsetWidth;
  tutorial.classList.add("is-guide-traveling");
  if (firstWalkGuideTravelTimer) window.clearTimeout(firstWalkGuideTravelTimer);
  firstWalkGuideTravelTimer = window.setTimeout(() => {
    firstWalkGuideTravelTimer = null;
    tutorial.classList.remove("is-guide-traveling");
  }, 1500);
}

function positionFirstWalkGuide(phase, { animate = true } = {}) {
  const guide = els.firstWalkGuideLight;
  const tutorial = els.firstWalkTutorial;
  const target = firstWalkTargetForPhase(phase);
  if (!guide || !tutorial || !target?.getBoundingClientRect) return;

  const rect = target.getBoundingClientRect();
  let x = rect.left + (rect.width / 2);
  let y = rect.top + (rect.height / 2);

  if (phase === "intro" || phase === "complete") {
    y = rect.top + (rect.height * 0.38);
  } else if (phase === "record") {
    // 숲빛이 버튼 위에 '도착'한 것처럼, 버튼 가운데보다 조금 위에 멈춥니다.
    y = rect.top - 22;
  }

  const previousPosition = firstWalkGuidePosition;
  if (!animate) guide.classList.add("is-instant");
  tutorial.style.setProperty("--first-walk-guide-x", `${Math.round(x)}px`);
  tutorial.style.setProperty("--first-walk-guide-y", `${Math.round(y)}px`);
  setFirstWalkCardPosition(target, phase);

  if (phase === "record" && animate && previousPosition) {
    showFirstWalkGuideTrail(previousPosition, { x, y });
  } else if (phase !== "record") {
    tutorial.classList.remove("is-guide-traveling");
  }

  firstWalkGuidePosition = { x, y };
  void guide.offsetWidth;
  if (!animate) {
    window.requestAnimationFrame(() => guide.classList.remove("is-instant"));
  }
}

function updateFirstWalkSceneCopy(phase) {
  const scene = firstWalkScenes[phase] || firstWalkScenes.intro;
  if (els.firstWalkTutorialLabel) els.firstWalkTutorialLabel.textContent = scene.label;
  if (els.firstWalkTutorialCount) els.firstWalkTutorialCount.textContent = scene.count;
  if (els.firstWalkTutorialTitle) els.firstWalkTutorialTitle.textContent = scene.title;
  if (els.firstWalkTutorialBody) els.firstWalkTutorialBody.textContent = scene.body;
  if (els.firstWalkTutorialHint) {
    els.firstWalkTutorialHint.textContent = scene.hint;
    els.firstWalkTutorialHint.hidden = !scene.hint;
  }
}

function setFirstWalkTargetFocus(phase) {
  $("#openRecord")?.classList.toggle("is-tutorial-focus", phase === "record");
  els.foundItemSparkle?.classList.toggle("is-tutorial-focus", phase === "discovery");
  firstWalkCompletionItem()?.classList.toggle("is-tutorial-complete-focus", phase === "complete");
}

function hideGardenTutorial({ keepPhase = false } = {}) {
  clearGardenTutorialTimer();
  // 완료 직전의 발견물 강조는 ID를 비우기 전에 먼저 걷어냅니다.
  setFirstWalkTargetFocus("");
  if (!keepPhase) gardenTutorialPhase = "";
  if (!keepPhase) firstWalkGuidePosition = null;
  if (!keepPhase) firstWalkCompletionFoundItemId = "";
  els.firstWalkTutorial?.classList.add("hidden");
  els.firstWalkTutorial?.removeAttribute("data-phase");
  els.gardenApp?.classList.remove("is-first-walk-guide");
  els.recordTutorialNote?.classList.add("hidden");
}

function showFirstWalkTutorialScene(phase, { animateGuide = true } = {}) {
  if (!els.firstWalkTutorial) return;
  gardenTutorialPhase = phase;
  updateFirstWalkSceneCopy(phase);
  els.firstWalkTutorial.dataset.phase = phase;
  els.firstWalkTutorial.classList.remove("hidden");
  els.gardenApp?.classList.toggle("is-first-walk-guide", phase !== "complete");
  setFirstWalkTargetFocus(phase);
  positionFirstWalkGuide(phase, { animate: animateGuide });
}

function beginFirstWalkRecordScene() {
  if (gardenTutorialPhase !== "intro") return;
  gardenTutorialPhase = "record";
  updateFirstWalkSceneCopy("record");
  els.firstWalkTutorial.dataset.phase = "record";
  els.gardenApp?.classList.add("is-first-walk-guide");
  setFirstWalkTargetFocus("record");

  const recordButton = $("#openRecord");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  recordButton?.scrollIntoView?.({ block: "end", behavior: reducedMotion ? "auto" : "smooth" });

  clearGardenTutorialTimer();
  firstWalkGuideLayoutTimer = window.setTimeout(() => {
    firstWalkGuideLayoutTimer = null;
    positionFirstWalkGuide("record", { animate: true });
  }, reducedMotion ? 0 : 360);
}

function showFirstWalkCompletion({ foundItemId = "" } = {}) {
  clearGardenTutorialTimer();
  firstWalkCompletionFoundItemId = String(foundItemId || "");
  showFirstWalkTutorialScene("complete", { animateGuide: false });
  // 마지막 문장이 지나갈 만큼만 머물고, 사용자의 정원으로 조용히 돌아갑니다.
  gardenTutorialTimer = window.setTimeout(() => hideGardenTutorial(), 3400);
}

function renderFirstWalkTutorial() {
  if (gardenTutorialPhase === "complete" && gardenTutorialTimer) return;

  const shouldGuideFirstWalk = firstWalkGuideIsAvailable();
  const shouldGuideDiscovery = firstDiscoveryGuideIsAvailable();
  const preview = tutorialPreviewPhase();

  if (!shouldGuideFirstWalk && !shouldGuideDiscovery) {
    hideGardenTutorial();
    return;
  }

  if (anotherSheetIsOpen()) {
    hideGardenTutorial({ keepPhase: true });
    return;
  }

  if (shouldGuideFirstWalk && recordSheetIsOpen()) {
    clearGardenTutorialTimer();
    gardenTutorialPhase = "record-form";
    hideGardenTutorial({ keepPhase: true });
    els.recordTutorialNote?.classList.remove("hidden");
    els.recordTutorialPreview?.classList.toggle("hidden", !isTutorialSandboxPreview());
    return;
  }

  els.recordTutorialNote?.classList.add("hidden");
  els.recordTutorialPreview?.classList.add("hidden");

  if (shouldGuideDiscovery) {
    showFirstWalkTutorialScene("discovery", { animateGuide: gardenTutorialPhase !== "discovery" });
    return;
  }

  const shouldResumeRecord = preview === "record" || gardenTutorialPhase === "record" || gardenTutorialPhase === "record-form";
  showFirstWalkTutorialScene(shouldResumeRecord ? "record" : "intro", { animateGuide: false });
}

function renderAll() {
  renderMoodSelection();
  renderGarden();
  renderRecords();
  renderLetters();
  renderFriends();
  renderFirstWalkTutorial();
}

async function beginKakaoLogin() {
  if (authBusy) return;
  publicEntryView = "auth";
  renderAuthUI();
  authBusy = true;
  setAuthError("");
  els.signInKakao.disabled = true;
  els.signInKakao.classList.add("is-loading");
  els.signInKakao.lastChild.textContent = "카카오 로그인으로 이동 중이에요";

  const inviteToken = getInviteTokenFromUrl();
  if (inviteToken) {
    window.sessionStorage.setItem("todayforest_pending_friend_invite", inviteToken);
  }
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo } });

  if (error) {
    authBusy = false;
    els.signInKakao.disabled = false;
    els.signInKakao.classList.remove("is-loading");
    els.signInKakao.lastChild.textContent = "카카오로 내 정원 시작하기";
    setAuthError(`카카오 로그인 준비 중 문제가 생겼어요. ${error.message}`);
  }
}

async function handleOAuthCallback() {
  const currentUrl = new URL(window.location.href);
  const code = currentUrl.searchParams.get("code");
  if (!code) return;
  publicEntryView = "auth";

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    setAuthError("카카오 로그인 정보를 이어오지 못했어요. 다시 한 번 시도해 주세요.");
    return;
  }

  currentUrl.searchParams.delete("code");
  window.history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
}

async function syncSession() {
  const { data: { session } } = await supabase.auth.getSession();
  const nextUser = session?.user || null;
  const changedUser = nextUser?.id !== currentUser?.id;
  currentUser = nextUser;

  if (currentUser && changedUser) {
    clearAnimalVisitArrivalTimer();
    activeAnimalVisit = null;
    activeAnimalV2Visits = [];
    selectedAnimalV2VisitId = "";
    closeAnimalEncounterCard();
    state = cloneDefault();
    selectedMood = "good";
    selectedLetterRecipientId = "";
    invitePreviewHandled = false;
    renderAuthUI();
    renderAll();
    await hydrateGardenForCurrentUser();
    publishGardenSessionReady("sync-session-hydrated");
    return;
  }

  if (!currentUser) {
    configureRetentionWindPolling();
    state = cloneDefault();
    resetWelcomeOnboardingSurface();
  }
  renderAuthUI();
  if (currentUser) {
    renderAll();
    publishGardenSessionReady("sync-session-rendered");
    // syncSession()에서 공유나무를 먼저 복원한 뒤에도 INITIAL_SESSION 이벤트가 한 번 더 올 수 있습니다.
    // 이때 내 정원이 다시 보이는 것을 막기 위해 주소의 공유나무 화면을 마지막으로 다시 복원합니다.
    restoreSharedTreeFromUrl();
  }
}

async function signOut() {
  const okay = window.confirm("이 기기에서 내 정원 계정을 로그아웃할까요?");
  if (!okay) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    showToast("로그아웃을 마치지 못했어요. 다시 시도해 주세요.");
    return;
  }
  currentUser = null;
  publicEntryView = "home";
  stopLettersAutoRefresh();
  clearAnimalVisitArrivalTimer();
  activeAnimalVisit = null;
  activeAnimalV2Visits = [];
  selectedAnimalV2VisitId = "";
  closeAnimalEncounterCard();
  treeNamePromptedForUserId = "";
  configureRetentionWindPolling();
  state = cloneDefault();
  resetWelcomeOnboardingSurface();
  selectedLetterRecipientId = "";
  closeAllSheets();
  closeLetterModal();
  returnToMyGarden();
  closeFriendInviteModal({ keepLink: true });
  renderAuthUI();
  setAuthError("");
}

function isLettersSheetOpen() {
  return Boolean(els.lettersSheet && !els.lettersSheet.classList.contains("hidden"));
}

function stopLettersAutoRefresh() {
  if (lettersRefreshTimer) {
    window.clearInterval(lettersRefreshTimer);
    lettersRefreshTimer = null;
  }
}

function startLettersAutoRefresh() {
  stopLettersAutoRefresh();
  if (!currentUser || !isLettersSheetOpen()) return;

  lettersRefreshTimer = window.setInterval(() => {
    void refreshLettersWhileOpen();
  }, 30000);
}

async function refreshLettersWhileOpen() {
  if (!currentUser || !isLettersSheetOpen() || document.hidden || lettersRefreshBusy) return;

  const refreshUserId = currentUser.id;
  lettersRefreshBusy = true;
  try {
    const nowIso = new Date().toISOString();
    const retentionTestActive = Boolean(retentionTestModeFromUrl());
    const [lettersResult, sentLettersResult, retentionDevLetters, specialFriendLettersResult] = await Promise.all([
      // 보관 정책 검수 주소에서는 실제 받은 편지를 섞지 않는 기존 규칙을 그대로 지킵니다.
      retentionTestActive
        ? Promise.resolve({ data: [], error: null })
        : supabase
          .from("garden_letters")
          .select("id, sender_name, title, delivery_kind, sent_at, available_at, read_at, created_at")
          .lte("available_at", nowIso)
          .is("read_at", null)
          .order("available_at", { ascending: true })
          .limit(60),
      supabase.rpc("list_my_sent_garden_letters"),
      loadRetentionDevLetters(),
      loadSpecialForestFriendLetters(),
    ]);

    // 새로 연 편지함을 이미 닫았거나 계정이 바뀌었다면 화면 상태를 덮어쓰지 않습니다.
    if (!currentUser || currentUser.id !== refreshUserId || !isLettersSheetOpen()) return;

    if (lettersResult.error) {
      console.warn("TodayForest received-letter refresh skipped:", lettersResult.error);
    } else {
      state.letters = (lettersResult.data || []).map((letter) => ({
        id: letter.id,
        from: letter.sender_name || "친구의 마음",
        title: letter.title,
        body: null,
        bodyLoaded: false,
        delivery: deliveryText(letter.delivery_kind),
        deliveryKind: letter.delivery_kind,
        date: letter.available_at || letter.sent_at || letter.created_at,
        read: false,
      }));

      // v9 보관 정책 검수 봉투는 실제 수신 편지와 분리된 DEV 전용 데이터입니다.
      if (retentionDevLetters.length) {
        const existing = new Set(state.letters.map((letter) => String(letter.id)));
        state.letters = [...state.letters, ...retentionDevLetters.filter((letter) => !existing.has(String(letter.id)))];
      }

      // 개발 미리보기 주소의 로컬 봉투도 기존처럼 유지합니다.
      mergeReceivedPreviewLetters();
    }

    if (sentLettersResult.error) {
      console.warn("TodayForest sent-letter refresh skipped:", sentLettersResult.error);
    } else {
      state.sentLetters = (sentLettersResult.data || [])
        .filter((letter) => !letter.is_dev_test)
        .map((letter) => ({
          id: letter.id,
          to: letter.recipient_name || "친구",
          title: letter.title,
          deliveryKind: letter.delivery_kind,
          sentAt: letter.sent_at,
          availableAt: letter.available_at,
          readAt: letter.read_at,
          isDevTest: false,
        }))
        .map(applyAnimalDeliveryMeta);
    }

    if (specialFriendLettersResult.error) {
      console.warn("TodayForest special-friend letter refresh skipped:", specialFriendLettersResult.error);
    } else {
      const rows = specialFriendLettersResult.data || [];
      const specialReceivedLetters = rows
        .filter((letter) => letter.direction === "received")
        .map((letter) => ({
          id: `special-friend:${letter.id}`,
          specialLetterId: letter.id,
          isSpecialFriendLetter: true,
          specialFriendKey: letter.friend_key,
          from: letter.sender_name || "친구의 마음",
          title: letter.title || "작은 마음",
          body: null,
          bodyLoaded: false,
          delivery: deliveryText(letter.friend_key),
          deliveryKind: letter.friend_key,
          date: letter.available_at || letter.sent_at || letter.created_at,
          read: false,
        }));
      state.letters = [
        ...(state.letters || []).filter((letter) => !letter.isSpecialFriendLetter),
        ...specialReceivedLetters,
      ];
      state.specialFriendLetters = rows
        .filter((letter) => letter.direction === "sent")
        .map((letter) => ({
          id: letter.id,
          friendKey: letter.friend_key,
          to: letter.recipient_name || "친구",
          title: letter.title || "마음을 전해요",
          sentAt: letter.sent_at,
          availableAt: letter.available_at,
          returnAt: letter.return_at,
          readAt: letter.read_at || null,
        }));
      publishSpecialFriendJourneyState();
    }

    // 편지 상태만 다시 그립니다. 정원 전체·친구·기록·장식·공유나무는 다시 읽지 않습니다.
    renderGarden();
    renderLetters();
  } catch (error) {
    console.warn("TodayForest letter refresh skipped:", error);
  } finally {
    lettersRefreshBusy = false;
  }
}

async function openLettersSheet() {
  // 편지 버튼을 누르는 순간 한 번 바로 새로 읽고,
  // 열어 둔 동안에만 30초 단위로 배송 상태를 갱신합니다.
  renderLetters();
  openSheet(els.lettersSheet);
  if (!currentUser) return;

  await refreshLettersWhileOpen();
  startLettersAutoRefresh();
}

function openTreeNameSheet() {
  if (!currentUser || !isTreeNameSetupRequired()) return;
  els.treeNameInput.value = "";
  openSheet(els.treeNameSheet);
  window.setTimeout(() => els.treeNameInput.focus(), 60);
}

async function saveTreeName(event) {
  event.preventDefault();
  if (!currentUser || !isTreeNameSetupRequired()) return;

  const treeName = els.treeNameInput.value.trim();
  if (!treeName) {
    showToast("나무 이름을 짧게라도 적어 주세요.");
    els.treeNameInput.focus();
    return;
  }

  const confirmed = window.confirm(`“${treeName}”로 정할까요?
한 번 정한 나무 이름은 바꿀 수 없어요.`);
  if (!confirmed) return;

  const submitButton = els.treeNameForm.querySelector('button[type="submit"]');
  const original = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "나무 이름을 정하는 중이에요";

  try {
    const { data, error } = await supabase.rpc("set_my_garden_tree_name", { p_tree_name: treeName });
    if (error) throw error;

    const row = normalizeRpcRow(data);
    state.treeName = row?.saved_tree_name || row?.tree_name || treeName;
    renderAll();
    closeAllSheets({ force: true });
    showToast("내 나무 이름을 정했어요.");
  } catch (error) {
    console.error("TodayForest DEV tree-name save error:", error);
    const detail = String(error?.message || "");
    if (detail.includes("TREE_NAME_ALREADY_SET") || detail.includes("TREE_NAME_LOCKED")) {
      await loadGardenState();
      renderAll();
      closeAllSheets({ force: true });
      showToast("나무 이름은 한 번 정하면 바꿀 수 없어요.");
    } else {
      showToast(detail.includes("set_my_garden_tree_name") || detail.includes("tree_name")
        ? "나무 이름 저장소를 아직 준비하지 못했어요. SQL을 먼저 적용해 주세요."
        : "나무 이름을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = original || "이 이름으로 정하기";
  }
}

function blockHeartFruitCeremonyInput(event) {
  if (!heartFruitRevealRunning) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function bindEvents() {
  ["pointerdown", "pointerup", "click", "contextmenu", "wheel", "touchmove"].forEach((type) => {
    els.heartFruitCeremonyLock?.addEventListener(type, blockHeartFruitCeremonyInput, {
      passive: false,
      capture: true,
    });
  });
  document.addEventListener("keydown", blockHeartFruitCeremonyInput, true);
  $$("[data-public-login]").forEach((button) => button.addEventListener("click", openPublicLogin));
  els.backToPublicHome?.addEventListener("click", returnToPublicHome);
  els.signInKakao?.addEventListener("click", beginKakaoLogin);
  els.installAppButton?.addEventListener("click", () => { void requestAppInstall(); });
  els.dismissInstallCard?.addEventListener("click", dismissInstallCardForAWhile);
  els.foundItemSparkle?.addEventListener("click", () => { void claimFoundItem(); });
  els.openGardenDecorate?.addEventListener("click", startGardenDecorateMode);
  els.cancelGardenDecorate?.addEventListener("click", cancelGardenDecorateMode);
  els.saveGardenDecorate.addEventListener("click", () => { void saveGardenDecorateMode(); });
  els.foundItemsLayer.addEventListener("pointerdown", beginFoundItemDrag, { passive: false });
  // 드래그 시작 뒤에는 장식 밖으로 손가락·마우스가 벗어나도 끊기지 않도록
  // window 캡처 단계에서 이동과 종료를 받습니다.
  window.addEventListener("pointermove", moveFoundItemDrag, { capture: true, passive: false });
  window.addEventListener("pointerup", endFoundItemDrag, { capture: true });
  window.addEventListener("pointercancel", endFoundItemDrag, { capture: true });
  window.addEventListener("blur", () => endFoundItemDrag());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      endFoundItemDrag();
      clearAnimalVisitArrivalTimer();
      return;
    }
    if (currentUser) {
      void syncMyGardenAnimalVisit({ beginWhenReady: true, silent: true, rerender: true });
      // 편지함을 보고 있다가 다시 돌아오면 배송 상태만 한 번 최신으로 맞춥니다.
      if (isLettersSheetOpen()) void refreshLettersWhileOpen();
    }
  });
  window.addEventListener("todayforest:tree-animal-call-sync", () => {
    void syncMyGardenAnimalVisit({ silent: true, rerender: true });
  });
  els.signOutButton.addEventListener("click", signOut);
  els.accountButton?.addEventListener("click", openAccountMenu);
  els.openInstallFromAccount?.addEventListener("click", () => { void requestAppInstallFromAccountMenu(); });
  els.treeNameForm.addEventListener("submit", saveTreeName);
  els.firstWalkTutorialTap?.addEventListener("click", () => {
    if (gardenTutorialPhase === "intro") beginFirstWalkRecordScene();
  });
  $("#openRecord").addEventListener("click", () => {
    if (isTutorialSandboxPreview() && tutorialSandbox.recorded) {
      showToast("미리보기에서는 첫 마음을 남겼어요. 풀숲의 빛을 따라가요.");
      return;
    }
    if (!isTutorialSandboxPreview() && hasSavedToday()) {
      showToast("오늘의 마음은 이미 나무에 남겼어요. 내일 다시 와요.");
      return;
    }
    openSheet(els.recordSheet);
    renderFirstWalkTutorial();
  });
  $("#openRecords").addEventListener("click", () => { renderRecords(); openSheet(els.recordsSheet); });
  els.openHeartFruits?.addEventListener("click", openMyHeartFruits);
  els.heartFruitLayer?.addEventListener("click", (event) => {
    const fruit = event.target.closest?.(".heart-fruit");
    event.stopPropagation();
    if (fruit && els.heartFruitLayer.contains(fruit)) {
      openMyHeartFruits();
      return;
    }

    // 투명한 열매 레이어의 빈 부분은 기존 나무 손길 기능으로 명시적으로 전달합니다.
    // pointer-events 통과 여부에 기대지 않아 모바일 브라우저에서도 나무 반응이 유지됩니다.
    window.dispatchEvent(new CustomEvent("todayforest:tree-tap-request", {
      detail: { source: "heart-fruit-layer" },
    }));
  });
  els.openFriendHeartFruits?.addEventListener("click", openFriendHeartFruits);
  els.friendHeartFruitLayer?.addEventListener("click", (event) => {
    const fruit = event.target.closest?.(".heart-fruit");
    if (!fruit || !els.friendHeartFruitLayer.contains(fruit)) return;
    event.stopPropagation();
    openFriendHeartFruits();
  });
  els.heartFruitPicker?.addEventListener("click", handleHeartFruitPickerClick);
  els.heartFruitVisibilityButton?.addEventListener("click", () => { void toggleHeartFruitVisibility(); });
  els.openFriends.addEventListener("click", openFriendsSheet);
  els.openFriendInvitePanel?.addEventListener("click", () => {
    showFriendInvitePanel();
    window.setTimeout(() => els.createInviteButton?.focus(), 0);
  });
  els.backToFriendsList?.addEventListener("click", () => {
    showFriendsOverview();
    window.setTimeout(() => els.openFriendInvitePanel?.focus(), 0);
  });
  $("#openLetters").addEventListener("click", () => { void openLettersSheet(); });
  els.openFeedback.addEventListener("click", openFeedbackSheet);
  $("#openSpecialFriendShortcut")?.addEventListener("click", () => {
    if (typeof window.openTodayForestSpecialFriendInfo === "function") {
      window.openTodayForestSpecialFriendInfo();
      return;
    }
    window.dispatchEvent(new CustomEvent("todayforest:open-special-friend-letter"));
  });
  $("#openMoreMenu")?.addEventListener("click", () => {
    const panel = $("#moreMenuPanel");
    panel?.classList.toggle("hidden");
  });
  $$('[data-more-action="feedback"]').forEach((button) => button.addEventListener("click", () => {
    $("#moreMenuPanel")?.classList.add("hidden");
    openFeedbackSheet();
  }));
  $$('[data-more-action="support"]').forEach((button) => button.addEventListener("click", () => {
    $("#moreMenuPanel")?.classList.add("hidden");
    openSupportSheet();
  }));
  $$('[data-more-action="settings"]').forEach((button) => button.addEventListener("click", () => {
    $("#moreMenuPanel")?.classList.add("hidden");
    showToast("설정 메뉴는 준비 중이에요.");
  }));
  els.openSupport.addEventListener("click", openSupportSheet);
  els.feedbackForm.addEventListener("submit", submitGardenFeedback);
  $$("[data-feedback-tab]").forEach((button) => button.addEventListener("click", () => { void selectFeedbackTab(button.dataset.feedbackTab); }));
  $$("[data-feedback-category]").forEach((button) => button.addEventListener("click", () => {
    selectedFeedbackCategory = button.dataset.feedbackCategory || "idea";
    renderFeedbackCategorySelection();
  }));
  els.openLetterComposer.addEventListener("click", () => {
    showToast("정원에 찾아온 숲친구를 눌러 편지를 맡겨요.");
  });
  els.letterForm.addEventListener("submit", sendGardenLetter);
  window.addEventListener("todayforest:open-special-friend-letter", (event) => {
    const requestedKey = event?.detail?.key || Object.keys(specialForestFriendPreviewCatalog)[0] || "";
    openSpecialForestFriendEncounter(requestedKey);
  });
  window.addEventListener("todayforest:special-friend-journey-phase", () => {
    renderSentLetters();
  });
  window.addEventListener("todayforest:special-friend-returned", () => {
    renderSentLetters();
  });
  els.visitorButton.addEventListener("click", () => {
    const visit = currentAnimalV2Visit();
    if (visit) {
      openAnimalEncounterForVisit(visit.id);
      return;
    }
    const trace = lastAnimalTrace();
    if (trace) {
      showToast(trace.traceStory);
      return;
    }
    if (isAnimalApproaching()) {
      showToast("풀잎과 가지 사이의 기척이 조금 더 가까워지고 있어요.");
      return;
    }
    showToast("정원을 보고 있으면 숲친구가 자유롭게 찾아올 수 있어요.");
  });
  els.animalV2Layer?.addEventListener("click", handleAnimalV2LayerClick);
  els.animalV2TraceLayer?.addEventListener("click", handleAnimalV2TraceClick);
  els.animalEncounterClose?.addEventListener("click", closeAnimalEncounterCard);
  els.animalEncounterQuiet?.addEventListener("click", closeAnimalEncounterCard);
  els.animalEncounterSend?.addEventListener("click", openEncounterLetterComposer);
  els.recordForm.addEventListener("submit", saveRecord);
  els.toggleDetail.addEventListener("click", () => {
    const isHidden = els.detailWrap.classList.toggle("hidden");
    els.toggleDetail.innerHTML = isHidden ? '조금 더 적기 <span aria-hidden="true">⌄</span>' : '간단히 접기 <span aria-hidden="true">⌃</span>';
    if (!isHidden) els.detailText.focus();
  });
  $$(".mood-choice").forEach((button) => button.addEventListener("click", () => {
    selectedMood = button.dataset.mood;
    renderMoodSelection();
  }));
  $$('[data-close]').forEach((button) => button.addEventListener("click", closeAllSheets));
  els.sheetOverlay.addEventListener("click", closeAllSheets);
  $("#closeLetterModal").addEventListener("click", closeLetterModal);
  $("#readLetterButton").addEventListener("click", markLetterRead);
  els.letterModal.addEventListener("click", (event) => { if (event.target === els.letterModal) closeLetterModal(); });
  els.returnToMyGarden.addEventListener("click", returnToMyGarden);
  els.returnToMyGardenTop.addEventListener("click", returnToMyGarden);
  els.friendFoundItemsLayer?.addEventListener("click", handleFriendFoundItemClick);
  els.createInviteButton.addEventListener("click", createFriendInvite);
  els.copyInviteLink.addEventListener("click", copyFriendInviteLink);
  els.enableDevFriendButton.addEventListener("click", enableDevTestFriend);
  $("#closeFriendInviteModal").addEventListener("click", () => closeFriendInviteModal());
  els.declineFriendInviteButton.addEventListener("click", () => closeFriendInviteModal());
  els.acceptFriendInviteButton.addEventListener("click", acceptFriendInvite);
  els.friendInviteModal.addEventListener("click", (event) => { if (event.target === els.friendInviteModal) closeFriendInviteModal(); });
  $("#closeSharedTreeInviteModal").addEventListener("click", closeSharedTreeInviteModal);
  els.laterSharedTreeInviteButton.addEventListener("click", closeSharedTreeInviteModal);
  els.acceptSharedTreeInviteButton.addEventListener("click", () => { void acceptSharedTreeInvite(); });
  els.sharedTreeInviteModal.addEventListener("click", (event) => { if (event.target === els.sharedTreeInviteModal) closeSharedTreeInviteModal(); });
  els.returnToFriendsFromTogetherForest.addEventListener("click", returnToFriendsFromTogetherForest);
  els.returnToFriendsFromTogetherForestBottom.addEventListener("click", returnToFriendsFromTogetherForest);
  els.returnToFriendsFromSharedTree.addEventListener("click", returnToFriendsFromSharedTree);
  els.sharedTreeRecordLightButton.addEventListener("click", () => { void leaveSharedTreeLight(); });
  els.sharedTreeNoteForm?.addEventListener("submit", (event) => { void saveSharedTreeMemoryNote(event); });
  els.sharedTreeNoteInput?.addEventListener("input", updateSharedTreeNoteCount);
  window.addEventListener("focus", async () => {
    if (!currentUser) return;
    try {
      await loadGardenState();
      await syncMyGardenAnimalVisit({ beginWhenReady: true, silent: true });
      renderAll();
    } catch (error) {
      console.warn("TodayForest refresh skipped:", error);
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (els.heartFruitSheet && !els.heartFruitSheet.classList.contains("hidden")) {
      closeAllSheets();
      return;
    }
    if (!els.friendVisit.classList.contains("hidden")) {
      returnToMyGarden();
      return;
    }
    if (!els.sharedTreeView.classList.contains("hidden")) {
      returnToFriendsFromSharedTree();
      return;
    }
    if (!els.togetherForestView.classList.contains("hidden")) {
      returnToFriendsFromTogetherForest();
      return;
    }
    closeAllSheets();
    closeLetterModal();
    closeFriendInviteModal();
    closeSharedTreeInviteModal();
  });
}

let welcomeSeedTimer = null;
let welcomeWalkTimer = null;
let welcomeGardenTransitionTimer = null;
let welcomeGardenArrivalTimer = null;
let welcomeSelectedMood = "";
let welcomeTreeName = "내 나무";
// preview는 URL 검수 전용, onboarding은 카카오 로그인 뒤 신규 계정의 실제 첫 나무 흐름입니다.
let welcomeFlowMode = "idle";
let welcomeHandlersBound = false;

function clearWelcomePreviewTimers() {
  [welcomeSeedTimer, welcomeWalkTimer, welcomeGardenTransitionTimer, welcomeGardenArrivalTimer].forEach((timer) => {
    if (timer) window.clearTimeout(timer);
  });
  welcomeSeedTimer = null;
  welcomeWalkTimer = null;
  welcomeGardenTransitionTimer = null;
  welcomeGardenArrivalTimer = null;
}

function isLiveWelcomeOnboarding() {
  return welcomeFlowMode === "onboarding" && Boolean(currentUser);
}

function resetWelcomeOnboardingSurface() {
  clearWelcomePreviewTimers();
  if (welcomeFlowMode === "onboarding" || welcomeFlowMode === "transitioning") {
    const preview = els.welcomePreview;
    preview?.classList.add("hidden");
    preview?.classList.remove(
      "is-seeded", "is-seed-ready", "is-handoff", "is-naming", "is-walk",
      "is-record-previewed", "is-tree-birth", "is-entering-garden", "is-leaving"
    );
    els.welcomeNameSheet?.classList.add("hidden");
    els.welcomeWalkLayer?.classList.add("hidden");
    document.body.classList.remove("is-welcome-preview", "is-welcome-live-entry");
  }
  welcomeFlowMode = "idle";
}

function resetWelcomeSandboxGarden() {
  const app = els.gardenApp;
  if (!app) return;

  app.classList.remove("welcome-sandbox-garden", "is-welcome-garden-visible");
  app.classList.add("hidden");
  if (els.foundItemsLayer) els.foundItemsLayer.replaceChildren();
  if (els.gardenDecorateControls) els.gardenDecorateControls.hidden = true;
  if (els.visitorButton) els.visitorButton.hidden = false;
  if (els.firstWalkTutorial) els.firstWalkTutorial.classList.add("hidden");
}

function resetWelcomePreview() {
  const preview = els.welcomePreview;
  if (!preview) return;

  clearWelcomePreviewTimers();
  welcomeSelectedMood = "";
  welcomeTreeName = "내 나무";
  resetWelcomeSandboxGarden();

  preview.classList.remove(
    "is-seeded", "is-seed-ready", "is-handoff", "is-naming", "is-walk",
    "is-record-previewed", "is-tree-birth", "is-entering-garden", "is-leaving"
  );
  preview.dataset.phase = "intro";
  els.welcomeNameSheet?.classList.add("hidden");
  els.welcomeWalkLayer?.classList.add("hidden");
  els.welcomeWalkIntro?.classList.remove("is-hidden");
  els.welcomeRecordCard?.classList.remove("is-visible");
  els.welcomeNameForm?.reset();
  if (els.welcomeNameError) els.welcomeNameError.textContent = "";
  if (els.welcomeRecordLine) els.welcomeRecordLine.value = "";
  if (els.welcomeRecordPreviewNote) els.welcomeRecordPreviewNote.textContent = "";
  $$(".welcome-mood-choice").forEach((button) => button.classList.remove("is-selected"));
  if (els.welcomeKakaoButton) els.welcomeKakaoButton.disabled = false;

  // CSS 장면 애니메이션을 처음부터 다시 재생합니다.
  preview.classList.add("is-resetting");
  void preview.offsetWidth;
  preview.classList.remove("is-resetting");
}

function openWelcomeNameSheet() {
  const preview = els.welcomePreview;
  if (!preview) return;
  preview.classList.add("is-naming");
  preview.dataset.phase = "name";
  els.welcomeNameSheet?.classList.remove("hidden");
  window.setTimeout(() => els.welcomeNameInput?.focus(), 180);
}

function startWelcomeFirstWalk(treeName) {
  const preview = els.welcomePreview;
  if (!preview) return;
  const safeName = String(treeName || "내 나무").trim() || "내 나무";
  welcomeTreeName = safeName;
  preview.classList.remove("is-naming");
  preview.classList.add("is-walk");
  preview.dataset.phase = "first-walk";
  els.welcomeNameSheet?.classList.add("hidden");
  els.welcomeWalkLayer?.classList.remove("hidden");
  if (els.welcomeWalkTreeName) els.welcomeWalkTreeName.textContent = safeName;
  els.welcomeWalkIntro?.classList.remove("is-hidden");
  els.welcomeRecordCard?.classList.remove("is-visible");

  welcomeWalkTimer = window.setTimeout(() => {
    els.welcomeWalkIntro?.classList.add("is-hidden");
    els.welcomeRecordCard?.classList.add("is-visible");
    preview.dataset.phase = "record";
    welcomeWalkTimer = null;
  }, 1150);
}

function prepareWelcomeSandboxGarden() {
  const app = els.gardenApp;
  if (!app) return;

  const treeName = welcomeTreeName || "내 나무";
  app.classList.remove("hidden");
  app.classList.add("welcome-sandbox-garden");

  // 실제 정원과 같은 DOM·CSS를 그대로 쓰되, 이 URL 안에서는 저장하지 않는 표시값만 넣습니다.
  if (els.accountName) els.accountName.textContent = `${treeName}의 정원`;
  els.accountButton?.setAttribute("aria-label", `${treeName}의 정원`);
  if (els.treeNameLabel) els.treeNameLabel.textContent = treeName;
  if (els.dayCount) els.dayCount.textContent = "마음 1일째";
  if (els.treeStageLabel) els.treeStageLabel.textContent = "처음 깨어난 새싹";
  if (els.treeImage) {
    els.treeImage.src = "assets/garden/tree_growth/tree_stage1_morning.png";
    els.treeImage.alt = "처음 깨어난 새싹";
  }
  if (els.weatherIcon) els.weatherIcon.textContent = "☀️";
  if (els.weatherText) els.weatherText.textContent = "햇살이 포근하게 내려와요";
  if (els.friendCount) els.friendCount.textContent = "친구 0명";
  if (els.visitorEmoji) els.visitorEmoji.textContent = "🌿";
  if (els.visitorName) els.visitorName.textContent = "숲이 조용히 숨을 고르고 있어요";
  if (els.visitorHint) els.visitorHint.textContent = "첫 마음이 나무 가까이에 내려앉았어요.";
  if (els.stageMessage) els.stageMessage.textContent = "첫 마음이 작은 나무가 되었어요.";
  if (els.nextVisitorText) els.nextVisitorText.textContent = "내일도 마음을 남기면 나무가 조금 더 자라요.";
  if (els.installCard) els.installCard.classList.add("hidden");
  if (els.firstWalkTutorial) els.firstWalkTutorial.classList.add("hidden");
  if (els.gardenDecorateControls) els.gardenDecorateControls.hidden = false;

  // 실제 정원에서 쓰는 발견물 레이어를 그대로 사용합니다.
  if (els.foundItemsLayer) {
    els.foundItemsLayer.innerHTML = `
      <div class="found-item found-item-tree_base_right welcome-sandbox-found-item" aria-hidden="true">
        <img src="assets/decorations/pink-wildflower.png" alt="" />
      </div>`;
  }

  // welcomePreview 모드에서는 일반 init()을 건너뛰므로, 실제 정원과 같은 좌표 비율만 직접 맞춥니다.
  window.requestAnimationFrame(() => {
    syncGardenWorldScale();
    app.classList.add("is-welcome-garden-visible");
  });
}

function finishWelcomeOnboarding() {
  const preview = els.welcomePreview;
  if (!preview || !currentUser) return;

  // 실제 저장이 끝난 뒤에만 화면을 넘깁니다. 정원은 아래에서 먼저 렌더링하고,
  // 손님맞이 장면은 기존 CSS 전환 시간만큼 부드럽게 사라집니다.
  welcomeFlowMode = "transitioning";
  preview.classList.add("is-leaving");
  preview.dataset.phase = "my-garden";
  renderAuthUI();
  renderAll();
  window.requestAnimationFrame(() => syncGardenWorldScale());

  window.setTimeout(async () => {
    if (welcomeFlowMode !== "transitioning") return;
    preview.classList.add("hidden");
    preview.classList.remove(
      "is-seeded", "is-seed-ready", "is-handoff", "is-naming", "is-walk",
      "is-record-previewed", "is-tree-birth", "is-entering-garden", "is-leaving"
    );
    els.welcomeNameSheet?.classList.add("hidden");
    els.welcomeWalkLayer?.classList.add("hidden");
    document.body.classList.remove("is-welcome-preview", "is-welcome-live-entry");
    welcomeFlowMode = "idle";
    renderAuthUI();
    renderAll();
    await previewFriendInviteFromUrl();
  }, 620);
}

function startWelcomeGardenTransition({ onboarding = isLiveWelcomeOnboarding() } = {}) {
  const preview = els.welcomePreview;
  if (!preview) return;

  // 기록 카드는 먼저 조용히 사라지고, 같은 자리에서 씨앗이 작은 나무로 자랍니다.
  els.welcomeRecordCard?.classList.remove("is-visible");
  preview.classList.remove("is-walk");
  preview.classList.add("is-tree-birth");
  preview.dataset.phase = "tree-birth";

  // 나무와 들꽃을 바라볼 틈을 준 뒤, 빛을 타고 실제 내 정원 UI가 드러납니다.
  welcomeGardenTransitionTimer = window.setTimeout(() => {
    preview.classList.add("is-entering-garden");
    preview.dataset.phase = "entering-garden";
    welcomeGardenTransitionTimer = null;
  }, 2450);

  welcomeGardenArrivalTimer = window.setTimeout(() => {
    if (onboarding) {
      finishWelcomeOnboarding();
    } else {
      prepareWelcomeSandboxGarden();
      preview.classList.add("is-leaving");
      preview.dataset.phase = "my-garden";
    }
    welcomeGardenArrivalTimer = null;
  }, 3050);
}

async function beginWelcomeKakaoLogin() {
  if (authBusy) return;

  const button = els.welcomeKakaoButton;
  const preview = els.welcomePreview;
  if (!button) return;

  // 로그인 전 친구 초대 링크가 있어도 기존 로그인 흐름처럼 세션에 보관합니다.
  const inviteToken = getInviteTokenFromUrl();
  if (inviteToken) {
    window.sessionStorage.setItem("todayforest_pending_friend_invite", inviteToken);
  }

  authBusy = true;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "카카오 로그인으로 이동 중이에요";

  // 손님맞이 검수 주소는 로그인 뒤에 남기지 않습니다.
  // OAuth가 끝나면 일반 DEV 초기화가 실행되어, 실제 계정 상태를 읽습니다.
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo },
  });

  if (!error) return;

  authBusy = false;
  button.disabled = false;
  button.textContent = originalLabel || "카카오로 내 숲 시작하기";
  if (els.welcomePreviewHandoff) {
    els.welcomePreviewHandoff.textContent = "카카오 로그인 준비 중 문제가 있었어요. 잠시 뒤 다시 눌러주세요.";
  }
  preview?.classList.add("is-handoff");
  console.error("TodayForest welcome Kakao login error:", error);
}

function startWelcomeOnboarding() {
  if (!isFirstGardenOnboardingRequired()) return false;
  initWelcomePreview({ onboarding: true });
  return true;
}

async function saveWelcomeOnboardingTreeName(treeName) {
  if (!isLiveWelcomeOnboarding() || !currentUser) return;

  const submitButton = els.welcomeNameForm?.querySelector('button[type="submit"]');
  const originalLabel = submitButton?.textContent || "이름 정하기";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "나무 이름을 정하는 중이에요";
  }

  try {
    const { data, error } = await supabase.rpc("set_my_garden_tree_name", { p_tree_name: treeName });
    if (error) throw error;

    const row = normalizeRpcRow(data);
    state.treeName = row?.saved_tree_name || row?.tree_name || treeName;
    if (els.welcomeNameError) els.welcomeNameError.textContent = "";
    startWelcomeFirstWalk(state.treeName);
  } catch (error) {
    console.error("TodayForest welcome tree-name save error:", error);
    const detail = String(error?.message || "");
    if (detail.includes("TREE_NAME_ALREADY_SET") || detail.includes("TREE_NAME_LOCKED")) {
      try {
        await loadGardenState();
      } catch (loadError) {
        console.warn("TodayForest welcome tree-name refresh skipped:", loadError);
      }
      if (String(state.treeName || "").trim()) {
        startWelcomeFirstWalk(state.treeName);
        return;
      }
    }
    if (els.welcomeNameError) {
      els.welcomeNameError.textContent = detail.includes("set_my_garden_tree_name") || detail.includes("tree_name")
        ? "나무 이름 저장소를 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요."
        : "이름을 정하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

function welcomeMoodToRecordMood(value) {
  return {
    "포근해요": "good",
    "평범해요": "calm",
    "조금 지쳐요": "tired",
  }[value] || "good";
}

async function saveWelcomeOnboardingFirstRecord() {
  if (!isLiveWelcomeOnboarding() || !currentUser) return;

  const oneLine = els.welcomeRecordLine?.value.trim() || "";
  if (!welcomeSelectedMood) {
    if (els.welcomeRecordPreviewNote) els.welcomeRecordPreviewNote.textContent = "오늘의 마음을 하나 골라주세요.";
    return;
  }
  if (!oneLine) {
    if (els.welcomeRecordPreviewNote) els.welcomeRecordPreviewNote.textContent = "오늘을 한 줄로 남겨주세요.";
    els.welcomeRecordLine?.focus();
    return;
  }

  const button = els.welcomeRecordSave;
  const originalLabel = button?.textContent || "내 마음 심기";
  if (button) {
    button.disabled = true;
    button.textContent = "첫 마음을 심는 중이에요";
  }

  try {
    const { error } = await supabase.rpc("save_garden_record", {
      p_mood: welcomeMoodToRecordMood(welcomeSelectedMood),
      p_one_line: oneLine,
      p_detail: null,
    });
    if (error) throw error;

    await loadGardenState();
    window.dispatchEvent(new CustomEvent("todayforest:garden-record-saved"));

    trackTodayForestOperationalEvent("garden_mood_saved", {
      mood: welcomeMoodToRecordMood(welcomeSelectedMood),
      detail_added: "no",
    });
    if (els.welcomeRecordPreviewNote) els.welcomeRecordPreviewNote.textContent = "";
    els.welcomePreview?.classList.add("is-record-previewed");
    els.welcomePreview.dataset.phase = "recorded";
    window.setTimeout(() => startWelcomeGardenTransition({ onboarding: true }), 300);
  } catch (error) {
    console.error("TodayForest welcome first-record save error:", error);
    const detail = String(error?.message || "");
    if (detail.includes("TODAY_RECORD_ALREADY_SAVED")) {
      try {
        await loadGardenState();
      } catch (loadError) {
        console.warn("TodayForest welcome first-record refresh skipped:", loadError);
      }
      startWelcomeGardenTransition({ onboarding: true });
      return;
    }
    if (els.welcomeRecordPreviewNote) {
      els.welcomeRecordPreviewNote.textContent = databaseErrorMessage(error);
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
}

function initWelcomePreview({ liveEntry = false, onboarding = false } = {}) {
  const preview = els.welcomePreview;
  if (!preview) return;

  // welcomePreview=1은 검수 전용, onboarding은 로그인 뒤 신규 계정의 실제 첫 나무 흐름입니다.
  welcomeFlowMode = onboarding ? "onboarding" : "preview";
  document.body.classList.add("is-welcome-preview");
  document.body.classList.toggle("is-welcome-live-entry", liveEntry);
  preview.classList.remove("hidden");
  els.publicHome?.classList.add("hidden");
  els.authScreen?.classList.add("hidden");
  els.gardenApp?.classList.add("hidden");

  const nameCopy = preview.querySelector(".welcome-sheet-copy");
  if (onboarding) {
    if (els.welcomeKakaoButton) els.welcomeKakaoButton.textContent = "이름 정하기";
    if (els.welcomePreviewHandoff) els.welcomePreviewHandoff.classList.add("hidden");
    if (nameCopy) nameCopy.textContent = "한 번 정한 나무 이름은 바꿀 수 없어요.";
  } else {
    if (els.welcomeKakaoButton) els.welcomeKakaoButton.textContent = "카카오로 내 숲 시작하기";
    els.welcomePreviewHandoff?.classList.toggle("hidden", liveEntry);
    if (nameCopy) nameCopy.textContent = "이름은 나중에 언제든 바꿀 수 있어요.";
  }
  if (preview.dataset.previewMode === "still") return;

  resetWelcomePreview();
  if (welcomeHandlersBound) return;
  welcomeHandlersBound = true;

  els.welcomePlantButton?.addEventListener("click", () => {
    if (preview.classList.contains("is-seeded")) return;
    preview.classList.add("is-seeded");
    preview.dataset.phase = "seed";
    welcomeSeedTimer = window.setTimeout(() => {
      preview.classList.add("is-seed-ready");
      preview.dataset.phase = "seed-ready";
      welcomeSeedTimer = null;
    }, 1450);
  });

  els.welcomeKakaoButton?.addEventListener("click", () => {
    if (isLiveWelcomeOnboarding()) {
      openWelcomeNameSheet();
      return;
    }
    // 검수·비로그인 손님맞이에서만 카카오 로그인으로 연결합니다.
    void beginWelcomeKakaoLogin();
  });

  els.welcomeNameForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const treeName = els.welcomeNameInput?.value.trim() || "";
    if (!treeName) {
      if (els.welcomeNameError) els.welcomeNameError.textContent = "나무 이름을 한 글자 이상 적어주세요.";
      els.welcomeNameInput?.focus();
      return;
    }
    if (els.welcomeNameError) els.welcomeNameError.textContent = "";
    if (isLiveWelcomeOnboarding()) {
      void saveWelcomeOnboardingTreeName(treeName);
      return;
    }
    startWelcomeFirstWalk(treeName);
  });

  $$(".welcome-mood-choice").forEach((button) => {
    button.addEventListener("click", () => {
      welcomeSelectedMood = button.dataset.welcomeMood || "";
      $$(".welcome-mood-choice").forEach((choice) => choice.classList.toggle("is-selected", choice === button));
      if (els.welcomeRecordPreviewNote) els.welcomeRecordPreviewNote.textContent = "";
    });
  });

  els.welcomeRecordSave?.addEventListener("click", () => {
    if (isLiveWelcomeOnboarding()) {
      void saveWelcomeOnboardingFirstRecord();
      return;
    }
    if (!welcomeSelectedMood) {
      if (els.welcomeRecordPreviewNote) els.welcomeRecordPreviewNote.textContent = "오늘의 마음을 하나 골라주세요.";
      return;
    }
    // 검수 화면에서는 실제 기록 저장 없이 장면만 이어집니다.
    preview.classList.add("is-record-previewed");
    preview.dataset.phase = "recorded";
    if (els.welcomeRecordPreviewNote) els.welcomeRecordPreviewNote.textContent = "";
    window.setTimeout(() => startWelcomeGardenTransition({ onboarding: false }), 300);
  });

  els.welcomeReplay?.addEventListener("click", resetWelcomePreview);
}

async function init() {
  // 명시적인 ?welcomePreview=1은 언제나 DB와 분리된 검수 전용 화면입니다.
  if (isWelcomePreviewMode()) {
    initWelcomePreview({ liveEntry: false });
    return;
  }

  registerPwaServiceWorker();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallCard();
  });
  window.addEventListener("appinstalled", () => {
    window.localStorage.setItem(pwaStorageKey(PWA_INSTALL_COMPLETE_STORAGE_PREFIX), "1");
    deferredInstallPrompt = null;
    updateInstallCard();
  });
  bindEvents();
  setupGardenWorldSizing();
  setupFriendGardenWorldSizing();
  renderFeedbackCategorySelection();
  await handleOAuthCallback();
  await syncSession();

  // 로그인 전에는 공통 로그인 화면을 먼저 보여줍니다.
  // 손님맞이 장면은 로그인 후, 내 나무가 없는 신규 계정 전용으로 연결할 예정입니다.
  if (!currentUser) {
    renderAuthUI();
    return;
  }

  // 전체 정원 데이터는 주기적으로 다시 읽지 않습니다.
  // 편지 배송 상태는 편지함을 열었을 때만 refreshLettersWhileOpen()이 갱신합니다.

  supabase.auth.onAuthStateChange(async (_event, session) => {
    const nextUser = session?.user || null;
    const changedUser = nextUser?.id !== currentUser?.id;
    currentUser = nextUser;

    if (currentUser && changedUser) {
      clearAnimalVisitArrivalTimer();
      activeAnimalVisit = null;
      activeAnimalV2Visits = [];
      selectedAnimalV2VisitId = "";
      closeAnimalEncounterCard();
      state = cloneDefault();
      selectedMood = "good";
      selectedLetterRecipientId = "";
      invitePreviewHandled = false;
      renderAuthUI();
      renderAll();
      await hydrateGardenForCurrentUser();
      publishGardenSessionReady("auth-state-hydrated");
      return;
    }

    if (!currentUser) {
      publicEntryView = "home";
      stopLettersAutoRefresh();
      configureRetentionWindPolling();
      state = cloneDefault();
      resetWelcomeOnboardingSurface();
    }
    renderAuthUI();
    if (currentUser) {
      renderAll();
      publishGardenSessionReady("auth-state-rendered");
      // INITIAL_SESSION 이벤트가 마지막에 내 정원을 다시 보이게 할 수 있습니다.
      // 주소에 공유나무가 있으면 렌더링 뒤 공유나무 화면을 최종 화면으로 복원합니다.
      restoreSharedTreeFromUrl();
    }
  });
}

init();
