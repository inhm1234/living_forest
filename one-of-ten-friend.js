import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://xdcsppaptcmgpvnzgoab.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oMrSqUFX9UM1n4Ks-AhYKw_OvcZOfPs";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" },
});

const TURN_LIMIT_MS = 30000;
const EQUATION_REVEAL_MS = 700;
const LOBBY_POLL_MS = 10000;
const MATCH_POLL_MS = 2500;
const INVITE_ACK_STORAGE_KEY = "todayForestOotAcknowledgedInvites";
const INVITE_TARGET_STORAGE_KEY = "todayForestOotPendingInvite";
const OPERATIONS = [
  { value: "+", label: "+" },
  { value: "-", label: "−" },
  { value: "×", label: "×" },
  { value: "÷", label: "÷" },
];
const TIER_LABELS = {
  number_seed: "숫자씨앗",
  calculation_sprout: "계산새싹",
  formula_branch: "수식가지",
  number_tree: "숫자나무",
  one_of_ten_master: "원오브텐 장인",
  forest_keeper: "숫자의 숲지기",
};
function trackOneOfTen(eventName, params = {}) {
  if (typeof window.trackTodayForestEvent === "function") {
    window.trackTodayForestEvent(eventName, params);
  }
}

function trackOneOfTenOnce(eventName, dedupeKey, params = {}) {
  if (typeof window.trackTodayForestEventOnce === "function") {
    return window.trackTodayForestEventOnce(eventName, dedupeKey, params);
  }
  trackOneOfTen(eventName, params);
  return true;
}

function analyticsBattleMode(mode) {
  return mode === "rated" ? "friend_point" : "friend_casual";
}

const TIER_START_POINTS = {
  number_seed: 0,
  calculation_sprout: 30,
  formula_branch: 80,
  number_tree: 150,
  one_of_ten_master: 250,
  forest_keeper: 400,
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  loadingView: $("#loadingView"), loginView: $("#loginView"), lobbyView: $("#lobbyView"), matchView: $("#matchView"),
  helpButton: $("#helpButton"), helpOverlay: $("#helpOverlay"), closeHelpButton: $("#closeHelpButton"), helpConfirmButton: $("#helpConfirmButton"),
  pointSummaryCard: $("#pointSummaryCard"), pointValue: $("#pointValue"), pointTier: $("#pointTier"), pointProgressText: $("#pointProgressText"), pointProgressBar: $("#pointProgressBar"), pointProtection: $("#pointProtection"),
  activeMatchesSection: $("#activeMatchesSection"), activeMatchCount: $("#activeMatchCount"), activeMatchesList: $("#activeMatchesList"),
  incomingSection: $("#incomingSection"), incomingCount: $("#incomingCount"), incomingList: $("#incomingList"),
  outgoingSection: $("#outgoingSection"), outgoingCount: $("#outgoingCount"), outgoingList: $("#outgoingList"),
  friendsList: $("#friendsList"), noFriendsView: $("#noFriendsView"), refreshLobbyButton: $("#refreshLobbyButton"),
  inviteModeOverlay: $("#inviteModeOverlay"), closeInviteModeButton: $("#closeInviteModeButton"), inviteFriendName: $("#inviteFriendName"), inviteFriendAvatar: $("#inviteFriendAvatar"), inviteFriendStatus: $("#inviteFriendStatus"), casualInviteButton: $("#casualInviteButton"), ratedInviteButton: $("#ratedInviteButton"), ratedInviteStatus: $("#ratedInviteStatus"),
  opponentAvatar: $("#opponentAvatar"), opponentName: $("#opponentName"), opponentStatus: $("#opponentStatus"), opponentCardCount: $("#opponentCardCount"), opponentHand: $("#opponentHand"), matchModeBadge: $("#matchModeBadge"),
  matchReadyOverlay: $("#matchReadyOverlay"), readyOpponentAvatar: $("#readyOpponentAvatar"), readyOpponentName: $("#readyOpponentName"), readyMatchMode: $("#readyMatchMode"), readyMeCard: $("#readyMeCard"), readyMeStatus: $("#readyMeStatus"), readyOpponentCard: $("#readyOpponentCard"), readyOpponentLabel: $("#readyOpponentLabel"), readyOpponentStatus: $("#readyOpponentStatus"), readyCountdown: $("#readyCountdown"), readyRoomMessage: $("#readyRoomMessage"), matchReadyButton: $("#matchReadyButton"), cancelWaitingMatchButton: $("#cancelWaitingMatchButton"),
  historyToggle: $("#historyToggle"), matchHistory: $("#matchHistory"), operationCount: $("#operationCount"),
  turnPill: $("#turnPill"), turnTimer: $("#turnTimer"), timerText: $("#timerText"), timerBar: $("#timerBar"), timeoutHint: $("#timeoutHint"),
  currentValue: $("#currentValue"), selectedOperation: $("#selectedOperation"), selectedNumber: $("#selectedNumber"), arenaMessage: $("#arenaMessage"), calculationNote: $("#calculationNote"), operationCards: $("#operationCards"),
  actionPanel: $("#actionPanel"), stopButton: $("#stopButton"), drawButton: $("#drawButton"), myHand: $("#myHand"), deckCount: $("#deckCount"), handHelp: $("#handHelp"),
  leaveMatchButton: $("#leaveMatchButton"), connectionStatus: $("#connectionStatus"),
  resultOverlay: $("#resultOverlay"), resultSymbol: $("#resultSymbol"), resultTitle: $("#resultTitle"), resultDescription: $("#resultDescription"), resultHistory: $("#resultHistory"), resultValue: $("#resultValue"), myTarget: $("#myTarget"), myDistance: $("#myDistance"), opponentTargetLabel: $("#opponentTargetLabel"), opponentTarget: $("#opponentTarget"), opponentDistance: $("#opponentDistance"), resultRematchBox: $("#resultRematchBox"), resultSeriesStatus: $("#resultSeriesStatus"), resultRematchStatus: $("#resultRematchStatus"), resultRematchButton: $("#resultRematchButton"), resultLobbyButton: $("#resultLobbyButton"), resultGardenLink: $("#resultGardenLink"),
  resultPointPanel: $("#resultPointPanel"), resultPointMode: $("#resultPointMode"), resultPointDelta: $("#resultPointDelta"), resultPointBefore: $("#resultPointBefore"), resultPointAfter: $("#resultPointAfter"), resultPointMessage: $("#resultPointMessage"), resultTierMessage: $("#resultTierMessage"),
  chatToggleButton: $("#matchChatToggle"), chatUnreadBadge: $("#matchChatUnread"), chatBackdrop: $("#matchChatBackdrop"), chatPanel: $("#matchChatPanel"), chatCloseButton: $("#matchChatClose"), chatOpponentName: $("#matchChatOpponent"), chatMessages: $("#matchChatMessages"), chatEmpty: $("#matchChatEmpty"), chatForm: $("#matchChatForm"), chatInput: $("#matchChatInput"), chatSendButton: $("#matchChatSend"), chatStatus: $("#matchChatStatus"), chatCounter: $("#matchChatCounter"),
  toast: $("#toast"),
};

const state = {
  user: null,
  friends: [], invites: [], matches: [], match: null,
  pointProfile: null,
  friendAvailability: new Map(),
  friendsLoadFailed: false, invitesLoadFailed: false, lobbyWarnings: [],
  knownIncomingInviteIds: new Set(),
  inviteTargetFriendId: null, inviteTargetButton: null, ratedStatus: null,
  selectedOperation: null, selectedNumber: null,
  historyExpanded: false, busy: false,
  serverOffset: 0, timeoutResolving: false,
  lobbyInterval: null, matchInterval: null, timerInterval: null,
  realtimeChannel: null, inviteRealtimeChannel: null, renderResultForMatchId: null,
  autoOpeningMatchId: null,
  processingInviteIds: new Set(),
  readyCountdownInterval: null,
  readyStartRequested: false,
  readyActionBusy: false,
  rematchBusy: false,
  rematchNavigating: false,
  chatChannel: null, chatPollInterval: null, chatSeriesId: "", chatCurrentMatchId: "",
  chatMessages: [], chatLoaded: false, chatOpen: false, chatBusy: false, chatAvailable: false,
  chatUnread: 0, chatMaxLength: 120,
};
let toastTimer = null;
let actionTimer = null;
let lobbyLoading = false;
let matchLoading = false;

function normalizeRows(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return [data];
}

function extractMatchId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(extractMatchId).find(Boolean) || "";
  if (typeof value === "object") {
    return extractMatchId(
      value.match_id || value.matchId || value.id || value.match || value.data || value.result || value.match_view
    );
  }
  return "";
}

function matchOpponentId(match) {
  if (!match || typeof match !== "object") return "";
  const direct = match.opponent_id || match.opponentId || match.other_user_id || match.otherUserId;
  if (direct) return String(direct);

  const me = String(state.user?.id || "");
  const candidates = [
    match.inviter_id, match.invitee_id,
    match.host_id, match.guest_id,
    match.player_one_id, match.player_two_id,
    match.player1_id, match.player2_id,
  ].filter(Boolean).map(String);
  return candidates.find((id) => id !== me) || "";
}

function activeMatchForOpponent(matches, opponentId) {
  const activeMatches = normalizeRows(matches).filter((match) => match?.status === "active");
  if (!opponentId) return activeMatches.length === 1 ? activeMatches[0] : null;
  return activeMatches.find((match) => matchOpponentId(match) === String(opponentId)) || null;
}

function getInviteIdFromUrl() {
  return String(new URL(location.href).searchParams.get("invite") || "").trim();
}

function getStoredInviteIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(INVITE_ACK_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveStoredInviteIds(ids) {
  try {
    localStorage.setItem(INVITE_ACK_STORAGE_KEY, JSON.stringify([...ids].slice(-80)));
  } catch {
    // 저장 공간이 막혀 있어도 초대 수락 자체는 계속 진행합니다.
  }
}

async function acknowledgeInviteOnce(inviteId) {
  const normalizedId = String(inviteId || "").trim();
  if (!normalizedId) return;
  const stored = getStoredInviteIds();
  if (stored.has(normalizedId)) return;

  stored.add(normalizedId);
  saveStoredInviteIds(stored);
  try {
    await rpc("oot_ack_invite", { p_invite_id: normalizedId });
  } catch (error) {
    stored.delete(normalizedId);
    saveStoredInviteIds(stored);
    console.warn("OneOfTen invite acknowledge skipped", error);
  }
}

function clearInviteTracking(inviteId) {
  const normalizedId = String(inviteId || "").trim();
  try {
    if (sessionStorage.getItem(INVITE_TARGET_STORAGE_KEY) === normalizedId) {
      sessionStorage.removeItem(INVITE_TARGET_STORAGE_KEY);
    }
  } catch {
    // 세션 저장소를 사용할 수 없는 환경은 무시합니다.
  }

  const url = new URL(location.href);
  if (!normalizedId || url.searchParams.get("invite") === normalizedId) {
    url.searchParams.delete("invite");
    history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }
}

async function closeInviteNotification(inviteId) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("./");
    const notifications = await registration?.getNotifications({ tag: `oot-invite-${inviteId}` });
    notifications?.forEach((notification) => notification.close());
  } catch (error) {
    console.warn("OneOfTen invite notification close skipped", error);
  }
}

