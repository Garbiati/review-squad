import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import type { WebClient } from "@slack/web-api";
import { getReviewSquadDir } from "./config.js";

// --- Types ---

export interface ResolvedUser {
  id: string;
  name: string;
  resolved_at: string;
  method: "email" | "manual";
}

export interface CacheEntry {
  github_email: string | null;
  github_name: string | null;
  slack?: ResolvedUser;
  teams?: ResolvedUser;
  discord?: ResolvedUser;
}

export interface UserMappingCache {
  [githubUsername: string]: CacheEntry;
}

export interface UserResolutionConfig {
  enabled: boolean;
  ttl_days: number;
  slack_token_env: string;
}

export interface ResolveResult {
  slack?: string;
  teams?: string;
  discord?: string;
}

// --- Cache I/O ---

function getCachePath(cwd: string): string {
  return resolve(cwd, ".user-mapping.json");
}

function loadCache(cwd: string): UserMappingCache {
  const path = getCachePath(cwd);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cwd: string, cache: UserMappingCache): void {
  const path = getCachePath(cwd);
  try {
    writeFileSync(path, JSON.stringify(cache, null, 2) + "\n", "utf-8");
  } catch {
    // Cache write failures are silently ignored
  }
}

// --- Manual mapping (config.json) ---

function getManualMapping(
  cwd: string,
  githubUsername: string,
  provider: string,
): string | null {
  try {
    const configPath = resolve(cwd, "config.json");
    if (!existsSync(configPath)) return null;
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    return config?.notifications?.settings?.user_mapping?.[githubUsername]?.[provider] ?? null;
  } catch {
    return null;
  }
}

function getUserResolutionConfig(cwd: string): UserResolutionConfig {
  const defaults: UserResolutionConfig = {
    enabled: true,
    ttl_days: 90,
    slack_token_env: "SLACK_RESOLVE_TOKEN",
  };
  try {
    const configPath = resolve(cwd, "config.json");
    if (!existsSync(configPath)) return defaults;
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    const ur = config?.notifications?.settings?.user_resolution;
    if (!ur) return defaults;
    return { ...defaults, ...ur };
  } catch {
    return defaults;
  }
}

// --- TTL check ---

function isWithinTtl(resolvedAt: string, ttlDays: number): boolean {
  const resolved = new Date(resolvedAt).getTime();
  const now = Date.now();
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  return now - resolved < ttlMs;
}

// --- GitHub API ---

interface GitHubUserInfo {
  email: string | null;
  name: string | null;
}

export function getGitHubUserInfo(
  githubUsername: string,
  owner: string,
  repo: string,
): GitHubUserInfo {
  let email: string | null = null;
  let name: string | null = null;

  // Try public profile
  try {
    const profileJson = execSync(
      `gh api users/${githubUsername} --jq '{email: (.email // ""), name: (.name // "")}'`,
      { encoding: "utf-8", timeout: 10000 },
    ).trim();
    const profile = JSON.parse(profileJson);
    if (profile.email && !isUnusableEmail(profile.email)) {
      email = profile.email;
    }
    if (profile.name) {
      name = profile.name;
    }
  } catch {
    // gh api failed, continue
  }

  // Fallback: recent commit email
  if (!email) {
    try {
      const commitEmail = execSync(
        `gh api "repos/${owner}/${repo}/commits?author=${githubUsername}&per_page=1" --jq '.[0].commit.author.email // ""'`,
        { encoding: "utf-8", timeout: 10000 },
      ).trim();
      if (commitEmail && !isUnusableEmail(commitEmail)) {
        email = commitEmail;
      }
    } catch {
      // gh api failed, continue
    }
  }

  return { email, name };
}

function isUnusableEmail(email: string): boolean {
  if (!email) return true;
  const lower = email.toLowerCase();
  return (
    lower.includes("noreply") ||
    lower.endsWith("@users.noreply.github.com") ||
    lower === ""
  );
}

// --- Slack API ---

export async function lookupSlackUser(
  client: WebClient,
  email: string,
): Promise<{ id: string; name: string } | null> {
  try {
    const response = await client.users.lookupByEmail({ email });
    if (response.ok && response.user) {
      return {
        id: response.user.id!,
        name: response.user.real_name ?? response.user.name ?? "",
      };
    }
    return null;
  } catch {
    // users_not_found or other API error
    return null;
  }
}

