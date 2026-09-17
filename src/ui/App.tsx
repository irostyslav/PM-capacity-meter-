import { useEffect } from 'react';
import { Board } from './Board';
import { MyWeek } from './MyWeek';
import { Rollup } from './Rollup';
import { RejectionDialog } from './RejectionDialog';
import { BlockDetail } from './BlockDetail';
import { useStore } from '../state/store';

export function App() {
  const focusMode = useStore((s) => s.focusMode);
  const toggleFocusMode = useStore((s) => s.toggleFocusMode);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (event.key === 'f' || event.key === 'F') toggleFocusMode();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFocusMode]);

  return (
    <div className={focusMode ? 'app focus-mode' : 'app'}>
      <header className="topbar">
        <div className="topbar-inner">
          <h1>Capacity Timeline</h1>
          <Rollup />
          <button
            type="button"
            className="btn"
            aria-pressed={focusMode}
            onClick={toggleFocusMode}
          >
            Focus mode <kbd>F</kbd>
          </button>
        </div>
      </header>

      <main className="wrap">
        <div className="section-head">
          <h2>Squad board</h2>
          <p>
            Two groups of rows: the thinking that has to happen first, and the
            building it makes possible. Buffer is drawn in every cell that has
            any, never left as empty space.
          </p>
        </div>
        <Board />
        <MyWeek />
      </main>

      <BlockDetail />
      <RejectionDialog />
    </div>
  );
}
