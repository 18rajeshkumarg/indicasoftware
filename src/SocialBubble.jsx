import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Floating social bubble.
 *
 * Rendered by the app shell (see `App.jsx`), so it sits on top of every page
 * the router shows — including the exported documents loaded in their frames.
 *
 * Collapsed it is a single round button in the bottom-left corner. Opened it
 * reveals one icon per social handle, stacked vertically, with the close (X)
 * button at the foot of the stack so it can be dismissed without moving the
 * pointer.
 */

const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    href: "https://instagram.com/indica_software?vrfl=eHBkc2VkbTNzd3I0",
    color: "#e1306c",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/share/19nC91nkrq/",
    color: "#1877f2",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/indicasoftware/",
    color: "#0a66c2",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X (Twitter)",
    href: "https://x.com/indicasoftware_",
    color: "#0f1419",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/IndicaSoftware",
    color: "#229ed9",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    id: "whatsapp-channel",
    label: "WhatsApp Channel",
    href: "https://whatsapp.com/channel/0029Vb8Xii16buMIjzzi3m0I",
    color: "#128c50",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
  },
  {
    id: "whatsapp-community",
    label: "WhatsApp Community",
    href: "https://chat.whatsapp.com/FEYT8ZMWQOTJ1Gyc51GvyB",
    color: "#25d366",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.106 1.523 5.83L0 24l6.335-1.652A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 0 1-4.988-1.364l-.358-.212-3.71.973.99-3.618-.233-.372A9.79 9.79 0 0 1 2.182 12c0-5.42 4.398-9.818 9.818-9.818S21.818 6.58 21.818 12 17.42 21.818 12 21.818zm5.386-7.36c-.295-.148-1.744-.86-2.014-.959-.27-.098-.467-.147-.664.148-.196.296-.762.96-.934 1.157-.172.196-.344.221-.639.074-.295-.148-1.246-.46-2.373-1.466-.877-.782-1.469-1.748-1.641-2.044-.172-.295-.018-.455.13-.602.132-.132.295-.344.443-.516.147-.172.196-.295.295-.492.098-.197.05-.369-.025-.516-.074-.148-.664-1.6-.909-2.19-.24-.575-.484-.497-.664-.506-.172-.008-.369-.01-.566-.01-.196 0-.516.074-.786.369-.27.295-1.032 1.008-1.032 2.46 0 1.451 1.057 2.853 1.204 3.05.148.197 2.08 3.176 5.039 4.454.704.304 1.253.485 1.681.62.707.226 1.35.194 1.858.118.567-.085 1.744-.713 1.99-1.402.246-.688.246-1.279.172-1.402-.074-.123-.27-.197-.566-.345z" />
      </svg>
    ),
  },
];

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="social-bubble__chat-icon"
    >
      <path d="M12 2C6.486 2 2 5.589 2 10c0 2.387 1.24 4.51 3.2 5.925-.13 1.056-.55 2.686-1.55 3.575 0 0 1.86-.14 3.53-1.34C8.42 18.71 10.14 19 12 19c5.514 0 10-3.589 10-8s-4.486-8-10-8zm-4 9a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 8 11zm4 0a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 12 11zm4 0a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 16 11z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
    </svg>
  );
}

export default function SocialBubble() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const firstLinkRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  // Escape closes the bubble; a click anywhere outside it does the same.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  // Move focus into the revealed list so keyboard users land on the links.
  useEffect(() => {
    if (open) firstLinkRef.current?.focus();
  }, [open]);

  return (
    <div
      className={`social-bubble${open ? " social-bubble--open" : ""}`}
      ref={rootRef}
    >
      <ul
        id="social-bubble-menu"
        className="social-bubble__list"
        aria-hidden={!open}
      >
        {SOCIAL_LINKS.map((link, index) => (
          <li key={link.id} className="social-bubble__item">
            <a
              ref={index === 0 ? firstLinkRef : undefined}
              className="social-bubble__link"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              aria-label={link.label}
              tabIndex={open ? 0 : -1}
              style={{ "--social-color": link.color }}
              onClick={close}
            >
              {link.icon}
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="social-bubble__toggle"
        aria-expanded={open}
        aria-controls="social-bubble-menu"
        aria-label={open ? "Close social links" : "Open social links"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="social-bubble__icon-chat">
          <ChatIcon />
        </span>
        <span className="social-bubble__icon-close">
          <CloseIcon />
        </span>
      </button>
    </div>
  );
}
