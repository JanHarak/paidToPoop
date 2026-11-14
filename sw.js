// Bump CACHE whenever the manifest or icons change (they are cache-first and never refreshed otherwise).
var CACHE = "zachodova-v2";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function put(req, res) {
  if (res && res.ok) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
  }
  return res;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) { return put(req, res); }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match("./index.html"); });
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    var path = url.pathname;
    var shell = SHELL.some(function (f) { return new URL(f, self.location.href).pathname === path; }) || path.indexOf("/icons/") !== -1;
    if (!shell) return;
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { return put(req, res); });
      })
    );
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { return put(req, res); }).catch(function () { return hit || Response.error(); });
        return hit || net;
      })
    );
  }
});
