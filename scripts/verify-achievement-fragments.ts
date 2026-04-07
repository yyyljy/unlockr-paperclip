import assert from "node:assert/strict";
import process from "node:process";

import { loadEnvConfig } from "@next/env";

import { extractCandidateProfile } from "@/lib/candidate-profile";
import { buildDirectTextAnalysisInput } from "@/lib/resume-intake";

loadEnvConfig(process.cwd());

const input = buildDirectTextAnalysisInput({
  text: `
2012. 01. 16 ~ 2014. 01. 16
Senior backend engineer supporting event APIs and commerce flows.
Led onboarding redesign and reduced time-to-first-value by 28%.
Built abuse-prevention controls with Redis and saved the operations team 12 hours per week.
2024.
`,
  sourceLabel: "achievement-fragment-verification",
});

const profile = extractCandidateProfile(input);

assert.equal(profile.achievements.length, 2);
assert.ok(
  profile.achievements.every(
    (achievement) => !/^\s*\d{2,4}(?:[./~-]\d{1,4})*\s*\.?\s*$/.test(achievement.value),
  ),
);
assert.ok(profile.achievements[0]?.value.includes("reduced time-to-first-value by 28%"));
assert.ok(profile.achievements[1]?.value.includes("saved the operations team 12 hours per week"));

console.log(
  JSON.stringify(
    {
      achievementCount: profile.achievements.length,
      achievements: profile.achievements.map((achievement) => achievement.value),
    },
    null,
    2,
  ),
);
