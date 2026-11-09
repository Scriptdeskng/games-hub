# CPU personas

The CPU opponents shared across the catalogue (eight originals, plus Uncle Etim and Dung added with Sabi Quiz) (CULTURAL_GUIDE section 2). The player is always the only human; these are the characters they play against or are coached by.

Rules: personalities are **individual, never ethnic stereotypes** (no "stingy", "trader", "hustler" or similar tropes tied to a group). Regions below describe where a character is from or lives; they do not define their personality. Together they span regions, ages and genders. Humour is kind and everyday.

Art status: `packages/core/assets/avatars/<id>.svg` (128x128 viewBox, square, rounded by CSS) and the combined `persona-sheet.svg` are **placeholder vector portraits** built from shapes. A human illustrator replaces them (see HUMAN_ASSETS.md).

Banter format: each line has `en` and `pcm` (Nigerian Pidgin). `_review: true` means the Pidgin or the foreign-language word needs a human check. **Yoruba, Igbo and Hausa words are always flagged for native-speaker review**, including diacritics. Developer keys: `persona.<id>.<n>` (n = 1 to 8).

| Id | Name | Region (home) | Age | Skin token (avatar) | Headwear / hair | Games |
|---|---|---|---|---|---|---|
| `mama-nkechi` | Mama Nkechi | Igbo, Enugu | 50s | `#7B4A2E` | Orange gele, gold hoops | Mama Put Match guide, Whot, coaching tips everywhere |
| `baba-ade` | Baba Ade | Yoruba, Ibadan | 60s | `#4A2C1A` | Wine fila, round glasses, grey beard | Ayo Olopon, Ludo |
| `malam-sani` | Malam Sani | Hausa-Fulani, Kano | 40s to 50s | `#8A5A3A` | White embroidered kufi, trimmed beard | Draughts, Ayo |
| `tari` | Tari | Ijaw, Port Harcourt | 20 | `#5E3822` | Short box braids, headphones | Snakes & Ladders, Whot |
| `efe` | Efe | Urhobo, Warri (drives in Lagos) | 30s | `#3B2314` | Low cut | Danfo Dash, Snakes & Ladders |
| `aisha` | Aisha | Hausa, Kaduna | 20s | `#A8744C` | Teal hijab, round glasses | Sabi Quiz, Draughts, Sabi Words, Whot |
| `chidi` | Chidi | Igbo, Owerri | 20s | `#6B3F26` | Short twists | Penalty King |
| `funmi` | Funmi | Yoruba, Lagos | 30s | `#94613D` | Cornrows into a bun, gold hoops | Ludo, Whot |
| `etim` | Uncle Etim | Efik, Calabar | 40s | `#5A3520` | Short hair, ankara bow tie, hand microphone | Sabi Quiz host (never plays) |
| `dung` | Dung | Berom, Jos (Plateau, Middle Belt) | 30s | `#6E4128` | Low cut, short beard, camera strap | Sabi Quiz duel (Medium) |

Skin tones cover the dark to medium-brown range (`#3B2314` to `#A8744C`).

---

## Mama Nkechi (`mama-nkechi`)
**Region:** Igbo, Enugu. Runs a mama-put canteen (guide brief); her role in the games is **coach**, not trader.
**Play style:** a coach: steady, encouraging, explains why a move was good. No haggling, bargaining or trade lines. In Whot she plays safe cards first and keeps one Whot 20 in reserve; as guide she gives hints and praise. Difficulty: Easy and Medium by default.
**Colour world:** Market Spice / Aso-oke Gold.
**Animation cue:** avatar pops with a warm smile; spoon-tap ekwe click.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Come, let me show you something small. | Come, make I show you small something. | |
| 2 | Good move, my dear. You are thinking well. | Correct move, my dear. You dey think well. | |
| 3 | Ehen! You are learning fast. | Ehen! You dey learn fast o. | |
| 4 | Don't rush. The soup is still on the fire. | No rush. Soup still dey fire. | |
| 5 | Ah ah, not your best, but we go again. | Ah ah, that one no too sharp, but we go again. | `_review: true` |
| 6 | Well done! Ọ dị mma! | Well done! Ọ dị mma! | Igbo `Ọ dị mma` ("it is good"): `_review: true` (native speaker) |
| 7 | I am watching you o, don't think I am not. | I dey watch you o, no think say I no dey see. | |
| 8 | Sit down small and take some water. You have earned it. | Sit down small, drink water. You don earn am. | |

