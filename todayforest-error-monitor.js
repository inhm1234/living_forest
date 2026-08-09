(function () {
  "use strict";

  const SENTRY_LOADER_URL =
    "https://js.sentry-cdn.com/f754df51c08eb77e79ba29fb50562211.min.js";

  const query = new URLSearchParams(window.location.search);
  const hostname = String(window.location.hostname || "").toLowerCase();
  const protocol = String(window.location.protocol || "").toLowerCase();

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");

  const isQa =
    query.get("qa") === "1" ||
    query.has("firstDayQa") ||
    query.has("welcomePreview") ||
    query.has("tutorialPreview") ||
    query.has("adPreview");

  // CI/local/QA pages must never report events to the production Sentry project.
  if (isLocal || isQa || (protocol !== "https:" && protocol !== "http:")) return;

  const pendingErrors = [];
  let sentryReady = false;

  function rememberError(error) {
    if (sentryReady || pendingErrors.length >= 10) return;
    if (error instanceof Error) pendingErrors.push(error);
  }

  function handleEarlyError(event) {
    if (event && event.error instanceof Error) {
      rememberError(event.error);
      return;
    }
    rememberError(new Error("Unhandled browser error before error monitor initialization"));
  }

  function handleEarlyRejection(event) {
    if (event && event.reason instanceof Error) {
      rememberError(event.reason);
      return;
    }
    // Do not copy arbitrary rejected values because they can contain user content.
    rememberError(new Error("Unhandled promise rejection before error monitor initialization"));
  }

  window.addEventListener("error", handleEarlyError);
  window.addEventListener("unhandledrejection", handleEarlyRejection);

  function sanitizeEvent(event) {
    // TodayForest does not intentionally send an identified Sentry user.
    delete event.user;
    delete event.extra;

    if (event.request) {
      if (event.request.url) {
        try {
          const cleanUrl = new URL(event.request.url, window.location.origin);
          event.request.url = cleanUrl.origin + cleanUrl.pathname;
        } catch (_) {
          delete event.request.url;
        }
      }
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.query_string;
      delete event.request.headers;
    }

    return event;
  }

  function initializeSentry() {
    if (!window.Sentry || typeof window.Sentry.onLoad !== "function") return;

    window.Sentry.onLoad(function () {
      window.Sentry.init({
        environment: "production",
        sendDefaultPii: false,

        // Error-only monitoring: no click/network/console/location breadcrumb trail.
        maxBreadcrumbs: 0,

        // Belt-and-suspenders safeguards. These products are also disabled
        // in the Sentry Loader Script project settings.
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,

        beforeSend: sanitizeEvent,
      });

      sentryReady = true;
      window.removeEventListener("error", handleEarlyError);
      window.removeEventListener("unhandledrejection", handleEarlyRejection);

      for (const error of pendingErrors.splice(0)) {
        window.Sentry.captureException(error);
      }
    });
  }

  const loader = document.createElement("script");
  loader.src = SENTRY_LOADER_URL;
  loader.crossOrigin = "anonymous";
  loader.async = true;
  loader.onload = initializeSentry;
  loader.onerror = function () {
    // Monitoring must never break or block the application itself.
    window.removeEventListener("error", handleEarlyError);
    window.removeEventListener("unhandledrejection", handleEarlyRejection);
  };
  document.head.appendChild(loader);
})();
