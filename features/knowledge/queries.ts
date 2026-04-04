import "server-only";

import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";
import { knowledgeFaqs, knowledgeFiles } from "@/lib/db/schema";
import type {
  DashboardKnowledgeData,
  DashboardKnowledgeSummary,
  WorkspaceKnowledgeContext,
} from "@/features/knowledge/types";
import {
  getWorkspaceKnowledgeCacheTags,
  settingsWorkspaceCacheLife,
} from "@/lib/cache/workspace-tags";
import {
  buildWorkspaceKnowledgeCombinedText,
  normalizeExtractedKnowledgeText,
} from "@/features/knowledge/utils";

export async function getKnowledgeDashboardData(
  workspaceId: string,
): Promise<DashboardKnowledgeData> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceKnowledgeCacheTags(workspaceId));

  const [files, faqs] = await Promise.all([
    db
      .select({
        id: knowledgeFiles.id,
        title: knowledgeFiles.title,
        fileName: knowledgeFiles.fileName,
        contentType: knowledgeFiles.contentType,
        fileSize: knowledgeFiles.fileSize,
        extractedText: knowledgeFiles.extractedText,
        createdAt: knowledgeFiles.createdAt,
      })
      .from(knowledgeFiles)
      .where(eq(knowledgeFiles.workspaceId, workspaceId))
      .orderBy(desc(knowledgeFiles.createdAt)),
    db
      .select({
        id: knowledgeFaqs.id,
        question: knowledgeFaqs.question,
        answer: knowledgeFaqs.answer,
        position: knowledgeFaqs.position,
        createdAt: knowledgeFaqs.createdAt,
        updatedAt: knowledgeFaqs.updatedAt,
      })
      .from(knowledgeFaqs)
      .where(eq(knowledgeFaqs.workspaceId, workspaceId))
      .orderBy(asc(knowledgeFaqs.position), asc(knowledgeFaqs.createdAt)),
  ]);

  return {
    files,
    faqs,
  };
}

export async function getKnowledgeSummaryForWorkspace(
  workspaceId: string,
): Promise<DashboardKnowledgeSummary> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceKnowledgeCacheTags(workspaceId));

  const [[fileSummary], [faqSummary]] = await Promise.all([
    db
      .select({
        fileCount: count(knowledgeFiles.id),
        readyFileCount: sql<number>`count(case when ${knowledgeFiles.extractedText} is not null and length(trim(${knowledgeFiles.extractedText})) > 0 then 1 end)`,
      })
      .from(knowledgeFiles)
      .where(eq(knowledgeFiles.workspaceId, workspaceId)),
    db
      .select({
        faqCount: count(knowledgeFaqs.id),
      })
      .from(knowledgeFaqs)
      .where(eq(knowledgeFaqs.workspaceId, workspaceId)),
  ]);

  return {
    fileCount: fileSummary?.fileCount ?? 0,
    faqCount: faqSummary?.faqCount ?? 0,
    readyFileCount: fileSummary?.readyFileCount ?? 0,
  };
}

export async function buildWorkspaceKnowledgeContext(
  workspaceId: string,
): Promise<WorkspaceKnowledgeContext> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceKnowledgeCacheTags(workspaceId));

  const [faqs, fileRows] = await Promise.all([
    db
      .select({
        id: knowledgeFaqs.id,
        question: knowledgeFaqs.question,
        answer: knowledgeFaqs.answer,
        position: knowledgeFaqs.position,
      })
      .from(knowledgeFaqs)
      .where(eq(knowledgeFaqs.workspaceId, workspaceId))
      .orderBy(asc(knowledgeFaqs.position), asc(knowledgeFaqs.createdAt)),
    db
      .select({
        id: knowledgeFiles.id,
        title: knowledgeFiles.title,
        fileName: knowledgeFiles.fileName,
        contentType: knowledgeFiles.contentType,
        createdAt: knowledgeFiles.createdAt,
        extractedText: knowledgeFiles.extractedText,
      })
      .from(knowledgeFiles)
      .where(
        and(
          eq(knowledgeFiles.workspaceId, workspaceId),
          isNotNull(knowledgeFiles.extractedText),
        ),
      )
      .orderBy(desc(knowledgeFiles.createdAt)),
  ]);

  const files = fileRows
    .map((file) => ({
      ...file,
      extractedText: normalizeExtractedKnowledgeText(file.extractedText ?? ""),
    }))
    .filter((file) => Boolean(file.extractedText));

  return {
    faqs,
    files,
    combinedText: buildWorkspaceKnowledgeCombinedText(faqs, files),
  };
}
