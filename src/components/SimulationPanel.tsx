import type { ResponseMetric } from '../simulation/response';

interface SimulationPanelProps {
  metrics: ResponseMetric[];
}

export default function SimulationPanel({ metrics }: SimulationPanelProps) {
  return (
    <div className="sim-panel" data-testid="sim-panel">
      <h3>Simulated system responses</h3>
      <ul className="sim-list">
        {metrics.map((m) => (
          <li key={m.key} className="sim-item">
            <div className="sim-head">
              <span className="sim-label">
                <span aria-hidden="true">{m.emoji}</span> {m.label}
              </span>
              <span className={`sim-level level-${m.level}`}>{m.level}</span>
            </div>
            <div className="sim-bar">
              <div
                className={`sim-fill level-${m.level}`}
                style={{ width: `${m.value}%` }}
                role="meter"
                aria-valuenow={m.value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={m.label}
              />
            </div>
            <p className="sim-detail">{m.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