## Baba Ade (`baba-ade`)
**Region:** Yoruba, Ibadan. Proud retired teacher, loves Ayo.
**Play style:** classical and methodical. In Ayo he builds long sowing chains and counts seeds aloud; patient and slightly stern but kind. Difficulty: Medium to Hard.
**Colour world:** Adire Indigo.
**Animation cue:** adjusts glasses, taps the table.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | My child, let me teach you a lesson in patience. | My pikin, make I teach you lesson for patience. | |
| 2 | In my school days, I never lost at Ayo. | For my school time, I never lose Ayo before. | `_review: true` |
| 3 | Hmm. Interesting move. Very interesting. | Hmm. Interesting move. Very interesting. | |
| 4 | Ẹ kú iṣẹ́! Well done on your work. | Ẹ kú iṣẹ́! You don try. | Yoruba `Ẹ kú iṣẹ́`: `_review: true` (native speaker, check tone marks) |
| 5 | Count your seeds carefully. | Count your seed well well. | |
| 6 | Wisdom does not rush. | Wisdom no dey rush. | `_review: true` |
| 7 | Ah! You have caught me. Well played. | Ah! You don catch me. Well played. | |
| 8 | Sit up. The next move is a big one. | Sit up well. Next move na big one. | |

## Malam Sani (`malam-sani`)
**Region:** Hausa-Fulani, Kano. Calm, patient strategist.
**Play style:** defensive and deliberate. Thinks a little longer before each move (0.9 to 1.2 s think delay), sets traps three moves ahead, rarely takes risks. Difficulty: Hard.
**Colour world:** Northern Earth.
**Animation cue:** slow nod; calabash tap.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Patience is also a move. | Patience na move too. | |
| 2 | Take your time. The board is not going anywhere. | Take your time. Board no dey go anywhere. | |
| 3 | Hmm. I see what you are doing. | Hmm. I see wetin you dey do. | |
| 4 | Madalla! A good move. | Madalla! Correct move. | Hausa `Madalla`: `_review: true` |
| 5 | I have already thought three moves ahead. | I don already think three moves ahead. | `_review: true` |
| 6 | No problem. We learn from every game. | No wahala. We dey learn from every game. | |
| 7 | Sannu, my friend. Let us begin. | Sannu o, my padi. Make we start. | Hausa `Sannu` (greeting): `_review: true` |
| 8 | A calm mind wins. | Calm mind dey win. | `_review: true` |

## Tari (`tari`)
**Region:** Ijaw, Port Harcourt. Cool university student.
**Play style:** fast and a bit daring. Short think delay (0.4 to 0.6 s), takes aggressive lines in Snakes & Ladders power-up use and Whot attacks. Difficulty: Medium.
**Colour world:** Creek & Coral.
**Animation cue:** headphone bob, small smirk.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Omo, this one is easy. | Omo, this one easy. | slang `Omo` (Yoruba-derived): `_review: true` |
| 2 | No wahala, I've got this. | No wahala, I get this one. | |
| 3 | Wait, you are actually good? Respect. | Wait, you sabi like this? Respect. | |
| 4 | I'm just warming up, abeg. | I just dey warm up, abeg. | |
| 5 | Ah, that was a vibe! | Ah, that one sweet me! | |
| 6 | Relax, let me cook. | Relax, make I cook. | |
| 7 | Lectures are over. Now it's game time. | Lecture don end. Na game time now. | |
| 8 | Not today, you can't beat me. | You no fit beat me today. | |

## Efe (`efe`)
**Region:** Urhobo, Warri; works in Lagos as a danfo driver. Cheerful, sings while he plays.
**Play style:** quick, talkative and optimistic; takes shortcuts in Snakes & Ladders, loud celebrations, apologises cheerfully when he captures. Difficulty: Easy to Medium.
**Colour world:** Danfo Yellow.
**Animation cue:** music notes float from his mouth; horn "poom-poom".

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Oya, hop in, we are moving! | Oya, enter, we dey go! | |
| 2 | Yellow bus, yellow luck! | Yellow bus, yellow luck! | |
| 3 | Hold tight, no go-slow on this road. | Hold body, no go-slow for this road. | |
| 4 | Ehen! Who wants a song? | Ehen! Who wan hear song? | |
| 5 | Sorry o, I overtook you. | Sorry o, I don overtake you. | |
| 6 | Just a small pothole. We move on. | Na small pothole. We move on. | |
| 7 | Last stop! Everybody enjoyed the ride. | Last stop! Everybody don enjoy. | |
| 8 | Free ride today, but don't miss your turn o! | Free ride today, but no miss your turn o! | |

