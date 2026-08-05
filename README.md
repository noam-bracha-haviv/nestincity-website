# Nest in City — website

Multi-page website built from the Figma file **bee**
(`https://www.figma.com/design/affqk34oV3uE8a9dvIBJyZ/bee`). The Figma file is the
specification; every value in `src/styles/` is read out of it, not designed here.

## Run

```bash
node build.js          # build once  -> dist/
node build.js --watch  # rebuild on change
npm run serve          # build + serve dist/ on http://localhost:5178
```

`dist/` contains four real HTML pages. Navigation is plain links, the logo returns
to `index.html`.

## Structure

```
build.js                zero-dependency assembler (partials + {{vars}} -> dist/)
src/pages/              one file per page: index, workshop, shop, contact
src/partials/           shared components: head, header, footer
src/styles/tokens.css   colours, type, radii, shadows — all from Figma
src/styles/base.css     reset + the 1440px design canvas
src/styles/components/  header, footer, button
src/styles/pages/       one stylesheet per page
src/js/                 minimal behaviour
public/assets/          images, video, gradients, icons (copied + optimised)
```

## Figma source map

| Page | Figma frame | Node | Size |
|---|---|---|---|
| Home | `Homa page` | `4011:272` | 1440 × 7549 |
| Workshop | `Workshop page` | `4218:1208` | 1440 × 4711 |
| Shop | `shop page` | `4443:636` | 1440 × 3098 |
| Contact | `Contact Page` | `4445:980` | 1440 × 2669 |

Home bands (y in frame): hero 0/874 · story 998/611 · crisis 1758/889 ·
compare 2689/906 · statement 3533/819 · my-workshop 4435/550 · press 5006/907 ·
groups 5934/870 · footer 6857/692.

Shared footer band is 1440 × 692 on every page; the second column heading is
`NEST IN CITY` on Home and `COMPANY` on the inner pages.

## Assets

Photography and video come from `~/Desktop/Websaite nest in city` (read-only —
originals are never modified). They are copied into `public/assets/` and
optimised for the web:

- `img/press/` — the eight press logos of the Home carousel
- `img/garden/` — the four brick photos of the Home photo strip
- `img/workshop/`, `img/stages/` — Workshop photo and the six process sketches
- `img/shop/` — the six product photos
- `img/contact/` — the Contact photo
- `video/story.mp4` — `Nestincity-Noamhaviv.mp4` re-encoded to 1280×894 H.264
  (168 s, 17.8 MB) + `story-poster.jpg`

Backgrounds that are drawn in Figma rather than supplied as files are exported
from Figma and stored in `public/assets/gradients/`. The hero gradient is 20
rotated blurred vector blobs in two stacked mask groups (one greyscale, one
`LIGHTEN`, layer blur 94 + 150) — not reproducible in CSS, so it ships as an
image that is pixel-identical to the design.

- `hero-home.jpg` 1440×874 — Home hero
- `hero-inner.jpg` 1440×1024 — Workshop / Shop / Contact hero (cropped per page)
- `footer.jpg` 1440×572 — footer bleed, starts 120px into the footer band

## Type

Only two families are used: **Source Serif Pro** (headlines, figures, wordmark)
and **Poppins** (everything else). Figma sets two small footer strings in Host
Grotesk and the header language pill in Tobias; both are rendered in the two
approved families instead, which makes those strings a few pixels wider than the
design.

Figma's `AUTO` line-height resolves to the font default: 1.5 for Poppins, 1.25
for Source Serif Pro. Explicit `132%` is used throughout the footer.

## Verification

The build is diffed against 1440px renders of the Figma frames. Every measured
element in the header, footer, Home hero and Home story section lands within
0–1px of the design; residual pixel difference is glyph antialiasing and JPEG
noise in the gradients (0.7–0.8% of pixels at a threshold of 12/255).

## Still to build

The remaining sections need values read from Figma and four Figma-native assets
exported (see the notes in `src/pages/`):

- Home: crisis, compare, statement, my-workshop, press carousel, groups
- Workshop, Shop and Contact page bodies
- assets: the beaded bee line-art (Home, used twice), the yellow modular-habitat
  illustration (Home my-workshop card), the arrow glyphs (↘ ← →), the bee bullet
  marks, and the mail / location / phone chip icons
