import { createHash, randomUUID } from "node:crypto";

import { desc, eq, inArray, type InferSelectModel } from "drizzle-orm";

import type { CandidateProfile } from "@/lib/candidate-profile";
import type { AnalysisResult } from "@/lib/contracts/recommendations";
import { getDb } from "@/lib/db/client";
import {
  analysisRuns,
  analysisSessions,
  candidateProfiles,
  careerRecommendationSets,
  careerRecommendations,
  feedbackEvents,
  parsedDocuments,
  recommendationEvidence,
  resumeTextSources,
  resumeUploads,
} from "@/lib/db/schema";
import { enqueueAnalysisJob } from "@/lib/queues";
import type { ParsedResumeDocument } from "@/lib/resume-intake";
import { deleteResumeObject, uploadResumeObject } from "@/lib/storage";

export const maxResumeFileBytes = 8 * 1024 * 1024;
export const minResumeTextLength = 40;
export const maxResumeTextLength = 12000;
export const minRecoveryClarificationLength = 12;
export const maxRecoveryClarificationLength = 4000;

export const supportedResumeMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

type QueueableSessionInput = {
  sourceType: "file_upload" | "pasted_text";
  candidateLabel?: string | null;
  resumeText?: string;
  resumeTextSourceLabel?: string;
  retriedFromAnalysisSessionId?: string | null;
  file?: File;
};

export type RecoveryAnalysisSessionInput =
  | {
      sourceSessionId: string;
      mode: "clarification";
      clarificationText: string;
    }
  | {
      sourceSessionId: string;
      mode: "pasted_text";
      resumeText: string;
    }
  | {
      sourceSessionId: string;
      mode: "file_upload";
      file: File;
    };

export class RecoverySessionError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "RecoverySessionError";
    this.statusCode = statusCode;
  }
}

export type SessionSnapshot = {
  session: InferSelectModel<typeof analysisSessions>;
  latestRun: InferSelectModel<typeof analysisRuns> | null;
  recommendationSet: InferSelectModel<typeof careerRecommendationSets> | null;
  result: AnalysisResult | null;
  candidateProfile: CandidateProfile | null;
  feedbackEvent: InferSelectModel<typeof feedbackEvents> | null;
  retriedFromSession: InferSelectModel<typeof analysisSessions> | null;
  recoverySessions: InferSelectModel<typeof analysisSessions>[];
};

export type RecentAnalysisSessionRecord = {
  session: InferSelectModel<typeof analysisSessions>;
  feedbackEvent: InferSelectModel<typeof feedbackEvents> | null;
  retriedFromSession: InferSelectModel<typeof analysisSessions> | null;
};

export const operatorHealthOutcomeStatuses = [
  "ready",
  "insufficient_evidence",
  "parser_failure",
  "failed",
] as const;

type OperatorHealthOutcomeStatus = (typeof operatorHealthOutcomeStatuses)[number];

export type OperatorProblemSessionRecord = RecentAnalysisSessionRecord & {
  completionDurationMs: number | null;
  recoveryAttemptCount: number;
};

export type OperatorHealthSnapshot = {
  windowSize: number;
  outcomeCounts: Record<OperatorHealthOutcomeStatus, number>;
  inFlightCount: number;
  completedCount: number;
  medianCompletionMs: number | null;
  averageCompletionMs: number | null;
  slowestSession: {
    id: string;
    candidateLabel: string | null;
    durationMs: number;
    status: InferSelectModel<typeof analysisSessions>["status"];
  } | null;
  problemSessions: OperatorProblemSessionRecord[];
};

export type OperatorReviewSnapshot = {
  recentSessions: RecentAnalysisSessionRecord[];
  healthSnapshot: OperatorHealthSnapshot;
};

