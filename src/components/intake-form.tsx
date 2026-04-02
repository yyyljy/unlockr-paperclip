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
  const sourceHint =
    sourceType === "pasted_text"
      ? "Pasted text is normalized and scored through the shared recommendation pipeline."
      : "File upload parses PDF, DOCX, and TXT into the same downstream analysis flow as pasted text.";

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
      <div className="flex flex-wrap gap-3 text-sm font-medium">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2">
          <input
            type="radio"
            value="pasted_text"
            className="accent-[color:var(--accent)]"
            {...register("sourceType")}
          />
          Paste text
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2">
          <input
            type="radio"
            value="file_upload"
            className="accent-[color:var(--accent)]"
            {...register("sourceType")}
          />
          Upload file
        </label>
      </div>

      <p className="text-sm text-[color:var(--muted-foreground)]">{sourceHint}</p>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Candidate label</span>
        <input
          type="text"
          placeholder="Optional, used in the summary headline"
          className="w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
          {...register("candidateLabel")}
        />
        {errors.candidateLabel ? (
          <span className="text-sm text-[color:var(--danger)]">
            {errors.candidateLabel.message}
          </span>
        ) : null}
      </label>

      {sourceType === "pasted_text" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium">Resume or self-introduction text</span>
          <textarea
            rows={10}
            placeholder="Paste experience bullets, project descriptions, responsibilities, and any measurable outcomes."
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
            className="block w-full rounded-2xl border border-dashed border-[color:var(--border)] bg-white/80 px-4 py-6 text-sm"
            {...register("resumeFile")}
          />
          <span className="text-sm text-[color:var(--muted-foreground)]">
            Phase 1 limit: 8MB. Parser failures are reserved for real extraction problems.
          </span>
          {errors.resumeFile ? (
            <span className="text-sm text-[color:var(--danger)]">
              {errors.resumeFile.message as string}
            </span>
          ) : null}
        </label>
      )}

      {apiError ? (
        <div className="rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-surface)] px-4 py-3 text-sm text-[color:var(--danger)]">
          {apiError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Opening session..." : "Start analysis session"}
      </button>
    </form>
  );
}
