import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres_secure_password_123@localhost:5432/itadakimasu_db";

const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
