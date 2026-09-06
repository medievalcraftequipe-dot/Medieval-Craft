import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, Database, RadioTower, Shield } from "lucide-react";
import { createApiClient } from "@tempest-light/api-client";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error("VITE_API_URL is required.");
}

function AdminApp() {
  const api = useMemo(() => createApiClient(API_URL), []);
  const [database, setDatabase] = useState("checking");
  const [redis, setRedis] = useState("checking");

  useEffect(() => {
    async function loadHealth() {
      try {
        const health = await api.health();
        setDatabase(health.dependencies.database);
        setRedis(health.dependencies.redis);
      } catch {
        setDatabase("error");
        setRedis("error");
      }
    }

    void loadHealth();
  }, [api]);

  return (
    <main className="admin-shell">
      <header>
        <div>
          <span className="eyebrow">Tempest Light Admin</span>
          <h1>Painel operacional</h1>
        </div>
        <Shield size={28} />
      </header>

      <section className="metric-grid">
        <article>
          <Activity />
          <strong>Usuarios</strong>
          <span>Modulo reservado</span>
        </article>
        <article>
          <RadioTower />
          <strong>Chamadas ativas</strong>
          <span>Modulo reservado</span>
        </article>
        <article>
          <Database />
          <strong>PostgreSQL</strong>
          <span>{database}</span>
        </article>
        <article>
          <Database />
          <strong>Redis</strong>
          <span>{redis}</span>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<AdminApp />);
