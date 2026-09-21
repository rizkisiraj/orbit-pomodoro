# PRD — Orbit (working title)

A single-user pomodoro timer where every completed session becomes a planet in a star system you build week by week.

**Author:** Rizki · **Date:** 2026-09-21 · **Status:** Draft v1

---

## 1. Problem & Intent

I want a pomodoro timer I actually want to look at, and a reason not to quit a session halfway. Existing timers are either ugly utilities or gamified apps built for an audience I'm not part of. This is a personal tool: no accounts, no social, no monetization, no mobile app.

**One-line pitch:** Focus for 25 minutes, gain a planet. Quit early, watch it break apart. At the end of the week you have a solar system that is an honest picture of how you spent your attention.

**Success for me personally:**
- I use it for at least 3 consecutive weeks without opening a different timer.
- The abandon animation makes me finish at least one session I'd otherwise have quit.
- It loads in under 2 seconds and holds 60fps on my machine.

---

## 2. Scope

### In scope (v1)
- Classic 25 / 5 / 15 pomodoro cycle with auto-advance
- Session intent label attached to each planet
- Three.js scene: star + planets + moons, locked cinematic camera
- Weekly system lifecycle with an archive of past weeks
- Stats view (sessions, minutes, streak, abandon rate)
- localStorage persistence, no backend
- Completion chime + browser notification

### Explicitly out of scope
- Accounts, sync, multi-device, sharing, leaderboards
- Task lists, projects, tags, integrations (Notion/Todoist/etc.)
- Mobile-native app (responsive web is enough; phone is a nice-to-have, not a requirement)
- Website blocking / app blocking
- Any backend or database

### Deferred (v2 candidates)
- Custom durations in a settings panel
- Free-orbit camera during breaks and in the archive
- Ambient drone audio during focus
- Export archive as JSON / render a week as a shareable image

---

## 3. The Core Loop

```
 idle ──► [start, optional label] ──► FOCUS 25:00
                                        │
              ┌─────── abandon ─────────┤
              ▼                         ▼ complete
     protoplanet shatters        planet crystallizes into orbit
              │                         │
              └──────────► BREAK 5:00 ◄─┘
                             │  (moon accretes around newest planet)
                             ▼
                        next FOCUS …
              every 4th focus ──► LONG BREAK 15:00
```

### Phase rules
| Phase | Duration | Scene behavior |
|---|---|---|
| Focus | 25:00 | Dust cloud condenses into a protoplanet; density tracks elapsed % |
| Short break | 5:00 | A moon accretes around the planet just created |
| Long break | 15:00 | Triggered after every 4th completed focus; star flares and brightens one step |
| Idle | — | Slow drift over the existing system, timer reads `25:00` |

- Phases auto-advance. The only controls are **Start**, **Give up** (during focus), and **Skip break**.
- Pausing does not exist. This is deliberate — pause is how a session dies quietly. You either finish or you give up, and giving up costs something.
- Skipping a break is free: no moon, no penalty.

### The stake
Abandoning a focus session:
1. The protoplanet fractures and disperses into particles (~1.2s), pulled into the star.
2. Nothing is recorded in the system, but the abandon is counted in stats.
3. Scene returns to idle showing the surviving system.

This is the only negative feedback in the product. It should feel cold and quiet, not punishing — no red, no shake, no alarm sound.

---

## 4. World Rules

### Mapping
- **1 completed focus session = 1 planet**, placed on a new orbit outward from the star.
- **1 completed short break = 1 moon** on the most recently created planet (max 3 moons per planet; extras are ignored).
- **Every 4 completed focus sessions = +1 star brightness tier** (5 tiers, caps out at 20 sessions/week).

### Weekly lifecycle
- A system belongs to one ISO week, Monday 00:00 local → Sunday 23:59.
- On the first load of a new week, the current system is sealed into the archive and a fresh star is born.
- Sealing is non-destructive: archived weeks are fully re-renderable from their stored seeds.
- Practical cap: ~20 planets per week. Beyond 20, orbit spacing compresses logarithmically rather than adding new outer rings.

