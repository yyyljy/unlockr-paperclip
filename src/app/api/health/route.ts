import { pingDatabase } from "@/lib/db/client";
import { getServerEnvStatus } from "@/lib/env";
import { pingRedis } from "@/lib/queues";
import { pingStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const envStatus = getServerEnvStatus();

  if (!envStatus.ok) {
    return Response.json(
      {
        ok: false,
        env: envStatus,
      },
      {
        status: 500,
      },
    );
  }

  const [database, redis, storage] = await Promise.allSettled([
    pingDatabase(),
    pingRedis(),
    pingStorage(),
  ]);

  const ok =
    database.status === "fulfilled" &&
    redis.status === "fulfilled" &&
    storage.status === "fulfilled";

  return Response.json(
    {
      ok,
      env: envStatus,
      services: {
        database:
          database.status === "fulfilled"
            ? { ok: true, detail: database.value }
            : {
                ok: false,
                error:
                  database.reason instanceof Error
                    ? database.reason.message
                    : "Database ping failed",
              },
        redis:
          redis.status === "fulfilled"
            ? { ok: true, detail: redis.value }
            : {
                ok: false,
                error:
                  redis.reason instanceof Error
                    ? redis.reason.message
                    : "Redis ping failed",
              },
        storage:
          storage.status === "fulfilled"
            ? { ok: true, detail: storage.value }
            : {
                ok: false,
                error:
                  storage.reason instanceof Error
                    ? storage.reason.message
                    : "Storage ping failed",
              },
      },
    },
    {
      status: ok ? 200 : 503,
    },
  );
}
