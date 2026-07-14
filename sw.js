// 오늘의숲 운영 PWA + 원오브텐 웹 푸시 v0.3
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
  const options = {
    body: payload.body || "친구가 한 판을 기다리고 있어요. 눌러서 확인해 보세요.",
    icon: payload.icon || "./assets/pwa/icon-192.png",
    badge: payload.badge || "./assets/pwa/icon-192.png",
    tag: payload.tag || (payload.inviteId ? `oot-invite-${payload.inviteId}` : "oot-invite"),
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.url || "./one-of-ten-friend.html",
      inviteId: payload.inviteId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "./one-of-ten-friend.html", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(targetUrl).catch(() => {});
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
