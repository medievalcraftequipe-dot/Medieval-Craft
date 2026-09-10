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

function runPrisma(args) {
  return spawnSync(process.execPath, [prismaCli, ...args, "--schema", "prisma/schema.prisma"], {
    stdio: "inherit",
    env: process.env
  });
}

async function ensureEmergencyColumns() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "starBalance" INTEGER NOT NULL DEFAULT 0');
  } finally {
    await prisma.$disconnect();
  }
}

async function boot() {
  const migrate = runPrisma(["migrate", "deploy"]);

  if (migrate.status !== 0) {
    console.warn("Prisma migrate deploy falhou. Tentando compatibilizar colunas conhecidas antes de iniciar a API.");
    try {
      await ensureEmergencyColumns();
      runPrisma(["migrate", "resolve", "--applied", "20260909200500_user_star_balance"]);
    } catch (caught) {
      console.error("Nao foi possivel preparar o banco para iniciar a API.");
      console.error(caught);
      process.exit(migrate.status ?? 1);
    }
  }

  require("../dist/main.js");
}

void boot();
