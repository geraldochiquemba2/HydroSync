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

  return httpServer;
}
