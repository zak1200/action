# Booking implementation — 21 November 2026

## Status

Implemented locally; real Stripe checkout and email delivery are not yet verified or enabled. The authorized connector currently exposes the client live account. Sandbox access and server credentials are still required. Do not mistake connector authorization for a website API credential.

The preview must stay disabled until the acceptance steps below pass. No production WordPress or DNS changes are part of this deployment.

## Components

- `booking.js`: required name/email/phone/service/date/time, optional description, live availability, Checkout redirect and token-protected status polling.
- `admin.js`: email OTP login, date-filtered appointments, payment links, delivery status/retries, closures and cancellations. All personal information and mutations require server authentication; the hash route is not an access control.
- `api/index.php`: JSON routes, same-origin CSRF, rate limits, request-size limits, private status token and signed Stripe webhook.
- `server/`: SQLite transactions, Stripe SDK, PHPMailer, outbox, worker and CLI preflight. Its directory is denied to HTTP by `.htaccess`.

## Private configuration

Install the values described in `server/config.example.php` as:

`/home/u916077829/domains/action-etranger.fr/action-booking-preview/config.php`

This directory is **outside public_html**, contains SQLite and sessions, and must never be placed in the deployment ZIP or Git. Restrict directory/file permissions to the hosting account. On a local machine, set `ACTION_PRIVATE_DIR` to another private directory outside the served project.

Use a distinct restricted sandbox key for preview, not the live key. Minimum API access: Checkout Sessions, Products and Prices write; Accounts, Payment Intents, Charges and Events read. Webhook endpoint provisioning through the connector additionally requires Webhook Endpoints write. Confirm the key belongs to the client account. Store secrets in a hosting vault when available; this shared PHP plan uses the protected file outside the public root.

Sender: `contact@action-etranger.fr`; admin and agency notification recipient: `agenceassistance3@gmail.com`. Hostinger inspection on 21 November confirmed the mailbox exists, is active, has one forwarding rule, and is at 101% storage (1.01 GB / 1 GB) on the existing free plan. Its password is not available. Resolve the mailbox quota and verify SMTP credentials/delivery before activation; do not delete email or purchase an upgrade without user approval. SMTP authentication alone is not a delivery test. Sandbox notifications carry `[TEST]` and should use controlled test recipients.

## Deployment

1. `composer install --working-dir=server --no-dev --prefer-dist` and `npm run build`.
2. Back up the existing preview and upload **dist contents only** to `/public_html/prev`. Never extract over `/public_html` itself.
3. Upload private configuration to the separate directory above; start with `enabled=false`, `mode=test`.
4. Register `https://prev.action-etranger.fr/api/index.php?action=webhook` in the client sandbox for `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `charge.refunded`. Put the signing secret in private config.
5. Add a once-per-minute PHP cron for `/home/u916077829/domains/action-etranger.fr/public_html/prev/server/worker.php`. It reconciles expired/lost responses and sends queued mail with retries. Overlapping worker runs are prevented by a file lock.
6. Run `server/preflight.php` from the host CLI. Verify account identity, PDO SQLite and SMTP authentication. Never expose phpinfo or secrets through a public diagnostic route.
7. Enable **sandbox only**, complete an actual Stripe test Checkout, verify signed webhook, persisted appointment, both confirmation emails and usable calendar attachment. Test declined payment, abandoned session, duplicate delivery, admin OTP/logout, booking cancellation and retries.
8. Confirm `/server/config.example.php`, `/server/schema.sql`, vendor files and private data are inaccessible over HTTP. Verify the production WordPress page and unchanged email DNS records.

## Payment and booking rules

Server fixes the price at EUR 10 for 30 minutes. Paris-time weekday appointments, 09:00–17:00, 60-minute lead time, 60-day horizon. SQLite uniquely locks a slot before Checkout creation. A pending browser redirect never confirms payment. Only verified Stripe data for the same booking, environment, amount and currency can confirm it. Delayed payment methods keep the slot until a paid/failed event. Expiration is checked with Stripe; time alone never frees a potentially paid slot.

Unknown session creation outcomes keep the slot blocked. The worker searches Stripe session metadata to recover lost responses. If no session is found or API permissions fail, the admin shows the unresolved hold; investigate in Stripe before releasing it. This favors avoiding double bookings over reopening a slot on an uncertain outcome.

Cancellation frees a confirmed slot and queues notifications; it **does not refund automatically**. Stripe refund events update payment status. Payment links let the administrator review the transaction in Stripe.

Notifications are queued once per booking/kind/recipient, retried up to eight times. SMTP delivery is at-least-once: a crash after SMTP accepted a message but before saving its state may duplicate an email. Failed messages remain visible to the admin. Calendar files use stable event UIDs and UTC times. Automatic synchronization to an agency Google/Outlook calendar remains unconfigured; importing an ICS is not equivalent to calendar API synchronization.

## Verification

- `php tests/backend.php`: 43 checks, including two concurrent PHP processes competing for one slot, HMAC signatures, amount/mode checks, duplicate webhook, OTP replay/lockout, CSRF, cancellation, expiry and DST.
- `node tests/payments-browser.cjs`: 39 checks using real local PHP/SQLite and a synthetic Stripe HTTP fixture, five widths (1440, 1024, 768, 390, 375), no JS errors, three axe scans with zero violations. It does **not** prove real Stripe or SMTP connectivity.
- The test fixture, OTP seeder and fake credentials are never included in `dist`.
- Current SDK: stripe-php 23.1.0; PHPMailer 7.2.0. Composer audit reported no advisories at install time.

Before live activation: approve legal identity, booking/cancellation terms and data-retention policy; obtain a separate restricted live key and live webhook secret; verify charge readiness and exact account identity; test actual email delivery; configure backups and perform a restore test. Keep existing consumer-rights qualification; do not advertise guaranteed administrative outcomes.
