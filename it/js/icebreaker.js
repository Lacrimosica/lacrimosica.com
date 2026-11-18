/* ---------- Contact icebreaker ----------
 * A Rolodex of playful questions to start an email with. Each visit
 * opens on a random one, and "Surprise me" rolls through several and
 * slows down onto another. The email link opens a short, ready-made
 * message with the question in it, so writing back is easy. The email link carries the
 * current question in its body, so the first line is already written.
 * Without JavaScript the first question and its link still work. */

const QUESTIONS = [
  "Come spremi il dentifricio: dalla fine o dal centro?",
  "Come sbucci una banana: dal gambo o dall'altra estremità?",
  "Con quale mezzo ti identifichi? Autobus notturno? Cargo bike? Traghetto lento?",
  "Qual è il tuo vizio più innocuo?",
  "Quale odore ti rende subito felice?",
  "Quale suono proprio non sopporti?",
  "Dove andrai a stare per un mese, senza fare domande?",
  "Qual è la tua più piccola, grande irritazione?",
  "Qual è il tuo frutto preferito e lo difenderesti in pubblico?",
  "Qual è la tua creatura marina preferita? Il polpo va benissimo.",
  "Quale animale ti ispira meno fiducia?",
  "Carta igienica: sopra o sotto?",
  "Ananas sulla pizza: sì, no o solo di nascosto?",
  "Un hot dog è un panino?",
  "Prima i cereali o prima il latte?",
  "Qual è una piccola cosa in cui sei stranamente bravo?",
  "Quale cibo difenderesti in tribunale?",
  "Se fossi un utensile da cucina, quale saresti?",
  "Qual è la cosa più inutile di cui sai parecchio?",
  "Che canzone suona quando entri in una stanza?",
  "Quale parola ami soltanto per come suona?",
  "Calzini coi sandali: crimine o comfort?",
  "Cosa direbbe di te la tua pianta?",
  "Qual è la cosa più strana che hai mangiato e in segreto apprezzato?",
  "In quale luogo immaginario ti trasferiresti domani?",
  "Finestrino o corridoio, e cosa dice di te?",
  "Qual è una convinzione per cui combatteresti?",
  "Qual è la tua canzone da karaoke, anche se non hai mai cantato?",
  "Che tempo corrisponde alla tua personalità?",
  "Come chiameresti una lumaca domestica?",
  "Colazione a cena o cena a colazione?",
  "Quale superpotere sceglieresti se funzionasse solo il martedì?",
  "Qual è la cosa migliore che hai trovato per strada?",
  "Montagna, mare o una città alle due di notte?",
  "Qual è la tua opinione gastronomica più controversa?",
  "Se la tua vita fosse una colonna sonora, quale strumento la guiderebbe?",
  "Quale oggetto di casa ha più personalità?",
  "Cosa faresti con una domenica completamente libera?",
  "Quale emoji usi troppo spesso?",
  "Tè, caffè o qualcosa che nessuno si aspetta?",
  "Qual è la piccola cosa quotidiana che migliora la tua giornata?",
  "Quale abilità vorresti padroneggiare dall'oggi al domani?",
  "Quale animale sarebbe il più maleducato se potesse parlare?",
  "Qual è il consiglio migliore che hai ignorato?",
  "Piani per un giorno di pioggia: coperta, libro o passeggiata?",
  "A quale gioco eri imbattibile da bambino?",
  "Quale odore ti riporta subito all'infanzia?",
  "Come si chiamerebbe la tua autobiografia?",
];

const box = document.querySelector(".icebreaker");
if (box) start(box);

/** The ready-made email: a greeting, room to say who you are, and the question. */
function emailBody(question) {
  return [
    "Ciao Mômô,",
    "",
    "Ho trovato il tuo sito e volevo salutarti.",
    "",
    "Qualcosa su di me:",
    "",
    `Domanda per rompere il ghiaccio: ${question}`,
    "La mia risposta:",
    "",
    "A presto,",
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
    link.href = `${address}?subject=${encodeURIComponent("Ciao dal tuo sito")}&body=${encodeURIComponent(emailBody(text))}`;
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
