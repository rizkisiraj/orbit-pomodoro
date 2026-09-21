# TODO — Orbit

Work breakdown for four parallel agents. Derived from `PRD.md`.

**There is no backend in this product** (static site, localStorage only), so the
split is **logic layer vs. view layer** rather than frontend vs. backend. Same
parallelism, but it reflects what actually exists.

---

## The rule that keeps this non-blocking

Everything crossing a boundary is already written and frozen in `src/contract/`:

| File | What it fixes |
|---|---|
| `contract/types.ts` | Every shared data shape |
| `contract/constants.ts` | Durations, world rules, and shared pure math (orbit radius/speed, ISO week, star tier) |
| `contract/api.ts` | The exact export signature each agent must produce |
| `contract/mock.ts` | Fixtures so the view layer builds with zero logic code present |

**No agent may edit `src/contract/**`.** If the contract is wrong, stop and
report it — do not patch around it, and do not edit it unilaterally. A silent
contract edit is the one thing that can break the parallelism.

### File ownership — strictly disjoint, no two agents share a file

| Agent | Owns | May read |
|---|---|---|
| **LOGIC-1** | `src/timer/**`, `src/audio/**`, `src/notify/**` | contract |
| **LOGIC-2** | `src/store/**`, `src/gen/**`, `src/stats/**` | contract |
| **VIEW-1** | `src/App.tsx`, `src/ui/**`, `src/index.css`, `index.html` | contract, `contract/mock` |
| **VIEW-2** | `src/scene/**` | contract, `contract/mock` |

Shared config (`package.json`, `vite.config.ts`, `tsconfig*`) is owned by nobody
— request changes rather than making them.

### Integration order
Agents build against `contract/mock`. When both sides land, the wiring is a
one-line import swap per call site (`mock.ts` → real module). That final pass is
M-INT below and is done last, by one agent or by hand.

---

## LOGIC-1 — Timer machine, audio, notifications

Reference implementation to follow for structure: **TanStack Query's hook
ergonomics** — one hook returning state + stable action callbacks, no context
required, no provider ceremony.

- [ ] **L1.1** `src/timer/phases.ts` — phase transition table. Pure functions:
      `nextPhase(current, setPosition)`, `durationMsFor(phase)`. No React.
- [ ] **L1.2** `src/timer/useTimer.ts` — the machine, matching `UseTimer`.
  - [ ] Deadline-based: `remainingMs = deadline - Date.now()`, never accumulated ticks
  - [ ] `requestAnimationFrame` loop for the display; cancel on unmount
  - [ ] `visibilitychange` recompute so backgrounding cannot drift it
  - [ ] Auto-advance on expiry; long break after every `SET_LENGTH` focuses
  - [ ] `start(label?)` ignored unless idle; `giveUp()` only during focus; `skipBreak()` only during a break
  - [ ] `inGracePeriod` true for the first `GRACE_PERIOD_MS` of a focus phase
  - [ ] Give up inside grace = free cancel: nothing recorded, no shatter
  - [ ] Persist the running phase so a reload mid-session resolves correctly
  - [ ] Tab closed mid-focus → on next load that session resolves as `abandoned`
- [ ] **L1.3** `src/audio/chime.ts` — `playChime(kind)`. Two-oscillator Web Audio
      blip with a short decay envelope, distinct tones per kind. No asset files.
      Lazily construct `AudioContext` on first user gesture (autoplay policy).
- [ ] **L1.4** `src/notify/notify.ts` — `requestNotificationPermission()` and
      `notify(title, body)`. Permission requested on first Start only, never on
      page load. `notify` no-ops unless `document.hidden` and permission granted.
- [ ] **L1.5** Tests (Vitest) for `phases.ts` and deadline math, including the
      clock-jump case: advance `Date.now()` past the deadline and assert exactly
      one transition fires, not a burst.

**Done when:** `useTimer()` runs a full 25/5/25/5/25/5/25/15 cycle with mocked
time, and give-up/grace/skip behave per contract.

---

## LOGIC-2 — Store, persistence, generation, stats

