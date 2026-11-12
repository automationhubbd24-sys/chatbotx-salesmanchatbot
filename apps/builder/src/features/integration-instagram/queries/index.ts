import { instagramIntegrationService } from "@salesmanchatbot.io/business"
import { findOrFail } from "@salesmanchatbot.io/database/client"
import { integrationInstagramModel } from "@salesmanchatbot.io/database/schema"
import type { IntegrationInstagramModel } from "@salesmanchatbot.io/database/types"

export const findIntegrationInstagram = async (where: {
  workspaceId: string
  id: string
}): Promise<IntegrationInstagramModel> =>
  findOrFail({
    table: integrationInstagramModel,
    where,
  })

export const listIntegrationInstagrams = async ({
  workspaceId,
}: {
  workspaceId: string
}): Promise<{ data: IntegrationInstagramModel[] }> => {
  const data = await instagramIntegrationService.listByWorkspaceId(workspaceId)

  return { data }
}
