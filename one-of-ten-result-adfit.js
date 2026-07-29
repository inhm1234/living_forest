(() => {
  "use strict";

  const ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";
  const MOBILE_RESULT_QUERY = "(min-width: 352px) and (max-width: 720px)";
  const DESKTOP_RESULT_QUERY = "(min-width: 721px)";
  const AD_CONFIG = {
    mobile: {
      unit: "DAN-q2dc2u1sCaoGL9mj",
      width: 320,
      height: 50,
    },
    desktop: {
      unit: "DAN-KyKlGw8DnjwwbegX",
      width: 320,
      height: 100,
    },
  };

  const resultOverlay = document.getElementById("resultOverlay");
  const adSection = document.getElementById("resultAdFitSection");
  const adSlot = document.getElementById("resultAdFitSlot");

  if (!resultOverlay || !adSection || !adSlot) return;

  const mobileResult = window.matchMedia(MOBILE_RESULT_QUERY);
  const desktopResult = window.matchMedia(DESKTOP_RESULT_QUERY);
  let adRequested = false;
  let requestedMode = "";

  const resultIsOpen = () => !resultOverlay.classList.contains("is-hidden");

  const getMode = () => {
    if (mobileResult.matches) return "mobile";
    if (desktopResult.matches) return "desktop";
    return "";
  };

  const ensureAd = (mode) => {
    if (!mode || adRequested) return;

    const config = AD_CONFIG[mode];
    if (!config) return;

    adRequested = true;
    requestedMode = mode;
    adSection.dataset.adMode = mode;
    adSection.dataset.adState = "loading";

    const unit = document.createElement("ins");
    unit.className = "kakao_ad_area";
    unit.style.display = "none";
    unit.dataset.adUnit = config.unit;
    unit.dataset.adWidth = String(config.width);
    unit.dataset.adHeight = String(config.height);
    adSlot.replaceChildren(unit);

    const existingScript = document.querySelector('script[data-todayforest-adfit-sdk="true"]');
    if (existingScript) {
      adSection.dataset.adState = "ready";
      return;
    }

    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    script.dataset.todayforestAdfitSdk = "true";
    script.addEventListener("load", () => {
      adSection.dataset.adState = "ready";
    }, { once: true });
    script.addEventListener("error", () => {
      adSection.dataset.adState = "error";
    }, { once: true });
    document.body.appendChild(script);
  };

  const sync = () => {
    const mode = getMode();
    const eligible = Boolean(mode) && resultIsOpen();

    adSection.classList.toggle("is-hidden", !eligible);
    if (!eligible) return;

    // 한 세션에서 광고 요청 후 화면 폭이 바뀌더라도 이미 요청한 슬롯은 유지합니다.
    if (adRequested) {
      adSection.dataset.adMode = requestedMode;
      return;
    }

    ensureAd(mode);
  };

  const observer = new MutationObserver(sync);
  observer.observe(resultOverlay, { attributes: true, attributeFilter: ["class"] });
  mobileResult.addEventListener?.("change", sync);
  desktopResult.addEventListener?.("change", sync);
  window.addEventListener("pageshow", sync);
  sync();
})();
