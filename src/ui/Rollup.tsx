import { useStore } from '../state/store';
import { squadRollup } from '../domain/capacity';
import { weekStartOf } from '../domain/weeks';

export function Rollup() {
  const engineers = useStore((s) => s.engineers);
  const blocks = useStore((s) => s.blocks);
  const today = useStore((s) => s.today);

  const roll = squadRollup({ engineers, blocks }, weekStartOf(today));
  const pct = Math.round(roll.bufferFraction * 100);

  return (
    <div className="meters">
      <Meter label="Committed" value={`${roll.committedHours}h`} />
      <Meter label="Buffer" value={`${roll.bufferHours}h · ${pct}%`} />
      <Meter
        label="Over capacity"
        value={`${roll.overHours}h`}
        tone={roll.overHours > 0 ? 'over' : undefined}
      />
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
