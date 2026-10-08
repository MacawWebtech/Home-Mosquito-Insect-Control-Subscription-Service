/**
 * YardShield — dashboard.js
 * ----------------------------------------------------------------------------
 * Behaviour for the customer portal and the admin dashboard.
 * Depends on: Bootstrap bundle, main.js (YS namespace), Chart.js (charts),
 * plugins/calendar.js (schedule page). Each module no-ops when its markup is
 * absent, so the same file is loaded on every dashboard page.
 *
 * Modules
 *   YSD.skeletons   Swaps skeleton placeholders for real content
 *   YSD.charts      Theme-aware Chart.js charts (customer + admin)
 *   YSD.schedule    Calendar booking / reschedule / skip flow
 *   YSD.tables      Search + status filters for data tables
 *   YSD.messages    Conversation switcher and composer
 *   YSD.billing     Pause / cancel / upgrade confirmations
 * ----------------------------------------------------------------------------
 */
(() => {
  'use strict';

  const YSD = (window.YSD = window.YSD || {});
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const toast = (msg, v) => (window.YS && window.YS.toast ? window.YS.toast(msg, v) : null);

  /* ------------------------------------------------------------------------
   * YSD.skeletons — every [data-skeleton] block starts in its loading state.
   * TODO: replace the timeout with your real data fetch, then call
   *       YSD.skeletons.done(el) when the data has rendered.
   * ---------------------------------------------------------------------- */
  YSD.skeletons = {
    /** Marks one skeleton container as loaded. */
    done(el) { el.classList.add('is-loaded'); el.setAttribute('aria-busy', 'false'); },
    init() {
      const els = $$('[data-skeleton]');
      els.forEach((el) => el.setAttribute('aria-busy', 'true'));
      els.forEach((el, i) => window.setTimeout(() => this.done(el), 650 + i * 120));
    },
  };

  /* ------------------------------------------------------------------------
   * YSD.charts — reads brand colours from CSS variables so charts follow
   * light/dark mode, and re-renders on the ys:themechange event.
   * TODO: replace the demo series below with data from your API.
   * ---------------------------------------------------------------------- */
  YSD.charts = {
    instances: [],
    /** Current palette pulled from the active theme's CSS tokens. */
    palette() {
      const cs = getComputedStyle(document.documentElement);
      const v = (n) => cs.getPropertyValue(n).trim();
      return { primary: v('--ys-primary'), secondary: v('--ys-secondary'), lime: v('--ys-lime'), accent: v('--ys-accent'), text: v('--ys-text'), muted: v('--ys-text-muted'), border: v('--ys-border'), danger: v('--ys-danger'), surface: v('--ys-surface') };
    },
    /** Returns a Chart.js config for the named chart. */
    config(name, p) {
      const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
      const line = (label, data, color, fill = false) => ({ label, data, borderColor: color, backgroundColor: fill ? `${color}22` : color, fill, tension: 0.35, pointRadius: 3, pointHoverRadius: 6, borderWidth: 2.5 });
      const charts = {
        'effectiveness-trend': { type: 'line', data: { labels: months.slice(-6), datasets: [line('Effectiveness %', [86, 89, 91, 92, 95, 94], p.primary, true)] }, opts: { yMin: 70, yMax: 100, suffix: '%' } },
        'pest-activity': {
          type: 'line',
          data: { labels: months, datasets: [
            line('Before YardShield (est.)', [12, 8, 5, 6, 18, 34, 52, 68, 74, 70, 49, 26], p.muted),
            line('Your yard', [3, 2, 1, 1, 4, 6, 8, 9, 10, 9, 6, 4], p.primary, true),
          ] },
          opts: { title: 'Insects caught per trap check' },
        },
        'visit-scores': { type: 'bar', data: { labels: ['May 4', 'May 25', 'Jun 15', 'Jul 6', 'Jul 27', 'Aug 17', 'Sep 7', 'Sep 28'], datasets: [{ label: 'Effectiveness score', data: [88, 90, 92, 91, 95, 93, 96, 94], backgroundColor: p.primary, borderRadius: 6, maxBarThickness: 36 }] }, opts: { yMin: 60, yMax: 100, suffix: '%' } },
        'seasonal-pests': {
          type: 'line',
          data: { labels: months, datasets: [
            line('Mosquitoes', [1, 0, 0, 0, 2, 4, 6, 7, 8, 7, 4, 2], p.primary),
            line('Ticks', [1, 0, 0, 1, 3, 4, 3, 2, 2, 2, 2, 1], p.lime),
            line('Ants', [0, 0, 0, 0, 1, 2, 3, 3, 3, 2, 1, 0], p.accent),
          ] },
          opts: {},
        },
        'area-breakdown': { type: 'doughnut', data: { labels: ['Shrubs & foliage', 'Perimeter', 'Shaded areas', 'Standing water'], datasets: [{ data: [38, 27, 22, 13], backgroundColor: [p.primary, p.lime, p.accent, p.muted], borderColor: p.surface, borderWidth: 3 }] }, opts: { legendBottom: true } },
        // Admin
        'admin-mrr': { type: 'line', data: { labels: months, datasets: [line('MRR ($k)', [118, 121, 119, 124, 139, 162, 188, 204, 213, 216, 205, 191], p.primary, true)] }, opts: { prefix: '$', suffix: 'k' } },
        'admin-plans': { type: 'doughnut', data: { labels: ['Basic', 'Standard', 'Premium'], datasets: [{ data: [34, 48, 18], backgroundColor: [p.lime, p.primary, p.accent], borderColor: p.surface, borderWidth: 3 }] }, opts: { legendBottom: true } },
        'admin-signups': { type: 'bar', data: { labels: months, datasets: [
          { label: 'New subscriptions', data: [64, 41, 38, 52, 148, 236, 284, 251, 198, 172, 121, 88], backgroundColor: p.primary, borderRadius: 6 },
          { label: 'Cancellations', data: [42, 51, 39, 28, 22, 26, 31, 34, 38, 44, 57, 63], backgroundColor: p.muted, borderRadius: 6 },
        ] }, opts: {} },
      };
      return charts[name];
    },
    /** Creates every chart on the page (destroying old instances first). */
    render() {
      if (!window.Chart) return;
      this.instances.forEach((c) => c.destroy());
      this.instances = [];
      const p = this.palette();
      const reduce = window.YS && window.YS.prefersReducedMotion();
      Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
      Chart.defaults.color = p.muted;
      $$('canvas[data-chart]').forEach((canvas) => {
        const c = this.config(canvas.dataset.chart, p);
        if (!c) return;
        const isDonut = c.type === 'doughnut';
        const fmt = (val) => `${c.opts.prefix || ''}${val}${c.opts.suffix || ''}`;
        const chart = new Chart(canvas, {
          type: c.type,
          data: c.data,
          options: {
            responsive: true, maintainAspectRatio: false,
            animation: reduce ? false : { duration: 600 },
            interaction: { mode: isDonut ? 'nearest' : 'index', intersect: false },
            cutout: isDonut ? '68%' : undefined,
            plugins: {
              legend: { display: c.data.datasets.length > 1 || isDonut, position: c.opts.legendBottom ? 'bottom' : 'top', align: 'start', labels: { usePointStyle: true, boxWidth: 8, padding: 16, color: p.text } },
              tooltip: { callbacks: isDonut ? { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%` } : { label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } },
            },
            scales: isDonut ? {} : {
              x: { grid: { display: false }, border: { color: p.border }, ticks: { color: p.muted } },
              y: { min: c.opts.yMin, max: c.opts.yMax, grid: { color: p.border }, border: { display: false }, ticks: { color: p.muted, callback: fmt } },
            },
          },
        });
        this.instances.push(chart);
      });
    },
    init() {
      if (!$('canvas[data-chart]')) return;
      this.render();
      document.addEventListener('ys:themechange', () => this.render());
    },
  };

  /* ------------------------------------------------------------------------
   * YSD.schedule — booking, rescheduling and skipping recurring visits.
   * Demo visits are generated every 21 days from today so the calendar
   * always has data.
   * TODO: POST changes to your booking endpoint inside commit().
   * ---------------------------------------------------------------------- */
  YSD.schedule = {
    events: [],
    mode: null,          // 'reschedule' while picking a new date
    moving: null,        // event being rescheduled
    /** Builds demo recurring visits starting a few days from today. */
    seed() {
      const out = [];
      const start = new Date();
      start.setDate(start.getDate() + 4);
      for (let i = -3; i < 8; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * 21);
        out.push({ id: `v${i}`, date: YSCalendar.iso(d), type: 'visit', label: i % 3 === 0 ? 'Barrier treatment + tick control' : 'Barrier treatment', past: i < 0 });
      }
      return out;
    },
    /** Human readable date. */
    pretty(isoDate) {
      return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    },
    /** Applies a change locally and redraws (hook your API here). */
    commit(message) {
      this.cal.setEvents(this.events);
      this.renderUpcoming();
      toast(message);
    },
    /** Lists upcoming events beside the calendar. */
    renderUpcoming() {
      const list = $('#upcomingList');
      if (!list) return;
      const today = YSCalendar.iso(new Date());
      const upcoming = this.events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
      const badge = { visit: '<span class="badge badge-soft">Scheduled</span>', booked: '<span class="badge badge-amber">Extra visit</span>', skipped: '<span class="badge badge-muted">Skipped</span>' };
      list.innerHTML = upcoming.map((e) => `
        <li class="list-group-item d-flex justify-content-between align-items-center gap-2 px-0">
          <div><strong class="d-block">${this.pretty(e.date)}</strong><span class="text-muted small">${e.label}</span></div>${badge[e.type]}
        </li>`).join('');
    },
    /** Updates the side panel for the chosen date. */
    onSelect(date, evs) {
      const panel = $('#dayPanel');
      const today = YSCalendar.iso(new Date());
      if (this.mode === 'reschedule' && this.moving) {
        if (evs.some((e) => e.type !== 'skipped')) { toast('That day already has a visit. Pick another date.', 'warning'); return; }
        const from = this.moving.date;
        this.moving.date = date;
        this.mode = null;
        this.moving = null;
        this.commit(`Visit moved from ${this.pretty(from)} to ${this.pretty(date)}.`);
        this.cal.select(date);
        return;
      }
      const ev = evs[0];
      let body = `<h2 class="h5 mb-1">${this.pretty(date)}</h2>`;
      if (ev && ev.type !== 'skipped') {
        body += `<p class="text-muted mb-3">${ev.label} &middot; Technician arrives 8&ndash;11 AM</p>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary" data-act="reschedule"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>Reschedule</button>
            <button type="button" class="btn btn-ghost" data-act="skip"><i class="bi bi-skip-forward" aria-hidden="true"></i>Skip this visit</button>
          </div>
          <p class="small text-muted mt-3 mb-0">Skipping keeps your guarantee active if your next visit is within 30 days.</p>`;
      } else if (ev && ev.type === 'skipped') {
        body += `<p class="text-muted mb-3">This visit was skipped.</p>
          <button type="button" class="btn btn-primary" data-act="restore"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>Restore visit</button>`;
      } else if (date < today) {
        body += '<p class="text-muted mb-0">No visit on this day.</p>';
      } else {
        body += `<p class="text-muted">No visit scheduled. Book a one-off treatment, for example before a party.</p>
          <label class="form-label" for="bookService">Service</label>
          <select id="bookService" class="form-select mb-3">
            <option>Event mosquito treatment (+$59)</option>
            <option>Wasp &amp; hornet nest removal (+$79)</option>
            <option>Free re-treatment (guarantee)</option>
          </select>
          <button type="button" class="btn btn-accent" data-act="book"><i class="bi bi-calendar-plus" aria-hidden="true"></i>Book this day</button>`;
      }
      panel.innerHTML = body;
      const act = (name, fn) => { const b = $(`[data-act="${name}"]`, panel); if (b) b.addEventListener('click', fn); };
      act('reschedule', () => { this.mode = 'reschedule'; this.moving = ev; panel.insertAdjacentHTML('beforeend', '<div class="alert alert-info mt-3 mb-0" role="status">Now choose the new date on the calendar.</div>'); });
      act('skip', () => { ev.type = 'skipped'; this.commit(`Visit on ${this.pretty(date)} skipped.`); this.onSelect(date, [ev]); });
      act('restore', () => { ev.type = 'visit'; this.commit(`Visit on ${this.pretty(date)} restored.`); this.onSelect(date, [ev]); });
      act('book', () => {
        const label = $('#bookService', panel).value.replace(/\s*\(.*\)/, '');
        const n = { id: `b${Date.now()}`, date, type: 'booked', label };
        this.events.push(n);
        this.commit(`${label} booked for ${this.pretty(date)}.`);
        this.onSelect(date, [n]);
      });
    },
    init() {
      const el = $('#visitCalendar');
      if (!el || !window.YSCalendar) return;
      this.events = this.seed();
      this.cal = new YSCalendar(el, { events: this.events, minDate: new Date(), onSelect: (d, evs) => this.onSelect(d, evs) });
      this.renderUpcoming();
    },
  };

  /* ------------------------------------------------------------------------
   * YSD.tables — text search and status filter for [data-table] tables.
   * ---------------------------------------------------------------------- */
  YSD.tables = {
    init() {
      $$('[data-table-tools]').forEach((tools) => {
        const table = $(tools.dataset.tableTools);
        if (!table) return;
        const rows = $$('tbody tr', table);
        const search = $('[data-table-search]', tools);
        const status = $('[data-table-status]', tools);
        const count = $('[data-table-count]', tools);
        const run = () => {
          const q = search ? search.value.trim().toLowerCase() : '';
          const st = status ? status.value : 'all';
          let n = 0;
          rows.forEach((r) => {
            const show = (!q || r.textContent.toLowerCase().includes(q)) && (st === 'all' || r.dataset.status === st);
            r.classList.toggle('d-none', !show);
            if (show) n++;
          });
          if (count) count.textContent = `${n} of ${rows.length} shown`;
        };
        if (search) search.addEventListener('input', run);
        if (status) status.addEventListener('change', run);
        run();
      });
    },
  };

  /* ------------------------------------------------------------------------
   * YSD.messages — switches conversations and appends sent messages.
   * TODO: connect to your support desk (Intercom, Zendesk, Crisp) API.
   * ---------------------------------------------------------------------- */
  YSD.messages = {
    init() {
      const list = $('[data-thread-list]');
      if (list) {
        $$('[data-thread]', list).forEach((item) => item.addEventListener('click', () => {
          $$('[data-thread]', list).forEach((i) => { i.classList.toggle('active', i === item); i.setAttribute('aria-current', i === item ? 'true' : 'false'); });
          $$('[data-thread-panel]').forEach((p) => p.classList.toggle('d-none', p.dataset.threadPanel !== item.dataset.thread));
          const badge = $('.badge', item);
          if (badge) badge.remove();
        }));
      }
      $$('[data-composer]').forEach((form) => form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('textarea, input[type="text"]', form);
        const text = input.value.trim();
        if (!text) { input.classList.add('is-invalid'); input.focus(); return; }
        input.classList.remove('is-invalid');
        const thread = $(form.dataset.composer);
        const b = document.createElement('div');
        b.className = 'bubble me';
        b.textContent = text;
        const time = document.createElement('small');
        time.textContent = `You · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        b.appendChild(time);
        thread.appendChild(b);
        thread.scrollTop = thread.scrollHeight;
        input.value = '';
        toast('Message sent. We usually reply within 2 hours.');
      }));
    },
  };

  /* ------------------------------------------------------------------------
   * YSD.billing — confirm dialogs for pause / cancel / plan change.
   * TODO: call Stripe Customer Portal or your billing API in each handler.
   * ---------------------------------------------------------------------- */
  YSD.billing = {
    init() {
      $$('[data-billing-action]').forEach((btn) => btn.addEventListener('click', () => {
        const action = btn.dataset.billingAction;
        const modalEl = btn.closest('.modal');
        const msgs = {
          pause: 'Your subscription is paused. We will resume visits on the date you chose.',
          cancel: 'Your cancellation request was received. Visits continue until the end of this billing period.',
          upgrade: 'Plan updated. Your next invoice will be prorated.',
          card: 'Payment method saved.',
        };
        if (modalEl && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        toast(msgs[action] || 'Saved.');
        if (action === 'pause') {
          const status = $('#planStatus');
          if (status) { status.className = 'badge badge-amber'; status.textContent = 'Paused'; }
        }
      }));
      $$('[data-select-plan]').forEach((btn) => btn.addEventListener('click', () => {
        const target = $('#newPlanName');
        if (target) target.textContent = btn.dataset.selectPlan;
      }));
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    ['skeletons', 'charts', 'schedule', 'tables', 'messages', 'billing']
      .forEach((m) => { try { YSD[m].init(); } catch (err) { /* keep other modules running */ } });
  });
})();
