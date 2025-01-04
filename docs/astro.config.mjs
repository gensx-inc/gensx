// @ts-check
import cloudflare from "@astrojs/cloudflare";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [
    tailwind(),
    starlight({
      title: "",
      description: "Create LLM workflows from components",
      social: {
        github: "https://github.com/cortexclick/gensx",
      },
      logo: {
        src: "./public/logo.png",
      },
      // TODO: Enable the edit link when we have some content.
      //   editLink: {
      //     baseUrl: "https://github.com/cortexclick/gensx/edit/main/docs/",
      //   },
      // TODO: Enable the search bar when we have some content.
      pagefind: false,
      customCss: [
        "./src/tailwind.css",
        // TODO: Remove this once we want links and the search bar and stuff.
        "./src/styles/hideHeader.css",
      ],
      sidebar: [
        // Commented out for future use
        /*
        {
          label: "Guides",
          items: [
            { label: "Example Guide", slug: "guides/example" },
          ],
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        */
      ],
    }),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  adapter: cloudflare({
    imageService: "cloudflare",
  }),
  vite: {
    ssr: {
      external: ["node:buffer", "node:path", "node:url"],
    },
  },
});
