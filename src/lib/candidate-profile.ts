import { extractSentenceFragments, type NormalizedAnalysisInput } from "@/lib/resume-intake";
import { matchesAnyKeyword } from "@/lib/keyword-matching";
import { roleTracks } from "@/lib/recommendation-taxonomy";

export type CandidateProfileConfidence = "high" | "medium" | "low";

export type CandidateProfileEvidence = {
  sourceKind: "resume_text" | "resume_upload";
  sectionLabel: string;
  snippet: string;
  reason: string;
  startOffset: number | null;
  endOffset: number | null;
};

export type CandidateProfileSignal = {
  key: string;
  label: string;
  value: string;
  confidence: CandidateProfileConfidence;
  evidence: CandidateProfileEvidence[];
};

export type CandidateProfile = {
  profileVersion: string;
  sourceKind: "resume_text" | "resume_upload";
  candidateLabel: string | null;
  createdAt: string;
  headline: CandidateProfileSignal | null;
  roleHistory: CandidateProfileSignal[];
  roleSignals: CandidateProfileSignal[];
  skills: CandidateProfileSignal[];
  domainSignals: CandidateProfileSignal[];
  achievements: CandidateProfileSignal[];
  educationSignals: CandidateProfileSignal[];
  certificationSignals: CandidateProfileSignal[];
  coverageNotes: string[];
};

type SentenceFragment = ReturnType<typeof extractSentenceFragments>[number];

const candidateProfileVersion = "phase2-profile-v1";

const roleHistoryPattern =
  /\b(engineer|developer|manager|analyst|designer|operator|operations|specialist|coordinator|consultant|researcher|marketer|intern|lead|founder|개발자|엔지니어|디자이너|운영|분석|매니저|리드)\b/i;

const educationPattern =
  /\b(university|college|bachelor|master|phd|degree|major|bootcamp|academy|교육|학사|석사|박사|학위|전공)\b/i;

const certificationPattern =
  /\b(certification|certificate|license|licensed|award|credential|자격증|수상|인증)\b/i;

const achievementVerbPattern =
  /\b(improved|reduced|increased|grew|scaled|launched|shipped|delivered|saved|automated|cut|boosted|won|led|built|implemented|optimized|streamlined|migrated|achieved)\b/i;

const achievementMetricPattern =
  /\b\d+(?:[.,]\d+)?\s?(?:%|x|배|명|건|회|시간|분|초|일|주|개월|달|년|users?|customers?|hours?|days?|weeks?|months?)\b/i;

const skillVocabulary = [
  "react",
  "next.js",
  "typescript",
  "javascript",
  "node",
  "python",
  "postgres",
  "redis",
  "sql",
  "excel",
  "tableau",
  "dashboard",
  "analytics",
  "api",
  "frontend",
  "backend",
  "css",
  "design system",
  "crm",
  "support",
  "onboarding",
  "documentation",
  "workflow",
  "queue",
  "integration",
];

function normalize(value: string) {
  return value.toLowerCase();
}