// --- Name matching ---

export function namesMatch(
  githubName: string | null,
  providerName: string | null,
): boolean {
  if (!githubName || !providerName) return false;

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const a = normalize(githubName);
  const b = normalize(providerName);

  if (a === b) return true;

  // First name match
  const firstA = a.split(/\s+/)[0];
  const firstB = b.split(/\s+/)[0];
  if (firstA && firstB && firstA === firstB) return true;

  // One contains the other
  if (a.includes(b) || b.includes(a)) return true;

  return false;
}

// --- Main resolver ---

export interface ResolveOptions {
  githubUsername: string;
  owner: string;
  repo: string;
  cwd?: string;
}

/**
 * Resolves GitHub username to provider user IDs.
 * Returns a map of provider → resolved user ID.
 * Does NOT handle interactive fallback — caller must handle that.
 */
export function resolveUser(opts: ResolveOptions): {
  results: ResolveResult;
  uncertain: string[];
  githubInfo: GitHubUserInfo;
} {
  const cwd = opts.cwd ?? getReviewSquadDir();
  const resConfig = getUserResolutionConfig(cwd);
  const cache = loadCache(cwd);
  const results: ResolveResult = {};
  const uncertain: string[] = [];

  // Priority 1: Manual override
  for (const provider of ["slack", "teams", "discord"] as const) {
    const manual = getManualMapping(cwd, opts.githubUsername, provider);
    if (manual) {
      results[provider] = manual;
    }
  }

  // Priority 2: Cached (with TTL)
  const cached = cache[opts.githubUsername];
  if (cached) {
    for (const provider of ["slack", "teams", "discord"] as const) {
      if (results[provider]) continue; // Already resolved via manual
      const entry = cached[provider];
      if (entry && isWithinTtl(entry.resolved_at, resConfig.ttl_days)) {
        results[provider] = entry.id;
      }
    }
  }

  // If all resolved, return early
  if (results.slack && results.teams && results.discord) {
    return {
      results,
      uncertain,
      githubInfo: {
        email: cached?.github_email ?? null,
        name: cached?.github_name ?? null,
      },
    };
  }

  // Priority 3: Auto-resolve
  if (!resConfig.enabled) {
    return {
      results,
      uncertain: ["slack", "teams", "discord"].filter((p) => !results[p as keyof ResolveResult]),
      githubInfo: { email: null, name: null },
    };
  }

  const githubInfo = getGitHubUserInfo(
    opts.githubUsername,
    opts.owner,
    opts.repo,
  );

  if (!githubInfo.email) {
    // No email found — all unresolved providers are uncertain
    for (const provider of ["slack", "teams", "discord"] as const) {
      if (!results[provider]) uncertain.push(provider);
    }
    return { results, uncertain, githubInfo };
  }

  // Teams: email IS the ID
  if (!results.teams) {
    results.teams = githubInfo.email;
    updateCache(cwd, cache, opts.githubUsername, "teams", {
      id: githubInfo.email,
      name: githubInfo.name ?? "",
      resolved_at: new Date().toISOString(),
      method: "email",
    }, githubInfo);
  }

  // Discord: cannot auto-resolve
  if (!results.discord) {
    uncertain.push("discord");
  }

  // Slack: needs async — handled separately
  if (!results.slack) {
    uncertain.push("slack");
  }

  return { results, uncertain, githubInfo };
}

/**
 * Resolves GitHub user to Slack user specifically (async, uses Slack API).
 */
