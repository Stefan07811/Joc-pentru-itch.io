# Chronicle of Ash (demo)

A grim medieval siege strategy game that runs in the browser (plain HTML/JS/canvas, no build step), made for itch.io.
You are the castellan of Neamț Fortress in 1476, besieged by the Ottoman army. Hold the walls for 30 days.

## What's in the demo
- **A living, procedural scene**: fortress, siege camp, burning village, day/night cycle, rain/fog/storm, ravens that gather as the dead pile up, bombards, siege towers, torches at night. The world changes every day.
- **Command the walls**: click a sector (or press 1–4) and post men-at-arms, archers and militia. Red arrows show where the enemy will strike; scout to see exactly.
- **Orders each day** (3): repair, fortify, forge arrows, drill militia, conscript civilians, scout, forage, sortie, send rider, feast, tend the wounded, ration.
- **Animated assaults** with ladders, arrows, bombards, breaches and collapses; fortress falls after 3 breaches.
- **Grim dilemmas** (32 events) such as sealing the fevered in a cellar, slaughtering warhorses, turning civilians out, a ransom for five prisoners.
- **The Chronicle**: each night choose truth, embellished glory, or silence. The garrison hears it, the Prince reads it. Lies build a debt that the Prince's inspector will collect.

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000
```
## Publish on itch.io
Zip the contents of this folder (index.html, css/, js/, assets/) and upload as "HTML, playable in browser".

## Structure
- `js/engine.js` – game rules (no DOM, testable)
- `js/data.js` – scenario: waves, events, endings (add content here)
- `js/scene.js` – canvas renderer and assault animation
- `js/ui.js` – HUD, panels, modals and the daily flow
- `js/audio.js` – optional sounds
- `tools/sim.js` – balance simulation (`node tools/sim.js`)

## Optional assets
The game is fully playable with procedural art. Sounds are optional MP3s in `assets/audio/`:
`music_menu`, `music_game`, `music_battle`, `ambience`, `sfx_click`, `sfx_quill`, `sfx_horn`, `sfx_boom`, `sfx_impact`, `sfx_clash`,
`sfx_collapse`, `sfx_thunder`, `sfx_order`, `sfx_event`, `sfx_victory`, `sfx_defeat`.

## Roadmap
More sieges (Suceava, Constantinopol, Alesia), champions with traits, a campaign map, daily seed + leaderboard, saves.
