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

let currentUser = null;
let feedbackItems = [];
let selectedFeedbackId = "";
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const els = {
  authScreen: $("#authScreen"),
  accessDenied: $("#accessDenied"),
  adminApp: $("#adminApp"),
  signInKakao: $("#signInKakao"),
  signOutDenied: $("#signOutDenied"),
  signOutButton: $("#signOutButton"),
  authError: $("#authError"),
  operatorName: $("#operatorName"),
  newCount: $("#newCount"),
  readCount: $("#readCount"),
  repliedCount: $("#repliedCount"),
  refreshButton: $("#refreshButton"),
  statusFilter: $("#statusFilter"),
  categoryFilter: $("#categoryFilter"),
  inboxLoading: $("#inboxLoading"),
  feedbackList: $("#feedbackList"),
  detailEmpty: $("#detailEmpty"),
  detailContent: $("#detailContent"),
  detailStatus: $("#detailStatus"),
  detailDate: $("#detailDate"),
  detailFrom: $("#detailFrom"),
  detailMessage: $("#detailMessage"),
  markReadButton: $("#markReadButton"),
  replyForm: $("#replyForm"),
  replyMessage: $("#replyMessage"),
  replyState: $("#replyState"),
  saveReplyButton: $("#saveReplyButton"),
  toast: $("#toast"),
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayName(user) {
  const metadata = user?.user_metadata || {};
  return String(metadata.nickname || metadata.full_name || metadata.name || metadata.preferred_username || "운영자").trim() || "운영자";
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatListDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function categoryLabel(category) {
  return ({ issue: "불편한 점", idea: "바라는 점", cheer: "응원 한마디" })[category] || "남긴 말";
}

function statusLabel(status) {
  return ({ new: "새 문의", read: "읽음", replied: "답장 완료" })[status] || "새 문의";
}

function normalizedStatus(item) {
  return ["new", "read", "replied"].includes(item?.operator_status) ? item.operator_status : "new";
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  toastTimer = window.setTimeout(() => els.toast.classList.add("hidden"), 3200);
}

function setAuthError(message = "") {
  els.authError.textContent = message;
  els.authError.classList.toggle("hidden", !message);
}

function selectedItem() {
  return feedbackItems.find((item) => item.feedback_id === selectedFeedbackId) || null;
}

function visibleItems() {
  const status = els.statusFilter.value;
  const category = els.categoryFilter.value;
  return feedbackItems.filter((item) => {
    const statusMatch = status === "all" || normalizedStatus(item) === status;
    const categoryMatch = category === "all" || item.category === category;
    return statusMatch && categoryMatch;
  });
}

function renderCounts() {
  const count = (status) => feedbackItems.filter((item) => normalizedStatus(item) === status).length;
  els.newCount.textContent = String(count("new"));
  els.readCount.textContent = String(count("read"));
  els.repliedCount.textContent = String(count("replied"));
}

function renderFeedbackList() {
  const items = visibleItems();
  if (!items.length) {
    els.feedbackList.innerHTML = '<p class="feedback-list-empty">조건에 맞는 문의가 없어요.<br />새로운 말이 도착하면 이곳에 보여요.</p>';
    return;
  }

  els.feedbackList.innerHTML = items.map((item) => {
    const status = normalizedStatus(item);
    const name = String(item.nickname_snapshot || "이름 없는 숲친구").trim() || "이름 없는 숲친구";
    const preview = String(item.message || "").replace(/\s+/g, " ").trim();
    return `
      <button class="feedback-row ${item.feedback_id === selectedFeedbackId ? "is-selected" : ""}" type="button" data-feedback-id="${escapeHTML(item.feedback_id)}">
        <span class="feedback-row-top">
          <span class="feedback-row-name">${escapeHTML(name)}</span>
          <time class="feedback-row-date">${escapeHTML(formatListDate(item.created_at))}</time>
        </span>
        <span class="feedback-row-preview">${escapeHTML(preview)}</span>
        <span class="chip-row">
          <span class="category-chip">${escapeHTML(categoryLabel(item.category))}</span>
          <span class="status-chip status-${escapeHTML(status)}">${escapeHTML(statusLabel(status))}</span>
        </span>
      </button>`;
  }).join("");

  document.querySelectorAll("[data-feedback-id]").forEach((button) => {
    button.addEventListener("click", () => selectFeedback(button.dataset.feedbackId));
  });
}

function renderDetail() {
  const item = selectedItem();
  const hasItem = Boolean(item);
  els.detailEmpty.classList.toggle("hidden", hasItem);
  els.detailContent.classList.toggle("hidden", !hasItem);
  if (!item) return;

  const status = normalizedStatus(item);
  const name = String(item.nickname_snapshot || "이름 없는 숲친구").trim() || "이름 없는 숲친구";
  els.detailStatus.textContent = statusLabel(status);
  els.detailStatus.className = `status-chip status-${status}`;
  els.detailDate.textContent = formatDateTime(item.created_at);
  els.detailDate.dateTime = item.created_at || "";
  els.detailFrom.textContent = `${name} 님이 남긴 말`;
  els.detailMessage.textContent = item.message || "";
  els.replyMessage.value = item.operator_reply || "";
  els.markReadButton.classList.toggle("hidden", status !== "new");
  els.replyState.textContent = item.operator_replied_at
    ? `마지막 답장 · ${formatDateTime(item.operator_replied_at)}`
    : "답장을 저장하면 사용자의 '내가 남긴 말'에 표시돼요.";
}

function renderInbox() {
  renderCounts();
  renderFeedbackList();
  renderDetail();
}

function renderScreen(mode) {
  els.authScreen.classList.toggle("hidden", mode !== "auth");
  els.accessDenied.classList.toggle("hidden", mode !== "denied");
  els.adminApp.classList.toggle("hidden", mode !== "admin");
}

async function hasAdminAccess() {
  const { data, error } = await supabase.rpc("get_my_garden_feedback_admin_access");
  if (error) throw error;
  return data === true;
}

async function loadInbox({ keepSelection = true } = {}) {
  if (!currentUser) return;
  els.inboxLoading.classList.remove("hidden");
  els.refreshButton.classList.add("is-loading");
  try {
    const { data, error } = await supabase.rpc("list_garden_feedback_for_admin", {
      p_status: "all",
      p_category: "all",
    });
    if (error) throw error;
    feedbackItems = data || [];

    const stillSelected = keepSelection && feedbackItems.some((item) => item.feedback_id === selectedFeedbackId);
    if (!stillSelected) selectedFeedbackId = visibleItems()[0]?.feedback_id || feedbackItems[0]?.feedback_id || "";
    renderInbox();
  } catch (error) {
    console.error("TodayForest feedback admin inbox load error:", error);
    feedbackItems = [];
    selectedFeedbackId = "";
    renderInbox();
    showToast("문의함을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  } finally {
    els.inboxLoading.classList.add("hidden");
    els.refreshButton.classList.remove("is-loading");
  }
}

async function selectFeedback(feedbackId) {
  selectedFeedbackId = feedbackId || "";
  renderInbox();
}

async function markSelectedAsRead() {
  const item = selectedItem();
  if (!item || normalizedStatus(item) !== "new") return;

  els.markReadButton.disabled = true;
  const originalText = els.markReadButton.textContent;
  els.markReadButton.textContent = "처리 중";
  try {
    const { data, error } = await supabase.rpc("mark_garden_feedback_read", { p_feedback_id: item.feedback_id });
    if (error) throw error;
    if (data !== true) throw new Error("FEEDBACK_NOT_FOUND");
    item.operator_status = "read";
    item.operator_read_at = new Date().toISOString();
    renderInbox();
    showToast("읽음으로 표시했어요.");
  } catch (error) {
    console.error("TodayForest feedback admin read error:", error);
    showToast("읽음 상태를 저장하지 못했어요.");
  } finally {
    els.markReadButton.disabled = false;
    els.markReadButton.textContent = originalText;
  }
}

async function saveReply(event) {
  event.preventDefault();
  const item = selectedItem();
  if (!item) return;
  const reply = els.replyMessage.value.trim();
  if (!reply) {
    showToast("답장을 짧게라도 적어 주세요.");
    els.replyMessage.focus();
    return;
  }

  const originalText = els.saveReplyButton.textContent;
  els.saveReplyButton.disabled = true;
  els.saveReplyButton.textContent = "답장 저장 중";
  try {
    const { data, error } = await supabase.rpc("save_garden_feedback_admin_reply", {
      p_feedback_id: item.feedback_id,
      p_reply: reply,
    });
    if (error) throw error;
    if (data !== true) throw new Error("FEEDBACK_NOT_FOUND");
    await loadInbox({ keepSelection: true });
    showToast("답장을 보냈어요. 사용자 편지함에 바로 표시돼요.");
  } catch (error) {
    console.error("TodayForest feedback admin reply save error:", error);
    showToast("답장을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  } finally {
    els.saveReplyButton.disabled = false;
    els.saveReplyButton.textContent = originalText;
  }
}

async function beginKakaoLogin() {
  setAuthError("");
  els.signInKakao.disabled = true;
  const originalText = els.signInKakao.textContent;
  els.signInKakao.textContent = "카카오 로그인으로 이동 중이에요";
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo } });
  if (error) {
    els.signInKakao.disabled = false;
    els.signInKakao.textContent = originalText;
    setAuthError(`카카오 로그인 준비 중 문제가 생겼어요. ${error.message}`);
  }
}

async function handleOAuthCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (!code) return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    setAuthError("카카오 로그인 정보를 이어오지 못했어요. 다시 한 번 시도해 주세요.");
    return;
  }
  url.searchParams.delete("code");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    showToast("로그아웃을 마치지 못했어요. 다시 시도해 주세요.");
    return;
  }
  currentUser = null;
  feedbackItems = [];
  selectedFeedbackId = "";
  renderScreen("auth");
}

