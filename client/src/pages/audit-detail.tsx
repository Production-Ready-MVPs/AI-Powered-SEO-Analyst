import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import type { SeoAudit } from "@shared/schema";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();

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

  useEffect(() => {
    if (audit?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
    }
  }, [audit?.status]);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-detail">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
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

      {isPending && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <div>
              <h2 className="text-lg font-semibold">Analyzing your website...</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Our AI is crawling and evaluating your site. This usually takes 15-30 seconds.
              </p>
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
                We couldn't analyze this URL. Please check the URL and try again.
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
            <ScoreCard
              label="Overall"
              score={audit.overallScore ?? 0}
              icon={<Zap className="w-4 h-4" />}
              large
            />
            <ScoreCard label="Meta Tags" score={audit.metaScore ?? 0} icon={<Tag className="w-4 h-4" />} />
            <ScoreCard label="Content" score={audit.contentScore ?? 0} icon={<FileText className="w-4 h-4" />} />
            <ScoreCard label="Performance" score={audit.performanceScore ?? 0} icon={<Clock className="w-4 h-4" />} />
            <ScoreCard label="Technical" score={audit.technicalScore ?? 0} icon={<Code2 className="w-4 h-4" />} />
          </div>

          {audit.summary && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  AI Summary
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-audit-summary">
                  {audit.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {results?.issues && results.issues.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">Issues Found</h2>
                <div className="space-y-3">
                  {results.issues.map((issue: any, i: number) => (
                    <IssueItem key={i} issue={issue} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {results?.recommendations && results.recommendations.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">Recommendations</h2>
                <div className="space-y-3">
                  {results.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ScoreCard({
  label,
  score,
  icon,
  large,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  large?: boolean;
}) {
  const color =
    score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const progressColor =
    score >= 80
      ? "bg-emerald-500 dark:bg-emerald-400"
      : score >= 60
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-red-500 dark:bg-red-400";

  return (
    <Card className={large ? "sm:col-span-2 lg:col-span-1" : ""}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${color}`} data-testid={`text-score-${label.toLowerCase().replace(/\s/g, "-")}`}>
          {score}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </p>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${score}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function IssueItem({ issue }: { issue: { severity: string; title: string; description: string } }) {
  const severityConfig = {
    critical: { icon: <XCircle className="w-4 h-4" />, color: "text-red-600 dark:text-red-400" },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-600 dark:text-amber-400" },
    info: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400" },
  };
  const config = severityConfig[issue.severity as keyof typeof severityConfig] ?? severityConfig.info;

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 shrink-0 ${config.color}`}>{config.icon}</div>
      <div>
        <p className="text-sm font-medium">{issue.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
      </div>
    </div>
  );
}
