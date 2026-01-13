/* Render checkout items from the same localStorage cart as the site. */
(function () {
  var STORAGE_CART = 'fb_cart_v1';
  var productsCache = null;

  function readCart() { try { return JSON.parse(localStorage.getItem(STORAGE_CART) || '{}'); } catch (e) { return {}; } }
  function writeCart(c) { localStorage.setItem(STORAGE_CART, JSON.stringify(c)); }
  function clearCart() { localStorage.removeItem(STORAGE_CART); }

  // Fetch products from API to get IDs and prices
  function fetchProducts() {
    if (productsCache) return Promise.resolve(productsCache);
    return fetch('http://localhost:3000/api/products?limit=100')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        productsCache = data;
        return data;
      })
      .catch(function (err) {
        console.warn('Could not fetch products from API, using fallback prices:', err);
        return null;
      });
  }

  // Basic price list (EGP) - fallback if API unavailable
  var PRICE_EGP = {
    'mango-250': 120,
    'marshmallow-pack': 90,
    'snickers-pack': 140,
    'banana-250': 110,
    'strawberries-250': 130,
    'blueberries-250': 150,
    'sweet': 120,
    'bold': 120,
    'cool': 120,
    'chill': 120,
    'mysterious': 130,
    'zesty': 130,
    'chocolate-bar': 80,
    'chocolate-brownie': 95,
    'gummy-rainbow': 60,
    'marshmallow-cup': 85,
    'lollipop-pop': 45,
    'ice-cream-cup': 90,
    'nut-mix': 120
  };

  // SKU to product ID mapping (populated from API)
  var skuToProduct = {};

  function buildSkuMap(productList) {
    if (!productList) return;
    productList.forEach(function (p) {
      if (p.sku) {
        skuToProduct[p.sku] = { id: p.id, price: parseFloat(p.price), name: p.name };
      }
    });
  }

  var list = document.querySelector('.co-list');
  var empty = document.querySelector('.co-empty');
  var count = document.querySelector('.co-count');
  var subtotalEl = document.querySelector('.co-subtotal');
  var deliveryEl = document.querySelector('.co-delivery');
  var grandEl = document.querySelector('.co-grand');

  function getDeliveryFee() {
    var sel = document.querySelector('input[name="ship"]:checked');
    if (!sel) return 0;
    var fee = Number(sel.getAttribute('data-fee') || '0');
    return isNaN(fee) ? 0 : fee;
  }

  function money(n) { return (Number(n) || 0).toFixed(0) + ' EGP'; }

  function getPrice(sku) {
    if (skuToProduct[sku]) return skuToProduct[sku].price;
    return PRICE_EGP[sku] || 0;
  }

  function render() {
    if (!list) return;
    var cart = readCart();
    var items = Object.keys(cart);
    list.innerHTML = '';
    if (items.length === 0) {
      empty.hidden = false; count.textContent = '0';
      if (subtotalEl) subtotalEl.textContent = money(0);
      if (deliveryEl) deliveryEl.textContent = money(getDeliveryFee());
      if (grandEl) grandEl.textContent = money(getDeliveryFee());
      return;
    }
    empty.hidden = true;
    var totalItems = 0;
    var subtotal = 0;
    items.forEach(function (sku) {
      var qty = cart[sku]; totalItems += qty; subtotal += getPrice(sku) * qty;
      var li = document.createElement('li');
      li.innerHTML = '<strong>' + sku.replace(/-/g, ' ') + '</strong>' +
        '<div class="co-qty">' +
        '<button data-dec="' + sku + '">-</button><span>' + qty + '</span><button data-inc="' + sku + '">+</button>' +
        '</div>' +
        '<button class="co-remove" data-del="' + sku + '">Remove</button>';
      list.appendChild(li);
    });
    count.textContent = String(totalItems);
    var delivery = getDeliveryFee();
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (deliveryEl) deliveryEl.textContent = money(delivery);
    if (grandEl) grandEl.textContent = money(subtotal + delivery);

    Array.prototype.slice.call(list.querySelectorAll('[data-inc]')).forEach(function (b) {
      b.addEventListener('click', function () { var s = b.getAttribute('data-inc'); var c = readCart(); c[s] = (c[s] || 0) + 1; writeCart(c); render(); });
    });
    Array.prototype.slice.call(list.querySelectorAll('[data-dec]')).forEach(function (b) {
      b.addEventListener('click', function () { var s = b.getAttribute('data-dec'); var c = readCart(); c[s] = Math.max(0, (c[s] || 0) - 1); if (c[s] === 0) delete c[s]; writeCart(c); render(); });
    });
    Array.prototype.slice.call(list.querySelectorAll('[data-del]')).forEach(function (b) {
      b.addEventListener('click', function () { var s = b.getAttribute('data-del'); var c = readCart(); delete c[s]; writeCart(c); render(); });
    });
  }

  // Initialize: fetch products then render
  fetchProducts().then(function (productList) {
    buildSkuMap(productList);
    render();
  });

  // Update totals when shipping method changes
  Array.prototype.slice.call(document.querySelectorAll('input[name="ship"]')).forEach(function (r) {
    r.addEventListener('change', render);
  });

  var form = document.querySelector('.co-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) { return; }

      var data = new FormData(form);
      var name = String(data.get('name') || '').trim();
      var email = String(data.get('email') || '').trim();
      var phone = String(data.get('phone') || '').trim();
      var gov = String(data.get('governorate') || '').trim();
      var city = String(data.get('city') || '').trim();
      var address = String(data.get('address') || '').trim();

      var cart = readCart();
      var items = Object.keys(cart);

      if (items.length === 0) {
        alert('Your cart is empty!');
        return;
      }

      // Build items array for API (needs product IDs)
      var hasAllIds = true;
      var apiItems = items.map(function (sku) {
        var product = skuToProduct[sku];
        if (!product) {
          hasAllIds = false;
          return null;
        }
        return { productId: product.id, quantity: cart[sku] };
      }).filter(Boolean);

      var guestInfo = {
        email: email,
        name: name,
        phone: phone,
        address: address + ', ' + city + ', ' + gov
      };

      // Disable submit button
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
      }

      // Try API checkout first
      if (hasAllIds && typeof FreezybiteAPI !== 'undefined') {
        FreezybiteAPI.guestCheckout(apiItems, guestInfo)
          .then(function (result) {
            clearCart();
            showSuccess(result.orderId, name, email);
          })
          .catch(function (err) {
            console.error('API checkout failed:', err);
            // Fallback to email
            fallbackToEmail(name, email, phone, gov, city, address, cart, items);
          })
          .finally(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Place order';
            }
          });
      } else {
        // Fallback: email receipt
        fallbackToEmail(name, email, phone, gov, city, address, cart, items);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Place order';
        }
      }
    });
  }

  function showSuccess(orderId, name, email) {
    var msg = 'Thank you ' + name + '!\n\n';
    msg += 'Your order #' + orderId + ' has been placed successfully.\n';
    msg += 'A confirmation will be sent to ' + email + '.\n\n';
    msg += 'Our team will contact you to confirm the order.\n';
    msg += 'Payment: Cash on Delivery';
    alert(msg);
    window.location.href = './home.html';
  }

  function fallbackToEmail(name, email, phone, gov, city, address, cart, items) {
    var subtotal = 0;
    items.forEach(function (sku) { subtotal += getPrice(sku) * cart[sku]; });
    var delivery = getDeliveryFee();
    var grand = subtotal + delivery;

    var lines = items.map(function (sku) {
      var price = getPrice(sku);
      return sku.replace(/-/g, ' ') + ' x ' + cart[sku] + ' = ' + (price * cart[sku]) + ' EGP';
    }).join('\n');

    var msg = 'Thank you ' + name + '!\n\nYour order summary:\n' + lines + '\n\nSubtotal: ' + subtotal + ' EGP\nDelivery: ' + delivery + ' EGP\nTotal (COD): ' + grand + ' EGP\n\nAddress: ' + address + ', ' + city + ', ' + gov + '\nPhone: ' + phone + '\n\nPlease send your InstaPay deposit to 01093961545. Our team will contact you to confirm.\n';

    // Open mail client as fallback
    var mailto = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent('Your Freezy Bite receipt') + '&body=' + encodeURIComponent(msg);
    window.location.href = mailto;

    clearCart();
    alert('Thanks! Your order was placed. A receipt has been opened in your email client.');
  }

  // Newsletter mimic (footer)
  var nl = document.querySelector('.newsletter-form');
  if (nl) nl.addEventListener('submit', function (e) { e.preventDefault(); alert('Thanks! You are subscribed.'); nl.reset && nl.reset(); });
})();
