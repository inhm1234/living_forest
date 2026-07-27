// 오늘의숲 PHASE 8.6 · 링크 목적 통합 v1.2
const supabase = window.__todayForestSupabase;
const showToast = (...args) => window.__todayForestShowToast?.(...args);
const FRIEND_CODE_SESSION_KEY = "todayforest_pending_friend_code";
const FRIEND_CODE_PARAM = "friendCode";

const $ = (selector) => document.querySelector(selector);
const normalizeRow = (data) => Array.isArray(data) ? (data[0] || null) : (data || null);
const escapeHTML = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

let activeFriendCode = "";
let activeFriendCodePreview = null;
let featureReady = true;
let processingIntent = false;

function normalizeFriendCode(value = "") {
  const code = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === 12 ? code : "";
}

function formatFriendCode(value = "") {
  const code = normalizeFriendCode(value);
  return code ? code.match(/.{1,4}/g).join("-") : "";
}

function getFriendCodeIntent() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("sharedMemory") === "1" || url.searchParams.has("invite")) {
    window.sessionStorage.removeItem(FRIEND_CODE_SESSION_KEY);
    return "";
  }
  const fromUrl = normalizeFriendCode(url.searchParams.get(FRIEND_CODE_PARAM) || "");
  const fromSession = normalizeFriendCode(window.sessionStorage.getItem(FRIEND_CODE_SESSION_KEY) || "");
  const code = fromUrl || fromSession;
  if (code) window.sessionStorage.setItem(FRIEND_CODE_SESSION_KEY, code);
  return code;
}

function clearFriendCodeIntent({ clearUrl = true } = {}) {
  window.sessionStorage.removeItem(FRIEND_CODE_SESSION_KEY);
  if (!clearUrl) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(FRIEND_CODE_PARAM)) return;
  url.searchParams.delete(FRIEND_CODE_PARAM);
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function currentNickname(user) {
  const account = $("#accountName")?.textContent?.replace(/의 정원\s*$/, "").trim();
  return account || user?.user_metadata?.nickname || user?.user_metadata?.name || "새 친구";
}

function rpcMissing(error) {
  const message = String(error?.message || "");
  return message.includes("Could not find the function")
    || message.includes("PGRST202")
    || message.includes("garden_friend_code");
}

function markFeatureUnavailable() {
  featureReady = false;
  $("#friendConnectionHub")?.classList.add("hidden");
  const hint = $("#friendConnectionEntryHint");
  if (hint) hint.textContent = "친구 코드 기능을 준비하지 못했어요";
  const preview = $("#friendConnectionEntryCode");
  if (preview) preview.textContent = "잠시 뒤 다시 확인해 주세요";
}

async function sessionUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

function showFriendAuthIntent() {
  $("#friendCodeAuthNote")?.classList.remove("hidden");
  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    const button = document.querySelector("[data-public-login]");
    if (button && !$("#publicHome")?.classList.contains("hidden")) {
      button.click();
      window.clearInterval(timer);
      return;
    }
    if (tries > 20) window.clearInterval(timer);
  }, 100);
}

function hideFriendAuthIntent() {
  $("#friendCodeAuthNote")?.classList.add("hidden");
}

async function ensureMyFriendCode(user) {
  if (!user || !featureReady) return null;
  const { data, error } = await supabase.rpc("ensure_my_garden_friend_code", {
    p_nickname: currentNickname(user),
  });
  if (error) {
    if (rpcMissing(error)) markFeatureUnavailable();
    else console.warn("TodayForest friend code prepare skipped:", error);
    return null;
  }
  const row = normalizeRow(data);
  const code = normalizeFriendCode(row?.friend_code || "");
  const label = $("#myFriendCode");
  if (label) label.textContent = code ? formatFriendCode(code) : "코드를 준비하지 못했어요";
  const entryCode = $("#friendConnectionEntryCode");
  if (entryCode) entryCode.textContent = code
    ? `내 코드 ${formatFriendCode(code)}`
    : "내 친구 코드 확인하기";
  const copyCode = $("#copyMyFriendCode");
  const copyLink = $("#copyMyFriendLink");
  if (copyCode) {
    copyCode.disabled = !code;
    copyCode.dataset.code = code;
  }
  if (copyLink) {
    copyLink.disabled = !code;
    copyLink.dataset.code = code;
  }
  return code;
}

