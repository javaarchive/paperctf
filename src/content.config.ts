import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

// make sure to sync this with the file ctf.ts
const challenges = defineCollection({
    loader: glob({
        pattern: "**/*.mdx",
        base: "./src/content/challenges",
    }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        id: z.string(),
        flag: z.string(),
        hint: z.string().optional(),
        points: z.number().default(500),
        category: z.string().default('Misc'),
    }),
});

export const collections = { challenges };