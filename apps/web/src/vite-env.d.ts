/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ANAM_WIDGET_AGENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
