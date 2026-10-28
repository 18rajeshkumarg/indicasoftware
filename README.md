# Indica Software — website

React + Vite project for the Indica Software marketing site. The 14 extracted
pages are served as static documents inside a React hash router, with no
loading screen: pages are preloaded in the background, so navigation is an
instant swap.

## Requirements

- Node.js 18 or newer
- npm 9 or newer

## Run locally

```powershell
cd "C:\Users\asha g\Documents\Indica Software"
npm install
npm run dev
```

Open the address printed in the terminal, usually
<http://localhost:5173/indicasoftware/>. Press `Ctrl+C` to stop the server.

Vite starts in well under a second and serves the shell immediately; the home
page appears as soon as its document is parsed (typically 300–600 ms on a cold
start, and instant on every later navigation).

## Build and deploy

```bash
npm run build      # writes the production site to dist/
npm run preview    # serves dist/ locally to check it
```

Deploy the `dist` folder to any static host (GitHub Pages, Netlify, Vercel,
an S3 bucket, …). The build uses the GitHub Pages base path
`/indicasoftware/`, so the generated HTML loads its hashed assets from
<https://18rajeshkumarg.github.io/indicasoftware/>. Deep links such as
`/services` are resolved on load when the host falls back to `index.html`.

## PHP content admin and contact inquiries

Client case studies, client reviews, and contact inquiries use the PHP backend
in `backend/`. PHP 8.1+ is required. Case studies
and reviews are saved in private JSON storage; uploaded images and inquiry
records are kept outside the public document root. The public Case Studies
page fetches published entries when opened. The Contact Us form posts to the
PHP inquiry endpoint, and submissions are visible only in the admin.

For local development, open two terminals. In the first, configure the PHP
server and start it from the project root:

```powershell
$env:INDICA_ADMIN_USERNAME = "siteadmin"
$env:INDICA_ADMIN_PASSWORD_HASH = php -r "echo password_hash('replace-with-a-long-password', PASSWORD_DEFAULT);"
$env:INDICA_STORAGE_DIR = Join-Path (Split-Path (Get-Location) -Parent) "indica-private-storage"
npm run backend:dev
```

In the second terminal, run Vite as usual with `npm run dev`. Vite proxies
`/api/` and `/admin/` to PHP. Open <http://localhost:5173/admin/> to sign in
and manage case studies, reviews, and inquiries. Do not commit the password
hash or the storage directory.

`npm run build` copies the PHP endpoints into `dist/`. Deploy `dist/` to a
PHP-enabled web server, configure it to execute `.php` files, and set
`INDICA_ADMIN_USERNAME`, `INDICA_ADMIN_PASSWORD_HASH`, and
`INDICA_STORAGE_DIR` in the server environment. Point `INDICA_STORAGE_DIR` to a
private writable directory outside the document root. A static-only host can
serve the frontend but cannot run the admin or accept inquiry submissions.

## Project structure

```
index.html                Vite entry document
vite.config.js            React plugin + GitHub Pages base path
src/
  main.jsx                React bootstrap, imports app.css
  App.jsx                 hash router, page frames, link interception, preloader
  app.css                 application shell, page stack, not-found panel
backend/
  admin/                  password-protected content manager
  api/                    client content, image, and inquiry endpoints
  bootstrap.php           sessions and private persistent storage
public/
  pages/home/             index, services, technologies, casestudies, aboutus,
                          contactus, getstarted, hiring, privacypolicy
  pages/learn-more/       itconsulting, logodesign, technicalsupport,
                          videoediting, webdesign
  vendor/gamma/           the 4 shared Gamma stylesheets + 3 layout mask SVGs
  vendor/fonts/           Inter, Prompt and IBM Plex Sans (CSS + woff2)
  *.png                   site favicon/logo
fix-pages.mjs             re-applies the page cleanup (npm run pages:fix)
static-fix.css            the override stylesheet injected into every page
vendor-css.mjs            re-downloads every vendored asset (npm run pages:vendor)
```

## How navigation works

`src/App.jsx` keeps the current route in the URL hash and renders one
same-origin `<iframe>` per page under `public/pages/`. There is **no loading
screen**:

- The page being asked for is swapped in only once its document is parsed, so
  the previous page stays on screen until the new one is ready — the screen is
  never blank and never shows a spinner.
- Frames that have loaded stay mounted (hidden), so returning to a visited page
  is instant and keeps its scroll position.
