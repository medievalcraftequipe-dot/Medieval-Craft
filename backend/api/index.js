const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const distEntry = join(__dirname, "dist", "main.js");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const generate = spawnSync(npmCommand, ["run", "db:generate"], {
  cwd: __dirname,
  env: process.env,
  stdio: "inherit"
});

if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}

if (!existsSync(distEntry)) {
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
