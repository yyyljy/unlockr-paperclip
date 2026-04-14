import Link from "next/link";

const marqueeItems = [
  "resume to direction",
  "evidence first",
  "next move",
];

const heroMetrics = [
  {
    index: "01",
    title: "Signals",
    body: "Work, tools, outcomes.",
  },
  {
    index: "02",
    title: "Direction",
    body: "Fit, gaps, next step.",
  },
] as const;

const keywordHighlights = [
  {
    index: "01",
    title: "Evidence",
    body: "Every direction is tied to actual resume lines.",
  },
  {
    index: "02",
    title: "Direction",
    body: "The clearest next-role signal comes first.",
  },
  {
    index: "03",
    title: "Options",
    body: "Adjacent paths stay visible for comparison.",
  },
] as const;

const sampleEvidence = [
  "Repeated process ownership.",
  "Cross-team alignment shows up clearly.",
] as const;

const alternateDirections = [
  {
    title: "Customer Success Operations",
  },
  {
    title: "Service Operations Planning",
  },
  {
    title: "Product Operations",
  },
] as const;

export default function Home() {
  const repeatedMarquee = [...marqueeItems, ...marqueeItems];

  return (
    <main className="landing-page flex flex-1 flex-col">
      <section className="landing-hero">
        <div className="landing-grid-overlay" aria-hidden="true" />
        <div className="landing-hero-glow" aria-hidden="true" />

        <div className="mx-auto flex min-h-[100svh] w-full max-w-[1520px] flex-col px-5 pb-8 pt-5 md:px-8 lg:px-10">
          <header className="landing-rise flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-white/42">
                Resume Direction Engine
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/start"
                className="inline-flex min-h-[2.75rem] items-center rounded-full bg-[color:var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:opacity-92"
              >
                Start Analysis
              </Link>
              <Link
                href="/sessions"
                className="inline-flex min-h-[2.75rem] items-center rounded-full border border-white/14 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/78 transition hover:border-white/28 hover:text-white"
              >
                Recent Results
              </Link>
            </div>
          </header>

          <div className="grid flex-1 gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,500px)] lg:items-end lg:gap-14 lg:py-12">
            <div className="flex flex-col justify-end">
              <div className="landing-rise landing-delay-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/44">
                  Unlockr / grounded career positioning
                </p>
                <h1 className="mt-3 text-[clamp(4.8rem,12vw,11rem)] font-semibold leading-none tracking-[-0.08em] text-white">
                  Unlockr
                </h1>
              </div>

              <div className="landing-rise landing-delay-2 mt-8 max-w-[42rem]">
                <p className="max-w-[12ch] text-[clamp(1.8rem,3.9vw,4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
                  Stop guessing your next role.
                </p>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/68 md:text-base md:leading-8">
                  Unlockr reads the proof in your resume, names the strongest direction, and shows the next move.
                </p>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
                  product / operations / customer success / data / design
                </p>
              </div>

              <div className="landing-rise landing-delay-3 mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/start"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-[color:var(--accent)] px-7 text-sm font-semibold text-white transition hover:opacity-92"
                >
                  Start with my resume
                </Link>
                <Link
                  href="/sessions"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/14 px-7 text-sm font-semibold text-white/82 transition hover:border-white/28 hover:text-white"
                >
                  View recent results
                </Link>
              </div>

              <div className="landing-rise landing-delay-3 mt-12 grid gap-6 border-t border-white/10 pt-7 md:grid-cols-2">
                {heroMetrics.map((metric) => (
                  <article key={metric.index} className="space-y-3">
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/34">
                      {metric.index}
                    </p>
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-white">{metric.title}</h2>
                      <p className="max-w-xs text-sm leading-7 text-white/62">
                        {metric.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="landing-rise landing-delay-2 relative">
              <div className="pointer-events-none absolute -left-12 top-14 hidden h-28 w-28 rounded-full border border-white/10 lg:block" />
              <div className="pointer-events-none absolute -right-10 bottom-8 hidden h-48 w-48 rounded-full border border-white/10 lg:block" />
              <div className="landing-form-shell">
                <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/44">
                      Direction preview
                    </p>
                  </div>
                  <Link
                    href="/start"
                    className="rounded-full border border-white/14 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/72 transition hover:border-white/28 hover:text-white"
                  >
                    open workspace
                  </Link>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">
                      Most likely direction
                    </p>
                    <h2 className="mt-3 text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                      Operations-Focused Product Manager
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-7 text-white/66">
                      Process, alignment, metrics.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {sampleEvidence.slice(0, 2).map((item) => (
                      <div
                        key={item}
                        className="rounded-[1.35rem] border border-white/10 bg-black/14 p-4 text-sm leading-7 text-white/72"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[1.6rem] border border-white/10 bg-black/14 p-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">
                      Also compare
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {alternateDirections.map((direction) => (
                        <span
                          key={direction.title}
                          className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/74"
                        >
                          {direction.title}
                        </span>
                      ))}
                    </div>
                    <Link
                      href="/start"
                      className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(187,93,57,0.28)] transition hover:bg-[#a84f2d]"
                    >
                      Go to the analysis workspace
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-marquee border-t border-white/10">
          <div className="landing-marquee-track py-4 font-mono text-[11px] uppercase tracking-[0.34em] text-white/38">
            {repeatedMarquee.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-[4.5rem] md:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-10 lg:h-fit">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Keyword 01
            </p>
            <h2 className="mt-4 text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-6xl">
              {keywordHighlights[0].title}
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
              {keywordHighlights[0].body}
            </p>
          </div>

          <div className="grid gap-4 border-t border-[color:var(--border)] pt-7 md:grid-cols-3">
            <div className="border-t border-[color:var(--border)] pt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">
                Resume lines
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                Evidence starts from what is already written.
              </p>
            </div>
            <div className="border-t border-[color:var(--border)] pt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">
                Outcomes
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                Repeated wins make the strongest signal easier to trust.
              </p>
            </div>
            <div className="border-t border-[color:var(--border)] pt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">
                Gaps
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                Missing proof is visible instead of hidden behind a guess.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/8 bg-[#111714] text-[#f4eee2]">
        <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 py-[4.5rem] md:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-10 lg:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/42">
              Keyword 02
            </p>
            <h2 className="mt-4 max-w-[11ch] text-4xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-5xl">
              {keywordHighlights[1].title}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/70 md:text-base">
              {keywordHighlights[1].body}
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="border-t border-white/10 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/38">
                  Primary fit
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                  Operations-Focused Product Manager
                </p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/38">
                  Next move
                </p>
                <p className="mt-3 text-sm leading-7 text-white/74">
                  Add decision ownership and scope to strengthen the match.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-10 lg:pt-16">
            <div className="border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/42">
                Why this route
              </p>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-white/74">
                {sampleEvidence.map((item) => (
                  <li key={item} className="border-t border-white/10 pt-4">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="border-t border-white/10 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/42">
                  Why first
                </p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  The clearest pattern is repeated operations ownership.
                </p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/42">
                  Decision value
                </p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  One strongest route makes the output easier to act on.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-[4.5rem] md:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Keyword 03
            </p>
            <h2 className="mt-4 max-w-[11ch] text-4xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-5xl">
              {keywordHighlights[2].title}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
              {keywordHighlights[2].body}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/start"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#171411] bg-[#171411] px-6 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(23,20,17,0.16)] transition hover:bg-[#0f0c09]"
                style={{ color: "#ffffff" }}
              >
                Start analyzing now
              </Link>
              <Link
                href="/sessions"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 text-sm font-semibold transition hover:bg-black/4"
              >
                Reopen recent results
              </Link>
            </div>
          </div>

          <div className="space-y-10">
            <div className="border-t border-[color:var(--border)] pt-6">
              <div className="flex flex-wrap gap-2">
                {alternateDirections.map((direction) => (
                  <span
                    key={direction.title}
                    className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium"
                  >
                    {direction.title}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="border-t border-[color:var(--border)] pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">
                  Adjacent fit
                </p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
                  Similar paths stay on screen so the recommendation does not feel narrow.
                </p>
              </div>
              <div className="border-t border-[color:var(--border)] pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">
                  Comparison
                </p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
                  Users can scan alternatives without losing the main direction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
