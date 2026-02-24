
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
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hour = new Date().getHours();

    // 1. Efeito de Latitude (Angola: entre ~5°S e ~18°S)
    // Mais próximo de 0 (Equador) = Mais quente. Mais sul = mais moderado.
    const latFactor = (18 - Math.abs(latNum)) / 13; // 1.0 no norte, 0.0 no sul extremo

    // 2. Efeito de Altitude (Simulado baseado na geografia de Angola)
    // Planalto Central (Huambo/Bié) é mais alto e frio. Litoral é baixo e quente.
    // Lng entre 15 e 18 costuma ser região de planalto.
    const isPlanalto = lngNum > 15 && lngNum < 19 && Math.abs(latNum) > 10;
    const altitudeEffect = isPlanalto ? -4 : 0;

    // 3. Ciclo Diário (Mais quente às 14h, mais frio às 04h)
    const timeEffect = Math.sin((hour - 8) / 24 * Math.PI * 2) * 5;

    // Temperatura Base média para Angola (Tropical/Subtropical)
    // Norte: ~26-28°C, Sul: ~22-24°C base
    const baseTemp = 23 + (latFactor * 4) + altitudeEffect + timeEffect;

    // Humidade varia com proximidade do mar (lng menor = litoral)
    const humidityBase = lngNum < 14 ? 75 : 55;
    const humidity = humidityBase + Math.cos(hour / 24 * Math.PI * 2) * 15;

    return {
        temp: Number(baseTemp.toFixed(1)),
        humidity: Math.floor(Math.max(20, Math.min(95, humidity))),
        windSpeed: Number((3 + Math.abs(Math.sin(lngNum)) * 5 + Math.random() * 2).toFixed(1)),
        rain: Math.random() > 0.85 ? Number((Math.random() * 3).toFixed(1)) : 0,
        uvIndex: hour > 6 && hour < 18 ? Math.floor((6 + latFactor * 4) * Math.max(0, Math.sin((hour - 6) / 12 * Math.PI))) : 0,
        description: baseTemp > 28 ? "Céu limpo e quente (Simulado)" : "Parcialmente nublado (Simulado)",
        isSimulated: true
    };
}
