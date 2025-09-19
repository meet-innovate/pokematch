// Get important elements from the page
const board = document.getElementById("board"); // the grid container where all cards go
const timeEl = document.getElementById("time"); //
const newBtn = document.getElementById("newGameBtn");

//  Game size & state
const GRID_SIZE = 16; // total cards. (4 X 4)
const PAIRS = GRID_SIZE / 2; // number of unique Pokemon faces

//  store the card data
var deck = [];

// For clicking logic (two selected cards)
var firstCard = null;
var secondCard = null;
var isLocked = false; // when true, ignore clicks
var matches = 0; // cards matched so far this goes up by 2 on each match

//  Timer
var timerId = null; // interval id
var startTime = null; //  timer started (in milliseconds)

// Turn seconds into "mm:ss" format
function formatTime(sec) {
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  if (m < 10) m = "0" + m;
  if (s < 10) s = "0" + s;
  return m + ":" + s;
}

function startTimer() {
  // start only once, first click
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
  timerId = null; //reset
}

// PokeAPI
// Get one Pokemon image URL by id.
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
      // checks each level
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

// Get "count" unique Pokemon faces ids from 1..151 and return an array of { key, imgUrl }
function getPokemonFaces(count) {
  // Pick unique random ids using a Set
  var idsSet = new Set();
  while (idsSet.size < count) {
    var randomId = 1 + Math.floor(Math.random() * 151);
    idsSet.add(randomId);
  }
  var idList = Array.from(idsSet);

  // Fetch all image URLs in parallel (Promise.all)
  var promises = [];
  for (var i = 0; i < idList.length; i++) {
    promises.push(fetchPokemonSprite(idList[i]));
  }

  return Promise.all(promises).then(function (urls) {
    // If any url is missing, this can show a friendly alert
    for (var j = 0; j < urls.length; j++) {
      if (!urls[j]) {
        throw new Error("Missing sprite..!");
      }
    }

    // Make a array of objects { key, imgUrl }
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

//  Shuffle
function shuffle(arr) {
  return arr.sort(function () {
    return Math.random() - 0.5;
  });
}

//  Build the full deck of cards
//  duplicating each face for pairs, then shuffle the 16 items.
function buildDeck() {
  return getPokemonFaces(PAIRS).then(function (faces) {
    var pairs = [];
    //  duplicate each face
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i];
      // Push two separate objects
      pairs.push({ key: f.key, imgUrl: f.imgUrl });
      pairs.push({ key: f.key, imgUrl: f.imgUrl });
    }
    return shuffle(pairs);
  });
}

// Create one card element (DOM)
function cardElement(card, index) {
  // I build:
  // <div class="memory-card" data-key="..." data-index="...">
  //   <img class="front-face" src="(pokemon url)" alt="Pokemon">
  //   <img class="back-face"  src="img/back.png" alt="Hidden">
  // </div>

  var el = document.createElement("div");
  el.className = "memory-card";
  el.setAttribute("data-key", card.key);
  el.setAttribute("data-index", String(index));

  // el.tabIndex = 0;

  var front = document.createElement("img");
  front.className = "front-face";
  front.src = card.imgUrl;
  front.alt = "Pokemon";

  var back = document.createElement("img");
  back.className = "back-face";
  back.src = "img/back.png"; // static back image for all card
  back.alt = "Something went wrong!!";

  el.appendChild(front);
  el.appendChild(back);

  // handles flip/match logic when clicked by user
  el.addEventListener("click", onCardClick);

  return el;
}

//  Render entire board
function renderBoard() {
  // remove old cards
  board.innerHTML = "";

  // add current deck cards to the board
  for (var i = 0; i < deck.length; i++) {
    board.appendChild(cardElement(deck[i], i));
  }
}

//  Click / Match Logic
function onCardClick(e) {
  var cardEl = e.currentTarget;

  if (isLocked) return; // Ignore clicks during flip-back

  if (cardEl.classList.contains("flip")) return; // Ignore if card already flipped

  if (!timerId) {
    // Start timer on first click
    startTimer();
  }

  // Flip's the card
  cardEl.classList.add("flip");

  // Save first card, wait for second
  if (!firstCard) {
    firstCard = cardEl;
    return;
  }

  // second card
  secondCard = cardEl;
  isLocked = true; // block extra clicks while checking

  // Compare using data-key
  var isMatch =
    firstCard.getAttribute("data-key") === secondCard.getAttribute("data-key");

  if (isMatch) {
    // Match: disable clicks on both
    firstCard.removeEventListener("click", onCardClick);
    secondCard.removeEventListener("click", onCardClick);

    matches += 2;
    resetTurn();
    checkWin();
  } else {
    //No match: flip back after short delay
    setTimeout(function () {
      firstCard.classList.remove("flip");
      secondCard.classList.remove("flip");
      resetTurn();
    }, 800);
  }
}

// Reset selection and unlock board
function resetTurn() {
  firstCard = null;
  secondCard = null;
  isLocked = false;
}

//  win: stop timer & show message
// function checkWin() {
//   if (matches === GRID_SIZE) {
//     stopTimer();
//     alert("You finished in " + timeEl.textContent + "!");
//   }
// }

/*  win: stop timer & show message */
function checkWin() {
  if (matches === GRID_SIZE) {
    stopTimer();
    const winEl = document.getElementById("winner");
    if (winEl) {
      winEl.textContent = "Victory! Yourtime: " + timeEl.textContent + "!";
      winEl.style.display = "block"; 
    }
  }
}

// Start/ reset game
function newGame() {
  stopTimer();
  timeEl.textContent = "00:00";
  matches = 0;
  firstCard = null;
  secondCard = null;
  isLocked = false;

  // clear old win msg
  const winEl = document.getElementById("winner");
  if (winEl) {
    winEl.style.display = "none"; // hide it again
    winEl.textContent = ""; // remove old text
  }

  // Build deck and render
  buildDeck()
    .then(function (builtDeck) {
      deck = builtDeck;
      renderBoard();
    })
    .catch(function () {
      // If PokeAPI fails or images missing
      alert("PokeAPI fetch failed. Please check your internet and reload.");
    });
}

// Button: start new game
newBtn.addEventListener("click", newGame);

// Auto-start on page load
newGame();
