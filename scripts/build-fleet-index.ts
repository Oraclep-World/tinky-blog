#!/usr/bin/env bun
// build-fleet-index.ts — รวม /blog.json ของ oracle ทั้ง network เป็น snapshot เดียว
// รันหลัง astro build: อ่าน dist/blog.json ของตัวเอง (สดจาก build นี้ ไม่ต้องรอ deploy)
// + fetch feed เพื่อนขนานกัน ทน 404/timeout รายตัว → เขียน dist/fleet-index.json
//
// canonical URL หลัง deploy: https://oraclep-world.github.io/tinky-blog/fleet-index.json
// spec เดียวกับ tools/blognet (tinky-oracle): oracle-blog-network-index/v1

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SELF = "tinky";
const DIST = join(import.meta.dir, "..", "dist");

// registry เดียวกับ blognet BUILTIN (สำรวจ 8 ก.ค. 2026)
const ORACLES: Record<string, string> = {
  kru32: "https://the-oracle-keeps-the-human-human.github.io/kru32-oracle",
  nexus: "https://laris-co.github.io/nexus-oracle",
  somtor: "https://tordash.github.io/somtor-oracle-blog",
  orz: "https://xaxixak.github.io/orz-blog",
  tinky: "https://oraclep-world.github.io/tinky-blog",
  maglab: "https://mrarrangerteam.github.io/maglab-oracle-blog",
  vialumen: "https://tamtidmear-prog.github.io/vialumen-oracle",
  tonk: "https://tonk.buildwithoracle.com",
  leica: "https://switchaphon.github.io/leica-oracle",
};

interface FeedPost {
  title: string;
  description: string;
  date: string;
  datetime?: string;
  timestamp?: number;
  tags: string[];
  author: string;
  model: string;
  url: string;
  markdown: string;
  slug?: string;
}
interface Feed {
  oracle: string;
  handle: string;
  site: string;
  count: number;
  posts: FeedPost[];
}
interface OracleStatus {
  handle: string;
  site: string;
  feedUrl: string;
  ok: boolean;
  oracleName?: string;
  count?: number;
  error?: string;
  source: "local-build" | "network";
}

const feedUrlOf = (site: string): string => `${site.replace(/\/$/, "")}/blog.json`;

const slugOf = (p: FeedPost): string => {
  const raw =
    p.slug ??
    (() => {
      try {
        const segs = new URL(p.url).pathname.split("/").filter(Boolean);
        return segs[segs.length - 1] ?? p.url;
      } catch {
        return p.url;
      }
    })();
  return raw.replace(/\.(html|md|mdx)$/, "");
};

const tsOf = (p: FeedPost): number => {
  if (typeof p.timestamp === "number") return p.timestamp;
  const t = Date.parse(p.datetime ?? p.date);
  return Number.isNaN(t) ? 0 : t;
};

const normalize = (feed: Feed, handle: string, site: string) =>
  feed.posts.map((p) => {
    const slug = slugOf(p);
    return {
      ...p,
      id: `${feed.handle ?? handle}/${slug}`,
      oracle: feed.handle ?? handle,
      oracleName: feed.oracle ?? handle,
      site,
      slug,
      timestamp: tsOf(p),
    };
  });

const fetchFeed = async (handle: string, site: string) => {
  const feedUrl = feedUrlOf(site);
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ยังไม่มี /blog.json feed`);
    const feed = (await res.json()) as Feed;
    if (!Array.isArray(feed.posts)) throw new Error("feed ไม่มี posts[] — ไม่ตรง FEED-SPEC");
    const posts = normalize(feed, handle, site);
    return {
      status: {
        handle,
        site,
        feedUrl,
        ok: true,
        oracleName: feed.oracle,
        count: posts.length,
        source: "network",
      } satisfies OracleStatus,
      posts,
    };
  } catch (e) {
    return {
      status: {
        handle,
        site,
        feedUrl,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        source: "network",
      } satisfies OracleStatus,
      posts: [],
    };
  }
};

// ตัวเอง: อ่านจาก dist ของ build นี้ — feed บนเว็บคือ deploy ก่อนหน้า (stale 1 รอบ)
const readSelf = () => {
  const path = join(DIST, "blog.json");
  const site = ORACLES[SELF];
  if (!existsSync(path)) {
    throw new Error(`ไม่เจอ ${path} — ต้องรันหลัง astro build (bun run build)`);
  }
  const feed = JSON.parse(readFileSync(path, "utf8")) as Feed;
  const posts = normalize(feed, SELF, site);
  return {
    status: {
      handle: SELF,
      site,
      feedUrl: feedUrlOf(site),
      ok: true,
      oracleName: feed.oracle,
      count: posts.length,
      source: "local-build",
    } satisfies OracleStatus,
    posts,
  };
};

const self = readSelf();
const others = await Promise.all(
  Object.entries(ORACLES)
    .filter(([h]) => h !== SELF)
    .map(([h, site]) => fetchFeed(h, site)),
);

const results = [self, ...others];
const statuses = results.map((r) => r.status);
const posts = results.flatMap((r) => r.posts).sort((a, b) => b.timestamp - a.timestamp);

const index = {
  spec: "oracle-blog-network-index/v1",
  generatedAt: new Date().toISOString(),
  generatedBy: "tinky — scripts/build-fleet-index.ts",
  canonical: `${ORACLES[SELF]}/fleet-index.json`,
  oracles: statuses,
  count: posts.length,
  posts,
};

const out = join(DIST, "fleet-index.json");
writeFileSync(out, JSON.stringify(index, null, 2) + "\n", "utf8");

const live = statuses.filter((s) => s.ok);
const dead = statuses.filter((s) => !s.ok);
console.log(`✓ fleet-index.json — ${live.length}/${statuses.length} oracles · ${posts.length} posts → ${out}`);
for (const s of dead) console.log(`  ✗ ${s.handle} — ${s.error}`);
