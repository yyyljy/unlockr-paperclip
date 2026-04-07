import Link from "next/link";

import { IntakeForm } from "@/components/intake-form";
import { sampleAnalysisResult } from "@/lib/contracts/recommendations";

export default function Home() {
  const supportCards = [
    {
      title: "Who it helps",
      description:
        "People with real experience who want a clearer read on where their background can grow next.",
    },
    {
      title: "What you submit",
      description:
        "Paste resume or self-introduction text, or upload the original PDF, DOCX, or TXT file.",
    },
    {
      title: "What comes back",
      description:
        "A headline summary, ranked role directions, evidence snippets, risks, and concrete next steps.",
    },
  ];

  const trustRails = [
    "Trust the direction when the evidence snippets clearly match the roles, tools, and outcomes in the source material.",
    "Question the result when Unlockr flags thin evidence or asks follow-up questions instead of stretching past the input.",
    "Retry the source when file extraction fails or when the resume leaves out domain, tool, or ownership detail.",
  ];
  const exampleRecommendation =
    sampleAnalysisResult.status === "ready"
      ? sampleAnalysisResult.recommendations[0]
      : null;

  const contractPreview = JSON.stringify(
    {
      status: sampleAnalysisResult.status,
      metadata: sampleAnalysisResult.metadata,
      recommendationShape: exampleRecommendation,
    },
    null,
    2,
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-10 md:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-[color:var(--border)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">
            Unlockr • Resume direction MVP
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Submit a resume and get evidence-backed career directions.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[color:var(--muted-foreground)] md:text-lg">
              Unlockr helps people turn existing experience into ranked role
              directions, evidence-backed fit summaries, and the next actions to
              strengthen the path that looks most credible.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/sessions"
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Review recent sessions
            </Link>
            <a
              href="/api/health"
              className="rounded-full border border-[color:var(--border)] px-5 py-3 transition hover:bg-white/70"
            >
              Check health
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {supportCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5"
              >
                <p className="text-sm font-semibold">{card.title}</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  {card.description}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-[2rem] border border-[color:var(--border)] bg-white/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              When to trust or question the result
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {trustRails.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-sm leading-7"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <IntakeForm />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            What the first pass can return
          </p>
          <div className="mt-4 space-y-4 text-sm leading-7">
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="font-semibold">Ready to review</p>
              <p className="mt-1 text-[color:var(--muted-foreground)]">
                Unlockr found enough evidence to rank role directions and attach
                concrete next-step guidance.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="font-semibold">Needs more detail</p>
              <p className="mt-1 text-[color:var(--muted-foreground)]">
                Thin inputs return follow-up questions instead of overconfident
                advice.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="font-semibold">Needs cleaner input</p>
              <p className="mt-1 text-[color:var(--muted-foreground)]">
                File uploads that cannot be extracted cleanly stay visible and
                point to the safest retry path.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-[color:var(--border)] bg-[#1c1714] p-6 text-[#f7f0e8] shadow-[0_20px_60px_rgba(19,13,10,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#dcc8bb]">
                Trust surface preview
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Every result keeps evidence and model context together
              </h2>
            </div>
            <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#dcc8bb]">
              v1
            </span>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-[1.5rem] bg-black/20 p-4 font-mono text-xs leading-6 text-[#f9e7db]">
            {contractPreview}
          </pre>
        </article>
      </section>
    </main>
  );
}
