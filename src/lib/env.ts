import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(1).optional(),
);

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
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_BASE_URL: z.url().default("https://api.openai.com/v1"),
  OPENAI_RECOMMENDATION_MODEL: optionalNonEmptyString,
  OPENAI_RECOMMENDATION_PROMPT_VERSION: optionalNonEmptyString,
  OPENAI_RECOMMENDATION_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  CODEX_RECOMMENDATION_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  CODEX_RECOMMENDATION_CLI_PATH: z.string().min(1).default("codex"),
  CODEX_RECOMMENDATION_MODEL: optionalNonEmptyString,
  CODEX_RECOMMENDATION_PROMPT_VERSION: z
    .string()
    .min(1)
    .default("phase2-codex-local-v1"),
  CODEX_RECOMMENDATION_TIMEOUT_MS: z.coerce.number().int().positive().default(180000),
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
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_RECOMMENDATION_MODEL: process.env.OPENAI_RECOMMENDATION_MODEL,
    OPENAI_RECOMMENDATION_PROMPT_VERSION:
      process.env.OPENAI_RECOMMENDATION_PROMPT_VERSION,
    OPENAI_RECOMMENDATION_TIMEOUT_MS: process.env.OPENAI_RECOMMENDATION_TIMEOUT_MS,
    CODEX_RECOMMENDATION_ENABLED: process.env.CODEX_RECOMMENDATION_ENABLED,
    CODEX_RECOMMENDATION_CLI_PATH: process.env.CODEX_RECOMMENDATION_CLI_PATH,
    CODEX_RECOMMENDATION_MODEL: process.env.CODEX_RECOMMENDATION_MODEL,
    CODEX_RECOMMENDATION_PROMPT_VERSION:
      process.env.CODEX_RECOMMENDATION_PROMPT_VERSION,
    CODEX_RECOMMENDATION_TIMEOUT_MS: process.env.CODEX_RECOMMENDATION_TIMEOUT_MS,
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
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_RECOMMENDATION_MODEL: process.env.OPENAI_RECOMMENDATION_MODEL,
    OPENAI_RECOMMENDATION_PROMPT_VERSION:
      process.env.OPENAI_RECOMMENDATION_PROMPT_VERSION,
    OPENAI_RECOMMENDATION_TIMEOUT_MS: process.env.OPENAI_RECOMMENDATION_TIMEOUT_MS,
    CODEX_RECOMMENDATION_ENABLED: process.env.CODEX_RECOMMENDATION_ENABLED,
    CODEX_RECOMMENDATION_CLI_PATH: process.env.CODEX_RECOMMENDATION_CLI_PATH,
    CODEX_RECOMMENDATION_MODEL: process.env.CODEX_RECOMMENDATION_MODEL,
    CODEX_RECOMMENDATION_PROMPT_VERSION:
      process.env.CODEX_RECOMMENDATION_PROMPT_VERSION,
    CODEX_RECOMMENDATION_TIMEOUT_MS: process.env.CODEX_RECOMMENDATION_TIMEOUT_MS,
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
