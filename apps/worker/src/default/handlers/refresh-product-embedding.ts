import {
  isProductEmbeddingConfigurationError,
  productService,
  refreshProductEmbedding as refreshEmbedding,
} from "@chatbotx.io/business"
import { logger } from "../../lib/logger"

export async function refreshProductEmbedding(input: {
  workspaceId: string
  productIds: string[]
  nextAfterId?: string
}) {
  const products = await productService.listForEmbeddingRefresh(input)
  const failedProductIds: string[] = []
  for (const { product, content } of products) {
    try {
      await refreshEmbedding({
        workspaceId: input.workspaceId,
        product,
        content,
      })
    } catch (err) {
      if (isProductEmbeddingConfigurationError(err)) {
        logger.error(
          { err, workspaceId: input.workspaceId, productId: product.id },
          "[ecommerce] product embedding refresh has an invalid configuration",
        )
        return
      }
      failedProductIds.push(product.id)
      logger.warn(
        { err, workspaceId: input.workspaceId, productId: product.id },
        "[ecommerce] product embedding refresh failed",
      )
    }
  }
  if (failedProductIds.length > 0) {
    throw new Error(
      `Product embedding refresh failed for ${failedProductIds.length} product(s)`,
    )
  }
  if (input.nextAfterId) {
    await productService.scheduleEmbeddingRefreshPage({
      workspaceId: input.workspaceId,
      afterId: input.nextAfterId,
    })
  }
}
