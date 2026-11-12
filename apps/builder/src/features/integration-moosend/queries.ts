import { integrationMoosendService } from "@salesmanchatbot.io/business"
import { encryptedDataSchema, encryptUtils } from "@salesmanchatbot.io/encryption"
import { moosendAuthSchema } from "@salesmanchatbot.io/integration-moosend"

export const getMoosendAuth = async (workspaceId: string) => {
  const row = await integrationMoosendService.findByWorkspaceId(workspaceId)
  if (!row) {
    return null
  }
  const auth = await encryptUtils.decryptObject(
    encryptedDataSchema.parse(row.auth),
    moosendAuthSchema,
  )
  return { auth, row }
}
