# DRECINE 2.0

**D**ungeons & Dragons **R**eact **E**ngine for **C**haracters, **I**tems, **N**PCs & **E**quipment — a free, browser-only toolbox for D&D 5e tables.

A from-scratch rewrite of the original [dndtool](https://github.com/alessandriLuca/dndtool): same ideas, new code, more features, fewer bugs.

## Features

| Tool | What it does |
| --- | --- |
| **Character Builder** | Step-by-step builder with **70 races** (plus sub-races and the Revenant template) taken from the races compendium, **14 classes** (Artificer and Blood Hunter included) with features 1–20, subclasses, spell slots and class resources. Standard array, point buy (27), 4d6-drop-lowest or manual scores; flexible racial ASIs (+2/+1 or +1/+1/+1); ASI-or-feat choice at every ASI level (182 feats); skills, expertise, backgrounds and languages; automatic HP, AC (armor, natural armor, Unarmored Defense, shield), initiative, passive Perception, spell DC. Printable parchment sheet (Print → PDF) and JSON import/export. |
| **Party** | Shared with the builder: HP with damage/heal/temp HP/long rest, 17 conditions, equipment with quantity, notes, **cursed** and **attuned** (3-item limit) flags, coins, notes. Quick-add for NPC companions. Export/import JSON or YAML (DRECINE 1 YAML files are converted). |
| **Loot** | Roll N items from the mundane or magic databases or from your own file, filter by rarity range, weighted by rarity, no duplicates, and **give** items directly to a party member. |
| **Compendium** | One search across magic items, equipment, races, classes, feats and languages. |
| **Wild Surge** | PHB, Unearthed Arcana and a three-way severity table (d20 severity + d100), number lookup, roll history, custom tables. |
| **NPC & Monster cards** | YAML → stat block with your own artwork, PNG export, print, local library; one-click AI prompt to have ChatGPT/Claude write the YAML. |
| **Database Generator** | Builds an AI prompt for a themed item database, validates the answer (header, rarity 1–20, duplicates) and downloads a file ready for the loot roller. |
| **Dice tray** | Always on screen: `2d6+3`, advantage `2d20kh1`, `4d6kh3`… |

Everything is stored in the browser (`localStorage`); nothing is sent anywhere.

### Rarity scale

Item databases use a 1–20 rarity value where **20 = very common** and **1 = legendary**
(15–20 common, 11–14 uncommon, 7–10 rare, 4–6 very rare, 1–3 legendary). This matches the
bundled datasets — the old prompt said the opposite, which is now fixed.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

### Data

* `src/data/races.json` — generated from the races PDF with `python3 scripts/build_races.py Races.pdf`
  (needs `pdftotext`). Single-column pages are parsed automatically; sub-races laid out in
  several columns are described by hand in the script.
* `src/data/classes.js` — class definitions (hit die, proficiencies, skills, features by level,
  subclasses, spellcasting progression, backgrounds, armor table).
* `src/data/feats.json` — from `data-src/feats.csv` via `scripts/build_feats.py`.
* `src/data/wildsurge.json` — from `data-src/wildSurge/*` via `scripts/build_wildsurge.py`.
* `public/data/*.txt` — item databases loaded at runtime by the loot roller and compendium.

## Deploy on GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to the `gh-pages` branch on every push to
`main` (and to `claude/**` branches). Pages serves the `gh-pages` branch:
**https://alessandriluca.github.io/Drecine2.0/**

## License

Free and open source under the GNU AGPL-3.0: use, modify and share it, keep derivatives free and
open, and credit the original author. D&D game content belongs to its respective owners.
