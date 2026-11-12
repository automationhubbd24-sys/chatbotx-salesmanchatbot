import { buildContext, integrationDripService } from "@salesmanchatbot.io/business"
import { encryptedDataSchema, encryptUtils } from "@salesmanchatbot.io/encryption"
import { dripAuthSchema } from "@salesmanchatbot.io/integration-drip"

const getDripAuth = async (workspaceId: string) => {
  const row = await integrationDripService.findByWorkspaceIdOrFail(workspaceId)
  const auth = await encryptUtils.decryptObject(
    encryptedDataSchema.parse(row.auth),
    dripAuthSchema,
  )
  return { auth, row }
}

export const getDripContext = async (workspaceId: string) => {
  const { auth, row } = await getDripAuth(workspaceId)
  return buildContext({
    workspaceId,
    integrationType: "drip",
    integration: { ...row, auth },
  })
}
