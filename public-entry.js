const APP_URL = "/app.html";
const APP_QUERY_KEYS = new Set([
  "code", "invite", "sharedMemory", "sharedTree", "togetherForest",
  "qa", "firstDayQa", "welcomePreview", "tutorialPreview", "adPreview",
  "animalPreview", "interactionPreview", "statusPreview", "growthPreview",
  "heartFruitCountPreview", "heartFruitReveal", "receivedPreview",
  "retentionTest", "retentionReset", "retentionCleanup", "visitorKind",
  "weatherPreview"
]);

function appDestination() {
  return `${APP_URL}${window.location.search || ""}${window.location.hash || ""}`;
}

function hasAppIntent() {
  const params = new URLSearchParams(window.location.search);
  return [...params.keys()].some((key) => APP_QUERY_KEYS.has(key));
}

function goToApp({ replace = false } = {}) {
  const destination = appDestination();
  if (replace) window.location.replace(destination);
  else window.location.assign(destination);
}

document.querySelectorAll("[data-public-login]").forEach((control) => {
  control.addEventListener("click", () => goToApp());
});

// 친구 초대·공유 기억·OAuth 콜백 같은 앱 전용 주소는 공개 랜딩에 머물지 않습니다.
if (hasAppIntent()) {
  goToApp({ replace: true });
} else {
  // 앱 전용 의도가 없을 때만 Supabase SDK를 불러옵니다. OAuth code 전달은 CDN 상태와 무관하게 즉시 실행됩니다.
  import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(({ createClient }) => {
    const supabase = createClient(
      "https://xdcsppaptcmgpvnzgoab.supabase.co",
      "sb_publishable_oMrSqUFX9UM1n4Ks-AhYKw_OvcZOfPs",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      }
    );

    // 이미 로그인된 사용자는 기존처럼 루트 주소만 열어도 내 정원으로 이어집니다.
    return supabase.auth.getSession();
  }).then(({ data }) => {
    if (data?.session?.user) goToApp({ replace: true });
  }).catch(() => {
    // 세션 확인 실패 시 공개 소개 화면을 그대로 유지합니다.
  });
}
