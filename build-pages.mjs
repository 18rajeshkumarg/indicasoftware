#!/usr/bin/env node
/**
 * build-pages.mjs — regenerates the site's page content from one services
 * catalogue so that every button, card and link stays consistent.
 *
 *   node build-pages.mjs        (or: npm run pages:build)
 *
 *   1. index.html        — "Our Services" grid rebuilt with the 5 real
 *                          services, each card with a Learn More button.
 *   2. services.html     — same grid rebuild (adds Learn More per card) and
 *                          removes the "Continue to proceed" button.
 *   3. getstarted.html   — a focused landing page with one Explore Services
 *                          button and no service card grid.
 *   4. learn-more pages  — 5 service pages + the 4 legacy pages rebuilt from
 *                          the home layout with service copy and a
 *                          "Continue to proceed" button -> payment URL.
 *   5. webdesign-learnmore.html — keeps its copy and the payment CTA.
 *   6. every page        — Contact Us (nav button and body links) -> home,
 *                          Hiring -> ZARA interviewer, no target="_blank"
 *                          (one tab everywhere).
 *
 * Idempotent: running it again leaves the pages unchanged.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOME = path.join(ROOT, "public", "pages", "home");
const LEARN = path.join(ROOT, "public", "pages", "learn-more");

const PAYMENT = "https://payment-process-method.onrender.com/face.php";
const WHATSAPP_MESSAGE =
  "Hi INDICA SOFTWARE [Affordable Price SERVICE], I am looking for Side Hustle and Freelancing Support Service! Please Help!!";
const WHATSAPP_URL = `https://wa.me/917975044149?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
const ZARA = "https://18rajeshkumarg.github.io/ZARA-AI-INTERVIEWER/#roles";

/* ------------------------------------------------------------------ copy */

const SERVICES = [
  {
    file: "fullstack-web-ai-learnmore.html",
    name: "Custom Full-Stack Web & AI Development",
    title: "Custom Full-Stack Web & AI Development | Indica Software",
    tagline:
      "Full-stack web platforms engineered end-to-end with AI at the core",
    card: "Tailor-made web platforms built end to end — React and Node front ends, AI-powered features, secure UPI-ready payments and cloud deployment that grow with your business.",
    p1: "We design, build and ship complete web products: responsive front ends, robust APIs, databases, payments and AI features such as smart search, recommendations and assistants. Every project is written from scratch around your workflow — no templates, no lock-in — and handed over with source code you fully own.",
    p2: "From the first prototype to launch day and beyond, you get one dedicated team for architecture, development, testing and deployment, with clean documentation, automated updates and support that keeps your platform fast, secure and reliable.",
    desc: "Custom full-stack web and AI development — React, Node, secure UPI payments, cloud deployment and AI features built around your business.",
  },
  {
    file: "mobile-app-learnmore.html",
    name: "Custom Android and iOS Development",
    title: "Custom Android & iOS Development | Indica Software",
    tagline: "Native-quality mobile apps for Android and iOS",
    card: "Cross-platform and native mobile apps with polished interfaces, offline-ready data, push notifications and store-ready releases for the Play Store and the App Store.",
    p1: "We build mobile apps that feel native on every device: smooth navigation, fast load times and interfaces your users understand instantly. Whether you need a customer-facing app, an internal tool or a marketplace, we handle the full journey — design, development, testing, icons and screenshots — and prepare your listing for both stores.",
    p2: "You receive regular test builds so you can try every screen on your own phone, and we stay on after release with updates, crash monitoring and new features as your user base grows.",
    desc: "Custom Android and iOS app development — cross-platform mobile apps with store-ready releases, push notifications and post-launch support.",
  },
  {
    file: "ai-automations-learnmore.html",
    name: "AI Automations / Custom Integrations",
    title: "AI Automations & Custom Integrations | Indica Software",
    tagline: "Let the busywork run itself — automated and integrated",
    card: "Workflows that run themselves: AI bots, auto-replies, data sync and API integrations that connect the tools you already use and save hours every day.",
    p1: "Repetitive work should not eat your day. We map the tasks your team repeats — orders, forms, invoices, reports, messages — and automate them with scripts, AI models and API integrations that connect your website, payment gateway, CRM, spreadsheets and chat apps.",
    p2: "Everything is built to be observable and safe: clear logs, error alerts and human fallbacks, so you can see exactly what ran, when and why — and trust the automation with real customers.",
    desc: "AI automations and custom integrations — bots, workflows and API connections that link your tools and save hours of manual work.",
  },
  {
    file: "custom-frameworks-learnmore.html",
    name: "Custom Frameworks Development",
    title: "Custom Frameworks Development | Indica Software",
    tagline: "Bespoke frameworks and internal tools built your way",
    card: "Custom frameworks, admin panels and internal tools shaped around your process — fast, documented and ready to extend as your team grows.",
    p1: "Off-the-shelf tools force your process into someone else's shape. We build custom frameworks, dashboards and internal tools around how your business actually works — your roles, your data, your rules — so the software fits the team instead of the other way around.",
    p2: "You get documented, tested code with a clear structure, permissions and an interface your team can learn in an afternoon, plus the freedom to extend it later without starting over.",
    desc: "Custom framework and internal tool development — bespoke admin panels, dashboards and tools shaped around your process.",
  },
  {
    file: "side-hustle-learnmore.html",
    name: "Side Hustle and Freelancing Support",
    title: "Side Hustle and Freelancing Support | Indica Software",
    tagline: "Turn your skills into steady daily freelancing income",
    card: "Guidance, profiles, automation and delivery support that help you win freelance work and collect income daily — starting from what you already know.",
    p1: "If you can design, write, code, edit or advise, you can earn on a daily basis. We help you package your skill into a clear service, set up the profiles and portfolio that win clients, and put the repetitive parts — proposals, follow-ups, invoices and payment collection — on autopilot.",
    p2: "You keep full control of your clients and your rates; we provide the playbook, the tools and the automations that keep work and income flowing day after day.",
    desc: "Daily-basis side hustle and freelancing income support — service packaging, profiles, proposals and payment automation for your skills.",
  },
];

/** The legacy learn-more links: these pages were blank upstream. */
const LEGACY = [
  {
    file: "itconsulting-learnmore.html",
    name: "IT Consulting",
    title: "IT Consulting | Indica Software",
    tagline: "Technology decisions that pay for themselves",
    p1: "Choosing what to build, buy or replace is expensive to get wrong. Our consultants review your goals, budget and existing systems, then hand you a practical roadmap: what to keep, what to upgrade and what to automate first — with clear costs and timelines.",
    p2: "You get senior engineers who have shipped this before, working directly with your team: architecture reviews, vendor selection, security and compliance checks, and hands-on help until the plan is running in production.",
    desc: "IT consulting services — architecture reviews, roadmaps, vendor selection and hands-on engineering guidance for growing businesses.",
  },
  {
    file: "logodesign-learnmore.html",
    name: "Logo Design",
    title: "Logo Design | Indica Software",
    tagline: "Logos that make your brand memorable",
    p1: "A logo is the first thing people remember about you. We design clean, distinctive marks that still read clearly at favicon size, in print and on a billboard — grounded in your audience, your market and the feeling you want to leave behind.",
    p2: "You receive multiple concepts, fast revisions and a complete handover kit: SVG, PNG and source files, colour and font guidelines, and usage examples so your brand stays consistent everywhere it appears.",
    desc: "Professional logo design — distinctive marks, fast revisions and a full handover kit with SVG, PNG and source files.",
  },
  {
    file: "technicalsupport-learnmore.html",
    name: "Technical Support",
    title: "Technical Support | Indica Software",
    tagline: "Support that keeps your business running",
    p1: "When something breaks, you need a real engineer — not a ticket queue. We keep your sites, apps and infrastructure healthy with monitoring, patching, backups and a direct line to the people who built or maintain your systems.",
    p2: "Choose the response window that fits your business: from same-day help to 24/7 coverage with uptime checks, incident reports and a monthly summary of what was fixed, improved and prevented.",
    desc: "Technical support services — monitoring, patching, backups and direct engineer help with same-day or 24/7 coverage.",
  },
  {
    file: "videoediting-learnmore.html",
    name: "Video Editing",
    title: "Video Editing | Indica Software",
    tagline: "Edits that hold attention to the very last second",
    p1: "We turn raw footage into videos people actually finish watching: tight pacing, clean cuts, balanced sound and captions that work with the sound off — shaped for the platform you publish on, from Reels to product demos.",
    p2: "You get organised project files, versioned drafts and fast turnaround for changes, plus thumbnails, aspect-ratio exports and a consistent style your channel can keep using as it grows.",
    desc: "Professional video editing — tight pacing, captions, sound design and platform-ready exports with fast revisions.",
  },
];

const GETSTARTED = {
  file: "getstarted.html",
  title: "Get Started Today | Indica Software",
  name: "Get Started Today",
  tagline: "The right software starts with the right conversation.",
  p1: "Explore our services to find the right solution for your business goals. Each service page explains how we can help and what to expect.",
  p2: "Have a project in mind? Browse the services, then contact our team to talk through the best next step.",
  desc: "Explore Indica Software services and find the right software solution for your business.",
};

/* -------------------------------------------------------------- helpers */

const txt = (s) =>
  s
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) =>
  esc(String(s ?? ""))
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const CONTENT_STORAGE =
  process.env.INDICA_STORAGE_DIR ||
  path.resolve(ROOT, "..", "indica-private-storage");
function readPublishedContent(key) {
  try {
    const data = JSON.parse(
      readFileSync(path.join(CONTENT_STORAGE, "content.json"), "utf8"),
    );
    return Array.isArray(data[key])
      ? data[key].filter(
          (item) => item && typeof item === "object" && item.published === true,
        )
      : [];
  } catch {
    return [];
  }
}

