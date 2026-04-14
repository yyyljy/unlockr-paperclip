import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { z } from "zod";

import type { CandidateProfile } from "@/lib/candidate-profile";
import {
  analysisResultSchema,
  type AnalysisResult,
} from "@/lib/contracts/recommendations";
import type { ServerEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env";
import type { NormalizedAnalysisInput } from "@/lib/resume-intake";
import { roleTracks } from "@/lib/recommendation-taxonomy";

type OpenAiRecommendationConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  promptVersion: string;
  timeoutMs: number;
};

type CodexLocalRecommendationConfig = {
  cliPath: string;
  model: string | null;
  promptVersion: string;
  timeoutMs: number;
};

type ModelIdentity = {
  provider: string;
  version: string;
  promptVersion: string;
};

type ModelBackedRecommendationAdapter = {
  identity: ModelIdentity;
  request: (input: {
    analysisInput: NormalizedAnalysisInput;
    profile: CandidateProfile;
    evidenceCatalog: EvidenceOption[];
  }) => Promise<unknown>;
};

type EvidenceOption = {
  key: string;
  signalLabel: string;
  signalValue: string;
  sourceKind: "resume_text" | "resume_upload";
  sectionLabel: string;
  snippet: string;
  reason: string;
  startOffset: number | null;
  endOffset: number | null;
};

const modelRoleTitles = roleTracks.map((track) => track.roleTitle) as [
  string,
  ...string[],
];

const maxModelRecommendations = 5;
const maxModelDetectedExperienceItems = 8;
const maxModelInferredPotentialItems = 6;
const maxModelEvidenceKeys = 8;
const maxModelRisks = 5;
const maxModelBlockingFindings = 6;
const maxModelPartialSignals = 6;
const maxModelFollowUpQuestions = 8;
const maxContractRecommendations = 3;
const maxContractDetectedExperienceItems = 5;
const maxContractInferredPotentialItems = 4;
const maxContractEvidenceItems = 3;
const maxContractRisks = 3;
const maxContractBlockingFindings = 4;
const maxContractPartialSignals = 4;
const maxContractFollowUpQuestions = 5;

type ModelRecommendationFailureCode =
  | "model_provider_not_configured"
  | "model_recommendation_failed"
  | "model_recommendation_timed_out";

type ModelAdapterFailure = {
  provider: string;
  reason: string;
  timedOut: boolean;
};

export class ModelRecommendationError extends Error {
  readonly errorCode: ModelRecommendationFailureCode;

  constructor(input: {
    errorCode: ModelRecommendationFailureCode;
    message: string;
  }) {
    super(input.message);
    this.name = "ModelRecommendationError";
    this.errorCode = input.errorCode;
  }
}

const readyModelOutputSchema = z.object({
  status: z.literal("ready"),
  summary: z.object({
    candidateHeadline: z.string().min(1),
    fitSummary: z.string().min(1),
    evidenceQuality: z.enum(["strong", "mixed", "thin"]),
  }),
  recommendations: z.array(
    z.object({
      roleTitle: z.enum(modelRoleTitles),
      confidence: z.object({
        label: z.enum(["high", "medium", "low"]),
        score: z.number().min(0).max(1),
        explanation: z.string().min(1),
      }),
      detectedExperience: z.array(z.string().min(1)).min(1).max(maxModelDetectedExperienceItems),
      inferredPotential: z.array(z.string().min(1)).min(1).max(maxModelInferredPotentialItems),
      rationale: z.string().min(1),
      evidenceKeys: z.array(z.string().min(1)).min(1).max(maxModelEvidenceKeys),
      risks: z.array(z.string().min(1)).max(maxModelRisks).default([]),
    }),
  )
    .min(1)
    .max(maxModelRecommendations),
});

const insufficientEvidenceModelOutputSchema = z.object({
  status: z.literal("insufficient_evidence"),
  blockingFindings: z.array(z.string().min(1)).min(1).max(maxModelBlockingFindings),
  partialSignals: z.array(z.string().min(1)).max(maxModelPartialSignals),
  followUpQuestions: z.array(z.string().min(1)).min(1).max(maxModelFollowUpQuestions),
  userMessage: z.string().min(1),
});

