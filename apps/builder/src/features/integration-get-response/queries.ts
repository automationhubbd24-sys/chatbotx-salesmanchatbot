import { integrationGetResponseService } from "@salesmanchatbot.io/business"
import { encryptedDataSchema, encryptUtils } from "@salesmanchatbot.io/encryption"
import { getResponseAuthSchema } from "@salesmanchatbot.io/integration-get-response"

export const getGetResponseAuth = async (workspaceId: string) => {
  const row =
    await integrationGetResponseService.findByWorkspaceIdOrFail(workspaceId)
  const auth = await encryptUtils.decryptObject(
    encryptedDataSchema.parse(row.auth),
    getResponseAuthSchema,
  )
  return { auth, row }
}
