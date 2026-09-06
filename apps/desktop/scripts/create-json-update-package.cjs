const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const desktopDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(desktopDir, "..", "..");
const desktopPackage = JSON.parse(fs.readFileSync(path.join(desktopDir, "package.json"), "utf8"));

const version = desktopPackage.version;
const installerFileName = `Tempest Light Setup ${version}.exe`;
const githubRepository = process.env.TEMPEST_LIGHT_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || "SEU_USUARIO/SEU_REPOSITORIO";
const defaultBaseUrl = `https://github.com/${githubRepository}/releases/latest/download`;
const baseUrl = (process.env.TEMPEST_LIGHT_DOWNLOAD_BASE_URL || defaultBaseUrl).replace(/\/+$/, "");
const outputDir = path.resolve(process.argv[3] || path.join(rootDir, "INSTALADOR", "JSON_PARA_GITHUB"));
const smallJsonTargetBytes = 8 * 1024;
const packageTargetBytes = 99_000_000;
const manifestFileName = "tempest_light_update.json";
const packageFileName = "tempest_light_installer_package.json";
const packageBaseName = packageFileName.replace(/\.json$/i, "");
const downloadInfoFileName = "tempest_light_download_info.json";

const explicitInstaller = process.argv[2] ? path.resolve(process.argv[2]) : null;
const installerCandidates = [
  explicitInstaller,
  path.join(desktopDir, "release", installerFileName),
  path.join(rootDir, "INSTALADOR", installerFileName)
].filter(Boolean);

const installerPath = installerCandidates.find((candidate) => fs.existsSync(candidate));
if (!installerPath) {
  throw new Error(`Instalador nao encontrado. Esperado: ${installerFileName}`);
}

fs.mkdirSync(outputDir, { recursive: true });
cleanGeneratedPackageFiles(outputDir);

const installerBuffer = fs.readFileSync(installerPath);
const installerSha256 = sha256(installerBuffer);
const packagePath = path.join(outputDir, packageFileName);
const publishedAt = new Date().toISOString().slice(0, 10);
const installerBase64 = installerBuffer.toString("base64");

const updatePackage = createChunkedPackage(installerBase64);
for (const chunk of updatePackage.chunkFiles) {
  fs.writeFileSync(path.join(outputDir, chunk.fileName), chunk.content, "utf8");
}
fs.writeFileSync(packagePath, updatePackage.content, "utf8");

const packageBuffer = fs.readFileSync(packagePath);
const packageSha256 = sha256(packageBuffer);
const manifestPath = path.join(outputDir, manifestFileName);
const manifest = {
  version,
  setupUrl: packageFileName,
  sha256: packageSha256,
  publishedAt,
  changelog:
    `Atualizacao do Tempest Light v${version}: cliques rapidos em configuracoes ficam protegidos contra sync antigo, respostas de bots permanecem no historico e presenca de call ficou mais resistente.`,
  cdnMinimumSizePadding: ""
};

manifest.cdnMinimumSizePadding = "x".repeat(getJsonPaddingLength(manifest, smallJsonTargetBytes));
fs.writeFileSync(manifestPath, renderJson(manifest), "utf8");

const downloadInfoPath = path.join(outputDir, downloadInfoFileName);
const downloadInfo = {
  app: "Tempest Light",
  version,
  manifestUrl: `${baseUrl}/${manifestFileName}`,
  setupPackageUrl: `${baseUrl}/${packageFileName}`,
  packageFile: packageFileName,
  installerFileName,
  installerSize: installerBuffer.length,
  installerSha256,
  packageSha256,
  packageMainSizeBytes: packageTargetBytes,
  packageChunks: updatePackage.chunkFiles.map((chunk) => chunk.fileName),
  manifestSizeBytes: smallJsonTargetBytes,
  downloadInfoSizeBytes: smallJsonTargetBytes,
  publishedAt,
  usage:
    `Anexe todos os JSONs desta pasta em uma Release publica do GitHub. O launcher le ${manifestFileName}, baixa ${packageFileName} e suas partes, valida SHA-256 e recria o instalador .exe no computador do usuario.`,
  cdnMinimumSizePadding: ""
};

downloadInfo.cdnMinimumSizePadding = "x".repeat(getJsonPaddingLength(downloadInfo, smallJsonTargetBytes));
fs.writeFileSync(downloadInfoPath, renderJson(downloadInfo), "utf8");

const rootReadmePath = path.join(rootDir, "INSTALADOR", "LEIA-ME.txt");
if (fs.existsSync(rootReadmePath)) {
  const readme = fs.readFileSync(rootReadmePath, "utf8");
  const marker = "Arquivos JSON para GitHub Releases:";
  const addition = [
    "",
    marker,
    `JSON_PARA_GITHUB/${manifestFileName}`,
    `JSON_PARA_GITHUB/${packageFileName}`,
    "JSON_PARA_GITHUB/tempest_light_installer_package_part*.json",
    `JSON_PARA_GITHUB/${downloadInfoFileName}`
  ].join("\n");

  if (!readme.includes(marker)) {
    fs.writeFileSync(rootReadmePath, `${readme.trimEnd()}${addition}\n`, "utf8");
  }
}

