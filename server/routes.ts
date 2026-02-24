import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getPlotWeather } from "./services/weatherService";
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
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter telemetria" });
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

  // Provincial Weather Route
  app.get("/api/weather/provinces", async (_req, res) => {
    try {
      const provinces = [
        { name: "Bengo", lat: "-8.6", lng: "13.6" },
        { name: "Benguela", lat: "-12.58", lng: "13.4" },
        { name: "Bié", lat: "-12.38", lng: "16.94" },
        { name: "Cabinda", lat: "-5.55", lng: "12.2" },
        { name: "Cuando Cubango", lat: "-14.65", lng: "17.68" },
        { name: "Cuanza Norte", lat: "-9.3", lng: "14.9" },
        { name: "Cuanza Sul", lat: "-11.17", lng: "13.84" },
        { name: "Cunene", lat: "-17.07", lng: "15.74" },
        { name: "Huambo", lat: "-12.77", lng: "15.73" },
        { name: "Huíla", lat: "-14.92", lng: "13.5" },
        { name: "Luanda", lat: "-8.84", lng: "13.23" },
        { name: "Lunda Norte", lat: "-8.41", lng: "20.91" },
        { name: "Lunda Sul", lat: "-9.66", lng: "20.39" },
        { name: "Malanje", lat: "-9.54", lng: "16.34" },
        { name: "Moxico", lat: "-11.78", lng: "19.91" },
        { name: "Namibe", lat: "-15.2", lng: "12.15" },
        { name: "Uíge", lat: "-7.61", lng: "15.05" },
        { name: "Zaire", lat: "-6.27", lng: "14.24" }
      ];

      // Fetch all weather data in parallel
      const results = await Promise.all(provinces.map(async (p) => {
        const weather = await getPlotWeather(p.lat, p.lng);
        return { ...p, weather };
      }));

      res.json(results);
    } catch (error) {
      console.error("Erro ao buscar clima provincial:", error);
      res.status(500).json({ message: "Erro ao carregar dados das províncias" });
    }
  });

  return httpServer;
}