async function syncSession() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;

  if (!currentUser) {
    renderScreen("auth");
    return;
  }

  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      renderScreen("denied");
      return;
    }
    els.operatorName.textContent = `${displayName(currentUser)} 운영자`;
    renderScreen("admin");
    await loadInbox({ keepSelection: false });
  } catch (error) {
    console.error("TodayForest feedback admin access check error:", error);
    renderScreen("denied");
    showToast("운영자 권한을 확인하지 못했어요.");
  }
}

function bindEvents() {
  els.signInKakao.addEventListener("click", () => { void beginKakaoLogin(); });
  els.signOutDenied.addEventListener("click", () => { void signOut(); });
  els.signOutButton.addEventListener("click", () => { void signOut(); });
  els.refreshButton.addEventListener("click", () => { void loadInbox(); });
  els.statusFilter.addEventListener("change", () => {
    if (selectedFeedbackId && !visibleItems().some((item) => item.feedback_id === selectedFeedbackId)) {
      selectedFeedbackId = visibleItems()[0]?.feedback_id || "";
    }
    renderInbox();
  });
  els.categoryFilter.addEventListener("change", () => {
    if (selectedFeedbackId && !visibleItems().some((item) => item.feedback_id === selectedFeedbackId)) {
      selectedFeedbackId = visibleItems()[0]?.feedback_id || "";
    }
    renderInbox();
  });
  els.markReadButton.addEventListener("click", () => { void markSelectedAsRead(); });
  els.replyForm.addEventListener("submit", saveReply);
}

async function init() {
  bindEvents();
  await handleOAuthCallback();
  await syncSession();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    const nextUserId = session?.user?.id || "";
    if (nextUserId === (currentUser?.id || "")) return;
    currentUser = session?.user || null;
    feedbackItems = [];
    selectedFeedbackId = "";
    await syncSession();
  });
}

init();