console.log("Pacote JSON criado:");
console.log(packagePath);
console.log("Manifest JSON criado:");
console.log(manifestPath);
console.log("Info JSON criado:");
console.log(downloadInfoPath);
console.log(`SHA-256 do pacote: ${packageSha256}`);
console.log(`Tamanho do pacote principal: ${packageBuffer.length} bytes`);

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").toLowerCase();
}

function cleanGeneratedPackageFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    if (
      entry.name === manifestFileName ||
      entry.name === packageFileName ||
      entry.name === downloadInfoFileName ||
      entry.name === "tempest-light-update.json" ||
      entry.name === "tempest-light-installer-package.json" ||
      entry.name === "tempest-light-download-info.json" ||
      /^tempest[_-]light[_-]installer[_-]package[._]part\d+\.json$/i.test(entry.name)
    ) {
      fs.unlinkSync(path.join(dir, entry.name));
    }
  }
}

function createChunkedPackage(base64) {
  const maxChunkBase64Length = getMaxBase64LengthForChunk(packageTargetBytes);
  let firstBase64Length = Math.min(base64.length, floorToBase64Block(packageTargetBytes - 4096));
  let packageContent = "";
  let chunkFiles = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    chunkFiles = createChunkFiles(base64, firstBase64Length, maxChunkBase64Length);
    const packagePayload = createPackagePayload(base64.slice(0, firstBase64Length), chunkFiles, "");
    const currentBytes = Buffer.byteLength(renderJson(packagePayload), "utf8");

    if (currentBytes <= packageTargetBytes) {
      packagePayload.cdnMinimumSizePadding = "x".repeat(packageTargetBytes - currentBytes);
      packageContent = renderJson(packagePayload);
      break;
    }

    const overflow = currentBytes - packageTargetBytes;
    firstBase64Length = floorToBase64Block(firstBase64Length - overflow - 4);
    if (firstBase64Length <= 0) {
      throw new Error("Nao foi possivel criar pacote principal abaixo de 100 MB.");
    }
  }

  if (!packageContent) {
    throw new Error("Nao foi possivel estabilizar o pacote principal abaixo de 100 MB.");
  }

  const packageBytes = Buffer.byteLength(packageContent, "utf8");
  if (packageBytes !== packageTargetBytes) {
    throw new Error(`Pacote principal ficou com ${packageBytes} bytes, esperado ${packageTargetBytes}.`);
  }

  return {
    content: packageContent,
    chunkFiles
  };
}

function createPackagePayload(base64, chunkFiles, cdnMinimumSizePadding) {
  return {
    format: "tempest-light-installer-package-v2",
    fileName: installerFileName,
    contentType: "application/x-msdownload",
    size: installerBuffer.length,
    sha256: installerSha256,
    base64Length: installerBase64.length,
    packagePart: 1,
    base64,
    chunks: chunkFiles.map((chunk) => ({
      part: chunk.part,
      fileName: chunk.fileName,
      url: chunk.fileName,
      sha256: chunk.sha256,
      sizeBytes: chunk.contentBytes,
      base64Length: chunk.base64Length
    })),
    cdnMinimumSizePadding
  };
}

function createChunkFiles(base64, firstBase64Length, maxChunkBase64Length) {
  const chunks = [];
  let offset = firstBase64Length;
  let part = 2;

  while (offset < base64.length) {
    const nextOffset = Math.min(base64.length, offset + maxChunkBase64Length);
    const chunkBase64 = base64.slice(offset, floorToBase64Block(nextOffset));
    const fileName = `${packageBaseName}_part${part}.json`;
    const payload = {
      format: "tempest-light-installer-chunk-v1",
      part,
      base64: chunkBase64,
      cdnMinimumSizePadding: ""
    };
    const content = renderJson(payload);

    chunks.push({
      part,
      fileName,
      content,
      contentBytes: Buffer.byteLength(content, "utf8"),
      sha256: sha256(Buffer.from(content, "utf8")),
      base64Length: chunkBase64.length
    });

    offset += chunkBase64.length;
    part += 1;

    if (chunkBase64.length === 0) {
      throw new Error("Falha ao dividir pacote JSON em partes.");
    }
  }

  return chunks;
}

function getMaxBase64LengthForChunk(targetBytes) {
  const payload = {
    format: "tempest-light-installer-chunk-v1",
    part: 999,
    base64: "",
    cdnMinimumSizePadding: ""
  };
  const overhead = Buffer.byteLength(renderJson(payload), "utf8");
  return floorToBase64Block(targetBytes - overhead);
}

function floorToBase64Block(value) {
  return Math.max(0, Math.floor(value / 4) * 4);
}

function renderJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function getJsonPaddingLength(manifest, targetBytes) {
  const currentBytes = Buffer.byteLength(renderJson(manifest), "utf8");
  if (currentBytes > targetBytes) {
    throw new Error(`Manifest maior que ${targetBytes} bytes antes do preenchimento.`);
  }

  return targetBytes - currentBytes;
}
