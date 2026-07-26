import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// MapLibre relies on WebGL, which jsdom doesn't provide, so stub the map with a
// button that triggers a location selection.
vi.mock('./components/MapView', () => ({
  default: (props: { onSelect: (lat: number, lon: number) => void }) => (
    <button type="button" onClick={() => props.onSelect(52.52, 13.41)}>
      mock-map-select
    </button>
  ),
}));

function mockLiveWeather(tempC: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: tempC,
          apparent_temperature: tempC - 1,
          precipitation: 0,
          weather_code: 0,
          wind_speed_10m: 8,
        },
        daily: {
          time: ['2026-07-26', '2026-07-27'],
          temperature_2m_max: [tempC + 4, tempC + 5],
          temperature_2m_min: [tempC - 4, tempC - 3],
          precipitation_sum: [0, 0],
          weather_code: [0, 1],
        },
      }),
    })),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<App />', () => {
  it('shows the title and an initial hint', () => {
    render(<App />);
    expect(screen.getByText(/Weather Predictor/i)).toBeInTheDocument();
    expect(screen.getByTestId('hint')).toBeInTheDocument();
  });

  it('shows the current conditions, forecast, and simulation for a location', async () => {
    mockLiveWeather(20);
    render(<App />);
    fireEvent.click(screen.getByText('mock-map-select'));

    await waitFor(() =>
      expect(screen.getByTestId('forecast-panel')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('current-temp')).toHaveTextContent('20°C');
    expect(screen.getByTestId('forecast')).toBeInTheDocument();
    expect(screen.getByTestId('sim-panel')).toBeInTheDocument();
  });

  it('clears the forecast when the Clear button is pressed', async () => {
    mockLiveWeather(20);
    render(<App />);
    fireEvent.click(screen.getByText('mock-map-select'));
    await waitFor(() =>
      expect(screen.getByTestId('forecast-panel')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByTestId('hint')).toBeInTheDocument();
  });
});
