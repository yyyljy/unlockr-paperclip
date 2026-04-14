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
        message: "Paste your resume or profile text.",
      });
    }

    if (value.sourceType === "file_upload" && !hasFile) {
      context.addIssue({
        code: "custom",
        path: ["resumeFile"],
        message: "Choose a PDF, DOCX, or TXT file.",
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
      title: "Paste text",
      description: "Fastest review path",
      helper: "Best when you already have clean, editable text.",
      submitLabel: "Start with text",
      ctaHelper: "You will move directly into the live result view.",
      badge: "fastest",
      inputLabel: "Resume or profile text",
      placeholder:
        "Paste a version that makes your responsibilities, projects, tools, domain context, and measurable outcomes clear.",
    },
    {
      value: "file_upload" as const,
      title: "Upload file",
      description: "Use the original document",
      helper: "Best when you want to analyze the submitted file directly.",
      submitLabel: "Start with a file",
      ctaHelper: "You will continue into the same result view with the uploaded file.",
      badge: "document",
      inputLabel: "Resume file",
      placeholder: "",
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
      setApiError(
        payload?.message ?? "Could not start the analysis request. Please try again in a moment.",
      );
      return;
    }

    startTransition(() => {
      router.push(`/sessions/${payload.sessionId}`);
    });
  });

  return (
    <form id="resume-intake" onSubmit={onSubmit} className="space-y-5 text-[#f4eee2]">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/44">
          Analysis input
        </p>
        <div>
          <h2 className="text-[1.65rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
            Start a new resume analysis
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-7 text-white/64">
            Choose pasted text or an upload. Stronger results usually come from clear scope, tools, context, and measurable outcomes.
          </p>
        </div>
      </div>

      <section className="rounded-[1.8rem] border border-white/10 bg-black/12 p-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">
            Step 1
          </p>
          <h3 className="mt-3 text-lg font-semibold text-white">Choose an input mode</h3>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sourceOptions.map((option) => {
            const isSelected = sourceType === option.value;

            return (
              <label
                key={option.value}
                className={
                  isSelected
                    ? "cursor-pointer rounded-[1.5rem] border border-[color:var(--accent)] bg-white/[0.07] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.16)]"
                    : "cursor-pointer rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
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
                    <p className="text-sm font-semibold text-white">{option.title}</p>
                    <p className="mt-2 text-sm font-medium text-white/82">
                      {option.description}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/58">{option.helper}</p>
                  </div>
                  <span
                    className={
                      isSelected
                        ? "rounded-full bg-[color:var(--accent-soft)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--accent-strong)]"
                        : "rounded-full border border-white/12 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-white/44"
                    }
                  >
                    {option.badge}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-white/10 bg-black/12 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">
              Step 2
            </p>
            <h3 className="mt-3 text-lg font-semibold text-white">{activeSourceOption.title}</h3>
          </div>
          <div className="rounded-full border border-white/12 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">
            {activeSourceOption.badge}
          </div>
        </div>

        <p className="mt-3 text-sm leading-7 text-white/60">{activeSourceOption.helper}</p>

        <div className="mt-5">
          {sourceType === "pasted_text" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white/86">
                {activeSourceOption.inputLabel}
              </span>
              <textarea
                rows={10}
                placeholder={activeSourceOption.placeholder}
                className="w-full rounded-[1.5rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-white outline-none transition placeholder:text-white/28 focus:border-[color:var(--accent)]"
                {...register("resumeText")}
              />
              {errors.resumeText ? (
                <span className="text-sm text-[#ffb0a0]">{errors.resumeText.message}</span>
              ) : null}
            </label>
          ) : (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white/86">
                {activeSourceOption.inputLabel}
              </span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="block w-full rounded-[1.5rem] border border-dashed border-white/16 bg-white/[0.05] px-4 py-6 text-sm text-white/78 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#121314]"
                {...register("resumeFile")}
              />
              <span className="text-sm leading-6 text-white/54">
                PDF, DOCX, and TXT are supported. The upload limit is 8MB.
              </span>
              {errors.resumeFile ? (
                <span className="text-sm text-[#ffb0a0]">
                  {errors.resumeFile.message as string}
                </span>
              ) : null}
            </label>
          )}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">
          Optional
        </p>
        <label className="mt-3 block space-y-2">
          <span className="text-sm font-medium text-white/86">Label this draft</span>
          <p className="text-sm leading-6 text-white/56">
            Useful when you want to distinguish multiple versions in the results list.
          </p>
          <input
            type="text"
            placeholder="Example: PM transition draft"
            className="w-full rounded-[1.4rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-[color:var(--accent)]"
            {...register("candidateLabel")}
          />
          {errors.candidateLabel ? (
            <span className="text-sm text-[#ffb0a0]">{errors.candidateLabel.message}</span>
          ) : null}
        </label>
      </section>

      {apiError ? (
        <div className="rounded-[1.4rem] border border-[#7f4639] bg-[#49251f] px-4 py-3 text-sm text-[#ffd4ca]">
          {apiError}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-14 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Opening results..." : activeSourceOption.submitLabel}
        </button>
        <p className="max-w-sm text-sm leading-6 text-white/56">{activeSourceOption.ctaHelper}</p>
      </div>
    </form>
  );
}
