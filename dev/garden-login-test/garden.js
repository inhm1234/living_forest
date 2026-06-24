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

const DEFAULT_STATE = {
  growth: 0,
  records: [],
  letters: [],
  sentLetters: [],
  friends: [],
  profileName: "새 친구",
};

// 날씨는 한국 날짜가 바뀔 때마다 각 정원에 새로 정해집니다.
// 맑음 60% · 바람 20% · 비 20% 비율이며, 같은 날에는 새로고침해도 바뀌지 않습니다.
const weatherOptions = [
  { icon: "☀️", text: "햇살이 포근하게 내려와요", className: "sun", message: "햇살이 오늘의 잎을 따뜻하게 감싸요." },
  { icon: "🍃", text: "바람이 가볍게 불어요", className: "wind", message: "바람이 잎 끝을 살짝 흔들고 있어요." },
  { icon: "🌧️", text: "조용히 비가 내려요", className: "rain", message: "구름 아래로 빗방울이 조용히 정원에 내려앉아요." },
];

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

const animalVisitorOrder = ["bird", "squirrel", "rabbit", "hedgehog"];
const ANIMAL_VISIT_STORAGE_PREFIX = "todayforest-dev-animal-visit-v1";
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

let currentUser = null;
let state = cloneDefault();
let selectedMood = "good";
let activeLetterId = null;
let selectedLetterRecipientId = "";
let activeInviteLink = "";
let pendingFriendInvite = null;
let invitePreviewHandled = false;
let toastTimer = null;
let authBusy = false;
let activeFriendGardenId = "";
let activeAnimalVisit = null;
let animalDepartureTimer = null;
let pendingExpiredLetterReturn = null;
let pendingRetentionNextVisitNoticeCount = 0;
let retentionWindTimer = null;
let retentionWindRefreshBusy = false;
let retentionCleanupRanOnThisPage = false;
let deferredInstallPrompt = null;
let installHelpVisible = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const els = {
  gardenStage: $("#gardenStage"),
  treeWrap: $("#treeWrap"),
  treeImage: $("#treeImage"),
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
  letterComposerTitle: $("#letterComposerTitle"),
  letterComposerFootnote: $("#letterComposerFootnote"),
  nextVisitorText: $("#nextVisitorText"),
  branchLetters: $("#branchLetters"),
  navLetterBadge: $("#navLetterBadge"),
  stageMessage: $("#stageMessage"),
  sheetOverlay: $("#sheetOverlay"),
  recordSheet: $("#recordSheet"),
  recordsSheet: $("#recordsSheet"),
  friendsSheet: $("#friendsSheet"),
  lettersSheet: $("#lettersSheet"),
  letterComposerSheet: $("#letterComposerSheet"),
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
  createInviteButton: $("#createInviteButton"),
  inviteLinkWrap: $("#inviteLinkWrap"),
  inviteLink: $("#inviteLink"),
  copyInviteLink: $("#copyInviteLink"),
  inviteExpiry: $("#inviteExpiry"),
  devTestFriendBox: $("#devTestFriendBox"),
  enableDevFriendButton: $("#enableDevFriendButton"),
  friendVisit: $("#friendVisit"),
  friendVisitStage: $("#friendVisitStage"),
  friendVisitName: $("#friendVisitName"),
  friendVisitTree: $("#friendVisitTree"),
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
  gardenApp: $("#gardenApp"),
  authError: $("#authError"),
  signInKakao: $("#signInKakao"),
  signOutButton: $("#signOutButton"),
  accountButton: $("#accountButton"),
  accountName: $("#accountName"),
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

function showIosInstallHelp() {
  if (!els.installHelp) return;
  installHelpVisible = true;
  els.installHelp.textContent = "Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해 주세요.";
  els.installHelp.classList.remove("hidden");
}

async function requestAppInstall() {
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
  if (message.includes("send_garden_letter") || message.includes("list_my_sent_garden_letters")) {
    return "편지 전달 준비를 하지 못했어요. 편지 기능 SQL 설정을 먼저 실행해 주세요.";
  }
  if (message.includes("bootstrap_my_garden_profile")) {
    return "새 정원을 준비하지 못했어요. 새 사용자 정원 보정 SQL을 먼저 실행해 주세요.";
  }
  if (message.includes("garden_profiles") || message.includes("garden_records") || message.includes("garden_letters")) {
    return "내 정원 저장소가 아직 준비되지 않았어요. Supabase SQL 설정을 먼저 실행해 주세요.";
  }
  if (message.includes("garden_dev_test") || message.includes("enable_my_dev_test_friend") || message.includes("send_dev_test_garden_letter")) {
    return "테스트 새싹 준비를 하지 못했어요. DEV 테스트 친구 SQL 설정을 먼저 실행해 주세요.";
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

async function loadGardenState() {
  if (!currentUser) {
    state = cloneDefault();
    return;
  }

  // v9 검수는 reset 주소에서만 DEV 봉투를 준비하며, public.garden_letters는 건드리지 않습니다.
  await prepareRetentionTestIfRequested();
  await runRetentionDevCleanupIfRequested();

  const nowIso = new Date().toISOString();
  const retentionTestActive = Boolean(retentionTestModeFromUrl());
  const [profileResult, recordsResult, lettersResult, sentLettersResult, friendsResult, devFriendResult, devSentLettersResult, retentionDevLetters] = await Promise.all([
    supabase.from("garden_profiles").select("nickname, growth_count").eq("id", currentUser.id).single(),
    supabase.from("garden_records").select("id, mood, one_line, detail, created_at").order("created_at", { ascending: false }),
    // 보관 정책 검수 주소에서는 실제 받은 편지를 아예 읽지 않습니다.
    // 그래서 DEV 봉투가 실제 친구 편지와 같은 목록이나 나뭇가지에 섞이지 않습니다.
    retentionTestActive
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("garden_letters").select("id, sender_name, title, delivery_kind, sent_at, available_at, read_at, created_at").lte("available_at", nowIso).is("read_at", null).order("available_at", { ascending: true }).limit(60),
    supabase.rpc("list_my_sent_garden_letters"),
    supabase.rpc("list_my_garden_friends"),
    supabase.rpc("get_my_dev_test_friend"),
    supabase.rpc("list_my_dev_test_sent_letters"),
    loadRetentionDevLetters(),
  ]);

  // 내 정원의 기본 정보와 기록은 핵심 데이터라서 실패를 화면에 알려야 합니다.
  if (profileResult.error) throw profileResult.error;
  if (recordsResult.error) throw recordsResult.error;

  // 편지/친구는 각각 독립적으로 읽습니다.
  // 한 종류의 RPC가 잠시 실패해도 다른 저장 데이터를 0으로 초기화하지 않습니다.
  if (lettersResult.error) console.warn("TodayForest received-letter load skipped:", lettersResult.error);
  if (sentLettersResult.error) console.warn("TodayForest sent-letter load skipped:", sentLettersResult.error);
  if (friendsResult.error) console.warn("TodayForest friend load skipped:", friendsResult.error);
  if (devFriendResult.error) console.warn("TodayForest DEV friend load skipped:", devFriendResult.error);
  if (devSentLettersResult.error) console.warn("TodayForest DEV sent-letter load skipped:", devSentLettersResult.error);

  const profile = profileResult.data;
  const realFriends = (friendsResult.data || []).map((friend) => ({
    id: friend.friend_id,
    name: friend.nickname || "친구",
    avatarUrl: friend.avatar_url || "",
    growth: Number(friend.growth_count || 0),
    becameFriendsAt: friend.became_friends_at,
    isDevTest: Boolean(friend.is_dev_test),
  }));
  const devFriends = (devFriendResult.data || []).map((friend) => ({
    id: friend.friend_id,
    name: friend.nickname || "테스트 새싹",
    avatarUrl: friend.avatar_url || "",
    growth: Number(friend.growth_count || 5),
    becameFriendsAt: friend.became_friends_at,
    isDevTest: true,
  }));
  const friendsById = new Map();
  [...realFriends, ...devFriends].forEach((friend) => {
    if (friend?.id) friendsById.set(friend.id, friend);
  });

  const realSentLetters = (sentLettersResult.data || []).map((letter) => ({
    id: letter.id,
    to: letter.recipient_name || "친구",
    title: letter.title,
    deliveryKind: letter.delivery_kind,
    sentAt: letter.sent_at,
    availableAt: letter.available_at,
    readAt: letter.read_at,
    isDevTest: Boolean(letter.is_dev_test),
  }));
  const devSentLetters = (devSentLettersResult.data || []).map((letter) => ({
    id: letter.id,
    to: letter.recipient_name || "테스트 새싹",
    title: letter.title,
    deliveryKind: letter.delivery_kind,
    sentAt: letter.sent_at,
    availableAt: letter.available_at,
    readAt: letter.read_at,
    isDevTest: true,
  }));
  const sentById = new Map();
  [...realSentLetters, ...devSentLetters].forEach((letter) => {
    if (letter?.id) sentById.set(letter.id, letter);
  });

  state = {
    growth: Number(profile?.growth_count || 0),
    profileName: profile?.nickname || profileNameFromUser(currentUser),
    records: (recordsResult.data || []).map((record) => ({
      id: record.id,
      mood: record.mood,
      oneLine: record.one_line,
      detail: record.detail || "",
      createdAt: record.created_at,
    })),
    letters: (lettersResult.data || []).map((letter) => ({
      id: letter.id,
      from: letter.sender_name || "친구의 마음",
      title: letter.title,
      // 본문은 봉투를 열 때 get_my_garden_letter_body RPC로 한 통만 읽습니다.
      body: null,
      bodyLoaded: false,
      delivery: deliveryText(letter.delivery_kind),
      deliveryKind: letter.delivery_kind,
      date: letter.available_at || letter.sent_at || letter.created_at,
      read: false,
    })),
    sentLetters: Array.from(sentById.values()).map(applyAnimalDeliveryMeta),
    friends: Array.from(friendsById.values()),
  };

  // v9 보관 정책 검수 봉투도 실제 수신 편지와 분리된 DEV 전용 데이터입니다.
  if (retentionDevLetters.length) {
    const existing = new Set((state.letters || []).map((letter) => String(letter.id)));
    state.letters = [...state.letters, ...retentionDevLetters.filter((letter) => !existing.has(String(letter.id)))];
  }

  // 개발 미리보기는 실제 수신 데이터와 분리된 로컬 봉투입니다.
  mergeReceivedPreviewLetters();
  await consumeRetentionNextVisitNoticeIfNeeded();
}

async function hydrateGardenForCurrentUser() {
  if (!currentUser) return;
  try {
    await ensureGardenProfile();
    await loadGardenState();
    renderAuthUI();
    renderAll();
    setAuthError("");
    configureRetentionWindPolling();
    await previewFriendInviteFromUrl();
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

function closeAllSheets() {
  const wasViewingLetters = !els.lettersSheet.classList.contains("hidden");
  [els.recordSheet, els.recordsSheet, els.friendsSheet, els.lettersSheet, els.letterComposerSheet].forEach((sheet) => sheet.classList.add("hidden"));
  els.sheetOverlay.classList.add("hidden");
  // 도착 완료 장면은 편지 화면을 확인하는 동안만 머물고, 닫으면 조용히 사라집니다.
  if (wasViewingLetters) clearAnimalDeliveryArrivals();
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

function animalPreviewFromUrl() {
  const preview = new URL(window.location.href).searchParams.get("animalPreview");
  return animalVisitors[preview] || null;
}

function animalVisitStorageKey() {
  return `${ANIMAL_VISIT_STORAGE_PREFIX}:${currentUser?.id || "guest"}:${seoulDateKey() || "today"}`;
}

function defaultAnimalKindForToday() {
  const index = stableHash(`${currentUser?.id || "guest"}:${seoulDateKey()}:animal-v1`) % animalVisitorOrder.length;
  return animalVisitorOrder[index];
}

function readAnimalVisit() {
  const preview = animalPreviewFromUrl();
  if (preview) {
    return { dateKey: seoulDateKey(), kind: preview.kind, status: "visiting", source: "preview" };
  }

  try {
    const raw = window.localStorage.getItem(animalVisitStorageKey());
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved?.kind && animalVisitors[saved.kind]) return saved;
    }
  } catch (error) {
    console.warn("TodayForest animal visit read skipped:", error);
  }

  return { dateKey: seoulDateKey(), kind: defaultAnimalKindForToday(), status: "visiting", source: "default" };
}

function saveAnimalVisit(nextVisit) {
  activeAnimalVisit = nextVisit;
  if (nextVisit?.source === "preview") return;
  try {
    window.localStorage.setItem(animalVisitStorageKey(), JSON.stringify(nextVisit));
  } catch (error) {
    console.warn("TodayForest animal visit save skipped:", error);
  }
}

function activeAnimalVisitForToday() {
  const today = seoulDateKey();
  if (activeAnimalVisit?.dateKey && activeAnimalVisit.dateKey !== today) activeAnimalVisit = null;
  activeAnimalVisit = activeAnimalVisit || readAnimalVisit();
  return activeAnimalVisit;
}

function currentAnimalVisitor() {
  const visit = activeAnimalVisitForToday();
  if (!visit || visit.status !== "visiting") return null;
  return animalVisitors[visit.kind] || null;
}

function lastAnimalTrace() {
  const visit = activeAnimalVisitForToday();
  if (!visit || visit.status !== "departed") return null;
  return animalVisitors[visit.kind] || null;
}

function animalGrowthMessage() {
  if (state.growth <= 6) return "작은 나무에도 숲친구가 하루에 여러 번 들러요.";
  if (state.growth <= 13) return "나무가 자랄수록 더 다양한 숲친구가 찾아와요.";
  if (state.growth <= 20) return "이제 가끔 빠른 숲친구도 편지를 전하러 올 수 있어요.";
  if (state.growth <= 29) return "풍성한 나무에는 하루 동안 더 많은 숲친구가 들러요.";
  return "완성된 나무에는 빠르고 특별한 숲친구도 가끔 찾아와요.";
}

function openAnimalLetterComposer() {
  const animal = currentAnimalVisitor();
  if (!animal) {
    showToast("지금은 다음 숲친구를 기다리고 있어요.");
    return;
  }
  if (!(state.friends || []).length) {
    showToast("친구와 연결되면 숲친구에게 편지를 맡길 수 있어요.");
    return;
  }
  renderLetterComposer();
  openSheet(els.letterComposerSheet);
}

function leaveAnimalWithLetter(animal) {
  if (!animal) return Promise.resolve();
  const animalButton = els.activeAnimal;
  if (animalButton) {
    animalButton.classList.add("is-departing");
    animalButton.setAttribute("aria-label", `${animal.name}가 편지를 품고 출발하는 중`);
  }
  return new Promise((resolve) => {
    window.clearTimeout(animalDepartureTimer);
    animalDepartureTimer = window.setTimeout(resolve, 680);
  });
}

function markAnimalDeparted(kind, reason = "letter") {
  const previous = activeAnimalVisit || readAnimalVisit();
  saveAnimalVisit({
    dateKey: seoulDateKey(),
    kind,
    status: "departed",
    departedAt: new Date().toISOString(),
    departureReason: reason,
  });
  return previous;
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

function updateTodayRecordAction() {
  const action = $("#openRecord");
  const label = action?.querySelector("span:last-child");
  const savedToday = hasSavedToday();
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
  const animal = currentAnimalVisitor();
  const trace = lastAnimalTrace();
  const weather = currentWeather();
  const unread = getUnreadLetters();

  const isGrowthPreview = growthPreviewFromUrl() !== null;
  els.dayCount.textContent = `마음 ${visualGrowth}일째${isGrowthPreview ? " · 미리보기" : ""}`;
  els.treeStageLabel.textContent = stage.label;
  els.treeImage.src = `../../assets/garden/tree_growth/${stage.asset}`;
  els.treeImage.alt = stage.label;

  if (animal) {
    els.visitorImage.hidden = true;
    els.visitorEmoji.hidden = false;
    els.visitorEmoji.textContent = animal.icon;
    els.visitorName.textContent = `${animal.name}가 정원에 놀러왔어요`;
    els.visitorHint.textContent = "편지를 맡기면 바로 배송을 위해 떠나요.";
    els.visitorButton.setAttribute("aria-label", `${animal.name}에게 편지 맡기기`);

    els.activeAnimal.hidden = false;
    els.activeAnimal.className = `active-animal animal-${animal.sceneClass}`;
    els.activeAnimalEmoji.textContent = animal.icon;
    els.activeAnimalSpeech.textContent = animal.speech;
  } else {
    els.visitorImage.hidden = true;
    els.visitorEmoji.hidden = false;
    els.visitorEmoji.textContent = "🌿";
    els.visitorName.textContent = "다음 숲친구를 기다리고 있어요";
    els.visitorHint.textContent = "편지를 맡긴 친구가 숲길을 따라 떠났어요.";
    els.visitorButton.setAttribute("aria-label", "다음 숲친구를 기다리는 중");
    els.activeAnimal.hidden = true;
  }

  els.animalTrace.hidden = !trace;
  if (trace) {
    els.animalTrace.className = `animal-trace trace-${trace.sceneClass}`;
    els.animalTraceIcon.textContent = trace.traceIcon;
    els.animalTrace.setAttribute("aria-label", `${trace.name}가 남긴 흔적 보기`);
  }

  els.weatherIcon.textContent = weather.icon;
  els.weatherText.textContent = weather.text;
  applyWeatherVisuals(els.gardenStage, els.treeWrap, els.rainLayer, weather, `${currentUser?.id || "guest"}:${seoulDateKey()}:my-garden`);
  els.stageMessage.textContent = animal
    ? `${animal.name}가 정원 어딘가에서 편지를 기다리고 있어요.`
    : weather.message;

  els.nextVisitorText.textContent = animalGrowthMessage();

  renderBranchLetters(unread);
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

function renderSentLetters() {
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

  if (!inTransitLetters.length && !arrivalNotices.length) {
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

  els.sentLetterList.innerHTML = `${inTransitCards}${arrivalCards}`;
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
  els.letterComposerTitle.textContent = `${animal.name}에게 편지를 맡기기`;
  els.letterCarrierPreview.innerHTML = `<span class="carrier-icon" aria-hidden="true">${animal.icon}</span><p>${animal.name}에게 맡기면 바로 숲길로 출발해요. 실제 배송시간은 ${animal.deliveryHours}시간이에요. DEV에서는 기존 1분 배송으로 흐름을 확인해요.</p>`;
  submitButton.disabled = false;
  submitButton.textContent = `${animal.icon} ${animal.name}에게 맡기기 · DEV 1분`;
  els.letterComposerFootnote.textContent = "DEV 단계에서는 기존 1분 도착으로 화면 흐름을 확인해요. 동물별 실제 배송시간 저장은 다음 데이터 연결 단계에서 적용합니다.";
}

async function sendGardenLetter(event) {
  event.preventDefault();
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

  const animal = currentAnimalVisitor();
  if (!animal) {
    showToast("지금은 정원에 머무는 숲친구가 없어요.");
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
    const result = isDevTestFriend
      ? await supabase.rpc("send_dev_test_garden_letter", {
        p_test_friend_id: selectedLetterRecipientId,
        p_title: title,
        p_body: body,
      })
      : await supabase.rpc("send_garden_letter", {
        p_recipient_id: selectedLetterRecipientId,
        p_title: title,
        p_body: body,
      });

    if (result.error) {
      throw result.error;
    }

    const letter = normalizeRpcRow(result.data) || {};
    const recipientName = letter.recipient_nickname || selectedFriend?.name || "친구";
    const availableAt = letter.available_at || new Date(Date.now() + 60000).toISOString();
    const sentAt = new Date().toISOString();
    const outgoingId = letter.letter_id || `pending-${Date.now()}`;

    // 현재 데이터베이스 RPC는 개발용 1분 배송을 유지합니다.
    // 대신 어떤 동물에게 맡겼는지는 브라우저 보조 저장으로 남겨, 편지함에서 정확한 동물·진행률을 보여줍니다.
    rememberAnimalDelivery(outgoingId, animal, sentAt, availableAt, { to: recipientName, title, isDevTest: isDevTestFriend });

    // 전송이 성공한 즉시, 재조회가 늦더라도 보낸 편지 목록에 확실히 표시합니다.
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

    els.letterForm.reset();
    closeAllSheets();
    await leaveAnimalWithLetter(animal);
    markAnimalDeparted(animal.kind, "letter");
    renderAll();
    openSheet(els.lettersSheet);
    showToast(`${animal.name}가 ${recipientName}에게 보낼 편지를 품고 숲길로 출발했어요.`);

    // 저장 성공 뒤의 재조회는 화면을 막지 않도록 별도로 처리합니다.
    try {
      await loadGardenState();
      renderAll();
      openSheet(els.lettersSheet);
    } catch (refreshError) {
      console.warn("TodayForest sent-letter refresh skipped:", refreshError);
    }
  } catch (error) {
    console.error("TodayForest letter send error:", error);
    const detail = String(error?.message || "").trim();
    showToast(detail || "편지를 보내지 못했어요. 제목과 내용은 그대로 두었어요.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText || "숲친구에게 편지 맡기기";
  }
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
        <button class="friend-garden-open" type="button" data-view-friend="${escapeAttr(friend.id)}" aria-label="${escapeAttr(friend.name)}의 정원 보기">
          <span class="friend-avatar">${avatar}</span>
          <span class="friend-main">
            <span class="friend-name">${escapeHTML(friend.name)}${friend.isDevTest ? '<span class="dev-test-tag">DEV</span>' : ""}</span>
            <span class="friend-stage">마음 ${friend.growth}일째 · ${escapeHTML(stage.label)}${friend.isDevTest ? " · 개발 확인용" : ""}</span>
          </span>
          <span class="friend-view-arrow" aria-hidden="true">›</span>
        </button>
        <button class="remove-friend-button" type="button" data-remove-friend="${escapeAttr(friend.id)}" data-friend-name="${escapeAttr(friend.name)}" data-dev-test="${friend.isDevTest ? "true" : "false"}">${actionText}</button>
      </article>
    `;
  }).join("");

  $$('[data-view-friend]').forEach((button) => {
    button.addEventListener("click", () => openFriendGarden(button.dataset.viewFriend));
  });
  $$('[data-remove-friend]').forEach((button) => {
    button.addEventListener("click", () => removeFriend(button.dataset.removeFriend, button.dataset.friendName, button.dataset.devTest === "true"));
  });
}

async function openFriendGarden(friendId) {
  const fallbackFriend = (state.friends || []).find((friend) => friend.id === friendId);
  if (!friendId || !fallbackFriend) {
    showToast("친구 정원을 찾지 못했어요.");
    return;
  }

  const { data, error } = await supabase.rpc("get_my_garden_friend_view", { p_friend_id: friendId });
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

  activeFriendGardenId = friend.friend_id || friendId;
  els.friendVisitName.textContent = `${name}의 정원`;
  els.friendVisitTree.src = `../../assets/garden/tree_growth/${stage.asset}`;
  els.friendVisitTree.alt = `${name}의 ${stage.label}`;
  els.friendVisitDayCount.textContent = `마음 ${growth}일째`;
  els.friendVisitStageLabel.textContent = stage.label;
  els.friendVisitWeatherIcon.textContent = weather.icon;
  els.friendVisitWeatherText.textContent = weather.text;
  els.friendVisitMessage.textContent = `${name}의 나무에도 ${weather.message}`;
  applyWeatherVisuals(els.friendVisitStage, els.friendVisitTreeWrap, els.friendVisitRainLayer, weather, `${friend.friend_id || friendId}:${seoulDateKey()}:friend-garden`);

  closeAllSheets();
  els.gardenApp.classList.add("hidden");
  els.friendVisit.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function returnToMyGarden() {
  els.friendVisit.classList.add("hidden");
  els.gardenApp.classList.remove("hidden");
  els.friendVisitRainLayer.classList.remove("active");
  els.friendVisitTreeWrap.classList.remove("wind-active");
  els.friendVisitStage.classList.remove("weather-rain");
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
  const { data, error } = await supabase.rpc("get_my_garden_letter_body", { p_letter_id: letter.id });
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

async function saveRecord(event) {
  event.preventDefault();
  const oneLine = els.oneLine.value.trim();
  const detail = els.detailText.value.trim();
  const submitButton = els.recordForm.querySelector('button[type="submit"]');

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

  els.recordForm.reset();
  selectedMood = "good";
  renderMoodSelection();
  els.detailWrap.classList.add("hidden");
  els.toggleDetail.innerHTML = '조금 더 적기 <span aria-hidden="true">⌄</span>';
  closeAllSheets();
  renderAll();
  els.treeWrap.classList.remove("tree-pulse");
  void els.treeWrap.offsetWidth;
  els.treeWrap.classList.add("tree-pulse");
  showToast("오늘의 마음이 내 정원에 저장됐어요.");
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

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  toastTimer = window.setTimeout(() => els.toast.classList.add("hidden"), 3200);
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
  els.authScreen.classList.toggle("hidden", isSignedIn);
  els.gardenApp.classList.toggle("hidden", !isSignedIn);
  if (isSignedIn) {
    const name = state.profileName || displayName(currentUser);
    els.accountName.textContent = `${name}의 정원`;
    els.accountButton.setAttribute("aria-label", `${name} 계정 정보 보기`);
  }
}

function renderAll() {
  renderMoodSelection();
  renderGarden();
  renderRecords();
  renderLetters();
  renderFriends();
}

async function beginKakaoLogin() {
  if (authBusy) return;
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
    state = cloneDefault();
    selectedMood = "good";
    selectedLetterRecipientId = "";
    invitePreviewHandled = false;
    renderAuthUI();
    renderAll();
    await hydrateGardenForCurrentUser();
    return;
  }

  if (!currentUser) {
    configureRetentionWindPolling();
    state = cloneDefault();
  }
  renderAuthUI();
  if (currentUser) renderAll();
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
  configureRetentionWindPolling();
  state = cloneDefault();
  selectedLetterRecipientId = "";
  closeAllSheets();
  closeLetterModal();
  returnToMyGarden();
  closeFriendInviteModal({ keepLink: true });
  renderAuthUI();
  setAuthError("");
}

async function openLettersSheet() {
  // 편지 버튼을 누르는 순간 한 번 바로 새로 읽어, 오래 닫아뒀다가 열어도 최신 배송 상태를 보여줍니다.
  renderLetters();
  openSheet(els.lettersSheet);
  if (!currentUser) return;
  try {
    await loadGardenState();
    renderAll();
  } catch (error) {
    console.warn("TodayForest letter open refresh skipped:", error);
  }
}

function bindEvents() {
  els.signInKakao.addEventListener("click", beginKakaoLogin);
  els.installAppButton.addEventListener("click", () => { void requestAppInstall(); });
  els.dismissInstallCard.addEventListener("click", dismissInstallCardForAWhile);
  els.signOutButton.addEventListener("click", signOut);
  els.accountButton.addEventListener("click", () => showToast(`${state.profileName || displayName(currentUser)} 계정으로 내 정원을 이어보고 있어요.`));
  $("#openRecord").addEventListener("click", () => {
    if (hasSavedToday()) {
      showToast("오늘의 마음은 이미 나무에 남겼어요. 내일 다시 와요.");
      return;
    }
    openSheet(els.recordSheet);
  });
  $("#openRecords").addEventListener("click", () => { renderRecords(); openSheet(els.recordsSheet); });
  els.openFriends.addEventListener("click", () => { renderFriends(); openSheet(els.friendsSheet); });
  $("#openLetters").addEventListener("click", () => { void openLettersSheet(); });
  els.openLetterComposer.addEventListener("click", () => {
    showToast("정원에 찾아온 숲친구를 눌러 편지를 맡겨요.");
  });
  els.letterForm.addEventListener("submit", sendGardenLetter);
  els.visitorButton.addEventListener("click", openAnimalLetterComposer);
  els.activeAnimal.addEventListener("click", openAnimalLetterComposer);
  els.animalTrace.addEventListener("click", () => {
    const trace = lastAnimalTrace();
    if (trace) showToast(trace.traceStory);
  });
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
  els.createInviteButton.addEventListener("click", createFriendInvite);
  els.copyInviteLink.addEventListener("click", copyFriendInviteLink);
  els.enableDevFriendButton.addEventListener("click", enableDevTestFriend);
  $("#closeFriendInviteModal").addEventListener("click", () => closeFriendInviteModal());
  els.declineFriendInviteButton.addEventListener("click", () => closeFriendInviteModal());
  els.acceptFriendInviteButton.addEventListener("click", acceptFriendInvite);
  els.friendInviteModal.addEventListener("click", (event) => { if (event.target === els.friendInviteModal) closeFriendInviteModal(); });
  window.addEventListener("focus", async () => {
    if (!currentUser) return;
    try {
      await loadGardenState();
      renderAll();
    } catch (error) {
      console.warn("TodayForest refresh skipped:", error);
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!els.friendVisit.classList.contains("hidden")) {
      returnToMyGarden();
      return;
    }
    closeAllSheets();
    closeLetterModal();
    closeFriendInviteModal();
  });
}

async function init() {
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
  await handleOAuthCallback();
  await syncSession();

  window.setInterval(async () => {
    if (!currentUser) return;
    try {
      await loadGardenState();
      renderAll();
    } catch (error) {
      console.warn("TodayForest letter refresh skipped:", error);
    }
  }, 30000);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    const nextUser = session?.user || null;
    const changedUser = nextUser?.id !== currentUser?.id;
    currentUser = nextUser;

    if (currentUser && changedUser) {
      state = cloneDefault();
      selectedMood = "good";
      selectedLetterRecipientId = "";
      invitePreviewHandled = false;
      renderAuthUI();
      renderAll();
      await hydrateGardenForCurrentUser();
      return;
    }

    if (!currentUser) {
      configureRetentionWindPolling();
      state = cloneDefault();
    }
    renderAuthUI();
    if (currentUser) renderAll();
  });
}

init();