export const modelOutputSchema = z.discriminatedUnion("status", [
  readyModelOutputSchema,
  insufficientEvidenceModelOutputSchema,
]);

type ParsedModelOutput = z.infer<typeof modelOutputSchema>;

export function normalizeParsedModelOutput(output: ParsedModelOutput): ParsedModelOutput {
  if (output.status === "ready") {
    return {
      ...output,
      recommendations: output.recommendations
        .slice(0, maxContractRecommendations)
        .map((recommendation) => ({
          ...recommendation,
          detectedExperience: recommendation.detectedExperience.slice(
            0,
            maxContractDetectedExperienceItems,
          ),
          inferredPotential: recommendation.inferredPotential.slice(
            0,
            maxContractInferredPotentialItems,
          ),
          risks: recommendation.risks.slice(0, maxContractRisks),
        })),
    };
  }

  return {
    ...output,
    blockingFindings: output.blockingFindings.slice(0, maxContractBlockingFindings),
    partialSignals: output.partialSignals.slice(0, maxContractPartialSignals),
    followUpQuestions: output.followUpQuestions.slice(0, maxContractFollowUpQuestions),
  };
}

function collectProfileSignals(profile: CandidateProfile) {
  return [
    ...(profile.headline ? [profile.headline] : []),
    ...profile.roleHistory,
    ...profile.roleSignals,
    ...profile.skills,
    ...profile.domainSignals,
    ...profile.achievements,
    ...profile.educationSignals,
    ...profile.certificationSignals,
  ];
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function getOpenAiRecommendationConfig(
  env: ServerEnv,
): OpenAiRecommendationConfig | null {
  if (
    !env.OPENAI_API_KEY ||
    !env.OPENAI_RECOMMENDATION_MODEL ||
    !env.OPENAI_RECOMMENDATION_PROMPT_VERSION
  ) {
    return null;
  }

  return {
    apiKey: env.OPENAI_API_KEY,
    baseUrl: normalizeBaseUrl(env.OPENAI_BASE_URL),
    model: env.OPENAI_RECOMMENDATION_MODEL,
    promptVersion: env.OPENAI_RECOMMENDATION_PROMPT_VERSION,
    timeoutMs: env.OPENAI_RECOMMENDATION_TIMEOUT_MS,
  };
}

function getCodexLocalRecommendationConfig(
  env: ServerEnv,
): CodexLocalRecommendationConfig | null {
  if (!env.CODEX_RECOMMENDATION_ENABLED) {
    return null;
  }

  return {
    cliPath: env.CODEX_RECOMMENDATION_CLI_PATH,
    model: env.CODEX_RECOMMENDATION_MODEL ?? null,
    promptVersion: env.CODEX_RECOMMENDATION_PROMPT_VERSION,
    timeoutMs: env.CODEX_RECOMMENDATION_TIMEOUT_MS,
  };
}

function collectEvidenceCatalog(profile: CandidateProfile) {
  const signals = collectProfileSignals(profile);
  const seen = new Set<string>();
  const catalog: EvidenceOption[] = [];

  for (const signal of signals) {
    for (const [index, evidence] of signal.evidence.entries()) {
      const dedupeKey = [
        evidence.sectionLabel,
        evidence.snippet.trim().toLowerCase(),
        evidence.startOffset ?? "na",
        evidence.endOffset ?? "na",
      ].join("::");

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      catalog.push({
        key: `${signal.key}:${index}`,
        signalLabel: signal.label,
        signalValue: signal.value,
        sourceKind: evidence.sourceKind,
        sectionLabel: evidence.sectionLabel,
        snippet: evidence.snippet,
        reason: evidence.reason,
        startOffset: evidence.startOffset,
        endOffset: evidence.endOffset,
      });

      if (catalog.length >= 18) {
        return catalog;
      }
    }
  }

  return catalog;
}

function providerLabel(provider: string) {
  switch (provider) {
    case "codex-local":
      return "Codex local";
    case "openai":
      return "OpenAI";
    default:
      return provider;
  }
}

function summarizeAdapterFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown recommendation error.";
  }

  return error.message.replace(/\s+/g, " ").trim().slice(0, 240);
}

