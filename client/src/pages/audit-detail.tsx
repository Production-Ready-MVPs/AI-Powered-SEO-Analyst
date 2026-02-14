import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
  Tag,
  FileText,
  Zap,
  Code2,
  RefreshCw,
  Download,
  Info,
  Globe,
  Wrench,
  Copy,
  Check,
} from "lucide-react";
import type { SeoAudit, AuditPage } from "@shared/schema";
import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface JobProgress {
  stage: string;
  message: string;
  percent: number;
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { data: audit, isLoading } = useQuery<SeoAudit>({
    queryKey: ["/api/audits", id],
    refetchInterval: (query) => {
      const data = query.state.data as SeoAudit | undefined;
      if (data && (data.status === "pending" || data.status === "processing")) {
        return 3000;
      }
      return false;
    },
  });

  const { data: progressData } = useQuery<{ status: string; progress: JobProgress | null }>({
    queryKey: ["/api/audits", id, "progress"],
    refetchInterval: audit && (audit.status === "pending" || audit.status === "processing") ? 2000 : false,
    enabled: !!audit && (audit.status === "pending" || audit.status === "processing"),
  });

  const { data: pages } = useQuery<AuditPage[]>({
    queryKey: ["/api/audits", id, "pages"],
    enabled: !!audit && audit.status === "completed",
  });

  useEffect(() => {
    if (audit?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
    }
  }, [audit?.status]);

  function downloadReport() {
    if (!audit) return;
    const report = {
      url: audit.url,
      domain: audit.domain,
      createdAt: audit.createdAt,
      completedAt: audit.completedAt,
      scores: {
        overall: audit.overallScore,
        meta: audit.metaScore,
        content: audit.contentScore,
        performance: audit.performanceScore,
        technical: audit.technicalScore,
      },
      summary: audit.summary,
      pagesCrawled: audit.pagesCrawled,
      issuesFound: audit.issuesFound,
      fixesGenerated: audit.fixesGenerated,
      results: audit.results,
      pages: pages ?? [],
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-report-${audit.domain || "audit"}-${audit.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Audit not found</h2>
        <Link href="/"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const isPending = audit.status === "pending" || audit.status === "processing";
  const isFailed = audit.status === "failed";
  const results = audit.results as any;
  const progress = progressData?.progress;

  const stages = [
    { key: "queued", label: "Queued" },
    { key: "crawling", label: "Crawling" },
    { key: "analyzing", label: "Analyzing" },
    { key: "fixing", label: "AI Fixes" },
    { key: "saving", label: "Saving" },
    { key: "done", label: "Complete" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-detail">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold truncate" data-testid="text-audit-detail-url">
                {audit.url}
              </h1>
              <a href={audit.url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Created {new Date(audit.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        {audit.status === "completed" && (
          <Button variant="outline" className="gap-2" onClick={downloadReport} data-testid="button-download-report">
            <Download className="w-4 h-4" /> Download JSON
          </Button>
        )}
      </div>

      {isPending && (
        <Card>
          <CardContent className="py-10 space-y-6">
            <div className="text-center space-y-2">
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
              <h2 className="text-lg font-semibold">Analyzing your website...</h2>
              <p className="text-sm text-muted-foreground">
                {progress?.message || "Our AI is crawling and evaluating your site."}
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress?.percent ?? 5}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {stages.map((s) => {
                  const currentIdx = stages.findIndex((st) => st.key === progress?.stage);
                  const stageIdx = stages.findIndex((st) => st.key === s.key);
                  const isActive = s.key === progress?.stage;
                  const isDone = stageIdx < currentIdx;
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${isDone ? "bg-primary" : isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
                      <span className={`text-[10px] ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Auto-refreshing...
            </div>
          </CardContent>
        </Card>
      )}

      {isFailed && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <div>
              <h2 className="text-lg font-semibold">Audit Failed</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn't analyze this URL. Your credit has been refunded.
              </p>
            </div>
            <Link href="/audits/new">
              <Button variant="outline">Try Again</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {audit.status === "completed" && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <ScoreCard label="Overall" score={audit.overallScore ?? 0} icon={<Zap className="w-4 h-4" />} large />
            <ScoreCard label="Meta Tags" score={audit.metaScore ?? 0} icon={<Tag className="w-4 h-4" />} />
            <ScoreCard label="Content" score={audit.contentScore ?? 0} icon={<FileText className="w-4 h-4" />} />
            <ScoreCard label="Performance" score={audit.performanceScore ?? 0} icon={<Clock className="w-4 h-4" />} />
            <ScoreCard label="Technical" score={audit.technicalScore ?? 0} icon={<Code2 className="w-4 h-4" />} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" data-testid="text-pages-crawled">{audit.pagesCrawled ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Pages Crawled</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" data-testid="text-issues-found">{audit.issuesFound ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Issues Found</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" data-testid="text-fixes-generated">{audit.fixesGenerated ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">AI Fixes Generated</p>
              </CardContent>
            </Card>
          </div>

          {audit.summary && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Summary
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-audit-summary">
                  {audit.summary}
                </p>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="issues" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="issues" data-testid="tab-issues">Issues</TabsTrigger>
              <TabsTrigger value="fixes" data-testid="tab-fixes">AI Fixes</TabsTrigger>
              <TabsTrigger value="pages" data-testid="tab-pages">Pages</TabsTrigger>
              <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {results?.issues?.length > 0 ? (
                    <div className="space-y-3">
                      {results.issues.map((issue: any, i: number) => (
                        <IssueItem key={i} issue={issue} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No issues found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fixes" className="mt-4 space-y-4">
              {results?.fixes?.length > 0 ? (
                results.fixes.map((fix: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{fix.pageUrl}</span>
                      </div>
                      <div className="grid gap-3">
                        <FixField label="Optimized Title" value={fix.optimizedTitle} index={i * 10 + 1} copiedIndex={copiedIndex} onCopy={copyToClipboard} />
                        <FixField label="Meta Description" value={fix.optimizedMetaDescription} index={i * 10 + 2} copiedIndex={copiedIndex} onCopy={copyToClipboard} />
                        <FixField label="Improved H1" value={fix.improvedH1} index={i * 10 + 3} copiedIndex={copiedIndex} onCopy={copyToClipboard} />
                        {fix.jsonLdSchema && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-muted-foreground">JSON-LD Schema</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(JSON.stringify(fix.jsonLdSchema, null, 2), i * 10 + 4)}
                              >
                                {copiedIndex === i * 10 + 4 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </Button>
                            </div>
                            <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto">
                              {JSON.stringify(fix.jsonLdSchema, null, 2)}
                            </pre>
                          </div>
                        )}
                        {fix.suggestedInternalLinkingText && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Internal Linking</span>
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">{fix.suggestedInternalLinkingText}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Wrench className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No AI fixes available for this audit</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pages" className="mt-4 space-y-3">
              {pages && pages.length > 0 ? (
                pages.map((page) => (
                  <Card key={page.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{page.url}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{page.title || "No title"}</p>
                        </div>
                        <a href={page.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon"><ExternalLink className="w-3.5 h-3.5" /></Button>
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">{page.wordCount ?? 0} words</Badge>
                        <Badge variant="secondary" className="text-xs">{page.internalLinks ?? 0} internal links</Badge>
                        <Badge variant="secondary" className="text-xs">{page.images ?? 0} images</Badge>
                        {(page.issues as any[])?.length > 0 && (
                          <Badge variant="destructive" className="text-xs">{(page.issues as any[]).length} issues</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">No page data available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardContent className="p-6 space-y-6">
                  {results?.details && Object.entries(results.details as Record<string, Record<string, string>>).map(([cat, details]) => (
                    <div key={cat}>
                      <h3 className="text-sm font-semibold capitalize mb-2">{cat}</h3>
                      <div className="space-y-1.5">
                        {Object.entries(details).map(([key, val]) => (
                          <div key={key} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground capitalize min-w-[80px] shrink-0">{key}:</span>
                            <span>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {results?.recommendations?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
                      <div className="space-y-2">
                        {results.recommendations.map((rec: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function FixField({ label, value, index, copiedIndex, onCopy }: { label: string; value: string; index: number; copiedIndex: number | null; onCopy: (text: string, idx: number) => void }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="icon" onClick={() => onCopy(value, index)}>
          {copiedIndex === index ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
      <p className="text-sm bg-muted/50 rounded-md p-3">{value}</p>
    </div>
  );
}

function ScoreCard({ label, score, icon, large }: { label: string; score: number; icon: React.ReactNode; large?: boolean }) {
  const color = score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const progressColor = score >= 80 ? "bg-emerald-500 dark:bg-emerald-400" : score >= 60 ? "bg-amber-500 dark:bg-amber-400" : "bg-red-500 dark:bg-red-400";

  return (
    <Card className={large ? "sm:col-span-2 lg:col-span-1" : ""}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${color}`} data-testid={`text-score-${label.toLowerCase().replace(/\s/g, "-")}`}>
          {score}<span className="text-sm font-normal text-muted-foreground">/100</span>
        </p>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${score}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function IssueItem({ issue }: { issue: { severity: string; title: string; description: string; recommendedFix?: string } }) {
  const severityConfig = {
    critical: { icon: <XCircle className="w-4 h-4" />, color: "text-red-600 dark:text-red-400" },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-600 dark:text-amber-400" },
    info: { icon: <Info className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400" },
  };
  const config = severityConfig[issue.severity as keyof typeof severityConfig] ?? severityConfig.info;

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 shrink-0 ${config.color}`}>{config.icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{issue.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
        {issue.recommendedFix && (
          <p className="text-xs text-primary mt-1 flex items-start gap-1">
            <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
            {issue.recommendedFix}
          </p>
        )}
      </div>
    </div>
  );
}