function normalizeFriendRow(friend) {
  if (!friend || typeof friend !== "object") return null;

  const friendId = friend.friend_id || friend.friendId || friend.id || "";
  if (!friendId) return null;

  return {
    ...friend,
    friend_id: friendId,
    nickname: friend.nickname || friend.name || "친구",
    avatar_url: friend.avatar_url || friend.avatarUrl || "",
    growth_count: Number(friend.growth_count ?? friend.growth ?? 0),
    is_dev_test: Boolean(friend.is_dev_test ?? friend.isDevTest ?? false),
  };
}
function friendById(friendId) {
  return state.friends.find((friend) => String(friend.friend_id) === String(friendId)) || null;
}
function availabilityByFriendId(friendId) {
  return state.friendAvailability.get(String(friendId)) || { availability: "offline", has_push: false };
}
function availabilityPresentation(value) {
  const availability = value?.availability || "offline";
  const map = {
    game_ready: { label: "🟢 지금 한 판 가능", className: "is-ready", button: "바로 초대" },
    online: { label: "🌿 오늘의숲 이용 중", className: "is-online", button: "초대 보내기" },
    away: { label: "🌙 잠시 자리 비움", className: "is-away", button: value?.has_push ? "알림으로 초대" : "초대 남기기" },
    offline: { label: "⚪ 오프라인", className: "is-offline", button: value?.has_push ? "알림으로 초대" : "초대 남기기" },
    in_game: { label: "🎮 게임 중", className: "is-game", button: "게임 중" },
  };
  return map[availability] || map.offline;
}
function tierLabel(key) { return TIER_LABELS[key] || "숫자씨앗"; }
function battleModeLabel(mode) { return mode === "rated" ? "원포인트 대전" : "편한 대전"; }
function battleModeIcon(mode) { return mode === "rated" ? "🌰" : "🌿"; }
function battleModeText(mode) { return `${battleModeIcon(mode)} ${battleModeLabel(mode)}`; }
function pointDeltaText(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number}` : String(number);
}
function inviteDisplay(item) {
  const friend = friendById(item?.other_user_id);
  return {
    ...item,
    other_nickname: friend?.nickname || item?.other_nickname || "친구",
    other_avatar_url: friend?.avatar_url || item?.other_avatar_url || "",
  };
}
function getMatchIdFromUrl() { return String(new URL(location.href).searchParams.get("match") || "").trim(); }
function setMatchUrl(matchId = "") {
  const url = new URL(location.href);
  if (matchId) url.searchParams.set("match", matchId); else url.searchParams.delete("match");
  history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}
function displayOperation(value) { return value === "-" ? "−" : value; }
function operationObject(value) { return OPERATIONS.find((item) => item.value === value); }
function currentMatchIsFinished() { return state.match?.status === "finished" || state.match?.phase === "finished"; }
function isWaitingMatch(match = state.match) {
  if (!match || match.status !== "active") return false;
  if (typeof match.isWaiting === "boolean") return match.isWaiting;
  return match.phase === "opening" && match.currentValue === null && !match.currentTurnId && !match.turnDeadline;
}
function isMyTurn() { return Boolean(state.match?.isMyTurn && !currentMatchIsFinished() && !isWaitingMatch()); }
function isTimedPhase() { return Boolean(state.match?.turnDeadline && state.match?.status === "active" && !isWaitingMatch()); }
function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove("is-hidden");
  toastTimer = window.setTimeout(() => els.toast.classList.add("is-hidden"), 2600);
}
function friendlyError(error) {
  const message = String(error?.message || error || "");
  const map = [
    ["LOGIN_REQUIRED", "로그인이 필요해요."], ["OOT_FRIEND_REQUIRED", "현재 친구인 사람에게만 초대할 수 있어요."],
    ["OOT_INVITE_ALREADY_PENDING", "이미 이 친구와 초대가 기다리고 있어요."], ["OOT_MATCH_ALREADY_ACTIVE", "이 친구와 진행 중인 경기가 있어요."],
    ["OOT_INVITE_EXPIRED", "초대 시간이 지나 다시 초대해야 해요."], ["OOT_INVITE_NOT_FOUND", "이 초대는 더 이상 기다리고 있지 않아요."],
    ["OOT_VERSION_MISMATCH", "상대의 행동이 먼저 반영됐어요. 최신 상태를 다시 불러왔어요."], ["OOT_TURN_EXPIRED", "턴 시간이 끝나 서버가 자동 진행하고 있어요."],
    ["OOT_NOT_MY_TURN", "지금은 친구의 차례예요."], ["OOT_INVALID_PHASE", "이미 다음 단계로 넘어갔어요."],
    ["OOT_CARD_NOT_IN_HAND", "그 숫자카드는 현재 손에 없어요."], ["OOT_OPERATION_NOT_AVAILABLE", "이미 사용한 수식카드예요."],
    ["OOT_DAILY_RATED_LIMIT_REACHED", "오늘 이 친구와 반영할 수 있는 원포인트 대전 3판을 모두 했어요."],
    ["OOT_INVALID_BATTLE_MODE", "대전 방식을 다시 선택해 주세요."],
    ["OOT_MATCH_NOT_WAITING", "이미 경기가 시작됐어요."],
    ["OOT_READY_COUNTDOWN_STARTED", "두 사람의 준비가 끝나 카운트다운이 시작됐어요."],
    ["OOT_WAITING_MATCH_CANCEL_LOCKED", "카운트다운이 시작되어 대기방을 취소할 수 없어요."],
    ["OOT_REMATCH_NOT_FINISHED", "경기가 끝난 뒤 다시 한 판을 선택할 수 있어요."],
    ["OOT_REMATCH_EXPIRED", "재대전 선택 시간이 지나 대전 목록으로 돌아가야 해요."],
    ["OOT_CHAT_ROOM_CLOSED", "이 경기방의 채팅 시간이 끝났어요."],
    ["OOT_CHAT_EMPTY", "메시지를 입력해 주세요."],
    ["OOT_CHAT_TOO_LONG", "메시지는 120자까지 보낼 수 있어요."],
    ["OOT_CHAT_TOO_FAST", "조금만 천천히 보내 주세요."],
    ["OOT_CHAT_RATE_LIMIT", "메시지를 너무 빠르게 보냈어요. 잠시 뒤 다시 시도해 주세요."],
  ];
  return map.find(([key]) => message.includes(key))?.[1] || "잠시 연결이 어긋났어요. 다시 시도해 주세요.";
}
function avatarMarkup(url, name) {
  const initial = String(name || "친").trim().slice(0, 1) || "친";
  return url ? `<img src="${escapeHtml(url)}" alt="" />` : `<b>${escapeHtml(initial)}</b>`;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
function formatRemaining(iso) {
  const ms = Date.parse(iso) - (Date.now() + state.serverOffset);
  if (!Number.isFinite(ms)) return "";
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}분 남음`;
  return `${seconds}초 남음`;
}
function phaseLabel(match) {
  if (match.status === "finished") return "경기 종료";
  if (match.status === "active" && !match.current_turn_id && !match.turn_deadline && match.phase === "opening") return "대기방";
  if (match.current_turn_id === state.user?.id) return "내 차례";
  return "친구 차례";
}

async function rpc(name, params = {}) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data;
}

function stopLobbyPolling() { if (state.lobbyInterval) clearInterval(state.lobbyInterval); state.lobbyInterval = null; }
function stopMatchPolling() { if (state.matchInterval) clearInterval(state.matchInterval); state.matchInterval = null; }
function stopTimer() { if (state.timerInterval) clearInterval(state.timerInterval); state.timerInterval = null; }
function stopReadyCountdown() {
  if (state.readyCountdownInterval) clearInterval(state.readyCountdownInterval);
  state.readyCountdownInterval = null;
}
async function stopRealtime() {
  if (state.realtimeChannel) await supabase.removeChannel(state.realtimeChannel);
  state.realtimeChannel = null;
}
async function stopInviteRealtime() {
  if (state.inviteRealtimeChannel) await supabase.removeChannel(state.inviteRealtimeChannel);
  state.inviteRealtimeChannel = null;
}


function normalizeChatMessage(value) {
  if (!value || typeof value !== "object") return null;
  const id = Number(value.id || 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    matchId: String(value.matchId || value.match_id || ""),
    senderId: String(value.senderId || value.sender_id || ""),
    body: String(value.body || "").trim(),
    createdAt: value.createdAt || value.created_at || new Date().toISOString(),
    roundNumber: Math.max(1, Number(value.roundNumber || value.round_number || state.match?.roundNumber || 1)),
  };
}

function setChatUnread(count) {
  state.chatUnread = Math.max(0, Number(count || 0));
  if (!els.chatUnreadBadge) return;
  els.chatUnreadBadge.textContent = state.chatUnread > 99 ? "99+" : String(state.chatUnread);
  els.chatUnreadBadge.classList.toggle("is-hidden", state.chatUnread < 1);
  els.chatUnreadBadge.setAttribute("aria-label", `읽지 않은 메시지 ${state.chatUnread}개`);
}

function updateChatCounter() {
  if (!els.chatInput || !els.chatCounter) return;
  const length = Array.from(els.chatInput.value || "").length;
  els.chatCounter.textContent = `${length}/${state.chatMaxLength}`;
}

function formatChatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function scrollChatToBottom() {
  if (!els.chatMessages) return;
  window.requestAnimationFrame(() => { els.chatMessages.scrollTop = els.chatMessages.scrollHeight; });
}

function renderChatMessages({ scroll = false } = {}) {
  if (!els.chatMessages || !els.chatEmpty) return;
  els.chatMessages.replaceChildren();
  const messages = [...state.chatMessages].sort((a, b) => a.id - b.id);
  els.chatEmpty.classList.toggle("is-hidden", messages.length > 0);
  els.chatMessages.classList.toggle("is-hidden", messages.length < 1);

  let previousRound = null;
  messages.forEach((message) => {
    if (message.roundNumber !== previousRound) {
      const divider = document.createElement("div");
      divider.className = "ootf-chat-round";
      divider.textContent = `${message.roundNumber}번째 판`;
      els.chatMessages.append(divider);
      previousRound = message.roundNumber;
    }

    const item = document.createElement("article");
    item.className = `ootf-chat-message${message.senderId === String(state.user?.id || "") ? " is-mine" : ""}`;
    item.dataset.messageId = String(message.id);
    const bubble = document.createElement("p");
    bubble.textContent = message.body;
    const time = document.createElement("time");
    time.dateTime = String(message.createdAt || "");
    time.textContent = formatChatTime(message.createdAt);
    item.append(bubble, time);
    els.chatMessages.append(item);
  });

  if (scroll) scrollChatToBottom();
}

function setChatAvailability(available, statusText = "") {
  state.chatAvailable = Boolean(available);
  if (!els.chatToggleButton) return;
  els.chatToggleButton.classList.toggle("is-hidden", !state.chatAvailable);
  els.chatToggleButton.disabled = !state.chatAvailable;
  els.chatInput.disabled = !state.chatAvailable || state.chatBusy;
  els.chatSendButton.disabled = !state.chatAvailable || state.chatBusy;
  if (statusText) els.chatStatus.textContent = statusText;
  if (!state.chatAvailable) closeMatchChat();
}

function stopChatPolling() {
  if (state.chatPollInterval) window.clearInterval(state.chatPollInterval);
  state.chatPollInterval = null;
}

function startChatPolling() {
  stopChatPolling();
  state.chatPollInterval = window.setInterval(() => {
    if (state.chatAvailable && state.match?.matchId) loadMatchChat({ silent: true });
  }, 5000);
}

async function stopChatRealtime() {
  if (state.chatChannel) await supabase.removeChannel(state.chatChannel);
  state.chatChannel = null;
}

