/* Home page interactions: reveal animations, mood cards, FAQ, and auth modal */

(function () {
  var doc = document;

  // Intersection reveal
  var revealTargets = Array.prototype.slice.call(doc.querySelectorAll('.fade-up'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
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
    try { return JSON.parse(localStorage.getItem(STORAGE_CART) || '{}'); } catch (e) { return {}; }
  }
  function writeCart(cart) { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); }

  // Update all cart badges
  function updateCartBadges() {
    var cart = readCart();
    var total = Object.keys(cart).reduce(function (sum, sku) { return sum + cart[sku]; }, 0);
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

  function addToCart(sku, qty, triggerElement) {
    var cart = readCart();
    cart[sku] = (cart[sku] || 0) + (qty || 1);
    writeCart(cart);
    updateCartBadges();
    if (triggerElement) flyToCart(triggerElement);
    showToast('Added to cart');
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

  // Mood cards open/close
  var cards = Array.prototype.slice.call(doc.querySelectorAll('.mood-card'));
  function closeAll() { cards.forEach(function (c) { c.classList.remove('is-open'); }); }
  cards.forEach(function (card) {
    var openBtn = card.querySelector('.mood-open');
    var closeBtn = card.querySelector('.mood-close');
    if (openBtn) openBtn.addEventListener('click', function () { closeAll(); card.classList.add('is-open'); });
    if (closeBtn) closeBtn.addEventListener('click', function () { card.classList.remove('is-open'); });
  });

  // Add to cart buttons
  Array.prototype.slice.call(doc.querySelectorAll('.add-to-cart')).forEach(function (btn) {
    btn.addEventListener('click', function () { addToCart(btn.dataset.sku || 'unknown', 1, btn); });
  });

  // Mood scroller arrows
  var track = doc.querySelector('.mood-track');
  var prevBtn = doc.querySelector('.mood-arrow--prev');
  var nextBtn = doc.querySelector('.mood-arrow--next');
  function scrollByAmount(dir) {
    if (!track) return;
    var amount = Math.max(320, Math.round(track.clientWidth * 0.9));
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }
  if (prevBtn) prevBtn.addEventListener('click', function () { scrollByAmount(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { scrollByAmount(1); });

  // FAQ accordion
  Array.prototype.slice.call(doc.querySelectorAll('.faq-item')).forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () { item.classList.toggle('is-open'); });
  });

  // Auth modal
  var modal = doc.getElementById('auth-modal');
  var openers = Array.prototype.slice.call(doc.querySelectorAll('.profile-trigger'));
  var closeEls = Array.prototype.slice.call(doc.querySelectorAll('[data-close]'));
  function openModal() { if (modal) modal.setAttribute('aria-hidden', 'false'); }
  function closeModal() { if (modal) modal.setAttribute('aria-hidden', 'true'); }
  openers.forEach(function (o) { o.addEventListener('click', openModal); });
  closeEls.forEach(function (c) { c.addEventListener('click', closeModal); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  // Burger menu toggle (robust & scoped)
  function setupBurger() {
    var burger = doc.querySelector('.burger');
    var nav = doc.querySelector('.site-header .nav');
    function positionNav() {
      if (!burger || !nav || window.innerWidth > 960) return;
      var r = burger.getBoundingClientRect();
      var navRect = nav.getBoundingClientRect();
      var width = navRect.width || 240;
      var left = Math.min(r.right - width, window.innerWidth - width - 8);
      left = Math.max(8, left);
      nav.style.position = 'fixed';
      nav.style.left = Math.round(left) + 'px';
      nav.style.top = Math.round(r.bottom + 8) + 'px';
      nav.style.right = 'auto';
      nav.style.minWidth = '240px';
      nav.style.zIndex = '9999';
    }
    if (burger && nav) {
      burger.addEventListener('click', function (e) {
        if (window.innerWidth > 960) return; // desktop uses normal nav
        var open = nav.classList.toggle('is-open');
        if (open) {
          // apply popup styles on mobile only
          nav.style.flexDirection = 'column';
          nav.style.alignItems = 'stretch';
          nav.style.background = '#fff';
          nav.style.border = '1px solid #f0e1e5';
          nav.style.borderRadius = '12px';
          nav.style.padding = '12px';
          nav.style.boxShadow = '0 18px 40px rgba(0,0,0,.08)';
          nav.style.minWidth = '240px';
          positionNav();
          nav.style.display = 'flex';
        } else {
          nav.style.display = 'none';
        }
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        e.stopPropagation();
      });
      // Also delegate in case header re-renders
      doc.addEventListener('click', function (e) {
        var btn = e.target.closest('.burger');
        if (btn === burger) {
          if (window.innerWidth > 960) return;
          var open = nav.classList.toggle('is-open');
          if (open) {
            positionNav(); nav.style.display = 'flex';
          } else { nav.style.display = 'none'; }
          burger.setAttribute('aria-expanded', open ? 'true' : 'false');
          e.preventDefault();
        }
      });
      // Close on outside click
      doc.addEventListener('click', function (e) {
        if (window.innerWidth > 960) return;
        if (!nav.classList.contains('is-open')) return;
        if (!e.target.closest('.nav') && !e.target.closest('.burger')) {
          nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); nav.style.display = 'none';
        }
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 960) {
          // clear inline styles so desktop layout isn’t affected
          nav.removeAttribute('style');
          nav.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
          return;
        }
        if (nav.classList.contains('is-open')) { positionNav(); nav.style.display = 'flex'; }
      });
      window.addEventListener('scroll', function () {
        if (window.innerWidth > 960) return;
        if (nav.classList.contains('is-open')) positionNav();
      }, { passive: true });
    }
  }
  setupBurger();

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

  // Testimonials arrows
  var tTrack = doc.querySelector('.t-track');
  var tPrev = doc.querySelector('.t-arrow--prev');
  var tNext = doc.querySelector('.t-arrow--next');
  function tScroll(dir) { if (!tTrack) return; var w = Math.max(320, Math.round(tTrack.clientWidth * 0.9)); tTrack.scrollBy({ left: dir * w, behavior: 'smooth' }); }
  if (tPrev) tPrev.addEventListener('click', function () { tScroll(-1); });
  if (tNext) tNext.addEventListener('click', function () { tScroll(1); });

  // Inside (What's inside) arrows
  var iTrack = doc.querySelector('.inside-track');
  var iPrev = doc.querySelector('.inside-prev');
  var iNext = doc.querySelector('.inside-next');
  function iScroll(dir) { if (!iTrack) return; var w = Math.max(300, Math.round(iTrack.clientWidth * 0.9)); iTrack.scrollBy({ left: dir * w, behavior: 'smooth' }); }
  if (iPrev) iPrev.addEventListener('click', function () { iScroll(-1); });
  if (iNext) iNext.addEventListener('click', function () { iScroll(1); });

  // Testimonial submit + hourly rotation
  var STORAGE_TESTIMONIALS = 'fb_testimonials_user_v1';
  var ROTATION_MS = 60 * 60 * 1000; // 1 hour
  function readUserTestimonials() {
    try { return JSON.parse(localStorage.getItem(STORAGE_TESTIMONIALS) || '[]'); } catch (e) { return []; }
  }
  function writeUserTestimonials(list) { localStorage.setItem(STORAGE_TESTIMONIALS, JSON.stringify(list)); }

  var defaultTestimonials = [
    { color: 't-pink', front: '“What’s @Dana verdict?”', back: '“Crunchy, sweet, and so cute! I buy 5 packs at a time.”' },
    { color: 't-yellow', front: '“A little banana love from @MamaFruit”', back: '“Crispy, sweet, and sooo satisfying! I keep a stash in my bag.”' },
    { color: 't-purple', front: '“@juicyluv left a juicy review!”', back: '“It’s candy… but it’s fruit?! Obsessed.”' },
    { color: 't-yellow', front: '“@Sarah M left a sweet review!”', back: '“Tastes like a fruit explosion!”' },
    { color: 't-purple', front: '“@juicyluv has something to say!”', back: '“It’s candy… but it’s fruit?! Obsessed.”' },
    { color: 't-pink', front: '“See what @fruitlover88 thinks about us”', back: '“So crunchy and sweet — I’m obsessed!”' }
  ];

  function renderTestimonials() {
    var trackEl = doc.querySelector('.t-track');
    if (!trackEl) return;
    var users = readUserTestimonials();
    var merged = users.map(function (u) { return { color: 't-pink', front: '“' + u.name + ' says:”', back: '“' + u.message + '”' }; }).concat(defaultTestimonials);
    if (merged.length === 0) return;
    var offset = Math.floor(Date.now() / ROTATION_MS) % merged.length;
    var ordered = merged.slice(offset).concat(merged.slice(0, offset));
    trackEl.innerHTML = '';
    ordered.forEach(function (item) {
      var card = doc.createElement('article');
      card.className = 't-card';
      var front = doc.createElement('div'); front.className = 'bubble ' + item.color + ' front'; front.innerHTML = '<p>' + item.front + '</p>';
      var back = doc.createElement('div'); back.className = 'bubble ' + item.color + ' back'; back.innerHTML = '<p>' + item.back + '</p>';
      card.appendChild(front); card.appendChild(back);
      trackEl.appendChild(card);
    });
  }
  renderTestimonials();
  // schedule next rotation at the top of the next hour
  (function schedule() {
    var now = Date.now();
    var next = (Math.floor(now / ROTATION_MS) + 1) * ROTATION_MS;
    setTimeout(function () { renderTestimonials(); schedule(); }, next - now);
  })();

  var form = doc.querySelector('.tf-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.querySelector('[name="name"]').value || '').trim();
      var message = (form.querySelector('[name="message"]').value || '').trim();
      if (!name || !message) return;
      var list = readUserTestimonials();
      list.unshift({ name: name, message: message });
      writeUserTestimonials(list);
      form.reset();
      showToast('Thanks for your testimonial!');
      renderTestimonials();
    });
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
    var items = Object.keys(cart);
    CART.list.innerHTML = '';
    if (items.length === 0) {
      CART.empty.hidden = false; CART.count.textContent = '0';
      return;
    }
    CART.empty.hidden = true;
    var total = 0;
    items.forEach(function (sku) {
      var qty = cart[sku]; total += qty;
      var li = doc.createElement('li');
      li.innerHTML = '<span>' + sku + '</span><div><button class="btn" data-dec="' + sku + '">-</button> <span>' + qty + '</span> <button class="btn" data-inc="' + sku + '">+</button></div>';
      CART.list.appendChild(li);
    });
    CART.count.textContent = String(total);
    // Bind inc/dec
    Array.prototype.slice.call(CART.list.querySelectorAll('[data-inc]')).forEach(function (b) {
      b.addEventListener('click', function () { var s = b.getAttribute('data-inc'); var c = readCart(); c[s] = (c[s] || 0) + 1; writeCart(c); renderCart(); });
    });
    Array.prototype.slice.call(CART.list.querySelectorAll('[data-dec]')).forEach(function (b) {
      b.addEventListener('click', function () { var s = b.getAttribute('data-dec'); var c = readCart(); c[s] = Math.max(0, (c[s] || 0) - 1); if (c[s] === 0) delete c[s]; writeCart(c); renderCart(); });
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
  addToCart = function (sku, qty) { oldAdd(sku, qty); renderCart(); renderCheckout(); };

  // Newsletter form
  var nl = doc.querySelector('.newsletter-form');
  if (nl) {
    nl.addEventListener('submit', function (e) { e.preventDefault(); showToast('Thanks! You are subscribed.'); nl.reset && nl.reset(); });
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
})();


