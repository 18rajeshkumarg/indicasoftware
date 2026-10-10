import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    react(),
    // Ship an ES5 + polyfilled bundle alongside the modern ES module build.
    // The modern bundle uses optional chaining / nullish coalescing and newer
    // built-ins, which older Smart TV browsers, feature-phone browsers and
    // un-updated desktops reject with a SyntaxError (blank page). Modern
    // browsers keep loading the small module bundle and never download this.
    legacy({
      targets: [
        "defaults",
        "chrome >= 49",
        "safari >= 11",
        "firefox >= 52",
        "edge >= 18",
        "ios_saf >= 11",
        "android >= 5",
        "samsung >= 5",
      ],
      modernPolyfills: true,
    }),
  ],
  base: "./",
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8081",
        rewrite: (path) => `/backend${path}`,
      },
      "/admin": {
        target: "http://127.0.0.1:8081",
        rewrite: (path) => `/backend${path}`,
      },
    },
  },
});
