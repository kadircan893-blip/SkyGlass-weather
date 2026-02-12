

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CurrentWeatherCard from "./components/CurrentWeatherCard";
import Forecast3Day from "./components/Forecast3Day";
import { getCurrentWeather, getForecast } from "./services/weatherApi";

import type { CurrentWeather, ForecastDay } from "./services/weatherApi";

type FxMode = "none" | "snow" | "rain" | "sun" | "cloudy" | "partly";

type SkyMode = "clear" | "partly" | "cloudy" | "rain" | "snow";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickSkyMode(weather: CurrentWeather | null): SkyMode {
  if (!weather) return "clear";
  const t = (weather.condition || "").toLowerCase();

  const has = (arr: string[]) => arr.some((k) => t.includes(k));

  if (has(["snow", "kar", "sleet", "blizzard", "buz"])) return "snow";
  if (has(["rain", "yağmur", "drizzle", "shower", "sağanak", "thunder", "storm", "fırtına"])) return "rain";
  if (has(["partly", "parçalı", "scattered", "broken"])) return "partly";
  if (has(["cloud", "bulut", "overcast", "çok bulut"])) return "cloudy";
  return "clear";
}

function bgClassFromMode(mode: SkyMode) {
  switch (mode) {
    case "snow":
      return "from-slate-950 via-slate-900 to-indigo-950";
    case "rain":
      return "from-slate-950 via-slate-900 to-slate-950";
    case "cloudy":
      return "from-slate-950 via-slate-900 to-gray-950";
    case "partly":
      return "from-slate-950 via-indigo-950 to-slate-950";
    case "clear":
    default:
      return "from-slate-950 via-slate-900 to-slate-950";
  }
}


type Particle =
  | {
      kind: "snow";
      x: number;
      y: number;
      r: number;
      vy: number;
      vx: number;
      wobble: number;
      wobbleSpeed: number;
      alpha: number;
      layer: 0 | 1 | 2;
    }
  | {
      kind: "rain";
      x: number;
      y: number;
      len: number;
      vy: number;
      vx: number;
      alpha: number;
      thickness: number;
      layer: 0 | 1 | 2;
    }
  | {
      kind: "sun";
      x: number;
      y: number;
      r: number;
      pulse: number;
      pulseSpeed: number;
      alpha: number;
      layer: 0 | 1 | 2;
    }
  | {
      kind: "cloud";
      x: number;
      y: number;
      w: number;
      h: number;
      vx: number;
      alpha: number;
      blur: number;
      layer: 0 | 1 | 2;
      seed: number;
    };

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function layerAlpha(layer: 0 | 1 | 2) {
 
  if (layer === 0) return 0.35;
  if (layer === 1) return 0.55;
  return 0.8;
}

function drawSoftCloud(ctx: CanvasRenderingContext2D, p: Extract<Particle, { kind: "cloud" }>) {
  
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.filter = "none";
  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.shadowBlur = p.blur;

  const x = p.x;
  const y = p.y;
  const w = p.w;
  const h = p.h;

  
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "rgba(255,255,255,0.85)");
  grad.addColorStop(1, "rgba(210,225,255,0.55)");
  ctx.fillStyle = grad;

  const bumps = [
    { ox: 0.12, oy: 0.55, rw: 0.55, rh: 0.55 },
    { ox: 0.32, oy: 0.35, rw: 0.62, rh: 0.7 },
    { ox: 0.56, oy: 0.45, rw: 0.62, rh: 0.6 },
    { ox: 0.76, oy: 0.6, rw: 0.52, rh: 0.52 },
  ];

  ctx.beginPath();
 
  const baseY = y + h * 0.72;
  ctx.roundRect(x + w * 0.12, baseY - h * 0.22, w * 0.78, h * 0.32, h * 0.18);

  
  for (const b of bumps) {
    const cx = x + w * b.ox;
    const cy = y + h * b.oy;
    const ew = w * b.rw;
    const eh = h * b.rh;
    ctx.ellipse(cx + ew * 0.35, cy, ew * 0.35, eh * 0.35, 0, 0, Math.PI * 2);
  }

  ctx.fill();
  ctx.restore();
}

