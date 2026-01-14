(function () {
  "use strict";

  var script =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  if (!script) return;

  var trackingId = script.getAttribute("data-tracking-id");
  if (!trackingId) return;

  var endpoint = script.getAttribute("data-endpoint") || "/api/track";
  var sessionKey = "fa_session_id";

  function generateId() {
    if (window.crypto && window.crypto.getRandomValues) {
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      var out = "";
      for (var i = 0; i < bytes.length; i += 1) {
        out += bytes[i].toString(16).padStart(2, "0");
      }
      return out;
    }
    return String(Math.random()).slice(2) + String(Date.now());
  }

  function getSessionId() {
    try {
      var existing = window.sessionStorage.getItem(sessionKey);
      if (existing) return existing;
      var fresh = generateId();
      window.sessionStorage.setItem(sessionKey, fresh);
      return fresh;
    } catch (err) {
      if (!window.__fa_session_id) {
        window.__fa_session_id = generateId();
      }
      return window.__fa_session_id;
    }
  }

  function getDeviceType(ua) {
    if (/iPad|Tablet/i.test(ua)) return "tablet";
    if (/Mobi|Android/i.test(ua)) return "mobile";
    return "desktop";
  }

  function getOS(ua) {
    if (/Windows NT/i.test(ua)) return "Windows";
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Mac OS X/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Unknown";
  }

  function getBrowser(ua) {
    if (/Edg\//i.test(ua)) return "Edge";
    if (/Chrome\//i.test(ua)) return "Chrome";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/Safari\//i.test(ua)) return "Safari";
    return "Unknown";
  }

  function sendEvent(payload) {
    var body = JSON.stringify(payload);
    try {
      if (window.fetch) {
        window
          .fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body,
            keepalive: true,
            mode: "cors",
          })
          .catch(function () {
            tryBeacon(body);
          });
        return;
      }
    } catch (err) {
      // Fall through to sendBeacon.
    }
    tryBeacon(body);
  }

  function tryBeacon(body) {
    try {
      if (!navigator.sendBeacon) return;
      navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: "application/json" })
      );
    } catch (err) {
      // Swallow errors to keep script non-blocking.
    }
  }

  var ua = navigator.userAgent || "";
  var payload = {
    tracking_id: trackingId,
    session_id: getSessionId(),
    event_type: "page_view",
    event_payload: {
      page: {
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
      },
      device: {
        user_agent: ua,
        device_type: getDeviceType(ua),
        os_name: getOS(ua),
        browser_name: getBrowser(ua),
      },
      referrer: document.referrer || "",
      timestamp: new Date().toISOString(),
    },
  };

  sendEvent(payload);
})();

