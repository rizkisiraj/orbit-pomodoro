# Handoff: Orbital Station — Pomodoro timer that builds a modular space station

## Overview

A single-user Pomodoro web app. Every completed 25-minute focus cycle docks a new
**module** onto a 2D orbital station diagram; the station is the app's main visual and the
timer lives inside its **core**. No accounts, no backend, no sync — all state is in
`localStorage`. Three views: **STATION** (default), **LOG** (construction log), **STATS**
(telemetry).

Core metaphor: focus = energy, Pomodoro = construction cycle, completed Pomodoro = new
station module, long-term productivity = growing station. The feel target is
"a futuristic operating system for my personal orbital station" — calm, precise, technical.
Not a spaceship game, not a sci-fi HUD, not neon cyberpunk.

The original product brief is included as `PRD-original.md` (its solar-system metaphor was
superseded by the space-station one; the timer rules, data model and technical plan in it
still apply).

## About the design files

The files in `design/` are **design references created in HTML** — a working prototype of
the intended look and behavior, not production code to copy. The task is to **recreate this
design in the target codebase**, using its established framework and patterns. If no
codebase exists yet, the PRD's stack recommendation is a good default: **Vite + React +
TypeScript**, Zustand or a simple reducer for state, plain CSS/Tailwind for styling. The
station is **SVG + HTML**, not 3D — do not introduce three.js or WebGL.

The prototype is built on an internal "Design Component" runtime (`support.js`, the
`.dc.html` template format, `{{ }}` holes, `<sc-for>`/`<sc-if>`). **Ignore that runtime.**
Read the template as markup and the `class Component` block as component logic; everything
in it maps 1:1 onto a React component with `useState`/`useEffect`.

To view the prototype: serve the `design/` folder over HTTP (`npx serve design`) and open
`Orbital Station.dc.html`. Opening it from `file://` will not load the stylesheet.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, geometry, animation timings and copy.
Recreate pixel-accurately, but pull colors/spacing from the design system tokens
(`design/_ds/.../styles.css`) rather than hard-coding hexes — the token names are listed
below.

---

## Screens / Views

### 1. STATION (default)

Full-viewport, no page scroll (`height: 100dvh; overflow: hidden`). Three layers:

1. **Background** — the page's own gradient:
   `radial-gradient(120% 100% at 50% 42%, #1c1e2f 0%, var(--color-bg) 45%, #0f1020 100%)`.
2. **Stage** — a centered, fixed-aspect box holding the station diagram.
3. **HUD** — absolutely positioned corner blocks, outside the stage.

#### The stage (critical for correctness)

```
position: absolute; inset: 0; display: grid; place-items: center;
  └─ stage: position: relative;
            width: min(100%, calc(100dvh * 1.525));
            aspect-ratio: 900 / 590;
            max-height: 100%;
            container-type: inline-size;
```

Inside the stage, two coordinate systems must agree:

- An `<svg viewBox="-450 -295 900 590">` at `position:absolute; inset:0; width:100%;
  height:100%` draws all **geometry**: orbit ellipses, starfield, connector lines,
  connection nodes, the next-slot target marker, and the core.
- Module **cards are HTML**, absolutely positioned by percentage:
  `left = (x + 450) / 900 * 100%`, `top = (y + 295) / 590 * 100%`, with
  `transform: translate(-50%, -50%)`.

Because the SVG scales with the stage, card size must scale too — all card dimensions and
type sizes are in **`cqw`** (1cqw = 1% of stage width, hence `1cqw = 9 SVG units`).
Fixed px card sizes break the layout below ~760px stage width (cards ride up onto the core).
If your framework makes container queries awkward, the alternative is a 900×590px absolute
layer holding the cards, CSS-scaled by the same factor as the SVG.

Note: SVG `<text>` was deliberately avoided for module labels — labels are HTML.

#### Core (the timer)

Concentric SVG circles at origin, plus an HTML text block centered on the stage:

| Element | Spec |
|---|---|
| Outer hairline ring | `r=92`, `stroke: var(--color-neutral-800)`, 1px |
| Core disc | `r=82`, `fill: #101122`, `stroke: var(--color-neutral-700)`, 1px |
| Progress arc | `r=92`, `stroke: var(--color-accent)`, 2px, `stroke-linecap: round`, `transform: rotate(-90)`, `stroke-dasharray: "<circumference × progress> <circumference>"` where circumference = 2π·92 ≈ 578 |
| Tick marks | `M -82 0 H -70 M 82 0 H 70 M 0 -82 V -70 M 0 82 V 70`, `var(--color-neutral-700)`, 1px |
| Inner breathing ring | `r=73`, `stroke: var(--color-accent)`, 1px, `opacity: 0.26`; during FOCUS only: `animation: st-breathe 4.2s ease-in-out infinite` |

