/* Render checkout items from the same localStorage cart as the site. */
(function () {
  var STORAGE_CART = 'fb_cart_v1';
  var productsCache = null;

  function readCart() { try { return JSON.parse(localStorage.getItem(STORAGE_CART) || '{}'); } catch (e) { return {}; } }
  function writeCart(c) { localStorage.setItem(STORAGE_CART, JSON.stringify(c)); }
  function clearCart() { localStorage.removeItem(STORAGE_CART); }

  // Send confirmation email via API
  function sendConfirmationEmail(orderId, customerName, customerEmail, itemSkus, cart, gov, city, address) {
    var subtotal = 0;
    var delivery = getDeliveryFee();
    var itemsData = itemSkus.map(function (sku) {
      var price = getPrice(sku);
      var qty = cart[sku] || 1;
      subtotal += price * qty;
      return {
        sku: sku,
        name: sku.replace(/-/g, ' '),
        quantity: qty,
        price: price * qty
      };
    });

    fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderId,
        customerName: customerName,
        customerEmail: customerEmail,
        items: itemsData,
        subtotal: subtotal,
        delivery: delivery,
        total: subtotal + delivery,
        address: address + ', ' + city + ', ' + gov
      })
    }).catch(function (err) {
      console.error('Email send failed:', err);
    });
  }

  // Fetch products from API to get IDs and prices
  function fetchProducts() {
    if (productsCache) return Promise.resolve(productsCache);
    return fetch('/api/products?limit=100')
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
    // Home page products
    'mango-250': 120,
    'marshmallow-pack': 90,
    'snickers-pack': 140,
    'banana-250': 110,
    'strawberries-250': 130,
    'marshmallows-pack': 90,
    'blueberries-250': 150,
    // Mood products
    'sweet': 120,
    'bold': 120,
    'cool': 120,
    'chill': 120,
    'mysterious': 130,
    'zesty': 130,
    // Fruits page
    'strawberry-fav': 130,
    'peach-slices': 120,
    'mango-bites': 150,
    'pineapple-rings': 160,
    'banana-chips': 110,
    'coconut-crisp': 140,
    'apple-slices': 120,
    'pear-bites': 130,
    'cranberry-pop': 135,
    'figs': 140,
    'pear-fall': 130,
    'plum-dream': 145,
    'rainbow-mix': 160,
    'berry-bash': 155,
    'citrus-party': 150,
    'veggie-crunch': 140,
    // Candy page
    'swirl-lollipop': 200,
    'choco-bar-crisp': 200,
    'fruity-best-seller': 300,
    'straw-van-choco': 150,
    'fd-skittles': 150,
    'fd-banana-mm': 200,
    'fd-twirl-mm': 200,
    'fd-sour-worms': 200,
    'fd-gummies': 200,
    'fd-rainbow-drops': 150,
    'fd-fruit-rolls': 300,
    'fd-cotton-taffy': 150,
    'mars': 150,
    'eclair-caramel': 200,
    'lion-chocolate': 200,
    'milky-way': 200,
    'snickers': 150,
    'caramel-giant-lollipop': 300,
    'choco-cream-lollipop': 300,
    'strawberry-giant-lollipop': 300,
    'vanilla-giant-lollipop': 300,
    'ice-cream-cubes': 400,
    'mix-marshmallow-dip': 500,
    'vanilla-pecan-shell': 400
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
    var shipValue = document.getElementById('ship-value');
    if (!shipValue) return 0;
    var fee = Number(shipValue.value || '0');
    return isNaN(fee) ? 0 : fee;
  }

  function getShippingSettings() {
    // Prefer API-loaded settings from site-settings.js
    if (window.__freezyShipping) return window.__freezyShipping;
    try {
      return JSON.parse(localStorage.getItem('freezyBiteShippingSettings') || 'null');
    } catch (e) {
      return null;
    }
  }

  function normalizeFee(value) {
    if (value === '' || value === null || typeof value === 'undefined') return null;
    var num = Number(value);
    return isNaN(num) ? null : num;
  }

  // Delivery mapping by governorate
  var DELIVERY_MAP = {
    'Cairo': { fee: 50, days: '1–2 days', zone: 'Cairo — 50 EGP' },
    'Giza': { fee: 50, days: '1–2 days', zone: 'Giza — 50 EGP' },
    'Alexandria': { fee: 60, days: '2–3 days', zone: 'Alexandria — 60 EGP' },
    'Sharqia': { fee: 70, days: '2–5 days', zone: 'Sharqia — 70 EGP' },
    'Qalyubia': { fee: 60, days: '2–3 days', zone: 'Qalyubia — 60 EGP' },
    'Gharbia': { fee: 70, days: '2–5 days', zone: 'Gharbia — 70 EGP' },
    'Monufia': { fee: 70, days: '2–5 days', zone: 'Monufia — 70 EGP' },
    'Ismailia': { fee: 70, days: '2–5 days', zone: 'Ismailia — 70 EGP' },
    'Damietta': { fee: 70, days: '2–5 days', zone: 'Damietta — 70 EGP' },
    'Other': { fee: 80, days: '3–7 days', zone: 'Other — 80 EGP' }
  };

  function updateDeliveryFromGovernorate() {
    var govSelect = document.querySelector('[name="governorate"]');
    var deliveryZone = document.getElementById('delivery-zone');
    var deliveryDays = document.getElementById('delivery-days');
    var shipValue = document.getElementById('ship-value');

    if (!govSelect) return;
    var gov = govSelect.value;
    var info = DELIVERY_MAP[gov] || DELIVERY_MAP['Other'];
    var settings = getShippingSettings();
    if (settings) {
      var byGov = settings.byGovernorate && settings.byGovernorate[gov];
      var feeOverride = normalizeFee(byGov && byGov.fee);
      var daysOverride = byGov && byGov.days;
      var defaultFee = normalizeFee(settings.defaultFee);
      var defaultDays = settings.defaultDays;
      var fee = feeOverride !== null ? feeOverride : (defaultFee !== null ? defaultFee : info.fee);
      var days = (daysOverride && String(daysOverride).trim()) ? daysOverride : (defaultDays && String(defaultDays).trim() ? defaultDays : info.days);
      info = {
        fee: fee,
        days: days,
        zone: (gov || 'Other') + ' — ' + fee + ' EGP'
      };
    }

    if (gov && deliveryZone) {
      deliveryZone.textContent = info.zone;
      if (deliveryDays) deliveryDays.textContent = 'Estimated: ' + info.days;
      if (shipValue) shipValue.value = info.fee;
    } else if (deliveryZone) {
      deliveryZone.textContent = 'Select governorate';
      if (deliveryDays) deliveryDays.textContent = '';
      if (shipValue) shipValue.value = '0';
    }
    render();
  }

  // Listen for governorate changes
  var govSelect = document.querySelector('[name="governorate"]');
  if (govSelect) {
    govSelect.addEventListener('change', updateDeliveryFromGovernorate);
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
    console.log('[Checkout] Fetched products from API:', productList);
    buildSkuMap(productList);
    console.log('[Checkout] Built SKU map:', skuToProduct);
    console.log('[Checkout] SKU map keys:', Object.keys(skuToProduct));
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

      console.log('[Checkout] Cart items (SKUs):', items);
      console.log('[Checkout] SKU to Product map:', skuToProduct);
      console.log('[Checkout] Has all IDs:', hasAllIds);
      console.log('[Checkout] API items:', apiItems);
      console.log('[Checkout] FreezybiteAPI available:', typeof FreezybiteAPI !== 'undefined');

      // Disable submit button
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
      }

      // Try API checkout if we have product IDs
      if (hasAllIds && apiItems.length > 0 && typeof FreezybiteAPI !== 'undefined') {
        console.log('[Checkout] Attempting API checkout...');
        FreezybiteAPI.guestCheckout(apiItems, guestInfo)
          .then(function (result) {
            console.log('[Checkout] API checkout SUCCESS:', result);
            // Send confirmation email
            sendConfirmationEmail(result.orderId, name, email, items, cart, gov, city, address);
            clearCart();
            showSuccess(result.orderId, name, email);
          })
          .catch(function (err) {
            console.error('[Checkout] API checkout FAILED:', err);
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
        console.log('[Checkout] Falling back to email-only (no product IDs or API unavailable)');
        console.log('[Checkout] Reason: hasAllIds=' + hasAllIds + ', apiItems.length=' + apiItems.length);
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
    // Redirect to success page with order details
    var params = new URLSearchParams({
      orderId: orderId,
      name: name,
      email: email
    });
    window.location.href = './order-success.html?' + params.toString();
  }

  function fallbackToEmail(name, email, phone, gov, city, address, cart, items) {
    // Generate a local order ID (timestamp-based)
    var localOrderId = 'FB' + Date.now().toString(36).toUpperCase();

    // Send confirmation email (will be skipped if no API key)
    sendConfirmationEmail(localOrderId, name, email, items, cart, gov, city, address);

    clearCart();

    // Redirect to success page
    showSuccess(localOrderId, name, email);
  }

  // Newsletter mimic (footer)
  var nl = document.querySelector('.newsletter-form');
  if (nl) nl.addEventListener('submit', function (e) { e.preventDefault(); alert('Thanks! You are subscribed.'); nl.reset && nl.reset(); });
})();
