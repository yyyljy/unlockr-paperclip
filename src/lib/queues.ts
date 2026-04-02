import { Queue } from "bullmq";
import IORedis from "ioredis";

import { getServerEnv } from "@/lib/env";

export const analysisQueueName = "analysis-sessions";

export type AnalysisJobPayload = {
  analysisSessionId: string;
  analysisRunId: string;
  sourceType: "file_upload" | "pasted_text";
};

export function createRedisConnection() {
  const env = getServerEnv();

  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function enqueueAnalysisJob(payload: AnalysisJobPayload) {
  const connection = createRedisConnection();
  const queue = new Queue<AnalysisJobPayload>(analysisQueueName, {
    connection,
  });

  try {
    const job = await queue.add("process-analysis-session", payload, {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: 500,
    });

    return job;
  } finally {
    await queue.close();
    await connection.quit();
  }
}

export async function pingRedis() {
  const connection = createRedisConnection();

  try {
    return await connection.ping();
  } finally {
    await connection.quit();
  }
}
