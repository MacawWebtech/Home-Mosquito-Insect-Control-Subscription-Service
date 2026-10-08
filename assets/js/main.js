/**
 * YardShield — main.js
 * ----------------------------------------------------------------------------
 * Site-wide behaviour, organised as small self-contained modules on the
 * `window.YS` namespace. Plain classic script (no bundler, no ES module
 * loading) so every page works when opened straight from the file system.
 *
 * Modules
 *   YS.theme       Light/dark mode with OS preference detection
 *   YS.direction   LTR/RTL switch (swaps Bootstrap build + rtl.css)
 *   YS.forms       Client-side validation with clear inline messages
 *   YS.password    Show/hide toggle and strength meter
 *   YS.zip         Service-area (zip code) checker
 *   YS.pricing     Monthly / annual price toggle
 *   YS.blog        Blog search + category filtering
 *   YS.countdown   Coming-soon countdown and maintenance variant
 *   YS.reveal      Subtle on-scroll fade-in (desktop, motion-safe only)
 *   YS.toast       Small accessible toast notifications
 * ----------------------------------------------------------------------------
 */
(() => {
  'use strict';

  const YS = (window.YS = window.YS || {});
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const store = {
    /** Read a value from localStorage, tolerating privacy modes that throw. */
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    /** Write a value to localStorage, silently ignoring failures. */
    set(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* storage unavailable */ } },
  };
  YS.store = store;
  YS.prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
   * YS.toast — announces short status messages visually and to screen readers
   * ---------------------------------------------------------------------- */
  YS.toast = (message, variant = 'success') => {
    let wrap = $('#ys-toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'ys-toasts';
      wrap.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      wrap.setAttribute('aria-live', 'polite');
      wrap.setAttribute('aria-atomic', 'true');
      document.body.appendChild(wrap);
    }
    const icons = { success: 'check-circle-fill', danger: 'exclamation-octagon-fill', info: 'info-circle-fill', warning: 'exclamation-triangle-fill' };
    const el = document.createElement('div');
    el.className = 'toast align-items-center border-0 shadow';
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="d-flex"><div class="toast-body d-flex align-items-center gap-2">
        <i class="bi bi-${icons[variant] || icons.info} text-${variant === 'success' ? 'success' : variant}" aria-hidden="true"></i>
        <span></span></div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close notification"></button></div>`;
    el.querySelector('span').textContent = message;
    wrap.appendChild(el);
    if (window.bootstrap) {
      const t = new bootstrap.Toast(el, { delay: 4000 });
      el.addEventListener('hidden.bs.toast', () => el.remove());
      t.show();
    }
  };

  /* ------------------------------------------------------------------------
   * YS.theme — light/dark with automatic system detection.
   * The initial theme is applied by a tiny inline script in <head> to avoid
   * a flash; this module wires up the toggle and keeps it in sync.
   * ---------------------------------------------------------------------- */
  YS.theme = {
    KEY: 'ys-theme',
    /** Returns the theme to use: saved choice, else OS preference. */
    resolve() {
      const saved = store.get(this.KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    /** Applies a theme, updates every toggle and notifies listeners (charts). */
    apply(theme, animate = false) {
      const root = document.documentElement;
      if (animate && !YS.prefersReducedMotion()) {
        root.classList.add('theme-transition');
        window.setTimeout(() => root.classList.remove('theme-transition'), 300);
      }
      root.setAttribute('data-bs-theme', theme);
      $$('[data-theme-toggle]').forEach((btn) => {
        const dark = theme === 'dark';
        btn.setAttribute('aria-pressed', String(dark));
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        const icon = btn.querySelector('i');
        if (icon) icon.className = `bi ${dark ? 'bi-sun' : 'bi-moon-stars'}`;
      });
      document.dispatchEvent(new CustomEvent('ys:themechange', { detail: { theme } }));
    },
    init() {
      this.apply(this.resolve());
      $$('[data-theme-toggle]').forEach((btn) => btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        store.set(this.KEY, next);
        this.apply(next, true);
      }));
      // Follow OS changes only while the visitor hasn't chosen explicitly
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!store.get(this.KEY)) this.apply(e.matches ? 'dark' : 'light', true);
      });
    },
  };

  /* ------------------------------------------------------------------------
   * YS.direction — switches between LTR and RTL layouts.
   * TODO: when you add real translations, set lang/dir server-side instead.
   * ---------------------------------------------------------------------- */
  YS.direction = {
    KEY: 'ys-dir',
    // Paths are relative to the HTML pages in /pages
    LTR: '../assets/vendor/bootstrap/css/bootstrap.min.css',
    RTL: '../assets/vendor/bootstrap/css/bootstrap.rtl.min.css',
    /** Sets dir on <html>, swaps the Bootstrap build and updates toggles. */
    apply(dir) {
      document.documentElement.setAttribute('dir', dir);
      const bs = $('#bootstrap-css');
      if (bs) {
        const want = dir === 'rtl' ? this.RTL : this.LTR;
        if (bs.getAttribute('href') !== want) bs.setAttribute('href', want);
      }
      $$('[data-dir-toggle]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(dir === 'rtl'));
        const label = btn.querySelector('[data-dir-label]');
        if (label) label.textContent = dir === 'rtl' ? 'LTR' : 'RTL';
      });
    },
    init() {
      this.apply(store.get(this.KEY) === 'rtl' ? 'rtl' : (document.documentElement.getAttribute('dir') || 'ltr'));
      $$('[data-dir-toggle]').forEach((btn) => btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl';
        store.set(this.KEY, next);
        this.apply(next);
      }));
    },
  };

  /* ------------------------------------------------------------------------
   * YS.forms — validation for every form.needs-validation.
   * Messages come from data-msg-* attributes, falling back to sensible text.
   * Supports data-match="#otherField" (password confirmation).
   * ---------------------------------------------------------------------- */
  YS.forms = {
    /** Builds a human message for the first failing constraint of a field. */
    messageFor(field) {
      const v = field.validity;
      const label = (field.labels && field.labels[0] ? field.labels[0].textContent : field.name || 'This field').replace('*', '').trim();
      if (v.valueMissing) return field.dataset.msgRequired || (field.type === 'checkbox' ? 'Please tick this box to continue.' : `${label} is required.`);
      if (v.typeMismatch && field.type === 'email') return field.dataset.msgEmail || 'Enter an email address like name@example.com.';
      if (v.typeMismatch) return `Enter a valid ${label.toLowerCase()}.`;
      if (v.tooShort) return `${label} must be at least ${field.minLength} characters.`;
      if (v.patternMismatch) return field.dataset.msgPattern || `${label} isn't in the right format.`;
      if (v.rangeUnderflow || v.rangeOverflow) return `${label} must be between ${field.min} and ${field.max}.`;
      if (v.customError) return field.validationMessage;
      return '';
    },
    /** Validates one field, writing its message into the paired .invalid-feedback. */
    check(field) {
      if (field.dataset.match) {
        const other = $(field.dataset.match);
        field.setCustomValidity(other && other.value !== field.value ? (field.dataset.msgMatch || 'Passwords do not match.') : '');
      }
      const ok = field.checkValidity();
      field.classList.toggle('is-invalid', !ok);
      field.classList.toggle('is-valid', ok && field.value !== '' && field.type !== 'checkbox');
      field.setAttribute('aria-invalid', String(!ok));
      let fb = field.parentElement.querySelector('.invalid-feedback');
      if (!fb && field.closest('.form-check, .password-wrap, .input-group')) fb = field.closest('.form-check, .password-wrap, .input-group').parentElement.querySelector('.invalid-feedback');
      if (fb) {
        fb.textContent = ok ? '' : this.messageFor(field);
        // Feedback outside the input's own wrapper (password box, input group) isn't reached by Bootstrap's sibling rule, so show it directly.
        if (fb.previousElementSibling !== field) fb.classList.toggle('d-block', !ok);
        if (!fb.id) fb.id = `${field.id || field.name}-error`;
        field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), fb.id].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' '));
      }
      return ok;
    },
    init() {
      $$('form.needs-validation').forEach((form) => {
        const fields = $$('input, select, textarea', form).filter((f) => f.type !== 'hidden' && f.type !== 'submit');
        fields.forEach((f) => {
          f.addEventListener('blur', () => { if (f.value !== '' || form.classList.contains('was-checked')) this.check(f); });
          f.addEventListener('input', () => { if (f.classList.contains('is-invalid') || f.dataset.match) this.check(f); });
          f.addEventListener('change', () => { if (form.classList.contains('was-checked')) this.check(f); });
        });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          form.classList.add('was-checked');
          const results = fields.map((f) => this.check(f));
          if (results.includes(false)) {
            const first = fields[results.indexOf(false)];
            first.focus();
            const summary = $('[data-form-summary]', form);
            if (summary) { summary.textContent = `Please fix ${results.filter((r) => !r).length} highlighted field(s).`; summary.classList.remove('d-none'); }
            return;
          }
          const summary = $('[data-form-summary]', form);
          if (summary) summary.classList.add('d-none');
          this.submit(form);
        });
      });
    },
    /**
     * Handles a valid submission. If the form has a real action
     * (Formspree / Netlify), it is posted with fetch; otherwise a demo
     * success state is shown.
     * TODO: set action="https://formspree.io/f/YOUR_ID" on contact forms.
     */
    submit(form) {
      const done = () => {
        const success = $('.form-success', form) || (form.dataset.success ? $(form.dataset.success) : null);
        if (success) { success.classList.add('show'); success.focus && success.focus(); }
        if (form.dataset.toast) YS.toast(form.dataset.toast);
        if (form.dataset.redirect) { window.setTimeout(() => { window.location.href = form.dataset.redirect; }, 700); return; }
        form.reset();
        $$('.is-valid', form).forEach((el) => el.classList.remove('is-valid'));
        form.classList.remove('was-checked');
      };
      const action = form.getAttribute('action');
      if (action && /^https?:/.test(action)) {
        fetch(action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then((r) => (r.ok ? done() : YS.toast('Something went wrong. Please try again.', 'danger')))
          .catch(() => YS.toast('Network error. Please try again.', 'danger'));
      } else {
        done();
      }
    },
  };

  /* ------------------------------------------------------------------------
   * YS.password — show/hide buttons and a simple strength meter
   * ---------------------------------------------------------------------- */
  YS.password = {
    /** Scores a password 0–4 on length and character variety. */
    score(v) {
      let s = 0;
      if (v.length >= 8) s++;
      if (v.length >= 12) s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
      return s;
    },
    init() {
      $$('.toggle-pass').forEach((btn) => btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.querySelector('i').className = `bi ${show ? 'bi-eye-slash' : 'bi-eye'}`;
      }));
      $$('[data-strength]').forEach((input) => {
        const bar = $(input.dataset.strength);
        const text = $(`${input.dataset.strength}-text`);
        const colors = ['var(--ys-danger)', 'var(--ys-danger)', 'var(--ys-accent)', 'var(--ys-primary)', 'var(--ys-primary)'];
        const words = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
        input.addEventListener('input', () => {
          const s = this.score(input.value);
          if (bar) { bar.style.width = `${input.value ? (s + 1) * 20 : 0}%`; bar.style.background = colors[s]; }
          if (text) text.textContent = input.value ? `Strength: ${words[s]}` : '';
        });
      });
    },
  };

  /* ------------------------------------------------------------------------
   * YS.zip — checks a US-style 5-digit zip against the service area.
   * TODO: replace SERVICE_PREFIXES with a call to your coverage API.
   * ---------------------------------------------------------------------- */
  YS.zip = {
    SERVICE_PREFIXES: ['300', '301', '302', '303', '304', '305', '330', '331', '750', '751', '752', '770', '771', '773', '850', '852', '282', '283'],
    init() {
      $$('[data-zip-form]').forEach((form) => {
        const input = $('input', form);
        const out = $(form.dataset.zipForm) || form.parentElement.querySelector('.zip-result');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const zip = input.value.trim();
          out.classList.remove('is-ok', 'is-no');
          if (!/^\d{5}$/.test(zip)) {
            input.setAttribute('aria-invalid', 'true');
            out.innerHTML = '<i class="bi bi-exclamation-circle" aria-hidden="true"></i> Enter a 5-digit zip code, for example 30301.';
            out.classList.add('is-no');
            input.focus();
            return;
          }
          input.setAttribute('aria-invalid', 'false');
          if (this.SERVICE_PREFIXES.includes(zip.slice(0, 3))) {
            out.innerHTML = `<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Good news — we treat yards in ${zip}. <a href="pricing.html">Pick a plan</a>`;
            out.classList.add('is-ok');
          } else {
            out.innerHTML = `<i class="bi bi-geo-alt" aria-hidden="true"></i> We're not in ${zip} yet. <a href="contact.html">Join the waitlist</a>`;
            out.classList.add('is-no');
          }
        });
      });
    },
  };

  /* ------------------------------------------------------------------------
   * YS.pricing — toggles plan prices between monthly and annual billing.
   * Each price element carries data-monthly and data-annual (per-month) values.
   * ---------------------------------------------------------------------- */
  YS.pricing = {
    init() {
      $$('[data-billing-toggle]').forEach((group) => {
        const buttons = $$('button', group);
        buttons.forEach((btn) => btn.addEventListener('click', () => {
          const period = btn.dataset.period;
          buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
          $$('[data-monthly]').forEach((el) => { el.textContent = period === 'annual' ? el.dataset.annual : el.dataset.monthly; });
          $$('[data-period-note]').forEach((el) => { el.textContent = period === 'annual' ? 'per month, billed yearly' : 'per month, cancel anytime'; });
          $$('[data-annual-only]').forEach((el) => el.classList.toggle('d-none', period !== 'annual'));
          const live = $('#billing-live');
          if (live) live.textContent = `Showing ${period} prices`;
        }));
      });
    },
  };

  /* ------------------------------------------------------------------------
   * YS.blog — client-side search and category filters for blog.html
   * ---------------------------------------------------------------------- */
  YS.blog = {
    init() {
      const wrap = $('[data-blog]');
      if (!wrap) return;
      const items = $$('[data-blog-item]', wrap);
      const search = $('[data-blog-search]');
      const chips = $$('[data-blog-filter] button');
      const empty = $('[data-blog-empty]');
      const count = $('[data-blog-count]');
      let category = 'all';
      const params = new URLSearchParams(window.location.search);
      if (params.get('category')) category = params.get('category');
      if (params.get('q') && search) search.value = params.get('q');
      const run = () => {
        const q = (search ? search.value : '').trim().toLowerCase();
        let shown = 0;
        items.forEach((item) => {
          const okCat = category === 'all' || item.dataset.category === category;
          const okQ = !q || item.textContent.toLowerCase().includes(q);
          const show = okCat && okQ;
          item.classList.toggle('d-none', !show);
          if (show) shown++;
        });
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.category === category)));
        if (empty) empty.classList.toggle('d-none', shown > 0);
        if (count) count.textContent = `${shown} article${shown === 1 ? '' : 's'} found`;
      };
      chips.forEach((c) => c.addEventListener('click', () => { category = c.dataset.category; run(); }));
      if (search) {
        search.addEventListener('input', run);
        const form = search.closest('form');
        if (form) form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
      }
      run();
    },
  };

  /* ------------------------------------------------------------------------
   * YS.countdown — coming-soon timer; ?mode=maintenance shows the
   * maintenance variant of coming-soon.html.
   * TODO: set data-countdown to your real launch date (ISO 8601).
   * ---------------------------------------------------------------------- */
  YS.countdown = {
    init() {
      const mode = new URLSearchParams(window.location.search).get('mode');
      if (mode === 'maintenance') {
        $$('[data-mode="launch"]').forEach((el) => el.classList.add('d-none'));
        $$('[data-mode="maintenance"]').forEach((el) => el.classList.remove('d-none'));
        document.title = 'Down for Maintenance | YardShield';
      }
      $$('[data-countdown]').forEach((el) => {
        let target = new Date(el.dataset.countdown).getTime();
        if (Number.isNaN(target) || target < Date.now()) target = Date.now() + 1000 * 60 * 60 * 24 * 21;
        const parts = { d: $('[data-cd="d"]', el), h: $('[data-cd="h"]', el), m: $('[data-cd="m"]', el), s: $('[data-cd="s"]', el) };
        const tick = () => {
          const diff = Math.max(0, target - Date.now());
          const d = Math.floor(diff / 864e5), h = Math.floor((diff % 864e5) / 36e5), m = Math.floor((diff % 36e5) / 6e4), s = Math.floor((diff % 6e4) / 1e3);
          parts.d.textContent = d; parts.h.textContent = String(h).padStart(2, '0');
          parts.m.textContent = String(m).padStart(2, '0'); parts.s.textContent = String(s).padStart(2, '0');
        };
        tick();
        window.setInterval(tick, 1000);
      });
    },
  };

  /* ------------------------------------------------------------------------
   * YS.reveal — fades sections in on scroll. Skipped on phones and for
   * visitors who prefer reduced motion, so content is never hidden for them.
   * ---------------------------------------------------------------------- */
  YS.reveal = {
    init() {
      const els = $$('.reveal');
      if (!els.length || YS.prefersReducedMotion() || window.innerWidth < 640 || !('IntersectionObserver' in window)) return;
      els.forEach((el) => { el.style.opacity = '0'; el.style.transform = 'translateY(12px)'; el.style.transition = 'opacity .5s ease, transform .5s ease'; });
      const io = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.style.opacity = '1'; en.target.style.transform = 'none'; io.unobserve(en.target); }
      }), { rootMargin: '0px 0px -10% 0px' });
      els.forEach((el) => io.observe(el));
    },
  };

  /** Small helpers: footer year, active nav fallback, mobile menu auto-close. */
  YS.misc = {
    init() {
      $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
      const nav = $('#mainNav');
      if (nav && window.bootstrap) {
        $$('a.nav-link:not(.dropdown-toggle)', nav).forEach((a) => a.addEventListener('click', () => {
          if (nav.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(nav).hide();
        }));
      }
      // Bootstrap tooltips
      if (window.bootstrap) $$('[data-bs-toggle="tooltip"]').forEach((el) => new bootstrap.Tooltip(el));
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    ['theme', 'direction', 'forms', 'password', 'zip', 'pricing', 'blog', 'countdown', 'reveal', 'misc']
      .forEach((m) => { try { YS[m].init(); } catch (err) { /* keep other modules running */ } });
  });
})();
