(() => {
  "use strict";

  const ADFIT_SCRIPT_SRC = "https://t1.daumcdn.net/kas/static/ba.min.js";
  const ADFIT_BREAKPOINT = "(max-width: 720px)";
  const ADFIT_FORMATS = {
    desktop: { unit: "DAN-wHmCYjCLZPtHGUjb", width: "320", height: "100", name: "desktop" },
    mobile: { unit: "DAN-aiumjldQWepYQHoo", width: "320", height: "50", name: "mobile" }
  };

  // 애드센스 재심사 준비 기간에는 공개 소개 화면에서 타사 광고를 호출하지 않습니다.
  // 로그인 후 내 정원 광고는 마음 기록 여부와 관계없이 기존처럼 유지합니다.
  const adFormat = window.matchMedia(ADFIT_BREAKPOINT).matches
    ? ADFIT_FORMATS.mobile
    : ADFIT_FORMATS.desktop;

  const gardenApp = document.getElementById("gardenApp");
  const gardenSection = document.getElementById("gardenAdFitSection");
  const gardenSlot = document.getElementById("gardenAdFitSlot");
  if (!gardenApp || !gardenSection || !gardenSlot) return;

  gardenSection.dataset.adFormat = adFormat.name;

  const params = new URL(window.location.href).searchParams;
  const forceGardenPreview = params.get("adPreview") === "1";
  const qaRequested = params.get("qa") === "1"
    || params.has("firstDayQa")
    || params.has("welcomePreview")
    || params.has("tutorialPreview");
  const suppressForQa = qaRequested && !forceGardenPreview;

  let adUnitElement = null;
  let scriptRequested = false;
  let syncQueued = false;

  const gardenIsActive = () => !gardenApp.classList.contains("hidden");
  const gardenAdIsEligible = () => gardenIsActive() && !suppressForQa;

  const ensureUnit = () => {
    if (adUnitElement) return adUnitElement;
    adUnitElement = document.createElement("ins");
    adUnitElement.className = "kakao_ad_area";
    adUnitElement.style.display = "none";
    adUnitElement.dataset.adUnit = adFormat.unit;
    adUnitElement.dataset.adWidth = adFormat.width;
    adUnitElement.dataset.adHeight = adFormat.height;
    return adUnitElement;
  };

  const requestAdFit = () => {
    if (scriptRequested) return;
    scriptRequested = true;
    gardenSection.dataset.adState = "loading";

    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    script.dataset.todayforestAdfit = "garden";
    script.addEventListener("load", () => {
      gardenSection.dataset.adState = "ready";
    }, { once: true });
    script.addEventListener("error", () => {
      gardenSection.dataset.adState = "error";
    }, { once: true });
    document.body.appendChild(script);
  };

  const sync = () => {
    syncQueued = false;
    const active = gardenAdIsEligible();
    document.body.classList.toggle("is-garden-adfit-active", active);
    gardenSection.classList.toggle("hidden", !active);
    if (!active) return;

    gardenSlot.appendChild(ensureUnit());
    requestAdFit();
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(gardenApp, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("pageshow", queueSync);
  queueSync();
})();
