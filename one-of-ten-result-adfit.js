(() => {
  "use strict";

  const ADFIT_UNIT = "DAN-q2dc2u1sCaoGL9mj";
  const ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";
  const MOBILE_RESULT_QUERY = "(min-width: 352px) and (max-width: 720px)";

  const resultOverlay = document.getElementById("resultOverlay");
  const adSection = document.getElementById("resultAdFitSection");
  const adSlot = document.getElementById("resultAdFitSlot");

  if (!resultOverlay || !adSection || !adSlot) return;

  const mobileResult = window.matchMedia(MOBILE_RESULT_QUERY);
  let adRequested = false;

  const resultIsOpen = () => !resultOverlay.classList.contains("is-hidden");

  const ensureAd = () => {
    if (adRequested) return;
    adRequested = true;
    adSection.dataset.adState = "loading";

    const unit = document.createElement("ins");
    unit.className = "kakao_ad_area";
    unit.style.display = "none";
    unit.dataset.adUnit = ADFIT_UNIT;
    unit.dataset.adWidth = "320";
    unit.dataset.adHeight = "50";
    adSlot.replaceChildren(unit);

    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    script.dataset.todayforestAdfit = "one-of-ten-result";
    script.addEventListener("load", () => {
      adSection.dataset.adState = "ready";
    }, { once: true });
    script.addEventListener("error", () => {
      adSection.dataset.adState = "error";
    }, { once: true });
    document.body.appendChild(script);
  };

  const sync = () => {
    const eligible = mobileResult.matches && resultIsOpen();
    adSection.classList.toggle("is-hidden", !eligible);
    if (eligible) ensureAd();
  };

  const observer = new MutationObserver(sync);
  observer.observe(resultOverlay, { attributes: true, attributeFilter: ["class"] });
  mobileResult.addEventListener?.("change", sync);
  window.addEventListener("pageshow", sync);
  sync();
})();
