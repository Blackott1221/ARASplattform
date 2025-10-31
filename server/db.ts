import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const connectionString = process.env.DATABASE_URL;

export const client = postgres(connectionString, {
  max: 1,
  ssl: 'require'
});

export const db = drizzle(client, { schema });
