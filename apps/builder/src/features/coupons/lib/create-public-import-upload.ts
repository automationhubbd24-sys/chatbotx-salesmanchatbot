import { fileService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import {
  fileContextTypes,
  importTypes,
  uploadTypes,
} from "@salesmanchatbot.io/database/partials"
import { uploader } from "@salesmanchatbot.io/filesystem"
import { getUploadHandler } from "@/lib/upload/handlers"

export async function createPublicCouponImportUpload(input: {
  workspaceId: string
  ownerId: string
  fileName: string
  mimeType: "text/csv"
}) {
  const handler = getUploadHandler(uploadTypes.enum.import)
  const result = handler({
    workspaceId: input.workspaceId,
    userId: input.ownerId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    subType: importTypes.enum.coupons,
  })

  if (!result.ok) {
    throw new salesmanChatbotException(result.error, "couponImportUnsupportedFile")
  }

  const uploadUrl = await uploader.getPresignedUpload(result.path)
  const file = await fileService.createPending({
    workspaceId: input.workspaceId,
    userId: input.ownerId,
    contextType: fileContextTypes.enum.import,
    subType: importTypes.enum.coupons,
    path: result.path,
    fileName: input.fileName,
    mimeType: input.mimeType,
  })

  return { fileId: file.id, uploadUrl }
}
