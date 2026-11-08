# Voice script (shared exclamations)

Status: **brief for Nigerian voice actors; files are silent placeholders** (`packages/core/assets/audio/voice/vo-<id>.mp3`, generated, ~50 ms of digital silence each). Machine-readable twin: `packages/core/assets/audio/voice-manifest.json`. Per-game lines (Whot calls, quiz host, commentary) are added in each game's brief.

Binding rules (CULTURAL_GUIDE section 3 and 5)
- Recorded by real Nigerian voice actors. **Never** text-to-speech, never a faked or exaggerated accent, no stage "villager" voices.
- Pidgin must sound natural and relaxed, not read off a page. Where a line has both columns, record the Pidgin line for `pcm` and the English line for `en` (many are the same shout; record once and reuse when identical).
- Humour comes from everyday situations, never from ethnicity, religion, accent, poverty or body type.
- Yoruba, Igbo and Hausa lines (`needsNativeReview: true` in the manifest: `e-ku-ise`, `o-di-mma`, `madalla`) must be recorded by a native speaker of that language, who also confirms spelling and tone marks.
- Deliver: mono, 44.1 kHz, WAV master; we encode to `.ogg` (Vorbis q3) and `.mp3` (96 kbps). Each clip <= 1.5 s, 150 ms of room tone free at head, trimmed tail, peak -3 dBFS, no music or background noise, 3 takes per line (neutral, brighter, softer) for variation.
- Licence: buyout or a licence that allows embedding in a web game, a no-AI-training clause is welcome. Record the actor, date and licence in `CREDITS.md`.

| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | Region flavour | File |
|---|---|---|---|---|---|---|---|
| `oya` | Oya! | Come on! | Bright, quick call to action, rising pitch, smile in the voice. | any adult, M or F | game start, countdown, menu Play | Pan-Nigerian | `vo-oya.mp3` (ogg: human delivery) |
| `na-you-dey-play` | Na you dey play! | It's you playing! | Playful teasing, proud of the player, slightly sing-song. | F, 30s, Lagos | player move praised, turn start | Lagos / Pidgin | `vo-na-you-dey-play.mp3` (ogg: human delivery) |
| `chai` | Chai! | Oh no! | Dramatic, comic dismay (never mocking). Long vowel, falling pitch, then a laugh. | M or F | player loses a big card or point | Pan-Nigerian | `vo-chai.mp3` (ogg: human delivery) |
| `e-don-do` | E don do! | That's enough! | Satisfied and final, like closing a deal. Short and firm. | M, 40s, Lagos | round end, win line in Ludo / Draughts | Pidgin | `vo-e-don-do.mp3` (ogg: human delivery) |
| `your-turn` | Your turn don reach! | It's your turn! | Warm nudge, not nagging. Friendly and rising. | F, 20s | turn prompt (optional, after idle) | Pidgin | `vo-your-turn.mp3` (ogg: human delivery) |
| `last-card` | Last card! | Last card! | Sharp, confident announcement like at a Whot table. Strong stress on "last". | M, 30s | Whot: someone has one card left | Pan-Nigerian | `vo-last-card.mp3` (ogg: human delivery) |
| `semi-last-card` | Semi-last card! | Semi-last card! | As Last card, a notch lower in urgency. | M, 30s | Whot: two cards left (toggle) | Pan-Nigerian | `vo-semi-last-card.mp3` (ogg: human delivery) |
| `pick-two` | Pick two! | Pick two! | Gleeful, a little wicked, quick. | F, 30s | Whot 2 played | Pan-Nigerian | `vo-pick-two.mp3` (ogg: human delivery) |
| `pick-three` | Pick three! | Pick three! | Gleeful, slightly more menacing than Pick two. | F, 30s | Whot 5 played | Pan-Nigerian | `vo-pick-three.mp3` (ogg: human delivery) |
| `hold-on` | Hold on! | Hold on! | Playful stop-hand energy, then an upward "go again". | M, 30s | Whot 1 played | Pan-Nigerian | `vo-hold-on.mp3` (ogg: human delivery) |
| `suspension` | Suspension! | Suspension! | Announcer tone, mock-official, grinning. | M, 40s | Whot 8 played | Pan-Nigerian | `vo-suspension.mp3` (ogg: human delivery) |
| `market-don-open` | Market don open! | The market is open! | Big, market-trader call, loud and joyful, like opening the shutters. | F, 40s, Igbo-Lagos | Whot 14 General Market | Pidgin | `vo-market-don-open.mp3` (ogg: human delivery) |
| `whot` | Whot! | Whot! | Triumphant, slightly drawn out, then the caller names a shape. | M or F | Whot 20 played | Pan-Nigerian | `vo-whot.mp3` (ogg: human delivery) |
| `goal` | Goal! | Goal! | Stadium commentator, long rising "Goooal!", high energy. | M, 30s | Penalty King goal | Pan-Nigerian | `vo-goal.mp3` (ogg: human delivery) |
| `saved` | Saved! | Saved! | Sharp, triumphant, punchy; shorter than Goal. | M, 30s | Penalty King save | Pan-Nigerian | `vo-saved.mp3` (ogg: human delivery) |
| `madalla` | Madalla! | Excellent! | Warm, generous praise. Hausa word: native Hausa speaker records it. | M or F, Hausa speaker, 30-50 | celebration, results (rotated) | Hausa | `vo-madalla.mp3` (ogg: human delivery) **needsNativeReview: true (ha)** |
| `o-di-mma` | Ọ dị mma! | That's good! | Gentle, smiling approval. Igbo phrase: native Igbo speaker records it. | F, 40-60, Igbo speaker | celebration, results (rotated) | Igbo | `vo-o-di-mma.mp3` (ogg: human delivery) **needsNativeReview: true (ig)** |
| `e-ku-ise` | Ẹ kú iṣẹ́! | Well done on your work! | Respectful and warm, elder-to-youth praise. Yoruba phrase: native Yoruba speaker records it. | M, 50-60, Yoruba speaker | celebration, results (rotated) | Yoruba | `vo-e-ku-ise.mp3` (ogg: human delivery) **needsNativeReview: true (yo)** |
| `you-try` | You try! | Well done! | Encouraging, like a coach. Short. | F, 30-50 | good move, level complete | Pidgin | `vo-you-try.mp3` (ogg: human delivery) |
| `no-wahala` | No wahala! | No worries! | Relaxed, reassuring, never patronising. | M, 20s-30s | after a mistake or fail | Pidgin | `vo-no-wahala.mp3` (ogg: human delivery) |
| `no-shaking` | No shaking, try again! | Don't worry, try again! | Cheerful encouragement, a smile after a loss. | F, 20s | lose screen | Pidgin | `vo-no-shaking.mp3` (ogg: human delivery) |
| `sharp-sharp` | Sharp sharp! | Quickly! | Brisk, urgent but friendly. | M, 30s | timer low, runner speed-up | Pidgin | `vo-sharp-sharp.mp3` (ogg: human delivery) |
| `e-choke` | E choke! | That's amazing! | Wide-eyed amazement, big combo or perfect round. Slang: casual youth tone. | M or F, 20s, Lagos | combo, perfect round | Lagos slang | `vo-e-choke.mp3` (ogg: human delivery) |
| `correct` | Correct! | Correct! | Bright quiz-show confirmation, sharp "t". | F, 30s | Sabi Quiz right answer | Pan-Nigerian | `vo-correct.mp3` (ogg: human delivery) |
| `ah-ah` | Ah ah! No be that one. | Ah ah! Not that one. | Gentle surprise, a playful scolding, not harsh. | F, 30-50 | Sabi Quiz wrong answer | Pidgin | `vo-ah-ah.mp3` (ogg: human delivery) |
| `ready-go` | Ready? Oya go! | Ready? Go! | Counting-in energy, "Oya go!" bursts out. | M, 30s | Danfo Dash / Penalty King start | Pidgin | `vo-ready-go.mp3` (ogg: human delivery) |
| `enter-enter` | Oya enter, enter! Last seat! | Hop in, hop in! Last seat! | Rapid conductor chant, rhythmic and sing-song. Keep friendly; no mocking of conductors. | M, 20s-40s, Lagos | Danfo Dash start / pickups | Lagos | `vo-enter-enter.mp3` (ogg: human delivery) |
| `you-don-win` | You don win! | You won! | Full celebration, shout of joy, ends with laughter. | F or M, 30s | win screen, big win | Pidgin | `vo-you-don-win.mp3` (ogg: human delivery) |
| `sweet` | Sweet! | Sweet! | Short, delighted exhale. | any | match-3 combos, coin pickup streak | Pidgin | `vo-sweet.mp3` (ogg: human delivery) |