Centered HTML stack over it (`pointer-events: none`):

| Line | Type |
|---|---|
| `CORE` | JetBrains Mono 9px, letter-spacing 0.32em, `var(--color-neutral-400)` |
| `25:00` | JetBrains Mono 300, `font-size: clamp(34px, 4.4vw, 54px)`, line-height 1.15, letter-spacing 0.03em, `font-variant-numeric: tabular-nums`, `var(--color-text)` |
| `STANDBY` / `FOCUS` / `RECOVERY` / `LONG RECOVERY` | JetBrains Mono 10px, letter-spacing 0.26em; `var(--color-accent-200)` during focus, else `var(--color-neutral-400)` |

#### Module lattice

Three elliptical rings around the core (ellipses drawn at `rx/ry`, `fill:none`,
`stroke: var(--color-neutral-800)`, 1px):

| Ring | rx | ry | slots | angle offset | ellipse opacity |
|---|---|---|---|---|---|
| 0 | 170 | 130 | 6 | −90° | 1 |
| 1 | 262 | 200 | 12 | −75° | 0.62 |
| 2 | 352 | 265 | 18 | −80° | 0.4 |

Slot position: `deg = off + (360 / n) * i`, `x = cos(deg)·rx`, `y = sin(deg)·ry`.

**Fill order (the balance rule):** within each ring, emit slots as opposite pairs —
`i, i + n/2, i+1, i+1 + n/2, …` for `i` in `0 … ceil(n/2)-1`. Rings fill in order 0, 1, 2.
Module *k* (0-indexed, in completion order) always occupies slot *k* of that flattened
list. This is what keeps the station symmetrical at any count; never place modules randomly.

**Parent (connector origin):**
- Ring 0 → the core edge: normalize the slot vector and scale to radius 92.
- Rings 1–2 → the slot in the previous ring with the smallest absolute angular difference.

**Connectors** (per module, drawn in SVG, in this order):
1. Static line parent→slot, `var(--color-neutral-700)`, 1px.
2. Energy line, same endpoints, `var(--color-accent)`, 1.5px, `stroke-dasharray: 6 30`;
   during FOCUS: `animation: st-flow 2.4s linear infinite` + `opacity: 0.9`, otherwise
   `opacity: 0`. `@keyframes st-flow { to { stroke-dashoffset: -36; } }`
3. Node dot at the parent point: `r=3.5`, `fill: var(--color-bg)`,
   `stroke: var(--color-neutral-600)`, 1px.

**Next-slot target marker** — always shown, at the slot the next module will occupy:
dashed circle `r=15`, `stroke-dasharray: 2 5`, plus a plus-sign path `M -7 0 H 7 M 0 -7 V 7`,
both `var(--color-accent)` 1px. During FOCUS: `animation: st-breathe 1.9s ease-in-out
infinite`; otherwise `opacity: 0.32`.

**Module card** (HTML, one per completed session):

```
position: absolute; left/top per slot; transform: translate(-50%, -50%);
width: 12.44cqw; padding: 0.67cqw 0.89cqw;
display: flex; align-items: center; gap: 0.89cqw; white-space: nowrap;
background: #12131f; border: 1px solid <stroke>; border-radius: 0.8cqw;
```

- **Glyph**: inline `<svg viewBox="-16 -16 32 32">` at `2.22cqw` square, single `<path>`,
  `fill: none`, `stroke: <stroke>`, `stroke-width: 1.6`, `stroke-linecap: round`.
- **Code line**: JetBrains Mono `1.167cqw`, letter-spacing 0.06em, `var(--color-neutral-100)`.
- **Status line**: JetBrains Mono `0.889cqw`, letter-spacing 0.14em,
  `var(--color-neutral-500)`, `margin-top: 0.22cqw`.
- `<stroke>` is `var(--color-neutral-600)` normally, `var(--color-accent)` for the
  just-docked module (first 1800ms after completion).

**Module types** — cycle through this list by module index; the suffix is
`-01`, `-02`, … incrementing every full pass of the 8 types (`floor(index / 8) + 1`).

