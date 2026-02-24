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
  createPlot(plot: InsertPlot): Promise<Plot>;
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

  async createPlot(insertPlot: InsertPlot): Promise<Plot> {
    const [plot] = await db.insert(plots).values(insertPlot).returning();
    return plot;
  }

  async deletePlot(id: string): Promise<void> {
    await db.delete(plots).where(eq(plots.id, id));
  }
}

export const storage = new DatabaseStorage();