### Planet generation (deterministic)
Every planet's appearance derives from a seeded PRNG keyed on its `id` — same ID always renders the same planet, so storage stays tiny and archives replay exactly.

| Property | Derivation |
|---|---|
| Orbit radius | `3.2 + index * 1.15` (compressed past index 12) |
| Orbit speed | inverse-sqrt of radius (fake Kepler), scaled to ~60–180s per revolution |
| Inclination | seeded, ±8° — keeps the system readably flat |
| Starting angle | seeded, 0–2π |
| Body radius | 0.22–0.40, scaled by session duration |
| Geometry | icosahedron, detail 1–2, flat-shaded |
| Hue | week's base hue ± seeded 25° |
| Surface detail | seeded choice of: banded, cratered (displaced verts), ringed (~1 in 8), glowing-fault |

### Data model (localStorage)

```ts
type Session = {
  id: string          // uuid — doubles as the render seed
  startedAt: number   // epoch ms
  endedAt: number
  durationMin: number
  label: string       // "" if skipped
  outcome: 'completed' | 'abandoned'
  moons: number       // 0–3, incremented by completed breaks
}

type Week = {
  isoWeek: string     // "2026-W39"
  baseHue: number     // 0–360, seeded from isoWeek
  sessions: Session[]
}

type Store = {
  version: 1
  currentWeek: Week
  archive: Week[]     // trimmed to last 52
  settings: { sound: boolean; notifications: boolean }
}
```

Key: `orbit.v1`. Single JSON blob. Writes happen on phase transitions only, never per-frame.

---

## 5. Screens

### 5.1 Timer (default)
Full-bleed canvas. UI floats over it, no panels or chrome.

```
┌──────────────────────────────────────────────┐
│                                              │
│                ·          ○                  │
│         ·                                    │
│                    ( ☀ )          ·          │
│              ·                  ○            │
│                       ·                      │
│                                              │
│                   2 5 : 0 0                  │
│               refactor auth layer            │
│                                              │
│                  [  START  ]                 │
│                                              │
│  wk 39 · 6 planets           archive  stats  │
└──────────────────────────────────────────────┘
```

- Timer is the only large type on screen. Tabular-figure mono, thin weight, wide letter-spacing.
- Clicking the label line before starting opens an inline text input ("what are you focusing on?"). Enter starts the session.
- During focus, everything except the timer and a low-contrast `give up` link fades to ~30% opacity.
- Hovering a planet (when idle) surfaces its label and time as a small caption near the bottom — no floating tooltips in 3D space.

### 5.2 Archive
Grid of past weeks, each a small live-rendered thumbnail canvas (or static snapshot if perf demands). Click to expand a week full-screen with its label list. Sorted newest first.

### 5.3 Stats
Minimal, text-first. No charts beyond one sparkline-style bar row.
- Sessions this week / all time
- Focus minutes this week / all time
- Current streak (consecutive days with ≥1 completed session)
- Completion rate (completed ÷ started)
- Per-day bars for the current week

---

## 6. Visual Direction

**Minimalist futuristic** = restraint plus one precise glow. Not neon cyberpunk, not sci-fi HUD clutter.

| Element | Spec |
|---|---|
| Background | Near-black `#07080B`, very subtle radial vignette |
| Star | Emissive sphere + bloom; color shifts warm→white-hot across brightness tiers |
| Planets | Flat-shaded, low-poly, matte with a thin emissive rim |
| Orbits | Hairline rings at 6–10% opacity, not full circles — arcs that fade |
| Starfield | ~800 static points, two size classes, no twinkle |
| Type | One sans (Inter / Geist) + one mono (JetBrains Mono / Geist Mono) for the timer |
| Accent | One hue per week, derived from the ISO week number |
| Motion | Everything eases; nothing bounces. Transitions 400–800ms |
| Post | Bloom only. No DOF, no vignette shader, no chromatic aberration |

**Camera:** locked cinematic drift — slow auto-orbit (~1 revolution / 4 min) with gentle elevation sway. No user control in v1. During focus the camera pushes in slightly toward the forming protoplanet; on completion it eases back out to frame the whole system.

