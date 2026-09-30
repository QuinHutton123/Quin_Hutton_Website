# Quin Hutton — Portfolio Site

Static portfolio site for Quin Hutton, vehicle dynamics engineer.

## Pages

| File | Contents |
| --- | --- |
| `index.html` | Landing page — intro, experience, résumé, contact |
| `models.html` | Vehicle dynamics model gallery (picture-led centrepiece) |
| `multimatic.html` | Multimatic work — DSSV dampers, spool valve development |
| `formula-electric.html` | MAC Formula Electric — tyre modelling, braking, ride & handling |

## Structure

```
brand.css        shared styles (design tokens, components)
brand.js         shared behaviour (logo fallbacks, lightbox, PDF probe)
media/           curated, web-optimised images used by the site
brand_assets/    logos and brand sheet
data/            model metadata
resume.pdf       embedded on the landing page
```

All asset paths are relative, so the site works both at a domain root and
from a subpath such as `user.github.io/Quin_Hutton_Website/`.

## Local development

```bash
npm install          # only needed for screenshots (puppeteer)
node serve.mjs       # serves the project root at http://localhost:3000
```

Screenshots, for visual comparison during development:

```bash
node screenshot.mjs http://localhost:3000 [label]
```

Output lands in `temporary screenshots/`, which is git-ignored.

## Deployment

Served as plain static files — no build step. `.nojekyll` is present so
GitHub Pages publishes the files as-is rather than running them through Jekyll.
