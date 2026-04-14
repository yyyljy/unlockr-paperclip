import process from "node:process";

import { loadEnvConfig } from "@next/env";
import { Worker } from "bullmq";

import {
  getAnalysisSession,
  persistCandidateProfile,
  getResumeUpload,
  getResumeTextSource,
  markAnalysisRunFailed,
  markAnalysisRunProcessing,
  persistParsedDocument,
  persistTerminalResult,
  updateAnalysisSessionStatus,
} from "@/lib/analysis-sessions";
import { extractCandidateProfile } from "@/lib/candidate-profile";
import { analysisQueueName, createRedisConnection } from "@/lib/queues";
import { generateRecommendationResult } from "@/lib/recommendation-engine";
import {
  buildDirectTextAnalysisInput,
  buildFileUploadAnalysisInput,
  ResumeParseFailure,
} from "@/lib/resume-intake";
import { ModelRecommendationError } from "@/lib/model-backed-recommendations";
import { buildParserFailureResult } from "@/lib/rule-engine";
import { downloadResumeObject } from "@/lib/storage";

loadEnvConfig(process.cwd());

const connection = createRedisConnection();

const worker = new Worker(
  analysisQueueName,
  async (job) => {
    const { analysisRunId, analysisSessionId, sourceType } = job.data;

    try {
      const session = await getAnalysisSession(analysisSessionId);

      if (!session) {
        throw new Error(`Missing analysis session ${analysisSessionId}`);
      }

      if (sourceType === "file_upload") {
        await markAnalysisRunProcessing({
          analysisSessionId,
          analysisRunId,
          status: "parsing",
        });

        try {
          const upload = await getResumeUpload(analysisSessionId);

          if (!upload) {
            throw new Error("Missing uploaded file source");
          }

          let buffer: Buffer;

          try {
            buffer = await downloadResumeObject(upload.storageKey);
          } catch (error) {
            throw new ResumeParseFailure({
              errorCode: "storage_error",
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to read the uploaded file from storage.",
              retryable: true,
              requiredAction: "reupload",
            });
          }

          const analysisInput = await buildFileUploadAnalysisInput({
            buffer,
            contentType: upload.contentType,
            filename: upload.originalFilename,
            candidateLabel: session.candidateLabel,
          });

          await persistParsedDocument({
            analysisSessionId,
            document: analysisInput.document,
          });

          const candidateProfile = extractCandidateProfile(analysisInput);

          await persistCandidateProfile({
            analysisSessionId,
            profile: candidateProfile,
          });

          await updateAnalysisSessionStatus({
            analysisSessionId,
            status: "analyzing",
          });

          const result = await generateRecommendationResult({
            analysisInput,
            profile: candidateProfile,
          });

          await persistTerminalResult({
            analysisSessionId,
            analysisRunId,
            result,
          });

          return result.status;
        } catch (error) {
          if (error instanceof ResumeParseFailure) {
            const result = buildParserFailureResult({
              errorCode: error.errorCode,
              retryable: error.retryable,
              requiredAction: error.requiredAction,
              userMessage: error.message,
            });

            await persistTerminalResult({
              analysisSessionId,
              analysisRunId,
              result,
            });

            return result.status;
          }

          throw error;
        }
      }

      await markAnalysisRunProcessing({
        analysisSessionId,
        analysisRunId,
        status: "analyzing",
      });

      const textSource = await getResumeTextSource(analysisSessionId);

      if (!textSource) {
        throw new Error("Missing pasted text source");
      }

      const analysisInput = buildDirectTextAnalysisInput({
        text: textSource.rawText,
        candidateLabel: session.candidateLabel,
        sourceLabel: textSource.sourceLabel,
      });

      await persistParsedDocument({
        analysisSessionId,
        document: analysisInput.document,
      });

      const candidateProfile = extractCandidateProfile(analysisInput);

      await persistCandidateProfile({
        analysisSessionId,
        profile: candidateProfile,
      });

      const result = await generateRecommendationResult({
        analysisInput,
        profile: candidateProfile,
      });

      await persistTerminalResult({
        analysisSessionId,
        analysisRunId,
        result,
      });

      return result.status;
    } catch (error) {
      await markAnalysisRunFailed({
        analysisSessionId,
        analysisRunId,
        errorCode:
          error instanceof ModelRecommendationError
            ? error.errorCode
            : "worker_processing_failed",
        errorMessage:
          error instanceof Error ? error.message : "Unknown worker failure",
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 4,
  },
);

worker.on("completed", (job, result) => {
  console.log(`completed ${job.id}: ${result}`);
});

worker.on("failed", (job, error) => {
  console.error(`failed ${job?.id ?? "unknown"}:`, error);
});

async function shutdown(signal: string) {
  console.log(`received ${signal}, closing worker`);
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

console.log(`Unlockr worker listening on queue "${analysisQueueName}"`);
