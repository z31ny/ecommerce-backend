/**
 * Full-screen image viewer for product photos across the public site.
 */
(function () {
  function ensureImageLightbox() {
    var id = 'fb-image-lightbox';
    var existing = document.getElementById(id);
    if (existing) return existing;

    var lb = document.createElement('div');
    lb.id = id;
    lb.className = 'fb-image-lightbox';
    lb.hidden = true;
    lb.innerHTML =
      '<div class="fb-image-lightbox-backdrop" aria-hidden="true"></div>' +
      '<div class="fb-image-lightbox-panel" role="dialog" aria-modal="true" aria-label="Full size image">' +
      '  <button type="button" class="fb-image-lightbox-close" aria-label="Close">&times;</button>' +
      '  <img class="fb-image-lightbox-img" src="" alt="">' +
      '</div>';
    document.body.appendChild(lb);

    lb.querySelector('.fb-image-lightbox-backdrop').addEventListener('click', closeImageLightbox);
    lb.querySelector('.fb-image-lightbox-close').addEventListener('click', closeImageLightbox);

    if (!window.__fbLightboxEscBound) {
      window.__fbLightboxEscBound = true;
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeImageLightbox();
      });
    }
    return lb;
  }

  function openImageLightbox(src, alt) {
    if (!src) return;
    var lb = ensureImageLightbox();
    var img = lb.querySelector('.fb-image-lightbox-img');
    img.src = src;
    img.alt = alt || 'Full size image';
    lb.hidden = false;
    document.body.classList.add('fb-lightbox-open');
  }

  function closeImageLightbox() {
    var lb = document.getElementById('fb-image-lightbox');
    if (!lb) return;
    lb.hidden = true;
    var img = lb.querySelector('.fb-image-lightbox-img');
    if (img) img.src = '';
    document.body.classList.remove('fb-lightbox-open');
  }

  window.__fbOpenImageLightbox = openImageLightbox;
  window.__fbCloseImageLightbox = closeImageLightbox;

  function isIconOrUiImage(img) {
    if (!img) return true;
    if (img.closest('.add-to-cart, .mood-cart-icon, .product-share-btn, .icon-btn, .topbar, .sidebar-nav, .fb-image-lightbox')) {
      return true;
    }
    var src = String(img.getAttribute('src') || '').toLowerCase();
    if (src.indexOf('/assets/icons/') !== -1) return true;
    if (/cart\.svg|profile\.svg|phone\.svg|flag-/.test(src)) return true;
    return false;
  }

  function isZoomableProductImage(img) {
    if (!img || img.tagName !== 'IMG') return false;
    if (isIconOrUiImage(img)) return false;
    if (img.closest('.offer-media, .swipe-slide, .fav-img, .mood-back-photo, .snack-card')) {
      return true;
    }
    return false;
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest('img');
    if (!isZoomableProductImage(img)) return;
    var src = img.currentSrc || img.src;
    if (!src) return;
    e.preventDefault();
    e.stopPropagation();
    openImageLightbox(src, img.alt);
  }, true);

  document.addEventListener('DOMContentLoaded', ensureImageLightbox);
})();
