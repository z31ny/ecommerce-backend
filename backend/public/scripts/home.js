/* Home page interactions: reveal animations, mood cards, FAQ, and auth modal */

(function () {
  var doc = document;

  // Intersection reveal
  var revealTargets = Array.prototype.slice.call(doc.querySelectorAll('.fade-up'));
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Simple store using localStorage for cart
  var STORAGE_CART = 'fb_cart_v1';
  function readCart() {
    try {
      var c = JSON.parse(localStorage.getItem(STORAGE_CART) || '{}');
      if (!c || typeof c !== 'object') return {};
      // Normalize bad stale entries once read
      Object.keys(c).forEach(function (k) {
        var q = Number(c[k]);
        if (!k || k === 'unknown' || !isFinite(q) || q <= 0) delete c[k];
        else c[k] = q;
      });
      return c;
    } catch (e) { return {}; }
  }
  function writeCart(cart) { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); }
  var __lastCartAdd = { key: '', at: 0 };

  // Update all cart badges
  function updateCartBadges() {
    var cart = readCart();
    var total = Object.keys(cart).reduce(function (sum, sku) {
      var qty = Number(cart[sku]);
      return sum + (isNaN(qty) || qty < 0 ? 0 : qty);
    }, 0);
    var badges = doc.querySelectorAll('.cart-badge');
    badges.forEach(function (badge) {
      badge.textContent = total;
      badge.setAttribute('data-count', total);
    });
  }

  // Fly animation to cart
  function flyToCart(element) {
    var floatingCart = doc.getElementById('floating-cart');
    if (!floatingCart) return;

    // Find product image near the button
    var parent = element.closest('.offer-card, .mh-card, .inside-card, .mood-card, article');
    var img = parent ? parent.querySelector('img') : null;
    if (!img) img = element; // fallback to button

    var rect = img.getBoundingClientRect();
    var cartRect = floatingCart.getBoundingClientRect();

    // Create small clone
    var clone = document.createElement('div');
    clone.style.cssText = 'position:fixed;z-index:2000;width:50px;height:50px;border-radius:50%;background:var(--berry);display:grid;place-items:center;pointer-events:none;';
    clone.innerHTML = '<img src="./assets/icons/cart.svg" style="width:24px;height:24px;filter:brightness(10);">';
    clone.style.left = (rect.left + rect.width / 2 - 25) + 'px';
    clone.style.top = (rect.top + rect.height / 2 - 25) + 'px';
    clone.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    doc.body.appendChild(clone);

    // Trigger animation
    setTimeout(function () {
      clone.style.left = (cartRect.left + cartRect.width / 2 - 25) + 'px';
      clone.style.top = (cartRect.top + cartRect.height / 2 - 25) + 'px';
      clone.style.transform = 'scale(0.3)';
      clone.style.opacity = '0';
    }, 10);

    setTimeout(function () { clone.remove(); }, 550);
  }

  function addToCart(sku, qty, sizeOrTrigger, triggerElement) {
    var size = null;
    if (typeof sizeOrTrigger === 'string') size = sizeOrTrigger;
    else if (sizeOrTrigger && sizeOrTrigger.nodeType) triggerElement = sizeOrTrigger;
    var cartKey = size ? sku + '__' + size : sku;
    // Guard against duplicate click handlers firing for same interaction
    var now = Date.now();
    if (__lastCartAdd.key === cartKey && (now - __lastCartAdd.at) < 350) return;
    __lastCartAdd.key = cartKey;
    __lastCartAdd.at = now;

    var cart = readCart();
    cart[cartKey] = (cart[cartKey] || 0) + (qty || 1);
    writeCart(cart);
    updateCartBadges();
    if (triggerElement) flyToCart(triggerElement);
    showToast('Added to cart');
  }
  function cartKeyToDisplay(key) {
    var base = key.indexOf('__') === -1 ? key : key.split('__')[0];
    var size = key.indexOf('__') === -1 ? '' : key.split('__').slice(1).join('__');
    var pretty = base.replace(/-/g, ' ');
    var meta = window.__productMetaBySku && window.__productMetaBySku[String(base).toLowerCase()];
    var name = (meta && meta.name) ? meta.name : pretty;
    return size ? (name + ' (' + size + ')') : name;
  }
  function cartKeyBaseSku(key) {
    return key.indexOf('__') === -1 ? key : key.split('__')[0];
  }
  function cartKeySize(key) {
    return key.indexOf('__') === -1 ? '' : key.split('__').slice(1).join('__');
  }
  function normalizeSizeKey(size) {
    return String(size == null ? '' : size).trim().toLowerCase().replace(/\s+/g, '');
  }
  function getCartMeta(baseSku) {
    return window.__productMetaBySku && window.__productMetaBySku[String(baseSku).toLowerCase()]
      ? window.__productMetaBySku[String(baseSku).toLowerCase()]
      : null;
  }
  function getCartUnitPrice(cartKey) {
    var baseSku = cartKeyBaseSku(cartKey);
    var selectedSize = cartKeySize(cartKey);
    var meta = getCartMeta(baseSku);
    if (meta && meta.sizePrices && selectedSize) {
      if (meta.sizePrices[selectedSize] != null) {
        var exact = parseFloat(meta.sizePrices[selectedSize]);
        if (!isNaN(exact)) return exact;
      }
      var wanted = normalizeSizeKey(selectedSize);
      var found = null;
      Object.keys(meta.sizePrices).some(function (k) {
        if (normalizeSizeKey(k) === wanted) { found = meta.sizePrices[k]; return true; }
        return false;
      });
      if (found != null) {
        var norm = parseFloat(found);
        if (!isNaN(norm)) return norm;
      }
    }
    var base = meta && meta.price != null ? parseFloat(meta.price) : NaN;
    return isNaN(base) ? 0 : base;
  }
  function money(n) {
    return (Number(n) || 0).toFixed(0) + ' EGP';
  }

  // Initial badge update
  updateCartBadges();

  // Toast
  var toast = doc.querySelector('.toast');
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-show'); }, 1800);
  }

  function resolveCartSkuFromCard(card) {
    if (!card) return null;
    var ds = card.getAttribute('data-sku');
    if (ds && String(ds).trim()) return String(ds).trim();
    var pid = card.getAttribute('data-product-id');
    if (pid != null && String(pid).trim() !== '' && typeof window.__productSkuById === 'object' && window.__productSkuById) {
      var map = window.__productSkuById;
      var p = String(pid).trim();
      var n = Number(p);
      var s = map[p] || (!isNaN(n) ? map[n] : null) || map[String(n)];
      if (s) return String(s).trim();
    }
    return null;
  }

  // Add to cart (delegated) only on home page.
  // Other pages (candy/fruits/offers) already have their own handlers.
  var currentPage = (window.location.pathname.split('/').pop() || 'home.html').toLowerCase();
  var isHomePage = (currentPage === '' || currentPage === 'home.html' || currentPage === 'index.html');
  if (isHomePage) {
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.add-to-cart');
      if (!btn || !doc.body.contains(btn)) return;
      var card = btn.closest('.mood-card') || btn.closest('[data-sku]') || btn.closest('[data-product-id]');
      var sku = resolveCartSkuFromCard(card);
      if (!sku) {
        sku = (card && card.getAttribute('data-sku')) || btn.getAttribute('data-sku') || (btn.dataset && btn.dataset.sku) || '';
        sku = sku ? String(sku).trim() : '';
      }
      if (!sku) {
        e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        showToast('Link a product in Admin → Website Content → Pick Your Mood');
        return;
      }
      var sizeSelect = card ? card.querySelector('.product-size-select') : null;
      var hasSizeOptions = !!(sizeSelect && sizeSelect.options && sizeSelect.options.length > 1);
      var size = sizeSelect && sizeSelect.value ? sizeSelect.value : null;

      if (hasSizeOptions && !size) {
        e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        showToast('Please choose a size first');
        return;
      }

      e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      addToCart(sku, 1, size, btn);
    });
  }

  // Auth modal
  var modal = doc.getElementById('auth-modal');
  var openers = Array.prototype.slice.call(doc.querySelectorAll('.profile-trigger'));
  var closeEls = Array.prototype.slice.call(doc.querySelectorAll('[data-close]'));
  function openModal() { if (modal) modal.setAttribute('aria-hidden', 'false'); }
  function closeModal() { if (modal) modal.setAttribute('aria-hidden', 'true'); }
  openers.forEach(function (o) { o.addEventListener('click', openModal); });
  closeEls.forEach(function (c) { c.addEventListener('click', closeModal); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  // Mobile navigation is now handled by sidebar.js

  // Tabs in modal
  var tabs = Array.prototype.slice.call(doc.querySelectorAll('.tab'));
  var panels = Array.prototype.slice.call(doc.querySelectorAll('.panel'));
  function setActiveTab(id) {
    tabs.forEach(function (t) { t.classList.toggle('is-active', t.dataset.tab === id); });
    panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.panel === id); });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { setActiveTab(t.dataset.tab); }); });
  setActiveTab('login');

  // Real authentication with password validation
  var registerPassword = doc.getElementById('register-password');
  var reqLength = doc.getElementById('req-length');
  var reqUpper = doc.getElementById('req-upper');
  var reqNumber = doc.getElementById('req-number');
  var reqSymbol = doc.getElementById('req-symbol');
  var registerSubmit = doc.getElementById('register-submit');

  function validatePassword() {
    if (!registerPassword) return false;
    var pwd = registerPassword.value;
    var hasLength = pwd.length >= 8;
    var hasUpper = /[A-Z]/.test(pwd);
    var hasNumber = /\d/.test(pwd);
    var hasSymbol = /[!@#$%^&*(),.?":{}\|<>_\-+=\[\]\\\/~`]/.test(pwd);

    // Update UI
    if (reqLength) {
      reqLength.classList.toggle('valid', hasLength);
      reqLength.classList.toggle('invalid', !hasLength);
      reqLength.querySelector('.check').textContent = hasLength ? '✓' : '✗';
    }
    if (reqUpper) {
      reqUpper.classList.toggle('valid', hasUpper);
      reqUpper.classList.toggle('invalid', !hasUpper);
      reqUpper.querySelector('.check').textContent = hasUpper ? '✓' : '✗';
    }
    if (reqNumber) {
      reqNumber.classList.toggle('valid', hasNumber);
      reqNumber.classList.toggle('invalid', !hasNumber);
      reqNumber.querySelector('.check').textContent = hasNumber ? '✓' : '✗';
    }
    if (reqSymbol) {
      reqSymbol.classList.toggle('valid', hasSymbol);
      reqSymbol.classList.toggle('invalid', !hasSymbol);
      reqSymbol.querySelector('.check').textContent = hasSymbol ? '✓' : '✗';
    }

    var allValid = hasLength && hasUpper && hasNumber && hasSymbol;
    if (registerSubmit) {
      registerSubmit.disabled = !allValid;
    }
    return allValid;
  }

  if (registerPassword) {
    registerPassword.addEventListener('input', validatePassword);
  }

  // Eye button for password visibility (toggle)
  Array.prototype.slice.call(doc.querySelectorAll('.eye-btn')).forEach(function (btn) {
    var targetId = btn.getAttribute('data-target');
    var input = doc.getElementById(targetId);
    if (!input) return;

    btn.addEventListener('click', function () {
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? '🙈' : '👁';
    });
  });

  // Login form handler
  var loginForm = doc.getElementById('login-form');
  var loginError = doc.getElementById('login-error');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = doc.getElementById('login-email').value;
      var password = doc.getElementById('login-password').value;
      if (loginError) loginError.textContent = '';

      if (typeof FreezybiteAPI !== 'undefined') {
        FreezybiteAPI.login(email, password)
          .then(function (result) {
            var firstName = (result.user.name || '').split(' ')[0] || result.user.email;
            showToast('Welcome back, ' + firstName + '!');
            closeModal();
            updateAuthUI();
          })
          .catch(function (err) {
            if (loginError) loginError.textContent = err.message || 'Login failed';
          });
      } else {
        if (loginError) loginError.textContent = 'API not available';
      }
    });
  }

  // Register form handler
  var registerForm = doc.getElementById('register-form');
  var registerError = doc.getElementById('register-error');
  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validatePassword()) {
        if (registerError) registerError.textContent = 'Please meet all password requirements';
        return;
      }

      var name = doc.getElementById('register-name').value;
      var email = doc.getElementById('register-email').value;
      var password = doc.getElementById('register-password').value;
      if (registerError) registerError.textContent = '';

      if (typeof FreezybiteAPI !== 'undefined') {
        FreezybiteAPI.signup(email, password, name)
          .then(function (result) {
            var firstName = (result.user.name || '').split(' ')[0] || result.user.email;
            showToast('Welcome, ' + firstName + '!');
            closeModal();
            updateAuthUI();
          })
          .catch(function (err) {
            if (registerError) registerError.textContent = err.message || 'Signup failed';
          });
      } else {
        if (registerError) registerError.textContent = 'API not available';
      }
    });
  }

  // Update UI based on auth state
  function updateAuthUI() {
    var isLoggedIn = typeof FreezybiteAPI !== 'undefined' && FreezybiteAPI.isLoggedIn();
    var loggedInSection = doc.getElementById('logged-in-section');
    var tabPanels = doc.querySelector('.tab-panels');
    var tabs = doc.querySelector('.tabs');
    var socialSection = doc.querySelector('.social');
    var orDivider = doc.querySelector('.or');
    var loggedInName = doc.getElementById('logged-in-name');

    if (isLoggedIn) {
      var user = FreezybiteAPI.getUser();
      var firstName = (user.name || '').split(' ')[0] || user.email;
      if (loggedInName) loggedInName.textContent = firstName;
      if (loggedInSection) loggedInSection.style.display = 'block';
      if (tabPanels) tabPanels.style.display = 'none';
      if (tabs) tabs.style.display = 'none';
      if (socialSection) socialSection.style.display = 'none';
      if (orDivider) orDivider.style.display = 'none';
    } else {
      if (loggedInSection) loggedInSection.style.display = 'none';
      if (tabPanels) tabPanels.style.display = '';
      if (tabs) tabs.style.display = '';
      if (socialSection) socialSection.style.display = '';
      if (orDivider) orDivider.style.display = '';
    }
  }
  updateAuthUI();

  // Logout button handler
  var logoutBtn = doc.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (typeof FreezybiteAPI !== 'undefined') {
        FreezybiteAPI.logout();
        showToast('Logged out!');
        updateAuthUI();
        closeModal();
      }
    });
  }

  var googleBtn = doc.querySelector('.social-google');
  var fbBtn = doc.querySelector('.social-facebook');
  if (googleBtn) googleBtn.addEventListener('click', function () { showToast('Google login coming soon!'); });
  if (fbBtn) fbBtn.addEventListener('click', function () { showToast('Facebook login coming soon!'); });

  var guestBtn = doc.querySelector('.continue-guest');
  if (guestBtn) guestBtn.addEventListener('click', function () { showToast('Continuing as guest'); closeModal(); });

  // Floating cart click handler
  var floatingCart = doc.getElementById('floating-cart');
  if (floatingCart) {
    floatingCart.addEventListener('click', openCart);
  }

  // Hero blueberry hover swap
  var berry = doc.querySelector('.hero-berry');
  if (berry && berry.dataset.hover) {
    var originalSrc = berry.getAttribute('src');
    var hoverSrc = berry.dataset.hover;
    berry.addEventListener('mouseenter', function () { berry.setAttribute('src', hoverSrc); });
    berry.addEventListener('mouseleave', function () { berry.setAttribute('src', originalSrc); });
    // Touch toggle: tap to swap
    berry.addEventListener('touchstart', function () { berry.setAttribute('src', hoverSrc); }, { passive: true });
    berry.addEventListener('touchend', function () { berry.setAttribute('src', originalSrc); }, { passive: true });
  }

  // Cart drawer open/close and render
  var CART = {
    openBtn: doc.querySelector('.cart-open'),
    drawer: doc.querySelector('.cart'),
    closeEls: Array.prototype.slice.call(doc.querySelectorAll('[data-cart-close]')),
    list: doc.querySelector('.cart-list'),
    empty: doc.querySelector('.cart-empty'),
    count: doc.querySelector('.cart-count')
  };
  function renderCart() {
    if (!CART.list) return;
    var cart = readCart();
    var items = Object.keys(cart).filter(function (k) { return (Number(cart[k]) || 0) > 0; });
    CART.list.innerHTML = '';
    if (items.length === 0) {
      CART.empty.hidden = false; CART.count.textContent = '0';
      return;
    }
    CART.empty.hidden = true;
    var total = 0;
    items.forEach(function (cartKey) {
      var qty = cart[cartKey]; total += qty;
      var display = cartKeyToDisplay(cartKey);
      var baseSku = cartKeyBaseSku(cartKey);
      var meta = getCartMeta(baseSku);
      var unitPrice = getCartUnitPrice(cartKey);
      var lineTotal = unitPrice * qty;
      var imgSrc = (meta && meta.images && meta.images[0]) ? meta.images[0] : '/assets/icons/profile.svg';
      var li = doc.createElement('li');
      li.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;min-width:0;">' +
          '<img src="' + imgSrc + '" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;" onerror="this.src=\'/assets/icons/profile.svg\'">' +
          '<div style="min-width:0;flex:1;">' +
            '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + display + '</div>' +
            '<div style="font-size:12px;color:#666;">' + money(unitPrice) + ' x ' + qty + ' = ' + money(lineTotal) + '</div>' +
          '</div>' +
        '</div>' +
        '<div><button class="btn" data-dec="' + cartKey.replace(/"/g, '&quot;') + '">-</button> <span>' + qty + '</span> <button class="btn" data-inc="' + cartKey.replace(/"/g, '&quot;') + '">+</button></div>';
      CART.list.appendChild(li);
    });
    CART.count.textContent = String(total);
    // Bind inc/dec
    Array.prototype.slice.call(CART.list.querySelectorAll('[data-inc]')).forEach(function (b) {
      b.addEventListener('click', function () { var key = b.getAttribute('data-inc'); var c = readCart(); c[key] = (c[key] || 0) + 1; writeCart(c); renderCart(); });
    });
    Array.prototype.slice.call(CART.list.querySelectorAll('[data-dec]')).forEach(function (b) {
      b.addEventListener('click', function () { var key = b.getAttribute('data-dec'); var c = readCart(); c[key] = Math.max(0, (c[key] || 0) - 1); if (c[key] === 0) delete c[key]; writeCart(c); renderCart(); });
    });
  }
  function openCart() { if (CART.drawer) { CART.drawer.setAttribute('aria-hidden', 'false'); renderCart(); } }
  function closeCart() { if (CART.drawer) { CART.drawer.setAttribute('aria-hidden', 'true'); } }
  if (CART.openBtn) CART.openBtn.addEventListener('click', openCart);
  if (CART.closeEls) CART.closeEls.forEach(function (el) { el.addEventListener('click', closeCart); });

  // Checkout render
  function renderCheckout() {
    var listEl = doc.querySelector('.checkout-list');
    var emptyEl = doc.querySelector('.checkout-empty');
    if (!listEl || !emptyEl) return;
    var cart = readCart();
    var items = Object.keys(cart);
    listEl.innerHTML = '';
    if (items.length === 0) { emptyEl.hidden = false; return; }
    emptyEl.hidden = true;
    items.forEach(function (sku) {
      var qty = cart[sku];
      var li = doc.createElement('li');
      li.innerHTML = '<strong>' + sku + '</strong><span>Qty: ' + qty + '</span>';
      listEl.appendChild(li);
    });
  }
  renderCheckout();
  // Update checkout when cart changes by intercepting addToCart calls
  var oldAdd = addToCart;
  addToCart = function (sku, qty, sizeOrTrigger, triggerElement) {
    oldAdd(sku, qty, sizeOrTrigger, triggerElement);
    renderCart();
    renderCheckout();
  };
  window.addToCart = addToCart;

  // Newsletter form
  var nl = doc.querySelector('.newsletter-form');
  if (nl) {
    nl.addEventListener('submit', function (e) { e.preventDefault(); showToast('Thanks! You are subscribed.'); nl.reset && nl.reset(); });
  }

  // Contact form (contact page)
  var contactForm = doc.querySelector('.contact-form .tf-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (contactForm.querySelector('[name="email"]') || {}).value || '';
      var name = (contactForm.querySelector('[name="name"]') || {}).value || '';
      var phone = (contactForm.querySelector('[name="phone"]') || {}).value || '';
      var message = (contactForm.querySelector('[name="message"]') || {}).value || '';
      if (!email || !name || !message) {
        showToast('Please complete the required fields.');
        return;
      }

      fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: name,
          senderEmail: email,
          subject: 'Contact form',
          message: phone ? message + '\\n\\nPhone: ' + phone : message
        })
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (data) { throw new Error(data.error || 'Failed to send'); });
        return res.json();
      }).then(function () {
        contactForm.reset();
        showToast('Thanks! Your message was sent.');
      }).catch(function (err) {
        showToast(err.message || 'Failed to send message.');
      });
    });
  }

  // Ensure checkout link navigates reliably
  var goCheckout = doc.querySelector('.go-checkout');
  if (goCheckout) {
    goCheckout.addEventListener('click', function (e) {
      e.preventDefault();
      closeCart();
      window.location.href = 'checkout.html';
    });
  }

  // ===== DYNAMIC OFFERS LOADING =====
  // Load offers from API and render them
  function loadOffers() {
    var offersGrid = doc.getElementById('offers-grid');
    if (!offersGrid) return;

    fetch('/api/offers')
      .then(function (res) { return res.json(); })
      .then(function (offers) {
        if (!offers || offers.length === 0) {
          offersGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #888;">No offers available at the moment.</div>';
          return;
        }

        offersGrid.innerHTML = '';
        function renderMediaHtml(images, fallbackSrc, alt) {
          var list = (images || []).filter(Boolean);
          if (!list.length && fallbackSrc) list = [fallbackSrc];
          if (list.length <= 1) {
            var src = list[0] || '/assets/icons/profile.svg';
            return '<div class="offer-media"><img src="' + src + '" alt="' + (alt || '') + '" onerror="this.src=\\\'/assets/icons/profile.svg\\\'"></div>';
          }
          return (
            '<div class="offer-media" data-swipe-gallery>' +
            '  <div class="swipe-track">' +
            list.map(function (src) { return '<div class="swipe-slide"><img src="' + src + '" alt="' + (alt || '') + '" onerror="this.src=\\\'/assets/icons/profile.svg\\\'"></div>'; }).join('') +
            '  </div>' +
            '  <div class="swipe-dots" aria-hidden="true"></div>' +
            '</div>'
          );
        }
        offers.forEach(function (offer) {
          var card = doc.createElement('article');
          card.className = 'offer-card fade-up';
          card.setAttribute('data-sku', offer.productSku);
          card.innerHTML =
            (offer.discount ? '<div class="offer-badge">-' + offer.discount + '%</div>' : '') +
            renderMediaHtml((offer.images || []), (offer.image || '/assets/icons/profile.svg'), offer.name) +
            '<h4 class="offer-title">' + offer.name + '</h4>' +
            '<div class="offer-prices">' +
            (offer.originalPrice ? '<span class="offer-old">' + Math.round(offer.originalPrice) + ' EGP</span>' : '') +
            '<span class="offer-new">' + Math.round(offer.salePrice) + ' EGP</span>' +
            '</div>' +
            (offer.productSku ? (
              '<button type="button" class="offer-cart add-to-cart" data-sku="' + offer.productSku + '" aria-label="Add to cart">' +
              '<img src="./assets/icons/cart.svg" alt="">' +
              '</button>'
            ) : (
              (offer.link ? '<a class="btn btn-primary" style="margin-top:10px;align-self:center" href="' + offer.link + '">View</a>' : '')
            ));

          offersGrid.appendChild(card);
          if (io) { io.observe(card); } else { card.classList.add('is-in'); }
        });

        if (typeof window.initSwipeGalleries === 'function') window.initSwipeGalleries(offersGrid);
      })
      .catch(function (err) {
        console.error('Failed to load offers:', err);
        offersGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #888;">Failed to load offers.</div>';
      });
  }

  // Load offers on page load (wait for product sizes map if available)
  var sizesReady = window.__productSizesReady;
  if (sizesReady && typeof sizesReady.then === 'function') {
    sizesReady.finally(loadOffers);
  } else {
    loadOffers();
  }

})();
