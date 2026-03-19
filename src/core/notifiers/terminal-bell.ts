import { openSync, writeSync, closeSync } from "node:fs";
import { logToFile } from "../../utils/logger.js";

export function send(): void {
  try {
    const fd = openSync("/dev/tty", "w");
    writeSync(fd, "\u0007");
    closeSync(fd);
  } catch (error) {
    logToFile("Failed to send terminal bell", error);
  }
}
