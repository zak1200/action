# Action Étrangers — frontend demonstration

French, responsive website proposal for Action Étrangers. No production backend, payment, email delivery, authentication or real appointments.

## Run

Requires Python 3 and Node.js 20+ (build only). No npm dependencies or installation required.

```sh
cd /workspace/action
npm run dev
```

Open port 4173 in your browser. `#admin` opens the explicitly public admin demo. Each simulated booking stays only in JavaScript memory in that tab and disappears on reload. Use fictitious information only.

```sh
npm run build # produces dist/, ready for isolated static preview hosting
npm test      # while the dev server runs; needs Python Playwright and Chromium
```

The browser smoke test uses `/usr/bin/chromium`; override `CHROMIUM_PATH` if needed. GitHub Actions creates a build artifact; it does not deploy anything.

## Included

- Six service cards and detail dialogs, explanatory steps and FAQ.
- Contact details, Monday–Friday 09:00–17:00, verified against the live website on 11 November 2026.
- WhatsApp, Instagram and TikTok links with vector social icons.
- Two unique supplied TikTok videos, loaded on user interaction with direct-link fallbacks. Repeated video URL supplied by the client is deduplicated.
- Google Maps embed loaded only after a click, plus a directions link.
- 30-minute / proposed €10 appointment simulation: service, date, Paris time, fictitious name/email, optional description and terms acceptance.
- Weekday selection, elapsed-time filtering, demonstration slot conflict prevention and cancellation.
- Public admin prototype showing session simulations, counts and cancellation.
- Responsive layout, native keyboard-accessible dialogs, reduced-motion support and no tracking scripts.

External Maps/TikTok embeds depend on provider availability, permissions and network policy. Automated checks verify their requested URLs and lazy loading, not successful playback on those third-party services. Booking fee and proposed non-refund terms appear in the booking flow only. Final cancellation/withdrawal conditions require client review before payment activation.

## Deployment boundary

**Only `prev.action-etranger.fr` is a proposed deployment target.** Nothing in this repository backs up, modifies or deploys to the live WordPress site. Do not point this prototype at the apex domain. `robots.txt` and metadata request no indexing; these do not provide access control. Use hosting-level password protection for a private client preview.

See [deployment handoff](docs/DEPLOYMENT.md) and [production booking plan](docs/BOOKING-PLAN.md).

Content source: https://action-etranger.fr/ . Competitor reviewed for navigation and service clarity: https://titresfrancais.fr/ . Text and design in this demo are a new proposal; no competitor testimonials or results claims were copied.

## Design previews

[Desktop preview](docs/preview-desktop.png) · [Mobile preview](docs/preview-mobile.png)
