import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { ToolName } from "../types/index.js";

interface DetectedTool {
  name: ToolName;
  label: string;
  detected: boolean;
  configDir: string;
}

const TOOL_PATHS: Record<ToolName, { label: string; dir: string }> = {
  claude: { label: "Claude Code", dir: ".claude" },
  cursor: { label: "Cursor", dir: ".cursor" },
  gemini: { label: "Gemini CLI", dir: ".gemini" },
  opencode: { label: "OpenCode", dir: join(".config", "opencode") },
};

export function detectInstalledTools(): DetectedTool[] {
  const home = homedir();
  return (Object.entries(TOOL_PATHS) as [ToolName, { label: string; dir: string }][]).map(
    ([name, { label, dir }]) => {
      const configDir = join(home, dir);
      return {
        name,
        label,
        detected: existsSync(configDir),
        configDir,
      };
    }
  );
}