function truncate(value: string, max = 140) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function buildKey(prefix: string, value: string, index: number) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${prefix}-${slug || "signal"}-${index}`;
}

function dedupeByValue<T>(items: T[], getValue: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const value = normalize(getValue(item));

    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function toEvidence(
  fragment: SentenceFragment,
  sourceKind: CandidateProfile["sourceKind"],
  reason: string,
): CandidateProfileEvidence {
  return {
    sourceKind,
    sectionLabel: fragment.sectionLabel,
    snippet: truncate(fragment.text, 280),
    reason,
    startOffset: fragment.startOffset,
    endOffset: fragment.endOffset,
  };
}

function confidenceFromEvidenceCount(count: number): CandidateProfileConfidence {
  if (count >= 2) {
    return "high";
  }

  if (count === 1) {
    return "medium";
  }

  return "low";
}

function buildSignal(input: {
  prefix: string;
  index: number;
  label: string;
  value: string;
  evidence: CandidateProfileEvidence[];
  confidence?: CandidateProfileConfidence;
}) {
  return {
    key: buildKey(input.prefix, input.value, input.index),
    label: input.label,
    value: truncate(input.value.trim()),
    confidence: input.confidence ?? confidenceFromEvidenceCount(input.evidence.length),
    evidence: input.evidence,
  } satisfies CandidateProfileSignal;
}

function firstSignal<T>(items: T[]) {
  return items[0] ?? null;
}

function sectionLabelsFor(...labels: string[]) {
  return new Set(labels);
}

function filterFragmentsBySections(
  fragments: SentenceFragment[],
  labels: Set<string>,
) {
  return fragments.filter((fragment) => labels.has(fragment.sectionLabel));
}

function findKeywordEvidence(input: {
  fragments: SentenceFragment[];
  sourceKind: CandidateProfile["sourceKind"];
  keywords: string[];
  reason: string;
  max?: number;
}) {
  return input.fragments
    .filter((fragment) => matchesAnyKeyword(fragment.text, input.keywords))
    .slice(0, input.max ?? 2)
    .map((fragment) => toEvidence(fragment, input.sourceKind, input.reason));
}

function isDateLikeFragment(value: string) {
  const compact = value.replace(/\s+/g, "");

  return /^(?:\d{1,4}[./~-]?)+\d{0,4}\.?$/.test(compact) && !/[\p{L}]/u.test(value);
}

function isAchievementFragment(fragment: SentenceFragment) {
  const value = fragment.text.trim();
  const alphabeticChars = value.match(/[\p{L}]/gu)?.length ?? 0;
  const tokenCount = value.split(/\s+/).filter(Boolean).length;

  if (value.length < 24 || alphabeticChars < 6 || tokenCount < 3) {
    return false;
  }

  if (isDateLikeFragment(value)) {
    return false;
  }

  return achievementVerbPattern.test(value) || achievementMetricPattern.test(value);
}

export function extractCandidateProfile(
  input: NormalizedAnalysisInput,
): CandidateProfile {
  const createdAt = new Date().toISOString();
  const fragments = extractSentenceFragments(input.document);
  const summaryFragments = filterFragmentsBySections(fragments, sectionLabelsFor("summary"));
  const experienceFragments = filterFragmentsBySections(
    fragments,
    sectionLabelsFor("experience", "projects", "resume_text"),
  );
  const skillsFragments = filterFragmentsBySections(
    fragments,
    sectionLabelsFor("skills", "resume_text"),
  );
  const educationFragments = filterFragmentsBySections(
    fragments,
    sectionLabelsFor("education", "resume_text"),
  );
  const certificationFragments = filterFragmentsBySections(
    fragments,
    sectionLabelsFor("certifications", "resume_text"),
  );

  const headlineFragment = firstSignal(summaryFragments) ?? firstSignal(fragments);
  const headline =
    headlineFragment && headlineFragment.text.trim().length > 0
      ? buildSignal({
          prefix: "headline",
          index: 0,
          label: "Candidate summary",
          value: headlineFragment.text,
          evidence: [
            toEvidence(
              headlineFragment,
              input.sourceKind,
              "This sentence appears early in the parsed profile and anchors the candidate summary.",
            ),
          ],
          confidence: summaryFragments.length > 0 ? "high" : "medium",
        })
      : null;

  const roleHistory = dedupeByValue(
    experienceFragments.filter((fragment) => roleHistoryPattern.test(fragment.text)),
    (fragment) => fragment.text,
  )
    .slice(0, 4)
    .map((fragment, index) =>
      buildSignal({
        prefix: "role-history",
        index,
        label: "Role history",
        value: fragment.text,
        evidence: [
          toEvidence(
            fragment,
            input.sourceKind,
            "This sentence carries explicit role or responsibility wording.",
          ),
        ],
      }),
    );

  const roleSignals = roleTracks
    .map((track, index) => {
      const evidence = findKeywordEvidence({
        fragments,
        sourceKind: input.sourceKind,
        keywords: track.keywords,
        reason: `Matches ${track.roleTitle.toLowerCase()} taxonomy keywords.`,
      });

      if (evidence.length === 0) {
        return null;
      }

      return buildSignal({
        prefix: "role-signal",
        index,
        label: "Role-family signal",
        value: track.roleTitle,
        evidence,
      });
    })
    .filter((signal): signal is CandidateProfileSignal => signal !== null);

  const skills = dedupeByValue(
    skillVocabulary
      .map((keyword, index) => {
        const evidence = findKeywordEvidence({
          fragments: skillsFragments.length > 0 ? skillsFragments : fragments,
          sourceKind: input.sourceKind,
          keywords: [keyword],
          reason: "Direct mention of a skill or tool in the source text.",
          max: 1,
        });

        if (evidence.length === 0) {
          return null;
        }

        return buildSignal({
          prefix: "skill",
          index,
          label: "Skill or tool",
          value: keyword,
          evidence,
          confidence: skillsFragments.length > 0 ? "high" : "medium",
        });
      })
      .filter((signal): signal is CandidateProfileSignal => signal !== null),
    (signal) => signal.value,
  ).slice(0, 8);

  const domainSignals = roleTracks
    .flatMap((track, trackIndex) =>
      track.targetDomains.map((domain, domainIndex) => {
        const evidence = findKeywordEvidence({
          fragments,
          sourceKind: input.sourceKind,
          keywords: track.keywords,
          reason: `Supporting evidence for ${domain}.`,
        });

        if (evidence.length === 0) {
          return null;
        }

        return buildSignal({
          prefix: "domain",
          index: trackIndex * 10 + domainIndex,
          label: "Domain signal",
          value: domain,
          evidence,
        });
      }),
    )
    .filter((signal): signal is CandidateProfileSignal => signal !== null)
    .filter(
      (signal, index, allSignals) =>
        allSignals.findIndex(
          (entry) => normalize(entry.value) === normalize(signal.value),
        ) === index,
    )
    .slice(0, 4);

  const achievements = dedupeByValue(
    experienceFragments.filter((fragment) => isAchievementFragment(fragment)),
    (fragment) => fragment.text,
  )
    .slice(0, 4)
    .map((fragment, index) =>
      buildSignal({
        prefix: "achievement",
        index,
        label: "Achievement snippet",
        value: fragment.text,
        evidence: [
          toEvidence(
            fragment,
            input.sourceKind,
            "This sentence includes measurable outcomes or strong action verbs.",
          ),
        ],
      }),
    );

  const educationSignals = dedupeByValue(
    educationFragments.filter((fragment) => educationPattern.test(fragment.text)),
    (fragment) => fragment.text,
  )
    .slice(0, 3)
    .map((fragment, index) =>
      buildSignal({
        prefix: "education",
        index,
        label: "Education signal",
        value: fragment.text,
        evidence: [
          toEvidence(
            fragment,
            input.sourceKind,
            "This sentence appears in education-related content.",
          ),
        ],
      }),
    );

  const certificationSignals = dedupeByValue(
    certificationFragments.filter((fragment) => certificationPattern.test(fragment.text)),
    (fragment) => fragment.text,
  )
    .slice(0, 3)
    .map((fragment, index) =>
      buildSignal({
        prefix: "certification",
        index,
        label: "Certification signal",
        value: fragment.text,
        evidence: [
          toEvidence(
            fragment,
            input.sourceKind,
            "This sentence contains certification, license, or award language.",
          ),
        ],
      }),
    );

  const coverageNotes: string[] = [];

  if (roleHistory.length === 0 && roleSignals.length === 0) {
    coverageNotes.push(
      "Role history is weak. Recommendations rely on broader role-family and keyword signals.",
    );
  }

  if (skills.length < 2) {
    coverageNotes.push(
      "Skill coverage is thin. Adding explicit tools or systems would improve recommendation trust.",
    );
  }

  if (achievements.length === 0) {
    coverageNotes.push(
      "No measurable outcomes were extracted. Confidence will stay directional until impact is clearer.",
    );
  }

  if (input.document.quality.flags.includes("sections_not_detected")) {
    coverageNotes.push(
      "Section detection was weak, so evidence mapping may be less precise than in well-structured resumes.",
    );
  }

  if (input.document.quality.flags.includes("possible_ocr_needed")) {
    coverageNotes.push(
      "Parser quality suggests OCR may be needed, so extracted signals should be treated cautiously.",
    );
  }

  return {
    profileVersion: candidateProfileVersion,
    sourceKind: input.sourceKind,
    candidateLabel: input.candidateLabel?.trim() || null,
    createdAt,
    headline,
    roleHistory,
    roleSignals,
    skills,
    domainSignals,
    achievements,
    educationSignals,
    certificationSignals,
    coverageNotes,
  } satisfies CandidateProfile;
}

