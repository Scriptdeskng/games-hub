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

## Game-specific lines: Draughts Naija
Files in `games/draughts-naija/assets/audio/voice/vo-<id>.mp3` (silent placeholders) and `assets/audio/voice-manifest.json`. Speaker: **the table umpire**, a neutral voice (M or F, 30s to 50s; warm and quick, never sarcastic, no exaggerated accent), so the three CPU personas (Doosuur, Falmata, Damola) need no voice. Same rules as above: every Pidgin line is `_review` for a native check. Shared lines also used: `oya`, `e-don-do`, `you-don-win`, `madalla`.
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | File |
|---|---|---|---|---|---|---|
| `dn-start` | Oya, make we play! `_review` | Come on, let's play! | Bright, quick, rising. | any adult | game start | `vo-dn-start.mp3` |
| `dn-capture` | Chop am! `_review` | Taken! | Short, punchy, a grin in the voice; "chop" is draughts slang for capture. | any adult | capture (sparingly, rotate) | `vo-dn-capture.mp3` |
| `dn-must` | Capture first o! `_review` | You must capture first! | Friendly reminder, never scolding. | any adult | non-capturing move attempted | `vo-dn-must.mp3` |
| `dn-chain` | Ehen! Jump, jump, jump! `_review` | Jump after jump! | Rising and delighted, three quick beats. | any adult | multi-capture of 3 or more | `vo-dn-chain.mp3` |
| `dn-king` | King don show! `_review` | A king is crowned! | Proud announcement, a little drawn out on "king". | any adult | crowning | `vo-dn-king.mp3` |
| `dn-illegal` | No be that way o. `_review` | Not that way. | Gentle, kind, quick. | any adult | illegal move (sparingly) | `vo-dn-illegal.mp3` |
| `dn-last` | Last piece o! `_review` | One piece left! | Sharp table call, strong stress on "last". | any adult | a side down to one piece | `vo-dn-last.mp3` |
| `dn-win` | You be correct player! You don win! `_review` | Well played! You win! | Big, warm, celebratory. | any adult | player wins | `vo-dn-win.mp3` |
| `dn-lose` | Small small, you go catch am next time. `_review` | Little by little, you'll get it next time. | Kind and encouraging, never pitying. | any adult | player loses | `vo-dn-lose.mp3` |
| `dn-draw` | E be like say we level o. `_review` | Looks like we are level. | Relaxed, a smile, even. | any adult | draw | `vo-dn-draw.mp3` |

## Game-specific lines: Penalty King
Files in `games/penalty-king/assets/audio/voice/vo-<id>.mp3` (silent placeholders) and `assets/audio/voice-manifest.json`. Speaker: **the pitch commentator**, an invented generic voice (M or F, 30s to 50s; warm, quick, family friendly; not modelled on any real commentator; no exaggerated accent). Same rules as above: every Pidgin line is `_review` for a native check. Shared lines also used: `goal`, `saved`, `ready-go`, `chai`, `madalla`, `e-ku-ise`, `you-don-win`, `e-don-do`.
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | File |
|---|---|---|---|---|---|---|
| `pk-start` | Oya, penalty time! `_review` | Come on, penalty time! | Bright, quick, rising on "time". | any adult | shootout start | `vo-pk-start.mp3` |
| `pk-goal` | Goal! E don enter! `_review` | Goal! It's in! | Long rising "Goooal", then a delighted "E don enter". | any adult | goal (rotate with `goal`) | `vo-pk-goal.mp3` |
| `pk-rocket` | Chai! Na rocket be that! `_review` | Wow! What a rocket! | Impressed, big, short. | any adult | hard sweet-spot goal | `vo-pk-rocket.mp3` |
| `pk-saved` | Keeper don save am! Wetin be that! `_review` | The keeper saves it! What a stop! | Sharp, triumphant, punchy. | any adult | save (rotate with `saved`) | `vo-pk-saved.mp3` |
| `pk-post` | E knock the post! So close! `_review` | Off the post! So close! | A gasp, then a laugh of disbelief. | any adult | post or bar | `vo-pk-post.mp3` |
| `pk-over` | E fly pass the bar o! `_review` | Over the bar! | Rueful, a little drawn out. | any adult | over | `vo-pk-over.mp3` |
| `pk-wide` | Wide! E miss the goal! `_review` | Wide of the goal! | Rueful, quick. | any adult | wide | `vo-pk-wide.mp3` |
| `pk-level` | Score don level o! `_review` | The score is level! | Tense, building. | any adult | level after five kicks | `vo-pk-level.mp3` |
| `pk-sudden` | Sudden death! No room for mistake! `_review` | Sudden death! No room for error! | Low and tense, a pause before "No room". | any adult | sudden death | `vo-pk-sudden.mp3` |
| `pk-qf` | Quarter-final! Make we go! `_review` | Quarter-final! Here we go! | Announcing, upbeat. | any adult | cup QF | `vo-pk-qf.mp3` |
| `pk-sf` | Semi-final! Only four teams remain! `_review` | Semi-final! Only four teams remain! | Rising, a little awe. | any adult | cup SF | `vo-pk-sf.mp3` |
| `pk-final` | Na the final be this! `_review` | This is the final! | Big, slow, dramatic. | any adult | cup final | `vo-pk-final.mp3` |
| `pk-advance` | You don waka enter next round! `_review` | You are through to the next round! | Warm, celebratory. | any adult | bracket advance | `vo-pk-advance.mp3` |
| `pk-win` | You don win! Penalty King! `_review` | You win! Penalty King! | Big, warm, celebratory. | any adult | shootout won | `vo-pk-win.mp3` |
| `pk-champion` | Champion! Na your own cup! `_review` | Champions! The cup is yours! | The biggest line: long, proud, rising. | any adult | cup won | `vo-pk-champion.mp3` |
| `pk-lose` | No vex. Next time go better. `_review` | Tough one. Next time will be better. | Kind and encouraging, never pitying. | any adult | shootout lost | `vo-pk-lose.mp3` |
| `pk-knockout` | Cup run don end. You go try again. `_review` | Your cup run ends here. Try again. | Gentle, steady, encouraging. | any adult | knocked out of cup | `vo-pk-knockout.mp3` |

