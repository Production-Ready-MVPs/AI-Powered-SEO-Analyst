import type { CrawlResult, CrawledPage } from "./crawler";

export type IssueSeverity = "critical" | "warning" | "info";

export interface SeoIssue {
  issueType: string;
  severity: IssueSeverity;
  explanation: string;
  recommendedFix: string;
  pageUrl?: string;
}

export interface RuleAnalysisResult {
  issues: SeoIssue[];
  meta: { pagesAnalyzed: number; totalIssues: number; critical: number; warnings: number; info: number };
}

export function analyzeRules(crawl: CrawlResult): RuleAnalysisResult {
  const issues: SeoIssue[] = [];

  for (const page of crawl.pages) {
    checkMissingMetaDescription(page, issues);
    checkMissingH1(page, issues);
    checkMultipleH1(page, issues);
    checkThinContent(page, issues);
    checkMissingAltTags(page, issues);
    checkNoSchema(page, issues);
  }

  checkDuplicateTitles(crawl.pages, issues);
  checkOrphanPages(crawl.pages, issues);

  const critical = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;

  return {
    issues,
    meta: {
      pagesAnalyzed: crawl.pages.length,
      totalIssues: issues.length,
      critical,
      warnings,
      info,
    },
  };
}

function checkMissingMetaDescription(page: CrawledPage, issues: SeoIssue[]): void {
  if (!page.metaDescription || page.metaDescription.trim().length === 0) {
    issues.push({
      issueType: "missing_meta_description",
      severity: "critical",
      explanation: `The page "${page.url}" has no meta description. Search engines display the meta description in search results, and its absence reduces click-through rates.`,
      recommendedFix: `Add a <meta name="description" content="..."> tag with a concise summary (120-160 characters) of the page content.`,
      pageUrl: page.url,
    });
  }
}

function checkMissingH1(page: CrawledPage, issues: SeoIssue[]): void {
  if (page.headings.h1.length === 0) {
    issues.push({
      issueType: "missing_h1",
      severity: "critical",
      explanation: `The page "${page.url}" has no H1 heading. The H1 tag is a strong ranking signal that tells search engines the primary topic of the page.`,
      recommendedFix: `Add a single, descriptive <h1> tag that clearly communicates the main topic of the page. Place it near the top of the visible content.`,
      pageUrl: page.url,
    });
  }
}

function checkMultipleH1(page: CrawledPage, issues: SeoIssue[]): void {
  if (page.headings.h1.length > 1) {
    issues.push({
      issueType: "multiple_h1",
      severity: "warning",
      explanation: `The page "${page.url}" has ${page.headings.h1.length} H1 tags (${page.headings.h1.map((h) => `"${h}"`).join(", ")}). Multiple H1 tags dilute the primary topic signal for search engines.`,
      recommendedFix: `Keep only one H1 per page. Convert the extra H1 tags to H2 or lower-level headings that support the main topic.`,
      pageUrl: page.url,
    });
  }
}

function checkThinContent(page: CrawledPage, issues: SeoIssue[]): void {
  if (page.wordCount < 300) {
    issues.push({
      issueType: "thin_content",
      severity: "warning",
      explanation: `The page "${page.url}" has only ${page.wordCount} words. Pages with fewer than 300 words are considered thin content by search engines and are less likely to rank.`,
      recommendedFix: `Expand the page content to at least 300 words with relevant, high-quality information. If the page serves a utility purpose (e.g., contact form), consider adding supporting text or FAQ sections.`,
      pageUrl: page.url,
    });
  }
}

function checkMissingAltTags(page: CrawledPage, issues: SeoIssue[]): void {
  const missing = page.images.filter((img) => !img.alt || img.alt.trim().length === 0);
  if (missing.length > 0) {
    issues.push({
      issueType: "missing_alt_tags",
      severity: "warning",
      explanation: `The page "${page.url}" has ${missing.length} image(s) without alt text out of ${page.images.length} total. Missing alt text hurts accessibility and prevents search engines from understanding image content.`,
      recommendedFix: `Add descriptive alt attributes to every <img> tag. Each alt text should concisely describe the image content (e.g., alt="Team meeting in conference room").`,
      pageUrl: page.url,
    });
  }
}

function checkNoSchema(page: CrawledPage, issues: SeoIssue[]): void {
  if (page.schemaScripts.length === 0) {
    issues.push({
      issueType: "no_schema",
      severity: "info",
      explanation: `The page "${page.url}" has no structured data (JSON-LD schema markup). Schema markup helps search engines understand page content and can enable rich snippets in search results.`,
      recommendedFix: `Add JSON-LD structured data relevant to the page type. Common schemas include Organization, WebPage, Article, Product, FAQ, and BreadcrumbList. Use Google's Structured Data Testing Tool to validate.`,
      pageUrl: page.url,
    });
  }
}

function checkDuplicateTitles(pages: CrawledPage[], issues: SeoIssue[]): void {
  const titleMap = new Map<string, string[]>();
  for (const page of pages) {
    const title = page.title.trim().toLowerCase();
    if (!title) continue;
    const urls = titleMap.get(title) || [];
    urls.push(page.url);
    titleMap.set(title, urls);
  }

  for (const [title, urls] of Array.from(titleMap.entries())) {
    if (urls.length > 1) {
      issues.push({
        issueType: "duplicate_titles",
        severity: "warning",
        explanation: `${urls.length} pages share the identical title "${title}": ${urls.join(", ")}. Duplicate titles confuse search engines about which page to rank and reduce the unique signal of each page.`,
        recommendedFix: `Give each page a unique, descriptive title that accurately reflects its specific content. Include primary keywords and differentiate by topic or intent.`,
      });
    }
  }
}

function checkOrphanPages(pages: CrawledPage[], issues: SeoIssue[]): void {
  if (pages.length < 2) return;

  const crawledUrls = new Set(pages.map((p) => normalizeForComparison(p.url)));

  for (const page of pages) {
    if (page.internalLinks === 0 && page.url !== pages[0]?.url) {
      issues.push({
        issueType: "orphan_page",
        severity: "warning",
        explanation: `The page "${page.url}" has zero internal links pointing outward and may also lack inbound links from other crawled pages. Orphan pages are difficult for search engines to discover and rank.`,
        recommendedFix: `Add internal links from relevant pages to this page and from this page to other related content. Ensure the page is reachable from the site's main navigation or sitemap.`,
        pageUrl: page.url,
      });
    }
  }

  const linkedToUrls = new Set<string>();
  for (const page of pages) {
    const doc = page as any;
    if (doc._discoveredInternalUrls) {
      for (const u of doc._discoveredInternalUrls) {
        linkedToUrls.add(normalizeForComparison(u));
      }
    }
  }

  if (linkedToUrls.size > 0) {
    for (const page of pages.slice(1)) {
      const norm = normalizeForComparison(page.url);
      if (!linkedToUrls.has(norm)) {
        const alreadyReported = issues.some(
          (i) => i.issueType === "orphan_page" && i.pageUrl === page.url
        );
        if (!alreadyReported) {
          issues.push({
            issueType: "orphan_page",
            severity: "warning",
            explanation: `The page "${page.url}" was not linked to by any other crawled page. It may be an orphan page that search engines struggle to find.`,
            recommendedFix: `Add internal links from your key pages to this page. Include it in navigation menus, sitemaps, or contextual link sections.`,
            pageUrl: page.url,
          });
        }
      }
    }
  }
}

function normalizeForComparison(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${(u.pathname.replace(/\/+$/, "") || "/")}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
