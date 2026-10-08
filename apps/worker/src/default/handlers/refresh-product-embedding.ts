import {
  PRODUCT_EMBEDDING_DIMENSIONS,
  productService,
  upsertProductEmbedding,
} from "@chatbotx.io/business"
import { embed } from "ai"
import { normalizeError } from "universal-error-normalizer"
import { resolveEmbeddingModel } from "../../ai-agent/lib/embedding-model"
import { logger } from "../../lib/logger"

export async function refreshProductEmbedding(input: {
  workspaceId: string
  productIds?: string[]
}) {
  const products = await productService.listForEmbeddingRefresh(input)
  if (products.length === 0) {
    logger.info(
      { workspaceId: input.workspaceId, productIds: input.productIds ?? [] },
      "[ecommerce] product embedding refresh skipped",
    )
    return
  }

  const { model, provider } = await resolveEmbeddingModel(input.workspaceId)
  let refreshedCount = 0
  let skippedCount = 0

  for (const { product, content, contentHash } of products) {
    try {
      const { embedding } = await embed({
        model,
        value: content,
        providerOptions: {
          google: { outputDimensionality: PRODUCT_EMBEDDING_DIMENSIONS },
        },
      })

      if (embedding.length !== PRODUCT_EMBEDDING_DIMENSIONS) {
        skippedCount += 1
        logger.warn(
          {
            workspaceId: input.workspaceId,
            productId: product.id,
            provider,
            returnedDimensions: embedding.length,
            expectedDimensions: PRODUCT_EMBEDDING_DIMENSIONS,
          },
          "[ecommerce] product embedding dimension mismatch",
        )
        continue
      }

      const refreshed = await upsertProductEmbedding({
        productId: product.id,
        workspaceId: input.workspaceId,
        content,
        contentHash,
        model: provider,
        dimensions: embedding.length,
        embedding,
      })
      if (refreshed) {
        refreshedCount += 1
      } else {
        skippedCount += 1
      }
    } catch (error) {
      skippedCount += 1
      logger.warn(
        {
          workspaceId: input.workspaceId,
          productId: product.id,
          provider,
          err: normalizeError(error),
        },
        "[ecommerce] product embedding refresh failed",
      )
    }
  }

  logger.info(
    {
      workspaceId: input.workspaceId,
      provider,
      requestedCount: products.length,
      refreshedCount,
      skippedCount,
    },
    "[ecommerce] product embedding refresh completed",
  )
}
