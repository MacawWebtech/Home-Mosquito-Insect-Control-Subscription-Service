/**
 * YardShield — YSCalendar
 * ----------------------------------------------------------------------------
 * A dependency-free, keyboard-accessible month calendar used on the
 * Schedule Visits page. Days are real <button>s inside a grid; arrow keys
 * move focus, Enter/Space selects.
 *
 * Usage
 *   const cal = new YSCalendar(document.getElementById('visitCalendar'), {
 *     events: [{ date: '2026-10-14', type: 'visit', label: 'Barrier treatment' }],
 *     minDate: new Date(),            // earlier days are disabled
 *     onSelect: (isoDate, events) => {}
 *   });
 *   cal.setEvents(newEvents);
 *
 * Event types: 'visit' (scheduled), 'booked' (one-off booking), 'skipped'.
 * TODO: to sync with a booking backend (Calendly, Acuity, your API), load
 * events in dashboard.js and call cal.setEvents().
 * ----------------------------------------------------------------------------
 */
(() => {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');
  /** Formats a Date as YYYY-MM-DD in local time. */
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  class YSCalendar {
    /**
     * @param {HTMLElement} el   Container element
     * @param {Object} opts      { events, minDate, onSelect, locale }
     */
    constructor(el, opts = {}) {
      this.el = el;
      this.events = opts.events || [];
      this.minDate = opts.minDate ? new Date(new Date(opts.minDate).setHours(0, 0, 0, 0)) : null;
      this.onSelect = opts.onSelect || (() => {});
      this.locale = opts.locale || document.documentElement.lang || 'en-US';
      const start = opts.start ? new Date(opts.start) : new Date();
      this.view = new Date(start.getFullYear(), start.getMonth(), 1);
      this.selected = null;
      this.focusDate = new Date(start);
      this.render();
    }

    /** Replaces the event list and redraws. */
    setEvents(events) { this.events = events; this.render(); }

    /** Returns events for a YYYY-MM-DD date. */
    eventsOn(date) { return this.events.filter((e) => e.date === date); }

    /** Moves the visible month by delta (+1 / -1). */
    shift(delta) {
      this.view = new Date(this.view.getFullYear(), this.view.getMonth() + delta, 1);
      this.focusDate = new Date(this.view);
      this.render();
    }

    /** Draws the header, weekday labels and day grid. */
    render() {
      const y = this.view.getFullYear();
      const m = this.view.getMonth();
      const title = this.view.toLocaleDateString(this.locale, { month: 'long', year: 'numeric' });
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      const today = iso(new Date());
      const dows = [...Array(7)].map((_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(this.locale, { weekday: 'short' }));

      let cells = '';
      for (let i = 0; i < first; i++) cells += '<span class="ys-cal-day is-other" aria-hidden="true"></span>';
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d);
        const key = iso(date);
        const evs = this.eventsOn(key);
        const disabled = this.minDate && date < this.minDate;
        const labelEv = evs.length ? `, ${evs.map((e) => e.label || e.type).join(', ')}` : '';
        const label = date.toLocaleDateString(this.locale, { weekday: 'long', month: 'long', day: 'numeric' }) + labelEv;
        const isFocus = iso(this.focusDate) === key;
        cells += `<button type="button" class="ys-cal-day${key === today ? ' is-today' : ''}" data-date="${key}"
            aria-pressed="${this.selected === key}" aria-label="${label}" tabindex="${isFocus ? 0 : -1}" ${disabled ? 'disabled' : ''}>
            <span>${d}</span>${evs.map((e) => `<span class="dot ${e.type}" aria-hidden="true"></span>`).slice(0, 1).join('')}
          </button>`;
      }

      this.el.innerHTML = `
        <div class="ys-calendar">
          <div class="ys-cal-head">
            <button type="button" class="icon-btn" data-cal-prev aria-label="Previous month"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
            <h2 aria-live="polite">${title}</h2>
            <button type="button" class="icon-btn" data-cal-next aria-label="Next month"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
          </div>
          <div class="ys-cal-grid" role="group" aria-label="${title}">
            ${dows.map((d) => `<span class="ys-cal-dow" aria-hidden="true">${d}</span>`).join('')}
            ${cells}
          </div>
          <div class="ys-cal-legend" aria-hidden="true">
            <span><i class="dot" style="background:var(--ys-primary)"></i>Scheduled visit</span>
            <span><i class="dot" style="background:var(--ys-accent)"></i>Booked extra</span>
            <span><i class="dot" style="background:var(--ys-text-muted)"></i>Skipped</span>
          </div>
        </div>`;

      this.el.querySelector('[data-cal-prev]').addEventListener('click', () => this.shift(-1));
      this.el.querySelector('[data-cal-next]').addEventListener('click', () => this.shift(1));
      this.el.querySelectorAll('.ys-cal-day[data-date]').forEach((btn) => {
        btn.addEventListener('click', () => this.select(btn.dataset.date));
        btn.addEventListener('keydown', (e) => this.onKey(e));
      });
    }

    /** Marks a date selected and calls onSelect. */
    select(date) {
      this.selected = date;
      this.focusDate = new Date(`${date}T00:00:00`);
      this.render();
      const btn = this.el.querySelector(`[data-date="${date}"]`);
      if (btn) btn.focus();
      this.onSelect(date, this.eventsOn(date));
    }

    /** Arrow-key navigation across days (and months at the edges). */
    onKey(e) {
      const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      const rtl = document.documentElement.dir === 'rtl';
      let delta = map[e.key];
      if (delta === undefined) return;
      if (rtl && Math.abs(delta) === 1) delta = -delta;
      e.preventDefault();
      const next = new Date(this.focusDate);
      next.setDate(next.getDate() + delta);
      this.focusDate = next;
      if (next.getMonth() !== this.view.getMonth()) this.view = new Date(next.getFullYear(), next.getMonth(), 1);
      this.render();
      const btn = this.el.querySelector(`[data-date="${iso(next)}"]`);
      if (btn) btn.focus();
    }
  }

  YSCalendar.iso = iso;
  window.YSCalendar = YSCalendar;
})();
