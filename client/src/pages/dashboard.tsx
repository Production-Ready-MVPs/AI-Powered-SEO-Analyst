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
  const completedCount = audits?.filter((a) => a.status === "completed").length ?? 0;
  const avgScore = audits?.length
    ? Math.round(
        audits
          .filter((a) => a.overallScore)
          .reduce((sum, a) => sum + (a.overallScore ?? 0), 0) /
          Math.max(audits.filter((a) => a.overallScore).length, 1)
      )
    : 0;

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
    <Link href={audit.status === "completed" ? `/audits/${audit.id}` : "#"}>
      <Card className={audit.status === "completed" ? "hover-elevate cursor-pointer" : ""}>
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
