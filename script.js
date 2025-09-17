// ===============================
// note: might want to swap sprites to official artwork later
// ===============================

// ----- DOM -----
// grab the key UI bits once so we don’t keep querying the DOM on every click
const board = document.getElementById("board");
const timeEl = document.getElementById("time");
const newBtn = document.getElementById("newGameBtn");

// ----- Game settings & state -----
// small 4x4 grid — easy to adjust later if we want difficulty settings
const GRID_SIZE = 16; // 4x4
const PAIRS = GRID_SIZE / 2; // 8

// runtime state holders
let deck = []; // 16 items: [{ key, imgUrl }, ...]
let firstCard = null;
let secondCard = null;
let lockBoard = false; // guard to avoid double clicking during animations
let matchedCount = 0; // counts cards, not pairs

// ----- Timer -----
// lightweight timer — updates the display every 250ms
let timerId = null;
let startTime = null;

function fmt(sec) {
  // format seconds as mm:ss (zero-padded)
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}
function startTimer() {
  if (timerId) return; // already running
  startTime = Date.now();
  timerId = setInterval(() => {
    timeEl.textContent = fmt((Date.now() - startTime) / 1000);
  }, 250);
}
function stopTimer() {
  if (!timerId) return; // not running
  clearInterval(timerId);
  timerId = null;
}

// ----- PokeAPI (simple) -----
// minimal fetch — keep it simple and resilient
async function fetchPokemonSprite(id) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) throw new Error("PokeAPI error");
  const data = await res.json();
  // Prefer official artwork; fallback to regular front sprite
  return (
    data?.sprites?.other?.["official-artwork"]?.front_default ||
    data?.sprites?.front_default
    //data?.sprites
      //?.front_default /* makes the tiny and pixelated, especially when stretched*/
  );
}

async function getPokemonFaces(count = 8) {
  // pick unique ids from 1..151 (Gen 1)
  const ids = new Set();
  while (ids.size < count) ids.add(1 + Math.floor(Math.random() * 151));
  const list = Array.from(ids);

  // fetch in parallel (faster than serial)
  const urls = await Promise.all(list.map((id) => fetchPokemonSprite(id)));
  // if any missing, treat as failure so we can warn the user
  if (urls.some((u) => !u)) throw new Error("Missing sprite");

  // map urls back to a stable key so matching uses data-key, not DOM refs
  return urls.map((url, i) => ({ key: `poke-${list[i]}`, imgUrl: url }));
}

// ----- Build & shuffle deck -----
// Fisher–Yates shuffle — unbiased and quick for small arrays
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function buildDeck() {
  const faces = await getPokemonFaces(PAIRS); // 8 unique faces
  const pairs = faces.flatMap((f) => [{ ...f }, { ...f }]); // duplicate → 16
  return shuffle(pairs);
}

// ----- Rendering -----
// tiny helper that builds the DOM for a single card
function cardElement(card, index) {
  // <div class="memory-card" data-key="...">
  //   <img class="front-face" src="pokemon" alt="Pokémon">
  //   <img class="back-face"  src="back.png" alt="Hidden">
  // </div>
  const el = document.createElement("div");
  el.className = "memory-card";
  el.dataset.key = card.key;
  el.dataset.index = String(index);
  el.tabIndex = 0; // focusable

  const front = document.createElement("img");
  front.className = "front-face";
  front.src = card.imgUrl;
  front.alt = "Pokémon";
  front.loading = "lazy"; // small perf win

  const back = document.createElement("img");
  back.className = "back-face";
  back.src = "img/back.png"; // <-- static image file in same folder
  back.alt = "Hidden";

  el.appendChild(front);
  el.appendChild(back);
  el.addEventListener("click", onCardClick); // click-to-flip
  return el;
}

function renderBoard() {
  // clear and re-render (simple and safe given the small grid size)
  board.innerHTML = "";
  deck.forEach((card, i) => board.appendChild(cardElement(card, i)));
}

// ----- Game logic -----
// main click handler — handles both first and second flip paths
function onCardClick(e) {
  const cardEl = e.currentTarget;
  if (lockBoard) return; // prevent spam during animations
  if (cardEl.classList.contains("flip")) return; // ignore already flipped

  if (!timerId) startTimer(); // start on first user action
  cardEl.classList.add("flip");

  if (!firstCard) {
    firstCard = cardEl; // store and wait for second click
    return;
  }

  // we have two cards now
  secondCard = cardEl;
  lockBoard = true;

  const isMatch = firstCard.dataset.key === secondCard.dataset.key;
  if (isMatch) {
    // matched pair — disable further clicks on these two
    firstCard.removeEventListener("click", onCardClick);
    secondCard.removeEventListener("click", onCardClick);
    matchedCount += 2;
    resetTurn();
    checkWin();
  } else {
    // no match — brief delay so the player sees the second card
    setTimeout(() => {
      firstCard.classList.remove("flip");
      secondCard.classList.remove("flip");
      resetTurn();
    }, 800);
  }
}

function resetTurn() {
  // clear transient selection + unlock for next moves
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function checkWin() {
  // all cards matched — stop the clock and pop a friendly alert
  if (matchedCount === GRID_SIZE) {
    stopTimer();
    alert(`You finished in ${timeEl.textContent}!`);
  }
}

// ----- New game / Reset -----
// full reset: timer, state, deck, and a fresh render
async function newGame() {
  stopTimer();
  timeEl.textContent = "00:00";
  matchedCount = 0;
  firstCard = null;
  secondCard = null;
  lockBoard = false;

  try {
    deck = await buildDeck();
  } catch (err) {
    // keep it user-friendly; API blips happen
    alert("PokeAPI fetch failed. Please check your internet and reload.");
    return;
  }
  renderBoard();
}

// wire up the reset button and kick things off once on load
newBtn.addEventListener("click", newGame);
newGame();
