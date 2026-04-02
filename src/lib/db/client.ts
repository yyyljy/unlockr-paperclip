import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

declare global {
  var __unlockrSqlClient: postgres.Sql | undefined;
}

export function getSqlClient() {
  if (!globalThis.__unlockrSqlClient) {
    const env = getServerEnv();

    globalThis.__unlockrSqlClient = postgres(env.DATABASE_URL, {
      max: env.NODE_ENV === "development" ? 1 : 10,
    });
  }

  return globalThis.__unlockrSqlClient;
}

export function getDb() {
  return drizzle(getSqlClient(), {
    schema,
  });
}

export async function pingDatabase() {
  const sql = getSqlClient();
  const result = await sql`select 1 as ok`;

  return result[0];
}
