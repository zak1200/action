# Marseille homepage detail, 17 November 2026

Added an editorial illustration of the Vieux-Port and Notre-Dame de la Garde to the homepage hero, with muted Mediterranean blue, warm stone and terracotta. The official transparent PNG remains unchanged in the header, hero caption and footer. The caption reads “À Marseille, à vos côtés. Et partout en France.” Existing contact destinations and booking behavior are preserved.

## Assets and implementation

The built-in image-generation tool created the city illustration. It is an atmospheric illustration, not a photograph or representation of the business premises. The geographical inspiration was checked against the [Marseille tourism office's Vieux-Port page](https://www.marseille-tourisme.com/decouvrez-marseille/culture-et-patrimoine/sites-et-monuments/le-vieux-port/).

Saved assets: `assets/marseille-vieux-port.webp` (960×640) and `assets/marseille-vieux-port-768.webp` (768×512). Responsive image selection keeps downloads small. The full-resolution generated PNG is retained privately in the workspace output folder. The logo was not generated or altered.

Changed `index.html` and `style.css` for the hero composition. Narrowed the existing logo-specific test selector in `tests/browser.cjs` so it only checks the logo's square proportions, rather than incorrectly applying that expectation to every image.

## Validation

51 browser checks passed at 1440, 1024, 768, 390 and 375px, including existing booking/admin flows. Three automated accessibility scans reported zero violations. Final local mobile Lighthouse: performance 98, accessibility 100, best practices 100, LCP 2.4s, CLS 0. These are lab results, not field measurements.

## Final generation prompt

Use case: stylized-concept. Asset type: small premium French website hero illustration, landscape aspect ratio 3:2, full bleed. Create a refined editorial illustration of Marseille's Vieux-Port, with the unmistakable hilltop silhouette of Notre-Dame de la Garde in the background, warm pale limestone waterfront facades, terracotta roofs and a few slender sailboat masts and boats on calm Mediterranean water in the foreground. Elegant contemporary architectural travel sketch, crisp fine navy ink outlines, flat muted watercolor-like color fields, almost no texture, sophisticated restraint and precise composition. Warm ivory sky, pale stone buildings, dusty light Mediterranean blue water, navy linework, a few muted terracotta accents. Keep the center skyline legible at 400px wide. Architecture in the middle, water in lower third, generous uncluttered sky in upper third with no giant sun. Calm, welcoming, professional, not cartoonish, not a souvenir poster, no gradients, no people, no text, no lettering, no logos, no border. This is an atmospheric city illustration, not a map or photograph of the client's premises.