const PUBLISHED_CASE_STUDIES = readPublishedContent("case_studies");
const PUBLISHED_REVIEWS = readPublishedContent("testimonials");

function caseStudyCards(items) {
  return items
    .map((item) => {
      const company = String(item.company || "Client");
      const image = item.image
        ? `<img class="indica-content-image" src="../../api/media.php?name=${encodeURIComponent(String(item.image))}" alt="${escAttr(company)} project" loading="lazy">`
        : "";
      const website = (() => {
        try {
          const url = new URL(String(item.website || ""));
          return ["http:", "https:"].includes(url.protocol)
            ? `<a href="${escAttr(url.href)}" rel="noopener noreferrer">Visit client website</a>`
            : "";
        } catch {
          return "";
        }
      })();
      return `<article class="indica-managed-card">${image}<h3>${esc(String(item.title || company))}</h3><p class="indica-case-company">${esc(company)}</p>${item.profile ? `<p>${esc(String(item.profile))}</p>` : ""}${item.description ? `<p>${esc(String(item.description))}</p>` : ""}${item.services ? `<p>Services: ${esc(String(item.services))}</p>` : ""}${website}</article>`;
    })
    .join("\n");
}

function reviewCards(items) {
  return items
    .map((item) => {
      const rating = Math.min(5, Math.max(1, Number(item.rating) || 0));
      const stars = "★".repeat(Math.round(rating));
      const attribution = [item.role, item.company]
        .filter(Boolean)
        .map(String)
        .join(" · ");
      return `<article class="indica-managed-card"><p class="indica-stars" aria-label="${rating.toFixed(1)} out of 5 stars">${stars}</p><p class="indica-rating">${rating.toFixed(1)} / 5.0</p><blockquote>“${esc(String(item.quote || ""))}”</blockquote><strong>${esc(String(item.client || "Client"))}</strong>${attribution ? `<p class="indica-case-company">${esc(attribution)}</p>` : ""}</article>`;
    })
    .join("\n");
}

const log = (msg) => console.log(msg);
const warn = (msg) => console.warn(`  !! ${msg}`);

/** Standard solid hero button markup, reused for pages without a hero CTA. */
let HERO_BUTTON = "";

/** Nearest enclosing <div> at (or before) pos, balancing open/close tags. */
function divAtBack(html, pos) {
  let depth = 0;
  for (let i = pos; i >= 0; i--) {
    const close = html.lastIndexOf("</div", i);
    const open = html.lastIndexOf("<div", i);
    if (close > open) {
      depth++;
      i = close;
      continue;
    }
    if (open >= 0) {
      if (depth === 0) return open;
      depth--;
      i = open;
      continue;
    }
    break;
  }
  return -1;
}

/** Exclusive end index (after ">") of the </div> matching <div> at open. */
function closeOf(html, open) {
  let d = 0;
  for (let j = open; j < html.length;) {
    const o = html.indexOf("<div", j);
    const c = html.indexOf("</div", j);
    if (c === -1) break;
    if (o !== -1 && o < c) {
      d++;
      j = o + 4;
      continue;
    }
    d--;
    j = c + 5;
    if (d === 0) return html.indexOf(">", j) + 1;
  }
  return -1;
}

/** Direct <div> children of the div at [start, end). */
function childrenOf(html, start, end) {
  const kids = [];
  let depth = 0;
  for (let j = start + 4; j < end; j++) {
    if (html.startsWith("</div", j)) {
      depth--;
      j += 4;
      continue;
    }
    if (html.startsWith("<div", j)) {
      if (depth === 0) {
        const e = closeOf(html, j);
        if (e < 0 || e > end) break;
        kids.push({ start: j, end: e });
        j = e - 1;
        continue;
      }
      depth++;
      j += 3;
      continue;
    }
  }
  return kids;
}

const firstH4 = (block) => {
  const m = /<h4\b[^>]*>[\s\S]*?<\/h4\s*>/.exec(block);
  return m ? txt(m[0]) : null;
};

/** All anchors with position, open tag, href, raw text and visible label. */
function anchorsIn(html) {
  const out = [];
  let i = 0;
  while ((i = html.indexOf("<a", i)) !== -1) {
    const nxt = html[i + 2];
    if (
      nxt !== " " &&
      nxt !== ">" &&
      nxt !== "\n" &&
      nxt !== "\r" &&
      nxt !== "\t"
    ) {
      i += 2;
      continue;
    }
    let j = i + 2;
    let q = null;
    for (; j < html.length; j++) {
      const c = html[j];
      if (q) {
        if (c === q) q = null;
      } else if (c === '"' || c === "'") q = c;
      else if (c === ">") break;
    }
    const openEnd = j + 1;
    const open = html.slice(i, openEnd);
    const hrefM = /href="([^"]*)"/.exec(open);
    const closeIdx = html.indexOf("</a", openEnd);
    const end = closeIdx === -1 ? openEnd : html.indexOf(">", closeIdx) + 1;
    out.push({
      start: i,
      end: end > i ? end : openEnd,
      open,
      raw: html.slice(i, end > i ? end : openEnd),
      href: hrefM ? hrefM[1] : null,
      label: txt(html.slice(openEnd, closeIdx === -1 ? openEnd : closeIdx)),
    });
    i = out[out.length - 1].end;
  }
  return out;
}

/**
 * Climb from pos while the enclosing div contains nothing but the given
 * label — used to grab (or remove) a whole button block cleanly.
 */
function climbToBlock(html, pos, labelRe) {
  let cur = { start: pos, end: pos };
  for (let i = 0; i < 5; i++) {
    const p = divAtBack(html, cur.start);
    if (p < 0) break;
    const e = closeOf(html, p);
    if (e < 0 || e < cur.end) break;
    if (!labelRe.test(txt(html.slice(p, e)))) break;
    cur = { start: p, end: e };
  }
  return cur;
}

/* ----------------------------------------------------------- grid surgery */

/** Locate the card grid container (its children are the cards). */
function findGrid(html) {
  const heads = [...html.matchAll(/<h4\b[^>]*>[\s\S]*?<\/h4\s*>/g)].slice(
    0,
    40,
  );
  for (const h of heads) {
    let pos = h.index;
    for (let lvl = 0; lvl < 24; lvl++) {
      const start = divAtBack(html, pos);
      if (start < 0) break;
      const end = closeOf(html, start);
      if (end < 0) break;
      const kids = childrenOf(html, start, end);
      const titles = kids.map((k) => firstH4(html.slice(k.start, k.end)));
      const withTitle = titles.filter(Boolean).length;
      if (withTitle >= 2 && kids.length === withTitle)
        return { start, end, kids, titles };
      pos = start - 1;
    }
  }
  return null;
}

/** Pull the "Learn More" paragraph block out of the home page cards. */
function extractLearnBlock(html) {
  const a = anchorsIn(html).find((x) => /Learn\s+More/.test(x.label));
  if (!a) throw new Error("no Learn More anchor found in the source template");
  const s = divAtBack(html, a.start);
  const e = closeOf(html, s);
  return html.slice(s, e).replace(/\s*data-pos="\d+"/g, "");
}

