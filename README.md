# Action Étranger

French administrative support website demo, redesigned around the supplied official logo.

**Preview:** https://prev.action-etranger.fr/ · **Admin:** https://prev.action-etranger.fr/#admin

## Design

Native HTML, CSS and JavaScript, with no frontend framework or runtime dependencies. Manrope headings and Source Sans 3 body text are served locally. The navy/ivory palette, restrained red details, six consistent Lucide service icons and responsive layouts share one design system.

The official logo is preserved as the original PNG and a transparent PNG. Background removal was deterministic and approved by the client; recompositing over black reproduces the original pixels exactly. The white symbol is supported by a dark circular backing in navigation, footer and PNG app icons.

[Desktop screenshot](docs/preview-desktop.png) · [Mobile screenshot](docs/preview-mobile.png) · [Design and verification record](docs/REDESIGN.md)

## Run and build

Requires Node.js 20+, PHP 8.2+ with PDO SQLite, mbstring, curl and openssl, and Composer.

```sh
composer install --working-dir=server --no-dev --prefer-dist
npm run build
# Configure ACTION_PRIVATE_DIR outside the document root first; see docs/PAYMENTS.md.
php -S 127.0.0.1:4173 -t dist
```

## Features

- Six service detail dialogs and contextual appointment selection.
- 30-minute, €10 Stripe Checkout integration with persistent weekday appointments in Paris time.
- Required name, email, phone and service; optional description.
- Server-side slot locking, signed payment webhooks, email outbox and calendar attachments.
- Protected admin with email login codes, payment status, closures, cancellations and delivery retries.
- Native FAQ, keyboard navigation, visible focus, reduced-motion support and responsive layouts.
- WhatsApp, TikTok and Instagram links; two supplied TikTok videos and Google Maps load only after a click.
- Original title/description and preview noindex/nofollow settings retained.

The preview now accepts **sandbox payments only**. A EUR 10 Stripe test Checkout succeeded and confirmed a persisted appointment. SMTP authentication, a probe send and the deployed admin code request succeeded; agency inbox receipt and deployed admin login confirmation are pending. Live payments remain disabled. See [implementation status and setup](docs/PAYMENTS.md).

## Verification

```sh
php tests/backend.php
node tests/payments-browser.cjs
```

The backend suite includes concurrent slot attempts and signature/authentication checks. Browser checks cover 1440, 1024, 768, 390 and 375px. Set `PLAYWRIGHT_PATH`, `CHROMIUM_PATH`, `PHP_PATH`, `ARTIFACT_DIR` and optional `AXE_PATH` for existing test tooling. No browser test dependencies or fixtures are deployed.

## Deployment and next phase

Deploy only to **prev.action-etranger.fr**. Production WordPress and email must remain intact. GitHub Actions checks the backend and builds a PHP deployment artifact; it does not auto-deploy.

See [deployment record](docs/DEPLOYMENT.md) and [production booking plan](docs/BOOKING-PLAN.md). The booking phase is in implementation; see [payment setup](docs/PAYMENTS.md) for completed components, activation requirements and remaining calendar integration.

Content is based on the client's existing site. No testimonials, qualifications, success rates or government affiliation have been invented. Font and icon licenses are included alongside the assets.
