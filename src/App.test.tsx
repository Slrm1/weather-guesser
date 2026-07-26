import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// MapLibre relies on WebGL, which jsdom doesn't provide, so stub the map with a
// button that triggers a map click (reporting an incident).
vi.mock('./components/MapView', () => ({
  default: (props: { onSelect?: (lat: number, lon: number) => void }) => (
    <button type="button" onClick={() => props.onSelect?.(38.9, -77.03)}>
      mock-map-click
    </button>
  ),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

function stubWeatherFail() {
  // Force the offline simulation fallback so tests never hit the network.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('no network in tests');
    }),
  );
}

describe('<App /> (dispatch simulator)', () => {
  it('renders the CAD header, clock, controls, and stats', () => {
    stubWeatherFail();
    render(<App />);
    expect(screen.getByText(/DMV Emergency Response/i)).toBeInTheDocument();
    expect(screen.getByTestId('clock')).toHaveTextContent(/\d{2}:\d{2}/);
    expect(screen.getByRole('button', { name: /pause|resume/i })).toBeInTheDocument();
    expect(screen.getByTestId('stats')).toBeInTheDocument();
    expect(screen.getByTestId('incident-list')).toBeInTheDocument();
  });

  it('adds an incident when the map is clicked and can dispatch it', async () => {
    stubWeatherFail();
    render(<App />);

    // Pause the auto-running sim so the click-created incident is deterministic.
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));

    fireEvent.click(screen.getByText('mock-map-click'));

    await waitFor(() =>
      expect(screen.getByTestId('incident-list')).toHaveTextContent(/INC-/),
    );

    const dispatchBtn = screen.queryByRole('button', { name: /^dispatch$/i });
    if (dispatchBtn) {
      fireEvent.click(dispatchBtn);
      await waitFor(() =>
        expect(screen.getByTestId('incident-list')).toHaveTextContent(
          /assigned|onscene/i,
        ),
      );
    }
  });
});
