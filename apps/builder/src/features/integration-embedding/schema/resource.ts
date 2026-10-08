import type { IntegrationEmbeddingModel } from "@chatbotx.io/database/types"

export type IntegrationEmbeddingResource = Pick<
  IntegrationEmbeddingModel,
  | "id"
  | "workspaceId"
  | "baseURL"
  | "dimensions"
  | "enabled"
  | "model"
  | "createdAt"
  | "updatedAt"
>

export function mapIntegrationEmbeddingResource(
  integration: IntegrationEmbeddingModel,
): IntegrationEmbeddingResource {
  return {
    id: integration.id,
    workspaceId: integration.workspaceId,
    baseURL: integration.baseURL,
    dimensions: integration.dimensions,
    enabled: integration.enabled,
    model: integration.model,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  }
}
