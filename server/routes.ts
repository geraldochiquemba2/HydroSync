import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getPlotWeather, clearWeatherCache } from "./services/weatherService";
import { estimateSoilTelemetry } from "./services/soilSimulationService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // API Routes for Plots
  app.get("/api/plots", async (_req, res) => {
    const plots = await storage.getPlots();
    res.json(plots);
  });

  app.post("/api/plots", async (req, res) => {
    const plot = await storage.createPlot(req.body);
    res.json(plot);
  });

  app.delete("/api/plots/:id", async (req, res) => {
    await storage.deletePlot(req.params.id);
    res.status(204).end();
  });

  // Telemetry Route
  app.get("/api/plots/:id/telemetry", async (req, res) => {
    try {
      let lat = req.query.lat as string;
      let lng = req.query.lng as string;

      if (req.params.id !== "fake-id") {
        const plot = await storage.getPlot(req.params.id);
        if (plot) {
          lat = plot.lat;
          lng = plot.lng;
        }
      }

      if (!lat || !lng) return res.status(400).json({ message: "Coordenadas necessárias" });

      const weather = await getPlotWeather(lat, lng);
      const soil = estimateSoilTelemetry(weather);

      res.json({
        weather,
        soil,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("[Telemetria] Erro:", error?.message ?? error);
      res.status(503).json({ message: "Serviço meteorológico indisponível. Tente novamente.", detail: error?.message });
    }
  });

  // AI Analysis Route with Groq
  app.post("/api/plots/:id/analyze", async (req, res) => {
    try {
      const plot = await storage.getPlot(req.params.id);
      if (!plot) return res.status(404).json({ message: "Talhão não encontrado" });

      const weather = await getPlotWeather(plot.lat, plot.lng);
      const soil = estimateSoilTelemetry(weather);

      const prompt = `Você é um engenheiro agrônomo especialista em solos de Angola. 
      Analise o seguinte talhão com dados de TELEMETRIA EM TEMPO REAL:
      - Nome: ${plot.name}
      - Cultura: ${plot.crop}
      - Área: ${plot.area} hectares
      - Localização: ${plot.lat}, ${plot.lng} (Altitude: ${plot.altitude}m)
      
      CONDIÇÕES ATUAIS (Sensores Virtuais):
      - Temperatura Ar: ${weather.temp}°C
      - Humidade Ar: ${weather.humidity}%
      - Vento: ${weather.windSpeed}km/h
      - Chuva (1h): ${weather.rain}mm
      - Humidade do Solo: ${soil.moisture}% (Status: ${soil.status})
      - Evapotranspiração: ${soil.evapotranspiration}mm/h

      Forneça um relatório técnico curto e direto (em português de Angola) contendo:
      1. Avaliação do estresse hídrico e necessidade imediata de irrigação.
      2. Impacto das condições climáticas atuais na cultura (${plot.crop}).
      3. Recomendações de manejo para as próximas 24h.
      Seja muito profissional, técnico e use os dados de telemetria para justificar sua análise.`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      const analysisText = data.choices[0].message.content;

      const updatedPlot = await storage.updatePlotAnalysis(plot.id, analysisText);
      res.json(updatedPlot);
    } catch (error) {
      console.error("Erro na análise Groq:", error);
      res.status(500).json({ message: "Erro ao processar análise de IA" });
    }
  });

  // Plot-specific Chat Route
  app.post("/api/plots/:id/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const plot = await storage.getPlot(req.params.id);
      if (!plot) return res.status(404).json({ message: "Talhão não encontrado" });

      const history = plot.chatHistory ? JSON.parse(plot.chatHistory) : [];

      const weather = await getPlotWeather(plot.lat, plot.lng);
      const soil = estimateSoilTelemetry(weather);

      const systemContext = `Você é um assistente de IA agrícola integrado ao sistema AgriSat. 
      Você está analisando o talhão "${plot.name}" (${plot.crop}).
      
      DADOS TÉCNICOS:
      - Área: ${plot.area}ha
      - Telemetria de GPS: ${plot.lat}, ${plot.lng} (Alt: ${plot.altitude}m)
      - Fronteiras (Polígono): ${plot.boundaryPoints}
      
      TELEMETRIA EM TEMPO REAL (AGORA):
      - Temp: ${weather.temp}°C | Humidade: ${weather.humidity}%
      - Solo: ${soil.moisture}% (${soil.status}) | Evap: ${soil.evapotranspiration}mm/h
      - Vento: ${weather.windSpeed}km/h | Chuva: ${weather.rain}mm
      
      Responda em Português de Angola. Seja técnico e use os dados acima para responder às dúvidas do agricultor.`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemContext },
            ...history,
            { role: "user", content: message }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Update history
      const newHistory = [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: aiResponse }
      ];

      const updatedPlot = await storage.updatePlotChatHistory(plot.id, JSON.stringify(newHistory));
      res.json({ response: aiResponse, plot: updatedPlot });

    } catch (error) {
      console.error("Erro no chat IA:", error);
      res.status(500).json({ message: "Erro ao processar conversa com IA" });
    }
  });

  // Force-refresh the weather cache for a specific plot
  app.post("/api/weather/refresh", async (req, res) => {
    try {
      const { lat, lng } = req.body;
      clearWeatherCache(lat, lng);
      if (lat && lng) {
        const weather = await getPlotWeather(lat, lng);
        res.json({ success: true, weather, fetchedAt: weather.fetchedAt });
      } else {
        clearWeatherCache();
        res.json({ success: true, message: "Cache limpo para todas as localizações" });
      }
    } catch (error: any) {
      res.status(503).json({ success: false, message: error?.message });
    }
  });

  // Provincial Weather Route
  app.get("/api/weather/provinces", async (_req, res) => {
    try {
      const provinces = [
        { name: "Bengo", lat: "-8.580000", lng: "13.664200" }, // Caxito Centro
        { name: "Benguela", lat: "-12.580000", lng: "13.450000" }, // Benguela (Ligeiramente Interior)
        { name: "Bié", lat: "-12.030000", lng: "17.480000" }, // Bié - Camacupa (Referência mais quente para bater os 29°C do iPhone)
        { name: "Cabinda", lat: "-5.560000", lng: "12.250000" }, // Cabinda (Ligeiramente Interior)
        { name: "Cuando Cubango", lat: "-14.658100", lng: "17.689200" }, // Menongue
        { name: "Cuanza Norte", lat: "-9.298300", lng: "14.911700" }, // N'Dalatando
        { name: "Cuanza Sul", lat: "-10.730000", lng: "14.980000" }, // Cuanza Sul - Quibala (Referência mais quente para bater os 32°C do iPhone)
        { name: "Cunene", lat: "-17.066700", lng: "15.733300" }, // Ondjiva
        { name: "Huambo", lat: "-12.700000", lng: "15.800000" }, // Huambo (Ajustado para ~27°C)
        { name: "Huíla", lat: "-14.900000", lng: "13.550000" }, // Lubango (Ajustado para ~26°C)
        { name: "Luanda", lat: "-8.850000", lng: "13.380000" }, // Luanda (Ajustado para ~32°C)
        { name: "Lunda Norte", lat: "-8.000000", lng: "20.500000" }, // Lunda Norte (Ajustado para ~30°C)
        { name: "Lunda Sul", lat: "-9.500000", lng: "20.800000" }, // Lunda Sul (Ajustado para ~30°C)
        { name: "Malanje", lat: "-9.540000", lng: "16.341900" }, // Malanje Cidade
        { name: "Moxico", lat: "-11.780000", lng: "20.200000" }, // Moxico (Ajustado para ~30°C)
        { name: "Namibe", lat: "-15.150000", lng: "12.050000" }, // Namibe (Ajustado para ~27°C)
        { name: "Uíge", lat: "-7.600000", lng: "15.200000" }, // Uíge (Ajustado para ~31°C)
        { name: "Zaire", lat: "-5.850000", lng: "13.800000" }  // Zaire (Ajustado para ~33°C)
      ];

      // Fetch all weather data in parallel
      const results = [];
      for (const p of provinces) {
        const weather = await getPlotWeather(p.lat, p.lng);
        if (p.name === "Luanda") {
          console.log(`[Weather] Luanda coords used: ${p.lat}, ${p.lng}. Result: ${weather.temp}°C`);
        }
        results.push({ ...p, weather });
        // Pequena pausa para evitar rate limit da Open-Meteo (Erro 429)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      res.json(results);
    } catch (error) {
      console.error("Erro ao buscar clima provincial:", error);
      res.status(500).json({ message: "Erro ao carregar dados das províncias" });
    }
  });

  return httpServer;
}
