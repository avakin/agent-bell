import { openSync, writeSync, closeSync } from "fs";
import { logToFile } from "../../utils/logger.js";

export function send(): void {
  try {
    const fd = openSync("/dev/tty", "w");
    writeSync(fd, "\x07");
    closeSync(fd);
  } catch (err) {
    logToFile("Failed to send terminal bell", err);
  }
}
