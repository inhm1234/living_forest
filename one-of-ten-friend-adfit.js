(() => {
  "use strict";

  const ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";
  const MOBILE_QUERY = "(min-width: 352px) and (max-width: 720px)";
  const DESKTOP_QUERY = "(min-width: 721px)";

  const AD_CONFIG = {
    lobby: {
      mobile: { unit: "DAN-FYBNJZfheCJMhdAu", width: 320, height: 50 },
      desktop: { unit: "DAN-18Qe2gN7RcKKO4TM", width: 320, height: 100 },
    },
    result: {
      mobile: { unit: "DAN-HKqiXZiFZdBSILUp", width: 320, height: 50 },
      desktop: { unit: "DAN-Y1g66zfoHZ82PH2B", width: 320, height: 100 },
    },
  };

  const mobileMedia = window.matchMedia(MOBILE_QUERY);
  const desktopMedia = window.matchMedia(DESKTOP_QUERY);
  const lobbyView = document.getElementById("lobbyView");
  const resultOverlay = document.getElementById("resultOverlay");

  const placements = {
    lobby: {
      section: document.getElementById("friendLobbyAdFitSection"),
      slot: document.getElementById("friendLobbyAdFitSlot"),
      requested: false,
      requestedMode: "",
      failCallback: "todayForestFriendLobbyAdFitFail",
    },
    result: {
      section: document.getElementById("friendResultAdFitSection"),
      slot: document.getElementById("friendResultAdFitSlot"),
      requested: false,
      requestedMode: "",
      failCallback: "todayForestFriendResultAdFitFail",
    },
  };

  if (!lobbyView || !resultOverlay || Object.values(placements).some(({ section, slot }) => !section || !slot)) return;

  const getMode = () => {
    if (mobileMedia.matches) return "mobile";
    if (desktopMedia.matches) return "desktop";
    return "";
  };

  const hidePlacement = (placement, state = "hidden") => {
    placement.section.dataset.adState = state;
    placement.section.classList.add("is-hidden");
  };

  window[placements.lobby.failCallback] = () => hidePlacement(placements.lobby, "no-ad");
  window[placements.result.failCallback] = () => hidePlacement(placements.result, "no-ad");

  const requestPlacement = (name, mode) => {
    const placement = placements[name];
    const config = AD_CONFIG[name]?.[mode];
    if (!placement || !config || placement.requested) return;

    placement.requested = true;
    placement.requestedMode = mode;
    placement.section.dataset.adMode = mode;
    placement.section.dataset.adState = "loading";

    const unit = document.createElement("ins");
    unit.className = "kakao_ad_area";
    unit.style.display = "none";
    unit.dataset.adUnit = config.unit;
    unit.dataset.adWidth = String(config.width);
    unit.dataset.adHeight = String(config.height);
    unit.dataset.adOnfail = placement.failCallback;
    placement.slot.replaceChildren(unit);

    // 광고 단위가 실제로 필요해지는 시점에 공식 SDK 스크립트를 함께 실행합니다.
    // 로비와 결과 광고는 서로 다른 시점에 열리므로 각 슬롯당 한 번만 요청합니다.
    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    script.dataset.todayforestFriendAdfit = name;
    script.addEventListener("load", () => {
      if (placement.section.dataset.adState !== "no-ad") {
        placement.section.dataset.adState = "ready";
      }
    }, { once: true });
    script.addEventListener("error", () => hidePlacement(placement, "error"), { once: true });
    document.body.appendChild(script);
  };

  const syncLobby = () => {
    const placement = placements.lobby;
    const mode = getMode();
    const visible = !lobbyView.classList.contains("is-hidden");
    const eligible = Boolean(mode) && visible && placement.section.dataset.adState !== "no-ad" && placement.section.dataset.adState !== "error";

    placement.section.classList.toggle("is-hidden", !eligible);
    if (!eligible) return;

    if (placement.requested) {
      placement.section.dataset.adMode = placement.requestedMode;
      return;
    }
    requestPlacement("lobby", mode);
  };

  const syncResult = () => {
    const placement = placements.result;
    const mode = getMode();
    const visible = !resultOverlay.classList.contains("is-hidden");
    const eligible = Boolean(mode) && visible && placement.section.dataset.adState !== "no-ad" && placement.section.dataset.adState !== "error";

    placement.section.classList.toggle("is-hidden", !eligible);
    if (!eligible) return;

    if (placement.requested) {
      placement.section.dataset.adMode = placement.requestedMode;
      return;
    }
    requestPlacement("result", mode);
  };

  const observer = new MutationObserver(() => {
    syncLobby();
    syncResult();
  });
  observer.observe(lobbyView, { attributes: true, attributeFilter: ["class"] });
  observer.observe(resultOverlay, { attributes: true, attributeFilter: ["class"] });

  mobileMedia.addEventListener?.("change", () => { syncLobby(); syncResult(); });
  desktopMedia.addEventListener?.("change", () => { syncLobby(); syncResult(); });
  window.addEventListener("pageshow", () => { syncLobby(); syncResult(); });

  syncLobby();
  syncResult();
})();
