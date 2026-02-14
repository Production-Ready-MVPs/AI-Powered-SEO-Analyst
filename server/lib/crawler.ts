import { chromium, type Browser, type BrowserContext } from "playwright-core";
import robotsParser from "robots-parser";
import { execSync } from "child_process";

const MAX_PAGES = 20;
const PAGE_TIMEOUT = 15000;
const NAV_TIMEOUT = 20000;
const MAX_RETRIES = 2;

function findChromiumPath(): string {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    const path = execSync("which chromium", { encoding: "utf-8" }).trim();
    if (path) return path;
  } catch {}
  try {
    const path = execSync("which chromium-browser", { encoding: "utf-8" }).trim();
    if (path) return path;
  } catch {}
  try {
    const path = execSync("find /nix -name 'chromium' -type f 2>/dev/null | head -1", { encoding: "utf-8" }).trim();
    if (path) return path;
  } catch {}
  return "chromium";
}

const CHROMIUM_PATH = findChromiumPath();

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
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname}${path}`;
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
    return function checkRobots(url: string) { return parser.isAllowed(url, "DevSEO-AI") ?? true; };
  } catch {
    return null;
  }
}

async function extractPageData(page: any, pageUrl: string, baseDomain: string): Promise<CrawledPage> {
  return page.evaluate(function(args: any) {
    var pUrl = args.pageUrl;
    var bDomain = args.baseDomain;

    var titleEl = document.querySelector("title");
    var title = titleEl ? (titleEl.textContent || "").trim() : "";
    var metaDescEl = document.querySelector('meta[name="description"]');
    var metaDescription = metaDescEl ? metaDescEl.getAttribute("content") || "" : "";

    var headingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"];
    var headings: Record<string, string[]> = {};
    for (var i = 0; i < headingLevels.length; i++) {
      var level = headingLevels[i];
      var els = Array.from(document.querySelectorAll(level));
      headings[level] = els.map(function(el) { return (el.textContent || "").trim(); });
    }

    var bodyText = document.body ? (document.body as any).innerText || "" : "";
    var words = bodyText.split(/\s+/).filter(function(w: string) { return w.length > 0; });
    var wordCount = words.length;

    var internalLinks = 0;
    var externalLinks = 0;
    var parsedBase: any;
    try { parsedBase = new URL(bDomain); } catch(e) { parsedBase = { hostname: "" }; }
    var anchors = Array.from(document.querySelectorAll("a[href]"));
    for (var j = 0; j < anchors.length; j++) {
      try {
        var href = (anchors[j] as HTMLAnchorElement).href;
        if (!href || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) continue;
        var u = new URL(href, pUrl);
        if (u.hostname === parsedBase.hostname) { internalLinks++; } else { externalLinks++; }
      } catch(e) {}
    }

    var imgEls = Array.from(document.querySelectorAll("img"));
    var images = imgEls.map(function(img) {
      return { src: (img as HTMLImageElement).src || "", alt: (img as HTMLImageElement).alt || "" };
    });

    var canonicalEl = document.querySelector('link[rel="canonical"]');
    var canonical = canonicalEl ? canonicalEl.getAttribute("href") : null;

    var schemaScripts: any[] = [];
    var scriptEls = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (var k = 0; k < scriptEls.length; k++) {
      try { schemaScripts.push(JSON.parse(scriptEls[k].textContent || "")); } catch(e) {}
    }

    var issues: Array<{ severity: string; title: string; description: string }> = [];
    if (!title) {
      issues.push({ severity: "critical", title: "Missing title tag", description: "Page has no <title> element." });
    } else if (title.length > 60) {
      issues.push({ severity: "warning", title: "Title too long", description: "Title is " + title.length + " chars (recommended: <60)." });
    }
    if (!metaDescription) {
      issues.push({ severity: "critical", title: "Missing meta description", description: "No meta description found." });
    } else if (metaDescription.length > 160) {
      issues.push({ severity: "warning", title: "Meta description too long", description: "Meta description is " + metaDescription.length + " chars (recommended: <160)." });
    }
    if (headings.h1.length === 0) {
      issues.push({ severity: "critical", title: "Missing H1", description: "Page has no H1 heading." });
    } else if (headings.h1.length > 1) {
      issues.push({ severity: "warning", title: "Multiple H1 tags", description: "Found " + headings.h1.length + " H1 tags (recommended: 1)." });
    }
    var imagesWithoutAlt = images.filter(function(img) { return !img.alt; });
    if (imagesWithoutAlt.length > 0) {
      issues.push({ severity: "warning", title: "Images missing alt text", description: imagesWithoutAlt.length + " of " + images.length + " images have no alt attribute." });
    }
    if (!canonical) {
      issues.push({ severity: "info", title: "No canonical URL", description: "Consider adding a canonical link element." });
    }
    if (wordCount < 300) {
      issues.push({ severity: "warning", title: "Thin content", description: "Page has only " + wordCount + " words (recommended: 300+)." });
    }

    return {
      url: pUrl,
      title: title,
      metaDescription: metaDescription,
      headings: headings,
      wordCount: wordCount,
      internalLinks: internalLinks,
      externalLinks: externalLinks,
      images: images,
      canonical: canonical,
      schemaScripts: schemaScripts,
      issues: issues
    };
  }, { pageUrl, baseDomain });
}

async function discoverLinks(page: any, baseDomain: string): Promise<string[]> {
  return page.evaluate(function(args: any) {
    var bDomain = args.baseDomain;
    var links: string[] = [];
    var base: any;
    try { base = new URL(bDomain); } catch(e) { return links; }
    var anchors = Array.from(document.querySelectorAll("a[href]"));
    var seen: Record<string, boolean> = {};
    for (var i = 0; i < anchors.length; i++) {
      try {
        var href = (anchors[i] as HTMLAnchorElement).href;
        if (!href || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) continue;
        var u = new URL(href);
        if (u.hostname === base.hostname) {
          u.hash = "";
          var normalized = u.href;
          if (!seen[normalized]) {
            seen[normalized] = true;
            links.push(normalized);
          }
        }
      } catch(e) {}
    }
    return links;
  }, { baseDomain });
}

async function crawlPageWithRetry(
  browser: Browser,
  url: string,
  baseDomain: string,
  retries: number = MAX_RETRIES
): Promise<{ data: CrawledPage | null; discoveredLinks: string[] }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let context: BrowserContext | null = null;
    try {
      context = await browser.newContext({
        userAgent: "DevSEO-AI/1.0 (SEO Crawler)",
        viewport: { width: 1280, height: 720 },
        javaScriptEnabled: true,
      });
      context.setDefaultTimeout(PAGE_TIMEOUT);
      const page = await context.newPage();

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      await page.waitForTimeout(1500);

      const data = await extractPageData(page, url, baseDomain);
      const discoveredLinks = await discoverLinks(page, baseDomain);

      await context.close();
      return { data, discoveredLinks };
    } catch (err: any) {
      if (context) {
        try { await context.close(); } catch {}
      }
      if (attempt < retries) {
        console.warn(`[Crawler] Retry ${attempt + 1}/${retries} for ${url}: ${err.message}`);
        await new Promise(function(r) { setTimeout(r, 1000 * (attempt + 1)); });
        continue;
      }
      console.error(`[Crawler] Failed after ${retries + 1} attempts for ${url}: ${err.message}`);
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
  const enqueued = new Set<string>();
  const queue: string[] = [];
  const pages: CrawledPage[] = [];

  const startNorm = normalizeUrl(startUrl, baseDomain);
  if (startNorm) {
    queue.push(startNorm);
    enqueued.add(startNorm);
  }

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
      if (visited.has(url)) continue;
      visited.add(url);

      try {
        const check = new URL(url);
        if (check.hostname !== parsedStart.hostname) continue;
      } catch {
        continue;
      }

      const pathEnd = url.split("?")[0].split("/").pop() ?? "";
      const ext = pathEnd.includes(".") ? pathEnd.split(".").pop()?.toLowerCase() : null;
      if (ext && ["pdf", "jpg", "jpeg", "png", "gif", "svg", "webp", "mp4", "mp3", "zip", "css", "js", "woff", "woff2", "ttf", "eot"].includes(ext)) {
        continue;
      }

      if (isAllowed && !isAllowed(url)) {
        errors.push(`Blocked by robots.txt: ${url}`);
        continue;
      }

      console.log(`[Crawler] Crawling (${pages.length + 1}/${MAX_PAGES}): ${url}`);

      const { data, discoveredLinks } = await crawlPageWithRetry(browser, url, baseDomain);

      if (data) {
        pages.push(data);
        for (const link of discoveredLinks) {
          const norm = normalizeUrl(link, baseDomain);
          if (norm && !visited.has(norm) && !enqueued.has(norm)) {
            enqueued.add(norm);
            queue.push(norm);
          }
        }
      } else {
        errors.push(`Failed to crawl: ${url}`);
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
