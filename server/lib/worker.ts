import { dequeueJob, setOnJobReady, updateJobProgress, type AuditJob } from "./queue";
import { crawlDomain } from "./crawler";
import { analyzeRules } from "./analyzer";
import { generateFixes } from "./aiFixer";
import { storage } from "../storage";
import type { CrawledPage } from "./crawler";

const CONCURRENCY = 2;
let runningCount = 0;
let workerStarted = false;

async function processJob(job: AuditJob): Promise<void> {
  const { auditId, userId, url } = job;
  console.log(`[Worker] Processing audit #${auditId} for ${url}`);

  try {
    await storage.updateAudit(auditId, { status: "processing" });

    updateJobProgress(auditId, { stage: "crawling", message: "Crawling website pages", percent: 10 });
    const crawlData = await crawlDomain(url);
    console.log(`[Worker] Crawled ${crawlData.pagesCrawled} pages for audit #${auditId}`);

    updateJobProgress(auditId, { stage: "analyzing", message: "Running SEO rule analysis", percent: 40 });
    const ruleAnalysis = analyzeRules(crawlData);
    console.log(`[Worker] Found ${ruleAnalysis.meta.totalIssues} rule-based issues for audit #${auditId}`);

    updateJobProgress(auditId, { stage: "fixing", message: "Generating AI-powered fixes", percent: 60 });
    const aiResult = await generateFixes(crawlData.pages, ruleAnalysis.issues);
    console.log(`[Worker] Generated ${aiResult.totalFixesGenerated} AI fixes for audit #${auditId}`);

    updateJobProgress(auditId, { stage: "saving", message: "Saving results", percent: 85 });

    if (crawlData.pages.length > 0) {
      const pageRecords = crawlData.pages.map((page: CrawledPage) => ({
        auditId,
        url: page.url,
        title: page.title ?? null,
        metaDescription: page.metaDescription ?? null,
        headings: page.headings ?? null,
        wordCount: page.wordCount ?? 0,
        internalLinks: page.internalLinks ?? 0,
        externalLinks: page.externalLinks ?? 0,
        images: page.images.length ?? 0,
        schemaDetected: page.schemaScripts.map((s: any) => s["@type"] || "unknown"),
        issues: page.issues ?? null,
      }));
      await storage.createAuditPages(pageRecords);
    }

    const allIssues = ruleAnalysis.issues.map((i) => ({
      severity: i.severity,
      title: i.issueType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: i.explanation,
      recommendedFix: i.recommendedFix,
    }));

    const scores = computeScores(crawlData.pages, ruleAnalysis);

    const results = {
      issues: allIssues,
      recommendations: allIssues
        .filter((i) => i.severity === "critical" || i.severity === "warning")
        .map((i) => i.recommendedFix),
      fixes: aiResult.fixes,
      details: {
        meta: buildMetaDetails(crawlData.pages),
        content: buildContentDetails(crawlData.pages),
        performance: buildPerformanceDetails(crawlData.pages),
        technical: buildTechnicalDetails(crawlData.pages),
      },
    };

    const summary = buildSummary(crawlData, ruleAnalysis, scores);

    await storage.updateAudit(auditId, {
      status: "completed",
      overallScore: scores.overall,
      metaScore: scores.meta,
      contentScore: scores.content,
      performanceScore: scores.performance,
      technicalScore: scores.technical,
      pagesCrawled: crawlData.pagesCrawled,
      issuesFound: ruleAnalysis.meta.totalIssues,
      fixesGenerated: aiResult.totalFixesGenerated,
      summary,
      results,
      completedAt: new Date(),
    });

    await storage.incrementTotalAudits(userId);

    updateJobProgress(auditId, { stage: "done", message: "Audit complete", percent: 100 });
    console.log(`[Worker] Audit #${auditId} completed successfully`);
  } catch (err: any) {
    console.error(`[Worker] Audit #${auditId} failed:`, err.message);
    updateJobProgress(auditId, { stage: "error", message: err.message, percent: 0 });

    await storage.updateAudit(auditId, { status: "failed" });

    try {
      const profile = await storage.getProfile(userId);
      if (profile) {
        await storage.updateProfileCredits(userId, profile.credits + 1);
        await storage.createCreditTransaction({
          userId,
          amount: 1,
          type: "refund",
          description: `Refund for failed audit: ${url}`,
          auditId,
        });
      }
    } catch (refundErr: any) {
      console.error(`[Worker] Refund failed for audit #${auditId}:`, refundErr.message);
    }
  }
}

