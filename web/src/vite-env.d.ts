/// <reference types="vite/client" />

// Without this declaration import.meta.env.VITE_API_URL is `any`, and a typo in
// the variable name would type-check perfectly.
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
