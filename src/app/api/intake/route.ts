import { z } from "zod";

import {
  createQueuedAnalysisSession,
  maxResumeFileBytes,
  supportedResumeMimeTypes,
} from "@/lib/analysis-sessions";

export const runtime = "nodejs";

const baseSchema = z.object({
  sourceType: z.enum(["file_upload", "pasted_text"]),
  candidateLabel: z.string().trim().max(80).optional(),
  resumeText: z.string().trim().max(12000).optional(),
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const sourceType = formData.get("sourceType");
  const candidateLabel = formData.get("candidateLabel");
  const resumeText = formData.get("resumeText");
  const maybeFile = formData.get("resumeFile");

  const parsedBase = baseSchema.safeParse({
    sourceType,
    candidateLabel:
      typeof candidateLabel === "string" ? candidateLabel : undefined,
    resumeText: typeof resumeText === "string" ? resumeText : undefined,
  });

  if (!parsedBase.success) {
    return Response.json(
      {
        message: "Invalid intake payload",
        issues: parsedBase.error.flatten(),
      },
      {
        status: 400,
      },
    );
  }

  try {
    if (parsedBase.data.sourceType === "pasted_text") {
      if (!parsedBase.data.resumeText || parsedBase.data.resumeText.length < 40) {
        return Response.json(
          {
            message: "Paste more resume detail before submitting.",
          },
          {
            status: 400,
          },
        );
      }

      const session = await createQueuedAnalysisSession({
        sourceType: "pasted_text",
        candidateLabel: parsedBase.data.candidateLabel,
        resumeText: parsedBase.data.resumeText,
      });

      return Response.json({
        sessionId: session.sessionId,
        analysisRunId: session.analysisRunId,
        queueJobId: session.queueJobId,
      });
    }

    if (!(maybeFile instanceof File)) {
      return Response.json(
        {
          message: "Select a resume file before submitting.",
        },
        {
          status: 400,
        },
      );
    }

    if (!supportedResumeMimeTypes.has(maybeFile.type)) {
      return Response.json(
        {
          message: "Only PDF, DOCX, and TXT files are supported.",
        },
        {
          status: 400,
        },
      );
    }

    if (maybeFile.size > maxResumeFileBytes) {
      return Response.json(
        {
          message: `File must be smaller than ${Math.floor(
            maxResumeFileBytes / 1024 / 1024,
          )}MB.`,
        },
        {
          status: 400,
        },
      );
    }

    const session = await createQueuedAnalysisSession({
      sourceType: "file_upload",
      candidateLabel: parsedBase.data.candidateLabel,
      file: maybeFile,
    });

    return Response.json({
      sessionId: session.sessionId,
      analysisRunId: session.analysisRunId,
      queueJobId: session.queueJobId,
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to queue analysis",
      },
      {
        status: 500,
      },
    );
  }
}
