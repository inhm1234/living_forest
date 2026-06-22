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
  weatherIndex: 0,
  records: [],
  letters: [],
  sentLetters: [],
  friends: [],
  profileName: "새 친구",
};

const weatherOptions = [
  { icon: "🍃", text: "바람이 가볍게 불어요", className: "wind", message: "바람이 잎 끝을 살짝 흔들고 있어요." },
  { icon: "🌧️", text: "조용히 비가 내려요", className: "rain", message: "비가 나무 가까이에 조용히 스며들어요." },
  { icon: "☀️", text: "햇살이 포근하게 내려와요", className: "sun", message: "햇살이 오늘의 잎을 따뜻하게 감싸요." },
];

const visitorRules = [
  { min: 0, max: 2, name: "작은 새가 쉬어가고 있어요", hint: "마음이 조금 더 쌓이면 새로운 방문자가 찾아와요", image: "../../assets/garden/bird-silhouette-v3.png", next: 3 },
  { min: 3, max: 7, name: "다람쥐가 나무 아래를 살펴봐요", hint: "조금 더 자라면 편지를 더 멀리 보낼 수 있어요", image: "../../assets/garden/squirrel-silhouette-v3.png", next: 8 },
  { min: 8, max: 17, name: "새싹새가 쉬어가고 있어요", hint: "나무가 자라면 더 빠른 새가 찾아와요", image: "../../assets/garden/bird-silhouette-v3.png", next: 18 },
  { min: 18, max: 29, name: "큰 새가 높은 가지를 찾아왔어요", hint: "마음이 더 모이면 멀리 있는 친구에게도 빨리 닿아요", image: "../../assets/garden/bird-silhouette-v3.png", next: 30 },
  { min: 30, max: Infinity, name: "빠른 새가 내 나무를 찾아왔어요", hint: "이제 네 나무는 멀리 있는 마음도 빠르게 전할 수 있어요", image: "../../assets/garden/bird-silhouette-v3.png", next: null },
];

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

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const els = {
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
  visitorName: $("#visitorName"),
  visitorHint: $("#visitorHint"),
  nextVisitorText: $("#nextVisitorText"),
  branchLetter: $("#branchLetter"),
  letterBadge: $("#letterBadge"),
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
    little_bird: "작은 새가 가지에 걸어두고 갔어요",
    squirrel: "다람쥐가 나무 아래에 두고 갔어요",
    sprout_bird: "새싹새가 가지에 걸어두고 갔어요",
    swift_bird: "빠른 새가 높이 날아와 전해줬어요",
  };
  return map[kind] || "숲의 새가 가지에 걸어두고 갔어요";
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

async function loadGardenState() {
  if (!currentUser) {
    state = cloneDefault();
    return;
  }

  const nowIso = new Date().toISOString();
  const [profileResult, recordsResult, lettersResult, sentLettersResult, friendsResult, devFriendResult, devSentLettersResult] = await Promise.all([
    supabase.from("garden_profiles").select("nickname, growth_count, weather_index").eq("id", currentUser.id).single(),
    supabase.from("garden_records").select("id, mood, one_line, detail, created_at").order("created_at", { ascending: false }),
    supabase.from("garden_letters").select("id, sender_name, title, body, delivery_kind, sent_at, available_at, read_at, created_at").lte("available_at", nowIso).order("available_at", { ascending: false }),
    supabase.rpc("list_my_sent_garden_letters"),
    supabase.rpc("list_my_garden_friends"),
    supabase.rpc("get_my_dev_test_friend"),
    supabase.rpc("list_my_dev_test_sent_letters"),
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
    weatherIndex: Number(profile?.weather_index || 0),
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
      body: letter.body,
      delivery: deliveryText(letter.delivery_kind),
      date: letter.available_at || letter.sent_at || letter.created_at,
      read: Boolean(letter.read_at),
    })),
    sentLetters: Array.from(sentById.values()),
    friends: Array.from(friendsById.values()),
  };
}

