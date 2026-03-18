import { openSync, writeSync, closeSync } from "fs";

export function send(): void {
  try {
    const fd = openSync("/dev/tty", "w");
    writeSync(fd, "\x07");
    closeSync(fd);
  } catch {
    // No controlling terminal — silently skip
  }
}
