# CLAUDE.md — TERM (working title)

> Design doc, LLM-drafted. Not everything here is validated — it gives the rough idea. Numbers
> are starting guesses for the balance harness to overturn.

## What this is

A single-player roguelike where the entire interface is a calendar app. The player schedules
their life hour by hour across a rolling 7-day horizon, advancing one day at a time, for a
12-week term. Traits rise, relics drop, opportunities appear, failures clog future days with
mandatory obligations. A run lasts ~45–60 minutes.

Eventually it is dressed as a fake late-90s desktop OS with a Calendar app. **That is the last
thing we build.** Building the chrome before the game is the single biggest risk to this project.

## The one thing that must be true

> A single day's placement decision should be genuinely hard.

If the player is ever thinking "I could study Thursday night or go to the party, and I can't do
both, and I'm not sure which" — the game works. Every milestone is judged against this. If it
isn't true by M2, stop adding features and fix the economy instead.

---

## Core loop

The game advances **one day at a time**. There is no weekly reset.

1. **Plan** — the player sees today + the next 6 days. Fixed events are already placed. The
   player drags cards into empty hour blocks anywhere in that horizon.
2. **Advance day** — today is committed. Its blocks resolve in order, fast (~1s for an
   uneventful day). A now-line sweeps down the column, decelerating and stopping on anything
   interesting: the exam, the moment energy runs out, an interruption. Same information as a
   log, but it happens to you rather than being reported.
3. **Interruptions** — some days an event lands. Depending on notice period it either appears
   in the horizon (plannable) or overwrites a block today (not plannable).
4. The horizon slides forward one day. New information enters at the far edge.
5. **Sunday** — after Sunday resolves, the pack draft opens. Then the loop continues.

A term is 12 weeks = 84 days.

**Why rolling and not weekly:** weekly planning creates a cliff — everything learned on Monday
is useless for six days, and Sunday night is a blind guess about a week you can't see. A rolling
horizon keeps the distance to the planning edge constant, so information arrives at a steady
rate. The commitment pressure that a weekly boundary would have provided is restored by lock
rules instead.

**Not real-time.** A moving clock was considered and rejected: the core verb is deliberation,
and a timer taxes exactly the thing the game is about. It also gets played paused. Time pressure
belongs on reflexes (accept/decline an emergency), never on arithmetic.

---

## The grid

- **14 hour blocks per day**, 08:00–22:00, indexed 0–13.
- Cards occupy **1–5 contiguous blocks**. No sub-hour granularity. Ever.
- Nights are off-grid and hold exactly one resizable **Sleep** block, default 8h, range 4–10h.
- **Days are 24 hours and weeks are 7 days.** Non-negotiable — the calendar's whole advantage is
  that the player already knows Friday night is valuable and Monday 08:00 is grim. That semantic
  layer is free and an invented rhythm throws it away for nothing.

### Density

The screen is 98 cells, which is only playable because most of them aren't decisions.

- **Fixed events must consume 30–40% of the grid.** This is load-bearing, not flavour. The
  player fills gaps; they never face a blank week.
- Most cards are 2–4 blocks, so a day is 3–4 decisions, not 14.
- Early morning and late evening can be visually compressed until something is placed there.

Target: ~20 real decisions per week.

### Negative space

The fixed-event generator must produce **awkward gaps** on purpose — a 2-hour hole between two
lectures, a clear Thursday evening, a Saturday wrecked by a shift. Different gap shapes week to
week are what make the puzzle new even with identical cards available. Render gaps explicitly in
M0 so it's visible whether the generator is producing interesting shapes or just clumps.

**Empty blocks have value.** An interruption landing on an empty block is absorbed free; on a
filled block it overwrites and the player loses that card's output. Deliberately leaving buffer
space must be viable strategy.

### Lock rules

This is what replaces weekly commitment.

- **Today is fully locked** on advancing into it. Planning happens from tomorrow outward.
- **Social and paid cards lock on placement** — parties, study groups, shifts, dates. Moving or
  removing one costs Popularity or Motivation, or forfeits money already spent.
- **Solo cards stay fluid** — study, gym, sleep, rest, chores. Drag freely until the day arrives.

Thematically honest (you can move your own gym session; you can't quietly un-agree to a friend's
birthday) and it means tension comes from the player's own choices, not from a rule.

---

## Stats

Three classes that behave differently on purpose. Do not collapse them.

### Reserves (spent)

