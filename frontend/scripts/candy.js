/* Candy page animations + cart glue */
(function(){
  // Reveal animation when scrolled into view
  var cards = Array.prototype.slice.call(document.querySelectorAll('.candy-card'));
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('revealed'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15});
    cards.forEach(function(c){ io.observe(c); });
  } else { cards.forEach(function(c){ c.classList.add('revealed'); }); }

  // Simple cart add (align with checkout cart key)
  var STORAGE_CART = 'fb_cart_v1';
  function readCart(){ try { return JSON.parse(localStorage.getItem(STORAGE_CART) || '{}'); } catch(e){ return {}; } }
  function writeCart(c){ localStorage.setItem(STORAGE_CART, JSON.stringify(c)); }
  function addToCart(sku, qty){ var c = readCart(); c[sku] = (c[sku] || 0) + (qty || 1); writeCart(c); toast('Added to cart'); }

  // Small toast (reuse if exists)
  var t = document.querySelector('.toast');
  if (!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  function toast(msg){ t.textContent = msg; t.classList.add('is-show'); setTimeout(function(){ t.classList.remove('is-show'); }, 1600); }

  Array.prototype.slice.call(document.querySelectorAll('.add-to-cart')).forEach(function(btn){
    btn.addEventListener('click', function(){
      var holder = btn.closest('[data-sku]');
      var sku = (holder && holder.getAttribute('data-sku')) || btn.getAttribute('data-sku') || 'candy';
      addToCart(sku, 1);
    });
  });

  // Burger menu toggle (mobile)
  var burger = document.querySelector('.burger');
  if (burger){
    var header = burger.closest('.site-header');
    var scopedNav = header ? header.querySelector('.nav') : document.querySelector('.nav');
    function positionNav(){ if (!scopedNav) return; var r = burger.getBoundingClientRect(); var rect = scopedNav.getBoundingClientRect(); var width = rect.width || 240; var left = Math.min(r.right - width, window.innerWidth - width - 8); left = Math.max(8, left); scopedNav.style.position='fixed'; scopedNav.style.left=Math.round(left)+'px'; scopedNav.style.top=Math.round(r.bottom+8)+'px'; scopedNav.style.right='auto'; scopedNav.style.minWidth='240px'; scopedNav.style.zIndex='9999'; scopedNav.style.background='#fff'; scopedNav.style.border='1px solid #f0e1e5'; scopedNav.style.borderRadius='12px'; scopedNav.style.padding='12px'; scopedNav.style.boxShadow='0 18px 40px rgba(0,0,0,.08)'; scopedNav.style.flexDirection='column'; scopedNav.style.alignItems='stretch'; }
    function toggleMenu(){ if (!scopedNav) return; var open = scopedNav.classList.toggle('is-open'); if (open){ positionNav(); scopedNav.style.display='flex'; } else { scopedNav.style.display='none'; } burger.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    burger.addEventListener('click', function(e){ toggleMenu(); e.stopPropagation(); });
    // Delegated fallback (in case of dynamic headers or icons capturing clicks)
    document.addEventListener('click', function(e){ var btn = e.target.closest('.burger'); if (btn === burger){ toggleMenu(); } });
    // Close when clicking outside
    document.addEventListener('click', function(e){ if (!scopedNav || !scopedNav.classList.contains('is-open')) return; var withinMenu = e.target.closest('.nav'); var withinBurger = e.target.closest('.burger'); if (!withinMenu && !withinBurger){ scopedNav.classList.remove('is-open'); scopedNav.style.display='none'; burger.setAttribute('aria-expanded','false'); } });
    window.addEventListener('resize', function(){ if (scopedNav && scopedNav.classList.contains('is-open')) { positionNav(); scopedNav.style.display='flex'; } });
    window.addEventListener('scroll', function(){ if (scopedNav && scopedNav.classList.contains('is-open')) positionNav(); }, { passive: true });
  }

  // Profile modal
  var modal = document.getElementById('auth-modal');
  function openModal(){ if (modal) modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ if (modal) modal.setAttribute('aria-hidden','true'); }
  Array.prototype.slice.call(document.querySelectorAll('.profile-trigger')).forEach(function(btn){ btn.addEventListener('click', openModal); });
  // Close via any [data-close] using event delegation
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-close]');
    if (!el) return;
    closeModal();
  });
  document.addEventListener('keydown', function(e){ if (e.key==='Escape') closeModal(); });

  // Tabs inside modal
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  function setActive(id){ tabs.forEach(function(tb){ tb.classList.toggle('is-active', tb.dataset.tab===id); }); panels.forEach(function(p){ p.classList.toggle('is-active', p.dataset.panel===id); }); }
  tabs.forEach(function(tb){ tb.addEventListener('click', function(){ setActive(tb.dataset.tab); }); });
  if (tabs.length) setActive('login');

  // Cart drawer
  var CART = {
    openBtn: document.querySelector('.cart-open'),
    drawer: document.querySelector('.cart'),
    closeEls: Array.prototype.slice.call(document.querySelectorAll('[data-cart-close]')),
    list: document.querySelector('.cart-list'),
    empty: document.querySelector('.cart-empty'),
    count: document.querySelector('.cart-count')
  };
  function renderCart(){
    if (!CART.list) return;
    var c = readCart(); var keys = Object.keys(c);
    CART.list.innerHTML = '';
    if (keys.length===0){ if(CART.empty) CART.empty.hidden = false; if(CART.count) CART.count.textContent='0'; return; }
    if (CART.empty) CART.empty.hidden = true; var total = 0;
    keys.forEach(function(sku){ var qty=c[sku]; total+=qty; var li=document.createElement('li'); li.innerHTML='<span>'+sku+'</span><div><button class="btn" data-dec="'+sku+'">-</button> <span>'+qty+'</span> <button class="btn" data-inc="'+sku+'">+</button></div>'; CART.list.appendChild(li); });
    if (CART.count) CART.count.textContent=String(total);
    Array.prototype.slice.call(CART.list.querySelectorAll('[data-inc]')).forEach(function(b){ b.addEventListener('click', function(){ var s=b.getAttribute('data-inc'); var c2=readCart(); c2[s]=(c2[s]||0)+1; writeCart(c2); renderCart(); }); });
    Array.prototype.slice.call(CART.list.querySelectorAll('[data-dec]')).forEach(function(b){ b.addEventListener('click', function(){ var s=b.getAttribute('data-dec'); var c2=readCart(); c2[s]=Math.max(0,(c2[s]||0)-1); if(c2[s]===0) delete c2[s]; writeCart(c2); renderCart(); }); });
  }
  function openCart(){ if (CART.drawer){ CART.drawer.setAttribute('aria-hidden','false'); renderCart(); } }
  function closeCart(){ if (CART.drawer){ CART.drawer.setAttribute('aria-hidden','true'); } }
  if (CART.openBtn) CART.openBtn.addEventListener('click', openCart);
  if (CART.closeEls) CART.closeEls.forEach(function(el){ el.addEventListener('click', closeCart); });
  var goCheckout = document.querySelector('.go-checkout');
  if (goCheckout) goCheckout.addEventListener('click', function(e){ e.preventDefault(); closeCart(); window.location.href = 'checkout.html'; });

  // Filtering (click-to-open dropdown) - scoped per filter bar
  function applyFilterValue(value, label, toggleEl){
    var showAll = !value || value === 'all' || value === 'candies';
    var cards = Array.prototype.slice.call(document.querySelectorAll('.candies-card')).concat(Array.prototype.slice.call(document.querySelectorAll('.candy-card')));
    cards.forEach(function(card){
      var cat = (card.getAttribute('data-cat') || '').toLowerCase();
      var match = showAll || cat === value;
      card.style.display = match ? '' : 'none';
    });
    if (toggleEl && label){ var t = toggleEl.querySelector('.filter-toggle-text'); if (t) t.textContent = label; }
  }
  Array.prototype.slice.call(document.querySelectorAll('.filter-bar')).forEach(function(bar){
    var toggle = bar.querySelector('.filter-toggle');
    var menu = bar.querySelector('.filter-menu');
    if (!toggle || !menu) return;
    function openMenu(){ bar.classList.add('is-open'); toggle.setAttribute('aria-expanded','true'); }
    function closeMenu(){ bar.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); }
    function isOpen(){ return bar.classList.contains('is-open'); }
    toggle.addEventListener('click', function(e){ isOpen() ? closeMenu() : openMenu(); e.preventDefault(); e.stopPropagation(); });
    document.addEventListener('click', function(e){ if (!bar.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
    Array.prototype.slice.call(menu.querySelectorAll('.filter-item')).forEach(function(item){
      item.addEventListener('click', function(){
        Array.prototype.slice.call(menu.querySelectorAll('.filter-item')).forEach(function(i){ i.classList.remove('is-active'); });
        item.classList.add('is-active');
        applyFilterValue(item.getAttribute('data-value'), item.textContent.trim(), toggle);
        closeMenu();
      });
    });
    var active = menu.querySelector('.filter-item.is-active') || menu.querySelector('.filter-item');
    if (active) applyFilterValue(active.getAttribute('data-value'), active.textContent.trim(), toggle);
  });
})();