Reference implementations to follow: **Zustand's own `persist` examples** for the
store shape, and **`three/examples` procedural patterns** for seeded generation
(pure functions in, params out — no Three.js imports in this layer at all).

- [ ] **L2.1** `src/gen/rng.ts` — `seedFrom` (xmur3 string hash) + `mulberry32`.
      Pure, dependency-free, ~30 lines.
- [ ] **L2.2** `src/gen/planet.ts` — `planetParamsFor` and `planetsForWeek`.
  - [ ] Every property derived from the session id seed, per PRD §4
  - [ ] Orbit radius/speed **must** call `contract/constants`, never local math
  - [ ] `planetsForWeek` filters out abandoned sessions, assigns indexes chronologically
  - [ ] `hasRing` and moon count come from the session record, not the seed
  - [ ] Ring odds and surface distribution per PRD; hue is `baseHue ± 25°`
- [ ] **L2.3** `src/store/schema.ts` — runtime validation + a `version` migration
      guard. Corrupt or unknown-version localStorage must fall back to a fresh
      store, never throw on boot.
- [ ] **L2.4** `src/store/week.ts` — `rolloverIfNeeded` logic. Seals the current
      week into `archive` when the ISO key changes, trims to `ARCHIVE_MAX_WEEKS`.
      Empty weeks are archived too. A session belongs to the week it **started** in.
- [ ] **L2.5** `src/store/store.ts` — zustand store implementing `StoreActions`,
      persisted to `STORAGE_KEY` as one JSON blob. Writes on transitions only,
      never per frame. Plus `useCurrentWeek` / `useArchive` / `useSettings`.
- [ ] **L2.6** `src/stats/stats.ts` — `computeStats`. Streak = consecutive days
      ending today with ≥1 completed session. `perDay` always length 7, Mon–Sun.
- [ ] **L2.7** Tests (Vitest): determinism (same id ⇒ identical params across
      100 runs), rollover across a year boundary, streak edge cases (today has no
      session yet but yesterday did — streak holds until the day ends).

**Done when:** a seeded week produces byte-identical `PlanetParams[]` on repeat
runs, and rollover/stats pass their tests.

---

## VIEW-1 — DOM layer

Reference implementation to follow: **shadcn/ui conventions** — small composable
components, variants via `cva`-style prop unions, Tailwind utilities only, no
component library dependency. Do not install shadcn; follow the structure.

Build entirely against `contract/mock`. Consider the `artifact-design` skill for
visual calibration before writing the timer screen.

- [ ] **V1.1** Clear the Vite boilerplate (`App.css`, `src/assets/`), set
      `index.html` title and meta theme-color.
- [ ] **V1.2** `src/ui/Timer.tsx` — the readout. Tabular-figure mono, thin, wide
      tracking, the only large type on screen. `mm:ss`, no layout shift as digits change.
- [ ] **V1.3** `src/ui/IntentInput.tsx` — click the label line to type an intent,
      Enter starts. Escape cancels. Empty is allowed.
- [ ] **V1.4** `src/ui/Controls.tsx` — Start / Give up / Skip break. Only the one
      legal action for the current phase is visible. `give up` is a low-contrast
      text link, never a button — quitting should not look like a feature.
- [ ] **V1.5** `src/ui/FocusChrome.tsx` — during focus, fade everything except
      the timer and the give-up link to ~30%.
- [ ] **V1.6** `src/ui/HoverCaption.tsx` — bottom caption showing a hovered
      planet's label + time. Driven by `Scene`'s `onHoverPlanet`. No 3D tooltips.
- [ ] **V1.7** `src/ui/Archive.tsx` — grid of past weeks, newest first, each a
      `<Scene thumbnail>` canvas. Click expands a week full-screen with its label
      list. Cap live thumbnail canvases at ~8; lazy-mount the rest on scroll.
- [ ] **V1.8** `src/ui/Stats.tsx` — text-first, one row of per-day bars. No chart library.
- [ ] **V1.9** `src/App.tsx` — `ViewName` switching, `<Scene />` as a fixed
      background layer with the DOM layer above it.
