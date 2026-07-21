import { useEffect, useMemo, useRef, useState } from "react";

const WIDGET_SCRIPT_SRC = "https://unpkg.com/@anam-ai/agent-widget";
const DEFAULT_WIDGET_AGENT_ID = "cf5e0976-4fb8-494f-a60b-17afe764b2d9";

type AnamMessageEvent = CustomEvent<{
  role?: string;
  content?: string;
}>;

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
  const widgetRef = useRef<HTMLElement | null>(null);
  const [caption, setCaption] = useState("");

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
    let widget: HTMLElement | null = null;
    let cancelled = false;

    const handleMessage = (event: Event) => {
      const { role, content } = (event as AnamMessageEvent).detail ?? {};
      if (role === "agent" && content?.trim()) {
        setCaption(content.trim());
      }
    };

    void loadWidgetScript()
      .then(() => customElements.whenDefined("anam-agent"))
      .then(() => {
        if (cancelled) return;
        widget = widgetRef.current;
        widget?.addEventListener("anam-agent:message-received", handleMessage);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      widget?.removeEventListener("anam-agent:message-received", handleMessage);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fs") === "1") {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  return (
    <div className="relative min-h-screen w-screen bg-[#08101b]">
      {/* @ts-expect-error Web component del proveedor de avatar */}
      <anam-agent ref={widgetRef} agent-id={agentId} />
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
        <div
          id="avatar-captions"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`max-w-3xl rounded-xl bg-black/75 px-5 py-3 text-center text-lg leading-relaxed text-white shadow-lg backdrop-blur-sm transition-opacity ${
            caption ? "opacity-100" : "opacity-0"
          }`}
        >
          {caption}
        </div>
      </div>
    </div>
  );
}
