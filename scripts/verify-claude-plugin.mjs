import { constants } from "node:fs";
import { access, lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const pluginRoot = path.join(repository, "plugins", "braid");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const fail = (message) => {
  throw new Error(`Claude plugin validation failed: ${message}`);
};
const tree = async (root) => {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    files.push(file);
    if (entry.isDirectory()) files.push(...(await tree(file)));
  }
  return files;
};

const packageJson = await readJson(path.join(repository, "package.json"));
const marketplace = await readJson(
  path.join(repository, ".claude-plugin", "marketplace.json"),
);
const manifest = await readJson(
  path.join(pluginRoot, ".claude-plugin", "plugin.json"),
);
const hooksDocument = await readJson(
  path.join(pluginRoot, "hooks", "hooks.json"),
);

if (marketplace.name !== "braid") fail("marketplace name is not braid");
if (manifest.name !== "braid") fail("plugin name is not braid");
// Claude auto-loads hooks/hooks.json; manifest.hooks is only for extra files.
if (manifest.hooks !== undefined) {
  fail("plugin manifest must not redeclare auto-discovered hooks/hooks.json");
}
for (const [label, version] of [
  ["marketplace", marketplace.version],
  ["plugin", manifest.version],
  ["marketplace entry", marketplace.plugins?.[0]?.version],
]) {
  if (version !== packageJson.version) {
    fail(`${label} version does not match package.json`);
  }
}
if (marketplace.plugins?.[0]?.source !== "./plugins/braid") {
  fail("plugin source must be ./plugins/braid");
}

const expectedEvents = [
  "PostToolUse",
  "SessionStart",
  "Stop",
  "UserPromptSubmit",
];
if (
  JSON.stringify(Object.keys(hooksDocument.hooks ?? {}).sort()) !==
  JSON.stringify(expectedEvents)
) {
  fail("hook event set differs from the verified lifecycle");
}
for (const groups of Object.values(hooksDocument.hooks)) {
  const handler = groups?.[0]?.hooks?.[0];
  if (
    handler?.command !== '"${CLAUDE_PLUGIN_ROOT}/scripts/run-growth-hook.sh"' ||
    handler?.timeout !== 30
  ) {
    fail("hook launcher or timeout is inconsistent");
  }
}

for (const command of ["setup", "status", "check", "help"]) {
  await access(
    path.join(pluginRoot, "commands", `${command}.md`),
    constants.R_OK,
  );
}
await access(
  path.join(pluginRoot, "scripts", "run-growth-hook.sh"),
  constants.R_OK | constants.X_OK,
);
for (const file of await tree(pluginRoot)) {
  if ((await lstat(file)).isSymbolicLink()) fail("plugin contains a symlink");
}

process.stdout.write(
  `Claude plugin package valid for Braid ${packageJson.version}.\n`,
);
