type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Locals extends Runtime {}
}
