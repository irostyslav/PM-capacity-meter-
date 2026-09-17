import { useStore } from '../state/store';
import { personWeek, pmWorkload } from '../domain/capacity';
import { overtimeLedger, pmTimeBreakdown } from '../domain/metrics';
import { formatWeek, weekStartOf } from '../domain/weeks';

const LABEL: Record<string, string> = {
  discovery: 'Discovery',
  definition: 'Definition',
  triage: 'Triage',
  stakeholder: 'Stakeholders',
  review: 'Review',
};

/**
 * The PM's own week, stated plainly enough to forward.
 *
 * This panel is the answer to "the discovery is assumed to take no time": it
 * puts planned hours, logged hours, and the gap between them in one place, with
 * the gap named for what it is.
 */
export function MyWeek() {
  const people = useStore((s) => s.people);
  const blocks = useStore((s) => s.blocks);
  const today = useStore((s) => s.today);

  const pm = people.find((p) => p.role === 'pm' && p.active);
  if (!pm) return null;

  const week = weekStartOf(today);
  const mine = personWeek(pm, week, blocks);
  const load = pmWorkload(blocks, pm.id, week);
  const ledger = overtimeLedger(pm, blocks);
  const breakdown = pmTimeBreakdown(blocks, pm.id);
  const loggedBreakdown = breakdown.filter((b) => b.loggedHours > 0);
  const maxHours = Math.max(1, ...breakdown.map((b) => Math.max(b.plannedHours, b.loggedHours)));

  return (
    <section className="panel myweek">
      <div className="panel-head">
        <h2>Your week</h2>
        <span className="count mono">week of {formatWeek(week)}</span>
      </div>

      <div className="panel-body">
        <div className="myweek-figures">
          <Figure label="Sustainable week" value={`${mine.capacityHours}h`} />
          <Figure
            label="Planned into it"
            value={`${mine.plannedHours}h`}
            tone={mine.plannedHours > mine.capacityHours ? 'over' : undefined}
          />
          <Figure
            label="Actually worked"
            value={`${mine.loggedHours}h`}
            tone={mine.isOvertime ? 'over' : undefined}
          />
          <Figure
            label="Evenings and weekends"
            value={`${mine.overtimeHours}h`}
            tone={mine.isOvertime ? 'over' : undefined}
          />
        </div>

        {mine.plannedHours > mine.capacityHours && (
          <p className="note warn">
            {mine.plannedHours - mine.capacityHours}h more thinking is planned into
            this week than it holds. That gap does not disappear — it moves to your
            own time, which is what the hours on the right are.
          </p>
        )}

        <div className="myweek-split">
          <div>
            <span className="eyebrow">Where the time goes</span>
            <div className="bars">
              {breakdown.map((row) => (
                <div className="bar-row" key={row.type}>
                  <span className="bar-label">{LABEL[row.type] ?? row.type}</span>
                  <span className="bar-track">
                    <i
                      className="planned"
                      style={{ width: `${(row.plannedHours / maxHours) * 100}%` }}
                    />
                    <i
                      className="logged"
                      style={{ width: `${(row.loggedHours / maxHours) * 100}%` }}
                    />
                  </span>
                  <span className="bar-value mono">
                    {row.loggedHours}h / {row.plannedHours}h
                  </span>
                </div>
              ))}
            </div>
            <p className="hint">
              Thin bar is planned; solid bar is what it actually took.
              {loggedBreakdown.length > 0 &&
                ` ${LABEL[loggedBreakdown[0]!.type] ?? loggedBreakdown[0]!.type} is taking the most.`}
            </p>
          </div>

          <div>
            <span className="eyebrow">The pattern</span>
            <dl className="ledger">
              <Row
                term="Overtime, all weeks"
                value={`${ledger.totalOvertimeHours}h`}
                tone={ledger.totalOvertimeHours > 0 ? 'over' : undefined}
              />
              <Row term="Weeks over" value={`${ledger.weeksOver} of ${ledger.weeks.length}`} />
              <Row
                term="Current run"
                value={
                  ledger.currentStreak === 0
                    ? 'none'
                    : `${ledger.currentStreak} week${ledger.currentStreak === 1 ? '' : 's'}`
                }
                tone={ledger.currentStreak >= 2 ? 'over' : undefined}
              />
              <Row
                term="Average per worked week"
                value={`${ledger.averageOvertimePerWeek.toFixed(1)}h`}
              />
              <Row term="Thinking planned this week" value={`${load.totalHours}h`} />
            </dl>
            <p className="hint">
              These are the figures to bring when the next request arrives. A
              schedule that only works because of unpaid hours is not a schedule
              that works.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'over';
}) {
  return (
    <div className={tone ? `figure ${tone}` : 'figure'}>
      <span className="figure-value mono">{value}</span>
      <span className="figure-label">{label}</span>
    </div>
  );
}

function Row({
  term,
  value,
  tone,
}: {
  term: string;
  value: string;
  tone?: 'over';
}) {
  return (
    <div className={tone ? `ledger-row ${tone}` : 'ledger-row'}>
      <dt>{term}</dt>
      <dd className="mono">{value}</dd>
    </div>
  );
}
