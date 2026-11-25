# Projects

Each project is one mark: a flat white cutout on black, pushed up into glass with its edges rounded over. Every mark is drawn by the same rules, so the set matches.

## On the home page

- **Main four:** GECKO, AlgoType, JAGUAR, Milestone. One piece of glass holds still and melts from one to the next as you scroll, with a number lit behind it. The four were picked while building and are easy to change (`main` and `order`).
- **The wall:** Corne, OpenGym, UVA Chatbot, midi2furnace, Fluid Simulation, Evolution Simulation, Drone AI, Pigedex, Sandwich, Dotfiles. Floating glass only, with no lit copy of the mark behind it.
- **Hover** opens the view box, which follows the cursor and plays what the project looks like. Nothing held by the cursor moves while the mouse rests.
- **Click** opens the mark large with a panel beside it. Source is the "read more".
- **Phones:** a tap opens the panel. **Keyboard:** Tab and the arrow keys. **Reduced motion:** stills, no melt.

## Adding one

1. Draw the mark in `logos/build.py` (needs `shapely`) and run it. It writes `logos/svg/<id>.svg`.
2. Copy it to `src/logos/<id>.svg` without the black background path.
3. Put its media in `public/work/`.
4. Add `src/content/projects/<id>.md`. The text under the frontmatter is the panel's description.

| Field | Meaning |
|---|---|
| `name`, `line` | Name, and the one line under it |
| `order` | Position, lowest first |
| `main` | One of the main projects instead of the wall |
| `num`, `numTall` | Number lit behind a main project, and its layout in a tall window (`3/74` breaks the line) |
| `media` | View box: `/work/x.mp4` with a `/work/x.webp` poster, or a `.webp` |
| `slides` | How many stills, as `x-1.webp`, `x-2.webp` and so on |
| `shot` | A different picture for the panel |
| `tall` | A phone screen |
| `light` | A white picture, dimmed a little |
| `links` | `label` and `href` pairs |

The drawing rules (least widths, gaps and corner radii) are at the top of `logos/build.py`. Simplify a mark before adding detail. Aim for under 600 KB a clip.

## Candidates for later

| Project | What it needs |
|---|---|
| VDM volunteer system | Screenshots |
| Garmin watchface | More than one picture |
| C++ movement shooter | A README and something to show |
| Hold The Lead | Nothing but room: a game jam piece |
