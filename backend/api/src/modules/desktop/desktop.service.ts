import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthenticatedPrincipal } from "../../common/auth/authenticated-request";
import type { PublishUpdateDto } from "./dto/publish-update.dto";

const fallbackDeveloperEmails = ["rafaeltanki1212@gmail.com", "izigamer47@gmail.com"];
const fallbackDeveloperUsernames = ["armadura_prime"];

@Injectable()
export class DesktopService {
  constructor(private readonly config: ConfigService) {}

  async publishUpdate(user: AuthenticatedPrincipal, input: PublishUpdateDto) {
    if (!this.isDeveloperAccount(user)) {
      throw new ForbiddenException("Apenas a conta autorizada de developer pode enviar atualizacoes.");
    }

    const token = this.readGitHubToken();
    const { owner, repo } = this.readGitHubRepository();
    const workflowId = this.config.get<string>("TEMPEST_LIGHT_RELEASE_WORKFLOW_ID")?.trim() || "release.yml";
    const ref = this.normalizeRef(input.ref) || this.config.get<string>("TEMPEST_LIGHT_RELEASE_REF")?.trim() || "main";
    const version = this.normalizeVersion(input.version);
    const releaseNotes = input.releaseNotes?.trim() || "Atualizacao automatica do Tempest Light.";
    const actionsUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflowId}`;
    const requestBody: { ref: string; inputs: Record<string, string> } = {
      ref,
      inputs: {
        releaseNotes
      }
    };

    if (version) {
      requestBody.inputs.version = version;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Tempest-Light-API",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const details = await this.readErrorBody(response);
      throw new ServiceUnavailableException(this.getGitHubDispatchErrorMessage(response.status, details, owner, repo, workflowId, ref));
    }

    return {
      ok: true,
      owner,
      repo,
      workflowId,
      ref,
      version,
      actionsUrl,
      message: "Atualizacao enviada para o GitHub Actions. Aguarde a conclusao do workflow para a release ficar disponivel."
    };
  }

  private isDeveloperAccount(user: AuthenticatedPrincipal) {
    const allowedEmails =
      this.config
        .get<string>("TEMPEST_LIGHT_DEVELOPER_EMAILS")
        ?.split(",")
        .map((item: string) => item.trim().toLowerCase())
        .filter(Boolean) ?? fallbackDeveloperEmails;
    const allowedUsernames =
      this.config
        .get<string>("TEMPEST_LIGHT_DEVELOPER_USERNAMES")
        ?.split(",")
        .map((item: string) => item.trim().toLowerCase())
        .filter(Boolean) ?? fallbackDeveloperUsernames;

    return allowedEmails.includes(user.email.trim().toLowerCase()) || allowedUsernames.includes(user.username.trim().toLowerCase());
  }

  private readGitHubToken() {
    const token =
      this.config.get<string>("TEMPEST_LIGHT_GITHUB_TOKEN")?.trim() ||
      this.config.get<string>("GITHUB_PAT")?.trim() ||
      this.config.get<string>("GITHUB_TOKEN")?.trim();

    if (!token) {
      throw new ServiceUnavailableException("Configure TEMPEST_LIGHT_GITHUB_TOKEN na API para enviar atualizacoes.");
    }

    return token;
  }

  private readGitHubRepository() {
    const value =
      this.config.get<string>("TEMPEST_LIGHT_GITHUB_REPOSITORY")?.trim() ||
      this.config.get<string>("GITHUB_REPOSITORY")?.trim() ||
      "medievalcraftequipe-dot/Medieval-Craft";
    const [owner, repo] = value.split("/");

    if (!owner || !repo) {
      throw new BadRequestException("TEMPEST_LIGHT_GITHUB_REPOSITORY precisa estar no formato dono/repositorio.");
    }

    return { owner, repo };
  }

  private normalizeRef(ref?: string) {
    const value = ref?.trim();
    if (!value) {
      return null;
    }

    return value.replace(/^refs\/heads\//, "");
  }

  private normalizeVersion(version?: string) {
    const value = version?.trim();
    if (!value) {
      return null;
    }

    return value.replace(/^v/i, "");
  }

  private async readErrorBody(response: Response) {
    try {
      const body = (await response.json()) as { message?: unknown };
      return typeof body.message === "string" ? body.message.slice(0, 240) : "";
    } catch {
      try {
        return (await response.text()).slice(0, 240);
      } catch {
        return "";
      }
    }
  }

  private getGitHubDispatchErrorMessage(status: number, details: string, owner: string, repo: string, workflowId: string, ref: string) {
    const suffix = details ? ` Detalhe do GitHub: ${details}` : "";
    const target = `${owner}/${repo}`;

    if (status === 401) {
      return `Token do GitHub invalido ou expirado. Atualize TEMPEST_LIGHT_GITHUB_TOKEN na API com um PAT valido para ${target}.${suffix}`;
    }

    if (status === 403) {
      return `Token do GitHub sem permissao para disparar o workflow. Gere um PAT para ${target} com Actions: Read and write. Se for token classic, use o escopo repo. Depois atualize TEMPEST_LIGHT_GITHUB_TOKEN no host da API e reinicie a API.${suffix}`;
    }

    if (status === 404) {
      return `Repositorio ou workflow nao encontrado pelo token. Confira TEMPEST_LIGHT_GITHUB_REPOSITORY=${target}, TEMPEST_LIGHT_RELEASE_WORKFLOW_ID=${workflowId} e se o token tem acesso a esse repositorio.${suffix}`;
    }

    if (status === 422) {
      return `GitHub nao aceitou o dispatch. Confira se a branch/ref ${ref} existe e se o workflow ${workflowId} tem workflow_dispatch.${suffix}`;
    }

    return `GitHub recusou o envio da atualizacao. HTTP ${status}${suffix ? `.${suffix}` : ""}`;
  }
}