## Aisha (`aisha`)
**Region:** Hausa, Kaduna. Bookish quiz champion.
**Play style:** precise and quick on facts; in Quiz Duel she answers fast and rarely misses (Hard). She explains politely when you miss. In Draughts she plays tidy structure. In Whot (seat 3) she hoards Whot 20 cards until she has three or fewer cards left, counts the cards played and calls the shape the next player is least likely to hold.
**Colour world:** Creek & Coral teal accents on Adire Indigo menus; Danfo Yellow cream.
**Animation cue:** pushes up glasses; page-flick ekwe click.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Ready for a challenge? I read the whole encyclopaedia. | You ready for challenge? I don read the whole book. | |
| 2 | Correct! That one was in chapter three. | Correct! That one dey chapter three. | |
| 3 | Hmm, not quite. Let me explain. | Hmm, e no be so. Make I explain. | `_review: true` |
| 4 | Fast fingers, good brain. I like it. | Fast hand, good brain. I like am. | |
| 5 | Haba! You got me there. | Haba! You catch me there. | Hausa `Haba` (exclamation): `_review: true` |
| 6 | Knowledge is power, but speed is points. | Sabi na power, but speed na points. | `_review: true` |
| 7 | Don't worry. Everyone fails the first time. | No worry. Everybody dey fail first time. | |
| 8 | Final answer? Are you sure? | Na your final answer? You sure? | |

## Chidi (`chidi`)
**Region:** Igbo, Owerri. Football-mad goalkeeper.
**Play style:** confident and theatrical. As keeper he reads the player's last two shots and dives to the favourite corner; as striker he varies placement. Difficulty tunes reaction time. Never uses real club or player names.
**Colour world:** Market Spice greens / Naija Green.
**Animation cue:** gloves slap; whistle accent.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | You cannot score past me! | You no fit score me! | |
| 2 | Saved! What a dive! | Saved! See dive! | |
| 3 | Ah! That one was too close. | Ah! That one too close o. | |
| 4 | Goal! Okay, okay, I will remember you. | Goal! Okay, okay, I go remember you. | |
| 5 | Left or right? I know your mind. | Left or right? I sabi wetin dey your mind. | |
| 6 | Ndo o, better luck next time. | Ndo o, next time go better. | Igbo `Ndo` (sympathy, "sorry"): `_review: true` |
| 7 | Football is life, my friend. | Football na life, my padi. | |
| 8 | Come, come, take another shot. | Come, come, shoot again. | |

## Funmi (`funmi`)
**Region:** Yoruba, Lagos. Bubbly banker who never backs down at Ludo.
**Play style:** competitive; her job (banker) is background only: **no money, interest or bargain banter**. Captures whenever she can; avoids safe squares unless threatened; celebrates every capture with a cheerful line. Difficulty: Hard.
**Colour world:** Naija Green with Aso-oke Gold.
**Animation cue:** clap and wink; agogo ting on capture.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Ah ah, you want to capture me? Try it! | Ah ah, you wan capture me? Try am! | |
| 2 | Six! Come out, come out! | Six! Come out, come out! | |
| 3 | I never retreat. I never surrender. | I no dey retreat. I no dey surrender. | |
| 4 | Captured! Back to the start you go, my friend. | Captured! Go back to start, my padi. | `_review: true` |
| 5 | Ẹ má bínú, I had to do it. | Ẹ má bínú, I no get choice. | Yoruba `Ẹ má bínú` ("don't be angry"): `_review: true` (native speaker) |
| 6 | Abeg, roll again. I'm not afraid. | Abeg, roll again. I no fear. | |
| 7 | Home sweet home! One in, three to go. | Home sweet home! One don reach, three remain. | |
| 8 | Smile, it's only Ludo! | Smile na, na Ludo only! | `_review: true` |

---

