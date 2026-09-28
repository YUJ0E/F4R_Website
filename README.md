# F4R — Failure for Rising

Project page for **F4R: Failure-Driven Recognition, Reconstruction, Refinement, and Redeployment for Continual Robot Self-Improvement**.

Live site: <https://yuj0e.github.io/F4R_Website/>

## Structure

```
docs/                 # the static site (served by GitHub Pages from /docs)
├── index.html        # single page: all content + inline SVG charts
├── paper.css         # main styles (later "Round N" blocks override earlier ones)
├── styles.css        # base styles
├── app.js            # lightbox, chart tooltips, task viewer, rollout videos
├── config.js         # site config
├── hero-flow.js      # hero particle animation
└── assets/           # images, fonts, videos/ (rollout clips + posters)
```

## Local preview

```bash
cd docs
python3 -m http.server 4174
# open http://127.0.0.1:4174/
```

No build step. After editing CSS or JS, bump the version query in `index.html`
(e.g. `paper.css?v=YYYYMMDDx`) so browsers pick up the change.
