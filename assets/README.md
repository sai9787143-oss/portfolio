# Assets

| File | Used for |
|---|---|
| `photo.webp` | ID card photo |
| `car.jpg`, `museum.jpg`, `apartment.jpg`, `warehouse.jpg`, `jewel.jpg`, `indoor.jpg`, `alpha6.jpg` | Project cards **and** the floating 3D screens in the hero (screenshots of the live sites) |
| `erp.jpg`, `portal.jpg` | Optional — screenshots for the two private projects. Until added, those cards show the project name. |
| `resume.pdf` | Nav "Resume" button |
| `avatar.png`, `avatar-anime.png` | Not used any more (from the earlier particle hero) — safe to delete |

## The 3D hero (`workspace.js`)

- A 3D laptop opens and types your profile as code (edit the `CODE` lines in `workspace.js`).
- The first 5 projects in `CONFIG.projects` that have a `link` and `img` float around it as 3D screens.
  Hover → the screen lifts and glows with a tooltip. Click → opens the live project.
- The camera follows the mouse and dollies in as you scroll.

To swap a floating screen, change the order of `CONFIG.projects` in `index.html`, or replace its screenshot.

## Putting it online (free)

Push the `portfolio` folder to GitHub, then import it on vercel.com or netlify.com — no build step needed.
It must be served over http(s): opening `index.html` by double-click won't load the 3D scene.
To preview locally, use VS Code → "Live Server".
