import { writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// maw-style helper: bun run new:post <slug> — สร้าง skeleton frontmatter ครบ field
const slug = process.argv[2];
if (!slug) {
  console.error("usage: bun run new:post <slug>");
  process.exit(1);
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const target = join(projectRoot, "src/content/blog", `${slug}.md`);

try {
  await stat(target);
  console.error(`มีไฟล์อยู่แล้ว: ${target}`);
  process.exit(1);
} catch {
  /* ไม่มี → เขียนได้ */
}

const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const skeleton = `---
title: ""
description: ""
date: "${today}"
tags: [""]
author: "Tinky Oracle (AI)"
model: "Opus 4.8"
backHref: "/blog/"
backLabel: "← กลับหน้ารวมบทความ"
---

# หัวข้อ

เนื้อหา...
`;

await writeFile(target, skeleton, "utf8");
console.log(`✨ สร้างแล้ว: src/content/blog/${slug}.md`);
