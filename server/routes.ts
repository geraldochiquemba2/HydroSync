import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlotSchema } from "@shared/schema";
import { getPlotWeather, clearWeatherCache } from "./services/weatherService";
import { estimateSoilTelemetry } from "./services/soilSimulationService";
import { getAgronomicContext } from "./services/agronomyService";
import { setupAuth } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  // put application routes here
  // prefix all routes with /api

  // API Routes for Plots
  app.get("/api/plots", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const plots = await storage.getPlotsByUser(req.user!.id);
    res.json(plots);
  });

  app.post("/api/plots", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const plotData = insertPlotSchema.parse(req.body);
      const plot = await storage.createPlot({
        ...plotData,
        userId: req.user!.id,
        health: plotData.health || (Math.floor(Math.random() * (95 - 75 + 1)) + 75).toString(),
        plantingDate: req.body.plantingDate || null
      });
      res.json(plot);
    } catch (err: any) {
      res.status(400).json({ message: "Dados inválidos", detail: err.errors || err.message });
    }
  });

  app.delete("/api/plots/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const plot = await storage.getPlot(req.params.id);
    if (!plot || plot.userId !== req.user!.id) {
      return res.status(404).json({ message: "Talhão não encontrado ou acesso negado" });
    }
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
          // Check ownership if authenticated
          if (req.isAuthenticated() && plot.userId !== req.user!.id) {
            return res.status(403).json({ message: "Acesso negado ao talhão" });
          }
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const plot = await storage.getPlot(req.params.id);
      if (!plot || plot.userId !== req.user!.id) {
        return res.status(404).json({ message: "Talhão não encontrado ou acesso negado" });
      }

      const weather = await getPlotWeather(plot.lat, plot.lng);
      const soil = estimateSoilTelemetry(weather);
      const agronomicContext = getAgronomicContext(plot.crop, weather.province, plot.plantingDate);

      const prompt = `Você é um engenheiro agrônomo sênior especialista em solos de Angola. 
      Analise o seguinte talhão com dados de TELEMETRIA EM TEMPO REAL e CONTEXTO AGRONÓMICO:
      - Nome: ${plot.name}
      - Cultura: ${plot.crop}
      - Área: ${plot.area} hectares
      - Localização: ${plot.lat}, ${plot.lng} (Província: ${weather.province}, Altitude: ${plot.altitude}m)
      - Data de Plantio: ${plot.plantingDate || "Não informada"}
      - Fase de Crescimento: ${agronomicContext.growthStage}
      
      CONDIÇÕES AMBIENTAIS:
      - Temperatura Ar: ${weather.temp}°C | Humidade Ar: ${weather.humidity}%
      - Chuva (1h): ${weather.rain}mm | Vento: ${weather.windSpeed}km/h
      - Humidade do Solo: ${soil.moisture}% (Status: ${soil.status})
      
      CONTEXTO TÉCNICO E CALENDÁRIO:
      - Calendário: ${agronomicContext.calendar}
      - Notas Técnicas para a Fase: ${agronomicContext.technicalTips}

      Forneça um relatório técnico curto, direto e SUPER INTELIGENTE. 
      Use o calendário para dizer se o agricultor está na janela certa e a fase de crescimento para dar conselhos exatos para este momento.`;

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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { message } = req.body;
      const plot = await storage.getPlot(req.params.id);
      if (!plot || plot.userId !== req.user!.id) {
        return res.status(404).json({ message: "Talhão não encontrado ou acesso negado" });
      }

      const history = plot.chatHistory ? JSON.parse(plot.chatHistory) : [];

      const weather = await getPlotWeather(plot.lat, plot.lng);
      const soil = estimateSoilTelemetry(weather);
      const agronomicContext = getAgronomicContext(plot.crop, weather.province, plot.plantingDate);

      const systemContext = `Você é um assistente de IA agrícola integrado ao sistema AgriSat. 
      Você está analisando o talhão "${plot.name}" (${plot.crop}).
      
      DADOS TÉCNICOS:
      - Área: ${plot.area}ha
      - Telemetria de GPS: ${plot.lat}, ${plot.lng} (Província: ${weather.province}, Alt: ${plot.altitude}m)
      - Data de Plantio: ${plot.plantingDate || "Não informada"}
      - Fase de Crescimento: ${agronomicContext.growthStage}
      
      TELEMETRIA EM TEMPO REAL:
      - Temp: ${weather.temp}°C | Humidade: ${weather.humidity}%
      - Solo: ${soil.moisture}% (${soil.status})
      - Vento: ${weather.windSpeed}km/h | Chuva: ${weather.rain}mm
      
      CONTEXTO AGRONÓMICO:
      - Calendário Local: ${agronomicContext.calendar}
      - Orientações Específicas: ${agronomicContext.technicalTips}
      
      Responda em Português de Angola. Seja técnico e use os dados acima para responder às dúvidas do agricultor de forma supra-contextualizada.`;

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

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Erro da API Groq:", errorData);
        return res.status(502).json({ message: "Erro na API da IA: " + response.statusText });
      }

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

  // Global AI Chat Route
  app.post("/api/ai/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { message, history = [], weatherContext = [] } = req.body;
      const plots = await storage.getPlotsByUser(req.user!.id);

      // Enhance plots context with agronomic analysis
      const enhancedPlots = plots.map(p => {
        // Find weather based on province if available in context, or use default
        const pWeather = weatherContext.find((w: any) => w.id === p.id) || { name: "Desconhecida" };
        const agronomic = getAgronomicContext(p.crop, pWeather.name, p.plantingDate);
        return `${p.name} (Cultura: ${p.crop}, Área: ${p.area}ha, Saúde: ${p.health}%, Fase: ${agronomic.growthStage}, Calendário: ${agronomic.calendar})`;
      });

      const systemContext = `Você é o assistente Agrosatelite IA, um engenheiro agrônomo sênior especialista em Angola.
      Você tem acesso total aos dados técnicos e ao calendário agrícola do agricultor ${req.user!.name}.
      
      ESTADO DETALHADO DOS TALHÕES:
      - Talhões Registrados: ${plots.length}
      - Análise de Contexto: ${enhancedPlots.join(' | ')}
      
      METEOROLOGIA GERAL:
      ${weatherContext.map((w: any) => `${w.name}: ${w.temp}°C, ${w.description}`).join(' | ')}
      
      PODERES DE ANÁLISE:
      1. Você sabe exatamente se o plantio foi feito na janela certa.
      2. Você conhece as pragas e necessidades de cada fase de crescimento citada acima.
      3. Você cruza o clima local com a saúde do talhão para dar avisos proativos.
      
      Responda em Português de Angola. Seja técnico, sênior e extremamente preciso nas recomendações.`;

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

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Erro da API Groq:", errorData);
        return res.status(502).json({ message: "Erro na API da IA: " + response.statusText });
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Erro no Global AI Chat:", error);
      res.status(500).json({ message: "Erro ao processar sua solicitação com a IA" });
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
        { name: "Namibe", lat: "-15.050000", lng: "12.300000" }, // Namibe (Ajustado para ~27°C)
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