| # | Code | Status | Glyph path (viewBox −16 −16 32 32) |
|---|---|---|---|
| 0 | ARRAY | COMMS | `M -11 6 A 11 11 0 0 1 11 6 M 0 6 V -8 M -4 -11 H 4` |
| 1 | HAB | HABITAT | `M -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0 M -8 0 H 8` |
| 2 | SOLAR | POWER | `M -12 -9 V 9 M -4 -9 V 9 M 4 -9 V 9 M 12 -9 V 9 M -12 0 H 12` |
| 3 | LAB | RESEARCH | `M -6 -10 H 6 M -3 -10 V -1 L -8 9 H 8 L 3 -1 V -10` |
| 4 | OBS | OPTICS | `M -6 -6 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0 M 4 4 L 11 11 M -11 9 H -2` |
| 5 | DOCK | DOCKING | `M -11 -8 H 11 V 8 H -11 Z M 0 -8 V 8` |
| 6 | HYDRO | BIOMASS | `M 0 -10 C 9 -4 9 6 0 10 C -9 6 -9 -4 0 -10 M 0 -10 V 10` |
| 7 | RES | ANALYSIS | `M -11 8 L -4 -6 L 3 3 L 11 -9` |

**Starfield** — 100 SVG circles, deterministic from a seeded PRNG (mulberry32, seed
`90210`), generated once and cached: `x = round((rnd−0.5) × 870)`,
`y = round((rnd−0.5) × 565)`, `r = rnd > 0.8 ? 1.7 : 1`, `opacity = 0.16 + rnd×0.32`,
`fill: var(--color-neutral-600)`. Static — no twinkle.

#### HUD

All HUD text is JetBrains Mono 10px, letter-spacing 0.2em, `var(--color-neutral-400)`,
padding `22px 28px`.

- **Top-left** (stacked, gap 6px): `ORBITAL / NN` (NN = module count, `var(--color-text)`,
  letter-spacing 0.3em) and `SECTOR A-NN` (`4 + moduleCount % 9`, zero-padded).
- **Top-right**: the three view tabs (`.btn.btn-ghost`, 10px, letter-spacing 0.2em; active
  `var(--color-text)`, inactive `var(--color-neutral-500)`), then `SYSTEM ONLINE`
  (`var(--color-neutral-300)`) plus a 6px accent dot with
  `animation: st-breathe 3.4s ease-in-out infinite`.
- **Bottom-left** (stacked, gap 6px): `MODULES NN`, `CYCLE NN / 04`, `ENERGY <READY | NN%>`.
- **Bottom-center**: intent line, then controls (gap 10px):
  - Idle, not editing → ghost button reading the label or `SET CONSTRUCTION INTENT`
    (`var(--color-neutral-100)` when a label is set, else `var(--color-neutral-400)`).
  - Editing → `.input`, `width: min(360px, 60vw)`, transparent background, centered,
    JetBrains Mono 11px, letter-spacing 0.14em, placeholder `construction intent`.
    Enter commits **and starts the cycle**; Escape cancels; blur closes.
  - Running → static text `INTENT: <label>` or `NO INTENT SET`
    (`var(--color-neutral-300)`) — not a button.
  - Buttons by phase: idle → `BEGIN CYCLE` (`.btn.btn-primary`, padding `11px 26px`,
    10px, letter-spacing 0.26em); focus → `ABORT` (ghost); break → `SKIP RECOVERY` (ghost).
- **Bottom-right**: transient status message, `var(--color-accent-200)`, `min-width: 130px`,
  right-aligned, `opacity` 0→1 with `transition: opacity 500ms ease`. Values:
  `CONSTRUCTION ACTIVE`, `RECOVERY CYCLE`, `MODULE ONLINE`, `SYSTEMS NOMINAL`,
  `CONSTRUCTION ABORTED`, `RECOVERY SKIPPED`.

### 2. LOG

Full-screen overlay, `background: var(--color-bg)`, `overflow-y: auto`, `z-index: 4`,
`animation: st-in 360ms ease both`. Content column `max-width: 980px`, centered,
`padding: 92px 28px 64px`.

- Kicker `CONSTRUCTION LOG` — Mono 10px, letter-spacing 0.3em, `var(--color-neutral-400)`.
- Heading `NN modules docked` — `var(--font-heading)` weight 500,
  `clamp(26px, 3.6vw, 40px)`, letter-spacing −0.01em, margin `10px 0 34px`.
- Rows, newest first, as a 1px-gap grid on a `var(--color-neutral-800)` background with
  top and bottom 1px borders (the gap *is* the row rule). Each row:
  `grid-template-columns: 96px 108px 1fr auto`, `gap: 18px`, `align-items: baseline`,
  `padding: 15px 4px`, `background: var(--color-bg)`, Mono 12px.
  Columns: date (`SEP 18`, `var(--color-neutral-500)`) · module code
  (`var(--color-accent-200)`, or `—` in `var(--color-neutral-600)` for aborted) · label
  (body font 13px, `var(--color-neutral-200)`; `no intent recorded` when empty) ·
  outcome (`DOCKED` / `ABORTED`, `var(--color-neutral-500)`).

