
import fetch from "node-fetch";

export interface WeatherData {
    temp: number;
    humidity: number;
    windSpeed: number;
    rain: number;
    uvIndex: number;
    description: string;
    isSimulated?: boolean;
}

export async function getPlotWeather(lat: string, lng: string): Promise<WeatherData> {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
        // Fallback: Simulated high-frequency weather for Angola
        console.log("OPENWEATHER_API_KEY não encontrada. Usando telemetria simulada.");
        return simulateWeather(lat, lng);
    }

    try {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // Using OpenWeather One Call 3.0 (or fallback to 2.5 if needed)
        const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${latNum}&lon=${lngNum}&exclude=minutely,daily,alerts&units=metric&appid=${apiKey}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Falha ao buscar clima");

        const data = await response.json();
        const current = data.current;

        return {
            temp: current.temp,
            humidity: current.humidity,
            windSpeed: current.wind_speed,
            rain: current.rain ? current.rain['1h'] || 0 : 0,
            uvIndex: current.uvi,
            description: current.weather[0].description
        };
    } catch (error) {
        console.error("Erro na API de Clima:", error);
        return simulateWeather(lat, lng);
    }
}

function simulateWeather(lat: string, lng: string): WeatherData {
    // Deterministic simulation based on lat/lng and current hour
    const hour = new Date().getHours();
    const seed = parseFloat(lat) + parseFloat(lng) + hour;

    // Base values for Angola (typically tropical)
    const baseTemp = 24 + Math.sin(hour / 24 * Math.PI * 2 - Math.PI / 2) * 6;
    const humidity = 60 + Math.cos(hour / 24 * Math.PI * 2) * 20;

    return {
        temp: Number(baseTemp.toFixed(1)),
        humidity: Math.floor(Math.max(10, Math.min(100, humidity))),
        windSpeed: Number((5 + Math.random() * 10).toFixed(1)),
        rain: Math.random() > 0.8 ? Number((Math.random() * 5).toFixed(1)) : 0,
        uvIndex: hour > 6 && hour < 18 ? Math.floor(Math.random() * 10) : 0,
        description: "Céu limpo (Simulado)",
        isSimulated: true
    };
}
