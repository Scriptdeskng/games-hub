# Credits: `ayo-olopon` (Ayo Olopon)

All art is **made in-repo by the asset-designer (Claude)** from basic shapes and paths. Licence: project-owned (same as the repository). No traced, copied or downloaded artwork; no real logos, brands or people. Generator: `scripts/gen-ayo-olopon-art.mjs` (then `npx svgo` with ids kept, `removeHiddenElems` off); checker: `scripts/check-ayo-olopon-art.mjs`.

| Path                                                        | What                                                               | Made by                 | Licence       | Notes                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------- | ------------- | ----------------------------------------------------------- |
| `board/board-landscape.svg`, `board/board-portrait.svg`     | iroko board, adire/aso-oke frame, adire-cloth brass trays, 12 pits | asset-designer, in-repo | project-owned | secular game board, not an opon Ifa; polish optional        |
| `board/layout.json`                                         | pit, chip and tray coordinates, seed placement formula             | asset-designer, in-repo | project-owned | import as a module (not shipped as a file)                  |
| `seeds/seed-a..d.svg`, `seed-lift.svg`, `seed-ghost.svg`    | four seed shapes and tints, held seed, landing ghost               | asset-designer, in-repo | project-owned |                                                             |
| `counters/counter-1.svg`, `counter-5.svg`, `counter-10.svg` | brass tally counters                                               | asset-designer, in-repo | project-owned | shape plus pips                                             |
| `states/pit-*.svg` (7)                                      | select, hint, last, danger, capture, disabled, skip overlays       | asset-designer, in-repo | project-owned | shape-coded                                                 |
| `fx/*.svg` (5)                                              | capture burst, sow ripple, tray glow, chain link, turn drum        | asset-designer, in-repo | project-owned |                                                             |
| `icon/menu-mark.svg`, `bg/table-cloth.svg`                  | menu mark, adire table cloth tile                                  | asset-designer, in-repo | project-owned | original motifs                                             |
| `thumb/thumb-512x512.svg`, `thumb/thumb-1024x500.svg`       | portal thumbnail sources                                           | asset-designer, in-repo | project-owned | **placeholder hero art**; export to .webp at the human pass |
| `ayo-fx.css`                                                | layout classes and keyframes                                       | asset-designer          | project-owned |                                                             |
| `audio/music/ayo-menu-juju.mp3`, `ayo-play-juju.mp3`        | silent placeholders                                                | asset-designer          | project-owned | **awaiting composer**: add creator, date, licence           |
| `audio/voice/vo-ay-*.mp3` (8), `audio/voice-manifest.json`  | silent placeholders and manifest                                   | asset-designer          | project-owned | **awaiting voice actors**                                   |
| `ship.json`                                                 | include-list of runtime art                                        | asset-designer          | project-owned |                                                             |
| `../src/audio/sfx.ts`, `sfx.test.ts`                        | synth cue map `ayoSfx` (core voices only)                          | asset-designer          | project-owned |                                                             |

Fonts: none (shared Nunito and Bungee, see `packages/core/assets/CREDITS.md`). Third-party items: none.