| Stat | Range | Behaviour |
|---|---|---|
| `energy` | 0–100, **resets daily** | Restored by last night's sleep. Every card costs energy per block. Running out mid-day means remaining blocks produce almost nothing. |
| `money` | **unbounded integer, may go negative** | Earned in lumps, spent per card. Real amounts (a night out costs 340, a shift pays 220). Rent every 28 days, increasing. |

Money below zero does **not** end the run — it injects an `Overdraft` debt card.

Money must stay a live constraint all 12 weeks. Three sinks, use all three: rent that scales; a
lifestyle ratchet (once you've been going out with the expensive crowd, the cheap version of that
card stops paying full Popularity); and big optional purchases always slightly out of reach —
a bike (cuts commute, frees blocks), a laptop (study cards cheaper), a decent jacket (Popularity
floor). Income is capped by time, not rate: you can never earn your way out, because earning eats
the slots you're trying to buy back.

### Traits (persist, gate content, award relics)

`intelligence`, `physicality`, `popularity` — 0–100, slow-moving (a good study block ≈ +2).

Their numeric job: intelligence is checked at exams; physicality raises the daily energy cap and
reduces energy cost on physical cards; popularity lowers the motivation threshold on social cards.
All three gate pack availability.

**Their visible job is relics.** See below. The numbers are bookkeeping; the relics are what the
player collects, remembers, and builds around.

Six stats total is the ceiling. **Test for adding a seventh:** name a card only it unlocks, and a
card only it pays for. If it can't pass both, it's a multiplier on an existing stat, not a stat.
(`stress` could pass if it accumulates from good weeks and is spent by rest. `charisma` and `luck`
fail.)

### Motivation (a state, not a resource)

`motivation` is 0–100 and is **never spent**. Two jobs:

1. **Multiplier.** Scales trait output of every card: roughly `0.4 + 0.9 * (mot/100)`. At rock
   bottom you get ~40% of a card's value; at peak ~130%. The hours are gone either way. Three
   hours of study at low motivation is three hours of reading the same page.
2. **Threshold gate.** Cards declare `minMotivation`. Below it they cannot be placed at all.
   Focused study ~40, a shift ~20, lying in bed 0.

Rules:
- **Drifts toward a baseline of 50** each day (~3 points). No run is unrecoverable; no good week
  can be banked and coasted on. Keep drift strong enough that one bad week in week 3 doesn't kill
  a run — this system makes the game swingy by design, which is good for a roguelike but needs
  the floor.
- Responds to **outcomes**, not just activities. Passing an exam raises it; failing drops it.
- **Recovery cards are always placeable and cost no money** — rest, walk, watch something. Never
  lockable, so there is always a path back up. The price is slots, the currency the player can
  least afford.

This produces the death spiral: low motivation locks out the activities that would fix your
situation. That's the recognisable college failure mode and the most interesting thing in the set.

---

## Relics

Traits accumulate quietly and award relics at thresholds. A relic is the difference between
progression you read and progression you play: `+2 intelligence` is a number, `Night owl: evening
blocks cost 20% less energy` changes how you place cards for the rest of the run.

**Relics are one-dimensional and strictly good.** No downsides. The player already paid for the
relic in hours; charging twice on the payout makes the reward layer feel stingy. Difficulty lives
in the grid, the debt cards, and the motivation spiral — not here.

What makes them interesting is that they're **conditional**, not taxing:

- `Night owl` — evening blocks cost less energy. Only pays if you schedule evenings.
- `Momentum` — three consecutive days of the same card type gives a bonus. Restructures a week.
- `Regular` — the same social venue twice in a week costs less. Pushes *against* staleness, which
  creates tension without being a penalty. This shape is the most valuable one.
- `Speed reader` — the study curve peaks at 2h instead of 3h.
- `Early riser` — sleep restores more per hour.

**Hard constraint: every relic is a modifier to an existing named formula** — `energyCostOf(card)`,
`yieldOf(card, blocks)`, `sleepRestore(hours)`, `staleness(type)`, a threshold shift. If a relic
needs its own branch in `resolve.ts`, it doesn't ship. 6–8 relics in the MVP.

The taxing kind belongs in the pack draft (boss-relic slot) — a powerful pack that permanently
eats your Tuesday afternoons is one real decision, not a general tone.

---

## Blocks (there is only one primitive)

Everything on the grid is a `Block`: a card type, a start hour, a length. What differs is who put
it there and whether it can move. **An "event" is not a separate content type — it's the rule that
puts a card on the calendar.** One renderer, one collision check, one resolver.

