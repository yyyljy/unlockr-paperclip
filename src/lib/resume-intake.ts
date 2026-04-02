import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { getServerEnv } from "@/lib/env";

type SectionConfidence = "high" | "medium" | "low";

type SectionHeadingRule = {
  label: string;
  confidence: SectionConfidence;
  patterns: RegExp[];
};

type TextBlock = {
  text: string;
  startOffset: number;
  endOffset: number;
};

type SentenceFragment = {
  text: string;
  startOffset: number;
  endOffset: number;
};

export type ParsedResumeSection = {
  label: string;
  heading: string | null;
  content: string;
  confidence: SectionConfidence;
  startOffset: number | null;
  endOffset: number | null;
};

export type ParsedResumeDocument = {
  rawText: string;
  normalizedText: string;
  sections: ParsedResumeSection[];
  quality: {
    score: number;
    flags: string[];
    warnings: string[];
    charCount: number;
    wordCount: number;
    lineCount: number;
    sectionCount: number;
  };
  parser: {
    provider: string;
    version: string;
    mode: "direct_text" | "file_upload";
    extractedAt: string;
    details: Record<string, unknown>;
  };
};

export type NormalizedAnalysisInput = {
  sourceType: "file_upload" | "pasted_text";
  sourceKind: "resume_text" | "resume_upload";
  candidateLabel?: string | null;
  document: ParsedResumeDocument;
};

type ResumeParserFailureCode =
  | "unsupported_file_type"
  | "empty_document"
  | "storage_error";

const sectionHeadingRules: SectionHeadingRule[] = [
  {
    label: "summary",
    confidence: "high",
    patterns: [
      /^summary$/i,
      /^profile$/i,
      /^about$/i,
      /^objective$/i,
      /^overview$/i,
      /^professional summary$/i,
      /^소개$/i,
      /^요약$/i,
      /^프로필$/i,
      /^자기소개$/i,
    ],
  },
  {
    label: "experience",
    confidence: "high",
    patterns: [
      /^experience$/i,
      /^work experience$/i,
      /^professional experience$/i,
      /^employment history$/i,
      /^career$/i,
      /^career history$/i,
      /^경력$/i,
      /^경험$/i,
      /^업무 경험$/i,
      /^실무 경험$/i,
    ],
  },
  {
    label: "education",
    confidence: "high",
    patterns: [
      /^education$/i,
      /^academic background$/i,
      /^studies$/i,
      /^학력$/i,
      /^교육$/i,
    ],
  },
  {
    label: "projects",
    confidence: "high",
    patterns: [
      /^projects$/i,
      /^project experience$/i,
      /^portfolio$/i,
      /^selected projects$/i,
      /^프로젝트$/i,
      /^포트폴리오$/i,
    ],
  },
  {
    label: "skills",
    confidence: "high",
    patterns: [
      /^skills$/i,
      /^technical skills$/i,
      /^tooling$/i,
      /^stack$/i,
      /^technologies$/i,
      /^핵심 역량$/i,
      /^기술 스택$/i,
      /^스킬$/i,
      /^기술$/i,
    ],
  },
  {
    label: "certifications",
    confidence: "medium",
    patterns: [
      /^certifications$/i,
      /^licenses$/i,
      /^awards$/i,
      /^자격증$/i,
      /^수상$/i,
    ],
  },
];

export class ResumeParseFailure extends Error {
  readonly errorCode: ResumeParserFailureCode;
  readonly retryable: boolean;
  readonly requiredAction: "reupload" | "paste_text" | "contact_support";

  constructor(input: {
    errorCode: ResumeParserFailureCode;
    message: string;
    retryable: boolean;
    requiredAction: "reupload" | "paste_text" | "contact_support";
  }) {
    super(input.message);
    this.name = "ResumeParseFailure";
    this.errorCode = input.errorCode;
    this.retryable = input.retryable;
    this.requiredAction = input.requiredAction;
  }
}

export function buildDirectTextAnalysisInput(input: {
  text: string;
  candidateLabel?: string | null;
  sourceLabel?: string | null;
}): NormalizedAnalysisInput {
  return {
    sourceType: "pasted_text",
    sourceKind: "resume_text",
    candidateLabel: input.candidateLabel,
    document: buildParsedDocument({
      rawText: input.text,
      mode: "direct_text",
      provider: "unlockr.direct-text-intake",
      details: {
        sourceLabel: input.sourceLabel ?? "pasted_text",
      },
      warnings: [],
    }),
  };
}

