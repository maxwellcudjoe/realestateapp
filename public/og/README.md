# Open Graph images

Each PNG in this folder is a 1200×630 social-card image referenced from page-level `openGraph` / `twitter` metadata.

| File | Page | Status |
|---|---|---|
| `pricing.png` | `/pricing` | Placeholder — site-default OG. Replace with branded pricing card. |
| `tour.png` | `/tour` | Placeholder — site-default OG. Replace with branded tour card. |
| `insights.png` | `/insights` (and inherited by article pages without a hero image) | Placeholder — site-default OG. Replace with branded insights card. |

## Brand spec for replacements

- 1200 × 630, PNG, ≤200 kB (optimise with `pngquant` or `oxipng`)
- Background: `#0e0e0e` (carbon) with subtle gold radial gradient
- Logotype: Rêve Bâtir wordmark top-left
- Headline (serif, ivory): page-specific
- Subhead (sans-serif, stone): one-line value prop
- Bottom strip: HMRC + ICO + Companies House compliance row in small caps

After replacing a file, bump the URL via `?v=2` query string (or rename to `pricing-v2.png` and update the metadata) so Facebook + LinkedIn invalidate their caches.

After deploy, verify cards render on:
- OpenGraph.xyz (https://www.opengraph.xyz/)
- LinkedIn Post Inspector (https://www.linkedin.com/post-inspector/)
- Slack — paste the URL into a draft and confirm preview
