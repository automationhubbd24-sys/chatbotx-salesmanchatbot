import { buildContext, integrationKlaviyoService } from "@salesmanchatbot.io/business"
import { encryptedDataSchema, encryptUtils } from "@salesmanchatbot.io/encryption"
import { klaviyoAuthSchema } from "@salesmanchatbot.io/integration-klaviyo"

export const getKlaviyoContext = async (workspaceId: string) => {
  const row =
    await integrationKlaviyoService.findByWorkspaceIdOrFail(workspaceId)
  const auth = await encryptUtils.decryptObject(
    encryptedDataSchema.parse(row.auth),
    klaviyoAuthSchema,
  )
  return buildContext({
    workspaceId,
    integrationType: "klaviyo",
    integration: { ...row, auth },
  })
}
