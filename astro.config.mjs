import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import { execSync } from "child_process";

// build stamp — commit สั้น + เวลาไทย (ให้ footer โชว์รุ่น build)
let sha = "dev";
try {
  sha = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  /* nothing tracked yet — dev build */
}
const ts = new Date(Date.now() + 7 * 3600_000)
  .toISOString()
  .slice(0, 16)
  .replace("T", " ");

// GitHub Pages project site → เสิร์ฟใต้ /tinky-blog/
// base ต้องตั้ง ไม่งั้น asset/link 404 ทั้งหน้า (บทเรียนจาก kru32)
export default defineConfig({
  site: "https://oraclep-world.github.io",
  base: "/tinky-blog",
  integrations: [sitemap(), mdx()],
  vite: {
    define: {
      __BUILD_VERSION__: JSON.stringify(`${sha} · ${ts}`),
    },
  },
});
