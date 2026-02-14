import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  credits: integer("credits").notNull().default(10),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  totalAudits: integer("total_audits").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_user_profiles_user_id").on(table.userId),
  index("idx_user_profiles_stripe_customer_id").on(table.stripeCustomerId),
]);

export const seoAudits = pgTable("seo_audits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  domain: varchar("domain", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  overallScore: integer("overall_score"),
  metaScore: integer("meta_score"),
  contentScore: integer("content_score"),
  performanceScore: integer("performance_score"),
  technicalScore: integer("technical_score"),
  pagesCrawled: integer("pages_crawled").default(0),
  issuesFound: integer("issues_found").default(0),
  fixesGenerated: integer("fixes_generated").default(0),
  results: jsonb("results"),
  summary: text("summary"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_seo_audits_user_id").on(table.userId),
  index("idx_seo_audits_status").on(table.status),
  index("idx_seo_audits_domain").on(table.domain),
  index("idx_seo_audits_created_at").on(table.createdAt),
]);

export const auditPages = pgTable("audit_pages", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull().references(() => seoAudits.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  metaDescription: text("meta_description"),
  headings: jsonb("headings"),
  wordCount: integer("word_count").default(0),
  internalLinks: integer("internal_links").default(0),
  externalLinks: integer("external_links").default(0),
  images: integer("images").default(0),
  schemaDetected: jsonb("schema_detected"),
  issues: jsonb("issues"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_audit_pages_audit_id").on(table.auditId),
  index("idx_audit_pages_url").on(table.url),
]);

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  description: text("description"),
  auditId: integer("audit_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_credit_transactions_user_id").on(table.userId),
  index("idx_credit_transactions_audit_id").on(table.auditId),
]);

export const insertAuditSchema = createInsertSchema(seoAudits).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  overallScore: true,
  metaScore: true,
  contentScore: true,
  performanceScore: true,
  technicalScore: true,
  pagesCrawled: true,
  issuesFound: true,
  fixesGenerated: true,
  results: true,
  summary: true,
  status: true,
});

export const insertAuditPageSchema = createInsertSchema(auditPages).omit({
  id: true,
  createdAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
});

export type SeoAudit = typeof seoAudits.$inferSelect;
export type InsertSeoAudit = z.infer<typeof insertAuditSchema>;
export type AuditPage = typeof auditPages.$inferSelect;
export type InsertAuditPage = z.infer<typeof insertAuditPageSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
