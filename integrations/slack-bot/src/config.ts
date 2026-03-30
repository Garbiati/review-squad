import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";

export interface SlackBotConfig {
  default_tier: "quick" | "focused" | "full";
  max_concurrent_reviews: number;
  rate_limit_per_user_hour: number;
  max_turns: number;
  timeout_minutes: number;
  allowed_users: string[];
  allowed_channels: string[];
  auto_post: boolean;
}

export interface UserResolutionConfig {
  enabled: boolean;
  ttl_days: number;
  slack_token_env: string;
}

export interface ReviewSquadConfig {
  github: { review_account: string; default_org: string };
  review: { language: string; default_tier: string };
  slack_bot?: SlackBotConfig;
  notifications?: {
    settings?: {
      user_resolution?: Partial<UserResolutionConfig>;
      user_mapping?: Record<string, Record<string, string>>;
    };
  };
}

const DEFAULTS: SlackBotConfig = {
  default_tier: "focused",
  max_concurrent_reviews: 1,
  rate_limit_per_user_hour: 5,
  max_turns: 100,
  timeout_minutes: 10,
  allowed_users: [],
  allowed_channels: [],
  auto_post: true,
};

export function getReviewSquadDir(): string {
  const dir = process.env.REVIEW_SQUAD_DIR;
  if (!dir) {
    throw new Error("REVIEW_SQUAD_DIR environment variable is required");
  }
  if (!existsSync(dir)) {
    throw new Error(`REVIEW_SQUAD_DIR does not exist: ${dir}`);
  }
  return dir;
}

export function loadConfig(): ReviewSquadConfig {
  const dir = getReviewSquadDir();
  const configPath = resolve(dir, "config.json");
  if (!existsSync(configPath)) {
    throw new Error(
      `config.json not found at ${configPath}. Copy config.example.json to config.json and fill in your details.`
    );
  }
  const raw = readFileSync(configPath, "utf-8");

  // Load root .env so SLACK_WEBHOOK_URL and other review-squad vars
  // are available to Claude Code's Bash commands via process.env inheritance
  const rootEnvPath = resolve(dir, ".env");
  if (existsSync(rootEnvPath)) {
    dotenvConfig({ path: rootEnvPath });
  }

  return JSON.parse(raw) as ReviewSquadConfig;
}

export function getSlackBotConfig(config: ReviewSquadConfig): SlackBotConfig {
  return { ...DEFAULTS, ...config.slack_bot };
}

export function validateEnv(): void {
  const required = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "REVIEW_SQUAD_DIR"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\nSee .env.example for details.`
    );
  }
}