export async function createQueuedAnalysisSession(input: QueueableSessionInput) {
  const db = getDb();
  const now = new Date();
  const sessionId = randomUUID();
  let uploadedObjectKey: string | null = null;

  try {
    const sourcePayload =
      input.sourceType === "file_upload" && input.file
        ? await persistFileSource({
            sessionId,
            file: input.file,
          })
        : null;

    const analysisRun = await db.transaction(async (tx) => {
      await tx.insert(analysisSessions).values({
        id: sessionId,
        sourceType: input.sourceType,
        retriedFromAnalysisSessionId: input.retriedFromAnalysisSessionId ?? null,
        status: "queued",
        candidateLabel: input.candidateLabel?.trim() || null,
        createdAt: now,
        updatedAt: now,
      });

      if (input.sourceType === "pasted_text") {
        await tx.insert(resumeTextSources).values({
          analysisSessionId: sessionId,
          rawText: input.resumeText ?? "",
          sourceLabel: input.resumeTextSourceLabel ?? "pasted_text",
        });
      }

      if (sourcePayload) {
        uploadedObjectKey = sourcePayload.storageKey;

        await tx.insert(resumeUploads).values({
          analysisSessionId: sessionId,
          originalFilename: sourcePayload.originalFilename,
          contentType: sourcePayload.contentType,
          sizeBytes: sourcePayload.sizeBytes,
          storageKey: sourcePayload.storageKey,
          sha256: sourcePayload.sha256,
        });
      }

      const [createdRun] = await tx
        .insert(analysisRuns)
        .values({
          analysisSessionId: sessionId,
          stage: input.sourceType === "file_upload" ? "parse" : "recommend",
          status: "queued",
        })
        .returning();

      return createdRun;
    });

    try {
      const job = await enqueueAnalysisJob({
        analysisSessionId: sessionId,
        analysisRunId: analysisRun.id,
        sourceType: input.sourceType,
      });

      await db
        .update(analysisRuns)
        .set({
          queueJobId: job.id?.toString() ?? null,
        })
        .where(eq(analysisRuns.id, analysisRun.id));

      return {
        sessionId,
        analysisRunId: analysisRun.id,
        queueJobId: job.id?.toString() ?? null,
      };
    } catch (error) {
      await db
        .update(analysisSessions)
        .set({
          status: "failed",
          latestErrorCode: "queue_enqueue_failed",
          latestErrorMessage:
            error instanceof Error ? error.message : "Unknown queue error",
          updatedAt: new Date(),
        })
        .where(eq(analysisSessions.id, sessionId));

      throw error;
    }
  } catch (error) {
    if (uploadedObjectKey) {
      await deleteResumeObject(uploadedObjectKey).catch(() => null);
    }

    throw error;
  }
}

export async function createRecoveryAnalysisSession(
  input: RecoveryAnalysisSessionInput,
) {
  const sourceSession = await getAnalysisSession(input.sourceSessionId);

  if (!sourceSession) {
    throw new RecoverySessionError("Session not found.", 404);
  }

  switch (sourceSession.status) {
    case "insufficient_evidence":
      return createInsufficientEvidenceRecoverySession({
        sourceSession,
        input,
      });
    case "parser_failure":
      return createParserFailureRecoverySession({
        sourceSession,
        input,
      });
    default:
      throw new RecoverySessionError(
        "Only insufficient-evidence or parser-failure sessions can start the recovery flow.",
        409,
      );
  }
}

async function persistFileSource(input: { sessionId: string; file: File }) {
  if (!supportedResumeMimeTypes.has(input.file.type)) {
    throw new Error(`Unsupported file type: ${input.file.type || "unknown"}`);
  }

  if (input.file.size > maxResumeFileBytes) {
    throw new Error(`File size exceeds ${maxResumeFileBytes} bytes`);
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const uploadedObject = await uploadResumeObject({
    sessionId: input.sessionId,
    filename: input.file.name,
    buffer,
    contentType: input.file.type,
  });

  return {
    storageKey: uploadedObject.key,
    originalFilename: input.file.name,
    contentType: input.file.type,
    sizeBytes: input.file.size,
    sha256,
  };
}

export async function loadSessionSnapshot(sessionId: string) {
  const db = getDb();

  const [session] = await db
    .select()
    .from(analysisSessions)
    .where(eq(analysisSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return null;
  }

  const [
    latestRun,
    recommendationSet,
    candidateProfile,
    feedbackEvent,
    retriedFromSession,
    recoverySessions,
  ] = await Promise.all([
    db
      .select()
      .from(analysisRuns)
      .where(eq(analysisRuns.analysisSessionId, sessionId))
      .orderBy(desc(analysisRuns.createdAt))
      .limit(1)
      .then(([record]) => record ?? null),
    db
      .select()
      .from(careerRecommendationSets)
      .where(eq(careerRecommendationSets.analysisSessionId, sessionId))
      .orderBy(desc(careerRecommendationSets.createdAt))
      .limit(1)
      .then(([record]) => record ?? null),
    db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.analysisSessionId, sessionId))
      .orderBy(desc(candidateProfiles.createdAt))
      .limit(1)
      .then(([record]) => record ?? null),
    db
      .select()
      .from(feedbackEvents)
      .where(eq(feedbackEvents.analysisSessionId, sessionId))
      .limit(1)
      .then(([record]) => record ?? null),
    session.retriedFromAnalysisSessionId
      ? db
          .select()
          .from(analysisSessions)
          .where(eq(analysisSessions.id, session.retriedFromAnalysisSessionId))
          .limit(1)
          .then(([record]) => record ?? null)
      : Promise.resolve(null),
    db
      .select()
      .from(analysisSessions)
      .where(eq(analysisSessions.retriedFromAnalysisSessionId, sessionId))
      .orderBy(desc(analysisSessions.createdAt)),
  ]);

  return {
    session,
    latestRun,
    recommendationSet,
    result: (recommendationSet?.payload as AnalysisResult | null) ?? null,
    candidateProfile: candidateProfile?.payload ?? null,
    feedbackEvent,
    retriedFromSession,
    recoverySessions,
  } satisfies SessionSnapshot;
}

