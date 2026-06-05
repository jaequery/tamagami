# TAMAGAMI — GAME.md

The living design doc for the game's story: how it starts, how it lives, how it ends.
Written one section at a time. This is the *experience* spec — the felt thing — with a
"How it's built" note under each section tying it to the shipped engines (so nothing here
is fantasy the code can't deliver).

**North star:** *the only virtual pet that lives on your real-world clock — and you've known
it since before it was born.*

**Hard constraints (unchanged):** local-only, no backend, no account, fully offline.
Pixel art, Game Boy LCD-green screen, Press Start 2P. Everything "random" is a deterministic
seed (FNV-1a hash of birth identity), never `Math.random` — so it's reproducible, testable,
and shareable.

**Core pillar — surprise over choice (life, dealt not chosen).** We are not building a game of
*decisions*; we're building a game of *reveals.* The player almost never picks — the game **surprises**
them, and the pull to return is always *"what happens next?"* But the surprise comes from **a life
unfolding** — her origin, her person, who she becomes, and above all *the owner's own life events* —
**never from loot boxes or gacha**, which would shatter the realism and make it just-another-game.
Sex, origin, household, rarity, what happens to her owner today: all **dealt, not chosen.** Choice
breeds analysis; surprise breeds anticipation, and anticipation is what survives months. Every section
must answer: *what's the next thing the player can't wait to see?* The only real choices we allow are
**emotional, not strategic** — her name, and whether you show up for her.

---

## The arc (table of contents — we write these one at a time)

1. **Cold Open — Before You**
2. **The Hands That Found You** — your person & household
3. The First Breath — naming, and the clock wakes up
4. The Daily Life — the forgiving care loop, work, the (real) shop
5. **The Owner's Life** — the events that make every day worth checking ← *this section*
6. Growing Up — two lives aging on parallel clocks (the cat *and* her owner)
7. The World — living-world events, the lock-screen life, witnessing
8. The Bond — the cat, you, and her person
9. The End — sickness, death, the life-summary, and the next belly (the loop closes)
10. The Artifacts — the origin card, the life-summary card, the filmable moments

---

## 1. Cold Open — Before You

> **Design intent.** A landing page lives or dies in its first 2–3 seconds; so does this.
> The mistake every pet game makes is opening on a *menu* ("pick plant / cat / dog"). We open
> on a *heartbeat*. Before the player has chosen anything, before there's a name or a stat bar,
> they are already *inside a life* — unborn, warm, in the dark. By the time they're asked to do
> anything, they're not "starting an app," they're **witnessing a birth and rescuing something
> small.** Attachment doesn't come from cuteness; it comes from *vulnerability + stakes met at
> the very first moment.* That's the bang. We spend our most precious 15 seconds buying a bond
> that has to last months.

### Beat sheet (plays once, at adoption — returning users skip straight to their pet)

**Beat 0 — Black. (0:00, instant, before any tap)**
Screen black. One slow, heavy haptic — *thump.* Then a second, smaller, faster one *under* it —
*thump-thump.* Two heartbeats. The small fast one is you.
A single line fades up in pixel font, centered:

> *it's warm here.*

No buttons. No logo. No "tap to start." Just the dark and the two heartbeats. (3 sec.)

**Beat 1 — You are not born yet. (0:03)**
The LCD-green glows in, but *dim and muffled* — the womb. Soft rounded shapes drift past
(the mother's world, blurred). The lines arrive one at a time, each on its own breath:

> *it's dark.*
> *something huge and slow beats around you.*
> *you haven't happened yet.*

A faint silhouette of curled-up siblings beside you. You are the smallest. (5 sec.)

**Beat 2 — The world tilts. (0:08)**
A contraction. The screen *lurches* — a hard tilt, the muffled sound spikes, the heartbeats
race. Pixel-rain of static. This is uncomfortable on purpose; birth is not gentle. A held beat
of near-silence, then —

**Beat 3 — THE REVEAL. (0:10) — the gasp.**
White flash. Full-screen, full-bright. Strong haptic. The muffle drops away into crisp sound.
And there *you* are — for the first time, in full color: your form, your palette, **revealed at
birth.** (This is the rarity reveal, dramatized. The womb was the egg; birth is the hatch.)

> *— and then there was* ***you.***

You're a newborn: eyes shut, ears flat, impossibly small, taking your first breath on screen.
The real-world clock stamps it silently: *born 7:14 AM, Thursday.* (That timestamp is real, and
becomes the pet's true birthday — the first proof that it lives on *your* clock.)

**Beat 4 — The journey to you. (0:13) — the drama that makes it stick.**
One **origin scenario** plays out: 2–3 short, vivid beats carrying the newborn from birth to the
moment of adoption. The scenario is rolled deterministically from the birth seed (so it's *this*
pet's true story, forever). Each ends on the same hand-off line — a pair of hands reaching in:

> *…and a pair of hands reached down for you.*
> *they were* ***yours.***

→ hands off to **Section 2 (The First Breath / naming).**

### The origin scenarios (the dramatic branch — several, for replay + attachment)

Each is a tiny piece of interactive fiction (~3 beats), tonally distinct so heirs and restarts
feel like new lives. The rarity of the pet biases which origins are reachable — common pets get
the everyday origins; the rarest origin is the 1% secret, dramatized.

- **THE STORM DRAIN** *(peril / rescue).* Born under a downpour in a concrete drain. The litter is
  cold; you're the runt, barely breathing. A stranger hears the crying, kneels in the rain, and
  lifts the smallest one — you — into a dry coat. *You almost didn't make it.*
- **THE CARDBOARD BOX** *(abandonment → hope).* A box on the sidewalk outside a shop, "FREE" scrawled
  on the flap. People walk past in the cold. Then a small face peers over the edge — a child —
  and points. *"That one."*
- **THE LONG WAIT** *(the shelter).* Born behind glass at a shelter. One by one, your siblings are
  carried out smiling. The cage empties. You wait. And wait. Until the day the hands finally stop
  at *your* glass.
- **THE HAY AND THE SUN** *(humble / wholesome).* Born in a warm barn, in straw, in a square of
  morning light. A neighbor comes by, cups you in two hands, and carries you home down a dirt road.
- **THE WINDOW** *(lucky / pampered).* The bright pet-shop window. You're the liveliest of the
  litter; you're chosen *first*, before you even understand what choosing is.
- **★ THE MIDNIGHT LITTER** *(secret, ~1%).* Born at 3:00 AM under a sky doing something it shouldn't —
  an eclipse, a meteor, a moon too close. The other kittens sleep; your eyes open early, and they
  are the wrong, wonderful color. No one quite remembers how you reached the hands that found you.
  *(This is the secret rarity, and it ties directly into the living-world event engine.)*

### How it's built (engine map — nothing here is unbuildable)

- **The womb = the egg.** Rarity is already rolled and hidden at birth via the FNV-1a hash
  (`evolution.ts`). We just move the reveal moment from "egg hatches" to "you are born," and dress
  the pre-reveal state as a womb instead of a shell. Same hidden-roll mechanic, dramatized.
- **Birth flash = `RevealOverlay`.** The shipped white-flash + haptic reveal is exactly this beat.
- **Origin scenario = a second deterministic pick** off the same birth seed (a small `origins.ts`
  table, weighted by rarity), recorded **permanently** like a witnessed-event aura (the
  `eventCodex` pattern) so it survives death/reset and shows on the life-summary card later.
- **The ★ secret origin = the existing 1% secret rarity**, gated behind the living-world events
  (`events.ts`) — born during an eclipse/meteor/3am window. The weights already exist.
- **Real birth timestamp** = `bornAt` (already stored). We surface it as a real-world birthday —
  the first beat of the "lives on your real clock" wedge.
- **Plays once.** Gated to first-adoption and to each new heir (the lineage loop, Section 7).
  Returning users skip to the pet, exactly like the shipped onboarding does today.

### Locked decisions (2026-06-05)

1. **Cat-first.** Live birth fits cat cleanly. Plant is deferred (may later get a parallel
   "seed in the dark" germination cold open; not in this SKU).
2. **Auto-paced, tap to hurry, the birth flash never skips.** Fast players can advance the
   text beats; nobody skips Beat 3 (the reveal). It's the whole point.
3. **Watch it now AND re-surface it later.** The origin plays in the cold open (the attachment
   hook) and returns on the life-summary card at death (poignant in hindsight).

---

## 2. The Hands That Found You — your person & household

> **Design intent.** A cat's life is two stories braided together: where she *came from* (her origin,
> Section 1) and where she *lands* (her person). They're equally important, and **the contrast between
> them is the drama.** A lucky window-kitten sent to a silent, grand, lonely house. A storm-drain runt
> carried home to a loud, broke, overflowing family — *"she had nothing, then she had everyone."* That
> gap, between how she started and who she got, is what makes a player *feel* the life instead of
> *manage* it. And it quietly smuggles in the thing people loved about the BitLife idea — a *human*
> with a real life and real stakes — without becoming BitLife: you're still the cat. You just get a
> person to love.

### Who you are (the POV this section forces us to name)

You are not the human. **You are [Name]'s guardian — the unseen, caring presence over her whole life**
(the way a Tamagotchi player always was). You name her, feed her, watch over her. The **person she's
sent to live with is a character in the world** — with a wallet, a mood, and a life that's hard or
easy, warm or lonely. The game is the cat's life *inside that person's life*, seen from the cat's
side. That gives us three roles and a loop between them:

> **YOU** care for **[Name]** → **[Name]** brings light to **her person** → her person's life shapes
> what [Name]'s world can hold.

Most pet games are a line (you → pet). This is a **triangle**, and the third corner — a human who
needs the cat as much as the cat needs care — is the emotional engine and the differentiator.

### Beat sheet (the reveal — as she's carried home)

**Beat 0 — The hands resolve.** The hands from the cold open lift her, and the blurred world behind
them sharpens for the first time into a *place* and a *face.*

**Beat 1 — The home.** A short, wordless pan of where she now lives — the room tells you everything
before a single number does: a big house with plastic still on the couch; a tiny apartment with a
mattress on the floor and a guitar; a kitchen loud with kids; one armchair, one teacup, one lamp.

**Beat 2 — The person.** Her person turns and sees her. One line names the truth of them, gently:

> *this is Marisol. the house is big, and very, very quiet.*
> *this is Dev. he hasn't smiled in a while. he might, for you.*
> *this is the Okafors. four kids, two jobs, not enough of anything but love.*

**Beat 3 — The first look between them.** The cat and her person regard each other. A held beat. Her
person's whole life is about to be a little less alone. → hands off to **Section 3 (naming)**, now
clearly *in this home, with this person.*

### The households (many scenarios — two axes, combined into characters)

Each household is rolled deterministically and is a **material tier × a life-situation**, which
combine into a *person*, not a slot:

**Material tier** (touches gameplay — sets her starting world):
wealthy · comfortable · getting by · scraping.

**Life-situation** (touches the heart — the person's state):

- **The warm chaos** — a full family, kids, noise, love spilling everywhere.
- **The lonely elder** — a widow/widower in a quiet house; you become their entire day.
- **The grieving one** — a home with one empty chair (lost a person, or the pet before you).
- **The one who's struggling** — young, broke, low; you're the reason they get out of bed.
- **The striver** — works all hours, loves you in guilty fragments, means well.
- **The new couple** — building a life; you're their first "kid."
- **The single parent** — stretched paper-thin; you're the children's whole joy.
- **The one rebuilding** — recovering from something; you're their quiet anchor.

**Characterful combinations (where the drama lives):**

- *wealthy × lonely elder* → **the big quiet house** — everything money can buy, no one to hear it.
- *scraping × warm chaos* → **loud, broke, and full of love** — nothing to give but everything that matters.
- *comfortable × grieving* → **the house with one empty chair** — the first new heartbeat in a long time.
- *scraping × the one struggling* → **the reason they get up** — the Finch frame made literal: a small
  life that pulls a sinking person back toward morning.

### The drama of contrast (origin × household)

The two rolls multiply, and the game *names* the gap out loud, because the gap is the feeling:

- Window-kitten (lucky) → big quiet house: *"the prettiest cat in the world, and the only soul in the room."*
- Storm-drain runt (peril) → warm chaos: *"she came from nothing. now she can't find a lap that isn't taken."*
- Midnight litter (★ secret) → the one struggling: *"a strange little miracle, sent exactly where one was needed."*

### The reciprocal loop (the new, differentiating mechanic)

Because the game runs on your **real clock**, the cat can meet her person at their *real* low and high
moments. Her person has good days and hard ones; on a hard night the cat can curl against them and
*help* — a small, real-time act of comfort that lifts the person and deepens the bond. You don't fix
their life; you give the cat the chance to be the warm thing in it. Over months, *"[Name] got Dev
through a bad winter"* becomes the truest thing the game ever tells you — and the most shareable.

### How it's built (engine map — and an honest scope flag)

- **Household = a deterministic roll** off the birth identity (a `household.ts` table), recorded
  **permanently** (the `eventCodex`/origin pattern) and printed on the life-summary at the end.
- **Material tier → the shipped economy.** wealthy/comfortable/getting-by/scraping just set
  `STARTING_COINS` and early shop access (`economy.ts`). The free FORAGER job already prevents any
  soft-lock, so **"scraping" is never a fail-state — it's a *story*,** not a difficulty spike. (Holds
  the forgiving-not-chore line: hardship is poignant, never punishing *to the cat*.)
- **The living person + mood + the reciprocal comfort loop = net-new, and the biggest new build in the
  doc.** No NPC system exists today (`social.ts` is BLE friends, unrelated). Honest phasing:
  - **V1:** household as **origin-style flavor + a starting economic tier** (cheap, ships on existing
    engines, already delivers the contrast drama).
  - **V2:** the **living person** — a mood that ebbs over real time + a comfort interaction that bonds
    the cat to them (the triangle). High emotional ROI, real new code; earn it after V1 proves the pull.

### Tone guardrail (non-negotiable)

The struggling / grieving / low households are handled with **warmth and hope, never as misery
tourism.** The arc is always *toward* connection — the cat is a small light, not a witness to
suffering. No self-harm specifics, no darkness for shock. If a beat doesn't make the player love the
cat *and* root for the person, it's cut.

### Locked decisions

- **Guardian only.** The player is always the cat's caring presence; the human is a character you grow
  to love *through* her. Keeps the POV clean, keeps it a pet game (not BitLife), makes the triangle sing.
- **But provision is active and fun.** You still **work to earn the money** that becomes her food, toys,
  and care — the work-for-money loop is a core daily element, not a passive wallet (see Section 4). In
  fiction it's the household earning a living; mechanically *you* drive it, and a happy cat makes the
  work go better (the triangle, paying off).

---

## 3. The First Breath — naming, and the clock wakes up

> **Design intent.** Section 1 was *spectacle* — a birth, a rescue. Section 2's job is to convert
> that spectacle into a *relationship.* The bang got their pulse up; now we make it personal and
> quiet, because attachment is sealed in the calm beat right after the drama, not during it. Two
> things must happen here and nowhere else: the creature becomes **named** (yours), and the game's
> one true promise — *it lives on your real-world clock* — is made out loud, at the exact moment
> the bond forms. We don't explain the wedge in a tutorial. We let the newborn *demonstrate* it in
> its first ten seconds of life.

### Beat sheet (continues seamlessly from the hands in Section 1)

**Beat 0 — In your hands. (continues from "they were yours.")**
The newborn is cupped in a warm vignette, small and trembling, that fast little heartbeat still
going. The dramatic music has dropped to almost nothing. Stillness.

**Beat 1 — It opens its eyes.**
For the first time, it looks up — at *you.* A tiny sound: *mew.* One soft haptic, like it just
pressed its head into your palm.

> *it doesn't know what you are yet.*
> *but it stopped trembling.*

**Beat 2 — The naming.**
The intimate ask — not "enter a label," but a small ceremony:

> *the small ones become* someone *the moment they're named.*
> *what's hers?*

→ name entry (the shipped name step). The kitten watches the cursor blink. On confirm, a held beat
and a soft reward haptic:

> ***[Name].***
> *she knows it now.*

**Beat 3 — The clock wakes up. (the wedge, made flesh)**
The game silently reads the real time on the device, and the newborn *reacts to the actual hour:*

- *Morning* → she stretches, blinks at the light. → *"it's morning where you are. [Name] is wide awake."*
- *Evening* → she settles, slow blink. → *"it's getting late where you are. [Name] is winding down."*
- *Night* → she yawns and curls into your palm. → *"it's the middle of the night where you are. she's already asleep."*

Then the promise, warm — devotion, never surveillance:

> *from now on, [Name] lives on your time.*
> *when you sleep, she sleeps. when you're gone — she'll know, and she'll be waiting.*

This is the first and most important demonstration of the whole game: the pet was *already* on the
player's clock, from breath one. No tutorial said so; she just *did* it.

**Beat 4 — The first need, asked gently (the forgiving contract).**
She's a newborn; she's hungry. This is *not* a flashing stat alarm — it's a soft bid:

> *she's hungry. she keeps looking from you to her empty bowl.*

→ first **FEED**. She eats, wobbles, goes warm and content; a little heart; bond ticks up. The
"contract" of care is taught by *doing one kind thing and being rewarded* — never by a rules screen
and never by a threat. (No "feed 3×/day or she dies." That door stays shut, by decision.)

**Beat 5 — Home. (onboarding → the living game)**
The view eases back into the full-screen LCD home. She settles into the space that's now hers; the
gentle HUD fades in (her name, the real day & time, the soft care affordances).

> *this is home now.*

The cold open is over. The life begins — and it's already keeping your time.

### How it's built (engine map)

- **Naming** = the shipped name-your-pet step. First name only for now; the **bloodline/family name
  emerges later**, at the first death→heir (`lineage.ts`), to keep onboarding light.
- **The clock waking up** = `phaseOfDay()` / `isNight()` (`world.ts`) read at first foreground — the
  first surfacing of the real-clock wedge, and a direct foreshadow of the lock-screen widget
  (Section 5). The reaction needs the **wake/stretch + sleep/curl sprite poses** (the flagged art
  task — `Sprite.swift` has only happy/neutral/sad/dead today).
- **First feed** = the shipped care action, reframed as a *bid + reward*, not a gate.
- **Bond** = a small new affection value seeded here (distinct from `social.ts`'s friend bond);
  invisible early on purpose — no meter to min-max. Deepened in Section 6.
- **"She'll know, and she'll be waiting"** = the promise that the tiered **reunion** pays off (the
  forgiving catch-up reframe): hours away → happy greeting; days away → "you came back!" — never a
  near-death guilt trip.

### Locked decisions

1. **Naming is after the origin** (origin in the cold open, name in the calm after) — sealed by the
   Section 1 decision. Consistent.
2. **First name only at adoption.** Bloodline surname is introduced at the first heir, not now.
3. **Bond is invisible early.** No affection meter on the HUD at start; it's *felt*, surfaced subtly
   later (Section 6 locks the exact treatment).

### Locked decisions

- **Sex is assigned at birth — male or female, dealt not chosen** — and revealed at the birth flash
  (*"a girl"* / *"a boy"*), driving real pronouns throughout. One more bond detail, and it obeys the
  surprise-over-choice pillar: you don't pick her, you *meet* her.

---

## 4. The Daily Life — the forgiving loop, the work, the surprises

> **Design intent.** Months are won or lost here. The daily loop has to be a *cozy ritual you want to
> peek at* — never a checklist that nags. Two forces drive every day: **provision** (you work to give
> her a good life) and **surprise** (what's she doing right now? what did today bring?). The clock is
> real, the stakes are gentle, and the hook is always the small question a pack-opener feels: *what's
> next?*

### The shape of a day (it runs on your real clock)

She lives on your actual hours, so the day has a real rhythm — and just peeking is rewarded, because
you never quite know which beat you'll catch:

- **Morning** — she wakes near when you do: a stretch, a yawn, the first hungry look. (breakfast bid)
- **Midday** — a sunbeam nap, a little play, maybe some mischief while you're out earning.
- **Evening** — the person comes home; dinner bid; the liveliest, most affectionate hour.
- **Night** — she winds down and curls up to sleep. This is the lock-screen life (Section 6).

### The three things you do (all forgiving, never gates)

1. **FEED** — meals are **bids inside windows**, not deadlines. Catch her in the breakfast window and
   she's delighted (a glow, a bond tick); miss it and she's just a little hungry and *remembers* — never
   dying, never a guilt alarm. **Reward on-time; never punish late.**
2. **PLAY / HOLD** — the warmth verb. A toss of a toy, a hand to headbutt. Bond, not obligation.
3. **PROVIDE** — you work for the money that becomes her food, toys, and care (below).

### Provision: the work loop (the fun element, not a grind)

You earn the coins that fund her life — and we make *earning itself* a surprise box, not a time-clock:

- Reuses the shipped jobs system (clock in/out, paid per in-game hour, better jobs gated by education).
- **She sees you off and greets you back** — the leaving/returning beat ties straight into the reunion
  warmth; coming home to her is part of the reward.
- **Every shift deals a little surprise** — a tip, a found trinket, a good-day/bad-day, a tiny event:
  *"what did today bring?"* That's the pack-opener feeling applied to work.
- **The triangle pays off** — a happy, well-loved cat makes the workday go better (better tips / mood),
  so caring for her is also how you get ahead. Love is the productivity multiplier, gently.

### The shop (a real shop, not a slot machine)

Coins buy **food, toys, beds, and outfits** — straight, honest purchases off a shelf. **No loot boxes,
no gacha, no mystery crates** (those shatter the realism and make it just-another-game). Cosmetics
matter most: dressing her is *identity*, and identity is the single most screenshot-able, shareable
thing in the whole game (flagged in the viral work as the sleeper hit). Stock shifts gently with the
real seasons (a winter coat in December) so it stays fresh — but what you buy is always your honest
pick. The *surprise* in this game comes from **life** (Section 5), never from a crate.

### Her daily surprises (one half of the "what's next?")

She's *always up to something you might not have seen* — though this is only *half* the pull; the
bigger half is her owner's life (Section 5). Her own small, unscripted-feeling moments — dealt deterministically from the real date + her seed + her mood +
household — so each is "hers," reproducible, and collectible:

- naps in a real noon sunbeam · knocks a cup off the table · drags a sock into her bed · "gifts" you a
  bug · reacts to weather, to night, to a living-world event · a rare little animation you've never
  caught before.
- **Catch-and-keep:** seeing a new one quietly fills the codex — so the daily peek is also a collection
  hunt. *"I finally caught her doing the thing."*

### Her person, day to day (V2)

The person has their own rhythm on the real clock — leaves for work, comes home tired or glad, has
good days and hard nights. The cat can be there for the lows (Section 2's comfort loop). All gentle,
all optional, all warmth. (V1 ships the cat's loop; the living person is V2.)

### The line we never cross (forgiving rules)

No required schedule. No litter/grooming chores. No starvation guilt-trip. No "scraping = you lose"
(the free FORAGER job prevents any soft-lock; poverty is *story*, not difficulty). Absence is a
**reunion**, never a death march. The clock drives *texture and affection*, never penalties.

### How it's built (engine map)

- **Work + shop + tiers** = the shipped `economy.ts` (jobs, clock-in, tuition-gated careers,
  `STARTING_COINS`). The shop is a straight catalog — no new gacha system to build.
- **Day rhythm** = `world.ts` `phaseOfDay()` / `isNight()` driving her poses (needs the wake/sleep
  sprite art — the standing flagged task).
- **Meals-as-bids** = the shipped care actions, reframed to reward-not-gate (tune the decay/notify copy).
- **Daily surprises** = a small `moments.ts` table keyed on `(realDate, seed, mood, household)` →
  picks today's catchable beat; recorded in the codex. Net-new but small and high-charm-per-line.
- **Cosmetics** = new content (sprites/overlays) + a render layer on the pet; the economy plumbing exists.

### Open questions to resolve

1. **How many daily surprise "moments" for V1?** Even ~12–15 makes the peek feel alive without a content
   factory; we add more over time. My lean: **ship ~15, design the table so adding more is trivial.**
2. **Does work require active presence, or can a shift run while away** (offline-catch-up style)? My
   lean: **both** — tap to work a shift now, *or* "she kept the home running while you were gone" on
   return, so it never becomes a tend-the-timer chore.

---

## 5. The Owner's Life — the events that make every day worth checking

> **Design intent.** This is the engine that replaces the loot box — and it's *better*, because it's
> real. The reason to open the app isn't "what did I roll," it's **"what happened to her owner today?"**
> The owner is a whole person whose life keeps moving on its own: a rough day at work, a fight with a
> friend, an exam, a heartbreak, a raise, a first date, a loss, a quiet win. You can't predict it, you
> didn't choose it — you just *find out*, the way you find out about a friend's day. And the cat is
> **there for all of it.** That's the surprise pillar made human, and it's the thing no other pet game
> has.

### Two lives, both moving (the owner ages too)

The cat ages (Section 6) — and so does her owner, on a parallel clock. A kid grows into a teenager
into a young adult; an adult eases toward elder. Their **life-stage colors the events:** the kid has
school and playground fights; the young adult has work and rent and dating; the elder has visits from
grandkids and slower, gentler days. Two timelines running side by side is the quiet ache and beauty of
the whole game — *two mortal lives keeping each other company.*

### The event stream (the surprise engine)

Every so often — not constantly; drama you can *feel*, not a soap opera — the owner's life *turns*,
and you witness it when they come home different. A spread of tones, so it never reads one note:

- **Hard days** — a bad day at work; a fight with a friend; a failed exam; a breakup; money stress; a
  loss in the family. They come home heavy.
- **Bright days** — a promotion; an A on the test; a first date that went well; a reunion; an
  unexpected kindness. They come home glowing.
- **Turning points** — a new job, a move, falling in love, a graduation, a new baby, the slow arc of
  growing older. The big beats that change the shape of the home.
- **Quiet days** — most days. Ordinary is the baseline that makes the turns land.

### Where the cat comes in (the reciprocal heart)

You don't fix their life — you give the cat the chance to *be there*:

- **On the hard days,** the cat can curl against them, and your showing up to make that happen *lifts
  them* — a small, real act of comfort. Over a season, *"she got him through a rough winter"* becomes
  the truest line the game ever writes.
- **On the bright days,** she shares the joy — zoomies, a celebration, a warm pile on the couch.
- **Every response becomes a memory** — logged to the codex and, at the very end, woven into the
  life-summary: not *"she lived 14 years,"* but *"she was there the day he got the job, and the night
  he lost his dad."*

This is the triangle (YOU → cat → person) doing its real work — why the cat *matters* instead of
merely surviving.

### It runs on your real clock (the wedge, again)

Events land at real, fitting times — a hard day when they get home in the evening, a celebration on a
weekend, the house quiet at 3am when only you, a worried owner, and a warm cat are awake. The real
clock is what makes *"he had a bad night"* land — because it's **tonight.**

### How it's built (engine map — and the honest scope)

- **Owner state** = a small model: life-stage + mood + a few situation flags (job, school, a friend, a
  partner), seeded at adoption from the household roll (Section 2), aged forward on a parallel clock.
- **Events** = a weighted, age-gated `ownerLife.ts` table, **dealt deterministically** from
  `(realDate, owner seed, stage, situation)` — reproducible, no `Math.random`. The cat's comfort /
  celebrate responses are a thin interaction on top, recorded like witnessed events (`eventCodex`).
- **Honest scope.** This is the **biggest content surface in the game**, and the writing lives here.
  But it is *much* lighter than BitLife: events are **witnessed, not authored** (no branching
  life-management sim), and a few **dozen** evocative beats create the "what's next" pull — you do *not*
  need BitLife's hundreds. **V1:** ~20–30 events across the tones above + owner mood + the comfort/
  celebrate response. **V2+:** deepen stages, add turning points, let situations chain into small arcs.
- **Distinct from the cosmic events** (Section 7): the *world* has ambient wonders (eclipse, meteor)
  the cat *witnesses*; the *owner* has human events the cat *responds to*. Two firehoses, different jobs.

### Tone guardrail (restated — this section needs it most)

Warmth and hope, always. Hard events exist to let the cat be a comfort, **never** as misery tourism —
no self-harm specifics, no cruelty for shock, no darkness without a hand reaching back toward the
light. If an event doesn't make you love the cat *and* root for her person, it's cut.

### Locked decisions

1. **Event cadence = a meaningful turn every few days, ordinary days between.** Rarity is what makes the
   hard nights matter; constant drama would read as a soap opera and numb the player.
2. **Owner mortality is in.** An elder owner's story can end — rare, late, and earned, designed in The
   End (Section 9) with maximum tenderness. The most powerful beat the game has.
3. **The owner is a simple pixel presence** in the room — the comfort beats are *shown*, not just
   narrated.

---

## 6. Growing Up — two lives, two clocks

> **Design intent.** The long arc. If the daily loop (Section 4) is the heartbeat, *growing up* is the
> *story* — the slow, unstoppable change that turns a routine into a life you'll grieve. Two rules make
> it work and protect the wedge: (1) she ages on **real-world time**, never a speed slider — the aging
> *is* the realism; (2) we split **displayed age** (years, for the story) from **real cadence** (~weeks,
> so nobody waits years and nobody fast-forwards). And she doesn't age alone — *her owner ages too*, on
> a slower clock, so across her life and the cats after her, you watch a whole human grow old.

### The two clocks — the pacing, pinned (tunable, but here's the lean)

A full cat life runs **~3–4 real weeks**, shown as a natural **~15–18 "year"** lifespan. Displayed age
moves fast early (kitten months) then settles into years; the real cadence is invisible — she just
*grows up while you live your weeks.*

| Real time since birth | Life stage | Shown as | What it feels like |
|---|---|---|---|
| birth | **Kitten** (newborn) | days old | tiny, blind, all need |
| ~0–4 days | **Kitten** | 0–6 months | clumsy, playful, into everything |
| ~4–9 days | **Adolescent** | 6 mo – 2 yrs | lanky, fast, testing limits |
| ~9–16 days | **Adult** | 2–8 yrs | her prime — dignified, settled, fully herself |
| ~16–22 days | **Senior** | 8–13 yrs | slower, cuddlier, a little grey |
| ~22+ days | **Elder** | 13+ yrs | gentle, sleepy, precious |
| ~25–32 days | *natural end* | ~15–18 yrs | a long, full life (→ Section 9) |

No slider, no skip. The offline catch-up (shipped, 7-day cap) is the only "time passed" — framed as
*she lived while you were away*, never as cheating.

### Her life stages (each crossing is a reveal)

A stage change isn't a number ticking — it's a **moment.** You open the app and she's visibly
different: bigger, new proportions, a new way of moving. A short reveal beat marks it, and her
**rarity deepens** as she grows (a secret-born cat's true colors come in over time — the mystery
engine paying off slowly). Behavior changes too, which is most of the realism:

- **Kitten** — clumsy pounces, gets stuck, sleeps mid-step.
- **Adolescent** — zoomies, knocks things off shelves, fearless.
- **Adult** — composed, deliberate, the lap-settler; her signature self.
- **Senior** — picks the sunbeam over the chase, slower to the bowl, extra affectionate.
- **Elder** — sleeps most of the day, can't quite make the counter jump anymore, wants you close.

### The owner's clock (the slow one — the long, long arc)

The owner ages **much** slower than the cat — roughly **one life-stage per cat-life.** So a single
cat's whole life is just *one season* of the owner's. But across the cats who come after (the lineage,
Section 9), you watch the **same owner go from kid to elder over months of real play** — a teenager
who got their first kitten becomes the grandparent telling stories to the latest one. *Accompanying a
human across their entire life, one cat at a time,* is the deepest hook the game has, and it's unique.

### Milestones — the punctuation (the surprise pillar on the long arc)

Between stages, the daily loop (Sections 4–5) carries the engagement — exactly as the realism research
concluded. The aging itself is punctuated by **firsts and lasts**, dealt at fitting moments, tender and
catchable:

- *firsts* — first successful counter-jump, first real hunt (a moth!), first time she brings you a "gift."
- *lasts* — the day the counter-jump finally fails; the last set of zoomies; the slow settling into laps.

Each is a small reveal that lands *because* it took real weeks to arrive. (You can't rush a "last." That's
the wedge, doing the emotional work no speed slider could.)

### Old age, gently (forward to The End)

She can die of **old age** — the natural, peaceful, expected close to a long life, the *realistic* death
and the game's true emotional climax (Section 9). It is **not a fail-state**: neglect-death stays rare
and softened (per our forgiving line); old age is simply the price of having loved something mortal.

### How it's built (engine map)

- **Stages + cadence** = the shipped `evolution.ts` `STAGE_THRESHOLDS`, **retuned** to the ~3–4-week cat
  curve above (it already derives stage from `ageSeconds` — just new numbers + cat stage names).
- **Displayed age** = a new small pure fn `ageSeconds → cat-years` (deterministic, testable).
- **Rarity deepening** = the shipped `palettes.ts` per-rarity look, revealed progressively across stages.
- **Owner aging** = a parallel, much slower threshold on the owner-state model (Section 5), advanced
  across generations (Section 9).
- **Stage sprites** = the real art task — **kitten / adolescent / adult / senior / elder poses per cat**
  (joins the standing wake/sleep-pose flag as the hand-pixel work the bet depends on).
- **Milestone "firsts/lasts"** = a few entries in the same daily-`moments` table, gated by stage.

### Locked decisions

1. **A full cat life ≈ 4 real weeks** (~15–18 displayed years) — long enough to grieve, short enough to
   meet the next one. Tunable, but this is the target.
2. **Owner ages ~1 life-stage per cat-generation** — tuned so a dedicated player sees the owner visibly
   age within a season of play (~4–5 cats spans a human life).
3. **Rarity = looks only, never lifespan or advantage.** A common cat lives just as long and is loved
   just as much. Rarity is wonder, never a stat (holds the forgiving line).

---

## 7. The World — the living sky, and the life on your lock screen

> **Design intent.** Two jobs. First, make her feel like she lives *somewhere real*, not in a void — a
> world with a sky, a season, and the occasional wonder, all keeping your actual time. Second, this is
> where the whole premise becomes **visible and shareable**: she lives on your **lock screen**, even when
> the app is closed, reacting to the real hour. That single fact — *"it knew it was night"* — is the
> marketing, the wedge, and the one clip a stranger films. Everything the realism research pointed at
> lands here.

### The everyday sky (your real clock, your real season)

- **Day & night** (shipped) — she wakes, suns herself, winds down, sleeps, on *your* hours.
- **The seasons** — derived from your real date (free, local, true): a snowbound window in January, long
  golden light in July. The shop's winter coat means something because it's *actually* winter for you.
- **Weather** — her world has rainy days and clear ones she reacts to (curls against the rain, watches
  the first snow). *(Constraint note: real local weather needs a network = breaks local-only, so weather
  is a deterministic, believable ambient sim — "her world's weather" — paired with your real season. Real
  season: yes. Real weather feed: no, by constraint.)*

### The rare wonders (witnessable, dealt not chosen)

Punctuating the everyday sky are **wonders** — rare, brief, and *shared*, because they're seeded on the
real calendar so everyone alive that day can catch the same one:

- a **solar eclipse** (~1 in 6 days, at noon) · a **meteor shower** (nightly window) · a **full moon** ·
  **first snow** · a **3am visitor** at the window (the uncanny one). *(Shipped engine, re-skinned for the
  cat's world; more added over time.)*

If she's awake to **witness** one, it marks her **forever** — a permanent aura, a line in her story, and
sometimes a branch toward a **secret form** (the mystery engine). *"Did your cat see the eclipse?"* is the
shareable wonder, and it's true for everyone on the same real day.

### The life on your lock screen (the wedge, made real)

The differentiator no incumbent can copy under local-only: **she lives on your lock screen, even fully
closed.** The widget isn't a status readout — it's a *window into her real day*:

- **11:47pm** — curled asleep, a soft *zzz*, the room dark.
- **7:14am** — same lock screen, now mid-stretch, a faint *good morning*, the light up.
- a rainy afternoon — at the window, watching it come down.

No tap, no app open — *it just knew.* That day/night cut is **the filmable 7-second hook** the research
named: the viewer independently knows it's night, so *"wait, it KNEW"* lands without taking anything on
faith. This is the clip that earns the *"what app is this?"* comment — the one shot of premise virality a
$0 solo dev actually gets.

### Witnessing → memory → who she is

Everything she sees folds back: witnessed wonders become auras (shipped `eventCodex`), fill a page in the
codex, and surface on the **life-summary** at the end — *"she saw two eclipses and one impossible
midnight."* The world doesn't just decorate her life; it becomes part of the story you'll grieve.

### How it's built (engine map)

- **Day/night + season** = shipped `world.ts` (`phaseOfDay`/`isNight`) + a date→season pure fn (new, tiny).
- **Wonders** = shipped `events.ts` (calendar-seeded eclipse/meteor/3am), re-skinned + extended; witnessing
  = shipped `engine.witnessEvent` + `eventCodex`.
- **Ambient weather** = a new deterministic seeded sim (no network — stays local-only).
- **THE LOCK-SCREEN LIFE = the one real build that gates the viral bet.** The shipped WidgetKit widget must
  get (a) `phaseOfDay()` ported into `Engine.swift`, (b) a phase field in the `widget.ts` shared payload,
  and above all (c) the hand-pixeled **sleep/wake (and ideally weather) poses** in `Sprite.swift` (today
  only happy/neutral/sad/dead). The Swift is half a day; the *art* is the hard 0% — and it's the whole clip.

### Locked decisions

1. **Real season (from the device date) + seeded ambient weather.** Real season is free and true; weather
   is a believable local sim. A real-weather *feed* is out — it needs a network and breaks local-only.
2. **Five wonders for V1** — eclipse, meteor, full moon, first snow, 3am visitor — with the table built to
   add more cheaply.
3. **Widget V1 = the cat's day/night state only** (the filmable hook). Wonders and the owner on the widget
   are later polish; the day/night clip is the bet.

---

## 8. The Bond — felt, never metered

> **Design intent.** The bond is the entire point of the game — and the fastest way to ruin it is to put a
> number on it. A visible affection bar turns love into a chore you top up; it's the Tamagotchi guilt gauge
> we swore off. So the bond is **invisible and emergent** — you never see it, you *feel* it, in how she
> acts toward you over weeks. And there are really **two** bonds: the cat and *you* (her guardian), and the
> cat and *her person.* The game is the slow braid of both.

### You never see it — you feel it

There is no meter. The bond shows only in **behavior**, and it deepens the more you simply show up:

- early — she tolerates you, takes the food, keeps her distance.
- weeks in — she greets you, headbutts your hand, follows the light of your attention room to room.
- deeply bonded — she sleeps on *your* side (the lock-screen pose), waits at the door, brings you her best
  "gifts," chooses your lap over the sunbeam.

None of this is a gauge you grind to 100. It's a relationship you'd recognize — and because it's never
shown as a number, it can never become a number you feel guilty about.

### She remembers you (the wedge, made personal)

She runs on your real clock, so she *knows* you in time: she remembers being left, and she remembers
coming back. A short absence → an easy greeting; a long one → a wary beat that your showing up *repairs*
(never a punishment spiral — the reunion always heals it). Over a life, *"she always knew when you were
near"* is the quietest, truest expression of the whole premise. *(Honest scope: V1 = reunion warmth +
"remembers being left." Deeper memory — learning your usual hours, waiting at your real bedtime — is V2;
it's net-new and we earn it.)*

### Two bonds, one braid (the triangle, over a life)

- **Cat ↔ you** — the guardian bond above: the relationship you build by being present.
- **Cat ↔ her person** — the comfort loop (Section 5): she gets *them* through their hard days, and that
  bond grows on its own clock, in its own color.

They interweave across her life. Sometimes they align (a good night for all three); sometimes they ache
(you're away the week her person needs her most, and she carries it alone). That tension is the story.

### What it costs you to neglect it (gently)

Nothing punishing — by decision. Stay away and she doesn't sicken from sadness; she simply *grows a little
distant*, and the warmth dims until you come back. The cost of neglect is **missing her life**, not killing
her. Loss of *moments*, never loss of the *cat.* (Forgiving line, held.)

### The bond is what the ending measures

At the end (Section 9), the life-summary doesn't tally stats — it tells the **truth of the bond**: *"she
trusted you completely."* / *"she loved him to the very last morning."* Everything in this section is
quietly accruing toward that one line you'll carry.

### How it's built (engine map)

- **Bond** = the small invisible affection value seeded in Section 3 — drives **behavior thresholds**, not a
  UI bar. The cat↔owner bond is a second value on the owner-state model (Section 5).
- **Behaviors** = entries in the daily-`moments` / behavior table, **gated by bond level + stage** (so
  bonded-cat behaviors emerge naturally, dealt not unlocked).
- **Memory** = V1 reunion tiers (the shipped catch-up, reframed) + a "was left" flag; V2 = learned
  real-clock patterns (net-new, deprioritized per the realism research).
- **The closing line** = a bond→sentence mapping on the life-summary card (Section 9).

### Locked decisions

1. **The bond stays fully invisible in life, then is named once — gently, at the very end.** The first time
   you "see" it is the moment it breaks your heart.
2. **The cat↔owner bond is shown only through the comfort beats you witness**, never as its own indicator.
3. **Memory V1 = reunion warmth + "was left" only.** Learned real-clock patterns are the V2 magic trick.

---

## 9. The End — the last morning, and the next belly

> **Design intent.** Everything has been building to this, and it has to *earn its tears* without ever
> feeling like a punishment. The end is not a fail-state — it's the **price of having loved something
> mortal**, paid gently, on your real clock, with her person beside her. And it's not a dead-end: the last
> heartbeat hands off to a first one. The circle that opened in the belly closes here, and opens again.
> This is the section that turns "a cute pet app" into "the game that made me cry on the subway."

### Sickness — a worry, not a countdown

Before any end, illness is a **recoverable state**, never a silent death-march. She gets sick (a cold, a
limp, age catching up), and it *shows* — and you can *help* (rest, the vet, medicine from the shop). A
treated illness passes. Sickness exists to make you *worry about her*, which is love — not to punish a
missed tap. (Untreated *serious* illness can turn grave, but that takes real neglect, and even then it
moves slowly, with every chance to act.)

### The good death — old age, the last morning

Most cats here die the way we hope real ones do: **old, and gently.** After a long elder season (Section
6) she sleeps more, slows, stays close. And one **quiet morning, on your real clock, she simply doesn't
wake.** No alarm, no red bar — a hush. The reveal engine that gave us the birth flash now does the
opposite: not a gasp, a *held breath.* Her person is there. And for the first and only time, the bond is
**named** (Section 8): *"she trusted you completely, to the very last morning."*

It's sad. It's supposed to be. It's also the truest thing the game will ever give you — and it's **never
framed as your failure.** A long life that ends of old age is the *best* outcome, not a loss condition.

### The life-summary — her whole story, in your hand

Death mints the artifact the whole game was quietly writing (full card design in Section 10). Not stats —
**the story:**

- where she came from (her **origin**, Section 1, returning now with weight),
- who she got (her **person & household**, Section 2),
- who she became (her **rarity/form & stages**, Section 6),
- what she **witnessed** (the wonders, Section 7),
- what she was **there for** (the owner's life — *"she was there the day he got the job, and the night he
  lost his dad"*),
- and the **bond**, named.

This is the death→life-summary card the research told us to steal from BitLife — the one shareable object
with both a *punchline* and a *tear.* It persists forever, though she's gone.

### Owner mortality — the rarest, latest, most tender beat

Two mortal clocks were always running. Rarely, and only late, **the owner's story can end too** — handled
with maximum care (the tone guardrail at its strictest: warmth, never darkness):

- **The cat outlives her person** (the elder owner passes): she waits by the empty chair, and family take
  her in — *a new household, same cat, carrying the memory.* Devastating, and a reason to hold her closer.
- **More often, the cat goes first** (cats are shorter-lived): the owner grieves — and the **next kitten
  comes to comfort *them.*** The triangle, surviving loss.

Either way, loss is never the end of the game — it's the hinge.

### The next belly — the circle closes, and opens

When she's gone, you're offered what the lineage always promised: **continue.** A new kitten comes to the
**same owner** — now visibly **older** (Section 6) — either from her **own bloodline** (she left a litter;
the heir inherits her luck, shipped) or as a **new rescue.** And the **cold open plays again** (Section 1):
the dark, the two heartbeats, *"it's warm here."* A new birth, a new origin — but the owner remembers the
last one, and so do you. The **family tree** (shipped) becomes a line of cats threaded through one human
life, and across many of them you watch that human go from kid to elder. *Grief, and then a new heartbeat.
The oldest story there is.*

You may also **choose to let the line end** — a complete, finished family tree, a life fully lived. It's
the one real choice the game asks, and it's emotional, not strategic. Respected, and kept.

### How it's built (engine map)

- **Sickness** = a new recoverable state layered on the shipped death engine (causes already exist; add a
  treatable intermediate + vet/medicine items in the shop).
- **Old-age death** = a natural threshold at the end of the Section 6 lifespan curve — the default, gentle
  end; neglect/illness deaths stay rare and softened.
- **The death reveal** = the shipped `RevealOverlay`, inverted (a hush, not a flash).
- **Life-summary card** = the shipped `ShareCard`, reskinned to the obituary/story form (Section 10),
  drawing on origin / household / owner-events / witnessed / bond records already accrued. *(The
  death→life-summary card the BitLife grill said to keep.)*
- **Continue / heir / family tree** = the shipped `lineage.ts` (`createHeir`, the tree, inherited luck),
  reframed: **same owner (aged forward), new kitten, cold open re-triggered** (Section 1).
- **Owner mortality** = the owner-state clock reaching its end — rare, late, V2-grade, maximum tenderness.

### Locked decisions

1. **Both heir sources**, offered at the end: her own **bloodline** (a litter, inherited luck) or a **fresh
   rescue** to the same owner. Bloodline carries luck, rescue carries a fresh origin; the owner is constant.
2. **Both owner-death directions**, rare and late: **owner-outlives-cat** is the gentle default;
   **cat-outlives-owner** is the rare gut-punch (family take her in, same cat, carrying the memory).
3. **A chosen ending is a real, kept finale** — a finished family tree is a complete story, honored, never
   nagged to restart.

---

## 10. The Artifacts — what leaves the phone

> **Design intent.** Where the game meets the world. Two cards and one clip carry [Name] beyond your
> screen — and the growth research already told us how to make them spread (and how not to). Two truths to
> honor: the **share must seal the mystery, not spoil it** (a sealed question travels; a finished trophy
> dies), and **premise virality** (the clip) is a different, fatter-tailed engine than **loop virality**
> (the cards). Build for the clip; underwrite on the cards and the love.

### The Origin Card — the beginning (a sealed question)

Shareable from her first day: a pixel cartridge — her newborn portrait, her name, and a *teasing*,
non-spoiling line:

> *"Something LUNAR was just born in a storm drain, and sent to a house that needed her. — meet [Name]"*

It leads with the **wonder** (the rarity epithet, her origin's drama) but **withholds the form** — the
receiver has to install to see what she becomes. Image + caption + install link, together (shipped
`Share.share`). A friend who installs arrives to a **luckier first kitten** (the shipped deep-link gift,
reframed: *"a friend wished your kitten luck"*) — the gentle re-entrant loop that points back at the network.

### The Life-Summary Card — the end (a punchline and a tear)

The obituary card (Section 9): her **whole story**, told in full now *because* it's over — origin, her
person, who she became, what she witnessed, what she was *there for*, and the bond, named. The artifact
with a *punchline* (the absurd-beautiful specificity BitLife screenshots live on) **and** a tear (which
BitLife never had):

> *"She lived 16 years. She saw two eclipses. She got Dev through a bad winter. She trusted you to the
> last morning."*

The single most shareable thing the game makes.

### The Filmable Moment — the clip (the premise-virality lottery)

Not a card — **the lock-screen day/night cut** (Section 7): 11:47pm asleep → 7:14am stretching, no app
opened. *"I never opened it. It just knew it was night."* The one ~7-second clip a stranger films, the
*"what app is this?"* comment, the only real shot at premise virality for a $0 dev. **Never captioned
"most realistic"** (saturated, graphics-colliding, indefensible) — always the *behavior*: *"the only pet
that lives on your real clock, even closed."*

### The principles (straight from the growth grills)

- **Seal, don't spoil.** Lead with the question (rarity word + origin), withhold the answer (the form).
- **Make the sharer look good, the receiver curious.** A rescued storm-drain kitten with a sealed secret
  does both.
- **Image + caption + link, together** (shipped). Degrade to text if a build lacks capture.
- **Two engines, honestly:** cards = loop virality (k≈0.15–0.3, a nudge); the clip = premise virality (a
  ~5–12% lottery per attempt, fat-tailed). The retention game underwrites both — *build for the lottery,
  bank the better-retaining product as the consolation prize.*

### How it's built (engine map)

- **Both cards** = the shipped `ShareCard` (`captureRef` PNG + `Share.share` image+caption+link), two
  skins: origin + life-summary, drawing on records already accrued (origin / household / owner / witnessed
  / bond).
- **Sealed copy** = rewrite the spoiler caption flagged in the viral grill — lead with `rarityEpithet()`,
  withhold the form.
- **Re-entrant gift** = the shipped `gift.ts` deep-link luck, reframed as a friend's blessing on a kitten.
- **The clip** = enabled by the Section-7 widget build (day/night poses); V1 is hand-filmed for marketing,
  with a "share her morning" in-app capture as a cheap later add.

### Open questions to resolve

1. **Origin card timing.** Auto-offer after the cold open, or available anytime (never forced)? My lean:
   **available anytime, softly offered once** — never interrupt the bond with a share prompt.
2. **In-app clip capture for V1?** Or hand-filmed marketing only to start? My lean: **hand-filmed first**
   (cheapest proof, per the research); add in-app "share her day" once the widget poses ship.
3. **Keep the luck-gift re-entrant loop?** My lean: **yes** — shipped, gentle, and the only thing that
   points a share *back* at the network.

---

*GAME.md complete — all 10 sections drafted. This is the felt-experience spec; every beat maps to a shipped
engine or a flagged, scoped new build. Next: turn it into a V1 build plan — the cheapest slice that proves
the bet — starting with the two things the research says gate everything: the **forgiving care + reunion
retention layer** (the sure thing) and the **lock-screen day/night poses** (the filmable lottery).*

---

## V1 build status — engines + screens wired (shipped)

The pure, deterministic, fully-tested engine spine for every section exists (all FNV-seeded off the birth
identity, no `Math.random`, all save-tolerant with no version bump) **and is now surfaced in the live
screens**: HomeScreen shows cat-years + cat stage names, season + weather, a TODAY panel (sickness→TEND,
her person's day→COMFORT/CELEBRATE, a catchable daily moment), a [STORY] modal (origin + home + the
unmetered bond), and a life-summary death screen; the name step carries the §3 ceremony copy. **The §1–3
cold-open cinematic is built** (`ColdOpen.tsx`): the dark + two heartbeats, the womb, the contraction, the
birth flash, the dramatized journey to you, meeting your person, and the clock waking — auto-paced with
tap-to-hurry, played once per pet/heir. What remains is the **hand-pixeled per-stage sprite art and the
Swift lock-screen widget poses** (the cinematic currently uses the existing baby sprite + the LCD aesthetic),
which need a simulator/device to build and verify.

| § | Felt beat | Engine (shipped + tested) | Still needs (UI / art) |
|---|---|---|---|
| 1 | Cold open — origin reveal | `origins.ts` (6 origins, rarity-biased, ★secret=secret-rarity) | womb→birth cinematics, `RevealOverlay` reframe |
| 2 | The hands / household | `household.ts` (tier×situation→person, contrast line, tier→coins) | carry-home pan, person sprite |
| 3 | First breath — clock wakes | `firstBreath.ts` (phase→wake/settle/sleep), `bond.ts` seed | naming ceremony screen, wake/sleep poses |
| 4 | Daily life — surprises | `moments.ts` + `momentCodex.ts` (catch-and-keep) | moment animations, shop cosmetics |
| 5 | The owner's life | `ownerLife.ts` (24 events, mood, comfort/celebrate) | owner pixel presence, event banners |
| 6 | Growing up — two clocks | `lifespan.ts` (~4-wk curve, displayed age, owner aging) | per-stage cat sprites |
| 7 | The world — sky + lock screen | `season.ts` (season + ambient weather + first snow) | **the WidgetKit day/night poses (the viral clip)** |
| 8 | The bond — felt, never metered | `bond.ts` (invisible tiers, reunion, named-at-end) | emergent-behavior animations |
| 9 | The end — sickness, old age | `sickness.ts`, old-age death in `engine.ts`, `lifeSummary.ts` | death hush overlay, vet/medicine shop items |
| 10 | Artifacts — the cards | sealed Origin caption + Life-Summary caption in `ShareCard.tsx` | life-summary card skin |

**State wiring:** `PetState` gained `origin`, `household`, `bond`, `ownerMood`, `lastTreatedDay` (all
tolerant); `createInitialPet` deals them off the birth seed (tier→starting coins); `createHeir` carries the
household + owner mood forward (same person) and re-rolls a fresh origin (new birth); `feed`/`play`/`treat`/
`comfortOwner` move the bond; `simulate` drifts owner mood, dims the bond on long absence (reunion heals it),
and ends a long life gently of old age. **280 tests green, `tsc` + `eslint` clean.**

**Honest V2 flags (net-new code, earned after V1 proves the pull):** the living person as a visible pixel
presence + logging *which* owner events the cat was there for (so the life-summary can say "the day he got
the job"); learned real-clock memory (waiting at your usual bedtime); cosmetic render layer.*
