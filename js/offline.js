// offline.js — شغال على كل صفحات الموقع (نفس الملف بيتكرر ربطه بكل صفحة)

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