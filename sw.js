// 오늘의숲 운영 PWA + 원오브텐 웹 푸시 v0.5 · 중복 초대 알림 방지
// 화면 파일은 캐시하지 않아 배포 직후 최신 코드를 읽습니다.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "친구가 원오브텐 한 판을 초대했어요." };
  }

  const title = payload.title || "원오브텐 한 판 초대";
  const inviteUrl = payload.url || (payload.inviteId
    ? `./one-of-ten-friend.html?invite=${encodeURIComponent(payload.inviteId)}`
    : "./one-of-ten-friend.html");
  const options = {
    body: payload.body || "친구가 한 판을 기다리고 있어요. 눌러서 확인해 보세요.",
    icon: payload.icon || "./assets/pwa/icon-192.png",
    badge: payload.badge || "./assets/pwa/icon-192.png",
    tag: payload.tag || (payload.inviteId ? `oot-invite-${payload.inviteId}` : "oot-invite"),
    renotify: false,
    requireInteraction: false,
    actions: [{ action: "open_invite", title: "초대장 보기" }],
    data: {
      url: inviteUrl,
      inviteId: payload.inviteId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "./one-of-ten-friend.html",
    self.registration.scope
  ).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    const exactWindow = windows.find((client) => client.url === targetUrl);
    if (exactWindow) return exactWindow.focus();

    for (const client of windows) {
      let sameOrigin = false;
      try {
        sameOrigin = new URL(client.url).origin === self.location.origin;
      } catch {
        sameOrigin = false;
      }
      if (!sameOrigin) continue;

      if (typeof client.navigate === "function") {
        try {
          const navigatedClient = await client.navigate(targetUrl);
          return (navigatedClient || client).focus();
        } catch {
          // 기존 창 이동이 거절되면 새 창 열기로 계속 진행합니다.
        }
      }
    }

    const openedWindow = await self.clients.openWindow(targetUrl);
    return openedWindow?.focus?.();
  })());
});
