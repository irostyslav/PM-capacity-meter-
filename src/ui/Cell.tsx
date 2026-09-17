import { useDroppable } from '@dnd-kit/core';
import { BlockChip } from './BlockChip';
import { useStore } from '../state/store';
import { blocksInCell, cellCapacity } from '../domain/capacity';
import { lowConfidenceHorizon } from '../domain/rules';
import { parseDate } from '../domain/weeks';
import type { Engineer, WeekStart } from '../domain/types';

/** Pixels that represent one engineer's full weekly capacity. */
export const CAPACITY_PX = 176;
/** Headroom drawn past the capacity line, used only when a cell runs over. */
const OVER_PX = 56;

export function Cell({
  engineer,
  weekStart,
}: {
  engineer: Engineer;
  weekStart: WeekStart;
}) {
  const blocks = useStore((s) => s.blocks);
  const today = useStore((s) => s.today);

  const { setNodeRef, isOver } = useDroppable({
    id: `${engineer.id}::${weekStart}`,
  });

  const cell = cellCapacity(engineer, weekStart, blocks);
  const mine = blocksInCell(blocks, engineer.id, weekStart);
  // Scale against the *nominal* week so rows stay comparable: an engineer on
  // PTO gets a shorter plannable week, not a rescaled one.
  const scale = CAPACITY_PX / cell.nominalCapacityHours;
  const work = mine.filter((b) => b.kind !== 'unavailable');
  const away = mine.filter((b) => b.kind === 'unavailable');
  const overPx = cell.isOvercommitted
    ? Math.min(OVER_PX, cell.overHours * scale + 6)
    : 0;
  const stackPx = Math.max(CAPACITY_PX, cell.capacityHours * scale + overPx);
  const beyondHorizon = parseDate(weekStart) > lowConfidenceHorizon(today);

  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      className={`cell${isOver ? ' over-drop' : ''}${beyondHorizon ? ' beyond' : ''}`}
      aria-label={
        `${engineer.name}, week of ${weekStart}, ` +
        `${cell.allocatedHours} of ${cell.capacityHours} hours allocated` +
        (cell.unavailableHours > 0 ? `, ${cell.unavailableHours} hours away` : '')
      }
    >
      <div className="stack" style={{ height: stackPx }}>
        {cell.isOvercommitted && (
          <div
            className="overzone"
            style={{ top: cell.capacityHours * scale, height: overPx }}
          />
        )}
        <div className="capline" style={{ top: cell.capacityHours * scale }} />

        <div className="blocks">
          {work.map((block) => (
            <BlockChip key={block.id} block={block} scale={scale} />
          ))}

          {cell.bufferHours > 0 && (
            <div
              className="buffer"
              style={{ flex: `0 0 ${cell.bufferHours * scale}px` }}
              title={`${cell.bufferHours}h buffer — unallocated on purpose`}
            >
              {cell.bufferHours * scale >= 16 && (
                <span className="mono">{cell.bufferHours}h buffer</span>
              )}
            </div>
          )}

          {away.map((block) => (
            <div
              key={block.id}
              className="away"
              style={{ flex: `0 0 ${block.hours * scale}px` }}
              title={`${block.label ?? 'Away'} — ${block.hours}h that were never available to plan`}
            >
              {block.hours * scale >= 16 && (
                <span className="mono">
                  {block.label ?? 'Away'} · {block.hours}h
                </span>
              )}
            </div>
          ))}
        </div>

        {cell.isOvercommitted && (
          <div className="overchip mono">+{cell.overHours}h over</div>
        )}
      </div>
    </div>
  );
}
