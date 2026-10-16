import { type DatabaseClient, db } from "@chatbotx.io/database/client"
import { orderIntakeSessionRepository } from "@chatbotx.io/database/repositories"
import type { OrderSource, OrderType } from "@chatbotx.io/database/partials"
import type {
  OrderConversationSessionModel,
  OrderModel,
} from "@chatbotx.io/database/types"
import { parsePhoneNumberFromString } from "libphonenumber-js"
import { orderService } from "../order"
import { notFoundException, validationException } from "../errors"

const CANONICAL_FIELD_KEYS = new Set([
  "phone",
  "customer_name",
  "delivery_address",
  "product_name",
  "quantity",
  "total_price",
])

class OrderIntakeSessionService {
  async startNewIntent(input: {
    workspaceId: string
    conversationId: string
    contactId?: string | null
    intentMessageId: string
    expiresAt?: Date
    tx?: DatabaseClient
  }): Promise<OrderConversationSessionModel> {
    if (!input.intentMessageId.trim()) {
      throw validationException("intentMessageId", "Intent message ID is required.")
    }
    const session = await orderIntakeSessionRepository.createForIntent(
      {
        ...input,
        intentMessageId: input.intentMessageId.trim(),
        expiresAt:
          input.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      input.tx ?? db,
    )
    if (!session) throw new Error("Failed to create order intake session")
    return session
  }

  async get(input: {
    workspaceId: string
    sessionId: string
    tx?: DatabaseClient
  }): Promise<OrderConversationSessionModel> {
    const session = await orderIntakeSessionRepository.findById(
      input,
      input.tx ?? db,
    )
    if (!session) throw notFoundException("Order intake session does not exist.")
    return session
  }

  async recordDetails(input: {
    workspaceId: string
    sessionId: string
    data: Record<string, unknown>
    expectedVersion?: number
    tx?: DatabaseClient
  }): Promise<OrderConversationSessionModel> {
    const { tx = db } = input
    const session = await this.get({ ...input, tx })
    this.assertOpen(session)
    const collectedData = this.mergeCollectedData(session.collectedData, input.data)
    const updated = await orderIntakeSessionRepository.update(
      {
        workspaceId: input.workspaceId,
        sessionId: input.sessionId,
        expectedVersion: input.expectedVersion ?? session.version,
        values: { collectedData },
      },
      tx,
    )
    if (!updated) {
      throw validationException("version", "Order intake session was modified. Please reload and try again.")
    }
    return updated
  }

  async createDraftWhenPhonePresent(input: {
    workspaceId: string
    sessionId: string
    type: OrderType
    source: OrderSource
    currency?: string
    tx?: DatabaseClient
  }): Promise<{ session: OrderConversationSessionModel; order: OrderModel }> {
    if (!input.tx) {
      return await db.transaction((tx) =>
        this.createDraftWhenPhonePresent({ ...input, tx }),
      )
    }
    const { tx } = input
    const session = await this.get({ ...input, tx })
    this.assertOpen(session)
    if (session.orderId) {
      const bound = await orderService.getById({
        workspaceId: input.workspaceId,
        orderId: session.orderId,
        tx,
      })
      return { session, order: bound }
    }

    const phone = this.normalizePhone(session.collectedData.phone)
    const { canonicalData, customFields } = this.splitCollectedData(
      session.collectedData,
    )
    const order = await orderService.createDraft({
      workspaceId: input.workspaceId,
      conversationId: session.conversationId,
      contactId: session.contactId,
      type: input.type,
      source: input.source,
      currency: input.currency,
      customerSnapshot: { ...canonicalData, phone },
      tx,
    })
    const bound = await orderIntakeSessionRepository.bindOrder(
      {
        workspaceId: input.workspaceId,
        sessionId: session.id,
        expectedVersion: session.version,
        orderId: order.id,
      },
      tx,
    )
    if (!bound) {
      const retry = await this.get({ ...input, tx })
      if (retry.orderId) {
        return {
          session: retry,
          order: await orderService.getById({
            workspaceId: input.workspaceId,
            orderId: retry.orderId,
            tx,
          }),
        }
      }
      throw validationException("version", "Order intake session was modified. Please reload and try again.")
    }
    if (Object.keys(customFields).length > 0) {
      await orderService.updateDraftCustomFields({
        workspaceId: input.workspaceId,
        orderId: order.id,
        values: customFields,
        tx,
      })
    }
    return { session: bound, order }
  }

  async requestConfirmationWhenComplete(input: {
    workspaceId: string
    sessionId: string
    token: string
    tx?: DatabaseClient
  }): Promise<{ session: OrderConversationSessionModel; order: OrderModel }> {
    if (!input.tx) {
      return await db.transaction((tx) =>
        this.requestConfirmationWhenComplete({ ...input, tx }),
      )
    }
    const { tx } = input
    const session = await this.get({ ...input, tx })
    this.assertOpen(session)
    if (!session.orderId) {
      throw validationException("orderId", "No order draft is bound to this intake session.")
    }
    const order = await orderService.requestConfirmation({
      workspaceId: input.workspaceId,
      orderId: session.orderId,
      token: input.token,
      tx,
    })
    const completed = await orderIntakeSessionRepository.update(
      {
        workspaceId: input.workspaceId,
        sessionId: session.id,
        expectedVersion: session.version,
        values: { state: "completed", closedAt: new Date() },
      },
      tx,
    )
    if (!completed) {
      throw validationException("version", "Order intake session was modified. Please reload and try again.")
    }
    return { session: completed, order }
  }

  async updateBoundDraft(input: {
    workspaceId: string
    sessionId: string
    data: Record<string, unknown>
    expectedVersion?: number
    tx?: DatabaseClient
  }): Promise<{ session: OrderConversationSessionModel; order: OrderModel }> {
    if (!input.tx) {
      return await db.transaction((tx) => this.updateBoundDraft({ ...input, tx }))
    }
    const { tx } = input
    const session = await this.recordDetails({ ...input, tx })
    if (!session.orderId) {
      throw validationException("orderId", "A valid phone number is required before creating an order draft.")
    }
    const { canonicalData, customFields } = this.splitCollectedData(session.collectedData)
    const order = await orderService.updateDraft({
      workspaceId: input.workspaceId,
      orderId: session.orderId,
      data: { customerSnapshot: canonicalData },
      customFields,
      tx,
    })
    return { session, order }
  }

  private assertOpen(session: OrderConversationSessionModel) {
    if (session.closedAt || ["completed", "abandoned", "expired"].includes(session.state)) {
      throw validationException("state", "Order intake session is closed.")
    }
    if (session.expiresAt <= new Date()) {
      throw validationException("expiresAt", "Order intake session has expired.")
    }
  }

  private mergeCollectedData(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>,
  ) {
    const existingSnapshot = this.asRecord(existing.customerSnapshot)
    const incomingSnapshot = this.asRecord(incoming.customerSnapshot)
    const data = {
      ...existingSnapshot,
      ...incomingSnapshot,
      ...existing,
      ...incoming,
    }
    const retainedSnapshot = Object.fromEntries(
      Object.entries({ ...existingSnapshot, ...incomingSnapshot }).filter(
        ([key]) => !CANONICAL_FIELD_KEYS.has(key),
      ),
    )

    if (Object.keys(retainedSnapshot).length > 0) data.customerSnapshot = retainedSnapshot
    else delete data.customerSnapshot

    if (data.phone !== undefined) data.phone = this.normalizePhone(data.phone)
    return data
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private splitCollectedData(data: Record<string, unknown>) {
    const customFields =
      data.customFields && typeof data.customFields === "object" && !Array.isArray(data.customFields)
        ? (data.customFields as Record<string, unknown>)
        : {}
    const canonicalData = Object.fromEntries(
      Object.entries(data).filter(([key]) => CANONICAL_FIELD_KEYS.has(key)),
    )
    return { canonicalData, customFields }
  }

  private normalizePhone(value: unknown) {
    if (typeof value !== "string" || !value.trim()) {
      throw validationException("phone", "A valid phone number is required.")
    }
    const phone = parsePhoneNumberFromString(value.trim())
    if (!phone?.isValid()) {
      throw validationException("phone", "A valid phone number is required.")
    }
    return phone.number
  }
}

export const orderIntakeSessionService = new OrderIntakeSessionService()
