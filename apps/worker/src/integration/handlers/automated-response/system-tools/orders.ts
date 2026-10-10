import {
  type CancelOrderDraftInput,
  type ConfirmOrderInput,
  type GetCurrentOrderDraftInput,
  type GetOrderDetailsInput,
  type RequestOrderConfirmationInput,
  type StartOrderDraftInput,
  type SystemFunctionContext,
  type SystemToolExecutors,
  type UpdateOrderDraftInput,
} from "@chatbotx.io/ai/server"
import { systemFunctionNames } from "@chatbotx.io/ai"
import { orderService } from "@chatbotx.io/business"
import { normalizeError } from "universal-error-normalizer"
import { logger } from "../../../../lib/logger"

async function currentDraft(context: NonNullable<Parameters<NonNullable<SystemToolExecutors[typeof systemFunctionNames.startOrderDraft]>>[1]>) {
  const orders = await orderService.list({ workspaceId: context.workspaceId, conversationId: context.conversationId, statuses: ["draft", "awaiting_confirmation"] })
  return orders.data[0] ?? null
}

function executor<T extends keyof SystemToolExecutors>(name: T, run: (args: Parameters<NonNullable<SystemToolExecutors[T]>>[0], context: SystemFunctionContext) => Promise<Record<string, unknown>>): NonNullable<SystemToolExecutors[T]> {
  return (async (args: Parameters<NonNullable<SystemToolExecutors[T]>>[0], context: SystemFunctionContext | null) => {
    if (!context) return { order: null }
    try { return await run(args as Parameters<NonNullable<SystemToolExecutors[T]>>[0], context) }
    catch (error) {
      logger.error({ err: normalizeError(error), workspaceId: context.workspaceId, conversationId: context.conversationId }, `[orders] ${name} failed`)
      return { order: null, error: "Unable to process the order request." }
    }
  }) as NonNullable<SystemToolExecutors[T]>
}

export const createOrderExecutors = (): Pick<SystemToolExecutors,
  | typeof systemFunctionNames.startOrderDraft | typeof systemFunctionNames.updateOrderDraft
  | typeof systemFunctionNames.getCurrentOrderDraft | typeof systemFunctionNames.requestOrderConfirmation
  | typeof systemFunctionNames.confirmOrder | typeof systemFunctionNames.cancelOrderDraft
  | typeof systemFunctionNames.getOrderDetails> => ({
  [systemFunctionNames.startOrderDraft]: executor(systemFunctionNames.startOrderDraft, async (args: StartOrderDraftInput, context) => ({ order: await orderService.startDraft({ workspaceId: context.workspaceId, conversationId: context.conversationId, contactId: context.contactId, type: args.type, source: "ai", currency: args.currency }) })),
  [systemFunctionNames.updateOrderDraft]: executor(systemFunctionNames.updateOrderDraft, async (args: UpdateOrderDraftInput, context) => {
    const order = args.orderId ? await orderService.getById({ workspaceId: context.workspaceId, orderId: args.orderId }) : await currentDraft(context)
    if (!order) return { order: null, error: "No current order draft exists." }
    return { order: await orderService.updateDraft({ workspaceId: context.workspaceId, orderId: order.id, data: args.data as never, expectedVersion: args.expectedVersion }) }
  }),
  [systemFunctionNames.getCurrentOrderDraft]: executor(systemFunctionNames.getCurrentOrderDraft, async (_args: GetCurrentOrderDraftInput, context) => ({ order: await currentDraft(context) })),
  [systemFunctionNames.requestOrderConfirmation]: executor(systemFunctionNames.requestOrderConfirmation, async (args: RequestOrderConfirmationInput, context) => {
    const order = args.orderId ? await orderService.getById({ workspaceId: context.workspaceId, orderId: args.orderId }) : await currentDraft(context)
    if (!order) return { order: null, error: "No current order draft exists." }
    return { order: await orderService.requestConfirmation({ workspaceId: context.workspaceId, orderId: order.id, token: args.token }) }
  }),
  [systemFunctionNames.confirmOrder]: executor(systemFunctionNames.confirmOrder, async (args: ConfirmOrderInput, context) => {
    const order = args.orderId ? await orderService.getById({ workspaceId: context.workspaceId, orderId: args.orderId }) : await currentDraft(context)
    if (!order) return { order: null, error: "No current order draft exists." }
    return { order: await orderService.confirm({ workspaceId: context.workspaceId, orderId: order.id, token: args.token, version: args.version, idempotencyKey: args.idempotencyKey }) }
  }),
  [systemFunctionNames.cancelOrderDraft]: executor(systemFunctionNames.cancelOrderDraft, async (args: CancelOrderDraftInput, context) => {
    const order = args.orderId ? await orderService.getById({ workspaceId: context.workspaceId, orderId: args.orderId }) : await currentDraft(context)
    if (!order) return { order: null, error: "No current order draft exists." }
    return { order: await orderService.cancel({ workspaceId: context.workspaceId, orderId: order.id, reason: args.reason }) }
  }),
  [systemFunctionNames.getOrderDetails]: executor(systemFunctionNames.getOrderDetails, async (args: GetOrderDetailsInput, context) => ({ order: await orderService.getById({ workspaceId: context.workspaceId, orderId: args.orderId }) })),
})