async function copyText(text, successMessage) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    showToast(successMessage);
  }
}

function requestRowMarkup(request) {
  const incoming = request.direction === "incoming";
  const name = escapeHTML(request.other_nickname || "친구");
  const date = request.created_at
    ? new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(request.created_at))
    : "";
  return `
    <article class="friend-request-row" data-request-id="${escapeHTML(request.request_id)}">
      <div class="friend-request-copy">
        <b>${incoming ? `${name}님이 친구 신청을 보냈어요` : `${name}님에게 신청을 보냈어요`}</b>
        <small>${incoming ? "내가 수락해야 친구로 연결돼요." : "상대가 수락하기 전까지 정원 데이터는 바뀌지 않아요."}${date ? ` · ${escapeHTML(date)}` : ""}</small>
      </div>
      <div class="friend-request-actions">
        ${incoming
          ? `<button class="friend-request-accept" type="button" data-accept-friend-request="${escapeHTML(request.request_id)}">수락</button><button class="friend-request-decline" type="button" data-decline-friend-request="${escapeHTML(request.request_id)}">거절</button>`
          : `<button class="friend-request-cancel" type="button" data-cancel-friend-request="${escapeHTML(request.request_id)}">신청 취소</button>`}
      </div>
    </article>`;
}

async function loadFriendRequests() {
  const user = await sessionUser();
  if (!user || !featureReady) return [];
  const list = $("#friendRequestList");
  if (list) list.innerHTML = '<p class="friend-request-empty">친구 신청을 불러오고 있어요.</p>';
  const { data, error } = await supabase.rpc("list_my_garden_friend_requests");
  if (error) {
    if (rpcMissing(error)) markFeatureUnavailable();
    else if (list) list.innerHTML = '<p class="friend-request-empty">신청을 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요.</p>';
    return [];
  }
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  const incomingCount = rows.filter((row) => row.direction === "incoming").length;
  const count = $("#friendConnectionEntryCount");
  const hint = $("#friendConnectionEntryHint");
  if (count) {
    count.textContent = String(incomingCount);
    count.classList.toggle("hidden", incomingCount === 0);
  }
  if (hint) hint.textContent = incomingCount
    ? `받은 친구 신청 ${incomingCount}개 · 눌러서 확인`
    : "코드 입력 · 내 코드 복사 · 친구 초대 링크";
  const summary = $("#friendRequestSummary");
  if (summary) summary.textContent = rows.length
    ? `받은 신청 ${incomingCount}개 · 보낸 신청 ${rows.length - incomingCount}개`
    : "새 신청이 없어요";
  if (list) list.innerHTML = rows.length
    ? rows.map(requestRowMarkup).join("")
    : '<p class="friend-request-empty">아직 기다리는 친구 신청이 없어요.</p>';
  return rows;
}

