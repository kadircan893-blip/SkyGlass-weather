

import { useState } from "react";
import trCities from "../utils/trCities";

type Props = {
  onCitySelect: (city: string) => void;
};

export default function SearchBar({ onCitySelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);

  function handleChange(value: string) {
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    const filtered = trCities.filter((c) =>
      c.toLowerCase().includes(value.toLowerCase())
    );

    setResults(filtered.slice(0, 8));
  }

  function selectCity(city: string) {
    setQuery(city);
    setResults([]);
    onCitySelect(city);
  }

  return (
    <div className="w-full relative">
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Şehir ara (Türkiye)"
        className="w-full px-5 py-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur text-white outline-none transition-all duration-300 ease-out focus:border-white/50 focus:shadow-[0_0_25px_rgba(255,255,255,0.15)]"
      />

      {results.length > 0 && (
        <div className="absolute mt-2 w-full rounded-2xl bg-black/60 backdrop-blur border border-white/20 overflow-hidden z-10 shadow-xl">
          {results.map((city) => (
            <button
              key={city}
              onClick={() => selectCity(city)}
              className="w-full text-left px-5 py-2 hover:bg-white/10 transition-all duration-200"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
