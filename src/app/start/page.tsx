import type { Metadata } from "next";
import Link from "next/link";

import { IntakeForm } from "@/components/intake-form";

const workspaceNotes = [
  {
    label: "Best input",
    value:
      "The strongest results usually come from resumes that make scope, tools, domain context, and measurable outcomes explicit.",
  },
  {
    label: "What happens next",
    value:
      "After submit, Unlockr parses the source, builds a candidate profile, and renders the live result view for that session.",
  },
  {
    label: "If evidence is thin",
    value:
      "The system stays explicit about uncertainty and lets you retry with clarification instead of forcing a polished guess.",
  },
] as const;

const workspaceChecklist = [
  "Use pasted text when you already have a clean editable version.",
  "Use file upload when the original document itself matters.",
  "Add a draft label only if you want to distinguish multiple attempts later.",
] as const;

export const metadata: Metadata = {
  title: "Unlockr | Start Analysis",
  description:
    "Start a new Unlockr resume analysis from pasted text or a file upload.",
};

export default function StartPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <section className="flex flex-col gap-5 rounded-[2.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">
              Analysis Workspace
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              Start a new resume analysis
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base md:leading-8">
              This screen is intentionally separate from the landing page. Use it when
              you want to submit input, get into a live session quickly, and work from
              the actual result.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border)] px-5 font-semibold transition hover:bg-white/70"
            >
              Back to Landing
            </Link>
            <Link
              href="/sessions"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-5 font-semibold text-white transition hover:opacity-90"
            >
              Open Recent Sessions
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {workspaceNotes.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/75 p-4"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                {item.label}
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[2.5rem] bg-[#111714] p-6 shadow-[0_18px_50px_rgba(18,19,20,0.18)] md:p-8">
          <IntakeForm />
        </div>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
              Before you submit
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {workspaceChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
              After submit
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.35rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm font-semibold">1. Session opens</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  The app redirects into a live session page immediately.
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm font-semibold">2. Parsing and analysis run</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  The worker reads the source, builds the profile, and prepares grounded recommendations.
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm font-semibold">3. You can retry from context</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  If the evidence is thin or parsing fails, recovery stays inside the session flow.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