| Source | How it enters | Movable |
|---|---|---|
| Activity | player places, unlimited | yes (solo) / locks on placement (social) |
| Offer | supplied, one use, expires | locks on placement |
| Fixed | system pre-places on the horizon | no |
| Debt | system injects on failure | no |
| Emergency | system overwrites a block today | no |

`resolve.ts` iterates blocks and does not care where any of them came from.

**The exception:** things that happen to a *day* rather than in an hour — rent falling due,
interest, motivation drift. Keep those as a separate, much simpler list of day-level hooks with a
trigger condition and a stat effect. Ten lines, no grid interaction. (An exam **is** a block. Rent
is **not**. A bereavement is both: a day-level motivation hit now, and a `movable: false` funeral
block dropped into next week.)

### Supply — the answer to "unlimited?"

- **Solo activities are unlimited.** Study, gym, rest, chores, sleep. Placement is already
  hard-capped by there being 14 blocks in a day; a "max 3 per week" rule is a thing to memorise
  that corresponds to nothing true, and it would remove the desperate all-study cram week, which
  is one of the better dramatic beats available.
- **Anything involving other people or an employer is supplied.** Shifts, parties, study groups,
  dates — 2–3 offered per week, at hours someone else chose, expiring if unused.

This removes both dominant strategies (fill every gap with shifts; fill every gap with socialising)
without a single arbitrary cap, and it means a run where nobody invites you anywhere is a hard run.

### Card lengths

Fixed per card type, **not player-chosen** — except sleep. A free length dial gets solved once and
then always set to the optimum; fixed lengths mean the choice is *which card*.

| Card | Blocks |
|---|---|
| Lecture | 2 |
| Lab | 3 |
| Exam | 3 |
| Study (light) | 1 |
| Study (focused) | 3 |
| Cram (near exams only) | 5 |
| Gym | 2 |
| Work shift | 4 |
| Short shift | 2 |
| Coffee / hang out | 1 |
| Dinner | 2 |
| Night out | 4 |
| Rest | 1 |
| Chores | 2 |
| Catch-up (debt) | 2 |
| Sleep | 4–10 (resizable) |

Mass sits at 2–3. A 2-hour gap fits gym or a short shift but not focused study. The 4- and 5-block
cards are the interesting ones precisely because they can only exist in a few places on the board.

Study appears at three lengths as **three separate cards** — that's how the non-linear curve gets
taught without a tooltip. The player places 1-hour study once, sees it was nearly worthless, and
learns the curve by playing it.

### Duration curves

This is what stops the grid becoming a knapsack solver. Per-type `yield(blocks) -> multiplier`,
never a flat per-block rate.

- `study` — superlinear then diminishing. 1h ≈ nothing, 3h = deep work, 5h = tapering.
- `social` — superlinear with a hard floor. 1h coffee is a maintenance ping; 4h is where
  relationships actually move.
- `gym` — sublinear, capped ~2h. 90 minutes is 90 minutes; 4 hours is injury.
- `work` — strictly linear. The boring reliable one. That's the point.

### Staleness

Repeating a card type inside a rolling 7-day window decays its yield (1.0 / 0.85 / 0.7 / 0.55,
floor 0.4). Slides with the window. This answers "why not spam the best card" with no hand-size UI.

### Runaway protection

