import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Loader2, ArrowLeft, Coins, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { UserProfile } from "@shared/schema";

const auditFormSchema = z.object({
  url: z.string().url("Please enter a valid URL (e.g. https://example.com)"),
});

type AuditFormValues = z.infer<typeof auditFormSchema>;

export default function NewAuditPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditFormSchema),
    defaultValues: { url: "" },
  });

  const createAudit = useMutation({
    mutationFn: async (values: AuditFormValues) => {
      const res = await apiRequest("POST", "/api/audits", values);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Audit started", description: "Your SEO audit is being processed." });
      navigate(`/audits/${data.id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-new-audit-title">New SEO Audit</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a URL to analyze its SEO performance
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI-Powered Analysis</span>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Coins className="w-3 h-3" />
              {profile?.credits ?? 0} credits
            </Badge>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createAudit.mutate(v))} className="space-y-6">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="https://example.com"
                          className="pl-9"
                          data-testid="input-url"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 rounded-md p-4 space-y-2">
                <p className="text-sm font-medium">What we'll analyze:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2"><Search className="w-3 h-3" /> Meta tags & descriptions</li>
                  <li className="flex items-center gap-2"><Search className="w-3 h-3" /> Content quality & structure</li>
                  <li className="flex items-center gap-2"><Search className="w-3 h-3" /> Performance indicators</li>
                  <li className="flex items-center gap-2"><Search className="w-3 h-3" /> Technical SEO factors</li>
                </ul>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  This will use 1 credit from your account
                </p>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={createAudit.isPending || (profile?.credits ?? 0) < 1}
                  data-testid="button-start-audit"
                >
                  {createAudit.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {createAudit.isPending ? "Analyzing..." : "Start Audit"}
                </Button>
              </div>
              {(profile?.credits ?? 0) < 1 && (
                <p className="text-xs text-destructive text-center">
                  You don't have enough credits. Please upgrade your plan.
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
