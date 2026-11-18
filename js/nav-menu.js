/* ---------- Mobile menu ----------
 * Below 700px the header links fold into a menu behind the toggle button.
 * The CSS decides when the toggle and the menu show; this script only
 * keeps aria-expanded and the open class in step, and closes the menu when
 * a link is chosen, Escape is pressed, the page is tapped elsewhere, or the
 * screen grows back to desktop width. */

const MOBILE_MENU = window.matchMedia("(max-width: 700px)");
const OPEN_CLASS = "is-menu-open";

const header = document.querySelector(".site-header");
const toggle = header?.querySelector(".nav-toggle");
const nav = header?.querySelector("nav");

if (header && toggle && nav) {
  const isOpen = () => header.classList.contains(OPEN_CLASS);

  function setOpen(open) {
    header.classList.toggle(OPEN_CLASS, open);
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => setOpen(!isOpen()));

  nav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && !header.contains(event.target)) setOpen(false);
  });

  MOBILE_MENU.addEventListener("change", (event) => {
    if (!event.matches) setOpen(false);
  });
}
