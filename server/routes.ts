import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  // AI Analysis Route with Groq
  app.post("/api/plots/:id/analyze", async (req, res) => {
    try {
      const plot = await storage.getPlot(req.params.id);
      if (!plot) return res.status(404).json({ message: "Talhão não encontrado" });

      const prompt = `Você é um engenheiro agrônomo especialista em solos de Angola. 
      Analise o seguinte talhão:
      - Nome: ${plot.name}
      - Cultura: ${plot.crop}
      - Área: ${plot.area} hectares
      - Coordenadas: ${plot.lat}, ${plot.lng}
      - Altitude: ${plot.altitude} metros

      Forneça um relatório técnico curto e direto (em português de Angola) contendo:
      1. Viabilidade da cultura (${plot.crop}) para esta altitude e localização.
      2. Recomendações de adubação e correção de solo.
      3. Sugestão de ciclo de plantio ideal.
      Seja muito profissional e técnico.`;

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

      const systemContext = `Você é um assistente agronômico inteligente da plataforma AgriSat. 
      Você está analisando o talhão "${plot.name}".
      DADOS TÉCNICOS VISUAIS:
      - Cultura: ${plot.crop}
      - Localização: ${plot.lat}, ${plot.lng} (Angola)
      - Altitude: ${plot.altitude}m
      - Área: ${plot.area}ha
      - Limites (Polígono): ${plot.boundaryPoints}
      
      Use esses dados para "visualizar" o terreno e responder dúvidas técnicas do produtor. 
      Lembre-se do contexto anterior da conversa. Seja prestativo e técnico.`;

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

  return httpServer;
}
