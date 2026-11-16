/* A waiting update activates when the previous game tabs close. */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Offline installation is optional; the online game remains playable.
    });
  });
}
