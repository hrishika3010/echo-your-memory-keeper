import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  PHOTON_PROJECT_ID: z.string().min(1),
  PHOTON_PROJECT_SECRET: z.string().min(1),
  GMI_API_KEY: z.string().min(1),
  GMI_ORG_ID: z.string().optional(),
  GMI_IMAGE_EDIT_MODEL: z.string().default("gpt-image-2-edit"),
  GMI_BASE_URL: z.string().url().default("https://api.gmi-serving.com/v1"),
  GMI_IMAGE_EDIT_PATH: z.string().default("/images/edits"),
  HYDRADB_API_KEY: z.string().min(1),
  HYDRADB_TENANT_ID: z.string().min(1)
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(): Env {
  return envSchema.parse(process.env);
}
