# Tenna IPTV Player: website

The landing page and legal pages for [Tenna IPTV Player](https://github.com/najiite/tenna-desktop): home, features, download (Windows and macOS available, Android and iOS coming soon), FAQ, privacy policy, terms of use, disclaimer and open-source notices.

It is a small dependency-free static site generator (Node 18+).

## Develop

```bash
node build.mjs     # builds ./dist
node serve.mjs     # serves ./dist at http://localhost:4173
node scripts/check-site.mjs   # checks links, anchors, titles, descriptions, alt text
```

Pages live in `src/pages/*.html` (front matter plus HTML) and are wrapped by `src/layout.html`. Shared values (version, download links, dates, contact) are in `site.config.json`; use them in pages as `{{c:key}}`. Static files are in `public/`.

## Before publishing

- Set `contactEmail` and the real `siteUrl` in `site.config.json`.
- Update `version`, `updated` and the download URLs when you release.
- Have the privacy policy, terms and disclaimer reviewed by a lawyer; they are written to match the app's behaviour but are not legal advice.
- When the Android and iOS apps ship, replace the "Coming soon" cards on the home and download pages with real links.

## Deploy

`.github/workflows/pages.yml` builds with `BASE_PATH=/tenna-player-web` and deploys `dist` to GitHub Pages. Enable Pages (source: GitHub Actions) in the repository settings.