function buildModelFailureMessage(failures: ModelAdapterFailure[]) {
  const attemptedProviders = failures.map((failure) => providerLabel(failure.provider)).join(", ");
  const primaryFailure =
    failures.find((failure) => failure.timedOut) ?? failures[failures.length - 1];

  if (!primaryFailure) {
    return "AI recommendation failed before a result could be created.";
  }

  if (primaryFailure.timedOut) {
    return `AI recommendation timed out after trying ${attemptedProviders}. ${providerLabel(
      primaryFailure.provider,
    )} did not finish within the allowed time.`;
  }

  return `AI recommendation failed after trying ${attemptedProviders}. ${summarizeAdapterFailure(
    primaryFailure.reason,
  )}`;
}

function buildSystemPrompt() {
  return [
    "You are Unlockr's recommendation analyst.",
    "Be conservative and evidence-grounded.",
    "Never invent resume facts, snippets, sections, or tools.",
    "Only cite evidence keys from the provided evidence catalog.",
    "If the evidence is thin, return status insufficient_evidence instead of stretching into a polished guess.",
    "Do not inspect files, browse the workspace, or use external tools.",
    "Use only the parsed input included in the prompt.",
    "Return valid JSON only.",
  ].join(" ");
}

function buildUserPrompt(input: {
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
  evidenceCatalog: EvidenceOption[];
  promptVersion: string;
}) {
  const allowedTracks = roleTracks.map((track) => ({
    roleTitle: track.roleTitle,
    roleFamily: track.roleFamily,
    targetDomains: track.targetDomains,
    defaultNextSteps: track.nextSteps,
    defaultGap: track.gap,
  }));

  return [
    `Prompt version: ${input.promptVersion}`,
    "Choose only from the allowed role titles in the taxonomy.",
    "If you return ready, include 1 to 3 unique recommendations.",
    "Use evidenceKeys to cite exact evidence items from the catalog.",
    "For ready outputs, keep detectedExperience at 5 items or fewer, inferredPotential at 4 or fewer, evidenceKeys at 3 or fewer, and risks at 3 or fewer.",
    "For insufficient_evidence outputs, keep blockingFindings at 4 items or fewer, partialSignals at 4 or fewer, and followUpQuestions at 5 or fewer.",
    "If you have more candidate items than allowed, keep only the strongest and most specific ones.",
    "Do not output parser_failure. That state is handled upstream.",
    "JSON contract for ready:",
    JSON.stringify({
      status: "ready",
      summary: {
        candidateHeadline: "string",
        fitSummary: "string",
        evidenceQuality: "strong | mixed | thin",
      },
      recommendations: [
        {
          roleTitle: allowedTracks[0]?.roleTitle ?? "Role Title",
          confidence: {
            label: "high | medium | low",
            score: 0.74,
            explanation: "string",
          },
          detectedExperience: ["string"],
          inferredPotential: ["string"],
          rationale: "string",
          evidenceKeys: ["signal-key:0"],
          risks: ["string"],
        },
      ],
    }),
    "JSON contract for insufficient evidence:",
    JSON.stringify({
      status: "insufficient_evidence",
      blockingFindings: ["string"],
      partialSignals: ["string"],
      followUpQuestions: ["string"],
      userMessage: "string",
    }),
    "Allowed role taxonomy:",
    JSON.stringify(allowedTracks),
    "Parsed input:",
    JSON.stringify({
      candidateLabel: input.analysisInput.candidateLabel ?? null,
      sourceType: input.analysisInput.sourceType,
      sourceKind: input.analysisInput.sourceKind,
      document: {
        normalizedText: input.analysisInput.document.normalizedText,
        quality: input.analysisInput.document.quality,
        sections: input.analysisInput.document.sections.map((section) => ({
          label: section.label,
          heading: section.heading,
          content: section.content,
        })),
      },
      profile: {
        headline: input.profile.headline,
        roleHistory: input.profile.roleHistory,
        roleSignals: input.profile.roleSignals,
        skills: input.profile.skills,
        domainSignals: input.profile.domainSignals,
        achievements: input.profile.achievements,
        educationSignals: input.profile.educationSignals,
        certificationSignals: input.profile.certificationSignals,
        coverageNotes: input.profile.coverageNotes,
      },
      evidenceCatalog: input.evidenceCatalog,
    }),
  ].join("\n\n");
}

