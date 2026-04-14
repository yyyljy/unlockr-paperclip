import type { CandidateProfile } from "@/lib/candidate-profile";
import type { AnalysisResult } from "@/lib/contracts/recommendations";
import { analyzeResumeInputWithModel } from "@/lib/model-backed-recommendations";
import type { NormalizedAnalysisInput } from "@/lib/resume-intake";

export async function generateRecommendationResult(input: {
  analysisInput: NormalizedAnalysisInput;
  profile: CandidateProfile;
}): Promise<AnalysisResult> {
  return analyzeResumeInputWithModel(input);
}
