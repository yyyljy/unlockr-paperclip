import type { CandidateProfile } from "@/lib/candidate-profile";
import type { AnalysisResult } from "@/lib/contracts/recommendations";
import { analyzeResumeInputWithModel } from "@/lib/model-backed-recommendations";
import type { NormalizedAnalysisInput } from "@/lib/resume-intake";
import { analyzeResumeInput } from "@/lib/rule-engine";

export async function generateRecommendationResult(input: {
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
}): Promise<AnalysisResult> {
  const modelResult = await analyzeResumeInputWithModel(input);

  if (modelResult) {
    return modelResult;
  }

  return analyzeResumeInput(input);
}