async function stopMatchChat({ reset = true } = {}) {
  stopChatPolling();
  await stopChatRealtime();
  closeMatchChat();
  setChatAvailability(false);
  if (reset) {
    state.chatSeriesId = "";
    state.chatCurrentMatchId = "";
    state.chatMessages = [];
    state.chatLoaded = false;
    setChatUnread(0);
    renderChatMessages();
  }
}

function appendChatMessage(raw, { countUnread = true, scroll = true } = {}) {
  const message = normalizeChatMessage(raw);
  if (!message || !message.body || state.chatMessages.some((item) => item.id === message.id)) return false;
  state.chatMessages.push(message);
  state.chatMessages.sort((a, b) => a.id - b.id);
  if (state.chatMessages.length > 100) state.chatMessages = state.chatMessages.slice(-100);
  const fromOpponent = message.senderId !== String(state.user?.id || "");
  if (countUnread && fromOpponent && !state.chatOpen) setChatUnread(state.chatUnread + 1);
  renderChatMessages({ scroll: scroll && (state.chatOpen || !fromOpponent) });
  return true;
}

async function loadMatchChat({ silent = false } = {}) {
  const matchId = String(state.match?.matchId || state.chatCurrentMatchId || "");
  if (!matchId || !state.user) return false;
  try {
    const result = await rpc("oot_list_match_chat", { p_match_id: matchId, p_limit: 80 });
    const messages = normalizeRows(result?.messages).map(normalizeChatMessage).filter(Boolean);
    const existingIds = new Set(state.chatMessages.map((item) => item.id));
    const wasLoaded = state.chatLoaded;
    const newOpponentCount = wasLoaded && !state.chatOpen
      ? messages.filter((item) => !existingIds.has(item.id) && item.senderId !== String(state.user.id)).length
      : 0;
    state.chatMessages = messages.sort((a, b) => a.id - b.id);
    state.chatLoaded = true;
    state.chatMaxLength = Math.max(1, Number(result?.maxLength || 120));
    els.chatInput.maxLength = state.chatMaxLength;
    if (newOpponentCount) setChatUnread(state.chatUnread + newOpponentCount);
    setChatAvailability(true, state.chatChannel ? "실시간으로 연결되어 있어요." : "채팅 내용을 불러왔어요.");
    renderChatMessages({ scroll: state.chatOpen });
    updateChatCounter();
    return true;
  } catch (error) {
    const message = String(error?.message || error || "");
    if (message.includes("OOT_CHAT_ROOM_CLOSED") || message.includes("OOT_MATCH_NOT_FOUND")) {
      setChatAvailability(false, "이 경기방의 채팅 시간이 끝났어요.");
    } else if (!silent) {
      showToast(friendlyError(error));
      els.chatStatus.textContent = "채팅 연결을 다시 확인하고 있어요.";
    }
    return false;
  }
}