export async function listRecentAnalysisSessions(
  limitCount = 25,
): Promise<RecentAnalysisSessionRecord[]> {
  const db = getDb();
  const rows = await db
    .select({
      session: analysisSessions,
      feedbackEvent: feedbackEvents,
    })
    .from(analysisSessions)
    .leftJoin(feedbackEvents, eq(feedbackEvents.analysisSessionId, analysisSessions.id))
    .orderBy(desc(analysisSessions.updatedAt), desc(analysisSessions.createdAt))
    .limit(limitCount);

  const retriedFromIds = Array.from(
    new Set(
      rows
        .map(({ session }) => session.retriedFromAnalysisSessionId)
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
    ),
  );

  const retriedFromSessions =
    retriedFromIds.length > 0
      ? await db
          .select()
          .from(analysisSessions)
          .where(inArray(analysisSessions.id, retriedFromIds))
      : [];
  const retriedFromById = new Map(
    retriedFromSessions.map((session) => [session.id, session]),
  );

  return rows.map(({ session, feedbackEvent }) => ({
    session,
    feedbackEvent: feedbackEvent ?? null,
    retriedFromSession: session.retriedFromAnalysisSessionId
      ? retriedFromById.get(session.retriedFromAnalysisSessionId) ?? null
      : null,
  }));
}

export async function loadOperatorReviewSnapshot(
  limitCount = 25,
): Promise<OperatorReviewSnapshot> {
  const recentSessions = await listRecentAnalysisSessions(limitCount);
  const outcomeCounts = {
    ready: 0,
    insufficient_evidence: 0,
    parser_failure: 0,
    failed: 0,
  } satisfies Record<OperatorHealthOutcomeStatus, number>;
  const recoveryAttemptCounts = new Map<string, number>();
  const completedDurations: Array<{
    session: RecentAnalysisSessionRecord["session"];
    durationMs: number;
  }> = [];
  let inFlightCount = 0;

  for (const entry of recentSessions) {
    if (entry.session.retriedFromAnalysisSessionId) {
      recoveryAttemptCounts.set(
        entry.session.retriedFromAnalysisSessionId,
        (recoveryAttemptCounts.get(entry.session.retriedFromAnalysisSessionId) ?? 0) + 1,
      );
    }

    switch (entry.session.status) {
      case "ready":
      case "insufficient_evidence":
      case "parser_failure":
      case "failed":
        outcomeCounts[entry.session.status] += 1;
        break;
      default:
        inFlightCount += 1;
        break;
    }

    const completionDurationMs = getCompletionDurationMs(entry.session);

    if (completionDurationMs !== null) {
      completedDurations.push({
        session: entry.session,
        durationMs: completionDurationMs,
      });
    }
  }

  const sortedDurations = completedDurations
    .map(({ durationMs }) => durationMs)
    .sort((left, right) => left - right);
  const averageCompletionMs =
    sortedDurations.length > 0
      ? Math.round(
          sortedDurations.reduce((total, durationMs) => total + durationMs, 0) /
            sortedDurations.length,
        )
      : null;
  const medianCompletionMs = getMedianDurationMs(sortedDurations);
  const slowestSession = completedDurations.reduce<OperatorHealthSnapshot["slowestSession"]>(
    (slowest, current) => {
      if (!slowest || current.durationMs > slowest.durationMs) {
        return {
          id: current.session.id,
          candidateLabel: current.session.candidateLabel,
          durationMs: current.durationMs,
          status: current.session.status,
        };
      }

      return slowest;
    },
    null,
  );

  const problemSessions = recentSessions
    .filter(({ session }) => {
      switch (session.status) {
        case "insufficient_evidence":
        case "parser_failure":
        case "failed":
          return true;
        default:
          return false;
      }
    })
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      completionDurationMs: getCompletionDurationMs(entry.session),
      recoveryAttemptCount: recoveryAttemptCounts.get(entry.session.id) ?? 0,
    }));

  return {
    recentSessions,
    healthSnapshot: {
      windowSize: recentSessions.length,
      outcomeCounts,
      inFlightCount,
      completedCount: completedDurations.length,
      medianCompletionMs,
      averageCompletionMs,
      slowestSession,
      problemSessions,
    },
  };
}