## Review changes after QA round 1
- **Mama Nkechi**: the food-and-hospitality references were 4 of 8 lines (eat, chop, soup, plate) and, with a mama-put canteen and an Igbo identity, risked reading as an "Igbo trader / market mama" trope. Changed: lines 2 and 8 no longer mention food (now "You are thinking well" and "sit down small and take some water"); only line 4 ("soup is still on the fire") keeps one food image. Her role is explicitly coach. The occupation itself comes from the cultural guide and is kept.
- **Funmi**: the "interest on my seed" line (money banter tied to her banker job) is replaced by "Back to the start you go, my friend." Her occupation stays background only.
- **Efe**: unchanged (danfo driver is a Lagos everyday job named in the guide, lines are about the ride, not about the person).
- **"Chai!"**: not used in any persona line. In the voice script it is a dismay/awe exclamation only; it must not be used as a joy or win exclamation (VOICE_SCRIPT.md, "Note on Chai").
- **Religious-marker balance (decision)**: Malam Sani (embroidered cap) and Aisha (hijab) read as Muslim-coded and no southern persona carries a faith marker. My call: **do not add a Christian or traditional-religion marker to a southern persona**. The guide's avoid list forbids "religious symbols of any faith" and shrine imagery as decoration, and a cross or similar added only for balance would be exactly that tokenism. Instead: (1) Malam Sani's cap is documented as the **Hausa embroidered cap (hula/kufi)**, everyday northern headwear; (2) the northern pair stay, because the guide names both kufi and hijab for variety and Hausa-Fulani Muslim identity is simply the lived reality in much of the north; (3) the final illustrator is asked to give every persona the **same dignity of everyday dress** (no one dressed for worship), and (4) a human cultural reviewer decides whether to offer Aisha and Malam Sani **alternative non-religious headwear variants** selectable per region. Logged in HUMAN_ASSETS.md.
- **Regional balance (proposal for a later phase)**: Middle Belt, Edo, Efik/Ibibio and Kanuri have no persona. Proposed: (a) add a **9th persona, "Dung"** (Berom, Jos, Plateau, 30s; calm, observant photographer who plays a patient "wait and strike" style; no ethnic trope; avatar hand-painted by the illustrator); (b) add a **10th, "Ekaette"** (Efik, Calabar, 40s; cheerful teacher of word games, a natural host for Sabi Words; drawn with a headwrap, not a masquerade or carnival costume); (c) alternatively re-label Efe from Urhobo to **Edo (Benin City)** at zero art cost, trading one South-South group for another. Names and regions need native confirmation. Not implemented in this phase.

## Self-check
- Names original; no real person likeness; no brand.
- Personalities: coach, teacher, strategist, student, singer, scholar, goalkeeper, banker: none tied to an ethnic trope. Each of Yoruba, Igbo, Hausa-Fulani, Ijaw, Urhobo is represented (South-West, South-East, North-West, North-West/Kaduna, South-South), two women and two men per age band where possible.
- No religious dress used as a joke; the kufi and hijab are drawn as everyday, dignified clothing (both named in the guide). No sacred or masquerade regalia.


---

## Added with Sabi Quiz

Avatars for the two new personas are placeholders in `games/sabi-quiz/assets/avatars/etim.svg` and `dung.svg` (128x128 viewBox, same format as core). They fill the Middle Belt and Efik gaps listed above (the "Dung" proposal is now implemented; "Ekaette" stays reserved for Sabi Words). Names, regions and the Pidgin below need native confirmation (HUMAN_ASSETS). Personalities are individual, never ethnic tropes. Developer keys `persona.<id>.<n>`.

## Uncle Etim (`etim`)
**Region:** Efik, Calabar. 40s. Quiz host, not a CPU opponent: he announces, praises and consoles. Warm, theatrical, loves a dramatic pause; always lets a wrong answer down gently and never mocks.
**Colour world:** Aso-oke Gold with Creek & Coral accents.
**Animation cue:** tilts the microphone; agogo ting.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Good evening, quiz lovers! Settle down, we are starting. | Good evening o, quiz lovers! Make we start. | `_review: true` |
| 2 | Ten questions, fifteen seconds each. Fingers ready? | Ten questions, fifteen seconds each. Finger don ready? | `_review: true` |
| 3 | Correct! Give yourself a small clap. | Correct! Clap for yourself small. | |
| 4 | Ah ah, so close! Wait for the next one. | Ah ah, e nearly be! Wait for the next one. | `_review: true` |
| 5 | Three in a row! The fire is catching! | Three in a row! Fire don catch! | `_review: true` |
| 6 | Want to ask your padi? Why not! | You wan ask your padi? Why not! | |
| 7 | Time is moving o. Tick-tock! | Time dey run o. Tick-tock! | |
| 8 | A true sabi person! Well done. | Correct sabi person! Well done. | `_review: true` |

