# Hostinger preview handoff

## Verified in this working session

- The selected GitHub repository was empty; a static frontend demo has now been created.
- `npm run build` passes.
- Browser checks pass for service details, weekends, simulated booking/admin, duplicate slots, cancellation, reset on reload, safe text rendering, responsive widths (320, 390, 768, 1440), mobile navigation and no JavaScript errors.
- Public live site was read successfully after the user updated environment configuration. Hours: Monday–Friday 09:00–17:00.
- Hostinger MCP server registration succeeded, but OAuth sign-in timed out. No authenticated account, site, backups, DNS or SSL settings have been inspected.
- **No WordPress files/database backup, DNS change or hosting deployment has been performed.**

## Resume

1. Start a new Codex session so the newly registered `https://mcp.hostinger.com` server can load, then complete Hostinger browser sign-in. Do not put tokens/passwords in chat or Git.
2. Read the Hostinger skill. List the account websites/plans and find the exact `action-etranger.fr` entry. Inspect `prev.action-etranger.fr` if it exists; verify its document root is separate from the live WordPress document root.
3. List the full DNS zone and available DNS snapshots. Preserve apex/www, MX, SPF, DKIM, DMARC, mail hosts and verification records. Record current state securely outside this repository.
4. Create/obtain a current backup of **both all WordPress files and its database**, including upload media, themes/plugins, configuration and hidden files. Confirm completion, timestamps, file sizes and a usable restore path. Inspect archive integrity and database export where supported. Store privately; backups contain secrets and personal data. Never commit them.
5. Prepare a separate preview site using the existing hosting plan if supported. Do not buy a VPS or domain without a justified plan and approval. Existing domain ownership plus a `prev` subdomain is enough for this preview.
6. Before a deploy, inspect and preserve any existing preview content. If it contains content, show the exact target and seek any required overwrite approval. Never overwrite production.
7. Build locally with `npm run build`. Upload only `dist/` contents, with `index.html` at the root, to the separate preview target. Do not upload source `.git`, test files, secrets or backups.
8. Add/update only the specific `prev` DNS record if necessary, leaving existing email and live website records intact. Enable valid TLS for the preview without affecting production. Prefer hosting-level preview password protection.
9. Verify HTTPS and actual demo page text on `prev.action-etranger.fr`, static asset loading and booking simulation on mobile. Recheck the live website and compare email DNS records to the saved state. Report exact changes and backup location/restore procedure without exposing secrets.

## Runtime

This demo is plain HTML/CSS/JS. It needs no long-running Node server, database or Stripe account on hosting. Its build output is self-contained except for opt-in external Maps and TikTok frames. Do not connect a production database or collect genuine customer data in this prototype.
