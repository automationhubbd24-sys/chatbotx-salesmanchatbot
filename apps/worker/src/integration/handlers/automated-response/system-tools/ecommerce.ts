import type { systemFunctionNames } from "@chatbotx.io/ai"
import type {
  GetProductDetailsInput,
  SearchProductsInput,
  SystemToolExecutors,
} from "@chatbotx.io/ai/server"
import { productService } from "@chatbotx.io/business"
import { normalizeError } from "universal-error-normalizer"
import { logger } from "../../../../lib/logger"

const PRODUCT_SEARCH_PAGE_SIZE = 20
const PRODUCT_SEARCH_RESULT_LIMIT = 5

type ProductSummarySource = Awaited<
  ReturnType<typeof productService.list>
>["data"][number]
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

export function createSearchProductsExecutor(): NonNullable<
  SystemToolExecutors[typeof systemFunctionNames.searchProducts]
> {
  return async (args: SearchProductsInput, context) => {
    if (!context) {
      return { products: [] }
    }

    try {
      const result = await productService.list({
        workspaceId: context.workspaceId,
        name: args.query,
        categoryId: args.categoryId,
        page: 1,
        perPage: PRODUCT_SEARCH_PAGE_SIZE,
      })

      return {
        products: result.data
          .filter((product) => product.isActive && product.isSearchable)
          .slice(0, PRODUCT_SEARCH_RESULT_LIMIT)
          .map(toSafeProductSummary),
      }
    } catch (error) {
      logger.error(
        {
          err: normalizeError(error),
          workspaceId: context.workspaceId,
          conversationId: context.conversationId,
        },
        "[ecommerce] product search tool execution failed",
      )
      return { products: [] }
    }
  }
}

export function createGetProductDetailsExecutor(): NonNullable<
  SystemToolExecutors[typeof systemFunctionNames.getProductDetails]
> {
  return async (args: GetProductDetailsInput, context) => {
    if (!context) {
      return { product: null }
    }

    try {
      const product = await productService.findById(
        args.productId,
        context.workspaceId,
      )

      if (!(product.isActive && product.isSearchable)) {
        return { product: null }
      }

      return { product: toSafeProductDetails(product) }
    } catch (error) {
      logger.error(
        {
          err: normalizeError(error),
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
