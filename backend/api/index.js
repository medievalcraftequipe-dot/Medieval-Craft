const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const distEntry = join(__dirname, "dist", "main.js");

if (!existsSync(distEntry)) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const build = spawnSync(npmCommand, ["run", "build"], {
    cwd: __dirname,
    env: process.env,
    stdio: "inherit"
  });

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

require("./scripts/shard-start.cjs");
