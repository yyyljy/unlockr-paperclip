import { randomUUID } from "node:crypto";

import type { CandidateProfile, CandidateProfileSignal } from "@/lib/candidate-profile";
import type { AnalysisResult } from "@/lib/contracts/recommendations";
import { analysisResultSchema } from "@/lib/contracts/recommendations";
import { getServerEnv } from "@/lib/env";
import type { NormalizedAnalysisInput } from "@/lib/resume-intake";
import { roleTracks } from "@/lib/recommendation-taxonomy";

function normalize(text: string) {
  return text.toLowerCase();
}

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

function scoreToLabel(score: number) {
  if (score >= 0.8) return "high" as const;
  if (score >= 0.58) return "medium" as const;
  return "low" as const;
}

function truncate(text: string, max = 120) {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1).trimEnd()}…`;
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

function signalMatchesKeyword(signal: CandidateProfileSignal, keyword: string) {
  const normalizedKeyword = normalize(keyword);
  const haystack = normalize(
    `${signal.value} ${signal.evidence.map((entry) => entry.snippet).join(" ")}`,
  );

  return haystack.includes(normalizedKeyword);
}

function dedupeStrings(values: string[], max: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalizedValue = normalize(value);

    if (seen.has(normalizedValue)) {
      continue;
    }

    seen.add(normalizedValue);
    result.push(value);

    if (result.length >= max) {
      break;
    }
  }

  return result;
}

function dedupeEvidence(profile: CandidateProfile, signals: CandidateProfileSignal[]) {
  const seen = new Set<string>();
  const evidence = signals
    .flatMap((signal) => signal.evidence)
    .filter((entry) => {
      const key = [
        entry.sectionLabel,
        entry.snippet,
        entry.startOffset ?? "na",
        entry.endOffset ?? "na",
      ].join("::");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 3);

  return evidence.map((entry) => ({
    evidenceId: randomUUID(),
    sourceKind: entry.sourceKind ?? profile.sourceKind,
    sectionLabel: entry.sectionLabel,
    snippet: entry.snippet,
    reason: entry.reason,
    startOffset: entry.startOffset,
    endOffset: entry.endOffset,
  }));
}

function formatSignalForExperience(signal: CandidateProfileSignal) {
  switch (signal.label) {
    case "Skill or tool":
      return `Worked with ${signal.value}`;
    case "Domain signal":
      return `Shows experience in ${signal.value}`;
    case "Role-family signal":
      return `Signals align with ${signal.value.toLowerCase()} work`;
    case "Achievement snippet":
      return truncate(`Outcome evidence: ${signal.value}`);
    default:
      return truncate(signal.value);
  }
}

export function buildParserFailureResult(input?: {
  errorCode?: "unsupported_file_type" | "parser_not_configured" | "empty_document" | "storage_error";
  retryable?: boolean;
  requiredAction?: "reupload" | "paste_text" | "contact_support";
  userMessage?: string;
  parser?: {
    provider: string;
    version: string;
    mode: "direct_text" | "file_upload";
    extractedAt: string;
  };
}): AnalysisResult {
  const env = getServerEnv();
  const now = new Date().toISOString();

  return analysisResultSchema.parse({
    status: "parser_failure",
    metadata: {
      contractVersion: env.RECOMMENDATION_CONTRACT_VERSION,
      taxonomyVersion: env.RECOMMENDATION_TAXONOMY_VERSION,
      generatedAt: now,
      recommendationPath: null,
      parser:
        input?.parser ?? {
          provider: "unlockr.file-intake",
          version: env.RECOMMENDATION_PARSER_VERSION,
          mode: "file_upload",
          extractedAt: now,
        },
      model: null,
    },
    errorCode: input?.errorCode ?? "parser_not_configured",
    retryable: input?.retryable ?? true,
    requiredAction: input?.requiredAction ?? "paste_text",
    userMessage:
      input?.userMessage ??
      "Unlockr could not extract enough text from the uploaded file. Re-upload the file or paste the resume text directly.",
  });
}

export function analyzeResumeInput(input: {
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
}): AnalysisResult {
  const env = getServerEnv();
  const now = new Date().toISOString();
  const trimmedText = input.analysisInput.document.normalizedText.trim();
  const normalizedText = normalize(trimmedText);
  const profileSignals = collectProfileSignals(input.profile);

  const metadata = {
    contractVersion: env.RECOMMENDATION_CONTRACT_VERSION,
    taxonomyVersion: env.RECOMMENDATION_TAXONOMY_VERSION,
    generatedAt: now,
    recommendationPath: "fallback" as const,
    parser: input.analysisInput.document.parser,
    model: {
      provider: env.RECOMMENDATION_MODEL_PROVIDER,
      version: env.RECOMMENDATION_MODEL_VERSION,
      promptVersion: env.RECOMMENDATION_PROMPT_VERSION,
    },
  };

  if (
    trimmedText.length < 160 &&
    input.profile.roleSignals.length === 0 &&
    input.profile.skills.length < 2
  ) {
    const blockingFindings = [
      "The submitted text is too short to support a trusted recommendation.",
    ];

    if (input.analysisInput.document.quality.flags.includes("possible_ocr_needed")) {
      blockingFindings.push(
        "The uploaded file appears to have very little extractable text and may require OCR or a cleaner export.",
      );
    }

    return analysisResultSchema.parse({
      status: "insufficient_evidence",
      metadata,
      blockingFindings,
      partialSignals: [],
      followUpQuestions: [
        "What responsibilities did you own directly?",
        "Which tools, systems, or domains did you work in most often?",
        "What measurable outcomes did your work improve?",
      ],
      userMessage:
        "Unlockr needs more concrete resume detail before it should recommend a direction.",
    });
  }

  const scoredTracks = roleTracks
    .map((track) => {
      const matchedSignals = profileSignals.filter((signal) =>
        track.keywords.some((keyword) => signalMatchesKeyword(signal, keyword)),
      );
      const keywordHits = track.keywords.filter(
        (keyword) =>
          normalizedText.includes(keyword.toLowerCase()) ||
          matchedSignals.some((signal) => signalMatchesKeyword(signal, keyword)),
      );
      const evidence = dedupeEvidence(input.profile, matchedSignals);

      return {
        track,
        keywordHits,
        matchedSignals,
        evidence,
        score:
          keywordHits.length * 1.35 +
          clamp(matchedSignals.length, 0, 3) +
          clamp(evidence.length - 1, 0, 2) +
          (input.profile.achievements.length > 0 ? 0.6 : 0) +
          (input.profile.roleHistory.length > 0 ? 0.4 : 0) +
          (normalizedText.includes("lead") || normalizedText.includes("owner")
            ? 0.4
            : 0),
      };
    })
    .sort((a, b) => b.score - a.score);

  const viableTracks = scoredTracks.filter(
    (track) => track.score >= 3 && track.evidence.length > 0,
  );

  if (viableTracks.length === 0) {
    return analysisResultSchema.parse({
      status: "insufficient_evidence",
      metadata,
      blockingFindings: [
        "The current text does not contain enough domain-specific signals.",
      ],
      partialSignals: scoredTracks
        .filter((track) => track.score > 0)
        .slice(0, 3)
        .map((track) => track.track.roleTitle),
      followUpQuestions: [
        "Which role or team did you support most closely?",
        "Which systems or tools did you use every week?",
        "What outcomes improved because of your work?",
      ],
      userMessage:
        input.analysisInput.document.quality.flags.includes("possible_ocr_needed")
          ? "Unlockr extracted some content from the upload, but not enough clean evidence yet to make a career recommendation responsibly."
          : "Unlockr can see activity, but not enough evidence yet to make a career recommendation responsibly.",
    });
  }

  const recommendations = viableTracks.slice(0, 3).map((entry, index) => {
    const score = clamp(entry.score / 8, 0.42, 0.91);
    const label = scoreToLabel(score);
    const detectedExperience = dedupeStrings(
      entry.matchedSignals.map((signal) => formatSignalForExperience(signal)),
      4,
    );

    return {
      recommendationId: randomUUID(),
      rank: index + 1,
      roleFamily: entry.track.roleFamily,
      roleTitle: entry.track.roleTitle,
      targetDomains: entry.track.targetDomains,
      confidence: {
        label,
        score,
        explanation:
          label === "high"
            ? "The text contains repeated, role-specific evidence with clear execution ownership."
            : "There are multiple matching signals, but more quantified ownership would improve confidence.",
      },
      detectedExperience:
        detectedExperience.length > 0
          ? detectedExperience
          : ["Relevant execution signal is present but still broad."],
      inferredPotential: [
        `Can likely grow into ${entry.track.roleTitle.toLowerCase()} work with stronger outcome framing.`,
        `Shows transferable capability for ${entry.track.targetDomains[0]}.`,
      ],
      rationale: `The strongest signals in the text cluster around ${entry.track.roleTitle.toLowerCase()} work rather than a generic role match.`,
      evidence: entry.evidence,
      nextSteps: entry.track.nextSteps,
      gaps: [entry.track.gap],
      risks:
        entry.evidence.length < 2
          ? ["Evidence breadth is still narrow, so this should be treated as directional."]
          : [],
    };
  });

  const bestRecommendation = recommendations[0];
  const candidateLabel = input.analysisInput.candidateLabel?.trim();
  const evidenceQuality = recommendations.some(
    (recommendation) => recommendation.evidence.length < 2,
  )
    ? input.profile.coverageNotes.length >= 3
      ? "thin"
      : "mixed"
    : "strong";

  return analysisResultSchema.parse({
    status: "ready",
    metadata,
    summary: {
      candidateHeadline:
        candidateLabel && candidateLabel.length > 0
          ? `${candidateLabel}: strongest fit is ${bestRecommendation.roleTitle}`
          : `Strongest current fit is ${bestRecommendation.roleTitle}`,
      fitSummary:
        "Recommendations are grounded in persisted profile signals and linked source evidence before any directional inference is applied.",
      evidenceQuality,
    },
    recommendations,
  });
}
