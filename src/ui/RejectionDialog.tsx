import { useStore } from '../state/store';

/**
 * A refusal always offers a next action. See spec §F5: "The rejection offers a
 * next action, never just a refusal."
 */
export function RejectionDialog() {
  const rejection = useStore((s) => s.rejection);
  const dismiss = useStore((s) => s.dismissRejection);
  const removeBlock = useStore((s) => s.removeBlock);

  if (!rejection) return null;
  const { result, blockId } = rejection;

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="modal" role="alertdialog" aria-labelledby="reject-title">
        <div className="modal-head">
          <h2 id="reject-title">That placement is not allowed</h2>
          <p>{result.message}</p>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={dismiss}>
            Leave it where it is
          </button>
          {result.remedies.map((remedy) => (
            <button
              key={remedy.id}
              type="button"
              className="btn primary"
              onClick={() => {
                // M1 handles the parking-lot remedy; spikes arrive with M3.
                if (remedy.id === 'move-to-parking-lot') removeBlock(blockId);
                dismiss();
              }}
            >
              {remedy.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
