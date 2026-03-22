import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { query, type Message } from "@anthropic-ai/claude-code";
import { getReviewSquadDir } from "./config.js";

export interface ReviewOptions {
  prRef: string;
  tier?: string;
  slackUser: string;
  channel: string;
  abortController: AbortController;
  maxTurns: number;
  onProgress: (progress: ReviewProgress) => void;
}

export interface ReviewProgress {
  phase: string;
  detail: string;
}

export interface SeverityCounts {
  critical: number;
  major: number;
  minor: number;
  suggestion: number;
  positive: number;
}

export interface ReviewResult {
  success: boolean;
  recommendation?: string;
  summary?: string;
  severities?: SeverityCounts;
  prUrl?: string;
  error?: string;
}

const HEADLESS_PROMPT = `
## Headless Mode (Slack Bot)

This review was triggered from Slack by @{{user}} in #{{channel}}.

You are running in NON-INTERACTIVE headless mode. Follow these rules:

1. **SKIP all preview/confirmation steps** — do NOT ask the user for confirmation, do NOT show a preview before posting.
2. **Auto-post the review** with event=COMMENT (NEVER use APPROVE or REQUEST_CHANGES).
3. **Send notifications** after posting (if configured in config.json).
4. At the very end, output a summary block in this exact format:
\`\`\`
REVIEW_SUMMARY_START
recommendation: COMMENT|REQUEST_CHANGES|APPROVE
critical: <number>
major: <number>
minor: <number>
suggestion: <number>
positive: <number>
summary: <one paragraph summarizing key findings>
REVIEW_SUMMARY_END
\`\`\`
5. If any error prevents the review from completing, print: \`REVIEW_ERROR: <description>\`
`;

function buildPrompt(opts: ReviewOptions): string {
  return HEADLESS_PROMPT.replace("{{user}}", opts.slackUser).replace(
    "{{channel}}",
    opts.channel
  );
}

function extractProgress(message: Message): ReviewProgress | null {
  if (message.type === "assistant" && "content" in message) {
    const text =
      typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content
              .filter((b) => "text" in b)
              .map((b) => ("text" in b ? b.text : ""))
              .join("")
          : "";

    if (!text) return null;

    // Detect review phases from Claude's output
    if (/gh pr view/i.test(text) || /collecting.*pr/i.test(text)) {
      return { phase: "collecting", detail: "Collecting PR data..." };
    }
    if (/loading.*profile|profile.*resolved/i.test(text)) {
      return { phase: "profile", detail: "Loading stack profile..." };
    }
    if (/running.*perspective|security.*review|test.*review|qa.*review|architecture.*review|performance.*review/i.test(text)) {
      return { phase: "perspectives", detail: "Running review perspectives..." };
    }
    if (/consolidat/i.test(text)) {
      return { phase: "consolidating", detail: "Consolidating findings..." };
    }
    if (/posting.*review|gh api.*reviews|gh pr review/i.test(text)) {
      return { phase: "posting", detail: "Posting review to GitHub..." };
    }
    if (/notification|webhook|slack.*notify/i.test(text)) {
      return { phase: "notifying", detail: "Sending notifications..." };
    }
    if (/REVIEW_COMPLETE/i.test(text)) {
      const match = text.match(/REVIEW_COMPLETE:\s*(\w+)/);
      return {
        phase: "complete",
        detail: `Review complete! Recommendation: ${match?.[1] ?? "COMMENT"}`,
      };
    }
    if (/REVIEW_ERROR/i.test(text)) {
      const match = text.match(/REVIEW_ERROR:\s*(.+)/);
      return {
        phase: "error",
        detail: match?.[1] ?? "Unknown error",
      };
    }
  }

  // Tool use progress
  if (message.type === "assistant" && "content" in message) {
    const content = Array.isArray(message.content) ? message.content : [];
    for (const block of content) {
      if ("type" in block && block.type === "tool_use") {
        const name = "name" in block ? block.name : "";
        if (name === "Bash") {
          return { phase: "executing", detail: "Running commands..." };
        }
        if (name === "Read") {
          return { phase: "reading", detail: "Reading source files..." };
        }
      }
    }
  }

  return null;
}

function extractText(message: Message): string {
  if (message.type !== "assistant" || !("content" in message)) return "";
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.content)) return "";
  return message.content
    .filter((b) => "text" in b)
    .map((b) => ("text" in b ? b.text : ""))
    .join("");
}

function parseSummaryBlock(fullText: string): {
  recommendation?: string;
  severities?: SeverityCounts;
  summary?: string;
} {
  const match = fullText.match(
    /REVIEW_SUMMARY_START\s*([\s\S]*?)\s*REVIEW_SUMMARY_END/
  );
  if (!match) return {};

  const block = match[1];
  const get = (key: string) =>
    block.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim();

  return {
    recommendation: get("recommendation"),
    summary: get("summary"),
    severities: {
      critical: parseInt(get("critical") ?? "0", 10) || 0,
      major: parseInt(get("major") ?? "0", 10) || 0,
      minor: parseInt(get("minor") ?? "0", 10) || 0,
      suggestion: parseInt(get("suggestion") ?? "0", 10) || 0,
      positive: parseInt(get("positive") ?? "0", 10) || 0,
    },
  };
}

function buildPrUrl(prRef: string): string {
  // "owner/repo#123" → "https://github.com/owner/repo/pull/123"
  const match = prRef.match(/^(.+)#(\d+)$/);
  if (!match) return "";
  return `https://github.com/${match[1]}/pull/${match[2]}`;
}

function loadCommandPrompt(prRef: string, tier?: string): string {
  const cwd = getReviewSquadDir();
  const commandPath = resolve(cwd, ".claude/commands/full-review.md");
  const template = readFileSync(commandPath, "utf-8");
  const tierFlag = tier ? ` --${tier}` : "";
  const args = `${prRef}${tierFlag}`;
  return template.replace("$ARGUMENTS", args);
}

export async function runReview(opts: ReviewOptions): Promise<ReviewResult> {
  const cwd = getReviewSquadDir();
  const prompt = loadCommandPrompt(opts.prRef, opts.tier);

  const messages = query({
    prompt,
    options: {
      cwd,
      systemPrompt: buildPrompt(opts),
      permissionMode: "bypassPermissions",
      disallowedTools: ["Edit", "Write", "NotebookEdit"],
      maxTurns: opts.maxTurns,
      abortController: opts.abortController,
    },
  });

  let lastUpdate = 0;
  let lastPhase = "";
  let fullOutput = "";

  for await (const message of messages) {
    const text = extractText(message as Message);
    if (text) fullOutput += text + "\n";

    // Throttle progress updates to every 5 seconds, but always allow phase changes
    const progress = extractProgress(message as Message);
    if (progress) {
      const now = Date.now();
      const isNewPhase = progress.phase !== lastPhase;
      if (isNewPhase || now - lastUpdate > 5000) {
        opts.onProgress(progress);
        lastUpdate = now;
        lastPhase = progress.phase;
      }

      if (progress.phase === "error") {
        return { success: false, error: progress.detail };
      }
    }
  }

  // Parse structured summary from the full output
  const parsed = parseSummaryBlock(fullOutput);

  return {
    success: true,
    recommendation: parsed.recommendation ?? "COMMENT",
    summary: parsed.summary,
    severities: parsed.severities,
    prUrl: buildPrUrl(opts.prRef),
  };
}