export async function getResumeTextSource(sessionId: string) {
  const db = getDb();
  const [textSource] = await db
    .select()
    .from(resumeTextSources)
    .where(eq(resumeTextSources.analysisSessionId, sessionId))
    .limit(1);

  return textSource ?? null;
}

export async function getAnalysisSession(sessionId: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(analysisSessions)
    .where(eq(analysisSessions.id, sessionId))
    .limit(1);

  return session ?? null;
}

export async function getResumeUpload(sessionId: string) {
  const db = getDb();
  const [upload] = await db
    .select()
    .from(resumeUploads)
    .where(eq(resumeUploads.analysisSessionId, sessionId))
    .limit(1);

  return upload ?? null;
}

export async function getParsedDocument(sessionId: string) {
  const db = getDb();
  const [document] = await db
    .select()
    .from(parsedDocuments)
    .where(eq(parsedDocuments.analysisSessionId, sessionId))
    .orderBy(desc(parsedDocuments.createdAt))
    .limit(1);

  return document ?? null;
}

export async function markAnalysisRunProcessing(input: {
  analysisSessionId: string;
  analysisRunId: string;
  status: "parsing" | "analyzing";
}) {
  const db = getDb();
  const now = new Date();

  await db
    .update(analysisRuns)
    .set({
      status: "processing",
      startedAt: now,
    })
    .where(eq(analysisRuns.id, input.analysisRunId));

  await db
    .update(analysisSessions)
    .set({
      status: input.status,
      updatedAt: now,
    })
    .where(eq(analysisSessions.id, input.analysisSessionId));
}

export async function updateAnalysisSessionStatus(input: {
  analysisSessionId: string;
  status: "queued" | "parsing" | "analyzing";
}) {
  const db = getDb();

  await db
    .update(analysisSessions)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(analysisSessions.id, input.analysisSessionId));
}

export async function persistParsedDocument(input: {
  analysisSessionId: string;
  document: ParsedResumeDocument;
}) {
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx
      .delete(parsedDocuments)
      .where(eq(parsedDocuments.analysisSessionId, input.analysisSessionId));

    await tx.insert(parsedDocuments).values({
      analysisSessionId: input.analysisSessionId,
      parserProvider: input.document.parser.provider,
      parserVersion: input.document.parser.version,
      parserMode: input.document.parser.mode,
      rawText: input.document.rawText,
      normalizedText: input.document.normalizedText,
      sections: input.document.sections,
      qualityScore: input.document.quality.score,
      qualityFlags: input.document.quality.flags,
      parserWarnings: input.document.quality.warnings,
      metadata: {
        quality: {
          charCount: input.document.quality.charCount,
          wordCount: input.document.quality.wordCount,
          lineCount: input.document.quality.lineCount,
          sectionCount: input.document.quality.sectionCount,
        },
        parserDetails: input.document.parser.details,
        extractedAt: input.document.parser.extractedAt,
      },
      createdAt: new Date(),
    });
  });
}

