import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL: DATABASE_URL environment variable is required in production.");
  }
}

const pool = new pg.Pool({
  connectionString: connectionString || "postgres://postgres:postgres@localhost:5432/itadakimasu_db",
  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
