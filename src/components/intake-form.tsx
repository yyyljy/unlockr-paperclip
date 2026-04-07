"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const intakeFormSchema = z
  .object({
    sourceType: z.enum(["pasted_text", "file_upload"]),
    candidateLabel: z.string().trim().max(80).optional(),
    resumeText: z.string().max(12000).optional(),
    resumeFile: z.any().optional(),
  })
  .superRefine((value, context) => {
    const files = value.resumeFile as FileList | undefined;
    const hasFile = files && files.length > 0;

    if (value.sourceType === "pasted_text" && !value.resumeText?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["resumeText"],
        message: "Paste resume text to run the recommendation flow.",
      });
    }

    if (value.sourceType === "file_upload" && !hasFile) {
      context.addIssue({
        code: "custom",
        path: ["resumeFile"],
        message: "Select a PDF, DOCX, or TXT file.",
      });
    }
  });

type IntakeFormValues = z.infer<typeof intakeFormSchema>;

export function IntakeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      sourceType: "pasted_text",
      candidateLabel: "",
      resumeText: "",
    },
  });

  const sourceType = useWatch({
    control,
    name: "sourceType",
  });
  const sourceOptions = [
    {
      value: "pasted_text" as const,
      title: "Paste resume text",
      description:
        "Best when you already copied the profile into plain text and want the fastest review pass.",
      helper:
        "Paste responsibilities, tools, domains, and measurable outcomes. Unlockr will analyze the text directly.",
      submitLabel: "Analyze pasted resume text",
      ctaHelper:
        "Use this when you want the quickest route from copied experience to a reviewable session.",
    },
    {
      value: "file_upload" as const,
      title: "Upload resume file",
      description:
        "Best when the original PDF, DOCX, or TXT file is still the clearest source of record.",
      helper:
        "Unlockr will extract the file first, then send the text through the same recommendation flow.",
      submitLabel: "Analyze uploaded resume",
      ctaHelper:
        "Use this when the formatted resume file is more complete than the text you have on hand.",
    },
  ];
  const activeSourceOption =
    sourceOptions.find((option) => option.value === sourceType) ?? sourceOptions[0];

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);

    const formData = new FormData();
    formData.set("sourceType", values.sourceType);

    if (values.candidateLabel?.trim()) {
      formData.set("candidateLabel", values.candidateLabel.trim());
    }

    if (values.sourceType === "pasted_text") {
      formData.set("resumeText", values.resumeText?.trim() ?? "");
    }

    if (values.sourceType === "file_upload") {
      const files = values.resumeFile as FileList | undefined;

      if (files?.[0]) {
        formData.set("resumeFile", files[0]);
      }
    }

    const response = await fetch("/api/intake", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | { sessionId?: string; message?: string }
      | null;

    if (!response.ok || !payload?.sessionId) {
      setApiError(payload?.message ?? "Failed to queue analysis session.");
      return;
    }

    startTransition(() => {
      router.push(`/sessions/${payload.sessionId}`);
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-[0_18px_60px_rgba(18,19,20,0.08)] backdrop-blur"
    >
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          Start a session
        </p>
        <div>
          <h2 className="text-2xl font-semibold">Submit the resume Unlockr should read</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
            Choose the source you already have, then open a session that stays
            visible while analysis runs.
          </p>
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-[color:var(--border)] bg-white/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          Step 1
        </p>
        <h3 className="mt-2 text-lg font-semibold">Choose the input source</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sourceOptions.map((option) => {
            const isSelected = sourceType === option.value;

            return (
              <label
                key={option.value}
                className={
                  isSelected
                    ? "cursor-pointer rounded-[1.5rem] border border-[color:var(--accent)] bg-white p-4 shadow-[0_16px_40px_rgba(18,19,20,0.08)]"
                    : "cursor-pointer rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 transition hover:bg-white/80"
                }
              >
                <input
                  type="radio"
                  value={option.value}
                  className="sr-only"
                  {...register("sourceType")}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{option.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                      {option.description}
                    </p>
                  </div>
                  <span
                    className={
                      isSelected
                        ? "rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-strong)]"
                        : "rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted-foreground)]"
                    }
                  >
                    {isSelected ? "Selected" : "Available"}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--border)] bg-white/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Step 2
            </p>
            <h3 className="mt-2 text-lg font-semibold">{activeSourceOption.title}</h3>
          </div>
          <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            {sourceType === "pasted_text" ? "Fastest review path" : "Original file path"}
          </div>
        </div>

        <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
          {activeSourceOption.helper}
        </p>

        <div className="mt-4">
          {sourceType === "pasted_text" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium">Resume or self-introduction text</span>
              <textarea
                rows={10}
                placeholder="Paste experience bullets, project descriptions, responsibilities, tools, and measurable outcomes."
                className="w-full rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                {...register("resumeText")}
              />
              {errors.resumeText ? (
                <span className="text-sm text-[color:var(--danger)]">
                  {errors.resumeText.message}
                </span>
              ) : null}
            </label>
          ) : (
            <label className="block space-y-2">
              <span className="text-sm font-medium">Resume file</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="block w-full rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-white/80 px-4 py-6 text-sm"
                {...register("resumeFile")}
              />
              <span className="text-sm text-[color:var(--muted-foreground)]">
                PDF, DOCX, and TXT supported. Phase 1 limit: 8MB.
              </span>
              {errors.resumeFile ? (
                <span className="text-sm text-[color:var(--danger)]">
                  {errors.resumeFile.message as string}
                </span>
              ) : null}
            </label>
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          Optional
        </p>
        <label className="mt-3 block space-y-2">
          <span className="text-sm font-medium">Add a candidate label for the queue</span>
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
            Use a person name or shorthand only if it helps you scan the review
            surface later.
          </p>
          <input
            type="text"
            placeholder="Example: Growth PM draft"
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            {...register("candidateLabel")}
          />
          {errors.candidateLabel ? (
            <span className="text-sm text-[color:var(--danger)]">
              {errors.candidateLabel.message}
            </span>
          ) : null}
        </label>
      </section>

      {apiError ? (
        <div className="rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-surface)] px-4 py-3 text-sm text-[color:var(--danger)]">
          {apiError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Opening session..." : activeSourceOption.submitLabel}
        </button>
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
          {activeSourceOption.ctaHelper}
        </p>
      </div>
    </form>
  );
}
