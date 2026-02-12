
import type { ForecastDay } from "../services/weatherApi";

type Props = {
  forecast: ForecastDay[];
};

function formatDayTR(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", { weekday: "long" });
}

export default function Forecast3Day({ forecast }: Props) {
  return (
    <section className="w-full rounded-3xl border border-white/20 bg-white/7 backdrop-blur-2xl p-6 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.9)]">
      <p className="text-xs tracking-wide text-white/55">2 GÜNLÜK TAHMİN</p>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {forecast.map((day) => (
          <div
            key={day.date}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300 ease-out hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white capitalize">
                  {formatDayTR(day.date)}
                </p>
                <p className="mt-1 text-sm text-white/65 truncate">
                  {day.condition}
                </p>
              </div>

              <div className="text-sm text-white/85 tabular-nums whitespace-nowrap">
                <span className="text-white/60">Min</span>{" "}
                {Math.round(day.minTemp)}°{" "}
                <span className="text-white/40">/</span>{" "}
                <span className="text-white/60">Max</span>{" "}
                {Math.round(day.maxTemp)}°
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