export async function resolveSlackUser(opts: {
  githubUsername: string;
  owner: string;
  repo: string;
  slackClient: WebClient;
  cwd?: string;
}): Promise<{ id: string; confident: boolean } | null> {
  const cwd = opts.cwd ?? getReviewSquadDir();
  const resConfig = getUserResolutionConfig(cwd);

  // Priority 1: Manual
  const manual = getManualMapping(cwd, opts.githubUsername, "slack");
  if (manual) return { id: manual, confident: true };

  // Priority 2: Cache
  const cache = loadCache(cwd);
  const cached = cache[opts.githubUsername]?.slack;
  if (cached && isWithinTtl(cached.resolved_at, resConfig.ttl_days)) {
    return { id: cached.id, confident: true };
  }

  // Priority 3: Auto-resolve
  if (!resConfig.enabled) return null;

  const githubInfo = getGitHubUserInfo(
    opts.githubUsername,
    opts.owner,
    opts.repo,
  );
  if (!githubInfo.email) return null;

  const slackUser = await lookupSlackUser(opts.slackClient, githubInfo.email);
  if (!slackUser) return null;

  const confident = namesMatch(githubInfo.name, slackUser.name);

  if (confident) {
    updateCache(cwd, cache, opts.githubUsername, "slack", {
      id: slackUser.id,
      name: slackUser.name,
      resolved_at: new Date().toISOString(),
      method: "email",
    }, githubInfo);
  }

  return { id: slackUser.id, confident };
}

// --- Slack bot flow (with interactive ask) ---

export interface SlackBotResolveOptions {
  githubUsername: string;
  owner: string;
  repo: string;
  requesterId: string;
  channelId: string;
  slackClient: WebClient;
}

/**
 * Resolves GitHub user → Slack user for the bot context.
 * If uncertain, sends an ephemeral message asking the requester.
 * Waits up to 30 seconds for a response, then falls back.
 */
export async function resolveForSlackBot(
  opts: SlackBotResolveOptions,
): Promise<string | null> {
  const cwd = getReviewSquadDir();

  const result = await resolveSlackUser({
    githubUsername: opts.githubUsername,
    owner: opts.owner,
    repo: opts.repo,
    slackClient: opts.slackClient,
    cwd,
  });

  if (result?.confident) {
    return result.id;
  }

  // If we got an ID but not confident (name mismatch), or no result at all,
  // ask the requester via ephemeral message
  try {
    await opts.slackClient.chat.postEphemeral({
      channel: opts.channelId,
      user: opts.requesterId,
      text: [
        `I couldn't confidently match GitHub user \`@${opts.githubUsername}\` to a Slack user.`,
        result
          ? `Found a possible match (<@${result.id}>), but the name didn't match.`
          : "No match found by email.",
        "",
        `To map this user manually, add to \`config.json > notifications.settings.user_mapping\`:`,
        "```",
        `"${opts.githubUsername}": { "slack": "USLACKID" }`,
        "```",
        `_Find the Slack member ID: click the user's profile → ⋮ → Copy member ID_`,
      ].join("\n"),
    });
  } catch {
    // Ephemeral message failed — continue silently
  }

  // If we have an uncertain match, still cache and use it
  if (result) {
    const cache = loadCache(cwd);
    const githubInfo = getGitHubUserInfo(
      opts.githubUsername,
      opts.owner,
      opts.repo,
    );
    updateCache(cwd, cache, opts.githubUsername, "slack", {
      id: result.id,
      name: "",
      resolved_at: new Date().toISOString(),
      method: "email",
    }, githubInfo);
    return result.id;
  }

  return null;
}

// --- Cache update helper ---

function updateCache(
  cwd: string,
  cache: UserMappingCache,
  githubUsername: string,
  provider: "slack" | "teams" | "discord",
  entry: ResolvedUser,
  githubInfo: GitHubUserInfo,
): void {
  if (!cache[githubUsername]) {
    cache[githubUsername] = {
      github_email: githubInfo.email,
      github_name: githubInfo.name,
    };
  } else {
    if (githubInfo.email) cache[githubUsername].github_email = githubInfo.email;
    if (githubInfo.name) cache[githubUsername].github_name = githubInfo.name;
  }
  cache[githubUsername][provider] = entry;
  saveCache(cwd, cache);
}

// --- Get PR author from GitHub ---

export function getPrAuthor(prRef: string): string | null {
  // prRef format: "owner/repo#123"
  const match = prRef.match(/^(.+)#(\d+)$/);
  if (!match) return null;

  const [, ownerRepo, number] = match;
  try {
    return execSync(
      `gh pr view ${number} --repo ${ownerRepo} --json author -q .author.login`,
      { encoding: "utf-8", timeout: 10000 },
    ).trim() || null;
  } catch {
    return null;
  }
}
