import { type ToolSet, tool } from "ai"
import { normalizeError } from "universal-error-normalizer"
import { z } from "zod"
import { systemFunctionCatalog, systemFunctionNames } from "../../constants"
import { logger } from "../../logger"

export interface SystemFunctionContext {
  channel?: string
  contactId: string
  conversationId: string
  sendMessage?: (text: string) => Promise<void>
  triggerFlow?: (flowId: string) => Promise<void>
  workspaceId: string
}

export interface SystemFunctionHandoffRequest {
  channel?: string
  contactId: string
  conversationId: string
  metadata?: Record<string, unknown>
  reason: string
  source: "ai_system_tool"
  workspaceId: string
}

const connectUserToHumanSchema = z.object({
  reason: z
    .enum([
      "user_requested_human",
      "assistant_cannot_resolve",
      "high_risk_or_sensitive",
    ])
    .describe("The reason for transferring to a human agent"),
  userRequestExcerpt: z
    .string()
    .optional()
    .describe(
      "A short excerpt of the user's request that triggered this handoff",
    ),
  requestedBy: z
    .enum(["user", "agent_policy"])
    .default("user")
    .describe("Who initiated the handoff request"),
  requiresConfirmation: z
    .boolean()
    .default(false)
    .describe("Whether to ask the user for confirmation before handoff"),
})

const documentReaderSchema = z.object({
  query: z
    .string()
    .describe(
      "The question or information the user wants to extract from the document",
    ),
  documentContext: z
    .string()
    .optional()
    .describe(
      "Additional context about which document to read if multiple documents exist in the conversation",
    ),
})

const imageReaderSchema = z.object({
  query: z
    .string()
    .describe(
      "The question or information the user wants to extract from uploaded images",
    ),
  imageContext: z
    .string()
    .optional()
    .describe(
      "Additional context to identify a specific image when multiple images exist",
    ),
})

const urlContextSchema = z.object({
  query: z
    .string()
    .describe("The user question that requires URL-derived context"),
  url: z
    .string()
    .url()
    .optional()
    .describe("Specific URL to prioritize when retrieving context"),
})

const webSearchSchema = z.object({
  query: z.string().describe("The user query to search on the public web"),
})

const searchProductsSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .describe("Product name or keywords to search in the live catalog"),
  categoryId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Optional catalog category id to narrow the search"),
})

const getProductDetailsSchema = z.object({
  productId: z.string().trim().min(1).describe("Product id returned by search_products"),
})

const orderTypeSchema = z.enum(["product", "appointment", "quote", "digital_service"])
const appointmentOrderDetailsSchema = z.object({
  calendarId: z.string().trim().min(1).max(255).optional(),
  appointmentId: z.string().trim().min(1).max(255).optional(),
  startAt: z.string().datetime({ offset: true }).optional(),
  endAt: z.string().datetime({ offset: true }).optional(),
  timeZone: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
})
const diamondQuoteDetailsSchema = z.object({
  carat: z.number().positive().optional(),
  shape: z.string().trim().min(1).max(100).optional(),
  color: z.string().trim().min(1).max(100).optional(),
  clarity: z.string().trim().min(1).max(100).optional(),
  certificate: z.string().trim().min(1).max(255).optional(),
  budget: z.number().nonnegative().optional(),
  budgetCurrency: z.string().trim().min(1).max(10).optional(),
})
const orderDataSchema = z.object({
  type: orderTypeSchema.optional(),
  customerSnapshot: z.record(z.string(), z.unknown()).optional(),
  appointmentDetails: appointmentOrderDetailsSchema.optional(),
  diamondQuoteDetails: diamondQuoteDetailsSchema.optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  subtotal: z.number().nonnegative().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  total: z.number().nonnegative().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
}).passthrough()
const startOrderDraftSchema = z.object({ type: orderTypeSchema.default("product"), currency: z.string().optional() })
const updateOrderDraftSchema = z.object({ orderId: z.string().optional(), data: orderDataSchema, expectedVersion: z.number().int().positive().optional() })
const currentOrderDraftSchema = z.object({})
const requestOrderConfirmationSchema = z.object({ orderId: z.string().optional(), token: z.string().min(1) })
const confirmOrderSchema = z.object({ orderId: z.string().optional(), token: z.string().min(1), version: z.number().int().positive(), idempotencyKey: z.string().optional() })
const cancelOrderDraftSchema = z.object({ orderId: z.string().optional(), reason: z.string().optional() })
const getOrderDetailsSchema = z.object({ orderId: z.string().min(1) })

