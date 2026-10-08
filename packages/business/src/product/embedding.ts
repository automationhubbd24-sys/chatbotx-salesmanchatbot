import type { DatabaseClient } from "@chatbotx.io/database/client"
import { productEmbeddingRepository } from "@chatbotx.io/database/repositories"
import { createHash } from "node:crypto"
import type { ProductAgentSearchInput } from "./service"

export const PRODUCT_EMBEDDING_DIMENSIONS = 3072
export const PRODUCT_VECTOR_MAX_DISTANCE = 0.4
export const PRODUCT_VECTOR_LOW_RESULT_COUNT = 3
export const PRODUCT_VECTOR_EXTRA_LIMIT = 10

export type ProductEmbeddingRefreshInput = {
  productId: string
  workspaceId: string
  content: string
  contentHash: string
  model: string
  dimensions: number
  embedding: number[]
}

export function hashProductEmbeddingContent(content: string) {
  return createHash("sha256").update(content).digest("hex")
}

export async function upsertProductEmbedding(
  input: ProductEmbeddingRefreshInput,
  tx?: DatabaseClient,
) {
  if (input.dimensions !== PRODUCT_EMBEDDING_DIMENSIONS) {
    return false
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
  input: {
    workspaceId: string
    productIds: string[]
  },
  tx?: DatabaseClient,
) {
  await productEmbeddingRepository.deleteByProductIds(input, tx)
}

export async function searchProductEmbeddings(
  input: ProductAgentSearchInput & { embedding?: number[] },
) {
  if (!input.embedding || input.embedding.length !== PRODUCT_EMBEDDING_DIMENSIONS) {
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
