import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLAUDE_HOOK_EVENTS,
  CODEX_HOOK_EVENTS,
  createGrowthGuard,
  formatGrowthModeReport,
  inspectClaudeHookInstallation,
  inspectClaudeNativePlugin,
  inspectCodexHookInstallation,
  installClaudeHooks,
  installCodexHooks,
  probeClaudeHookCapabilities,
  probeCodexHookCapabilities,
  runClaudeHookStdio,
  runCodexHookStdio,
  uninstallClaudeHooks,
  uninstallCodexHooks,
} from "@braid/guard";
import { InvalidInputError } from "@braid/shared";

interface SessionOptions {
  path: string;
  session?: string;
  json?: boolean;
}

interface InstallOptions {
  path: string;
  dryRun?: boolean;
  confirm?: boolean;
  codex?: string;
  claude?: string;
  json?: boolean;
}

interface UninstallOptions {
  path: string;
  dryRun?: boolean;
  json?: boolean;
}

interface ResetOptions extends SessionOptions {
  confirm?: string;
}

const sessionIdFor = (session: string | undefined): string =>
  session ?? process.env.CODEX_THREAD_ID ?? "manual";

const guardFor = (options: SessionOptions) =>
  createGrowthGuard({
    projectRoot: path.resolve(options.path),
    sessionId: sessionIdFor(options.session),
  });

const writeJson = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

export const growthContextCommand = async (
  options: SessionOptions,
): Promise<void> => {
  const result = await guardFor(options).context();
  if (options.json) writeJson(result);
  else process.stdout.write(`${result.text}\n`);
};

export const growthCheckCommand = async (
  options: SessionOptions,
): Promise<void> => {
  const result = await guardFor(options).check();
  if (options.json) writeJson(result.report);
  else
    process.stdout.write(
      `${result.feedback ?? formatGrowthModeReport(result.report)}\n`,
    );
};

export const growthFinalCommand = async (
  options: SessionOptions,
): Promise<void> => {
  const result = await guardFor(options).final();
  if (options.json) writeJson(result);
  else
    process.stdout.write(
      `${result.feedback ?? formatGrowthModeReport(result.report)}\n`,
    );
};