### 3. STATS

Same overlay shell, `max-width: 820px`. Kicker `TELEMETRY`, heading
`What the station is made of`.

- **Stat grid**: `repeat(auto-fit, minmax(170px, 1fr))`, same 1px-gap rule treatment,
  cells `padding: 22px 20px`. Per cell: value (Mono 200, 36px, line-height 1), label
  (Mono 10px, letter-spacing 0.2em, `var(--color-neutral-400)`, `margin-top: 10px`), sub
  (body 11px, `var(--color-neutral-500)`). Cells: `MODULES` (all time) ·
  `FOCUS MIN` (all time) · `THIS WEEK` (cycles completed) · `COMPLETION`
  (`completed / started`, "N of M started").
- **`THIS WEEK` bar row**: label Mono 10px letter-spacing 0.24em, then a
  `repeat(7, 1fr)` grid, `gap: 10px`, `align-items: end`, `height: 150px`, Mon–Sun.
  Each column is a flex column (`justify-content: flex-end`, `gap: 10px`) holding the bar
  and a Mono 10px day label (`var(--color-neutral-500)`, centered).
  Bar with sessions: `height: max(10%, count/max × 100%)`,
  `background: color-mix(in srgb, var(--color-accent) 20%, transparent)`,
  `border-top: 1px solid var(--color-accent)`. Zero days: `height: 2px`,
  `background: var(--color-neutral-900)`, `border-top: 1px solid var(--color-neutral-800)`
  — a baseline, not a hairline that reads as activity.
  `transition: height 500ms ease`.

---

## Interactions & behavior

### Phase machine

`idle → focus (25:00) → break (5:00) → focus → …`, with every 4th completed focus followed
by `long` (15:00) instead of `break`. Breaks auto-advance back to `idle` (the user presses
BEGIN CYCLE again). There is **no pause** — deliberately. Controls are only BEGIN CYCLE,
ABORT (during focus) and SKIP RECOVERY (during a break).

- **Complete focus** → chime (620Hz), append a `completed` session, dock a module,
  status `MODULE ONLINE`, newest-module highlight + `st-dock` animation for 1800ms,
  advance `cycle`, begin break or long break.
- **ABORT** → if elapsed ≥ 60s, append an `aborted` session (counts against completion
  rate, no module); under 60s it's a free cancel with nothing recorded. Status
  `CONSTRUCTION ABORTED`. Return to idle. Cold, quiet — no red, no shake, no alarm.
- **Complete break** → chime (440Hz), status `SYSTEMS NOMINAL`, return to idle.
- **SKIP RECOVERY** → free, status `RECOVERY SKIPPED`, return to idle.

**Timer correctness (important):** the clock is derived from a stored `deadline` timestamp
compared against `Date.now()` — never from accumulated interval ticks. A 250ms interval (or
rAF) recomputes the remaining time; this survives tab throttling and sleep. Guard the
phase-start timestamp: if it is missing (remount mid-cycle), fall back to
`Date.now() - duration × 1000` rather than writing an undefined timestamp.

### Animations

| Name | Spec | Used by |
|---|---|---|
| `st-breathe` | `0%,100% { opacity: 0.5 } 50% { opacity: 1 }` | system dot 3.4s, core inner ring 4.2s (focus only), target marker 1.9s (focus only) |
| `st-flow` | `to { stroke-dashoffset: -36 }` | connector energy lines, 2.4s linear infinite, focus only |
| `st-dock` | `from { opacity: 0; transform: translate(-50%,-50%) scale(0.8) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) }` | new module, 800ms `cubic-bezier(.2,.7,.2,1)` |
| `st-in` | `from { opacity: 0; transform: translateY(6px) }` | LOG / STATS overlays, 360ms ease |

Nothing else moves. Idle should feel almost still: the system dot breathes, the orbit
ellipses and starfield are static. Honor `prefers-reduced-motion` by dropping the flow and
breathe animations and keeping the progress arc and opacity changes.

### Audio

Two-oscillator Web Audio chime, no asset files: base frequency + its 1.5×, sine,
gain ramped to `0.07 / (i+1)` over 20ms then exponentially down over ~1.3s. 620Hz for
focus-end, 440Hz for break-end. Gate on a `sound` setting. (The PRD also asks for a browser
notification on focus end when `document.hidden`, permission requested on first start,
never on page load — not built in the prototype.)