export type ConnectUserToHumanInput = z.infer<typeof connectUserToHumanSchema>
export type DocumentReaderInput = z.infer<typeof documentReaderSchema>
export type ImageReaderInput = z.infer<typeof imageReaderSchema>
export type UrlContextInput = z.infer<typeof urlContextSchema>
export type WebSearchInput = z.infer<typeof webSearchSchema>
export type SearchProductsInput = z.infer<typeof searchProductsSchema>
export type GetProductDetailsInput = z.infer<typeof getProductDetailsSchema>
export type StartOrderDraftInput = z.infer<typeof startOrderDraftSchema>
export type UpdateOrderDraftInput = z.infer<typeof updateOrderDraftSchema>
export type GetCurrentOrderDraftInput = z.infer<typeof currentOrderDraftSchema>
export type RequestOrderConfirmationInput = z.infer<typeof requestOrderConfirmationSchema>
export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>
export type CancelOrderDraftInput = z.infer<typeof cancelOrderDraftSchema>
export type GetOrderDetailsInput = z.infer<typeof getOrderDetailsSchema>

export const systemFunctionIds = [
  systemFunctionNames.connectUserToHuman,
  systemFunctionNames.documentReader,
  systemFunctionNames.imageReader,
  systemFunctionNames.searchProducts,
  systemFunctionNames.getProductDetails,
  systemFunctionNames.startOrderDraft,
  systemFunctionNames.updateOrderDraft,
  systemFunctionNames.getCurrentOrderDraft,
  systemFunctionNames.requestOrderConfirmation,
  systemFunctionNames.confirmOrder,
  systemFunctionNames.cancelOrderDraft,
  systemFunctionNames.getOrderDetails,
  systemFunctionNames.urlContext,
  systemFunctionNames.webSearch,
] as const

export type SystemFunctionId = (typeof systemFunctionIds)[number]

export type SystemToolOutput = Record<string, unknown> | string

export type SystemToolExecutors = Partial<{
  [systemFunctionNames.connectUserToHuman]: (
    args: ConnectUserToHumanInput,
    context: SystemFunctionContext | null,
  ) => Promise<SystemToolOutput>
  [systemFunctionNames.documentReader]: (
    args: DocumentReaderInput,
    context: SystemFunctionContext | null,
  ) => Promise<string>
  [systemFunctionNames.imageReader]: (
    args: ImageReaderInput,
    context: SystemFunctionContext | null,
  ) => Promise<string>
  [systemFunctionNames.searchProducts]: (
    args: SearchProductsInput,
    context: SystemFunctionContext | null,
  ) => Promise<SystemToolOutput>
  [systemFunctionNames.getProductDetails]: (args: GetProductDetailsInput, context: SystemFunctionContext | null) => Promise<SystemToolOutput>
  [systemFunctionNames.startOrderDraft]: (args: StartOrderDraftInput, context: SystemFunctionContext | null) => Promise<SystemToolOutput>
  [systemFunctionNames.updateOrderDraft]: (args: UpdateOrderDraftInput, context: SystemFunctionContext | null) => Promise<SystemToolOutput>
  [systemFunctionNames.getCurrentOrderDraft]: (args: GetCurrentOrderDraftInput, context: SystemFunctionContext | null) => Promise<SystemToolOutput>
  [systemFunctionNames.requestOrderConfirmation]: (args: RequestOrderConfirmationInput, context: SystemFunctionContext | null) => Promise<SystemToolOutput>
  [systemFunctionNames.confirmOrder]: (args: ConfirmOrderInput, context: SystemFunctionContext | null) => Promise<SystemToolOutput>
  [systemFunctionNames.cancelOrderDraft]: (args: CancelOrderDraftInput, context: SystemFunctionContext | null) => Promise<SystemToolOutput>
  [systemFunctionNames.getOrderDetails]: (args: GetOrderDetailsInput, context: SystemFunctionContext | null) => Promise<SystemToolOutput>
  [systemFunctionNames.urlContext]: (
    args: UrlContextInput,
    context: SystemFunctionContext | null,
  ) => Promise<string>
  [systemFunctionNames.webSearch]: (
    args: WebSearchInput,
    context: SystemFunctionContext | null,
  ) => Promise<string>
}>