async function hydrateGardenForCurrentUser() {
  if (!currentUser) return;
  try {
    await ensureGardenProfile();
    await loadGardenState();
    renderAuthUI();
    renderAll();
    setAuthError("");
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
  [els.recordSheet, els.recordsSheet, els.friendsSheet, els.lettersSheet, els.letterComposerSheet].forEach((sheet) => sheet.classList.add("hidden"));
  els.sheetOverlay.classList.add("hidden");
}

function getStage() {
  return stageRules.find((rule) => state.growth >= rule.min && state.growth <= rule.max) || stageRules.at(-1);
}

function stageForGrowth(growth) {
  return stageRules.find((rule) => growth >= rule.min && growth <= rule.max) || stageRules.at(-1);
}

function getVisitor() {
  return visitorRules.find((rule) => state.growth >= rule.min && state.growth <= rule.max) || visitorRules.at(-1);
}

function getUnreadLetters() {
  return state.letters.filter((letter) => !letter.read);
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

function currentWeather() {
  return weatherOptions[state.weatherIndex % weatherOptions.length];
}

function renderGarden() {
  const stage = getStage();
  const visitor = getVisitor();
  const weather = currentWeather();
  const unread = getUnreadLetters();

  els.dayCount.textContent = `마음 ${state.growth}일째`;
  els.treeStageLabel.textContent = stage.label;
  els.treeImage.src = `../../assets/garden/tree_growth/${stage.asset}`;
  els.treeImage.alt = stage.label;

  els.visitorImage.src = visitor.image;
  els.visitorImage.alt = visitor.name;
  els.visitorName.textContent = visitor.name;
  els.visitorHint.textContent = visitor.hint;

  els.weatherIcon.textContent = weather.icon;
  els.weatherText.textContent = weather.text;
  els.rainLayer.classList.toggle("active", weather.className === "rain");
  els.treeWrap.classList.toggle("wind-active", weather.className === "wind");
  els.stageMessage.textContent = weather.message;

  if (visitor.next) {
    const left = Math.max(0, visitor.next - state.growth);
    els.nextVisitorText.textContent = `마음 ${left}번을 더 남기면 ${left <= 1 ? "새로운 방문자가" : "조금 더 빠른 새가"} 찾아와요.`;
  } else {
    els.nextVisitorText.textContent = "가장 빠른 새가 내 나무를 찾아오고 있어요.";
  }

  els.branchLetter.hidden = unread.length === 0;
  els.letterBadge.textContent = unread.length > 1 ? `새 편지 ${unread.length}` : "새 편지";
  els.navLetterBadge.textContent = unread.length;
  els.navLetterBadge.classList.toggle("hidden", unread.length === 0);
  updateTodayRecordAction();
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
  const letters = [...state.letters].sort((a, b) => new Date(b.date) - new Date(a.date));
  const friends = state.friends || [];
  const canWrite = friends.length > 0;

  els.openLetterComposer.disabled = !canWrite;
  els.openLetterComposer.textContent = canWrite ? "새에게 편지 맡기기" : "친구가 생기면 편지를 보낼 수 있어요";
  els.letterFriendHint.textContent = canWrite
    ? `함께 자라는 친구 ${friends.length}명에게 마음을 보낼 수 있어요.`
    : "친구와 연결되면 새에게 편지를 맡길 수 있어요.";

  renderSentLetters();

  if (!letters.length) {
    els.letterList.innerHTML = '<div class="empty-state">아직 도착한 편지가 없어요.<br />새가 나뭇가지에 편지를 걸어두면 여기에도 차분히 모여요.</div>';
    return;
  }

  els.letterList.innerHTML = letters.map((letter) => `
    <button class="letter-item ${letter.read ? "" : "unread"}" type="button" data-letter-id="${escapeAttr(letter.id)}">
      <div class="letter-item-head">
        <div class="letter-from-row"><span class="mail-mark">✉</span><span>${escapeHTML(letter.from)}</span></div>
        <span class="letter-meta">${letter.read ? "읽은 편지" : "새 편지"}</span>
      </div>
      <p class="letter-preview">${escapeHTML(letter.title)}</p>
      <span class="letter-meta">${escapeHTML(formatDate(letter.date))} · ${escapeHTML(shortDelivery(letter.delivery))}</span>
    </button>
  `).join("");

  $$('[data-letter-id]').forEach((button) => button.addEventListener("click", () => openLetter(button.dataset.letterId)));
}

function renderSentLetters() {
  const sentLetters = [...(state.sentLetters || [])].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  if (!sentLetters.length) {
    els.sentLetterList.innerHTML = '<div class="empty-state">아직 맡긴 편지가 없어요.<br />친구에게 먼저 작은 마음을 보내볼래요?</div>';
    return;
  }

  els.sentLetterList.innerHTML = sentLetters.map((letter) => {
    const carrier = carrierForKind(letter.deliveryKind);
    const isDelivered = new Date(letter.availableAt).getTime() <= Date.now();
    const devReadButton = letter.isDevTest && isDelivered && !letter.readAt
      ? `<button class="dev-read-sim-button" type="button" data-dev-read-letter="${escapeAttr(letter.id)}">테스트 친구가 읽기</button>`
      : "";
    return `
      <article class="sent-letter-item ${letter.isDevTest ? "is-dev-test" : ""}">
        <div class="sent-letter-icon" aria-hidden="true">${carrier.icon}</div>
        <div class="sent-letter-main">
          <div class="sent-letter-title">${escapeHTML(letter.to)}에게 · ${escapeHTML(letter.title)}${letter.isDevTest ? '<span class="dev-test-tag">DEV</span>' : ""}</div>
          <div class="sent-letter-detail">${escapeHTML(carrier.name)} · ${escapeHTML(formatDate(letter.sentAt))}</div>
          ${devReadButton}
        </div>
        <span class="sent-letter-status">${escapeHTML(deliveryStatus(letter))}</span>
      </article>
    `;
  }).join("");

  $$('[data-dev-read-letter]').forEach((button) => {
    button.addEventListener("click", () => simulateDevFriendRead(button.dataset.devReadLetter));
  });
}

function carrierForKind(kind) {
  const map = {
    little_bird: { icon: "🐦", name: "작은 새" },
    squirrel: { icon: "🐿️", name: "다람쥐" },
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

  const carrier = carrierForGrowth(state.growth);
  const chosenFriend = friends.find((friend) => friend.id === selectedLetterRecipientId);
  const destination = chosenFriend?.isDevTest
    ? "테스트 새싹의 나뭇가지에 도착한 뒤, 이 화면에서 읽음 상태까지 확인할 수 있어요."
    : "친구의 나뭇가지에 걸어둘 거예요.";
  els.letterCarrierPreview.innerHTML = `<span class="carrier-icon" aria-hidden="true">${carrier.icon}</span><p>${carrier.name}가 편지를 맡아, 1분 뒤 ${destination}</p>`;
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

  const selectedFriend = (state.friends || []).find((friend) => friend.id === selectedLetterRecipientId);
  const isDevTestFriend = Boolean(selectedFriend?.isDevTest);
  const submitButton = els.letterForm.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = "새가 편지를 품고 날아가요…";

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
    const deliveryKind = letter.delivery_kind || carrierForGrowth(state.growth).kind;
    const availableAt = letter.available_at || new Date(Date.now() + 60000).toISOString();

    // 전송이 성공한 즉시, 재조회가 늦더라도 보낸 편지 목록에 확실히 표시합니다.
    state.sentLetters = [{
      id: letter.letter_id || `pending-${Date.now()}`,
      to: recipientName,
      title,
      deliveryKind,
      sentAt: new Date().toISOString(),
      availableAt,
      readAt: null,
      isDevTest: isDevTestFriend,
    }, ...(state.sentLetters || [])];

    els.letterForm.reset();
    closeAllSheets();
    renderAll();
    openSheet(els.lettersSheet);
    showToast(`${recipientName}에게 편지를 보냈어요. 작은 새가 나뭇가지로 날아가요.`);

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
    submitButton.textContent = originalText || "새에게 편지 맡기기";
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
  const weather = weatherOptions[Number(friend.weather_index ?? 0) % weatherOptions.length];
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
  els.friendVisitRainLayer.classList.toggle("active", weather.className === "rain");
  els.friendVisitTreeWrap.classList.toggle("wind-active", weather.className === "wind");

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
  if (text.includes("다람쥐")) return "다람쥐가 전해줌";
  if (text.includes("빠른 새")) return "빠른 새가 전해줌";
  if (text.includes("새싹새")) return "새싹새가 전해줌";
  if (text.includes("작은 새")) return "작은 새가 전해줌";
  return "숲의 새가 전해줌";
}

function openLetter(letterId) {
  const letter = state.letters.find((item) => item.id === letterId);
  if (!letter) return;
  activeLetterId = letterId;
  els.letterFrom.textContent = letter.from;
  els.letterModalTitle.textContent = letter.title;
  els.letterBody.textContent = letter.body;
  els.letterDelivery.textContent = letter.delivery;
  els.letterDate.textContent = formatDate(letter.date);
  $("#readLetterButton").textContent = letter.read ? "편지 다시 접기" : "편지 마음에 담기";
  els.letterModal.classList.remove("hidden");
}

function closeLetterModal() {
  els.letterModal.classList.add("hidden");
  activeLetterId = null;
}

async function markLetterRead() {
  const letter = state.letters.find((item) => item.id === activeLetterId);
  if (letter && !letter.read) {
    const { error } = await supabase.from("garden_letters").update({ read_at: new Date().toISOString() }).eq("id", letter.id);
    if (error) {
      showToast("편지 상태를 저장하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    letter.read = true;
    renderGarden();
    renderLetters();
    showToast("편지가 내 편지함에 조용히 보관되었어요.");
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

  if (!currentUser) state = cloneDefault();
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
  state = cloneDefault();
  selectedLetterRecipientId = "";
  closeAllSheets();
  closeLetterModal();
  returnToMyGarden();
  closeFriendInviteModal({ keepLink: true });
  renderAuthUI();
  setAuthError("");
}

function bindEvents() {
  els.signInKakao.addEventListener("click", beginKakaoLogin);
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
  $("#openLetters").addEventListener("click", () => { renderLetters(); openSheet(els.lettersSheet); });
  els.openLetterComposer.addEventListener("click", () => {
    if (!(state.friends || []).length) {
      showToast("친구와 연결되면 편지를 보낼 수 있어요.");
      return;
    }
    renderLetterComposer();
    openSheet(els.letterComposerSheet);
  });
  els.letterForm.addEventListener("submit", sendGardenLetter);
  els.branchLetter.addEventListener("click", () => {
    const firstUnread = getUnreadLetters()[0];
    if (firstUnread) openLetter(firstUnread.id);
  });
  els.weatherButton.addEventListener("click", async () => {
    if (!currentUser) return;
    const nextIndex = (state.weatherIndex + 1) % weatherOptions.length;
    els.weatherButton.disabled = true;
    const { error } = await supabase.from("garden_profiles").update({ weather_index: nextIndex }).eq("id", currentUser.id);
    els.weatherButton.disabled = false;
    if (error) {
      showToast(databaseErrorMessage(error));
      return;
    }
    state.weatherIndex = nextIndex;
    renderGarden();
    showToast(currentWeather().text);
  });
  els.visitorButton.addEventListener("click", () => showToast(`${getVisitor().name} 방문 중이에요.`));
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

    if (!currentUser) state = cloneDefault();
    renderAuthUI();
    if (currentUser) renderAll();
  });
}

init();
