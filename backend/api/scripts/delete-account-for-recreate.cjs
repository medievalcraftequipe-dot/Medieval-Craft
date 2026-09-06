const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function countUserFootprint(userId) {
  const [
    ownedServers,
    moderatedBans,
    moderatedActions,
    memberships,
    messages,
    sessions,
    verificationTokens,
    passwordResetCodes
  ] = await Promise.all([
    prisma.server.count({ where: { ownerId: userId } }),
    prisma.ban.count({ where: { moderatorId: userId } }),
    prisma.moderationAction.count({ where: { moderatorId: userId } }),
    prisma.serverMember.count({ where: { userId } }),
    prisma.message.count({ where: { authorId: userId } }),
    prisma.session.count({ where: { userId } }),
    prisma.emailVerificationToken.count({ where: { userId } }),
    prisma.passwordResetCode.count({ where: { userId } })
  ]);

  return {
    ownedServers,
    moderatedBans,
    moderatedActions,
    memberships,
    messages,
    sessions,
    verificationTokens,
    passwordResetCodes
  };
}

async function hardDeleteUser(user) {
  const footprint = await countUserFootprint(user.id);

  if (footprint.ownedServers > 0) {
    await prisma.server.deleteMany({ where: { ownerId: user.id } });
    console.log(`Servidores apagados junto com a conta: ${footprint.ownedServers}.`);
  }

  await prisma.ban.deleteMany({ where: { moderatorId: user.id } });
  await prisma.moderationAction.deleteMany({ where: { moderatorId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Conta apagada: @${user.username} (${user.email}) id=${user.id}`);
}

async function main() {
  const targetEmail = normalize(process.env.TARGET_EMAIL);
  const targetUsername = normalize(process.env.TARGET_USERNAME);

  if (!targetEmail && !targetUsername) {
    throw new Error("Informe TARGET_EMAIL ou TARGET_USERNAME para localizar a conta.");
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        ...(targetEmail ? [{ email: { equals: targetEmail, mode: "insensitive" } }] : []),
        ...(targetUsername ? [{ username: { equals: targetUsername, mode: "insensitive" } }] : [])
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  if (users.length === 0) {
    console.log("Nenhuma conta encontrada com esse e-mail/nick. Voce ja pode tentar criar a conta nova.");
    return;
  }

  console.log("Contas encontradas:");
  for (const user of users) {
    const footprint = await countUserFootprint(user.id);
    console.log(
      `- @${user.username} (${user.email}) status=${user.status} id=${user.id} servidores=${footprint.ownedServers} mensagens=${footprint.messages}`
    );
  }

  if (process.env.CONFIRM_DELETE_ACCOUNT !== "1") {
    console.log("Nada foi alterado. Rode de novo com CONFIRM_DELETE_ACCOUNT=1 para apagar/liberar.");
    return;
  }

  for (const user of users) {
    await hardDeleteUser(user);
  }

  console.log("Processo concluido. Tente criar a conta nova novamente.");
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
