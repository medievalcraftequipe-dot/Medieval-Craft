const { hash } = require("@node-rs/argon2");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const targetEmail = String(process.env.TARGET_EMAIL || "").trim().toLowerCase();
  const targetUsername = String(process.env.TARGET_USERNAME || "").trim().toLowerCase();

  if (!targetEmail && !targetUsername) {
    throw new Error("Informe TARGET_EMAIL ou TARGET_USERNAME para localizar a conta antiga.");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(targetEmail ? [{ email: { equals: targetEmail, mode: "insensitive" } }] : []),
        ...(targetUsername ? [{ username: { equals: targetUsername, mode: "insensitive" } }] : [])
      ]
    }
  });

  if (!user) {
    console.log("Nenhuma conta antiga encontrada. Voce ja pode criar a conta nova.");
    return;
  }

  console.log(`Conta encontrada: @${user.username} (${user.email}) id=${user.id}`);
  if (process.env.CONFIRM_RELEASE_ACCOUNT !== "1") {
    console.log("Nada foi alterado. Rode de novo com CONFIRM_RELEASE_ACCOUNT=1 para liberar esse e-mail/nick.");
    return;
  }

  const stamp = Date.now().toString(36);
  const releasedUsername = `deleted_${stamp}_${user.id.slice(-6)}`.slice(0, 32);
  const releasedEmail = `deleted-${stamp}-${user.id}@tempest-light.invalid`;

  await prisma.$transaction([
    prisma.user.update({
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
    }),
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  console.log(`E-mail/nick liberados. Agora voce pode cadastrar novamente ${targetEmail || targetUsername}.`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
