// 오늘의숲 · 나무 손길로 숲친구 부르기 v1
// 기존 동물 방문/편지 기능은 그대로 사용하고, 이 파일은 나무의 입력·연출·쿨타임만 담당합니다.

const TREE_CALL_RPC = "call_my_garden_animal_with_tree_v1";
const TREE_CALL_STATUS_RPC = "get_my_garden_tree_call_status_v1";
const VALID_TAP_INTERVAL_MS = 700;
const CHARGE_RESET_MS = 10_000;
const ARRIVAL_EFFECT_MS = 3_000;
const STATUS_REFRESH_MS = 30_000;

let supabase = null;
let treeWrap = null;
let hitbox = null;
let readyLight = null;
let pathLight = null;
let statusBubble = null;
let charge = 0;
let lastValidTapAt = 0;
let chargeResetTimer = null;
let statusHideTimer = null;
let arrivalTimer = null;
let statusRefreshTimer = null;
let cooldownUntilMs = 0;
let pendingArrivesAtMs = 0;
let pendingRequestId = "";
let callBusy = false;
let authenticated = false;
let latestVisits = [];
let serverHasActiveVisit = false;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveSupabase() {
  for (let index = 0; index < 60; index += 1) {
    if (window.__todayForestSupabase) return window.__todayForestSupabase;
    await wait(50);
  }
  return null;
}

function normalizeRpcRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data && typeof data === "object" ? data : null;
}

function visitState(value) {
  return String(value?.visit_state || value?.visitState || "");
}

function hasAnimalConflict() {
  if (serverHasActiveVisit || pendingArrivesAtMs > Date.now() || callBusy) return true;
  if (latestVisits.some((visit) => ["approaching", "visiting", "departing"].includes(visitState(visit)))) return true;
  const layer = document.querySelector("#animalV2Layer");
  return Boolean(layer?.querySelector(".animal-v2-approach, [data-animal-v2-visit]"));
}

function isInteractionBlocked() {
  return Boolean(document.querySelector(".garden-stage.is-garden-decorating"));
}

function isCooldownActive() {
  return cooldownUntilMs > Date.now();
}

function canCharge() {
  return authenticated && !isCooldownActive() && !hasAnimalConflict();
}

function clearChargeResetTimer() {
  if (!chargeResetTimer) return;
  window.clearTimeout(chargeResetTimer);
  chargeResetTimer = null;
}

function clearArrivalTimer() {
  if (!arrivalTimer) return;
  window.clearTimeout(arrivalTimer);
  arrivalTimer = null;
}

function resetCharge({ animate = false } = {}) {
  clearChargeResetTimer();
  charge = 0;
  lastValidTapAt = 0;
  if (treeWrap) treeWrap.dataset.treeCallCharge = "0";
  if (animate && treeWrap) {
    treeWrap.classList.add("is-tree-call-charge-fading");
    window.setTimeout(() => treeWrap?.classList.remove("is-tree-call-charge-fading"), 550);
  }
}

