import { and, db, eq } from "@chatbotx.io/database/client"
import {
  integrationEmbeddingModel,
  integrationModel,
} from "@chatbotx.io/database/schema"
import { AuthType, type SecretTextAuthValue } from "@chatbotx.io/sdk"
import { createId } from "@chatbotx.io/utils"
import { BaseService } from "../base.service"
import {
  normalizeOpenaiCompatibleBaseUrl,
  validateOpenaiCompatibleBaseUrlForEnvironment,
} from "../integration-openai-compatible/validate-base-url"

export type ConnectIntegrationEmbeddingInput = {
  workspaceId: string
  baseURL: string
  model: string
  apiKey: string
  enabled?: boolean
}

export type UpdateIntegrationEmbeddingInput = Partial<
  Omit<ConnectIntegrationEmbeddingInput, "workspaceId">
>

class IntegrationEmbeddingService extends BaseService {
  findByWorkspaceId(workspaceId: string) {
    return db.query.integrationEmbeddingModel.findFirst({
      where: { workspaceId },
    })
  }

  async connect(props: ConnectIntegrationEmbeddingInput) {
    const auth = this.createAuth(props.apiKey)
    const baseURL = await validateOpenaiCompatibleBaseUrlForEnvironment(
      props.baseURL,
    )
    const existing = await this.findByWorkspaceId(props.workspaceId)

    if (existing) {
      await db
        .update(integrationEmbeddingModel)
        .set({
          auth,
          baseURL,
          enabled: props.enabled ?? true,
          model: props.model,
        })
        .where(eq(integrationEmbeddingModel.id, existing.id))
      await this.audit("update", "updated the embedding integration")
      return
    }

    await db.transaction(async (tx) => {
      const [integration] = await tx
        .insert(integrationModel)
        .values({
          id: createId(),
          workspaceId: props.workspaceId,
          integrationType: "embedding",
        })
        .returning()

      if (!integration) {
        throw new Error("Failed to create integration record")
      }

      await tx.insert(integrationEmbeddingModel).values({
        id: createId(),
        auth,
        baseURL,
        enabled: props.enabled ?? true,
        integrationId: integration.id,
        model: props.model,
        workspaceId: props.workspaceId,
      })
    })

    await this.audit("connect", "connected a new embedding integration")
  }

  async update(workspaceId: string, data: UpdateIntegrationEmbeddingInput) {
    const existing = await this.findByWorkspaceId(workspaceId)
    if (!existing) {
      throw new Error("Embedding integration not found")
    }

    const { apiKey, baseURL: rawBaseURL, ...rest } = data
    let baseURL: string | undefined
    if (rawBaseURL !== undefined) {
      const normalizedBaseUrl = normalizeOpenaiCompatibleBaseUrl(rawBaseURL)
      baseURL =
        normalizedBaseUrl === existing.baseURL
          ? normalizedBaseUrl
          : await validateOpenaiCompatibleBaseUrlForEnvironment(
              normalizedBaseUrl,
            )
    }

    await db
      .update(integrationEmbeddingModel)
      .set({
        ...rest,
        ...(baseURL === undefined ? {} : { baseURL }),
        ...(apiKey === undefined ? {} : { auth: this.createAuth(apiKey) }),
      })
      .where(
        and(
          eq(integrationEmbeddingModel.id, existing.id),
          eq(integrationEmbeddingModel.workspaceId, workspaceId),
        ),
      )

    await this.audit("update", "updated the embedding integration")
  }

  async disconnect(workspaceId: string) {
    const existing = await this.findByWorkspaceId(workspaceId)
    if (!existing) {
      return
    }
    await db
      .delete(integrationModel)
      .where(eq(integrationModel.id, existing.integrationId))

    await this.audit("disconnect", "disconnected the embedding integration")
  }

  private createAuth(apiKey?: string | null): SecretTextAuthValue | null {
    const secretText = apiKey?.trim()
    if (!secretText) {
      return null
    }
    return {
      authType: AuthType.secretText,
      secretText,
    }
  }
}

export const integrationEmbeddingService = new IntegrationEmbeddingService()
