const { hash } = require("@node-rs/argon2");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function sameText(a, b) {
  return normalize(a) === normalize(b);
}

async function releaseUser(user) {
  const stamp = Date.now().toString(36);
  const releasedUsername = `deleted_${stamp}_${user.id.slice(-6)}`.slice(0, 32);
  const releasedEmail = `deleted-${stamp}-${user.id}@tempest-light.invalid`;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: releasedEmail,
      username: releasedUsername,
      displayName: "Conta removida",
      passwordHash: await hash(`deleted:${user.id}:${stamp}:${Math.random()}`),
      status: "DELETED",
      emailVerifiedAt: null,
      twoFactorEnabled: false,
      twoFactorSecret: null
    }
  });

  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

async function activateUser(user, input) {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash: await hash(input.password),
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      twoFactorEnabled: false,
      twoFactorSecret: null
    }
  });

  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

async function createUser(input) {
  await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash: await hash(input.password),
      birthDate: input.birthDate,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      twoFactorEnabled: false,
      twoFactorSecret: null
    }
  });
}

async function main() {
  const email = normalize(process.env.ADMIN_EMAIL);
  const username = normalize(process.env.ADMIN_USERNAME);
  const displayName = String(process.env.ADMIN_DISPLAY_NAME || process.env.ADMIN_USERNAME || "Administrador").trim();
  const birthDate = new Date(String(process.env.ADMIN_BIRTH_DATE || "2000-01-01"));
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!email || !username || !password) {
    throw new Error("Informe ADMIN_EMAIL, ADMIN_USERNAME e ADMIN_PASSWORD.");
  }

  if (password.length < 10) {
    throw new Error("A senha precisa ter pelo menos 10 caracteres.");
  }

  if (Number.isNaN(birthDate.getTime())) {
    throw new Error("ADMIN_BIRTH_DATE invalida. Use YYYY-MM-DD.");
  }

  const matches = await prisma.user.findMany({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { username: { equals: username, mode: "insensitive" } }
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Alvo desejado: @${username} (${email})`);
  if (matches.length === 0) {
    console.log("Nenhuma conta antiga encontrada com esse e-mail ou nick.");
  } else {
    console.log("Contas encontradas:");
    for (const user of matches) {
      console.log(`- @${user.username} (${user.email}) status=${user.status} id=${user.id}`);
    }
  }

  if (process.env.CONFIRM_FORCE_ADMIN !== "1") {
    console.log("Nada foi alterado. Rode com CONFIRM_FORCE_ADMIN=1 para aplicar.");
    return;
  }

  const exactUser = matches.find((user) => sameText(user.email, email) && sameText(user.username, username));
  const reusableUser = exactUser || (matches.length === 1 ? matches[0] : null);
  const input = { email, username, displayName, birthDate, password };

  if (reusableUser) {
    for (const user of matches.filter((candidate) => candidate.id !== reusableUser.id)) {
      await releaseUser(user);
      console.log(`Conflito liberado: @${user.username} (${user.email})`);
    }

    await activateUser(reusableUser, input);
    console.log(`Conta administrativa pronta: @${username} (${email}). Use a senha nova informada.`);
    return;
  }

  for (const user of matches) {
    await releaseUser(user);
    console.log(`Conta antiga liberada: @${user.username} (${user.email})`);
  }

  await createUser(input);
  console.log(`Conta administrativa criada: @${username} (${email}). Use a senha nova informada.`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
