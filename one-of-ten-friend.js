import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://xdcsppaptcmgpvnzgoab.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oMrSqUFX9UM1n4Ks-AhYKw_OvcZOfPs";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" },
});

const TURN_LIMIT_MS = 30000;
const EQUATION_REVEAL_MS = 700;
const LOBBY_POLL_MS = 2500;
const MATCH_POLL_MS = 2500;
const OPERATIONS = [
  { value: "+", label: "+" },
  { value: "-", label: "−" },
  { value: "×", label: "×" },
  { value: "÷", label: "÷" },
];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  loadingView: $("#loadingView"), loginView: $("#loginView"), lobbyView: $("#lobbyView"), matchView: $("#matchView"),
  helpButton: $("#helpButton"), helpOverlay: $("#helpOverlay"), closeHelpButton: $("#closeHelpButton"), helpConfirmButton: $("#helpConfirmButton"),
  activeMatchesSection: $("#activeMatchesSection"), activeMatchCount: $("#activeMatchCount"), activeMatchesList: $("#activeMatchesList"),
  incomingSection: $("#incomingSection"), incomingCount: $("#incomingCount"), incomingList: $("#incomingList"),
  outgoingSection: $("#outgoingSection"), outgoingCount: $("#outgoingCount"), outgoingList: $("#outgoingList"),
  friendsList: $("#friendsList"), noFriendsView: $("#noFriendsView"), refreshLobbyButton: $("#refreshLobbyButton"),
  opponentAvatar: $("#opponentAvatar"), opponentName: $("#opponentName"), opponentStatus: $("#opponentStatus"), opponentCardCount: $("#opponentCardCount"), opponentHand: $("#opponentHand"),
  historyToggle: $("#historyToggle"), matchHistory: $("#matchHistory"), operationCount: $("#operationCount"),
  turnPill: $("#turnPill"), turnTimer: $("#turnTimer"), timerText: $("#timerText"), timerBar: $("#timerBar"), timeoutHint: $("#timeoutHint"),
  currentValue: $("#currentValue"), selectedOperation: $("#selectedOperation"), selectedNumber: $("#selectedNumber"), arenaMessage: $("#arenaMessage"), calculationNote: $("#calculationNote"), operationCards: $("#operationCards"),
  actionPanel: $("#actionPanel"), stopButton: $("#stopButton"), drawButton: $("#drawButton"), myHand: $("#myHand"), deckCount: $("#deckCount"), handHelp: $("#handHelp"),
  leaveMatchButton: $("#leaveMatchButton"), connectionStatus: $("#connectionStatus"),
  resultOverlay: $("#resultOverlay"), resultSymbol: $("#resultSymbol"), resultTitle: $("#resultTitle"), resultDescription: $("#resultDescription"), resultHistory: $("#resultHistory"), resultValue: $("#resultValue"), myTarget: $("#myTarget"), myDistance: $("#myDistance"), opponentTargetLabel: $("#opponentTargetLabel"), opponentTarget: $("#opponentTarget"), opponentDistance: $("#opponentDistance"), resultLobbyButton: $("#resultLobbyButton"),
  toast: $("#toast"),
};

