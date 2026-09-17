import { describe, expect, it, beforeEach } from 'vitest';
import { useStore } from '../store';
import { seedState } from '../../domain/seed';
import { addWeeks, weekStartOf } from '../../domain/weeks';
import { cellCapacity } from '../../domain/capacity';

/**
 * The store must not be a second place where rules live. These tests prove it
 * defers to the domain: a move the domain refuses does not mutate state.
 */
describe('store', () => {
  const today = new Date();
  const w0 = weekStartOf(today);

  beforeEach(() => {
    useStore.setState({ ...seedState(today), rejection: null, selectedBlockId: null });
  });

  it('moves a block between engineers and weeks', () => {
    const result = useStore.getState().moveBlock('b3', 'e4', addWeeks(w0, 1));
    expect(result.ok).toBe(true);
    const moved = useStore.getState().blocks.find((b) => b.id === 'b3');
    expect(moved?.engineerId).toBe('e4');
  });

  it('records every move in the commitment log', () => {
    const before = useStore.getState().log.length;
    useStore.getState().moveBlock('b3', 'e4', addWeeks(w0, 1));
    const log = useStore.getState().log;
    expect(log.length).toBe(before + 1);
    expect(log.at(-1)?.action).toBe('rebalanced');
  });

  it('refuses to move a low-confidence block beyond the horizon, and changes nothing', () => {
    const target = addWeeks(w0, 6);
    const result = useStore.getState().moveBlock('b9', 'e2', target);
    expect(result.ok).toBe(false);

    const block = useStore.getState().blocks.find((b) => b.id === 'b9');
    expect(block?.weekStart).not.toBe(target);
    expect(useStore.getState().rejection?.result.code).toBe(
      'low-confidence-beyond-horizon',
    );
  });

  it('will not lower confidence on a block sitting beyond the horizon', () => {
    const result = useStore.getState().setConfidence('b5', 'low');
    expect(result.ok).toBe(false);
    expect(useStore.getState().blocks.find((b) => b.id === 'b5')?.confidence).toBe(
      'medium',
    );
  });

  it('demands a reason before raising confidence, then logs it', () => {
    const refused = useStore.getState().setConfidence('b4', 'high');
    expect(refused.ok).toBe(false);

    const accepted = useStore
      .getState()
      .setConfidence('b4', 'high', 'spike came back clean');
    expect(accepted.ok).toBe(true);
    expect(useStore.getState().blocks.find((b) => b.id === 'b4')?.confidence).toBe('high');
    expect(useStore.getState().log.at(-1)?.whatWasCut).toBe('spike came back clean');
  });

  it('returns removed hours to buffer', () => {
    const engineer = useStore.getState().engineers[0]!;
    const before = cellCapacity(engineer, w0, useStore.getState().blocks);
    useStore.getState().removeBlock('b1');
    const after = cellCapacity(engineer, w0, useStore.getState().blocks);
    expect(after.bufferHours).toBe(before.bufferHours + 16);
  });

  it('opens with a squad that is overcommitted in exactly one cell', () => {
    const state = useStore.getState();
    const over = state.engineers.filter(
      (e) => cellCapacity(e, w0, state.blocks).isOvercommitted,
    );
    expect(over.map((e) => e.id)).toEqual(['e2']);
  });
});
