import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Globe2, Loader2, Play, RefreshCcw, ShieldCheck, WifiOff, type LucideIcon } from "lucide-react";
import type { TempestLightApiClient } from "@tempest-light/api-client";
import { Button } from "@tempest-light/ui";

type LauncherStep = "checking" | "ready" | "unavailable";
type UpdateState = "unsupported" | "not_configured" | "checking" | "current" | "available" | "installing" | "error";
const BRAND_LOGO_URL = new URL("./assets/tempest-night-logo.png", import.meta.url).href;
const brandCoverStyle = { "--brand-cover": `url(${BRAND_LOGO_URL})` } as CSSProperties;

interface DesktopLauncherProps {
  api: TempestLightApiClient | null;
  apiConfigured: boolean;
  apiUrl: string;
  onLaunch: () => void;
}

export function DesktopLauncher({ api, apiConfigured, apiUrl, onLaunch }: DesktopLauncherProps) {
  const [step, setStep] = useState<LauncherStep>("checking");
  const [updateState, setUpdateState] = useState<UpdateState>("checking");
  const [update, setUpdate] = useState<TempestLightDesktopUpdateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const apiHost = useMemo(() => {
    try {
      return new URL(apiUrl).host;
    } catch {
      return apiUrl;
    }
  }, [apiUrl]);
  const isPlaceholderHost = apiHost.includes("seu-dominio");

  const checkStatus = useCallback(async () => {
    setStep("checking");
    setError(null);

    if (!apiConfigured || !api) {
      setStep("unavailable");
      setError("API online nao configurada.");
      return;
    }

    try {
      await api.health();
      setStep("ready");
    } catch (caught) {
      setStep("unavailable");
      const detail = caught instanceof Error && caught.message ? caught.message : null;
      setError(
        isPlaceholderHost
          ? "Servidor online ainda nao configurado."
          : detail
            ? `${apiHost}: ${detail}`
            : `${apiHost}: sem resposta agora.`
      );
    }
  }, [api, apiConfigured, apiHost, isPlaceholderHost]);

  const checkUpdate = useCallback(async () => {
    if (!window.tempestLightDesktop) {
      setUpdateState("unsupported");
      return;
    }

    setUpdateState("checking");

    try {
      const result = await window.tempestLightDesktop.checkForUpdates();

      if (result.status === "available") {
        setUpdate(result);
        setUpdateState("available");
      } else if (result.status === "current" || result.status === "unsupported" || result.status === "not_configured") {
        setUpdate(null);
        setUpdateState(result.status);
      } else {
        setUpdate({ status: "error", message: explainUpdateError(result.message) });
        setUpdateState("error");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : null;
      setUpdate({ status: "error", message: explainUpdateError(message) });
      setUpdateState("error");
    }
  }, []);

  useEffect(() => {
    void checkStatus();
    void checkUpdate();
  }, [checkStatus, checkUpdate]);

  useEffect(() => {
    if (!window.tempestLightDesktop) {
      return;
    }

    return window.tempestLightDesktop.onUpdateProgress((event) => {
      setProgress(Math.round(event.percent));
    });
  }, []);

  async function installUpdate() {
    if (!window.tempestLightDesktop || !update) {
      return;
    }

    setUpdateState("installing");
    setProgress(0);

    const result = await window.tempestLightDesktop.installUpdate();
    if (!result.ok) {
      setError(result.message ?? "Nao foi possivel instalar a atualizacao.");
      setUpdateState("error");
    }
  }

  return (
    <main className="launcher-screen" style={brandCoverStyle}>
      <section className="launcher-panel" aria-label="Tempest Light Launcher">
        <div className="launcher-brand">
          <img className="brand-logo" src={BRAND_LOGO_URL} alt="Tempest Night" />
          <div>
            <span>Tempest Light Launcher</span>
            <h1>Inicializador</h1>
          </div>
        </div>

        <div className="launcher-status">
          <StatusRow
            icon={step === "unavailable" ? WifiOff : step === "checking" ? Loader2 : CheckCircle2}
            state={step === "unavailable" ? "error" : step === "checking" ? "checking" : "ready"}
            title="API"
            detail={
              step === "ready"
                ? apiHost
                : step === "unavailable"
                  ? error ?? "Desconectada"
                  : "Verificando"
            }
          />
          <StatusRow
            icon={
              updateState === "available"
                ? Download
                : updateState === "current" || updateState === "unsupported" || updateState === "not_configured" || updateState === "error"
                  ? ShieldCheck
                  : Loader2
            }
            state={
              updateState === "current" || updateState === "unsupported" || updateState === "not_configured" || updateState === "error"
                  ? "ready"
                  : "checking"
            }
            title="Atualizacao"
            detail={
              updateState === "available"
                ? `Versao ${update?.version}`
                : updateState === "current"
                  ? "Atual"
                  : updateState === "unsupported"
                    ? "App instalado"
                    : updateState === "not_configured"
                      ? "Aguardando repositorio GitHub"
                      : updateState === "installing"
                        ? progress > 0
                          ? `${progress}%`
                          : "Baixando"
                        : updateState === "error"
                          ? update?.message ?? "Release GitHub ainda nao publicada"
                          : "Verificando"
            }
          />
          <StatusRow icon={Globe2} state="ready" title="Ambiente" detail="Producao" />
        </div>

        {step === "unavailable" ? (
          <p className="launcher-note">Nao foi possivel conectar ao servidor configurado. O Tempest Light agora abre somente com a API online.</p>
        ) : null}

        <div className="launcher-actions">
          {updateState === "available" ? (
            <Button variant="primary" onClick={installUpdate}>
              Atualizar
            </Button>
          ) : (
            <Button variant="primary" onClick={onLaunch} disabled={step !== "ready"}>
              <Play size={18} />
              Abrir
            </Button>
          )}
          <Button variant="secondary" onClick={() => void Promise.all([checkStatus(), checkUpdate()])}>
            <RefreshCcw size={18} />
            Verificar
          </Button>
        </div>
      </section>
    </main>
  );
}

function explainUpdateError(message?: string | null) {
  if (!message) {
    return "Nao consegui verificar agora";
  }

  if (/404|not found/i.test(message)) {
    return "Release GitHub ainda nao publicada";
  }

  if (/401|403|forbidden|unauthorized/i.test(message)) {
    return "Release GitHub sem acesso publico";
  }

  return "Nao consegui verificar agora";
}

function StatusRow({
  icon: Icon,
  state,
  title,
  detail
}: {
  icon: LucideIcon;
  state: "checking" | "ready" | "error";
  title: string;
  detail: string;
}) {
  return (
    <article className={`launcher-row ${state}`}>
      <Icon size={20} className={state === "checking" ? "spin" : ""} />
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}