function scheduleChargeReset() {
  clearChargeResetTimer();
  chargeResetTimer = window.setTimeout(() => resetCharge({ animate: true }), CHARGE_RESET_MS);
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분 ${seconds}초`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

function showStatus(text) {
  if (!statusBubble || !text) return;
  window.clearTimeout(statusHideTimer);
  statusBubble.textContent = text;
  statusBubble.hidden = false;
  statusBubble.classList.remove("is-hiding");
  statusHideTimer = window.setTimeout(() => {
    statusBubble?.classList.add("is-hiding");
    window.setTimeout(() => {
      if (statusBubble) statusBubble.hidden = true;
      statusBubble?.classList.remove("is-hiding");
    }, 220);
  }, 4000);
}

function playTapReaction() {
  if (!treeWrap) return;
  treeWrap.classList.remove("is-tree-call-tapped");
  void treeWrap.offsetWidth;
  treeWrap.classList.add("is-tree-call-tapped");
  window.setTimeout(() => treeWrap?.classList.remove("is-tree-call-tapped"), 520);
}

function renderState() {
  if (!treeWrap || !hitbox) return;
  const conflict = hasAnimalConflict();
  const cooldown = isCooldownActive();
  const ready = authenticated && !isInteractionBlocked() && !cooldown && !conflict;
  const arriving = pendingArrivesAtMs > Date.now() || callBusy;

  treeWrap.classList.toggle("is-tree-call-ready", ready && charge === 0);
  treeWrap.classList.toggle("is-tree-call-cooldown", cooldown);
  treeWrap.classList.toggle("is-tree-call-blocked", conflict && !arriving);
  treeWrap.classList.toggle("is-tree-call-arriving", arriving);
  treeWrap.dataset.treeCallCharge = String(charge);
  hitbox.disabled = !authenticated;
  hitbox.setAttribute("aria-label", cooldown
    ? "나무의 빛이 다시 모이는 중"
    : conflict
      ? "나무 흔들기"
      : "나무에 손길 건네기");
  if (readyLight) readyLight.hidden = !ready || charge > 0;
}

function dispatchAnimalSync() {
  window.dispatchEvent(new CustomEvent("todayforest:tree-animal-call-sync"));
}

function scheduleArrival(arrivesAtMs) {
  clearArrivalTimer();
  pendingArrivesAtMs = Math.max(0, arrivesAtMs || 0);
  const remaining = pendingArrivesAtMs - Date.now();

  if (remaining <= 0) {
    pendingArrivesAtMs = 0;
    callBusy = false;
    treeWrap?.classList.remove("is-tree-call-sending");
    dispatchAnimalSync();
    renderState();
    return;
  }

  treeWrap?.classList.add("is-tree-call-sending");
  renderState();
  arrivalTimer = window.setTimeout(() => {
    pendingArrivesAtMs = 0;
    callBusy = false;
    treeWrap?.classList.remove("is-tree-call-sending");
    dispatchAnimalSync();
    renderState();
    void refreshStatus({ silent: true });
  }, Math.max(80, remaining + 120));
}

function makeRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `tree-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function rpcErrorCode(error) {
  return String(error?.message || error?.details || error?.hint || "").toUpperCase();
}

async function completeTreeCall() {
  if (!supabase || callBusy || !canCharge()) {
    resetCharge();
    renderState();
    return;
  }

  clearChargeResetTimer();
  callBusy = true;
  pendingRequestId = makeRequestId();
  treeWrap?.classList.add("is-tree-call-sending");
  renderState();

  try {
    const { data, error } = await supabase.rpc(TREE_CALL_RPC, { p_request_id: pendingRequestId });
    if (error) throw error;
    const row = normalizeRpcRow(data) || {};
    const arrivesAt = new Date(row.arrives_at || row.arrivesAt || Date.now() + ARRIVAL_EFFECT_MS).getTime();
    const cooldownUntil = new Date(row.cooldown_until || row.cooldownUntil || arrivesAt + 60 * 60 * 1000).getTime();
    if (Number.isFinite(cooldownUntil)) cooldownUntilMs = cooldownUntil;
    serverHasActiveVisit = true;
    resetCharge();
    scheduleArrival(Number.isFinite(arrivesAt) ? arrivesAt : Date.now() + ARRIVAL_EFFECT_MS);
  } catch (error) {
    const code = rpcErrorCode(error);
    console.warn("TodayForest tree animal call skipped:", error);
    callBusy = false;
    pendingArrivesAtMs = 0;
    treeWrap?.classList.remove("is-tree-call-sending");
    resetCharge({ animate: true });

    // 이미 동물이 있거나, 다른 탭에서 먼저 사용한 경우는 조용히 상태만 맞춥니다.
    if (code.includes("ANIMAL_BUSY") || code.includes("TREE_CALL_BUSY") || code.includes("COOLDOWN")) {
      await refreshStatus({ silent: true });
      dispatchAnimalSync();
    } else {
      showStatus("나무의 빛이 잠시 흩어졌어요");
    }
    renderState();
  }
}

function acceptValidTap() {
  const now = Date.now();
  if (now - lastValidTapAt < VALID_TAP_INTERVAL_MS) return false;
  lastValidTapAt = now;
  charge = Math.min(3, charge + 1);
  treeWrap.dataset.treeCallCharge = String(charge);
  treeWrap.classList.remove("is-tree-call-charging");
  void treeWrap.offsetWidth;
  treeWrap.classList.add("is-tree-call-charging");
  window.setTimeout(() => treeWrap?.classList.remove("is-tree-call-charging"), 540);

  if (charge >= 3) {
    void completeTreeCall();
  } else {
    scheduleChargeReset();
  }
  renderState();
  return true;
}

function handleTreeTap(event) {
  event.preventDefault();
  playTapReaction();

  if (!authenticated || isInteractionBlocked()) return;
  // 동물이 머물거나 다가오는 동안, 그리고 3초 등장 연출 중에는 안내 없이 나무만 흔들립니다.
  if (hasAnimalConflict()) {
    renderState();
    return;
  }
  if (isCooldownActive()) {
    showStatus(`다시 부르기 · ${formatRemaining(cooldownUntilMs - Date.now())}`);
    renderState();
    return;
  }
  acceptValidTap();
}

async function refreshAuth() {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    authenticated = Boolean(data?.session?.user);
  } catch (error) {
    authenticated = false;
  }
  renderState();
}

