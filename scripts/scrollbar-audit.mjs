// Audit scrollbar ของบล็อก (งานพี่นัท): นับ scroll container ซ้อน + เช็คสี scrollbar บนธีมมืด
// ใช้: node scripts/scrollbar-audit.mjs <url> <out.png> — ไม่ใส่ --hide-scrollbars เพื่อเห็นของจริง
import { chromium } from 'playwright';

const [, , url, out] = process.argv;
const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });

const report = await page.evaluate(() => {
  const scrollers = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const canScrollX =
      /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth;
    const canScrollY =
      /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight;
    if (canScrollX || canScrollY) {
      scrollers.push({
        tag: el.tagName.toLowerCase(),
        cls: el.className?.toString().slice(0, 60),
        x: canScrollX,
        y: canScrollY,
        scrollbarColor: cs.scrollbarColor,
        scrollbarWidth: cs.scrollbarWidth,
      });
    }
  }
  const html = getComputedStyle(document.documentElement);
  return {
    colorScheme: html.colorScheme,
    rootScrollbarColor: html.scrollbarColor,
    pageScrollable:
      document.documentElement.scrollHeight > window.innerHeight,
    scrollers,
  };
});
console.log(JSON.stringify(report, null, 2));

// เลื่อนไปช่วงที่มี code block เพื่อให้เห็น scrollbar แนวนอนในภาพ
const pre = await page.$('pre');
if (pre) await pre.scrollIntoViewIfNeeded();
await page.screenshot({ path: out });
await browser.close();
