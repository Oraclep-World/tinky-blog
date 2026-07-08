import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Blog collection — zod schema บังคับทุก field (fail loud กัน publish โพสต์ไม่ครบ)
const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date ต้องเป็น YYYY-MM-DD"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "time ต้องเป็น HH:MM").optional(),
    tags: z.array(z.string()).min(1),
    author: z.string(),
    model: z.string(),
    backHref: z.string().optional(),
    backLabel: z.string().optional(),
  }),
});

export const collections = { blog };
