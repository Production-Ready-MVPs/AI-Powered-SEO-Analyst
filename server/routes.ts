import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { analyzeSeo, extractDomain } from "./seo-analyzer";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

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

      (async () => {
        try {
          await storage.updateAudit(audit.id, { status: "processing" });
          const result = await analyzeSeo(url);

          if (result.pages && result.pages.length > 0) {
            const pageRecords = result.pages.map((page) => ({
              auditId: audit.id,
              url: page.url,
              title: page.title ?? null,
              metaDescription: page.metaDescription ?? null,
              headings: page.headings ?? null,
              wordCount: page.wordCount ?? 0,
              internalLinks: page.internalLinks ?? 0,
              externalLinks: page.externalLinks ?? 0,
              images: page.images ?? 0,
              schemaDetected: page.schemaDetected ?? null,
              issues: page.issues ?? null,
            }));
            await storage.createAuditPages(pageRecords);
          }

          await storage.updateAudit(audit.id, {
            status: "completed",
            overallScore: result.overallScore,
            metaScore: result.metaScore,
            contentScore: result.contentScore,
            performanceScore: result.performanceScore,
            technicalScore: result.technicalScore,
            pagesCrawled: result.pages?.length ?? 1,
            issuesFound: result.issuesFound,
            fixesGenerated: result.fixesGenerated,
            summary: result.summary,
            results: result.results,
            completedAt: new Date(),
          });
          await storage.incrementTotalAudits(userId);
        } catch (err) {
          console.error("SEO analysis failed:", err);
          await storage.updateAudit(audit.id, { status: "failed" });
          await storage.updateProfileCredits(userId, profile.credits);
          await storage.createCreditTransaction({
            userId,
            amount: 1,
            type: "refund",
            description: `Refund for failed audit: ${url}`,
            auditId: audit.id,
          });
        }
      })();
    } catch (error: any) {
      console.error("Error creating audit:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid URL provided" });
      }
      res.status(500).json({ message: "Failed to create audit" });
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
