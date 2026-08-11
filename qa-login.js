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

const $ = (selector) => document.querySelector(selector);
const els = {
  form: $("#qaLoginForm"),
  email: $("#qaEmail"),
  password: $("#qaPassword"),
  loginButton: $("#qaLoginButton"),
  message: $("#qaMessage"),
  sessionPanel: $("#qaSessionPanel"),
  sessionEmail: $("#qaSessionEmail"),
  sessionHelp: $("#qaSessionHelp"),
  continueButton: $("#qaContinueButton"),
  logoutButton: $("#qaLogoutButton"),
};

let authBusy = false;

function safeNextPath() {
  const value = new URL(window.location.href).searchParams.get("next") || "/app.html";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/app.html";
    if (url.pathname === "/qa-login" || url.pathname === "/qa-login.html") return "/app.html";
    return `${url.pathname}${url.search}${url.hash}` || "/app.html";
  } catch {
    return "/";
  }
}

function providerLabel(user) {
  const provider = String(user?.app_metadata?.provider || "").toLowerCase();
  if (provider === "email") return "이메일 QA 계정";
  if (provider === "kakao") return "카카오 본계정";
  return "현재 계정";
}

function setMessage(text = "", type = "") {
  els.message.textContent = text;
  els.message.classList.toggle("hidden", !text);
  els.message.classList.toggle("is-error", type === "error");
  els.message.classList.toggle("is-success", type === "success");
}

function setBusy(nextBusy) {
  authBusy = nextBusy;
  els.loginButton.disabled = nextBusy;
  els.email.disabled = nextBusy;
  els.password.disabled = nextBusy;
  els.loginButton.textContent = nextBusy ? "로그인 확인 중이에요" : "테스트 계정으로 로그인";
}

function renderSession(session) {
  const user = session?.user || null;
  const signedIn = Boolean(user);

  els.form.classList.toggle("hidden", signedIn);
  els.sessionPanel.classList.toggle("hidden", !signedIn);

  if (!user) {
    els.sessionEmail.textContent = "";
    els.sessionHelp.textContent = "";
    return;
  }

  const label = providerLabel(user);
  els.sessionEmail.textContent = user.email || label;
  els.sessionHelp.textContent = label === "카카오 본계정"
    ? "이 브라우저에는 본계정이 열려 있어요. QA 계정은 다른 브라우저나 휴대폰에서 로그인하는 것이 안전해요."
    : "테스트 계정으로 연결되어 있어요. 내 정원에서 초기 설정을 마친 뒤 친구 대전을 검수하면 돼요.";
}

function friendlyAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 맞지 않아요. Supabase에서 만든 테스트 계정을 다시 확인해 주세요.";
  }
  if (message.includes("email not confirmed")) {
    return "이메일 확인이 완료되지 않은 계정이에요. Supabase 사용자 화면에서 계정을 확인 처리해 주세요.";
  }
  if (message.includes("email logins are disabled") || message.includes("provider is not enabled")) {
    return "Supabase에서 이메일 로그인이 아직 켜지지 않았어요.";
  }
  if (message.includes("rate limit")) {
    return "로그인 시도가 잠시 제한됐어요. 조금 뒤 다시 시도해 주세요.";
  }
  return "테스트 계정으로 로그인하지 못했어요. 계정 설정을 다시 확인해 주세요.";
}

async function refreshSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setMessage("현재 로그인 상태를 확인하지 못했어요. 페이지를 새로고침해 주세요.", "error");
    renderSession(null);
    return;
  }
  renderSession(data.session);
}

async function handleLogin(event) {
  event.preventDefault();
  if (authBusy) return;

  const email = els.email.value.trim().toLowerCase();
  const password = els.password.value;

  if (!email || !password) {
    setMessage("테스트 계정 이메일과 비밀번호를 모두 입력해 주세요.", "error");
    return;
  }

  setMessage("");
  setBusy(true);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    setBusy(false);
    setMessage(friendlyAuthError(error), "error");
    els.password.select();
    return;
  }

  renderSession(data.session);
  setMessage("로그인됐어요. 내 정원으로 이동할게요.", "success");
  window.setTimeout(() => window.location.replace(safeNextPath()), 450);
}

async function handleLogout() {
  if (authBusy) return;
  authBusy = true;
  els.logoutButton.disabled = true;
  setMessage("");

  const { error } = await supabase.auth.signOut();
  authBusy = false;
  els.logoutButton.disabled = false;

  if (error) {
    setMessage("로그아웃을 마치지 못했어요. 다시 시도해 주세요.", "error");
    return;
  }

  els.password.value = "";
  renderSession(null);
  setMessage("로그아웃했어요. 다른 테스트 계정으로 로그인할 수 있어요.", "success");
  window.setTimeout(() => els.email.focus(), 80);
}

els.form.addEventListener("submit", handleLogin);
els.continueButton.addEventListener("click", () => window.location.assign(safeNextPath()));
els.logoutButton.addEventListener("click", handleLogout);

supabase.auth.onAuthStateChange((_event, session) => {
  renderSession(session);
});

await refreshSession();
if (els.form && !els.form.classList.contains("hidden")) {
  window.setTimeout(() => els.email.focus(), 80);
}
