import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Search,
  Plus,
  BarChart3,
  Coins,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  Zap,
  Download,
} from "lucide-react";
import type { SeoAudit, UserProfile } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: audits, isLoading: auditsLoading } = useQuery<SeoAudit[]>({
    queryKey: ["/api/audits"],
  });

  const recentAudits = audits?.slice(0, 5) ?? [];
  const completedAudits = audits?.filter((a) => a.status === "completed") ?? [];
  const completedCount = completedAudits.length;
  const avgScore = completedAudits.length
    ? Math.round(
        completedAudits.reduce((sum, a) => sum + (a.overallScore ?? 0), 0) /
          completedAudits.length
      )
    : 0;

  const allIssues = completedAudits.flatMap((a) => {
    const r = a.results as any;
    return r?.issues ?? [];
  });
  const criticalCount = allIssues.filter((i: any) => i.severity === "critical").length;
  const warningCount = allIssues.filter((i: any) => i.severity === "warning").length;
  const infoCount = allIssues.filter((i: any) => i.severity === "info").length;
  const totalIssues = allIssues.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's an overview of your SEO audits
          </p>
        </div>
        <Link href="/audits/new">
          <Button className="gap-2" data-testid="button-new-audit">
            <Plus className="w-4 h-4" /> New Audit
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Coins className="w-4 h-4" />}
          label="Credits Remaining"
          value={profileLoading ? null : String(profile?.credits ?? 0)}
          testId="stat-credits"
        />
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="Total Audits"
          value={auditsLoading ? null : String(audits?.length ?? 0)}
          testId="stat-total-audits"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Completed"
          value={auditsLoading ? null : String(completedCount)}
          testId="stat-completed"
        />
        <StatCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Avg. Score"
          value={auditsLoading ? null : avgScore > 0 ? `${avgScore}/100` : "N/A"}
          testId="stat-avg-score"
        />
      </div>

      {completedAudits.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                SEO Health Score
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${avgScore * 2.64} ${264 - avgScore * 2.64}`}
                      className={avgScore >= 80 ? "text-emerald-500" : avgScore >= 60 ? "text-amber-500" : "text-red-500"}
                      stroke="currentColor"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${getScoreColor(avgScore)}`} data-testid="text-health-score">
                      {avgScore}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <ScoreRow label="Meta Tags" value={getAvgCategoryScore(completedAudits, "metaScore")} />
                  <ScoreRow label="Content" value={getAvgCategoryScore(completedAudits, "contentScore")} />
                  <ScoreRow label="Performance" value={getAvgCategoryScore(completedAudits, "performanceScore")} />
                  <ScoreRow label="Technical" value={getAvgCategoryScore(completedAudits, "technicalScore")} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Issues by Severity
              </h2>
              {totalIssues === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No issues found</p>
              ) : (
                <div className="space-y-4">
                  <SeverityBar label="Critical" count={criticalCount} total={totalIssues} colorClass="bg-red-500 dark:bg-red-400" icon={<XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />} />
                  <SeverityBar label="Warning" count={warningCount} total={totalIssues} colorClass="bg-amber-500 dark:bg-amber-400" icon={<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />} />
                  <SeverityBar label="Info" count={infoCount} total={totalIssues} colorClass="bg-blue-500 dark:bg-blue-400" icon={<Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />} />
                  <p className="text-xs text-muted-foreground text-right">{totalIssues} total issues across {completedCount} audits</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {completedAudits.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Top Fix Suggestions
            </h2>
            <div className="space-y-3">
              {getTopFixes(completedAudits).map((fix, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${fix.severity === "critical" ? "text-red-600 dark:text-red-400" : fix.severity === "warning" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                    {fix.severity === "critical" ? <XCircle className="w-4 h-4" /> : fix.severity === "warning" ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{fix.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fix.recommendedFix || fix.description}</p>
                  </div>
                </div>
              ))}
              {getTopFixes(completedAudits).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No fix suggestions available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Recent Audits</h2>
          {(audits?.length ?? 0) > 0 && (
            <Link href="/audits">
              <Button variant="ghost" size="sm" data-testid="link-view-all-audits">
                View All
              </Button>
            </Link>
          )}
        </div>
        {auditsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : recentAudits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No audits yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Run your first SEO audit to see results here
              </p>
              <Link href="/audits/new">
                <Button className="gap-2" data-testid="button-first-audit">
                  <Plus className="w-4 h-4" /> Start Your First Audit
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentAudits.map((audit) => (
              <AuditListItem key={audit.id} audit={audit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getAvgCategoryScore(audits: SeoAudit[], field: keyof SeoAudit): number {
  const scores = audits.map((a) => (a as any)[field]).filter((s: any) => s != null) as number[];
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

function getTopFixes(audits: SeoAudit[]): any[] {
  const allIssues: any[] = [];
  for (const audit of audits) {
    const r = audit.results as any;
    if (r?.issues) {
      for (const issue of r.issues) {
        allIssues.push(issue);
      }
    }
  }
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const issue of allIssues) {
    const key = issue.title || issue.issueType;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(issue);
    }
  }
  unique.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });
  return unique.slice(0, 6);
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <span className={`text-xs font-mono font-semibold ${getScoreColor(value)}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${value >= 80 ? "bg-emerald-500 dark:bg-emerald-400" : value >= 60 ? "bg-amber-500 dark:bg-amber-400" : "bg-red-500 dark:bg-red-400"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SeverityBar({ label, count, total, colorClass, icon }: { label: string; count: number; total: number; colorClass: string; icon: React.ReactNode }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-mono">{count}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-2xl font-bold" data-testid={testId}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AuditListItem({ audit }: { audit: SeoAudit }) {
  const statusConfig = {
    pending: { icon: <Clock className="w-3.5 h-3.5" />, variant: "secondary" as const, label: "Pending" },
    processing: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, variant: "secondary" as const, label: "Processing" },
    completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: "secondary" as const, label: "Completed" },
    failed: { icon: <AlertCircle className="w-3.5 h-3.5" />, variant: "destructive" as const, label: "Failed" },
  };
  const status = statusConfig[audit.status as keyof typeof statusConfig] ?? statusConfig.pending;

  return (
    <Link href={`/audits/${audit.id}`}>
      <Card className="hover-elevate cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate" data-testid={`text-audit-url-${audit.id}`}>
                  {audit.url}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(audit.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {audit.overallScore !== null && audit.overallScore !== undefined && (
                <span className={`text-lg font-bold ${getScoreColor(audit.overallScore)}`} data-testid={`text-audit-score-${audit.id}`}>
                  {audit.overallScore}
                </span>
              )}
              <Badge variant={status.variant} className="gap-1">
                {status.icon}
                {status.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
