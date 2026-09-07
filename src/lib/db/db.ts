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

const isSSL =
  process.env.DB_SSL === "true" ||
  (connectionString ? connectionString.includes("sslmode=require") || connectionString.includes("neon.tech") || connectionString.includes("pooler") : false);

const pool = new pg.Pool({
  connectionString: connectionString || undefined,
  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