- [ ] **V1.10** Accessibility + responsive: honour `prefers-reduced-motion`
      (pass `cinematic={false}`), 4.5:1 contrast at all times with a subtle scrim
      behind text, keyboard-reachable controls, usable down to 375px wide.

**Done when:** every screen renders correctly from fixtures alone, with the
timer stuck at whatever `mock.ts` says.

---

## VIEW-2 — Three.js scene

Reference implementations to follow: **`pmndrs/react-three-fiber` examples** and
**drei's demo patterns** — declarative components, `useFrame` for animation,
`useMemo` for geometry, zero imperative scene-graph mutation outside refs.

Implements `SceneProps` from the contract exactly. **The scene takes props and
nothing else** — no store reads, no timer reads. That is what makes it reusable
for archive thumbnails and testable in isolation.

- [ ] **V2.1** `src/scene/Scene.tsx` — `<Canvas>`, `dpr={[1, 2]}`, lights,
      `<Bloom>` only (no DOF, no chromatic aberration), near-black clear colour.
- [ ] **V2.2** `src/scene/Starfield.tsx` — ~800 static points, two size classes,
      no twinkle. One `Points` object.
- [ ] **V2.3** `src/scene/Star.tsx` — emissive sphere. Size, colour temperature
      (warm → white-hot) and bloom strength all driven by `starTier` 0–5.
- [ ] **V2.4** `src/scene/Planet.tsx` — one body + its moons + its ring.
      Flat-shaded low-poly icosahedron, matte with a thin emissive rim.
      Surface variants per `PlanetParams.surface`.
- [ ] **V2.5** `src/scene/Orbits.tsx` — hairline arcs at 6–10% opacity that fade
      rather than closing into full circles. **One merged line geometry**,
      rebuilt only when the planet count changes.
- [ ] **V2.6** `src/scene/Protoplanet.tsx` — dust condensing, density tracking
      `focusProgress`; crystallizes on completion; on `shattering`, fractures
      into particles pulled into the star over ~1.2s. Cold and quiet — no red,
      no shake.
- [ ] **V2.7** `src/scene/CameraRig.tsx` — auto-orbit ~1 revolution / 4 min with
      gentle elevation sway. Pushes in slightly during focus, eases back out on
      completion. Frozen when `cinematic` is false. No `OrbitControls` in v1.
- [ ] **V2.8** Hover picking on planets → `onHoverPlanet`. Disabled when `thumbnail`.
- [ ] **V2.9** Performance pass against `mockFullWeekPlanets` (20 planets):
      shared geometry pool (4 icosahedron LODs), one material with per-instance
      colour, < 12k triangles total, 60fps. Verify orbit compression reads clearly.

**Done when:** `<Scene planets={mockPlanets} starTier={2} .../>` renders the
system, and the 20-planet fixture holds 60fps.

---

## M-INT — Integration (last, sequential, one owner)

Only start when LOGIC and VIEW are both green against fixtures.

- [ ] **I.1** Swap `contract/mock` imports for real modules in `App.tsx`.
- [ ] **I.2** Wire transitions: focus complete → `recordSession` → chime →
      notify; break complete → `addMoonToLatest`; long break complete →
      `addRingToLatest`; give-up past grace → `shattering` → `recordSession(abandoned)`.
- [ ] **I.3** Call `rolloverIfNeeded()` on boot and on tab refocus.
- [ ] **I.4** Delete `src/contract/mock.ts`.
- [ ] **I.5** Full manual pass: run a real 25-minute session, background the tab
      mid-way, confirm the notification fires and the timer has not drifted.
- [ ] **I.6** Perf + bundle check: < 400kb gzipped, 60fps on a full week.
- [ ] **I.7** Deploy static to Vercel.

---

## Decisions locked from the PRD's open questions

1. Quitting under 60s is a **free cancel**, not an abandon.
2. A session belongs to the week it **started** in.
3. A completed long break awards a **ring**, not a moon — makes 4-session sets legible.
4. Empty weeks **are** archived. An empty week is data too.
5. Week hue comes from a **fixed 8-hue palette**, so no week is ever an ugly colour.
