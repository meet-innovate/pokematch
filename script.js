// =======================================================
// PokéMatch 
// =======================================================

// ---------- Get important elements from the page ----------
var board = document.getElementById("board"); // the grid container where all cards go
var timeEl = document.getElementById("time"); // the timer display (mm:ss)
var newBtn = document.getElementById("newGameBtn"); // button to start a new game

// ---------- Game size & state ----------
var GRID_SIZE = 16; // total cards (must be even). 16 = 4x4
var PAIRS = GRID_SIZE / 2; // number of unique Pokémon faces

// I will store the card data here, like: [{ key: "poke-25", imgUrl: "..." }, ...]
var deck = [];

// For clicking logic (remember the two selected cards)
var firstCard = null;
var secondCard = null;
var isLocked = false; // when true, ignore clicks (during flip-back delay)
var matches = 0; // how many cards matched so far (goes up by 2 on each match)

// ---------- Timer ----------
var timerId = null; // interval id
var startTime = null; // when the timer started (in milliseconds)

// Turn seconds into "mm:ss" 
function formatTime(sec) {
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  if (m < 10) m = "0" + m;
  if (s < 10) s = "0" + s;
  return m + ":" + s;
}

function startTimer() {
  // start only once (first click)
  if (timerId) return;
  startTime = Date.now();
  timerId = setInterval(function () {
    var seconds = (Date.now() - startTime) / 1000;
    timeEl.textContent = formatTime(seconds);
  }, 250);
}

function stopTimer() {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
}

// ---------- PokeAPI helpers ----------
// Get one Pokémon image URL by id.
// I tried "official artwork" first. If not there, I use the normal front sprite.
function fetchPokemonSprite(id) {
  return fetch("https://pokeapi.co/api/v2/pokemon/" + id)
    .then(function (res) {
      if (!res.ok) {
        throw new Error("PokeAPI error");
      }
      return res.json();
    })
    .then(function (data) {
      // Carefully check each level (no optional chaining)
      var artwork = null;
      if (
        data &&
        data.sprites &&
        data.sprites.other &&
        data.sprites.other["official-artwork"]
      ) {
        artwork = data.sprites.other["official-artwork"].front_default;
      }
      var fallback = data && data.sprites ? data.sprites.front_default : null;

      if (artwork) return artwork;
      return fallback; // might be null; caller will handle if missing
    });
}

// Get "count" unique Pokémon faces (ids from 1..151) and return an array of { key, imgUrl }
function getPokemonFaces(count) {
  // Pick unique random ids the beginner way using a Set
  var idsSet = new Set();
  while (idsSet.size < count) {
    var randomId = 1 + Math.floor(Math.random() * 151); // Gen 1 range
    idsSet.add(randomId);
  }
  var idList = Array.from(idsSet);

  // Fetch all image URLs in parallel (Promise.all)
  var promises = [];
  for (var i = 0; i < idList.length; i++) {
    promises.push(fetchPokemonSprite(idList[i]));
  }

  return Promise.all(promises).then(function (urls) {
    // If any url is missing, it fail so this can show a friendly alert
    for (var j = 0; j < urls.length; j++) {
      if (!urls[j]) {
        throw new Error("Missing sprite");
      }
    }

    // Make a array of objects { key, imgUrl } (no fancy map/flatMap)
    var faces = [];
    for (var k = 0; k < idList.length; k++) {
      faces.push({
        key: "poke-" + idList[k],
        imgUrl: urls[k],
      });
    }
    return faces;
  });
}

// ---------- Shuffle  ----------
function shuffle(arr) {
  return arr.sort(function () {
    return Math.random() - 0.5;
  });
}

