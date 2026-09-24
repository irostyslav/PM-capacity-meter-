import { useCascadeStore } from '../state/store';
import { flagsForNode } from '../domain/flags';
import type { AlignmentFlag } from '../domain/types';
import { SEED_CAPACITY } from '../domain/seed';
import { CapacityStrip } from './CapacityStrip';

const SEVERITY_COLOR: Record<AlignmentFlag['severity'], string> = {
  critical: 'var(--flag-critical)',
  warn: 'var(--flag-warn)',
  info: 'var(--flag-info)',
};

export function NodeDrawer() {
  const selectedId = useCascadeStore((s) => s.selectedNodeId);
  const selectedType = useCascadeStore((s) => s.selectedNodeType);
  const select = useCascadeStore((s) => s.select);
  const flags = useCascadeStore((s) => s.flags);
  const measures = useCascadeStore((s) => s.measures);
  const methods = useCascadeStore((s) => s.methods);
  const visions = useCascadeStore((s) => s.visions);
  const obstacles = useCascadeStore((s) => s.obstacles);
  const inboundRequests = useCascadeStore((s) => s.inboundRequests);
  const measureCapacities = useCascadeStore((s) => s.measureCapacities);
  const resolveFlag = useCascadeStore((s) => s.resolveFlag);

  if (!selectedId) return null;

  const nodeFlags = flagsForNode(flags, selectedId);

  function renderContent() {
    switch (selectedType) {
      case 'vision': {
        const v = visions.find((x) => x.id === selectedId);
        if (!v) return null;
        return (
          <>
            <div className="drawer-label">Vision · {v.layer}</div>
            <p className="drawer-text">{v.text}</p>
            {v.parentVisionId && (
              <div className="drawer-link">
                Aligns to: <button className="link-btn" onClick={() => select(v.parentVisionId, 'vision')}>
                  {visions.find((x) => x.id === v.parentVisionId)?.text?.slice(0, 60)}…
                </button>
              </div>
            )}
          </>
        );
      }
      case 'method': {
        const m = methods.find((x) => x.id === selectedId);
        if (!m) return null;
        const relatedMeasures = measures.filter((me) => me.methodId === m.id);
        return (
          <>
            <div className="drawer-label">Method · {m.layer} · rank #{m.rank}</div>
            <p className="drawer-text">{m.description}</p>
            {m.parentMethodId && (
              <div className="drawer-link">
                Implements: <button className="link-btn" onClick={() => select(m.parentMethodId, 'method')}>
                  {methods.find((x) => x.id === m.parentMethodId)?.title}
                </button>
              </div>
            )}
            {relatedMeasures.length > 0 && (
              <div className="drawer-section">
                <div className="drawer-section-title">Measures</div>
                {relatedMeasures.map((me) => (
                  <button key={me.id} className="drawer-pill" onClick={() => select(me.id, 'measure')}>
                    {me.title}
                  </button>
                ))}
              </div>
            )}
          </>
        );
      }
      case 'measure': {
        const m = measures.find((x) => x.id === selectedId);
        if (!m) return null;
        const cap = measureCapacities.get(m.id) ?? null;
        const linkedInits = SEED_CAPACITY.initiatives.filter((i) =>
          m.initiativeIds.includes(i.id),
        );
        const progress = m.targetValue && m.currentValue != null
          ? Math.min(100, Math.round((m.currentValue / m.targetValue) * 100))
          : null;
        return (
          <>
            <div className="drawer-label">Measure · {m.layer}</div>
            <p className="drawer-text">{m.target}</p>
            {progress !== null && (
              <div className="drawer-progress">
                <div className="drawer-progress-bar" style={{ width: `${progress}%` }} />
                <span>{m.currentValue} / {m.targetValue} {m.unit} ({progress}%)</span>
              </div>
            )}
            {m.dueDate && (
              <div className="drawer-meta">Due: {m.dueDate}</div>
            )}
            <div className="drawer-section">
              <div className="drawer-section-title">Capacity</div>
              <CapacityStrip capacity={cap} />
            </div>
            {linkedInits.length > 0 && (
              <div className="drawer-section">
                <div className="drawer-section-title">Funded by</div>
                {linkedInits.map((i) => (
                  <div key={i.id} className="drawer-initiative">
                    <span className={`init-status init-status--${i.status}`}>{i.status}</span>
                    {i.title}
                    <span className="init-hours">{i.totalPlannedHours}h</span>
                  </div>
                ))}
              </div>
            )}
            {m.parentMeasureId && (
              <div className="drawer-link">
                Rolls into: <button className="link-btn" onClick={() => select(m.parentMeasureId, 'measure')}>
                  {measures.find((x) => x.id === m.parentMeasureId)?.title}
                </button>
              </div>
            )}
          </>
        );
      }
      case 'obstacle': {
        const o = obstacles.find((x) => x.id === selectedId);
        if (!o) return null;
        return (
          <>
            <div className={`drawer-label severity-${o.severity}`}>
              Obstacle · {o.severity} severity · {o.layer}
            </div>
            <p className="drawer-text">{o.description}</p>
            {o.threatenedMethodIds.length > 0 && (
              <div className="drawer-section">
                <div className="drawer-section-title">Threatens methods</div>
                {o.threatenedMethodIds.map((id) => (
                  <button key={id} className="drawer-pill drawer-pill--red" onClick={() => select(id, 'method')}>
                    {methods.find((m) => m.id === id)?.title}
                  </button>
                ))}
              </div>
            )}
            {o.threatenedMeasureIds.length > 0 && (
              <div className="drawer-section">
                <div className="drawer-section-title">Threatens measures</div>
                {o.threatenedMeasureIds.map((id) => (
                  <button key={id} className="drawer-pill drawer-pill--red" onClick={() => select(id, 'measure')}>
                    {measures.find((m) => m.id === id)?.title}
                  </button>
                ))}
              </div>
            )}
          </>
        );
      }
      case 'request': {
        const r = inboundRequests.find((x) => x.id === selectedId);
        if (!r) return null;
        return (
          <>
            <div className="drawer-label">Inbound Request · {r.source}</div>
            <p className="drawer-text">{r.description}</p>
            <div className="drawer-meta">Received: {r.receivedAt}</div>
            <div className={`drawer-disposition disposition-${r.disposition}`}>
              Status: {r.disposition}
            </div>
            {r.candidateMeasureIds.length > 0 && (
              <div className="drawer-section">
                <div className="drawer-section-title">Could contribute to</div>
                {r.candidateMeasureIds.map((id) => (
                  <button key={id} className="drawer-pill" onClick={() => select(id, 'measure')}>
                    {measures.find((m) => m.id === id)?.title}
                  </button>
                ))}
              </div>
            )}
          </>
        );
      }
      default:
        return null;
    }
  }

  return (
    <aside className="node-drawer">
      <div className="drawer-header">
        <button className="drawer-close" onClick={() => select(null, null)} aria-label="Close">✕</button>
      </div>
      <div className="drawer-body">
        {renderContent()}

        {nodeFlags.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">Flags</div>
            {nodeFlags.map((f) => (
              <div key={`${f.code}-${f.nodeId}`} className="drawer-flag"
                style={{ borderLeftColor: SEVERITY_COLOR[f.severity] }}>
                <div className="flag-message">{f.message}</div>
                {!f.resolvedAt && (
                  <button
                    className="flag-resolve"
                    onClick={() => {
                      const note = prompt('Resolution note (optional):') ?? '';
                      resolveFlag(f.code, f.nodeId, note);
                    }}
                  >
                    Mark resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
