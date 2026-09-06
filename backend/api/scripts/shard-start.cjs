const { spawnSync } = require("node:child_process");

process.env.NODE_ENV ||= "production";
process.env.PORT ||= "80";
process.env.PUBLIC_WEB_URL ||= "https://tempest-light-api.shardweb.app";
process.env.CORS_ORIGIN ||= ["null", "file://", "http://localhost:5173", process.env.PUBLIC_WEB_URL].join(",");

const missing = ["DATABASE_URL", "JWT_SECRET"].filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Variaveis obrigatorias ausentes na Shard Cloud: ${missing.join(", ")}`);
  console.error("Abra a aplicacao na Shard Cloud, va em Variaveis/Environment e preencha esses valores antes de iniciar.");
  process.exit(1);
}

const prismaCli = require.resolve("prisma/build/index.js");
const migrate = spawnSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", "prisma/schema.prisma"], {
  stdio: "inherit",
  env: process.env
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

require("../dist/main.js");
