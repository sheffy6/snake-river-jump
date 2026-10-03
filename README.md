# Snake River Jump

A browser game: launch a scooter off the rim of the Snake River Canyon, earn money by distance and flips, and buy upgrades until you make it across.

Play it at https://sheffy6.github.io/snake-river-jump/

The whole game is `index.html`. Artwork by Kevin.

## What's in here

- `index.html` is the built game. This is the file the site serves.
- `src/page.html` is the page: layout, drawing, input and sound.
- `src/core.js` is the physics, upgrades and payout rules. It has no browser code, so the simulations can run it directly.
- `src/build.py` packs `art/` and the two source files into `index.html`.
- `art/` holds the pieces of Kevin's artwork the game uses.
- `src/sim/` holds simulated players for tuning: `tune.js` (jumps to cross), `order.js` (buying order), `flips.js` and `frameflip.js` (flip bonus and frame spin).
- `src/test/` holds browser play-tests (Playwright).

The canyon walls below the rim, the cape and the crash ragdoll's joints are drawn or defined in `src/page.html`, not in `art/`.

## Changing the game

Edit `src/page.html` or `src/core.js`, then run `python3 src/build.py` (needs Pillow). Check the balance with `node src/sim/tune.js`.

The site is served from the `gh-pages` branch, so push to both: `git push origin main main:gh-pages`.
