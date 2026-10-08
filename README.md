# YardShield — Mosquito & Insect Control Subscription Template

A multi-page Bootstrap 5 website template for a residential pest-control
subscription business: marketing site, customer portal and admin dashboard.

**Version:** 1.2.0 · **Bootstrap:** 5.3.3 · **License:** see `documentation/index.html#credits`

## Quick start

1. Unzip the folder.
2. Open `index.html` (it forwards to `pages/index.html`). No build step, no server needed.
3. Read `documentation/index.html` for customization.

Bootstrap, icons and charts are bundled locally in `assets/vendor`. Photos load
from Unsplash and the two Google Fonts from Google; offline, pages fall back to
the local illustrations in `assets/images` and the system font.

## What's inside

```
yardshield/
├── index.html               Entry point → pages/index.html
├── assets/
│   ├── css/  style.css      Design tokens (:root) + all components
│   │         dark-mode.css  Dark theme token overrides
│   │         rtl.css        Right-to-left adjustments
│   ├── js/   main.js        Theme, RTL, forms, zip checker, pricing, blog
│   │         dashboard.js   Skeletons, charts, scheduling, tables, messages
│   │         plugins/calendar.js  Accessible calendar component
│   ├── vendor/              Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Chart.js 4.4.1
│   ├── images/              Offline fallback illustrations (WebP + JPG) + favicon
│   └── fonts/               Self-hosting notes
├── pages/                   26 HTML pages (see below)
├── documentation/index.html Installation & customization guide
├── sitemap.xml, robots.txt
└── README.md
```

### Pages

| Area | Files |
|---|---|
| Marketing | `index` (Home 1), `index-2` (Home 2), `about`, `services`, `service-details`, `pricing`, `blog`, `blog-details`, `contact` |
| Auth | `login`, `register`, `forgot-password` |
| Customer portal | `dashboard` (overview), `dashboard-schedule`, `dashboard-history`, `dashboard-reports`, `dashboard-billing`, `dashboard-profile`, `dashboard-messages` |
| Admin | `admin` (analytics), `admin-users`, `admin-subscriptions`, `admin-messages` |
| Utility | `404`, `coming-soon` (`?mode=maintenance` variant), `maintenance` |

## Rebrand in 5 minutes

- **Name:** find & replace `YardShield` across `/pages`.
- **Colors:** edit the tokens at the top of `assets/css/style.css` (and their dark versions in `dark-mode.css`).
- **Fonts:** change `--ys-font-heading` / `--ys-font-body` and the Google Fonts link.
- **Domain:** find & replace `yardshield.example` (canonical URLs, Open Graph, JSON-LD, sitemap, robots).
- **Photos:** see the *Photo list* in the documentation; save your own as `assets/images/<name>.webp/.jpg`.
- **Integrations:** search the code for `TODO:` — every integration point is marked.

## Changelog

- **1.2.0** (2026-10-06) — Second, photo-led home page (`index-2.html`) and a Home menu dropdown.
- **1.1.0** (2026-10-06) — Real photography from Unsplash (responsive WebP/JPG, offline fallback).
- **1.0.0** (2026-10-06) — Initial release.

## Support

See `documentation/index.html#support`.
