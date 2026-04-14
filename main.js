/* ═══════════════════════════════════════════════════════
   ZEROTOACT — MAIN JS
   Scroll reveal · Nav state · Mobile menu · Forms
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── NAV SCROLL STATE ──────────────────────────────
  const nav = document.getElementById('nav');

  const handleNavScroll = () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // ─── MOBILE HAMBURGER ─────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    });

    // close on mobile link click
    mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // ─── SCROLL REVEAL ────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px 0px 0px',
      }
    );

    revealEls.forEach((el) => observer.observe(el));

    // Also trigger any elements already in the viewport on load
    setTimeout(() => {
      revealEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-visible');
          observer.unobserve(el);
        }
      });
    }, 50);

  } else {
    // Fallback: show all immediately
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // ─── SMOOTH SCROLL FOR ANCHOR LINKS ───────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const navHeight = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ─── NEWSLETTER FORM ──────────────────────────────
  const newsletterForm = document.getElementById('newsletter-form');

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      const emailInput = document.getElementById('email-input');
      const submitBtn = document.getElementById('subscribe-submit-btn');

      if (!emailInput || !emailInput.value.trim() || !emailInput.checkValidity()) {
        e.preventDefault();
        emailInput.focus();
        emailInput.style.borderColor = 'rgba(255,255,255,0.5)';
        setTimeout(() => {
          emailInput.style.borderColor = '';
        }, 2000);
        return;
      }

      // Show loading state (form will submit to Beehiiv in new tab)
      if (submitBtn) {
        const textEl = submitBtn.querySelector('.btn-submit-text');
        if (textEl) textEl.textContent = 'Opening Beehiiv…';
      }

      // Reset after brief delay
      setTimeout(() => {
        if (submitBtn) {
          const textEl = submitBtn.querySelector('.btn-submit-text');
          if (textEl) textEl.textContent = 'Subscribe — It\'s Free';
        }
      }, 3000);
    });
  }

  // ─── COMMUNITY WAITLIST FORM ──────────────────────
  const waitlistForm = document.getElementById('community-waitlist-form');

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', (e) => {
      const emailInput = document.getElementById('community-email-input');
      const btn = document.getElementById('community-waitlist-btn');

      if (!emailInput || !emailInput.value.trim() || !emailInput.checkValidity()) {
        e.preventDefault();
        emailInput.focus();
        emailInput.style.borderColor = 'rgba(255,255,255,0.4)';
        setTimeout(() => { emailInput.style.borderColor = ''; }, 2000);
        return;
      }

      if (btn) {
        btn.textContent = 'Redirecting…';
        setTimeout(() => { btn.textContent = 'Join Waitlist'; }, 3000);
      }
    });
  }

  // ─── STAGGERED REVEAL FOR GRID CHILDREN ───────────
  // Add delay to cards within grids for staggered entrance
  const staggerContainers = document.querySelectorAll('.pillars-grid, .community-grid, .outcomes-grid');

  staggerContainers.forEach(container => {
    const children = container.querySelectorAll('.reveal');
    children.forEach((child, i) => {
      child.style.transitionDelay = `${i * 80}ms`;
    });
  });

  // ─── ACTIVE NAV LINK ON SCROLL ────────────────────
  const sections = ['content-section', 'summit-section', 'community-section'];
  const navLinks = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.style.color = 'var(--white)';
            } else {
              link.style.color = '';
            }
          });
        }
      });
    },
    { threshold: 0.5 }
  );

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

})();
