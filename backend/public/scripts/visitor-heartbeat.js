/* Ping server while a customer has the storefront open (not admin). */
(function () {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  var path = String(window.location.pathname || '');
  if (path.indexOf('/admin') !== -1) return;

  var STORAGE_KEY = 'fb_visitor_id_v1';

  function getVisitorId() {
    try {
      var id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = 'v_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch (e) {
      return 'v_' + Date.now();
    }
  }

  function currentPage() {
    var parts = path.split('/');
    return parts[parts.length - 1] || 'home.html';
  }

  function ping() {
    fetch('/api/visitors/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: getVisitorId(), page: currentPage() }),
      keepalive: true,
    }).catch(function () {});
  }

  ping();
  setInterval(ping, 30000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) ping();
  });
  window.addEventListener('pagehide', function () {
    ping();
  });
})();
