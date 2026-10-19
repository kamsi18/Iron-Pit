# IRON PIT

IRON PIT is a browser-based, first-person 1v1 arena shooter built with Three.js. Fight an AI rival in a sci-fi arena with cover, health bars, and a first-to-three-kills match format.

## Play

Open `index.html` in a modern browser with WebGL enabled and an internet connection. Three.js is loaded from the unpkg CDN, and the page uses Google Fonts, so those external resources also need to be reachable. No build step or npm install is required.

For a local web server, run this from the project folder:

```powershell
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Controls

| Action | Control |
| --- | --- |
| Move forward / backward | Up / Down arrows |
| Turn left / right | Left / Right arrows |
| Shoot | Spacebar |

Click **Enter the Pit** to start. The first fighter to reach three kills wins. Use **Fight Again** for another match or **Main Menu** to return to the opening screen.

## Project files

- `index.html` — menu, HUD, result screen, canvas, and browser import map.
- `styles.css` — layout and visual styling.
- `game.js` — Three.js arena, fighters, controls, combat, and match flow.


## Requirements

- A modern desktop browser with WebGL support.
- Internet access to load Three.js from `https://unpkg.com` and fonts from Google Fonts.
