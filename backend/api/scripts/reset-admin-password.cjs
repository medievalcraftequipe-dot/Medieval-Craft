const { hash } = require("@node-rs/argon2");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const username = String(process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const displayName = String(process.env.ADMIN_DISPLAY_NAME || process.env.ADMIN_USERNAME || "Administrador").trim();
  const birthDate = new Date(String(process.env.ADMIN_BIRTH_DATE || "2000-01-01"));
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!email || !password) {
    throw new Error("Informe ADMIN_EMAIL e ADMIN_PASSWORD para trocar a senha administrativa.");
  }

  if (!username && process.env.CREATE_ADMIN_IF_MISSING === "1") {
    throw new Error("Informe ADMIN_USERNAME para criar a conta administrativa caso ela nao exista.");
  }

  if (password.length < 10) {
    throw new Error("A nova senha precisa ter pelo menos 10 caracteres.");
  }

  if (Number.isNaN(birthDate.getTime())) {
    throw new Error("ADMIN_BIRTH_DATE invalida. Use o formato YYYY-MM-DD.");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        ...(username ? [{ username: { equals: username, mode: "insensitive" } }] : [])
      ]
    }
  });

  if (!user) {
    if (process.env.CREATE_ADMIN_IF_MISSING !== "1") {
      throw new Error(`Nenhuma conta encontrada para ${email}. Use CREATE_ADMIN_IF_MISSING=1 e ADMIN_USERNAME para criar.`);
    }

    const created = await prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash: await hash(password),
        birthDate,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    console.log(`Conta administrativa criada para @${created.username} (${created.email}). Entre com a senha nova.`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(username ? { username } : {}),
      ...(displayName ? { displayName } : {}),
      passwordHash: await hash(password),
      status: "ACTIVE",
      emailVerifiedAt: user.emailVerifiedAt || new Date(),
      twoFactorEnabled: false,
      twoFactorSecret: null
    }
  });

  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  console.log(`Senha redefinida para @${user.username} (${user.email}). Entre novamente com a senha nova.`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
