/**
 * Permanently cleans the extracted Gamma pages so they render as plain,
 * self-contained static HTML:
 *
 *   1. removes every <script> — the Gamma/Next runtime re-fetches the page and
 *      replaces the server-rendered content with an empty loading state.
 *   2. points the 4 shared Gamma stylesheets at the local vendor copy.
 *   3. points the Google Fonts stylesheets at the local vendor copy so first
 *      paint never waits on an external request (falls back to adding
 *      display=swap when the local copy is missing).
 *   4. points the layout mask SVGs and the favicon at local copies.
 *   5. injects the override stylesheet that reveals the blocks whose reveal
 *      animation used to be driven by the removed runtime, and lets the
 *      pretty-printed markup wrap naturally.
 *   6. strips Gamma attribution, the "Report this page" control and any flag
 *      badge if they are present.
 *   7. drops the noindex tag left over from the staging site.
 *   8. unwraps the gamma.app e-mail redirectors into plain mailto: links and
 *      restores the Cloudflare-masked address text.
 *   9. removes canonical / og:url tags and data-export-* attributes that
 *      still point at the old gamma.site publication.
 *  10. restores emotion <style> rules that the markup still references but
 *      whose block was lost in extraction — without them the smart-layout
 *      cards collapse into hairline columns (grid-column: span comes from
 *      these rules).
 *  11. injects the small FAQ accordion script (marked `data-static-fix`, so
 *      step 1 keeps it) that opens/collapses the services page questions.
 *  12. removes the stale placeholder media (`api/media.php?…`) that a static
 *      host without the PHP endpoint would answer with a 404 on every load.
 *  13. demotes the extra <h1> section headings to <h2> (pinning their size via
 *      `indica-h1-size`) so every page has a single level-1 heading.
 *  14. marks the exported navbar <div> as a navigation landmark.
 *
 * The script is idempotent: running it twice produces the same result.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const ROOT = join(PROJECT_ROOT, "public");

const OVERRIDE_CSS = readFileSync(
  join(PROJECT_ROOT, "static-fix.css"),
  "utf8",
).trim();
const INDENTED_OVERRIDE_CSS = OVERRIDE_CSS.split(/\r?\n/)
  .map((line) => (line ? `      ${line}` : ""))
  .join("\n");

const GAMMA_CSS_HOST =
  "https://assets.gammahosted.com/eswob8bki/_next/static/chunks/";
const GAMMA_ASSET_HOST =
  "https://assets.gammahosted.com/eswob8bki/_next/static/media/";
const VENDOR_DIR = join(ROOT, "vendor", "gamma");
const FONT_DIR = join(ROOT, "vendor", "fonts");
const PAGE_DEPTH = "../../"; // pages live two levels below public/

const vendored = new Set(
  readdirSync(VENDOR_DIR).filter((f) => f.endsWith(".css")),
);
const masks = new Set(
  readdirSync(VENDOR_DIR).filter((f) => f.endsWith(".svg")),
);
const fontFiles = new Set(
  readdirSync(FONT_DIR).filter((f) => f.endsWith(".css")),
);

/** Local path for a Google Fonts stylesheet, keyed on the family name. */
function fontTarget(url) {
  const family = /family=([^:&]+)/.exec(url)?.[1];
  if (!family) return null;
  const slug = family
    .replace(/%20/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return fontFiles.has(`${slug}.css`)
    ? `${PAGE_DEPTH}vendor/fonts/${slug}.css`
    : null;
}

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
  });

/**
 * Every emotion layout rule available, keyed by class. Sources: the current
 * pages first (same vintage), then the pristine backup export as fallback.
 * Small tags only — the multi-kilobyte shared blocks are present everywhere.
 */
const emotionDonors = new Map();
{
  const sources = [...walk(join(ROOT, "pages"))];
  const BACKUP = "C:/Users/asha g/AppData/Local/Temp/indica-pages-backup/pages";
  try {
    if (statSync(BACKUP).isDirectory()) sources.push(...walk(BACKUP));
  } catch {
    /* backup optional */
  }
  for (const f of sources) {
    const html = readFileSync(f, "utf8");
    for (const m of html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)) {
      if (m[0].length > 6000) continue;
      for (const cm of m[0].matchAll(/\.((?:css-)[a-z0-9]+)\s*[,{]/g))
        if (!emotionDonors.has(cm[1])) emotionDonors.set(cm[1], m[0]);
    }
  }
}

