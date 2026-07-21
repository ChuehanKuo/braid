import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");
const pluginRoot = path.join(repository, "plugins", "braid");

const readJson = async (file: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;

const listTree = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const file = path.join(root, entry.name);
    files.push(file);
    if (entry.isDirectory()) files.push(...(await listTree(file)));
  }
  return files;
};

describe("Claude native plugin package", () => {
  it("keeps marketplace and plugin metadata consistent with Braid", async () => {
    const packageJson = await readJson(path.join(repository, "package.json"));
    const marketplace = await readJson(
      path.join(repository, ".claude-plugin", "marketplace.json"),
    );
    const manifest = await readJson(
      path.join(pluginRoot, ".claude-plugin", "plugin.json"),
    );
    expect(marketplace.name).toBe("braid");
    expect(marketplace.version).toBe(packageJson.version);
    expect(manifest.name).toBe("braid");
    expect(manifest.version).toBe(packageJson.version);
    // Claude auto-loads hooks/hooks.json; declaring it again duplicates every hook.
    expect(manifest.hooks).toBeUndefined();
    expect(marketplace.plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "braid",
          source: "./plugins/braid",
          version: packageJson.version,
        }),
      ]),
    );
  });

  it("declares exactly the four Growth Mode hooks with safe relative launchers", async () => {
    const document = await readJson(
      path.join(pluginRoot, "hooks", "hooks.json"),
    );
    const hooks = document.hooks as Record<
      string,
      Array<{ matcher?: string; hooks: Array<Record<string, unknown>> }>
    >;
    expect(Object.keys(hooks).sort()).toEqual(
      ["SessionStart", "UserPromptSubmit", "PostToolUse", "Stop"].sort(),
    );
    expect(hooks.PostToolUse?.[0]?.matcher).toBe(
      "Write|Edit|MultiEdit|NotebookEdit",
    );
    for (const groups of Object.values(hooks)) {
      const handler = groups[0]?.hooks[0];
      expect(handler).toMatchObject({ type: "command", timeout: 30 });
      expect(handler?.command).toBe(
        '"${CLAUDE_PLUGIN_ROOT}/scripts/run-growth-hook.sh"',
      );
    }
    const launcher = await readFile(
      path.join(pluginRoot, "scripts", "run-growth-hook.sh"),
      "utf8",
    );
    expect(launcher).toContain(
      "braid growth hook --host claude --source native-plugin",
    );
    expect(launcher).not.toMatch(/curl|wget|npm install|pnpm install/u);
  });

  it("packages all four commands and no symlinks", async () => {
    for (const command of ["setup", "status", "check", "help"]) {
      const content = await readFile(
        path.join(pluginRoot, "commands", `${command}.md`),
        "utf8",
      );
      expect(content.startsWith("---\n")).toBe(true);
      expect(content).toContain("description:");
    }
    const tree = await listTree(pluginRoot);
    for (const file of tree) {
      expect((await lstat(file)).isSymbolicLink()).toBe(false);
    }
    expect(
      (await lstat(path.join(pluginRoot, "scripts", "run-growth-hook.sh")))
        .mode & 0o111,
    ).not.toBe(0);
  });
});
