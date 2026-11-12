import { integrationMailerLiteService } from "@salesmanchatbot.io/business"
import { encryptedDataSchema, encryptUtils } from "@salesmanchatbot.io/encryption"
import { mailerLiteAuthSchema } from "@salesmanchatbot.io/integration-mailer-lite"

export const getMailerLiteAuth = async (workspaceId: string) => {
  const row =
    await integrationMailerLiteService.findByWorkspaceIdOrFail(workspaceId)
  const auth = await encryptUtils.decryptObject(
    encryptedDataSchema.parse(row.auth),
    mailerLiteAuthSchema,
  )
  return { auth, row }
}
