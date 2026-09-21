import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { mockPlanetsForWeek } from '../contract/mock';
import { starTier } from '../contract/constants';
import type { Week } from '../contract/types';
import { ScenePlaceholder } from './ScenePlaceholder';

const LIVE_THUMBNAIL_CAP = 8;

function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  return [ref, inView];
}

function completedCount(week: Week): number {
  return week.sessions.filter((s) => s.outcome === 'completed').length;
}

interface WeekCardProps {
  week: Week;
  eager: boolean;
  onSelect: () => void;
}

function WeekCard({ week, eager, onSelect }: WeekCardProps) {
  const [ref, inView] = useInView<HTMLButtonElement>();
  const mounted = eager || inView;
  const planets = mounted ? mockPlanetsForWeek(week) : [];
  const tier = starTier(completedCount(week));

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] text-left transition-colors duration-300 ease-orbit hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {mounted && (
        <ScenePlaceholder
          planets={planets}
          starTier={tier}
          baseHue={week.baseHue}
          focusProgress={null}
          thumbnail
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-scrim px-3 py-2">
        <p className="font-sans text-xs text-ink">{week.isoWeek}</p>
        <p className="font-sans text-[0.7rem] text-dim">{completedCount(week)} planets</p>
      </div>
    </button>
  );
}

export interface ArchiveProps {
  weeks: Week[];
}

/**
 * Grid of past weeks, newest first. Each card is a small live-rendered
 * thumbnail; the first `LIVE_THUMBNAIL_CAP` mount immediately, the rest
 * lazy-mount as they scroll into view. Click expands a week full-screen
 * with its session label list.
 */
export function Archive({ weeks }: ArchiveProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const sorted = [...weeks].sort((a, b) => b.startedAt - a.startedAt);
  const selectedWeek = expanded !== null ? sorted[expanded] : null;

  return (
    <div className="mx-auto h-full w-full max-w-5xl overflow-y-auto px-6 py-16 sm:px-10">
      <h1 className="mb-8 font-sans text-sm font-medium uppercase tracking-[0.2em] text-dim">
        Archive
      </h1>

      {sorted.length === 0 ? (
        <p className="font-sans text-sm text-dim">No sealed weeks yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {sorted.map((week, i) => (
            <WeekCard
              key={week.isoWeek}
              week={week}
              eager={i < LIVE_THUMBNAIL_CAP}
              onSelect={() => setExpanded(i)}
            />
          ))}
        </div>
      )}

      {selectedWeek && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Week ${selectedWeek.isoWeek}`}
          className="fixed inset-0 z-20 flex flex-col bg-void/95"
        >
          <div className="relative flex-1">
            <ScenePlaceholder
              planets={mockPlanetsForWeek(selectedWeek)}
              starTier={starTier(completedCount(selectedWeek))}
              baseHue={selectedWeek.baseHue}
              focusProgress={null}
            />
          </div>
          <div className="max-h-[40vh] overflow-y-auto bg-void px-6 py-6 sm:px-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-sm font-medium uppercase tracking-[0.2em] text-ink">
                {selectedWeek.isoWeek}
              </h2>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="font-sans text-xs text-dim underline decoration-faint underline-offset-4 hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                close
              </button>
            </div>
            <ul className="space-y-1.5">
              {selectedWeek.sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-4 font-sans text-sm text-dim"
                >
                  <span className={s.outcome === 'abandoned' ? 'text-faint line-through' : 'text-ink'}>
                    {s.label || 'untitled session'}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-dim">
                    {new Date(s.startedAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
