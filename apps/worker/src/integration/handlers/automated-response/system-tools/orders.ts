import {
  type CancelOrderDraftInput,
  type ConfirmOrderInput,
  type GetOrderIntakeInput,
  type GetOrderDetailsInput,
  type RequestOrderConfirmationInput,
  type StartOrderIntakeInput,
  type SystemFunctionContext,
  type SystemToolExecutors,
  type UpdateOrderDraftInput,
  type UpdateOrderIntakeInput,
} from "@chatbotx.io/ai/server"
import { systemFunctionNames } from "@chatbotx.io/ai"
import { orderIntakeSessionService, orderService } from "@chatbotx.io/business"
import type { OrderType } from "@chatbotx.io/database/partials"
import type { OrderConversationSessionModel } from "@chatbotx.io/database/types"
import { normalizeError } from "universal-error-normalizer"
import { logger } from "../../../../lib/logger"

function missingDetails(session: OrderConversationSessionModel): string[] {
  const data = session.collectedData
  const missing: string[] = []
  const phone = data.phone

  if (typeof phone !== "string" || !/^\+[1-9]\d{6,14}$/.test(phone)) {
    missing.push("phone")
  }

  if (data.type === "product") {
    if (typeof data.customer_name !== "string" || !data.customer_name.trim()) {
      missing.push("customer_name")
    }
    if (
      typeof data.delivery_address !== "string" ||
      !data.delivery_address.trim()
    ) {
      missing.push("delivery_address")
    }
    if (typeof data.product_name !== "string" || !data.product_name.trim()) {
      missing.push("product_name")
    }
    if (typeof data.quantity !== "number" || data.quantity <= 0) {
      missing.push("quantity")
    }
    if (typeof data.total_price !== "number" || data.total_price < 0) {
      missing.push("total_price")
    }
  }

  return missing
}

