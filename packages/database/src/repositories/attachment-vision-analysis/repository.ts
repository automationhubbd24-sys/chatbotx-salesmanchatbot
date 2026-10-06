import { and, db, eq } from "../../client"
import { attachmentVisionAnalysisModel } from "../../schema"

export type AttachmentVisionAnalysisKey = {
  workspaceId: string
  conversationId: string
  attachmentId: string
  promptHash: string
  provider: string
  modelId: string
}

const keyFilter = (key: AttachmentVisionAnalysisKey) =>
  and(
    eq(attachmentVisionAnalysisModel.workspaceId, key.workspaceId),
    eq(attachmentVisionAnalysisModel.conversationId, key.conversationId),
    eq(attachmentVisionAnalysisModel.attachmentId, key.attachmentId),
    eq(attachmentVisionAnalysisModel.promptHash, key.promptHash),
    eq(attachmentVisionAnalysisModel.provider, key.provider),
    eq(attachmentVisionAnalysisModel.modelId, key.modelId),
  )

export async function findAttachmentVisionAnalysis(
  key: AttachmentVisionAnalysisKey,
) {
  const [analysis] = await db
    .select()
    .from(attachmentVisionAnalysisModel)
    .where(keyFilter(key))
    .limit(1)

  return analysis ?? null
}

export async function createAttachmentVisionAnalysis(
  input: AttachmentVisionAnalysisKey & { analysis: string },
) {
  const [created] = await db
    .insert(attachmentVisionAnalysisModel)
    .values(input)
    .onConflictDoNothing({
      target: [
        attachmentVisionAnalysisModel.workspaceId,
        attachmentVisionAnalysisModel.attachmentId,
        attachmentVisionAnalysisModel.promptHash,
        attachmentVisionAnalysisModel.provider,
        attachmentVisionAnalysisModel.modelId,
      ],
    })
    .returning()

  return created ?? null
}
