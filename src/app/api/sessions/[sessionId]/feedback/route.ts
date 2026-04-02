import { z } from "zod";

import {
  getAnalysisSession,
  loadSessionSnapshot,
  upsertSessionFeedback,
} from "@/lib/analysis-sessions";
import { feedbackEligibleSessionStatuses } from "@/lib/session-snapshot";

export const runtime = "nodejs";

const feedbackSchema = z.object({
  sentiment: z.enum(["helpful", "not_helpful"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const session = await getAnalysisSession(sessionId);

  if (!session) {
    return Response.json(
      {
        message: "Session not found",
      },
      {
        status: 404,
      },
    );
  }

  if (!feedbackEligibleSessionStatuses.has(session.status)) {
    return Response.json(
      {
        message: "Feedback can only be saved after a terminal recommendation result.",
      },
      {
        status: 409,
      },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        message: "Invalid feedback payload",
      },
      {
        status: 400,
      },
    );
  }

  const parsed = feedbackSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        message: "Invalid feedback payload",
        issues: parsed.error.flatten(),
      },
      {
        status: 400,
      },
    );
  }

  const snapshot = await loadSessionSnapshot(sessionId);

  if (!snapshot?.result) {
    return Response.json(
      {
        message: "Feedback requires a saved session result.",
      },
      {
        status: 409,
      },
    );
  }

  const feedbackEvent = await upsertSessionFeedback({
    analysisSessionId: sessionId,
    sentiment: parsed.data.sentiment,
    note: parsed.data.note,
  });

  return Response.json({
    feedbackEvent,
  });
}
