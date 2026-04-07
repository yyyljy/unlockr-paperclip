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
        message: "이력서나 자기소개 텍스트를 붙여 넣어 주세요.",
      });
    }

    if (value.sourceType === "file_upload" && !hasFile) {
      context.addIssue({
        code: "custom",
        path: ["resumeFile"],
        message: "PDF, DOCX, TXT 파일을 선택해 주세요.",
      });
    }
  });

type IntakeFormValues = z.infer<typeof intakeFormSchema>;

const orientationItems = [
  {
    label: "예상 소요 시간",
    value: "첫 결과는 보통 1분 안팎으로 도착합니다",
  },
  {
    label: "가능한 입력",
    value: "이력서 텍스트, PDF, DOCX, TXT",
  },
  {
    label: "정확도가 높아지는 정보",
    value: "담당 업무, 사용 도구, 산업 맥락, 수치 성과",
  },
  {
    label: "정보가 부족할 때",
    value: "억지 추천 대신 보완 질문을 먼저 드립니다",
  },
];

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
      title: "텍스트 붙여넣기",
      description: "가장 빠르게 결과를 확인할 수 있습니다",
      helper: "복사한 이력서나 자기소개 텍스트를 바로 분석합니다.",
      submitLabel: "텍스트로 분석 시작하기",
      ctaHelper: "붙여넣은 텍스트 기준으로 첫 결과 화면으로 이동합니다.",
      badge: "가장 빠른 시작",
      inputLabel: "이력서 또는 자기소개 텍스트",
      placeholder:
        "담당 업무, 프로젝트, 사용 도구, 산업 맥락, 성과 수치가 드러나게 붙여 넣어 주세요.",
    },
    {
      value: "file_upload" as const,
      title: "파일 업로드",
      description: "원본 이력서 기준으로 검토할 수 있습니다",
      helper: "PDF, DOCX, TXT 파일에서 텍스트를 추출해 같은 흐름으로 분석합니다.",
      submitLabel: "파일로 분석 시작하기",
      ctaHelper: "원본 파일을 바탕으로 같은 결과 화면으로 이어집니다.",
      badge: "원본 기준 확인",
      inputLabel: "이력서 파일",
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
        payload?.message ?? "분석 요청을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }

    startTransition(() => {
      router.push(`/sessions/${payload.sessionId}`);
    });
  });

  return (
    <form
      id="resume-intake"
      onSubmit={onSubmit}
      className="space-y-5 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-[0_18px_60px_rgba(18,19,20,0.08)] backdrop-blur"
    >
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          시작하기
        </p>
        <div>
          <h2 className="text-2xl font-semibold">Unlockr가 읽을 이력서를 보내주세요</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
            지금 가지고 있는 형태를 그대로 선택하면 됩니다. 부족한 정보는
            결과 단계에서 다시 보완할 수 있습니다.
          </p>
        </div>
      </div>

      <section className="grid gap-3 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-5 sm:grid-cols-2">
        {orientationItems.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/75 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              {item.label}
            </p>
            <p className="mt-2 text-sm leading-6">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--border)] bg-white/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          Step 1
        </p>
        <h3 className="mt-2 text-lg font-semibold">어떤 형태로 보낼까요</h3>
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
                    <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">
                      {option.description}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                      {option.helper}
                    </p>
                  </div>
                  <span
                    className={
                      isSelected
                        ? "rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-strong)]"
                        : "rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted-foreground)]"
                    }
                  >
                    {isSelected ? "선택됨" : "선택 가능"}
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
            {activeSourceOption.badge}
          </div>
        </div>

        <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
          {activeSourceOption.helper}
        </p>

        <div className="mt-4">
          {sourceType === "pasted_text" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium">{activeSourceOption.inputLabel}</span>
              <textarea
                rows={10}
                placeholder={activeSourceOption.placeholder}
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
              <span className="text-sm font-medium">{activeSourceOption.inputLabel}</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="block w-full rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-white/80 px-4 py-6 text-sm"
                {...register("resumeFile")}
              />
              <span className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                PDF, DOCX, TXT 형식을 지원합니다. 1단계 업로드 한도는 8MB입니다.
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
          선택 사항
        </p>
        <label className="mt-3 block space-y-2">
          <span className="text-sm font-medium">이름 또는 메모 남기기</span>
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
            결과 화면에서 여러 초안을 구분하고 싶을 때만 적어 주세요.
          </p>
          <input
            type="text"
            placeholder="예: PM 경력 전환 초안"
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
          {isPending ? "결과 화면 여는 중..." : activeSourceOption.submitLabel}
        </button>
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
          {activeSourceOption.ctaHelper}
        </p>
      </div>
    </form>
  );
}
