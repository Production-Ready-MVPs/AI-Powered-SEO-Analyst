import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { SeoAudit } from "@shared/schema";

export default function AuditsListPage() {
  const { data: audits, isLoading } = useQuery<SeoAudit[]>({
    queryKey: ["/api/audits"],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-audits-title">All Audits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {audits?.length ?? 0} total audits
          </p>
        </div>
        <Link href="/audits/new">
          <Button className="gap-2" data-testid="button-new-audit-list">
            <Plus className="w-4 h-4" /> New Audit
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : (audits?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No audits yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Run your first SEO audit to get started
            </p>
            <Link href="/audits/new">
              <Button className="gap-2" data-testid="button-first-audit-list">
                <Plus className="w-4 h-4" /> Start Your First Audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {audits?.map((audit) => (
            <AuditRow key={audit.id} audit={audit} />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditRow({ audit }: { audit: SeoAudit }) {
  const statusMap = {
    pending: { icon: <Clock className="w-3.5 h-3.5" />, variant: "secondary" as const, label: "Pending" },
    processing: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, variant: "secondary" as const, label: "Processing" },
    completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: "secondary" as const, label: "Completed" },
    failed: { icon: <AlertCircle className="w-3.5 h-3.5" />, variant: "destructive" as const, label: "Failed" },
  };
  const status = statusMap[audit.status as keyof typeof statusMap] ?? statusMap.pending;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (s >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Link href={audit.status === "completed" ? `/audits/${audit.id}` : `/audits/${audit.id}`}>
      <Card className="hover-elevate cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate" data-testid={`text-audit-url-list-${audit.id}`}>
                  {audit.url}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(audit.createdAt).toLocaleDateString()} at{" "}
                  {new Date(audit.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {audit.overallScore !== null && audit.overallScore !== undefined && (
                <span className={`text-lg font-bold ${getScoreColor(audit.overallScore)}`}>
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