function buildCodexExecPrompt(input: {
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
  evidenceCatalog: EvidenceOption[];
  promptVersion: string;
}) {
  return [
    "System instructions:",
    buildSystemPrompt(),
    "Runtime constraints:",
    "- Do not run shell commands.",
    "- Do not inspect the filesystem or repository.",
    "- Use only the parsed input below.",
    "- Return only the final JSON object.",
    "Task:",
    buildUserPrompt(input),
  ].join("\n\n");
}

async function requestOpenAiRecommendation(input: {
  config: OpenAiRecommendationConfig;
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
  evidenceCatalog: EvidenceOption[];
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, input.config.timeoutMs);

  try {
    const response = await fetch(`${input.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.config.model,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: buildUserPrompt({
              analysisInput: input.analysisInput,
              profile: input.profile,
              evidenceCatalog: input.evidenceCatalog,
              promptVersion: input.config.promptVersion,
            }),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI recommendation request failed with ${response.status}: ${errorBody.slice(
          0,
          400,
        )}`,
      );
    }

    const payload = await response.json();
    const messageContent = payload?.choices?.[0]?.message?.content;

    if (typeof messageContent !== "string" || messageContent.trim().length === 0) {
      throw new Error("OpenAI recommendation response did not include JSON content.");
    }

    return JSON.parse(messageContent);
  } finally {
    clearTimeout(timeout);
  }
}

function appendLimitedOutput(existing: string, chunk: Buffer | string, limit = 12000) {
  const next = `${existing}${chunk.toString()}`;
  return next.length > limit ? next.slice(-limit) : next;
}

function prependExecDirToPath(env: NodeJS.ProcessEnv) {
  const execDir = path.dirname(process.execPath);
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const existingPath = env[pathKey];
  const segments = existingPath ? existingPath.split(path.delimiter).filter(Boolean) : [];

  if (!segments.includes(execDir)) {
    segments.unshift(execDir);
  }

  env[pathKey] = segments.join(path.delimiter);
}

function buildCodexCliEnv() {
  const childEnv = { ...process.env };

  delete childEnv.OPENAI_API_KEY;
  delete childEnv.OPENAI_BASE_URL;
  delete childEnv.OPENAI_ORG_ID;
  delete childEnv.OPENAI_ORGANIZATION;
  delete childEnv.OPENAI_PROJECT;
  delete childEnv.OPENAI_PROJECT_ID;
  prependExecDirToPath(childEnv);

  return childEnv;
}

