import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { extractDomain } from "./seo-analyzer";
import { enqueueAudit, getJobProgress } from "./lib/queue";
import { startWorker } from "./lib/worker";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  startWorker();

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

  app.get("/api/audits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const audits = await storage.getAuditsByUser(userId);
      res.json(audits);
    } catch (error) {
      console.error("Error fetching audits:", error);
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  app.get("/api/audits/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/audits", isAuthenticated, async (req: any, res) => {
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

  return httpServer;
}