async function subscribeMatchChat(seriesId) {
  await stopChatRealtime();
  if (!seriesId || !state.user) return;
  state.chatChannel = supabase.channel(`oot-match-chat-${seriesId}-${state.user.id}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "oot_match_chat_messages",
      filter: `series_id=eq.${seriesId}`,
    }, (payload) => appendChatMessage(payload.new, { countUnread: true, scroll: true }))
    .subscribe((status) => {
      if (!els.chatStatus) return;
      els.chatStatus.textContent = status === "SUBSCRIBED"
        ? "실시간으로 연결되어 있어요."
        : "실시간 연결을 확인하고 있어요.";
    });
}

async function prepareMatchChat(match) {
  if (!match?.matchId || !state.user) return;
  const seriesId = String(match.seriesId || match.matchId);
  state.chatCurrentMatchId = String(match.matchId);
  if (els.chatOpponentName) els.chatOpponentName.textContent = match.opponentNickname || "친구";
  if (state.chatSeriesId === seriesId) {
    setChatAvailability(true);
    return;
  }

  await stopMatchChat({ reset: true });
  state.chatSeriesId = seriesId;
  state.chatCurrentMatchId = String(match.matchId);
  setChatAvailability(true, "채팅방을 연결하고 있어요.");
  await subscribeMatchChat(seriesId);
  await loadMatchChat({ silent: true });
  startChatPolling();
}

async function openMatchChat() {
  if (!state.chatAvailable) return;
  state.chatOpen = true;
  els.chatPanel.classList.remove("is-hidden");
  els.chatBackdrop.classList.remove("is-hidden");
  els.chatPanel.setAttribute("aria-hidden", "false");
  els.chatBackdrop.setAttribute("aria-hidden", "false");
  els.chatToggleButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("ootf-chat-open");
  setChatUnread(0);
  if (!state.chatLoaded) await loadMatchChat();
  renderChatMessages({ scroll: true });
  trackOneOfTenOnce("oneoften_chat_open", `chat-open-${state.chatSeriesId}-${state.match?.matchId || ""}`, {
    mode: analyticsBattleMode(state.match?.battleMode),
    round_number: Number(state.match?.roundNumber || 1),
  });
  window.setTimeout(() => els.chatInput?.focus(), 80);
}

function closeMatchChat() {
  state.chatOpen = false;
  els.chatPanel?.classList.add("is-hidden");
  els.chatBackdrop?.classList.add("is-hidden");
  els.chatPanel?.setAttribute("aria-hidden", "true");
  els.chatBackdrop?.setAttribute("aria-hidden", "true");
  els.chatToggleButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("ootf-chat-open");
}

async function sendMatchChat(event) {
  event?.preventDefault();
  const body = String(els.chatInput?.value || "").trim();
  if (!body || !state.chatAvailable || state.chatBusy || !state.match?.matchId) return;
  state.chatBusy = true;
  els.chatInput.disabled = true;
  els.chatSendButton.disabled = true;
  els.chatSendButton.textContent = "전송 중";
  try {
    const message = await rpc("oot_send_match_chat", { p_match_id: state.match.matchId, p_body: body });
    appendChatMessage(message, { countUnread: false, scroll: true });
    els.chatInput.value = "";
    updateChatCounter();
    trackOneOfTen("oneoften_chat_message_sent", {
      mode: analyticsBattleMode(state.match.battleMode),
      round_number: Number(state.match.roundNumber || 1),
      message_length: Array.from(body).length,
    });
  } catch (error) {
    showToast(friendlyError(error));
    if (String(error?.message || "").includes("OOT_CHAT_ROOM_CLOSED")) {
      setChatAvailability(false, "이 경기방의 채팅 시간이 끝났어요.");
    }
  } finally {
    state.chatBusy = false;
    els.chatInput.disabled = !state.chatAvailable;
    els.chatSendButton.disabled = !state.chatAvailable;
    els.chatSendButton.textContent = "보내기";
    if (state.chatAvailable) els.chatInput.focus();
  }
}
function clearActionTimer() { if (actionTimer) clearTimeout(actionTimer); actionTimer = null; }

function showView(name) {
  els.loadingView.classList.toggle("is-hidden", name !== "loading");
  els.loginView.classList.toggle("is-hidden", name !== "login");
  els.lobbyView.classList.toggle("is-hidden", name !== "lobby");
  els.matchView.classList.toggle("is-hidden", name !== "match");
  document.body.classList.toggle("ootf-in-match", name === "match");
}

async function loadLobby({ silent = false } = {}) {
  if (lobbyLoading || !state.user || getMatchIdFromUrl()) return;

  lobbyLoading = true;
  const previousOutgoingOpponentIds = new Set(
    state.invites
      .filter((item) => item.direction === "outgoing")
      .map((item) => String(item.other_user_id || ""))
      .filter(Boolean)
  );
  state.lobbyWarnings = [];
  if (!silent) els.refreshLobbyButton.disabled = true;

  try {
    const [friendsResult, invitesResult, matchesResult, availabilityResult, profileResult] = await Promise.allSettled([
      rpc("list_my_garden_friends"),
      rpc("oot_list_my_invites_v2"),
      rpc("oot_list_my_matches_v2", { p_limit: 30 }),
      rpc("oot_list_friend_availability"),
      rpc("oot_get_my_point_profile"),
    ]);

    if (friendsResult.status === "fulfilled") {
      state.friends = normalizeRows(friendsResult.value)
        .map(normalizeFriendRow)
        .filter(Boolean)
        .filter((friend) => !friend.is_dev_test);
      state.friendsLoadFailed = false;
    } else {
      state.friends = [];
      state.friendsLoadFailed = true;
      state.lobbyWarnings.push("friends");
      console.warn("OneOfTen friend list load error", friendsResult.reason);
    }

    if (invitesResult.status === "fulfilled") {
      const nextInvites = normalizeRows(invitesResult.value)
        .map(inviteDisplay)
        .filter((item) => !state.processingInviteIds.has(String(item.invite_id)));
      const incomingIds = nextInvites
        .filter((item) => item.direction === "incoming")
        .map((item) => String(item.invite_id));

      const hasNewIncoming = incomingIds.some(
        (id) => !state.knownIncomingInviteIds.has(id)
      );

      state.invites = nextInvites;
      state.invitesLoadFailed = false;
      state.knownIncomingInviteIds = new Set(incomingIds);

      const incomingInvites = nextInvites.filter((item) => item.direction === "incoming");
      if (incomingInvites.length) {
        Promise.allSettled(incomingInvites.map((item) => acknowledgeInviteOnce(item.invite_id)))
          .catch(() => {});
      }

      if (silent && hasNewIncoming) {
        showToast("친구에게서 원오브텐 초대가 도착했어요.");
      }
    } else {
      state.invites = [];
      state.invitesLoadFailed = true;
      state.lobbyWarnings.push("invites");
      console.warn("OneOfTen invite list load error", invitesResult.reason);
    }

    if (matchesResult.status === "fulfilled") {
      state.matches = normalizeRows(matchesResult.value);
    } else {
      state.matches = [];
      state.lobbyWarnings.push("matches");
      console.warn("OneOfTen match list load error", matchesResult.reason);
    }

    if (availabilityResult.status === "fulfilled") {
      state.friendAvailability = new Map(
        normalizeRows(availabilityResult.value).map((row) => [String(row.friend_id), row])
      );
    } else {
      state.friendAvailability = new Map();
      state.lobbyWarnings.push("availability");
      console.warn("OneOfTen friend availability load error", availabilityResult.reason);
    }

    if (profileResult.status === "fulfilled") {
      state.pointProfile = profileResult.value || null;
    } else {
      state.pointProfile = null;
      state.lobbyWarnings.push("pointProfile");
      console.warn("OneOfTen point profile load error", profileResult.reason);
    }

    renderLobby();

    const acceptedMatch = state.matches.find((match) => (
      match?.status === "active"
      && previousOutgoingOpponentIds.has(matchOpponentId(match))
      && !state.invites.some((invite) => (
        invite.direction === "outgoing"
        && String(invite.other_user_id || "") === matchOpponentId(match)
      ))
    ));

    if (!state.lobbyWarnings.length) {
      els.connectionStatus.textContent = "서버와 연결됨";
    } else if (!state.friendsLoadFailed) {
      els.connectionStatus.textContent = "친구 목록 연결됨 · 일부 경기 정보 확인 중";
      if (!silent) showToast("친구 목록은 불러왔어요. 일부 정보는 다시 확인 중이에요.");
    } else {
      els.connectionStatus.textContent = "친구 목록을 불러오지 못함";
      if (!silent) showToast("친구 목록 연결이 어긋났어요. 새로고침을 눌러 주세요.");
    }

    const acceptedMatchId = extractMatchId(acceptedMatch?.match_id || acceptedMatch?.matchId);
    if (acceptedMatchId && !state.autoOpeningMatchId && !getMatchIdFromUrl()) {
      state.autoOpeningMatchId = acceptedMatchId;
      showToast("친구가 초대를 수락했어요. 경기에 들어갈게요.");
      await openMatch(acceptedMatchId);
    }
  } catch (error) {
    console.warn("OneOfTen lobby render error", error);
    state.friendsLoadFailed = true;
    state.friends = [];
    state.invites = [];
    state.matches = [];
    state.pointProfile = null;
    renderLobby();
    els.connectionStatus.textContent = "로비 연결 확인 필요";
    if (!silent) showToast(friendlyError(error));
  } finally {
    lobbyLoading = false;
    els.refreshLobbyButton.disabled = false;
  }
}

function cardTemplate({ avatarUrl, name, subtitle, actions = "", attributes = "" }) {
  return `<article class="ootf-list-card" ${attributes}><span class="ootf-list-avatar">${avatarMarkup(avatarUrl, name)}</span><div class="ootf-list-copy"><strong>${escapeHtml(name || "친구")}</strong><span>${escapeHtml(subtitle || "")}</span></div>${actions}</article>`;
}
function renderPointSummary() {
  const profile = state.pointProfile;
  if (!profile) {
    els.pointValue.textContent = "-";
    els.pointTier.textContent = "원포인트 연결 확인 중";
    els.pointProgressText.textContent = "새로고침하면 다시 확인해요.";
    els.pointProgressBar.style.width = "0%";
    els.pointProtection.textContent = "";
    return;
  }

  const point = Number(profile.one_point || 0);
  const tierKey = profile.tier_key || "number_seed";
  const tierStart = TIER_START_POINTS[tierKey] ?? 0;
  const nextPoint = profile.next_tier_point === null ? null : Number(profile.next_tier_point);
  const protection = Number(profile.beginner_protection_remaining || 0);

  els.pointValue.textContent = String(point);
  els.pointTier.textContent = tierLabel(tierKey);

  if (nextPoint === null || !Number.isFinite(nextPoint)) {
    els.pointProgressText.textContent = "최고 등급에 도착했어요.";
    els.pointProgressBar.style.width = "100%";
  } else {
    const span = Math.max(nextPoint - tierStart, 1);
    const progress = Math.max(0, Math.min(100, ((point - tierStart) / span) * 100));
    els.pointProgressText.textContent = `${tierLabel(profile.next_tier_key)}까지 ${Number(profile.points_to_next_tier || 0)}점`;
    els.pointProgressBar.style.width = `${progress}%`;
  }

  els.pointProtection.textContent = protection > 0
    ? `🛡️ 첫걸음 보호 ${protection}판 남음`
    : `최고 기록 ${Number(profile.peak_one_point || 0)}점`;
}
function renderLobby() {
  renderPointSummary();

  const incoming = state.invites.filter((item) => item.direction === "incoming");
  const outgoing = state.invites.filter((item) => item.direction === "outgoing");
  const active = state.matches.filter((item) => item.status === "active");
  const activeByOpponent = new Map(active.map((item) => [matchOpponentId(item), item]));
  const inviteByOpponent = new Map(state.invites.map((item) => [String(item.other_user_id), item]));

  els.activeMatchesSection.classList.toggle("is-hidden", !active.length);
  els.activeMatchCount.textContent = String(active.length);
  els.activeMatchesList.innerHTML = active.map((item) => cardTemplate({
    avatarUrl: item.opponent_avatar_url, name: item.opponent_nickname,
    subtitle: `${battleModeText(item.battle_mode)} · ${phaseLabel(item)} · ${item.turn_deadline ? formatRemaining(item.turn_deadline) : "결과 확인 중"}`,
    actions: `<button class="ootf-primary" data-open-match="${item.match_id}">계속하기</button>`,
  })).join("");

  els.incomingSection.classList.toggle(
    "is-hidden",
    !incoming.length && !state.invitesLoadFailed
  );
  els.incomingCount.textContent = state.invitesLoadFailed ? "!" : String(incoming.length);
  els.incomingList.innerHTML = state.invitesLoadFailed
    ? `<article class="ootf-list-card"><span class="ootf-list-avatar"><b>!</b></span><div class="ootf-list-copy"><strong>초대 목록 연결을 다시 확인해 주세요.</strong><span>새로고침 버튼을 누르면 받은 초대를 다시 불러와요.</span></div><button class="ootf-secondary" data-retry-invites>다시 확인</button></article>`
    : incoming.map((item) => cardTemplate({
      avatarUrl: item.other_avatar_url, name: item.other_nickname,
      subtitle: `${battleModeText(item.battle_mode)} · ${formatRemaining(item.expires_at)}`,
      actions: `<div class="ootf-list-actions"><button class="ootf-primary" data-accept-invite="${item.invite_id}" data-battle-mode="${item.battle_mode || "casual"}">수락</button><button class="ootf-secondary" data-decline-invite="${item.invite_id}">거절</button></div>`,
      attributes: `data-invite-card="${escapeHtml(item.invite_id)}"`,
    })).join("");

  els.outgoingSection.classList.toggle("is-hidden", !outgoing.length);
  els.outgoingCount.textContent = String(outgoing.length);
  els.outgoingList.innerHTML = outgoing.map((item) => cardTemplate({
    avatarUrl: item.other_avatar_url, name: item.other_nickname,
    subtitle: `${battleModeText(item.battle_mode)} · 친구의 수락을 기다리는 중 · ${formatRemaining(item.expires_at)}`,
    actions: `<button class="ootf-secondary" data-cancel-invite="${item.invite_id}">취소</button>`,
  })).join("");

  const hasFriends = state.friends.length > 0;
  els.noFriendsView.classList.toggle("is-hidden", hasFriends);
  els.friendsList.classList.toggle("is-hidden", !hasFriends);

  if (!hasFriends) {
    els.noFriendsView.innerHTML = state.friendsLoadFailed
      ? `<span>🌿</span><strong>친구 목록 연결을 다시 확인하고 있어요.</strong><p>위의 새로고침 버튼을 한 번 눌러 주세요. 내 정원의 친구 관계는 그대로 보존돼요.</p>`
      : `<span>🌱</span><strong>아직 초대할 친구가 없어요.</strong><p>내 정원에서 친구를 맺으면 이곳에서 원오브텐을 함께할 수 있어요.</p>`;
  }

  els.friendsList.innerHTML = state.friends.map((friend) => {
    const friendKey = String(friend.friend_id);
    const activeMatch = activeByOpponent.get(friendKey);
    const invite = inviteByOpponent.get(friendKey);
    const availability = availabilityByFriendId(friend.friend_id);
    const presentation = availabilityPresentation(availability);
    let subtitle = `<span class="oot-availability ${presentation.className}">${presentation.label}</span> · 마음 ${Number(friend.growth_count || 0)}번`;
    let action = `<button class="ootf-primary" data-create-invite="${friend.friend_id}" ${availability.availability === "in_game" ? "disabled" : ""}>${presentation.button}</button>`;

    if (activeMatch) {
      subtitle = `${battleModeText(activeMatch.battle_mode)} · 진행 중인 경기가 있어요.`;
      action = `<button class="ootf-primary" data-open-match="${activeMatch.match_id}">경기 계속</button>`;
    } else if (invite?.direction === "incoming") {
      subtitle = `${battleModeText(invite.battle_mode)} · 이 친구가 한 판을 기다려요 · ${formatRemaining(invite.expires_at)}`;
      action = `<div class="ootf-list-actions"><button class="ootf-primary" data-accept-invite="${invite.invite_id}" data-battle-mode="${invite.battle_mode || "casual"}">수락</button><button class="ootf-secondary" data-decline-invite="${invite.invite_id}">거절</button></div>`;
    } else if (invite) {
      subtitle = `${battleModeText(invite.battle_mode)} · 친구의 수락을 기다리는 중`;
      action = `<button class="ootf-secondary" disabled>보낸 초대 대기</button>`;
    }

    return `<article class="ootf-list-card"><span class="ootf-list-avatar">${avatarMarkup(friend.avatar_url, friend.nickname)}</span><div class="ootf-list-copy"><strong>${escapeHtml(friend.nickname || "친구")}</strong><span>${subtitle}</span></div>${action}</article>`;
  }).join("");

  bindLobbyActions();
  focusRequestedInvite();
}

function focusRequestedInvite() {
  let requestedId = getInviteIdFromUrl();
  try {
    requestedId ||= String(sessionStorage.getItem(INVITE_TARGET_STORAGE_KEY) || "").trim();
  } catch {
    // 세션 저장소를 사용할 수 없는 환경은 URL만 사용합니다.
  }
  if (!requestedId) return;

  const invite = state.invites.find((item) => (
    item.direction === "incoming" && String(item.invite_id) === requestedId
  ));

  if (!invite) {
    const activeMatch = state.matches.find((match) => match?.status === "active");
    if (activeMatch) clearInviteTracking(requestedId);
    return;
  }

  const card = [...document.querySelectorAll("[data-invite-card]")]
    .find((element) => element.dataset.inviteCard === requestedId);
  if (card && card.dataset.focused !== "true") {
    card.dataset.focused = "true";
    card.classList.add("is-invite-focus");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => card.classList.remove("is-invite-focus"), 2400);
    showToast(`${invite.other_nickname || "친구"}님의 초대예요. 수락하면 대기방으로 이동해요.`);
  }
}

function bindLobbyActions() {
  $$('[data-create-invite]').forEach((button) => button.addEventListener("click", () => openInviteMode(button.dataset.createInvite, button)));
  $$('[data-accept-invite]').forEach((button) => button.addEventListener("click", () => acceptInvite(button.dataset.acceptInvite, button, button.dataset.battleMode)));
  $$('[data-decline-invite]').forEach((button) => button.addEventListener("click", () => simpleInviteAction("oot_decline_invite", button.dataset.declineInvite, "초대를 조용히 내려놓았어요.", button)));
  $$('[data-cancel-invite]').forEach((button) => button.addEventListener("click", () => simpleInviteAction("oot_cancel_invite", button.dataset.cancelInvite, "초대를 취소했어요.", button)));
  $$('[data-open-match]').forEach((button) => button.addEventListener("click", () => openMatch(button.dataset.openMatch)));
  $$('[data-retry-invites]').forEach((button) => button.addEventListener("click", () => loadLobby()));
}
async function openInviteMode(friendId, sourceButton) {
  const friend = friendById(friendId);
  if (!friend) return;

  state.inviteTargetFriendId = friendId;
  state.inviteTargetButton = sourceButton || null;
  state.ratedStatus = null;

  els.inviteFriendName.textContent = friend.nickname || "친구";
  els.inviteFriendAvatar.innerHTML = avatarMarkup(friend.avatar_url, friend.nickname);
  const availability = availabilityByFriendId(friendId);
  els.inviteFriendStatus.textContent = availabilityPresentation(availability).label.replace(/^[^ ]+ /, "");
  els.ratedInviteStatus.textContent = "오늘 남은 횟수를 확인하고 있어요.";
  els.ratedInviteButton.disabled = true;
  els.casualInviteButton.disabled = false;
  els.inviteModeOverlay.classList.remove("is-hidden");

  try {
    const status = await rpc("oot_get_friend_rated_status", { p_friend_id: friendId });
    if (String(state.inviteTargetFriendId) !== String(friendId)) return;
    state.ratedStatus = status;
    const used = Number(status?.usedToday || 0);
    const remaining = Number(status?.remainingToday || 0);
    els.ratedInviteStatus.textContent = status?.canStartRated
      ? `오늘 ${used}/3판 반영 · ${remaining}판 남음`
      : "오늘 3판을 모두 반영했어요.";
    els.ratedInviteButton.disabled = !status?.canStartRated;
  } catch (error) {
    console.warn("OneOfTen rated status load error", error);
    els.ratedInviteStatus.textContent = "점수전 상태를 불러오지 못했어요.";
    els.ratedInviteButton.disabled = true;
  }
}
function closeInviteMode() {
  els.inviteModeOverlay.classList.add("is-hidden");
  if (state.inviteTargetButton) state.inviteTargetButton.disabled = false;
  state.inviteTargetFriendId = null;
  state.inviteTargetButton = null;
  state.ratedStatus = null;
}
async function createInvite(mode) {
  const friendId = state.inviteTargetFriendId;
  if (!friendId || !["casual", "rated"].includes(mode)) return;

  trackOneOfTen("oneoften_mode_selected", { mode: analyticsBattleMode(mode) });
  els.casualInviteButton.disabled = true;
  els.ratedInviteButton.disabled = true;
  if (state.inviteTargetButton) state.inviteTargetButton.disabled = true;

  try {
    await rpc("oot_create_invite_with_mode", {
      p_friend_id: friendId,
      p_battle_mode: mode,
    });
    const availability = availabilityByFriendId(friendId);
    const deliveryMessage = availability.has_push && ["away", "offline"].includes(availability.availability)
      ? "휴대폰 알림도 함께 준비했어요."
      : "친구 화면에 바로 표시돼요.";
    closeInviteMode();
    trackOneOfTen("oneoften_friend_invite_sent", {
      mode: analyticsBattleMode(mode),
      delivery: availability.has_push && ["away", "offline"].includes(availability.availability) ? "push" : "in_app",
      friend_availability: availability.availability || "unknown",
    });
    showToast(`${battleModeLabel(mode)} 초대를 보냈어요. ${deliveryMessage}`);
    await loadLobby({ silent: true });
  } catch (error) {
    showToast(friendlyError(error));
    els.casualInviteButton.disabled = false;
    els.ratedInviteButton.disabled = mode === "rated" && !state.ratedStatus?.canStartRated;
    if (state.inviteTargetButton) state.inviteTargetButton.disabled = false;
    await loadLobby({ silent: true });
  }
}
async function findActiveMatchWithRetry(opponentId, attempts = 4) {
  for (let index = 0; index < attempts; index += 1) {
    const matches = await rpc("oot_list_my_matches_v2", { p_limit: 30 });
    const activeMatch = activeMatchForOpponent(matches, opponentId);
    if (activeMatch) return activeMatch;
    if (index < attempts - 1) await new Promise((resolve) => window.setTimeout(resolve, 350));
  }
  return null;
}

async function acceptInvite(inviteId, button, battleMode = "casual") {
  const normalizedInviteId = String(inviteId || "").trim();
  if (!normalizedInviteId || state.processingInviteIds.has(normalizedInviteId)) return;

  const invite = state.invites.find((item) => String(item.invite_id) === normalizedInviteId);
  const opponentId = invite?.other_user_id || "";
  state.processingInviteIds.add(normalizedInviteId);
  button.disabled = true;

  // 실시간 반영이 늦어도 같은 초대 버튼과 알림이 다시 나타나지 않게 먼저 화면에서 제거합니다.
  state.invites = state.invites.filter((item) => String(item.invite_id) !== normalizedInviteId);
  renderLobby();
  clearInviteTracking(normalizedInviteId);
  void closeInviteNotification(normalizedInviteId);

  try {
    const response = await rpc("oot_accept_invite", { p_invite_id: normalizedInviteId });
    let matchId = extractMatchId(response);

    if (!matchId) {
      const activeMatch = await findActiveMatchWithRetry(opponentId);
      matchId = extractMatchId(activeMatch);
      battleMode = activeMatch?.battle_mode || battleMode;
    }

    if (!matchId) throw new Error("OOT_MATCH_START_FAILED");
    showToast(`${battleModeLabel(battleMode)}이 시작됐어요.`);
    const opened = await openMatch(matchId);
    if (!opened) throw new Error("OOT_MATCH_START_FAILED");
    trackOneOfTenOnce("oneoften_friend_invite_accepted", `invite-${normalizedInviteId}`, {
      mode: analyticsBattleMode(battleMode),
    });
  } catch (error) {
    console.warn("OneOfTen accept invite error", error);

    try {
      const activeMatch = await findActiveMatchWithRetry(opponentId, 2);
      const activeMatchId = extractMatchId(activeMatch);
      if (activeMatchId && await openMatch(activeMatchId)) {
        const recoveredMode = activeMatch?.battle_mode || battleMode;
        trackOneOfTenOnce("oneoften_friend_invite_accepted", `invite-${normalizedInviteId}`, {
          mode: analyticsBattleMode(recoveredMode),
          recovered: true,
        });
        showToast(`${battleModeLabel(recoveredMode)}이 시작됐어요.`);
        return;
      }
    } catch (recoveryError) {
      console.warn("OneOfTen accept recovery error", recoveryError);
    }

    state.processingInviteIds.delete(normalizedInviteId);
    showToast(friendlyError(error));
    await loadLobby({ silent: true });
  }
}

async function simpleInviteAction(rpcName, inviteId, message, button) {
  const normalizedInviteId = String(inviteId || "").trim();
  if (!normalizedInviteId || state.processingInviteIds.has(normalizedInviteId)) return;

  state.processingInviteIds.add(normalizedInviteId);
  button.disabled = true;
  state.invites = state.invites.filter((item) => String(item.invite_id) !== normalizedInviteId);
  renderLobby();
  clearInviteTracking(normalizedInviteId);
  void closeInviteNotification(normalizedInviteId);

  try {
    await rpc(rpcName, { p_invite_id: normalizedInviteId });
    showToast(message);
    state.processingInviteIds.delete(normalizedInviteId);
    await loadLobby({ silent: true });
  } catch (error) {
    state.processingInviteIds.delete(normalizedInviteId);
    showToast(friendlyError(error));
    await loadLobby({ silent: true });
  }
}

async function openMatch(matchId) {
  const normalizedMatchId = extractMatchId(matchId);
  if (!normalizedMatchId) return false;
  stopLobbyPolling();
  await stopInviteRealtime();
  setMatchUrl(normalizedMatchId);
  state.selectedOperation = null; state.selectedNumber = null; state.historyExpanded = false; state.renderResultForMatchId = null;
  state.readyStartRequested = false; state.readyActionBusy = false; state.rematchBusy = false; stopReadyCountdown();
  els.resultOverlay.classList.add("is-hidden");
  showView("match");
  const loaded = await loadMatch({ force: true });
  if (!loaded || !state.match || extractMatchId(state.match.matchId) !== normalizedMatchId || getMatchIdFromUrl() !== normalizedMatchId) {
    state.autoOpeningMatchId = null;
    return false;
  }
  startMatchPolling();
  subscribeMatch(normalizedMatchId);
  state.autoOpeningMatchId = null;
  state.rematchNavigating = false;
  return true;
}
async function returnToLobby() {
  clearActionTimer(); stopTimer(); stopReadyCountdown(); stopMatchPolling(); await stopRealtime(); await stopMatchChat();
  state.match = null; state.selectedOperation = null; state.selectedNumber = null; state.renderResultForMatchId = null;
  state.readyStartRequested = false; state.readyActionBusy = false; state.rematchBusy = false; state.rematchNavigating = false;
  els.matchReadyOverlay.classList.add("is-hidden");
  state.autoOpeningMatchId = null;
  els.resultOverlay.classList.add("is-hidden");
  setMatchUrl(""); showView("lobby");
  trackOneOfTen("oneoften_lobby_open", { lobby_type: "friend", return_from_match: true });
  await loadLobby(); startLobbyPolling(); subscribeInvites();
}

async function loadMatch({ force = false } = {}) {
  const matchId = getMatchIdFromUrl();
  if (!matchId || matchLoading || !state.user) return false;
  matchLoading = true;
  try {
    const previousVersion = state.match?.version;
    const view = await rpc("oot_get_match_view", { p_match_id: matchId });
    const versionChanged = previousVersion === undefined || previousVersion !== view.version;
    state.match = view;
    if (view.serverNow) state.serverOffset = Date.parse(view.serverNow) - Date.now();
    void prepareMatchChat(view);
    if (view.status === "cancelled") {
      showToast(view.finishReason === "waiting_cancelled" ? "상대가 대기방을 나갔어요." : "경기가 취소됐어요.");
      await returnToLobby();
      return false;
    }
    if (versionChanged || !["must_play", "opening"].includes(view.phase) || !view.isMyTurn) {
      state.selectedOperation = null;
      state.selectedNumber = null;
      state.busy = false;
    }
    renderMatch();
    els.connectionStatus.textContent = "서버와 실시간 연결됨";
    if (view.nextMatchId) {
      window.setTimeout(() => enterRematchMatch(view), 0);
    }
    return true;
  } catch (error) {
    console.warn("OneOfTen match load error", error);
    showToast(friendlyError(error));
    if (String(error?.message || "").includes("OOT_MATCH_NOT_FOUND")) await returnToLobby();
    return false;
  } finally { matchLoading = false; }
}
function startLobbyPolling() { stopLobbyPolling(); state.lobbyInterval = setInterval(() => loadLobby({ silent: true }), LOBBY_POLL_MS); }
function startMatchPolling() { stopMatchPolling(); state.matchInterval = setInterval(() => loadMatch(), MATCH_POLL_MS); }
async function subscribeInvites() {
  await stopInviteRealtime();
  if (!state.user) return;
  state.inviteRealtimeChannel = supabase.channel(`oot-invites-${state.user.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "oot_invites" }, () => loadLobby({ silent: true }))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "oot_matches" }, () => loadLobby({ silent: true }))
    .subscribe();
}
function subscribeMatch(matchId) {
  stopRealtime();
  state.realtimeChannel = supabase.channel(`oot-friend-${matchId}-${state.user.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "oot_matches", filter: `id=eq.${matchId}` }, () => loadMatch({ force: true }))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "oot_match_actions", filter: `match_id=eq.${matchId}` }, () => loadMatch({ force: true }))
    .subscribe((status) => { els.connectionStatus.textContent = status === "SUBSCRIBED" ? "서버와 실시간 연결됨" : "연결 확인 중"; });
}

function getActions() { return Array.isArray(state.match?.actions) ? state.match.actions.filter((item) => item.type !== "finish") : []; }
function actionIsOpening(action) { return ["opening", "timeout_auto_opening"].includes(action.type); }
function actionIsCalculation(action) { return ["calculation", "timeout_auto_calculation"].includes(action.type); }
function actionLabel(action) {
  const mine = action.actorId === state.user.id;
  const owner = mine ? "나" : state.match.opponentNickname;
  if (actionIsOpening(action)) return `${owner} · 첫 카드 ${action.numberCard}`;
  if (actionIsCalculation(action)) return `${owner} · ${action.beforeValue} ${displayOperation(action.operation)} ${action.numberCard} = ${action.afterValue}`;
  if (action.type === "draw") return `${owner} · 카드 한 장 받음`;
  if (["stop", "timeout_auto_stop"].includes(action.type)) return `${owner} · 스톱${action.isTimeout ? " (시간 종료)" : ""}`;
  return "";
}
function playedCardCount() { return getActions().filter((action) => actionIsOpening(action) || actionIsCalculation(action)).length; }
function inferredDeckCount() {
  if (!state.match) return 0;
  return Math.max(0, 10 - Number(state.match.myHand?.length || 0) - Number(state.match.opponentCardCount || 0) - playedCardCount());
}

function readyCountdownRemaining(match) {
  if (!match?.playStartsAt) return null;
  const remaining = Date.parse(match.playStartsAt) - (Date.now() + state.serverOffset);
  return Number.isFinite(remaining) ? Math.max(0, remaining) : null;
}

async function requestMatchStart() {
  const match = state.match;
  if (!match?.matchId || state.readyStartRequested || !isWaitingMatch(match)) return;
  state.readyStartRequested = true;
  try {
    const view = await rpc("oot_start_match_if_due", { p_match_id: match.matchId });
    state.match = view;
    if (view.serverNow) state.serverOffset = Date.parse(view.serverNow) - Date.now();
    void prepareMatchChat(view);
    // 서버 시각상 아직 3초가 지나지 않았다면 다음 틱에서 다시 시도합니다.
    state.readyStartRequested = !isWaitingMatch(view);
    renderMatch();
  } catch (error) {
    console.warn("OneOfTen waiting start error", error);
    state.readyStartRequested = false;
    showToast(friendlyError(error));
    await loadMatch({ force: true });
  }
}

function renderReadyRoom(match) {
  const waiting = isWaitingMatch(match);
  if (!waiting) {
    stopReadyCountdown();
    state.readyStartRequested = false;
    els.matchReadyOverlay.classList.add("is-hidden");
    return;
  }

  els.matchReadyOverlay.classList.remove("is-hidden");
  els.readyOpponentAvatar.innerHTML = avatarMarkup(match.opponentAvatarUrl, match.opponentNickname);
  els.readyOpponentName.textContent = match.opponentNickname || "친구";
  els.readyOpponentLabel.textContent = match.opponentNickname || "친구";
  els.readyMatchMode.textContent = battleModeText(match.battleMode);
  els.readyMatchMode.classList.toggle("is-rated", match.battleMode === "rated");

  const myReady = Boolean(match.myReady);
  const opponentReady = Boolean(match.opponentReady);
  els.readyMeCard.classList.toggle("is-ready", myReady);
  els.readyOpponentCard.classList.toggle("is-ready", opponentReady);
  els.readyMeStatus.textContent = myReady ? "준비 완료" : "준비 중";
  els.readyOpponentStatus.textContent = opponentReady ? "준비 완료" : "준비 중";

  const countdownActive = Boolean(match.playStartsAt);
  els.readyCountdown.classList.toggle("is-hidden", !countdownActive);
  els.cancelWaitingMatchButton.disabled = state.readyActionBusy || countdownActive;

  if (!countdownActive) {
    stopReadyCountdown();
    state.readyStartRequested = false;
    els.matchReadyButton.disabled = state.readyActionBusy;
    els.matchReadyButton.textContent = myReady ? "준비 취소" : "준비 완료";
    els.matchReadyButton.classList.toggle("is-cancel", myReady);
    els.readyRoomMessage.textContent = myReady
      ? (opponentReady ? "두 사람의 준비가 끝났어요." : `${match.opponentNickname || "친구"}님의 준비를 기다리고 있어요.`)
      : (opponentReady ? `${match.opponentNickname || "친구"}님이 먼저 준비했어요.` : "준비되면 아래 버튼을 눌러 주세요.");
    return;
  }

  els.matchReadyButton.disabled = true;
  els.matchReadyButton.classList.remove("is-cancel");
  els.matchReadyButton.textContent = "경기 시작 준비 중";
  els.readyRoomMessage.textContent = "두 사람 모두 준비했어요. 곧 경기가 시작됩니다.";

  const updateCountdown = () => {
    const current = state.match;
    if (!isWaitingMatch(current) || !current?.playStartsAt) {
      stopReadyCountdown();
      return;
    }
    const remaining = readyCountdownRemaining(current);
    if (remaining === null) return;
    els.readyCountdown.textContent = remaining > 0 ? String(Math.max(1, Math.ceil(remaining / 1000))) : "시작!";
    if (remaining <= 0) void requestMatchStart();
  };
  updateCountdown();
  if (!state.readyCountdownInterval) state.readyCountdownInterval = setInterval(updateCountdown, 100);
}

async function toggleMatchReady() {
  const match = state.match;
  if (!isWaitingMatch(match) || state.readyActionBusy || match.playStartsAt) return;
  state.readyActionBusy = true;
  renderReadyRoom(match);
  try {
    const view = await rpc("oot_set_match_ready", {
      p_match_id: match.matchId,
      p_ready: !Boolean(match.myReady),
    });
    state.match = view;
    if (view.serverNow) state.serverOffset = Date.parse(view.serverNow) - Date.now();
    void prepareMatchChat(view);
    state.readyActionBusy = false;
    renderMatch();
  } catch (error) {
    state.readyActionBusy = false;
    showToast(friendlyError(error));
    await loadMatch({ force: true });
  }
}

async function cancelWaitingMatch() {
  const match = state.match;
  if (!isWaitingMatch(match) || state.readyActionBusy || match.playStartsAt) return;
  state.readyActionBusy = true;
  renderReadyRoom(match);
  try {
    await rpc("oot_cancel_waiting_match", { p_match_id: match.matchId });
    trackOneOfTen("oneoften_game_exit", {
      mode: analyticsBattleMode(match.battleMode),
      exit_reason: "waiting_cancel",
      game_state: "waiting",
    });
    showToast("대기방을 나왔어요.");
    await returnToLobby();
  } catch (error) {
    state.readyActionBusy = false;
    showToast(friendlyError(error));
    await loadMatch({ force: true });
  }
}

async function leaveCurrentMatch() {
  if (isWaitingMatch() && !state.match?.playStartsAt) {
    await cancelWaitingMatch();
    return;
  }
  if (state.match && !currentMatchIsFinished()) {
    trackOneOfTen("oneoften_game_exit", {
      mode: analyticsBattleMode(state.match.battleMode),
      exit_reason: "lobby_button",
      game_state: isWaitingMatch(state.match) ? "waiting" : "active",
      game_phase: state.match.phase || "unknown",
    });
  }
  await returnToLobby();
}

function renderMatch() {
  if (!state.match) return;
  const match = state.match;
  if (match.status === "active" && !isWaitingMatch(match) && !currentMatchIsFinished()) {
    trackOneOfTenOnce("oneoften_game_start", `friend-start-${match.matchId}`, {
      mode: analyticsBattleMode(match.battleMode),
      starting_role: match.isMyTurn && match.phase === "opening" ? "first" : "participant",
      round_number: Number(match.roundNumber || 1),
    });
  }
  renderReadyRoom(match);
  renderOpponent(match); renderHistory(match); renderArena(match); renderOperations(match); renderActions(match); renderHand(match); renderTimer(match);
  if (currentMatchIsFinished()) {
    if (state.renderResultForMatchId !== match.matchId) {
      state.renderResultForMatchId = match.matchId;
      renderResult(match);
    } else {
      renderRematchState(match);
    }
  }
}
function renderOpponent(match) {
  els.opponentName.textContent = match.opponentNickname || "친구";
  els.opponentAvatar.innerHTML = avatarMarkup(match.opponentAvatarUrl, match.opponentNickname);
  const status = currentMatchIsFinished()
    ? "경기가 끝났어요."
    : isWaitingMatch(match)
      ? (match.opponentReady ? "준비를 마쳤어요." : "대기방에서 준비 중이에요.")
      : match.isMyTurn ? "당신의 차례를 기다리고 있어요." : "카드를 고르고 있어요.";
  els.opponentStatus.textContent = status;
  const hand = currentMatchIsFinished() && Array.isArray(match.opponentHand) ? match.opponentHand : Array(Number(match.opponentCardCount || 0)).fill(null);
  els.matchModeBadge.textContent = battleModeText(match.battleMode);
  els.matchModeBadge.classList.toggle("is-rated", match.battleMode === "rated");
  els.opponentCardCount.textContent = `손패 ${hand.length}장`;
  els.opponentHand.innerHTML = hand.map((number) => `<span class="ootf-card-back${number !== null ? " is-revealed" : ""}">${number ?? ""}</span>`).join("");
}
function renderHistory(match) {
  const actions = getActions().filter((action) => actionLabel(action));
  const compact = document.body.classList.contains("ootf-in-match") && innerHeight <= 900;
  const source = compact && !state.historyExpanded && actions.length ? [actions[actions.length - 1]] : actions;
  els.matchHistory.innerHTML = source.length ? source.map((action) => `<span class="ootf-history-step${action.actorId === state.user.id ? " is-mine" : ""}">${escapeHtml(actionLabel(action))}</span>`).join("") : '<span class="ootf-history-empty">아직 놓인 카드가 없어요.</span>';
  els.historyToggle.classList.toggle("is-hidden", !(compact && actions.length > 1));
  els.historyToggle.textContent = state.historyExpanded ? "간단히" : "전체 보기";
  els.operationCount.textContent = `수식 ${4 - Number(match.availableOperations?.length || 0)} / 4`;
}
function renderArena(match) {
  const hasOperation = Boolean(state.selectedOperation);
  const hasNumber = state.selectedNumber !== null;
  els.currentValue.textContent = match.currentValue === null ? "?" : String(match.currentValue);
  els.currentValue.classList.toggle("is-empty", match.currentValue === null);
  els.selectedOperation.textContent = hasOperation ? displayOperation(state.selectedOperation) : "";
  els.selectedOperation.classList.toggle("is-hidden", !hasOperation);
  els.selectedOperation.classList.toggle("is-cancelable", hasOperation && !hasNumber && !state.busy);
  els.selectedOperation.disabled = !(hasOperation && !hasNumber && !state.busy);
  els.selectedNumber.textContent = hasNumber ? String(state.selectedNumber) : "";
  els.selectedNumber.classList.toggle("is-hidden", !hasNumber);

  let pill = "친구 대전"; let message = "경기 상태를 확인하고 있어요.";
  if (currentMatchIsFinished()) { pill = "승부 종료"; message = "결과 화면에서 이번 판의 기록을 확인해요."; }
  else if (isWaitingMatch(match)) { pill = "경기 준비"; message = "두 사람이 준비를 마치면 3초 뒤 경기가 시작돼요."; }
  else if (!match.isMyTurn) { pill = `${match.opponentNickname || "친구"} 차례`; message = "친구가 카드를 고르는 동안 숲이 조용히 기다리고 있어요."; }
  else if (match.phase === "opening") { pill = "내가 선공"; message = "첫 숫자카드 한 장을 내세요."; }
  else if (match.phase === "must_play") { pill = "내 차례"; message = hasOperation ? "이제 계산에 사용할 숫자카드를 내세요." : "수식카드와 숫자카드를 차례로 내세요."; }
  else if (match.phase === "decision") { pill = "내 차례"; message = "지금 스톱하거나 카드 한 장을 받고 계산을 이어가세요."; }
  else if (match.phase === "resolving") { pill = "승부 확인"; message = "남은 카드와 최종 결과값을 비교하고 있어요."; }
  if (state.busy && hasOperation && hasNumber) message = `${match.currentValue} ${displayOperation(state.selectedOperation)} ${state.selectedNumber}…`;
  els.turnPill.textContent = pill; els.arenaMessage.textContent = message;

  const lastCalc = [...getActions()].reverse().find((action) => actionIsCalculation(action));
  const needsDivisionNote = lastCalc?.operation === "÷" && Number(lastCalc.beforeValue) % Number(lastCalc.numberCard) !== 0;
  els.calculationNote.textContent = needsDivisionNote ? `${lastCalc.beforeValue} ÷ ${lastCalc.numberCard}은 소수점을 버려 ${lastCalc.afterValue}로 계산했어요.` : "";
  els.calculationNote.classList.toggle("is-hidden", !needsDivisionNote);
}
function renderOperations(match) {
  els.operationCards.innerHTML = OPERATIONS.map((operation) => {
    const available = match.availableOperations?.includes(operation.value);
    const selectable = isMyTurn() && match.phase === "must_play" && available && !state.selectedOperation && !state.busy;
    const selected = state.selectedOperation === operation.value;
    return `<button class="ootf-operation${selected ? " is-selected" : ""}" type="button" data-operation="${operation.value}" ${selectable ? "" : "disabled"}>${operation.label}</button>`;
  }).join("");
  $$('[data-operation]').forEach((button) => button.addEventListener("click", () => selectOperation(button.dataset.operation)));
}
function renderActions(match) {
  const show = isMyTurn() && match.phase === "decision" && !state.busy;
  els.actionPanel.classList.toggle("is-hidden", !show);
  els.stopButton.disabled = !show; els.drawButton.disabled = !show || inferredDeckCount() <= 0;
}
function renderHand(match) {
  const hand = Array.isArray(match.myHand) ? match.myHand : [];
  els.myHand.innerHTML = hand.map((number) => {
    const selectable = isMyTurn() && !state.busy && (match.phase === "opening" || (match.phase === "must_play" && state.selectedOperation));
    return `<button class="ootf-number${state.selectedNumber === number ? " is-selected" : ""}" type="button" data-number="${number}" ${selectable ? "" : "disabled"}>${number}</button>`;
  }).join("");
  $$('[data-number]').forEach((button) => button.addEventListener("click", () => selectNumber(Number(button.dataset.number))));
  els.deckCount.textContent = `더미 ${inferredDeckCount()}장`;
  let help = "친구의 차례예요.";
  if (currentMatchIsFinished()) help = "이번 판이 끝났어요.";
  else if (isWaitingMatch(match)) help = "대기방에서 준비를 마치면 카드가 배정돼요.";
  else if (match.isMyTurn && match.phase === "opening") help = "첫 숫자카드 한 장을 선택하세요.";
  else if (match.isMyTurn && match.phase === "must_play" && !state.selectedOperation) help = "먼저 수식카드를 선택하세요.";
  else if (match.isMyTurn && match.phase === "must_play") help = "계산에 사용할 숫자카드를 선택하세요.";
  else if (match.isMyTurn && match.phase === "decision") help = "스톱 또는 카드 받기를 선택하세요.";
  if (state.busy) help = "서버에 카드를 놓고 있어요.";
  els.handHelp.textContent = help;
}
function renderTimer(match) {
  stopTimer();
  const active = isTimedPhase() && !currentMatchIsFinished();
  els.turnTimer.classList.toggle("is-hidden", !active); els.timeoutHint.classList.add("is-hidden");
  if (!active) return;
  state.timerInterval = setInterval(updateTimer, 150); updateTimer();
}
function updateTimer() {
  const match = state.match;
  if (!match?.turnDeadline || currentMatchIsFinished()) { stopTimer(); return; }
  const remaining = Math.max(0, Date.parse(match.turnDeadline) - (Date.now() + state.serverOffset));
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  els.timerText.textContent = `${seconds}초`; els.timerBar.style.width = `${Math.min(100, remaining / TURN_LIMIT_MS * 100)}%`;
  els.turnTimer.classList.toggle("is-warning", seconds <= 10 && seconds > 5); els.turnTimer.classList.toggle("is-danger", seconds <= 5);
  if (seconds <= 5) {
    let hint = match.isMyTurn ? (match.phase === "decision" ? "시간이 끝나면 자동으로 스톱해요." : "시간이 끝나면 가능한 카드가 자동으로 나가요.") : "친구의 시간이 끝나면 서버가 자동으로 진행해요.";
    els.timeoutHint.textContent = hint; els.timeoutHint.classList.remove("is-hidden");
  } else els.timeoutHint.classList.add("is-hidden");
  if (remaining <= 0) resolveTimeout();
}

function selectOperation(operation) {
  if (!isMyTurn() || state.match.phase !== "must_play" || state.busy || state.selectedOperation) return;
  state.selectedOperation = operation; state.selectedNumber = null; renderMatch();
}
function cancelOperation() {
  if (!state.selectedOperation || state.selectedNumber !== null || state.busy) return;
  state.selectedOperation = null; renderMatch();
}
function selectNumber(number) {
  if (!isMyTurn() || state.busy) return;
  if (state.match.phase === "opening") { state.selectedNumber = number; state.busy = true; renderMatch(); clearActionTimer(); actionTimer = setTimeout(() => submitOpening(number), 450); return; }
  if (state.match.phase === "must_play" && state.selectedOperation) { state.selectedNumber = number; state.busy = true; renderMatch(); clearActionTimer(); actionTimer = setTimeout(() => submitCalculation(state.selectedOperation, number), EQUATION_REVEAL_MS); }
}
async function runAction(name, params, successMessage = "") {
  try {
    const view = await rpc(name, params); state.match = view; if (view.serverNow) state.serverOffset = Date.parse(view.serverNow) - Date.now();
    state.selectedOperation = null; state.selectedNumber = null; state.busy = false; state.timeoutResolving = false; renderMatch();
    if (successMessage) showToast(successMessage);
  } catch (error) {
    console.warn(`OneOfTen action ${name} error`, error); state.selectedOperation = null; state.selectedNumber = null; state.busy = false; state.timeoutResolving = false;
    showToast(friendlyError(error)); await loadMatch({ force: true });
  }
}
function submitOpening(number) { return runAction("oot_submit_opening", { p_match_id: state.match.matchId, p_expected_version: state.match.version, p_number: number }); }
function submitCalculation(operation, number) { return runAction("oot_submit_calculation", { p_match_id: state.match.matchId, p_expected_version: state.match.version, p_operation: operation, p_number: number }); }
async function drawCard() { if (!isMyTurn() || state.match.phase !== "decision" || state.busy) return; state.busy = true; renderMatch(); await runAction("oot_draw_card", { p_match_id: state.match.matchId, p_expected_version: state.match.version }); }
async function stopMatch() { if (!isMyTurn() || state.match.phase !== "decision" || state.busy) return; state.busy = true; renderMatch(); await runAction("oot_stop_match", { p_match_id: state.match.matchId, p_expected_version: state.match.version }); }
async function resolveTimeout() {
  if (state.timeoutResolving || !state.match || currentMatchIsFinished()) return;
  state.timeoutResolving = true; els.connectionStatus.textContent = "시간 종료를 서버에서 처리 중";
  try { const view = await rpc("oot_resolve_timeout", { p_match_id: state.match.matchId }); state.match = view; if (view.serverNow) state.serverOffset = Date.parse(view.serverNow) - Date.now(); renderMatch(); }
  catch (error) { console.warn("OneOfTen timeout error", error); }
  finally { state.timeoutResolving = false; }
}

function animatePointNumber(element, from, to) {
  const start = performance.now();
  const duration = 650;
  const step = (now) => {
    const ratio = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - ratio, 3);
    element.textContent = String(Math.round(from + (to - from) * eased));
    if (ratio < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function renderPointResult(match) {
  const pointResult = match.pointResult;
  const rated = match.battleMode === "rated";

  els.resultPointPanel.classList.toggle("is-hidden", !rated);
  if (!rated) return;

  els.resultPointPanel.classList.remove("is-positive", "is-negative", "is-protected", "is-ineligible");
  els.resultPointMode.textContent = "🌰 원포인트 대전";

  if (!pointResult) {
    els.resultPointDelta.textContent = "정산 확인";
    els.resultPointBefore.textContent = "-";
    els.resultPointAfter.textContent = "-";
    els.resultPointMessage.textContent = "원포인트 정산 결과를 확인하고 있어요.";
    els.resultTierMessage.textContent = "";
    return;
  }

  const before = Number(pointResult.pointBefore || 0);
  const after = Number(pointResult.pointAfter || 0);
  const delta = Number(pointResult.finalDelta || 0);
  const baseDelta = Number(pointResult.baseDelta || 0);
  const ineligible = pointResult.resultType === "ineligible" || pointResult.reason === "daily_pair_limit";

  els.resultPointBefore.textContent = String(before);
  els.resultPointAfter.textContent = String(before);
  els.resultPointDelta.textContent = ineligible ? "변화 없음" : pointDeltaText(delta);

  if (ineligible) {
    els.resultPointPanel.classList.add("is-ineligible");
    els.resultPointMessage.textContent = "오늘 이 친구와 반영되는 3판을 모두 마쳐 이번 경기는 점수에 포함되지 않았어요.";
  } else if (pointResult.beginnerProtectionApplied) {
    els.resultPointPanel.classList.add("is-protected");
    els.resultPointMessage.textContent = `첫걸음 보호가 적용되어 패배 ${baseDelta}점이 차감되지 않았어요.`;
  } else if (pointResult.tierFloorApplied) {
    els.resultPointPanel.classList.add("is-protected");
    els.resultPointMessage.textContent = `${tierLabel(pointResult.tierAfter)} 등급 보호가 적용됐어요.`;
  } else if (delta > 0) {
    els.resultPointPanel.classList.add("is-positive");
    els.resultPointMessage.textContent = pointResult.resultType === "draw"
      ? "무승부 점수 1점을 받았어요."
      : "승리 점수 5점을 받았어요.";
  } else if (delta < 0) {
    els.resultPointPanel.classList.add("is-negative");
    els.resultPointMessage.textContent = "아쉽지만 다음 판에서 다시 올릴 수 있어요.";
  } else {
    els.resultPointMessage.textContent = "현재 원포인트를 그대로 유지했어요.";
  }

  const tierChanged = pointResult.tierBefore !== pointResult.tierAfter;
  const exactMessage = pointResult.exactHit ? " · 목표값에 정확히 닿았어요 🎯" : "";
  els.resultTierMessage.textContent = tierChanged
    ? `새 등급: ${tierLabel(pointResult.tierAfter)}${exactMessage}`
    : `${tierLabel(pointResult.tierAfter)} · 최고 기록 ${Number(pointResult.peakAfter || after)}점${exactMessage}`;

  if (!ineligible) {
    window.setTimeout(() => animatePointNumber(els.resultPointAfter, before, after), 180);
  } else {
    els.resultPointAfter.textContent = String(after);
  }
}
function rematchTimeLabel(iso) {
  const ms = Date.parse(iso) - (Date.now() + state.serverOffset);
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `${minutes}분 안에 선택할 수 있어요.`;
}

function renderRematchState(match) {
  if (!els.resultRematchButton || !els.resultRematchStatus || !els.resultSeriesStatus) return;

  const targetMode = match.rematchTargetMode === "rated" ? "rated" : "casual";
  const played = Math.max(0, Number(match.ratedPlayedToday || 0));
  const myStatus = match.myRematchStatus || "";
  const opponentStatus = match.opponentRematchStatus || "";
  const expired = Boolean(match.rematchExpired);
  const hasNext = Boolean(match.nextMatchId);

  els.resultRematchBox.classList.remove("is-waiting", "is-ended");
  els.resultRematchButton.disabled = false;

  if (match.battleMode === "rated" && targetMode === "rated") {
    els.resultSeriesStatus.textContent = `오늘 이 친구와 원포인트 ${played}/3판 완료`;
    els.resultRematchButton.textContent = "원포인트로 다시 한 판";
  } else if (match.battleMode === "rated" && targetMode === "casual") {
    els.resultSeriesStatus.textContent = "오늘 점수가 반영되는 3판을 모두 마쳤어요.";
    els.resultRematchButton.textContent = "편한 대전으로 계속하기";
  } else {
    els.resultSeriesStatus.textContent = `같은 방에서 ${Number(match.roundNumber || 1) + 1}번째 판을 이어갈 수 있어요.`;
    els.resultRematchButton.textContent = "다시 한 판";
  }

  if (hasNext) {
    els.resultRematchBox.classList.add("is-waiting");
    els.resultRematchStatus.textContent = "두 사람의 선택이 같아 다음 판 대기방으로 이동하고 있어요.";
    els.resultRematchButton.textContent = "다음 판으로 이동 중…";
    els.resultRematchButton.disabled = true;
    return;
  }

  if (opponentStatus === "declined") {
    els.resultRematchBox.classList.add("is-ended");
    els.resultRematchStatus.textContent = `${match.opponentNickname || "친구"}님이 이번 대전을 마쳤어요.`;
    els.resultRematchButton.textContent = "재대전이 종료됐어요";
    els.resultRematchButton.disabled = true;
    return;
  }

  if (expired) {
    els.resultRematchBox.classList.add("is-ended");
    els.resultRematchStatus.textContent = "재대전 선택 시간이 지나 대전 목록으로 돌아갈 수 있어요.";
    els.resultRematchButton.textContent = "재대전 시간이 끝났어요";
    els.resultRematchButton.disabled = true;
    return;
  }

  if (myStatus === "accepted") {
    els.resultRematchBox.classList.add("is-waiting");
    els.resultRematchStatus.textContent = `${match.opponentNickname || "친구"}님의 선택을 기다리는 중…`;
    els.resultRematchButton.textContent = "상대의 선택을 기다리는 중…";
    els.resultRematchButton.disabled = true;
    return;
  }

  if (opponentStatus === "accepted") {
    els.resultRematchBox.classList.add("is-waiting");
    els.resultRematchStatus.textContent = `${match.opponentNickname || "친구"}님이 다시 한 판을 기다리고 있어요.`;
    return;
  }

  const timeLabel = rematchTimeLabel(match.rematchExpiresAt);
  els.resultRematchStatus.textContent = `두 사람 모두 선택하면 초대 없이 바로 이어져요.${timeLabel ? ` ${timeLabel}` : ""}`;
}

async function enterRematchMatch(sourceMatch) {
  const nextMatchId = extractMatchId(sourceMatch?.nextMatchId);
  if (!nextMatchId || state.rematchNavigating) return;

  state.rematchNavigating = true;
  trackOneOfTenOnce("oneoften_rematch_started", `rematch-start-${sourceMatch.matchId}-${nextMatchId}`, {
    mode: sourceMatch.rematchTargetMode === "rated" ? "friend_point" : "friend_casual",
    previous_mode: analyticsBattleMode(sourceMatch.battleMode),
    round_number: Number(sourceMatch.roundNumber || 1) + 1,
  });
  showToast("같은 방에서 다음 판을 준비해요.");
  const opened = await openMatch(nextMatchId);
  if (!opened) state.rematchNavigating = false;
}

async function requestRematch() {
  const match = state.match;
  if (!match || !currentMatchIsFinished() || state.rematchBusy || match.nextMatchId) return;

  state.rematchBusy = true;
  els.resultRematchButton.disabled = true;
  els.resultRematchButton.textContent = "재대전을 요청하고 있어요…";

  try {
    const view = await rpc("oot_request_rematch", { p_match_id: match.matchId });
    trackOneOfTenOnce("oneoften_rematch_requested", `rematch-request-${match.matchId}`, {
      mode: match.rematchTargetMode === "rated" ? "friend_point" : "friend_casual",
      previous_mode: analyticsBattleMode(match.battleMode),
      round_number: Number(match.roundNumber || 1) + 1,
    });
    state.match = view;
    if (view.serverNow) state.serverOffset = Date.parse(view.serverNow) - Date.now();
    void prepareMatchChat(view);
    renderRematchState(view);
    if (view.nextMatchId) await enterRematchMatch(view);
  } catch (error) {
    console.warn("OneOfTen rematch request error", error);
    showToast(friendlyError(error));
    await loadMatch({ force: true });
  } finally {
    state.rematchBusy = false;
    if (state.match && !state.match.nextMatchId) renderRematchState(state.match);
  }
}

async function leaveResultToLobby() {
  const match = state.match;
  if (match && currentMatchIsFinished()) {
    try {
      const view = await rpc("oot_decline_rematch", { p_match_id: match.matchId });
      trackOneOfTenOnce("oneoften_rematch_declined", `rematch-decline-${match.matchId}`, {
        mode: analyticsBattleMode(match.battleMode),
        round_number: Number(match.roundNumber || 1),
      });
      if (view?.nextMatchId) {
        try { await rpc("oot_cancel_waiting_match", { p_match_id: view.nextMatchId }); } catch { /* already started or cancelled */ }
      }
    } catch (error) {
      console.warn("OneOfTen rematch decline skipped", error);
    }
  }
  await returnToLobby();
}

async function leaveResultToGarden(event) {
  event?.preventDefault();
  const match = state.match;
  if (match && currentMatchIsFinished()) {
    try { await rpc("oot_decline_rematch", { p_match_id: match.matchId }); } catch { /* page navigation continues */ }
  }
  location.href = "index.html";
}

function renderResult(match) {
  const winnerId = match.winnerId;
  const won = winnerId === state.user.id;
  const draw = !winnerId;
  els.resultSymbol.textContent = draw ? "🤝" : won ? "🏆" : "🌿";
  els.resultTitle.textContent = draw ? "무승부예요" : won ? "당신이 이겼어요" : `${match.opponentNickname || "친구"}님이 이겼어요`;
  els.resultDescription.textContent = draw ? `두 카드가 최종 결과값 ${match.currentValue}에서 같은 거리였어요.` : won ? `내 남은 카드가 최종 결과값 ${match.currentValue}에 더 가까웠어요.` : `친구의 남은 카드가 최종 결과값 ${match.currentValue}에 더 가까웠어요.`;
  els.myTarget.textContent = match.myTargetCard ?? "-"; els.myDistance.textContent = `거리 ${match.myDistance ?? "-"}`;
  els.opponentTargetLabel.textContent = `${match.opponentNickname || "친구"}의 가까운 카드`; els.opponentTarget.textContent = match.opponentTargetCard ?? "-"; els.opponentDistance.textContent = `거리 ${match.opponentDistance ?? "-"}`;
  els.resultValue.textContent = `최종 결과값: ${match.currentValue}`;
  els.resultHistory.innerHTML = getActions().map((action) => {
    const line = actionLabel(action); if (!line) return "";
    return `<span class="ootf-result-step"><b>${escapeHtml(line)}</b>${action.isTimeout ? "<small>시간 종료로 서버가 자동 진행했어요.</small>" : ""}</span>`;
  }).join("");
  renderPointResult(match);
  renderRematchState(match);
  els.resultOverlay.classList.remove("is-hidden");

  const result = draw ? "draw" : won ? "win" : "lose";
  const pointResult = match.pointResult || null;
  trackOneOfTenOnce("oneoften_game_complete", `friend-complete-${match.matchId}`, {
    mode: analyticsBattleMode(match.battleMode),
    result,
    exact_hit: Number(match.myDistance) === 0 || Number(match.opponentDistance) === 0,
    point_applied: Boolean(match.battleMode === "rated" && pointResult && pointResult.resultType !== "ineligible"),
    finish_reason: match.finishReason || "normal",
    round_number: Number(match.roundNumber || 1),
  });
}

function openHelp() { els.helpOverlay.classList.remove("is-hidden"); }
function closeHelp() { els.helpOverlay.classList.add("is-hidden"); }
function applyViewport() { if (state.match) renderHistory(state.match); }

async function initialize() {
  console.info("TodayForest OneOfTen Friend v1.4.0 · Match-room chat");
  showView("loading");
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) {
    trackOneOfTen("oneoften_lobby_open", { lobby_type: "friend", login_state: "signed_out" });
    showView("login");
    return;
  }
  state.user = session.user;
  const requestedInviteId = getInviteIdFromUrl();
  if (requestedInviteId) {
    try { sessionStorage.setItem(INVITE_TARGET_STORAGE_KEY, requestedInviteId); } catch { /* ignore */ }
  }
  const matchId = getMatchIdFromUrl();
  if (matchId) {
    showView("match");
    await loadMatch({ force: true });
    if (state.match && getMatchIdFromUrl()) {
      startMatchPolling();
      subscribeMatch(matchId);
    }
  } else {
    showView("lobby");
    trackOneOfTen("oneoften_lobby_open", { lobby_type: "friend", login_state: "signed_in" });
    await loadLobby();
    startLobbyPolling();
    subscribeInvites();
  }
}

els.helpButton.addEventListener("click", openHelp); els.closeHelpButton.addEventListener("click", closeHelp); els.helpConfirmButton.addEventListener("click", closeHelp);
els.helpOverlay.addEventListener("click", (event) => { if (event.target === els.helpOverlay) closeHelp(); });
els.closeInviteModeButton.addEventListener("click", closeInviteMode);
els.inviteModeOverlay.addEventListener("click", (event) => { if (event.target === els.inviteModeOverlay) closeInviteMode(); });
els.casualInviteButton.addEventListener("click", () => createInvite("casual"));
els.ratedInviteButton.addEventListener("click", () => createInvite("rated"));
els.refreshLobbyButton.addEventListener("click", () => loadLobby()); els.historyToggle.addEventListener("click", () => { state.historyExpanded = !state.historyExpanded; renderHistory(state.match); });
els.selectedOperation.addEventListener("click", cancelOperation); els.stopButton.addEventListener("click", stopMatch); els.drawButton.addEventListener("click", drawCard);
els.matchReadyButton.addEventListener("click", toggleMatchReady); els.cancelWaitingMatchButton.addEventListener("click", cancelWaitingMatch);
els.leaveMatchButton.addEventListener("click", leaveCurrentMatch); els.resultRematchButton.addEventListener("click", requestRematch); els.resultLobbyButton.addEventListener("click", leaveResultToLobby); els.resultGardenLink.addEventListener("click", leaveResultToGarden);
els.chatToggleButton.addEventListener("click", () => state.chatOpen ? closeMatchChat() : openMatchChat()); els.chatCloseButton.addEventListener("click", closeMatchChat); els.chatBackdrop.addEventListener("click", closeMatchChat); els.chatForm.addEventListener("submit", sendMatchChat); els.chatInput.addEventListener("input", updateChatCounter);
window.addEventListener("resize", applyViewport); window.addEventListener("popstate", () => getMatchIdFromUrl() ? openMatch(getMatchIdFromUrl()) : returnToLobby());
window.addEventListener("oot-game-ready-changed", () => loadLobby({ silent: true }));
document.addEventListener("visibilitychange", () => { if (!document.hidden) { if (getMatchIdFromUrl()) { loadMatch({ force: true }); loadMatchChat({ silent: true }); } else loadLobby({ silent: true }); } });
window.addEventListener("pagehide", () => {
  if (state.match && !currentMatchIsFinished()) {
    trackOneOfTen("oneoften_game_exit", {
      mode: analyticsBattleMode(state.match.battleMode),
      exit_reason: "page_leave",
      game_state: isWaitingMatch(state.match) ? "waiting" : "active",
      game_phase: state.match.phase || "unknown",
      transport_type: "beacon",
    });
  }
});
window.addEventListener("beforeunload", () => { stopLobbyPolling(); stopMatchPolling(); stopTimer(); stopReadyCountdown(); stopRealtime(); stopInviteRealtime(); stopMatchChat(); });

initialize();