Placement isn't what breaks a build — **unbounded multiplication** is. `base × curve × motivation
× staleness × relics` compounding is where a 2× becomes a 6× and one strategy wins 98% of runs.

1. **Clamp the total multiplier** to ~[0.3, 2.2]. One line in `yields.ts`. Most valuable defensive
   line in the codebase.
2. **Relics add to a bonus term, they never multiply the chain:**
   `total = base * curve * mot * stale * (1 + Σ relicBonuses)`. Ten relics cannot give 4×.
3. **One relic, one named formula.** As above.

---

## Events

Events differ by **notice period**, and that distribution is the main difficulty dial. Early weeks
skew long-notice; late weeks skew short. Difficulty rises without any number changing.

| Kind | Notice | Behaviour |
|---|---|---|
| Structural | visible from day 1, ghosted beyond the horizon | Exams, rent, deadlines. Long-term pressure. |
| Opportunity | 3–7 days | Lands in the horizon, plannable. Becomes an offer. |
| Obligation | 1–2 days | Forces re-planning against already-locked cards. |
| Emergency | same day | Overwrites a block. No planning, just consequence. |

Emergencies should be **contextual, not arbitrary**: burnout fires when motivation has been low
two weeks, a social blow-up when popularity is high and neglected. Pure random misfortune reads as
unfair in a roguelike, where losses need to feel earned.

Emergencies may optionally carry a short accept/decline countdown (~8s). That's the one decision in
the game that's binary and emotional rather than combinatorial, so time pressure suits it — and it
makes emergencies feel categorically unlike planning. Easy to cut if it reads as gimmicky.

~10 events for the MVP, stat effects only, no branching dialogue.

---

## Packs

After **Sunday** resolves, the draft opens. Sunday not Friday — Friday evening is prime real estate
for interesting cards and shouldn't be interrupted by a menu. Sunday night is dead time in both the
fiction and the game.

- Trait thresholds determine what is **in the bag** (tennis path: physicality ≥ 60, money ≥ 500).
- The player is offered **3 of what qualifies** and picks 1. Always something, always relevant to
  how they've been playing, and rejecting two is itself a decision. The two not taken stay visible
  as a road not travelled.
- A pack permanently adds 3–4 card types to the activity pool.
- Packs should **conflict**: tennis path and research path both want weekday afternoons.

Because planning is continuous, a pack lands on a calendar that **already has commitments in it**.
Drafting tennis and finding the next four Tuesdays locked with a study group is the good version of
this mechanic — the pack is "new options that don't fit yet", and the following days are spent
making room.

---

## Run structure

- 1 run = 1 term = 12 weeks = 84 days.
- Exams end of week 6 and week 12. Intelligence checked against a scaling threshold.
- Rent due days 28, 56, 84 — increasing.

**There is no fail screen.** Every failure converts into cards that eat the calendar:

- `CatchUp` (2 blocks) — from skipping a lecture. Must be placed before the next exam or that
  course fails.
- `Overdraft` (4 blocks) — from money below zero. A mandatory shift you didn't choose.
- `Recovery` — from severe burnout. Mandatory rest blocks.

**Lose:** no free blocks remain for N consecutive days. One system instead of three fail states,
and the most accurate description of burnout available.

**Win:** reach day 84 with the calendar still liveable. Score by highest trait, which determines
the ending flavour text. No meta-progression, no unlocks, no second year in the MVP.

---

## UI

- Seven columns, fourteen rows. **Today's column is visually distinct and non-interactive** — the
  commitment boundary must be obvious before the player tries to drag into it.
- Colour encodes **category** (study, social, work, fixed, debt). Locks are a small padlock icon,
  never a colour — colour is already fully loaded.
- Blocks show their own duration ("Study · 3h"), because 3h ≠ 3×1h and that must be legible
  without hovering.
- Two trays: **Activities** (no counts, unlimited) and **Offers** (counts and dates). The absence
  of a count on the left is the UI answering "how many times can I study?" before it's asked.
- 98 cells is a lot of small drop targets. Generous snapping, and **click-card-then-click-slot as
  a full alternative to dragging** — some people hate drag.
- Radar charts for traits were considered and dropped once relics replaced numbers as the visible
  progression. The review screen is a shelf of relics.

---

## Tech (prototype)

This section describes `react-prototype/`, where ideas get tested. The shipping game is Godot —
see **Repo layout** below.

- **Vite + React + TypeScript.** Not Godot for the prototype: its entire job is drag-and-drop UI
  and a pure simulation, which is React's strength and Godot's weakest area. `resolveDay` has no
  frame loop. A keep-pure `src/game/` ports almost mechanically.
- **Tailwind** for layout. No component library.
- **Zustand** or a single `useReducer` — whichever is less ceremony.
- **dnd-kit** for dragging. Do not hand-roll drag and drop.
- `localStorage` for run persistence. No backend, no accounts.
- **Everything in `src/game/` is pure with no React imports.** Non-negotiable — it's what makes
  the balance harness and the Godot port possible. (`purity.test.ts` enforces it.)
- **Vitest.**

```
react-prototype/src/
  game/           # pure, no React
    types.ts      # Block, Card, Relic, Event, GameState
    cards.ts      # loads data/cards.json
    data/         # card/relic/event/pack definitions as JSON — shared with Godot
    rng.ts        # seeded PRNG (mulberry32) — all randomness goes through it
    grid.ts       # occupancy, collision, gap detection
    relics.ts     # relic definitions — each names the formula it modifies
    events.ts
    packs.ts
    resolve.ts    # resolveDay(state) -> [state, log[]]   ← the heart of the game
    yields.ts     # duration curves, staleness, motivation multiplier, the clamp
    rules.ts      # placement validity, lock rules
    generate.ts   # fixed-event generator — owns grid density and gap shapes
  ui/
  App.tsx
react-prototype/scripts/
  gen-report.ts   # prints generated weeks + density/gap stats across seeds
