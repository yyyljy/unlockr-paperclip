import { notFound } from "next/navigation";

import { loadSessionSnapshot } from "@/lib/analysis-sessions";
import { SessionView } from "@/components/session-view";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const snapshot = await loadSessionSnapshot(sessionId);

  if (!snapshot) {
    notFound();
  }

  const serializedSnapshot = JSON.parse(
    JSON.stringify(snapshot),
  ) as Parameters<typeof SessionView>[0]["initialSnapshot"];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      <SessionView initialSnapshot={serializedSnapshot} />
    </main>
  );
}
