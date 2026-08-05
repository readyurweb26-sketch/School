(function() {
  'use strict';

  // Year in footer
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Preloader
  var loader = document.getElementById('loader');
  function hideLoader() {
    if (loader) loader.classList.add('hidden');
  }
  window.addEventListener('load', function() {
    setTimeout(hideLoader, 400);
  });
  setTimeout(hideLoader, 3500);

  // Sticky header
  var header = document.getElementById('siteHeader');
  function updateHeader() {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Mobile menu
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  function closeMenu() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
  }
  hamburger.addEventListener('click', function() {
    var isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  mobileMenu.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', closeMenu);
  });

  // Scroll reveal
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function(el) { io.observe(el); });
  } else {
    revealEls.forEach(function(el) { el.classList.add('in-view'); });
  }

  // Smooth anchor scroll (offset for fixed header)
  document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var id = link.getAttribute('href');
      if (id.length > 1) {
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          var offset = 78;
          var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
          history.pushState(null, '', id);
        }
      }
    });
  });
})();