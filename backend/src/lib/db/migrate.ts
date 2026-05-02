import { Pool } from "pg";

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { readEnv } from "../config/env.js";

const env = readEnv();
const pool = new Pool({ connectionString: env.DATABASE_URL });

try {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sql = await readFile(resolve(currentDir, "../../../drizzle/0000_init.sql"), "utf8");
  await pool.query(sql);
  console.log("Applied The Roll schema.");
} finally {
  await pool.end();
}
