import { useState } from 'react';
import { useStore } from '../state/store';
import { requiresReason } from '../domain/rules';
import type { Confidence } from '../domain/types';

const LEVELS: Array<{ id: Confidence; label: string; hint: string }> = [
  { id: 'high', label: 'High', hint: 'Built something like this — estimate within ±20%.' },
  { id: 'medium', label: 'Medium', hint: 'We understand the shape; the estimate could be off by half.' },
  { id: 'low', label: 'Low', hint: 'We are guessing. Cannot be scheduled past two weeks out.' },
];

export function BlockDetail() {
  const id = useStore((s) => s.selectedBlockId);
  const block = useStore((s) => s.blocks.find((b) => b.id === id));
  const initiatives = useStore((s) => s.initiatives);
  const select = useStore((s) => s.select);
  const setConfidence = useStore((s) => s.setConfidence);
  const logActuals = useStore((s) => s.logActuals);
  const removeBlock = useStore((s) => s.removeBlock);

  const [reason, setReason] = useState('');
  const [needsReason, setNeedsReason] = useState<Confidence | null>(null);

  if (!block) return null;

  const initiative = initiatives.find((i) => i.id === block.initiativeId);
  const title =
    block.kind === 'protected'
      ? (block.label ?? 'Protected time')
      : (initiative?.title ?? 'Untitled');

  function apply(next: Confidence) {
    if (!block) return;
    if (requiresReason(block.confidence, next)) {
      setNeedsReason(next);
      return;
    }
    setConfidence(block.id, next);
  }

  return (
    <aside className="drawer open" aria-label="Block detail">
      <div className="drawer-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="btn ghost"
          aria-label="Close"
          onClick={() => select(null)}
        >
          ✕
        </button>
      </div>

      <div className="drawer-body">
        <section>
          <span className="eyebrow">Hours</span>
          <div className="kv">
            <span>Estimated</span>
            <span className="mono">{block.hours}h</span>
          </div>
          <div className="kv">
            <span>Logged so far</span>
            <span className="mono">{block.actualHours}h</span>
          </div>
          <div className="seg">
            {[2, 4, 8].map((n) => (
              <button key={n} type="button" onClick={() => logActuals(block.id, n)}>
                log +{n}h
              </button>
            ))}
          </div>
        </section>

        {block.kind !== 'protected' && (
          <section>
            <span className="eyebrow">Confidence</span>
            <div className="seg">
              {LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={block.confidence === level.id}
                  onClick={() => apply(level.id)}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <p className="hint">
              {LEVELS.find((l) => l.id === block.confidence)?.hint}
            </p>

            {needsReason && (
              <div className="reason">
                <label htmlFor="reason">
                  Nothing about the block changed. Why has confidence gone up?
                </label>
                <input
                  id="reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. spike came back — the API supports partial refunds"
                />
                <button
                  type="button"
                  className="btn primary"
                  disabled={!reason.trim()}
                  onClick={() => {
                    setConfidence(block.id, needsReason, reason);
                    setReason('');
                    setNeedsReason(null);
                  }}
                >
                  Raise and log the reason
                </button>
              </div>
            )}
          </section>
        )}

        <section>
          <button type="button" className="btn" onClick={() => removeBlock(block.id)}>
            Remove from board
          </button>
          <p className="hint">The hours go back to buffer, and the log records it.</p>
        </section>
      </div>
    </aside>
  );
}
