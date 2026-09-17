import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../state/store';
import type { Block } from '../domain/types';

const CONFIDENCE_DOTS = { high: 3, medium: 2, low: 1 } as const;

export function BlockChip({ block, scale }: { block: Block; scale: number }) {
  const initiatives = useStore((s) => s.initiatives);
  const select = useStore((s) => s.select);
  const selected = useStore((s) => s.selectedBlockId === block.id);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: block.id });

  const initiative = initiatives.find((i) => i.id === block.initiativeId);
  const title = describeBlock(block, initiative?.title);

  const height = block.hours * scale;
  const dots = CONFIDENCE_DOTS[block.confidence];

  const className = [
    'blk',
    block.kind === 'spike' ? 'spike' : '',
    block.kind === 'pm-work' ? `pm pm-${block.pmWork ?? 'other'}` : '',
    block.kind === 'protected' ? 'protect' : '',
    height < 24 ? 'tiny' : '',
    selected ? 'selected' : '',
    isDragging ? 'dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{
        flex: `0 0 ${height}px`,
        backgroundColor:
          block.kind === 'protected'
            ? undefined
            : block.kind === 'pm-work'
              ? 'var(--pm)'
              : (initiative?.color ?? 'var(--cat-1)'),
        transform: CSS.Translate.toString(transform),
      }}
      onClick={() => select(selected ? null : block.id)}
      aria-label={`${title}, ${block.hours} hours, ${block.confidence} confidence`}
      {...listeners}
      {...attributes}
    >
      {height >= 24 && <span className="blk-title">{title}</span>}
      <span className="blk-meta mono">
        <span>{block.hours}h</span>
        {block.kind !== 'protected' && (
          <span className="conf" title={`${block.confidence} confidence`}>
            {[0, 1, 2].map((i) => (
              <i key={i} className={i < dots ? 'on' : ''} />
            ))}
          </span>
        )}
      </span>
      {block.actualHours > 0 && (
        <span className="burn">
          <i
            className={block.actualHours > block.hours ? 'past' : ''}
            style={{
              width: `${Math.min(100, (block.actualHours / block.hours) * 100)}%`,
            }}
          />
        </span>
      )}
    </div>
  );
}

const PM_WORK_LABEL: Record<string, string> = {
  discovery: 'Discovery',
  definition: 'Definition',
  triage: 'Triage',
  stakeholder: 'Stakeholders',
  review: 'Review',
};

/** What the block says on the board. PM work names the thinking, then its subject. */
export function describeBlock(block: Block, initiativeTitle?: string): string {
  if (block.kind === 'protected' || block.kind === 'unavailable') {
    return block.label ?? 'Protected time';
  }
  if (block.kind === 'pm-work') {
    const kind = PM_WORK_LABEL[block.pmWork ?? 'other'] ?? 'PM work';
    return initiativeTitle ? `${kind} — ${initiativeTitle}` : kind;
  }
  return `${initiativeTitle ?? 'Untitled'}${block.kind === 'spike' ? ' — spike' : ''}`;
}
