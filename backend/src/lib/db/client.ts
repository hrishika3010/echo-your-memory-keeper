import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

export type RollDatabase = ReturnType<typeof createDatabase>;

export function createPgPool(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl
  });
}

export function createDatabase(pool: Pool) {
  return drizzle(pool, { schema });
}
