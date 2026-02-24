import { type User, type InsertUser, type Plot, type InsertPlot, users, plots } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Plot methods
  getPlots(): Promise<Plot[]>;
  getPlot(id: string): Promise<Plot | undefined>;
  createPlot(plot: InsertPlot): Promise<Plot>;
  updatePlotAnalysis(id: string, analysis: string): Promise<Plot>;
  updatePlotChatHistory(id: string, history: string): Promise<Plot>;
  deletePlot(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPlots(): Promise<Plot[]> {
    return await db.select().from(plots);
  }

  async getPlot(id: string): Promise<Plot | undefined> {
    const [plot] = await db.select().from(plots).where(eq(plots.id, id));
    return plot;
  }

  async createPlot(insertPlot: InsertPlot): Promise<Plot> {
    const [plot] = await db.insert(plots).values(insertPlot).returning();
    return plot;
  }

  async updatePlotAnalysis(id: string, analysis: string): Promise<Plot> {
    const [plot] = await db.update(plots)
      .set({ analysis })
      .where(eq(plots.id, id))
      .returning();
    return plot;
  }

  async updatePlotChatHistory(id: string, chatHistory: string): Promise<Plot> {
    const [plot] = await db.update(plots)
      .set({ chatHistory })
      .where(eq(plots.id, id))
      .returning();
    return plot;
  }

  async deletePlot(id: string): Promise<void> {
    await db.delete(plots).where(eq(plots.id, id));
  }
}

export const storage = new DatabaseStorage();
