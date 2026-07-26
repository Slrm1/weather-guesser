import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('<App />', () => {
  it('renders the title and first round', () => {
    render(<App />);
    expect(screen.getByText(/Weather Guesser/i)).toBeInTheDocument();
    expect(screen.getByTestId('progress')).toHaveTextContent(/Round 1 of 5/);
  });

  it('reveals the actual temperature after submitting a guess', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /submit guess/i }));
    expect(screen.getByTestId('reveal')).toBeInTheDocument();
    expect(screen.getByText(/Actual temperature/i)).toBeInTheDocument();
  });

  it('plays through all rounds to the results screen', () => {
    render(<App />);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: /submit guess/i }));
      fireEvent.click(
        screen.getByRole('button', { name: /next round|see results/i }),
      );
    }
    expect(screen.getByTestId('final-score')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /play again/i }),
    ).toBeInTheDocument();
  });
});
