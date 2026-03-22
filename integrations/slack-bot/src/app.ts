import "dotenv/config";
import { App } from "@slack/bolt";
import {
  validateEnv,
  loadConfig,
  getSlackBotConfig,
  type SlackBotConfig,
} from "./config.js";
import { runReview, type ReviewProgress, type ReviewResult, type SeverityCounts } from "./reviewer.js";
import { resolveForSlackBot, getPrAuthor } from "./user-resolver.js";

// --- Validate environment ---
validateEnv();
const config = loadConfig();
const botConfig = getSlackBotConfig(config);

// --- Slack App (Socket Mode) ---
const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
});

// --- State ---
interface RunningReview {
  prRef: string;
  userId: string;
  startedAt: number;
  abortController: AbortController;
}

const running = new Map<string, RunningReview>();
const userUsage = new Map<string, number[]>(); // userId → timestamps

// --- Helpers ---

function parseCommand(text: string): {
  valid: boolean;
  prRef?: string;
  tier?: string;
  error?: string;
} {
  const trimmed = text.trim();

  // Extract tier flag
  let tier: string | undefined;
  const tierMatch = trimmed.match(/--(quick|focused|full)/);
  if (tierMatch) {
    tier = tierMatch[1];
  }

  // Extract PR reference (remove tier flag from text)
  const prText = trimmed.replace(/--(quick|focused|full)/, "").trim();

  // Match owner/repo#123, repo#123, #123, or full GitHub URL
  const patterns = [
    /^([\w.-]+\/[\w.-]+)#(\d+)$/, // owner/repo#123
    /^([\w.-]+)#(\d+)$/, // repo#123
    /^#(\d+)$/, // #123
    /^https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)/,  // full URL
  ];

  for (const pattern of patterns) {
    const match = prText.match(pattern);
    if (match) {
      let prRef: string;
      if (pattern === patterns[0] || pattern === patterns[3]) {
        prRef = `${match[1]}#${match[2]}`;
      } else if (pattern === patterns[1]) {
        const org = config.github.default_org;
        if (!org) {
          return { valid: false, error: "No default_org configured. Use full format: owner/repo#123" };
        }
        prRef = `${org}/${match[1]}#${match[2]}`;
      } else {
        return { valid: false, error: "Short format #123 requires full repo context. Use: owner/repo#123" };
      }
      return { valid: true, prRef, tier };
    }
  }

  return {
    valid: false,
    error: `Invalid PR reference: \`${prText}\`\nExpected: \`owner/repo#123\`, \`repo#123\`, or GitHub PR URL`,
  };
}

function isUserAllowed(userId: string, botCfg: SlackBotConfig): boolean {
  if (botCfg.allowed_users.length === 0) return true;
  return botCfg.allowed_users.includes(userId);
}

function isChannelAllowed(channelId: string, botCfg: SlackBotConfig): boolean {
  if (botCfg.allowed_channels.length === 0) return true;
  return botCfg.allowed_channels.includes(channelId);
}

function isRateLimited(userId: string, botCfg: SlackBotConfig): boolean {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const timestamps = (userUsage.get(userId) ?? []).filter((t) => t > hourAgo);
  userUsage.set(userId, timestamps);
  return timestamps.length >= botCfg.rate_limit_per_user_hour;
}

function recordUsage(userId: string): void {
  const timestamps = userUsage.get(userId) ?? [];
  timestamps.push(Date.now());
  userUsage.set(userId, timestamps);
}

function formatProgress(
  prRef: string,
  slackUser: string,
  progress: ReviewProgress,
  startedAt: number,
): string {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const time = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const icons: Record<string, string> = {
    collecting: "\ud83d\udce1",
    profile: "\ud83d\udcc2",
    perspectives: "\ud83d\ude80",
    consolidating: "\ud83d\udcca",
    posting: "\ud83d\udce4",
    notifying: "\ud83d\udd14",
    executing: "\u2699\ufe0f",
    reading: "\ud83d\udcd6",
    complete: "\u2705",
    error: "\u274c",
  };

  const icon = icons[progress.phase] ?? "\ud83d\udd04";

  return [
    `${icon} *${progress.detail}*`,
    `PR: \`${prRef}\` | Requested by <@${slackUser}> | ${time}`,
  ].join("\n");
}

function formatSeverityLine(severities: SeverityCounts): string {
  const parts: string[] = [];
  if (severities.critical > 0) parts.push(`\ud83d\udd34 ${severities.critical} Critical`);
  if (severities.major > 0) parts.push(`\ud83d\udfe0 ${severities.major} Major`);
  if (severities.minor > 0) parts.push(`\ud83d\udfe1 ${severities.minor} Minor`);
  if (severities.suggestion > 0) parts.push(`\ud83d\udd35 ${severities.suggestion} Suggestion`);
  if (severities.positive > 0) parts.push(`\u2705 ${severities.positive} Positive`);
  return parts.length > 0 ? parts.join(" | ") : "No findings";
}

function formatResult(
  prRef: string,
  slackUser: string,
  result: ReviewResult,
  startedAt: number,
): string {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const time = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  if (!result.success) {
    return [
      `\u274c *Review failed*`,
      `PR: \`${prRef}\` | Requested by <@${slackUser}> | ${time}`,
      `Error: ${result.error ?? "Unknown error"}`,
    ].join("\n");
  }

  const lines = [
    `\u2705 *Review complete!* Recommendation: *${result.recommendation}*`,
    `PR: \`${prRef}\` | Requested by <@${slackUser}> | ${time}`,
  ];

  if (result.severities) {
    lines.push("");
    lines.push(formatSeverityLine(result.severities));
  }

  if (result.summary) {
    lines.push("");
    lines.push(result.summary);
  }

  if (result.prUrl) {
    lines.push("");
    lines.push(`<${result.prUrl}|View on GitHub>`);
  }

  return lines.join("\n");
}

