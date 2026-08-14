(function () {
  'use strict';

  // ===== YEAR IN FOOTER =====
  document.getElementById('year').textContent = new Date().getFullYear();

  // ===== PRELOADER =====
  const loader = document.getElementById('loader');
  function hideLoader() {
    loader.classList.add('hidden');
  }
  window.addEventListener('load', function () {
    setTimeout(hideLoader, 400);
  });
  setTimeout(hideLoader, 3500);

  // ===== MAP LOADER SKELETON =====
  // Previously an inline onload="" attribute on the iframe, which the site's
  // own Content-Security-Policy (script-src 'self', no unsafe-inline) blocks.
  const mapFrame = document.getElementById('mapFrame');
  const mapSkeleton = document.getElementById('mapSkeleton');
  if (mapFrame && mapSkeleton) {
    mapFrame.addEventListener('load', function () {
      mapSkeleton.remove();
    });
  }

  // ===== STICKY HEADER =====
  const header = document.getElementById('siteHeader');
  function updateHeader() {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // ===== MOBILE MENU =====
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  function closeMenu() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
  }
  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });

  // ===== SCROLL REVEAL =====
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  // ===== SMOOTH ANCHOR SCROLL =====
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const id = link.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          const offset = 78;
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
          history.pushState(null, '', id);
        }
      }
    });
  });

  // ============================================================
  //  HOMEPAGE SLIDER (auto-play with dots) — timing from config.js
  // ============================================================
  const sliderTrack = document.getElementById('sliderTrack');
  const dotsContainer = document.getElementById('sliderDots');
  if (sliderTrack && dotsContainer) {
    const slides = sliderTrack.querySelectorAll('.slide');
    const total = slides.length;
    let current = 0;
    let interval;
    const AUTOPLAY_MS = (typeof SLIDER_INTERVAL_MS === 'number' && SLIDER_INTERVAL_MS > 500)
      ? SLIDER_INTERVAL_MS
      : 2800;

    slides.forEach(function (_, i) {
      const dot = document.createElement('span');
      dot.dataset.index = i;
      dot.setAttribute('role', 'button');
      dot.setAttribute('tabindex', '0');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', function () { goTo(i); });
      dot.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); }
      });
      dotsContainer.appendChild(dot);
    });

    function goTo(index) {
      if (index < 0) index = total - 1;
      else if (index >= total) index = 0;
      current = index;
      sliderTrack.className = 'slider-track slide-pos-' + current;
      dotsContainer.querySelectorAll('span').forEach(function (d, i) {
        d.classList.toggle('active', i === current);
      });
    }

    function nextSlide() { goTo(current + 1); }
    function startAuto() { interval = setInterval(nextSlide, AUTOPLAY_MS); }
    function stopAuto() { clearInterval(interval); }

    const container = sliderTrack.closest('.slider-container');
    container.addEventListener('mouseenter', stopAuto);
    container.addEventListener('mouseleave', startAuto);
    container.addEventListener('focusin', stopAuto);
    container.addEventListener('focusout', startAuto);

    if (total > 1) startAuto();
  }

  // ============================================================
  //  MODAL HELPERS — Escape key + body scroll lock, reusable
  // ============================================================
  const openModals = new Set();
  function openModal(modalEl) {
    modalEl.classList.add('open');
    openModals.add(modalEl);
    document.body.classList.add('modal-open');
  }
  function closeModal(modalEl) {
    modalEl.classList.remove('open');
    openModals.delete(modalEl);
    if (openModals.size === 0) document.body.classList.remove('modal-open');
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModals.size) {
      openModals.forEach(closeModal);
    }
  });

  // ============================================================
  //  API CALLS (to Apps Script backend) — CORS FIX: text/plain
  // ============================================================
  async function callApi(action, data = {}) {
    const payload = {
      action: action,
      frontendToken: typeof FRONTEND_TOKEN !== 'undefined' ? FRONTEND_TOKEN : '',
      ...data
    };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // CORS fix: avoids preflight
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Network error');
    const json = await res.json();
    if (json.error) {
      if (json.error.indexOf('temporarily unavailable') !== -1) {
        const status = document.getElementById('site-status');
        if (status) status.textContent = 'Site is currently unavailable. Please check back later.';
      }
      throw new Error(json.error);
    }
    return json;
  }

  // Small helper: clear a container's children safely (no innerHTML).
  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ============================================================
  //  SPEED: fetch Gallery + Notices + Exam + Results in ONE request
  //  instead of four. All four sections below still call this same
  //  memoized promise, so the network round trip only happens once —
  //  the four functions and their fallback messages are unchanged.
  // ============================================================
  let allDataPromise = null;
  function getAllData() {
    if (!allDataPromise) allDataPromise = callApi('getAll');
    return allDataPromise;
  }

  // ============================================================
  //  GALLERY (dynamic from Google Sheets)
  // ============================================================
  const galleryTrack = document.getElementById('galleryTrack');
  const galleryDots = document.getElementById('galleryDots');
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');
  const galleryModal = document.getElementById('galleryModal');
  const galleryModalImg = document.getElementById('galleryModalImg');
  const galleryModalClose = document.getElementById('galleryModalClose');

  let galleryData = [];
  let galleryCurrent = 0;

  function galleryMessage(text) {
    clear(galleryTrack);
    const p = document.createElement('p');
    p.className = 'gallery-message';
    p.textContent = text;
    galleryTrack.appendChild(p);
  }

  async function loadGallery() {
    try {
      const all = await getAllData();
      const data = all.gallery || [];
      galleryData = data.filter(function (item) { return item.Event && item.ImageURL; });
      renderGallery();
    } catch (e) {
      console.warn('Gallery load failed:', e.message);
      galleryMessage('Gallery photos will appear here once added by the school office.');
    }
  }

  function renderGallery() {
    clear(galleryTrack);
    if (!galleryData.length) {
      galleryMessage('No gallery photos have been added yet. Please check back soon.');
      return;
    }

    galleryData.forEach(function (item, idx) {
      const card = document.createElement('div');
      card.className = 'gallery-item';
      card.dataset.index = String(idx);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', 'View photo: ' + item.Event);

      const img = document.createElement('img');
      img.src = item.ImageURL;
      img.alt = item.Event;
      img.loading = 'lazy';
      img.decoding = 'async';

      const caption = document.createElement('div');
      caption.className = 'event-name';
      caption.textContent = item.Event;

      card.appendChild(img);
      card.appendChild(caption);

      function openThis() {
        galleryCurrent = idx;
        galleryModalImg.src = item.ImageURL;
        galleryModalImg.alt = item.Event;
        openModal(galleryModal);
        updateDots();
      }
      card.addEventListener('click', openThis);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThis(); }
      });

      galleryTrack.appendChild(card);
    });

    // Dots
    clear(galleryDots);
    galleryData.forEach(function (_, i) {
      const dot = document.createElement('span');
      dot.dataset.index = String(i);
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', function () { scrollToItem(i); });
      galleryDots.appendChild(dot);
    });
    updateDots();
  }

  function scrollToItem(index) {
    const items = galleryTrack.querySelectorAll('.gallery-item');
    if (!items.length) return;
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    const target = items[index];
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    galleryCurrent = index;
    updateDots();
  }

  function updateDots() {
    const dots = galleryDots.querySelectorAll('span');
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === galleryCurrent);
    });
  }

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', function () { scrollToItem(galleryCurrent - 1); });
    nextBtn.addEventListener('click', function () { scrollToItem(galleryCurrent + 1); });
  }

  if (galleryModalClose) {
    galleryModalClose.addEventListener('click', function () { closeModal(galleryModal); });
    galleryModal.addEventListener('click', function (e) {
      if (e.target === galleryModal) closeModal(galleryModal);
    });
  }

  // ============================================================
  //  NOTICES (dynamic from Google Sheets)
  // ============================================================
  const noticeContainer = document.getElementById('noticeList');

  function noticeMessage(text) {
    clear(noticeContainer);
    const card = document.createElement('div');
    card.className = 'pin-card';
    const p = document.createElement('p');
    p.textContent = text;
    card.appendChild(p);
    noticeContainer.appendChild(card);
  }

  async function loadNotices() {
    try {
      const all = await getAllData();
      const data = all.notices || [];
      if (!data.length) {
        noticeMessage('No notices available right now.');
        return;
      }
      clear(noticeContainer);
      data.forEach(function (item) {
        const card = document.createElement('div');
        card.className = 'pin-card';

        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = item.Tag || 'Notice';

        const p = document.createElement('p');
        p.textContent = item.Title;

        const small = document.createElement('small');
        small.textContent = item.Date || '';

        card.appendChild(tag);
        card.appendChild(p);
        card.appendChild(small);
        noticeContainer.appendChild(card);
      });
    } catch (e) {
      noticeMessage('Notices could not be loaded right now. Please refresh the page.');
    }
  }

  // ============================================================
  //  EXAM TIMETABLE — grouped by class, professional layout
  // ============================================================
  const examContainer = document.getElementById('examTable');

  function examMessage(text) {
    clear(examContainer);
    const row = document.createElement('div');
    row.className = 'exam-row';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = text;
    row.appendChild(name);
    examContainer.appendChild(row);
  }

  async function loadExam() {
    try {
      const all = await getAllData();
      const data = all.exam || [];
      if (!data.length) {
        examMessage('Exam timetable will be published here soon.');
        return;
      }
      clear(examContainer);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'exam-rows-scroll';

      // Group consecutive rows by class (backend already sorts Nursery -> V)
      let lastClass = null;
      data.forEach(function (item) {
        if (item.Class !== lastClass) {
          const heading = document.createElement('div');
          heading.className = 'exam-class-heading';
          heading.textContent = item.Class;
          rowsWrap.appendChild(heading);
          lastClass = item.Class;
        }
        const row = document.createElement('div');
        row.className = 'exam-row';

        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = item.ExamName;

        const date = document.createElement('span');
        date.className = 'date';
        date.textContent = item.Date;

        row.appendChild(name);
        row.appendChild(date);
        rowsWrap.appendChild(row);
      });
      examContainer.appendChild(rowsWrap);

      const note = document.createElement('p');
      note.className = 'exam-note';
      note.textContent = 'Results will be declared after each exam as per this schedule — check the Marks & Results panel.';
      examContainer.appendChild(note);
    } catch (e) {
      examMessage('Exam timetable could not be loaded right now. Please refresh the page.');
    }
  }

  // ============================================================
  //  RESULTS — default "coming soon" message unless the Results
  //  sheet has rows; per-class buttons open a modal with download.
  // ============================================================
  const resultsContainer = document.getElementById('resultsList');
  const resultModal = document.getElementById('resultModal');
  const resultModalImg = document.getElementById('resultModalImg');
  const resultModalClose = document.getElementById('resultModalClose');
  const resultDownloadBtn = document.getElementById('resultDownloadBtn');

  async function loadResults() {
    try {
      const all = await getAllData();
      const data = all.results || [];
      if (!data.length) {
        return; // keep the default "coming soon" message already in the HTML
      }

      clear(resultsContainer);

      const intro = document.createElement('p');
      intro.className = 'results-intro';
      intro.textContent = 'Tap a class to view and download the result.';
      resultsContainer.appendChild(intro);

      const btnWrap = document.createElement('div');
      btnWrap.className = 'results-btn-wrap';

      data.forEach(function (item) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'result-link';
        btn.textContent = item.Class;
        btn.setAttribute('aria-label', 'View result for ' + item.Class);
        btn.addEventListener('click', function () {
          resultModalImg.src = item.ImageURL;
          resultModalImg.alt = 'Result — ' + item.Class;
          resultDownloadBtn.href = item.ImageURL;
          resultDownloadBtn.setAttribute('download', 'result-' + item.Class.replace(/\s+/g, '-') + '.jpg');
          openModal(resultModal);
        });
        btnWrap.appendChild(btn);
      });

      resultsContainer.appendChild(btnWrap);
    } catch (e) {
      // Keep the default "coming soon" message on failure — never show an error here.
    }
  }

  if (resultModalClose) {
    resultModalClose.addEventListener('click', function () { closeModal(resultModal); });
    resultModal.addEventListener('click', function (e) {
      if (e.target === resultModal) closeModal(resultModal);
    });
  }

  // ============================================================
  //  INIT ALL DYNAMIC CONTENT
  // ============================================================
  loadGallery();
  loadNotices();
  loadExam();
  loadResults();

})();