```

### Balance harness — build it the moment `resolveDay` exists

A script that plays N runs with heuristic strategies (all-study, all-social, all-work, balanced,
random) and prints win rate, end-state traits, day of first debt card, motivation curve.

Six interacting stats cannot be tuned by hand-playing — you'd need dozens of full runs to feel one
change. With the harness, "is unlimited placement broken?" stops being something to reason about
and becomes a number to read. This is the single highest-leverage file in the project and it is
not optional.

**First dial to turn:** the motivation multiplier range (0.4–1.3) is a pure guess. Too wide and
the death spiral is unrecoverable; too narrow and motivation stops mattering.

---

## Build order

Each milestone must be playable before moving on.

**M0 — the grid.** 7-day rolling view, 14 blocks/day, drag from tray, variable-length cards,
overlap prevention, advance-day button that just slides the window. Fixed-event generator with
explicit gap rendering. No stats, no resolution. Ugly, default HTML.
*Checkpoint: does placing things feel good, and are the gaps interesting?*

**M1 — resolution and energy.** Sleep block, daily energy, per-block costs, trait deltas, day
resolution with the sweeping now-line. **Build the harness here.**
*Checkpoint: does the energy constraint bite?*

**M2 — motivation and curves.** Multiplier, threshold gating, drift. Non-linear yields. Staleness.
The clamp. Exams at weeks 6 and 12.
*Checkpoint: **is one placement decision genuinely agonising?** If no, stop and fix the economy.*

**M3 — supply, offers, events.** ~10 events across the four notice periods. Interruptions that
overwrite filled blocks and are absorbed by empty ones. Lock rules.

**M4 — debt.** CatchUp, Overdraft, Recovery. Negative money. Rent. The clogged-calendar lose
condition. *This is where it becomes a roguelike rather than a scheduler.*

**M5 — relics and packs.** 6–8 relics at trait thresholds. Sunday draft, gating, 3-of-N, ~4 packs
(tennis, research, social, work) with conflicting time demands.

**M6 — the desktop shell.** Only now. Win98 chrome, blue background, draggable window, taskbar
stats. Cosmetic, ~2 days once the game underneath is real.

---

## Non-goals for the MVP

Put anything that comes up into `LATER.md` rather than building it. Writing it down is what stops
the anxiety of losing a good idea from turning into scope creep.

- **Named characters, relationships, dialogue.** The single biggest scope risk in the project —
  relationship systems have no natural stopping point. Popularity as one number does 80% of the
  emotional work for 5% of the cost.
- Additional apps (Email, Messenger, Finance, Notepad). A modal does the job.
- Multiple years, difficulty tiers, cross-run unlocks.
- Branching event choices with consequences rippling weeks out.
- Art, sound, animation beyond the day-resolution sweep.
- A seventh stat. See the test above.
- **Worldbuilding that touches arithmetic.** Invented city, university, course names and currency
  are fine and free. Alien day lengths, 12-week planetary years, anything the player has to do
  maths about — no. Both were tried in design and both failed for the same reason: they cost the
  free semantics of a real calendar and pay back nothing. Call the unit a term. Nobody counts.

## Prior art

- **Kudos** (Positech, 2006) — almost exactly this premise. Its failure wasn't the dated UI, it
  was having no fail state and no run structure: a spreadsheet you couldn't lose, so optimal play
  was boring and there was no reason to restart. Steal its texture — the mundane specificity of
  the activity list — not its structure.
- **Slay the Spire** — debt/status cards, draft-3-pick-1, and one-dimensional relics that are
  conditional rather than taxing.
- **Long Live the Queen** — schedule-based stat-raiser with brutal failure states.
- **Persona** — how fixed events plus free evenings feel over a long run.

---

## Repo layout

- `react-prototype/` — the testbed. `npm run dev`, `npm test`, `npm run gen-report -- <seed> <weeks>`.
- `godot/` — the shipping game (Windows/Mac/Linux, later mobile/console). **GDScript**, not C#.

Keeping the port mechanical:
- Game logic in `react-prototype/src/game/` stays plain: data in, data out, no clever TS-only
  idioms. Anything that would be awkward in GDScript is a smell.
- Content lives in JSON (`src/game/data/`) so Godot loads the same files.
- All randomness goes through the seeded `rng.ts`. Given a seed, the generator and (later)
  `resolveDay` are deterministic, so React outputs can be saved as golden fixtures and the Godot
  port checked against them. (GDScript ints are 64-bit: mask to 32 bits when porting mulberry32.)
