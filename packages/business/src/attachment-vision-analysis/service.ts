import {
  type AttachmentVisionAnalysisKey,
  createAttachmentVisionAnalysis,
  findAttachmentVisionAnalysis,
} from "@chatbotx.io/database/repositories"

type AttachmentVisionAnalysisInput = AttachmentVisionAnalysisKey

class AttachmentVisionAnalysisService {
  async find(input: AttachmentVisionAnalysisInput) {
    return await findAttachmentVisionAnalysis(input)
  }

  async save(input: AttachmentVisionAnalysisInput & { analysis: string }) {
    const created = await createAttachmentVisionAnalysis(input)
    if (created) {
      return created
    }

    return await findAttachmentVisionAnalysis(input)
  }
}

export const attachmentVisionAnalysisService =
  new AttachmentVisionAnalysisService()