export const growthStatusCommand = async (
  options: SessionOptions & { codex?: string; claude?: string },
): Promise<void> => {
  const projectRoot = path.resolve(options.path);
  const [
    lifecycle,
    installation,
    capabilities,
    claudeManual,
    claudeNative,
    claudeCapabilities,
  ] = await Promise.all([
    guardFor(options).status(),
    inspectCodexHookInstallation(projectRoot),
    probeCodexHookCapabilities({
      ...(options.codex ? { codexExecutable: options.codex } : {}),
    }),
    inspectClaudeHookInstallation(projectRoot),
    inspectClaudeNativePlugin({
      ...(options.claude ? { claudeExecutable: options.claude } : {}),
    }),
    probeClaudeHookCapabilities({
      ...(options.claude ? { claudeExecutable: options.claude } : {}),
    }),
  ]);
  const { sessionId: _sessionId, ...publicLifecycle } = lifecycle;
  void _sessionId;
  const publicInstallation = {
    ...installation,
    configPath: ".codex/hooks.json",
  };
  const publicCapabilities = {
    ...capabilities,
    executable: path.basename(capabilities.executable),
  };
  const publicClaudeManual = {
    ...claudeManual,
    configPath: ".claude/settings.local.json",
  };
  const duplicate = claudeNative.installed && claudeManual.installed;
  const status = {
    lifecycle: publicLifecycle,
    installation: publicInstallation,
    capabilities: publicCapabilities,
    claude: {
      manual: publicClaudeManual,
      native: claudeNative,
      capabilities: claudeCapabilities,
      duplicate,
      ...(duplicate
        ? {
            remediation:
              "Keep the native plugin and run: braid growth uninstall claude",
          }
        : {}),
    },
  };
  if (options.json) {
    writeJson(status);
    return;
  }
  process.stdout.write(
    [
      "Braid Growth Mode",
      "",
      `Enabled: ${lifecycle.enabled ? "yes" : "no"}`,
      `Session state: ${lifecycle.baselineExists ? "available" : "not initialized"}`,
      `Baseline: ${lifecycle.baseline?.id ?? "not initialized"}`,
      `Baseline Git fingerprint: ${lifecycle.baseline?.gitFingerprint ?? "none"}`,
      `Baseline source fingerprint: ${lifecycle.baseline?.sourceFingerprint ?? "none"}`,
      `Current Git fingerprint: ${lifecycle.current?.gitFingerprint ?? "none"}`,
      `Current source fingerprint: ${lifecycle.current?.sourceFingerprint ?? "none"}`,
      `Current architecture fingerprint: ${lifecycle.current?.architectureFingerprint ?? "none"}`,
      `Latest report: ${lifecycle.latestReport?.status ?? "none"}`,
      `Unresolved completion: ${lifecycle.unresolvedCompletion ? "yes" : "no"}`,
      `Codex hooks installed: ${installation.installed ? "yes" : "no"}`,
      `Codex hooks supported: ${capabilities.supported ? "yes" : "no"}`,
      ...(capabilities.reason
        ? [`Capability note: ${capabilities.reason}`]
        : []),
      `Claude native plugin installed: ${claudeNative.installed ? "yes" : "no"}`,
      `Claude native plugin enabled: ${claudeNative.enabled ? "yes" : "no"}`,
      `Claude manual hooks installed: ${claudeManual.installed ? "yes" : "no"}`,
      `Claude hooks supported: ${claudeCapabilities.supported ? "yes" : "no"}`,
      ...(duplicate
        ? [
            "Claude adapter duplicate: yes",
            "Remediation: keep the native plugin and run `braid growth uninstall claude`.",
          ]
        : ["Claude adapter duplicate: no"]),
      "",
    ].join("\n"),
  );
};

export const growthResetCommand = async (
  options: ResetOptions,
): Promise<void> => {
  const sessionId = sessionIdFor(options.session);
  if (options.confirm !== sessionId)
    throw new InvalidInputError(
      `Reset requires --confirm ${sessionId} for the active session.`,
    );
  const removed = await guardFor({ ...options, session: sessionId }).reset();
  const result = { sessionId, removed };
  if (options.json) writeJson(result);
  else
    process.stdout.write(
      `${removed ? "Braid Growth Mode state reset." : "No Braid Growth Mode state existed."}\n`,
    );
};

const cliEntrypoint = (): string =>
  process.argv[1]
    ? path.resolve(process.argv[1])
    : fileURLToPath(new URL("../index.js", import.meta.url));

export const growthInstallCodexCommand = async (
  options: InstallOptions,
): Promise<void> => {
  const result = await installCodexHooks({
    projectRoot: path.resolve(options.path),
    launcher: [process.execPath, cliEntrypoint(), "growth", "hook"],
    dryRun: options.dryRun ?? false,
    confirm: options.confirm ?? false,
    ...(options.codex ? { codexExecutable: options.codex } : {}),
  });
  if (options.json) {
    writeJson(result);
    return;
  }
  process.stdout.write(
    [
      `Braid Codex hook ${result.dryRun ? "dry run" : "installation"}`,
      `Configuration: ${result.configPath}`,
      `Changed: ${result.changed ? "yes" : "no"}`,
      ...CODEX_HOOK_EVENTS.map(
        (event) => `${event}: ${result.events[event] ? "enabled" : "missing"}`,
      ),
      ...(result.backupPath ? [`Backup: ${result.backupPath}`] : []),
      "Trust: review the repository hooks with /hooks in Codex.",
      "",
    ].join("\n"),
  );
};

