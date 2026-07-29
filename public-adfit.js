(() => {
  "use strict";

  const ADFIT_SCRIPT_SRC = "https://t1.daumcdn.net/kas/static/ba.min.js";
  const ADFIT_BREAKPOINT = "(max-width: 720px)";
  const ADFIT_FORMATS = {
    desktop: {
      unit: "DAN-wHmCYjCLZPtHGUjb",
      width: "320",
      height: "100",
      name: "desktop"
    },
    mobile: {
      unit: "DAN-aiumjldQWepYQHoo",
      width: "320",
      height: "50",
      name: "mobile"
    }
  };
  // 광고 스크립트가 실행된 뒤 슬롯 크기를 바꾸지 않도록 최초 진입 폭에서 형식을 고정합니다.
  const adFormat = window.matchMedia(ADFIT_BREAKPOINT).matches
    ? ADFIT_FORMATS.mobile
    : ADFIT_FORMATS.desktop;

  const publicHome = document.getElementById("publicHome");
  const publicSection = document.getElementById("publicAdFitSection");
  const publicSlot = document.getElementById("publicAdFitSlot");
  const gardenApp = document.getElementById("gardenApp");
  const gardenSection = document.getElementById("gardenAdFitSection");
  const gardenSlot = document.getElementById("gardenAdFitSlot");
  const todayAction = document.getElementById("openRecord");

  if (!publicHome || !publicSection || !publicSlot || !gardenApp || !gardenSection || !gardenSlot) return;

  publicSection.dataset.adFormat = adFormat.name;
  gardenSection.dataset.adFormat = adFormat.name;

  const params = new URL(window.location.href).searchParams;
  const forceGardenPreview = params.get("adPreview") === "1";
  const qaRequested = params.get("qa") === "1"
    || params.has("firstDayQa")
    || params.has("welcomePreview")
    || params.has("tutorialPreview");
  const suppressForQa = qaRequested && !forceGardenPreview;

  let activeSurface = "";
  let adUnitElement = null;
  let scriptRequested = false;
  let syncQueued = false;

  const publicHomeIsActive = () => (
    !suppressForQa
    && document.body.classList.contains("is-public-home")
    && !publicHome.classList.contains("hidden")
  );

  const gardenIsActive = () => !gardenApp.classList.contains("hidden");

  const gardenAdIsEligible = () => (
    gardenIsActive()
    && !suppressForQa
    && (forceGardenPreview || todayAction?.classList.contains("record-complete"))
  );

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

  const requestAdFit = (surface) => {
    if (scriptRequested) return;
    scriptRequested = true;

    const section = surface === "garden" ? gardenSection : publicSection;
    section.dataset.adState = "loading";

    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    script.dataset.todayforestAdfit = surface;
    script.addEventListener("load", () => {
      section.dataset.adState = "ready";
    }, { once: true });
    script.addEventListener("error", () => {
      section.dataset.adState = "error";
    }, { once: true });
    document.body.appendChild(script);
  };

  const activateSurface = (surface) => {
    if (activeSurface === surface) return;

    activeSurface = surface;
    publicSection.classList.toggle("hidden", surface !== "public");
    gardenSection.classList.toggle("hidden", surface !== "garden");

    if (!surface) return;

    const slot = surface === "garden" ? gardenSlot : publicSlot;
    slot.appendChild(ensureUnit());
    requestAdFit(surface);
  };

  const sync = () => {
    syncQueued = false;

    if (publicHomeIsActive()) {
      activateSurface("public");
      return;
    }

    if (gardenAdIsEligible()) {
      activateSurface("garden");
      return;
    }

    activateSurface("");
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  observer.observe(publicHome, { attributes: true, attributeFilter: ["class"] });
  observer.observe(gardenApp, { attributes: true, attributeFilter: ["class"] });
  if (todayAction) observer.observe(todayAction, { attributes: true, attributeFilter: ["class"] });

  window.addEventListener("todayforest:garden-record-saved", queueSync);
  window.addEventListener("pageshow", queueSync);
  queueSync();
})();