- Right after the first paint the router quietly loads the remaining pages in
  the background; a click that follows finds its target already loaded.
- Hovering an internal link mounts that page immediately, so even the first
  click is fast.

Once a frame is live, React copies the page title onto the browser tab, starts
fresh navigations at the top of the page (history visits keep their scroll
position) and intercepts link clicks: internal links change the hash and
navigate in place — including links that ask for `target="_blank"`. External
links (payment, hiring) move the current tab to that address, so the whole
site runs in one tab with no popup. Back and Forward work because the route
lives in the hash.

Links to pages that were never published are redirected to the closest page
with real content (see [Known issue](#known-issue-blank-pages-and-redirects)).

## Why the pages carry no scripts

The extracted pages are server-rendered documents. Their original scripts
re-fetched the page and replaced that content with an empty loading state, so
every `<script>` was removed from the saved files. Two consequences are handled
in `static-fix.css`, which is injected into each page:

1. Gamma used to reveal blocks with a runtime-driven animation. The stylesheet
   forces those blocks to be visible instead.
2. The saved HTML is pretty-printed, but Gamma marks its text containers as
   `white-space: pre-wrap`, which would render the indentation as gaps. The
   stylesheet lets that text wrap normally.

`npm run pages:fix` re-applies all page fixes; it is idempotent, so running it
on an already-processed file changes nothing. It also:

- strips the "Made with Gamma" badge, the "Report this page" control and the
  flag badge;
- rewrites the four shared stylesheets to the local copies in
  `public/vendor/gamma/`;
- rewrites the Google Fonts stylesheets to `public/vendor/fonts/`, so first
  paint never waits on an external request (fonts are served locally with
  `font-display: swap`);
- rewrites the three layout mask SVGs to local copies;
- points the favicon at the local logo file;
- replaces the Loom player proxy (`if-cdn.com`, which answers 403 to any host
  other than Gamma) with Loom's own frameable embed URL;
- drops the leftover `noindex` tag from the staging site;
- unwraps the `gamma.app/external-link?url=[mailto:…]` redirectors into plain
  `mailto:` links and restores the Cloudflare-masked address text, so the
  e-mail addresses are visible and clickable again;
- removes the `canonical` / `og:url` tags and `data-export-*` attributes that
  still pointed at the old `gamma.site` publication.

`npm run pages:vendor` re-downloads all vendored assets (stylesheets, fonts,
masks, favicon) if you want a fresh copy.

## Services catalogue and buttons

The five services shown on the home page, services page and every learn-more
page are:

1. Custom Full-Stack Web & AI Development
2. Custom Android/IOS Development
3. AI Automations / Custom Integrations
4. Custom Frameworks Development
5. Helping Side Hustle/Freelancing Income Daily Basis

Every card offers a **Learn More** button that opens that service's own page
(built from the home layout, so it looks and behaves exactly like `#/`).

**Continue to proceed** buttons go to the payment page
<https://payment-process-method.onrender.com/face.php>. They appear on:

- each learn-more page (one button under the hero), and
- the Get Started page (`#/getstarted`), where every service has its own
  Continue to Proceed button.

The services page deliberately has no Continue button — only Learn More.

### Editing the pages

`npm run pages:build` regenerates the service grid, the learn-more pages, the
Get Started page and every Contact/Hiring link from the catalogue in
`build-pages.mjs`, then formats and re-checks the pages. It is idempotent, so
running it again changes nothing. To change a service, edit its entry in the
`SERVICES` array at the top of `build-pages.mjs` and run the command again.

`npm run pages:fix` re-applies the underlying page cleanup (remote CSS, fonts,
masks, favicon, branding). `npm run pages:vendor` re-downloads the vendored
assets.

## Contact and Hiring links

- Every **Contact Us** link — the navigation-bar button and the in-page text
  links alike — opens the home page (`#/`), never an external contact form
  and never any other page.
- The **We are Hiring** button (and the `#/hiring` address) always opens the
  ZARA AI interviewer at
  <https://18rajeshkumarg.github.io/ZARA-AI-INTERVIEWER/#roles>, in the same
  tab and immediately.
- The site runs in a single tab. No link opens a new tab: internal links
  navigate in place, and external links (payment, hiring) move the current tab
  instead of spawning one. `target="_blank"` has been removed from every page.

## Component alignment

- Every hero lines its buttons up on **one row** with equal heights and
  consistent spacing: `Get Started Today`, `Continue to proceed` and
  `Explore Services` (the webdesign hero pairs `Get Started Today` with
  `Continue to proceed` the same way).
- `fix-pages.mjs` restores emotion `<style>` rules whose class is still used
  in the markup but whose block was lost during extraction. Those rules carry
  the `grid-column: span` values of the smart-layout cards — without them the
  "Strategic Services" cards collapsed into hairline columns that wrapped one
  character per line; restored, the section renders as a clean 2×2 grid of
  equal cards.
- A DOM audit across all 19 pages reports zero overlapping controls, zero
  clipped text and zero horizontal overflow, on top of the build's link and
  content verification.

## Routes

| Route                           | Page                                   |
| ------------------------------- | -------------------------------------- |
| `#/`                            | Home                                   |
| `#/services`                    | Services                               |
| `#/technologies`                | Technologies                           |
| `#/casestudies`                 | Case Studies                           |
| `#/aboutus`                     | About Us                               |
| `#/contactus`                   | Contact Us                             |
| `#/getstarted`                  | Get Started                            |
| `#/hiring`                      | ZARA interviewer (external)            |
| `#/privacypolicy`               | Privacy Policy                         |
| `#/fullstack-web-ai-learnmore`  | Custom Full-Stack Web & AI Development |
| `#/mobile-app-learnmore`        | Custom Android/IOS Development         |
| `#/ai-automations-learnmore`    | AI Automations / Custom Integrations   |
| `#/custom-frameworks-learnmore` | Custom Frameworks Development          |
| `#/side-hustle-learnmore`       | Side Hustle / Freelancing Income       |
| `#/itconsulting-learnmore`      | IT Consulting                          |
| `#/logodesign-learnmore`        | Logo Design                            |
| `#/technicalsupport-learnmore`  | Technical Support                      |
| `#/videoediting-learnmore`      | Video Editing                          |
| `#/webdesign-learnmore`         | Web Design                             |

The first five learn-more pages carry real service copy. The older
`itconsulting`, `logodesign`, `technicalsupport` and `videoediting` pages were
blank on the original site and now carry matching copy so every Learn More
button lands on a real page.

Redirects (the target pages exist on the live site but are empty):

| Link                        | Opens       |
| --------------------------- | ----------- |
| `/interiordesign-learnmore` | Services    |
| `/projects`                 | Get Started |
| `/contact-support`          | Contact Us  |

## Testing

The site has been exercised end to end in headless Chrome (CDP), checking for
each of the 14 routes: content visible, exactly one visible frame, no loading
screen, no Gamma branding, no hidden text blocks, no console errors, no broken
or remote blocking requests — plus link clicks, alias redirects, back/forward,
scroll restoration, the not-found panel and cold-start timing.

## GitHub Pages deployment

The GitHub Actions workflow in `.github/workflows/pages.yml` builds and deploys the static website whenever `main` is updated. GitHub Pages cannot execute PHP, so that deployment omits the PHP endpoints. The admin panel, live content updates, and inquiry submissions need a separate PHP-capable host, configured as described above.

In the repository, **Settings → Pages → Build and deployment → Source** must
be **GitHub Actions**. If it is set to **Deploy from a branch** (`main` / root),
GitHub publishes the raw repository instead of `dist/`: the live page then
contains `<script type="module" src="/src/main.jsx">` and the browser cannot
execute the JSX source. The workflow's verification step rejects a build that
still references `/src/main.jsx`, so an unbuilt source tree cannot be deployed.

## Deploying the PHP admin and inquiry API on Render

`render.yaml` and `Dockerfile` define the PHP API as a Render web service with a persistent disk for case studies, review data, inquiry records, and uploaded images. Create it from the Render dashboard with **New > Blueprint** and select this public repository. Render will prompt you for `INDICA_ADMIN_USERNAME` and `INDICA_ADMIN_PASSWORD_HASH`; generate the password hash locally with `php -r "echo password_hash('your-long-password', PASSWORD_DEFAULT);"` and enter it only in Render's secret prompt. Do not commit the hash or storage data.

The service uses a paid compute plan and a persistent disk because free Render web services do not retain local files. Render lists persistent disks at $0.25 per GB per month, in addition to compute charges. Once the service is deployed, set the GitHub repository Actions variable `VITE_API_BASE_URL` to its HTTPS URL, then run the `Deploy website to GitHub Pages` workflow again. The admin will be available at `<service-url>/admin/`.
