import { useCallback, useEffect, useRef, useState } from "react";
import SocialBubble from "./SocialBubble";

/**
 * Route table.
 *
 * Keys are the hash routes used by the app, values are the saved page files
 * under `public/`. The base names are unique across both page folders, so a
 * link inside a page can be resolved back to a route by its base name.
 */
const ROUTES = {
  "/": "pages/home/index.html",
  "/services": "pages/home/services.html",
  "/technologies": "pages/home/technologies.html",
  "/casestudies": "pages/home/casestudies.html",
  "/aboutus": "pages/home/aboutus.html",
  "/contactus": "pages/home/contactus.html",
  "/getstarted": "pages/home/getstarted.html",
  "/hiring": "pages/home/hiring.html",
  "/privacypolicy": "pages/home/privacypolicy.html",
  "/comingsoon": "pages/home/comingsoon.html",
  "/itconsulting-learnmore": "pages/learn-more/itconsulting-learnmore.html",
  "/logodesign-learnmore": "pages/learn-more/logodesign-learnmore.html",
  "/technicalsupport-learnmore":
    "pages/learn-more/technicalsupport-learnmore.html",
  "/videoediting-learnmore": "pages/learn-more/videoediting-learnmore.html",
  "/webdesign-learnmore": "pages/learn-more/webdesign-learnmore.html",
  "/fullstack-web-ai-learnmore":
    "pages/learn-more/fullstack-web-ai-learnmore.html",
  "/mobile-app-learnmore": "pages/learn-more/mobile-app-learnmore.html",
  "/ai-automations-learnmore": "pages/learn-more/ai-automations-learnmore.html",
  "/custom-frameworks-learnmore":
    "pages/learn-more/custom-frameworks-learnmore.html",
  "/side-hustle-learnmore": "pages/learn-more/side-hustle-learnmore.html",
};

const ROUTE_BY_FILE = Object.fromEntries(
  Object.entries(ROUTES).map(([route, file]) => [
    file.split("/").pop().toLowerCase(),
    route,
  ]),
);

/**
 * Links that point at pages Gamma never published (they are empty on the live
 * site too). Each one is sent to the closest page that does have content, so a
 * click always lands on something useful instead of a blank document.
 */
const ALIASES = {
  "/interiordesign-learnmore": "/services",
  "/projects": "/getstarted",
  "/contact-support": "/contactus",
};

const ROUTE_LIST = Object.keys(ROUTES);
const DEFAULT_ROUTE = "/";
// Force a fresh exported page document whenever the app shell is reloaded;
// this prevents an already cached iframe from hiding newly published content.
const PAGE_VERSION = Date.now().toString(36);

function resolveRoute(pathname) {
  const route = pathname.replace(/\/+$/, "");
  if (route === "" || route === "/") return DEFAULT_ROUTE;
  if (route in ROUTES) return route;
  if (route in ALIASES) return ALIASES[route];
  return null;
}