## Note on "Chai!"
`Chai!` is an exclamation of **dismay or awe** ("Oh no!", "Wow!"). It is used only for losing a big card or point (`vo-chai`). Do **not** use it on win or celebration screens (QA flagged "You win! Chai!" as ambiguous): use `you-don-win`, `e-choke`, `sweet` or a native praise line instead. A native speaker should confirm the register.

## Game-specific lines: Snakes & Ladders
Files in `games/snakes-ladders/assets/audio/voice/vo-<id>.mp3` (silent placeholders) and `assets/audio/voice-manifest.json`. Same rules as above. Lines marked `_review` need a native Pidgin check.
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | File |
|---|---|---|---|---|---|---|
| `sl-roll` | Oya, roll am! `_review` | Come on, roll it! | Bright, quick, smile in the voice. | F or M, 20s to 30s | prompt to roll after idle | `vo-sl-roll.mp3` |
| `sl-ladder` | Enter, enter! Up we go! | Hop on, up we go! | Cheerful, rhythmic; never mocking conductors. | M, 20s to 40s, Lagos | ladder climbed | `vo-sl-ladder.mp3` |
| `sl-pothole` | Ah ah! Pothole! | Oh no, a pothole! | Comic dismay, short, never mocking. | F, 30-50 | pothole snake | `vo-sl-pothole.mp3` |
| `sl-goslow` | Go-slow don catch you! | You're stuck in traffic! | Playful, sympathetic. | M, 30s | go-slow, toll, NEPA snakes | `vo-sl-goslow.mp3` |
| `sl-six` | Six! Roll again! | Six! Roll again! | Bright, punchy. | F, 30s | rolled a six | `vo-sl-six.mp3` |
| `sl-reroll` | Roll am again! `_review` | Roll it again! | Upbeat, a wink. | M or F, 20s | re-roll used | `vo-sl-reroll.mp3` |
| `sl-exact` | Exact number, abeg! `_review` | You need the exact number! | Friendly reminder. | F, 30s | overshoot near 100 | `vo-sl-exact.mp3` |
| `sl-almost` | Almost there! E don near! `_review` | Almost there! | Encouraging, rising. | M, 30s | within 6 of finish | `vo-sl-almost.mp3` |
Shared lines also used: `oya`, `your-turn`, `you-don-win`, `no-shaking`, `no-wahala`.

## Wiring (for the developer)
- Manifest shape: `{ _readme, lines: [...] }`; per line `files.mp3`, `files.ogg` (null until delivered), `needsNativeReview`.
- Load lazily after first user gesture; fall back to silence when a file is missing or 0-length.
- Cap concurrent voice at 1 and duck music by 6 dB while a voice line plays.
- Voice is optional: toggled with the Sound setting, and every voice line also exists as on-screen text via `t('voice.<id>')`.
- CPU persona banter (see `docs/assets/PERSONAS.md`) is **text-only in v1**. A stretch goal is two recorded lines per persona.

## Pronunciation notes
- "Oya" = OH-yah. "Chai" = CHYE (rhymes with "high"). "Abeg" = ah-BEG. "Wahala" = wah-HAH-lah.
- "Ẹ kú iṣẹ́" = eh KOO ee-SHEH (Yoruba; tone marks matter, native speaker to confirm).
- "Ọ dị mma" = aw dee MMAH (Igbo; native speaker to confirm).
- "Madalla" = mah-DAH-lah (Hausa; native speaker to confirm).