function openFriendCodeModal(row, code) {
  activeFriendCode = code;
  activeFriendCodePreview = row;
  const modal = $("#friendCodeModal");
  const card = modal?.querySelector(".friend-code-modal-card");
  const from = $("#friendCodeModalFrom");
  const title = $("#friendCodeModalTitle");
  const body = $("#friendCodeModalBody");
  const send = $("#sendFriendCodeRequest");
  if (!modal || !from || !title || !body || !send) return;

  const name = row?.owner_nickname || "친구";
  const status = row?.relationship_status || "ready";
  from.textContent = `${name}의 정원`;
  card?.classList.toggle("is-status", status !== "ready");
  send.disabled = false;
  send.textContent = "친구 신청 보내기";

  const copy = {
    ready: ["이 정원과 친구로 이어질까요?", "링크를 여는 것만으로는 아무 데이터도 바뀌지 않아요. 신청을 보낸 뒤 상대가 직접 수락해야 친구가 됩니다."],
    self: ["내 친구 코드예요", "내 코드를 내가 다시 열어도 친구나 나무 데이터는 만들어지지 않아요."],
    already_friend: ["이미 함께 자라는 친구예요", "다시 연결할 필요 없이 친구 목록에서 정원을 찾아갈 수 있어요."],
    outgoing_pending: ["이미 친구 신청을 보냈어요", "상대가 수락하기 전까지 기다리고 있어요. 같은 링크를 다시 열어도 신청은 하나만 유지됩니다."],
    incoming_pending: ["이 친구가 먼저 신청했어요", "친구 화면의 ‘받고 보낸 신청’에서 수락하거나 거절할 수 있어요."],
  };
  const [nextTitle, nextBody] = copy[status] || ["친구 코드를 확인하지 못했어요", "코드를 다시 확인해 주세요."];
  title.textContent = nextTitle;
  body.textContent = nextBody;
  modal.classList.remove("hidden");
}

function closeFriendCodeModal({ clearIntent = true } = {}) {
  $("#friendCodeModal")?.classList.add("hidden");
  activeFriendCode = "";
  activeFriendCodePreview = null;
  if (clearIntent) clearFriendCodeIntent();
}

async function previewFriendCode(code, { fromIntent = false } = {}) {
  const normalized = normalizeFriendCode(code);
  if (!normalized) {
    showToast("친구 코드 12자리를 확인해 주세요.");
    return;
  }
  const user = await sessionUser();
  if (!user) {
    window.sessionStorage.setItem(FRIEND_CODE_SESSION_KEY, normalized);
    showFriendAuthIntent();
    return;
  }
  hideFriendAuthIntent();
  const { data, error } = await supabase.rpc("preview_garden_friend_code", { p_code: normalized });
  if (error) {
    if (rpcMissing(error)) markFeatureUnavailable();
    showToast("친구 코드를 확인하지 못했어요.");
    return;
  }
  const row = normalizeRow(data);
  if (!row?.owner_id) {
    if (fromIntent) clearFriendCodeIntent();
    showToast("존재하지 않는 친구 코드예요.");
    return;
  }
  openFriendCodeModal(row, normalized);
}

async function sendFriendRequestFromCode() {
  if (!activeFriendCode || !activeFriendCodePreview) return;
  const user = await sessionUser();
  if (!user) return;
  const button = $("#sendFriendCodeRequest");
  button.disabled = true;
  button.textContent = "신청을 보내는 중이에요";
  const { data, error } = await supabase.rpc("create_garden_friend_request_by_code", {
    p_code: activeFriendCode,
    p_nickname: currentNickname(user),
  });
  button.disabled = false;
  button.textContent = "친구 신청 보내기";
  if (error) {
    showToast(String(error.message || "친구 신청을 보내지 못했어요."));
    return;
  }
  const row = normalizeRow(data);
  clearFriendCodeIntent();
  closeFriendCodeModal({ clearIntent: false });
  await loadFriendRequests();
  const status = row?.request_status || "outgoing_pending";
  showToast(status === "already_friend"
    ? "이미 함께 자라는 친구예요."
    : status === "incoming_pending"
      ? "상대가 먼저 보낸 신청이 있어요. 받은 신청을 확인해 주세요."
      : "친구 신청을 보냈어요. 상대가 수락하면 연결돼요.");
}

async function respondFriendRequest(requestId, accept) {
  if (!requestId) return;
  const selector = accept ? `[data-accept-friend-request="${CSS.escape(requestId)}"]` : `[data-decline-friend-request="${CSS.escape(requestId)}"]`;
  const button = document.querySelector(selector);
  if (button) button.disabled = true;
  const { data, error } = await supabase.rpc("respond_to_garden_friend_request", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) {
    if (button) button.disabled = false;
    showToast(String(error.message || "친구 신청을 처리하지 못했어요."));
    return;
  }
  const row = normalizeRow(data);
  showToast(accept ? `${row?.friend_nickname || "친구"}님과 이제 함께 자라요.` : "친구 신청을 조용히 거절했어요.");
  if (accept) {
    window.setTimeout(() => window.location.reload(), 450);
  } else {
    await loadFriendRequests();
  }
}

