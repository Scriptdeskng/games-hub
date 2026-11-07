# Core assets: credits and licences

All items are **made in-repo by the asset-designer (Claude) for Naija Games** unless noted, original work from basic shapes and paths, with no traced, copied or downloaded artwork. Licence for in-repo items: project-owned (same licence as the repository). Placeholders to be replaced by human-made assets are listed in `docs/assets/HUMAN_ASSETS.md`.

## Third-party: fonts (SIL Open Font License 1.1, embedding and subsetting permitted)
| File | Font | Author | Licence | Source |
|---|---|---|---|---|
| `fonts/bungee-subset.woff2` | Bungee Regular (subset: Latin, Latin-1, Latin Ext-A, selected Ext-B/Additional for Yoruba/Igbo/Hausa, tone marks, naira) | The Bungee Project Authors (David Jonathan Ross), Copyright 2023 | SIL OFL 1.1, https://openfontlicense.org (text: `fonts/OFL-Bungee.txt`) | https://github.com/djrrb/Bungee , https://fonts.google.com/specimen/Bungee |
| `fonts/nunito-subset.woff2` | Nunito variable (wght 400 to 800), same subset | The Nunito Project Authors (Vernon Adams, Cyreal, Jacques Le Bailly), Copyright 2014 | SIL OFL 1.1, https://openfontlicense.org (text: `fonts/OFL-Nunito.txt`) | https://github.com/googlefonts/nunito , https://fonts.google.com/specimen/Nunito |

Subsetting was done with fontTools `pyftsubset` (kerning/mark/locl features kept) and `fontTools.varLib.instancer` (Nunito wght limited to 400:800). The OFL permits modified subsets; the Reserved Font Name clause is not triggered as the font names are unchanged in the files and the files are used under the CSS family names "NG Display" and "NG UI". Bungee outlines were also converted to paths in the logo SVGs (embedding of outlines is permitted by OFL).

## In-repo, original
| Path | What | Made by | Notes |
|---|---|---|---|
| `patterns/adire.svg` `aso-oke.svg` `akwete.svg` `uli.svg` `arewa.svg` `ankara.svg` | 6 tileable single-colour patterns | asset-designer, in-repo | Inspired by traditions; not copied from any textile or artist |
| `patterns/patterns-preview.html` | review sheet | asset-designer | uses `../../src/styles/*.css` |
| `avatars/mama-nkechi.svg` `baba-ade.svg` `malam-sani.svg` `tari.svg` `efe.svg` `aisha.svg` `chidi.svg` `funmi.svg` `persona-sheet.svg` | CPU persona placeholder portraits | asset-designer, in-repo (generated from shapes) | **Placeholder**, to be replaced by a human illustrator; fictional characters, no real likeness |
| `icons/*.svg`, `icons/icons.svg`, `icons/icons-preview.svg` | 17 icons (play, pause, sound-on/off, music-on/off, settings, home, replay, star, coin, trophy, hint, close, back, check, alert) | asset-designer, in-repo | `coin` is a game token, not currency art |
| `logo/logo-lockup.svg` `logo-horizontal.svg` `logo-mark.svg` | logo placeholders | asset-designer, in-repo | Wordmark outlines from Bungee (OFL) |
| `ui-preview.html` | component gallery | asset-designer | dev/review only, do not ship |
| `tools/palettes.json`, `tools/contrast-check.mjs` | palette source and WCAG checker | asset-designer | dev only |
| `audio/voice/vo-*.mp3`, `audio/voice-manifest.json` | silent voice placeholders (digital silence, about 50 ms) | asset-designer, generated | **Awaiting recorded voice actors** |
| `audio/music/ng-*.mp3` | silent music placeholders | asset-designer, generated | **Awaiting composer/licensed loops** |
| `../src/styles/tokens.css`, `skin.css` | design tokens and UI skin | asset-designer, in-repo | |

## Pending third-party items
None yet. Voice and music, when delivered, must add: creator, date, licence and licence URL or contract reference, here and in each game's `assets/CREDITS.md`.