export interface GetAISystemToolsOptions {
  selectedSystemIds: string[]
  systemFunctionContextGetter?: () => Promise<SystemFunctionContext | null>
  systemToolExecutors?: SystemToolExecutors
}

const buildConnectUserToHumanTool = (options: GetAISystemToolsOptions) =>
  tool({
    description:
      systemFunctionCatalog[systemFunctionNames.connectUserToHuman].description,
    inputSchema: connectUserToHumanSchema,
    execute: async (args) => {
      const context = await options.systemFunctionContextGetter?.()
      const executor =
        options.systemToolExecutors?.[systemFunctionNames.connectUserToHuman]

      if (executor) {
        return executor(args, context ?? null)
      }

      return "I'm connecting you to a human agent who can better assist you. Please stay on the line."
    },
  })

const buildDocumentReaderTool = (options: GetAISystemToolsOptions) =>
  tool({
    description:
      systemFunctionCatalog[systemFunctionNames.documentReader].description,
    inputSchema: documentReaderSchema,
    execute: async (args) => {
      const context = await options.systemFunctionContextGetter?.()
      const executor =
        options.systemToolExecutors?.[systemFunctionNames.documentReader]

      if (executor) {
        return executor(args, context ?? null)
      }

      return "I've read the document you sent. Let me answer your question based on its content."
    },
  })

const buildImageReaderTool = (options: GetAISystemToolsOptions) =>
  tool({
    description:
      systemFunctionCatalog[systemFunctionNames.imageReader].description,
    inputSchema: imageReaderSchema,
    execute: async (args) => {
      const context = await options.systemFunctionContextGetter?.()
      const executor =
        options.systemToolExecutors?.[systemFunctionNames.imageReader]

      if (executor) {
        return executor(args, context ?? null)
      }

      return "Image reader is not enabled in this workspace yet."
    },
  })

const buildSearchProductsTool = (options: GetAISystemToolsOptions) =>
  tool({
    description:
      systemFunctionCatalog[systemFunctionNames.searchProducts].description,
    inputSchema: searchProductsSchema,
    execute: async (args) => {
      const context = await options.systemFunctionContextGetter?.()
      const executor =
        options.systemToolExecutors?.[systemFunctionNames.searchProducts]

      if (executor) {
        return executor(args, context ?? null)
      }

      return { products: [] }
    },
  })

const buildGetProductDetailsTool = (options: GetAISystemToolsOptions) =>
  tool({
    description:
      systemFunctionCatalog[systemFunctionNames.getProductDetails].description,
    inputSchema: getProductDetailsSchema,
    execute: async (args) => {
      const context = await options.systemFunctionContextGetter?.()
      const executor =
        options.systemToolExecutors?.[systemFunctionNames.getProductDetails]

      if (executor) {
        return executor(args, context ?? null)
      }

      return { product: null }
    },
  })

