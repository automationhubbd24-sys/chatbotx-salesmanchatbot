import { createHash } from "node:crypto"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { type DatabaseClient, db } from "@chatbotx.io/database/client"
import { productEmbeddingRepository } from "@chatbotx.io/database/repositories"
import { secretTextAuthSchema } from "@chatbotx.io/sdk"
import { type EmbeddingModel, embed } from "ai"

export const PRODUCT_EMBEDDING_DIMENSIONS = 3072
export const PRODUCT_VECTOR_MAX_DISTANCE = 0.4
export const PRODUCT_VECTOR_LOW_RESULT_COUNT = 3
export const PRODUCT_VECTOR_EXTRA_LIMIT = 10

type ProductEmbeddingModel = {
  model: EmbeddingModel
  modelId: string
  provider: string
}

export class ProductEmbeddingConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProductEmbeddingConfigurationError"
  }
}

export const isProductEmbeddingConfigurationError = (
  error: unknown,
): error is ProductEmbeddingConfigurationError =>
  error instanceof ProductEmbeddingConfigurationError

export function hashProductEmbeddingContent(content: string) {
  return createHash("sha256").update(content).digest("hex")
}

function parseApiKey(auth: unknown, provider: string) {
  const authParsed = secretTextAuthSchema.safeParse(auth)
  if (!(authParsed.success && authParsed.data.secretText)) {
    throw new ProductEmbeddingConfigurationError(
      `Invalid ${provider} integration auth configuration`,
    )
  }
  return authParsed.data.secretText
}

async function resolveProductEmbeddingModel(
  workspaceId: string,
): Promise<ProductEmbeddingModel> {
  const integrationOpenaiCompatibleEmbedding =
    await db.query.integrationOpenaiCompatibleEmbeddingModel.findFirst({
      where: { workspaceId, enabled: true },
    })
  if (integrationOpenaiCompatibleEmbedding) {
    const modelId = integrationOpenaiCompatibleEmbedding.embeddingModel.trim()
    return {
      model: createOpenAICompatible({
        name: "openai-compatible-embedding",
        baseURL: integrationOpenaiCompatibleEmbedding.baseURL,
        apiKey: parseApiKey(
          integrationOpenaiCompatibleEmbedding.auth,
          "OpenAI-compatible text embedding",
        ),
      }).embeddingModel(modelId),
      modelId,
      provider: "openaiCompatibleEmbedding",
    }
  }

  const integrationOpenai = await db.query.integrationOpenaiModel.findFirst({
    where: { workspaceId },
  })
  if (integrationOpenai) {
    const modelId = "text-embedding-3-large"
    return {
      model: createOpenAI({
        apiKey: parseApiKey(integrationOpenai.auth, "OpenAI"),
      }).embedding(modelId),
      modelId,
      provider: "openai",
    }
  }

  const integrationGemini = await db.query.integrationGeminiModel.findFirst({
    where: { workspaceId },
  })
  if (integrationGemini) {
    const modelId = "gemini-embedding-001"
    return {
      model: createGoogleGenerativeAI({
        apiKey: parseApiKey(integrationGemini.auth, "Gemini"),
      }).embedding(modelId),
      modelId,
      provider: "gemini",
    }
  }

  throw new ProductEmbeddingConfigurationError(
    "No embedding provider configured for product search",
  )
}

export async function createProductQueryEmbedding(input: {
  workspaceId: string
  query: string
}) {
  const resolved = await resolveProductEmbeddingModel(input.workspaceId)
  const { embedding } = await embed({
    model: resolved.model,
    value: input.query,
    ...(resolved.provider === "gemini"
      ? {
          providerOptions: {
            google: { outputDimensionality: PRODUCT_EMBEDDING_DIMENSIONS },
          },
        }
      : {}),
  })
  if (embedding.length !== PRODUCT_EMBEDDING_DIMENSIONS) {
    throw new ProductEmbeddingConfigurationError(
      `Product embedding model returned ${embedding.length} dimensions; expected ${PRODUCT_EMBEDDING_DIMENSIONS}`,
    )
  }
  return { embedding, model: `${resolved.provider}:${resolved.modelId}` }
}

export async function upsertProductEmbedding(
  input: {
    productId: string
    workspaceId: string
    content: string
    contentHash: string
    model: string
    dimensions: number
    embedding: number[]
  },
  tx?: DatabaseClient,
) {
  if (
    input.dimensions !== PRODUCT_EMBEDDING_DIMENSIONS ||
    input.embedding.length !== PRODUCT_EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Product embedding dimensions must equal ${PRODUCT_EMBEDDING_DIMENSIONS}`,
    )
  }
  const existing = await productEmbeddingRepository.findCurrent(
    {
      productId: input.productId,
      workspaceId: input.workspaceId,
      contentHash: input.contentHash,
      model: input.model,
    },
    tx,
  )
  if (existing) {
    return true
  }
  await productEmbeddingRepository.upsert(input, tx)
  return true
}

export async function deleteProductEmbeddings(
  input: { workspaceId: string; productIds: string[] },
  tx?: DatabaseClient,
) {
  await productEmbeddingRepository.deleteByProductIds(input, tx)
}

export async function searchProductEmbeddings(input: {
  workspaceId: string
  categoryId?: string | null
  embedding?: number[]
  limit?: number
}) {
  if (
    !input.embedding ||
    input.embedding.length !== PRODUCT_EMBEDDING_DIMENSIONS
  ) {
    return []
  }
  return await productEmbeddingRepository.search({
    workspaceId: input.workspaceId,
    categoryId: input.categoryId,
    embedding: input.embedding,
    limit: (input.limit ?? 5) + PRODUCT_VECTOR_EXTRA_LIMIT,
    maxDistance: PRODUCT_VECTOR_MAX_DISTANCE,
  })
}

export async function refreshProductEmbedding(input: {
  workspaceId: string
  product: { id: string }
  content: string
}) {
  const contentHash = hashProductEmbeddingContent(input.content)
  const resolved = await createProductQueryEmbedding({
    workspaceId: input.workspaceId,
    query: input.content,
  })
  return await upsertProductEmbedding({
    productId: input.product.id,
    workspaceId: input.workspaceId,
    content: input.content,
    contentHash,
    model: resolved.model,
    dimensions: resolved.embedding.length,
    embedding: resolved.embedding,
  })
}
