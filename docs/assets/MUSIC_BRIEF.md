# Music brief (shared / core level)

Status: **brief for composers. Every file named below is a silent placeholder** (`packages/core/assets/audio/music/<name>.mp3`, a fraction of a second of digital silence). Music cannot be made by the asset-designer; nothing here may be replaced with unlicensed audio. Per-game briefs repeat the relevant row and add any game-specific cues.

Source of truth: `CULTURAL_GUIDE.md` section 4.

## Rules for every track
- **Original compositions** (commissioned, work-for-hire or fully licensed for web-game embedding). No samples of existing songs, no artist sound-alikes, no uncleared beats or loops, no AI-generated music of unknown licence. Licence, composer and date go into the game's `CREDITS.md`.
- **Instruments are Nigerian-flavoured and live-played or convincingly sampled with a clear licence**: guitar, bass, congas, shekere, agogo, talking drum, udu, calabash, goje, kakaki-style brass, ekwe/woodblock, hand claps, light keys. No generic stock "game" synth music and no pan-African cliché (no djembe-and-chant "savanna" bed, no kora).
- **Loop**: 30 to 60 s, seamless (end rings out into bar 1, rendered with a 1-bar tail then crossfaded), tempo constant, no key change. Deliver stems-free stereo mix.
- **Size**: each file <= 300 KB as `.ogg` (Vorbis q3 to q4, about 96 to 112 kbps) **and** `.mp3` (96 kbps, joint stereo). One game loads at most 2 music files at a time.
- **Level**: -16 LUFS integrated, true peak -1 dBTP. Leave room in 1 to 4 kHz for SFX (talking drum and agogo SFX live there): keep lead lines soft, no sustained harsh highs.
- **Mood**: light, warm, never aggressive. Family-friendly lyrics: **instrumental only** (no vocals, no lyrics) unless a licensed vocal is approved by the human.
- Menu loops are calmer (lower density) than play loops. Play loops must not tire the listener after 10 minutes: sparse enough, no ear-worm hook repeated every bar.

## Style briefs

| Style | Tempo / feel | Key and harmony | Instruments | Mood | Used by |
|---|---|---|---|---|---|
| **Afrobeats (log-drum-free, light percussion)** | 100 to 108 BPM, mid-tempo bounce, 12/8 or 4/4 with syncopated shaker | Minor pentatonic or Dorian, 2 or 4 chords, keep harmony simple | Muted clean guitar, round bass, congas, shaker, light hi-hat, soft Rhodes pad, finger snaps | Fresh, confident, urban Lagos evening | Portal menu, Danfo Dash, Mama Put Match, Sabi Words |
| **Highlife (guitar-led, warm)** | 104 to 116 BPM, relaxed two-beat swing | Major, I-IV-V with walking bass; interlocking two-guitar lines (palm-wine-style picking) | Clean electric guitar x2, bass, claves, shekere, light drum kit with brushes, soft horn section stabs (optional) | Warm veranda, friendly, nostalgic and proud | Naija Whot, Naija Ludo, results screens |
| **Juju / fuji-inspired percussion with talking drum** | 112 to 124 BPM, layered polyrhythms | Major or Mixolydian drone-ish, simple call-and-response melody on guitar or keys | Talking drum (lead), iyalu/omele-style supporting drums, agogo, shekere, bass, slide-guitar sweeps | Festive and rhythmic, grown-up but playful | Ayo Olopon, Snakes & Ladders |
| **Hausa-inspired (calabash percussion, goje-style melody)** | 96 to 108 BPM, steady, dancing pulse | Pentatonic and modal (e.g. D Dorian / Phrygian-flavoured), drone, ornamented melodic turns | Calabash percussion, goje-style (fiddle) lead, light kalangu-style drum, hand claps, soft string pad | Calm, dignified, focused, spacious | Draughts Naija, northern levels and packs |
| **Football-chant energy (drums, whistles)** | 118 to 128 BPM, march-like, driving | Major, short riffs, call-and-response with claps | Snare and tom ensemble, bass drum, hand claps, referee-whistle-style accents (original, not copied), crowd claps (no recorded fan chants) | Energetic, tense then exploding, stadium on a Saturday | Penalty King |
| **Calm quiz bed** | 84 to 92 BPM, gentle pulse | Major with relative-minor colour, open chords | Soft highlife guitar, shekere, light bass, vibraphone or marimba touches | Thoughtful, game-show-warm, never intrusive | Sabi Quiz (plus a **tense last-5-seconds variant**: same key, 112 BPM feel, ticking shekere, rising tension, ends on an unresolved note) |

## Deliverable slots (shared placeholders)

| File (placeholder) | Slot | Style | Length | Notes |
|---|---|---|---|---|
| `ng-menu-afrobeats` | Portal / default menu loop | Afrobeats, calm density | 45 s loop | Also the fallback for any game without its own menu loop |
| `ng-play-afrobeats` | Danfo Dash, Mama Put Match, Sabi Words play loop | Afrobeats | 45 s loop | Add an "intensity up" variant later for Danfo Dash speed-ups (same BPM, same key) |
| `ng-play-highlife` | Whot, Ludo play loop | Highlife | 60 s loop | Relaxed, leaves space for card and dice SFX |
| `ng-results-highlife` | Results screen bed | Highlife, celebratory | 30 s loop | Brighter than play loop; ends cleanly when player taps replay |
| `ng-play-juju` | Ayo Olopon, Snakes & Ladders play loop | Juju / fuji-inspired | 60 s loop | Talking-drum fills must not mask udu SFX: keep fills sparse |
| `ng-play-hausa` | Draughts Naija and northern content | Hausa-inspired | 60 s loop | |
| `ng-play-football` | Penalty King | Football chant | 45 s loop | Quiet bar before each kick is welcome (4 to 8 s of thinner texture) |
| `ng-quiz-calm` | Sabi Quiz | Calm quiz bed | 45 s loop | |
| `ng-quiz-tense` | Sabi Quiz, last 5 s of the timer | Calm quiz tense variant | 8 s loop | Must be tempo-compatible with the calm bed |
| `ng-sting-win` | Win sting | Highlife + talking-drum fill | 2.5 to 3 s, not a loop | Pairs with the SFX win fanfare; do not duplicate its melody |
| `ng-sting-lose` | Gentle "try again" sting | Highlife, soft | 2 s, not a loop | Warm and encouraging, never mocking |

Per-game "menu + play" pairs (CULTURAL_GUIDE section 4) will be listed in each game's brief, reusing these slots until bespoke loops are commissioned.

## Wiring (for the developer)
- Music starts only after the first user gesture; honours the Music toggle (persisted); fades in 400 ms and out 300 ms; loops with `AudioBufferSourceNode.loop` (not `<audio loop>`, which gaps).
- Prefer `.ogg`, fall back to `.mp3`; treat a missing or near-silent file as "no music".
- Pause with the tab (`visibilitychange`) and on the pause screen (duck to 25% rather than stop, if desired).