/** Combined vendor stylesheets — classes defined there need no restoration. */
const vendorBlob = readdirSync(VENDOR_DIR)
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(join(VENDOR_DIR, f), "utf8"))
  .join("\n");

/** Decode a Cloudflare `data-cfemail` value (first byte is the XOR key). */
function cfDecode(hex) {
  const bytes = [];
  for (let i = 0; i + 1 < hex.length; i += 2)
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  const key = bytes[0] || 0;
  return bytes
    .slice(1)
    .map((b) => String.fromCharCode(b ^ key))
    .join("");
}

/** Remove every script element, including inline JSON payloads.
 *  The one exception is our own `data-static-fix` script (the FAQ
 *  accordion behaviour), which is injected below and must survive. */
function stripScripts(html) {
  const out = [];
  let cursor = 0;
  const lower = html.toLowerCase();
  for (;;) {
    const start = lower.indexOf("<script", cursor);
    if (start === -1) {
      out.push(html.slice(cursor));
      break;
    }
    const openEnd = lower.indexOf(">", start);
    const end = lower.indexOf("</script>", start);
    if (
      openEnd !== -1 &&
      html.slice(start, openEnd + 1).includes("data-static-fix")
    ) {
      // Our own script: keep it whole.
      if (end === -1) {
        out.push(html.slice(cursor));
        break;
      }
      const keepTo = end + "</script>".length;
      out.push(html.slice(cursor, keepTo));
      cursor = keepTo;
      continue;
    }
    if (end === -1) {
      // No closing tag: drop through the opening tag only.
      out.push(html.slice(cursor, selfCloseOf(lower, start, openEnd)));
      cursor = selfCloseOf(lower, start, openEnd);
      continue;
    }
    out.push(html.slice(cursor, start));
    cursor = end + "</script>".length;
  }
  return out.join("");
}

function selfCloseOf(lower, start, openEnd) {
  return openEnd === -1 ? start + 8 : openEnd + 1;
}

