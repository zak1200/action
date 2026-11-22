# Action Étranger redesign, 16 November 2026

## Discovery and preservation

Audited the public preview, all six service dialogs, booking dialog, FAQ, contact/social sections, legal demo dialog and #admin view. Captured before screenshots at 1440px and 390px. Repository main remains 653ec35 before implementation.

The site is native HTML/CSS/JavaScript, without framework dependencies. Build copies static assets. The old palette is green #213b32 / #2c5143 with ivory #f8f7f2, Georgia headings and Arial body text. Abstract Unicode service symbols, tiny mobile copy, a large generic building illustration and repeated CTA labels weaken clarity. Preserve native dialogs/details, service selections, all anchor destinations, contact/social URLs, preview SEO title/description/noindex and in-memory booking rules.

## Design direction

Reading this as a private French administrative support service: calm, credible, human and editorial. Visual overhaul with existing information architecture preserved. DESIGN_VARIANCE: 4, MOTION_INTENSITY: 2, VISUAL_DENSITY: 4. Native CSS is the appropriate foundation; no framework migration or component dependencies.

- Manrope variable 400–700 for headings, navigation and buttons; Source Sans 3 variable 400–700 for body and form text. Self-hosted WOFF2 with Latin and Latin Extended coverage, font-display swap and preloaded primary subsets.
- Navy #132d4e, brand blue #073b7a, ivory #f8f7f3, neutral #eeede8, restrained red #b73732, readable muted text #526176.
- Light editorial theme as requested, consistent 8px control/card corners, 4px spacing units, restrained borders and purposeful hover/focus feedback.
- Six Lucide service icons: id-card, file-badge, users-round, book-user, car-front and scale. Same viewBox/stroke weight; readable card labels remain the accessible names.
- Supplied 512×512 logo is RGB with an opaque black background. The user approved precise pixel-based background removal after rejecting the image tool's altered result. The final RGBA PNG retains the original geometry and colors; recompositing it over black reproduces every source pixel exactly (maximum per-channel error: 0). Header/footer use a dark circular backing so the white center remains visible on light surfaces. PNG favicon and 180/192/512px app icons use the same artwork with a permanent dark backing. The original source PNG remains in assets.

## Scope

Only the preview and GitHub demo are authorized targets. Production WordPress, DNS and email remain untouched. This redesign does not activate payments, real bookings, email, authentication or persistence. Real legal pages and payment terms remain a later client-approved production step.

## Tools

Installed Taste entry, design-taste-frontend and frontend-ui-engineering skills; native source edits; CUA browser review; Playwright with Edge; axe-core; Lighthouse. Built-in image editing was tried and rejected because it changed the logo edges. The final transparent logo uses user-approved deterministic pixel processing. No Figma, Mobbin, 21st.dev, UI/UX Pro Max or separate Chrome DevTools MCP was used.

## Verification

- 51 browser assertions passed at 1440, 1024, 768, 390 and 375px.
- No horizontal overflow, broken local assets or application JavaScript errors.
- All six services open details and preselect the right appointment type.
- 30-minute slots, weekday validation, optional description, duplicate-slot prevention, safe user-text rendering, cancellation/released slot, session-only reset and public admin route verified.
- Mobile menu open/close, Escape focus restoration, active anchor, native FAQ, legal dialog, Google Maps and both TikTok player/fallback URLs verified.
- Zero axe violations in mobile homepage, desktop homepage and appointment form scans, including WCAG 2.0/2.1 A/AA, 2.2 AA and best-practice rules. This is an automated check, not a full manual accessibility certification.
- Final local mobile Lighthouse: performance 100, accessibility 100, best practices 100; LCP 1.3s, CLS 0, total blocking time 20ms. These are lab measurements, not field Core Web Vitals. SEO is intentionally reduced by the preview's preserved noindex/robots rules.
- Typography, service icons/card alignment, tablet layout, 375/390px mobile, navigation and dialogs reviewed visually. Reduced-motion behavior verified.
- External iframe creation and fallback links work; successful third-party playback depends on provider permissions/network and is not guaranteed.

## Visual refinement — 23 November 2026

- Google review badge uses the official full-colour wordmark, hosted locally at `assets/google-wordmark.png` (544 × 184 source; rendered at 88 px wide with its original aspect ratio).
- Source: https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png . Google retains its trademark rights; used solely to identify the linked Google reviews.
- All six service-card titles use Manrope 700; body copy and contextual actions remain unchanged.
- Restrained blue/white/red header rule and small tricolour hero detail use the existing brand palette. The hero explicitly identifies Action Étranger as a private service independent of the administration.
- Browser review: 1440, 1024, 768, 390 and 375 px, no horizontal overflow or JavaScript errors; Google image loads and service dialogs still lead to the appropriate booking selection.
