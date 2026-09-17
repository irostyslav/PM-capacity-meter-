import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Cell } from './Cell';
import { useStore } from '../state/store';
import { formatWeek, weekRange } from '../domain/weeks';
import { lowConfidenceHorizon } from '../domain/rules';
import { parseDate } from '../domain/weeks';

const WEEKS_SHOWN = 8;

export function Board() {
  const engineers = useStore((s) => s.engineers);
  const today = useStore((s) => s.today);
  const moveBlock = useStore((s) => s.moveBlock);
  const focusMode = useStore((s) => s.focusMode);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const allWeeks = weekRange(today, WEEKS_SHOWN);
  const weeks = focusMode ? allWeeks.slice(0, 1) : allWeeks;
  const horizon = lowConfidenceHorizon(today);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const [engineerId, weekStart] = String(over.id).split('::');
    if (!engineerId || !weekStart) return;
    moveBlock(String(active.id), engineerId, weekStart);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="board" role="grid" aria-label="Capacity by engineer and week">
        <div className="row head" role="row">
          <div className="namecell" role="columnheader">
            <span className="eyebrow">Engineer</span>
          </div>
          {weeks.map((week, i) => (
            <div
              key={week}
              role="columnheader"
              className={`cell${i === 0 ? ' now' : ''}${
                parseDate(week) > horizon ? ' beyond' : ''
              }`}
            >
              <span className="week-label">{formatWeek(week)}</span>
              <span className="week-sub">
                {i === 0
                  ? 'this week'
                  : parseDate(week) > horizon
                    ? 'beyond horizon'
                    : 'within horizon'}
              </span>
            </div>
          ))}
        </div>

        {engineers
          .filter((e) => e.active)
          .map((engineer) => (
            <div className="row" role="row" key={engineer.id}>
              <div className="namecell" role="rowheader">
                <span className="engineer-name">{engineer.name}</span>
                <span className="engineer-cap mono">
                  {engineer.weeklyCapacityHours}h/week
                </span>
              </div>
              {weeks.map((week) => (
                <Cell key={week} engineer={engineer} weekStart={week} />
              ))}
            </div>
          ))}
      </div>
    </DndContext>
  );
}
