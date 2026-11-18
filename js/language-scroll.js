const STORAGE_KEY = "language-scroll-state";

export function preserveLanguageScroll(win = window, doc = document) {
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
    win.scrollTo({ top: state.scrollY, behavior: "instant" });
  };

  if (doc.readyState === "complete") {
    win.requestAnimationFrame(restore);
  } else {
    win.addEventListener("load", () => win.requestAnimationFrame(restore), { once: true });
  }
}
