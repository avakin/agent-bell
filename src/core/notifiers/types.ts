import type { BellEvent } from "../../types/index.js";

export interface NotificationPayload {
  event: BellEvent;
  source?: string;
  escalated: boolean;
}

export const SOURCE_LABELS: Record<string, string> = {
  claude: "Claude Code",
  cursor: "Cursor",
  gemini: "Gemini CLI",
};

export const EVENT_LABELS: Record<string, string> = {
  "task-complete": "Task complete",
  "needs-input": "Needs your input",
  error: "Error occurred",
  "session-start": "Session started",
  "tool-use": "Tool use",
};