export async function persistCandidateProfile(input: {
  analysisSessionId: string;
  profile: CandidateProfile;
}) {
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx
      .delete(candidateProfiles)
      .where(eq(candidateProfiles.analysisSessionId, input.analysisSessionId));

    await tx.insert(candidateProfiles).values({
      analysisSessionId: input.analysisSessionId,
      profileVersion: input.profile.profileVersion,
      headline: input.profile.headline?.value ?? null,
      payload: input.profile,
      createdAt: new Date(),
    });
  });
}

export async function persistTerminalResult(input: {
  analysisSessionId: string;
  analysisRunId: string;
  result: AnalysisResult;
}) {
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    const [recommendationSet] = await tx
      .insert(careerRecommendationSets)
      .values({
        analysisSessionId: input.analysisSessionId,
        status: input.result.status,
        summaryHeadline:
          input.result.status === "ready"
            ? input.result.summary.candidateHeadline
            : input.result.userMessage,
        payload: input.result,
        contractVersion: input.result.metadata.contractVersion,
        parserVersion: input.result.metadata.parser.version,
        modelProvider: input.result.metadata.model?.provider ?? null,
        modelVersion: input.result.metadata.model?.version ?? null,
        promptVersion: input.result.metadata.model?.promptVersion ?? null,
        taxonomyVersion: input.result.metadata.taxonomyVersion,
        createdAt: now,
      })
      .returning();

    if (input.result.status === "ready") {
      for (const recommendation of input.result.recommendations) {
        const [insertedRecommendation] = await tx
          .insert(careerRecommendations)
          .values({
            recommendationSetId: recommendationSet.id,
            rank: recommendation.rank,
            roleFamily: recommendation.roleFamily,
            roleTitle: recommendation.roleTitle,
            targetDomains: recommendation.targetDomains,
            confidenceLabel: recommendation.confidence.label,
            confidenceScore: recommendation.confidence.score,
            detectedExperience: recommendation.detectedExperience,
            inferredPotential: recommendation.inferredPotential,
            rationale: recommendation.rationale,
            nextSteps: recommendation.nextSteps,
            gaps: recommendation.gaps,
            risks: recommendation.risks,
            createdAt: now,
          })
          .returning();

        if (recommendation.evidence.length > 0) {
          await tx.insert(recommendationEvidence).values(
            recommendation.evidence.map((evidence) => ({
              recommendationId: insertedRecommendation.id,
              sourceKind: evidence.sourceKind,
              sectionLabel: evidence.sectionLabel,
              snippet: evidence.snippet,
              reason: evidence.reason,
              startOffset: evidence.startOffset,
              endOffset: evidence.endOffset,
              createdAt: now,
            })),
          );
        }
      }
    }

    await tx
      .update(analysisRuns)
      .set({
        status: "succeeded",
        rawOutput: input.result,
        completedAt: now,
        parserVersion: input.result.metadata.parser.version,
        modelProvider: input.result.metadata.model?.provider ?? null,
        modelVersion: input.result.metadata.model?.version ?? null,
        promptVersion: input.result.metadata.model?.promptVersion ?? null,
      })
      .where(eq(analysisRuns.id, input.analysisRunId));

    await tx
      .update(analysisSessions)
      .set({
        status: input.result.status,
        contractVersion: input.result.metadata.contractVersion,
        parserVersion: input.result.metadata.parser.version,
        modelVersion: input.result.metadata.model?.version ?? null,
        promptVersion: input.result.metadata.model?.promptVersion ?? null,
        taxonomyVersion: input.result.metadata.taxonomyVersion,
        latestErrorCode:
          input.result.status === "parser_failure"
            ? input.result.errorCode
            : null,
        latestErrorMessage:
          input.result.status === "ready" ? null : input.result.userMessage,
        updatedAt: now,
        completedAt: now,
      })
      .where(eq(analysisSessions.id, input.analysisSessionId));
  });
}

export async function markAnalysisRunFailed(input: {
  analysisSessionId: string;
  analysisRunId: string;
  errorCode: string;
  errorMessage: string;
}) {
  const db = getDb();
  const now = new Date();

  await db
    .update(analysisRuns)
    .set({
      status: "failed",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      completedAt: now,
    })
    .where(eq(analysisRuns.id, input.analysisRunId));

  await db
    .update(analysisSessions)
    .set({
      status: "failed",
      latestErrorCode: input.errorCode,
      latestErrorMessage: input.errorMessage,
      updatedAt: now,
    })
    .where(eq(analysisSessions.id, input.analysisSessionId));
}

