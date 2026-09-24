import type { MeasureCapacity } from '../domain/types';

interface Props {
  capacity: MeasureCapacity | null;
  compact?: boolean;
}

export function CapacityStrip({ capacity, compact = false }: Props) {
  if (!capacity || capacity.plannedHours === 0) {
    return compact ? null : (
      <span className="cap-strip cap-strip--empty">no capacity</span>
    );
  }

  const { pmHours, engHours, plannedHours } = capacity;
  const pmPct = Math.round((pmHours / plannedHours) * 100);
  const engPct = 100 - pmPct;

  if (compact) {
    return (
      <span className="cap-strip cap-strip--compact">
        <span style={{ color: 'var(--cap-pm)' }}>{pmHours}h PM</span>
        {' · '}
        <span style={{ color: 'var(--cap-eng)' }}>{engHours}h eng</span>
      </span>
    );
  }

  return (
    <div className="cap-strip">
      <div className="cap-bar">
        <div
          className="cap-bar__pm"
          style={{ width: `${pmPct}%` }}
          title={`PM: ${pmHours}h (${pmPct}%)`}
        />
        <div
          className="cap-bar__eng"
          style={{ width: `${engPct}%` }}
          title={`Eng: ${engHours}h (${engPct}%)`}
        />
      </div>
      <div className="cap-legend">
        <span style={{ color: 'var(--cap-pm)' }}>PM {pmHours}h</span>
        <span style={{ color: 'var(--cap-eng)' }}>Eng {engHours}h</span>
        <span className="cap-total">{plannedHours}h total</span>
      </div>
    </div>
  );
}
