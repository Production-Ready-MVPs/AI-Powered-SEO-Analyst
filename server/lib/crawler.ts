import { chromium, type Browser, type Page } from "playwright-core";
import robotsParser from "robots-parser";

const MAX_PAGES = 20;
const PAGE_TIMEOUT = 15000;
const NAV_TIMEOUT = 20000;
const MAX_RETRIES = 2;
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

export interface CrawledPage {
  url: string;
  title: string;
  metaDescription: string;
  headings: { h1: string[]; h2: string[]; h3: string[]; h4: string[]; h5: string[]; h6: string[] };
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: Array<{ src: string; alt: string }>;
  canonical: string | null;
  schemaScripts: any[];
  issues: Array<{ severity: "critical" | "warning" | "info"; title: string; description: string }>;
}

export interface CrawlResult {
  domain: string;
  pagesCrawled: number;
  pages: CrawledPage[];
  errors: string[];
}

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    u.hash = "";
    u.search = "";
    return u.href;
  } catch {
    return null;
  }
}

async function fetchRobotsTxt(domain: string): Promise<((url: string) => boolean) | null> {
  const robotsUrl = `${domain}/robots.txt`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(robotsUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    const parser = robotsParser(robotsUrl, text);
    return (url: string) => parser.isAllowed(url, "DevSEO-AI") ?? true;
  } catch {
    return null;
  }
}

async function extractPageData(page: Page, pageUrl: string, baseDomain: string): Promise<CrawledPage> {
  return page.evaluate(({ pageUrl, baseDomain }) => {
    const getText = (el: Element | null): string => el?.textContent?.trim() ?? "";
    const getAttr = (sel: string, attr: string): string | null =>
      document.querySelector(sel)?.getAttribute(attr) ?? null;

    const title = getText(document.querySelector("title"));
    const metaDescription = getAttr('meta[name="description"]', "content") ?? "";

    const headingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
    const headings: Record<string, string[]> = {};
    for (const level of headingLevels) {
      headings[level] = Array.from(document.querySelectorAll(level)).map((el) => el.textContent?.trim() ?? "");
    }

    const bodyText = document.body?.innerText ?? "";
    const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

    let internalLinks = 0;
    let externalLinks = 0;
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    const parsedBase = new URL(baseDomain);
    for (const a of anchors) {
      try {
        const href = (a as HTMLAnchorElement).href;
        if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
        const u = new URL(href, pageUrl);
        if (u.hostname === parsedBase.hostname) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch {}
    }

    const images = Array.from(document.querySelectorAll("img")).map((img) => ({
      src: img.src ?? "",
      alt: img.alt ?? "",
    }));

    const canonical = getAttr('link[rel="canonical"]', "href");

    const schemaScripts: any[] = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        schemaScripts.push(JSON.parse(script.textContent ?? ""));
      } catch {}
    });

    const issues: Array<{ severity: "critical" | "warning" | "info"; title: string; description: string }> = [];

    if (!title) {
      issues.push({ severity: "critical", title: "Missing title tag", description: "Page has no <title> element." });
    } else if (title.length > 60) {
      issues.push({ severity: "warning", title: "Title too long", description: `Title is ${title.length} chars (recommended: <60).` });
    }

    if (!metaDescription) {
      issues.push({ severity: "critical", title: "Missing meta description", description: "No meta description found." });
    } else if (metaDescription.length > 160) {
      issues.push({ severity: "warning", title: "Meta description too long", description: `Meta description is ${metaDescription.length} chars (recommended: <160).` });
    }

    if (headings.h1.length === 0) {
      issues.push({ severity: "critical", title: "Missing H1", description: "Page has no H1 heading." });
    } else if (headings.h1.length > 1) {
      issues.push({ severity: "warning", title: "Multiple H1 tags", description: `Found ${headings.h1.length} H1 tags (recommended: 1).` });
    }

    const imagesWithoutAlt = images.filter((i) => !i.alt);
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        severity: "warning",
        title: "Images missing alt text",
        description: `${imagesWithoutAlt.length} of ${images.length} images have no alt attribute.`,
      });
    }

    if (!canonical) {
      issues.push({ severity: "info", title: "No canonical URL", description: "Consider adding a canonical link element." });
    }

    if (wordCount < 300) {
      issues.push({ severity: "warning", title: "Thin content", description: `Page has only ${wordCount} words (recommended: 300+).` });
    }

    return {
      url: pageUrl,
      title,
      metaDescription,
      headings: headings as any,
      wordCount,
      internalLinks,
      externalLinks,
      images,
      canonical,
      schemaScripts,
      issues,
    };
  }, { pageUrl, baseDomain });
}