export async function upsertSessionFeedback(input: {
  analysisSessionId: string;
  sentiment: "helpful" | "not_helpful";
  note?: string | null;
}) {
  const db = getDb();
  const now = new Date();
  const normalizedNote = input.note?.trim() || null;

  const [feedbackEvent] = await db
    .insert(feedbackEvents)
    .values({
      analysisSessionId: input.analysisSessionId,
      sentiment: input.sentiment,
      note: normalizedNote,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: feedbackEvents.analysisSessionId,
      set: {
        sentiment: input.sentiment,
        note: normalizedNote,
        updatedAt: now,
      },
    })
    .returning();

  return feedbackEvent;
}

async function getReusableRecoverySourceText(
  session: InferSelectModel<typeof analysisSessions>,
) {
  if (session.sourceType === "pasted_text") {
    const textSource = await getResumeTextSource(session.id);
    return textSource?.rawText.trim() || null;
  }

  const parsedDocument = await getParsedDocument(session.id);
  return parsedDocument?.normalizedText.trim() || null;
}

async function createInsufficientEvidenceRecoverySession(input: {
  sourceSession: InferSelectModel<typeof analysisSessions>;
  input: RecoveryAnalysisSessionInput;
}) {
  if (input.input.mode !== "clarification") {
    throw new RecoverySessionError(
      "Insufficient-evidence recovery only accepts added clarification.",
      409,
    );
  }

  const reusableSourceText = await getReusableRecoverySourceText(input.sourceSession);

  if (!reusableSourceText) {
    throw new RecoverySessionError(
      "Unlockr could not find reusable source text for this recovery attempt.",
      409,
    );
  }

  return createQueuedAnalysisSession({
    sourceType: "pasted_text",
    candidateLabel: input.sourceSession.candidateLabel,
    resumeText: buildClarificationRecoveryResumeText({
      baseText: reusableSourceText,
      clarificationText: input.input.clarificationText,
    }),
    resumeTextSourceLabel: "insufficient_evidence_recovery",
    retriedFromAnalysisSessionId: input.sourceSession.id,
  });
}

async function createParserFailureRecoverySession(input: {
  sourceSession: InferSelectModel<typeof analysisSessions>;
  input: RecoveryAnalysisSessionInput;
}) {
  if (input.input.mode === "clarification") {
    throw new RecoverySessionError(
      "Parser-failure recovery needs a replacement file or cleaned pasted text.",
      409,
    );
  }

  if (input.input.mode === "pasted_text") {
    return createQueuedAnalysisSession({
      sourceType: "pasted_text",
      candidateLabel: input.sourceSession.candidateLabel,
      resumeText: input.input.resumeText,
      resumeTextSourceLabel: "parser_failure_recovery_text",
      retriedFromAnalysisSessionId: input.sourceSession.id,
    });
  }

  return createQueuedAnalysisSession({
    sourceType: "file_upload",
    candidateLabel: input.sourceSession.candidateLabel,
    file: input.input.file,
    retriedFromAnalysisSessionId: input.sourceSession.id,
  });
}

function buildClarificationRecoveryResumeText(input: {
  baseText: string;
  clarificationText: string;
}) {
  return [
    input.baseText.trim(),
    "Follow-up clarification after insufficient-evidence review",
    input.clarificationText.trim(),
  ]
    .filter((value) => value.length > 0)
    .join("\n\n");
}

function getCompletionDurationMs(
  session: InferSelectModel<typeof analysisSessions>,
) {
  const terminalTimestamp =
    session.completedAt ?? (session.status === "failed" ? session.updatedAt : null);

  if (!terminalTimestamp) {
    return null;
  }

  return Math.max(
    0,
    new Date(terminalTimestamp).getTime() - new Date(session.createdAt).getTime(),
  );
}

function getMedianDurationMs(sortedDurations: number[]) {
  if (sortedDurations.length === 0) {
    return null;
  }

  const middleIndex = Math.floor(sortedDurations.length / 2);

  if (sortedDurations.length % 2 === 1) {
    return sortedDurations[middleIndex] ?? null;
  }

  const lower = sortedDurations[middleIndex - 1];
  const upper = sortedDurations[middleIndex];

  if (lower === undefined || upper === undefined) {
    return null;
  }

  return Math.round((lower + upper) / 2);
}
