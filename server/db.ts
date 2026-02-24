import { drizzle } from 'drizzle-orm/pg-proxy';
import pg from 'pg';
import * as schema from "@shared/schema";
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
    );
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzleNode(pool, { schema });
