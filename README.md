# PokeMatch (4×4 Memory Game)

A simple 4×4 matching game built with **HTML, CSS, and vanilla JavaScript**. The game fetches Pokemon images from the **PokeAPI** and places 8 pairs randomly on the board. Flip two cards:
- If they match → they stay revealed.
- If not → they flip back after a short delay.

A timer starts on the first flip and stops when all pairs are found. A centered overlay shows your final time.

## How to Run

1. Download and extract the ZIP file.  
2. Open `index.html` in your browser (double-click or right-click → Open With → Browser).  
   - Works in Chrome, Firefox, or Edge.  

That’s it — no server or install required.
> Note: The game loads images from https://pokeapi.co/; please stay online.

## Files
- `index.html` – Page markup (header, timer, new game button, winner).
- `style.css` – Layout, card flip styles, winner overlay.
- `script.js` – Game logic (state, timer, fetch from PokeAPI, shuffle, click handling).
- `img/back.png` – Static back face for all cards.

## Tech highlights
- **API integration:** Fetching Pokémon artwork dynamically from PokeAPI.  
- **Game logic & state management:** Handles card flips, comparisons, lock state, and win detection.  
- **Timer feature:** Starts on first action, updates live, stops on win.  
- **UI/UX polish:** Flip animation, focus styles, and winner overlay for better player experience.  


## Credits
- Pokemon data/images: [PokeAPI](https://pokeapi.co/).  
- Pokemon images © their respective owners (used here for non-commercial demo).  
- Pokeball back-face image: [FreeIconsPNG](https://www.freeiconspng.com/img/23461) (used as static card back).

## Author
**Meet Patel**