import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { loadEnvConfig } from "@next/env";

import { extractCandidateProfile } from "@/lib/candidate-profile";
import { generateRecommendationResult } from "@/lib/recommendation-engine";
import { buildDirectTextAnalysisInput } from "@/lib/resume-intake";
import { ModelRecommendationError } from "@/lib/model-backed-recommendations";

loadEnvConfig(process.cwd());

async function main() {
  const previousEnv = {
    CODEX_RECOMMENDATION_ENABLED: process.env.CODEX_RECOMMENDATION_ENABLED,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_RECOMMENDATION_MODEL: process.env.OPENAI_RECOMMENDATION_MODEL,
    OPENAI_RECOMMENDATION_PROMPT_VERSION:
      process.env.OPENAI_RECOMMENDATION_PROMPT_VERSION,
  };

  process.env.CODEX_RECOMMENDATION_ENABLED = "false";
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_RECOMMENDATION_MODEL;
  delete process.env.OPENAI_RECOMMENDATION_PROMPT_VERSION;

  try {
    const fixturePath = path.join(process.cwd(), "fixtures", "model-backed-resume-sample.txt");
    const fixtureText = await readFile(fixturePath, "utf8");
    const analysisInput = buildDirectTextAnalysisInput({
      text: fixtureText,
      sourceLabel: "model-required-verification",
    });
    const profile = extractCandidateProfile(analysisInput);

    await assert.rejects(
      () => generateRecommendationResult({ analysisInput, profile }),
      (error: unknown) => {
        assert.ok(error instanceof ModelRecommendationError);
        assert.equal(error.errorCode, "model_provider_not_configured");
        assert.match(error.message, /AI recommendation is not configured/i);
        return true;
      },
    );

    console.log(
      JSON.stringify(
        {
          status: "ok",
          expectedError: "model_provider_not_configured",
        },
        null,
        2,
      ),
    );
  } finally {
    process.env.CODEX_RECOMMENDATION_ENABLED = previousEnv.CODEX_RECOMMENDATION_ENABLED;

    if (previousEnv.OPENAI_API_KEY === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    }

    if (previousEnv.OPENAI_RECOMMENDATION_MODEL === undefined) {
      delete process.env.OPENAI_RECOMMENDATION_MODEL;
    } else {
      process.env.OPENAI_RECOMMENDATION_MODEL = previousEnv.OPENAI_RECOMMENDATION_MODEL;
    }

    if (previousEnv.OPENAI_RECOMMENDATION_PROMPT_VERSION === undefined) {
      delete process.env.OPENAI_RECOMMENDATION_PROMPT_VERSION;
    } else {
      process.env.OPENAI_RECOMMENDATION_PROMPT_VERSION =
        previousEnv.OPENAI_RECOMMENDATION_PROMPT_VERSION;
    }
  }
}

void main();
