import {
  users,
  type User,
  type UpsertUser,
  seoAudits,
  type SeoAudit,
  type InsertSeoAudit,
  auditPages,
  type AuditPage,
  type InsertAuditPage,
  creditTransactions,
  type CreditTransaction,
  type InsertCreditTransaction,
  userProfiles,
  type UserProfile,
  type InsertUserProfile,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getProfile(userId: string): Promise<UserProfile | undefined>;
  ensureProfile(userId: string): Promise<UserProfile>;
  updateProfileCredits(userId: string, credits: number): Promise<void>;
  updateProfileRole(userId: string, role: string): Promise<void>;
  updateProfileStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void>;
  updateProfileSubscription(userId: string, plan: string, subscriptionPlan: string): Promise<void>;
  incrementTotalAudits(userId: string): Promise<void>;
  createAudit(audit: InsertSeoAudit): Promise<SeoAudit>;
  getAudit(id: number): Promise<SeoAudit | undefined>;
  getAuditsByUser(userId: string): Promise<SeoAudit[]>;
  updateAudit(id: number, data: Partial<SeoAudit>): Promise<SeoAudit | undefined>;
  createAuditPage(page: InsertAuditPage): Promise<AuditPage>;
  createAuditPages(pages: InsertAuditPage[]): Promise<AuditPage[]>;
  getAuditPages(auditId: number): Promise<AuditPage[]>;
  createCreditTransaction(tx: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditHistory(userId: string): Promise<CreditTransaction[]>;
  getAllUsers(): Promise<User[]>;
  getAllProfiles(): Promise<UserProfile[]>;
  getAllAudits(): Promise<SeoAudit[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async ensureProfile(userId: string): Promise<UserProfile> {
    const existing = await this.getProfile(userId);
    if (existing) return existing;
    const [profile] = await db
      .insert(userProfiles)
      .values({ userId, credits: 10, role: "user", plan: "free", subscriptionPlan: "free", totalAudits: 0 })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { userId },
      })
      .returning();
    return profile;
  }

  async updateProfileCredits(userId: string, credits: number): Promise<void> {
    await db.update(userProfiles).set({ credits }).where(eq(userProfiles.userId, userId));
  }

  async updateProfileRole(userId: string, role: string): Promise<void> {
    await db.update(userProfiles).set({ role }).where(eq(userProfiles.userId, userId));
  }

  async updateProfileStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await db.update(userProfiles).set({ stripeCustomerId }).where(eq(userProfiles.userId, userId));
  }

  async updateProfileSubscription(userId: string, plan: string, subscriptionPlan: string): Promise<void> {
    await db.update(userProfiles).set({ plan, subscriptionPlan }).where(eq(userProfiles.userId, userId));
  }

  async incrementTotalAudits(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (profile) {
      await db
        .update(userProfiles)
        .set({ totalAudits: profile.totalAudits + 1 })
        .where(eq(userProfiles.userId, userId));
    }
  }

  async createAudit(audit: InsertSeoAudit): Promise<SeoAudit> {
    const [created] = await db.insert(seoAudits).values(audit).returning();
    return created;
  }

  async getAudit(id: number): Promise<SeoAudit | undefined> {
    const [audit] = await db.select().from(seoAudits).where(eq(seoAudits.id, id));
    return audit;
  }

  async getAuditsByUser(userId: string): Promise<SeoAudit[]> {
    return db.select().from(seoAudits).where(eq(seoAudits.userId, userId)).orderBy(desc(seoAudits.createdAt));
  }

  async updateAudit(id: number, data: Partial<SeoAudit>): Promise<SeoAudit | undefined> {
    const [updated] = await db.update(seoAudits).set(data).where(eq(seoAudits.id, id)).returning();
    return updated;
  }

  async createAuditPage(page: InsertAuditPage): Promise<AuditPage> {
    const [created] = await db.insert(auditPages).values(page).returning();
    return created;
  }

  async createAuditPages(pages: InsertAuditPage[]): Promise<AuditPage[]> {
    if (pages.length === 0) return [];
    const created = await db.insert(auditPages).values(pages).returning();
    return created;
  }

  async getAuditPages(auditId: number): Promise<AuditPage[]> {
    return db.select().from(auditPages).where(eq(auditPages.auditId, auditId));
  }

  async createCreditTransaction(tx: InsertCreditTransaction): Promise<CreditTransaction> {
    const [created] = await db.insert(creditTransactions).values(tx).returning();
    return created;
  }

  async getCreditHistory(userId: string): Promise<CreditTransaction[]> {
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    return db.select().from(userProfiles);
  }

  async getAllAudits(): Promise<SeoAudit[]> {
    return db.select().from(seoAudits).orderBy(desc(seoAudits.createdAt));
  }
}

export const storage = new DatabaseStorage();
