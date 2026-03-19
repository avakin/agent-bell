export type BellEvent =
  | "task-complete"
  | "needs-input"
  | "error"
  | "session-start"
  | "tool-use";

export type ToolName = "claude" | "cursor" | "gemini" | "opencode";

export type EventPreset = "auto" | "granular";

export interface ToolConfig {
  enabled: boolean;
  events: EventPreset;
}

export interface NotificationMethodConfig {
  sound: boolean;
  desktop: boolean;
  terminal_bell: boolean;
  say: boolean;
  tmux: boolean;
}

export interface AgentBellConfig {
  theme: string;
  cooldown: number;
  escalation_delay: number;
  volume: number;
  tools: Record<ToolName, ToolConfig>;
  events: Record<BellEvent, boolean>;
  notifications: NotificationMethodConfig;
}

export interface ThemeManifest {
  name: string;
  description: string;
  author: string;
  sounds: Partial<Record<BellEvent | `${BellEvent}-escalated`, string>>;
}

export interface PlayState {
  lastPlayed: Record<string, number>;
  escalationTracking: Record<string, number>;
}

export interface HookEntry {
  type: string;
  event?: string;
  command: string;
  matcher?: string;
  _agent_bell?: boolean;
}

export interface ClaudeHookCommand {
  type: "command";
  command: string;
}

export interface ClaudeHookRule {
  matcher: string;
  hooks: ClaudeHookCommand[];
  _agent_bell?: boolean;
}

export interface ClaudeSettings {
  hooks?: Record<string, ClaudeHookRule[]>;
  [key: string]: unknown;
}

export interface CursorHooks {
  hooks?: {
    event: string;
    command: string;
    _agent_bell?: boolean;
  }[];
  [key: string]: unknown;
}

export interface GeminiHookCommand {
  name?: string;
  type: "command";
  command: string;
  timeout?: number;
}

export interface GeminiHookRule {
  matcher: string;
  hooks: GeminiHookCommand[];
  _agent_bell?: boolean;
}

export interface GeminiSettings {
  hooks?: Record<string, GeminiHookRule[]>;
  [key: string]: unknown;
}

export const DEFAULT_CONFIG: AgentBellConfig = {
  theme: "galactic",
  cooldown: 3,
  escalation_delay: 30,
  volume: 0.7,
  tools: {
    claude: { enabled: false, events: "auto" },
    cursor: { enabled: false, events: "auto" },
    gemini: { enabled: false, events: "auto" },
    opencode: { enabled: false, events: "auto" },
  },
  events: {
    "task-complete": true,
    "needs-input": true,
    error: true,
    "session-start": false,
    "tool-use": false,
  },
  notifications: {
    sound: true,
    desktop: true,
    terminal_bell: true,
    say: false,
    tmux: false,
  },
};

export const BELL_EVENTS: BellEvent[] = [
  "task-complete",
  "needs-input",
  "error",
  "session-start",
  "tool-use",
];

export const TOOL_NAMES: ToolName[] = ["claude", "cursor", "gemini", "opencode"];
