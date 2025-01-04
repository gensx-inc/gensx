// @ts-check
import cloudflare from "@astrojs/cloudflare";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  integrations: [
    tailwind(),
    starlight({
      title: "GenSX",
      social: {
        github: "https://github.com/cortexclick/gensx",
      },
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
  ],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
