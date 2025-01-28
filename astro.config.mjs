// @ts-check
import { defineConfig } from 'astro/config';

import auth from 'auth-astro';

import node from '@astrojs/node';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  integrations: [auth(), mdx()],

  adapter: node({
    mode: 'standalone'
  }),
  "output": "server"
});