import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).extend({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  phone: z.string().regex(/^9[0-9]{8}$/, "Número de telemóvel inválido. Use o formato 9xxxxxxxx."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
}).pick({
  name: true,
  phone: true,
  password: true,
});

export const plots = pgTable("plots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Relacionamento com usuário
  name: text("name").notNull(),
  crop: text("crop").notNull(),
  area: text("area").notNull(),
  health: text("health"), // Made nullable
  lat: text("lat").notNull(),
  lng: text("lng").notNull(),
  altitude: text("altitude").notNull(),
  boundaryPoints: text("boundary_points"), // Armazena como JSON string
  analysis: text("analysis"), // Resultado da análise Groq AI
  chatHistory: text("chat_history"), // JSON array de mensagens do chat
  plantingDate: text("planting_date"), // ISO string de data de plantio
});

export const insertPlotSchema = createInsertSchema(plots).omit({
  id: true,
  userId: true, // Injetado pelo servidor a partir da sessão
});

export type InsertPlot = z.infer<typeof insertPlotSchema>;
export type Plot = typeof plots.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
