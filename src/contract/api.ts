/**
 * SHARED CONTRACT — module boundaries.
 *
 * OWNED BY: the human / orchestrator. Agents MUST NOT edit this file.
 *
 * Each block below states the exact module path and export signature one agent
 * is responsible for producing, and every other agent is allowed to assume.
 * Implement to these signatures exactly — names, argument order, return shape.
 * Anything not listed here is private to the owning agent.
 */

import type { ReactElement } from 'react';
import type {
  PersistedStore,
  PlanetParams,
  Session,
  Settings,
  Stats,
  TimerApi,
  Week,
} from './types';

// ===========================================================================
// LOGIC-1  —  src/timer/useTimer.ts
// ===========================================================================
/**
 * The phase machine. Deadline-driven: derives remaining time by comparing a
 * stored epoch deadline against Date.now(), never by accumulating ticks.
 *
 *   export function useTimer(): TimerApi
 */
export type UseTimer = () => TimerApi;

/**
 * INTEGRATION SEAM (added after LOGIC-1 landed; the signature above is unchanged).
 *
 * `TimerState` cannot express everything M-INT needs: it carries no session id
 * or timestamps for `recordSession`, and it cannot tell a break that completed
 * from one that was skipped — both merely look like `phase` becoming 'focus'.
 * So `useTimer` takes an OPTIONAL options bag:
 *
 *   useTimer(options?: { onPhaseEnd?: (event: PhaseEndEvent) => void }): TimerApi
 *
 * Optional, so `useTimer()` still satisfies `UseTimer` structurally. Import
 * `PhaseEndEvent` and `UseTimerOptions` from `~/timer/useTimer`.
 *
 * M-INT wiring, one handler:
 *   focusCompleted    -> recordSession(session) + playChime('focusEnd') + notify
 *   focusAbandoned    -> recordSession(session) + trigger Scene `shattering`
 *   focusCancelled    -> nothing (free cancel inside the grace period)
 *   shortBreakCompleted -> addMoonToLatest() + playChime('breakEnd')
 *   longBreakCompleted  -> addRingToLatest() + playChime('breakEnd')
 *   *Skipped          -> nothing. Skipping a break is free.
 */
export type OnPhaseEnd = (event: unknown) => void;

// ---------------------------------------------------------------------------
// LOGIC-1  —  src/audio/chime.ts
// ---------------------------------------------------------------------------
/**
 *   export function playChime(kind: ChimeKind): void
 *
 * Synthesized via Web Audio. No asset files. Silent when settings.sound is off.
 */
export type ChimeKind = 'focusEnd' | 'breakEnd';
export type PlayChime = (kind: ChimeKind) => void;

// ---------------------------------------------------------------------------
// LOGIC-1  —  src/notify/notify.ts
// ---------------------------------------------------------------------------
/**
 *   export function requestNotificationPermission(): Promise<boolean>
 *   export function notify(title: string, body: string): void
 *
 * `notify` is a no-op unless document.hidden and permission was granted.
 * Permission is requested on first Start, never on page load.
 */
export type RequestNotificationPermission = () => Promise<boolean>;
export type Notify = (title: string, body: string) => void;

// ===========================================================================
// LOGIC-2  —  src/store/store.ts
// ===========================================================================
/**
 * Zustand store over localStorage. Writes only on phase transitions.
 *
 *   export const useStore: UseBoundStore<StoreApi<StoreState>>
 *
 * plus these convenience selector hooks:
 *   export function useCurrentWeek(): Week
 *   export function useArchive(): Week[]
 *   export function useSettings(): Settings
 */
export interface StoreActions {
  /** Appends a finished session to the current week and persists. */
  recordSession(session: Session): void;
  /** Adds a moon to the newest planet, capped at MAX_MOONS_PER_PLANET. */
  addMoonToLatest(): void;
  /** Flags the newest planet as ringed (awarded by a completed long break). */
  addRingToLatest(): void;
  /** Seals the current week into the archive if the ISO week has changed. */
  rolloverIfNeeded(now?: number): void;
  setSettings(patch: Partial<Settings>): void;
}

export type StoreState = PersistedStore & StoreActions;

// ---------------------------------------------------------------------------
// LOGIC-2  —  src/gen/rng.ts
// ---------------------------------------------------------------------------
/**
 *   export function seedFrom(text: string): number     // xmur3-style string hash
 *   export function mulberry32(seed: number): () => number   // 0..1 generator
 */
export type SeedFrom = (text: string) => number;
export type Mulberry32 = (seed: number) => () => number;

// ---------------------------------------------------------------------------
// LOGIC-2  —  src/gen/planet.ts
// ---------------------------------------------------------------------------
/**
 *   export function planetParamsFor(session, index, baseHue): PlanetParams
 *   export function planetsForWeek(week: Week): PlanetParams[]
 *
 * Pure and deterministic: same id + index + hue always yields the same planet.
 * Only sessions with outcome 'completed' become planets; `planetsForWeek`
 * filters abandoned ones out and assigns orbit indexes in chronological order.
 * Orbit radius and speed MUST come from contract/constants, not local math.
 */
export type PlanetParamsFor = (
  session: Session,
  index: number,
  baseHue: number,
) => PlanetParams;
export type PlanetsForWeek = (week: Week) => PlanetParams[];

// ---------------------------------------------------------------------------
// LOGIC-2  —  src/stats/stats.ts
// ---------------------------------------------------------------------------
/**
 *   export function computeStats(current: Week, archive: Week[], now?: number): Stats
 */
export type ComputeStats = (current: Week, archive: Week[], now?: number) => Stats;

// ===========================================================================
// VIEW-1  —  src/App.tsx and src/ui/**
// ===========================================================================
/**
 * Owns every DOM pixel: timer readout, intent input, controls, archive grid,
 * stats view, view switching, Tailwind theme tokens.
 *
 *   export default function App(): JSX.Element
 *
 * Consumes: useTimer(), useStore + selector hooks, computeStats().
 * Renders <Scene /> from VIEW-2 as the fixed background layer.
 */
export type ViewName = 'timer' | 'archive' | 'stats';

// ===========================================================================
// VIEW-2  —  src/scene/Scene.tsx and src/scene/**
// ===========================================================================
/**
 * Owns everything inside the R3F canvas. Takes plain props — it never reads
 * the store or the timer directly, which keeps it renderable in isolation and
 * reusable for archive thumbnails.
 *
 *   export function Scene(props: SceneProps): JSX.Element
 */
export interface SceneProps {
  /** Planets to render. Pass [] for an empty week. */
  planets: PlanetParams[];
  /** 0..5. Drives star size, colour temperature and bloom intensity. */
  starTier: number;
  /** Week hue, 0..360. */
  baseHue: number;
  /** Drives protoplanet accretion. null when no focus phase is running. */
  focusProgress: number | null;
  /** Set true for one render to trigger the shatter animation. */
  shattering?: boolean;
  /** Slow auto-orbit + push-in during focus. Frozen under reduced motion. */
  cinematic?: boolean;
  /** Static framing for archive thumbnails; disables drift and interaction. */
  thumbnail?: boolean;
  /** Fired on planet hover so the DOM layer can show a caption. */
  onHoverPlanet?: (planet: PlanetParams | null) => void;
}

export type SceneComponent = (props: SceneProps) => ReactElement;

// Re-exported so agents import everything they need from one place.
export type { PersistedStore, PlanetParams, Session, Settings, Stats, TimerApi, Week };
