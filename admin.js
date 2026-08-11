import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./todayforest-supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

const els = {
  authScreen: document.querySelector("#authScreen"),
  accessDenied: document.querySelector("#accessDenied"),
  adminApp: document.querySelector("#adminApp"),
  signInKakao: document.querySelector("#signInKakao"),
  signOutDenied: document.querySelector("#signOutDenied"),
  signOutButton: document.querySelector("#signOutButton"),
  authError: document.querySelector("#authError"),
  operatorName: document.querySelector("#operatorName"),
  refreshButton: document.querySelector("#refreshButton"),
  statusLine: document.querySelector("#statusLine"),
  moodCount: document.querySelector("#moodCount"),
  letterCount: document.querySelector("#letterCount"),
  friendCount: document.querySelector("#friendCount"),
  rangeButtons: [...document.querySelectorAll("[data-range]")],
};

let currentUser = null;
let selectedRange = "all";
let hasVerifiedAdminAccess = false;

function displayName(user) {
  const metadata = user?.user_metadata || {};
  return String(metadata.nickname || metadata.full_name || metadata.name || metadata.preferred_username || "운영자").trim() || "운영자";
}

function setAuthError(message = "") {
  els.authError.textContent = message;
  els.authError.classList.toggle("hidden", !message);
}

function renderScreen(mode) {
  els.authScreen.classList.toggle("hidden", mode !== "auth");
  els.accessDenied.classList.toggle("hidden", mode !== "denied");
  els.adminApp.classList.toggle("hidden", mode !== "admin");
}

function numberFromSummary(summary, key) {
  const value = Number(summary?.[key] || 0);
  return Number.isFinite(value) ? value : 0;
}

function updateSelectedRangeButton() {
  els.rangeButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.range === selectedRange);
  });
}

async function hasAdminAccess() {
  const { data, error } = await supabase.rpc("get_my_garden_feedback_admin_access");
  if (error) throw error;
  return data === true;
}

async function refreshStats() {
  if (!currentUser || !hasVerifiedAdminAccess) return;
  els.refreshButton.disabled = true;
  els.statusLine.textContent = "통계를 불러오는 중이에요.";

  try {
    const { data, error } = await supabase.rpc("get_todayforest_admin_stats", {
      p_range: selectedRange,
    });
    if (error) throw error;

    const summary = data?.summary || data || {};
    els.moodCount.textContent = String(numberFromSummary(summary, "garden_mood_saved"));
    els.letterCount.textContent = String(numberFromSummary(summary, "garden_letter_sent"));
    els.friendCount.textContent = String(numberFromSummary(summary, "garden_friend_connected"));

    const updatedAt = data?.updated_at || "";
    els.statusLine.textContent = updatedAt
      ? `마지막 갱신 · ${new Date(updatedAt).toLocaleString("ko-KR", { hour12: false })}`
      : "통계를 불러왔어요.";
  } catch (error) {
    console.error("TodayForest admin stats load error:", error);
    els.statusLine.textContent = "통계를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.";
  } finally {
    els.refreshButton.disabled = false;
  }
}

async function beginKakaoLogin() {
  setAuthError("");
  els.signInKakao.disabled = true;
  const originalText = els.signInKakao.textContent;
  els.signInKakao.textContent = "카카오 로그인으로 이동 중이에요";
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo },
  });
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
  await supabase.auth.signOut();
  currentUser = null;
  hasVerifiedAdminAccess = false;
  renderScreen("auth");
}

async function syncSession() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  hasVerifiedAdminAccess = false;

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
    hasVerifiedAdminAccess = true;
    els.operatorName.textContent = `${displayName(currentUser)} 운영자`;
    renderScreen("admin");
    await refreshStats();
  } catch (error) {
    console.error("TodayForest admin access check error:", error);
    renderScreen("denied");
  }
}

function bindEvents() {
  els.signInKakao.addEventListener("click", () => { void beginKakaoLogin(); });
  els.signOutDenied.addEventListener("click", () => { void signOut(); });
  els.signOutButton.addEventListener("click", () => { void signOut(); });
  els.refreshButton.addEventListener("click", () => { void refreshStats(); });
  els.rangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedRange = button.dataset.range || "all";
      updateSelectedRangeButton();
      void refreshStats();
    });
  });
}

async function init() {
  bindEvents();
  updateSelectedRangeButton();
  await handleOAuthCallback();
  await syncSession();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    const nextUserId = session?.user?.id || "";
    if (nextUserId === (currentUser?.id || "")) return;
    currentUser = session?.user || null;
    await syncSession();
  });
}

void init();
