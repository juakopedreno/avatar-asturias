import { useEffect, useMemo } from "react";

const WIDGET_SCRIPT_SRC = "https://unpkg.com/@anam-ai/agent-widget";
const DEFAULT_WIDGET_AGENT_ID = "cf5e0976-4fb8-494f-a60b-17afe764b2d9";

function loadWidgetScript(): Promise<void> {
  if (customElements.get("anam-agent")) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SCRIPT_SRC}"]`);
  if (existing?.dataset.loaded === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    script.src = WIDGET_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("No se pudo cargar el widget"));
    if (!existing) {
      document.body.appendChild(script);
    }
  });
}

export default function FeriaEmbed() {
  const agentId = useMemo(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("agent")?.trim();
    const fromEnv =
      import.meta.env.VITE_FERIA_WIDGET_AGENT_ID?.trim() ||
      import.meta.env.VITE_ANAM_WIDGET_AGENT_ID?.trim();
    return fromQuery || fromEnv || DEFAULT_WIDGET_AGENT_ID;
  }, []);

  useEffect(() => {
    document.documentElement.style.backgroundColor = "#08101b";
    document.body.style.backgroundColor = "#08101b";
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    void loadWidgetScript().catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fs") === "1") {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  return (
    <div className="min-h-screen w-screen bg-[#08101b]">
      {/* @ts-expect-error Web component del proveedor de avatar */}
      <anam-agent agent-id={agentId} />
    </div>
  );
}