function drawSunGlints(ctx: CanvasRenderingContext2D, p: Extract<Particle, { kind: "sun" }>, t: number) {
  ctx.save();
  const pulse = (Math.sin(t * p.pulseSpeed + p.pulse) + 1) * 0.5; // 0..1
  const a = p.alpha * (0.35 + 0.65 * pulse);

  
  ctx.globalAlpha = a;
  const r = p.r * (0.8 + pulse * 0.6);

 
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.25, "rgba(255,230,160,0.55)");
  g.addColorStop(1, "rgba(255,200,120,0.0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = a * 0.6;
  ctx.strokeStyle = "rgba(255,235,190,0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x - r * 1.8, p.y);
  ctx.lineTo(p.x + r * 1.8, p.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x, p.y - r * 1.4);
  ctx.lineTo(p.x, p.y + r * 1.4);
  ctx.stroke();

  ctx.restore();
}

function App() {
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const modeRef = useRef<FxMode>("none");
  const lastTimeRef = useRef<number>(0);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  const [muted, setMuted] = useState(true);
const [audioUnlocked, setAudioUnlocked] = useState(false);

useEffect(() => {
  const unlock = () => setAudioUnlocked(true);

  window.addEventListener("click", unlock, { once: true });

  return () => {
    window.removeEventListener("click", unlock);
  };
}, []);

const sfxRef = useRef<{
  rain: HTMLAudioElement;
  snow: HTMLAudioElement;
  wind: HTMLAudioElement;
  birds: HTMLAudioElement;
} | null>(null);

  const skyMode = useMemo(() => pickSkyMode(currentWeather), [currentWeather]);
  const bg = useMemo(() => bgClassFromMode(skyMode), [skyMode]);


  useEffect(() => {
    if (!selectedCity) return;

    setLoading(true);
setError(() => null);
    Promise.all([getCurrentWeather(selectedCity), getForecast(selectedCity)])
      .then(([cw, fc]) => {
        setCurrentWeather(cw);
        setForecast(fc);
      })
      .catch(() => {
        setError("Veriler alınamadı");
        setCurrentWeather(null);
        setForecast([]);
      })
      .finally(() => setLoading(false));
  }, [selectedCity]);


  useEffect(() => {
    const rain = new Audio("/src/assets/sfx/rain.mp3");
    const snow = new Audio("/src/assets/sfx/snow.mp3");
    const wind = new Audio("/src/assets/sfx/wind.mp3");
    const birds = new Audio("/src/assets/sfx/birds.mp3");

    for (const a of [rain, snow, wind]) {
      a.loop = true;
      a.volume = 0.25;
    }
    birds.loop = false;
    birds.volume = 0.18;

    sfxRef.current = { rain, snow, wind, birds };
    return () => {
      sfxRef.current = null;
      for (const a of [rain, snow, wind, birds]) {
        a.pause();
      }
    };
  }, []);

  function stopAllSfx() {
    const s = sfxRef.current;
    if (!s) return;
    s.rain.pause();
    s.snow.pause();
    s.wind.pause();
    s.birds.pause();
    s.rain.currentTime = 0;
    s.snow.currentTime = 0;
    s.wind.currentTime = 0;
    s.birds.currentTime = 0;
  }

  function playLoop(a: HTMLAudioElement) {
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  useEffect(() => {
   
    if (!audioUnlocked || muted) {
      stopAllSfx();
      return;
    }

    const s = sfxRef.current;
    if (!s) return;

    stopAllSfx();

   
    if (skyMode === "rain") playLoop(s.rain);
    else if (skyMode === "snow") playLoop(s.snow);
    else if (skyMode === "clear")
      
      
      {
      const id = window.setInterval(() => {
        if (muted) return;
        s.birds.currentTime = 0;
        s.birds.play().catch(() => {});
      }, 12000);
      return () => window.clearInterval(id);
    } else if (skyMode === "cloudy" || skyMode === "partly") {
      
      playLoop(s.wind);
      s.wind.volume = 0.15;
    }

    return () => {};
  }, [skyMode, muted, audioUnlocked]);

  const onToggleMute = () => {
   
    if (!audioUnlocked) setAudioUnlocked(true);
    setMuted((m) => !m);
  };

  const fxMode: FxMode = useMemo(() => {
    if (!currentWeather) return "none";
    if (skyMode === "snow") return "snow";
    if (skyMode === "rain") return "rain";
    if (skyMode === "clear") return "sun";
    if (skyMode === "cloudy") return "cloudy";
    if (skyMode === "partly") return "partly";
    return "none";
  }, [currentWeather, skyMode]);

 
  function buildParticles(mode: FxMode, w: number, h: number) {
    const parts: Particle[] = [];

    const pushLayers = (count: number, maker: (layer: 0 | 1 | 2) => Particle) => {
      for (let i = 0; i < count; i++) {
        const layer: 0 | 1 | 2 = (i % 3) as 0 | 1 | 2;
        parts.push(maker(layer));
      }
    };

    if (mode === "snow") {
      const base = Math.floor((w * h) / 18000);
      const count = clamp(base, 80, 220);
      pushLayers(count, (layer) => {
        const r = layer === 2 ? rand(1.2, 2.3) : layer === 1 ? rand(1.0, 2.0) : rand(0.8, 1.6);
        const vy = layer === 2 ? rand(42, 72) : layer === 1 ? rand(28, 55) : rand(18, 38);
        const vx = rand(-12, 12);
        return {
          kind: "snow",
          x: rand(0, w),
          y: rand(0, h),
          r,
          vy,
          vx,
          wobble: rand(0, Math.PI * 2),
          wobbleSpeed: rand(0.6, 1.4),
          alpha: layerAlpha(layer) * rand(0.55, 0.95),
          layer,
        };
      });
    }

    if (mode === "rain") {
      const base = Math.floor((w * h) / 22000);
      const count = clamp(base, 120, 320);
      pushLayers(count, (layer) => {
        const len = layer === 2 ? rand(14, 26) : layer === 1 ? rand(12, 22) : rand(10, 18);
        const vy = layer === 2 ? rand(700, 1000) : layer === 1 ? rand(600, 900) : rand(520, 820);
        const vx = rand(-90, -40); 
        return {
          kind: "rain",
          x: rand(0, w),
          y: rand(0, h),
          len,
          vy,
          vx,
          alpha: layerAlpha(layer) * rand(0.25, 0.55),
          thickness: layer === 2 ? rand(1.2, 1.8) : layer === 1 ? rand(1.0, 1.5) : rand(0.9, 1.3),
          layer,
        };
      });
    }

    if (mode === "sun") {
      const count = clamp(Math.floor((w * h) / 65000), 18, 48);
      pushLayers(count, (layer) => {
        const r = layer === 2 ? rand(24, 54) : layer === 1 ? rand(18, 40) : rand(14, 30);
        return {
          kind: "sun",
          x: rand(0, w),
          y: rand(0, h * 0.65),
          r,
          pulse: rand(0, Math.PI * 2),
          pulseSpeed: rand(0.6, 1.1),
          alpha: layerAlpha(layer) * rand(0.18, 0.5),
          layer,
        };
      });
    }

    if (mode === "cloudy" || mode === "partly") {
      const dense = mode === "cloudy" ? 10 : 6;
      const count = clamp(dense + Math.floor(w / 420), 6, 14);
      for (let i = 0; i < count; i++) {
        const layer: 0 | 1 | 2 = (i % 3) as 0 | 1 | 2;
        const scale = layer === 2 ? rand(1.05, 1.5) : layer === 1 ? rand(0.9, 1.3) : rand(0.75, 1.1);
        const cw = rand(240, 420) * scale;
        const ch = rand(120, 220) * scale;
        const y = rand(h * 0.06, h * 0.42);
        const vx = layer === 2 ? rand(10, 18) : layer === 1 ? rand(7, 14) : rand(4, 10);
        parts.push({
          kind: "cloud",
          x: rand(-w * 0.2, w * 1.2),
          y,
          w: cw,
          h: ch,
          vx,
          alpha: layerAlpha(layer) * (mode === "cloudy" ? rand(0.28, 0.55) : rand(0.22, 0.45)),
          blur: layer === 2 ? 34 : layer === 1 ? 28 : 22,
          layer,
          seed: Math.random(),
        });
      }
    }

    return parts;
  }

  useEffect(() => {
    modeRef.current = fxMode;
   
    const c = canvasRef.current;
    if (!c) return;
    const w = c.width;
    const h = c.height;
    particlesRef.current = buildParticles(fxMode, w, h);
  }, [fxMode]);

  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

    
      particlesRef.current = buildParticles(modeRef.current, w, h);
    };

    setSize();
    window.addEventListener("resize", setSize);

    const tick = (ts: number) => {
      const t = ts / 1000;
      const last = lastTimeRef.current || ts;
      const dt = clamp((ts - last) / 1000, 0.001, 0.033); 
      lastTimeRef.current = ts;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

     
      if (modeRef.current === "rain" || modeRef.current === "snow") {
        ctx.save();
        ctx.globalAlpha = modeRef.current === "rain" ? 0.08 : 0.06;
        const g = ctx.createRadialGradient(w * 0.4, h * 0.2, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
        g.addColorStop(0, "rgba(255,255,255,0.25)");
        g.addColorStop(1, "rgba(255,255,255,0.0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      const parts = particlesRef.current;
      const mode = modeRef.current;

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];

        if (p.kind === "snow") {
          p.wobble += dt * p.wobbleSpeed;
          p.x += (p.vx + Math.sin(p.wobble) * (p.layer === 2 ? 14 : p.layer === 1 ? 10 : 7)) * dt;
          p.y += p.vy * dt;

          if (p.y - p.r > h) {
            p.y = -p.r - rand(0, h * 0.05);
            p.x = rand(0, w);
          }
          if (p.x < -40) p.x = w + 40;
          if (p.x > w + 40) p.x = -40;

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.shadowColor = "rgba(255,255,255,0.55)";
          ctx.shadowBlur = p.layer === 2 ? 8 : p.layer === 1 ? 6 : 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (p.kind === "rain") {
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          if (p.y - p.len > h) {
            p.y = -p.len - rand(0, h * 0.12);
            p.x = rand(0, w);
          }
          if (p.x < -120) p.x = w + 120;

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.strokeStyle = "rgba(170,210,255,0.85)";
          ctx.lineWidth = p.thickness;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 0.02, p.y + p.len);
          ctx.stroke();
          ctx.restore();
        }

        if (p.kind === "sun") {
          p.x += (p.layer === 2 ? 6 : p.layer === 1 ? 4 : 2) * dt;
          p.y += Math.sin(t * 0.35 + p.pulse) * (p.layer === 2 ? 6 : 4) * dt;

          if (p.x - p.r > w) {
            p.x = -p.r - rand(0, w * 0.1);
            p.y = rand(0, h * 0.55);
          }

          drawSunGlints(ctx, p, t);
        }

        if (p.kind === "cloud") {
          p.x += p.vx * dt * (p.layer === 2 ? 1.0 : p.layer === 1 ? 0.85 : 0.7);

          if (p.x - p.w > w * 1.25) {
            p.x = -p.w - rand(0, w * 0.3);
            p.y = rand(h * 0.06, h * 0.42);
          }

          drawSoftCloud(ctx, p);
        }
      }

      if (
        (mode === "snow" && parts.length && parts[0].kind !== "snow") ||
        (mode === "rain" && parts.length && parts[0].kind !== "rain")
      ) {
        particlesRef.current = buildParticles(mode, w, h);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", setSize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${bg} text-white`}>
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />

      <div className="fixed inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.0)_0%,rgba(0,0,0,0.45)_70%,rgba(0,0,0,0.65)_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen w-full flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl">
          <div className="w-full rounded-[28px] border border-white/20 bg-white/5 backdrop-blur-3xl shadow-2xl p-6 md:p-8 space-y-6">
            <Header muted={muted} onToggleMute={onToggleMute} />

            <SearchBar onCitySelect={setSelectedCity} />

            {!selectedCity && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
                Şehir seçerek güncel hava ve 3 günlük tahmini görüntüleyebilirsin.
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
                Yükleniyor...
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-red-200">
                {error}
              </div>
            )}

            {selectedCity && !loading && !error && currentWeather && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CurrentWeatherCard weather={currentWeather} />
               <Forecast3Day forecast={forecast.slice(1)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
