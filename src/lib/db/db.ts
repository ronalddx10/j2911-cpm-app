import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  if (!isBuildPhase) {
    throw new Error("CRITICAL: DATABASE_URL environment variable is required.");
  }
}

const pool = new pg.Pool({
  connectionString: connectionString || undefined,
  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

export const db = drizzle(pool, { schema });
