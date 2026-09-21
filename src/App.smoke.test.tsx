/**
 * Integration smoke test (M-INT).
 *
 * Not a UI test — it answers the one question the unit tests cannot: does the
 * whole wired app mount, with the real timer, real store and real scene tree,
 * without throwing or looping? WebGL does not exist under jsdom, so the R3F
 * canvas is stubbed; everything above it is the real thing.
 */
// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import App from './App';

// jsdom ships no matchMedia; the reduced-motion hook needs one.
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

// R3F needs a WebGL context jsdom cannot provide. Stub the Canvas only; every
// component inside it is still imported and type-checked by the real Scene.
vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>(
    '@react-three/fiber',
  );
  return {
    ...actual,
    Canvas: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="r3f-canvas">{children}</div>
    ),
    useFrame: () => undefined,
    useThree: () => ({
      gl: {
        getPixelRatio: () => 1,
        setPixelRatio: () => undefined,
        setSize: () => undefined,
        getSize: (target?: { set?: (w: number, h: number) => void }) => {
          target?.set?.(800, 600);
          return target ?? { width: 800, height: 600 };
        },
        getContext: () => ({}),
        domElement: document.createElement('canvas'),
      },
      scene: {},
      camera: {},
      size: { width: 800, height: 600 },
    }),
  };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test('mounts from empty storage without throwing', () => {
  render(<App />);
  // Idle timer shows the full focus duration, per PRD §5.1.
  expect(screen.getByText('25:00')).toBeDefined();
  expect(screen.getByTestId('r3f-canvas')).toBeDefined();
});

test('mounts without throwing when localStorage holds garbage', () => {
  localStorage.setItem('orbit.v1', '{ not json at all');
  localStorage.setItem('orbit.timer.v1', 'also garbage');
  render(<App />);
  expect(screen.getByText('25:00')).toBeDefined();
});

test('renders a start control on a fresh system', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /start/i })).toBeDefined();
});
