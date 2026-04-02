import Link from "next/link";

import { IntakeForm } from "@/components/intake-form";
import { sampleAnalysisResult } from "@/lib/contracts/recommendations";

export default function Home() {
  const foundationCards = [
    {
      title: "Database",
      description:
        "Postgres plus Drizzle migrations for reproducible sessions, runs, recommendation sets, and evidence rows.",
    },
    {
      title: "Storage",
      description:
        "S3-compatible object storage for raw resume files with deterministic storage keys and hash tracking.",
    },
    {
      title: "Queue",
      description:
        "BullMQ on Redis for background parse and recommendation stages, separated from request threads.",
    },
  ];

  const trustRails = [
    "Every recommendation carries evidence snippets.",
    "Low-confidence and insufficient-evidence states are explicit product outputs.",
    "Parser and model versions are stored with the contract from day one.",
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
            Unlockr • Phase 1 intake
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Resume intake and recommendation contracts, before the UI gloss.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[color:var(--muted-foreground)] md:text-lg">
              This workspace locks the critical trust surface first: uploads and
              pasted text enter a reproducible analysis pipeline, recommendation
              outputs stay evidence-grounded, and failure states remain explicit.
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
            {foundationCards.map((card) => (
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
              Trust rails
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
            Product states
          </p>
          <div className="mt-4 space-y-4 text-sm leading-7">
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="font-semibold">Ready</p>
              <p className="mt-1 text-[color:var(--muted-foreground)]">
                Recommendation objects return evidence, confidence, and concrete
                next-step guidance.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="font-semibold">Insufficient evidence</p>
              <p className="mt-1 text-[color:var(--muted-foreground)]">
                Weak or overly short inputs return follow-up questions instead of
                overconfident advice.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="font-semibold">Parser failure</p>
              <p className="mt-1 text-[color:var(--muted-foreground)]">
                Uploads now parse into shared downstream input; this state is
                reserved for real extraction failures and unusable files.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-[color:var(--border)] bg-[#1c1714] p-6 text-[#f7f0e8] shadow-[0_20px_60px_rgba(19,13,10,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#dcc8bb]">
                Recommendation contract preview
              </p>
              <h2 className="mt-2 text-2xl font-semibold">`docs/recommendation-contract.md` mirrored in code</h2>
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
