/* ═══════════════════════════════════════════════════════
   ZEROTOACT · MAIN JS
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
    const closeMobileMenu = () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open menu');
      mobileMenu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        closeMobileMenu();
        hamburger.focus();
      }
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
  // Handles both "#section" and "/#section": smooth-scrolls when the target
  // is on the current page, otherwise lets the browser navigate (e.g. a
  // sub-page linking back to a homepage section).
  document.querySelectorAll('a[href*="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      let url;
      try { url = new URL(anchor.href, window.location.href); } catch { return; }
      if (url.pathname !== window.location.pathname || !url.hash || url.hash === '#') return;
      const target = document.querySelector(url.hash);
      if (!target) return;
      e.preventDefault();
      const navHeight = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ─── INTELLIGENCE DROPDOWN ────────────────────────
  const ddToggle = document.querySelector('.nav-dropdown-toggle');
  if (ddToggle) {
    const setDd = (open) => ddToggle.setAttribute('aria-expanded', String(open));
    ddToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setDd(ddToggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-dropdown')) setDd(false);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setDd(false);
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
  const sections = ['content-section', 'summit-section', 'community-section', 'instagram-section'];
  const navLinks = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const linkedSection = link.dataset.section || (href && href.startsWith('#') ? href.slice(1) : '');
            if (linkedSection === id) {
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

  // ─── CINEMATIC VIDEO MODAL ─────────────────────────
  const playBtn = document.getElementById('play-video-btn');
  const videoModal = document.getElementById('video-modal');
  const videoModalClose = document.getElementById('video-modal-close');
  const videoModalOverlay = document.getElementById('video-modal-overlay');
  const videoPlayerContainer = document.getElementById('video-player-container');

  // Video source configuration. Can be configured to:
  // - type: 'youtube', id: 'YouTubeVideoID', aspectRatio: 'widescreen' | 'portrait'
  // - type: 'vimeo', id: 'VimeoVideoID', aspectRatio: 'widescreen' | 'portrait'
  // - type: 'mp4', id: 'https://domain.com/video.mp4', aspectRatio: 'widescreen' | 'portrait'
  const videoSource = {
    type: 'youtube',
    id: 'N4GSZjIPma4',
    aspectRatio: 'portrait'
  };

  if (playBtn && videoModal && videoPlayerContainer) {
    const container = videoModal.querySelector('.video-modal-container');

    const openModal = () => {
      document.body.style.overflow = 'hidden';
      videoModal.classList.add('open');
      videoModal.setAttribute('aria-hidden', 'false');

      // Adjust container layout class based on video aspect ratio
      if (container) {
        if (videoSource.aspectRatio === 'portrait') {
          container.classList.add('video-modal-container--portrait');
        } else {
          container.classList.remove('video-modal-container--portrait');
        }
      }

      // Inject the player iframe/video element to start loading only on demand
      let playerHtml = '';
      if (videoSource.type === 'youtube') {
        playerHtml = `<iframe src="https://www.youtube-nocookie.com/embed/${videoSource.id}?autoplay=1&rel=0&modestbranding=1" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      } else if (videoSource.type === 'vimeo') {
        playerHtml = `<iframe src="https://player.vimeo.com/video/${videoSource.id}?autoplay=1&dnt=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      } else if (videoSource.type === 'mp4') {
        playerHtml = `<video src="${videoSource.id}" autoplay controls playsinline></video>`;
      }
      videoPlayerContainer.innerHTML = playerHtml;

      // Focus close button for accessibility
      if (videoModalClose) videoModalClose.focus();
    };

    const closeModal = () => {
      document.body.style.overflow = '';
      videoModal.classList.remove('open');
      videoModal.setAttribute('aria-hidden', 'true');
      // Empty the container to immediately halt video playback and audio
      videoPlayerContainer.innerHTML = '';
      playBtn.focus();
    };

    playBtn.addEventListener('click', openModal);
    if (videoModalClose) videoModalClose.addEventListener('click', closeModal);
    if (videoModalOverlay) videoModalOverlay.addEventListener('click', closeModal);

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && videoModal.classList.contains('open')) {
        closeModal();
      }
    });
  }

  // ─── APPLICATION FORM POPUP MODAL ─────────────────
  const joinModal = document.getElementById('join-modal');
  const joinTriggers = document.querySelectorAll('.join-cta-trigger');
  const joinModalClose = document.getElementById('join-modal-close');
  const joinModalOverlay = document.getElementById('join-modal-overlay');
  const joinFormPanel = document.getElementById('join-modal-form-panel');
  const joinSuccessPanel = document.getElementById('join-modal-success-panel');
  const joinForm = document.getElementById('join-application-form');
  const joinSubmitBtn = document.getElementById('join-submit-btn');
  let activeIntent = 'community';
  let lastJoinTrigger = null;

  // Configure your real Formspree form ID
  const formspreeUrl = 'https://formspree.io/f/maqkdyjn';

  if (joinModal && joinTriggers.length > 0 && joinForm) {
    const openJoinModal = (e) => {
      if (e) e.preventDefault();
      lastJoinTrigger = e && e.currentTarget ? e.currentTarget : null;
      document.body.style.overflow = 'hidden';
      joinModal.classList.add('open');
      joinModal.setAttribute('aria-hidden', 'false');

      // Reset form state
      joinForm.reset();
      clearErrors();
      joinFormPanel.style.display = 'block';
      joinSuccessPanel.style.display = 'none';

      // Dynamic text based on trigger button content
      const triggerText = e && e.currentTarget ? e.currentTarget.textContent.trim() : '';
      activeIntent = e && e.currentTarget ? (e.currentTarget.dataset.intent || 'community') : 'community';
      const modalTitle = joinFormPanel.querySelector('.join-modal-title');
      const modalDesc = joinFormPanel.querySelector('.join-modal-desc');
      const submitText = joinSubmitBtn ? joinSubmitBtn.querySelector('.btn-text') : null;
      const optionalFields = joinForm.querySelectorAll('[data-field="name"], [data-field="phone"], [data-field="description"]');
      const isBrief = activeIntent === 'brief';
      const isSummit = activeIntent === 'summit';
      const isLowFriction = isBrief || isSummit;

      optionalFields.forEach(field => {
        field.hidden = isLowFriction;
        const input = field.querySelector('input, textarea');
        if (input) input.required = !isLowFriction;
      });

      if (modalTitle && modalDesc) {
        if (isBrief) {
          modalTitle.textContent = 'Get the Free Signal';
          modalDesc.textContent = 'One email is all it takes. Your first Weekly Signal is next.';
          if (submitText) submitText.textContent = 'Subscribe Free';
        } else if (isSummit) {
          modalTitle.textContent = 'Join the Summit Waitlist';
          modalDesc.textContent = 'Leave your email and we will send the Summit details when registration opens.';
          if (submitText) submitText.textContent = 'Join the Waitlist';
        } else if (triggerText.includes('Movement') || triggerText.includes('Join')) {
          modalTitle.textContent = 'Apply to the Community';
          modalDesc.textContent = 'Enter your details below to request access to the community';
          if (submitText) submitText.textContent = 'Submit Application';
        } else {
          modalTitle.textContent = 'Apply to the Network';
          modalDesc.textContent = 'Enter your details below to request access to the community';
          if (submitText) submitText.textContent = 'Submit Application';
        }
      }

      if (phoneInput) {
        // Trigger formatting update when modal opens
        const placeholder = phoneInput.placeholder || '';
        const cleanPlaceholder = placeholder.replace(/[-:;]/g, ' ');
        const captionEl = document.getElementById('phone-format-caption');
        if (captionEl) captionEl.textContent = 'Format ' + cleanPlaceholder;
      }

      // Focus first input
      const firstInput = document.getElementById(isLowFriction ? 'join-email' : 'join-name');
      if (firstInput) firstInput.focus();
    };

    const closeJoinModal = () => {
      document.body.style.overflow = '';
      joinModal.classList.remove('open');
      joinModal.setAttribute('aria-hidden', 'true');
      if (lastJoinTrigger) lastJoinTrigger.focus();
    };

    joinTriggers.forEach(trigger => {
      trigger.addEventListener('click', openJoinModal);
    });

    if (joinModalClose) joinModalClose.addEventListener('click', closeJoinModal);
    if (joinModalOverlay) joinModalOverlay.addEventListener('click', closeJoinModal);

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && joinModal.classList.contains('open')) {
        closeJoinModal();
      }
    });

    // Form validation and submission
    const nameInput = document.getElementById('join-name');
    const emailInput = document.getElementById('join-email');
    const phoneInput = document.getElementById('join-phone');
    const descInput = document.getElementById('join-description');

    let iti = null;
    if (window.intlTelInput && phoneInput) {
      iti = window.intlTelInput(phoneInput, {
        initialCountry: 'auto',
        initialCountryLookup: async () => {
          try {
            const response = await fetch('https://ipapi.co/json');
            const data = await response.json();
            return data.country_code;
          } catch {
            return 'NG';
          }
        },
        utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@20.0.0/build/js/utils.js'
      });

      const updatePhonePlaceholder = () => {
        if (phoneInput) {
          const placeholder = phoneInput.placeholder || '';
          const cleanPlaceholder = placeholder.replace(/[-:;]/g, ' ');
          const captionEl = document.getElementById('phone-format-caption');
          if (captionEl) {
            captionEl.textContent = 'Format ' + cleanPlaceholder;
          }
        }
      };

      phoneInput.addEventListener('countrychange', updatePhonePlaceholder);
    }

    const clearErrors = () => {
      document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
      });
      document.querySelectorAll('.form-input, .form-textarea').forEach(el => {
        el.style.borderColor = '';
      });
    };

    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      let hasError = false;
      const isBrief = activeIntent === 'brief';
      const isSummit = activeIntent === 'summit';
      const isLowFriction = isBrief || isSummit;

      // Validation check
      if (!isLowFriction && !nameInput.value.trim()) {
        showError('name', 'Full Name is required');
        hasError = true;
      }
      if (!emailInput.value.trim()) {
        showError('email', 'Email Address is required');
        hasError = true;
      } else if (!validateEmail(emailInput.value.trim())) {
        showError('email', 'Please enter a valid email');
        hasError = true;
      }
      if (!isLowFriction && !phoneInput.value.trim()) {
        showError('phone', 'Phone Number is required');
        hasError = true;
      } else if (!isLowFriction && iti && !iti.isValidNumber()) {
        showError('phone', 'Please enter a valid phone number');
        hasError = true;
      }
      if (!isLowFriction && !descInput.value.trim()) {
        showError('description', 'Please describe what you do');
        hasError = true;
      }

      if (hasError) return;

      // Submission loading state
      if (joinSubmitBtn) {
        joinSubmitBtn.classList.add('loading');
      }

      const formData = {
        intent: activeIntent,
        email: emailInput.value.trim(),
        ...(isLowFriction ? {} : {
          name: nameInput.value.trim(),
          phone: iti ? iti.getNumber() : phoneInput.value.trim(),
          description: descInput.value.trim()
        })
      };

      const isPlaceholder = formspreeUrl.includes('YOUR_FORM_ID');

      if (isPlaceholder) {
        console.warn('Formspree is pending configuration. Transitioning to success state for local review.');
        handleSuccess();
      } else {
        fetch(formspreeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formData)
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Submission failed');
            }
            handleSuccess();
          })
          .catch(error => {
            if (joinSubmitBtn) joinSubmitBtn.classList.remove('loading');
            showError('email', 'We could not submit your application. Please try again.');
            console.warn('Form submission failed.', error);
          });
      }
    });

    const showError = (field, msg) => {
      const errEl = document.getElementById(`error-${field}`);
      const inputEl = document.getElementById(`join-${field}`);
      if (errEl) errEl.textContent = msg;
      if (inputEl) inputEl.style.borderColor = '#ff4a4a';
    };

    const validateEmail = (email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSuccess = () => {
      setTimeout(() => {
        if (joinSubmitBtn) joinSubmitBtn.classList.remove('loading');

        // Transition to success panel
        joinFormPanel.style.display = 'none';
        joinSuccessPanel.style.display = 'block';
        const successTitle = joinSuccessPanel.querySelector('.join-modal-title');
        const successDesc = joinSuccessPanel.querySelector('.join-modal-desc');

        // Focus the WhatsApp success button for accessibility
        const successCta = document.getElementById('join-whatsapp-success-btn');
        if (activeIntent === 'brief') {
          if (successTitle) successTitle.textContent = 'You’re on the list';
          if (successDesc) successDesc.textContent = 'Your first Weekly Signal will be delivered by email.';
          if (successCta) successCta.style.display = 'none';
          if (joinModalClose) joinModalClose.focus();
        } else if (activeIntent === 'summit') {
          if (successTitle) successTitle.textContent = 'You’re on the Summit list';
          if (successDesc) successDesc.textContent = 'We will email you when registration for the Summit opens.';
          if (successCta) successCta.style.display = 'none';
          if (joinModalClose) joinModalClose.focus();
        } else {
          if (successTitle) successTitle.textContent = 'Application Submitted';
          if (successDesc) successDesc.textContent = 'Thank you for applying. A welcome email is on the way. You can join the community below.';
          if (successCta) {
            successCta.style.display = '';
            successCta.focus();
          }
        }
      }, 800); // simulation delay for premium micro-interaction
    };
  }

})();
