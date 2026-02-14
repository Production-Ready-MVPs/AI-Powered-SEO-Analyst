import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Crown, LogOut, User, Mail, Calendar } from "lucide-react";
import type { UserProfile, CreditTransaction } from "@shared/schema";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: transactions, isLoading: txLoading } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credits/history"],
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.profileImageUrl ?? undefined} />
              <AvatarFallback className="text-lg">
                {user?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg" data-testid="text-user-name">
                {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User"}
              </h2>
              {user?.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1" data-testid="text-user-email">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className="gap-1">
                  <User className="w-3 h-3" />
                  {profile?.role ?? "user"}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Crown className="w-3 h-3" />
                  {profile?.plan ?? "free"} plan
                </Badge>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "recently"}
              </span>
            </div>
            <Button variant="outline" onClick={() => logout()} className="gap-2" data-testid="button-logout">
              <LogOut className="w-4 h-4" /> Log out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              Credit Balance
            </h2>
            {profileLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <span className="text-2xl font-bold" data-testid="text-credits">
                {profile?.credits ?? 0}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Each SEO audit costs 1 credit. Free accounts start with 10 credits.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Credit History</h2>
          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (transactions?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-2">
              {transactions?.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-4 py-2"
                  data-testid={`tx-row-${tx.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-sm font-mono font-semibold ${tx.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