export async function buildFileUploadAnalysisInput(input: {
  buffer: Buffer;
  contentType: string;
  filename: string;
  candidateLabel?: string | null;
}): Promise<NormalizedAnalysisInput> {
  const extractedAt = new Date().toISOString();
  const env = getServerEnv();

  try {
    if (input.contentType === "text/plain") {
      return {
        sourceType: "file_upload",
        sourceKind: "resume_upload",
        candidateLabel: input.candidateLabel,
        document: buildParsedDocument({
          rawText: stripUtf8Bom(input.buffer.toString("utf8")),
          mode: "file_upload",
          provider: "unlockr.file-intake",
          extractedAt,
          details: {
            extractor: "plain-text",
            filename: input.filename,
            contentType: input.contentType,
          },
          warnings: [],
          parserVersion: env.RECOMMENDATION_PARSER_VERSION,
        }),
      };
    }

    if (
      input.contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({
        buffer: input.buffer,
      });

      return {
        sourceType: "file_upload",
        sourceKind: "resume_upload",
        candidateLabel: input.candidateLabel,
        document: buildParsedDocument({
          rawText: result.value,
          mode: "file_upload",
          provider: "unlockr.file-intake",
          extractedAt,
          details: {
            extractor: "mammoth",
            filename: input.filename,
            contentType: input.contentType,
          },
          warnings: result.messages.map((message) => message.message),
          parserVersion: env.RECOMMENDATION_PARSER_VERSION,
        }),
      };
    }

    if (input.contentType === "application/pdf") {
      const parser = new PDFParse({
        data: input.buffer,
      });

      try {
        const result = await parser.getText();

        return {
          sourceType: "file_upload",
          sourceKind: "resume_upload",
          candidateLabel: input.candidateLabel,
          document: buildParsedDocument({
            rawText: result.text,
            mode: "file_upload",
            provider: "unlockr.file-intake",
            extractedAt,
            details: {
              extractor: "pdf-parse",
              filename: input.filename,
              contentType: input.contentType,
              totalPages: result.total,
            },
            warnings:
              result.pages
                .filter((page) => page.text.trim().length === 0)
                .map((page) => `No extractable text found on PDF page ${page.num}.`) ?? [],
            parserVersion: env.RECOMMENDATION_PARSER_VERSION,
          }),
        };
      } finally {
        await parser.destroy();
      }
    }
  } catch (error) {
    if (error instanceof ResumeParseFailure) {
      throw error;
    }

    throw new ResumeParseFailure({
      errorCode: "storage_error",
      message:
        error instanceof Error
          ? error.message
          : "The uploaded file could not be read cleanly.",
      retryable: true,
      requiredAction: "reupload",
    });
  }

  throw new ResumeParseFailure({
    errorCode: "unsupported_file_type",
    message: `Unsupported upload type: ${input.contentType || "unknown"}`,
    retryable: false,
    requiredAction: "reupload",
  });
}

export function extractSentenceFragments(document: ParsedResumeDocument) {
  const fragments = document.sections.flatMap((section) =>
    splitSectionIntoSentences(section).map((fragment) => ({
      ...fragment,
      sectionLabel: section.label,
    })),
  );

  if (fragments.length > 0) {
    return fragments;
  }

  return splitTextIntoSentences(document.normalizedText).map((fragment) => ({
    ...fragment,
    sectionLabel: "resume_text",
  }));
}

function buildParsedDocument(input: {
  rawText: string;
  mode: "direct_text" | "file_upload";
  provider: string;
  details: Record<string, unknown>;
  warnings: string[];
  extractedAt?: string;
  parserVersion?: string;
}) {
  const env = getServerEnv();
  const extractedAt = input.extractedAt ?? new Date().toISOString();
  const normalizedText = normalizeDocumentText(input.rawText);

  if (!normalizedText) {
    throw new ResumeParseFailure({
      errorCode: "empty_document",
      message: "The uploaded file did not contain extractable resume text.",
      retryable: true,
      requiredAction: input.mode === "file_upload" ? "reupload" : "paste_text",
    });
  }

  const sections = detectSections(normalizedText);
  const quality = buildQualityMetadata({
    text: normalizedText,
    sections,
    warnings: input.warnings,
    mode: input.mode,
    details: input.details,
  });

  return {
    rawText: input.rawText.trim(),
    normalizedText,
    sections,
    quality,
    parser: {
      provider: input.provider,
      version: input.parserVersion ?? env.RECOMMENDATION_PARSER_VERSION,
      mode: input.mode,
      extractedAt,
      details: {
        ...input.details,
      },
    },
  } satisfies ParsedResumeDocument;
}

