# Launcher e instalador desktop

O desktop do Tempest Light usa Electron + electron-builder. Ninguem precisa instalar Tauri ou Rust para instalar o programa; no computador do usuario o instalador continua sendo um `.exe`, e para atualizacoes ele fica empacotado dentro de arquivos `.json` anexados em GitHub Releases.

## O que foi preparado

- Launcher visual antes de abrir o app.
- Conta local sem servidor externo obrigatorio.
- Instalador Windows NSIS.
- Icone proprio no app e no instalador.
- Atalhos no menu iniciar e na area de trabalho.
- Canal de atualizacao por GitHub Releases usando manifest e pacote `.json`, no mesmo modelo do painel medieval.
- Abertura em modo normal com cadastro local; login online funciona quando o servidor online estiver publicado.
- Importacao de modelos publicos do Discord usando link `discord.new/...`, trazendo categorias, canais, cargos e permissoes para o Tempest Light.
- Configuracoes locais de servidor com tag, engajamento, convites, seguranca, banimentos, AutoMod, call com cronometro no perfil, estrelas mensais para developer, banners por upload, bots por token mascarado e atividade Steam.
- Estrelas de servidor ate NV8, com banner estatico, banner animado, convite personalizado, cor de destaque, cartao de boas-vindas, selo, paleta da barra de objetivo, tema lendario e Guia do servidor.
- Perfil publico com data de criacao da conta, data de entrada no servidor e capa local corrigida no cartao aberto pela lista de membros.
- Multi-contas locais para dono/admin/developer, com troca rapida pelo perfil e remocao apenas do vinculo conectado.
- Ponte de bots do Discord Developer Portal com avatar, banner, descricao, modulos de comandos, canais permitidos por bot e comandos chamados por prefixo ou por @bot.
- Mencoes por @usuario, @bot e @cargo no chat do servidor, com notificacoes no sininho; mencao por cargo fica restrita a dono, administradores e moderacao.
- Persistencia local por conta para manter servidores, conversas, canais e configuracoes depois de atualizar ou reinstalar por cima.

## Requisitos para gerar o instalador

Na maquina que vai gerar o instalador:

- Node.js.
- pnpm.

Nao precisa de Tauri. Nao precisa de Rust.

## Configurar GitHub real

Para o atualizador buscar novas versoes pelo GitHub, edite:

- `apps/desktop/electron/config.json`

No `apps/desktop/electron/config.json`, altere:

```json
{
  "updateFeedUrl": "https://github.com/medievalcraftequipe-dot/Medieval-Craft/releases/latest/download/tempest_light_update.json"
}
```

Essa URL e o arquivo JSON publico que o launcher instalado consulta para encontrar atualizacoes.

O arquivo `.env.production` com `VITE_API_URL=https://api.seu-dominio.com/api/v1` so precisa ser configurado depois, quando voce tiver um servidor online para contas, e-mail real, chat e voz entre computadores diferentes.

## Gerar o instalador Windows

```bash
pnpm install
pnpm build:installer:windows
```

Saida esperada:

```text
apps/desktop/release/
```

O instalador principal sera um arquivo `.exe`, por exemplo:

```text
Tempest Light Setup 0.1.28.exe
```

Esse e o arquivo que as pessoas baixam e executam para instalar o programa.

O mesmo comando tambem cria a pasta:

```text
INSTALADOR/JSON_PARA_GITHUB/
```

Ela contem os arquivos para anexar na Release do GitHub:

```text
tempest_light_update.json
tempest_light_installer_package.json
tempest_light_installer_package_part*.json
tempest_light_download_info.json
```

Enquanto o servidor online ainda nao existir, o launcher mostra conta local e abre o programa normalmente neste computador. Depois que voce publicar a API e trocar os dominios, o mesmo fluxo passa a abrir a autenticacao online real.

## Atualizacoes

O Tempest Light usa o mesmo esquema do programa Medieval: o instalador `.exe` fica convertido em base64 dentro de pacotes `.json`, e o `tempest_light_update.json` aponta para esse pacote na mesma Release. Para GitHub Releases, os arquivos podem ser anexados como assets da versao; o arquivo principal ainda fica abaixo de 100 MB reais e, se sobrar conteudo, ele cria partes extras como `tempest_light_installer_package_part2.json`.

Para publicar:

1. Gere uma nova versao com `pnpm build:installer:windows`.
2. Crie uma Release publica no GitHub, por exemplo `v0.1.28`.
3. Anexe somente os arquivos de `INSTALADOR/JSON_PARA_GITHUB/` nessa Release.
4. Confirme que `apps/desktop/electron/config.json` aponta para `https://github.com/medievalcraftequipe-dot/Medieval-Craft/releases/latest/download/tempest_light_update.json`.
5. O launcher instalado baixa o pacote JSON e suas partes extras, valida SHA-256, recria o instalador `.exe` no computador do usuario e abre a instalacao.

Nao envie esses JSONs grandes pela tela comum de arquivos do repositorio. Use a aba Releases e anexe os arquivos como assets da Release.

Automacao pelo GitHub Actions:

O arquivo `.github/workflows/release.yml` gera o instalador, recria os JSONs e envia os assets para a Release automaticamente quando uma tag `vX.Y.Z` for enviada ao GitHub ou quando a API dispara o workflow pelo botao de developer. Dentro do workflow, a publicacao usa o `GITHUB_TOKEN` temporario do proprio GitHub Actions; nao salve senha pessoal no repositorio.

Depois que o projeto estiver enviado para o GitHub, publique uma versao assim:

```bash
git tag v0.1.28
git push origin v0.1.28
```

Depois acompanhe a aba Actions do repositorio. Quando a automacao terminar, a Release `v0.1.28` tera `tempest_light_update.json`, `tempest_light_download_info.json`, `tempest_light_installer_package.json` e as partes extras anexadas.

Para disparar pelo programa, configure na API online:

```env
TEMPEST_LIGHT_DEVELOPER_EMAILS=rafaeltanki1212@gmail.com
TEMPEST_LIGHT_GITHUB_REPOSITORY=medievalcraftequipe-dot/Medieval-Craft
TEMPEST_LIGHT_RELEASE_WORKFLOW_ID=release.yml
TEMPEST_LIGHT_RELEASE_REF=main
TEMPEST_LIGHT_GITHUB_TOKEN=cole_aqui_o_token_do_GitHub
```

O token acima fica somente na host da API. Ele precisa conseguir disparar workflows do repositorio.

Se quiser gerar os JSONs ja com o repositorio real no manifest:

```powershell
$env:TEMPEST_LIGHT_GITHUB_REPOSITORY="medievalcraftequipe-dot/Medieval-Craft"
pnpm package:installer:json
Remove-Item Env:TEMPEST_LIGHT_GITHUB_REPOSITORY
```

Se voce ja gerou o instalador e quer recriar apenas os JSONs:

```bash
pnpm package:installer:json
```

O arquivo `updates/manifest.example.json` mostra o formato esperado.

