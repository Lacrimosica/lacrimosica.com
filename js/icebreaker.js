/* ---------- Contact icebreaker ----------
 * A Rolodex of playful questions to start an email with. Each visit
 * opens on a random one, and "Surprise me" rolls through several and
 * slows down onto another. The email link opens a short, ready-made
 * message with the question in it, so writing back is easy. The email link carries the
 * current question in its body, so the first line is already written.
 * Without JavaScript the first question and its link still work. */

const QUESTIONS = [
  "How do you squeeze the toothpaste: from the end, or from the middle?",
  "How do you peel a banana: from the stem, or from the other end?",
  "What kind of vehicle do you identify as? Night bus? Cargo bike? Slow ferry?",
  "What's your most harmless guilty pleasure?",
  "What's a smell that makes you instantly happy?",
  "What's a sound you absolutely cannot stand?",
  "Where would you go and stay for a month, no questions asked?",
  "What's your pettiest pet peeve?",
  "Favourite fruit, and would you defend it in public?",
  "Favourite sea creature? (Octopus is a valid answer.)",
  "Which animal do you trust the least?",
  "Toilet roll: over or under?",
  "Pineapple on pizza: yes, no, or only in secret?",
  "Is a hot dog a sandwich?",
  "Cereal first, or milk first?",
  "What's a small thing you're weirdly good at?",
  "Which food would you defend in court?",
  "If you were a kitchen utensil, which one would you be?",
  "What's the most useless thing you know a lot about?",
  "Which song plays when you walk into a room?",
  "What's a word you love just for how it sounds?",
  "Socks with sandals: crime or comfort?",
  "What would your houseplant say about you?",
  "What's the strangest thing you've eaten and secretly enjoyed?",
  "Which fictional place would you move to tomorrow?",
  "Window seat or aisle, and what does that say about you?",
  "What's a hill you would happily die on?",
  "What's your go-to karaoke song, even if you've never sung it?",
  "Which weather matches your personality?",
  "What would you name a pet snail?",
  "Breakfast for dinner, or dinner for breakfast?",
  "Which superpower would you choose if it only worked on Tuesdays?",
  "What's the best thing you've ever found on the street?",
  "Mountains, sea, or a city at 2 a.m.?",
  "What's your most controversial food opinion?",
  "If your life had a theme tune, what instrument leads it?",
  "Which object in your home has the most personality?",
  "What would you do with a free, completely empty Sunday?",
  "Which emoji do you use way too much?",
  "Tea, coffee, or something nobody expects?",
  "What's a tiny everyday thing that makes your day better?",
  "If you could master any skill overnight, what would it be?",
  "Which animal would be the rudest if it could talk?",
  "What's the best advice you've ever ignored?",
  "Rainy day plans: blanket, book, or long walk?",
  "What's a game you were unbeatable at as a kid?",
  "Which smell takes you straight back to childhood?",
  "What would your autobiography be called?",
];

const box = document.querySelector(".icebreaker");
if (box) start(box);

/** The ready-made email: a greeting, room to say who you are, and the question. */
function emailBody(question) {
  return [
    "Hi Mômô,",
    "",
    "I came across your website and wanted to say hello.",
    "",
    "A little about me: ",
    "",
    `Icebreaker: ${question}`,
    "My answer: ",
    "",
    "Talk soon,",
    "",
  ].join("\n");
}

function start(root) {
  const windowEl = root.querySelector(".icebreaker-question");
  const shuffle = root.querySelector(".icebreaker-shuffle");
  const link = document.querySelector(".contact-link");
  const address = link.getAttribute("href").split("?")[0];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const n = QUESTIONS.length;

  // Screen readers hear the settled question, not the roll.
  const announce = document.createElement("span");
  announce.className = "visually-hidden";
  announce.setAttribute("aria-live", "polite");
  windowEl.removeAttribute("aria-live");
  windowEl.setAttribute("aria-hidden", "true");
  windowEl.textContent = "";
  windowEl.classList.add("is-rolodex");
  windowEl.after(announce);

  const items = QUESTIONS.map((text) => {
    const item = document.createElement("span");
    item.className = "icebreaker-item";
    item.textContent = text;
    windowEl.append(item);
    return item;
  });

  let pos = Math.floor(Math.random() * n); // a different question every visit
  let height = 0;
  let spinning = false;

  const measure = () => {
    height = Math.max(...items.map((item) => item.offsetHeight));
    windowEl.style.height = `${height}px`;
  };

  const render = () => {
    items.forEach((item, i) => {
      let d = (((i - pos) % n) + n) % n; // wrap so the list loops
      if (d > n / 2) d -= n;
      item.style.transform = `translateY(${d * height}px)`;
      item.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 1.2));
    });
  };

  const settle = () => {
    const text = QUESTIONS[((Math.round(pos) % n) + n) % n];
    announce.textContent = text;
    link.href = `${address}?subject=${encodeURIComponent("Hello from your website")}&body=${encodeURIComponent(emailBody(text))}`;
  };

  const spin = () => {
    if (spinning) return;
    const from = pos;
    const to = Math.round(pos) + 4 + Math.floor(Math.random() * (n - 5));
    if (reducedMotion.matches) {
      pos = to;
      render();
      settle();
      return;
    }
    spinning = true;
    const duration = 900 + Math.min(1200, (to - from) * 35);
    const began = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - (1 - t) ** 4; // fast first, then slows onto the question
      pos = from + (to - from) * eased;
      render();
      if (t < 1) requestAnimationFrame(frame);
      else {
        spinning = false;
        settle();
      }
    };
    requestAnimationFrame(frame);
  };

  shuffle.hidden = false;
  shuffle.addEventListener("click", spin);
  window.addEventListener("resize", () => {
    measure();
    render();
  });
  measure();
  render();
  settle();
}
