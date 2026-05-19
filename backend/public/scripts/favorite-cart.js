/* Customer Favorites: resolve catalog SKU by name and build cart button HTML */
(function () {
  function normalizeProductName(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u0600-\u06FF]/g, '');
  }

  function skuByMetaName(norm) {
    var metaMap = window.__productMetaBySku;
    if (!metaMap || !norm) return '';
    var exact = '';
    var fuzzy = '';
    var fuzzyLen = Infinity;
    Object.keys(metaMap).forEach(function (sku) {
      var meta = metaMap[sku];
      if (!meta || !meta.name) return;
      var pn = normalizeProductName(meta.name);
      if (!pn) return;
      if (pn === norm) {
        exact = sku;
        return;
      }
      if (norm.length >= 3 && (pn.indexOf(norm) !== -1 || norm.indexOf(pn) !== -1)) {
        if (pn.length < fuzzyLen) {
          fuzzy = sku;
          fuzzyLen = pn.length;
        }
      }
    });
    return exact || fuzzy;
  }

  function skuFromProductList(norm, list) {
    if (!Array.isArray(list) || !norm) return '';
    var i;
    for (i = 0; i < list.length; i++) {
      var p = list[i];
      if (p && p.sku && normalizeProductName(p.name) === norm) {
        return String(p.sku).trim();
      }
    }
    var fuzzy = '';
    var fuzzyLen = Infinity;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      if (!p || !p.sku) continue;
      var pn = normalizeProductName(p.name);
      if (!pn || norm.length < 3) continue;
      if (pn.indexOf(norm) !== -1 || norm.indexOf(pn) !== -1) {
        if (pn.length < fuzzyLen) {
          fuzzy = String(p.sku).trim();
          fuzzyLen = pn.length;
        }
      }
    }
    return fuzzy;
  }

  window.resolveFavoriteSkuFromFavorite = function (f) {
    if (!f) return '';
    if (f.sku) return String(f.sku).trim();
    var norm = normalizeProductName(f.name);
    if (!norm) return '';
    return (
      skuByMetaName(norm) ||
      skuFromProductList(norm, window.__catalogProductsForFavorites) ||
      ''
    );
  };

  window.resolveFavoriteSkuFromName = function (name) {
    return window.resolveFavoriteSkuFromFavorite({ name: name });
  };

  window.favoriteCartButtonHtml = function (sku) {
    var safeSku = sku ? String(sku).replace(/"/g, '&quot;') : '';
    return (
      '<button type="button" class="fav-cart add-to-cart" data-sku="' +
      safeSku +
      '" aria-label="Add to cart">' +
      '<img src="./assets/icons/cart.svg" alt="">' +
      '</button>'
    );
  };
})();
