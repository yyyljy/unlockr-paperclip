import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { loadEnvConfig } from "@next/env";

import { extractCandidateProfile } from "@/lib/candidate-profile";
import { generateRecommendationResult } from "@/lib/recommendation-engine";
import { buildDirectTextAnalysisInput } from "@/lib/resume-intake";

loadEnvConfig(process.cwd());

async function main() {
  const fixturePath =
    process.argv[2] ??
    path.join(process.cwd(), "fixtures", "model-backed-resume-sample.txt");

  const resumeText = await readFile(fixturePath, "utf8");
  const analysisInput = buildDirectTextAnalysisInput({
    text: resumeText,
    sourceLabel: "model-backed-verification",
  });
  const profile = extractCandidateProfile(analysisInput);
  const result = await generateRecommendationResult({
    analysisInput,
    profile,
  });

  console.log(
    JSON.stringify(
      {
        fixturePath,
        status: result.status,
        recommendationPath: result.metadata.recommendationPath,
        provider: result.metadata.model?.provider ?? null,
        modelVersion: result.metadata.model?.version ?? null,
        promptVersion: result.metadata.model?.promptVersion ?? null,
        topRecommendation:
          result.status === "ready" ? result.recommendations[0]?.roleTitle ?? null : null,
      },
      null,
      2,
    ),
  );

  if (result.metadata.recommendationPath !== "model_backed") {
    console.error(
      "Expected the verification fixture to reach the model-backed path. Check the codex-local or OpenAI recommendation env vars and worker logs.",
    );
    process.exit(1);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
