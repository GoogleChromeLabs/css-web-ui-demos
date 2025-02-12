import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap()],
  devToolbar: {
    enabled: false,
  },
  site: "https://chrome.dev",
  base: "/carousel/",
  trailingSlash: "always",
  output: "static",
});
