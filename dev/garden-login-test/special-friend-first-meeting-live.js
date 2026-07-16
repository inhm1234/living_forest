/* -------------------------------------------------------------------------
   TODAYFOREST · SPECIAL FRIEND FIRST MEETING LIVE v1
   서로 다른 3일의 마음 기록을 서버에서 확인하고,
   나무 빛남 → 첫 만남 시네마틱 → 숲 유니콘 보유 상태를 연결합니다.

   DEV 미리보기 파라미터에서는 실행하지 않습니다.
   ------------------------------------------------------------------------- */
const liveParams = new URLSearchParams(window.location.search);
const statePreviewMode = liveParams.get("specialFriendStatePreview") || "";
const isStatePreviewMode = ["1", "2", "ready", "met"].includes(statePreviewMode);
const isSpecialFriendPreview = liveParams.has("forestFriendPreview")
  || liveParams.has("forestFriendCinematic")
  || liveParams.has("firstMeeting")
  || liveParams.has("welcomePreview")
  || liveParams.has("tutorialPreview");

if (!isSpecialFriendPreview) {
  const supabase = window.__todayForestSupabase;
  const TARGET_COUNT = 3;
  let specialFriendState = null;
  let syncInProgress = false;
  let beginInProgress = false;
  let autoResumeRequested = false;
  let authSubscription = null;
  let treeWrap = null;
  let callLayer = null;
  let callHint = null;

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
    return {
      friendKey: "forest_unicorn",
      progressCount,
      targetCount: TARGET_COUNT,
      todayCounted: progressCount > 0,
      isReady: progressCount >= TARGET_COUNT,
      meetingStarted: isMet,
      isMet,
      startedAt: now,
      readyAt: progressCount >= TARGET_COUNT ? now : null,
      meetingStartedAt: isMet ? now : null,
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

  function ensureCallLayer() {
    treeWrap = document.getElementById("treeWrap");
    if (!treeWrap) return false;

    if (!callLayer) {
      callLayer = document.createElement("span");
      callLayer.className = "special-friend-call-layer";
      callLayer.setAttribute("aria-hidden", "true");
      callLayer.innerHTML = `
        <i class="special-friend-call-glow"></i>
        <i class="special-friend-call-bud"></i>
        <span class="special-friend-call-motes">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </span>
      `;
      treeWrap.appendChild(callLayer);
    }

    if (!callHint) {
      callHint = document.createElement("button");
      callHint.type = "button";
      callHint.className = "special-friend-call-hint";
      callHint.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void beginFirstMeeting();
      });
      treeWrap.appendChild(callHint);
    }

    if (!treeWrap.dataset.specialFriendMeetingBound) {
      treeWrap.dataset.specialFriendMeetingBound = "true";
      treeWrap.addEventListener("click", handleTreeActivation);
      treeWrap.addEventListener("keydown", handleTreeKeydown);
    }
    return true;
  }

  function handleTreeActivation(event) {
    if (!specialFriendState?.isReady || specialFriendState?.isMet) return;
    if (event.target instanceof Element && event.target.closest(".heart-fruit-open, .heart-fruit")) return;
    event.preventDefault();
    void beginFirstMeeting();
  }

  function handleTreeKeydown(event) {
    if (!specialFriendState?.isReady || specialFriendState?.isMet) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    void beginFirstMeeting();
  }

  function progressCopy(state) {
    if (!state) return "";
    if (state.isReady && !state.isMet) {
      return state.meetingStarted
        ? "기다리던 친구가 다시 찾아왔어요 · 나무를 눌러 만나기"
        : "나무가 누군가를 기다리듯 빛나고 있어요 · 눌러보기";
    }
    if (state.progressCount >= 2) return "나무 사이에 작은 꽃봉오리가 피었어요";
    if (state.progressCount >= 1) return "나무 끝에 작은 마음빛이 머물고 있어요";
    return "";
  }

  function renderTreeState() {
    if (!ensureCallLayer() || !specialFriendState) return;
    const { progressCount, isReady, isMet } = specialFriendState;
    treeWrap.classList.toggle("special-friend-progress-1", progressCount === 1 && !isReady && !isMet);
    treeWrap.classList.toggle("special-friend-progress-2", progressCount >= 2 && !isReady && !isMet);
    treeWrap.classList.toggle("special-friend-ready", isReady && !isMet);
    treeWrap.classList.toggle("special-friend-met", isMet);

    const actionable = isReady && !isMet;
    if (actionable) {
      treeWrap.setAttribute("role", "button");
      treeWrap.setAttribute("tabindex", "0");
      treeWrap.setAttribute("aria-label", "빛나는 나무를 눌러 특별친구 만나기");
    } else {
      treeWrap.removeAttribute("role");
      treeWrap.removeAttribute("tabindex");
      treeWrap.removeAttribute("aria-label");
    }

    const copy = progressCopy(specialFriendState);
    callHint.textContent = copy;
    callHint.classList.toggle("is-visible", Boolean(copy) && !isMet);
    callHint.disabled = !actionable;
  }

  function publishState() {
    if (!specialFriendState) return;
    window.__todayForestSpecialFriendLiveState = { ...specialFriendState };
    window.dispatchEvent(new CustomEvent("todayforest:special-friend-live-state", {
      detail: { ...specialFriendState },
    }));
  }

  function applyState(nextState) {
    if (!nextState) return;
    specialFriendState = nextState;
    renderTreeState();
    publishState();

    if (nextState.meetingStarted && !nextState.isMet && !autoResumeRequested) {
      autoResumeRequested = true;
      window.setTimeout(() => {
        if (!specialFriendState?.meetingStarted || specialFriendState?.isMet) return;
        const play = window.__todayForestReplayFriendCinematic;
        if (typeof play === "function") {
          play({ mode: "first-meeting" });
          toast("기다리던 특별친구와의 첫 만남을 이어갈게요.");
        } else {
          autoResumeRequested = false;
        }
      }, 950);
    }
  }

  async function currentSession() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function syncSpecialFriendState({ silent = true } = {}) {
    if (!supabase || syncInProgress) return specialFriendState;
    syncInProgress = true;
    try {
      if (isStatePreviewMode) {
        const next = previewState();
        applyState(next);
        return next;
      }
      const session = await currentSession();
      if (!session?.user) {
        specialFriendState = null;
        return null;
      }
      const { data, error } = await supabase.rpc("sync_my_garden_special_friend_state");
      if (error) throw error;
      const next = normalizeState(data);
      applyState(next);
      return next;
    } catch (error) {
      console.warn("TodayForest special-friend state sync skipped:", error);
      if (!silent) toast("특별친구의 마음빛을 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요.");
      return null;
    } finally {
      syncInProgress = false;
    }
  }

  async function beginFirstMeeting() {
    if (beginInProgress || specialFriendState?.isMet) return;
    if (!specialFriendState?.isReady) {
      toast("서로 다른 날에 마음을 남기면 나무가 조금씩 특별한 빛을 모아요.");
      return;
    }
    const play = window.__todayForestReplayFriendCinematic;
    if (typeof play !== "function") {
      toast("첫 만남 장면을 준비하고 있어요. 잠시 뒤 나무를 다시 눌러주세요.");
      return;
    }

    beginInProgress = true;
    treeWrap?.classList.add("special-friend-beginning");
    try {
      if (isStatePreviewMode) {
        autoResumeRequested = true;
        applyState({ ...specialFriendState, meetingStarted: true, meetingStartedAt: new Date().toISOString() });
        play({ mode: "first-meeting" });
        return;
      }
      const { data, error } = await supabase.rpc("begin_my_garden_special_friend_meeting");
      if (error) throw error;
      // 방금 사용자가 직접 시작한 장면은 자동 이어보기 타이머가 다시 재생하지 않게 합니다.
      autoResumeRequested = true;
      applyState(normalizeState(data));
      play({ mode: "first-meeting" });
    } catch (error) {
      console.error("TodayForest special-friend meeting start error:", error);
      const message = String(error?.message || "");
      toast(message.includes("SPECIAL_FRIEND_NOT_READY")
        ? "아직 나무의 마음빛이 조금 더 필요해요."
        : "첫 만남을 시작하지 못했어요. 잠시 뒤 다시 눌러주세요.");
    } finally {
      treeWrap?.classList.remove("special-friend-beginning");
      beginInProgress = false;
    }
  }

  window.__todayForestCompleteFirstMeeting = async () => {
    if (!supabase) return false;
    try {
      if (isStatePreviewMode) {
        const now = new Date().toISOString();
        applyState({ ...specialFriendState, isReady: true, meetingStarted: true, isMet: true, meetingStartedAt: specialFriendState?.meetingStartedAt || now, metAt: now });
        toast("DEV 확인용으로 숲 유니콘과의 첫 만남을 완료했어요 ♡", 4200);
        return true;
      }
      const { data, error } = await supabase.rpc("complete_my_garden_special_friend_meeting");
      if (error) throw error;
      autoResumeRequested = true;
      applyState(normalizeState(data));
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
      window.setTimeout(() => { void syncSpecialFriendState({ silent: false }); }, 250);
    });
    window.addEventListener("todayforest:friend-cinematic-ready", () => {
      if (specialFriendState?.meetingStarted && !specialFriendState?.isMet) {
        autoResumeRequested = false;
        applyState(specialFriendState);
      }
    });
    window.addEventListener("focus", () => { void syncSpecialFriendState(); });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void syncSpecialFriendState();
    });

    if (supabase?.auth?.onAuthStateChange) {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          window.setTimeout(() => { void syncSpecialFriendState(); }, 180);
        }
      });
      authSubscription = result?.data?.subscription || null;
    }
  }

  function init() {
    if (!supabase) {
      console.warn("TodayForest special-friend live: Supabase client not ready.");
      return;
    }
    ensureCallLayer();
    installListeners();
    void syncSpecialFriendState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("beforeunload", () => authSubscription?.unsubscribe?.(), { once: true });
}