async function cancelFriendRequest(requestId) {
  if (!requestId) return;
  const { error } = await supabase.rpc("cancel_my_garden_friend_request", { p_request_id: requestId });
  if (error) {
    showToast(String(error.message || "친구 신청을 취소하지 못했어요."));
    return;
  }
  showToast("보낸 친구 신청을 취소했어요.");
  await loadFriendRequests();
}

async function processFriendCodeIntent() {
  if (processingIntent) return;
  const code = getFriendCodeIntent();
  if (!code) return;
  processingIntent = true;
  try {
    const user = await sessionUser();
    if (!user) {
      showFriendAuthIntent();
      return;
    }
    await previewFriendCode(code, { fromIntent: true });
  } finally {
    processingIntent = false;
  }
}

function bindFriendConnectionEvents() {
  $("#openFriendInvitePanel")?.addEventListener("click", async () => {
    const user = await sessionUser();
    if (!user) return;
    await Promise.all([ensureMyFriendCode(user), loadFriendRequests()]);
  });
  $("#refreshFriendRequests")?.addEventListener("click", () => { void loadFriendRequests(); });
  $("#friendCodeForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void previewFriendCode($("#friendCodeInput")?.value || "");
  });
  $("#friendCodeInput")?.addEventListener("input", (event) => {
    const raw = String(event.target.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    event.target.value = raw.match(/.{1,4}/g)?.join("-") || raw;
  });
  $("#copyMyFriendCode")?.addEventListener("click", (event) => {
    const code = event.currentTarget.dataset.code || "";
    void copyText(formatFriendCode(code), "친구 코드를 복사했어요.");
  });
  $("#copyMyFriendLink")?.addEventListener("click", (event) => {
    const code = event.currentTarget.dataset.code || "";
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set(FRIEND_CODE_PARAM, code);
    void copyText(url.toString(), "친구 초대 링크를 복사했어요. 상대가 링크를 열어 신청을 보내면 내가 수락할 수 있어요.");
  });
  $("#sendFriendCodeRequest")?.addEventListener("click", () => { void sendFriendRequestFromCode(); });
  $("#closeFriendCodeModal")?.addEventListener("click", () => closeFriendCodeModal());
  $("#closeFriendCodeModalSecondary")?.addEventListener("click", () => closeFriendCodeModal());
  $("#friendCodeModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeFriendCodeModal();
  });
  $("#friendRequestList")?.addEventListener("click", (event) => {
    const accept = event.target.closest("[data-accept-friend-request]");
    const decline = event.target.closest("[data-decline-friend-request]");
    const cancel = event.target.closest("[data-cancel-friend-request]");
    if (accept) void respondFriendRequest(accept.dataset.acceptFriendRequest, true);
    if (decline) void respondFriendRequest(decline.dataset.declineFriendRequest, false);
    if (cancel) void cancelFriendRequest(cancel.dataset.cancelFriendRequest);
  });
}

async function initializeFriendConnection() {
  if (!supabase) return;
  bindFriendConnectionEvents();
  const user = await sessionUser();
  if (user) {
    await Promise.all([ensureMyFriendCode(user), loadFriendRequests()]);
    await processFriendCodeIntent();
  } else if (getFriendCodeIntent()) {
    showFriendAuthIntent();
  }

  window.addEventListener("todayforest:garden-session-ready", () => {
    void sessionUser().then((readyUser) => readyUser && ensureMyFriendCode(readyUser));
    void loadFriendRequests();
    void processFriendCodeIntent();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      window.setTimeout(() => {
        void ensureMyFriendCode(session.user);
        void loadFriendRequests();
        void processFriendCodeIntent();
      }, 250);
    }
  });
}

void initializeFriendConnection();
