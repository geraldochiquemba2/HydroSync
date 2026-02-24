
import { WeatherData } from "./weatherService";

export interface SoilTelemetry {
    moisture: number; // Humidity %
    temperature: number; // Celsius
    status: "Ideal" | "Alerta" | "Estresse";
    evapotranspiration: number; // mm/h estimated
}

/**
 * Simulador de Sensor Virtual (Cenário Hackathon)
 * Estima a humidade do solo baseada na evapotranspiração (sol/vento) e precipitação real.
 */
export function estimateSoilTelemetry(weather: WeatherData, previousLevels?: { moisture: number }): SoilTelemetry {
    // Constante base de Angostura (solo de Angola tipo ferralítico/psamítico comum)
    // Taxa de infiltração vs Evaporação
    const baseMoisture = previousLevels?.moisture ?? 35; // Default 35%

    // Cálculo de Evapotranspiração Simplificado (Penman-Monteith simplificado para Hackathon)
    // Fatores: Temperatura aumenta evaporação, Humidade diminui, Vento aumenta.
    const tempFactor = weather.temp > 25 ? (weather.temp - 25) * 0.05 : 0;
    const windFactor = weather.windSpeed * 0.01;
    const humidityFactor = (100 - weather.humidity) * 0.01;

    const eto = (tempFactor + windFactor + humidityFactor) * (weather.uvIndex > 0 ? 1.2 : 0.5); // mm/h

    // Balanço Hídrico Instantâneo
    // Chuva aumenta a humidade (ex: 1mm chuva = +2% humidade solo dependendo da profundidade)
    const rainGain = weather.rain * 2.5;
    const moistureLoss = eto * 1.5;

    let currentMoisture = baseMoisture + rainGain - moistureLoss;

    // Limites realistas
    currentMoisture = Math.max(5, Math.min(95, currentMoisture));

    let status: "Ideal" | "Alerta" | "Estresse" = "Ideal";
    if (currentMoisture < 20) status = "Estresse";
    else if (currentMoisture < 30) status = "Alerta";

    return {
        moisture: Number(currentMoisture.toFixed(1)),
        temperature: Number((weather.temp - 2).toFixed(1)), // Solo é levemente mais frio que o ar em profundidade
        evapotranspiration: Number(eto.toFixed(2)),
        status
    };
}
