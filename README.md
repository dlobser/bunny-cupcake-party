# Sarah's Cupcake Party

A tiny wordless web game: Sarah the bunny wakes up, gathers cupcake ingredients,
invites the animals and throws a party. No text, no timer, no way to fail.

## Play

- **Online (public):** https://dlobser.github.io/bunny-cupcake-party/ (GitHub Pages; works with touch, keyboard and joysticks).
  Pushing to `main` updates it within a minute or two.
- **Online (private claude.ai copy):** https://claude.ai/artifact/KPhvfuvsCrFd3EbShFVL76, built from `publish.html`
  (same `js/` files). The joystick may not work there, because the hosting frame can block gamepads.
- **Desktop:** open `index.html` in Chrome or Edge, or run a local server:
  `python -m http.server 8765` and open http://localhost:8765
- **Phone/tablet (same Wi-Fi):** run the server above on the PC, then open
  `http://<your-PC-IP>:8765` on the phone. The first tap goes full screen.

## Controls

| Input | How |
|---|---|
| Thrustmaster joystick / any gamepad | Push the stick (hat switch and d-pad work too). Press any button once if the browser hasn't noticed the stick yet. |
| Keyboard | Arrow keys or WASD |
| Phone / mouse | Press anywhere and drag; a joystick appears under the finger |

The top-left buttons toggle sound and full screen.

## The story

0. A wordless splash picture (Daddy, Sarah and Mommy with a tray of cupcakes). Tap, click, press a key or a button to dismiss it.
1. Sarah sleeps; any push wakes her. Mommy shows a picture list (flour, olive oil, egg, milk).
2. Porch flour, olive tree (shake → oil), chickens (egg), cow (milk). Bumping animals gives them a party balloon.
3. Mommy bakes. Then each friend joins a conga line: turtle (rides in the basket), goose (flaps out of the pond), dog, alpaca, alligator (big grin), fox (pops out of the pumpkin), chickens, cow.
4. Party in the kitchen with everyone, Daddy included: party hats, a big hug from Daddy, cupcakes, and a final table photo of Sarah and Daddy with drinks. Then free play.
5. After about 70 s night falls. Mommy and Daddy head to the bedroom, the arrow leads Sarah to the big bed, and all three climb in together while the animals curl up around the bed. Then a new day starts.

Daddy waits at different spots around the yard and runs over for a hug when he sees Sarah.
If the child stops for 8 seconds, an animal comes over with heart and star bubbles for 10–20 seconds, then goes home.

The yellow arrow next to Sarah follows the walkable path (around the pond, creek, fences and walls), so when the way is clear it points straight at the goal.

## Tweaks

- Walking speed: `SPEED` in `js/game.js`
- Idle seconds before an animal visits: `G.idleT > 8` in `updateIdle()` (js/game.js)
- Free-play length before bedtime: `G.freeT > 70` in `ambient()` (js/game.js)
- Debug: open with `?debug` for a status line; keys `1` wake, `2` jump to gathering, `3` fill the basket, `4` collect all friends, `5` skip to bedtime.
