import OpenAI from "openai";
import { crawlDomain, type CrawlResult, type CrawledPage } from "./lib/crawler";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface SeoAnalysisResult {
  overallScore: number;
  metaScore: number;
  contentScore: number;
  performanceScore: number;
  technicalScore: number;
  summary: string;
  issuesFound: number;
  fixesGenerated: number;
  crawlData: CrawlResult;
  pages: Array<{
    url: string;
    title: string;
    metaDescription: string;
    headings: { h1: string[]; h2: string[]; h3: string[]; h4: string[]; h5: string[]; h6: string[] };
    wordCount: number;
    internalLinks: number;
    externalLinks: number;
    images: number;
    schemaDetected: string[];
    issues: Array<{ severity: string; title: string; description: string }>;
  }>;
  results: {
    issues: Array<{
      severity: "critical" | "warning" | "info";
      title: string;
      description: string;
    }>;
    recommendations: string[];
    details: {
      meta: Record<string, any>;
      content: Record<string, any>;
      performance: Record<string, any>;
      technical: Record<string, any>;
    };
  };
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

function summarizeCrawlForPrompt(crawlData: CrawlResult): string {
  const lines: string[] = [];
  lines.push(`Domain: ${crawlData.domain}`);
  lines.push(`Pages crawled: ${crawlData.pagesCrawled}`);
  if (crawlData.errors.length > 0) {
    lines.push(`Crawl errors: ${crawlData.errors.slice(0, 5).join("; ")}`);
  }
  lines.push("");

  for (const page of crawlData.pages.slice(0, 10)) {
    lines.push(`--- Page: ${page.url} ---`);
    lines.push(`Title: ${page.title || "(missing)"}`);
    lines.push(`Meta Description: ${page.metaDescription || "(missing)"}`);
    lines.push(`H1: ${page.headings.h1.join(", ") || "(none)"}`);
    lines.push(`H2 count: ${page.headings.h2.length}, H3 count: ${page.headings.h3.length}`);
    lines.push(`Word count: ${page.wordCount}`);
    lines.push(`Internal links: ${page.internalLinks}, External links: ${page.externalLinks}`);
    lines.push(`Images: ${page.images.length}, Without alt: ${page.images.filter((i) => !i.alt).length}`);
    lines.push(`Canonical: ${page.canonical || "(not set)"}`);
    lines.push(`Schema markup: ${page.schemaScripts.length > 0 ? JSON.stringify(page.schemaScripts.map((s) => s["@type"] || "unknown")) : "(none)"}`);
    if (page.issues.length > 0) {
      lines.push(`On-page issues: ${page.issues.map((i) => `[${i.severity}] ${i.title}`).join("; ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function analyzeSeo(url: string): Promise<SeoAnalysisResult> {
  console.log(`[SEO Analyzer] Starting crawl for ${url}`);
  const crawlData = await crawlDomain(url);
  console.log(`[SEO Analyzer] Crawl complete: ${crawlData.pagesCrawled} pages`);

  const crawlSummary = summarizeCrawlForPrompt(crawlData);

  const prompt = `You are an expert SEO analyst. I have crawled a website and extracted the following data. Analyze it and provide a comprehensive SEO audit.

CRAWL DATA:
${crawlSummary}

Based on this real crawl data, provide a detailed SEO analysis. Score each category from 0-100:

1. **Meta Tags**: Title optimization, meta descriptions, open graph tags, canonical URLs
2. **Content Quality**: Header structure (H1-H6), keyword usage, content length, readability
3. **Performance**: Image optimization (alt text, count), link structure, page weight indicators
4. **Technical SEO**: URL structure, schema markup, canonical tags, HTTPS, crawlability

Return a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "metaScore": <number 0-100>,
  "contentScore": <number 0-100>,
  "performanceScore": <number 0-100>,
  "technicalScore": <number 0-100>,
  "summary": "<2-3 sentence summary based on the crawl data>",
  "results": {
    "issues": [
      {
        "severity": "critical" | "warning" | "info",
        "title": "<issue title>",
        "description": "<specific description referencing the crawl data>"
      }
    ],
    "recommendations": [
      "<actionable recommendation>"
    ],
    "details": {
      "meta": { "title": "<analysis>", "description": "<analysis>", "openGraph": "<analysis>" },
      "content": { "headings": "<analysis>", "keywords": "<analysis>", "readability": "<analysis>" },
      "performance": { "loadTime": "<analysis>", "mobile": "<analysis>", "images": "<analysis>" },
      "technical": { "https": "<analysis>", "urlStructure": "<analysis>", "schema": "<analysis>" }
    }
  }
}

Base your scores and issues on the actual crawl data above. Be specific. Return ONLY valid JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v ?? 50)));
  parsed.overallScore = clamp(parsed.overallScore);
  parsed.metaScore = clamp(parsed.metaScore);
  parsed.contentScore = clamp(parsed.contentScore);
  parsed.performanceScore = clamp(parsed.performanceScore);
  parsed.technicalScore = clamp(parsed.technicalScore);

  const allIssues = crawlData.pages.flatMap((p) => p.issues);
  parsed.issuesFound = (parsed.results?.issues?.length ?? 0) + allIssues.length;
  parsed.fixesGenerated = parsed.results?.recommendations?.length ?? 0;

  parsed.crawlData = crawlData;
  parsed.pages = crawlData.pages.map((p: CrawledPage) => ({
    url: p.url,
    title: p.title,
    metaDescription: p.metaDescription,
    headings: p.headings,
    wordCount: p.wordCount,
    internalLinks: p.internalLinks,
    externalLinks: p.externalLinks,
    images: p.images.length,
    schemaDetected: p.schemaScripts.map((s: any) => s["@type"] || "unknown"),
    issues: p.issues,
  }));

  return parsed as SeoAnalysisResult;
}
