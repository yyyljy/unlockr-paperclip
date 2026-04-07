import assert from "node:assert/strict";

import {
  modelOutputSchema,
  normalizeParsedModelOutput,
} from "@/lib/model-backed-recommendations";

const rawReadyOutput = {
  status: "ready",
  summary: {
    candidateHeadline: "Strong fit for backend-oriented work",
    fitSummary: "The profile clusters around backend and operations-heavy ownership.",
    evidenceQuality: "strong",
  },
  recommendations: [
    {
      roleTitle: "Backend Engineer",
      confidence: {
        label: "high",
        score: 0.92,
        explanation: "Repeated backend ownership is present.",
      },
      detectedExperience: ["one", "two", "three", "four", "five", "six"],
      inferredPotential: ["a", "b", "c", "d", "e"],
      rationale: "Backend signals are the strongest.",
      evidenceKeys: ["signal-1:0", "signal-2:0", "signal-3:0", "signal-4:0"],
      risks: ["r1", "r2", "r3", "r4"],
    },
    {
      roleTitle: "Frontend Engineer",
      confidence: {
        label: "medium",
        score: 0.64,
        explanation: "Some adjacent UI evidence exists.",
      },
      detectedExperience: ["one"],
      inferredPotential: ["a"],
      rationale: "Secondary fit.",
      evidenceKeys: ["signal-1:0"],
      risks: [],
    },
    {
      roleTitle: "Product Operations Manager",
      confidence: {
        label: "medium",
        score: 0.58,
        explanation: "Operational coordination also appears.",
      },
      detectedExperience: ["one"],
      inferredPotential: ["a"],
      rationale: "Adjacent ops signal.",
      evidenceKeys: ["signal-1:0"],
      risks: [],
    },
    {
      roleTitle: "Data Analyst",
      confidence: {
        label: "low",
        score: 0.41,
        explanation: "There are some data-adjacent signals.",
      },
      detectedExperience: ["one"],
      inferredPotential: ["a"],
      rationale: "Lower-confidence adjacent fit.",
      evidenceKeys: ["signal-1:0"],
      risks: [],
    },
  ],
} satisfies unknown;

const rawInsufficientEvidenceOutput = {
  status: "insufficient_evidence",
  blockingFindings: ["one", "two", "three", "four", "five"],
  partialSignals: ["one", "two", "three", "four", "five"],
  followUpQuestions: ["one", "two", "three", "four", "five", "six"],
  userMessage: "Need more evidence before recommending a direction.",
} satisfies unknown;

const parsedReadyOutput = modelOutputSchema.parse(rawReadyOutput);
assert.equal(parsedReadyOutput.status, "ready");
assert.equal(parsedReadyOutput.recommendations.length, 4);
assert.equal(parsedReadyOutput.recommendations[0]?.evidenceKeys.length, 4);

const normalizedReadyOutput = normalizeParsedModelOutput(parsedReadyOutput);
assert.equal(normalizedReadyOutput.status, "ready");
assert.equal(normalizedReadyOutput.recommendations.length, 3);
assert.equal(normalizedReadyOutput.recommendations[0]?.detectedExperience.length, 5);
assert.equal(normalizedReadyOutput.recommendations[0]?.inferredPotential.length, 4);
assert.equal(normalizedReadyOutput.recommendations[0]?.risks.length, 3);
assert.equal(normalizedReadyOutput.recommendations[0]?.evidenceKeys.length, 4);

const parsedInsufficientEvidenceOutput = modelOutputSchema.parse(rawInsufficientEvidenceOutput);
assert.equal(parsedInsufficientEvidenceOutput.status, "insufficient_evidence");

const normalizedInsufficientEvidenceOutput = normalizeParsedModelOutput(
  parsedInsufficientEvidenceOutput,
);
assert.equal(normalizedInsufficientEvidenceOutput.status, "insufficient_evidence");
assert.equal(normalizedInsufficientEvidenceOutput.blockingFindings.length, 4);
assert.equal(normalizedInsufficientEvidenceOutput.partialSignals.length, 4);
assert.equal(normalizedInsufficientEvidenceOutput.followUpQuestions.length, 5);

console.log(
  JSON.stringify(
    {
      readyRecommendationsAfterNormalize:
        normalizedReadyOutput.status === "ready"
          ? normalizedReadyOutput.recommendations.length
          : null,
      firstReadyEvidenceKeysBeforeTrim:
        parsedReadyOutput.status === "ready"
          ? parsedReadyOutput.recommendations[0]?.evidenceKeys.length ?? null
          : null,
      firstReadyDetectedExperienceAfterNormalize:
        normalizedReadyOutput.status === "ready"
          ? normalizedReadyOutput.recommendations[0]?.detectedExperience.length ?? null
          : null,
      insufficientFollowUpQuestionsAfterNormalize:
        normalizedInsufficientEvidenceOutput.status === "insufficient_evidence"
          ? normalizedInsufficientEvidenceOutput.followUpQuestions.length
          : null,
    },
    null,
    2,
  ),
);
