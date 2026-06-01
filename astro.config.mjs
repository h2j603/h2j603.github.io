// @ts-check
import { defineConfig } from 'astro/config';

// Static site generation. No runtime API calls — all data is baked in at build
// time by `scripts/build-data.ts`, which runs before `astro build`.
//
// Deploy target: GitHub Pages with the custom domain hyuk.xyz (see
// public/CNAME and .github/workflows/deploy.yml). Because it's a custom apex
// domain, no `base` path is needed.
export default defineConfig({
  site: 'https://hyuk.xyz',
  build: {
    // Keep asset output under /assets for predictable paths.
    assets: 'assets',
  },
});
