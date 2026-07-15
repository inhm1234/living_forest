import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://xdcsppaptcmgpvnzgoab.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oMrSqUFX9UM1n4Ks-AhYKw_OvcZOfPs";
const VAPID_PUBLIC_KEY = "BDTxlizK_5G6jjdeDFibq9Zyzugu75fQXHbOBn-yQAM2xIDJpMV3Dam5Az4mUvCmJhV_LHNqOmJWeoRsIpf2x88";
const PRESENCE_INTERVAL_MS = 25000;
const BADGE_FALLBACK_INTERVAL_MS = 30000;
const INVITE_ACK_STORAGE_KEY = "todayForestOotAcknowledgedInvites";
const INVITE_TARGET_STORAGE_KEY = "todayForestOotPendingInvite";
const INVITE_SUPPRESS_STORAGE_KEY = "todayForestOotSuppressedInvitePopups";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" },
});

let currentUser = null;
let serviceWorkerRegistration = null;
let inviteChannel = null;
let presenceTimer = null;
let badgeTimer = null;
let currentIncomingInviteId = null;
let notificationBusy = false;

function getDeviceId() {
  const key = "todayForestDeviceId";
  let value = localStorage.getItem(key);
  if (!value || value.length < 8) {
    value = crypto.randomUUID?.() || `forest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, value);
  }
  return value;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function activityContext() {
  const path = location.pathname.toLowerCase();
  if (path.endsWith("one-of-ten-friend.html")) {
    return new URL(location.href).searchParams.get("match") ? "one_of_ten_match" : "one_of_ten_lobby";
  }
  return "app";
}

function inviteLobbyUrl(inviteId = "") {
  const url = new URL("./one-of-ten-friend.html", window.location.href);
  const normalizedInviteId = String(inviteId || "").trim();
  if (normalizedInviteId) url.searchParams.set("invite", normalizedInviteId);
  return url.href;
}

function openInviteLobby(inviteId = "") {
  const targetUrl = inviteLobbyUrl(inviteId);
  try {
    window.location.assign(targetUrl);
  } catch (error) {
    console.warn("TodayForest invite navigation fallback", error);
    window.location.href = targetUrl;
  }
}

function storedIdSet(key, storage = sessionStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveIdSet(key, ids, storage = sessionStorage) {
  try { storage.setItem(key, JSON.stringify([...ids].slice(-80))); } catch { /* ignore */ }
}

function suppressInvitePopup(inviteId) {
  const normalizedId = String(inviteId || "").trim();
  if (!normalizedId) return;
  const ids = storedIdSet(INVITE_SUPPRESS_STORAGE_KEY);
  ids.add(normalizedId);
  saveIdSet(INVITE_SUPPRESS_STORAGE_KEY, ids);
  try { sessionStorage.setItem(INVITE_TARGET_STORAGE_KEY, normalizedId); } catch { /* ignore */ }
}

function isInvitePopupSuppressed(inviteId) {
  return storedIdSet(INVITE_SUPPRESS_STORAGE_KEY).has(String(inviteId || ""));
}

function cleanupStoredInviteIds(activeIds) {
  const active = new Set(activeIds.map(String));
  const suppressed = storedIdSet(INVITE_SUPPRESS_STORAGE_KEY);
  const nextSuppressed = new Set([...suppressed].filter((id) => active.has(id)));
  saveIdSet(INVITE_SUPPRESS_STORAGE_KEY, nextSuppressed);

  const acknowledged = storedIdSet(INVITE_ACK_STORAGE_KEY, localStorage);
  const nextAcknowledged = new Set([...acknowledged].filter((id) => active.has(id)));
  saveIdSet(INVITE_ACK_STORAGE_KEY, nextAcknowledged, localStorage);
}

async function acknowledgeInviteOnce(inviteId) {
  const normalizedId = String(inviteId || "").trim();
  if (!normalizedId) return;
  const ids = storedIdSet(INVITE_ACK_STORAGE_KEY, localStorage);
  if (ids.has(normalizedId)) return;
  ids.add(normalizedId);
  saveIdSet(INVITE_ACK_STORAGE_KEY, ids, localStorage);
  try {
    await rpc("oot_ack_invite", { p_invite_id: normalizedId });
  } catch (error) {
    ids.delete(normalizedId);
    saveIdSet(INVITE_ACK_STORAGE_KEY, ids, localStorage);
    console.warn("TodayForest invite acknowledge skipped", error);
  }
}

async function closeInviteNotification(inviteId) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = serviceWorkerRegistration || await navigator.serviceWorker.getRegistration("./");
    const notifications = await registration?.getNotifications({ tag: `oot-invite-${inviteId}` });
    notifications?.forEach((notification) => notification.close());
  } catch (error) {
    console.warn("TodayForest notification close skipped", error);
  }
}

function bindInviteNavigation() {
  if (document.documentElement.dataset.ootInviteNavigationBound === "true") return;
  document.documentElement.dataset.ootInviteNavigationBound = "true";

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element
      ? event.target.closest("#ootGlobalInviteOpen, #ootOpenInvites")
      : null;
    if (!link) return;

    event.preventDefault();
    event.stopPropagation();
    const inviteId = link.dataset.inviteId || currentIncomingInviteId || "";
    suppressInvitePopup(inviteId);
    document.querySelector("#ootGlobalInviteDialog")?.classList.add("is-hidden");
    currentIncomingInviteId = null;
    void closeInviteNotification(inviteId);
    openInviteLobby(inviteId);
  }, true);
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function subscriptionKey(subscription, name) {
  const key = subscription.getKey(name);
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

function showLocalMessage(message) {
  const target = document.querySelector("#ootNotificationStatus") || document.querySelector("#ootReadyStatus");
  if (target) target.textContent = message;

  const toast = document.querySelector("#toast");
  if (toast) {
    toast.textContent = message;
    toast.classList.remove("is-hidden");
    window.setTimeout(() => toast.classList.add("is-hidden"), 3000);
  }
}

async function rpc(name, params = {}) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  if (serviceWorkerRegistration) return serviceWorkerRegistration;

  serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  await serviceWorkerRegistration.update().catch(() => {});
  await navigator.serviceWorker.ready;
  return serviceWorkerRegistration;
}

function notificationSupportMessage() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "이 브라우저에서는 웹 푸시 알림을 지원하지 않아요.";
  }
  if (isIos() && !isStandalone()) {
    return "아이폰은 Safari에서 오늘의숲을 홈 화면에 추가한 뒤, 그 아이콘으로 열어야 알림을 받을 수 있어요.";
  }
  if (Notification.permission === "denied") {
    return "브라우저 설정에서 오늘의숲 알림을 허용해 주세요.";
  }
  if (Notification.permission === "granted") return "원오브텐 초대 알림을 받을 수 있어요.";
  return "사이트를 닫아둬도 원오브텐 초대를 알려드려요.";
}

function refreshNotificationControls() {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const iosNeedsInstall = isIos() && !isStandalone();
  const granted = supported && Notification.permission === "granted";

  document.querySelectorAll("[data-oot-enable-push]").forEach((button) => {
    button.disabled = notificationBusy || !supported || Notification.permission === "denied";
    button.textContent = granted ? "초대 알림 켜짐" : iosNeedsInstall ? "홈 화면에 추가 필요" : "초대 알림 받기";
    button.classList.toggle("is-enabled", granted);
  });

  document.querySelectorAll("[data-oot-notification-status]").forEach((element) => {
    element.textContent = notificationSupportMessage();
  });
}

async function enablePushNotifications() {
  if (notificationBusy || !currentUser) return;

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    showLocalMessage("이 브라우저에서는 웹 푸시 알림을 지원하지 않아요.");
    return;
  }

  if (isIos() && !isStandalone()) {
    showLocalMessage("Safari 공유 메뉴에서 ‘홈 화면에 추가’한 뒤 오늘의숲 아이콘으로 다시 열어 주세요.");
    refreshNotificationControls();
    return;
  }

  notificationBusy = true;
  refreshNotificationControls();

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      showLocalMessage(permission === "denied" ? "알림이 차단됐어요. 브라우저 설정에서 허용할 수 있어요." : "알림 허용을 다음에 다시 선택할 수 있어요.");
      return;
    }

    const registration = await registerServiceWorker();
    if (!registration) throw new Error("SERVICE_WORKER_UNAVAILABLE");

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    await rpc("oot_upsert_push_subscription", {
      p_device_id: getDeviceId(),
      p_endpoint: subscription.endpoint,
      p_p256dh: subscriptionKey(subscription, "p256dh"),
      p_auth_secret: subscriptionKey(subscription, "auth"),
      p_user_agent: navigator.userAgent,
    });

    showLocalMessage("원오브텐 초대 알림을 켰어요.");
  } catch (error) {
    console.warn("TodayForest push subscription error", error);
    showLocalMessage("알림 연결이 어긋났어요. 잠시 후 다시 눌러 주세요.");
  } finally {
    notificationBusy = false;
    refreshNotificationControls();
  }
}

async function syncExistingSubscription() {
  if (!currentUser || Notification.permission !== "granted") return;
  try {
    const registration = await registerServiceWorker();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await rpc("oot_upsert_push_subscription", {
      p_device_id: getDeviceId(),
      p_endpoint: subscription.endpoint,
      p_p256dh: subscriptionKey(subscription, "p256dh"),
      p_auth_secret: subscriptionKey(subscription, "auth"),
      p_user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.warn("TodayForest push sync skipped", error);
  }
}

function bindNotificationButtons() {
  document.querySelectorAll("[data-oot-enable-push]").forEach((button) => {
    if (button.dataset.ootBound === "true") return;
    button.dataset.ootBound = "true";
    button.addEventListener("click", enablePushNotifications);
  });
  refreshNotificationControls();
}

async function touchPresence() {
  if (!currentUser || document.hidden) return;
  try {
    await rpc("oot_touch_presence", {
      p_device_id: getDeviceId(),
      p_activity_context: activityContext(),
      p_match_id: new URL(location.href).searchParams.get("match") || null,
    });
  } catch (error) {
    console.warn("TodayForest presence touch skipped", error);
  }
}

function startPresence() {
  window.clearInterval(presenceTimer);
  void touchPresence();
  presenceTimer = window.setInterval(touchPresence, PRESENCE_INTERVAL_MS);
}

function setBadge(count) {
  const value = Math.max(0, Number(count || 0));
  const texts = document.querySelectorAll("[data-oot-invite-count]");
  texts.forEach((element) => {
    element.textContent = String(value);
  });

  document.querySelectorAll("[data-oot-invite-badge]").forEach((element) => {
    element.hidden = value <= 0;
    element.textContent = value > 0 ? `초대 ${value}` : "";
  });

  const openLink = document.querySelector("#ootOpenInvites");
  if (openLink) openLink.hidden = value <= 0;

  if ("setAppBadge" in navigator) {
    if (value > 0) navigator.setAppBadge(value).catch(() => {});
    else navigator.clearAppBadge?.().catch(() => {});
  }
}

async function loadBadge() {
  if (!currentUser) return;
  try {
    const badge = await rpc("oot_get_invite_badge");
    setBadge(badge?.incomingCount || 0);
  } catch (error) {
    console.warn("TodayForest invite badge skipped", error);
  }
}

async function friendMap() {
  try {
    const rows = await rpc("list_my_garden_friends");
    return new Map((Array.isArray(rows) ? rows : []).map((friend) => [
      String(friend.friend_id || friend.id || ""),
      { nickname: friend.nickname || friend.name || "친구", avatarUrl: friend.avatar_url || "" },
    ]));
  } catch {
    return new Map();
  }
}

function ensureInviteDialog() {
  let dialog = document.querySelector("#ootGlobalInviteDialog");
  if (dialog) return dialog;

  dialog = document.createElement("section");
  dialog.id = "ootGlobalInviteDialog";
  dialog.className = "oot-global-invite is-hidden";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "ootGlobalInviteTitle");
  dialog.innerHTML = `
    <div class="oot-global-invite-card">
      <span class="oot-global-invite-icon" aria-hidden="true">🎴</span>
      <p>ONE OF TEN</p>
      <h2 id="ootGlobalInviteTitle">원오브텐 초대가 도착했어요</h2>
      <span id="ootGlobalInviteText">친구가 한 판을 기다리고 있어요.</span>
      <div>
        <a id="ootGlobalInviteOpen" href="one-of-ten-friend.html">초대 보기</a>
        <button id="ootGlobalInviteDecline" type="button">다음에 할게요</button>
      </div>
    </div>`;
  document.body.append(dialog);

  dialog.querySelector("#ootGlobalInviteDecline")?.addEventListener("click", async () => {
    if (!currentIncomingInviteId) return;
    const button = dialog.querySelector("#ootGlobalInviteDecline");
    button.disabled = true;
    try {
      await rpc("oot_decline_invite", { p_invite_id: currentIncomingInviteId });
      dialog.classList.add("is-hidden");
      suppressInvitePopup(currentIncomingInviteId);
      void closeInviteNotification(currentIncomingInviteId);
      currentIncomingInviteId = null;
      await loadBadge();
    } catch (error) {
      console.warn("TodayForest invite decline error", error);
      showLocalMessage("초대 상태를 다시 확인해 주세요.");
    } finally {
      button.disabled = false;
    }
  });

  return dialog;
}

async function showLatestIncomingInvite() {
  if (!currentUser || location.pathname.toLowerCase().endsWith("one-of-ten-friend.html")) return;

  try {
    const [rows, friends] = await Promise.all([rpc("oot_list_my_invites_v2"), friendMap()]);
    const incomingRows = (Array.isArray(rows) ? rows : []).filter((item) => item.direction === "incoming");
    cleanupStoredInviteIds(incomingRows.map((item) => item.invite_id));
    const incoming = incomingRows.find((item) => !isInvitePopupSuppressed(item.invite_id));
    if (!incoming) {
      document.querySelector("#ootGlobalInviteDialog")?.classList.add("is-hidden");
      currentIncomingInviteId = null;
      return;
    }

    const inviteId = String(incoming.invite_id);
    if (currentIncomingInviteId === inviteId) return;

    const friend = friends.get(String(incoming.other_user_id));
    const name = friend?.nickname || incoming.other_nickname || "친구";
    const dialog = ensureInviteDialog();
    currentIncomingInviteId = inviteId;
    dialog.querySelector("#ootGlobalInviteText").textContent = `${name}님이 원오브텐 한 판을 초대했어요.`;
    const openLink = dialog.querySelector("#ootGlobalInviteOpen");
    openLink.href = inviteLobbyUrl(inviteId);
    openLink.dataset.inviteId = inviteId;
    dialog.classList.remove("is-hidden");

    await acknowledgeInviteOnce(inviteId);
  } catch (error) {
    console.warn("TodayForest incoming invite popup skipped", error);
  }
}

async function refreshInvites() {
  await loadBadge();
  await showLatestIncomingInvite();
}

async function subscribeInvites() {
  if (!currentUser) return;
  if (inviteChannel) await supabase.removeChannel(inviteChannel);

  inviteChannel = supabase
    .channel(`oot-global-invites-${currentUser.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "oot_invites" }, () => {
      void refreshInvites();
    })
    .subscribe();
}

