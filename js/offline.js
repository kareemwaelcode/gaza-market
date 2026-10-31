(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

  var UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('sw.js', { scope: './', updateViaCache: 'none' })
      .then(function (registration) {
        var lastCheck = Date.now();

        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState !== 'visible') return;
          if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL) return;
          lastCheck = Date.now();
          registration.update().catch(function () {});
        });
      })
      .catch(function (err) {
        console.warn('Service Worker registration failed:', err);
      });
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  const offlineBanner = document.getElementById('offline-banner');

  if (!offlineBanner) {
    return;
  }

  function showOfflineBanner() {
    offlineBanner.classList.remove('hidden');
    document.body.classList.add('offline-active');
  }

  function hideOfflineBanner() {
    offlineBanner.classList.add('hidden');
    document.body.classList.remove('offline-active');
  }

  if (!navigator.onLine) {
    showOfflineBanner();
  }

  window.addEventListener('offline', showOfflineBanner);
  window.addEventListener('online', hideOfflineBanner);
});