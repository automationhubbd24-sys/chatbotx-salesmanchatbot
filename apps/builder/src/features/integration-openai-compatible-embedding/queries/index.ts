import { integrationOpenaiCompatibleEmbeddingService } from "@chatbotx.io/business"
import {
  mapIntegrationOpenaiCompatibleEmbeddingResource,
  type IntegrationOpenaiCompatibleEmbeddingResource,
} from "../schema/resource"

export const findIntegrationOpenaiCompatibleEmbedding = async ({
  workspaceId,
}: {
  workspaceId: string
}): Promise<IntegrationOpenaiCompatibleEmbeddingResource | null> => {
  const integration =
    await integrationOpenaiCompatibleEmbeddingService.findByWorkspaceId(
      workspaceId,
    )

  return integration
    ? mapIntegrationOpenaiCompatibleEmbeddingResource(integration)
    : null
}
