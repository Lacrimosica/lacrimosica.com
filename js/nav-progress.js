/* ---------- Pinned header ----------
 * The header stays on screen. After a little scrolling it shrinks, the link
 * for the section you are reading is marked, and a thin bar along its bottom
 * edge fills as the page scrolls. */

const COMPACT_AFTER = 24; // px scrolled before the header shrinks
const READ_LINE = 0.35; // a section is current while it spans this share of the screen height

const header = document.querySelector(".site-header");
if (header) start(header);

function start(header) {
  const links = Array.from(header.querySelectorAll('nav a[href^="#"]'));
  const sections = links
    .map((link) => ({ link, section: document.getElementById(link.getAttribute("href").slice(1)) }))
    .filter((item) => item.section);

  const bar = document.createElement("div");
  bar.className = "nav-progress";
  bar.setAttribute("aria-hidden", "true");
  header.append(bar);

  function scrollShare() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  function updateProgress() {
    bar.style.transform = `scaleX(${scrollShare()})`;
  }

  // The link whose section spans the reading line is current. Sections that
  // have no link in the header (the lab, manifesto, contact) clear the mark.
  function markCurrent() {
    const line = window.innerHeight * READ_LINE;
    const current = sections.find(({ section }) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= line && rect.bottom > line;
    });
    sections.forEach(({ link }) => {
      if (link === current?.link) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  let frame = 0;
  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      header.classList.toggle("is-compact", window.scrollY > COMPACT_AFTER);
      updateProgress();
      markCurrent();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}
