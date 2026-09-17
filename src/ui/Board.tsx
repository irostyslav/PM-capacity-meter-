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
  const people = useStore((s) => s.people);
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
    const [personId, weekStart] = String(over.id).split('::');
    if (!personId || !weekStart) return;
    moveBlock(String(active.id), personId, weekStart);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="board" role="grid" aria-label="Capacity by person and week">
        <div className="row head" role="row">
          <div className="namecell" role="columnheader">
            <span className="eyebrow">Person</span>
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

        {(['pm', 'engineer'] as const).map((role) => {
          const group = people.filter((p) => p.active && p.role === role);
          if (group.length === 0) return null;
          return (
            <div key={role} className={`group group-${role}`}>
              <div className="row grouphead" role="row">
                <div className="namecell" role="rowheader">
                  <span className="eyebrow">
                    {role === 'pm' ? 'Thinking' : 'Building'}
                  </span>
                </div>
                {weeks.map((week) => (
                  <div key={week} className="cell grouphead-cell" />
                ))}
              </div>
              {group.map((person) => (
                <div className="row" role="row" key={person.id}>
                  <div className="namecell" role="rowheader">
                    <span className="person-name">{person.name}</span>
                    <span className="person-cap mono">
                      {person.weeklyCapacityHours}h/week
                    </span>
                  </div>
                  {weeks.map((week) => (
                    <Cell key={week} person={person} weekStart={week} />
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