/** Clone a paragraph block with a new href and link label. */
function cloneBlock(block, href, label) {
  let b = block;
  if (/href="[^"]*"/.test(b)) b = b.replace(/href="[^"]*"/, `href="${href}"`);
  b = b.replace(/Learn\s+More\s*(?:→|&#x2192;|&rarr;|-&gt;)?/, label);
  return b;
}

/**
 * Rewrite one card cell: heading, description, Learn More target and
 * (optionally) an extra Continue to Proceed link to the payment page.
 */
function fillCell(cell, svc, { learnBlock, payment = false } = {}) {
  let out = cell;

  // 1. heading — first (only) <h4> in the cell
  out = out.replace(
    /(<h4\b[^>]*>)[\s\S]*?(<\/h4\s*>)/,
    (_, a, b) => `${a}\n              ${esc(svc.name)}\n            ${b}`,
  );

  // 2. description — the longest <p> that is not a Learn More link
  const ps = [...out.matchAll(/<p\b[^>]*>[\s\S]*?<\/p\s*>/g)];
  let best = null;
  let bestLen = -1;
  for (const m of ps) {
    const t = txt(m[0]);
    if (/Learn\s+More|Continue\s+to\s+proceed/i.test(t)) continue;
    if (t.length > bestLen) {
      best = m;
      bestLen = t.length;
    }
  }
  if (!best)
    throw new Error(`no description paragraph in card for ${svc.name}`);
  const attrs = /<p\b[^>]*>/.exec(best[0])[0];
  const cardText = svc.card ?? svc.p1;
  out =
    out.slice(0, best.index) +
    `${attrs}\n                ${cardText}\n              </p>` +
    out.slice(best.index + best[0].length);

  // 3. Learn More: retarget the existing link, or append a new paragraph
  if (/href="[^"]*learnmore[^"]*"/i.test(out)) {
    out = out.replace(/href="[^"]*learnmore[^"]*"/i, `href="${svc.file}"`);
  } else if (learnBlock) {
    const at = out.indexOf(cardText.slice(0, 40));
    if (at < 0)
      throw new Error(`description not found after rewrite (${svc.name})`);
    const wrapStart = divAtBack(out, at);
    const wrapEnd = closeOf(out, wrapStart);
    const gt = out.indexOf(">", wrapStart);
    const openTag = out.slice(wrapStart, gt + 1);
    const newOpen = openTag.replace(/\s*last-block\b/g, "");
    const shift = newOpen.length - openTag.length;
    out =
      out.slice(0, wrapStart) +
      newOpen +
      out.slice(gt + 1, wrapEnd + shift) +
      // the new paragraph takes over the "last-block" role from the
      // description, so the two do not fight over bottom spacing
      `\n            ${cloneBlock(learnBlock, svc.file, "Learn More →")}` +
      out.slice(wrapEnd + shift);
  }

  // 4. optional payment link right after the Learn More paragraph
  if (payment && learnBlock) {
    const lm = anchorsIn(out).find((a) => /Learn\s+More/.test(a.label));
    if (!lm) throw new Error("Learn More link missing before payment insert");
    const s = divAtBack(out, lm.start);
    const e = closeOf(out, s);
    out =
      out.slice(0, e) +
      `\n            ${cloneBlock(learnBlock, PAYMENT, "Continue to Proceed →")}` +
      out.slice(e);
  }

  return out;
}

/**
 * Rebuild the services grid with the 5-catalogue.
 * opts.payment adds a "Continue to Proceed" link to every card.
 */
function rebuildGrid(
  html,
  { payment = false, learnBlock = null, label = "?" } = {},
) {
  const grid = findGrid(html);
  if (!grid) {
    warn(`(${label}) services grid not found — left untouched`);
    return html;
  }
  const { start, end, kids, titles } = grid;
  log(
    `  grid: ${kids.length} cards [${titles.map((t) => t?.slice(0, 16)).join(", ")}]`,
  );

  if (/Custom\s+Full-Stack/.test(titles.join(" "))) {
    // Already built on a previous run. For the payment variant make sure
    // every card still carries its Continue to Proceed link.
    if (payment && learnBlock) {
      const cells = [];
      let changed = false;
      for (const k of kids) {
        let cell = html.slice(k.start, k.end);
        if (!cell.includes(PAYMENT)) {
          const lm = anchorsIn(cell).find((a) => /Learn\s+More/.test(a.label));
          if (lm) {
            const s = divAtBack(cell, lm.start);
            const e = closeOf(cell, s);
            cell =
              cell.slice(0, e) +
              `\n            ${cloneBlock(learnBlock, PAYMENT, "Continue to Proceed →")}` +
              cell.slice(e);
            changed = true;
          }
        }
        cells.push(cell);
      }
      if (changed) {
        log("  grid rebuilt: added Continue to Proceed to existing cards");
        return (
          html.slice(0, kids[0].start) +
          cells.join("") +
          html.slice(kids[kids.length - 1].end)
        );
      }
    }
    log("  grid already carries the 5 services — skipped");
    return html;
  }

  const template = html.slice(kids[0].start, kids[0].end);
  const cells = SERVICES.map((svc) =>
    fillCell(template, svc, { learnBlock, payment }),
  );

  return (
    html.slice(0, kids[0].start) +
    cells.join("") +
    html.slice(kids[kids.length - 1].end)
  );
}

/** Remove the service cards from the Get Started landing page. */
function removeServicesGrid(html) {
  const grid = findGrid(html);
  if (!grid) return html;
  log(`  removing services grid [${grid.start}..${grid.end}]`);
  return html.slice(0, grid.start) + html.slice(grid.end);
}

/** Add a single Explore Services button after the Get Started hero copy. */
function addExploreServicesCTA(html) {
  const explore = HERO_BUTTON.replace(/href="[^"]*"/, 'href="services.html"')
    .replace(/Get\s+Started\s+Today/, "Explore Services")
    .replace(/(<a\b[^>]*\bclass=")([^"]*)"/, '$1$2 explore-services-cta"')
    .replace(/\s*data-pos="\d+"/g, "");
  const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(html);
  if (!h1) return html;
  const regionStart = h1.index + h1[0].length;
  const h2pos = html.indexOf("<h2", regionStart);
  const region = html.slice(regionStart, h2pos < 0 ? undefined : h2pos);
  const paragraphs = [...region.matchAll(/<p\b[^>]*>[\s\S]*?<\/p\s*>/g)];
  const target = paragraphs.at(-1);
  if (!target) return html;
  const wrapStart = divAtBack(html, regionStart + target.index);
  const wrapEnd = wrapStart < 0 ? -1 : closeOf(html, wrapStart);
  if (wrapEnd < 0) return html;
  return (
    html.slice(0, wrapEnd) + `\n            ${explore}` + html.slice(wrapEnd)
  );
}

/** Remove one matching button block from the Get Started hero. */
function removeHeroButton(html, labelRe) {
  const button = anchorsIn(html).find((a) => labelRe.test(a.label.trim()));
  if (!button) return html;
  const block = climbToBlock(html, button.start, labelRe);
  return html.slice(0, block.start) + html.slice(block.end);
}

/** Remove every occurrence of a hero button before adding its replacement. */
function removeHeroButtons(html, labelRe) {
  let previous;
  do {
    previous = html;
    html = removeHeroButton(html, labelRe);
  } while (html !== previous);
  return html;
}

/* ------------------------------------------------------------- page copy */

function setMeta(html, key, value) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/g)];
  for (const t of tags) {
    if (!t[0].includes(key)) continue;
    if (!/content="[^"]*"/.test(t[0])) continue;
    const replaced = t[0].replace(
      /content="[^"]*"/,
      `content="${value.replace(/"/g, "&quot;")}"`,
    );
    html =
      html.slice(0, t.index) + replaced + html.slice(t.index + t[0].length);
  }
  return html;
}

/** Swap the hero (eyebrow, heading, paragraphs) for a service. */
function setHero(html, d) {
  // head metadata
  html = html.replace(/(<title\b[^>]*>)[\s\S]*?(<\/title>)/, `$1${d.title}$2`);
  html = setMeta(html, 'name="description"', d.desc);
  html = setMeta(html, 'property="og:title"', d.title);
  html = setMeta(html, 'property="og:description"', d.desc);
  html = setMeta(html, 'property="twitter:title"', d.title);
  html = setMeta(html, 'property="twitter:description"', d.desc);

  // eyebrow label above the heading (first body occurrence only)
  const headEnd = html.indexOf("</head>");
  const h1m = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(html);
  if (h1m) {
    const phrase =
      /Innovative\s+Software\s+Services\s+Built\s+on\s+a\s+Product-First\s+Philosophy/;
    const before = html.slice(headEnd, h1m.index);
    const m = phrase.exec(before);
    if (m) {
      const at = headEnd + m.index;
      html = html.slice(0, at) + esc(d.tagline) + html.slice(at + m[0].length);
    } else {
      warn(`(${d.file}) eyebrow phrase not found`);
    }
  }

  // heading
  const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(html);
  if (!h1) {
    warn(`(${d.file}) no h1 found`);
    return html;
  }
  const inner = h1[0].replace(
    /(<h1\b[^>]*>)[\s\S]*?(<\/h1\s*>)/,
    `$1\n              ${esc(d.name)}\n            $2`,
  );
  html = html.slice(0, h1.index) + inner + html.slice(h1.index + h1[0].length);

  // the two hero paragraphs: longest <p> blocks between h1 and first h2
  const h1b = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(html);
  const h2pos = html.search(/<h2\b/);
  const base = h1b.index + h1b[0].length;
  const region = html.slice(base, h2pos > 0 ? h2pos : undefined);
  const ps = [...region.matchAll(/<p\b[^>]*>[\s\S]*?<\/p\s*>/g)]
    .map((m) => ({ m, len: txt(m[0]).length }))
    .filter((x) => x.len > 150)
    .slice(0, 2);
  if (ps.length !== 2)
    warn(`(${d.file}) expected 2 hero paragraphs, found ${ps.length}`);
  for (let i = ps.length - 1; i >= 0; i--) {
    const { m } = ps[i];
    const attrs = /<p\b[^>]*>/.exec(m[0])[0];
    const replacement = `${attrs}\n                ${i === 0 ? d.p1 : d.p2}\n              </p>`;
    html =
      html.slice(0, base + m.index) +
      replacement +
      html.slice(base + m.index + m[0].length);
  }

  return html;
}

/** End index (exclusive) of the opening tag that starts at `start`. */
function openTagEnd(html, start) {
  let quote = null;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i + 1;
    }
  }
  return -1;
}

/**
 * Keep a page's hero button pair on one aligned line. In plain block
 * containers the two full-width wrappers stack and touch; marking them
 * inline-block lets them share a row (top-aligned, separated by the normal
 * whitespace gap). Idempotent.
 */
function alignHeroPair(html) {
  const labels = [/^Get Started Today$/, /^continue to proceed$/i];
  for (const re of labels) {
    const a = anchorsIn(html).find((x) =>
      re.test(x.label.replace(/\s+/g, " ").trim()),
    );
    if (!a) continue;
    const block = climbToBlock(html, a.start, re);
    const end = openTagEnd(html, block.start);
    if (end < 0) continue;
    const open = html.slice(block.start, end);
    if (/display:\s*inline-block/.test(open)) continue;
    const next = /\sstyle="/.test(open)
      ? open.replace(
          /\sstyle="([^"]*)"/,
          (m, s) => ` style="${s};display:inline-block;vertical-align:top"`,
        )
      : open.replace(/>$/, ' style="display:inline-block;vertical-align:top">');
    html = html.slice(0, block.start) + next + html.slice(end);
  }
  return html;
}

