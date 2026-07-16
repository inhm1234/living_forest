/* -------------------------------------------------------------------------
   TODAYFOREST · SPECIAL FRIEND FIRST MEETING LIVE v1.1

   핵심 흐름
   - 3일째 마음 저장 직후: 나무 성장 반응이 끝난 뒤 첫 만남을 자연스럽게 안내/자동 재생
   - 이전에 이미 조건을 채운 사용자: 다음 접속 때 도착 안내 후 자동 재생
   - 연출 도중 종료한 사용자: 다음 접속 때 첫 만남 이어보기
   - 나무를 찾아 눌러야만 시작하는 구조는 사용하지 않음
   ------------------------------------------------------------------------- */
const liveParams = new URLSearchParams(window.location.search);
const statePreviewMode = liveParams.get("specialFriendStatePreview") || "";
const isStatePreviewMode = ["1", "2", "ready", "resume", "after-save", "met"].includes(statePreviewMode);
const isSpecialFriendPreview = liveParams.has("forestFriendPreview")
  || liveParams.has("forestFriendCinematic")
  || liveParams.has("firstMeeting")
  || liveParams.has("welcomePreview")
  || liveParams.has("tutorialPreview");

if (!isSpecialFriendPreview) {
  const TARGET_COUNT = 3;
  let specialFriendState = null;
  let syncInProgress = false;
  let beginInProgress = false;
  let authSubscription = null;
  let treeWrap = null;
  let callLayer = null;
  let arrivalCard = null;
  let arrivalChip = null;
  let arrivalTimer = null;
  let flowTimer = null;
  let flowKey = "";
  let deferredThisVisit = false;
  let syncRetryTimer = null;
  let syncRetryAttempt = 0;
  let lastSyncError = null;
  const SYNC_RETRY_DELAYS = [500, 1200, 2500, 5000, 9000, 15000];

  function getSupabase() {
    return window.__todayForestSupabase || null;
  }

  function toast(message, duration = 3200) {
    if (typeof window.__todayForestShowToast === "function") {
      window.__todayForestShowToast(message, duration);
      return;
    }
    const node = document.getElementById("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.remove("hidden");
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => node.classList.add("hidden"), duration);
  }

  function previewState(mode = statePreviewMode) {
    const now = new Date().toISOString();
    const progressCount = mode === "1" ? 1 : (mode === "2" ? 2 : 3);
    const isMet = mode === "met";
    const meetingStarted = mode === "resume" || isMet;
    return {
      friendKey: "forest_unicorn",
      progressCount,
      targetCount: TARGET_COUNT,
      todayCounted: progressCount > 0,
      isReady: progressCount >= TARGET_COUNT,
      meetingStarted,
      isMet,
      startedAt: now,
      readyAt: progressCount >= TARGET_COUNT ? now : null,
      meetingStartedAt: meetingStarted ? now : null,
      metAt: isMet ? now : null,
    };
  }

  function normalizeState(data) {
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      friendKey: row.friend_key || "forest_unicorn",
      progressCount: Math.max(0, Math.min(TARGET_COUNT, Number(row.progress_count || 0))),
      targetCount: Number(row.target_count || TARGET_COUNT),
      todayCounted: Boolean(row.today_counted),
      isReady: Boolean(row.is_ready),
      meetingStarted: Boolean(row.meeting_started),
      isMet: Boolean(row.is_met),
      startedAt: row.started_at || null,
      readyAt: row.ready_at || null,
      meetingStartedAt: row.meeting_started_at || null,
      metAt: row.met_at || null,
    };
  }

  function ensureTreeLight() {
    treeWrap = document.getElementById("treeWrap");
    if (!treeWrap) return false;
    if (!callLayer) {
      callLayer = document.createElement("span");
      callLayer.className = "special-friend-call-layer";
      callLayer.setAttribute("aria-hidden", "true");
      callLayer.innerHTML = `
        <i class="special-friend-call-glow"></i>
        <i class="special-friend-call-bud"></i>
        <span class="special-friend-call-motes"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
      `;
      treeWrap.appendChild(callLayer);
    }
    return true;
  }

  function ensureArrivalUI() {
    if (!arrivalCard) {
      arrivalCard = document.createElement("section");
      arrivalCard.className = "special-friend-arrival-notice";
      arrivalCard.setAttribute("role", "dialog");
      arrivalCard.setAttribute("aria-modal", "false");
      arrivalCard.setAttribute("aria-labelledby", "specialFriendArrivalTitle");
      arrivalCard.innerHTML = `
        <span class="special-friend-arrival-sparkle" aria-hidden="true">✨</span>
        <div class="special-friend-arrival-copy">
          <p class="special-friend-arrival-kicker">A SPECIAL FRIEND IS HERE</p>
          <strong id="specialFriendArrivalTitle">특별한 친구가 찾아왔어요</strong>
          <span data-special-friend-arrival-text>당신이 남긴 마음을 따라 숲길을 건너왔어요.</span>
          <small data-special-friend-arrival-auto>잠시 후 첫 만남이 자연스럽게 이어져요.</small>
        </div>
        <div class="special-friend-arrival-actions">
          <button type="button" data-special-friend-later>조금 뒤에</button>
          <button type="button" data-special-friend-meet>지금 만나기</button>
        </div>
      `;
      document.body.appendChild(arrivalCard);
      arrivalCard.querySelector("[data-special-friend-meet]")?.addEventListener("click", () => {
        clearArrivalTimer();
        void beginFirstMeeting({ origin: "notice" });
      });
      arrivalCard.querySelector("[data-special-friend-later]")?.addEventListener("click", () => {
        deferredThisVisit = true;
        clearArrivalTimer();
        hideArrivalNotice();
        showArrivalChip();
      });
    }

    if (!arrivalChip) {
      arrivalChip = document.createElement("button");
      arrivalChip.type = "button";
      arrivalChip.className = "special-friend-arrival-chip";
      arrivalChip.innerHTML = `<span aria-hidden="true">✨</span><b>도착한 특별친구 만나기</b>`;
      arrivalChip.addEventListener("click", () => {
        deferredThisVisit = false;
        hideArrivalChip();
        void beginFirstMeeting({ origin: "chip" });
      });
      document.body.appendChild(arrivalChip);
    }
  }

  function clearArrivalTimer() {
    window.clearTimeout(arrivalTimer);
    arrivalTimer = null;
  }

  function clearFlowTimer() {
    window.clearTimeout(flowTimer);
    flowTimer = null;
  }

  function hideArrivalNotice() {
    arrivalCard?.classList.remove("is-visible");
  }

  function showArrivalChip() {
    if (!specialFriendState?.isReady || specialFriendState?.isMet) return;
    ensureArrivalUI();
    arrivalChip?.classList.add("is-visible");
  }

  function hideArrivalChip() {
    arrivalChip?.classList.remove("is-visible");
  }

  function showArrivalNotice({ variant = "returning", autoDelay = 3200 } = {}) {
    if (!specialFriendState?.isReady || specialFriendState?.isMet || deferredThisVisit) {
      if (deferredThisVisit) showArrivalChip();
      return;
    }
    ensureArrivalUI();
    hideArrivalChip();
    clearArrivalTimer();

    const title = arrivalCard.querySelector("#specialFriendArrivalTitle");
    const text = arrivalCard.querySelector("[data-special-friend-arrival-text]");
    const auto = arrivalCard.querySelector("[data-special-friend-arrival-auto]");

    if (variant === "resume") {
      if (title) title.textContent = "첫 만남을 다시 이어갈게요";
      if (text) text.textContent = "조금 전 멈춘 자리에서 특별친구가 다시 기다리고 있어요.";
      if (auto) auto.textContent = "잠시 후 첫 장면부터 다시 시작해요.";
    } else if (variant === "new") {
      if (title) title.textContent = "나무가 새로운 인연을 불러왔어요";
      if (text) text.textContent = "방금 남긴 마음이 빛이 되어 특별한 친구에게 닿았어요.";
      if (auto) auto.textContent = "나무의 성장이 가라앉으면 첫 만남이 이어져요.";
    } else {
      if (title) title.textContent = "특별한 친구가 찾아왔어요";
      if (text) text.textContent = "당신이 그동안 남겨둔 마음을 따라 숲길을 건너왔어요.";
      if (auto) auto.textContent = "잠시 후 첫 만남이 자연스럽게 이어져요.";
    }

    arrivalCard.dataset.variant = variant;
    arrivalCard.classList.add("is-visible");
    if (autoDelay > 0) {
      arrivalTimer = window.setTimeout(() => {
        arrivalTimer = null;
        if (!arrivalCard?.classList.contains("is-visible") || deferredThisVisit) return;
        void beginFirstMeeting({ origin: `auto-${variant}` });
      }, autoDelay);
    }
  }

  function gardenLooksReady() {
    const stage = document.getElementById("gardenStage");
    const treeImage = document.getElementById("treeImage");
    if (!stage || !treeImage || document.hidden) return false;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 280 || rect.height < 420) return false;
    if (!treeImage.complete || treeImage.naturalWidth < 10) return false;
    const cinematic = document.getElementById("forestFriendCinematic");
    if (cinematic?.classList.contains("is-open")) return false;
    return true;
  }

  function waitForGarden({ minimumDelay = 700, maximumWait = 9000 } = {}) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= minimumDelay && gardenLooksReady()) {
          resolve(true);
          return;
        }
        if (elapsed >= maximumWait) {
          resolve(false);
          return;
        }
        window.setTimeout(check, 140);
      };
      check();
    });
  }

  function renderTreeState() {
    if (!ensureTreeLight() || !specialFriendState) return;
    const { progressCount, isReady, isMet } = specialFriendState;
    treeWrap.classList.toggle("special-friend-progress-1", progressCount === 1 && !isReady && !isMet);
    treeWrap.classList.toggle("special-friend-progress-2", progressCount >= 2 && !isReady && !isMet);
    treeWrap.classList.toggle("special-friend-ready", isReady && !isMet);
    treeWrap.classList.toggle("special-friend-met", isMet);
    treeWrap.removeAttribute("role");
    treeWrap.removeAttribute("tabindex");
    treeWrap.removeAttribute("aria-label");
  }

  function publishState() {
    if (!specialFriendState) return;
    window.__todayForestSpecialFriendLiveState = { ...specialFriendState };
    window.dispatchEvent(new CustomEvent("todayforest:special-friend-live-state", {
      detail: { ...specialFriendState },
    }));
  }

  function queueMeetingFlow({ variant, minimumDelay, autoDelay, key }) {
    if (!specialFriendState?.isReady || specialFriendState?.isMet || deferredThisVisit) return;
    if (flowKey === key && (flowTimer || arrivalCard?.classList.contains("is-visible"))) return;
    flowKey = key;
    clearFlowTimer();
    flowTimer = window.setTimeout(async () => {
      flowTimer = null;
      if (!specialFriendState?.isReady || specialFriendState?.isMet || deferredThisVisit) return;
      await waitForGarden({ minimumDelay });
      if (!specialFriendState?.isReady || specialFriendState?.isMet || deferredThisVisit) return;
      showArrivalNotice({ variant, autoDelay });
    }, 80);
  }

  function applyState(nextState, { origin = "sync", suppressAuto = false } = {}) {
    if (!nextState) return;
    const previousState = specialFriendState;
    specialFriendState = nextState;
    renderTreeState();
    publishState();

    if (nextState.isMet) {
      clearArrivalTimer();
      clearFlowTimer();
      hideArrivalNotice();
      hideArrivalChip();
      flowKey = "";
      return;
    }
    if (!nextState.isReady || suppressAuto) return;

    const justBecameReady = !previousState?.isReady && nextState.isReady;
    if (nextState.meetingStarted) {
      queueMeetingFlow({
        variant: "resume",
        minimumDelay: 850,
        autoDelay: 1700,
        key: `resume:${nextState.meetingStartedAt || nextState.readyAt || "ready"}`,
      });
      return;
    }

    if ((origin === "record" && justBecameReady) || statePreviewMode === "after-save") {
      queueMeetingFlow({
        variant: "new",
        minimumDelay: 1450,
        autoDelay: 1900,
        key: `new:${nextState.readyAt || "ready"}`,
      });
      return;
    }

    queueMeetingFlow({
      variant: "returning",
      minimumDelay: 900,
      autoDelay: 3500,
      key: `returning:${nextState.readyAt || "ready"}`,
    });
  }

  function clearSyncRetry() {
    window.clearTimeout(syncRetryTimer);
    syncRetryTimer = null;
  }

  function scheduleSyncRetry(origin = "retry") {
    if (isStatePreviewMode || specialFriendState?.isMet) return;
    clearSyncRetry();
    const index = Math.min(syncRetryAttempt, SYNC_RETRY_DELAYS.length - 1);
    const delay = SYNC_RETRY_DELAYS[index];
    syncRetryAttempt += 1;
    syncRetryTimer = window.setTimeout(() => {
      syncRetryTimer = null;
      void syncSpecialFriendState({ origin: `${origin}-${syncRetryAttempt}` });
    }, delay);
  }

  function markSyncSucceeded() {
    syncRetryAttempt = 0;
    lastSyncError = null;
    clearSyncRetry();
  }

  async function currentSession() {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function syncSpecialFriendState({ silent = true, origin = "sync" } = {}) {
    if (syncInProgress) return specialFriendState;
    syncInProgress = true;
    try {
      if (isStatePreviewMode) {
        const next = previewState();
        markSyncSucceeded();
        applyState(next, { origin: statePreviewMode === "after-save" ? "record" : origin });
        return next;
      }

      const supabase = getSupabase();
      if (!supabase) {
        lastSyncError = new Error("SUPABASE_CLIENT_NOT_READY");
        scheduleSyncRetry("client");
        return null;
      }

      const session = await currentSession();
      if (!session?.user) {
        specialFriendState = null;
        lastSyncError = new Error("AUTH_SESSION_NOT_READY");
        scheduleSyncRetry("session");
        return null;
      }

      const { data, error } = await supabase.rpc("sync_my_garden_special_friend_state");
      if (error) throw error;
      const next = normalizeState(data);
      if (!next) {
        lastSyncError = new Error("SPECIAL_FRIEND_STATE_EMPTY");
        scheduleSyncRetry("empty");
        return null;
      }

      markSyncSucceeded();
      applyState(next, { origin });
      return next;
    } catch (error) {
      lastSyncError = error;
      console.warn("TodayForest special-friend state sync retry scheduled:", error);
      scheduleSyncRetry("error");
      if (!silent && syncRetryAttempt >= 3) {
        toast("특별친구의 마음빛을 불러오는 중이에요. 잠시만 기다려 주세요.");
      }
      return null;
    } finally {
      syncInProgress = false;
    }
  }

  function waitForCinematic(maximumWait = 5000) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const play = window.__todayForestReplayFriendCinematic;
        if (typeof play === "function") {
          resolve(play);
          return;
        }
        if (Date.now() - startedAt >= maximumWait) {
          resolve(null);
          return;
        }
        window.setTimeout(check, 100);
      };
      check();
    });
  }

  async function beginFirstMeeting({ origin = "manual" } = {}) {
    if (beginInProgress || specialFriendState?.isMet) return;
    if (!specialFriendState?.isReady) {
      toast("서로 다른 날에 마음을 남기면 나무가 조금씩 특별한 빛을 모아요.");
      return;
    }

    beginInProgress = true;
    clearArrivalTimer();
    clearFlowTimer();
    hideArrivalNotice();
    hideArrivalChip();
    treeWrap?.classList.add("special-friend-beginning");

    try {
      const play = await waitForCinematic();
      if (!play) {
        toast("첫 만남 장면을 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
        showArrivalChip();
        return;
      }

      if (isStatePreviewMode) {
        const now = new Date().toISOString();
        applyState({
          ...specialFriendState,
          meetingStarted: true,
          meetingStartedAt: specialFriendState?.meetingStartedAt || now,
        }, { suppressAuto: true });
        play({ mode: "first-meeting" });
        return;
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("SUPABASE_NOT_READY");
      const { data, error } = await supabase.rpc("begin_my_garden_special_friend_meeting");
      if (error) throw error;
      applyState(normalizeState(data), { origin, suppressAuto: true });
      play({ mode: "first-meeting" });
    } catch (error) {
      console.error("TodayForest special-friend meeting start error:", error);
      const message = String(error?.message || "");
      toast(message.includes("SPECIAL_FRIEND_NOT_READY")
        ? "아직 나무의 마음빛이 조금 더 필요해요."
        : "첫 만남을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      showArrivalChip();
    } finally {
      treeWrap?.classList.remove("special-friend-beginning");
      beginInProgress = false;
    }
  }

  window.__todayForestCompleteFirstMeeting = async () => {
    try {
      if (isStatePreviewMode) {
        const now = new Date().toISOString();
        applyState({
          ...specialFriendState,
          isReady: true,
          meetingStarted: true,
          isMet: true,
          meetingStartedAt: specialFriendState?.meetingStartedAt || now,
          metAt: now,
        }, { suppressAuto: true });
        toast("DEV 확인용으로 숲 유니콘과의 첫 만남을 완료했어요 ♡", 4200);
        return true;
      }
      const supabase = getSupabase();
      if (!supabase) return false;
      const { data, error } = await supabase.rpc("complete_my_garden_special_friend_meeting");
      if (error) throw error;
      applyState(normalizeState(data), { suppressAuto: true });
      toast("숲 유니콘이 당신의 특별친구가 되었어요 ♡", 4200);
      return true;
    } catch (error) {
      console.error("TodayForest special-friend meeting completion error:", error);
      toast("인연을 저장하지 못했어요. 연결을 확인한 뒤 다시 인사해 주세요.", 4200);
      return false;
    }
  };

  function installListeners() {
    window.addEventListener("todayforest:garden-record-saved", () => {
      window.setTimeout(() => {
        void syncSpecialFriendState({ silent: false, origin: "record" });
      }, 420);
    });
    window.addEventListener("todayforest:garden-session-ready", () => {
      window.setTimeout(() => {
        void syncSpecialFriendState({ origin: "garden-session-ready" });
      }, 120);
    });
    window.addEventListener("pageshow", () => {
      if (!deferredThisVisit) void syncSpecialFriendState({ origin: "pageshow" });
    });
    window.addEventListener("load", () => {
      window.setTimeout(() => {
        if (!deferredThisVisit) void syncSpecialFriendState({ origin: "window-load" });
      }, 300);
    }, { once: true });
    window.addEventListener("focus", () => {
      if (!deferredThisVisit) void syncSpecialFriendState({ origin: "focus" });
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !deferredThisVisit) void syncSpecialFriendState({ origin: "visible" });
    });

    const supabase = getSupabase();
    if (supabase?.auth?.onAuthStateChange) {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          window.setTimeout(() => { void syncSpecialFriendState({ origin: "auth" }); }, 180);
        } else {
          specialFriendState = null;
          scheduleSyncRetry("auth-empty");
        }
      });
      authSubscription = result?.data?.subscription || null;
    }
  }

  async function init() {
    ensureTreeLight();
    ensureArrivalUI();

    let attempts = 0;
    while (!getSupabase() && attempts < 150) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      attempts += 1;
    }

    installListeners();
    const initialState = await syncSpecialFriendState({ origin: "init" });
    if (!initialState && !isStatePreviewMode) {
      scheduleSyncRetry("startup");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { void init(); }, { once: true });
  } else {
    void init();
  }

  window.__todayForestRefreshSpecialFriendState = () => syncSpecialFriendState({ silent: false, origin: "manual-refresh" });
  window.__todayForestSpecialFriendSyncDebug = () => ({
    state: specialFriendState ? { ...specialFriendState } : null,
    retryAttempt: syncRetryAttempt,
    lastError: lastSyncError ? String(lastSyncError.message || lastSyncError) : null,
  });

  window.addEventListener("beforeunload", () => {
    clearSyncRetry();
    authSubscription?.unsubscribe?.();
  }, { once: true });
}
