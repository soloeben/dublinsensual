# Dublin Sensual Festival 2026

Production-ready static multi-page site for Dublin Sensual Festival.

## Architecture

- Vite multi-page static build
- Semantic HTML, shared CSS and lightweight JavaScript
- No permanent Node.js server required
- Compatible with normal Apache/cPanel hosting

## Local development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm run build
```

Upload the **contents** of `dist/` to the Sered/cPanel web root. The build includes `.htaccess`, `robots.txt`, `sitemap.xml`, all public pages, and fingerprinted production assets.

Do not upload source files, `node_modules`, `.git`, environment files, or development configuration to the public web root.

## Public pages

- `index.html`
- `tickets.html`
- `lineup.html`
- `schedule.html`
- `venue.html`
- `faq.html`
- `sponsorship.html`

Existing private/utility routes remain in the build for backwards compatibility.
