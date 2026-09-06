import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";

@Controller("invite")
export class InviteLinksController {
  @Get(":code")
  openShortInvite(@Param("code") code: string, @Res() response: Response) {
    return this.renderInvitePage(response, code);
  }

  @Get(":slug/:code")
  openCustomInvite(@Param("code") code: string, @Res() response: Response) {
    return this.renderInvitePage(response, code);
  }

  private renderInvitePage(response: Response, rawCode: string) {
    const cleanCode = String(rawCode ?? "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
    const deepLink = cleanCode ? `tempest-light://invite/${encodeURIComponent(cleanCode)}` : "tempest-light://invite/";
    const escapedDeepLink = this.escapeHtml(deepLink);

    return response.type("html").send(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Convite Tempest Light</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #101615; color: #edf3ef; font-family: Inter, Segoe UI, Arial, sans-serif; }
    main { width: min(92vw, 460px); border: 1px solid #303a36; border-radius: 12px; background: #1b2120; padding: 28px; box-shadow: 0 24px 70px rgba(0, 0, 0, .32); }
    h1 { margin: 0 0 10px; font-size: 1.5rem; }
    p { margin: 0 0 18px; color: #a9b8b2; line-height: 1.45; }
    a { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; border-radius: 8px; background: #39c6a3; color: #06211b; font-weight: 800; padding: 0 16px; text-decoration: none; }
    code { display: block; margin-top: 16px; color: #39c6a3; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Convite Tempest Light</h1>
    <p>Abra este convite no aplicativo instalado para entrar no servidor.</p>
    <a href="${escapedDeepLink}">Abrir no Tempest Light</a>
    <code>${escapedDeepLink}</code>
  </main>
  <script>window.location.href = ${JSON.stringify(deepLink)};</script>
</body>
</html>`);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
