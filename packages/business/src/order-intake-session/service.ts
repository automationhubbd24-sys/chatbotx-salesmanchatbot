import { type DatabaseClient, db } from "@chatbotx.io/database/client"
import type { OrderSource, OrderType } from "@chatbotx.io/database/partials"
import { orderIntakeSessionRepository } from "@chatbotx.io/database/repositories"
import type {
  OrderConversationSessionModel,
  OrderModel,
} from "@chatbotx.io/database/types"
import { type CountryCode, parsePhoneNumberFromString } from "libphonenumber-js"
import { notFoundException, validationException } from "../errors"
import { orderService } from "../order"
import { workspaceService } from "../workspace/service"

const UNKNOWN_TARGET_COUNTRY = "unknown"
const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯"
const BANGLADESH_LOCAL_PHONE_REGEX = /^01\d{10}$/

const normalizeBengaliDigits = (value: string) =>
  value.replace(/[০-৯]/g, (digit) => String(BENGALI_DIGITS.indexOf(digit)))

const resolveDefaultRegion = (
  targetCountry: string | null | undefined,
): CountryCode | undefined =>
  targetCountry && targetCountry !== UNKNOWN_TARGET_COUNTRY
    ? (targetCountry as CountryCode)
    : undefined

const CANONICAL_FIELD_KEYS = new Set([
  "phone",
  "customer_name",
  "delivery_address",
  "product_name",
  "quantity",
  "total_price",
])

const FIELD_ALIASES: Record<string, string> = {
  customerName: "customer_name",
  phoneNumber: "phone",
  phone_number: "phone",
  mobile: "phone",
  mobileNumber: "phone",
  mobile_number: "phone",
  deliveryAddress: "delivery_address",
  deliveryLocation: "delivery_address",
  delivery_location: "delivery_address",
  location: "delivery_address",
  address: "delivery_address",
  productName: "product_name",
  totalPrice: "total_price",
}

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
      throw validationException(
        "intentMessageId",
        "Intent message ID is required.",
      )
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
    if (!session) {
      throw new Error("Failed to create order intake session")
    }
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
    if (!session) {
      throw notFoundException("Order intake session does not exist.")
    }
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
    const collectedData = await this.mergeCollectedData(
      session.collectedData,
      input.data,
      input.workspaceId,
    )
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
      throw validationException(
        "version",
        "Order intake session was modified. Please reload and try again.",
      )
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

    const phone = await this.normalizePhone(
      session.collectedData.phone,
      input.workspaceId,
    )
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
      throw validationException(
        "version",
        "Order intake session was modified. Please reload and try again.",
      )
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
      throw validationException(
        "orderId",
        "No order draft is bound to this intake session.",
      )
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
      throw validationException(
        "version",
        "Order intake session was modified. Please reload and try again.",
      )
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
      return await db.transaction((tx) =>
        this.updateBoundDraft({ ...input, tx }),
      )
    }
    const { tx } = input
    const session = await this.recordDetails({ ...input, tx })
    if (!session.orderId) {
      throw validationException(
        "orderId",
        "A valid phone number is required before creating an order draft.",
      )
    }
    const { canonicalData, customFields } = this.splitCollectedData(
      session.collectedData,
    )
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
    if (
      session.closedAt ||
      ["completed", "abandoned", "expired"].includes(session.state)
    ) {
      throw validationException("state", "Order intake session is closed.")
    }
    if (session.expiresAt <= new Date()) {
      throw validationException(
        "expiresAt",
        "Order intake session has expired.",
      )
    }
  }

  private async mergeCollectedData(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>,
    workspaceId: string,
  ) {
    const existingSnapshot = this.asRecord(existing.customerSnapshot)
    const incomingSnapshot = this.asRecord(incoming.customerSnapshot)
    const data = this.normalizeFieldAliases({
      ...existingSnapshot,
      ...incomingSnapshot,
      ...existing,
      ...incoming,
    })
    const retainedSnapshot = Object.fromEntries(
      Object.entries({ ...existingSnapshot, ...incomingSnapshot }).filter(
        ([key]) => !CANONICAL_FIELD_KEYS.has(FIELD_ALIASES[key] ?? key),
      ),
    )
    const {
      customerSnapshot: _customerSnapshot,
      ...dataWithoutCustomerSnapshot
    } = data
    const collectedData =
      Object.keys(retainedSnapshot).length > 0
        ? { ...dataWithoutCustomerSnapshot, customerSnapshot: retainedSnapshot }
        : dataWithoutCustomerSnapshot

    if (collectedData.phone !== undefined) {
      collectedData.phone = await this.normalizePhone(
        collectedData.phone,
        workspaceId,
      )
    }
    return collectedData
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private normalizeFieldAliases(data: Record<string, unknown>) {
    const normalized = { ...data }
    for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
      if (
        normalized[canonical] === undefined &&
        normalized[alias] !== undefined
      ) {
        normalized[canonical] = normalized[alias]
      }
    }
    return Object.fromEntries(
      Object.entries(normalized).filter(([key]) => !(key in FIELD_ALIASES)),
    )
  }

  private splitCollectedData(data: Record<string, unknown>) {
    const customFields =
      data.customFields &&
      typeof data.customFields === "object" &&
      !Array.isArray(data.customFields)
        ? (data.customFields as Record<string, unknown>)
        : {}
    const canonicalData = Object.fromEntries(
      Object.entries(data).filter(([key]) => CANONICAL_FIELD_KEYS.has(key)),
    )
    return { canonicalData, customFields }
  }

  private async normalizePhone(value: unknown, workspaceId: string) {
    if (typeof value !== "string" || !value.trim()) {
      throw validationException("phone", "A valid phone number is required.")
    }
    const workspace = await workspaceService.find({
      where: { id: workspaceId },
    })
    const normalizedValue = normalizeBengaliDigits(value.trim())
    const phone = parsePhoneNumberFromString(
      normalizedValue,
      resolveDefaultRegion(workspace?.targetCountry),
    )
    if (phone?.isValid()) {
      return phone.number
    }

    if (
      workspace?.targetCountry === "BD" &&
      BANGLADESH_LOCAL_PHONE_REGEX.test(normalizedValue)
    ) {
      return `+880${normalizedValue.slice(1)}`
    }

    throw validationException("phone", "A valid phone number is required.")
  }
}

export const orderIntakeSessionService = new OrderIntakeSessionService()
