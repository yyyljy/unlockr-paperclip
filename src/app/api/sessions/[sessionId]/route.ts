import { loadSessionSnapshot } from "@/lib/analysis-sessions";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const snapshot = await loadSessionSnapshot(sessionId);

  if (!snapshot) {
    return Response.json(
      {
        message: "Session not found",
      },
      {
        status: 404,
      },
    );
  }

  return Response.json(snapshot);
}
