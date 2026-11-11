# Akọni & Dike: Game Script

Source of truth: the "Akọni & Dike: Battle Game Script" doc (claude.ai artifact
`247556H8Rd3v8Kn3BvpExL`). This file is the build copy. If the doc changes, update this file
in the same commit. Working names and Yoruba/Igbo words are pending a native-speaker check.

## Overview
- **What it is:** a single-player, top-down, real-time **action-adventure**. You control the
  hero directly: you run, strike, dodge, parry, aim and sneak, explore hubs between fights,
  and command a small AI squad. It's one human against the CPU.
- **Two campaigns rooted in real history:** the Yoruba **Kiriji War** (1877–1893, treaty
  23 Sep 1886) and the Igbo **Ekumeku** resistance (1883–1914). Each has a prologue and 6
  chapters, so 14 chapters of 12–15 minutes each, plus skirmish and daily-challenge modes.
- **Built to teach:** every chapter is a playable history lesson (see `LEARNING.md`).
- **Tone:** heroic and respectful. Fictional point-of-view heroes, with real people as dignified
  cameos. No gore.

## Cultural guardrails (binding, and checked by QA and a human review)
1. **Yoruba and Igbo are never enemies.** The campaigns stand alone. The Moremi raiders are
   never called "Igbo". The legend's "Ugbo" are a different people, and confusing the two is a
   known error.
2. **No villain city or people.** Ibadan's commanders are brave, capable rivals. The real
   antagonist is overreach and endless war, and the story ends in the 1886 peace. The Ugbo
   people are never put on screen as villains. The raiders are "the raffia raiders of the
   forest".
3. **Colonial forces are a system, not an ethnic group.** They are "the Company" and its
   constabulary. Soldiers are never labelled by ethnicity.
4. **Fictional heroes, real cameos.** Ogedengbe, Fabunmi, Latoosa and Samuel Johnson appear
   briefly and with dignity. Their dialogue is clearly fictional.
5. **No gore, no trophies.** Enemies drop their weapons, kneel or run. There is no blood,
   beheading, skulls, executions or torture. Named rivals are always disarmed, never killed.
   Head-taking and slave-raiding history get one codex sentence each and are never shown.
