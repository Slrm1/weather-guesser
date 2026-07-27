import { describeWeatherCode, type DailyForecast } from '../weather/openMeteo';

interface ForecastStripProps {
  daily: DailyForecast[];
}

function weekday(dateStr: string): string {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function ForecastStrip({ daily }: ForecastStripProps) {
  return (
    <div className="forecast" data-testid="forecast">
      <h3>5-day forecast</h3>
      <div className="forecast-row">
        {daily.map((d) => {
          const { emoji, label } = describeWeatherCode(d.weatherCode);
          return (
            <div key={d.date} className="forecast-day" title={label}>
              <span className="forecast-dow">{weekday(d.date)}</span>
              <span className="forecast-emoji" aria-hidden="true">{emoji}</span>
              <span className="forecast-temp">
                {d.maxC}° / {d.minC}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
