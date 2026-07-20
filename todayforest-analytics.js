(() => {
  "use strict";

  const query = new URLSearchParams(window.location.search);
  const isDevPath = /\/dev(?:\/|$)/.test(window.location.pathname);
  const config = window.TODAYFOREST_ANALYTICS || {
    measurementId: "G-YC872G7MH1",
    enabled: !isDevPath,
    debug: query.get("analyticsDebug") === "1",
    build: isDevPath ? "dev" : "operation",
  };

  window.TODAYFOREST_ANALYTICS = config;

  function safeValue(value) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "boolean") return value ? "yes" : "no";
    return String(value).slice(0, 40);
  }

  function track(eventName, params = {}) {
    try {
      const payload = {
        app_area: "one_of_ten",
        build: config.build || "unknown",
      };

      Object.entries(params).forEach(([key, value]) => {
        const normalized = safeValue(value);
        if (normalized !== undefined) payload[key] = normalized;
      });

      if (config.enabled && typeof window.gtag === "function") {
        window.gtag("event", eventName, payload);
      }

      if (config.debug) {
        window.__todayForestAnalyticsEvents = window.__todayForestAnalyticsEvents || [];
        window.__todayForestAnalyticsEvents.push({ eventName, payload, at: new Date().toISOString() });
        console.info("[TodayForest analytics]", eventName, payload);
      }
    } catch (error) {
      console.warn("TodayForest analytics skipped:", error);
    }
  }

  function trackOnce(eventName, dedupeKey, params = {}) {
    const normalizedKey = String(dedupeKey || "").trim();
    if (!normalizedKey) {
      track(eventName, params);
      return true;
    }

    const storageKey = `todayforest:analytics:${eventName}:${normalizedKey}`;
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") return false;
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // 저장소 사용이 막힌 환경에서도 이벤트 자체는 전송합니다.
    }

    track(eventName, params);
    return true;
  }

  window.trackTodayForestEvent = window.trackTodayForestEvent || track;
  window.trackTodayForestEventOnce = window.trackTodayForestEventOnce || trackOnce;

  if (!config.enabled || !config.measurementId || typeof window.gtag === "function") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", config.measurementId, { send_page_view: true });

  const tag = document.createElement("script");
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.measurementId)}`;
  document.head.appendChild(tag);
})();
