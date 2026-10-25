import { and, db, eq } from "@chatbotx.io/database/client"
import {
  integrationModel,
  integrationOpenaiCompatibleEmbeddingModel,
} from "@chatbotx.io/database/schema"
import { AuthType, type SecretTextAuthValue } from "@chatbotx.io/sdk"
import { createId } from "@chatbotx.io/utils"
import { BaseService } from "../base.service"
import { productService } from "../product"
import { validateOpenaiCompatibleBaseUrlForEnvironment } from "../integration-openai-compatible/validate-base-url"

export type ConnectOpenaiCompatibleEmbeddingInput = {
  workspaceId: string
  apiKey: string
  baseURL: string
  embeddingModel: string
  enabled?: boolean
}

export type UpdateOpenaiCompatibleEmbeddingInput = Partial<
  Omit<ConnectOpenaiCompatibleEmbeddingInput, "workspaceId">
>

class IntegrationOpenaiCompatibleEmbeddingService extends BaseService {
  findByWorkspaceId(workspaceId: string) {
    return db.query.integrationOpenaiCompatibleEmbeddingModel.findFirst({
      where: { workspaceId },
    })
  }

  async connect(input: ConnectOpenaiCompatibleEmbeddingInput) {
    const existing = await this.findByWorkspaceId(input.workspaceId)
    const baseURL = await validateOpenaiCompatibleBaseUrlForEnvironment(
      input.baseURL,
    )
    const embeddingModel = input.embeddingModel.trim()

    if (existing) {
      await db
        .update(integrationOpenaiCompatibleEmbeddingModel)
        .set({
          auth: this.createAuth(input.apiKey),
          baseURL,
          embeddingModel,
          enabled: input.enabled ?? true,
        })
        .where(
          and(
            eq(integrationOpenaiCompatibleEmbeddingModel.id, existing.id),
            eq(
              integrationOpenaiCompatibleEmbeddingModel.workspaceId,
              input.workspaceId,
            ),
          ),
        )
    } else {
      await db.transaction(async (tx) => {
        const [integration] = await tx
          .insert(integrationModel)
          .values({
            id: createId(),
            workspaceId: input.workspaceId,
            integrationType: "openaiCompatibleEmbedding",
          })
          .returning()

        if (!integration) {
          throw new Error("Failed to create integration record")
        }

        await tx.insert(integrationOpenaiCompatibleEmbeddingModel).values({
          id: createId(),
          auth: this.createAuth(input.apiKey),
          baseURL,
          embeddingModel,
          enabled: input.enabled ?? true,
          integrationId: integration.id,
          workspaceId: input.workspaceId,
        })
      })
    }

    await this.audit(
      existing ? "update" : "connect",
      existing
        ? "updated the OpenAI-compatible text embedding integration configuration"
        : "connected a new OpenAI-compatible text embedding integration",
    )
    await productService.scheduleEmbeddingRefreshPage({
      workspaceId: input.workspaceId,
    })
  }

  async update(
    workspaceId: string,
    data: UpdateOpenaiCompatibleEmbeddingInput,
  ) {
    const existing = await this.findByWorkspaceId(workspaceId)
    if (!existing) {
      throw new Error("OpenAI-compatible text embedding integration not found")
    }

    const { apiKey, baseURL: rawBaseURL, embeddingModel, ...rest } = data
    const baseURL =
      rawBaseURL === undefined
        ? undefined
        : await validateOpenaiCompatibleBaseUrlForEnvironment(rawBaseURL)

    await db
      .update(integrationOpenaiCompatibleEmbeddingModel)
      .set({
        ...rest,
        ...(baseURL === undefined ? {} : { baseURL }),
        ...(embeddingModel === undefined
          ? {}
          : { embeddingModel: embeddingModel.trim() }),
        ...(apiKey === undefined ? {} : { auth: this.createAuth(apiKey) }),
      })
      .where(
        and(
          eq(integrationOpenaiCompatibleEmbeddingModel.id, existing.id),
          eq(integrationOpenaiCompatibleEmbeddingModel.workspaceId, workspaceId),
        ),
      )

    await this.audit(
      "update",
      "updated the OpenAI-compatible text embedding integration configuration",
    )
    await productService.scheduleEmbeddingRefreshPage({ workspaceId })
  }

  async disconnect(workspaceId: string) {
    const existing = await this.findByWorkspaceId(workspaceId)
    if (!existing) {
      return
    }

    await db
      .delete(integrationModel)
      .where(eq(integrationModel.id, existing.integrationId))

    await this.audit(
      "disconnect",
      "disconnected the OpenAI-compatible text embedding integration",
    )
    await productService.scheduleEmbeddingRefreshPage({ workspaceId })
  }

  private createAuth(apiKey: string): SecretTextAuthValue {
    return {
      authType: AuthType.secretText,
      secretText: apiKey.trim(),
    }
  }
}

export const integrationOpenaiCompatibleEmbeddingService =
  new IntegrationOpenaiCompatibleEmbeddingService()