function bindGameReadyButton() {
  const button = document.querySelector("#ootGameReadyButton");
  if (!button || button.dataset.ootBound === "true") return;
  button.dataset.ootBound = "true";

  const status = document.querySelector("#ootReadyStatus");
  const storageKey = "ootGameReadyUntil";

  function render() {
    const until = Number(localStorage.getItem(storageKey) || 0);
    const ready = until > Date.now();
    button.classList.toggle("is-ready", ready);
    button.textContent = ready ? "한 판 가능 상태 끄기" : "10분 동안 한 판 가능";
    if (status) status.textContent = ready
      ? "친구에게 ‘지금 한 판 가능’으로 보여요. 10분 뒤 자동으로 꺼져요."
      : "켜지 않아도 초대는 받을 수 있고, 알림으로 놓치지 않게 전달해요.";
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const currentUntil = Number(localStorage.getItem(storageKey) || 0);
      const nextReady = currentUntil <= Date.now();
      const result = await rpc("oot_set_game_ready", { p_device_id: getDeviceId(), p_ready: nextReady });
      if (nextReady) localStorage.setItem(storageKey, String(Date.parse(result?.gameReadyUntil) || Date.now() + 10 * 60 * 1000));
      else localStorage.removeItem(storageKey);
      render();
      window.dispatchEvent(new CustomEvent("oot-game-ready-changed"));
    } catch (error) {
      console.warn("TodayForest game ready error", error);
      showLocalMessage("한 판 가능 상태를 다시 확인해 주세요.");
    } finally {
      button.disabled = false;
    }
  });

  render();
  window.setInterval(render, 30000);
}

async function initialize() {
  console.info("TodayForest OneOfTen Notifications v0.5 · Invite Loop Fix");
  bindInviteNavigation();
  bindNotificationButtons();
  bindGameReadyButton();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  currentUser = session.user;

  document.querySelectorAll("[data-oot-auth-only]").forEach((element) => {
    element.hidden = false;
  });

  await registerServiceWorker().catch((error) => console.warn("TodayForest service worker skipped", error));
  await syncExistingSubscription();
  startPresence();
  await refreshInvites();
  await subscribeInvites();

  window.clearInterval(badgeTimer);
  badgeTimer = window.setInterval(loadBadge, BADGE_FALLBACK_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void touchPresence();
      void refreshInvites();
    }
  });

  window.addEventListener("focus", () => void refreshInvites());
}

initialize().catch((error) => console.warn("TodayForest notification module skipped", error));
