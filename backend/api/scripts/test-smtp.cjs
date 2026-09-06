const nodemailer = require("nodemailer");

async function main() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "");
  const from = String(process.env.SMTP_FROM || `Tempest Light <${user}>`).trim();
  const to = String(process.env.TEST_EMAIL || user).trim();

  const missing = [
    ["SMTP_HOST", host],
    ["SMTP_USER", user],
    ["SMTP_PASS", pass],
    ["TEST_EMAIL ou SMTP_USER", to]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Variaveis ausentes: ${missing.map(([name]) => name).join(", ")}`);
  }

  if (!Number.isFinite(port)) {
    throw new Error("SMTP_PORT invalido.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass }
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Teste SMTP Tempest Light",
    text: [
      "Se voce recebeu este e-mail, o SMTP do Tempest Light esta configurado corretamente.",
      "",
      `Enviado em: ${new Date().toISOString()}`
    ].join("\n")
  });

  console.log(`SMTP ok. E-mail de teste enviado para ${to}.`);
  console.log(`Message id: ${info.messageId}`);
}

main().catch((error) => {
  console.error("Falha no SMTP.");
  console.error(error.message || error);
  process.exitCode = 1;
});
