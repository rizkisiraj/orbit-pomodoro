/**
 * TELEMETRY. The station is cumulative across all time; only the week row here
 * is week-scoped.
 */
import { DAYS, pad2 } from '../constants';
import { computeStats } from '../utils/stats';
import type { Session } from '../types';

export function StatsView({ sessions }: { sessions: Session[] }) {
  const stats = computeStats(sessions);
  const maxDay = Math.max(1, ...stats.dayCounts);

  const cells = [
    { value: pad2(stats.modules), label: 'MODULES', sub: 'all time' },
    { value: String(stats.focusMinutes), label: 'FOCUS MIN', sub: 'all time' },
    { value: pad2(stats.weekCompleted), label: 'THIS WEEK', sub: 'cycles completed' },
    {
      value: `${stats.completionPct}%`,
      label: 'COMPLETION',
      sub: `${stats.modules} of ${stats.started} started`,
    },
  ];

  return (
    <div className="st-overlay">
      <div className="st-overlay-inner is-narrow">
        <div className="st-kicker">TELEMETRY</div>
        <h1 className="st-heading">What the station is made of</h1>

        <div className="st-stat-grid">
          {cells.map((cell) => (
            <div className="st-stat" key={cell.label}>
              <div className="st-stat-value">{cell.value}</div>
              <div className="st-stat-label">{cell.label}</div>
              <div className="st-stat-sub">{cell.sub}</div>
            </div>
          ))}
        </div>

        <div className="st-week-label">THIS WEEK</div>
        <div className="st-week-grid">
          {DAYS.map((day, i) => {
            const count = stats.dayCounts[i];
            return (
              <div className="st-week-col" key={day}>
                <div
                  className={`st-week-bar${count ? '' : ' is-empty'}`}
                  style={count ? { height: `${Math.max(10, (count / maxDay) * 100)}%` } : undefined}
                />
                <div className="st-week-day">{day}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
