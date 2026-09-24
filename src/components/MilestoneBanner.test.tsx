// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MilestoneBanner } from './MilestoneBanner';

vi.mock('../utils/sound', () => ({
  playTick: vi.fn(),
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

const milestone = { title: 'STATION COMPLETE', detail: 'All 36 modules are online.' };

describe('MilestoneBanner', () => {
  test('renders nothing when milestone is null', () => {
    const { container } = render(<MilestoneBanner milestone={null} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders the title and detail when a milestone is given', () => {
    render(<MilestoneBanner milestone={milestone} onDismiss={vi.fn()} />);
    expect(screen.getByText('STATION COMPLETE')).not.toBeNull();
    expect(screen.getByText('All 36 modules are online.')).not.toBeNull();
  });

  test('the kicker reads MILESTONE regardless of which milestone fired', () => {
    render(<MilestoneBanner milestone={milestone} onDismiss={vi.fn()} />);
    expect(screen.getByText('MILESTONE')).not.toBeNull();
    expect(screen.queryByText('RING SEALED')).toBeNull();
  });

  test('focus lands on the CONTINUE button when the banner appears', () => {
    render(<MilestoneBanner milestone={milestone} onDismiss={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'CONTINUE' }));
  });

  test('clicking CONTINUE calls onDismiss exactly once', () => {
    const onDismiss = vi.fn();
    render(<MilestoneBanner milestone={milestone} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUE' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('pressing Escape calls onDismiss exactly once', () => {
    const onDismiss = vi.fn();
    render(<MilestoneBanner milestone={milestone} onDismiss={onDismiss} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  describe('focus restoration on dismiss', () => {
    test('restores focus to the element that held it before the banner appeared, if still connected', () => {
      const trigger = document.createElement('button');
      trigger.textContent = 'Open';
      document.body.appendChild(trigger);
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      const { rerender } = render(<MilestoneBanner milestone={milestone} onDismiss={vi.fn()} />);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'CONTINUE' }));

      act(() => {
        rerender(<MilestoneBanner milestone={null} onDismiss={vi.fn()} />);
      });

      expect(document.activeElement).toBe(trigger);
    });

    test('falls back to .st-begin when nothing but body held focus before the banner appeared', () => {
      const beginButton = document.createElement('button');
      beginButton.className = 'st-begin';
      beginButton.textContent = 'BEGIN CYCLE';
      document.body.appendChild(beginButton);

      // Nothing has focus: document.activeElement is <body>.
      (document.activeElement as HTMLElement | null)?.blur?.();
      expect(document.activeElement).toBe(document.body);

      const { rerender } = render(<MilestoneBanner milestone={milestone} onDismiss={vi.fn()} />);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'CONTINUE' }));

      act(() => {
        rerender(<MilestoneBanner milestone={null} onDismiss={vi.fn()} />);
      });

      expect(document.activeElement).toBe(beginButton);
      expect(document.activeElement).not.toBe(document.body);
    });
  });
});
