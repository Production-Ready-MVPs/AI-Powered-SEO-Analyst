import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { extractDomain } from "./seo-analyzer";
import { enqueueAudit, getJobProgress } from "./lib/queue";
import { startWorker } from "./lib/worker";
import { z } from "zod";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: any, res: Response, next: NextFunction) => {
    const key = req.user?.claims?.sub || req.ip || "anon";
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    entry.count++;
    next();
  };
}

async function isAdmin(req: any, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const profile = await storage.getProfile(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  startWorker();

  async function checkNotSuspended(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return next();
      const profile = await storage.getProfile(userId);
      if (profile?.role === "suspended") {
        return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
      }
      next();
    } catch {
      next();
    }
  }

  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.ensureProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get("/api/audits", isAuthenticated, checkNotSuspended, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const audits = await storage.getAuditsByUser(userId);
      res.json(audits);
    } catch (error) {
      console.error("Error fetching audits:", error);
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  app.get("/api/audits/:id", isAuthenticated, checkNotSuspended, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const audit = await storage.getAudit(id);
      if (!audit || audit.userId !== userId) {
        return res.status(404).json({ message: "Audit not found" });
      }
      res.json(audit);
    } catch (error) {
      console.error("Error fetching audit:", error);
      res.status(500).json({ message: "Failed to fetch audit" });
    }
  });

  app.get("/api/audits/:id/pages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const audit = await storage.getAudit(id);
      if (!audit || audit.userId !== userId) {
        return res.status(404).json({ message: "Audit not found" });
      }
      const pages = await storage.getAuditPages(id);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching audit pages:", error);
      res.status(500).json({ message: "Failed to fetch audit pages" });
    }
  });

  app.post("/api/audits", isAuthenticated, checkNotSuspended, rateLimit(10, 60 * 1000), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.ensureProfile(userId);

      if (profile.credits < 1) {
        return res.status(400).json({ message: "Not enough credits. Please upgrade your plan." });
      }

      const schema = z.object({ url: z.string().url() });
      const { url } = schema.parse(req.body);
      const domain = extractDomain(url);

      const audit = await storage.createAudit({ userId, url, domain });

      await storage.updateProfileCredits(userId, profile.credits - 1);
      await storage.createCreditTransaction({
        userId,
        amount: -1,
        type: "debit",
        description: `SEO audit: ${url}`,
        auditId: audit.id,
      });

      res.status(201).json(audit);

      enqueueAudit({ auditId: audit.id, userId, url, domain });
    } catch (error: any) {
      console.error("Error creating audit:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid URL provided" });
      }
      res.status(500).json({ message: "Failed to create audit" });
    }
  });

  app.get("/api/audits/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const audit = await storage.getAudit(id);
      if (!audit || audit.userId !== userId) {
        return res.status(404).json({ message: "Audit not found" });
      }
      const progress = getJobProgress(id);
      res.json({ status: audit.status, progress });
    } catch (error) {
      console.error("Error fetching audit progress:", error);
      res.status(500).json({ message: "Failed to fetch audit progress" });
    }
  });

  app.get("/api/credits/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getCreditHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allAudits = await storage.getAllAudits();
      const allProfiles = await storage.getAllProfiles();
      const completedAudits = allAudits.filter((a) => a.status === "completed");
      const scores = completedAudits.map((a) => a.overallScore ?? 0).filter((s) => s > 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const totalCreditsUsed = allProfiles.reduce((sum, p) => sum + (p.totalAudits ?? 0), 0);

      res.json({
        totalUsers: allUsers.length,
        totalAudits: allAudits.length,
        completedAudits: completedAudits.length,
        avgScore,
        totalCreditsUsed,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allProfiles = await storage.getAllProfiles();
      const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));
      const usersWithProfiles = allUsers.map((u) => ({
        ...u,
        profile: profileMap.get(u.id)
          ? {
              credits: profileMap.get(u.id)!.credits,
              role: profileMap.get(u.id)!.role,
              plan: profileMap.get(u.id)!.plan,
              totalAudits: profileMap.get(u.id)!.totalAudits,
              subscriptionPlan: profileMap.get(u.id)!.subscriptionPlan,
            }
          : null,
      }));
      res.json(usersWithProfiles);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/audits", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const allAudits = await storage.getAllAudits();
      res.json(allAudits);
    } catch (error) {
      console.error("Error fetching admin audits:", error);
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  app.post("/api/admin/credits", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        userId: z.string().min(1),
        amount: z.number().int(),
      });
      const { userId, amount } = schema.parse(req.body);
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "User profile not found" });
      }
      const newCredits = Math.max(0, profile.credits + amount);
      await storage.updateProfileCredits(userId, newCredits);
      await storage.createCreditTransaction({
        userId,
        amount,
        type: amount >= 0 ? "credit" : "debit",
        description: `Admin adjustment: ${amount >= 0 ? "+" : ""}${amount} credits`,
      });
      res.json({ credits: newCredits });
    } catch (error: any) {
      console.error("Error adjusting credits:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid input" });
      }
      res.status(500).json({ message: "Failed to adjust credits" });
    }
  });

  app.post("/api/admin/suspend", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        userId: z.string().min(1),
        suspended: z.boolean(),
      });
      const { userId, suspended } = schema.parse(req.body);

      const adminUserId = req.user.claims.sub;
      if (userId === adminUserId) {
        return res.status(400).json({ message: "Cannot suspend yourself" });
      }

      await storage.updateProfileRole(userId, suspended ? "suspended" : "user");
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error suspending user:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid input" });
      }
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  return httpServer;
}
