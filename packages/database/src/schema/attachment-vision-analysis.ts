import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"
import { sharedColumns } from "../partials/shared"

export const attachmentVisionAnalysisModel = pgTable(
  "AttachmentVisionAnalysis",
  {
    ...sharedColumns,
    workspaceId: text().notNull(),
    conversationId: text().notNull(),
    attachmentId: text().notNull(),
    promptHash: text().notNull(),
    provider: text().notNull(),
    modelId: text().notNull(),
    analysis: text().notNull(),
  },
  (table) => [
    uniqueIndex(
      "AttachmentVisionAnalysis_workspace_attachment_prompt_provider_model_key",
    ).on(
      table.workspaceId,
      table.attachmentId,
      table.promptHash,
      table.provider,
      table.modelId,
    ),
    index("AttachmentVisionAnalysis_workspace_attachment_idx").on(
      table.workspaceId,
      table.attachmentId,
    ),
    index("AttachmentVisionAnalysis_workspace_conversation_idx").on(
      table.workspaceId,
      table.conversationId,
    ),
  ],
)