function computeScores(pages: CrawledPage[], analysis: { issues: { issueType: string; severity: string }[]; meta: { totalIssues: number } }) {
  let meta = 100, content = 100, performance = 100, technical = 100;

  const penalties: Record<string, { category: string; amount: number }> = {
    missing_meta_description: { category: "meta", amount: 25 },
    missing_h1: { category: "content", amount: 20 },
    multiple_h1: { category: "content", amount: 10 },
    thin_content: { category: "content", amount: 15 },
    duplicate_titles: { category: "meta", amount: 15 },
    missing_alt_tags: { category: "performance", amount: 10 },
    no_schema: { category: "technical", amount: 10 },
    orphan_page: { category: "technical", amount: 10 },
  };

  const categoryScores: Record<string, number> = { meta: 100, content: 100, performance: 100, technical: 100 };
  for (const issue of analysis.issues) {
    const penalty = penalties[issue.issueType];
    if (penalty) {
      categoryScores[penalty.category] = Math.max(0, categoryScores[penalty.category] - penalty.amount);
    }
  }

  meta = categoryScores.meta;
  content = categoryScores.content;
  performance = categoryScores.performance;
  technical = categoryScores.technical;

  const overall = Math.round((meta + content + performance + technical) / 4);
  return { overall, meta, content, performance, technical };
}

function buildMetaDetails(pages: CrawledPage[]) {
  const withTitle = pages.filter((p) => p.title).length;
  const withDesc = pages.filter((p) => p.metaDescription).length;
  const withCanonical = pages.filter((p) => p.canonical).length;
  return {
    title: `${withTitle}/${pages.length} pages have title tags`,
    description: `${withDesc}/${pages.length} pages have meta descriptions`,
    canonical: `${withCanonical}/${pages.length} pages have canonical URLs`,
  };
}

function buildContentDetails(pages: CrawledPage[]) {
  const avgWords = pages.length > 0 ? Math.round(pages.reduce((s, p) => s + p.wordCount, 0) / pages.length) : 0;
  const withH1 = pages.filter((p) => p.headings.h1.length === 1).length;
  return {
    headings: `${withH1}/${pages.length} pages have exactly one H1`,
    wordCount: `Average word count: ${avgWords}`,
    readability: avgWords >= 300 ? "Content length is adequate" : "Content may be too thin for ranking",
  };
}

function buildPerformanceDetails(pages: CrawledPage[]) {
  const totalImages = pages.reduce((s, p) => s + p.images.length, 0);
  const missingAlt = pages.reduce((s, p) => s + p.images.filter((i) => !i.alt).length, 0);
  return {
    images: `${totalImages} images found, ${missingAlt} missing alt text`,
    links: `Average ${pages.length > 0 ? Math.round(pages.reduce((s, p) => s + p.internalLinks, 0) / pages.length) : 0} internal links per page`,
    mobile: "Requires manual testing with Google Mobile-Friendly Test",
  };
}

function buildTechnicalDetails(pages: CrawledPage[]) {
  const withSchema = pages.filter((p) => p.schemaScripts.length > 0).length;
  const httpsCount = pages.filter((p) => p.url.startsWith("https://")).length;
  return {
    schema: `${withSchema}/${pages.length} pages have structured data`,
    https: `${httpsCount}/${pages.length} pages use HTTPS`,
    urlStructure: "URLs analyzed for crawlability and structure",
  };
}

function buildSummary(crawlData: any, ruleAnalysis: any, scores: any): string {
  const { critical, warnings, info } = ruleAnalysis.meta;
  return `Crawled ${crawlData.pagesCrawled} pages on ${crawlData.domain}. Overall score: ${scores.overall}/100. Found ${ruleAnalysis.meta.totalIssues} issues (${critical} critical, ${warnings} warnings, ${info} informational). Key areas: Meta ${scores.meta}/100, Content ${scores.content}/100, Performance ${scores.performance}/100, Technical ${scores.technical}/100.`;
}

async function tick(): Promise<void> {
  while (runningCount < CONCURRENCY) {
    const job = dequeueJob();
    if (!job) break;
    runningCount++;
    processJob(job)
      .finally(() => {
        runningCount--;
        tick();
      });
  }
}

export function startWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log("[Worker] Started with concurrency:", CONCURRENCY);
  setOnJobReady(() => tick());
  tick();
}
