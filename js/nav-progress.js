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
  // Keep the primary navigation short. "About" is the umbrella for the
  // reflective sequence that follows the work history: the story, the
  // Le Châtelier lab, and the manifesto. It should stay current across all
  // three instead of losing its underline in the middle of the page.
  const sectionGroups = links
    .map((link) => {
      const id = link.getAttribute("href").slice(1);
      const ids = id === "story" ? ["story", "le-chatelier", "manifesto"] : [id];
      return {
        link,
        sections: ids.map((sectionId) => document.getElementById(sectionId)).filter(Boolean),
      };
    })
    .filter(({ sections }) => sections.length);

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

  // The link whose section spans the reading line is current. Grouped
  // sections inherit the current state of their umbrella navigation link;
  // standalone sections with no link clear the mark.
  function markCurrent() {
    const line = window.innerHeight * READ_LINE;
    const current = sectionGroups.find(({ sections }) => {
      return sections.some((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= line && rect.bottom > line;
      });
    });
    sectionGroups.forEach(({ link }) => {
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
