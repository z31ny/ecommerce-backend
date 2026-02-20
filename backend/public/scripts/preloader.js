/* Simple controller for the preloader timeline and redirect. */

(function () {
  var preloader = document.getElementById('preloader');
  if (!preloader) return;

  var redirectTo = preloader.getAttribute('data-redirect') || '/';
  var DURATION_MS = 3200; // match CSS timeline

  function go() {
    window.location.replace(redirectTo);
  }

  // Respect reduced motion: skip animation entirely
  var prefersReduced = false;
  try {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { }

  // Skip button
  var skip = preloader.querySelector('.skip-btn');
  if (skip) {
    skip.addEventListener('click', go);
  }

  if (prefersReduced) {
    go();
    return;
  }

  // After the animation, redirect to home
  window.addEventListener('load', function () {
    setTimeout(go, DURATION_MS);
  });
})();