## Game-specific lines: Naija Ludo
Files in `games/naija-ludo/assets/audio/voice/vo-<id>.mp3` (silent placeholders) and `assets/audio/voice-manifest.json`. Same rules as above. Lines marked `_review` need a native Pidgin check. Shared lines also used: `oya`, `your-turn`, `you-don-win`, `no-shaking`, `e-don-do`, `sweet`.
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | File |
|---|---|---|---|---|---|---|
| `ld-six` | Six! Oya, comot! `_review` | Six! Out you come! | Punchy, bright. | F, 30s | rolled a six | `vo-ld-six.mp3` |
| `ld-capture` | Ah ah, captured! | Oh, captured! | Playful surprise, never mocking. | M, 30s | a capture | `vo-ld-capture.mp3` |
| `ld-home` | E don reach house! `_review` | One seed home! | Warm, pleased. | F, 40s | seed reaches home | `vo-ld-home.mp3` |
| `ld-again` | Roll again o! | Roll again! | Friendly nudge. | M or F, 20s | bonus roll | `vo-ld-again.mp3` |
| `ld-triple` | Three sixes o! Turn don pass. `_review` | Three sixes! Turn passes. | Gentle comic sympathy. | M, 30s | triple six | `vo-ld-triple.mp3` |
| `ld-exact` | Exact number, abeg! `_review` | You need the exact number! | Friendly reminder. | F, 30s | exact-roll rule | `vo-ld-exact.mp3` |
| `ld-safe` | You safe for here! `_review` | Safe on the star! | Reassuring. | F, 30s | landing on a star | `vo-ld-safe.mp3` |
| `ld-last` | Last one! Carry am go home! `_review` | Last seed! Take it home! | Encouraging, rising. | M, 30s | final seed | `vo-ld-last.mp3` |

## Game-specific lines: Ayo Olopon
Files in `games/ayo-olopon/assets/audio/voice/vo-<id>.mp3` (silent placeholders) and `assets/audio/voice-manifest.json`. Full table with directions: `docs/assets/ayo-olopon-brief.md` section 9. Lines: `ay-start` (Oya, make we play Ayo!), `ay-capture`, `ay-chain`, `ay-lost`, `ay-feed`, `ay-count`, `ay-skip`, `ay-close`. Lines marked `_review` need a native Pidgin check. Shared lines also used: `oya`, `your-turn`, `you-don-win`, `no-shaking`, `e-ku-ise`, `e-don-do`.

## Game-specific lines: Naija Whot
Files in `games/naija-whot/assets/audio/voice/vo-<id>.mp3` (silent placeholders) and `assets/audio/voice-manifest.json`. Full table with directions: `docs/assets/naija-whot-brief.md` section 7. Lines: `wh-shuffle` (Make I shuffle well well.), `wh-call` (Na this shape I need!), `wh-caught` (You no talk o! Pick two!), `wh-defend` (Ehen! Pick two for you too!), `wh-market-empty` (Market don finish. Shuffle again!), `wh-safe`, `wh-close`, `wh-win`. All Pidgin lines `_review`. Shared lines also used: `last-card`, `semi-last-card`, `pick-two`, `pick-three`, `hold-on`, `suspension`, `market-don-open`, `whot`, `oya`, `your-turn`, `you-don-win`.

## Game-specific lines: Sabi Quiz
Files in `games/sabi-quiz/assets/audio/voice/vo-<id>.mp3` (silent placeholders) and `assets/audio/voice-manifest.json`. Speaker: **Uncle Etim**, the quiz host (M, 40s; a warm, theatrical showman, never sarcastic; an Efik or Calabar-flavoured voice is welcome, no exaggerated accent). Same rules as above: every Pidgin line is `_review` for a native check. Shared lines also used: `oya`, `madalla`, `e-ku-ise`, `you-don-win`, `e-don-do`.
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | File |
|---|---|---|---|---|---|---|
| `sq-start` | Oya, make we see who sabi! `_review` | Come on, let's see who knows! | Bright, rising, TV-host opening. | M, 40s | round or duel start | `vo-sq-start.mp3` |
| `sq-correct` | Correct! You sabi o! `_review` | Correct! You really know it! | Warm, delighted. | M, 40s | correct answer (rotate with `madalla`) | `vo-sq-correct.mp3` |
| `sq-wrong` | Ah ah, nearly! Na so e dey go. `_review` | So close! That's how it goes. | Gentle and kind, a smile in the voice, never mocking. | M, 40s | wrong answer | `vo-sq-wrong.mp3` |
| `sq-streak` | Fire dey burn! Na three in a row! `_review` | You're on fire! Three in a row! | Excited, a build-up. | M, 40s | streak x3 | `vo-sq-streak.mp3` |
| `sq-padi` | Make we hear wetin your padi dem talk. `_review` | Let us hear what your friends say. | Playful, curious. | M, 40s | ask your padi | `vo-sq-padi.mp3` |
| `sq-last5` | Time dey go o! Five seconds! `_review` | Time is running! Five seconds! | Urgent but friendly, quick. | M, 40s | last 5 s (optional) | `vo-sq-last5.mp3` |
| `sq-daily` | Today questions don land! `_review` | Today's questions have arrived! | Announcing, upbeat. | M, 40s | daily challenge opens | `vo-sq-daily.mp3` |
| `sq-duel` | Quiz Duel! Who go press first? `_review` | Quiz Duel! Who will buzz first? | Announcer, grinning, dramatic pause before "first". | M, 40s | duel intro | `vo-sq-duel.mp3` |
| `sq-win` | Sabi person! You don win! `_review` | A true know-it-all! You win! | Big, proud, celebratory. | M, 40s | round or duel won | `vo-sq-win.mp3` |
| `sq-lose` | No vex. Next round go better. `_review` | No worries. The next round will be better. | Kind and encouraging, never pitying. | M, 40s | round lost | `vo-sq-lose.mp3` |


