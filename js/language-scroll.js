const STORAGE_KEY = "language-scroll-state";

export function preserveLanguageScroll(win = window, doc = document) {
  // The browser otherwise restores a cross-document navigation at the top,
  // then our delayed correction visibly jumps to the saved position.
  if (win.history) win.history.scrollRestoration = "manual";

  for (const link of doc.querySelectorAll(".nav-language")) {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        (link.target && link.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(link.href, win.location.href);
      if (destination.origin !== win.location.origin) return;

      win.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pathname: destination.pathname,
          scrollY: win.scrollY,
        })
      );
    });
  }

  const saved = win.sessionStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  win.sessionStorage.removeItem(STORAGE_KEY);

  let state;
  try {
    state = JSON.parse(saved);
  } catch (error) {
    console.warn("Could not restore scroll position after language change.", error);
    return;
  }

  if (
    !state ||
    typeof state !== "object" ||
    state.pathname !== win.location.pathname ||
    !Number.isFinite(state.scrollY)
  ) {
    return;
  }

  const restore = () => {
    // The site uses smooth scrolling globally. Temporarily opt out so this
    // restoration is a single synchronous reposition, not an animation.
    const previousBehavior = doc.documentElement.style.scrollBehavior;
    doc.documentElement.style.scrollBehavior = "auto";
    win.scrollTo({ top: state.scrollY, behavior: "instant" });
    doc.documentElement.style.scrollBehavior = previousBehavior;
  };

  // Run before the first paint. If the document was not fully laid out yet,
  // only correct again when the browser actually clamped the requested value.
  restore();

  if (doc.readyState !== "complete") {
    win.addEventListener("load", () => {
      win.requestAnimationFrame(() => {
        if (Math.abs(win.scrollY - state.scrollY) > 1) restore();
      });
    }, { once: true });
  }
}
