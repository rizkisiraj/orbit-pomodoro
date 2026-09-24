/**
 * TELEMETRY. The station is cumulative across all time; only the week row here
 * is week-scoped.
 */
import { DAYS, pad2 } from '../constants';
import { computeStats } from '../utils/stats';
import { SEAL_POINTS, STATION_SIZE, progressFor } from '../utils/milestones';
import type { Session } from '../types';

export function StatsView({ sessions }: { sessions: Session[] }) {
  const stats = computeStats(sessions);
  const standing = progressFor(stats.modules);
  const maxDay = Math.max(1, ...stats.dayCounts);
  const buildComplete = standing.next === null;

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

        <div className="st-standing">
          <div className="st-standing-head">
            <span className="st-standing-tier">{standing.tier}</span>
            <span className="st-standing-build">BUILD {pad2(standing.stationNumber)}</span>
          </div>
          <div className="st-standing-track">
            <div
              className="st-standing-fill"
              style={{ width: `${(standing.inStation / STATION_SIZE) * 100}%` }}
            />
            {SEAL_POINTS.map((point) => (
              <div
                className="st-standing-seal"
                key={point}
                style={{ left: `${(point / STATION_SIZE) * 100}%` }}
              >
                <div className={`st-standing-tick${standing.inStation >= point ? ' is-sealed' : ''}`} />
                <div className="st-standing-tick-label">{pad2(point)}</div>
              </div>
            ))}
          </div>
          <div className="st-standing-sub">
            {pad2(standing.inStation)} / {pad2(STATION_SIZE)} MODULES
            {buildComplete ? ' · BUILD COMPLETE' : ` · ${standing.toNext} TO NEXT SEAL`}
          </div>
        </div>

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
