import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { CascadeTree } from './CascadeTree';
import { App as CapacityBoard } from '../../ui/App';
import { useCascadeStore } from '../state/store';
import './cascade.css';

export function CascadeShell() {
  return (
    <HashRouter>
      <div className="cascade-shell">
        <nav className="cascade-rail">
          <div className="rail-logo">V2MOM Cascade</div>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}
          >
            🗺 Cascade
          </NavLink>
          <NavLink
            to="/capacity"
            className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}
          >
            📊 Capacity
          </NavLink>
          <NavLink
            to="/requests"
            className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}
          >
            📥 Inbound
          </NavLink>
        </nav>

        <main className="cascade-content">
          <Routes>
            <Route path="/" element={<CascadeHome />} />
            <Route path="/capacity" element={<CapacityBoard />} />
            <Route path="/requests" element={<RequestsView />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

function CascadeHome() {
  return (
    <div>
      <div style={{
        padding: '1rem 1rem 0',
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.75rem',
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>V2MOM Cascade</h1>
        <span style={{ fontSize: '0.8125rem', color: 'var(--ink-3)' }}>
          Company → Manager → Me · traceability + capacity
        </span>
      </div>
      <CascadeTree />
    </div>
  );
}

function RequestsView() {
  return (
    <div style={{ padding: '1.5rem 1rem', maxWidth: 720 }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Inbound Requests</h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        Requests from engineering, stakeholders, and customers — triaged against the V2MOM.
      </p>
      <InboundList />
    </div>
  );
}

function InboundList() {
  const inboundRequests = useCascadeStore((s) => s.inboundRequests);
  const measures = useCascadeStore((s) => s.measures);
  const select = useCascadeStore((s) => s.select);

  const byDisposition: Record<string, typeof inboundRequests> = {
    pending: inboundRequests.filter((r: any) => r.disposition === 'pending'),
    aligned: inboundRequests.filter((r: any) => r.disposition === 'aligned'),
    parked: inboundRequests.filter((r: any) => r.disposition === 'parked'),
    declined: inboundRequests.filter((r: any) => r.disposition === 'declined'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {Object.entries(byDisposition).map(([disposition, reqs]) => {
        if (reqs.length === 0) return null;
        return (
          <div key={disposition}>
            <div style={{
              fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: '0.5rem',
            }}>
              {disposition} ({reqs.length})
            </div>
            {reqs.map((r: any) => (
              <div key={r.id} className={`inbound-card disposition-${r.disposition}`}
                style={{ marginBottom: '0.5rem', cursor: 'pointer' }}
                onClick={() => {
                  // Navigate to cascade with this selected
                  select(r.id, 'request');
                  window.location.hash = '/';
                }}
              >
                <div className="inbound-source">{r.source}</div>
                <div className="inbound-title">{r.title}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', marginTop: '0.25rem' }}>
                  {r.description}
                </div>
                <div className="inbound-measures" style={{ marginTop: '0.375rem' }}>
                  {r.candidateMeasureIds.length > 0
                    ? `→ ${r.candidateMeasureIds.map((id: string) => measures.find((m: any) => m.id === id)?.title ?? id).join(', ')}`
                    : 'No measure linked'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '0.25rem' }}>
                  Received {r.receivedAt}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