/** Remove card wrappers that contain no visible text or media at all. */
function removeEmptyCards(html) {
  const cards = [
    ...html.matchAll(
      /<div\b(?=[^>]*\bclass="[^"]*\bnode-card\b[^"]*\bblock-card\b)[^>]*>/gi,
    ),
  ];
  const removals = [];
  for (const card of cards) {
    const start = card.index;
    const divTags = /<\/?div\b[^>]*>/gi;
    divTags.lastIndex = start;
    let depth = 0;
    let end = -1;
    for (let token; (token = divTags.exec(html));) {
      if (token[0].startsWith("</")) depth--;
      else if (!token[0].endsWith("/>")) depth++;
      if (depth === 0) {
        end = divTags.lastIndex;
        break;
      }
    }
    if (end < 0) continue;

    const body = html.slice(start + card[0].length, end - "</div>".length);
    const visibleText = body
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&(?:nbsp|#0*160|#x0*a0);/gi, " ")
      .replace(/[\s\u200b\ufeff]/g, "");
    const containsVisual =
      /<(?:img|svg|video|canvas|iframe|object|embed|audio|input|button|table|hr|progress|meter)\b/i.test(
        body,
      ) ||
      /<a\b[^>]*\bhref\s*=/i.test(body) ||
      /\baria-label\s*=/.test(card[0]);
    if (!visibleText && !containsVisual) removals.push({ start, end });
  }
  for (const item of removals.reverse()) {
    html = html.slice(0, item.start) + html.slice(item.end);
  }
  return { html, removed: removals.length };
}

/** Remove the extracted Case Studies media grid when it contains only empty image placeholders. */
function removeEmptyCaseStudyImageCards(html) {
  const heading = html.indexOf("CASE STUDIES");
  if (heading < 0) return { html, removed: 0 };
  const cardMatches = [
    ...html
      .slice(0, heading)
      .matchAll(
        /<div\b(?=[^>]*\bclass="[^"]*\bnode-card\b[^"]*\bblock-card\b)[^>]*>/gi,
      ),
  ];
  const caseCard = cardMatches.at(-1);
  if (!caseCard) return { html, removed: 0 };

  const matchingDivEnd = (source, start) => {
    const tags = /<\/?div\b[^>]*>/gi;
    tags.lastIndex = start;
    let depth = 0;
    for (let token; (token = tags.exec(source));) {
      if (token[0].startsWith("</")) depth--;
      else if (!token[0].endsWith("/>")) depth++;
      if (depth === 0) return tags.lastIndex;
    }
    return -1;
  };

  const cardEnd = matchingDivEnd(html, caseCard.index);
  if (cardEnd < 0) return { html, removed: 0 };
  const cardBody = html.slice(caseCard.index, cardEnd);
  const grids = [
    ...cardBody.matchAll(
      /<div\b(?=[^>]*\bclass="[^"]*\bnode-gridLayout\b[^"]*\bblock-gridLayout\b)[^>]*>/gi,
    ),
  ];
  const removals = [];
  for (const grid of grids) {
    const start = caseCard.index + grid.index;
    const end = matchingDivEnd(html, start);
    if (end < 0) continue;
    const body = html.slice(start + grid[0].length, end - "</div>".length);
    const visibleText = body
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&(?:nbsp|#0*160|#x0*a0);/gi, " ")
      .replace(/[\s\u200b\ufeff]/g, "");
    const hasEmptyPlaceholders =
      /node-mediaPlaceholder/.test(body) &&
      /data-testid="media-placeholder"/.test(body) &&
      !/<img\b[^>]*\bsrc\s*=\s*['"][^'"]+['"]/i.test(body);
    if (hasEmptyPlaceholders && !visibleText) removals.push({ start, end });
  }
  for (const item of removals.reverse()) {
    html = html.slice(0, item.start) + html.slice(item.end);
  }
  return { html, removed: removals.length };
}

/** Remove Gamma attribution / report control / flag badge wherever they live. */
function stripGammaUi(html) {
  return (
    html
      // "Made with Gamma" / "Report this page" wrapper anchors.
      .replace(
        /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?(?:Made with\s*Gamma|Report this page)(?:(?!<\/a>)[\s\S])*?<\/a>/gi,
        "",
      )
      // Sibling span/div wrappers around the same controls.
      .replace(
        /<(?:span|div|button)\b[^>]*>(?:(?!<\/(?:span|div|button)>)[\s\S]){0,400}?(?:Made with\s*Gamma|Report this page)(?:(?!<\/(?:span|div|button)>)[\s\S]){0,400}?<\/(?:span|div|button)>/gi,
        "",
      )
      // Flag badge markers.
      .replace(
        /<[a-z][^>]*\b(?:data-gamma-flag|gamma-flag|report-widget|gamma-badge)\b[^>]*>[\s\S]{0,600}?<\/[a-z]+>/gi,
        "",
      )
  );
}

/** Remove the export's stale placeholder media (e.g. `api/media.php?…`). A
 *  static host has no PHP endpoint, so the request would 404 on every load.
 *  The live content is fetched from the API at runtime and the whole list is
 *  replaced, so the sample image is dead weight regardless. */
function stripStaticMediaImages(html) {
  return html.replace(/<img\b[^>]*\bapi\/media\.php[^>]*>\s*/gi, "");
}

/** Mark a Gamma heading so static-fix.css can pin its original size. */
function demoteHeadingTag(tag) {
  let out = tag.replace(/^<h1\b/i, "<h2");
  if (/\bclass="/i.test(out)) {
    out = out.replace(/\sclass="([^"]*)"/i, (m, cls) =>
      /\bindica-h1-size\b/.test(cls) ? m : ` class="${cls} indica-h1-size"`,
    );
  } else {
    out = out.replace(/^<h2\b/i, '<h2 class="indica-h1-size"');
  }
  return out;
}

/** Keep the first <h1> as the page title and demote any further <h1> blocks to
 *  <h2>. The export reused <h1> for section headings (e.g. "What Clients
 *  Say?"), which produced several level-1 headings per page. The demoted
 *  headings keep the `indica-h1-size` class so their rendered size does not
 *  change (static-fix.css restores the `--heading-font-size` value). */
function demoteExtraHeadings(html) {
  const openRe = /<h1\b[^>]*>/gi;
  let seenFirst = false;
  let out = "";
  let cursor = 0;
  let match;
  while ((match = openRe.exec(html))) {
    if (!seenFirst) {
      seenFirst = true;
      continue;
    }
    const openStart = match.index;
    const openEnd = openRe.lastIndex;
    const closeStart = html.toLowerCase().indexOf("</h1>", openEnd);
    if (closeStart < 0) continue;
    out +=
      html.slice(cursor, openStart) +
      demoteHeadingTag(match[0]) +
      html.slice(openEnd, closeStart) +
      "</h2>";
    cursor = closeStart + "</h1>".length;
    openRe.lastIndex = cursor;
  }
  out += html.slice(cursor);
  return out;
}

/** Give the exported navigation bar a real navigation landmark. The export
 *  uses a plain <div>, so assistive tech sees no landmark at all. */
function addNavLandmark(html) {
  return html.replace(/<div\b[^>]*\bdata-navbar-editor="true"[^>]*>/i, (tag) =>
    /\brole=/.test(tag)
      ? tag
      : tag.replace(/^<div\b/i, '<div role="navigation" aria-label="Main"'),
  );
}

function fix(html, file) {
  const lineEnding = html.includes("\r\n") ? "\r\n" : "\n";
  const before = html.length;

  // 1. Scripts (Gamma runtime, analytics beacon, …).
  html = stripScripts(html);
  const emptyCards = removeEmptyCards(html);
  html = emptyCards.html;
  const emptyCaseStudyImages = removeEmptyCaseStudyImageCards(html);
  html = emptyCaseStudyImages.html;

  // 1b. Stale placeholder media (no PHP endpoint on a static host → 404).
  const staleMediaRemoved = (html.match(/<img\b[^>]*\bapi\/media\.php/gi) ?? [])
    .length;
  html = stripStaticMediaImages(html);

  // 1c. Correct the document outline: exactly one <h1> per page.
  const demotedH1 = Math.max(0, (html.match(/<h1\b/gi) ?? []).length - 1);
  html = demoteExtraHeadings(html);

  // 1d. A real navigation landmark for assistive tech.
  html = addNavLandmark(html);

  // 2. Shared Gamma stylesheets -> local vendor copy.
  html = html.replace(
    new RegExp(
      GAMMA_CSS_HOST.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "([A-Za-z0-9_-]+\\.css)",
      "g",
    ),
    (m, name) => (vendored.has(name) ? `${PAGE_DEPTH}vendor/gamma/${name}` : m),
  );

  // 3. Google Fonts -> local vendor copy (no render-blocking network request).
  html = html.replace(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/g, (m) => {
    const unescaped = m.replace(/&amp;/g, "&");
    const target = fontTarget(unescaped);
    if (target) return target;
    // Local copy missing: at least make sure the text swaps in immediately.
    return unescaped.includes("display=") ? m : `${m}&display=swap`;
  });

  // 4a. Layout mask SVGs -> local vendor copy.
  html = html.replace(
    new RegExp(
      GAMMA_ASSET_HOST.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "([A-Za-z0-9_.-]+\\.svg)",
      "g",
    ),
    (m, name) => (masks.has(name) ? `${PAGE_DEPTH}vendor/gamma/${name}` : m),
  );

  // 4b. Favicon -> local copy that works from the page's own folder.
  html = html.replace(
    /(<link\b[^>]*rel="icon"[^>]*href=")\/([^"]*")/gi,
    (m, head, tail) => `${head}${PAGE_DEPTH}${tail}`,
  );

  // 4c. The Loom player is proxied through if-cdn.com, which answers 403 to
  //     any host other than Gamma. Point the embed at Loom's own player URL,
  //     which is built for being framed.
  html = html.replace(
    /src="(?:https?:)?\/\/if-cdn\.com\/api\/iframe\?url=https%3A%2F%2Fwww\.loom\.com%2Fshare%2F([A-Za-z0-9]+)[^"]*"/g,
    (m, id) => `src="https://www.loom.com/embed/${id}"`,
  );

  // 5. Gamma branding, report control, flag badge.
  html = stripGammaUi(html);
  html = html
    .replace(/<meta\b[^>]*name="robots"[^>]*content="noindex[^"]*"[^>]*>/gi, "")
    .replace(
      /<meta\b[^>]*content="noindex[^"]*"[^>]*name="robots"[^>]*>/gi,
      "",
    );

  // 5b. E-mail links: unwrap the gamma.app redirector into a plain mailto: …
  html = html.replace(
    /href="https:\/\/gamma\.app\/external-link\?url=([^"]*)"/g,
    (m, enc) => {
      try {
        const target = decodeURIComponent(enc).replace(/^\[|\]$/g, "");
        return /^(https?:\/\/|mailto:|tel:)/i.test(target)
          ? `href="${target}"`
          : m;
      } catch {
        return m;
      }
    },
  );

  // 5c. … and restore the masked address text — the Cloudflare obfuscation
  //     only un-masks while its script runs, which these pages never load.
  //     The span itself is kept; only its inner text is replaced.
  html = html.replace(
    /(<span\b[^>]*data-cfemail=")([0-9a-fA-F]+)("[^>]*>)(\s*)\[email[^\]]*\](\s*)(<\/span\s*>)/g,
    (m, pre, hex, mid, ws1, ws2, post) => {
      const addr = cfDecode(hex);
      return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(addr)
        ? `${pre}${hex}${mid}${ws1}${addr}${ws2}${post}`
        : m;
    },
  );
  // The obfuscation attributes are dead weight once the text is visible.
  html = html.replace(
    /\s*class="__cf_email__"\s+data-cfemail="[0-9a-fA-F]+"/g,
    "",
  );

  // 5d. Head tags still pointing at the old gamma.site publication.
  html = html
    .replace(
      /^[ \t]*<link\b[^>]*href="[^"]*gamma\.site[^"]*"[^>]*>[ \t]*\r?\n?/gim,
      "",
    )
    .replace(
      /^[ \t]*<meta\b[^>]*content="[^"]*gamma\.site[^"]*"[^>]*>[ \t]*\r?\n?/gim,
      "",
    );

  // 5e. Inert Gamma export helpers (no CSS or JS reads them).
  html = html.replace(/\s+data-export-(?:link|as-image)="[^"]*"/g, "");

  // Give every saved page an explicit mobile viewport so browsers render at
  // the device width instead of applying a desktop-layout scale.
  html = html.replace(
    /<meta\b(?=[^>]*\bname=["']viewport["'])[^>]*>/gi,
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
  );

  // 6. Override stylesheet (idempotent and refreshed from static-fix.css).
  if (/<style\b[^>]*data-static-fix[^>]*>/i.test(html)) {
    html = html.replace(
      /<style\b([^>]*data-static-fix[^>]*)>[\s\S]*?<\/style>/i,
      `<style$1>\n${INDENTED_OVERRIDE_CSS}\n    </style>`,
    );
  } else {
    html = html.replace(
      /<\/head>/i,
      `  <style data-static-fix>\n${OVERRIDE_CSS}\n  </style>\n</head>`,
    );
  }

  // 6b. FAQ accordion behaviour — our own script (stripScripts keeps it,
  //     marker comment below makes the injection idempotent).
  if (
    html.includes('data-testid="toggle-button"') &&
    !html.includes("faq-toggle")
  ) {
    html = html.replace(
      /<\/body>/i,
      [
        "  <script data-static-fix>",
        "    /* faq-toggle */",
        "    document.addEventListener('click', function (e) {",
        "      var s = e.target && e.target.closest ? e.target.closest('.node-toggleSummary') : null;",
        "      if (!s) return;",
        "      var t = s.closest('.toggle');",
        "      if (!t) return;",
        '      t.setAttribute("data-open", t.getAttribute("data-open") === "true" ? "false" : "true");',
        "    });",
        "  </script>",
        "</body>",
      ].join("\n"),
    );
  }

  // 10. Restore emotion rules whose class is used in the markup but whose
  //     <style> block is missing (idempotent — restored once, then skipped).
  const restored = [];
  {
    const used = new Set();
    for (const m of html.matchAll(/class="([^"]*)"/g))
      for (const tok of m[1].split(/\s+/))
        if (/^css-[a-z0-9]+$/.test(tok)) used.add(tok);
    if (used.size) {
      const defined = new Set();
      for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g))
        for (const cm of m[1].matchAll(/\.((?:css-)[a-z0-9]+)\s*[,{]/g))
          defined.add(cm[1]);
      const missing = [...used].filter(
        (t) =>
          !defined.has(t) &&
          !vendorBlob.includes(`.${t}`) &&
          emotionDonors.has(t),
      );
      if (missing.length) {
        const tags = missing.map((t) => emotionDonors.get(t)).join("\n  ");
        // Keep the override stylesheet last so it keeps winning the cascade.
        const anchor = html.indexOf("<style data-static-fix>");
        html =
          anchor >= 0
            ? html.slice(0, anchor) + tags + "\n  " + html.slice(anchor)
            : html.replace(/<\/head>/i, () => `  ${tags}\n</head>`);
        restored.push(...missing);
      }
    }
  }

  const stats = {
    file: basename(file),
    beforeKb: Math.round(before / 1024),
    afterKb: Math.round(html.length / 1024),
    restored: restored.length,
    remoteCss:
      (html.match(/<link[^>]*rel="stylesheet"[^>]*href="https?:/gi) ?? [])
        .length +
      (html.match(/<link[^>]*href="https?:[^"]*"[^>]*rel="stylesheet"/gi) ?? [])
        .length,
    localCss:
      (html.match(/vendor\/gamma\//g) ?? []).length +
      (html.match(/vendor\/fonts\//g) ?? []).length,
    remoteMask: (html.match(/assets\.gammahosted\.com[^"]*\.svg/g) ?? [])
      .length,
    madeWithGamma: (html.match(/made with gamma/gi) ?? []).length,
    reportThisPage: (html.match(/report this page/gi) ?? []).length,
    noindex: (html.match(/noindex/gi) ?? []).length,
    gammaSite: (html.match(/gamma\.site/g) ?? []).length,
    gammaWrap: (html.match(/gamma\.app\/external-link/g) ?? []).length,
    cfMasked: (html.match(/__cf_email__/g) ?? []).length,
    override: html.includes("data-static-fix") ? 1 : 0,
    emptyCardsRemoved: emptyCards.removed,
    emptyCaseStudyImageCardsRemoved: emptyCaseStudyImages.removed,
    staleMediaRemoved,
    demotedH1,
    navLandmark:
      /<div\b[^>]*\brole="navigation"[^>]*\bdata-navbar-editor="true"/i.test(
        html,
      )
        ? 1
        : 0,
    // our own allowlisted script does not count as a leftover
    scripts: (html.match(/<script\b(?![^>]*\bdata-static-fix\b)/gi) ?? [])
      .length,
  };

  writeFileSync(file, html.replace(/\r?\n/g, lineEnding));
  return stats;
}

const pages = walk(join(ROOT, "pages"));
console.table(pages.map((f) => fix(readFileSync(f, "utf8"), f)));

const leftovers = pages
  .map((f) => {
    const html = readFileSync(f, "utf8");
    return {
      file: basename(f),
      googleapis: (html.match(/fonts\.googleapis\.com/g) ?? []).length,
      gammahosted: (html.match(/assets\.gammahosted\.com/g) ?? []).length,
      ifcdn: (html.match(/if-cdn\.com/g) ?? []).length,
      scripts: (html.match(/<script\b(?![^>]*\bdata-static-fix\b)/gi) ?? [])
        .length,
      branding: (html.match(/made with gamma|report this page/gi) ?? []).length,
      gammaSite: (html.match(/gamma\.site/g) ?? []).length,
      gammaWrap: (html.match(/gamma\.app\/external-link/g) ?? []).length,
      cfMasked: (html.match(/__cf_email__/g) ?? []).length,
    };
  })
  .filter(
    (r) =>
      r.googleapis ||
      r.gammahosted ||
      r.ifcdn ||
      r.scripts ||
      r.branding ||
      r.gammaSite ||
      r.gammaWrap ||
      r.cfMasked,
  );

console.log(
  leftovers.length === 0
    ? "OK: no remote CSS/masks, no scripts, no Gamma leftovers left."
    : "LEFTOVERS:",
);
if (leftovers.length) console.table(leftovers);
