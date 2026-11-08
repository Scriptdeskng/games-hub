# The First 10 Games

Working titles are provisional. Check names against existing trademarks and app-store
titles before launch. Do not reuse names, characters or art from other studios' games
(e.g. Maliyo's *Okada Ride* / *Mosquito Smasher*, *Whot King*).

**Single-player only.** Every game has exactly one human player, who plays against the system.
In card and board games that means one or more CPU opponents. In solo games (quiz, words,
runner, match-3) it means beating the game's own timer, levels or score targets. There is no
pass-and-play, no local 2-player mode and no online multiplayer. Do not build hide-hand
screens, player-count pickers for humans, or "invite a friend" flows.

Every game ships with: **CPU difficulty or level progression (Easy / Medium / Hard)**, a
**how-to-play** screen, **EN + Pidgin** text, sound/music toggles, local stats (wins, best
score, streak), and the portal bridge events.

| # | Slug | Working title | Genre | Wave | Effort* |
|---|---|---|---|---|---|
| 1 | `naija-whot` | Naija Whot | Card | 1 | L |
| 2 | `naija-ludo` | Naija Ludo | Board / dice | 1 | M |
| 3 | `ayo-olopon` | Ayo Olopon | Board / mancala | 1 | M |
| 4 | `snakes-ladders` | Snakes & Ladders: Lagos Edition | Board / dice | 1 | S |
| 5 | `draughts-naija` | Draughts Naija | Board / strategy | 2 | M |
| 6 | `sabi-quiz` | Sabi Quiz | Trivia | 2 | S + content |
| 7 | `sabi-words` | Sabi Words | Word search | 2 | S |
| 8 | `penalty-king` | Penalty King | Sports / arcade | 2 | M |
| 9 | `danfo-dash` | Danfo Dash | Endless runner | 3 | L |
| 10 | `mama-put-match` | Mama Put Match | Match-3 puzzle | 3 | L |

\*S ≈ 1 week, M ≈ 2 weeks, L ≈ 3 weeks for one developer working with Claude Code, including
tests and QA loops. This assumes the Phase 0 shared core is finished first.

---

## 1. Naija Whot (`naija-whot`)
**Why:** widely called Nigeria's "national card game"; Whot titles sit in the Nigerian Play Store top charts.

**Deck (54 cards):** Circle 1,2,3,4,5,7,8,10,11,12,13,14 · Triangle 1,2,3,4,5,7,8,10,11,12,13,14 ·
Cross 1,2,3,5,7,10,11,13,14 · Square 1,2,3,5,7,10,11,13,14 · Star 1,2,3,4,5,7,8 · Whot 20 ×5.

**Rules (default "Lagos house rules", each toggle in Settings):**
- Match the top card by shape or number. Whot (20) can be played on anything; the player
  calls the next shape ("I need… Triangle!").
- **1 Hold On:** the player plays again.
- **2 Pick Two:** the next player draws 2, unless they defend with a 2 (stacking toggle).
- **5 Pick Three:** the next player draws 3 (defend-with-5 toggle).
- **8 Suspension:** the next player loses their turn.
- **14 General Market:** every other player draws 1.
- Players must announce "Last card" (and optionally "Semi-last card"). Forgetting costs a
  2-card penalty when caught (toggle).
- **Win:** first to empty their hand. Count-up scoring variant optional when the market runs out.
- **Calm late game (toggle, default on):** a game still going after 240 turns stops its 2, 5 and 14
  from hurting (they play as plain cards; a pick already running plays out), so hands can empty. The
  600-turn count-up end stays as a safety net and the results screen says when it ends a game.

**Modes:** the player vs 1, 2 or 3 CPU opponents, each with a name and a personality (e.g.
cautious, aggressive, hoards Whot cards). CPU hands are always face-down.

**Feel:** satisfying card flick and slam animations, Pidgin commentary bubbles
("Oya pick two!", "Market don open!"), and a wooden table with an ankara cloth backdrop.

## 2. Naija Ludo (`naija-ludo`)
**Why:** Ludo apps are among the top board games in Africa, and Nigerian Ludo downloads are surging.

**Rules:** standard 4-colour Ludo. A 6 releases a seed and earns an extra roll; capturing
sends the opponent home and earns a bonus roll (toggle). Safe squares are marked with stars.
An exact roll is needed to reach home (toggle). Three 6s in a row forfeit the turn (toggle).

**Modes:** the player (one colour) vs 1 or 3 CPU opponents. **Quick mode:** each side has 2
seeds, or the first seed home wins.

**AI:** Easy = random legal move. Medium = prefers captures and safe squares. Hard = scores
each move by capture, threat, progress and safety.

**Feel:** physical dice roll with shake-to-roll on mobile, seed hop animation, a bold board in Nigerian palette colours.

## 3. Ayo Olopon (`ayo-olopon`)
**Why:** the classic Yoruba mancala game, loved across West Africa and almost absent from portals.

**Rules (Ayo / Abapa family):** 2 rows of 6 pits, 4 seeds each. Players sow counter-clockwise
from one of their own pits, skipping the origin pit when it held 12 or more seeds. If the last
seed lands in an opponent's pit and brings it to 2 or 3 seeds, the player captures it, plus any
preceding consecutive opponent pits that also hold 2 or 3. A player must make a move that gives
the opponent seeds when the opponent's side is empty. If no such move exists, the game ends and
remaining seeds go to their owners. The winner has the most seeds (25+ of 48).
**Confirm the exact rule variant with a Nigerian player or the client before Phase 1 sign-off;
implement each variation as a toggle.**

**AI:** Easy = random legal move. Medium = greedy 1-ply. Hard = minimax/alpha-beta, depth 6–8.

**Feel:** carved wood board, seeds that clatter into pits one by one, capture counters.

## 4. Snakes & Ladders: Lagos Edition (`snakes-ladders`)
**Why:** a universal family game that is already on Nigerian game platforms. The quickest win in the list.

**Rules:** 10×10 board with exact-roll finish (toggle). The player races 1–3 CPU players.
Because dice decide the outcome, add light player choice to keep it engaging: a once-per-game
"re-roll" power-up and a choice between two dice on every 5th turn. CPU players use the same
rules.
**Theme:** ladders become BRT buses and okada lifts, snakes become potholes and "go-slow"
traffic, and the board tiles show Lagos landmarks drawn as original illustrations.

## 5. Draughts Naija (`draughts-naija`)
**Why:** draughts is a street and campus staple in Nigeria, and Nigeria has a strong competitive draughts scene.

**Rules:** **International draughts (10×10)** as the default, plus an **8×8 "short game"**
option. Men capture backward, capture is mandatory, and the player must take the maximum
capture (toggle on 8×8). Kings are flying kings on 10×10.

**AI:** alpha-beta with move ordering, run in a Web Worker so the UI never freezes.

## 6. Sabi Quiz (`sabi-quiz`)
**Why:** trivia with local content (Nollywood, Afrobeats, football, history) has a proven Nigerian audience.

**Gameplay:** 10-question rounds with a 15 s timer each and three lifelines (50/50, skip, and an
"ask your padi" poll, which is a simulated audience vote weighted toward the right answer).
A streak multiplier rewards consecutive correct answers. There is also a daily challenge pack.
**Quiz Duel mode:** the player races a CPU contestant (Easy / Medium / Hard tune its accuracy
and answer speed), and the faster correct answer scores more.

**Content:** questions come from a JSON pack (`assets/packs/*.json`) so the client can update
them without a code release. The pack schema includes category, difficulty, question, 4 options,
answer index, source and a `reviewed` flag. Ship 300 questions, written in-house and
fact-checked by a human. **No question goes live with `reviewed: false`.**

## 7. Sabi Words (`sabi-words`)
**Why:** word games such as "Find the Word" appear in Nigeria's overall top charts.

**Gameplay:** a word-search grid. The player swipes to select words, with themed packs (Naija
food, Lagos places, football, Pidgin words, states and capitals) and increasing grid size.
Hints cost cosmetic coins. The player plays solo against the clock, and star ratings depend on
the finish time.

**Data:** word lists in JSON. A generator guarantees every puzzle is solvable and has no
offensive accidental words (keep a blocklist).

## 8. Penalty King (`penalty-king`)
**Why:** football games dominate Nigerian downloads.

**Gameplay:** a 5-kick shootout. The player swipes to aim, curve and power the shot, then taps
to dive as keeper. Sudden death follows a draw. The opponent is always the CPU: a CPU keeper
reads the player's shots, and a CPU striker varies its placement. Difficulty tunes reaction time
and how far the CPU predicts. In cup mode the player's team plays through 7 CPU teams in a
knockout bracket.

**Rules for names:** no real clubs, leagues, badges, kits or player names, and no names that
imitate real clubs. Use fully invented teams with Nigerian city flavour (e.g. "Lagoon Lions",
"Sahel Stars"). Check every invented name against the real NPFL club list.

**Tech:** Canvas 2D with a pseudo-3D (perspective-scaled) goal and simple ball physics.

## 9. Danfo Dash (`danfo-dash`)
**Why:** endless runners are among the most-played casual genres, and Lagos traffic is instantly relatable.

**Gameplay:** a 3-lane endless runner. The player drives a yellow danfo (unlocking keke and
okada skins), swipes to change lanes, jump potholes and duck under bridges, and collects
passengers and coins. Difficulty ramps with speed. Obstacles include hawkers' carts, a
go-slow queue, and agberos waving you down (a comic touch, never mocking).

**Tech:** Canvas 2D with pseudo-3D lane projection, object pooling, fixed-timestep update and a
60 fps target.

## 10. Mama Put Match (`mama-put-match`)
**Why:** match-3 is one of the biggest casual genres in Africa.

**Gameplay:** an 8×8 match-3 with food tiles (puff-puff, suya, jollof, chin-chin, zobo,
plantain). Special pieces are a 4-match line clearer, a 5-match colour bomb and an L/T-match
pepper bomb. There are 60 hand-tuned levels across market "districts" (Balogun, Wuse, Kurmi,
Ogbete). Goals include score, clear-the-pepper (blockers) and collect-N items.

**Tech:** DOM or Canvas. Use a deterministic board generator with no starting matches and a
"no moves → reshuffle" rule. Level data lives in JSON with a small level-editor script in
`scripts/`.