/** Insert a "Continue to proceed" solid button after the hero CTA. */
function insertContinue(html) {
  // A clone that landed *inside* the hero row's node-button item stacks
  // vertically under Get Started Today — pull it out and re-insert it as a
  // sibling so both sit on the same aligned line.
  const cont = anchorsIn(html).find((a) =>
    /^continue to proceed$/i.test(a.label.replace(/\s+/g, " ").trim()),
  );
  if (cont) {
    const block = climbToBlock(html, cont.start, /Continue to proceed/i);
    const parent = divAtBack(html, block.start - 1);
    const stacked =
      parent >= 0 &&
      /node-button/.test(html.slice(parent, parent + 240)) &&
      /Get\s+Started\s+Today/i.test(
        txt(html.slice(parent, closeOf(html, parent))),
      );
    if (!stacked) {
      log("  Continue to proceed already present — skipped");
      return html;
    }
    log("  Continue to proceed was stacked in the CTA row item — re-placing");
    html = html.slice(0, block.start) + html.slice(block.end);
  }

  const src = anchorsIn(html).find((a) => /^Get Started Today$/.test(a.label));
  if (src) {
    let block = climbToBlock(html, src.start, /^Get Started Today$/);
    // Climb out of the single-button wrapper into the hero row's node-button
    // item: the clone must become a *sibling* of that item so the flex row
    // lays the buttons out side by side instead of stacked on top of it.
    for (let i = 0; i < 3; i++) {
      const p = divAtBack(html, block.start - 1);
      if (p < 0 || p >= block.start) break;
      const e = closeOf(html, p);
      if (e < 0 || e <= block.end) break;
      if (!/^Get\s+Started\s+Today$/.test(txt(html.slice(p, e)))) break;
      block = { start: p, end: e };
    }
    let clone = html
      .slice(block.start, block.end)
      .replace(/href="[^"]*"/, `href="${PAYMENT}"`);
    clone = clone.replace(/Get\s+Started\s+Today/, "Continue to proceed");
    clone = clone.replace(/\s*data-pos="\d+"/g, "");
    return (
      html.slice(0, block.end) +
      `\n            ${clone}` +
      html.slice(block.end)
    );
  }

  // Pages without the hero CTA (e.g. webdesign): put the standard solid
  // button directly under the first paragraph of the hero.
  const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(html);
  if (h1 && HERO_BUTTON) {
    const region = html.slice(
      h1.index + h1[0].length,
      h1.index + h1[0].length + 60000,
    );
    for (const m of region.matchAll(/<p\b[^>]*>[\s\S]*?<\/p\s*>/g)) {
      if (txt(m[0]).length < 100) continue;
      const pos = h1.index + h1[0].length + m.index;
      const wrapStart = divAtBack(html, pos);
      if (wrapStart < 0) break;
      const wrapEnd = closeOf(html, wrapStart);
      if (wrapEnd < 0) break;
      const clone = HERO_BUTTON.replace(
        /href="[^"]*"/,
        `href="${PAYMENT}"`,
      ).replace(/Get\s+Started\s+Today/, "Continue to proceed");
      return (
        html.slice(0, wrapEnd) + `\n            ${clone}` + html.slice(wrapEnd)
      );
    }
  }

  warn("no hero anchor found for the Continue clone");
  return html;
}

/** Replace the side-hustle payment CTA with a WhatsApp inquiry button. */
function replaceContinueWithWhatsApp(html) {
  const cta = anchorsIn(html).find(
    (anchor) =>
      anchor.href === PAYMENT && /Continue\s+to\s+proceed/i.test(anchor.label),
  );
  if (!cta)
    throw new Error("Side Hustle WhatsApp CTA source button is missing");
  let block = cta.raw
    .replace(/href="[^"]*"/, `href="${WHATSAPP_URL}"`)
    .replace(
      /class="([^"]*)"/,
      (_, classes) => `class="${classes} whatsapp-cta-btn"`,
    )
    .replace(
      /(data-node-view-content-inner="button"[^>]*>)[\s\S]*?(<\/div>)/,
      "$1Chat on WhatsApp (+91 79750 44149)$2",
    );
  if (/Continue\s+to\s+proceed/i.test(txt(block))) {
    throw new Error("Unable to update Side Hustle CTA label");
  }
  html = html.slice(0, cta.start) + block + html.slice(cta.end);
  return html.replace(
    /<div\b(?=[^>]*\bclass="[^"]*\bnode-button\b[^"]*")[^>]*>\s*<\/div>/gi,
    "",
  );
}

/**
 * Guarantee a hero "Get Started Today" -> getstarted.html on pages that were
 * written without it (webdesign). Inserted directly before the Continue block
 * so the button order matches every other learn-more page. Idempotent.
 */
function ensureHeroCTA(html) {
  const exists = anchorsIn(html).some((a) =>
    /^Get Started Today$/.test(a.label),
  );
  if (exists) {
    log("  Get Started Today already present — aligning the hero CTA pair");
    return alignHeroPair(html);
  }
  if (!HERO_BUTTON) {
    warn("no hero button template to insert");
    return html;
  }

  // Preferred: sit right next to the payment button, like the other pages.
  const cont = anchorsIn(html).find((a) =>
    /^continue to proceed$/i.test(a.label.replace(/\s+/g, " ").trim()),
  );
  if (cont) {
    const block = climbToBlock(html, cont.start, /Continue to proceed/i);
    log(
      `  inserting Get Started Today before the Continue block [${block.start}..${block.end}]`,
    );
    return alignHeroPair(
      html.slice(0, block.start) +
        HERO_BUTTON +
        "\n            " +
        html.slice(block.start),
    );
  }

  // Fallback: standard solid button under the first hero paragraph.
  const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(html);
  if (h1) {
    const region = html.slice(
      h1.index + h1[0].length,
      h1.index + h1[0].length + 60000,
    );
    for (const m of region.matchAll(/<p\b[^>]*>[\s\S]*?<\/p\s*>/g)) {
      if (txt(m[0]).length < 100) continue;
      const pos = h1.index + h1[0].length + m.index;
      const wrapStart = divAtBack(html, pos);
      if (wrapStart < 0) break;
      const wrapEnd = closeOf(html, wrapStart);
      if (wrapEnd < 0) break;
      log("  inserting Get Started Today after the hero paragraph");
      return (
        html.slice(0, wrapEnd) +
        "\n            " +
        HERO_BUTTON +
        html.slice(wrapEnd)
      );
    }
  }

  warn("no place found for the Get Started Today button");
  return html;
}

/** Remove the optional hero CTA from Learn More pages. */
function removeHeroCTA(html) {
  const cta = anchorsIn(html).find((a) =>
    /^Get Started Today$/.test(a.label.replace(/\s+/g, " ").trim()),
  );
  if (!cta) return html;
  const block = climbToBlock(html, cta.start, /^Get Started Today$/);
  log(`  removing Get Started Today block [${block.start}..${block.end}]`);
  return html.slice(0, block.start) + html.slice(block.end);
}

/** Remove the old UPI "Continue to proceed" button from the services page. */
function removeContinue(html) {
  const a = anchorsIn(html).find((x) => /Continue to proceed/i.test(x.label));
  if (!a) {
    log("  no Continue to proceed on the services page — nothing to remove");
    return html;
  }
  const block = climbToBlock(html, a.start, /Continue to proceed/i);
  log(`  removing Continue to proceed block [${block.start}..${block.end}]`);
  return html.slice(0, block.start) + html.slice(block.end);
}

/* ------------------------------------------------------------ link pass */

/**
 * Rewrite just the href of an anchor, keeping its label and closing tag.
 * The edit replaces [start, end) with the *whole* anchor, only with the new
 * href — replacing only the open tag would delete the button text.
 */
