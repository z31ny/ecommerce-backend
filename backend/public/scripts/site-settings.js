/**
 * site-settings.js
 * Loads store settings from /api/settings and dynamically updates:
 * - Logo image (header .logo img)
 * - Page title (document.title)
 * - Footer contact info (phone, email)
 * - Copyright store name
 */
(function () {
    // Product sizes/grams:
    // Prefer DB-backed sizes from /api/products (product.attributes.sizes), fallback to localStorage for older data.
    var STORAGE_PRODUCT_SIZES = 'fb_product_sizes';
    function getProductSizesRaw() {
        try { return JSON.parse(localStorage.getItem(STORAGE_PRODUCT_SIZES) || '{}'); } catch (e) { return {}; }
    }
    function normalizeSizes(val) {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(function (s) { return String(s).trim(); }).filter(Boolean);
        if (typeof val === 'string') return val.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        return [];
    }
    function getProductSizesForSku(sku) {
        if (!sku) return [];
        var key = String(sku).toLowerCase();
        // 1) DB-backed sizes map (loaded below)
        if (window.__productSizesBySku && window.__productSizesBySku[key]) {
            return normalizeSizes(window.__productSizesBySku[key]);
        }
        // 2) localStorage fallback
        var obj = getProductSizesRaw();
        var s = obj[key];
        return normalizeSizes(s);
    }
    window.getProductSizesForSku = getProductSizesForSku;

    function parseFirstNumber(val) {
        var m = String(val || '').match(/(\d+(\.\d+)?)/);
        if (!m) return null;
        var n = parseFloat(m[1]);
        return isNaN(n) ? null : n;
    }
    function parseGrams(val) {
        var s = String(val || '').toLowerCase();
        var n = parseFirstNumber(s);
        if (n === null) return null;
        if (s.indexOf('kg') !== -1) return n * 1000;
        if (s.indexOf('g') !== -1) return n;
        // If unit missing but looks like grams, treat as grams.
        return n;
    }

    function normalizeSizePrices(val) {
        // Accept { "50g": 99, "100g": "149" } or array-like tuples etc (best-effort)
        if (!val || typeof val !== 'object') return null;
        var out = {};
        try {
            Object.keys(val).forEach(function (k) {
                var key = String(k).trim();
                if (!key) return;
                var n = parseFloat(val[k]);
                if (!isNaN(n)) out[key] = n;
            });
        } catch (e) { return null; }
        return out;
    }
    function normalizeSizeKey(val) {
        return String(val == null ? '' : val).trim().toLowerCase().replace(/\s+/g, '');
    }

    function getProductPriceForSkuSize(sku, size, fallbackPrice) {
        var key = String(sku || '').toLowerCase();
        var sz = String(size || '').trim();
        var base = (typeof fallbackPrice === 'number' && !isNaN(fallbackPrice)) ? fallbackPrice : null;

        // Prefer explicit per-size pricing from DB: product.attributes.sizePrices
        if (window.__productMetaBySku && window.__productMetaBySku[key]) {
            var meta = window.__productMetaBySku[key];
            if (meta && meta.sizePrices && sz) {
                // 1) direct key
                if (meta.sizePrices[sz] != null) {
                    var sp0 = parseFloat(meta.sizePrices[sz]);
                    if (!isNaN(sp0)) return sp0;
                }
                // 2) normalized key fallback (handles 100g vs 100 g, case, extra spaces)
                var wanted = normalizeSizeKey(sz);
                var matchedVal = null;
                Object.keys(meta.sizePrices).some(function (k) {
                    if (normalizeSizeKey(k) === wanted) {
                        matchedVal = meta.sizePrices[k];
                        return true;
                    }
                    return false;
                });
                if (matchedVal != null) {
                    var sp = parseFloat(matchedVal);
                    if (!isNaN(sp)) return sp;
                }
            }
            // If no size selected, use first valid size price as product default display/cart price.
            if (meta && meta.sizePrices && !sz) {
                var first = null;
                Object.keys(meta.sizePrices).some(function (k) {
                    var n = parseFloat(meta.sizePrices[k]);
                    if (!isNaN(n) && n > 0) { first = n; return true; }
                    return false;
                });
                if (first != null) return first;
            }

            // Otherwise compute proportionally using grams if possible.
            var gSelected = parseGrams(sz);
            var gBase = parseGrams(meta && meta.weight ? meta.weight : '');
            if (gSelected != null && gBase != null && gBase > 0) {
                var pBase = base != null ? base : parseFloat(meta.price);
                if (!isNaN(pBase)) return (pBase / gBase) * gSelected;
            }
        }

        return base != null ? base : null;
    }
    window.getProductPriceForSkuSize = getProductPriceForSkuSize;

    // Start loading sizes ASAP (do not wait for DOMContentLoaded)
    // Other scripts can wait on window.__productSizesReady if needed.
    window.__productSkuById = window.__productSkuById || {};

    var _candyPageCategories = ['candy', 'candies', 'chocolate', 'lollipop', 'ice cream', 'marshmallow', 'nuts'];
    window.__navigateToProduct = async function (sku) {
        if (!sku) return;
        var skuKey = String(sku).toLowerCase();
        if (window.__productSizesReady && typeof window.__productSizesReady.then === 'function') {
            await window.__productSizesReady;
        }
        var meta = window.__productMetaBySku && window.__productMetaBySku[skuKey];
        var cat = meta && meta.category ? String(meta.category).toLowerCase() : '';
        var page = _candyPageCategories.indexOf(cat) !== -1 ? './candy.html' : './fruits.html';
        window.location.href = page + '?sku=' + encodeURIComponent(sku);
    };

    window.__productSizesReady = (async function () {
        try {
            var resProducts = await fetch('/api/products?limit=500', { cache: 'no-store' });
            if (!resProducts.ok) {
                window.__productSkuById = window.__productSkuById || {};
                return false;
            }
            var list = await resProducts.json();
            var map = {};
            var metaMap = {};
            var skuById = {};
            if (Array.isArray(list)) {
                list.forEach(function (p) {
                    if (p && p.id != null && p.sku) {
                        var sid = String(p.sku);
                        skuById[p.id] = sid;
                        skuById[String(p.id)] = sid;
                    }
                    var sku = p && p.sku ? String(p.sku).toLowerCase() : '';
                    if (!sku) return;
                    var sizes = p.attributes && p.attributes.sizes ? p.attributes.sizes : null;
                    if (sizes) map[sku] = sizes;

                    metaMap[sku] = {
                        name: p && p.name ? p.name : null,
                        price: p && p.price != null ? p.price : null,
                        images: Array.isArray(p && p.images) ? p.images : (p && p.images ? [p.images] : []),
                        weight: p && p.attributes && p.attributes.weight ? p.attributes.weight : null,
                        sizePrices: normalizeSizePrices(p && p.attributes ? p.attributes.sizePrices : null),
                        category: p && p.category ? p.category : null
                    };
                });
            }
            window.__productSizesBySku = map;
            window.__productMetaBySku = metaMap;
            window.__productSkuById = skuById;
            return true;
        } catch (e) {
            window.__productSkuById = window.__productSkuById || {};
            return false;
        }
    })();

    document.addEventListener('DOMContentLoaded', async function () {

        function ensurePolicyModal() {
            if (document.getElementById('policy-modal')) return;
            var wrapper = document.createElement('div');
            wrapper.innerHTML =
                '<div class="modal policy-modal" id="policy-modal" aria-hidden="true">' +
                '  <div class="modal-backdrop" data-close></div>' +
                '  <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="policy-title">' +
                '    <button class="icon-btn modal-close" aria-label="Close" data-close>' +
                '      <img src="./assets/icons/close.svg" alt="close">' +
                '    </button>' +
                '    <h3 id="policy-title">Policy</h3>' +
                '    <div class="policy-body">' +
                '      <section class="policy-section" data-policy="terms" data-title="Terms & Conditions">' +
                '        <p>Welcome to Freezy Bites.</p>' +
                '        <p>By accessing or using our website, you agree to be bound by the following Terms and Conditions. Please read them carefully before using our services.</p>' +
                '        <ol class="legal-list">' +
                '          <li><h3>About Freezy Bites</h3><p>Freezy Bites is an Egyptian brand specializing in freeze-dried candies and treats. Our products are made for enjoyment and are intended for personal use only.</p></li>' +
                '          <li><h3>Use of the Website</h3><p>You agree to use this website for lawful purposes only.</p><p>You must not misuse the website or attempt to harm, hack, or disrupt its functionality.</p><p>Any content on this website may not be copied, reproduced, or reused without written permission from Freezy Bites.</p></li>' +
                '          <li><h3>Products & Availability</h3><p>All products displayed are subject to availability.</p><p>We reserve the right to modify or discontinue any product at any time without prior notice.</p><p>Product images are for illustration purposes only; actual colors or appearance may slightly vary.</p></li>' +
                '          <li><h3>Orders & Payments</h3><p>By placing an order, you confirm that all provided information is accurate and complete.</p><p>Prices are listed in Egyptian Pounds (EGP) unless stated otherwise.</p><p>Freezy Bites reserves the right to cancel or refuse any order for any reason.</p></li>' +
                '          <li><h3>Shipping & Delivery</h3><p>Delivery times are estimated and may vary depending on location and external factors.</p><p>We are not responsible for delays caused by courier services or circumstances beyond our control.</p></li>' +
                '          <li><h3>Returns & Refunds</h3><p>Due to the nature of food products, returns or refunds are not accepted unless the product is damaged or incorrect.</p><p>Any issues must be reported within 24 hours of receiving the order, along with clear proof.</p></li>' +
                '          <li><h3>Health & Allergies</h3><p>Our products may contain or come into contact with allergens such as sugar, gelatin, or flavoring ingredients.</p><p>Customers are responsible for reviewing ingredients and consuming products at their own discretion.</p></li>' +
                '          <li><h3>Intellectual Property</h3><p>All content on this website, including logos, designs, images, and text, is the property of Freezy Bites.</p><p>Unauthorized use of our branding or content is strictly prohibited.</p></li>' +
                '          <li><h3>Limitation of Liability</h3><p>Freezy Bites is not liable for any indirect or consequential damages resulting from the use of our website or products.</p></li>' +
                '          <li><h3>Changes to Terms</h3><p>We reserve the right to update or change these Terms & Conditions at any time. Any changes will be effective immediately upon posting on the website.</p></li>' +
                '          <li><h3>Contact Us</h3><p>If you have any questions about these Terms & Conditions, please contact us through our official social media channels or website contact form.</p></li>' +
                '        </ol>' +
                '      </section>' +
                '      <section class="policy-section" data-policy="privacy" data-title="Privacy Policy">' +
                '        <p>At Freezy Bites, your privacy matters to us. This Privacy Policy explains how we collect, use, and protect your personal information when you visit or interact with our website.</p>' +
                '        <p>By using our website, you agree to the practices described below.</p>' +
                '        <ol class="legal-list">' +
                '          <li><h3>Information We Collect</h3><p>We may collect the following information:</p><p>Your name, phone number, email address, and delivery address when you place an order or contact us.</p><p>Basic technical information such as device type, browser, and website usage data.</p><p>We only collect information that is necessary to provide our services.</p></li>' +
                '          <li><h3>How We Use Your Information</h3><p>Your information is used to:</p><p>Process and deliver your orders.</p><p>Communicate with you about orders, updates, or customer support.</p><p>Improve our website, products, and customer experience.</p><p>Send promotional content (only if you choose to receive it).</p></li>' +
                '          <li><h3>Sharing Your Information</h3><p>We do not sell or rent your personal data to third parties.</p><p>Your information may be shared only with delivery services or partners when necessary to complete your order.</p><p>All shared data is handled securely.</p></li>' +
                '          <li><h3>Cookies</h3><p>Our website may use cookies to:</p><p>Improve website performance.</p><p>Understand how visitors use our site.</p><p>Enhance your browsing experience.</p><p>You can choose to disable cookies in your browser settings.</p></li>' +
                '          <li><h3>Data Protection</h3><p>We take reasonable security measures to protect your personal information from unauthorized access, loss, or misuse. However, no online system is 100% secure.</p></li>' +
                '          <li><h3>Children’s Privacy</h3><p>Freezy Bites does not knowingly collect personal information from children under the age of 13 without parental consent.</p></li>' +
                '          <li><h3>Your Rights</h3><p>You have the right to:</p><p>Request access to the personal data we have about you.</p><p>Ask for corrections or deletion of your personal information.</p><p>Opt out of promotional messages at any time.</p></li>' +
                '          <li><h3>Changes to This Policy</h3><p>We may update this Privacy Policy occasionally. Any changes will be posted on this page and will take effect immediately.</p></li>' +
                '          <li><h3>Contact Us</h3><p>If you have any questions or concerns about this Privacy Policy, please contact us through our website or official social media pages.</p></li>' +
                '        </ol>' +
                '      </section>' +
                '      <section class="policy-section" data-policy="returns" data-title="Return & Exchange Policy">' +
                '        <p>At Freezy Bites, we care about quality and safety. Due to the nature of our products, we have a strict no return and no exchange policy.</p>' +
                '        <ol class="legal-list">' +
                '          <li><h3>No Returns or Exchanges</h3><p>All sales are final.</p><p>We do not accept returns or exchanges once an order has been confirmed or delivered.</p><p>This policy is in place for hygiene and food safety reasons.</p></li>' +
                '          <li><h3>Damaged or Incorrect Orders</h3><p>If you receive:</p><p>A damaged product</p><p>The wrong item</p><p>Please contact us within 24 hours of receiving your order with:</p><p>Clear photos or videos of the issue</p><p>Your order details</p><p>After review, we may offer a replacement or store credit at our discretion.</p></li>' +
                '          <li><h3>Order Cancellations</h3><p>Orders cannot be canceled or modified once they are confirmed and prepared for shipping.</p></li>' +
                '          <li><h3>Final Note</h3><p>By placing an order with Freezy Bites, you acknowledge and agree to this no return & no exchange policy.</p></li>' +
                '          <li><h3>Contact Us</h3><p>For any concerns or issues, please reach out to us through our official website or social media channels, and our team will be happy to assist.</p></li>' +
                '        </ol>' +
                '      </section>' +
                '      <section class="policy-section" data-policy="shipping" data-title="Shipping Information">' +
                '        <p>At Freezy Bites, we work hard to get your favorite freeze-dried treats to you as quickly and safely as possible.</p>' +
                '        <ol class="legal-list">' +
                '          <li><h3>Shipping Areas</h3><p>We currently ship within Egypt only.</p><p>Delivery availability may vary depending on your location.</p></li>' +
                '          <li><h3>Processing Time</h3><p>Orders are processed within 1–3 business days after confirmation.</p><p>Orders placed during weekends or holidays will be processed the next working day.</p></li>' +
                '          <li><h3>Delivery Time</h3><p>Estimated delivery time is 2–5 business days, depending on your city and courier service.</p><p>Delivery times are approximate and may vary due to external factors beyond our control.</p></li>' +
                '          <li><h3>Shipping Fees</h3><p>Shipping fees are calculated at checkout based on your location.</p><p>Any applicable fees will be clearly shown before completing your order.</p></li>' +
                '          <li><h3>Order Confirmation</h3><p>Once your order is confirmed, you will receive a confirmation message with your order details.</p><p>Please ensure all shipping information is accurate to avoid delays.</p></li>' +
                '          <li><h3>Delays & Responsibility</h3><p>Freezy Bites is not responsible for delays caused by courier companies, weather conditions, or incorrect delivery details provided by the customer.</p><p>In case of delivery issues, we will do our best to assist you.</p></li>' +
                '          <li><h3>Failed Delivery Attempts</h3><p>If delivery fails due to incorrect address or unavailability of the customer, additional shipping fees may apply for re-delivery.</p></li>' +
                '          <li><h3>Important Notes</h3><p>Please make sure someone is available to receive the order.</p><p>Once the order is handed to the courier, responsibility transfers to the delivery service.</p></li>' +
                '          <li><h3>Need Help?</h3><p>If you have any questions regarding shipping or delivery, contact us through our website or official social media pages.</p></li>' +
                '        </ol>' +
                '      </section>' +
                '    </div>' +
                '  </div>' +
                '</div>';
            document.body.appendChild(wrapper.firstElementChild);
        }

        function openPolicy(policy) {
            var modal = document.getElementById('policy-modal');
            if (!modal) return;
            var sections = modal.querySelectorAll('.policy-section');
            sections.forEach(function (section) {
                section.classList.toggle('is-active', section.getAttribute('data-policy') === policy);
            });
            var active = modal.querySelector('.policy-section.is-active');
            var title = modal.querySelector('#policy-title');
            if (title && active) {
                title.textContent = active.getAttribute('data-title') || 'Policy';
            }
            modal.setAttribute('aria-hidden', 'false');
        }

        function closePolicy() {
            var modal = document.getElementById('policy-modal');
            if (modal) modal.setAttribute('aria-hidden', 'true');
        }

        ensurePolicyModal();
        document.addEventListener('click', function (e) {
            var link = e.target.closest('[data-policy-open]');
            if (!link) return;
            e.preventDefault();
            openPolicy(link.getAttribute('data-policy-open'));
        });
        document.addEventListener('click', function (e) {
            var closeEl = e.target.closest('#policy-modal [data-close]');
            if (!closeEl) return;
            e.preventDefault();
            closePolicy();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closePolicy();
        });

        // Helper to trigger animations for dynamically added content
        function observeNewElements(container) {
            if (!container) return;
            var targets = container.querySelectorAll('.fade-up');
            if ('IntersectionObserver' in window) {
                var io = new IntersectionObserver(function (entries) {
                    entries.forEach(function (e) {
                        if (e.isIntersecting) {
                            e.target.classList.add('is-in');
                            io.unobserve(e.target);
                        }
                    });
                }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
                targets.forEach(function (el) { io.observe(el); });
            } else {
                targets.forEach(function (el) { el.classList.add('is-in'); });
            }
        }

        /** Pick Your Mood: flip card on face click; front CTA flips to back; links / add-to-cart / size do not flip. */
        function bindMoodsGridFlip(moodsGrid) {
            if (!moodsGrid || moodsGrid.getAttribute('data-mood-flip-bound') === '1') return;
            moodsGrid.setAttribute('data-mood-flip-bound', '1');

            function shouldIgnoreFlip(target) {
                if (!target || !target.closest) return true;
                if (target.closest('.add-to-cart')) return true;
                if (target.closest('a')) return true;
                if (target.closest('select')) return true;
                if (target.closest('option')) return true;
                if (target.closest('label')) return true;
                if (target.closest('input, textarea')) return true;
                return false;
            }

            moodsGrid.addEventListener('click', function (e) {
                var card = e.target.closest('.mood-card');
                if (!card || !moodsGrid.contains(card)) return;
                if (shouldIgnoreFlip(e.target)) return;
                if (e.target.closest('.mood-front-cta')) {
                    e.preventDefault();
                    card.classList.add('is-flipped');
                    return;
                }
                if (e.target.closest('.mood-card-back')) {
                    card.classList.toggle('is-flipped');
                }
            });

            moodsGrid.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                var card = e.target.closest('.mood-card');
                if (!card || !moodsGrid.contains(card)) return;
                if (shouldIgnoreFlip(e.target)) return;
                if (e.target.closest('.mood-front-cta')) {
                    e.preventDefault();
                    card.classList.add('is-flipped');
                    return;
                }
                if (e.target.closest('.mood-card-back')) {
                    e.preventDefault();
                    card.classList.toggle('is-flipped');
                }
            });
        }

        try {
            const res = await fetch('/api/settings', { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();

            // === Moods (flip cards) ===
            // Render early so it still loads even if another section errors later.
            if (data.moods && Array.isArray(data.moods)) {
                try {
                    await window.__productSizesReady;
                    var moodsGrid = document.getElementById('moods-grid');
                    if (moodsGrid) {
                        var activeMoods = data.moods.filter(function (m) { return m.status === 'active'; });
                        if (activeMoods.length === 0) {
                            moodsGrid.innerHTML = '';
                            var moodsSection = document.getElementById('moods');
                            if (moodsSection) moodsSection.style.display = 'none';
                        } else {
                            var moodColorMap = {
                                pink: { bg: 'linear-gradient(135deg,#fce4ec,#f8bbd0)', text: '#880e4f' },
                                blue: { bg: 'linear-gradient(135deg,#e3f2fd,#bbdefb)', text: '#0d47a1' },
                                green: { bg: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)', text: '#1b5e20' },
                                yellow: { bg: 'linear-gradient(135deg,#fff8e1,#ffecb3)', text: '#f57f17' },
                                purple: { bg: 'linear-gradient(135deg,#f3e5f5,#e1bee7)', text: '#4a148c' },
                                orange: { bg: 'linear-gradient(135deg,#fff3e0,#ffe0b2)', text: '#e65100' }
                            };
                            function escHtml(str) {
                                return String(str == null ? '' : str)
                                    .replace(/&/g, '&amp;')
                                    .replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')
                                    .replace(/"/g, '&quot;');
                            }
                            function escAttr(str) {
                                return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                            }
                            function moodLinkedProductIdRaw(m) {
                                if (m.linkedProductId == null || m.linkedProductId === '') return '';
                                var s = String(m.linkedProductId).trim();
                                return s;
                            }
                            function moodResolveCartSku(m) {
                                var byId = window.__productSkuById || {};
                                var raw = moodLinkedProductIdRaw(m);
                                if (raw !== '') {
                                    var lid = Number(raw);
                                    var skuFromProduct = !isNaN(lid)
                                        ? (byId[lid] || byId[String(lid)] || byId[raw])
                                        : (byId[raw]);
                                    if (skuFromProduct) return String(skuFromProduct).trim();
                                }
                                if (m.productSku && String(m.productSku).trim()) {
                                    return String(m.productSku).trim();
                                }
                                return '';
                            }
                            moodsGrid.innerHTML = activeMoods.map(function (m) {
                                var colors = moodColorMap[m.color] || moodColorMap.pink;
                                var linkedIdRaw = moodLinkedProductIdRaw(m);
                                var skuRaw = moodResolveCartSku(m);
                                var dataSkuAttr = skuRaw ? ' data-sku="' + escAttr(skuRaw) + '"' : '';
                                var dataProductAttr = linkedIdRaw ? ' data-product-id="' + escAttr(linkedIdRaw) + '"' : '';
                                var hasSizes = m.sizes && m.sizes.length > 0;
                                var sizeOptionsHtml = hasSizes
                                    ? '<option value="">Choose size</option>' +
                                        m.sizes.map(function (s) { return '<option value="' + escHtml(s) + '">' + escHtml(s) + '</option>'; }).join('')
                                    : '';
                                function sizesBlock(labelStyle) {
                                    if (!hasSizes) return '';
                                    return '<label class="offer-size-label mood-size-label" style="' + labelStyle + '">Size</label>' +
                                        '<select class="product-size-select form-select mood-size-select">' +
                                        sizeOptionsHtml +
                                        '</select>';
                                }
                                var sizesHtmlBack = hasSizes ? sizesBlock('color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);') : '';
                                var cartIconBtn = '<button type="button" class="mood-cart-icon mood-cart-icon--front add-to-cart" aria-label="Add to cart">' +
                                    '<img src="./assets/icons/cart.svg" alt="">' +
                                    '</button>';
                                var addCartBtn = '<button type="button" class="mood-cart-icon mood-cart-icon--back add-to-cart" aria-label="Add to cart">' +
                                    '<img src="./assets/icons/cart.svg" alt="">' +
                                    '</button>';
                                var backActions = '<div class="mood-back-actions">' + addCartBtn + '</div>';
                                var frontCartRow = '<div class="mood-front-cart-row">' +
                                    cartIconBtn +
                                    '</div>';
                                return '<div class="mood-card fade-up" tabindex="0"' + dataSkuAttr + dataProductAttr + '>' +
                                    '<div class="mood-card-inner">' +
                                    '  <div class="mood-card-front" style="background:' + colors.bg + ';color:' + colors.text + ';">' +
                                    '    <h3>' + escHtml(m.title || '') + '</h3>' +
                                    '    <p>' + escHtml(m.description || '') + '</p>' +
                                    frontCartRow +
                                    (m.buttonText ? '    <button type="button" class="mood-btn mood-front-cta">' + escHtml(m.buttonText) + '</button>' : '') +
                                    '  </div>' +
                                    '  <div class="mood-card-back" style="' + (m.backImage ? 'background-image:url(' + m.backImage + ');background-size:cover;background-position:center;' : 'background:' + colors.bg + ';') + '">' +
                                    (m.backDescription ? '    <p class="mood-back-text">' + escHtml(m.backDescription) + '</p>' : '') +
                                    sizesHtmlBack +
                                    backActions +
                                    '  </div>' +
                                    '</div>' +
                                    '</div>';
                            }).join('');
                            observeNewElements(moodsGrid);

                            bindMoodsGridFlip(moodsGrid);
                        }
                    }
                } catch (e) {
                    // Ignore moods rendering errors so other sections still load
                }
            }

            // === Branding: Logo + Store Name ===
            if (data.branding) {
                // Update logo image
                if (data.branding.logo) {
                    const logoImgs = document.querySelectorAll('.logo img, .brand-nav .logo img');
                    logoImgs.forEach(function (img) {
                        img.src = data.branding.logo;
                        if (data.branding.storeName) img.alt = data.branding.storeName;
                    });
                }

                // Update page title with store name
                if (data.branding.storeName) {
                    const currentTitle = document.title;
                    // Replace "Freezy Bite" in the title
                    if (currentTitle.includes('Freezy Bite')) {
                        document.title = currentTitle.replace('Freezy Bite', data.branding.storeName);
                    }

                    // Update copyright text in footer
                    const copyright = document.querySelector('.copyright');
                    if (copyright) {
                        copyright.innerHTML = copyright.innerHTML.replace(/Freezy Bite/g, data.branding.storeName);
                    }
                }
            }

            // === Store Info: Footer Contact ===
            if (data.store) {
                const phoneSpan = document.querySelector('.footer-contact .fc-row:first-child span');
                const emailSpan = document.querySelector('.footer-contact .fc-row:last-child span');
                if (phoneSpan && data.store.phone) phoneSpan.textContent = data.store.phone;
                if (emailSpan && data.store.email) emailSpan.textContent = data.store.email;
            }

            // === Payment: InstaPay number ===
            if (data.payment && data.payment.instapayNumber) {
                const noteEl = document.querySelector('.co-note');
                if (noteEl) {
                    noteEl.innerHTML = 'Payment method: Cash on Delivery. To confirm your order faster, send a small deposit via InstaPay to <strong>' + data.payment.instapayNumber + '</strong> — our team will contact you to confirm.';
                }
            }

            // NOTE: Do not overwrite contact page card from store settings.
            // Contact page content is managed by `data.contact` section below.

            // === Testimonials ===
            if (data.testimonials && Array.isArray(data.testimonials)) {
                var grid = document.getElementById('testimonials-grid');
                if (grid) {
                    var active = data.testimonials.filter(function (t) { return t.status === 'active'; });
                    if (active.length === 0) {
                        grid.innerHTML = '';
                        var section = document.getElementById('testimonials');
                        if (section) section.style.display = 'none';
                    } else {
                        grid.innerHTML = active.map(function (t) {
                            var colorMap = {
                                yellow: '#fef3c7', pink: '#fce7f3', green: '#d1fae5',
                                blue: '#dbeafe', purple: '#ede9fe', orange: '#ffedd5'
                            };
                            var bg = colorMap[t.bubbleColor] || '#fef3c7';
                            return '<div class="testimonial-item fade-up" style="background:' + bg + ';border-radius:1rem;padding:1.5rem;text-align:center;">' +
                                '<p style="font-size:1rem;font-weight:600;color:#1f2937;margin-bottom:0.5rem;">"' + (t.teaser || t.fullReview || '') + '"</p>' +
                                '<p style="font-size:0.85rem;color:#6b7280;">— ' + (t.author || 'Customer') + '</p>' +
                                '</div>';
                        }).join('');
                        observeNewElements(grid);
                    }
                }
            }

            // === FAQs ===
            if (data.faqs && Array.isArray(data.faqs)) {
                var faqList = document.getElementById('faq-list');
                if (faqList) {
                    var activeFaqs = data.faqs.filter(function (f) { return f.status === 'active'; });
                    if (activeFaqs.length === 0) {
                        faqList.innerHTML = '';
                        var faqSection = document.getElementById('faqs');
                        if (faqSection) faqSection.style.display = 'none';
                    } else {
                        faqList.innerHTML = activeFaqs.map(function (f, i) {
                            return '<details class="faq-item fade-up" style="background:var(--card-bg,#fff);border-radius:0.75rem;padding:1rem 1.5rem;margin-bottom:0.75rem;box-shadow:0 1px 3px rgba(0,0,0,0.08);cursor:pointer;">' +
                                '<summary style="font-weight:600;font-size:1rem;color:#1f2937;list-style:none;display:flex;justify-content:space-between;align-items:center;">' +
                                f.question + '<span style="font-size:1.2rem;transition:transform 0.3s;">+</span></summary>' +
                                '<p style="margin-top:0.75rem;color:#4b5563;line-height:1.6;">' + f.answer + '</p>' +
                                '</details>';
                        }).join('');
                        observeNewElements(faqList);
                    }
                }
            }

            // === Snacks (inside our snack section) ===
            if (data.snacks && Array.isArray(data.snacks)) {
                var insideTrack = document.getElementById('inside-track');
                if (insideTrack) {
                    var activeSnacks = data.snacks.filter(function (s) { return s.status === 'active'; });
                    if (activeSnacks.length === 0) {
                        insideTrack.innerHTML = '';
                        var insideSection = document.getElementById('inside');
                        if (insideSection) insideSection.style.display = 'none';
                    } else {
                        insideTrack.innerHTML = activeSnacks.map(function (s) {
                            return '<div class="snack-card fade-up" tabindex="0">' +
                                '<div class="snack-card-inner">' +
                                '  <div class="snack-card-front">' +
                                (s.frontImage ? '    <img src="' + s.frontImage + '" alt="' + (s.title || 'Snack') + '">' : '') +
                                '    <span class="snack-label">' + (s.frontLabel || s.title || '') + '</span>' +
                                '  </div>' +
                                '  <div class="snack-card-back">' +
                                (s.backImage ? '    <img src="' + s.backImage + '" alt="' + (s.title || 'Snack') + ' back">' : '') +
                                '    <span class="snack-label">' + (s.backLabel || 'Back') + '</span>' +
                                '  </div>' +
                                '</div>' +
                                '</div>';
                        }).join('');
                        observeNewElements(insideTrack);
                    }
                }
            }

            // === Favorites (product cards) ===
            // Backward compatible:
            // - old: favorites: Favorite[]
            // - new: favorites: { fruits: Favorite[], candy: Favorite[] }
            var favList = null;
            if (data.favorites && Array.isArray(data.favorites)) {
                favList = data.favorites;
            } else if (data.favorites && typeof data.favorites === 'object') {
                var f1 = Array.isArray(data.favorites.fruits) ? data.favorites.fruits : [];
                var f2 = Array.isArray(data.favorites.candy) ? data.favorites.candy : [];
                favList = f1.concat(f2);
            }
            if (favList && Array.isArray(favList)) {
                var favGrid = document.getElementById('favorites-grid');
                if (favGrid) {
                    var activeFavs = favList.filter(function (f) { return f.status === 'active'; });
                    if (activeFavs.length === 0) {
                        favGrid.innerHTML = '';
                        var favSection = document.getElementById('favorites');
                        if (favSection) favSection.style.display = 'none';
                    } else {
                        favGrid.innerHTML = activeFavs.map(function (f) {
                            var stars = '';
                            for (var i = 1; i <= 5; i++) {
                                stars += '<span class="fav-star' + (i <= (f.rating || 5) ? ' filled' : '') + '">★</span>';
                            }
                            var cat = String(f.category || '');
                            if (cat.toLowerCase() === 'candies' || cat.toLowerCase() === 'candy') cat = 'Candies';
                            else cat = 'Fruits';
                            return '<div class="favorite-card fade-up">' +
                                (f.image ? '<div class="fav-img"><img src="' + f.image + '" alt="' + (f.name || '') + '"></div>' : '') +
                                '<div class="fav-info">' +
                                '  <h3 class="fav-name">' + (f.name || '') + '</h3>' +
                                '  <div class="fav-rating">' + stars + '<span class="fav-count">(' + (f.reviewCount || 0) + ')</span></div>' +
                                '  <p class="fav-price">' + (f.price || 0) + ' EGP</p>' +
                                '  <span class="fav-category">' + cat + '</span>' +
                                '</div>' +
                                '</div>';
                        }).join('');
                        observeNewElements(favGrid);
                    }
                }
            }

            // === Hero Images (page-specific backgrounds) ===
            if (data.heroes && Array.isArray(data.heroes)) {
                var pageName = window.location.pathname.split('/').pop().replace('.html', '');
                var heroMap = { fruits: 'fruits', candy: 'candy', about: 'about', contact: 'contact', offers: 'offers' };
                var heroKey = heroMap[pageName];
                if (heroKey) {
                    var hero = data.heroes.find(function (h) { return h.id === heroKey; });
                    if (hero && hero.image) {
                        var heroEl = document.querySelector('.candy-hero, .contact-hero, .fruits-hero, .about-hero, .offers-hero');
                        if (heroEl) {
                            heroEl.style.backgroundImage = 'url(' + hero.image + ')';
                            heroEl.style.backgroundSize = 'cover';
                            heroEl.style.backgroundPosition = 'center';
                        }
                    }
                }
            }

            // === Contact Page Content (dynamic) ===
            if (data.contact && typeof data.contact === 'object') {
                var cc = data.contact;
                var reachTitleEl = document.getElementById('contactReachTitle');
                var mainDescEl = document.getElementById('contactMainDescription');
                if (reachTitleEl && cc.reachTitle) reachTitleEl.textContent = cc.reachTitle;
                if (mainDescEl) mainDescEl.textContent = cc.mainDescription || '';
                var contactCard = document.querySelector('.contact-card');
                if (contactCard) {
                    var html = '';
                    // Always render these rows so stale/demo values are not kept.
                    html += '<p><strong>' + (cc.visitLabel || 'Visit Us') + '</strong><br> ' + (cc.address || '') + '</p>';
                    html += '<p><strong>' + (cc.phoneLabel || 'Call or WhatsApp') + '</strong><br> ' + (cc.phone || '') + '</p>';
                    html += '<p><strong>' + (cc.emailLabel || 'Email') + '</strong><br> ' + (cc.email || '') + '</p>';
                    var socialLinks = [];
                    if (cc.tiktok) socialLinks.push('<a href="' + cc.tiktok + '" target="_blank" rel="noopener noreferrer">TikTok</a>');
                    if (cc.instagram) socialLinks.push('<a href="' + cc.instagram + '" target="_blank" rel="noopener noreferrer">Instagram</a>');
                    if (cc.facebook) socialLinks.push('<a href="' + cc.facebook + '" target="_blank" rel="noopener noreferrer">Facebook</a>');
                    if (cc.whatsapp) socialLinks.push('<a href="https://wa.me/' + cc.whatsapp.replace(/[^0-9]/g, '') + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>');
                    if (socialLinks.length > 0) {
                        html += '<p><strong>' + (cc.socialLabel || 'Follow Us') + '</strong><br>' + socialLinks.join(' · ') + '</p>';
                    }
                    if (cc.socialDescription) html += '<p style="opacity:.85">' + cc.socialDescription + '</p>';
                    contactCard.innerHTML = html;
                }
                // Also update footer social links if contact has social data
                if (cc.tiktok || cc.instagram || cc.facebook) {
                    var socialBadges = document.querySelectorAll('.footer-social .social-badge');
                    socialBadges.forEach(function (badge) {
                        var label = badge.getAttribute('aria-label');
                        if (label === 'TikTok' && cc.tiktok) badge.href = cc.tiktok;
                        if (label === 'Facebook' && cc.facebook) badge.href = cc.facebook;
                        if (label === 'Instagram' && cc.instagram) badge.href = cc.instagram;
                    });
                }
            }

            // === Shipping Settings (update checkout delivery map) ===
            if (data.shipping && typeof data.shipping === 'object') {
                var ss = data.shipping;
                // Store shipping settings globally for checkout.js to pick up
                window.__freezyShipping = ss;
            }
        } catch (e) {
            // Silently fail — pages still work with hardcoded values
        }
    });
})();
