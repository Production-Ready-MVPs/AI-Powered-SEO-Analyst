import OpenAI from "openai";

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

Provide realistic, detailed analysis with at least 3-5 issues and 4-6 recommendations. Be specific and actionable. Return ONLY valid JSON.`;

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

  return parsed;
}
