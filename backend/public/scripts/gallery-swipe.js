// Minimal swipeable gallery using scroll-snap.
// Works on touch (swipe) and trackpad (horizontal scroll).
(function () {
  function initGallery(gallery) {
    if (!gallery || gallery.__swipeInit) return;
    gallery.__swipeInit = true;

    var track = gallery.querySelector('.swipe-track');
    if (!track) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll('.swipe-slide'));
    if (slides.length <= 1) return;

    var dots = gallery.querySelector('.swipe-dots');
    if (!dots) {
      dots = document.createElement('div');
      dots.className = 'swipe-dots';
      gallery.appendChild(dots);
    }

    dots.innerHTML = slides.map(function (_, i) {
      return '<button type="button" class="swipe-dot" aria-label="Image ' + (i + 1) + '"></button>';
    }).join('');

    var dotEls = Array.prototype.slice.call(dots.querySelectorAll('.swipe-dot'));
    function setActive(idx) {
      dotEls.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
    }

    function currentIndex() {
      var w = track.clientWidth || 1;
      return Math.round(track.scrollLeft / w);
    }

    // Click dots -> scroll to slide
    dotEls.forEach(function (d, i) {
      d.addEventListener('click', function () {
        var w = track.clientWidth || 1;
        track.scrollTo({ left: i * w, behavior: 'smooth' });
      });
    });

    // Update active dot on scroll (throttled via rAF)
    var raf = null;
    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var idx = currentIndex();
        if (idx < 0) idx = 0;
        if (idx >= dotEls.length) idx = dotEls.length - 1;
        setActive(idx);
      });
    }, { passive: true });

    setActive(0);
  }

  function initAll(root) {
    var r = root || document;
    Array.prototype.slice.call(r.querySelectorAll('[data-swipe-gallery]')).forEach(initGallery);
  }

  document.addEventListener('DOMContentLoaded', function () { initAll(document); });
  // Expose for dynamic renders
  window.initSwipeGalleries = initAll;
})();

