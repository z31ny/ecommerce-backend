/* ── Collapsible Sidebar Component ──
   Self-contained: builds HTML, injects into page, wires events.
   Reuses the existing .burger button in the header as the open trigger. */

(function () {
  var LINKS = [
    { href: './home.html',    icon: '🏠', label: 'Home' },
    { href: './fruits.html',  icon: '🍓', label: 'Fruits & Vegetables' },
    { href: './candy.html',   icon: '🍬', label: 'Candy' },
    { href: './offers.html',  icon: '🏷️', label: 'Offers' },
    { href: './about.html',   icon: '💡', label: 'About Us' },
    { href: './contact.html', icon: '✉️', label: 'Contact Us' }
  ];

  var currentFile = window.location.pathname.split('/').pop() || 'home.html';

  // Build overlay
  var overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // Build sidebar
  var aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.setAttribute('aria-hidden', 'true');
  aside.setAttribute('role', 'dialog');
  aside.setAttribute('aria-label', 'Navigation menu');

  var html = '<div class="sidebar-header">'
    + '<a href="./home.html" class="sidebar-logo"><img src="./assets/icons/logo.svg" alt="Freezy Bite"></a>'
    + '<button class="sidebar-close" aria-label="Close menu">\u00D7</button>'
    + '</div>'
    + '<nav class="sidebar-nav">';

  LINKS.forEach(function (link) {
    var active = currentFile === link.href.replace('./', '');
    html += '<a href="' + link.href + '"' + (active ? ' class="is-active" aria-current="page"' : '') + '>'
      + '<span class="sb-icon">' + link.icon + '</span>'
      + link.label
      + '</a>';
  });

  html += '</nav>'
    + '<div class="sidebar-divider"></div>'
    + '<div class="sidebar-footer">'
    + '<a href="tel:+201090196133" class="sidebar-phone">'
    + '<img src="./assets/icons/phone.svg" alt="Call"> +20 109 019 6133'
    + '</a>'
    + '</div>';

  aside.innerHTML = html;
  document.body.appendChild(aside);

  // References
  var closeBtn = aside.querySelector('.sidebar-close');
  var burger = document.querySelector('.burger');

  function open() {
    aside.classList.add('is-open');
    aside.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-active');
    document.body.classList.add('sidebar-locked');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    aside.classList.remove('is-open');
    aside.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-active');
    document.body.classList.remove('sidebar-locked');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  if (burger) {
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      aside.classList.contains('is-open') ? close() : open();
    });
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && aside.classList.contains('is-open')) close();
  });
})();
