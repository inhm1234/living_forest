// 오늘의숲 DEV PWA: 설치 가능 상태만 준비합니다.
// 정원 데이터와 화면 파일은 캐시하지 않아 배포 직후에도 최신 코드를 그대로 읽습니다.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