// ---------- Build the full deck of cards ----------
//  duplicating each face to make pairs, then shuffle the 16 items.
function buildDeck() {
  return getPokemonFaces(PAIRS).then(function (faces) {
    var pairs = [];
    // Manually duplicate each face 
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i];
      // Push two separate objects so they are different items in memory
      pairs.push({ key: f.key, imgUrl: f.imgUrl });
      pairs.push({ key: f.key, imgUrl: f.imgUrl });
    }
    return shuffle(pairs);
  });
}

// ---------- Create one card element (DOM) ----------
function cardElement(card, index) {
  // I build:
  // <div class="memory-card" data-key="..." data-index="...">
  //   <img class="front-face" src="(pokemon url)" alt="Pokémon">
  //   <img class="back-face"  src="img/back.png" alt="Hidden">
  // </div>

  var el = document.createElement("div");
  el.className = "memory-card";
  el.setAttribute("data-key", card.key);
  el.setAttribute("data-index", String(index));
  // (I would set tabIndex for keyboard users, but keeping it basic)
  // el.tabIndex = 0;

  var front = document.createElement("img");
  front.className = "front-face";
  front.src = card.imgUrl;
  front.alt = "Pokémon";
  

  var back = document.createElement("img");
  back.className = "back-face";
  back.src = "img/back.png"; // make sure this file exists
  back.alt = "Hidden";

  el.appendChild(front);
  el.appendChild(back);

  // When user clicks a card, it handle flip/match logic
  el.addEventListener("click", onCardClick);

  return el;
}

// ---------- Render the whole board ----------
function renderBoard() {
  // remove old cards
  board.innerHTML = "";

  // add current deck cards to the board
  for (var i = 0; i < deck.length; i++) {
    board.appendChild(cardElement(deck[i], i));
  }
}

// ---------- Click / Match Logic ----------
function onCardClick(e) {
  var cardEl = e.currentTarget;

  // If we are in the middle of a flip-back delay, ignore clicks
  if (isLocked) return;

  // If this card is already flipped face-up, ignore
  if (cardEl.classList.contains("flip")) return;

  // Start timer on the very first user action
  if (!timerId) {
    startTimer();
  }

  // Flip this card
  cardEl.classList.add("flip");

  // If we don't have a first selected card yet, store this and wait for second
  if (!firstCard) {
    firstCard = cardEl;
    return;
  }

  // Now this click is the second card
  secondCard = cardEl;
  isLocked = true; // block extra clicks until it finish checking

  // Compare using the data-key that I set when building the card
  var isMatch =
    firstCard.getAttribute("data-key") === secondCard.getAttribute("data-key");

  if (isMatch) {
    // If they match, stop future clicks on these two
    firstCard.removeEventListener("click", onCardClick);
    secondCard.removeEventListener("click", onCardClick);

    matches += 2; // we matched two more cards
    resetTurn();
    checkWin();
  } else {
    // If not a match, show the second card briefly, then flip both back
    setTimeout(function () {
      firstCard.classList.remove("flip");
      secondCard.classList.remove("flip");
      resetTurn();
    }, 800); // small delay so player can see
  }
}

// Clear the temporary selection and unlock the board for the next clicks
function resetTurn() {
  firstCard = null;
  secondCard = null;
  isLocked = false;
}

// When all cards are matched, stop the timer and notify the player
function checkWin() {
  if (matches === GRID_SIZE) {
    stopTimer();
    alert("You finished in " + timeEl.textContent + "!");
  }
}

// ---------- Start a brand new game (called on load & when pressing the button) ----------
function newGame() {
  stopTimer();
  timeEl.textContent = "00:00";
  matches = 0;
  firstCard = null;
  secondCard = null;
  isLocked = false;

  // Build a fresh deck, then render
  buildDeck()
    .then(function (builtDeck) {
      deck = builtDeck;
      renderBoard();
    })
    .catch(function () {
      // If PokeAPI fails or images are missing
      alert("PokeAPI fetch failed. Please check your internet and reload.");
    });
}

// When the button is clicked, start a new game
newBtn.addEventListener("click", newGame);

// Start once when the page loads
newGame();
