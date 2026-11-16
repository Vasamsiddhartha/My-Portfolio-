# My Portfolio · Siddhartha Vasam

A single-page portfolio built with plain HTML, CSS and JavaScript. No framework, no build step, no dependencies. Everything visual (the particle portrait, the box, the planet, the dunes, the numbers) is drawn on `<canvas>` at runtime.

## Structure

```
My Portfolio/
├── index.html            the page and all its text
├── 404.html              "page not found", in the same style
├── favicon.svg
├── robots.txt
├── css/style.css         all styles
├── js/hero.js            the hero: photo portrait → particle box → unfolded net
├── js/main.js            everything else (skills net, about, journey, projects, numbers, backdrop, contact)
└── assets/
    ├── portrait.webp              source photo for the particle portrait
    ├── Siddhartha-Vasam-CV.pdf    the CV behind every "Download CV" link
    ├── og-image.jpg               preview image for link sharing (1200 × 630)
    └── apple-touch-icon.png
```

## Run it locally

Any static file server works. From inside this folder:

```bash
python -m http.server 5173
```

Then open http://localhost:5173. Opening `index.html` straight from disk also mostly works, but the portrait needs a server because browsers block reading image pixels from `file://`.

## Deploy

It is a static site, so any static host will do:

- **Netlify:** drag this folder onto https://app.netlify.com/drop.
- **Vercel:** `vercel` in this folder, or import the repo; framework preset "Other", no build command, output directory `.`.
- **GitHub Pages:** push this folder to a repo, then Settings → Pages → deploy from the main branch, root folder.
- **Cloudflare Pages:** connect the repo, no build command, output directory `/`.

`404.html` is picked up automatically by Netlify, GitHub Pages and Cloudflare Pages.

### After you have a domain

Link previews on LinkedIn, WhatsApp and X need absolute URLs. In `index.html`, change the two `assets/og-image.jpg` references in `og:image` and `twitter:image` to the full address, for example `https://your-domain.com/assets/og-image.jpg`, and add:

```html
<link rel="canonical" href="https://your-domain.com/" />
<meta property="og:url" content="https://your-domain.com/" />
```

## Editing content

| What | Where |
| --- | --- |
| Name, hero lines, section headings, FAQ, contact prompts | `index.html` |
| Contact email (one place for the whole site) | `EMAIL` near the top of `js/main.js` |
| About tabs (the four "Who I am…" panels) | `PERSONAS` in `js/main.js` |
| Journey stops (education and work, one card each; `data-bead` is the milestone label on the orbit) | the `#jrCards` list in `index.html` |
| Projects panel (titles, numbers, before/after, tags, GitHub links) | `CASES` in `js/main.js` |
| Numbers section | the `.stat` blocks in `index.html` (the particles redraw whatever text is there) |
| Status labels around the box (DATA → CLEANED…) | `LABELS` in `js/hero.js` |
| CV | replace `assets/Siddhartha-Vasam-CV.pdf`, keeping the same file name |
| Portrait | replace `assets/portrait.webp`; a dark background with a bright subject samples best |

## Performance and accessibility

- Particle counts drop automatically on phones and on machines with 4 or fewer CPU cores (`LOW` in both scripts).
- Animations pause in hidden tabs and only draw while their section is on screen.
- `prefers-reduced-motion` skips the intro gathering and the box's inner cycling.
- Keyboard users get a "Skip to content" link and visible focus outlines. The numbers and other canvas text keep readable text in the page for screen readers.
- Without JavaScript, all text and links still show, with a short note that the animations need it.

## Fonts

Loaded from Google Fonts (Geist, Geist Mono, Doto, Instrument Serif) and Fontshare (Boska). Both are free for commercial use.