## Game-specific lines: Akọni & Dike
Files in `games/akoni-dike/assets/packs/shared-kiriji/audio/voice/vo-ak-<id>.mp3` and `shared-ekumeku/audio/voice/vo-ek-<id>.mp3` (silent placeholders) plus `voice-manifest.json`. **Only battle and stealth barks are recorded; all story text is read on screen.** Same rules as above: Nigerian voice actors, Yoruba and Igbo by native speakers who confirm spelling and tone marks, never TTS, never a faked accent; each line <= 1.2 s, 3 takes (neutral, brighter, softer); the rival side speaks in the same respectful register as the heroes; **Company constables speak plain neutral English with no ethnic accent signal**. Every Pidgin line is `_review`; every Yoruba or Igbo line is `_review` and tagged for native review; `(native speaker to supply)` means the line is not guessed. Full direction: `docs/assets/akoni-dike-brief/05-audio-music-voice.md` section 5.
| ID | Speaker | English | Pidgin (pcm) | Yoruba or Igbo | Direction | Used for |
|---|---|---|---|---|---|---|
| `ak-move` | Bisi or ally | Move out! | Oya, move! `_review` | n/a | brisk | Follow, Charge |
| `ak-lets-go` | ally | Let's go! | n/a | `Ẹ jẹ́ ká lọ!` (yo) `_review` | rising, shared | Charge |
| `ak-hold` | ally | Hold the line! | Hold am there! `_review` | `Ẹ dúró!` (yo, proposed) `_review` | firm | Hold |
| `ak-careful` | ally | Careful! | Abeg, careful! `_review` | `Ẹ ṣọ́ra!` (yo, proposed) `_review` | alert | enemy tell |
| `ak-akin-show` | Akin | Let me show them! | Make I show dem! `_review` | n/a | proud, playful | long-shot ability |
| `ak-akin-heard` | Akin | They will hear us! | Dem go hear us! `_review` | n/a | proud | after the crack |
| `ak-akin-see` | Akin | I see him! | I don see am! `_review` | n/a | quick | target marked |
| `ak-drummer` | drummer | Listen! | n/a | `Ẹ gbọ́!` (yo, proposed) `_review` | short call | before the rally |
| `ak-bisi-steady` | Bisi | Steady. | Steady. `_review` | n/a | low, calm | Hunter's Eye |
| `ak-bisi-up` | Bisi | I'm still standing. | I still dey stand. `_review` | n/a | grit | recovery |
| `ak-rival-hold` | rival captain | Hold your ground! | n/a | `Ẹ dúró ṣinṣin!` (yo, proposed) `_review` | disciplined, respectful | rival group |
| `ak-rival-yield` | rival | Enough. I yield. | Enough. I don yield. `_review` | `Ó tó.` (yo, proposed) `_review` | dignified | disarmed rival |
| `ak-peace` | messenger | Lower your weapons. | Put your weapon down. `_review` | `Ẹ fi ohun ìjà sílẹ̀.` (yo, proposed) `_review` | calm, clear | Kiriji 6 |
| `ak-moremi-torch` | Moremi (flagged) | Light the torches! | n/a | `Ẹ tan iná!` (yo, proposed) `_review` | commanding, warm | prologue |
| `ek-whisper` | Nkem | Ekumeku. | n/a | `Ekumeku.` (ig) `_review` | **whispered only** | stealth |
| `ek-go` | Nkem or ally | Go! | Oya, move! `_review` | `Gaa!` (ig, proposed) `_review` | low, urgent | Ekumeku orders |
| `ek-hide` | ally | Hide! | Hide, hide! `_review` | `Zoonụ!` (ig, proposed) `_review` | hushed | stealth |
| `ek-quiet` | ally | Quiet. | Make una quiet. `_review` | `Mee nwayọọ.` (ig, proposed) `_review` | hushed | stealth |
| `ek-now` | Nkem | Now! | Now now! `_review` | `Ugbu a!` (ig, proposed) `_review` | sharp | ambush |
| `ek-okeke-ring` | Okeke | Let them hear it! | Make dem hear am! `_review` | (native speaker to supply) | joker's confidence | ogene reveal |
| `ek-ada-here` | Ada | Over here! | Oya, look this side! `_review` | `Lee ebe a!` (ig, proposed) `_review` | draws attention, never a haggling cry | distraction |
| `ek-child` | Nkem | I've got you. | I don carry you. `_review` | (native speaker to supply) | gentle | Ekumeku 4 carry |
| `ek-con-halt` | constable | Halt! Who goes there? | n/a | n/a | flat, procedural | patrol |
| `ek-con-search` | constable | Search the barns! | n/a | n/a | procedural | search |
| `ek-con-here` | constable | Over here! | n/a | n/a | alert | spotted |
| `ek-con-back` | Captain Harrow | Column, withdraw. | n/a | n/a | composed | Ekumeku 5 finale |
Shared lines also used: `oya`, `e-ku-ise`, `o-di-mma`, `no-wahala`, `no-shaking`. The shared celebratory lines `madalla` (Hausa) and `koyo` (Edo) are **not** used in this game (brief part 5 section 6). Every Pidgin line above is `_review`, including those that read the same as the English.
