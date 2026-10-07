import type { systemFunctionNames } from "@chatbotx.io/ai"
import type {
  GetProductDetailsInput,
  SearchProductsInput,
  SystemToolExecutors,
} from "@chatbotx.io/ai/server"
import { productService } from "@chatbotx.io/business"
import { normalizeError } from "universal-error-normalizer"
import { logger } from "../../../../lib/logger"

const PRODUCT_SEARCH_RESULT_LIMIT = 5

type ProductSummarySource = Awaited<
  ReturnType<typeof productService.searchForAgent>
>[number]
type ProductDetailSource = Awaited<ReturnType<typeof productService.findById>>

type SafeProductSummary = Pick<
  ProductSummarySource,
  | "currency"
  | "discount"
  | "id"
  | "inventoryPolicy"
  | "name"
  | "price"
  | "productUrl"
  | "shortDescription"
  | "sku"
  | "taxes"
  | "tags"
  | "vendor"
> & {
  available: boolean
  category: string | null
  imageUrl: string | null
  subcategory: string | null
}

function isAvailable(product: {
  allowOutOfStockPurchase: boolean
  inventoryPolicy: "dont_track" | "track"
  inventoryQuantity: number
}) {
  return !(
    product.inventoryPolicy === "track" &&
    product.inventoryQuantity <= 0 &&
    !product.allowOutOfStockPurchase
  )
}

function toSafeProductSummary(
  product: ProductSummarySource,
): SafeProductSummary {
  return {
    id: product.id,
    name: product.name,
    shortDescription: product.shortDescription,
    price: product.price,
    taxes: product.taxes,
    discount: product.discount,
    currency: product.currency,
    productUrl: product.productUrl,
    sku: product.sku,
    inventoryPolicy: product.inventoryPolicy,
    available: isAvailable(product),
    imageUrl: product.images[0]?.url ?? null,
    category: product.category,
    subcategory: product.subcategory,
    tags: product.tags,
    vendor: product.vendor,
  }
}

function toSafeProductDetails(product: ProductDetailSource) {
  return {
    ...toSafeProductSummary(product),
    options: product.variantOptions.map((option) => ({
      name: option.name,
      values: option.values,
      position: option.position,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      combination: variant.combination,
      price: variant.price,
      isEnabled: variant.isEnabled,
    })),
  }
}

interface ProductToolDiagnostics {
  agentId?: string
  triggerMessageId?: string
}

export function createSearchProductsExecutor(
  correlation: ProductToolDiagnostics = {},
): NonNullable<SystemToolExecutors[typeof systemFunctionNames.searchProducts]> {
  return async (args: SearchProductsInput, context) => {
    if (!context) {
      logger.info(
        { ...correlation, reason: "missing_context" },
        "[ecommerce] product search skipped",
      )
      return { products: [] }
    }

    const diagnostics = {
      ...correlation,
      workspaceId: context.workspaceId,
      conversationId: context.conversationId,
      query: args.query.slice(0, 120),
      queryTruncated: args.query.length > 120,
      categoryId: args.categoryId,
    }
    logger.info(diagnostics, "[ecommerce] product search started")

    try {
      const products = await productService.searchForAgent({
        workspaceId: context.workspaceId,
        query: args.query,
        categoryId: args.categoryId,
        limit: PRODUCT_SEARCH_RESULT_LIMIT,
      })

      const summaries = products.map(toSafeProductSummary)
      logger.info(
        {
          ...diagnostics,
          fetchedCount: products.length,
          eligibleCount: products.length,
          returnedCount: summaries.length,
          outcome: summaries.length > 0 ? "found" : "empty",
        },
        "[ecommerce] product search completed",
      )
      return { products: summaries }
    } catch (error) {
      logger.error(
        {
          ...diagnostics,
          err: normalizeError(error),
          outcome: "error",
        },
        "[ecommerce] product search tool execution failed",
      )
      return { products: [] }
    }
  }
}

export function createGetProductDetailsExecutor(
  correlation: ProductToolDiagnostics = {},
): NonNullable<
  SystemToolExecutors[typeof systemFunctionNames.getProductDetails]
> {
  return async (args: GetProductDetailsInput, context) => {
    if (!context) {
      logger.info(
        {
          ...correlation,
          reason: "missing_context",
          productId: args.productId,
        },
        "[ecommerce] product details skipped",
      )
      return { product: null }
    }

    try {
      const product = await productService.findById(
        args.productId,
        context.workspaceId,
      )

      const eligible = product.isActive && product.isSearchable
      logger.info(
        {
          ...correlation,
          workspaceId: context.workspaceId,
          conversationId: context.conversationId,
          productId: args.productId,
          outcome: eligible ? "found" : "ineligible",
          fetchedCount: 1,
          eligibleCount: Number(eligible),
          returnedCount: Number(eligible),
        },
        "[ecommerce] product details completed",
      )
      if (!eligible) {
        return { product: null }
      }

      return { product: toSafeProductDetails(product) }
    } catch (error) {
      logger.error(
        {
          ...correlation,
          err: normalizeError(error),
          outcome: "error",
          workspaceId: context.workspaceId,
          conversationId: context.conversationId,
          productId: args.productId,
        },
        "[ecommerce] product details tool execution failed",
      )
      return { product: null }
    }
  }
}
