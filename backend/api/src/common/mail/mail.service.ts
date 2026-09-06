import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";

interface VerificationEmailInput {
  to: string;
  username: string;
  verificationUrl: string;
  expiresAt: Date;
}

interface PasswordResetEmailInput {
  to: string;
  username: string;
  code: string;
  expiresAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(input: VerificationEmailInput): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP is not configured. Verification link for ${input.to}: ${input.verificationUrl}`);
      return false;
    }

    const from = this.config.get<string>("SMTP_FROM") ?? "Tempest Light <no-reply@tempest-light.app>";
    const expiry = input.expiresAt.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo"
    });

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: "Ative sua conta Tempest Light",
        text: [
          `Oi, ${input.username}.`,
          "",
          "Clique no link abaixo para ativar sua conta Tempest Light:",
          input.verificationUrl,
          "",
          `Esse link expira em ${expiry}.`,
          "",
          "Se voce nao criou essa conta, ignore este e-mail."
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17211e">
            <h1 style="margin:0 0 12px">Ative sua conta Tempest Light</h1>
            <p>Oi, <strong>${this.escapeHtml(input.username)}</strong>.</p>
            <p>Clique no botao abaixo para ativar sua conta.</p>
            <p>
              <a href="${this.escapeHtml(input.verificationUrl)}" style="display:inline-block;background:#39c6a3;color:#06211b;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
                Ativar conta
              </a>
            </p>
            <p>Esse link expira em ${this.escapeHtml(expiry)}.</p>
            <p>Se voce nao criou essa conta, ignore este e-mail.</p>
          </div>
        `
      });

      return true;
    } catch (error) {
      this.logger.warn(`Verification e-mail could not be sent to ${input.to}: ${(error as Error).message}`);
      return false;
    }
  }

  async sendPasswordResetCode(input: PasswordResetEmailInput): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP is not configured. Password reset code for ${input.to}: ${input.code}`);
      return false;
    }

    const from = this.config.get<string>("SMTP_FROM") ?? "Tempest Light <no-reply@tempest-light.app>";
    const expiry = input.expiresAt.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo"
    });

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: "Codigo para trocar sua senha Tempest Light",
        text: [
          `Oi, ${input.username}.`,
          "",
          "Use o codigo abaixo para trocar sua senha Tempest Light:",
          input.code,
          "",
          `Esse codigo expira em ${expiry}.`,
          "",
          "Se voce nao pediu essa troca, ignore este e-mail."
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17211e">
            <h1 style="margin:0 0 12px">Troca de senha Tempest Light</h1>
            <p>Oi, <strong>${this.escapeHtml(input.username)}</strong>.</p>
            <p>Use este codigo para trocar sua senha:</p>
            <p style="font-size:28px;letter-spacing:6px;font-weight:800">${this.escapeHtml(input.code)}</p>
            <p>Esse codigo expira em ${this.escapeHtml(expiry)}.</p>
            <p>Se voce nao pediu essa troca, ignore este e-mail.</p>
          </div>
        `
      });

      return true;
    } catch (error) {
      this.logger.warn(`Password reset e-mail could not be sent to ${input.to}: ${(error as Error).message}`);
      return false;
    }
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>("SMTP_HOST");
    if (!host) {
      return null;
    }

    const port = Number(this.config.get<string>("SMTP_PORT") ?? 587);
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>("SMTP_SECURE") === "true" || port === 465,
      auth: user && pass ? { user, pass } : undefined
    });

    return this.transporter;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