function normalizeDocumentText(rawText: string) {
  return rawText
    .replace(/\u0000/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\n[ ]+/g, "\n")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectSections(text: string) {
  const blocks = splitIntoBlocks(text);
  const sections: ParsedResumeSection[] = [];
  let current:
    | {
        label: string;
        heading: string | null;
        confidence: SectionConfidence;
        startOffset: number | null;
        endOffset: number | null;
        chunks: string[];
      }
    | null = null;

  const flushCurrent = () => {
    if (!current) {
      return;
    }

    const content = current.chunks.join("\n\n").trim();

    if (content.length > 0) {
      sections.push({
        label: current.label,
        heading: current.heading,
        content,
        confidence: current.confidence,
        startOffset: current.startOffset,
        endOffset: current.endOffset,
      });
    }

    current = null;
  };

  for (const block of blocks) {
    const lines = block.text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const firstLine = lines[0] ?? "";
    const heading = detectSectionHeading(firstLine);

    if (heading) {
      flushCurrent();

      const remainingLines = lines.slice(1);
      const content = remainingLines.join("\n").trim();
      const contentOffset =
        content.length > 0
          ? block.startOffset + block.text.indexOf(content)
          : block.startOffset;

      current = {
        label: heading.label,
        heading: firstLine,
        confidence: heading.confidence,
        startOffset: content.length > 0 ? contentOffset : null,
        endOffset: content.length > 0 ? contentOffset + content.length : null,
        chunks: content.length > 0 ? [content] : [],
      };

      continue;
    }

    if (!current) {
      current = {
        label: "resume_text",
        heading: null,
        confidence: "low",
        startOffset: block.startOffset,
        endOffset: block.endOffset,
        chunks: [block.text],
      };

      continue;
    }

    if (current.startOffset === null) {
      current.startOffset = block.startOffset;
    }

    current.endOffset = block.endOffset;
    current.chunks.push(block.text);
  }

  flushCurrent();

  if (sections.length > 0) {
    return sections;
  }

  return [
    {
      label: "resume_text",
      heading: null,
      content: text,
      confidence: "low",
      startOffset: 0,
      endOffset: text.length,
    },
  ] satisfies ParsedResumeSection[];
}

function buildQualityMetadata(input: {
  text: string;
  sections: ParsedResumeSection[];
  warnings: string[];
  mode: "direct_text" | "file_upload";
  details: Record<string, unknown>;
}) {
  const wordCount = input.text.match(/\S+/g)?.length ?? 0;
  const lineCount = input.text
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
  const charCount = input.text.length;
  const sectionCount = input.sections.length;
  const flags: string[] = [];
  let score = 1;

  if (charCount < 160 || wordCount < 30) {
    flags.push("short_text");
    score -= 0.35;
  }

  if (lineCount < 6) {
    flags.push("low_line_count");
    score -= 0.15;
  }

  if (sectionCount <= 1) {
    flags.push("sections_not_detected");
    score -= 0.1;
  }

  if (input.warnings.length > 0) {
    flags.push("parser_warnings");
    score -= 0.1;
  }

  const alphabeticRatio = calculateAlphabeticRatio(input.text);

  if (alphabeticRatio < 0.45) {
    flags.push("low_text_density");
    score -= 0.15;
  }

  if (
    input.mode === "file_upload" &&
    typeof input.details.totalPages === "number" &&
    input.details.totalPages > 1 &&
    wordCount / input.details.totalPages < 45
  ) {
    flags.push("possible_ocr_needed");
    score -= 0.15;
  }

  return {
    score: clamp(score, 0.05, 1),
    flags,
    warnings: input.warnings,
    charCount,
    wordCount,
    lineCount,
    sectionCount,
  };
}

function calculateAlphabeticRatio(text: string) {
  const visibleChars = text.replace(/\s/g, "");

  if (visibleChars.length === 0) {
    return 0;
  }

  const alphaChars =
    visibleChars.match(/[A-Za-z0-9\u3131-\u318E\uAC00-\uD7A3]/g)?.length ?? 0;

  return alphaChars / visibleChars.length;
}

function splitIntoBlocks(text: string) {
  const blocks: TextBlock[] = [];
  const pattern = /\n{2,}/g;
  let blockStart = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    pushBlock(blockStart, match.index);
    blockStart = match.index + match[0].length;
  }

  pushBlock(blockStart, text.length);

  return blocks;

  function pushBlock(start: number, end: number) {
    const raw = text.slice(start, end);
    const leadingWhitespace = raw.match(/^\s*/)?.[0].length ?? 0;
    const trailingWhitespace = raw.match(/\s*$/)?.[0].length ?? 0;
    const normalizedStart = start + leadingWhitespace;
    const normalizedEnd = end - trailingWhitespace;

    if (normalizedEnd <= normalizedStart) {
      return;
    }

    blocks.push({
      text: text.slice(normalizedStart, normalizedEnd),
      startOffset: normalizedStart,
      endOffset: normalizedEnd,
    });
  }
}

function detectSectionHeading(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > 40) {
    return null;
  }

  return (
    sectionHeadingRules.find((rule) =>
      rule.patterns.some((pattern) => pattern.test(trimmed)),
    ) ?? null
  );
}

function splitSectionIntoSentences(section: ParsedResumeSection) {
  if (section.startOffset === null) {
    return splitTextIntoSentences(section.content);
  }

  return splitTextIntoSentences(section.content, section.startOffset);
}

function splitTextIntoSentences(text: string, baseOffset = 0) {
  const fragments: SentenceFragment[] = [];
  const matches = text.matchAll(/[^.!?\n]+(?:[.!?]+|$)|[^\n]+$/g);

  for (const match of matches) {
    const value = match[0].trim();

    if (value.length === 0 || match.index === undefined) {
      continue;
    }

    const rawStart = match.index;
    const rawLeadingWhitespace = match[0].search(/\S|$/);
    const startOffset = baseOffset + rawStart + rawLeadingWhitespace;
    const endOffset = startOffset + value.length;

    fragments.push({
      text: value,
      startOffset,
      endOffset,
    });
  }

  return fragments;
}

function stripUtf8Bom(value: string) {
  return value.replace(/^\uFEFF/, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
