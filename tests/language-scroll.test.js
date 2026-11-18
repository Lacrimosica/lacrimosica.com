import { test } from "node:test";
import assert from "node:assert/strict";
import { preserveLanguageScroll } from "../js/language-scroll.js";

function makeBrowser({ pathname, scrollY, link }) {
  const values = new Map();
  const win = {
    location: { origin: "https://lacrimosica.com", pathname, href: `https://lacrimosica.com${pathname}` },
    scrollY,
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    requestAnimationFrame: (callback) => callback(),
    scrollTo: (position) => {
      win.scrollY = position.top;
      win.scrollBehavior = position.behavior;
    },
    addEventListener: () => {},
  };
  const doc = {
    readyState: "complete",
    documentElement: { style: { scrollBehavior: "smooth" } },
    querySelectorAll: (selector) => {
      if (selector === ".nav-language") return link ? [link] : [];
      return [];
    },
  };

  return { win, doc, values };
}

test("language switch restores the exact scroll offset instantly", () => {
  let clickHandler;
  const link = {
    href: "https://lacrimosica.com/it/",
    target: "",
    addEventListener: (_event, handler) => {
      clickHandler = handler;
    },
  };
  const source = makeBrowser({
    pathname: "/",
    scrollY: 1200,
    link,
  });

  preserveLanguageScroll(source.win, source.doc);
  clickHandler({
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  });

  const destination = makeBrowser({
    pathname: "/it/",
    scrollY: 0,
  });
  for (const [key, value] of source.values) {
    destination.values.set(key, value);
  }

  preserveLanguageScroll(destination.win, destination.doc);

  assert.equal(destination.win.scrollY, 1200);
  assert.equal(destination.win.scrollBehavior, "instant");
  assert.equal(destination.doc.documentElement.style.scrollBehavior, "smooth");
  assert.equal(destination.values.size, 0);
});

test("modified language-link clicks do not change the current tab's saved position", () => {
  let clickHandler;
  const link = {
    href: "https://lacrimosica.com/it/",
    target: "",
    addEventListener: (_event, handler) => {
      clickHandler = handler;
    },
  };
  const browser = makeBrowser({ pathname: "/", scrollY: 1000, link });

  preserveLanguageScroll(browser.win, browser.doc);
  clickHandler({
    defaultPrevented: false,
    button: 0,
    metaKey: true,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  });

  assert.equal(browser.values.size, 0);
});
