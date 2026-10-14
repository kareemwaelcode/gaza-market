// offline.js — شغال على كل صفحات الموقع (نفس الملف بيتكرر ربطه بكل صفحة)

// ===== تسجيل الـ Service Worker =====
// بره DOMContentLoaded وبره شرط البانر، عشان يتسجل حتى لو الصفحة ما فيها offline-banner
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // الـ SW بيشتغل بس على https أو localhost (مش على file://)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

  var UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // ساعة

  window.addEventListener('load', function () {
    // sw.js بجذر الموقع، والصفحات العامة كلها بنفس المستوى (جنب index.html)
    navigator.serviceWorker
      .register('sw.js', { scope: './', updateViaCache: 'none' })
      .then(function (registration) {
        var lastCheck = Date.now();

        // المستخدم اللي بيضل تابه مفتوح لأيام: نفحص عن نسخة جديدة كل ما يرجع للتاب
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

// ===== بانر "غير متصل" =====
document.addEventListener('DOMContentLoaded', () => {
  const offlineBanner = document.getElementById('offline-banner');

  if (!offlineBanner) {
    // إذا الصفحة ما فيها الـ div تبع البانر، ما تعمل شي
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

  // فحص الحالة فور تحميل الصفحة
  if (!navigator.onLine) {
    showOfflineBanner();
  }

  // الاستماع للتغيرات اللحظية
  window.addEventListener('offline', showOfflineBanner);
  window.addEventListener('online', hideOfflineBanner);
});