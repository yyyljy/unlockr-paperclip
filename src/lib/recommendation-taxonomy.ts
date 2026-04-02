export type RoleTrack = {
  roleFamily: string;
  roleTitle: string;
  targetDomains: string[];
  keywords: string[];
  nextSteps: {
    title: string;
    detail: string;
    effort: "low" | "medium" | "high";
    timeline: string;
  }[];
  gap: {
    title: string;
    detail: string;
    urgency: "now" | "soon" | "later";
  };
};

export const roleTracks: RoleTrack[] = [
  {
    roleFamily: "frontend_engineering",
    roleTitle: "Frontend Engineer",
    targetDomains: ["web product", "design systems", "user-facing platforms"],
    keywords: [
      "react",
      "next.js",
      "frontend",
      "ui",
      "ux",
      "javascript",
      "typescript",
      "css",
      "design system",
      "웹",
    ],
    nextSteps: [
      {
        title: "Show shipped UI work",
        detail:
          "Add one or two outcomes where interface changes improved activation or conversion.",
        effort: "medium",
        timeline: "This week",
      },
      {
        title: "Document technical depth",
        detail:
          "Clarify component architecture, accessibility, and performance ownership.",
        effort: "medium",
        timeline: "This week",
      },
    ],
    gap: {
      title: "Performance evidence",
      detail: "The source does not yet show measurable frontend performance work.",
      urgency: "soon",
    },
  },
  {
    roleFamily: "backend_engineering",
    roleTitle: "Backend Engineer",
    targetDomains: ["platform APIs", "internal tooling", "data services"],
    keywords: [
      "api",
      "backend",
      "server",
      "node",
      "python",
      "database",
      "postgres",
      "redis",
      "queue",
      "integration",
    ],
    nextSteps: [
      {
        title: "Make system ownership explicit",
        detail:
          "Spell out what services, databases, or integrations you operated directly.",
        effort: "medium",
        timeline: "This week",
      },
      {
        title: "Add reliability evidence",
        detail:
          "Include latency, throughput, or incident reduction metrics where available.",
        effort: "high",
        timeline: "Next two weeks",
      },
    ],
    gap: {
      title: "Scale signal",
      detail:
        "There is not enough explicit evidence yet around production reliability or load.",
      urgency: "soon",
    },
  },
  {
    roleFamily: "product_ops",
    roleTitle: "Product Operations Manager",
    targetDomains: ["service ops", "customer onboarding", "internal enablement"],
    keywords: [
      "stakeholder",
      "process",
      "operations",
      "onboarding",
      "workflow",
      "documentation",
      "handoff",
      "retention",
      "cross-functional",
      "coordination",
      "기획",
    ],
    nextSteps: [
      {
        title: "Add KPI language",
        detail:
          "Show the operational metric you moved, such as activation, SLA, or retention.",
        effort: "medium",
        timeline: "This week",
      },
      {
        title: "Name the operating tools",
        detail:
          "Clarify which CRM, support, or analytics systems you owned inside the workflow.",
        effort: "low",
        timeline: "Today",
      },
    ],
    gap: {
      title: "Outcome metrics",
      detail:
        "The process signal is strong, but measurable operating outcomes are still under-specified.",
      urgency: "now",
    },
  },
  {
    roleFamily: "data_analytics",
    roleTitle: "Data Analyst",
    targetDomains: ["business intelligence", "ops analytics", "growth analytics"],
    keywords: [
      "sql",
      "tableau",
      "dashboard",
      "analytics",
      "analysis",
      "reporting",
      "excel",
      "cohort",
      "metric",
      "data",
      "데이터",
    ],
    nextSteps: [
      {
        title: "Clarify business decisions",
        detail:
          "Tie each analysis example to a concrete product, growth, or operations decision.",
        effort: "medium",
        timeline: "This week",
      },
      {
        title: "Highlight tooling depth",
        detail:
          "Name query languages, BI tools, and data modeling responsibility explicitly.",
        effort: "low",
        timeline: "Today",
      },
    ],
    gap: {
      title: "Experiment ownership",
      detail:
        "The resume may show reporting, but experimentation or predictive work is less explicit.",
      urgency: "later",
    },
  },
];
