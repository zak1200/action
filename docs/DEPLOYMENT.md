# Hostinger preview deployment

## Current state, 16 November 2026

The redesigned static website is deployed at **https://prev.action-etranger.fr/**.
The only deployment directory is `/home/u916077829/domains/action-etranger.fr/public_html/prev`.
The parent WordPress installation and its database were not changed by this deployment.

- Built locally and uploaded `action-redesign_20261116.zip` through the authenticated Hostinger file manager.
- Confirmed `/files/public_html/prev/` before extracting into `.` with overwrite enabled.
- Verified all 39 deployed static files against local SHA-256 hashes: every file matches.
- HTTPS returns 200 and the new homepage/logo render correctly.
- Live `action-etranger.fr` still returns 200 with its original page title.
- Public MX, SPF and DMARC match the pre-deployment snapshot. No DNS, mail, SSL or production settings were changed.
- `default.php` in the preview directory was left untouched. The uploaded archive contains public frontend assets only.
- Existing HTML title, description, robots.txt and noindex/nofollow metadata are preserved. Preview indexing is intentionally disabled; this is not password protection.

## Backups and rollback

On 11 November 2026, before the initial preview deployment, the WordPress files and database were backed up privately. The files archive was fully read and gzip integrity checked (777,263,335 bytes; 44,843 archive entries). The SQL gzip was checked for all 82 tables, inserted data and completion (10,725,655 bytes). These were live exports taken separately, not a single transactional snapshot. No restore rehearsal was performed.

Backups contain sensitive data and are deliberately excluded from this repository and all public uploads. Their private storage locations and checksums are recorded in the owner's workspace handoff.

Before this redesign, the five original public preview assets were saved privately in `work/preview-before-redesign/` with a SHA-256 manifest. To roll back the preview, restore those five files to the same preview directory. Do not extract a WordPress backup into `prev`, or deploy this frontend at the parent `public_html` root.

## Future updates

1. Use `.hostinger/site.json` to identify the preview target. Never infer the apex as a destination.
2. Build using `node scripts/build.mjs` and verify the resulting `dist/` folder.
3. Preserve the existing preview before overwriting it. Upload only static build output, never `.git`, private backups or environment files.
4. Extract with `index.html` at the preview root. Update the CSS/JS version query when changing those files so returning visitors receive the new assets.
5. Read the deployed site back, compare asset hashes and verify the booking/admin simulation. Confirm the production website still responds.

This project uses the existing shared hosting plan. The static demo requires no new domain, VPS, database or paid hosting upgrade. GitHub Actions builds an artifact but does not automatically deploy to Hostinger.

## Production remains a separate phase

Payments, durable bookings, authentication, email and calendar synchronization are not active. See [BOOKING-PLAN.md](BOOKING-PLAN.md) for the proposed server-side workflow after client approval.