---

## State management

```ts
type Session = {
  id: string            // uuid
  startedAt: number     // epoch ms — must always be finite
  endedAt: number
  durationMin: number   // 25
  label: string         // "" when no intent set
  outcome: 'completed' | 'aborted'
}

type Store = {
  version: 1
  sessions: Session[]   // chronological
}
```

- `localStorage` key `orbital.v1`, a single JSON blob. Write on phase transitions only,
  never per frame or per tick.
- On load: parse, drop any session whose `startedAt` is not a finite number (defensive
  against earlier bad writes), then re-save.
- Component state: `view` (`station | log | stats`), `phase`
  (`idle | focus | break | long`), `remaining` (seconds), `label`, `editing`, `status`,
  plus instance values `deadline`, `phaseStart`, `cycle` (0–3, `completedCount % 4` on load),
  `newestId`.
- The station is **cumulative across all time** — modules = all completed sessions, in
  order. Only the STATS week row is week-scoped (ISO week, Monday 00:00 local).
- The prototype seeds ~7 completed sessions + 1 aborted across the last 5 days on first run
  so the station isn't empty. **Remove the seed for production** — ship a bare core with the
  first target marker showing.

Tweakable props in the prototype: `demoMode` (runs 25 min in 25 s — a dev affordance worth
keeping behind a flag) and `sound`.

---

## Design tokens

From the **Nocturne** design system (`design/_ds/nocturne-.../styles.css`, guide in the
same folder's `readme.md`). Link the stylesheet and use `var(--*)`; the values below are
for reference only.

| Token | Value |
|---|---|
| `--color-bg` | `#161826` |
| `--color-surface` | `#232532` |
| `--color-text` | `#e9e9ed` |
| `--color-accent` | `#9184d9` |
| `--color-accent-100/200/300` | `#f5f4ff` / `#e7e5fe` / `#d2cefd` |
| `--color-neutral-100…900` | `#f3f5fe`, `#e4e7f5`, `#cfd3e5`, `#b2b6ca`, `#9397ab`, `#75798c`, `#595d6c`, `#3f424d`, `#292b31` |
| `--radius-sm / md / lg` | `4px` / `8px` / `14px` |
| `--space-1…8` | `2.8`, `5.6`, `8.4`, `11.2`, `16.8`, `22.4` px (density 0.70×) |

Two literal colors sit outside the token set, both intentional: the core disc fill `#101122`
and the module card fill `#12131f` — the station interior reads a step darker than the page
ground. The page background gradient uses `#1c1e2f` and `#0f1020` as its ends.

**Typography.** `--font-heading` / `--font-body` are Inter (from the design system). The
station is otherwise **JetBrains Mono** (weights 200/300/400, Google Fonts) — every HUD
readout, module label, timer and stat number. Headings in the LOG/STATS views use the
heading font at weight 500; never bolder (hierarchy here is size and space).

**System rules worth respecting:** accent as a line and a glow, never a flood; outlined
primary buttons (`.btn.btn-primary` is an accent outline on transparent, not a fill); low
chroma everywhere outside the accent; `:focus-visible` is a 2px accent outline with 2px
offset — never the browser default.

Note the brief asked for electric cyan (`#4DE8FF`); the bound design system's blurple
`#9184d9` was used instead so the app stays inside one visual system. If you want cyan,
change `--color-accent` and its ramp in one place.

## Assets

None. No images, no icon font, no 3D models. Module glyphs are the inline SVG paths in the
table above; the starfield is generated. Fonts come from Google Fonts (JetBrains Mono) and
the design system (Inter). The design system's guide names Phosphor Icons for any icon needs
beyond these glyphs.

## Files

```
design_handoff_orbital_station/
├── README.md                          ← this document
├── PRD-original.md                    ← the original product brief
└── design/
    ├── Orbital Station.dc.html        ← the design reference (template + logic)
    ├── support.js                      ← prototype runtime; ignore, do not port
    └── _ds/nocturne-.../
        ├── styles.css                  ← design tokens + component classes
        ├── _ds_bundle.js               ← design system component bundle
        └── readme.md                   ← design system guide
```

In `Orbital Station.dc.html`, read `<x-dc>…</x-dc>` as the markup and the
`class Component extends DCLogic` script as the logic: `renderVals()` returns everything the
markup interpolates (it is the render-time computation), `componentDidMount` is mount setup,
and `{{ name }}` holes are just values from `renderVals()`.
