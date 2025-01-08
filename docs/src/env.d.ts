/// <reference types="astro/client" />

// This interface is used to augment the ImportMetaEnv type
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ImportMetaEnv extends Record<string, unknown> {
  // Add environment variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
