# Fonts

The template uses two Google Fonts, loaded from Google Fonts in each page `<head>`:

- **Bricolage Grotesque** (600–800) — headings
- **Figtree** (400–700) — body text

If the fonts can't load (offline), pages fall back to the system UI font.

## Self-hosting (recommended for performance and privacy)

1. Download WOFF2 files from https://gwfh.mranftl.com/fonts (Google Webfonts Helper) or https://fontsource.org.
2. Place them in this folder, e.g. `figtree-latin-400.woff2`.
3. Add `@font-face` rules at the top of `assets/css/style.css`:

```css
@font-face {
  font-family: "Figtree";
  src: url("../fonts/figtree-latin-400.woff2") format("woff2");
  font-weight: 400; font-style: normal; font-display: swap;
}
```

4. Remove the three Google Fonts `<link>` tags from every page (search for `fonts.googleapis.com`).