export const growthUninstallCodexCommand = async (
  options: UninstallOptions,
): Promise<void> => {
  const result = await uninstallCodexHooks({
    projectRoot: path.resolve(options.path),
    dryRun: options.dryRun ?? false,
  });
  if (options.json) {
    writeJson(result);
    return;
  }
  process.stdout.write(
    [
      `Braid Codex hook ${result.dryRun ? "uninstall dry run" : "uninstall"}`,
      `Configuration: ${result.configPath}`,
      `Changed: ${result.changed ? "yes" : "no"}`,
      `Owned handlers removed: ${result.removedHandlerCount}`,
      "",
    ].join("\n"),
  );
};

export const growthInstallClaudeCommand = async (
  options: InstallOptions,
): Promise<void> => {
  const result = await installClaudeHooks({
    projectRoot: path.resolve(options.path),
    launcher: [process.execPath, cliEntrypoint(), "growth", "hook"],
    dryRun: options.dryRun ?? false,
    confirm: options.confirm ?? false,
    ...(options.claude ? { claudeExecutable: options.claude } : {}),
  });
  if (options.json) {
    writeJson(result);
    return;
  }
  process.stdout.write(
    [
      `Braid Claude hook ${result.dryRun ? "dry run" : "installation"}`,
      "Configuration: .claude/settings.local.json",
      `Changed: ${result.changed ? "yes" : "no"}`,
      ...CLAUDE_HOOK_EVENTS.map(
        (event) => `${event}: ${result.events[event] ? "enabled" : "missing"}`,
      ),
      ...(result.backupPath ? ["Backup created: yes"] : []),
      ...(result.dryRun ? ["", result.diff] : []),
      "Trust: review repository hooks with /hooks in Claude Code.",
      "",
    ].join("\n"),
  );
};

export const growthUninstallClaudeCommand = async (
  options: UninstallOptions,
): Promise<void> => {
  const result = await uninstallClaudeHooks({
    projectRoot: path.resolve(options.path),
    dryRun: options.dryRun ?? false,
  });
  if (options.json) {
    writeJson(result);
    return;
  }
  process.stdout.write(
    [
      `Braid Claude hook ${result.dryRun ? "uninstall dry run" : "uninstall"}`,
      "Configuration: .claude/settings.local.json",
      `Changed: ${result.changed ? "yes" : "no"}`,
      `Owned handlers removed: ${result.removedHandlerCount}`,
      ...(result.dryRun ? ["", result.diff] : []),
      "",
    ].join("\n"),
  );
};

interface GrowthHookCommandOptions {
  host?: string;
  source?: string;
  runCodexHook?: typeof runCodexHookStdio;
  runClaudeHook?: typeof runClaudeHookStdio;
  probeClaudeHook?: () => Promise<{
    supported: boolean;
    reason?: string | null;
  }>;
  writeClaudeFailOpen?: (reason: string) => Promise<void>;
}

const writeClaudeFailOpen = async (reason: string): Promise<void> => {
  // Drain exactly one provider payload without parsing or retaining it.
  for await (const _chunk of process.stdin) void _chunk;
  const detail = reason.endsWith(".") ? reason.slice(0, -1) : reason;
  process.stderr.write(`[braid-growth] ${detail}; continuing.\n`);
  process.stdout.write("{}\n");
};

export const growthHookCommand = async (
  options: GrowthHookCommandOptions = {},
): Promise<void> => {
  const host = options.host ?? "codex";
  if (host === "codex") {
    await (options.runCodexHook ?? runCodexHookStdio)();
    return;
  }
  if (host !== "claude") {
    throw new InvalidInputError(`Unsupported Growth Mode hook host: ${host}`);
  }
  const source = options.source ?? process.env.BRAID_CLAUDE_HOOK_SOURCE;
  if (source !== "native-plugin" && source !== "manual") {
    throw new InvalidInputError(
      "Claude Growth Mode hooks require --source native-plugin or --source manual.",
    );
  }
  const capability = await (
    options.probeClaudeHook ?? probeClaudeHookCapabilities
  )();
  if (!capability.supported) {
    await (options.writeClaudeFailOpen ?? writeClaudeFailOpen)(
      capability.reason ?? "Claude Code is outside the verified hook contract",
    );
    return;
  }
  await (options.runClaudeHook ?? runClaudeHookStdio)({ source });
};
