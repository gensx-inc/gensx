/// <reference types="astro/client" />

// This interface is used to augment the ImportMetaEnv type
interface ImportMetaEnv extends {} {
  // Add environment variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
