# Iron-Pit
1v1
A browser-based, 3D first-person arena shooter. One opponent, no teams: be the first to 3 kills to win the match.

Gameplay
Mode: 1v1 duel against a single rival
Win condition: first to 3 kills
HUD: health bars for you and your rival, a live kill scoreboard, a crosshair and a fire hint
Flow: main menu → match (round banners between kills) → result screen with Fight Again or Main Menu
Controls
Key	Action
↑	Move forward
↓	Move backward
← / →	Turn
Space	Shoot
Getting started

The game loads game.js as an ES module, so it must be served over HTTP. Opening index.html directly from disk (file://) will usually be blocked by the browser.

bash
# from the project folder
python3 -m http.server 8000
# then visit [http://localhost:8000](http://127.0.0.1:8080/)

Any static server works (npx serve, VS Code Live Server, etc.).

An internet connection is required on first load, since Three.js and the fonts come from CDNs.

Project structure
index.html   # page markup: menu, HUD, round banner, result screen, canvas
styles.css   # styling for overlays, HUD and menu (referenced by index.html)
game.js      # game logic and Three.js scene (referenced by index.html)

index.html defines these UI elements, which game.js is expected to drive:

Element ID	Purpose
#menu / #play-btn	Start screen and "Enter the Pit" button
#hud	In-match overlay
#player-hp / #enemy-hp	Health bar fills
#player-kills / #enemy-kills	Scoreboard counters
#round	Banner shown between rounds
#result	End-of-match screen
#result-kicker / #result-title / #result-copy	Result text (victory or defeat)
#again-btn / #menu-btn	Rematch and return to menu
#game	Canvas the 3D scene renders into
Tech stack
Three.js 0.160.0, loaded through an import map from unpkg
Vanilla JavaScript (ES modules), HTML5 canvas and CSS
Google Fonts: Orbitron and Rajdhani
Customising
Theme and layout: edit styles.css.
Menu text and controls list: edit the markup in index.html.
Kill target, health, speeds and AI behaviour: edit game.js.
Three.js version: change the URL in the importmap script in index.html.
Notes
index.html is the only file that was available when this README was written, so the sections on gameplay and structure are based on its markup. Details of enemy behaviour, damage values and arena layout live in game.js, which are worth adding here.
The hidden CSS class is used to toggle the HUD, round banner and result screen.
