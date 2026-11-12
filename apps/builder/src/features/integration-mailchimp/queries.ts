import { integrationMailchimpService } from "@salesmanchatbot.io/business"
import { encryptedDataSchema, encryptUtils } from "@salesmanchatbot.io/encryption"
import { mailchimpAuthSchema } from "@salesmanchatbot.io/integration-mailchimp"

export const getMailchimpAuth = async (workspaceId: string) => {
  const row =
    await integrationMailchimpService.findByWorkspaceIdOrFail(workspaceId)
  const auth = await encryptUtils.decryptObject(
    encryptedDataSchema.parse(row.auth),
    mailchimpAuthSchema,
  )
  return { auth, row }
}
