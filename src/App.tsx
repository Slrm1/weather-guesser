import { useMemo, useState } from 'react';
import {
  createRounds,
  evaluateGuess,
  totalScore,
  type RoundResult,
} from './game';

const ROUNDS_PER_GAME = 5;

type Phase = 'guessing' | 'revealed' | 'finished';

export default function App() {
  const [seed, setSeed] = useState(() => Date.now());
  const rounds = useMemo(() => createRounds(ROUNDS_PER_GAME, seed), [seed]);

  const [current, setCurrent] = useState(0);
  const [guess, setGuess] = useState(15);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [results, setResults] = useState<RoundResult[]>([]);

  const round = rounds[current];

  function submitGuess() {
    const result = evaluateGuess(round, guess);
    setResults((prev) => [...prev, result]);
    setPhase('revealed');
  }

  function nextRound() {
    if (current + 1 >= rounds.length) {
      setPhase('finished');
      return;
    }
    setCurrent((c) => c + 1);
    setGuess(15);
    setPhase('guessing');
  }

  function restart() {
    setSeed(Date.now());
    setCurrent(0);
    setGuess(15);
    setResults([]);
    setPhase('guessing');
  }

  const lastResult = results[results.length - 1];
  const score = totalScore(results);

  return (
    <main className="app">
      <header className="header">
        <h1>🌦️ Weather Guesser</h1>
        <p className="subtitle">Guess the temperature. The closer you are, the more you score.</p>
      </header>

      {phase !== 'finished' && round && (
        <section className="card" aria-label="round">
          <div className="progress" data-testid="progress">
            Round {current + 1} of {rounds.length} · Score: {score}
          </div>

          <div className="city">
            <span className="flag" aria-hidden="true">{round.city.emoji}</span>
            <h2>
              {round.city.name}, {round.city.country}
            </h2>
          </div>

          {phase === 'guessing' && (
            <div className="controls">
              <label htmlFor="guess" className="guess-label">
                Your guess: <strong data-testid="guess-value">{guess}°C</strong>
              </label>
              <input
                id="guess"
                type="range"
                min={-30}
                max={50}
                value={guess}
                onChange={(e) => setGuess(Number(e.target.value))}
              />
              <button type="button" className="primary" onClick={submitGuess}>
                Submit guess
              </button>
            </div>
          )}

          {phase === 'revealed' && lastResult && (
            <div className="reveal" data-testid="reveal">
              <p>
                Actual temperature: <strong>{lastResult.round.actualTempC}°C</strong>
              </p>
              <p>
                You were off by {lastResult.diff}° and earned{' '}
                <strong>{lastResult.points}</strong> points.
              </p>
              <button type="button" className="primary" onClick={nextRound}>
                {current + 1 >= rounds.length ? 'See results' : 'Next round'}
              </button>
            </div>
          )}
        </section>
      )}

      {phase === 'finished' && (
        <section className="card" aria-label="results">
          <h2>Game over!</h2>
          <p className="final-score" data-testid="final-score">
            Final score: {score} / {rounds.length * 100}
          </p>
          <ul className="results-list">
            {results.map((r, i) => (
              <li key={i}>
                {r.round.city.name}: guessed {r.guessTempC}°, actual{' '}
                {r.round.actualTempC}° → {r.points} pts
              </li>
            ))}
          </ul>
          <button type="button" className="primary" onClick={restart}>
            Play again
          </button>
        </section>
      )}
    </main>
  );
}