## Game-specific lines: Sabi Words
Files in `games/sabi-words/assets/audio/voice/vo-<id>.mp3` (silent placeholders) and `assets/audio/voice-manifest.json`. Speaker: **Osas**, the guide (F, 30s; a warm, meticulous sign-painter, playful but never sarcastic; an Edo or Benin-flavoured voice is welcome, no exaggerated accent). Same rules as above: every Pidgin line is `_review` for a native check. Shared lines also used: `oya`, `madalla`, `e-ku-ise`, `you-don-win`, `e-don-do`.
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | File |
|---|---|---|---|---|---|---|
| `sw-koyo` | Kóyo! Welcome. Make we find some words. `_review` | Kóyo! Welcome. Let us find some words. | Warm greeting; `Kóyo` is the Edo hello, an Edo speaker sets the tones. | F, 30s | first launch or menu | `vo-sw-koyo.mp3` |
| `sw-start` | Oya, make we find the words! `_review` | Come on, let's find the words! | Bright, quick, rising. | F, 30s | level start | `vo-sw-start.mp3` |
| `sw-found` | Ehen! You see am! `_review` | There it is! You found it! | Delighted, a small laugh. | F, 30s | word found (rotate with `madalla`) | `vo-sw-found.mp3` |
| `sw-long` | Chai! Na big word be that! `_review` | Wow! That is a big word! | Impressed, big, short. | F, 30s | 8+ letter word found | `vo-sw-long.mp3` |
| `sw-wrong` | Hmm, no be word o. Try again. `_review` | Hmm, that's not a word. Try again. | Gentle and kind, a smile in the voice, never mocking. | F, 30s | wrong swipe (sparingly) | `vo-sw-wrong.mp3` |
| `sw-hint` | Make I light lantern for you small. `_review` | Let me light a lantern for you. | Soft, conspiratorial, helpful. | F, 30s | hint used | `vo-sw-hint.mp3` |
| `sw-last5` | Time dey go o! Five seconds! `_review` | Time is running! Five seconds! | Urgent but friendly, quick. | F, 30s | last 5 s (optional) | `vo-sw-last5.mp3` |
| `sw-star3` | Three stars! Sabi person! `_review` | Three stars! A real word master! | Proud, rising on "Three". | F, 30s | three-star finish | `vo-sw-star3.mp3` |
| `sw-win` | All the words don show! Well done! `_review` | Every word is found! Well done! | Big, warm, celebratory. | F, 30s | level complete | `vo-sw-win.mp3` |
| `sw-lose` | No wahala. Make we try am again. `_review` | No problem. Let us try again. | Kind and encouraging, never pitying. | F, 30s | time ran out | `vo-sw-lose.mp3` |
| `sw-pack` | Which pack you wan play today? `_review` | Which pack do you want to play today? | Curious, friendly. | F, 30s | pack picker opens | `vo-sw-pack.mp3` |