const HELP_TEXT = `*review-squad Slack Bot*

*Usage:*
\`/review owner/repo#123\` — full review (default tier)
\`/review owner/repo#123 --quick\` — quick review
\`/review owner/repo#123 --focused\` — focused review
\`/review owner/repo#123 --full\` — full review (all perspectives)
\`/review status\` — show running reviews
\`/review help\` — this message

*PR reference formats:*
• \`owner/repo#123\` — full format
• \`repo#123\` — uses default org from config
• Full GitHub PR URL

*Tiers:*
• \`quick\` — code only, critical & major findings
• \`focused\` — code + security + testing + QA
• \`full\` — all 6 perspectives`;

// --- Slash Command Handler ---

app.command("/review", async ({ command, ack, client }) => {
  await ack();

  const text = command.text.trim();
  const userId = command.user_id;
  const channelId = command.channel_id;

  // --- Subcommands ---

  if (text === "help" || text === "") {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: HELP_TEXT,
    });
    return;
  }

  if (text === "status") {
    if (running.size === 0) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: "No reviews currently running.",
      });
    } else {
      const lines = Array.from(running.values()).map((r) => {
        const elapsed = Math.round((Date.now() - r.startedAt) / 1000);
        const mins = Math.floor(elapsed / 60);
        return `• \`${r.prRef}\` by <@${r.userId}> (${mins}m ago)`;
      });
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: `*Running reviews:*\n${lines.join("\n")}`,
      });
    }
    return;
  }

  // --- Access Control ---

  if (!isUserAllowed(userId, botConfig)) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: "You are not authorized to use this bot. Contact the admin to be added to the allowed users list.",
    });
    return;
  }

  if (!isChannelAllowed(channelId, botConfig)) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: "This bot is not enabled in this channel.",
    });
    return;
  }

  // --- Parse Command ---

  const parsed = parseCommand(text);
  if (!parsed.valid) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: parsed.error!,
    });
    return;
  }

  // --- Concurrency Check ---

  if (running.size >= botConfig.max_concurrent_reviews) {
    const current = Array.from(running.values())
      .map((r) => `\`${r.prRef}\``)
      .join(", ");
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `\u23f3 A review is already running (${current}). Try again when it finishes.`,
    });
    return;
  }

  // --- Rate Limit ---

  if (isRateLimited(userId, botConfig)) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `\u23f1\ufe0f Rate limit reached (${botConfig.rate_limit_per_user_hour} reviews/hour). Try again later.`,
    });
    return;
  }

  // --- Start Review ---

  const prRef = parsed.prRef!;
  const tier = parsed.tier ?? botConfig.default_tier;
  const startedAt = Date.now();

  recordUsage(userId);

  const msg = await client.chat.postMessage({
    channel: channelId,
    text: `\ud83d\udd04 Starting ${tier} review of \`${prRef}\`...\nRequested by <@${userId}>`,
  });

  const abortController = new AbortController();
  running.set(prRef, { prRef, userId, startedAt, abortController });

  // --- Timeout ---
  const timeoutMs = botConfig.timeout_minutes * 60 * 1000;
  const timeout = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  // --- Resolve PR author → Slack user (pre-cache for headless Claude Code) ---

  try {
    const prAuthor = getPrAuthor(prRef);
    if (prAuthor) {
      const [ownerRepo] = prRef.split("#");
      const [owner, repo] = ownerRepo.split("/");
      await resolveForSlackBot({
        githubUsername: prAuthor,
        owner,
        repo,
        requesterId: userId,
        channelId,
        slackClient: app.client,
      });
    }
  } catch (err) {
    // User resolution failure must never block the review
    console.warn("User resolution failed (continuing):", err);
  }

  // --- Run Review (background) ---

  runReview({
    prRef,
    tier,
    slackUser: command.user_name,
    channel: command.channel_name,
    abortController,
    maxTurns: botConfig.max_turns,
    onProgress: (progress: ReviewProgress) => {
      client.chat
        .update({
          channel: channelId,
          ts: msg.ts!,
          text: formatProgress(prRef, userId, progress, startedAt),
        })
        .catch(() => {
          // Ignore update errors (message deleted, etc.)
        });
    },
  })
    .then((result: ReviewResult) => {
      return client.chat.update({
        channel: channelId,
        ts: msg.ts!,
        text: formatResult(prRef, userId, result, startedAt),
      });
    })
    .catch((error: unknown) => {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      const isTimeout = abortController.signal.aborted;
      return client.chat.update({
        channel: channelId,
        ts: msg.ts!,
        text: isTimeout
          ? `\u23f0 Review of \`${prRef}\` timed out after ${botConfig.timeout_minutes} minutes.`
          : `\u274c Review of \`${prRef}\` failed: ${errorMsg}`,
      });
    })
    .finally(() => {
      clearTimeout(timeout);
      running.delete(prRef);
    });
});

// --- Start ---

(async () => {
  await app.start();
  console.log("\u26a1 review-squad Slack bot is running (Socket Mode)");
  console.log(`   Default tier: ${botConfig.default_tier}`);
  console.log(`   Max concurrent: ${botConfig.max_concurrent_reviews}`);
  console.log(`   Rate limit: ${botConfig.rate_limit_per_user_hour}/user/hour`);
  console.log(`   Timeout: ${botConfig.timeout_minutes} minutes`);
})();