const buildOrderTool = (options: GetAISystemToolsOptions, id: SystemFunctionId, inputSchema: z.ZodObject) =>
  tool({
    description: systemFunctionCatalog[id].description,
    inputSchema,
    execute: async (args) => {
      const context = await options.systemFunctionContextGetter?.()
      const executor = options.systemToolExecutors?.[id] as ((args: unknown, context: SystemFunctionContext | null) => Promise<SystemToolOutput>) | undefined
      return executor ? executor(args, context ?? null) : { order: null }
    },
  })

const buildUrlContextTool = (options: GetAISystemToolsOptions) =>
  tool({
    description:
      systemFunctionCatalog[systemFunctionNames.urlContext].description,
    inputSchema: urlContextSchema,
    execute: async (args) => {
      const context = await options.systemFunctionContextGetter?.()
      const executor =
        options.systemToolExecutors?.[systemFunctionNames.urlContext]

      if (executor) {
        return executor(args, context ?? null)
      }

      return "URL context is not enabled in this workspace yet."
    },
  })

const buildWebSearchTool = (options: GetAISystemToolsOptions) =>
  tool({
    description:
      systemFunctionCatalog[systemFunctionNames.webSearch].description,
    inputSchema: webSearchSchema,
    execute: async (args) => {
      const context = await options.systemFunctionContextGetter?.()
      const executor =
        options.systemToolExecutors?.[systemFunctionNames.webSearch]

      if (executor) {
        return executor(args, context ?? null)
      }

      return "Web search is not enabled in this workspace yet."
    },
  })

const systemToolBuilders: Record<
  SystemFunctionId,
  (options: GetAISystemToolsOptions) => ToolSet[string]
> = {
  [systemFunctionNames.connectUserToHuman]: buildConnectUserToHumanTool,
  [systemFunctionNames.documentReader]: buildDocumentReaderTool,
  [systemFunctionNames.imageReader]: buildImageReaderTool,
  [systemFunctionNames.searchProducts]: buildSearchProductsTool,
  [systemFunctionNames.getProductDetails]: buildGetProductDetailsTool,
  [systemFunctionNames.startOrderDraft]: (o) => buildOrderTool(o, systemFunctionNames.startOrderDraft, startOrderDraftSchema),
  [systemFunctionNames.updateOrderDraft]: (o) => buildOrderTool(o, systemFunctionNames.updateOrderDraft, updateOrderDraftSchema),
  [systemFunctionNames.getCurrentOrderDraft]: (o) => buildOrderTool(o, systemFunctionNames.getCurrentOrderDraft, currentOrderDraftSchema),
  [systemFunctionNames.requestOrderConfirmation]: (o) => buildOrderTool(o, systemFunctionNames.requestOrderConfirmation, requestOrderConfirmationSchema),
  [systemFunctionNames.confirmOrder]: (o) => buildOrderTool(o, systemFunctionNames.confirmOrder, confirmOrderSchema),
  [systemFunctionNames.cancelOrderDraft]: (o) => buildOrderTool(o, systemFunctionNames.cancelOrderDraft, cancelOrderDraftSchema),
  [systemFunctionNames.getOrderDetails]: (o) => buildOrderTool(o, systemFunctionNames.getOrderDetails, getOrderDetailsSchema),
  [systemFunctionNames.urlContext]: buildUrlContextTool,
  [systemFunctionNames.webSearch]: buildWebSearchTool,
}

export function getAISystemTools(options: GetAISystemToolsOptions): ToolSet {
  const { selectedSystemIds } = options
  try {
    const tools: ToolSet = {}

    if (selectedSystemIds.length === 0) {
      return tools
    }

    for (const selectedSystemId of selectedSystemIds) {
      const toolBuilder =
        systemToolBuilders[selectedSystemId as SystemFunctionId]
      if (!toolBuilder) {
        continue
      }
      tools[selectedSystemId] = toolBuilder(options)
    }

    return tools
  } catch (error) {
    const normalizedError = normalizeError(error)
    logger.error(
      {
        err: normalizedError,
        selectedSystemIds,
      },
      "[ai-package] getAISystemTools failed",
    )
    return {}
  }
}