function discoverLinks(pageData: CrawledPage, currentUrl: string, baseDomain: string): string[] {
  const links: string[] = [];
  try {
    const base = new URL(baseDomain);
    const doc = new URL(currentUrl);
    const anchors: string[] = [];

    const page = new URL(currentUrl);
    if (page.hostname === base.hostname) {
      anchors.push(currentUrl);
    }
  } catch {}
  return links;
}

async function crawlPageWithRetry(
  browser: Browser,
  url: string,
  baseDomain: string,
  retries: number = MAX_RETRIES
): Promise<{ data: CrawledPage | null; discoveredLinks: string[] }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let page: Page | null = null;
    try {
      const context = await browser.newContext({
        userAgent: "DevSEO-AI/1.0 (SEO Crawler)",
        viewport: { width: 1280, height: 720 },
        javaScriptEnabled: true,
      });
      context.setDefaultTimeout(PAGE_TIMEOUT);
      page = await context.newPage();

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      await page.waitForTimeout(1500);

      const data = await extractPageData(page, url, baseDomain);

      const discoveredLinks = await page.evaluate(({ baseDomain }) => {
        const links: string[] = [];
        const base = new URL(baseDomain);
        Array.from(document.querySelectorAll("a[href]")).forEach((a) => {
          try {
            const href = (a as HTMLAnchorElement).href;
            if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
            const u = new URL(href);
            if (u.hostname === base.hostname) {
              u.hash = "";
              links.push(u.href);
            }
          } catch {}
        });
        return Array.from(new Set(links));
      }, { baseDomain });

      await context.close();
      return { data, discoveredLinks };
    } catch (err: any) {
      if (page) {
        try { await page.context().close(); } catch {}
      }
      if (attempt < retries) {
        console.warn(`Crawler retry ${attempt + 1}/${retries} for ${url}: ${err.message}`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error(`Crawler failed after ${retries + 1} attempts for ${url}: ${err.message}`);
      return { data: null, discoveredLinks: [] };
    }
  }
  return { data: null, discoveredLinks: [] };
}

export async function crawlDomain(startUrl: string): Promise<CrawlResult> {
  let parsedStart: URL;
  try {
    parsedStart = new URL(startUrl);
  } catch {
    return { domain: startUrl, pagesCrawled: 0, pages: [], errors: [`Invalid URL: ${startUrl}`] };
  }

  const baseDomain = `${parsedStart.protocol}//${parsedStart.hostname}`;
  const domain = parsedStart.hostname;
  const errors: string[] = [];

  const isAllowed = await fetchRobotsTxt(baseDomain);

  const visited = new Set<string>();
  const queue: string[] = [startUrl];
  const pages: CrawledPage[] = [];

  let browser: Browser;
  try {
    browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--single-process",
      ],
    });
  } catch (err: any) {
    return { domain, pagesCrawled: 0, pages: [], errors: [`Browser launch failed: ${err.message}`] };
  }

  try {
    while (queue.length > 0 && pages.length < MAX_PAGES) {
      const url = queue.shift()!;
      const normalized = normalizeUrl(url, baseDomain);
      if (!normalized) continue;
      if (visited.has(normalized)) continue;
      visited.add(normalized);

      try {
        const check = new URL(normalized);
        if (check.hostname !== parsedStart.hostname) continue;
      } catch {
        continue;
      }

      const ext = normalized.split("?")[0].split(".").pop()?.toLowerCase();
      if (ext && ["pdf", "jpg", "jpeg", "png", "gif", "svg", "webp", "mp4", "mp3", "zip", "css", "js"].includes(ext)) {
        continue;
      }

      if (isAllowed && !isAllowed(normalized)) {
        errors.push(`Blocked by robots.txt: ${normalized}`);
        continue;
      }

      console.log(`[Crawler] Crawling (${pages.length + 1}/${MAX_PAGES}): ${normalized}`);

      const { data, discoveredLinks } = await crawlPageWithRetry(browser, normalized, baseDomain);

      if (data) {
        pages.push(data);
        for (const link of discoveredLinks) {
          const norm = normalizeUrl(link, baseDomain);
          if (norm && !visited.has(norm) && queue.length + pages.length < MAX_PAGES * 3) {
            queue.push(norm);
          }
        }
      } else {
        errors.push(`Failed to crawl: ${normalized}`);
      }
    }
  } finally {
    try {
      await browser.close();
    } catch {}
  }

  console.log(`[Crawler] Finished: ${pages.length} pages crawled for ${domain}`);

  return {
    domain,
    pagesCrawled: pages.length,
    pages,
    errors,
  };
}
