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
    id: 'Z1PppJZj8JQ',
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

  console.log('ZeroToAct Modal Debug:', {
    joinModal,
    triggersCount: joinTriggers.length,
    joinForm
  });

  // Configure your real Formspree form ID
  const formspreeUrl = 'https://formspree.io/f/maqkdyjn';

  if (joinModal && joinTriggers.length > 0 && joinForm) {
    const openJoinModal = (e) => {
      if (e) e.preventDefault();
      console.log('openJoinModal triggered');
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
      const modalTitle = joinFormPanel.querySelector('.join-modal-title');
      const modalDesc = joinFormPanel.querySelector('.join-modal-desc');

      if (modalTitle && modalDesc) {
        if (triggerText.includes('Brief') || triggerText.includes('Subscribe')) {
          modalTitle.textContent = 'Subscribe to the Brief';
          modalDesc.textContent = 'Enter your details below to subscribe and request community access';
        } else if (triggerText.includes('Summit') || triggerText.includes('Register')) {
          modalTitle.textContent = 'Register for the Summit';
          modalDesc.textContent = 'Enter your details below to register interest for the 2027 Summit';
        } else if (triggerText.includes('Movement') || triggerText.includes('Join')) {
          modalTitle.textContent = 'Join the Movement';
          modalDesc.textContent = 'Enter your details below to request access to the community';
        } else {
          modalTitle.textContent = 'Access the Network';
          modalDesc.textContent = 'Enter your details below to request access to the community';
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
      const firstInput = document.getElementById('join-name');
      if (firstInput) firstInput.focus();
    };

    const closeJoinModal = () => {
      document.body.style.overflow = '';
      joinModal.classList.remove('open');
      joinModal.setAttribute('aria-hidden', 'true');
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
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/20.0.0/js/utils.js'
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

      // Validation check
      if (!nameInput.value.trim()) {
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
      if (!phoneInput.value.trim()) {
        showError('phone', 'Phone Number is required');
        hasError = true;
      } else if (iti && !iti.isValidNumber()) {
        showError('phone', 'Please enter a valid phone number');
        hasError = true;
      }
      if (!descInput.value.trim()) {
        showError('description', 'Please describe what you do');
        hasError = true;
      }

      if (hasError) return;

      // Submission loading state
      if (joinSubmitBtn) {
        joinSubmitBtn.classList.add('loading');
      }

      const formData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: iti ? iti.getNumber() : phoneInput.value.trim(),
        description: descInput.value.trim()
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
            handleSuccess();
          })
          .catch(error => {
            console.warn('Formspree request failed. Transitioning to success state for local review.', error);
            handleSuccess();
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

        // Focus the WhatsApp success button for accessibility
        const successCta = document.getElementById('join-whatsapp-success-btn');
        if (successCta) successCta.focus();
      }, 800); // simulation delay for premium micro-interaction
    };
  }

})();

