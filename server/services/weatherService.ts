/**
 * weatherService.ts
 * Dados meteorológicos REAIS via Open-Meteo (https://open-meteo.com)
 * - Gratuito, sem API key, sem dados inventados
 * - Cache de 30 segundos por coordenada para eficiência
 * - Atualização automática a cada chamada após expirar o cache
 */

export interface WeatherData {
    temp: number;
    humidity: number;
    windSpeed: number;
    rain: number;
    uvIndex: number;
    description: string;
    apparentTemp?: number;
    pressure?: number;
    visibility?: number;
    sunrise?: string;
    isDay?: boolean;
    time?: string;
    isSimulated: false;
    windDirection?: number;
    cloudCover?: number;
    fetchedAt?: string;
}

// Cache em memória: chave = "lat,lng", valor = { data, expiresAt }
const weatherCache = new Map<string, { data: WeatherData; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

// Mapeamento de WMO Weather Codes para Português
const WMO_WEATHER_MAP: Record<number, string> = {
    0: "Céu Limpo",
    1: "Principalmente Limpo",
    2: "Parcialmente Nublado",
    3: "Encoberto",
    45: "Nevoeiro",
    48: "Nevoeiro Gelado",
    51: "Chuvisco Leve",
    53: "Chuvisco Moderado",
    55: "Chuvisco Intenso",
    56: "Chuvisco Gélido Leve",
    57: "Chuvisco Gélido Intenso",
    61: "Chuva Fraca",
    63: "Chuva Moderada",
    65: "Chuva Forte",
    66: "Chuva Gélida Fraca",
    67: "Chuva Gélida Forte",
    71: "Neve Fraca",
    73: "Neve Moderada",
    75: "Neve Forte",
    77: "Granizo",
    80: "Aguaceiros Fracos",
    81: "Aguaceiros Moderados",
    82: "Aguaceiros Violentos",
    85: "Aguaceiros de Neve Fracos",
    86: "Aguaceiros de Neve Intensos",
    95: "Trovoada",
    96: "Trovoada com Granizo Leve",
    99: "Trovoada com Granizo Intenso",
};

function descriptionFromCode(code: number, precipitation: number): string {
    return WMO_WEATHER_MAP[code] ?? (precipitation > 0 ? "Chuva" : "Condição Desconhecida");
}

export async function getPlotWeather(lat: string, lng: string): Promise<WeatherData> {
    const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}`;
    const now = Date.now();

    // Retornar do cache se ainda válido
    const cached = weatherCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
        console.log(`[Weather] Cache hit para ${cacheKey}`);
        return cached.data;
    }

    console.log(`[Weather] Buscando dados REAIS da Open-Meteo para lat=${lat}, lng=${lng}`);

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lng);
    url.searchParams.set("current", [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "pressure_msl",
        "cloud_cover",
        "visibility",
        "wind_speed_10m",
        "wind_direction_10m",
        "uv_index",
        "is_day",
    ].join(","));
    url.searchParams.set("daily", "sunrise");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("wind_speed_unit", "kmh");

    const response = await fetch(url.toString());

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Open-Meteo erro ${response.status}: ${body}`);
    }

    const json = await response.json();
    const c = json.current;
    const daily = json.daily;

    const sunriseRaw = daily?.sunrise?.[0];
    const sunriseFormatted = sunriseRaw
        ? new Date(sunriseRaw).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
        : "--:--";

    const data: WeatherData = {
        temp: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        windSpeed: c.wind_speed_10m,
        windDirection: c.wind_direction_10m,
        rain: c.precipitation,
        uvIndex: c.uv_index,
        apparentTemp: c.apparent_temperature,
        pressure: c.pressure_msl,
        visibility: typeof c.visibility === "number" ? c.visibility / 1000 : undefined, // metros → km
        cloudCover: c.cloud_cover,
        isDay: c.is_day === 1,
        description: descriptionFromCode(c.weather_code, c.precipitation),
        sunrise: sunriseFormatted,
        time: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
        fetchedAt: new Date().toISOString(),
        isSimulated: false,
    };

    // Guardar no cache
    weatherCache.set(cacheKey, { data, expiresAt: now + CACHE_TTL_MS });
    console.log(`[Weather] Dados reais obtidos: ${data.temp}°C, ${data.description}`);

    return data;
}

/** Limpa o cache de uma coordenada específica (útil para forçar atualização) */
export function clearWeatherCache(lat?: string, lng?: string): void {
    if (lat && lng) {
        const key = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}`;
        weatherCache.delete(key);
    } else {
        weatherCache.clear();
    }
}
