import { useState } from 'react';
import { useCascadeStore } from '../state/store';
import { flagsForNode } from '../domain/flags';
import type { EdgeHealth, CascadeLayer, AlignmentFlag } from '../domain/types';
import { NodeDrawer } from './NodeDrawer';

const HEALTH_COLOR: Record<EdgeHealth, string> = {
  green: 'var(--health-green)',
  amber: 'var(--health-amber)',
  red: 'var(--health-red)',
  grey: 'var(--health-grey)',
};

const LAYER_LABEL: Record<CascadeLayer, string> = {
  company: 'Company',
  manager: 'Manager',
  self: 'Me',
};

type ActiveLens = 'all' | 'pm' | 'team';

export function CascadeTree() {
  const [expandedLayers, setExpandedLayers] = useState<Set<CascadeLayer>>(
    new Set(['company', 'manager', 'self']),
  );
  const [lens, setLens] = useState<ActiveLens>('all');
  const [showObstacles, setShowObstacles] = useState(true);
  const [showRequests, setShowRequests] = useState(true);

  const v2moms = useCascadeStore((s) => s.v2moms);
  const visions = useCascadeStore((s) => s.visions);
  const values = useCascadeStore((s) => s.values);
  const methods = useCascadeStore((s) => s.methods);
  const measures = useCascadeStore((s) => s.measures);
  const obstacles = useCascadeStore((s) => s.obstacles);
  const inboundRequests = useCascadeStore((s) => s.inboundRequests);
  const flags = useCascadeStore((s) => s.flags);
  const measureCapacities = useCascadeStore((s) => s.measureCapacities);
  const select = useCascadeStore((s) => s.select);
  const selectedId = useCascadeStore((s) => s.selectedNodeId);

  function toggleLayer(layer: CascadeLayer) {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  function nodeFlags(id: string) {
    return flagsForNode(flags, id);
  }

  function flagDot(nodeId: string) {
    const nf = nodeFlags(nodeId);
    if (nf.length === 0) return null;
    const worst = nf.reduce<AlignmentFlag['severity']>((acc, f) => {
      if (f.severity === 'critical') return 'critical';
      if (acc !== 'critical' && f.severity === 'warn') return 'warn';
      return acc;
    }, 'info');
    return (
      <span
        className={`flag-dot flag-dot--${worst}`}
        title={nf.map((f) => f.message).join('\n')}
      />
    );
  }

  const pendingRequests = inboundRequests.filter((r) => r.disposition === 'pending');

  return (
    <div className="cascade-root">
      {/* Toolbar */}
      <div className="cascade-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Lens</span>
          {(['all', 'pm', 'team'] as ActiveLens[]).map((l) => (
            <button
              key={l}
              className={`lens-btn${lens === l ? ' active' : ''}`}
              onClick={() => setLens(l)}
            >
              {l === 'all' ? 'All' : l === 'pm' ? 'Me (PM)' : 'Team'}
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <label className="toolbar-toggle">
            <input type="checkbox" checked={showObstacles} onChange={(e) => setShowObstacles(e.target.checked)} />
            Obstacles
          </label>
          <label className="toolbar-toggle">
            <input type="checkbox" checked={showRequests} onChange={(e) => setShowRequests(e.target.checked)} />
            Inbound
          </label>
        </div>
      </div>

      {/* Active flags summary */}
      {flags.filter((f) => !f.resolvedAt).length > 0 && (
        <div className="flags-banner">
          <strong>{flags.filter((f) => !f.resolvedAt && f.severity === 'critical').length} critical</strong>
          {' · '}
          <strong>{flags.filter((f) => !f.resolvedAt && f.severity === 'warn').length} warnings</strong>
          {' — '}
          {flags.filter((f) => !f.resolvedAt).slice(0, 2).map((f) => f.message).join('; ')}
        </div>
      )}

      {/* Inbound requests triage panel */}
      {showRequests && pendingRequests.length > 0 && (
        <div className="inbound-panel">
          <div className="inbound-panel__title">
            Inbound requests needing triage ({pendingRequests.length})
          </div>
          {pendingRequests.map((r) => (
            <div
              key={r.id}
              className={`inbound-card${selectedId === r.id ? ' selected' : ''}`}
              onClick={() => select(r.id, 'request')}
            >
              <div className="inbound-source">{r.source}</div>
              <div className="inbound-title">{r.title}</div>
              <div className="inbound-measures">
                {r.candidateMeasureIds.length > 0
                  ? `→ ${r.candidateMeasureIds.map((id) => measures.find((m) => m.id === id)?.title ?? id).join(', ')}`
                  : 'No measure linked yet'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cascade tree by layer */}
      {(['company', 'manager', 'self'] as CascadeLayer[]).map((layer) => {
        const v2mom = v2moms.find((v) => v.layer === layer);
        if (!v2mom) return null;
        const vision = visions.find((v) => v.v2momId === v2mom.id);
        const layerValues = values.filter((v) => v.v2momId === v2mom.id);
        const isExpanded = expandedLayers.has(layer);

        return (
          <div key={layer} className={`cascade-layer cascade-layer--${layer}`}>
            {/* Layer header */}
            <div className="layer-header" onClick={() => toggleLayer(layer)}>
              <span className="layer-chevron">{isExpanded ? '▾' : '▸'}</span>
              <span className="layer-badge">{LAYER_LABEL[layer]}</span>
              <span className="layer-title">{v2mom.title}</span>
              {vision && (
                <span
                  className="layer-health"
                  style={{ color: HEALTH_COLOR[vision.health] }}
                  title={`Vision health: ${vision.health}`}
                >
                  ●
                </span>
              )}
            </div>

            {isExpanded && (
              <div className="layer-body">
                {/* Vision */}
                {vision && (
                  <div
                    className={`cascade-vision${selectedId === vision.id ? ' selected' : ''}`}
                    onClick={() => select(vision.id, 'vision')}
                  >
                    <span className="node-type">Vision</span>
                    <span className="vision-text">{vision.text}</span>
                    {vision.parentVisionId && (
                      <span className="lineage-arrow" title="Traces to parent vision">↑</span>
                    )}
                    {flagDot(vision.id)}
                  </div>
                )}

                {/* Values → Methods → Measures */}
                {layerValues
                  .slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((val) => {
                    const valMethods = methods
                      .filter((m) => m.valueId === val.id)
                      .sort((a, b) => a.rank - b.rank);

                    return (
                      <div key={val.id} className="value-group">
                        {/* Value */}
                        <div
                          className={`cascade-node cascade-node--value${selectedId === val.id ? ' selected' : ''}`}
                          style={{ '--health': HEALTH_COLOR[val.health] } as any}
                          onClick={() => select(val.id, 'value')}
                        >
                          <span className="node-rank">#{val.rank}</span>
                          <span className="node-type">Value</span>
                          <span className="node-title">{val.title}</span>
                          {val.parentValueId && (
                            <span className="lineage-arrow" title={`Aligns to: ${values.find((v) => v.id === val.parentValueId)?.title}`}>↑</span>
                          )}
                          {flagDot(val.id)}
                        </div>

                        {/* Methods */}
                        {valMethods.map((method) => {
                          const methodMeasures = measures
                            .filter((me) => me.methodId === method.id)
                            .sort((a, b) => {
                              const ah = a.parentMeasureId ? 1 : 0;
                              const bh = b.parentMeasureId ? 1 : 0;
                              return ah - bh;
                            });

                          // Sum capacity for this method's measures
                          const methodCapTotal = methodMeasures.reduce((sum, me) => {
                            const cap = measureCapacities.get(me.id);
                            return sum + (cap?.plannedHours ?? 0);
                          }, 0);
                          const methodPmHours = methodMeasures.reduce((sum, me) => {
                            const cap = measureCapacities.get(me.id);
                            return sum + (cap?.pmHours ?? 0);
                          }, 0);
                          const methodEngHours = methodMeasures.reduce((sum, me) => {
                            const cap = measureCapacities.get(me.id);
                            return sum + (cap?.engHours ?? 0);
                          }, 0);

                          const methodObstacles = showObstacles
                            ? obstacles.filter((o) => o.threatenedMethodIds.includes(method.id))
                            : [];

                          return (
                            <div key={method.id} className="method-group">
                              {/* Method */}
                              <div
                                className={`cascade-node cascade-node--method${selectedId === method.id ? ' selected' : ''}`}
                                style={{ '--health': HEALTH_COLOR[method.health] } as any}
                                onClick={() => select(method.id, 'method')}
                              >
                                <span className="node-rank">#{method.rank}</span>
                                <span className="node-type">Method</span>
                                <span className="node-title">{method.title}</span>
                                {method.parentMethodId && (
                                  <span className="lineage-arrow" title={`Implements: ${methods.find((m) => m.id === method.parentMethodId)?.title}`}>↑</span>
                                )}
                                {!method.ownerId && (
                                  <span className="no-owner-badge">no owner</span>
                                )}
                                {flagDot(method.id)}
                                {(lens === 'all' || lens === 'pm' || lens === 'team') && methodCapTotal > 0 && (
                                  <span className="method-cap-inline">
                                    {lens === 'pm' ? `${methodPmHours}h PM` :
                                     lens === 'team' ? `${methodEngHours}h eng` :
                                     `${methodCapTotal}h`}
                                  </span>
                                )}
                              </div>

                              {/* Obstacles threatening this method */}
                              {methodObstacles.map((obs) => (
                                <div
                                  key={obs.id}
                                  className={`cascade-node cascade-node--obstacle cascade-node--obstacle-${obs.severity}${selectedId === obs.id ? ' selected' : ''}`}
                                  onClick={() => select(obs.id, 'obstacle')}
                                >
                                  <span className="node-type">⚠ Obstacle</span>
                                  <span className="node-title">{obs.title}</span>
                                </div>
                              ))}

                              {/* Measures */}
                              {methodMeasures.map((measure) => {
                                const cap = measureCapacities.get(measure.id) ?? null;
                                const progress = measure.targetValue && measure.currentValue != null
                                  ? Math.min(100, (measure.currentValue / measure.targetValue) * 100)
                                  : null;

                                const showCap = lens === 'all' || lens === 'pm' || lens === 'team';
                                const capValue = lens === 'pm' ? cap?.pmHours :
                                  lens === 'team' ? cap?.engHours :
                                  cap?.plannedHours;

                                return (
                                  <div
                                    key={measure.id}
                                    className={`cascade-node cascade-node--measure${selectedId === measure.id ? ' selected' : ''}`}
                                    style={{ '--health': HEALTH_COLOR[measure.health] } as any}
                                    onClick={() => select(measure.id, 'measure')}
                                  >
                                    <span className="node-type">Measure</span>
                                    <span className="node-title">{measure.title}</span>
                                    {measure.parentMeasureId && (
                                      <span className="lineage-arrow" title={`Rolls into: ${measures.find((m) => m.id === measure.parentMeasureId)?.title}`}>↑</span>
                                    )}
                                    {flagDot(measure.id)}

                                    {/* Progress bar */}
                                    {progress !== null && (
                                      <div className="measure-progress-row">
                                        <div className="measure-progress-bar">
                                          <div
                                            className="measure-progress-fill"
                                            style={{
                                              width: `${progress}%`,
                                              background: HEALTH_COLOR[measure.health],
                                            }}
                                          />
                                        </div>
                                        <span className="measure-progress-label">
                                          {measure.currentValue}/{measure.targetValue} {measure.unit}
                                        </span>
                                      </div>
                                    )}

                                    {/* Capacity */}
                                    {showCap && (
                                      <div className="measure-cap-row">
                                        {cap && cap.plannedHours > 0 ? (
                                          <>
                                            <span
                                              className="measure-cap-value"
                                              title={`${lens === 'pm' ? 'PM' : lens === 'team' ? 'Eng' : 'Total'} hours`}
                                            >
                                              {capValue ?? 0}h {lens === 'pm' ? 'PM' : lens === 'team' ? 'eng' : 'total'}
                                            </span>
                                            <div className="cap-minibar">
                                              <div style={{
                                                width: `${Math.round((cap.pmHours / cap.plannedHours) * 100)}%`,
                                                background: 'var(--cap-pm)',
                                                height: '100%',
                                              }} />
                                              <div style={{
                                                width: `${Math.round((cap.engHours / cap.plannedHours) * 100)}%`,
                                                background: 'var(--cap-eng)',
                                                height: '100%',
                                              }} />
                                            </div>
                                          </>
                                        ) : (
                                          <span className="measure-cap-empty">unfunded</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                {/* Layer-level obstacles */}
                {showObstacles && obstacles
                  .filter((o) => o.layer === layer && o.threatenedMethodIds.length === 0)
                  .map((obs) => (
                    <div
                      key={obs.id}
                      className={`cascade-node cascade-node--obstacle cascade-node--obstacle-${obs.severity}${selectedId === obs.id ? ' selected' : ''}`}
                      onClick={() => select(obs.id, 'obstacle')}
                    >
                      <span className="node-type">⚠ Obstacle</span>
                      <span className="node-title">{obs.title}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      <NodeDrawer />
    </div>
  );
}
