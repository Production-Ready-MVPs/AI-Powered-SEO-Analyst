import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  FileText,
  Coins,
  BarChart3,
  Shield,
  Search,
  Ban,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  profile: {
    credits: number;
    role: string;
    plan: string;
    totalAudits: number;
    subscriptionPlan: string;
  } | null;
}

interface AdminAudit {
  id: number;
  userId: string;
  url: string;
  domain: string | null;
  status: string;
  overallScore: number | null;
  pagesCrawled: number | null;
  issuesFound: number | null;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalAudits: number;
  completedAudits: number;
  avgScore: number;
  totalCreditsUsed: number;
}

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [creditUserId, setCreditUserId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: audits, isLoading: auditsLoading } = useQuery<AdminAudit[]>({
    queryKey: ["/api/admin/audits"],
  });

  const adjustCredits = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      await apiRequest("POST", "/api/admin/credits", { userId, amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Credits updated" });
      setCreditUserId("");
      setCreditAmount("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const suspendUser = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      await apiRequest("POST", "/api/admin/suspend", { userId, suspended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <AdminStatCard icon={<Users className="w-4 h-4" />} label="Total Users" value={statsLoading ? null : String(stats?.totalUsers ?? 0)} testId="stat-admin-users" />
        <AdminStatCard icon={<FileText className="w-4 h-4" />} label="Total Audits" value={statsLoading ? null : String(stats?.totalAudits ?? 0)} testId="stat-admin-audits" />
        <AdminStatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={statsLoading ? null : String(stats?.completedAudits ?? 0)} testId="stat-admin-completed" />
        <AdminStatCard icon={<BarChart3 className="w-4 h-4" />} label="Avg Score" value={statsLoading ? null : stats?.avgScore ? `${stats.avgScore}` : "N/A"} testId="stat-admin-score" />
        <AdminStatCard icon={<TrendingUp className="w-4 h-4" />} label="Credits Used" value={statsLoading ? null : String(stats?.totalCreditsUsed ?? 0)} testId="stat-admin-credits-used" />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
          <TabsTrigger value="audits" data-testid="admin-tab-audits">Audits</TabsTrigger>
          <TabsTrigger value="credits" data-testid="admin-tab-credits">Adjust Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-users"
            />
          </div>
          {usersLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {filteredUsers?.map((u) => (
                <Card key={u.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-admin-user-${u.id}`}>
                          {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          <Coins className="w-3 h-3 mr-1" />
                          {u.profile?.credits ?? 0}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{u.profile?.plan ?? "free"}</Badge>
                        <Badge variant="secondary" className="text-xs">{u.profile?.totalAudits ?? 0} audits</Badge>
                        {u.profile?.role === "suspended" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => suspendUser.mutate({ userId: u.id, suspended: false })}
                            data-testid={`button-unsuspend-${u.id}`}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Unsuspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => suspendUser.mutate({ userId: u.id, suspended: true })}
                            data-testid={`button-suspend-${u.id}`}
                          >
                            <Ban className="w-3 h-3" /> Suspend
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audits" className="mt-4">
          {auditsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {audits?.map((audit) => (
                <Card key={audit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{audit.url}</p>
                        <p className="text-xs text-muted-foreground">
                          User: {audit.userId} | {new Date(audit.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {audit.overallScore != null && (
                          <span className={`text-sm font-bold ${audit.overallScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : audit.overallScore >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            {audit.overallScore}
                          </span>
                        )}
                        <Badge variant={audit.status === "completed" ? "secondary" : audit.status === "failed" ? "destructive" : "secondary"}>
                          {audit.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="credits" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold">Adjust User Credits</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  placeholder="User ID"
                  value={creditUserId}
                  onChange={(e) => setCreditUserId(e.target.value)}
                  data-testid="input-credit-user-id"
                />
                <Input
                  type="number"
                  placeholder="Amount (+ or -)"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  data-testid="input-credit-amount"
                />
                <Button
                  onClick={() => {
                    if (!creditUserId || !creditAmount) return;
                    adjustCredits.mutate({ userId: creditUserId, amount: parseInt(creditAmount) });
                  }}
                  disabled={adjustCredits.isPending || !creditUserId || !creditAmount}
                  data-testid="button-adjust-credits"
                >
                  {adjustCredits.isPending ? "Updating..." : "Adjust Credits"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a positive number to add credits or a negative number to deduct credits.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminStatCard({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string | null; testId: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {value === null ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold" data-testid={testId}>{value}</p>}
      </CardContent>
    </Card>
  );
}
