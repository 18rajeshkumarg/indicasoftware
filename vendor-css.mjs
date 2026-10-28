/**
 * Vendors every remote asset the extracted pages depend on so that the site
 * renders instantly and works with no external network round-trips:
 *
 *   1. the 4 shared Gamma stylesheets            -> public/vendor/gamma/*.css
 *   2. the media files those stylesheets use     -> public/vendor/media/*
 *   3. the 3 Google Fonts stylesheets + woff2    -> public/vendor/fonts/*
 *   4. the 3 Gamma layout mask SVGs              -> public/vendor/gamma/*.svg
 *   5. the favicon/logo PNG                      -> public/*
 *
 * Run with `npm run pages:vendor`.
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, "public");
const PAGES = join(PUBLIC, "pages");
const gammaDir = join(PUBLIC, "vendor", "gamma");
const mediaDir = join(PUBLIC, "vendor", "media");
const fontDir = join(PUBLIC, "vendor", "fonts");

mkdirSync(gammaDir, { recursive: true });
mkdirSync(fontDir, { recursive: true });

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": CHROME_UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchBytes(url) {
  const res = await fetch(url, { headers: { "user-agent": CHROME_UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const ok = [];
const fail = [];
const record = (label, err) =>
  err ? fail.push(`${label}: ${err.message}`) : ok.push(label);

/* 1. Gamma stylesheets --------------------------------------------------- */
const gammaCss = [
  "https://assets.gammahosted.com/eswob8bki/_next/static/chunks/211c58yqvi_um.css",
  "https://assets.gammahosted.com/eswob8bki/_next/static/chunks/3tlokj5y1amrs.css",
  "https://assets.gammahosted.com/eswob8bki/_next/static/chunks/04xli0gimx03l.css",
  "https://assets.gammahosted.com/eswob8bki/_next/static/chunks/2aqldptq7xu5y.css",
];

for (const url of gammaCss) {
  const name = url.split("/").pop();
  try {
    writeFileSync(join(gammaDir, name), await fetchText(url));
    record(`css ${name}`);
  } catch (err) {
    record(`css ${name}`, err);
  }
}

/* 1b. Media (KaTeX fonts) referenced by the vendored Gamma stylesheets ----- */
const mediaHost =
  "https://assets.gammahosted.com/eswob8bki/_next/static/media/";
const mediaNames = new Set();
for (const name of readdirSync(gammaDir).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(join(gammaDir, name), "utf8");
  for (const m of css.matchAll(/url\(\.\.\/media\/([^)'"]+)\)/g)) {
    mediaNames.add(m[1].trim());
  }
}
if (mediaNames.size) {
  mkdirSync(mediaDir, { recursive: true });
  for (const name of mediaNames) {
    try {
      writeFileSync(join(mediaDir, name), await fetchBytes(mediaHost + name));
      record(`media ${name}`);
    } catch (err) {
      record(`media ${name}`, err);
    }
  }
}

/* 2. Google Fonts -------------------------------------------------------- */
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
  });

const fontUrls = new Set();
for (const file of walk(PAGES)) {
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(
    /https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/g,
  )) {
    fontUrls.add(m[0].replace(/&amp;/g, "&"));
  }
}

const slugFor = (url) => {
  const family = /family=([^:&]+)/.exec(url)?.[1] ?? "font";
  return family
    .replace(/%20/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
};

for (const url of fontUrls) {
  const slug = slugFor(url);
  const outName = `${slug}.css`;
  try {
    let css = await fetchText(url);
    const gstatic = [
      ...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g),
    ].map((m) => m[1]);
    const seen = new Map();
    for (const fontUrl of new Set(gstatic)) {
      const base = fontUrl.split("/").pop().split("?")[0];
      const local = seen.get(fontUrl) ?? `${slug}-${base}`;
      seen.set(fontUrl, local);
      const target = join(fontDir, local);
      try {
        writeFileSync(target, await fetchBytes(fontUrl));
      } catch (err) {
        record(`font ${local}`, err);
      }
      css = css.split(fontUrl).join(`./${local}`);
    }
    if (!/font-display\s*:\s*swap/.test(css)) {
      css = css.replace(
        /src:\s*([^;]+);/g,
        (m, src) => `src: ${src}; font-display: swap;`,
      );
    }
    writeFileSync(join(fontDir, outName), css);
    record(`fonts ${outName} (${seen.size} files)`);
  } catch (err) {
    record(`fonts ${outName}`, err);
  }
}

/* 3. Layout mask SVGs ---------------------------------------------------- */
const maskUrls = [
  "https://assets.gammahosted.com/eswob8bki/_next/static/media/circle-inverted-left.0a9msh_t7g8a1.svg",
  "https://assets.gammahosted.com/eswob8bki/_next/static/media/circle-inverted-right.0pjxkd-nnqq-8.svg",
  "https://assets.gammahosted.com/eswob8bki/_next/static/media/circle-inverted-top.3brpcytfepi68.svg",
];

for (const url of maskUrls) {
  const name = url.split("/").pop();
  try {
    writeFileSync(join(gammaDir, name), await fetchBytes(url));
    record(`mask ${name}`);
  } catch (err) {
    record(`mask ${name}`, err);
  }
}

/* 4. Favicon / logo ------------------------------------------------------ */
const logoName =
  "Indica-Software-Application-logo-1e575bad6b234d3894ea6dc689004e42.png";
try {
  writeFileSync(
    join(PUBLIC, logoName),
    await fetchBytes(`https://indicasoftware-3ed80v2.gamma.site/${logoName}`),
  );
  record(`favicon ${logoName}`);
} catch (err) {
  record(`favicon ${logoName}`, err);
}

console.log(`vendored ${ok.length} assets`);
for (const line of ok) console.log(`  OK   ${line}`);
for (const line of fail) console.log(`  FAIL ${line}`);
if (fail.length) process.exitCode = 1;