## Dung (`dung`)
**Region:** Berom, Jos, Plateau (Middle Belt). 30s. Calm, observant photographer.
**Play style (Quiz Duel, Medium):** "wait and strike". Looks first, answers late in the timer, but accurately (suggested about 72 percent, buzz 8 to 12 s). Never tied to an ethnic trope.
**Colour world:** Creek & Coral teal with Adire Indigo.
**Animation cue:** a small camera click; a slow nod.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Let me take a good look first. | Make I look am well first. | `_review: true` |
| 2 | Patience. The right moment will come. | Patience. Correct time go come. | `_review: true` |
| 3 | Click! I have the answer. | Click! I don get am. | |
| 4 | Good one. You were fast. | Correct one. You fast. | |
| 5 | Hmm, I was one second too late. | Hmm, I late by one second. | `_review: true` |
| 6 | The cool Jos air helps me think. | Jos cold dey help me think. | `_review: true` |
| 7 | Look closely. The answer is in the small details. | Look well well. Answer dey inside the small small details. | `_review: true` |
| 8 | Good game. Let us go again. | Good game. Make we run am again. | |

---

## Added with Sabi Words

One new persona: **Osas**, the guide of Sabi Words. Avatar is a placeholder in `games/sabi-words/assets/avatars/osas.svg` (128x128 viewBox, same format as core). She fills the **Edo** gap listed in `HUMAN_ASSETS.md` row 12 (the other South-South voices are Tari, Efe and Uncle Etim). Name, region and the Pidgin below need native confirmation (HUMAN_ASSETS rows 46 to 50). Personality is individual, never an ethnic trope. Developer keys `persona.osas.<n>`.

## Osas (`osas`)
**Region:** Edo, Benin City. 30s. Sign-painter and letterer who paints shop boards by hand (the origin of the painted-letter tiles). Guide and coach, not an opponent: she greets, praises and nudges; she never mocks a wrong swipe.
**Look:** skin `#6A4430`; adire-indigo head tie with a small knot; paintbrush behind the ear; cream apron with paint dots; plantain-yellow top. No royal or ceremonial regalia and no sacred symbol.
**Colour world:** Market Spice with Adire Indigo accents.
**Animation cue:** taps the brush on the board; agogo ting.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Kóyo! Welcome to my stall. Let us find some words. | Kóyo! Welcome to my stall. Make we find some words. | `_review: true` |
| 2 | Take your time and look in every direction. | Take your time, look for every side. | `_review: true` |
| 3 | There it is! You found it! | E dey there! You see am! | `_review: true` |
| 4 | That one is long. Well done! | That one long o. Well done! | |
| 5 | Not a word, but nice try. Swipe again. | No be word, but you try. Swipe again. | `_review: true` |
| 6 | Let me light the lantern for you. | Make I light lantern for you. | |
| 7 | The clock is moving o. Five seconds! | Time dey run o. Five seconds! | |
| 8 | Three stars! Every letter in its place. | Three stars! Every letter dey him place. | `_review: true` |

---

## Added with Draughts Naija

Three new personas, one per difficulty (Easy, Medium, Hard), chosen to fill regional gaps: **Doosuur** (Tiv, Makurdi, Middle Belt), **Falmata** (Kanuri, Maiduguri, North-East) and **Damola** (Yoruba, Abeokuta, campus rival). Avatars are placeholders in `games/draughts-naija/assets/avatars/<id>.svg` (128x128 viewBox, same format as core). Names, regions and **every Pidgin line below** need native confirmation (HUMAN_ASSETS rows 57 to 59): every row is `_review: true`. No Tiv or Kanuri words are used because correct spelling is not certain (HUMAN_ASSETS row 58). Personalities are individual, never ethnic tropes. Malam Sani and Aisha stay in the catalogue but are not Draughts opponents (regional balance). Developer keys `persona.<id>.<n>`.

