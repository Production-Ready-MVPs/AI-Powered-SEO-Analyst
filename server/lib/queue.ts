import { storage } from "../storage";
import type { SeoAudit } from "@shared/schema";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface AuditJob {
  auditId: number;
  userId: string;
  url: string;
  domain: string;
}

export interface JobProgress {
  stage: "queued" | "crawling" | "analyzing" | "fixing" | "saving" | "done" | "error";
  message: string;
  percent: number;
}

const activeJobs = new Map<number, JobProgress>();
const jobQueue: AuditJob[] = [];
let processing = false;
let onJobReady: (() => void) | null = null;

export function getJobProgress(auditId: number): JobProgress | null {
  return activeJobs.get(auditId) ?? null;
}

export function updateJobProgress(auditId: number, progress: JobProgress): void {
  activeJobs.set(auditId, progress);
  if (progress.stage === "done" || progress.stage === "error") {
    setTimeout(() => activeJobs.delete(auditId), 60_000);
  }
}

export async function enqueueAudit(job: AuditJob): Promise<void> {
  await storage.updateAudit(job.auditId, { status: "pending" });
  updateJobProgress(job.auditId, { stage: "queued", message: "Waiting in queue", percent: 0 });
  jobQueue.push(job);
  if (onJobReady) onJobReady();
}

export function dequeueJob(): AuditJob | undefined {
  return jobQueue.shift();
}

export function queueSize(): number {
  return jobQueue.length;
}

export function setOnJobReady(fn: () => void): void {
  onJobReady = fn;
}
