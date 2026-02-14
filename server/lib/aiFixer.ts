import OpenAI from "openai";
import type { CrawledPage } from "./crawler";
import type { SeoIssue } from "./analyzer";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_TOKENS = 4096;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

export interface AiFix {
  pageUrl: string;
  optimizedTitle: string;
  optimizedMetaDescription: string;
  improvedH1: string;
  jsonLdSchema: Record<string, any>;
  suggestedInternalLinkingText: string;
}

export interface AiFixerResult {
  fixes: AiFix[];
  totalFixesGenerated: number;
}

function buildPrompt(page: CrawledPage, issues: SeoIssue[]): string {
  const pageIssues = issues
    .filter((i) => !i.pageUrl || i.pageUrl === page.url)
    .map((i) => `- [${i.severity}] ${i.issueType}: ${i.explanation}`)
    .join("\n");

  return `You are an expert SEO consultant. Analyze this page and generate optimized SEO fixes.

PAGE DATA:
- URL: ${page.url}
- Current Title: ${page.title || "(missing)"}
- Current Meta Description: ${page.metaDescription || "(missing)"}
- Current H1: ${page.headings.h1.join(", ") || "(missing)"}
- Word Count: ${page.wordCount}
- Internal Links: ${page.internalLinks}
- External Links: ${page.externalLinks}
- Images: ${page.images.length} (${page.images.filter((i) => !i.alt).length} missing alt)
- Schema Markup: ${page.schemaScripts.length > 0 ? "present" : "none"}
- Canonical: ${page.canonical || "(not set)"}
- H2 Tags: ${page.headings.h2.slice(0, 5).join(", ") || "(none)"}

DETECTED ISSUES:
${pageIssues || "No specific issues detected."}

Generate fixes as a JSON object with this exact structure:
{
  "optimizedTitle": "<SEO-optimized title, 50-60 chars, include primary keyword>",
  "optimizedMetaDescription": "<compelling meta description, 120-160 chars, include call to action>",
  "improvedH1": "<clear, keyword-rich H1 heading>",
  "jsonLdSchema": { <valid JSON-LD WebPage schema object with @context, @type, name, description, url> },
  "suggestedInternalLinkingText": "<2-3 sentences of anchor text suggestions for linking to/from this page>"
}

Return ONLY valid JSON. Base suggestions on the actual page data above.`;
}

function fallbackFix(page: CrawledPage): AiFix {
  const domain = (() => {
    try { return new URL(page.url).hostname.replace("www.", ""); } catch { return "website"; }
  })();

  const title = page.title || `${domain} - Homepage`;
  const desc = page.metaDescription || `Visit ${domain} for more information about our products and services.`;
  const h1 = page.headings.h1[0] || `Welcome to ${domain}`;

  return {
    pageUrl: page.url,
    optimizedTitle: title.length > 60 ? title.slice(0, 57) + "..." : title,
    optimizedMetaDescription: desc.length > 160 ? desc.slice(0, 157) + "..." : desc,
    improvedH1: h1,
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: desc,
      url: page.url,
    },
    suggestedInternalLinkingText: `Learn more about ${domain}. Explore our content and resources. Visit related pages for additional information.`,
  };
}

async function callOpenAIWithRetry(prompt: string, retries: number = MAX_RETRIES): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
      });
      return response.choices[0]?.message?.content || "{}";
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 429 && attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[AI Fixer] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      if (attempt < retries) {
        console.warn(`[AI Fixer] API error (attempt ${attempt + 1}/${retries}): ${err.message}`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  return "{}";
}

export async function generateFixes(
  pages: CrawledPage[],
  issues: SeoIssue[]
): Promise<AiFixerResult> {
  const fixes: AiFix[] = [];

  for (const page of pages) {
    try {
      const prompt = buildPrompt(page, issues);
      const raw = await callOpenAIWithRetry(prompt);
      const parsed = JSON.parse(raw);

      fixes.push({
        pageUrl: page.url,
        optimizedTitle: parsed.optimizedTitle || fallbackFix(page).optimizedTitle,
        optimizedMetaDescription: parsed.optimizedMetaDescription || fallbackFix(page).optimizedMetaDescription,
        improvedH1: parsed.improvedH1 || fallbackFix(page).improvedH1,
        jsonLdSchema: parsed.jsonLdSchema || fallbackFix(page).jsonLdSchema,
        suggestedInternalLinkingText: parsed.suggestedInternalLinkingText || fallbackFix(page).suggestedInternalLinkingText,
      });
    } catch (err: any) {
      console.error(`[AI Fixer] Failed for ${page.url}, using fallback: ${err.message}`);
      fixes.push(fallbackFix(page));
    }
  }

  return { fixes, totalFixesGenerated: fixes.length };
}
