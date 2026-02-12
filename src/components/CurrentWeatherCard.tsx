

import type { CurrentWeather } from "../services/weatherApi";

type Props = {
  weather: CurrentWeather;
};

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes("yağmur")) return "🌧️";
  if (c.includes("kar")) return "❄️";
  if (c.includes("rüzgar")) return "💨";
  if (c.includes("sis")) return "🌫️";
  if (c.includes("bulut")) return "☁️";
  if (c.includes("güneş") || c.includes("açık")) return "☀️";
  return "🌤️";
}

export default function CurrentWeatherCard({ weather }: Props) {
  return (
    <section className="w-full rounded-3xl border border-white/20 bg-white/7 backdrop-blur-2xl p-6 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.9)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-white/55">GÜNCEL HAVA (PERŞEMBE)</p>
          <h2 className="mt-1 text-xl font-semibold text-white truncate">
            {weather.city}
          </h2>

          <div className="mt-2 flex items-center gap-2 text-white/80">
            <span className="text-2xl">
              {getWeatherIcon(weather.condition)}
            </span>
            <span className="truncate">{weather.condition}</span>
          </div>
        </div>

        <div className="text-5xl font-semibold text-white tabular-nums">
          {Math.round(weather.tempC)}°
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/80">
          <p className="text-xs text-white/50">Nem</p>
          <p className="mt-1 font-medium tabular-nums">{weather.humidity}%</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/80">
          <p className="text-xs text-white/50">Rüzgar</p>
          <p className="mt-1 font-medium tabular-nums">
            {Math.round(weather.windKph)} km/h
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/80">
          <p className="text-xs text-white/50">Hissedilen</p>
          <p className="mt-1 font-medium tabular-nums">
            {Math.round(weather.feelsLikeC)}°
          </p>
        </div>
      </div>
    </section>
  );
}
