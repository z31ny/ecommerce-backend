/* Render checkout items from the same localStorage cart as the site. */
(function(){
  var STORAGE_CART = 'fb_cart_v1';
  function readCart(){ try { return JSON.parse(localStorage.getItem(STORAGE_CART) || '{}'); } catch(e){ return {}; } }
  function writeCart(c){ localStorage.setItem(STORAGE_CART, JSON.stringify(c)); }

  // Basic price list (EGP). Adjust as needed.
  var PRICE_EGP = {
    'mango-250': 120,
    'marshmallow-pack': 90,
    'snickers-pack': 140,
    'banana-250': 110,
    'strawberries-250': 130,
    'blueberries-250': 150,
    // moods (examples)
    'sweet': 120,
    'bold': 120,
    'cool': 120,
    'chill': 120,
    'mysterious': 130,
    'zesty': 130
    ,
    // candy page items
    'chocolate-bar': 80,
    'chocolate-brownie': 95,
    'gummy-rainbow': 60,
    'marshmallow-cup': 85,
    'lollipop-pop': 45,
    'ice-cream-cup': 90,
    'nut-mix': 120
  };

  var list = document.querySelector('.co-list');
  var empty = document.querySelector('.co-empty');
  var count = document.querySelector('.co-count');
  var subtotalEl = document.querySelector('.co-subtotal');
  var deliveryEl = document.querySelector('.co-delivery');
  var grandEl = document.querySelector('.co-grand');

  function getDeliveryFee(){
    var sel = document.querySelector('input[name="ship"]:checked');
    if (!sel) return 0;
    var fee = Number(sel.getAttribute('data-fee') || '0');
    return isNaN(fee) ? 0 : fee;
  }

  function money(n){ return (Number(n) || 0).toFixed(0) + ' EGP'; }

  function render(){
    if (!list) return;
    var cart = readCart();
    var items = Object.keys(cart);
    list.innerHTML = '';
    if (items.length === 0){
      empty.hidden = false; count.textContent = '0';
      if (subtotalEl) subtotalEl.textContent = money(0);
      if (deliveryEl) deliveryEl.textContent = money(getDeliveryFee());
      if (grandEl) grandEl.textContent = money(getDeliveryFee());
      return;
    }
    empty.hidden = true;
    var totalItems = 0;
    var subtotal = 0;
    items.forEach(function(sku){
      var qty = cart[sku]; totalItems += qty; subtotal += (PRICE_EGP[sku] || 0) * qty;
      var li = document.createElement('li');
      li.innerHTML = '<strong>'+sku.replace(/-/g,' ')+'</strong>'+
        '<div class="co-qty">'+
        '<button data-dec="'+sku+'">-</button><span>'+qty+'</span><button data-inc="'+sku+'">+</button>'+
        '</div>'+
        '<button class="co-remove" data-del="'+sku+'">Remove</button>';
      list.appendChild(li);
    });
    count.textContent = String(totalItems);
    var delivery = getDeliveryFee();
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (deliveryEl) deliveryEl.textContent = money(delivery);
    if (grandEl) grandEl.textContent = money(subtotal + delivery);

    Array.prototype.slice.call(list.querySelectorAll('[data-inc]')).forEach(function(b){
      b.addEventListener('click', function(){ var s=b.getAttribute('data-inc'); var c=readCart(); c[s]=(c[s]||0)+1; writeCart(c); render(); });
    });
    Array.prototype.slice.call(list.querySelectorAll('[data-dec]')).forEach(function(b){
      b.addEventListener('click', function(){ var s=b.getAttribute('data-dec'); var c=readCart(); c[s]=Math.max(0,(c[s]||0)-1); if(c[s]===0) delete c[s]; writeCart(c); render(); });
    });
    Array.prototype.slice.call(list.querySelectorAll('[data-del]')).forEach(function(b){
      b.addEventListener('click', function(){ var s=b.getAttribute('data-del'); var c=readCart(); delete c[s]; writeCart(c); render(); });
    });
  }
  render();

  // Update totals when shipping method changes
  Array.prototype.slice.call(document.querySelectorAll('input[name="ship"]')).forEach(function(r){
    r.addEventListener('change', render);
  });

  var form = document.querySelector('.co-form');
  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      // basic client-side validation
      if (!form.reportValidity()) { return; }

      var data = new FormData(form);
      var name = String(data.get('name') || '').trim();
      var email = String(data.get('email') || '').trim();
      var phone = String(data.get('phone') || '').trim();
      var gov = String(data.get('governorate') || '').trim();
      var city = String(data.get('city') || '').trim();
      var address = String(data.get('address') || '').trim();

      // build receipt details
      var cart = readCart();
      var items = Object.keys(cart);
      var subtotal = 0;
      items.forEach(function(sku){ subtotal += (PRICE_EGP[sku] || 0) * cart[sku]; });
      var delivery = getDeliveryFee();
      var grand = subtotal + delivery;

      var lines = items.map(function(sku){
        var price = PRICE_EGP[sku] || 0;
        return sku.replace(/-/g,' ')+' x '+cart[sku]+' = '+(price*cart[sku])+' EGP';
      }).join('\n');
      var msg = 'Thank you '+name+'!\n\nYour order summary:\n'+lines+'\n\nSubtotal: '+subtotal+' EGP\nDelivery: '+delivery+' EGP\nTotal (COD): '+grand+' EGP\n\nAddress: '+address+', '+city+', '+gov+'\nPhone: '+phone+'\n\nPlease send your InstaPay deposit to 01093961545. Our team will contact you to confirm.\n';

      function sent(){ alert('Thanks! Your order was placed. A receipt has been sent to '+email+'.'); }
      function failed(){ alert('Order received, but email could not be sent automatically. We will contact you shortly.'); }

      // Try EmailJS first
      try {
        if (window.emailjs && 'YOUR_PUBLIC_KEY' !== 'YOUR_PUBLIC_KEY') {
          emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
            to_email: email,
            to_name: name,
            message: msg
          }).then(sent, failed);
        } else {
          // Fallback: open mail client
          var mailto = 'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('Your Freezy Bite receipt')+'&body='+encodeURIComponent(msg);
          window.location.href = mailto;
          sent();
        }
      } catch(err){ failed(); }

      // Optional: clear cart after order
      // localStorage.removeItem(STORAGE_CART);
    });
  }

  // Newsletter mimic (footer)
  var nl = document.querySelector('.newsletter-form');
  if (nl) nl.addEventListener('submit', function(e){ e.preventDefault(); alert('Thanks! You are subscribed.'); nl.reset && nl.reset(); });
})();