const state = {
  user: null,
  friends: [], invites: [], matches: [], match: null,
  friendsLoadFailed: false, invitesLoadFailed: false, lobbyWarnings: [],
  knownIncomingInviteIds: new Set(),
  selectedOperation: null, selectedNumber: null,
  historyExpanded: false, busy: false,
  serverOffset: 0, timeoutResolving: false,
  lobbyInterval: null, matchInterval: null, timerInterval: null,
  realtimeChannel: null, renderResultForMatchId: null,
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
function getMatchIdFromUrl() { return String(new URL(location.href).searchParams.get("match") || "").trim(); }
function setMatchUrl(matchId = "") {
  const url = new URL(location.href);
  if (matchId) url.searchParams.set("match", matchId); else url.searchParams.delete("match");
  history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}
function displayOperation(value) { return value === "-" ? "−" : value; }
function operationObject(value) { return OPERATIONS.find((item) => item.value === value); }
function currentMatchIsFinished() { return state.match?.status === "finished" || state.match?.phase === "finished"; }
function isMyTurn() { return Boolean(state.match?.isMyTurn && !currentMatchIsFinished()); }
function isTimedPhase() { return Boolean(state.match?.turnDeadline && state.match?.status === "active"); }
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
async function stopRealtime() {
  if (state.realtimeChannel) await supabase.removeChannel(state.realtimeChannel);
  state.realtimeChannel = null;
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
  state.lobbyWarnings = [];
  if (!silent) els.refreshLobbyButton.disabled = true;

  try {
    // 친구 목록은 초대/경기 조회와 분리합니다.
    // 다른 RPC 하나가 실패해도 실제 친구 목록은 화면에 먼저 보여야 합니다.
    const [friendsResult, invitesResult, matchesResult] = await Promise.allSettled([
      rpc("list_my_garden_friends"),
      rpc("oot_list_my_invites"),
      rpc("oot_list_my_matches", { p_limit: 30 }),
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
      const nextInvites = normalizeRows(invitesResult.value);
      const incomingIds = nextInvites
        .filter((item) => item.direction === "incoming")
        .map((item) => String(item.invite_id));

      const hasNewIncoming = incomingIds.some(
        (id) => !state.knownIncomingInviteIds.has(id)
      );

      state.invites = nextInvites;
      state.invitesLoadFailed = false;
      state.knownIncomingInviteIds = new Set(incomingIds);

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

    renderLobby();

    if (!state.lobbyWarnings.length) {
      els.connectionStatus.textContent = "서버와 연결됨";
    } else if (!state.friendsLoadFailed) {
      els.connectionStatus.textContent = "친구 목록 연결됨 · 일부 경기 정보 확인 중";
      if (!silent) showToast("친구 목록은 불러왔어요. 초대나 경기 정보는 다시 확인 중이에요.");
    } else {
      els.connectionStatus.textContent = "친구 목록을 불러오지 못함";
      if (!silent) showToast("친구 목록 연결이 어긋났어요. 새로고침을 눌러 주세요.");
    }
  } catch (error) {
    // 예상하지 못한 화면 오류만 이곳에서 처리합니다.
    console.warn("OneOfTen lobby render error", error);
    state.friendsLoadFailed = true;
    state.friends = [];
    state.invites = [];
    state.matches = [];
    renderLobby();
    els.connectionStatus.textContent = "로비 연결 확인 필요";
    if (!silent) showToast(friendlyError(error));
  } finally {
    lobbyLoading = false;
    els.refreshLobbyButton.disabled = false;
  }
}

function cardTemplate({ avatarUrl, name, subtitle, actions = "" }) {
  return `<article class="ootf-list-card"><span class="ootf-list-avatar">${avatarMarkup(avatarUrl, name)}</span><div class="ootf-list-copy"><strong>${escapeHtml(name || "친구")}</strong><span>${escapeHtml(subtitle || "")}</span></div>${actions}</article>`;
}
function renderLobby() {
  const incoming = state.invites.filter((item) => item.direction === "incoming");
  const outgoing = state.invites.filter((item) => item.direction === "outgoing");
  const active = state.matches.filter((item) => item.status === "active");
  const activeByOpponent = new Map(active.map((item) => [item.opponent_id, item]));
  const inviteByOpponent = new Map(state.invites.map((item) => [item.other_user_id, item]));

  els.activeMatchesSection.classList.toggle("is-hidden", !active.length);
  els.activeMatchCount.textContent = String(active.length);
  els.activeMatchesList.innerHTML = active.map((item) => cardTemplate({
    avatarUrl: item.opponent_avatar_url, name: item.opponent_nickname,
    subtitle: `${phaseLabel(item)} · ${item.turn_deadline ? formatRemaining(item.turn_deadline) : "결과 확인 중"}`,
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
    subtitle: `원오브텐 한 판을 기다려요 · ${formatRemaining(item.expires_at)}`,
    actions: `<div class="ootf-list-actions"><button class="ootf-primary" data-accept-invite="${item.invite_id}">수락</button><button class="ootf-secondary" data-decline-invite="${item.invite_id}">거절</button></div>`,
  })).join("");

  els.outgoingSection.classList.toggle("is-hidden", !outgoing.length);
  els.outgoingCount.textContent = String(outgoing.length);
  els.outgoingList.innerHTML = outgoing.map((item) => cardTemplate({
    avatarUrl: item.other_avatar_url, name: item.other_nickname,
    subtitle: `친구의 수락을 기다리는 중 · ${formatRemaining(item.expires_at)}`,
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
    const activeMatch = activeByOpponent.get(friend.friend_id);
    const invite = inviteByOpponent.get(friend.friend_id);
    let subtitle = `마음 ${Number(friend.growth_count || 0)}번을 키운 친구`;
    let action = `<button class="ootf-primary" data-create-invite="${friend.friend_id}">한 판 초대</button>`;
    if (activeMatch) { subtitle = "진행 중인 경기가 있어요."; action = `<button class="ootf-primary" data-open-match="${activeMatch.match_id}">경기 계속</button>`; }
    else if (invite?.direction === "incoming") {
      subtitle = `이 친구가 원오브텐 한 판을 기다려요 · ${formatRemaining(invite.expires_at)}`;
      action = `<div class="ootf-list-actions"><button class="ootf-primary" data-accept-invite="${invite.invite_id}">수락</button><button class="ootf-secondary" data-decline-invite="${invite.invite_id}">거절</button></div>`;
    }
    else if (invite) {
      subtitle = `친구의 수락을 기다리는 중 · ${formatRemaining(invite.expires_at)}`;
      action = `<button class="ootf-secondary" disabled>보낸 초대 대기</button>`;
    }
    return cardTemplate({ avatarUrl: friend.avatar_url, name: friend.nickname, subtitle, actions: action });
  }).join("");

  bindLobbyActions();
}
function bindLobbyActions() {
  $$('[data-create-invite]').forEach((button) => button.addEventListener("click", () => createInvite(button.dataset.createInvite, button)));
  $$('[data-accept-invite]').forEach((button) => button.addEventListener("click", () => acceptInvite(button.dataset.acceptInvite, button)));
  $$('[data-decline-invite]').forEach((button) => button.addEventListener("click", () => simpleInviteAction("oot_decline_invite", button.dataset.declineInvite, "초대를 조용히 내려놓았어요.", button)));
  $$('[data-cancel-invite]').forEach((button) => button.addEventListener("click", () => simpleInviteAction("oot_cancel_invite", button.dataset.cancelInvite, "초대를 취소했어요.", button)));
  $$('[data-open-match]').forEach((button) => button.addEventListener("click", () => openMatch(button.dataset.openMatch)));
  $$('[data-retry-invites]').forEach((button) => button.addEventListener("click", () => loadLobby()));
}
async function createInvite(friendId, button) {
  button.disabled = true;
  try { await rpc("oot_create_invite", { p_friend_id: friendId }); showToast("초대를 보냈어요. 친구 화면에 수락·거절 버튼이 나타나요."); await loadLobby({ silent: true }); }
  catch (error) { showToast(friendlyError(error)); await loadLobby({ silent: true }); }
  finally { button.disabled = false; }
}
async function acceptInvite(inviteId, button) {
  button.disabled = true;
  try { const matchId = await rpc("oot_accept_invite", { p_invite_id: inviteId }); showToast("친구와의 경기가 시작됐어요."); await openMatch(String(matchId)); }
  catch (error) { showToast(friendlyError(error)); await loadLobby({ silent: true }); button.disabled = false; }
}
async function simpleInviteAction(rpcName, inviteId, message, button) {
  button.disabled = true;
  try { await rpc(rpcName, { p_invite_id: inviteId }); showToast(message); await loadLobby({ silent: true }); }
  catch (error) { showToast(friendlyError(error)); button.disabled = false; }
}

async function openMatch(matchId) {
  if (!matchId) return;
  stopLobbyPolling();
  setMatchUrl(matchId);
  state.selectedOperation = null; state.selectedNumber = null; state.historyExpanded = false; state.renderResultForMatchId = null;
  showView("match");
  await loadMatch({ force: true });
  startMatchPolling();
  subscribeMatch(matchId);
}
async function returnToLobby() {
  clearActionTimer(); stopTimer(); stopMatchPolling(); await stopRealtime();
  state.match = null; state.selectedOperation = null; state.selectedNumber = null; state.renderResultForMatchId = null;
  els.resultOverlay.classList.add("is-hidden");
  setMatchUrl(""); showView("lobby");
  await loadLobby(); startLobbyPolling();
}

async function loadMatch({ force = false } = {}) {
  const matchId = getMatchIdFromUrl();
  if (!matchId || matchLoading || !state.user) return;
  matchLoading = true;
  try {
    const previousVersion = state.match?.version;
    const view = await rpc("oot_get_match_view", { p_match_id: matchId });
    const versionChanged = previousVersion === undefined || previousVersion !== view.version;
    state.match = view;
    if (view.serverNow) state.serverOffset = Date.parse(view.serverNow) - Date.now();
    if (versionChanged || !["must_play", "opening"].includes(view.phase) || !view.isMyTurn) {
      state.selectedOperation = null;
      state.selectedNumber = null;
      state.busy = false;
    }
    renderMatch();
    els.connectionStatus.textContent = "서버와 실시간 연결됨";
  } catch (error) {
    console.warn("OneOfTen match load error", error);
    showToast(friendlyError(error));
    if (String(error?.message || "").includes("OOT_MATCH_NOT_FOUND")) await returnToLobby();
  } finally { matchLoading = false; }
}
function startLobbyPolling() { stopLobbyPolling(); state.lobbyInterval = setInterval(() => loadLobby({ silent: true }), LOBBY_POLL_MS); }
function startMatchPolling() { stopMatchPolling(); state.matchInterval = setInterval(() => loadMatch(), MATCH_POLL_MS); }
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
function renderMatch() {
  if (!state.match) return;
  const match = state.match;
  renderOpponent(match); renderHistory(match); renderArena(match); renderOperations(match); renderActions(match); renderHand(match); renderTimer(match);
  if (currentMatchIsFinished() && state.renderResultForMatchId !== match.matchId) { state.renderResultForMatchId = match.matchId; renderResult(match); }
}
function renderOpponent(match) {
  els.opponentName.textContent = match.opponentNickname || "친구";
  els.opponentAvatar.innerHTML = avatarMarkup(match.opponentAvatarUrl, match.opponentNickname);
  const status = currentMatchIsFinished() ? "경기가 끝났어요." : match.isMyTurn ? "당신의 차례를 기다리고 있어요." : "카드를 고르고 있어요.";
  els.opponentStatus.textContent = status;
  const hand = currentMatchIsFinished() && Array.isArray(match.opponentHand) ? match.opponentHand : Array(Number(match.opponentCardCount || 0)).fill(null);
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
  els.resultOverlay.classList.remove("is-hidden");
}

function openHelp() { els.helpOverlay.classList.remove("is-hidden"); }
function closeHelp() { els.helpOverlay.classList.add("is-hidden"); }
function applyViewport() { if (state.match) renderHistory(state.match); }

async function initialize() {
  console.info("TodayForest OneOfTen Friend v1.0.2");
  showView("loading");
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) { showView("login"); return; }
  state.user = session.user;
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
    await loadLobby();
    startLobbyPolling();
  }
}

els.helpButton.addEventListener("click", openHelp); els.closeHelpButton.addEventListener("click", closeHelp); els.helpConfirmButton.addEventListener("click", closeHelp);
els.helpOverlay.addEventListener("click", (event) => { if (event.target === els.helpOverlay) closeHelp(); });
els.refreshLobbyButton.addEventListener("click", () => loadLobby()); els.historyToggle.addEventListener("click", () => { state.historyExpanded = !state.historyExpanded; renderHistory(state.match); });
els.selectedOperation.addEventListener("click", cancelOperation); els.stopButton.addEventListener("click", stopMatch); els.drawButton.addEventListener("click", drawCard);
els.leaveMatchButton.addEventListener("click", returnToLobby); els.resultLobbyButton.addEventListener("click", returnToLobby);
window.addEventListener("resize", applyViewport); window.addEventListener("popstate", () => getMatchIdFromUrl() ? openMatch(getMatchIdFromUrl()) : returnToLobby());
document.addEventListener("visibilitychange", () => { if (!document.hidden) getMatchIdFromUrl() ? loadMatch({ force: true }) : loadLobby({ silent: true }); });
window.addEventListener("beforeunload", () => { stopLobbyPolling(); stopMatchPolling(); stopTimer(); stopRealtime(); });

initialize();
