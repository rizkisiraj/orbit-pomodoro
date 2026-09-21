# Orbital Station

A pomodoro timer that builds a modular space station. Every completed 25-minute focus cycle docks a new module onto the station — no accounts, no backend, all state lives in your browser.

## How it works

- **Focus** for 25 minutes, then **recover** for 5 (a **long recovery** of 15 minutes kicks in every 4th cycle).
- Each completed focus cycle docks a module (COMMS, HABITAT, POWER, RESEARCH, OPTICS, DOCKING, BIOMASS, ANALYSIS) onto one of three rings around the station core.
- Abort within the first minute and it's a free cancel — nothing is recorded. Abort after that and it's logged.
- Session history and stats are kept in `localStorage` (`orbital.v1`) — nothing leaves your machine.

## Tech stack

- React 19 + TypeScript
- Zustand for state
- Vite for build/dev tooling
- Vitest + Testing Library for tests
- oxlint for linting

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

### Scripts

```bash
npm run dev         # start the dev server
npm run build        # type-check and build for production
npm run preview      # preview the production build locally
npm run test         # run the test suite (vitest)
npm run lint          # lint with oxlint
npm run typecheck     # type-check without emitting
```

### Demo mode

In dev builds, append `?demo=1` to the URL to compress a 25-minute cycle into 25 seconds, so the docking sequence can be watched without waiting out a real cycle. This flag is stripped in production.

## Deployment

The app is a static SPA — no backend, no environment variables, no API. It's built and served via Docker (multi-stage build: Node builds the assets, then nginx serves them).

```bash
docker compose up -d --build
```

This serves the app on `http://localhost:8080` (change the host-side port in `docker-compose.yml` if 8080 is taken, or point an existing reverse proxy at the container's port 80 instead).

To update a running deployment:

```bash
git pull && docker compose up -d --build
```

Since all app state lives in each visitor's browser (`localStorage`), the container itself is stateless — there's no volume to back up.

## Project structure

```
src/
├── main.tsx                 # entry point
├── orbital/
│   ├── App.tsx               # top-level layout and view switching
│   ├── useStation.ts         # timer/session state hook
│   ├── store.ts               # zustand store
│   ├── slots.ts                # module ring/slot placement logic
│   ├── stats.ts                 # session stats aggregation
│   ├── sound.ts                  # synthesized UI tick/chime sounds
│   ├── starfield.ts                # background starfield rendering
│   ├── notify.ts                    # browser notifications
│   ├── constants.ts                  # all tunable numbers (durations, geometry, etc.)
│   ├── types.ts                       # shared types
│   └── components/
│       ├── Station.tsx                # the station visualization
│       ├── Hud.tsx                     # timer controls / HUD
│       ├── LogView.tsx                  # session log
│       └── StatsView.tsx                 # stats dashboard
└── styles/
    └── nocturne.css              # base theme
```