6. **Faith with care.** Ifá and the Esinmirin river appear only as short narrated scenes,
   never as spells. Never show shrines, sacrifices (including Oluorogbo's story), masquerades
   or nsibidi. Raiders wear plain raffia cloaks.
7. **Defeat told honestly.** Ekumeku ends with survival and memory, and the codex states the
   real outcome (a British victory).
8. **Accurate words.** Use correct diacritics and get native-speaker review. Dialogue is
   English with local terms, plus Pidgin banter.

## Characters
**Kiriji (Yoruba):**
- **Moremi** (legend, prologue hero, queen of Ile-Ife). *"Fear is a cloak. Cloaks burn."*
- **Bisi:** the hero. A 19-year-old hunter's daughter from Imesi-Ile who rises from scout to
  field commander. Quick, practical, dry humour.
- **Akin:** an Ijesa marksman and companion. Proud, and uses Pidgin banter.
- **Iya Morenike:** an elder trader and strategist who speaks in proverbs.
- **Ogedengbe** (historical): commander-in-chief of the Ekitiparapo, in 3 scenes.
- **Fabunmi** (historical): the Ekiti prince who steps aside for Ogedengbe.
- **Balogun Aderemi** (fictional): the Ibadan rival. Honourable, never a cartoon.
- **Samuel Johnson** (historical): the peacemaker in Chapter 6.

**Ekumeku (Igbo):**
- **Nkem:** the hero. An 18-year-old *otu okorobia* fighter who becomes cell leader. *"Ekumeku.
  We do not speak of it."*
- **Ada:** a market trader who runs the messenger network.
- **Okeke:** the ogene signaller and joker.
- **Ogbuefi Nwaka:** a titled elder and the moral voice.
- **Captain Harrow** (fictional): the methodical Company officer.

## Campaign 1: Kiriji, The Hills Remember
Arc: fear → courage → the harder choice of peace.

| # | Chapter | Scene and key line | Battle (real time) | Hero moment |
|---|---|---|---|---|
| P | The Raffia Raiders (legend, Ile-Ife) | Raiders scatter the market; Moremi at the river. "Fear is a cloak. Cloaks burn." | (1) Stealth escape from the raiders' camp at night. (2) Defend 5 stalls with torch-bearers for 3 min. Torches beat raffia | Duel the raider chief at the market gate. Firebrand sweeps burn his cloak until he flees |
| 1 | The Ajele's Due (1877, Oke-Imesi) | The ajele's tribute demand turns a quarrel into revolt. Iya Morenike: "A town that carries another's load forever forgets how to stand." | Escort 6 villagers to the hill path. Guards can be pushed back rather than defeated | A street brawl with the guard captain, which teaches strike, dodge, parry and counter |
| 2 | One Army (1878–79, Imesi-Ile) | The Ekitiparapo forms. Fabunmi: "A crown is lighter than a broken people. Lead them." Ogedengbe: "You know the hills. Then the hills are yours." | Hold the ridge camp against waves until the enemy horn (about 4 min). High ground gives range and defence. The drummer boosts morale | A drum rally: tap the talking-drum rhythm, then lead the charge downhill |
| 3 | The Saro Rifles (c. 1880) | Saro traders send breech-loaders. Akin: "With this one, dem go hear us from Ikirun!" | Escort a 3-cart caravan through forest ambushes. The "ki-ri-ji" title card plays | First rifle shot: drag to aim, hold your breath, and disarm the lookout on a far cliff |
| 4 | The Long Camp (early 1880s) | Years of stalemate; camps become towns. "War that eats the years must also be fed." | A night raid to free 3 scouts. Hold supply points or the squad weakens | Solo infiltration past lantern patrols, then sprint out as the alarm drums start |
| 5 | The Balogun's Gambit (mid-1880s) | Aderemi: "You fight like my father's stories." Bisi: "Then your father told them well." | The biggest battle. Hold 2 of 3 hill objectives. Codex: Latoosa died in camp in 1885 | A three-phase duel with Aderemi. Disarm him, the truce horn sounds, and he bows |
| 6 | No Victor, No Vanquished (1886) | Samuel Johnson: "There are more of you in graves than in these camps. Let the living go home." | Protect 2 peace messengers against hardliners from both sides. Attacking anyone who has lowered their weapon fails the mission | Bisi carries the last message across no-man's-land, dodging fire. Close: the oath on the hill on 23 Sep 1886, and the epilogue's 1893 dispersal. "The hills remember. So will we." |

## Campaign 2: Ekumeku, The Forest Does Not Speak
Arc: scattered towns → one silent brotherhood → the cost of resistance → memory survives defeat.
It plays as stealth and ambush.

| # | Chapter | Scene and key line | Battle (real time) | Hero moment |
|---|---|---|---|---|
| P | Smoke on the River (1890s) | Company steamers, taxes and courts arrive. Nwaka: "When a stranger's goat eats your yam, you do not shout. You build a better fence." | Guide 6 villagers into the forest past a patrol, using sight cones and hiding | Young Nkem's hide-and-seek with a patrol through yam fields |
| 1 | The Oath (1898) | Rival age-grades swear as one. "Our fathers' quarrel can wait. The fence cannot." | Ambush a supply column. Grab 3 crates and vanish before the bugle (3 min). Ambush from cover deals double | Spring from cover, chain machete combos, grab a crate and Vanish |
| 2 | Ogene in the Trees | Okeke's bell code. "Dem get gun. We get ogene. Make we see who loud pass." | Relay signals to warn 3 villages before the column arrives | Repeat ogene patterns faster and faster as the column nears |
| 3 | The Market Never Closes | Ada: "Soldiers count guns. Nobody counts market women." | Move 4 bearers through a checkpoint town using crowd cover | A market chase across stalls and rooftops |
| 4 | The Burning Season (1902–1904) | Collective punishment, then the 1904 rising. "Ten fingers lift a load. One finger only points." | Choose: evacuate the village or hold the ford. The choice carries forward. Burning is off-screen, shown as smoke only | Carry a child out through spreading smoke. No one is shown in flames |
| 5 | Ogwashi-Uku (1909) | Harrow: "There is no army here. Only trees." Nkem: "Yes. Only trees." | Cut the column into three parts. You win when the expedition turns back, matching the record that it failed | Showdown at the ford: disarm Harrow, and he orders the column back |
| 6 | Do Not Speak of It (1911–1914) | Mass arrests; the network goes silent. | Survival: get Nwaka, Ada and 5 children through the cordon to the river | A night escape. Nkem holds the bank while the canoe pushes off. Epilogue: old Nkem under the ukwu tree, "We lost the war. We did not lose ourselves. Now you may speak of it." |

## Gameplay
- **Chapter loop:**
  - **Explore (2–4 min):** walk the hub, talk to characters, find artefacts that unlock
    source cards, do side quests, upgrade gear.
  - **Fight (5–8 min):** real-time top-down action.
  - **Hero moment (1–2 min):** a hand-made set piece.
- **Controls (portrait):**
  - Left joystick to move.
  - Right side: Strike (combos), Dodge (swipe), Block or parry (hold, then release on the
    enemy's tell), and Special (charges as you fight).
  - Squad-order ring (Follow, Hold, Charge, Fire or Volley), which slows time while open.
  - Assists: aim assist, auto-block on Story difficulty, and one-handed mode. Keyboard and
    mouse on desktop.
- **Heroes:**
  - **Moremi:** torch and staff. *Firebrand* breaks the raiders' fear aura.
  - **Bisi:** bow, short sword, later the Saro rifle. *Hunter's Eye* slows time and marks 3
    targets.
  - **Nkem:** machete and dane gun. *Vanish* hides him, and his next strike staggers.
- **Companions:** AI-controlled, each with one ability you can trigger: Akin's long shot,
  the drummer's rally, Okeke's ogene reveal, and Ada's distraction.
- **Enemies:** spearmen (block from the front), archers and musketeers (keep their
  distance), captains (telegraphed heavy attacks), and constables (search in pairs). Each
  group has a morale bar, and breaking it makes them flee. Rivals are boss fights.
- **No gore:** hits flash and knock back. Defeated enemies drop weapons, kneel or run, and
  rivals are disarmed.
- **Difficulty:** Story (classroom), Warrior, Legend. Higher levels add flanking, surrounding
  the hero, focus on the hero, and retreating the wounded.
- **Progression:** a 3-branch hero skill tree. Honours unlock period gear (aso-oke war sash,
  okpu agu cap), companion upgrades and codex entries. Replays unlock challenges (no damage,
  speedrun, stealth only).
- **Tech:** Canvas 2D, sprite atlases, object pooling, fixed timestep, 60 fps target on
  mid-range Android. The **first download (≤ 3 MB)** holds the engine, menus and the first
  playable chapter. **Each other chapter is a pack of ≤ 1 MB**, fetched when the player
  starts it and cached for offline play.

## Open decision
**Moremi prologue:** keep it, or open straight with Kiriji history? Ugbo remembers Moremi
as a traitor, so this needs the client's decision. Until it's decided, build Kiriji
Chapter 1 as the first playable slice and keep the prologue behind a feature flag
(`features.moremiPrologue`, default off).

## Sources
OnWar, The Yoruba War 1877–1893 · The Sun, Kiriji War · Folu Oyefeso, The Kiriji War ·
Wikipedia, Ekumeku Movement · Zikoko, Ekumeku War · Igbafe (1971), *J. African History* 12(3) ·
Wikipedia and Kentake Page, Moremi Ajasoro · Vanguard, Ohafia War Dance · ICIR, History returns
to classrooms. Full links are in the doc. Further reading: Samuel Johnson, *The History of the
Yorubas* (1921), and Don Ohadike, *The Ekumeku Movement* (1991).
