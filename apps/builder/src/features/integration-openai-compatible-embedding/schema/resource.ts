import type { IntegrationOpenaiCompatibleEmbeddingModel } from "@chatbotx.io/database/types"

export type IntegrationOpenaiCompatibleEmbeddingResource = Pick<
  IntegrationOpenaiCompatibleEmbeddingModel,
  | "id"
  | "workspaceId"
  | "baseURL"
  | "embeddingModel"
  | "enabled"
  | "createdAt"
  | "updatedAt"
>

export const mapIntegrationOpenaiCompatibleEmbeddingResource = (
  integration: IntegrationOpenaiCompatibleEmbeddingModel,
): IntegrationOpenaiCompatibleEmbeddingResource => ({
  id: integration.id,
  workspaceId: integration.workspaceId,
  baseURL: integration.baseURL,
  embeddingModel: integration.embeddingModel,
  enabled: integration.enabled,
  createdAt: integration.createdAt,
  updatedAt: integration.updatedAt,
})
