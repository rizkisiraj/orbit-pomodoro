import type { Stats as StatsData } from '../contract/types';

export interface StatsProps {
  stats: StatsData;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/5 py-3">
      <span className="font-sans text-sm text-dim">{label}</span>
      <span className="font-mono text-lg tabular-nums text-ink">{value}</span>
    </div>
  );
}

/**
 * Minimal, text-first stats. One sparkline-style bar row for the current
 * week — no chart library (PRD §5.3).
 */
export function Stats({ stats }: StatsProps) {
  const maxDay = Math.max(1, ...stats.perDay);

  return (
    <div className="mx-auto h-full w-full max-w-md overflow-y-auto px-6 py-16">
      <h1 className="mb-8 font-sans text-sm font-medium uppercase tracking-[0.2em] text-dim">
        Stats
      </h1>

      <div className="mb-10">
        <Row label="Sessions this week" value={String(stats.sessionsThisWeek)} />
        <Row label="Sessions all time" value={String(stats.sessionsAllTime)} />
        <Row label="Focus minutes this week" value={String(stats.minutesThisWeek)} />
        <Row label="Focus minutes all time" value={String(stats.minutesAllTime)} />
        <Row label="Current streak" value={`${stats.streakDays}d`} />
        <Row label="Completion rate" value={`${Math.round(stats.completionRate * 100)}%`} />
      </div>

      <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-dim">This week</p>
      <div className="flex h-24 items-end gap-2" role="img" aria-label="Completed sessions per day, Monday through Sunday">
        {stats.perDay.map((count, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-sm bg-accent"
              style={{
                height: `${Math.max(4, (count / maxDay) * 100)}%`,
                opacity: count === 0 ? 0.15 : 0.85,
              }}
            />
            <span className="font-sans text-[0.65rem] text-dim">{DAY_LABELS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
