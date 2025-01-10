// @ts-check
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(),
    starlight({
      title: "",
      description: "Create LLM workflows from components",
      social: {
        github: "https://github.com/cortexclick/gensx",
      },
      logo: {
        src: "./public/logo.svg",
      },
      components: {
        ThemeSelect: './src/components/ThemeSelect.astro',
        ThemeProvider: './src/components/ThemeProvider.astro'
      },
      expressiveCode: {
        themes: ["light-plus", "dark-plus"],
        useStarlightDarkModeSwitch: false,
      },
      // TODO: Enable the edit link when we have some content.
      //   editLink: {
      //     baseUrl: "https://github.com/cortexclick/gensx/edit/main/docs/",
      //   },
      customCss: ["./src/tailwind.css"],
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
  //   adapter: cloudflare({
  //     imageService: "compile",
  //   }),
  vite: {
    ssr: {
      external: ["node:buffer", "node:path", "node:url"],
    },
  },
});
