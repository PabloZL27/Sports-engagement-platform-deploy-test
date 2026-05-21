/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ELEVENLABS_AGENT_ID: string;
  readonly VITE_DISABLE_SUPABASE: string;
  readonly VITE_SUPABASE_FEEDBACK_BUCKET: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface UnityConfig {
  arguments?: string[];
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl: string;
  companyName: string;
  productName: string;
  productVersion: string;
  showBanner?: (message: string, type?: "warning" | "error" | "log") => void;
}

interface UnityInstance {
  SendMessage(objectName: string, methodName: string, parameter?: string): void;
  Quit?: () => Promise<void>;
}

interface Window {
  createUnityInstance?: (
    canvas: HTMLCanvasElement,
    config: UnityConfig,
    onProgress?: (progress: number) => void,
  ) => Promise<UnityInstance>;
}
