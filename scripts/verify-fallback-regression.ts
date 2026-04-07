import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { loadEnvConfig } from "@next/env";

import { extractCandidateProfile } from "@/lib/candidate-profile";
import { analyzeResumeInput } from "@/lib/rule-engine";
import { buildDirectTextAnalysisInput } from "@/lib/resume-intake";

loadEnvConfig(process.cwd());

async function main() {
  const fixturePath = path.join(process.cwd(), "fixtures/model-backed-resume-sample.txt");
  const fixtureText = await readFile(fixturePath, "utf8");
  const analysisInput = buildDirectTextAnalysisInput({
    text: fixtureText,
    sourceLabel: "fallback-keyword-regression",
  });
  const profile = extractCandidateProfile(analysisInput);
  const result = analyzeResumeInput({
    analysisInput,
    profile,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.metadata.recommendationPath, "fallback");
  assert.ok(
    !profile.roleSignals.some((signal) => signal.value === "Frontend Engineer"),
    "Representative product-operations fixture should not emit a frontend role signal.",
  );
  assert.equal(result.recommendations[0]?.roleTitle, "Product Operations Manager");
  assert.ok(
    !result.recommendations.some(
      (recommendation) =>
        recommendation.roleTitle === "Frontend Engineer" &&
        recommendation.confidence.label === "high",
    ),
    "Representative product-operations fixture should not produce a high-confidence frontend recommendation.",
  );

  console.log(
    JSON.stringify(
      {
        topRecommendation: result.recommendations[0]?.roleTitle ?? null,
        roleSignals: profile.roleSignals.map((signal) => signal.value),
        recommendationTitles: result.recommendations.map(
          (recommendation) => recommendation.roleTitle,
        ),
      },
      null,
      2,
    ),
  );
}

void main();
