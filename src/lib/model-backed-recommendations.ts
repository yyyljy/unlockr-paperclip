import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { CandidateProfile } from "@/lib/candidate-profile";
import { analysisResultSchema } from "@/lib/contracts/recommendations";
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
      detectedExperience: z.array(z.string().min(1)).min(1).max(5),
      inferredPotential: z.array(z.string().min(1)).min(1).max(4),
      rationale: z.string().min(1),
      evidenceKeys: z.array(z.string().min(1)).min(1).max(3),
      risks: z.array(z.string().min(1)).max(3).default([]),
    }),
  )
    .min(1)
    .max(3),
});

const insufficientEvidenceModelOutputSchema = z.object({
  status: z.literal("insufficient_evidence"),
  blockingFindings: z.array(z.string().min(1)).min(1).max(4),
  partialSignals: z.array(z.string().min(1)).max(4),
  followUpQuestions: z.array(z.string().min(1)).min(1).max(5),
  userMessage: z.string().min(1),
});

const modelOutputSchema = z.discriminatedUnion("status", [
  readyModelOutputSchema,
  insufficientEvidenceModelOutputSchema,
]);

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

function hasEnoughSignalForModelAttempt(input: {
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
  evidenceCatalog: EvidenceOption[];
}) {
  const trimmedText = input.analysisInput.document.normalizedText.trim();

  return (
    input.evidenceCatalog.length >= 2 &&
    (trimmedText.length >= 160 ||
      input.profile.roleSignals.length > 0 ||
      input.profile.skills.length >= 2)
  );
}

function buildSystemPrompt() {
  return [
    "You are Unlockr's recommendation analyst.",
    "Be conservative and evidence-grounded.",
    "Never invent resume facts, snippets, sections, or tools.",
    "Only cite evidence keys from the provided evidence catalog.",
    "If the evidence is thin, return status insufficient_evidence instead of stretching into a polished guess.",
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
  }

  return evidence;
}

function buildReadyResultFromModel(input: {
  output: z.infer<typeof readyModelOutputSchema>;
  analysisInput: NormalizedAnalysisInput;
  evidenceCatalog: EvidenceOption[];
  config: OpenAiRecommendationConfig;
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
      parser: input.analysisInput.document.parser,
      model: {
        provider: "openai",
        version: input.config.model,
        promptVersion: input.config.promptVersion,
      },
    },
    summary: input.output.summary,
    recommendations,
  });
}

function buildInsufficientEvidenceResultFromModel(input: {
  output: z.infer<typeof insufficientEvidenceModelOutputSchema>;
  analysisInput: NormalizedAnalysisInput;
  config: OpenAiRecommendationConfig;
  env: ServerEnv;
}) {
  return analysisResultSchema.parse({
    status: "insufficient_evidence",
    metadata: {
      contractVersion: input.env.RECOMMENDATION_CONTRACT_VERSION,
      taxonomyVersion: input.env.RECOMMENDATION_TAXONOMY_VERSION,
      generatedAt: new Date().toISOString(),
      recommendationPath: "model_backed",
      parser: input.analysisInput.document.parser,
      model: {
        provider: "openai",
        version: input.config.model,
        promptVersion: input.config.promptVersion,
      },
    },
    blockingFindings: input.output.blockingFindings,
    partialSignals: input.output.partialSignals,
    followUpQuestions: input.output.followUpQuestions,
    userMessage: input.output.userMessage,
  });
}

export async function analyzeResumeInputWithModel(input: {
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
}) {
  const env = getServerEnv();
  const config = getOpenAiRecommendationConfig(env);

  if (!config) {
    return null;
  }

  const evidenceCatalog = collectEvidenceCatalog(input.profile);

  if (
    !hasEnoughSignalForModelAttempt({
      analysisInput: input.analysisInput,
      profile: input.profile,
      evidenceCatalog,
    })
  ) {
    return null;
  }

  try {
    const rawOutput = await requestOpenAiRecommendation({
      config,
      analysisInput: input.analysisInput,
      profile: input.profile,
      evidenceCatalog,
    });
    const parsedOutput = modelOutputSchema.parse(rawOutput);

    if (parsedOutput.status === "ready") {
      return buildReadyResultFromModel({
        output: parsedOutput,
        analysisInput: input.analysisInput,
        evidenceCatalog,
        config,
        env,
      });
    }

    return buildInsufficientEvidenceResultFromModel({
      output: parsedOutput,
      analysisInput: input.analysisInput,
      config,
      env,
    });
  } catch (error) {
    console.warn(
      "OpenAI recommendation adapter failed; using fallback rules engine instead.",
      error,
    );
    return null;
  }
}