async function requestCodexLocalRecommendation(input: {
  config: CodexLocalRecommendationConfig;
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
  evidenceCatalog: EvidenceOption[];
}) {
  const workingDir = await mkdtemp(path.join(tmpdir(), "unlockr-codex-local-"));
  const outputPath = path.join(workingDir, "output.json");

  try {
    const args = [
      "exec",
      "--skip-git-repo-check",
      "--sandbox",
      "read-only",
      "--color",
      "never",
      "--ephemeral",
      "-o",
      outputPath,
    ];

    if (input.config.model) {
      args.push("--model", input.config.model);
    }

    args.push("-");

    const child = spawn(input.config.cliPath, args, {
      cwd: workingDir,
      env: buildCodexCliEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.on("data", (chunk) => {
      stdout = appendLimitedOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimitedOutput(stderr, chunk);
    });
    child.stdin.on("error", () => {
      // Ignore EPIPE if the process exits before reading the full prompt.
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");

      const forceKill = setTimeout(() => {
        child.kill("SIGKILL");
      }, 2000);
      forceKill.unref();
    }, input.config.timeoutMs);
    timeout.unref();

    const completion = new Promise<{
      exitCode: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (exitCode, signal) => {
        resolve({ exitCode, signal });
      });
    });

    child.stdin.end(
      buildCodexExecPrompt({
        analysisInput: input.analysisInput,
        profile: input.profile,
        evidenceCatalog: input.evidenceCatalog,
        promptVersion: input.config.promptVersion,
      }),
    );

    const { exitCode, signal } = await completion;
    clearTimeout(timeout);

    if (timedOut) {
      throw new Error(
        `codex-local recommendation request timed out after ${input.config.timeoutMs}ms.`,
      );
    }

    if (exitCode !== 0) {
      throw new Error(
        [
          `codex-local recommendation request failed with exit code ${exitCode ?? "null"}`,
          signal ? `(signal ${signal})` : "",
          stdout ? `stdout tail: ${stdout}` : "",
          stderr ? `stderr tail: ${stderr}` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    }

    const messageContent = (await readFile(outputPath, "utf8")).trim();

    if (messageContent.length === 0) {
      throw new Error("codex-local recommendation response did not include JSON content.");
    }

    return JSON.parse(messageContent);
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

function resolveEvidenceSelection(input: {
  recommendation: z.infer<typeof readyModelOutputSchema>["recommendations"][number];
  evidenceCatalog: EvidenceOption[];
}) {
  const evidenceByKey = new Map(
    input.evidenceCatalog.map((entry) => [entry.key, entry] as const),
  );
  const seen = new Set<string>();
  const evidence = [];

  for (const key of input.recommendation.evidenceKeys) {
    const entry = evidenceByKey.get(key);

    if (!entry || seen.has(entry.key)) {
      continue;
    }

    seen.add(entry.key);
    evidence.push({
      evidenceId: randomUUID(),
      sourceKind: entry.sourceKind,
      sectionLabel: entry.sectionLabel,
      snippet: entry.snippet,
      reason: entry.reason,
      startOffset: entry.startOffset,
      endOffset: entry.endOffset,
    });

    if (evidence.length >= maxContractEvidenceItems) {
      return evidence;
    }
  }

  return evidence;
}

function buildReadyResultFromModel(input: {
  output: z.infer<typeof readyModelOutputSchema>;
  analysisInput: NormalizedAnalysisInput;
  evidenceCatalog: EvidenceOption[];
  modelIdentity: ModelIdentity;
  env: ServerEnv;
}) {
  const tracksByTitle = new Map(
    roleTracks.map((track) => [track.roleTitle, track] as const),
  );
  const seenRoleTitles = new Set<string>();
  const recommendations = [];

  for (const recommendation of input.output.recommendations) {
    if (seenRoleTitles.has(recommendation.roleTitle)) {
      continue;
    }

    const track = tracksByTitle.get(recommendation.roleTitle);

    if (!track) {
      throw new Error(`Unsupported role title from model output: ${recommendation.roleTitle}`);
    }

    const evidence = resolveEvidenceSelection({
      recommendation,
      evidenceCatalog: input.evidenceCatalog,
    });

    if (evidence.length === 0) {
      throw new Error(
        `Model output for ${recommendation.roleTitle} did not resolve to stored evidence.`,
      );
    }

    seenRoleTitles.add(recommendation.roleTitle);
    recommendations.push({
      recommendationId: randomUUID(),
      rank: recommendations.length + 1,
      roleFamily: track.roleFamily,
      roleTitle: track.roleTitle,
      targetDomains: track.targetDomains,
      confidence: recommendation.confidence,
      detectedExperience: recommendation.detectedExperience,
      inferredPotential: recommendation.inferredPotential,
      rationale: recommendation.rationale,
      evidence,
      nextSteps: track.nextSteps,
      gaps: [track.gap],
      risks: recommendation.risks,
    });
  }

  if (recommendations.length === 0) {
    throw new Error("Model output did not yield any valid recommendations.");
  }

  return analysisResultSchema.parse({
    status: "ready",
    metadata: {
      contractVersion: input.env.RECOMMENDATION_CONTRACT_VERSION,
      taxonomyVersion: input.env.RECOMMENDATION_TAXONOMY_VERSION,
      generatedAt: new Date().toISOString(),
      recommendationPath: "model_backed",
      pathContext: {
        status: "accepted_model",
        attemptedProvider: input.modelIdentity.provider,
      },
      parser: input.analysisInput.document.parser,
      model: {
        provider: input.modelIdentity.provider,
        version: input.modelIdentity.version,
        promptVersion: input.modelIdentity.promptVersion,
      },
    },
    summary: input.output.summary,
    recommendations,
  });
}

function buildInsufficientEvidenceResultFromModel(input: {
  output: z.infer<typeof insufficientEvidenceModelOutputSchema>;
  analysisInput: NormalizedAnalysisInput;
  modelIdentity: ModelIdentity;
  env: ServerEnv;
}) {
  return analysisResultSchema.parse({
    status: "insufficient_evidence",
    metadata: {
      contractVersion: input.env.RECOMMENDATION_CONTRACT_VERSION,
      taxonomyVersion: input.env.RECOMMENDATION_TAXONOMY_VERSION,
      generatedAt: new Date().toISOString(),
      recommendationPath: "model_backed",
      pathContext: {
        status: "accepted_model",
        attemptedProvider: input.modelIdentity.provider,
      },
      parser: input.analysisInput.document.parser,
      model: {
        provider: input.modelIdentity.provider,
        version: input.modelIdentity.version,
        promptVersion: input.modelIdentity.promptVersion,
      },
    },
    blockingFindings: input.output.blockingFindings,
    partialSignals: input.output.partialSignals,
    followUpQuestions: input.output.followUpQuestions,
    userMessage: input.output.userMessage,
  });
}

function buildRecommendationAdapters(env: ServerEnv): ModelBackedRecommendationAdapter[] {
  const adapters: ModelBackedRecommendationAdapter[] = [];
  const codexLocalConfig = getCodexLocalRecommendationConfig(env);
  const openAiConfig = getOpenAiRecommendationConfig(env);

  if (codexLocalConfig) {
    adapters.push({
      identity: {
        provider: "codex-local",
        version: codexLocalConfig.model ?? "cli-default",
        promptVersion: codexLocalConfig.promptVersion,
      },
      request: (input) =>
        requestCodexLocalRecommendation({
          config: codexLocalConfig,
          ...input,
        }),
    });
  }

  if (openAiConfig) {
    adapters.push({
      identity: {
        provider: "openai",
        version: openAiConfig.model,
        promptVersion: openAiConfig.promptVersion,
      },
      request: (input) =>
        requestOpenAiRecommendation({
          config: openAiConfig,
          ...input,
        }),
    });
  }

  return adapters;
}

export async function analyzeResumeInputWithModel(input: {
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
}): Promise<AnalysisResult> {
  const env = getServerEnv();
  const adapters = buildRecommendationAdapters(env);

  if (adapters.length === 0) {
    throw new ModelRecommendationError({
      errorCode: "model_provider_not_configured",
      message:
        "AI recommendation is not configured. Add an OpenAI recommendation model or enable codex-local before running a new analysis.",
    });
  }

  const evidenceCatalog = collectEvidenceCatalog(input.profile);
  const failures: ModelAdapterFailure[] = [];

  for (const [index, adapter] of adapters.entries()) {
    try {
      const rawOutput = await adapter.request({
        analysisInput: input.analysisInput,
        profile: input.profile,
        evidenceCatalog,
      });
      const parsedOutput = normalizeParsedModelOutput(modelOutputSchema.parse(rawOutput));

      if (parsedOutput.status === "ready") {
        return buildReadyResultFromModel({
          output: parsedOutput,
          analysisInput: input.analysisInput,
          evidenceCatalog,
          modelIdentity: adapter.identity,
          env,
        });
      }

      return buildInsufficientEvidenceResultFromModel({
        output: parsedOutput,
        analysisInput: input.analysisInput,
        modelIdentity: adapter.identity,
        env,
      });
    } catch (error) {
      const timedOut = error instanceof Error && /timed out/i.test(error.message);
      failures.push({
        provider: adapter.identity.provider,
        reason: summarizeAdapterFailure(error),
        timedOut,
      });

      const nextStepMessage =
        index === adapters.length - 1 ? "no more adapters remain." : "trying the next adapter.";

      console.warn(
        `${adapter.identity.provider} recommendation adapter failed; ${nextStepMessage}`,
        error,
      );
    }
  }

  throw new ModelRecommendationError({
    errorCode: failures.some((failure) => failure.timedOut)
      ? "model_recommendation_timed_out"
      : "model_recommendation_failed",
    message: buildModelFailureMessage(failures),
  });
}


