// 'use strict';

// const GM_MOCK_RATES = [
//   { currency_code: 'USD', rate_to_ils: 2.99, updated_at: null },
//   { currency_code: 'JOD', rate_to_ils: 4.22, updated_at: null },
//   { currency_code: 'EUR', rate_to_ils: 3.41, updated_at: null },
// ];

// async function gmFetchExchangeRates() {
//   if (!window.GM_ENV.isMockAllowed()) return [];
//   return Promise.resolve(GM_MOCK_RATES);
// }

// function gmRenderExchangeRates(rates) {
//   (rates || []).forEach(rate => {
//     const el = document.querySelector(`[data-currency="${rate.currency_code}"]`);
//     if (!el) return;

//     const value = Number(rate.rate_to_ils);
//     el.textContent = Number.isFinite(value) ? `₪ ${value.toFixed(2)}` : '—';
//   });
// }

// async function initExchangeRates() {
//   try {
//     const rates = await gmFetchExchangeRates();
//     gmRenderExchangeRates(rates);
//   } catch (err) {
//     console.error('gmFetchExchangeRates failed:', err);
//   }
// }

// window.initExchangeRates = initExchangeRates;

// document.addEventListener('DOMContentLoaded', () => {
//   initExchangeRates();
// });