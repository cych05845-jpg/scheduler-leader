// ============================================================
// 急診排班 — Service Worker
// 唯一目的:讓頁面可以「安裝成桌面/手機程式」,並且**永遠拿最新版**。
// 策略:網路優先、不用快取裡的舊頁面。只有斷網時才拿上次存的副本頂著。
// ⚠ 千萬不要改成快取優先 —— 那會讓同仁一直看到舊版程式,
//   而舊版排班頁正是洗掉公告說明和備註的元兇。
// Firebase / 其他網域的請求一律不經過這裡。
// ============================================================
const CACHE = 'ed-sched-offline-v1';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // Firebase 等外部請求不碰
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });  // 永遠向伺服器要最新
      if (fresh && fresh.ok) {
        const copy = fresh.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;                               // 斷網:用上次的副本
      throw err;
    }
  })());
});
