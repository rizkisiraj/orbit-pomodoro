/**
 * CONSTRUCTION LOG — every session ever started, newest first. Aborted cycles
 * appear too; an honest log is the point.
 */
import { codeFor } from '../utils/modules';
import { completedOf } from '../store/store';
import type { Session } from '../types';

function formatDate(ms: number): string {
  return new Date(ms)
    .toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
    .toUpperCase();
}

export function LogView({ sessions }: { sessions: Session[] }) {
  const completed = completedOf(sessions);
  const rows = [...sessions].reverse();

  return (
    <div className="st-overlay">
      <div className="st-overlay-inner">
        <div className="st-kicker">CONSTRUCTION LOG</div>
        <h1 className="st-heading">{completed.length} modules docked</h1>

        <div className="st-rows">
          {rows.map((session) => {
            // A module's code comes from its position among completed sessions,
            // so aborted rows have none.
            const index = completed.indexOf(session);
            const docked = index >= 0;
            return (
              <div className="st-row" key={session.id}>
                <span className="st-row-date">{formatDate(session.startedAt)}</span>
                <span className={`st-row-code${docked ? '' : ' is-aborted'}`}>
                  {docked ? codeFor(index) : '—'}
                </span>
                <span className="st-row-label">{session.label || 'no intent recorded'}</span>
                <span className="st-row-outcome">{docked ? 'DOCKED' : 'ABORTED'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