| Id | Name | Region (home) | Age | Skin token | Headwear / hair | Level |
|---|---|---|---|---|---|---|
| `doosuur` | Doosuur | Tiv, Makurdi (Benue, Middle Belt) | 40s | `#4F2E1B` | short natural hair, small gold hoops, plain black-and-white striped shawl | Draughts Easy |
| `falmata` | Falmata | Kanuri, Maiduguri (Borno, North-East) | 20s | `#855536` | low bun with a pencil, grid-lined shirt, blank ID lanyard | Draughts Medium |
| `damola` | Damola | Yoruba, Abeokuta (Ogun) | 20s | `#5B3A25` | fade haircut, indigo varsity-style jacket with cream collar stripes, no logo | Draughts Hard |

## Doosuur (`doosuur`)
**Region:** Tiv, Makurdi, Benue (Middle Belt). 40s. A nurse who plays draughts on her break in the hospital canteen; warm and chatty, a patient teacher of beginners. Never a trade or farming trope.
**Play style (Easy):** friendly and loose; forgets long diagonals, explains why a move was good, lets small mistakes pass.
**Colour world:** Northern Earth terracotta.
**Animation cue:** a warm nod; ekwe click.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Welcome, my dear. Sit down, let's play small. | Welcome, my dear. Sit down, make we play small. | `_review: true` |
| 2 | Take your time. Nobody is chasing us. | Take your time. Nobody dey run us. | `_review: true` |
| 3 | Ah, nice move! You saw that one quickly. | Ah, correct move! You see that one fast. | `_review: true` |
| 4 | Oh! You have taken my piece. Well done. | Oh! You don chop my piece. Well done. | `_review: true` |
| 5 | Look carefully, there is a jump waiting for you. | Look well o, one jump dey wait you. | `_review: true` |
| 6 | A king already! Congratulations. | King don show already! Congrats. | `_review: true` |
| 7 | Hmm, let me think a little. | Hmm, make I think small. | `_review: true` |
| 8 | Good game, my dear. Let us play again. | Good game, my dear. Make we run am again. | `_review: true` |

## Falmata (`falmata`)
**Region:** Kanuri, Maiduguri, Borno (North-East). 20s. Final-year engineering student; quick and tactical, counts exchanges out loud, kind in defeat.
**Play style (Medium):** loves two-for-one trades and quick combinations; sometimes over-trades and leaves a side open.
**Colour world:** Adire Indigo with sky blue.
**Animation cue:** taps a pencil on the table; agogo ting.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Let me calculate this one. | Make I calculate this one. | `_review: true` |
| 2 | Two for one. I like that kind of trade. | Two for one. I like that kind exchange. | `_review: true` |
| 3 | Your left side is a little open. | Your left side open small. | `_review: true` |
| 4 | Capture is compulsory, my friend. Those are the rules. | Capture must o, my friend. Na the rule. | `_review: true` |
| 5 | Nice try. That was close. | Nice try. E nearly work. | `_review: true` |
| 6 | Ha! You saw my shot coming. | Ha! You see my shot before e land. | `_review: true` |
| 7 | Crowned! Now I can fly. | I don crown! Now I dey fly. | `_review: true` |
| 8 | Good game. Same time tomorrow? | Good game. Same time tomorrow? | `_review: true` |

## Damola (`damola`)
**Region:** Yoruba, Abeokuta, Ogun. 20s. The campus games-society rival: confident and sporting, respects a good move, never smug.
**Play style (Hard):** solid structure, centre and long-diagonal control, plays for the endgame king.
**Colour world:** Aso-oke Gold ground with an Adire Indigo jacket.
**Animation cue:** straightens the jacket; a short drum tap.

| # | en | pcm | flags |
|---|---|---|---|
| 1 | Ó dára! Let the better player win. | Ó dára! Make the better player win. | Yoruba `Ó dára` ("it is good"): `_review: true` (native speaker, check tone marks) |
| 2 | I have been playing this since secondary school. | I don dey play this one since secondary school. | `_review: true` |
| 3 | That was a clever move. I did not expect it. | That move sharp. I no expect am. | `_review: true` |
| 4 | Careful. Every piece counts. | Careful. Every piece get im weight. | `_review: true` |
| 5 | Ah! You have broken my formation. | Ah! You don scatter my formation. | `_review: true` |
| 6 | Long diagonal, long trouble. | Long diagonal, long wahala. | `_review: true` |
| 7 | Respect. That was well played. | Respect. You play am well. | `_review: true` |
| 8 | Another game? The board is still warm. | Another one? Board still dey hot. | `_review: true` |