function normaliseRoute(hash) {
  let route = hash.replace(/^#/, "").trim();
  if (!route) return DEFAULT_ROUTE;
  try {
    route = decodeURIComponent(route);
  } catch {
    // A malformed escape (for example "#/%") must not crash the app or log an
    // uncaught URIError. Resolve the raw text instead.
  }
  return resolveRoute(route.startsWith("/") ? route : `/${route}`);
}

function readRoute() {
  if (window.location.hash)
    return normaliseRoute(window.location.hash) ?? DEFAULT_ROUTE;

  // Deep link without a hash: "/services" (or a saved page file) opens the
  // matching page instead of silently falling back to the home page.
  const segment = window.location.pathname.split("/").filter(Boolean).pop();
  if (segment) {
    const byPath = resolveRoute(`/${segment}`);
    if (byPath) return byPath;
    const byFile = ROUTE_BY_FILE[segment.toLowerCase()];
    if (byFile) return byFile;
  }
  return DEFAULT_ROUTE;
}

/** Map a link found inside a page to an app route (or null when external). */
function routeForHref(rawHref) {
  if (rawHref == null) return null;
  const href = rawHref.trim();
  if (href === "") return DEFAULT_ROUTE;
  if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  if (href.startsWith("#")) return null;

  const [path] = href.split(/[?#]/);
  // Path-style links ("/services") resolve through the route table too, so
  // they never leave the app and load a second copy of the shell.
  const byPath = resolveRoute(path);
  if (byPath) return byPath;

  // File-style links ("services.html") saved by the extraction.
  const file = path.split("/").pop().toLowerCase();
  return ROUTE_BY_FILE[file] ?? null;
}

/** The Hiring button (and #/hiring) always end up here — same tab, no delay. */
const HIRING_URL =
  "https://18rajeshkumarg.github.io/ZARA-AI-INTERVIEWER/#roles";

/** Same-origin source for a route, honouring Vite's base path. */
function srcFor(route) {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${ROUTES[route]}?page=${PAGE_VERSION}`;
}

function apiUrl(path) {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (apiBase) {
    return new URL(path.replace(/^\//, ""), `${apiBase.replace(/\/+$/, "")}/`);
  }
  // In development the pages live under Vite's base path, but the PHP API is
  // proxied from the site root (`/api`). Resolve against the origin so the
  // `api/...` path is not prefixed with Vite's base (or with `/api` again).
  if (import.meta.env.DEV) {
    return new URL(path.replace(/^\//, ""), `${window.location.origin}/`);
  }
  const base = import.meta.env.BASE_URL || "/";
  return new URL(`${base}${path.replace(/^\//, "")}`, window.location.href);
}

function textElement(doc, tag, value, className = "") {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  node.textContent = value ?? "";
  return node;
}

function renderCaseStudies(doc, root, items) {
  const list = root.querySelector("[data-indica-content-list]");
  if (!list) return;
  list.replaceChildren();
  if (!items.length) {
    list.append(
      textElement(
        doc,
        "p",
        "Case studies are being updated. Please check back soon.",
      ),
    );
    return;
  }
  for (const item of items) {
    const card = doc.createElement("article");
    card.className = "indica-managed-card";
    if (item.image) {
      const image = doc.createElement("img");
      image.className = "indica-content-image";
      image.src = apiUrl(
        `api/media.php?name=${encodeURIComponent(item.image)}`,
      ).href;
      image.alt = `${item.company || "Client"} project`;
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      card.append(image);
    }
    card.append(textElement(doc, "h3", item.title || item.company));
    card.append(textElement(doc, "p", item.company, "indica-case-company"));
    if (item.profile) card.append(textElement(doc, "p", item.profile));
    if (item.description) card.append(textElement(doc, "p", item.description));
    if (item.services)
      card.append(textElement(doc, "p", `Services: ${item.services}`));
    if (item.website) {
      try {
        const url = new URL(item.website);
        if (url.protocol === "https:" || url.protocol === "http:") {
          const link = doc.createElement("a");
          link.href = url.href;
          link.rel = "noopener noreferrer";
          link.textContent = "Visit client website";
          card.append(link);
        }
      } catch {
        // Invalid optional website URLs are omitted from the public card.
      }
    }
    list.append(card);
  }
}

function renderTestimonials(doc, root, items) {
  const list = root.querySelector("[data-indica-content-list]");
  if (!list) return;
  // The exported page templates include an unused three-column layout directly
  // after Reviews. Remove that placeholder layout so it cannot render as empty cards.
  const followsReviews =
    doc.defaultView?.Node?.DOCUMENT_POSITION_FOLLOWING ?? 4;
  for (const layout of doc.querySelectorAll(".node-smartLayout")) {
    if (!(root.compareDocumentPosition(layout) & followsReviews)) continue;
    const cells = [...layout.querySelectorAll(".node-smartLayoutCell")];
    if (cells.length === 3 && cells.every((cell) => !cell.textContent.trim())) {
      layout.remove();
    }
  }
  list.replaceChildren();
  if (!items.length) {
    list.append(
      textElement(
        doc,
        "p",
        "Client reviews are being updated. Please check back soon.",
      ),
    );
    return;
  }
  for (const item of items) {
    const card = doc.createElement("article");
    card.className = "indica-managed-card";
    const rating = Math.min(5, Math.max(1, Number(item.rating) || 0));
    const stars = textElement(
      doc,
      "p",
      "★".repeat(Math.round(rating)),
      "indica-stars",
    );
    stars.setAttribute("aria-label", `${rating.toFixed(1)} out of 5 stars`);
    card.append(stars);
    card.append(
      textElement(doc, "p", `${rating.toFixed(1)} / 5.0`, "indica-rating"),
    );
    card.append(textElement(doc, "blockquote", `“${item.quote || ""}”`));
    card.append(textElement(doc, "strong", item.client || "Client"));
    const attribution = [item.role, item.company].filter(Boolean).join(" · ");
    if (attribution)
      card.append(textElement(doc, "p", attribution, "indica-case-company"));
    list.append(card);
  }
}

async function loadManagedContent(doc, route) {
  const requests = [];
  // Replace the static export snapshot with the current admin-published data.
  // If the API is offline or not connected yet, clear the stale snapshot so
  // old sample copy and broken uploaded-image paths are never left on screen.
  const fetchManagedItems = async (type) => {
    const url = apiUrl(`api/content.php?type=${encodeURIComponent(type)}`);
    // Always request the latest admin-published content, even when a browser
    // or local proxy has cached an earlier response.
    url.searchParams.set("_", Date.now().toString());
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok)
      throw new Error(`Content request failed (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data.items))
      throw new Error("Invalid content response.");
    return data.items;
  };
  // Every exported route that contains these managed blocks reads the same
  // published admin content, including each Learn More page.
  const caseRoot = doc.querySelector("[data-indica-case-studies]");
  const reviewRoot = doc.querySelector("[data-indica-testimonials]");
  if (caseRoot)
    requests.push(
      fetchManagedItems("case-studies")
        .then((items) => renderCaseStudies(doc, caseRoot, items))
        .catch(() => renderCaseStudies(doc, caseRoot, [])),
    );
  if (reviewRoot)
    requests.push(
      fetchManagedItems("testimonials")
        .then((items) => renderTestimonials(doc, reviewRoot, items))
        .catch(() => renderTestimonials(doc, reviewRoot, [])),
    );
  if (route === "/contactus") {
    const form = doc.querySelector("[data-indica-inquiry-form]");
    if (form && !form.dataset.bound) {
      form.dataset.bound = "true";
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = form.querySelector("[type=submit]");
        const status = form.querySelector("[data-indica-form-status]");
        const fields = new FormData(form);
        const payload = {
          company_name: fields.get("company_name"),
          mobile_number: fields.get("mobile_number"),
          services: fields.getAll("services[]"),
          query: fields.get("query"),
          website: fields.get("website"),
        };
        if (submit) submit.disabled = true;
        if (status) {
          status.textContent = "Sending your query…";
          status.dataset.state = "";
        }
        try {
          const response = await fetch(apiUrl("api/inquiry.php"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Unable to send your query.");
          if (status) {
            status.textContent =
              result.message || "Your query has been received.";
            status.dataset.state = "success";
          }
          form.reset();
        } catch (error) {
          if (status) {
            status.textContent =
              error.message || "Unable to send your query. Please try again.";
            status.dataset.state = "error";
          }
        } finally {
          if (submit) submit.disabled = false;
        }
      });
    }
  }
  await Promise.allSettled(requests);
}

export default function App() {
  // `hash` travels with the route so that every hash change re-renders, even
  // when the resolved route itself does not change (e.g. 404 -> home).
  const [nav, setNav] = useState(() => ({
    route: readRoute(),
    hash: window.location.hash,
  }));
  const { route, hash } = nav;
  const [mounted, setMounted] = useState(() => new Set([readRoute()]));
  const [ready, setReady] = useState(() => new Set());
  const [titles, setTitles] = useState({});
  const [lastPainted, setLastPainted] = useState(null);
  const [failed, setFailed] = useState(null);

  // Live snapshot for background jobs (preloader, timeouts).
  const stateRef = useRef(null);
  stateRef.current = { route, mounted, ready, failed };

  const frames = useRef(new Map()); // route -> iframe element
  const watched = useRef(new Set());
  const freshNav = useRef(null);
  const actions = useRef({});

  const pinPageNavbar = (doc) => {
    const nav = doc.querySelector('[data-navbar-editor="true"]');
    const shell = nav?.parentElement;
    if (!shell) return;

    const menu = nav.querySelector('[data-node-view-content-inner="navbar"]');
    const header = nav.querySelector(".navbar-view-content");
    if (menu && header && !header.querySelector(".indica-mobile-nav-toggle")) {
      menu.id = "indica-mobile-navigation";
      menu.setAttribute("aria-hidden", "true");

      const toggle = doc.createElement("button");
      toggle.type = "button";
      toggle.className = "indica-mobile-nav-toggle";
      toggle.setAttribute("aria-controls", menu.id);
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      for (let line = 0; line < 3; line += 1) {
        toggle.append(doc.createElement("span"));
      }

      const logo = header.querySelector(":scope > a.chakra-link");
      if (logo) logo.after(toggle);
      else header.prepend(toggle);

      const closeMenu = (restoreFocus = false) => {
        nav.classList.remove("indica-mobile-menu-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation menu");
        menu.setAttribute("aria-hidden", "true");
        if (restoreFocus) toggle.focus();
      };

      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") !== "true";
        nav.classList.toggle("indica-mobile-menu-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute(
          "aria-label",
          open ? "Close navigation menu" : "Open navigation menu",
        );
        menu.setAttribute("aria-hidden", String(!open));
      });
      menu.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) closeMenu();
      });
      doc.addEventListener("pointerdown", (event) => {
        if (
          nav.classList.contains("indica-mobile-menu-open") &&
          !nav.contains(event.target)
        )
          closeMenu();
      });
      doc.addEventListener("keydown", (event) => {
        if (
          event.key === "Escape" &&
          nav.classList.contains("indica-mobile-menu-open")
        )
          closeMenu(true);
      });
      doc.defaultView?.addEventListener("resize", () => {
        if (doc.defaultView.innerWidth > 704) closeMenu();
      });
    }

    for (const [property, value] of Object.entries({
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      width: "100%",
      zIndex: "1002",
    })) {
      shell.style.setProperty(
        property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
        value,
        "important",
      );
    }
  };

  /** Mount a page's frame if it is not mounted yet (idempotent). */
  const ensureMounted = useCallback((next) => {
    setMounted((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
  }, []);

  const markReady = useCallback((next) => {
    setReady((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    setFailed((prev) => (prev === next ? null : prev));
  }, []);

  const navigate = useCallback(
    (next) => {
      ensureMounted(next);
      freshNav.current = next;
      if (`#${next}` === window.location.hash) {
        setNav({ route: next, hash: window.location.hash });
        return;
      }
      window.location.hash = next;
    },
    [ensureMounted],
  );

  actions.current = { navigate, ensureMounted };

  /* --- hash routing ---------------------------------------------------- */
  useEffect(() => {
    const onHashChange = () => {
      const next = normaliseRoute(window.location.hash);
      const target = next ?? DEFAULT_ROUTE;
      if (next === null) freshNav.current = null; // unknown hash: 404 panel
      ensureMounted(target);
      setNav({ route: target, hash: window.location.hash });
      setFailed(null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [ensureMounted]);

  /* --- #/hiring jumps to the ZARA interviewer immediately --------------- */
  useEffect(() => {
    if (route !== "/hiring") return;
    try {
      window.top.location.replace(HIRING_URL);
    } catch {
      window.location.replace(HIRING_URL);
    }
  }, [route]);

  /* --- frame wiring ---------------------------------------------------- */
  const bindDocument = useCallback((doc, next) => {
    // Pin the overlay shell itself; exported pages place the navbar inside an
    // absolutely positioned shell, which prevents sticky positioning.
    pinPageNavbar(doc);
    if (doc.__indicaBound) return;
    doc.__indicaBound = true;

    doc.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0) return;

      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;

      const href = (anchor.getAttribute("href") || "").trim();
      // In-page anchors and mail/tel links keep their native behaviour.
      if (!href || href.startsWith("#") || /^(mailto:|tel:)/i.test(href))
        return;

      const target = routeForHref(href);
      const external = /^(https?:)?\/\//i.test(href);
      if (!target && !external) return; // javascript:/data: links

      // Everything is intercepted — even with modifier keys — so the whole
      // site runs in one tab and never spawns another one.
      event.preventDefault();
      if (target) {
        actions.current.navigate(target);
        return;
      }
      // External link: navigate the top window. Letting the iframe follow it
      // would either be blocked (X-Frame-Options) or lose the app behind it.
      try {
        window.top.location.href = href;
      } catch {
        window.location.href = href;
      }
    });

    // Warm the target page the moment a link is pointed at, so the click
    // that follows finds it already loaded.
    doc.addEventListener("mouseover", (event) => {
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;
      const target = routeForHref(anchor.getAttribute("href"));
      if (target) actions.current.ensureMounted(target);
    });

    loadManagedContent(doc, next);
  }, []);

  /**
   * A frame is usable as soon as its document is parsed (`interactive`):
   * no need to wait for remote images, so the swap never shows a blank page.
   */
  const attachFrame = useCallback(
    (el) => {
      const next = el?.dataset?.route;
      if (!el) {
        if (next) {
          frames.current.delete(next);
          watched.current.delete(next);
        }
        return;
      }

      frames.current.set(next, el);
      if (watched.current.has(next)) return;
      watched.current.add(next);

      let settled = false;
      let pollId = 0;
      const guardId = window.setTimeout(
        () => window.clearInterval(pollId),
        60000,
      );

      const trySettle = () => {
        if (settled) return true;
        let doc = null;
        try {
          doc = el.contentDocument;
        } catch {
          return true; // cross-origin: nothing else to do
        }
        if (!doc) return false;
        if (doc.readyState === "loading") return false;
        if (/^about:blank/i.test(doc.URL || "")) return false; // initial empty doc

        settled = true;
        window.clearInterval(pollId);
        window.clearTimeout(guardId);
        bindDocument(doc, next);
        if (doc.title) {
          setTitles((prev) =>
            prev[next] === doc.title ? prev : { ...prev, [next]: doc.title },
          );
        }
        markReady(next);
        return true;
      };

      el.addEventListener("load", trySettle);
      pollId = window.setInterval(trySettle, 25);
      trySettle();

      return () => {
        window.clearInterval(pollId);
        window.clearTimeout(guardId);
        watched.current.delete(next);
        frames.current.delete(next);
      };
    },
    [bindDocument, markReady],
  );

  /* --- which frame is on screen ---------------------------------------- */
  const painted = ready.has(route) ? route : lastPainted;

  useEffect(() => {
    if (ready.has(route) && lastPainted !== route) setLastPainted(route);
  }, [route, ready, lastPainted]);

  // Keep the browser tab title in sync with the visible page.
  useEffect(() => {
    const title = titles[painted];
    if (title) document.title = title;
  }, [painted, titles]);

  // Keep the active route in sync when an admin saves or publishes an entry.
  // Polling is deliberately slow: the previous 2-second interval made two
  // requests every two seconds for as long as a managed page stayed open and
  // could fill the console with network errors whenever the API was offline.
  useEffect(() => {
    if (!ready.has(route)) return;
    const doc = frames.current.get(route)?.contentDocument;
    if (
      !doc?.querySelector(
        "[data-indica-case-studies], [data-indica-testimonials]",
      )
    )
      return;
    let lastRefresh = 0;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastRefresh < 15000) return;
      lastRefresh = now;
      const activeDoc = frames.current.get(route)?.contentDocument;
      if (activeDoc) loadManagedContent(activeDoc, route);
    };
    // Admin saves are reflected within a minute, or immediately when the
    // visitor returns to the tab.
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [route, ready]);

  // A freshly requested page starts at the top; history visits keep their scroll.
  useEffect(() => {
    if (!ready.has(route) || freshNav.current !== route) return;
    freshNav.current = null;
    try {
      frames.current.get(route)?.contentWindow?.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
  }, [route, ready]);

  // Only if a page genuinely fails to arrive (never during a normal visit).
  useEffect(() => {
    if (ready.has(route) || failed) return;
    const id = window.setTimeout(() => {
      if (!stateRef.current.ready.has(stateRef.current.route)) setFailed(route);
    }, 20000);
    return () => window.clearTimeout(id);
  }, [route, ready, failed]);

  /* --- warm only pages the visitor is about to open -------------------- */
  // bindDocument mounts a same-origin route on pointer hover. Loading every
  // route after startup fetched hundreds of megabytes of page markup and
  // images in the background, competing with the page being viewed.

  /* --- render ----------------------------------------------------------- */
  const knownRoute = normaliseRoute(hash) !== null;
  const showFailure = knownRoute && failed === route && !ready.has(route);

  // Frames stay mounted even while the not-found panel is showing, so closing
  // it is instant and no page ever has to load twice.
  return (
    <div className="app">
      {[...mounted].map((next) => (
        <iframe
          key={`${next}-${PAGE_VERSION}`}
          ref={attachFrame}
          data-route={next}
          className={`app-frame${next === painted ? " app-frame--shown" : ""}`}
          src={srcFor(next)}
          title={titles[next] || `Indica Software — ${next}`}
        />
      ))}

      {showFailure && (
        <div className="app-status app-status--missing" role="alert">
          <h1>This page did not load</h1>
          <p>
            The address <code>{hash}</code> could not be opened. Check your
            connection and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              const el = frames.current.get(route);
              setFailed(null);
              if (el) el.src = srcFor(route);
            }}
          >
            Reload this page
          </button>
        </div>
      )}

      {!knownRoute && (
        <div className="app-status app-status--missing" role="alert">
          <h1>Page not found</h1>
          <p>
            The address <code>{hash}</code> does not match a page in this site.
          </p>
          <button type="button" onClick={() => navigate(DEFAULT_ROUTE)}>
            Go to the home page
          </button>
        </div>
      )}

      <SocialBubble />
    </div>
  );
}
