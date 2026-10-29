(() => {
  const list = document.querySelector("[data-inquiry-list]");
  if (!list) return;

  const count = document.querySelector("#inquiry-count");
  const csrf = list.dataset.csrf || "";
  const known = new Set(
    [...list.querySelectorAll("[data-inquiry-id]")].map(
      (item) => item.dataset.inquiryId,
    ),
  );
  let lastSeenId =
    list.querySelector("[data-inquiry-id]")?.dataset.inquiryId || "";

  function addText(parent, tag, value) {
    const node = document.createElement(tag);
    node.textContent = value || "";
    parent.append(node);
    return node;
  }

  function buildInquiry(item) {
    const article = document.createElement("article");
    article.className = "inquiry";
    article.dataset.inquiryId = item.id || "";
    addText(article, "strong", item.company_name || "Inquiry");
    article.append(document.createTextNode(" · "));

    const phone = document.createElement("a");
    phone.href = `tel:${String(item.mobile_number || "").replace(/[^+0-9]/g, "")}`;
    phone.textContent = item.mobile_number || "No phone number";
    article.append(phone, document.createElement("br"));

    const services = Array.isArray(item.services)
      ? item.services.join(", ")
      : "";
    addText(
      article,
      "small",
      `${item.created_at || ""} · ${services} · Page ${item.page || ""}`,
    );
    addText(article, "p", item.query || "");

    const device =
      item.device && typeof item.device === "object" ? item.device : {};
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.append(
      document.createTextNode(
        `Device: ${device.platform || "Unknown"} · Screen ${device.screen || "Unknown"} · Viewport ${device.viewport || "Unknown"} · ${device.language || ""} · ${device.timezone || ""}`,
      ),
      document.createElement("br"),
      document.createTextNode(
        `Browser: ${device.user_agent || "Not available"}`,
      ),
    );
    article.append(meta);

    const form = document.createElement("form");
    form.method = "post";
    for (const [name, value] of [
      ["_csrf", csrf],
      ["action", "delete_inquiry"],
      ["id", item.id || ""],
    ]) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.append(input);
    }
    const button = document.createElement("button");
    button.type = "submit";
    button.className = "danger";
    button.textContent = "Delete inquiry";
    form.append(button);
    confirmDelete(form);
    article.append(form);
    return article;
  }

  function confirmDelete(form) {
    form.addEventListener("submit", (event) => {
      if (!window.confirm("Delete this inquiry? This cannot be undone.")) {
        event.preventDefault();
      }
    });
  }

  list
    .querySelectorAll('form input[name="action"][value="delete_inquiry"]')
    .forEach((input) => {
      const form = input.closest("form");
      if (form) confirmDelete(form);
    });

  async function refreshInquiries() {
    const url = new URL("/admin/inquiries.php", window.location.origin);
    if (lastSeenId) url.searchParams.set("after_id", lastSeenId);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const data = await response.json();
      const incoming = Array.isArray(data.items) ? data.items : [];
      for (const item of incoming.reverse()) {
        if (!item.id || known.has(item.id)) continue;
        list.querySelector("[data-empty-inquiries]")?.remove();
        list.prepend(buildInquiry(item));
        known.add(item.id);
      }
      if (incoming.length) lastSeenId = incoming.at(-1).id || lastSeenId;
      if (count && Number.isInteger(data.count))
        count.textContent = String(data.count);
    } catch {
      // Keep the current list available during brief API interruptions.
    }
  }

  window.setInterval(refreshInquiries, 30000);
})();
