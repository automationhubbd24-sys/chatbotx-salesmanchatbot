import { createConversationSourceRepository } from "@chatbotx.io/database/repositories"
import type { AttachmentModel } from "@chatbotx.io/database/types"
import { IMAGE_MIME_TYPES } from "@chatbotx.io/sdk"
import type { ResolveConversationSourceInput } from "./types"

const SUPPORTED_IMAGE_MIME_TYPES = new Set<string>(IMAGE_MIME_TYPES)
const IMAGE_ATTACHMENT_LOOKUP_LIMIT = 50

const sourceRepo = createConversationSourceRepository()

function normalizeMimeType(value: string): string {
  return value.toLowerCase().split(";")[0]?.trim() ?? ""
}

export function isSupportedImageMimeType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.has(normalizeMimeType(mimeType))
}

export type ImageAttachmentResolution =
  | { attachment: AttachmentModel; status: "selected" }
  | { attachments: AttachmentModel[]; status: "selected_batch" }
  | {
      candidateCount: number
      context: "conversation"
      status: "ambiguous"
    }
  | { status: "not_found" }

export async function resolveImageAttachment(
  input: ResolveConversationSourceInput,
): Promise<ImageAttachmentResolution> {
  const allAttachments = await sourceRepo.findAttachmentsByConversation({
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    limit: IMAGE_ATTACHMENT_LOOKUP_LIMIT,
  })

  const attachments = allAttachments.filter((attachment) =>
    isSupportedImageMimeType(attachment.mimeType),
  )
  const triggerAttachments = input.messageId
    ? attachments.filter((attachment) => attachment.messageId === input.messageId)
    : []

  if (triggerAttachments.length === 1) {
    return { attachment: triggerAttachments[0], status: "selected" }
  }

  if (triggerAttachments.length > 1) {
    return { attachments: triggerAttachments, status: "selected_batch" }
  }

  if (attachments.length === 1) {
    return { attachment: attachments[0], status: "selected" }
  }

  if (attachments.length > 1) {
    return {
      candidateCount: attachments.length,
      context: "conversation",
      status: "ambiguous",
    }
  }

  return { status: "not_found" }
}
