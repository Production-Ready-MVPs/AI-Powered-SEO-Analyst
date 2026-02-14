import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

export const seoAudits = pgTable("seo_audits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  overallScore: integer("overall_score"),
  metaScore: integer("meta_score"),
  contentScore: integer("content_score"),
  performanceScore: integer("performance_score"),
  technicalScore: integer("technical_score"),
  results: jsonb("results"),
  summary: text("summary"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  description: text("description"),
  auditId: integer("audit_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  credits: integer("credits").notNull().default(10),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  totalAudits: integer("total_audits").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAuditSchema = createInsertSchema(seoAudits).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  overallScore: true,
  metaScore: true,
  contentScore: true,
  performanceScore: true,
  technicalScore: true,
  results: true,
  summary: true,
  status: true,
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
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
