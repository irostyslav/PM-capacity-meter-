import { useStore } from '../state/store';
import { personWeek, squadRollup } from '../domain/capacity';
import { weekStartOf } from '../domain/weeks';

export function Rollup() {
  const people = useStore((s) => s.people);
  const blocks = useStore((s) => s.blocks);
  const today = useStore((s) => s.today);

  const week = weekStartOf(today);
  const roll = squadRollup({ people, blocks }, week);
  const pct = Math.round(roll.bufferFraction * 100);

  // The PM sits beside the squad total, never inside it. A squad that reads
  // healthy while the planner is 8h into their own evenings is the exact
  // picture this strip has to be able to show.
  const pm = people.find((p) => p.role === 'pm' && p.active);
  const mine = pm ? personWeek(pm, week, blocks) : null;

  return (
    <div className="meters">
      <Meter label="Squad committed" value={`${roll.committedHours}h`} />
      <Meter label="Squad buffer" value={`${roll.bufferHours}h · ${pct}%`} />
      <Meter
        label="Squad over"
        value={`${roll.overHours}h`}
        tone={roll.overHours > 0 ? 'over' : undefined}
      />
      {mine && (
        <>
          <span className="meter-divider" aria-hidden="true" />
          <Meter
            label="Your week"
            value={`${mine.loggedHours}h of ${mine.capacityHours}h`}
            tone={mine.isOvertime ? 'over' : undefined}
          />
          <Meter
            label="Your overtime"
            value={`${mine.overtimeHours}h`}
            tone={mine.isOvertime ? 'over' : undefined}
          />
        </>
      )}
    </div>
  );
}

function Meter({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'over';
}) {
  return (
    <div className={tone ? `meter ${tone}` : 'meter'}>
      <span className="meter-value mono">{value}</span>
      <span className="meter-label">{label}</span>
    </div>
  );
}
