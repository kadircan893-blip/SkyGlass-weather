//weatherApi.ts
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const BASE_URL = "https://api.weatherapi.com/v1";

export type CurrentWeather = {
  city: string;
  tempC: number;
  condition: string;
  humidity: number;
  windKph: number;
  feelsLikeC: number;
};

export type ForecastDay = {
  date: string;
  minTemp: number;
  maxTemp: number;
  condition: string;
};

export async function getCurrentWeather(city: string): Promise<CurrentWeather> {
  const res = await fetch(
    `${BASE_URL}/current.json?key=${API_KEY}&q=${city}&lang=tr`
  );

  if (!res.ok) throw new Error("WeatherAPI error");

  const data = await res.json();

  return {
    city: data.location.name,
    tempC: data.current.temp_c,
    condition: data.current.condition.text,
    humidity: data.current.humidity,
    windKph: data.current.wind_kph,
    feelsLikeC: data.current.feelslike_c,
  };
}

export async function getForecast(city: string): Promise<ForecastDay[]> {
  const res = await fetch(
    `${BASE_URL}/forecast.json?key=${API_KEY}&q=${city}&days=3&lang=tr`
  );

  if (!res.ok) throw new Error("Forecast error");

  const data = await res.json();

  return data.forecast.forecastday.map((day: {
  date: string;
  day: {
    mintemp_c: number;
    maxtemp_c: number;
    condition: { text: string };
  };
}) => ({

    date: day.date,
    minTemp: day.day.mintemp_c,
    maxTemp: day.day.maxtemp_c,
    condition: day.day.condition.text,
  }));
}
