import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  RECOMMENDATION_CONTRACT_VERSION: z.string().min(1),
  RECOMMENDATION_PARSER_VERSION: z.string().min(1),
  RECOMMENDATION_MODEL_PROVIDER: z.string().min(1),
  RECOMMENDATION_MODEL_VERSION: z.string().min(1),
  RECOMMENDATION_PROMPT_VERSION: z.string().min(1),
  RECOMMENDATION_TAXONOMY_VERSION: z.string().min(1),
});

export type ServerEnv = z.infer<typeof envSchema>;

export function getServerEnv() {
  return envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    RECOMMENDATION_CONTRACT_VERSION: process.env.RECOMMENDATION_CONTRACT_VERSION,
    RECOMMENDATION_PARSER_VERSION: process.env.RECOMMENDATION_PARSER_VERSION,
    RECOMMENDATION_MODEL_PROVIDER: process.env.RECOMMENDATION_MODEL_PROVIDER,
    RECOMMENDATION_MODEL_VERSION: process.env.RECOMMENDATION_MODEL_VERSION,
    RECOMMENDATION_PROMPT_VERSION: process.env.RECOMMENDATION_PROMPT_VERSION,
    RECOMMENDATION_TAXONOMY_VERSION: process.env.RECOMMENDATION_TAXONOMY_VERSION,
  });
}

export function getServerEnvStatus() {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    RECOMMENDATION_CONTRACT_VERSION: process.env.RECOMMENDATION_CONTRACT_VERSION,
    RECOMMENDATION_PARSER_VERSION: process.env.RECOMMENDATION_PARSER_VERSION,
    RECOMMENDATION_MODEL_PROVIDER: process.env.RECOMMENDATION_MODEL_PROVIDER,
    RECOMMENDATION_MODEL_VERSION: process.env.RECOMMENDATION_MODEL_VERSION,
    RECOMMENDATION_PROMPT_VERSION: process.env.RECOMMENDATION_PROMPT_VERSION,
    RECOMMENDATION_TAXONOMY_VERSION: process.env.RECOMMENDATION_TAXONOMY_VERSION,
  });

  if (parsed.success) {
    return {
      ok: true as const,
      missingKeys: [] as string[],
    };
  }

  const missingKeys = parsed.error.issues
    .map((issue) => issue.path.join("."))
    .filter((value, index, array) => array.indexOf(value) === index);

  return {
    ok: false as const,
    missingKeys,
  };
}
