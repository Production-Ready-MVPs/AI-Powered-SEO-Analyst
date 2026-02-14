import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface PageData {
  url: string;
  title: string;
  metaDescription: string;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  schemaDetected: string[];
  issues: Array<{ severity: string; title: string; description: string }>;
}

interface SeoAnalysisResult {
  overallScore: number;
  metaScore: number;
  contentScore: number;
  performanceScore: number;
  technicalScore: number;
  summary: string;
  issuesFound: number;
  fixesGenerated: number;
  pages: PageData[];
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

export async function analyzeSeo(url: string): Promise<SeoAnalysisResult> {
  const prompt = `You are an expert SEO analyst. Analyze the following website URL and provide a comprehensive SEO audit report.

URL: ${url}

Based on your knowledge of SEO best practices, analyze this URL and provide a detailed SEO report. Consider:

1. **Meta Tags (0-100)**: Title tag optimization, meta description, open graph tags, canonical URLs
2. **Content Quality (0-100)**: Header structure, keyword optimization, content length, readability
3. **Performance (0-100)**: Page load expectations, mobile optimization, image optimization
4. **Technical SEO (0-100)**: URL structure, robots.txt, sitemap, schema markup, HTTPS

Return a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "metaScore": <number 0-100>,
  "contentScore": <number 0-100>,
  "performanceScore": <number 0-100>,
  "technicalScore": <number 0-100>,
  "summary": "<2-3 sentence summary of the overall SEO health>",
  "pages": [
    {
      "url": "${url}",
      "title": "<detected or expected page title>",
      "metaDescription": "<detected or expected meta description>",
      "headings": { "h1": ["<h1 texts>"], "h2": ["<h2 texts>"], "h3": ["<h3 texts>"] },
      "wordCount": <estimated word count>,
      "internalLinks": <estimated count>,
      "externalLinks": <estimated count>,
      "images": <estimated count>,
      "schemaDetected": ["<schema types detected, e.g. Organization, WebPage>"],
      "issues": [
        { "severity": "critical|warning|info", "title": "<issue>", "description": "<description>" }
      ]
    }
  ],
  "results": {
    "issues": [
      {
        "severity": "critical" | "warning" | "info",
        "title": "<short issue title>",
        "description": "<detailed description of the issue>"
      }
    ],
    "recommendations": [
      "<actionable recommendation string>"
    ],
    "details": {
      "meta": {
        "title": "<analysis>",
        "description": "<analysis>",
        "openGraph": "<analysis>"
      },
      "content": {
        "headings": "<analysis>",
        "keywords": "<analysis>",
        "readability": "<analysis>"
      },
      "performance": {
        "loadTime": "<analysis>",
        "mobile": "<analysis>",
        "images": "<analysis>"
      },
      "technical": {
        "https": "<analysis>",
        "urlStructure": "<analysis>",
        "schema": "<analysis>"
      }
    }
  }
}

Provide realistic, detailed analysis with at least 3-5 issues and 4-6 recommendations. Include at least 1 page in the pages array. Be specific and actionable. Return ONLY valid JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as SeoAnalysisResult;

  parsed.overallScore = Math.min(100, Math.max(0, Math.round(parsed.overallScore ?? 50)));
  parsed.metaScore = Math.min(100, Math.max(0, Math.round(parsed.metaScore ?? 50)));
  parsed.contentScore = Math.min(100, Math.max(0, Math.round(parsed.contentScore ?? 50)));
  parsed.performanceScore = Math.min(100, Math.max(0, Math.round(parsed.performanceScore ?? 50)));
  parsed.technicalScore = Math.min(100, Math.max(0, Math.round(parsed.technicalScore ?? 50)));

  parsed.pages = parsed.pages ?? [];
  parsed.issuesFound = parsed.results?.issues?.length ?? 0;
  parsed.fixesGenerated = parsed.results?.recommendations?.length ?? 0;

  return parsed;
}
