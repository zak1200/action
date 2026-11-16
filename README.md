# Action Étranger

French administrative support website demo, redesigned around the supplied official logo.

**Preview:** https://prev.action-etranger.fr/ · **Admin demo:** https://prev.action-etranger.fr/#admin

## Design

Native HTML, CSS and JavaScript, with no frontend framework or runtime dependencies. Manrope headings and Source Sans 3 body text are served locally. The navy/ivory palette, restrained red details, six consistent Lucide service icons and responsive layouts share one design system.

The official logo is preserved as the original PNG and a transparent PNG. Background removal was deterministic and approved by the client; recompositing over black reproduces the original pixels exactly. The white symbol is supported by a dark circular backing in navigation, footer and PNG app icons.

[Desktop screenshot](docs/preview-desktop.png) · [Mobile screenshot](docs/preview-mobile.png) · [Design and verification record](docs/REDESIGN.md)

## Run and build

Requires Node.js 20+ for building and Python 3 for the simple development server. No package installation is needed to run the website.

```sh
node scripts/build.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

On Windows use your installed Python executable if `python3` is not on PATH. Open http://127.0.0.1:4173/.

## Features

- Six service detail dialogs and contextual appointment selection.
- 30-minute, proposed €10 appointment simulation, Monday to Friday, 09:00–17:00 Paris time.
- Required service/date/time and fictitious name/email; optional request description.
- Weekend and elapsed-time rejection, duplicate-slot prevention, cancellation and public admin view.
- Native FAQ, keyboard navigation, visible focus, reduced-motion support and responsive layouts.
- WhatsApp, TikTok and Instagram links; two supplied TikTok videos and Google Maps load only after a click.
- Original title/description and preview noindex/nofollow settings retained.

Bookings live only in memory in the current tab and disappear on reload. No real booking, payment, email, authentication or database is active. Use fictitious information only. Proposed fee/non-refund conditions are shown only inside the booking flow and retain the qualification for applicable legal rights.

## Verification

`tests/browser.cjs` covers 51 assertions and the five requested widths: 1440, 1024, 768, 390 and 375px. It also runs axe scans when `AXE_PATH` points to an installed `@axe-core/playwright` package. Browser tooling is development-only and is never uploaded to hosting.

```sh
node tests/browser.cjs
```

Install Playwright separately or set `PLAYWRIGHT_PATH` to an existing installation; set `CHROMIUM_PATH` when using an installed Chromium/Edge executable. Optional environment variables: `DEMO_URL`, `ARTIFACT_DIR`, `AXE_PATH`. The legacy Python smoke suite remains available through `npm test`.

The final local mobile Lighthouse run scored 100 performance, 100 accessibility and 100 best practices (LCP 1.3s, CLS 0, TBT 20ms). These are lab measurements. Preview SEO scores are intentionally reduced by noindex. Automated accessibility scans do not replace a complete manual audit. TikTok/Maps URL and lazy-loading checks do not guarantee availability of third-party playback.

## Deployment and next phase

Deploy only to **prev.action-etranger.fr**. Production WordPress and email must remain intact. GitHub Actions builds a static artifact; it does not auto-deploy.

See [deployment record](docs/DEPLOYMENT.md) and [production booking plan](docs/BOOKING-PLAN.md). Stripe, a booking database, secure admin access, emails and calendar synchronization are a later client-approved phase.

Content is based on the client's existing site. No testimonials, qualifications, success rates or government affiliation have been invented. Font and icon licenses are included alongside the assets.
