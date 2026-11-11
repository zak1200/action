# Production booking phase — after client validation

## Proposed approach

Keep the validated frontend and add a small server-side application, managed SQL database, Stripe Checkout, transactional email and a secured admin area. A suitable existing Hostinger plan may suffice; choose a VPS only after checking supported runtimes, operating costs and maintenance needs. The existing domain is sufficient. Keep the preview isolated.

## Reservation lifecycle

1. The server lists availability in Europe/Paris with daylight-saving handling, weekly opening hours, closures, lead time and appointment duration (30 minutes). Never rely on browser memory to enforce availability.
2. Validate name, email, service, optional description and acceptance of published terms. Collect only necessary personal information. Rate-limit requests and provide spam protection.
3. Atomically reserve the selected slot using a database constraint/transaction. Use a short-lived hold and Stripe Checkout configured server-side for EUR 10.00. Never trust a price or payment status sent by the browser.
4. Verify the Stripe webhook signature using the unmodified request body. Process payment events idempotently and confirm a booking only after verified payment. Handle expired holds, duplicate/delayed webhooks, failed payments, refunds and conflict reconciliation. Do not confirm from the browser success redirect alone.
5. After committing the booking, queue emails to customer and business owner. Include appointment date/time, service, location/contact details and payment reference, with Stripe receipt configuration where applicable. Retry email delivery without creating duplicate bookings. Do not put unnecessary sensitive descriptions in email.
6. Add the appointment to the owner's calendar through an authorised calendar integration. Give the customer a calendar invitation/ICS attachment; adding to their personal calendar requires their acceptance or explicit permission. Schedule changes and cancellations must update the event and send notifications consistently.

## Minimal data model

- Services and duration, weekly availability, date-specific closures.
- Bookings: ID, customer contact, service, optional description, start/end timestamps (UTC), Europe/Paris display zone, booking/payment status, hold expiry, Stripe session/payment IDs, calendar event ID, creation time, terms version/acceptance time.
- Payment webhook event IDs for idempotency; notification delivery queue/state.
- Admin identity/roles and audit trail.

## Admin functions

Authenticated dashboard with daily/weekly calendar, confirmed/pending/cancelled bookings, availability and closures, search, booking details, notification status, payment/receipt links, cancellation/refund workflow and controlled data export. Payment/booking changes happen server-side with audit logs. Include session security, CSRF protection, access control, backup and restore testing, retention rules and monitoring.

## Needed from the client before activation

- Approved brand/logo, service wording, business legal identity and booking terms.
- Final cancellation, refund and withdrawal rules; the proposed non-refundable fee must account for applicable consumer rights.
- Appointment format (office, phone or video), capacity, staff calendars, holidays, buffers and advance-booking rules.
- Business-owned Stripe account and secure test/live credentials + webhook setup through hosting secret settings.
- Owner notification email and calendar provider; authorised calendar connection.
- Transactional email provider and authorised sender. Add sender authentication records without replacing existing email records.
- Privacy policy, data retention and customer consent wording.

## Acceptance before launch

Test Stripe sandbox success/failure, duplicate and concurrent slot attempts, expired holds, webhook replay, DST transitions, email retries, calendar failures, authenticated admin access and restore from backup. Then configure live credentials securely and run a controlled end-to-end live check with the client. No secrets or production personal data belong in GitHub.