const replaceHref = (a, h) => ({
  start: a.start,
  end: a.end,
  text: a.raw.replace(a.open, a.open.replace(/href="[^"]*"/, `href="${h}"`)),
});
const insertHref = (a, h) => ({
  start: a.start,
  end: a.end,
  text: a.raw.replace(a.open, a.open.replace(/^<a(\s)/, `<a href="${h}"$1`)),
});
const setHref = (a, h) =>
  a.href == null ? insertHref(a, h) : replaceHref(a, h);

/** Nav/Contact/Hiring/logo/one-tab rules applied to every page. */
function globalPass(html, file) {
  const h1m = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(html);
  const h1pos = h1m ? h1m.index : Infinity;
  const edits = [];
  let contactNav = 0;
  let contactOther = 0;
  let hiring = 0;
  let logo = 0;

  for (const a of anchorsIn(html)) {
    const label = a.label.replace(/\s+/g, " ").trim();
    if (label === "Contact Us") {
      // the nav button — and every other "Contact Us" link — land on the
      // contact page (contactus.html) and nowhere else
      if (a.href !== "contactus.html") edits.push(setHref(a, "contactus.html"));
      if (a.start < h1pos) contactNav++;
      else contactOther++;
    } else if (/Hiring/.test(label)) {
      if (a.href !== ZARA) edits.push(setHref(a, ZARA));
      hiring++;
    } else if (a.href === "") {
      // the brand logo in the navbar: empty href did nothing — send it home
      edits.push(setHref(a, "index.html"));
      logo++;
    }
  }

  edits.sort((x, y) => y.start - x.start);
  for (const e of edits)
    html = html.slice(0, e.start) + e.text + html.slice(e.end);

  // one tab only: no target="_blank" anywhere
  html = html.replace(/\s*target="_blank"/g, "");

  if (contactNav || contactOther || hiring || logo)
    log(
      `  ${file}: contact(nav)=${contactNav} contact(other)=${contactOther} hiring=${hiring} logo=${logo}`,
    );
  return html;
}

/* ------------------------------------------------- footer / feature passes */

const COMINGSOON = "comingsoon.html";

/** The last <div class="... node-card ..."> of a page — its footer card. */
function footerCard(html) {
  let start = -1;
  const re = /<div[^>]*\bnode-card(?=[\s"])[^>]*>/g;
  let m;
  while ((m = re.exec(html))) start = m.index;
  if (start < 0) return null;
  const end = closeOf(html, start);
  return end < 0 ? null : { start, end };
}

/**
 * The "Our Services" column of the footer: repoint the five links at the
 * five official service pages (idempotent — skips once already rewritten).
 */
function updateFooterServices(html) {
  const head = /Our\s+Services/.exec(html);
  if (!head) return { html, changed: 0 };
  const footer = footerCard(html);
  if (!footer) return { html, changed: 0 };
  const footerHtml = html.slice(footer.start, footer.end);
  const links = anchorsIn(footerHtml).filter((a) =>
    /learnmore\.html$/i.test(a.href ?? ""),
  );
  let changed = 0;
  const edits = [];

  for (let i = 0; i < Math.min(links.length, 5); i++) {
    const a = links[i];
    const svc = SERVICES[i];
    const raw = a.raw
      .replace(/href="[^"]*"/, `href="${svc.file}"`)
      .replace(
        /(<a\b[^>]*>)[\s\S]*?(<\/a\s*>)/,
        (_, open, close) => `${open}<span>${esc(svc.name)}</span>${close}`,
      );
    if (raw !== a.raw) changed++;
    edits.push({
      start: footer.start + a.start,
      end: footer.start + a.end,
      text: raw,
    });
  }

  // The extracted footer had only four service rows. Copy its final row to
  // add the fifth service so every page gets the same complete list.
  if (links.length === 4) {
    const last = links[3];
    const pStart = footerHtml.lastIndexOf("<p", last.start);
    const pClose = footerHtml.indexOf("</p", last.end);
    const pEnd = pClose < 0 ? -1 : footerHtml.indexOf(">", pClose) + 1;
    if (pStart >= 0 && pEnd > pClose) {
      const fifth = SERVICES[4];
      const row = footerHtml
        .slice(pStart, pEnd)
        .replace(/href="[^"]*"/, `href="${fifth.file}"`)
        .replace(
          /(<a\b[^>]*>)[\s\S]*?(<\/a\s*>)/,
          (_, open, close) => `${open}<span>${esc(fifth.name)}</span>${close}`,
        );
      edits.push({
        start: footer.start + pEnd,
        end: footer.start + pEnd,
        text: `\n${row}`,
      });
      changed++;
    } else warn("index.html: could not add the fifth footer service row");
  }

  edits.sort((a, b) => b.start - a.start);
  for (const e of edits)
    html = html.slice(0, e.start) + e.text + html.slice(e.end);
  return { html, changed };
}

/** Remove the footer Contact Us column and put its action under We are Hiring. */
function updateFooterContactActions(html) {
  const card = footerCard(html);
  if (!card) return html;
  let footer = html.slice(card.start, card.end);
  const enclosing = (pos, className) => {
    let cursor = pos;
    while (cursor >= 0) {
      const start = divAtBack(footer, cursor);
      if (start < 0) return null;
      const end = closeOf(footer, start);
      const openEnd = footer.indexOf(">", start) + 1;
      if (
        end > pos &&
        openEnd > start &&
        footer.slice(start, openEnd).includes(className)
      )
        return { start, end };
      cursor = start - 1;
    }
    return null;
  };

  // Remove the dedicated Contact Us button from the footer. Keep the existing
  // contact details cleanup below so the contact column cannot return later.
  const contactButtons = anchorsIn(footer)
    .filter(
      (anchor) =>
        anchor.href === "contactus.html" &&
        /^Contact\s+Us$/i.test(anchor.label.replace(/\s+/g, " ").trim()),
    )
    .map((anchor) => enclosing(anchor.start, "node-button node-button"))
    .filter(Boolean)
    .sort((a, b) => b.start - a.start);
  for (const button of contactButtons) {
    footer = footer.slice(0, button.start) + footer.slice(button.end);
  }

  const contactInfo =
    /\+917975044149|contact@indicasoftware\.com|Share\s+on\s+WhatsApp/i;
  const contactCells = [
    ...footer.matchAll(/<div\b[^>]*class="[^"]*node-gridCell[^"]*"[^>]*>/g),
  ]
    .map((match) => {
      const end = closeOf(footer, match.index);
      return end > 0 ? { start: match.index, end } : null;
    })
    .filter(
      (cell) => cell && contactInfo.test(footer.slice(cell.start, cell.end)),
    )
    .sort((a, b) => a.end - a.start - (b.end - b.start));
  if (contactCells[0]) {
    footer =
      footer.slice(0, contactCells[0].start) +
      footer.slice(contactCells[0].end);
  }
  return html.slice(0, card.start) + footer + html.slice(card.end);
}

/**
 * Give every page the same footer: replace its footer card with the
 * canonical one from index.html (pages that have no footer at all get it
 * appended after their last card).
 */
function syncFooter(html, file, canonical) {
  const card = footerCard(html);
  if (!card) {
    warn(`${file}: no card found for footer sync`);
    return html;
  }
  const region = html.slice(card.start, card.end);
  if (region.includes("© 2025")) {
    if (region === canonical) return html;
    return html.slice(0, card.start) + canonical + html.slice(card.end);
  }
  if (canonical.includes(region.slice(0, 200))) return html; // already ours
  return `${html.slice(0, card.end)}\n${canonical}${html.slice(card.end)}`;
}

/** Replace the contact page's hero copy with the Coming Soon message. */
function buildComingSoon(contactHtml) {
  let h = contactHtml;
  // A previous run may already have cloned a contact-details block — drop it.
  const marker = h.indexOf('class="indica-contact-details"');
  if (marker >= 0) {
    const ds = divAtBack(h, marker);
    const de = ds >= 0 ? closeOf(h, ds) : -1;
    if (ds >= 0 && de > ds) h = h.slice(0, ds) + h.slice(de);
  }

  h = h.replace(
    /(<title\b[^>]*>)[\s\S]*?(<\/title>)/,
    "$1Opening Soon! | Indica Software$2",
  );
  h = setMeta(
    h,
    'name="description"',
    "Opening Soon! — a new Indica Software feature is on the way.",
  );
  h = setMeta(h, 'property="og:title"', "Opening Soon! | Indica Software");
  h = setMeta(h, 'property="twitter:title"', "Opening Soon! | Indica Software");

  const h1m = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(h);
  if (h1m)
    h =
      h.slice(0, h1m.index) +
      h1m[0].replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1\s*>)/, "$1Opening Soon!$2") +
      h.slice(h1m.index + h1m[0].length);
  else warn("(comingsoon) no h1 found");

  h = h.replace(
    /(<p\b[^>]*>)(?:(?!<\/p>)[\s\S])*?We are a trusted provider[\s\S]*?<\/p\s*>/,
    "$1 This feature Coming Soon! $2",
  );

  // A way back, under the message (idempotent).
  if (!h.includes("indica-coming-cta")) {
    const msg = /(<p\b[^>]*>)[^<]*This feature Coming Soon![^<]*(<\/p>)/.exec(
      h,
    );
    if (msg) {
      const at = msg.index + msg[0].length;
      const block =
        '\n                <div class="indica-coming-cta"><a class="indica-backhome" href="index.html">Back to Home</a></div>';
      h = h.slice(0, at) + block + h.slice(at);
    }
  }
  return h;
}

/** Contact Details block on contactus.html (phone + e-mail, both clickable). */
const CONTACT_DETAILS = `
              <div class="indica-contact-details" data-indica-contact>
                <h2 class="indica-contact-title">Contact Details</h2>
                <p class="indica-contact-sub">
                  Call or e-mail us directly — we reply fast.
                </p>
                <div class="indica-contact-row">
                  <a
                    class="indica-contact-card"
                    href="tel:+917975044149"
                    data-indica-contact-phone
                  >
                    <span class="indica-contact-label">Phone Number</span>
                    <span class="indica-contact-value">+91 7975044149</span>
                  </a>
                  <a
                    class="indica-contact-card"
                    href="mailto:rajeshkumar.g1881@gmail.com"
                    data-indica-contact-email
                  >
                    <span class="indica-contact-label">Email</span>
                    <span class="indica-contact-value"
                      >rajeshkumar.g1881@gmail.com</span
                    >
                  </a>
                </div>
              </div>`;

function insertContactDetails(html, file) {
  if (html.includes("data-indica-contact")) return html;
  const intro =
    /<div\b[^>]*class="[^"]*\blast-block\b[^"]*"[^>]*>[\s\S]*?We are a trusted provider[\s\S]*?<\/div>/.exec(
      html,
    );
  if (!intro) {
    warn(`${file}: contact intro block not found`);
    return html;
  }
  const at = intro.index + intro[0].length;
  return html.slice(0, at) + CONTACT_DETAILS + html.slice(at);
}

const INQUIRY_FORM = `
  <section class="indica-managed-section indica-inquiry" data-indica-inquiry>
    <h2>Send us your project query</h2>
    <p>Share your company, contact number, the services you are interested in, and what you need help with. Our team will follow up.</p>
    <form data-indica-inquiry-form>
      <div class="indica-form-grid">
        <label>Company name <input name="company_name" maxlength="160" autocomplete="organization" required></label>
        <label>Mobile number <input name="mobile_number" type="tel" maxlength="24" autocomplete="tel" placeholder="Include country code if needed" required></label>
      </div>
      <fieldset><legend>Choose your services</legend>
        ${SERVICES.map((service) => `<label class="indica-service-option"><input type="checkbox" name="services[]" value="${esc(service.name)}"><span>${esc(service.name)}</span></label>`).join("\n        ")}
      </fieldset>
      <label class="indica-query-label">Your query<textarea name="query" rows="5" maxlength="5000" required></textarea></label>
      <p class="indica-data-notice">When you submit this query form, we get your query, and our support team will connect with you shorthly! We Keep Updated to our clients!. See our <a href="https://18rajeshkumarg.github.io/indicasoftware/pages/home/privacypolicy.html">Privacy Policy</a>.</p>
      <p class="indica-support-promise"><strong>100% Support &amp; Guidance Provided By INDICA SOFTWARE</strong></p>
      <label class="indica-honeypot" aria-hidden="true">Leave this field blank<input name="website" tabindex="-1" autocomplete="off"></label>
      <button class="indica-submit" type="submit">Send query</button>
      <p class="indica-form-status" data-indica-form-status role="status" aria-live="polite"></p>
    </form>
  </section>`;

const CASE_STUDIES_SECTIONS = `
  <section class="indica-managed-section" data-indica-case-studies>
    <h2>Client Case Studies</h2>
    <div class="indica-managed-grid" data-indica-content-list>${caseStudyCards(PUBLISHED_CASE_STUDIES) || "<p>Client stories will appear here soon.</p>"}</div>
  </section>
  <section class="indica-managed-section" data-indica-testimonials>
    <h2>What Our Clients Say</h2>
    <div class="indica-managed-grid" data-indica-content-list>${reviewCards(PUBLISHED_REVIEWS) || "<p>Client reviews will appear here soon.</p>"}</div>
  </section>`;

const HOME_CASES_LIST = `
  <div class="indica-home-case-list" data-indica-case-studies>
    <div class="indica-managed-grid" data-indica-content-list>${caseStudyCards(PUBLISHED_CASE_STUDIES) || "<p>Client stories will appear here soon.</p>"}</div>
  </div>`;

const HOME_TESTIMONIALS_LIST = `
  <div class="indica-home-testimonial-list" data-indica-testimonials>
    <div class="indica-managed-grid" data-indica-content-list>${reviewCards(PUBLISHED_REVIEWS) || "<p>Client reviews will appear here soon.</p>"}</div>
  </div>`;

const TECHNOLOGY_SECTION = `
  <section class="indica-managed-section indica-technology" data-indica-technology>
    <h2>Services and Technologies We Use</h2>
    <p>We match each project with a practical set of tools, based on its users, scale, security needs, and long-term support requirements.</p>
    <div class="indica-managed-grid">
      <article class="indica-managed-card"><h3>Services we provide</h3><ul>
        ${SERVICES.map((service) => `<li>${esc(service.name)}</li>`).join("\n        ")}
      </ul></article>
      <article class="indica-managed-card"><h3>Technologies we work with</h3><ul>
        <li>React and JavaScript for interactive web applications</li>
        <li>Python for automation, data workflows, and AI integrations</li>
        <li>Node.js and PHP for server-side applications and APIs</li>
        <li>HTML and CSS for accessible, responsive interfaces</li>
        <li>REST APIs and SQL databases for connected, data-driven products</li>
        <li>Cloud deployment, monitoring, and ongoing maintenance</li>
      </ul></article>
    </div>
  </section>`;

const TEAM_SECTION = `
  <section class="indica-managed-section" data-indica-team>
    <h2>Meet Our Team</h2>
    <p>Our team brings together the people and skills behind our work.</p>
    <div class="indica-managed-grid" data-indica-team-list><p>Our team information will appear here soon.</p></div>
  </section>`;

const PRIVACY_FORM_NOTICE = `
  <section class="indica-managed-section" data-indica-data-privacy>
    <h2>Information submitted through our forms</h2>
    <p>We receive the contact details and message you submit so we can respond to your inquiry. When a form is submitted, we also record the submission time, the page route, and basic browser/device details: browser user-agent, platform, language, timezone, screen size, and viewport size. A hashed connection address is used for spam rate limiting; older rate-limit timestamps are cleared when new submissions arrive. We do not collect these form details just because you visit or browse the site.</p>
    <p>Submissions are stored in the private content service and are available to authorized administrators for handling inquiries. Administrators can export or delete submissions. Contact us using the details on our Contact Us page to ask about a submission or request its removal.</p>
  </section>`;

function insertBeforeFooter(html, marker, markup, file) {
  if (html.includes(marker)) return html;
  const footer = footerCard(html);
  if (!footer) {
    warn(
      `${file}: footer container not found; managed section was not inserted`,
    );
    return html;
  }
  return html.slice(0, footer.start) + markup + "\n" + html.slice(footer.start);
}

/** Place the managed case-study feed immediately after the Case Studies intro. */
function placeCaseStudiesAfterIntro(html, markup, file) {
  html = html
    .replace(
      /<section\b(?=[^>]*\bdata-indica-case-studies\b)[\s\S]*?<\/section>/i,
      "",
    )
    .replace(
      /<section\b(?=[^>]*\bdata-indica-testimonials\b)[\s\S]*?<\/section>/i,
      "",
    );
  const heading = html.indexOf("CASE STUDIES");
  if (heading >= 0) {
    let cursor = heading;
    while (cursor >= 0) {
      const start = divAtBack(html, cursor);
      if (start < 0) break;
      const openEnd = html.indexOf(">", start) + 1;
      const end = closeOf(html, start);
      if (
        end > heading &&
        openEnd > start &&
        /\bnode-card\b/.test(html.slice(start, openEnd))
      )
        return `${html.slice(0, end)}\n${markup}\n${html.slice(end)}`;
      cursor = start - 1;
    }
  }
  warn(`${file}: Case Studies intro card not found; using footer placement`);
  return insertBeforeFooter(html, "data-indica-case-studies", markup, file);
}

function removeManagedDiv(html, marker) {
  const match = new RegExp(`<div\\b(?=[^>]*\\b${marker}\\b)[^>]*>`, "i").exec(
    html,
  );
  if (!match) return html;
  const end = closeOf(html, match.index);
  return end < 0 ? html : html.slice(0, match.index) + html.slice(end);
}

/** Place managed lists inside the homepage's existing matching sections. */
function placeHomeCaseStudies(html) {
  html = html
    .replace(/<section\b[^>]*data-indica-case-studies[\s\S]*?<\/section>/i, "")
    .replace(/<section\b[^>]*data-indica-testimonials[\s\S]*?<\/section>/i, "");
  html = removeManagedDiv(
    removeManagedDiv(html, "data-indica-case-studies"),
    "data-indica-testimonials",
  );

  const caseHeading = html.indexOf("CASE STUDIES");
  const caseParagraph =
    caseHeading < 0 ? -1 : html.indexOf("gml-paragraph", caseHeading);
  if (caseParagraph >= 0) {
    const open = html.lastIndexOf("<div", caseParagraph);
    const end = closeOf(html, open);
    if (open >= 0 && end >= 0)
      html = `${html.slice(0, end)}\n${HOME_CASES_LIST}\n${html.slice(end)}`;
    else
      warn(
        "index.html: could not attach managed case studies to the existing section",
      );
  } else {
    warn("index.html: existing Case Studies section was not found");
  }

  const say = html.indexOf("Say?");
  const h1 = say < 0 ? -1 : html.lastIndexOf("<h1", say);
  const headingClass = h1 < 0 ? -1 : html.lastIndexOf("gml-heading", h1);
  const headingOpen =
    headingClass < 0 ? -1 : html.lastIndexOf("<div", headingClass);
  const headingEnd = headingOpen < 0 ? -1 : closeOf(html, headingOpen);
  if (headingEnd >= 0)
    html = `${html.slice(0, headingEnd)}\n${HOME_TESTIMONIALS_LIST}\n${html.slice(headingEnd)}`;
  else warn("index.html: existing What Clients Say section was not found");
  return html;
}

function insertWelcomeMessage(html) {
  if (html.includes("data-indica-welcome-message")) return html;
  const heading = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/i.exec(html);
  if (!heading) {
    warn("index.html: homepage hero heading not found for welcome message");
    return html;
  }
  const wrapperStart = html.lastIndexOf("<div", heading.index);
  const wrapperEnd = wrapperStart < 0 ? -1 : closeOf(html, wrapperStart);
  if (wrapperEnd < 0) return html;
  const message = '<p data-indica-welcome-message style="margin:1rem 0;max-width:52rem;font-size:clamp(1rem,2vw,1.25rem);line-height:1.6">Welcome to INDICA SOFTWARE! We Give 100% Transforming ideas into market-leading software products with a product-first philosophy | Custom AI &amp; Software Solution</p>';
  return `${html.slice(0, wrapperEnd)}\n${message}\n${html.slice(wrapperEnd)}`;
}

/** FAQ accordions on services.html: open them and keep them clickable. */
function fixFaq(html) {
  // element attributes only — the CSS rule [data-open="false"] stays intact
  return html.replace(/(<div\b[^>]*\bdata-open=")false(")/g, "$1true$2");
}

/** Services CTA: keep only the "I am Interested" payment action. */
function replaceServiceCta(html) {
  html = removeServiceButton(html, /^Not Interested$/i);
  const anchors = anchorsIn(html);
  const start = anchors.find(
    (a) => a.label.replace(/\s+/g, " ").trim() === "Start Your Project",
  );
  if (!start) {
    if (!html.includes("I am Interested"))
      warn("(services) Start Your Project button not found");
    return html;
  }
  const b1 = divAtBack(html, start.start);
  const w2 = b1 >= 0 ? divAtBack(html, b1) : -1; // node-button wrapper
  const blockStart = w2 >= 0 ? w2 : b1;
  const blockEnd = closeOf(html, blockStart);
  if (blockStart < 0 || blockEnd < 0) {
    warn("(services) could not bound the CTA button block");
    return html;
  }
  const block = html.slice(blockStart, blockEnd);
  const makeButton = (href, label) =>
    block
      .replace(/href="[^"]*"/, `href="${href}"`)
      .replace(
        /(<div\b[^>]*data-node-view-content-inner="button"[^>]*>)[\s\S]*?(<\/div>)/,
        `$1\n${label}\n              $2`,
      );
  return (
    html.slice(0, blockStart) +
    makeButton(PAYMENT, "I am Interested") +
    html.slice(blockEnd)
  );
}

function removeServiceButton(html, labelRe) {
  let button;
  while (
    (button = anchorsIn(html).find((a) =>
      labelRe.test(a.label.replace(/\s+/g, " ").trim()),
    ))
  ) {
    const block = climbToBlock(html, button.start, labelRe);
    if (block.end <= block.start) break;
    html = html.slice(0, block.start) + html.slice(block.end);
  }
  return html;
}

/** Style every "Learn More" link as a blue+green gradient button. */
function tagLearnMore(html) {
  const edits = [];
  for (const a of anchorsIn(html)) {
    const label = a.label.replace(/\s+/g, " ").trim();
    if (!/^Learn More/.test(label)) continue;
    if (a.open.includes("learn-more-btn")) continue;
    edits.push({
      start: a.start,
      end: a.start + a.open.length,
      text: a.open.replace('class="', 'class="learn-more-btn '),
    });
  }
  edits.sort((x, y) => y.start - x.start);
  for (const e of edits)
    html = html.slice(0, e.start) + e.text + html.slice(e.end);
  return html;
}

/**
 * "Career Development Coaching" (strategic heading + footer link) and
 * "Explore Careers" all open the Coming Soon page.
 */
function careerLinks(html) {
  // 1. the two-line strategic heading: wrap each h3's text in a link
  const edits = [];
  for (const m of html.matchAll(/<h3\b[^>]*>[\s\S]*?<\/h3\s*>/g)) {
    const label = txt(m[0]).replace(/\s+/g, " ").trim();
    if (label !== "Career Development" && label !== "Coaching") continue;
    if (m[0].includes("<a")) continue;
    const inner = m[0].replace(
      /(<h3\b[^>]*>)([\s\S]*?)(<\/h3\s*>)/,
      `$1<a href="${COMINGSOON}" class="career-link">$2</a>$3`,
    );
    edits.push({ start: m.index, end: m.index + m[0].length, text: inner });
  }
  // 2 + 3. footer link and the Explore Careers button
  for (const a of anchorsIn(html)) {
    const label = a.label.replace(/\s+/g, " ").trim();
    if (
      (label === "Career Development Coaching" ||
        label === "Explore Careers") &&
      a.href !== COMINGSOON
    )
      edits.push(setHref(a, COMINGSOON));
  }
  edits.sort((x, y) => y.start - x.start);
  for (const e of edits)
    html = html.slice(0, e.start) + e.text + html.slice(e.end);
  return html;
}

/** Warm up the image CDNs before the first frame paints. */
function addPreconnect(html) {
  if (html.includes('rel="preconnect"')) return html;
  const tags = [
    "https://imgproxy.gamma.app",
    "https://cdn.gamma.app",
    "https://assets.api.gamma.app",
  ]
    .map((h) => `  <link rel="preconnect" href="${h}" />`)
    .join("\n");
  return html.replace(/<\/head>/i, `${tags}\n</head>`);
}

/* ---------------------------------------------------------------- build */

const read = (p) => readFileSync(p, "utf8");
const write = (p, content) => writeFileSync(p, content);

log("== build-pages ==");

const originalHome = read(path.join(HOME, "index.html"));
const originalServices = read(path.join(HOME, "services.html"));
const learnBlock = extractLearnBlock(originalHome);
{
  const src = anchorsIn(originalHome).find((a) =>
    /^Get Started Today$/.test(a.label),
  );
  if (!src) throw new Error("no Get Started Today button in the home template");
  const b = climbToBlock(originalHome, src.start, /^Get Started Today$/);
  HERO_BUTTON = originalHome
    .slice(b.start, b.end)
    .replace(/\s*data-pos="\d+"/g, "");
}

/* 1 — home grid */
log("\n1. index.html — services grid");
let home = rebuildGrid(originalHome, { learnBlock, label: "index" });
home = globalPass(home, "index.html");
home = insertWelcomeMessage(home);
write(path.join(HOME, "index.html"), home);

/* 2 — services grid + drop the Continue button */
log("\n2. services.html — services grid, Learn More per card, no Continue");
let services = rebuildGrid(originalServices, { learnBlock, label: "services" });
services = removeContinue(services);
services = globalPass(services, "services.html");
write(path.join(HOME, "services.html"), services);

/* 3 — get started page: every service with Learn More + Continue to Proceed */
log("\n3. getstarted.html — all services, Continue to Proceed each");
let getstarted = rebuildGrid(originalHome, {
  learnBlock,
  label: "getstarted",
});
getstarted = setHero(getstarted, GETSTARTED);
getstarted = removeServicesGrid(getstarted);
getstarted = removeHeroButtons(getstarted, /^Get Started Today$/i);
getstarted = removeHeroButtons(getstarted, /^Continue to Proceed(?:\s*→)?$/i);
getstarted = removeHeroButtons(getstarted, /^Explore Services$/i);
getstarted = addExploreServicesCTA(getstarted);
getstarted = globalPass(getstarted, "getstarted.html");
write(path.join(HOME, "getstarted.html"), getstarted);

/* 4 — learn-more pages (5 service pages + 4 legacy pages), home layout */
log("\n4. learn-more pages — home layout with service copy");
for (const d of [...SERVICES, ...LEGACY]) {
  let page = rebuildGrid(home, { learnBlock, label: d.file });
  page = setHero(page, d);
  page = insertContinue(page);
  if (d.file === "side-hustle-learnmore.html") {
    page = replaceContinueWithWhatsApp(page);
  }
  page = removeHeroCTA(page);
  page = globalPass(page, d.file);
  write(path.join(LEARN, d.file), page);
  log(`  wrote ${d.file}`);
}

/* 5 — webdesign page: keep its copy and Continue button */
log("\n5. webdesign-learnmore.html — Continue to proceed");
let webdesign = read(path.join(LEARN, "webdesign-learnmore.html"));
webdesign = insertContinue(webdesign);
webdesign = removeHeroCTA(webdesign);
webdesign = insertBeforeFooter(
  webdesign,
  "data-indica-case-studies",
  CASE_STUDIES_SECTIONS,
  "webdesign-learnmore.html",
);
webdesign = globalPass(webdesign, "webdesign-learnmore.html");
write(path.join(LEARN, "webdesign-learnmore.html"), webdesign);

/* 6 — link rules on every remaining page */
log("\n6. remaining pages — contact/hiring/one-tab pass");
const touched = new Set([
  "index.html",
  "services.html",
  "getstarted.html",
  ...SERVICES.map((s) => s.file),
  ...LEGACY.map((s) => s.file),
  "webdesign-learnmore.html",
]);
for (const f of readdirSync(HOME).filter((f) => f.endsWith(".html"))) {
  if (touched.has(f)) continue;
  write(path.join(HOME, f), globalPass(read(path.join(HOME, f)), f));
}

/* ------------------------------------------------- new feature passes */

const pageList = () => [
  ...readdirSync(HOME)
    .filter((f) => f.endsWith(".html"))
    .map((f) => [HOME, f]),
  ...readdirSync(LEARN)
    .filter((f) => f.endsWith(".html"))
    .map((f) => [LEARN, f]),
];

/* 7 — one aligned footer everywhere, with the current services list */
log("\n7. footer — services list + canonical footer on every page");
let canonicalFooter;
{
  let idx = read(path.join(HOME, "index.html"));
  const upd = updateFooterServices(idx);
  if (upd.changed)
    log(`  index.html: ${upd.changed} footer service links updated`);
  idx = updateFooterContactActions(upd.html);
  write(path.join(HOME, "index.html"), idx);
  const card = footerCard(idx);
  if (!card) throw new Error("index.html: footer card not found");
  canonicalFooter = idx.slice(card.start, card.end);
  let replaced = 0;
  let added = 0;
  for (const [dir, f] of pageList()) {
    const p = path.join(dir, f);
    const h = read(p);
    const next = syncFooter(h, f, canonicalFooter);
    if (next === h) continue;
    const hadFooter = (() => {
      const c = footerCard(h);
      return c ? h.slice(c.start, c.end).includes("© 2025") : false;
    })();
    write(p, next);
    if (hadFooter) replaced++;
    else added++;
  }
  log(`  footer: ${replaced} replaced, ${added} added`);
}

/* Managed case studies, testimonials, and the published tech overview. */
{
  const homePath = path.join(HOME, "index.html");
  let homeHtml = read(homePath);
  homeHtml = placeHomeCaseStudies(homeHtml);
  write(homePath, homeHtml);

  const casePath = path.join(HOME, "casestudies.html");
  let caseHtml = read(casePath);
  caseHtml = placeCaseStudiesAfterIntro(
    caseHtml,
    CASE_STUDIES_SECTIONS,
    "casestudies.html",
  );
  write(casePath, caseHtml);

  const techPath = path.join(HOME, "technologies.html");
  let techHtml = read(techPath);
  techHtml = insertBeforeFooter(
    techHtml,
    "data-indica-technology",
    TECHNOLOGY_SECTION,
    "technologies.html",
  );
  write(techPath, techHtml);

  const aboutPath = path.join(HOME, "aboutus.html");
  let aboutHtml = read(aboutPath);
  if (!aboutHtml.includes("data-indica-about-video")) {
    aboutHtml = aboutHtml.replace(
      /(<div\b[^>]*class="[^"]*\bnode-video\b[^"]*"[^>]*)(>)/,
      "$1 data-indica-about-video$2",
    );
  }
  aboutHtml = insertBeforeFooter(
    aboutHtml,
    "data-indica-team",
    TEAM_SECTION,
    "aboutus.html",
  );
  write(aboutPath, aboutHtml);

  const privacyPath = path.join(HOME, "privacypolicy.html");
  const privacyHtml = insertBeforeFooter(
    read(privacyPath),
    "data-indica-data-privacy",
    PRIVACY_FORM_NOTICE,
    "privacypolicy.html",
  );
  write(privacyPath, privacyHtml);
}

/* 8 — the Coming Soon page, cloned from the contact page's shell */
log("\n8. comingsoon.html — Opening Soon!");
{
  const contact = read(path.join(HOME, "contactus.html"));
  write(path.join(HOME, "comingsoon.html"), buildComingSoon(contact));
}

/* 9 — contact details section on contactus.html */
log("\n9. contactus.html — contact details section");
{
  const p = path.join(HOME, "contactus.html");
  const h = read(p);
  let next = insertContactDetails(h, "contactus.html");
  next = insertBeforeFooter(
    next,
    "data-indica-inquiry",
    INQUIRY_FORM,
    "contactus.html",
  );
  if (next !== h) log("  contact details inserted");
  write(p, next);
}

/* 10 — FAQ accordions on services.html: show every answer */
log("\n10. services.html — FAQ accordions opened");
{
  const p = path.join(HOME, "services.html");
  const h = read(p);
  const next = fixFaq(h);
  const open = (next.match(/<div\b[^>]*\bdata-open="true"/g) ?? []).length;
  log(`  ${open} FAQ item(s) open`);
  write(p, next);
}

/* 11 — services CTA: I am Interested / Not Interested */
log("\n11. services.html — Ready-to-Build CTA buttons");
{
  const p = path.join(HOME, "services.html");
  const h = read(p);
  write(p, replaceServiceCta(h));
}

/* 12 — Learn More buttons, Career/Explore Careers links, image preconnect */
log("\n12. all pages — Learn More buttons, Coming-Soon links, preconnect");
for (const [dir, f] of pageList()) {
  const p = path.join(dir, f);
  const h = read(p);
  let next = tagLearnMore(h);
  next = careerLinks(next);
  next = addPreconnect(next);
  if (next !== h) write(p, next);
}

/* ------------------------------------------------------- final checks */
log("\n== verification ==");
let problems = 0;
const ALIASES = new Set(["interiordesign-learnmore.html"]); // router sends it to /services
const allPages = [
  ...readdirSync(HOME)
    .filter((f) => f.endsWith(".html"))
    .map((f) => ["home", f]),
  ...readdirSync(LEARN)
    .filter((f) => f.endsWith(".html"))
    .map((f) => ["learn-more", f]),
];
const learnTargets = new Map();

for (const [dir, f] of allPages) {
  const html = read(path.join(ROOT, "public", "pages", dir, f));
  const issues = [];
  if (f !== "hiring.html" && /href="hiring\.html"/.test(html))
    issues.push("still links to hiring.html");
  if (/href="https:\/\/contact-us\.youware\.app\//.test(html))
    issues.push("still links to youware contact");
  if (/target="_blank"/.test(html)) issues.push("target=_blank remains");

  const anchors = anchorsIn(html);
  // nav Contact Us (above the h1) must keep its label and point at contactus
  const h1m = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/.exec(html);
  const navContact = anchors.find(
    (a) => a.label === "Contact Us" && (!h1m || a.start < h1m.index),
  );
  if (!navContact) issues.push("nav Contact Us missing or label lost");
  else if (navContact.href !== "contactus.html")
    issues.push(`nav Contact Us -> ${navContact.href}`);
  // hiring buttons keep their label and now point at the interviewer
  const brokenHiring = anchors.find(
    (a) => a.href === ZARA && !/Hiring/i.test(a.label),
  );
  if (brokenHiring) issues.push("hiring button lost its label");
  if (anchors.some((a) => /Hiring/i.test(a.label) && a.href !== ZARA))
    issues.push("hiring button not pointing at ZARA");

  // every learn-more link must resolve to a real file (or a router alias)
  for (const a of anchors) {
    const m = /learnmore\.html/i.exec(a.href || "");
    if (m) {
      const file = a.href.split("/").pop().toLowerCase();
      if (!ALIASES.has(file))
        learnTargets.set(file, (learnTargets.get(file) || 0) + 1);
    }
  }

  if (dir === "learn-more") {
    if (f === "side-hustle-learnmore.html") {
      const whatsapp = anchors.filter(
        (a) =>
          a.href?.startsWith("https://wa.me/917975044149?text=") &&
          /Chat on WhatsApp/i.test(a.label),
      );
      if (whatsapp.length !== 1) issues.push("missing WhatsApp inquiry CTA");
    } else {
      const pay = anchors.filter(
        (a) => a.href === PAYMENT && /Continue to proceed/i.test(a.label),
      );
      if (pay.length < 1) issues.push("missing Continue to Proceed -> payment");
    }
    // Learn More pages keep only the payment CTA; no Get Started Today hero CTA.
    const gst = anchors.filter((a) => /^Get Started Today$/.test(a.label));
    if (gst.length) issues.push("Get Started Today button should be absent");
  }

  // every "Contact Us" (nav button or body link) lands on the contact page
  const badContact = anchors.filter(
    (a) => a.label === "Contact Us" && a.href !== "contactus.html",
  );
  if (badContact.length)
    issues.push(
      `Contact Us -> ${badContact.map((a) => a.href ?? "(none)").join(",")} (want contactus.html)`,
    );

  // the home page never takes payments; services has exactly one payment CTA
  if (f === "index.html") {
    const pay = anchors.filter((a) => a.href === PAYMENT);
    if (pay.length) issues.push(`${pay.length} payment link(s) — must be 0`);
  }
  if (f === "services.html") {
    const pay = anchors.filter((a) => a.href === PAYMENT);
    if (pay.length !== 1)
      issues.push(
        `${pay.length} payment link(s) — want exactly 1 (I am Interested)`,
      );
    else if (!/^I am Interested$/i.test(pay[0].label.trim()))
      issues.push(`services payment label -> ${pay[0].label}`);
    if (anchors.some((a) => /^Not Interested$/i.test(a.label.trim())))
      issues.push("Not Interested button should be absent");
    if (anchors.some((a) => a.label === "Start Your Project"))
      issues.push("Start Your Project still present");
    const faqOpen = (html.match(/<div\b[^>]*\bdata-open="true"/g) ?? []).length;
    const faqShut = (html.match(/<div\b[^>]*\bdata-open="false"/g) ?? [])
      .length;
    if (faqOpen < 6) issues.push(`${faqOpen} FAQ item(s) open (want >= 6)`);
    if (faqShut) issues.push(`${faqShut} FAQ item(s) still collapsed`);
  }

  if (f === "getstarted.html") {
    const exploreLabels = [...html.matchAll(/Explore Services/g)];
    const exploreIndex = exploreLabels[0]?.index ?? -1;
    const exploreHref =
      exploreIndex < 0
        ? -1
        : html.lastIndexOf('href="services.html"', exploreIndex);
    const exploreAnchorStart =
      exploreHref < 0 ? -1 : html.lastIndexOf("<a", exploreHref);
    if (
      exploreLabels.length !== 1 ||
      exploreHref < 0 ||
      exploreAnchorStart < 0 ||
      html.indexOf("</a", exploreIndex) < 0
    )
      issues.push("expected one Explore Services button -> services.html");
    if (anchors.some((a) => a.href === PAYMENT))
      issues.push("payment CTA should not appear on Get Started page");
  }

  // one aligned footer everywhere
  if (!html.includes("© 2025")) issues.push("footer missing");

  // the footer's Services column lists the five current services
  {
    const head = /Our\s+Services/.exec(html);
    if (!head) issues.push("footer Our Services column missing");
    else {
      const foot = anchorsIn(html.slice(head.index, head.index + 40000)).filter(
        (a) => a.href && a.href.endsWith("-learnmore.html"),
      );
      if (foot.length < 5) issues.push(`footer services: ${foot.length} links`);
      else {
        const dec = (s) => s.replace(/&amp;/g, "&");
        SERVICES.forEach((svc, i) => {
          if (dec(foot[i].label) !== svc.name || foot[i].href !== svc.file)
            issues.push(
              `footer service ${i + 1} -> ${dec(foot[i].label)} / ${foot[i].href}`,
            );
        });
      }
    }
  }

  // the brand logo goes home
  if (anchors.some((a) => a.href === ""))
    issues.push("brand logo still has an empty href");

  // "Learn More" links render as buttons
  for (const a of anchors)
    if (/^Learn More/.test(a.label) && !a.open.includes("learn-more-btn"))
      issues.push(`Learn More not button-styled: ${a.label}`);

  // Career Development Coaching / Explore Careers open the Coming Soon page
  for (const a of anchors)
    if (
      /^(Career Development Coaching|Explore Careers)$/.test(
        a.label.replace(/\s+/g, " ").trim(),
      ) &&
      a.href !== COMINGSOON
    )
      issues.push(`${a.label} -> ${a.href}`);

  // the strategic heading pair is clickable
  for (const m of html.matchAll(/<h3\b[^>]*>[\s\S]*?<\/h3\s*>/g)) {
    const label = txt(m[0]).replace(/\s+/g, " ").trim();
    if (
      (label === "Career Development" || label === "Coaching") &&
      !m[0].includes("career-link")
    )
      issues.push(`heading "${label}" not linked to ${COMINGSOON}`);
  }

  // contact page carries the clickable contact details
  if (f === "contactus.html") {
    if (!html.includes('href="tel:+917975044149"'))
      issues.push("contact phone link missing");
    if (!html.includes('href="mailto:rajeshkumar.g1881@gmail.com"'))
      issues.push("contact e-mail link missing");
  }

  // image CDNs are warmed up before first paint
  if (!html.includes('rel="preconnect"')) issues.push("no preconnect hints");
  if (f === "getstarted.html" && anchors.some((a) => a.href === PAYMENT))
    issues.push("payment CTA should not appear on Get Started page");

  if (issues.length) {
    problems++;
    warn(`${dir}/${f}: ${issues.join("; ")}`);
  }
}

const existing = new Set(allPages.map(([, f]) => f));
for (const [file, count] of learnTargets) {
  if (!existing.has(file)) {
    problems++;
    warn(`learn-more link target missing: ${file} (used ${count}x)`);
  }
}
if (!existing.has("comingsoon.html")) {
  problems++;
  warn("comingsoon.html missing");
} else {
  const cs = read(path.join(HOME, "comingsoon.html"));
  if (!cs.includes("Opening Soon!")) {
    problems++;
    warn("comingsoon.html: opening-soon heading missing");
  }
  if (!cs.includes("This feature Coming Soon!")) {
    problems++;
    warn("comingsoon.html: coming-soon message missing");
  }
}
log(
  `checked ${allPages.length} pages, ${learnTargets.size} distinct learn-more targets`,
);
log(problems ? `${problems} page(s) need attention` : "all pages verified OK");
