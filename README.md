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
- `src/sim/` holds simulated players for tuning. `career.js` is the current one: five kinds of pilot play both canyons under the river rules (flips only pay if the jump ends upright, each flip pays less than the last, sponsor contracts). The older ones predate those rules: `tune.js` (jumps to cross), `order.js` (buying order), `flips.js` and `frameflip.js` (flip bonus and frame spin).
- `src/test/` holds browser play-tests (Playwright).

The canyon walls below the rim, the cape and the crash ragdoll's joints are drawn or defined in `src/page.html`, not in `art/`.

Levels live in `LEVELS` in `src/core.js`: gap, vehicle numbers, pay rate and wind zones. `node src/sim/wings.js` tunes Hells Canyon, where the third upgrade is wings and the mower is nose-heavy. Its far ridges, evening tint, the stand-in lawnmower and its wings are drawn in `src/page.html`. (`level2.js` and `wind.js` are from an earlier trial with wind bands.)

## Changing the game

Edit `src/page.html` or `src/core.js`, then run `python3 src/build.py` (needs Pillow). Check the balance with `node src/sim/career.js`.

The river, its boulders, the balloon that marks the best jump and the canyon's back wall are drawn in code in `src/page.html`. Sponsor contracts, medals (`par` in `LEVELS`) and the flip bonus live in `src/core.js`.

The site is served from the `gh-pages` branch, so push to both: `git push origin main main:gh-pages`.
