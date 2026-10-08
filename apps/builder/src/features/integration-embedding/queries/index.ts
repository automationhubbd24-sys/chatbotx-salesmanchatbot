import { integrationEmbeddingService } from "@chatbotx.io/business"
import {
  type IntegrationEmbeddingResource,
  mapIntegrationEmbeddingResource,
} from "../schema/resource"

export const findIntegrationEmbedding = async ({
  workspaceId,
}: {
  workspaceId: string
}): Promise<IntegrationEmbeddingResource | null> => {
  const integration = await integrationEmbeddingService.findByWorkspaceId(
    workspaceId,
  )

  return integration ? mapIntegrationEmbeddingResource(integration) : null
}