**Accessibility:** `prefers-reduced-motion` freezes camera drift and orbital motion, keeping only the timer and opacity fades. Text maintains 4.5:1 contrast against the backdrop at all times — the UI layer gets a subtle scrim if a bright body passes behind it.

---

## 7. Technical Plan

**Stack:** Vite + React + TypeScript + react-three-fiber + drei. Zustand for timer/store state. Tailwind for the DOM UI layer. Static deploy to Vercel. No server, no API routes, no database.

```
src/
├── main.tsx
├── App.tsx                    # route switch: timer | archive | stats
├── scene/
│   ├── Scene.tsx              # <Canvas>, lights, bloom, camera rig
│   ├── Star.tsx
│   ├── Planet.tsx             # one body + its moons + orbit arc
│   ├── Protoplanet.tsx        # in-progress body: accretion + shatter
│   ├── Starfield.tsx
│   └── CameraRig.tsx          # drift, focus push-in
├── timer/
│   ├── useTimer.ts            # phase machine, deadline-based
│   └── phases.ts              # durations, transition rules
├── store/
│   ├── store.ts               # zustand + localStorage persistence
│   ├── week.ts                # ISO week calc, rollover, sealing
│   └── schema.ts              # types + migration guard
├── gen/
│   ├── rng.ts                 # mulberry32 seeded PRNG
│   └── planet.ts              # id → planet params
├── audio/chime.ts             # Web Audio, synthesized, no assets
├── ui/                        # Timer, LabelInput, Controls, Archive, Stats
└── styles/globals.css
```

**Timer correctness:** the clock is derived from a stored `deadline` timestamp compared against `Date.now()`, never from accumulated `setInterval` ticks. This survives tab throttling, sleep, and backgrounding. A `requestAnimationFrame` loop drives the display; a `visibilitychange` handler recomputes on return. If the tab was closed mid-session, on next load the session is resolved as abandoned.

**Audio & notifications:**
- Chime: two-oscillator Web Audio blip with a short decay envelope. Distinct tones for focus-end vs break-end. No files.
- Notification permission requested on first Start, never on page load. Fires only when `document.hidden`. Silently skipped if denied.

**Performance budget:**
- Target 60fps, fall back gracefully; `dpr` capped at `[1, 2]`
- < 12k triangles total for a full 20-planet week
- Planets share one geometry pool (4 icosahedron LODs) and one material with per-instance color
- Orbit arcs are a single merged line geometry rebuilt only when a planet is added
- Bundle target < 400kb gzipped (three.js dominates; no drei helpers beyond what's used)

---

## 8. Build Order

**M1 — Timer works (no 3D).** Phase machine, deadline math, labels, localStorage, chime, notifications. Plain HTML UI. *Usable on its own.*

**M2 — The system renders.** Canvas, star, starfield, deterministic planet gen, orbits, camera drift. Renders the sessions M1 already recorded.

**M3 — The loop closes.** Protoplanet accretion during focus, crystallization on complete, shatter on abandon, moons on break, star tiers.

**M4 — Memory.** Week rollover + sealing, archive grid, stats view.

**M5 — Polish.** Bloom tuning, transition easing, reduced-motion, responsive layout, contrast scrim, perf pass.

Ship after M3. M4 and M5 can land while you're already using it.

---

## 9. Open Questions

1. **Abandon threshold** — should quitting in the first 60 seconds count as an abandon, or as a free cancel? (Suggestion: free cancel under 60s. Misclicks shouldn't cost a planet, and it doesn't weaken the stake.)
2. **Overnight sessions** — a session started Sunday 23:50 finishes in the new week. Assign the planet to the week it *started* in. (Confirm.)
3. **Long break moons** — does a completed 15-min long break add a moon, or something distinct (a ring? a second moon)? (Suggestion: a ring on the newest planet — makes 4-session sets visually legible.)
4. **Empty weeks** — does a week with zero sessions still get archived as a bare star, or dropped? (Suggestion: archive it. An empty week is data too.)
5. **Week hue** — derived from week number (unpredictable but varied) or a fixed rotating palette of ~8 hues (always tasteful, more repetitive)? (Suggestion: fixed palette, so no week is ever an ugly color.)
