#!/usr/bin/env node

// Fast path: intercept "play" before importing anything heavy
const args = process.argv.slice(2);
if (args[0] === "play" && args[1]) {
  const event = args[1];
  let source: string | undefined;
  const sourceIdx = args.indexOf("--source");
  if (sourceIdx !== -1 && args[sourceIdx + 1]) {
    source = args[sourceIdx + 1];
  }
  const { playCommand } = await import("./commands/play.js");
  playCommand(event, source);
  process.exit(0);
}

// Normal path: load Commander + all commands
const { Command } = await import("commander");
const { initCommand } = await import("./commands/init.js");
const { configShowCommand, configSetCommand } = await import("./commands/config.js");
const { themesListCommand, themesPreviewCommand, themesAddCommand } = await import("./commands/themes.js");
const { statusCommand } = await import("./commands/status.js");
const { uninstallCommand } = await import("./commands/uninstall.js");
const { pauseCommand, resumeCommand } = await import("./commands/pause.js");
const { testCommand } = await import("./commands/test.js");
const { doctorCommand } = await import("./commands/doctor.js");

const program = new Command();

program
  .name("agent-bell")
  .description("Audio notifications for AI coding agents")
  .version("0.1.0");

// Play — listed for help, but actual execution is the fast path above
program
  .command("play <event>")
  .description("Play a notification sound (invoked by hooks)")
  .option("--source <tool>", "Source tool for per-tool cooldown tracking")
  .action(async (event: string, options: { source?: string }) => {
    const { playCommand } = await import("./commands/play.js");
    playCommand(event, options.source);
  });

// Init wizard
program
  .command("init")
  .description("Interactive setup wizard")
  .action(async () => {
    await initCommand();
  });

// Config
const configCmd = program
  .command("config")
  .description("Manage configuration");

configCmd
  .command("show")
  .description("Show current configuration")
  .action(() => {
    configShowCommand();
  });

configCmd
  .command("set <key> <value>")
  .description("Set a configuration value (supports dotted keys)")
  .action((key: string, value: string) => {
    configSetCommand(key, value);
  });

// Themes
const themesCmd = program
  .command("themes")
  .description("Manage sound themes");

themesCmd
  .command("list")
  .description("List available themes")
  .action(() => {
    themesListCommand();
  });

themesCmd
  .command("preview <name>")
  .description("Preview a theme's sounds")
  .action(async (name: string) => {
    await themesPreviewCommand(name);
  });

themesCmd
  .command("add <path>")
  .description("Add a custom theme from a directory")
  .action((path: string) => {
    themesAddCommand(path);
  });

// Status
program
  .command("status")
  .description("Show current setup and hook status")
  .action(() => {
    statusCommand();
  });

// Pause / Resume
program
  .command("pause")
  .description("Temporarily silence all notifications")
  .action(() => {
    pauseCommand();
  });

program
  .command("resume")
  .description("Resume notifications after pausing")
  .action(() => {
    resumeCommand();
  });

// Test
program
  .command("test")
  .description("Fire a test notification to verify your setup")
  .action(() => {
    testCommand();
  });

// Doctor
program
  .command("doctor")
  .description("Diagnose common issues with your setup")
  .action(() => {
    doctorCommand();
  });

// Uninstall
program
  .command("uninstall")
  .description("Remove all hooks")
  .option("--remove-config", "Also delete ~/.agent-bell/ directory")
  .action((options: { removeConfig?: boolean }) => {
    uninstallCommand(options);
  });

program.parse();
