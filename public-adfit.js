(() => {
  "use strict";

  const ADFIT_SCRIPT_SRC = "https://t1.daumcdn.net/kas/static/ba.min.js";
  const publicHome = document.getElementById("publicHome");
  const adSection = document.getElementById("publicAdFitSection");
  const adSlot = document.getElementById("publicAdFitSlot");

  if (!publicHome || !adSection || !adSlot) return;

  let scriptRequested = false;
  let syncQueued = false;

  const isPublicHomeActive = () => (
    document.body.classList.contains("is-public-home") &&
    !publicHome.classList.contains("hidden")
  );

  const requestAdFit = () => {
    syncQueued = false;
    if (scriptRequested || !isPublicHomeActive()) return;

    scriptRequested = true;
    adSection.dataset.adState = "loading";

    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    script.dataset.todayforestAdfit = "public-home";
    script.addEventListener("load", () => {
      adSection.dataset.adState = "ready";
    }, { once: true });
    script.addEventListener("error", () => {
      adSection.dataset.adState = "error";
    }, { once: true });
    document.body.appendChild(script);
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(requestAdFit);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  observer.observe(publicHome, {
    attributes: true,
    attributeFilter: ["class"],
  });

  window.addEventListener("pageshow", queueSync);
  queueSync();
})();
