import { type User, type InsertUser, type Plot, type InsertPlot, users, plots } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Session Store
  sessionStore: session.Store;

  // Plot methods
  getPlotsByUser(userId: string): Promise<Plot[]>;
  getPlot(id: string): Promise<Plot | undefined>;
  createPlot(plot: InsertPlot & { userId: string }): Promise<Plot>;
  updatePlotAnalysis(id: string, analysis: string): Promise<Plot>;
  updatePlotChatHistory(id: string, history: string): Promise<Plot>;
  deletePlot(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: false,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPlotsByUser(userId: string): Promise<Plot[]> {
    return await db.select().from(plots).where(eq(plots.userId, userId));
  }

  async getPlot(id: string): Promise<Plot | undefined> {
    const [plot] = await db.select().from(plots).where(eq(plots.id, id));
    return plot;
  }

  async createPlot(insertPlot: InsertPlot & { userId: string }): Promise<Plot> {
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
