import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { db } from "@chatbotx.io/database/client"
import { secretTextAuthSchema } from "@chatbotx.io/sdk"
import { embed, type EmbeddingModel } from "ai"
import { geminiEmbeddingModels, openaiEmbeddingModels } from "../models"
import { createOpenaiCompatibleEmbeddingModelInstance } from "./openai-compatible"

export type EmbeddingProvider =
  | "embedding"
  | "openai"
  | "openaiCompatible"
  | "gemini"

export type ResolvedEmbeddingModel = {
  model: EmbeddingModel
  provider: EmbeddingProvider
}

export type EmbeddingTestResult = {
  dimensions: number
  durationMs: number
}

export async function testEmbeddingModel(props: {
  model: EmbeddingModel
  value?: string
}): Promise<EmbeddingTestResult> {
  const startedAt = Date.now()
  const result = await embed({
    model: props.model,
    value:
      props.value ??
      "ChatbotX embedding test for product search, semantic matching, and vector retrieval.",
  })

  return {
    dimensions: result.embedding.length,
    durationMs: Date.now() - startedAt,
  }
}

export function createEmbeddingIntegrationModel(props: {
  auth: unknown
  baseURL: string
  model: string
}): EmbeddingModel {
  return createOpenaiCompatibleEmbeddingModelInstance({
    integration: {
      auth: props.auth,
      baseURL: props.baseURL,
      preset: "custom",
    },
    modelId: props.model,
  })
}

export async function resolveEmbeddingModel(
  workspaceId: string,
): Promise<ResolvedEmbeddingModel> {
  const integrationEmbedding = await db.query.integrationEmbeddingModel.findFirst({
    where: {
      workspaceId,
      enabled: true,
    },
  })

  if (integrationEmbedding) {
    return {
      model: createOpenaiCompatibleEmbeddingModelInstance({
        integration: {
          auth: integrationEmbedding.auth,
          baseURL: integrationEmbedding.baseURL,
          preset: "custom",
        },
        modelId: integrationEmbedding.model,
      }),
      provider: "embedding",
    }
  }

  const integrationOpenai = await db.query.integrationOpenaiModel.findFirst({
    where: { workspaceId },
  })

  if (integrationOpenai) {
    const authParsed = secretTextAuthSchema.safeParse(integrationOpenai.auth)
    if (!(authParsed.success && authParsed.data.secretText)) {
      throw new Error("Invalid OpenAI integration auth configuration")
    }

    return {
      model: createOpenAI({ apiKey: authParsed.data.secretText }).embedding(
        openaiEmbeddingModels.enum["text-embedding-ada-002"],
      ),
      provider: "openai",
    }
  }

  const integrationOpenaiCompatible =
    await db.query.integrationOpenaiCompatibleModel.findFirst({
      where: {
        workspaceId,
        enabled: true,
        embeddingModel: { isNotNull: true },
      },
    })

  if (integrationOpenaiCompatible?.embeddingModel?.trim()) {
    return {
      model: createOpenaiCompatibleEmbeddingModelInstance({
        integration: integrationOpenaiCompatible,
        modelId: integrationOpenaiCompatible.embeddingModel.trim(),
      }),
      provider: "openaiCompatible",
    }
  }

  const integrationGemini = await db.query.integrationGeminiModel.findFirst({
    where: { workspaceId },
  })

  if (integrationGemini) {
    const authParsed = secretTextAuthSchema.safeParse(integrationGemini.auth)
    if (!(authParsed.success && authParsed.data.secretText)) {
      throw new Error("Invalid Gemini integration auth configuration")
    }

    return {
      model: createGoogleGenerativeAI({
        apiKey: authParsed.data.secretText,
      }).embedding(geminiEmbeddingModels.enum["gemini-embedding-001"]),
      provider: "gemini",
    }
  }

  throw new Error(
    "No embedding provider configured. Configure the Embedding integration, or connect OpenAI, OpenAI-compatible, or Gemini. DeepSeek and Claude do not support embedding models.",
  )
}
