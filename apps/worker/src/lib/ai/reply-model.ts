import {
  type AIProviderInstance,
  createAIProviderInstance,
  createOpenaiCompatibleModelInstance,
  getAIIntegrationInDB,
  getOpenaiCompatibleAutoReplyIntegrationInDB,
} from "@chatbotx.io/ai/server"
import { integrationOpenaiCompatibleService } from "@chatbotx.io/business"
import type {
  AIAgentModelConfig,
  AIAgentOpenaiCompatibleProviderModel,
  AIAgentProvider,
} from "@chatbotx.io/database/partials"
import type { LanguageModel } from "ai"
import { logger } from "../logger"

export type ReplyAIProvider = AIAgentProvider | "openaiCompatible"

export function isOpenaiCompatibleProviderModel(
  providerInfo: AIAgentModelConfig,
): providerInfo is AIAgentOpenaiCompatibleProviderModel {
  return "kind" in providerInfo && providerInfo.kind === "openaiCompatible"
}

export function getProviderName(
  providerInfo: AIAgentModelConfig,
): ReplyAIProvider {
  return isOpenaiCompatibleProviderModel(providerInfo)
    ? "openaiCompatible"
    : providerInfo.provider
}

export async function createReplyModel(props: {
  providerInfo: AIAgentModelConfig
  workspaceId: string
}): Promise<null | {
  model: LanguageModel
  providerInstance?: AIProviderInstance
  streaming?: boolean
}> {
  const { providerInfo, workspaceId } = props

  if (isOpenaiCompatibleProviderModel(providerInfo)) {
    const configuredIntegration =
      await integrationOpenaiCompatibleService.findByWorkspaceIdAndId({
        workspaceId,
        id: providerInfo.integrationId,
      })
    const integration =
      configuredIntegration?.enabled && configuredIntegration.autoReply
        ? configuredIntegration
        : await getOpenaiCompatibleAutoReplyIntegrationInDB({ workspaceId })

    if (!integration) {
      logger.info(
        {
          workspaceId,
          provider: "openaiCompatible",
          modelId: providerInfo.model,
          integrationId: providerInfo.integrationId,
          integrationFound: Boolean(configuredIntegration),
          enabled: configuredIntegration?.enabled ?? null,
          autoReply: configuredIntegration?.autoReply ?? null,
        },
        "[automated-response] provider skipped: no auto-reply-enabled integration found",
      )
      return null
    }

    logger.info(
      {
        workspaceId,
        provider: "openaiCompatible",
        modelId: providerInfo.model,
        integrationId: integration.id,
        integrationName: integration.name,
        preset: integration.preset,
        usedCurrentAutoReplyIntegration:
          integration.id !== providerInfo.integrationId,
      },
      "[automated-response] provider model resolved",
    )

    return {
      model: createOpenaiCompatibleModelInstance({
        integration,
        modelId: providerInfo.model,
      }),
      streaming: integration.streaming,
    }
  }

  const integration = await getAIIntegrationInDB({
    workspaceId,
    provider: providerInfo.provider,
    autoReply: true,
  })

  if (!integration) {
    logger.info(
      {
        workspaceId,
        provider: providerInfo.provider,
        modelId: providerInfo.model,
      },
      "[automated-response] provider skipped: no auto-reply-enabled integration found",
    )
    return null
  }

  logger.info(
    {
      workspaceId,
      provider: providerInfo.provider,
      modelId: providerInfo.model,
      integrationId: integration.id,
    },
    "[automated-response] provider model resolved",
  )

  const providerInstance = createAIProviderInstance({
    model: integration,
    provider: providerInfo.provider,
  })

  return {
    model: providerInstance(providerInfo.model),
    providerInstance,
  }
}
