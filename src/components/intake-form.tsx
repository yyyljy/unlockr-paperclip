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
] as const;

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
      badge: "fastest path",
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
      badge: "original file",
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
    <form id="resume-intake" onSubmit={onSubmit} className="space-y-6 text-[#f4eee2]">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/44">
          Start here
        </p>
        <div>
          <h2 className="text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
            Unlockr가 읽을 이력서를 보내주세요
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-7 text-white/64">
            지금 가지고 있는 형태를 그대로 보내면 됩니다. 부족한 정보는 결과
            단계에서 다시 보완할 수 있습니다.
          </p>
        </div>
      </div>

      <section className="grid gap-4 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2">
        {orientationItems.map((item) => (
          <div key={item.label} className="border-t border-white/10 pt-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/40">
              {item.label}
            </p>
            <p className="mt-3 text-sm leading-7 text-white/78">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[1.8rem] border border-white/10 bg-black/12 p-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">
            Step 1
          </p>
          <h3 className="mt-3 text-lg font-semibold text-white">어떤 형태로 보낼까요</h3>
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
                PDF, DOCX, TXT 형식을 지원합니다. 1단계 업로드 한도는 8MB입니다.
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
          <span className="text-sm font-medium text-white/86">이름 또는 메모 남기기</span>
          <p className="text-sm leading-6 text-white/56">
            결과 화면에서 여러 초안을 구분하고 싶을 때만 적어 주세요.
          </p>
          <input
            type="text"
            placeholder="예: PM 경력 전환 초안"
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
          {isPending ? "결과 화면 여는 중..." : activeSourceOption.submitLabel}
        </button>
        <p className="max-w-xs text-sm leading-6 text-white/56">{activeSourceOption.ctaHelper}</p>
      </div>
    </form>
  );
}