async function refreshStatus({ silent = false } = {}) {
  if (!supabase) return;
  await refreshAuth();
  if (!authenticated || document.hidden) return;
  try {
    const { data, error } = await supabase.rpc(TREE_CALL_STATUS_RPC);
    if (error) throw error;
    const row = normalizeRpcRow(data) || {};
    const cooldown = new Date(row.cooldown_until || row.cooldownUntil || 0).getTime();
    const pending = new Date(row.pending_arrives_at || row.pendingArrivesAt || 0).getTime();
    cooldownUntilMs = Number.isFinite(cooldown) ? cooldown : 0;
    pendingArrivesAtMs = Number.isFinite(pending) ? pending : 0;
    serverHasActiveVisit = Boolean(row.has_active_visit ?? row.hasActiveVisit);
    if (pendingArrivesAtMs > Date.now()) scheduleArrival(pendingArrivesAtMs);
    else if (pendingArrivesAtMs) {
      pendingArrivesAtMs = 0;
      dispatchAnimalSync();
    }
  } catch (error) {
    if (!silent) console.warn("TodayForest tree call status skipped:", error);
  }
  renderState();
}

function createTreeCallSurface() {
  treeWrap = document.querySelector("#treeWrap");
  if (!treeWrap || treeWrap.querySelector("#treeCallHitbox")) return Boolean(treeWrap);

  hitbox = document.createElement("button");
  hitbox.type = "button";
  hitbox.id = "treeCallHitbox";
  hitbox.className = "tree-call-hitbox";
  // 정원 좌표 레이어의 pointer-events:none 상속을 확실히 끊습니다.
  hitbox.style.pointerEvents = "auto";
  hitbox.setAttribute("aria-label", "나무에 손길 건네기");

  const effect = document.createElement("span");
  effect.className = "tree-call-effect";
  effect.setAttribute("aria-hidden", "true");
  effect.innerHTML = `
    <span class="tree-call-ready-light"></span>
    <span class="tree-call-charge-light charge-one"></span>
    <span class="tree-call-charge-light charge-two"></span>
    <span class="tree-call-charge-light charge-three"></span>
    <span class="tree-call-path-light"></span>
  `;

  statusBubble = document.createElement("span");
  statusBubble.id = "treeCallStatus";
  statusBubble.className = "tree-call-status";
  statusBubble.setAttribute("role", "status");
  statusBubble.setAttribute("aria-live", "polite");
  statusBubble.hidden = true;

  const branchLetters = treeWrap.querySelector("#branchLetters");
  treeWrap.insertBefore(hitbox, branchLetters || null);
  treeWrap.insertBefore(effect, branchLetters || null);
  // 상태 문구는 나무 내부에 두면 줄기·꽃·장식에 가려지므로 정원 카드의 최상위 토스트로 둡니다.
  const gardenStage = document.querySelector("#gardenStage");
  (gardenStage || treeWrap).appendChild(statusBubble);
  readyLight = effect.querySelector(".tree-call-ready-light");
  pathLight = effect.querySelector(".tree-call-path-light");
  hitbox.addEventListener("click", handleTreeTap);
  // 마음 열매 레이어처럼 나무 위에 놓이는 기능도 동일한 반응 경로를 사용합니다.
  window.addEventListener("todayforest:tree-tap-request", handleTreeTap);
  return true;
}

function observeAnimalLayer() {
  const layer = document.querySelector("#animalV2Layer");
  if (!layer) return;
  const observer = new MutationObserver(() => renderState());
  observer.observe(layer, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
}

async function initTreeAnimalCall() {
  if (!createTreeCallSurface()) return;
  supabase = await resolveSupabase();
  if (!supabase) {
    console.warn("TodayForest tree call could not find the shared Supabase client.");
    return;
  }

  window.addEventListener("todayforest:animal-visits-updated", (event) => {
    latestVisits = Array.isArray(event?.detail?.visits) ? event.detail.visits : [];
    serverHasActiveVisit = latestVisits.some((visit) => ["approaching", "visiting", "departing"].includes(visitState(visit)));
    renderState();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void refreshStatus({ silent: true });
  });
  window.addEventListener("focus", () => { void refreshStatus({ silent: true }); });
  supabase.auth.onAuthStateChange((_event, session) => {
    authenticated = Boolean(session?.user);
    if (!authenticated) {
      cooldownUntilMs = 0;
      pendingArrivesAtMs = 0;
      serverHasActiveVisit = false;
      resetCharge();
    }
    renderState();
    if (authenticated) void refreshStatus({ silent: true });
  });

  observeAnimalLayer();
  await refreshStatus({ silent: true });
  statusRefreshTimer = window.setInterval(() => {
    if (!document.hidden) void refreshStatus({ silent: true });
  }, STATUS_REFRESH_MS);
  renderState();
}

void initTreeAnimalCall();
