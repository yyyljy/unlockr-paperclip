import { z } from "zod";

export const confidenceLabelSchema = z.enum([
  "high",
  "medium",
  "low",
  "insufficient",
]);

const metadataSchema = z.object({
  contractVersion: z.string().min(1),
  taxonomyVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  recommendationPath: z.enum(["model_backed", "fallback"]).nullable(),
  pathContext: z
    .object({
      status: z.enum(["accepted_model", "fallback_timeout", "fallback_error"]),
      attemptedProvider: z.string().min(1).nullable(),
    })
    .nullable()
    .optional(),
  parser: z.object({
    provider: z.string().min(1),
    version: z.string().min(1),
    mode: z.enum(["direct_text", "file_upload"]),
    extractedAt: z.string().datetime(),
  }),
  model: z
    .object({
      provider: z.string().min(1),
      version: z.string().min(1),
      promptVersion: z.string().min(1),
    })
    .nullable(),
});

export const recommendationEvidenceSchema = z.object({
  evidenceId: z.string().uuid(),
  sourceKind: z.enum(["resume_text", "resume_upload"]),
  sectionLabel: z.string().min(1),
  snippet: z.string().min(1).max(280),
  reason: z.string().min(1),
  startOffset: z.number().int().min(0).nullable(),
  endOffset: z.number().int().min(0).nullable(),
});

export const recommendationNextStepSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  effort: z.enum(["low", "medium", "high"]),
  timeline: z.string().min(1),
});

export const recommendationGapSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  urgency: z.enum(["now", "soon", "later"]),
});

export const roleRecommendationSchema = z.object({
  recommendationId: z.string().uuid(),
  rank: z.number().int().min(1).max(5),
  roleFamily: z.string().min(1),
  roleTitle: z.string().min(1),
  targetDomains: z.array(z.string().min(1)).min(1).max(3),
  confidence: z.object({
    label: confidenceLabelSchema,
    score: z.number().min(0).max(1),
    explanation: z.string().min(1),
  }),
  detectedExperience: z.array(z.string().min(1)).min(1).max(5),
  inferredPotential: z.array(z.string().min(1)).min(1).max(4),
  rationale: z.string().min(1),
  evidence: z.array(recommendationEvidenceSchema).min(1).max(6),
  nextSteps: z.array(recommendationNextStepSchema).min(1).max(4),
  gaps: z.array(recommendationGapSchema).max(4),
  risks: z.array(z.string().min(1)).max(3),
});

export const readyRecommendationResultSchema = z.object({
  status: z.literal("ready"),
  metadata: metadataSchema,
  summary: z.object({
    candidateHeadline: z.string().min(1),
    fitSummary: z.string().min(1),
    evidenceQuality: z.enum(["strong", "mixed", "thin"]),
  }),
  recommendations: z.array(roleRecommendationSchema).min(1).max(5),
});

export const insufficientEvidenceResultSchema = z.object({
  status: z.literal("insufficient_evidence"),
  metadata: metadataSchema,
  blockingFindings: z.array(z.string().min(1)).min(1).max(4),
  partialSignals: z.array(z.string().min(1)).max(4),
  followUpQuestions: z.array(z.string().min(1)).min(1).max(5),
  userMessage: z.string().min(1),
});

export const parserFailureResultSchema = z.object({
  status: z.literal("parser_failure"),
  metadata: metadataSchema,
  errorCode: z.enum([
    "unsupported_file_type",
    "parser_not_configured",
    "empty_document",
    "storage_error",
  ]),
  retryable: z.boolean(),
  requiredAction: z.enum(["reupload", "paste_text", "contact_support"]),
  userMessage: z.string().min(1),
});

export const analysisResultSchema = z.discriminatedUnion("status", [
  readyRecommendationResultSchema,
  insufficientEvidenceResultSchema,
  parserFailureResultSchema,
]);

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const sampleAnalysisResult = analysisResultSchema.parse({
  status: "ready",
  metadata: {
    contractVersion: "v1",
    taxonomyVersion: "2026-04-02",
    generatedAt: "2026-04-02T02:00:00.000Z",
    recommendationPath: "model_backed",
    pathContext: {
      status: "accepted_model",
      attemptedProvider: "openai",
    },
    parser: {
      provider: "unlockr.direct-text-intake",
      version: "phase1-intake-v1",
      mode: "direct_text",
      extractedAt: "2026-04-02T02:00:00.000Z",
    },
    model: {
      provider: "openai",
      version: "gpt-5.4-mini",
      promptVersion: "phase2-openai-v1",
    },
  },
  summary: {
    candidateHeadline: "Customer-facing operator with strong process ownership",
    fitSummary:
      "The profile shows repeatable coordination work, stakeholder communication, and documented process improvement.",
    evidenceQuality: "mixed",
  },
  recommendations: [
    {
      recommendationId: "b43112ee-4889-417e-a222-f1126d0d8f4a",
      rank: 1,
      roleFamily: "operations",
      roleTitle: "Customer Operations Specialist",
      targetDomains: ["SaaS support", "onboarding", "service ops"],
      confidence: {
        label: "medium",
        score: 0.71,
        explanation:
          "Multiple coordination and process signals are present, but direct ownership breadth is still limited.",
      },
      detectedExperience: [
        "Handled cross-functional stakeholder communication",
        "Documented recurring workflows and follow-ups",
      ],
      inferredPotential: [
        "Can grow into onboarding or retention operations ownership",
        "Likely effective in metrics-aware service teams",
      ],
      rationale:
        "The evidence points to process-heavy customer work rather than pure general administration.",
      evidence: [
        {
          evidenceId: "d4d22d7b-2484-489a-8306-2efc52b05d87",
          sourceKind: "resume_text",
          sectionLabel: "experience",
          snippet:
            "Managed weekly client requests, coordinated internal handoffs, and documented issue resolution steps.",
          reason: "Shows structured operational follow-through and communication.",
          startOffset: 120,
          endOffset: 214,
        },
      ],
      nextSteps: [
        {
          title: "Show metrics ownership",
          detail:
            "Add churn, onboarding, or SLA metrics to the resume to strengthen the operations signal.",
          effort: "medium",
          timeline: "This week",
        },
      ],
      gaps: [
        {
          title: "Tool depth",
          detail:
            "Specific CRM or ticketing platform ownership is not explicit in the source.",
          urgency: "soon",
        },
      ],
      risks: [
        "Current evidence is stronger for coordination than for direct KPI ownership.",
      ],
    },
  ],
});
