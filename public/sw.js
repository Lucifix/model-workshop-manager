// Kill switch for the service worker registered by the pre-merge PWA build.
//
// The frontend/backend merge (see git history) dropped vite-plugin-pwa
// without a replacement, so this app no longer serves a real service
// worker. Any phone that had the PWA installed before that merge still has
// the *old* worker active — cache-first, precaching the old app shell —
// and since /sw.js used to 404-equivalent (fell through to the SPA's HTML
// document), its update checks failed silently and it never got replaced.
//
// This worker's only job is to get installed in that stale worker's place,
// then immediately unregister itself and clear its caches, so the page
// falls back to talking to the server directly like every other client
// already does. Once every installed PWA has picked this up, it can be
// deleted — see the tracking issue for re-adding real PWA support.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.registration.unregister();

      const clients = await self.clients.matchAll({ type: "window" });
      // navigate() isn't supported everywhere — allSettled means one
      // client's failure doesn't block the rest; unsupported clients still
      // lose their stale service worker on their next normal reload.
      await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
    })(),
  );
});
