import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://xdcsppaptcmgpvnzgoab.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oMrSqUFX9UM1n4Ks-AhYKw_OvcZOfPs";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" },
});

const state = {
  user: null,
  wallet: null,
  ready: false,
  refreshPromise: null,
};

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function normalizePayload(data) {
  const row = Array.isArray(data) ? (data[0] || null) : data;
  if (!row || typeof row !== "object") return null;
  return {
    balance: numberValue(row.balance ?? row.acorn_balance),
    lifetimeEarned: numberValue(row.lifetimeEarned ?? row.lifetime_earned),
    rewardAmount: numberValue(row.rewardAmount ?? row.reward_amount),
    result: String(row.result || ""),
    awarded: row.awarded !== false,
    sourceType: String(row.sourceType ?? row.source_type ?? ""),
  };
}

function setBalance(balance) {
  const value = numberValue(balance);
  document.querySelectorAll("[data-acorn-balance]").forEach((element) => {
    element.textContent = String(value);
  });
  document.querySelectorAll("[data-acorn-wallet]").forEach((element) => {
    element.classList.toggle("is-signed-out", !state.user);
    element.title = state.user ? `보유 도토리 ${value}개` : "로그인하면 도토리를 모을 수 있어요.";
  });
}

function renderSignedOutWallet() {
  document.querySelectorAll("[data-acorn-balance]").forEach((element) => {
    element.textContent = "-";
  });
  document.querySelectorAll("[data-acorn-wallet]").forEach((element) => {
    element.classList.add("is-signed-out");
    element.title = "로그인하면 도토리를 모을 수 있어요.";
  });
}

function rewardMessage(result, amount) {
  if (result === "win") return `승리 보상으로 도토리 ${amount}개가 또르르 굴러왔어요.`;
  if (result === "draw") return `무승부 보상으로 도토리 ${amount}개를 받았어요.`;
  return `끝까지 함께한 보상으로 도토리 ${amount}개를 받았어요.`;
}

function renderReward(payload, { signedOut = false, error = false } = {}) {
  document.querySelectorAll("[data-acorn-reward-panel]").forEach((panel) => {
    panel.hidden = false;
    panel.classList.remove("is-awarded", "is-repeat", "is-signed-out", "is-error");

    const amount = panel.querySelector("[data-acorn-earned]");
    const after = panel.querySelector("[data-acorn-after]");
    const message = panel.querySelector("[data-acorn-reward-message]");

    if (signedOut) {
      panel.classList.add("is-signed-out");
      if (amount) amount.textContent = "-";
      if (after) after.textContent = "-";
      if (message) message.textContent = "정원에 로그인하면 대전을 마칠 때 도토리를 모을 수 있어요.";
      return;
    }

    if (error || !payload) {
      panel.classList.add("is-error");
      if (amount) amount.textContent = "?";
      if (after) after.textContent = state.wallet ? String(state.wallet.balance) : "-";
      if (message) message.textContent = "도토리 정산을 잠시 확인하지 못했어요. 다시 들어오면 자동으로 확인해요.";
      return;
    }

    panel.classList.add(payload.awarded ? "is-awarded" : "is-repeat");
    if (amount) amount.textContent = String(payload.rewardAmount);
    if (after) after.textContent = String(payload.balance);
    if (message) {
      message.textContent = payload.awarded
        ? rewardMessage(payload.result, payload.rewardAmount)
        : `이번 대전의 도토리는 이미 받았어요. 보유 도토리는 ${payload.balance}개예요.`;
    }
  });
}

async function ensureUser() {
  if (state.ready) return state.user;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  state.user = data?.session?.user || null;
  state.ready = true;
  if (!state.user) renderSignedOutWallet();
  return state.user;
}

async function refresh() {
  if (state.refreshPromise) return state.refreshPromise;
  state.refreshPromise = (async () => {
    const user = await ensureUser();
    if (!user) return null;
    const { data, error } = await supabase.rpc("oot_get_my_acorn_wallet");
    if (error) throw error;
    const wallet = normalizePayload(data) || { balance: 0, lifetimeEarned: 0 };
    state.wallet = wallet;
    setBalance(wallet.balance);
    return wallet;
  })().finally(() => {
    state.refreshPromise = null;
  });
  return state.refreshPromise;
}

async function claimRpc(name, params) {
  const user = await ensureUser();
  if (!user) {
    renderReward(null, { signedOut: true });
    return { signedIn: false, payload: null };
  }

  try {
    const { data, error } = await supabase.rpc(name, params);
    if (error) throw error;
    const payload = normalizePayload(data);
    if (!payload) throw new Error("ACORN_REWARD_EMPTY");
    state.wallet = payload;
    setBalance(payload.balance);
    renderReward(payload);
    document.dispatchEvent(new CustomEvent("todayforest-acorn-reward", { detail: payload }));
    return { signedIn: true, payload };
  } catch (error) {
    console.warn("TodayForest acorn reward error", error);
    renderReward(null, { error: true });
    return { signedIn: true, payload: null, error };
  }
}

async function claimSoloReward({ runId, result } = {}) {
  const normalizedRunId = String(runId || "").trim();
  const normalizedResult = String(result || "").trim();
  if (!normalizedRunId || !["win", "draw", "lose"].includes(normalizedResult)) return null;
  return claimRpc("oot_claim_squirrel_acorns", {
    p_run_id: normalizedRunId,
    p_result: normalizedResult,
  });
}

async function claimMatchReward({ matchId } = {}) {
  const normalizedMatchId = String(matchId || "").trim();
  if (!normalizedMatchId) return null;
  return claimRpc("oot_claim_match_acorns", { p_match_id: normalizedMatchId });
}

window.TodayForestAcorns = {
  refresh,
  claimSoloReward,
  claimMatchReward,
  get balance() { return state.wallet?.balance ?? null; },
  get signedIn() { return Boolean(state.user); },
};

document.dispatchEvent(new CustomEvent("todayforest-acorns-ready"));
void refresh().catch((error) => {
  console.warn("TodayForest acorn wallet load skipped", error);
});
