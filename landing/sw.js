// Removes the stale root-scoped service worker registered before the /app/ restructure.
// Served at /sw.js — activates immediately, unregisters itself, then reloads all clients.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(c => c.navigate(c.url));
});
