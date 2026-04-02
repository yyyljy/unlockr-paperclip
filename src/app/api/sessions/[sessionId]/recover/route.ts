import { z } from "zod";

import {
  createRecoveryAnalysisSession,
  maxRecoveryClarificationLength,
  maxResumeFileBytes,
  maxResumeTextLength,
  minRecoveryClarificationLength,
  minResumeTextLength,
  RecoverySessionError,
  supportedResumeMimeTypes,
} from "@/lib/analysis-sessions";

export const runtime = "nodejs";

const clarificationRecoverySchema = z.object({
  mode: z.literal("clarification"),
  clarificationText: z
    .string()
    .trim()
    .min(minRecoveryClarificationLength)
    .max(maxRecoveryClarificationLength),
});

const pastedTextRecoverySchema = z.object({
  mode: z.literal("pasted_text"),
  resumeText: z.string().trim().min(minResumeTextLength).max(maxResumeTextLength),
});

type RecoverRequestPayload =
  | {
      mode: "clarification";
      clarificationText: string;
    }
  | {
      mode: "pasted_text";
      resumeText: string;
    }
  | {
      mode: "file_upload";
      file: File;
    };

function invalidRecoveryResponse(message: string, issues?: unknown) {
  return Response.json(
    {
      message,
      issues,
    },
    {
      status: 400,
    },
  );
}

async function parseRecoveryRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const parsed = clarificationRecoverySchema.safeParse({
      mode: "clarification",
      clarificationText: body?.clarificationText,
    });

    if (!parsed.success) {
      return {
        data: null,
        error: invalidRecoveryResponse(
          "Add a short clarification before retrying the session.",
          parsed.error.flatten(),
        ),
      };
    }

    return {
      data: parsed.data satisfies RecoverRequestPayload,
      error: null,
    };
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return {
      data: null,
      error: invalidRecoveryResponse("Invalid recovery payload."),
    };
  }

  const mode = formData.get("mode");

  if (mode === "clarification") {
    const parsed = clarificationRecoverySchema.safeParse({
      mode,
      clarificationText: formData.get("clarificationText"),
    });

    if (!parsed.success) {
      return {
        data: null,
        error: invalidRecoveryResponse(
          "Add a short clarification before retrying the session.",
          parsed.error.flatten(),
        ),
      };
    }

    return {
      data: parsed.data satisfies RecoverRequestPayload,
      error: null,
    };
  }

  if (mode === "pasted_text") {
    const parsed = pastedTextRecoverySchema.safeParse({
      mode,
      resumeText: formData.get("resumeText"),
    });

    if (!parsed.success) {
      return {
        data: null,
        error: invalidRecoveryResponse(
          "Paste more clean resume text before starting a recovery session.",
          parsed.error.flatten(),
        ),
      };
    }

    return {
      data: parsed.data satisfies RecoverRequestPayload,
      error: null,
    };
  }

  if (mode !== "file_upload") {
    return {
      data: null,
      error: invalidRecoveryResponse("Choose how to recover this session before retrying."),
    };
  }

  const maybeFile = formData.get("resumeFile");

  if (!(maybeFile instanceof File)) {
    return {
      data: null,
      error: invalidRecoveryResponse(
        "Select a replacement PDF, DOCX, or TXT file before retrying.",
      ),
    };
  }

  if (!supportedResumeMimeTypes.has(maybeFile.type)) {
    return {
      data: null,
      error: invalidRecoveryResponse("Only PDF, DOCX, and TXT files are supported."),
    };
  }

  if (maybeFile.size > maxResumeFileBytes) {
    return {
      data: null,
      error: invalidRecoveryResponse(
        `File must be smaller than ${Math.floor(maxResumeFileBytes / 1024 / 1024)}MB.`,
      ),
    };
  }

  return {
    data: {
      mode: "file_upload",
      file: maybeFile,
    } satisfies RecoverRequestPayload,
    error: null,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const parsedRequest = await parseRecoveryRequest(request);

  if (parsedRequest.error || !parsedRequest.data) {
    return parsedRequest.error ?? invalidRecoveryResponse("Invalid recovery payload.");
  }

  try {
    const session = await createRecoveryAnalysisSession({
      sourceSessionId: sessionId,
      ...parsedRequest.data,
    });

    return Response.json(session);
  } catch (error) {
    if (error instanceof RecoverySessionError) {
      return Response.json(
        {
          message: error.message,
        },
        {
          status: error.statusCode,
        },
      );
    }

    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to start the recovery session.",
      },
      {
        status: 500,
      },
    );
  }
}