function intakeResult(
  session: OrderConversationSessionModel,
  order: { status?: string } | null = null,
) {
  const missing = missingDetails(session)
  const complete = order?.status === "awaiting_confirmation"

  return {
    session,
    sessionId: session.id,
    order,
    orderId: session.orderId,
    complete,
    missingDetails: missing,
    validation: {
      confirmationRequested: complete,
      requiredCustomFieldsVerified: complete,
      message: complete
        ? "Order details are validated and awaiting customer confirmation."
        : "Do not claim completion. Required order details, including all required custom fields, are verified only when confirmation is successfully requested.",
    },
  }
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
  | typeof systemFunctionNames.startOrderIntake | typeof systemFunctionNames.updateOrderIntake
  | typeof systemFunctionNames.getOrderIntake | typeof systemFunctionNames.updateOrderDraft
  | typeof systemFunctionNames.requestOrderConfirmation | typeof systemFunctionNames.confirmOrder
  | typeof systemFunctionNames.cancelOrderDraft | typeof systemFunctionNames.getOrderDetails> => ({
  [systemFunctionNames.startOrderIntake]: executor(systemFunctionNames.startOrderIntake, async (args: StartOrderIntakeInput, context) => {
    const intentMessageId = context.triggerMessageId ?? args.intentMessageId
    if (!intentMessageId) {
      return {
        order: null,
        error: "Cannot start order intake because the triggering customer message ID is unavailable.",
      }
    }
    const session = await orderIntakeSessionService.startNewIntent({
      workspaceId: context.workspaceId,
      conversationId: context.conversationId,
      contactId: context.contactId,
      intentMessageId,
    })
    const initialized = await orderIntakeSessionService.recordDetails({
      workspaceId: context.workspaceId,
      sessionId: session.id,
      data: { type: args.type, currency: args.currency },
      expectedVersion: session.version,
    })
    return intakeResult(initialized)
  }),
  [systemFunctionNames.updateOrderIntake]: executor(systemFunctionNames.updateOrderIntake, async (args: UpdateOrderIntakeInput, context) => {
    const existing = await orderIntakeSessionService.get({
      workspaceId: context.workspaceId,
      sessionId: args.sessionId,
    })
    if (existing.orderId) {
      const { session, order } = await orderIntakeSessionService.updateBoundDraft({
        workspaceId: context.workspaceId,
        sessionId: args.sessionId,
        data: args.data,
        expectedVersion: args.expectedVersion,
      })
      return intakeResult(session, order)
    }

    const session = await orderIntakeSessionService.recordDetails({
      workspaceId: context.workspaceId,
      sessionId: args.sessionId,
      data: args.data,
      expectedVersion: args.expectedVersion,
    })
    const type = session.collectedData.type
    const currency = session.collectedData.currency
    const phone = session.collectedData.phone
    if (typeof type !== "string" || typeof phone !== "string" || !phone.trim()) {
      return intakeResult(session)
    }

    const { session: boundSession, order } = await orderIntakeSessionService.createDraftWhenPhonePresent({
      workspaceId: context.workspaceId,
      sessionId: session.id,
      type: type as OrderType,
      source: "ai",
      currency: typeof currency === "string" ? currency : undefined,
    })
    return intakeResult(boundSession, order)
  }),
  [systemFunctionNames.getOrderIntake]: executor(systemFunctionNames.getOrderIntake, async (args: GetOrderIntakeInput, context) => {
    const session = await orderIntakeSessionService.get({
      workspaceId: context.workspaceId,
      sessionId: args.sessionId,
    })
    const order = session.orderId
      ? await orderService.getById({ workspaceId: context.workspaceId, orderId: session.orderId })
      : null
    return intakeResult(session, order)
  }),
  [systemFunctionNames.updateOrderDraft]: executor(systemFunctionNames.updateOrderDraft, async (args: UpdateOrderDraftInput, context) => {
    const { customFields, ...orderData } = args.data
    const data = {
      ...orderData,
      expiresAt:
        orderData.expiresAt === undefined || orderData.expiresAt === null
          ? orderData.expiresAt
          : new Date(orderData.expiresAt),
    }
    return {
      order: await orderService.updateDraft({
        workspaceId: context.workspaceId,
        orderId: args.orderId,
        data: data as never,
        customFields,
        expectedVersion: args.expectedVersion,
      }),
    }
  }),
  [systemFunctionNames.requestOrderConfirmation]: executor(systemFunctionNames.requestOrderConfirmation, async (args: RequestOrderConfirmationInput, context) => ({
    order: await orderService.requestConfirmation({ workspaceId: context.workspaceId, orderId: args.orderId, token: args.token }),
  })),
  [systemFunctionNames.confirmOrder]: executor(systemFunctionNames.confirmOrder, async (args: ConfirmOrderInput, context) => {
    const current = await orderService.getById({
      workspaceId: context.workspaceId,
      orderId: args.orderId,
    })
    if (current.status === "confirmed") {
      return { order: current, alreadyConfirmed: true }
    }

    const metadata = current.confirmationMetadata
    const token = args.token ?? (typeof metadata?.token === "string" ? metadata.token : undefined)
    const version = args.version ?? (typeof metadata?.version === "number" ? metadata.version : undefined)
    if (!token || !version) {
      return {
        order: current,
        error: "This order is not ready for confirmation. Request confirmation first.",
      }
    }

    return {
      order: await orderService.confirm({
        workspaceId: context.workspaceId,
        orderId: args.orderId,
        token,
        version,
        idempotencyKey: args.idempotencyKey ?? context.triggerMessageId,
      }),
    }
  }),
  [systemFunctionNames.cancelOrderDraft]: executor(systemFunctionNames.cancelOrderDraft, async (args: CancelOrderDraftInput, context) => ({
    order: await orderService.cancel({ workspaceId: context.workspaceId, orderId: args.orderId, reason: args.reason }),
  })),
  [systemFunctionNames.getOrderDetails]: executor(systemFunctionNames.getOrderDetails, async (args: GetOrderDetailsInput, context) => ({ order: await orderService.getById({ workspaceId: context.workspaceId, orderId: args.orderId }) })),
})
