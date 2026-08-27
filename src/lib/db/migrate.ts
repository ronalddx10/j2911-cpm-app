import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import path from "path";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres_secure_password_123@localhost:5432/itadakimasu_db";

async function main() {
  console.log("Starting database migrations...");
  const client = new pg.Client({ connectionString });
  await client.connect();
  
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
