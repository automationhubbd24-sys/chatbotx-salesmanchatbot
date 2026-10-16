import { type DatabaseClient, db } from "@chatbotx.io/database/client"
import { orderRepository } from "@chatbotx.io/database/repositories"
import {
  appointmentOrderDetailsSchema,
  diamondQuoteDetailsSchema,
  type OrderCustomFieldType,
  type OrderSource,
  type OrderStatus,
  type OrderType,
} from "@chatbotx.io/database/partials"
import type { OrderModel } from "@chatbotx.io/database/types"
import { BaseService } from "../base.service"
import { notFoundException, validationException } from "../errors"

const ACTIVE_STATUSES: OrderStatus[] = ["draft", "awaiting_confirmation"]

const DRAFT_UPDATE_KEYS = new Set([
  "type",
  "source",
  "externalOrderId",
  "currency",
  "subtotal",
  "deliveryFee",
  "discount",
  "total",
  "customerSnapshot",
  "expiresAt",
])

const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  draft: ["awaiting_confirmation", "cancelled", "expired"],
  awaiting_confirmation: ["confirmed", "cancelled", "expired"],
  confirmed: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "failed"],
  shipped: ["delivered", "returned", "failed"],
  delivered: ["returned", "refunded"],
  returned: ["refunded"],
}

class OrderService extends BaseService {
  async startDraft(input: { workspaceId: string; type: OrderType; source: OrderSource; conversationId?: string | null; contactId?: string | null; currency?: string; tx?: DatabaseClient }): Promise<OrderModel> {
    const { tx = db } = input
    const existing = await orderRepository.findActiveDraft(input, tx)
    if (existing) return existing
    const order = await orderRepository.create({ workspaceId: input.workspaceId, type: input.type, source: input.source, conversationId: input.conversationId ?? null, contactId: input.contactId ?? null, currency: input.currency ?? "USD" }, tx)
    if (!order) throw new Error("Failed to create order")
    return order
  }

  async createDraft(input: { workspaceId: string; type: OrderType; source: OrderSource; conversationId?: string | null; contactId?: string | null; currency?: string; customerSnapshot?: Record<string, unknown>; tx?: DatabaseClient }): Promise<OrderModel> {
    const { tx = db } = input
    const order = await orderRepository.create({
      workspaceId: input.workspaceId,
      type: input.type,
      source: input.source,
      conversationId: input.conversationId ?? null,
      contactId: input.contactId ?? null,
      currency: input.currency ?? "USD",
      customerSnapshot: input.customerSnapshot,
    }, tx)
    if (!order) throw new Error("Failed to create order")
    return order
  }

  async updateDraft(input: { workspaceId: string; orderId: string; data: Partial<Omit<OrderModel, "id" | "workspaceId" | "createdAt" | "updatedAt">>; customFields?: Record<string, unknown>; expectedVersion?: number; tx?: DatabaseClient }): Promise<OrderModel> {
    if (!input.tx) return await db.transaction((tx) => this.updateDraft({ ...input, tx }))
    const { tx } = input
    const current = await orderRepository.find({ workspaceId: input.workspaceId, orderId: input.orderId }, tx)
    if (!current) throw notFoundException("Order does not exist.")
    if (!ACTIVE_STATUSES.includes(current.status)) throw validationException("status", "Only active drafts can be updated.")

    const rawData = input.data as Record<string, unknown>
    const incomingSnapshot =
      rawData.customerSnapshot &&
      typeof rawData.customerSnapshot === "object"
        ? (rawData.customerSnapshot as Record<string, unknown>)
        : {}
    const snapshot = {
      ...(current.customerSnapshot ?? {}),
      ...incomingSnapshot,
    }
    const canonicalFields = [
      "phone",
      "customer_name",
      "delivery_address",
      "product_name",
      "quantity",
      "total_price",
    ] as const

    for (const field of canonicalFields) {
      if (rawData[field] !== undefined) {
        snapshot[field] = rawData[field]
      }
    }

    const data = Object.fromEntries(
      Object.entries(rawData).filter(([key]) => DRAFT_UPDATE_KEYS.has(key)),
    )
    if (Object.keys(snapshot).length > 0) {
      data.customerSnapshot = snapshot
    }
    if (rawData.appointmentDetails !== undefined) {
      const parsed = appointmentOrderDetailsSchema.safeParse(rawData.appointmentDetails)
      if (!parsed.success || current.type !== "appointment") throw validationException("appointmentDetails", "Invalid appointment details for this order.")
      data.customerSnapshot = { ...snapshot, appointmentDetails: parsed.data }
    }
    if (rawData.diamondQuoteDetails !== undefined) {
      const parsed = diamondQuoteDetailsSchema.safeParse(rawData.diamondQuoteDetails)
      if (!parsed.success || current.type !== "quote") throw validationException("diamondQuoteDetails", "Invalid diamond quote details for this order.")
      data.customerSnapshot = { ...snapshot, diamondQuoteDetails: parsed.data }
    }
    const persistedSnapshot = data.customerSnapshot && typeof data.customerSnapshot === "object"
      ? data.customerSnapshot as Record<string, unknown>
      : snapshot
    const productName = persistedSnapshot.product_name ?? persistedSnapshot.productName ?? persistedSnapshot.product
    const quantity = Number(persistedSnapshot.quantity)
    const totalPrice = Number(persistedSnapshot.total_price ?? persistedSnapshot.totalPrice ?? data.total ?? current.total)
    const unitPrice = quantity > 0 ? totalPrice / quantity : totalPrice
    if (current.type === "product" && typeof productName === "string" && productName.trim() && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(totalPrice) && totalPrice >= 0) {
      data.customerSnapshot = { ...snapshot, product_name: productName, quantity, total_price: totalPrice }
    }
    const updated = await orderRepository.update({ workspaceId: input.workspaceId, orderId: input.orderId, values: data, expectedVersion: input.expectedVersion ?? current.version }, tx)
    if (!updated) throw validationException("version", "Order was modified. Please reload and try again.")
    if (current.type === "product" && typeof productName === "string" && productName.trim() && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(totalPrice) && totalPrice >= 0) {
      await orderRepository.replaceItems({ orderId: updated.id, values: [{ productName: productName.trim(), sku: null, productId: null, variantId: null, unitPrice, quantity, lineTotal: totalPrice, snapshot }] }, tx)
    }
    if (input.customFields) {
      await this.updateDraftCustomFields({ workspaceId: input.workspaceId, orderId: updated.id, values: input.customFields, tx })
    }
    return updated
  }

  async getById(input: { workspaceId: string; orderId: string; tx?: DatabaseClient }) {
    const order = await orderRepository.find(input, input.tx ?? db)
    if (!order) throw notFoundException("Order does not exist.")
    return order
  }

  async importExternalOrder(input: {
    workspaceId: string
    source: Exclude<OrderSource, "ai" | "manual" | "api">
    externalOrderId: string
    type: OrderType
    currency?: string
    status?: Extract<OrderStatus, "draft" | "confirmed" | "processing">
    subtotal?: number
    deliveryFee?: number
    discount?: number
    total?: number
    customerSnapshot?: Record<string, unknown>
    appointmentDetails?: unknown
    diamondQuoteDetails?: unknown
    items?: Array<{
      productId?: string | null
      variantId?: string | null
      productName: string
      sku?: string | null
      unitPrice: number
      quantity: number
      lineTotal: number
      snapshot?: Record<string, unknown>
    }>
    tx?: DatabaseClient
  }): Promise<OrderModel> {
    if (!input.externalOrderId.trim()) throw validationException("externalOrderId", "External order ID is required.")
    const appointmentDetails = input.appointmentDetails === undefined
      ? undefined
      : appointmentOrderDetailsSchema.safeParse(input.appointmentDetails)
    const diamondQuoteDetails = input.diamondQuoteDetails === undefined
      ? undefined
      : diamondQuoteDetailsSchema.safeParse(input.diamondQuoteDetails)
    if (input.type === "appointment" && (!appointmentDetails || !appointmentDetails.success)) {
      throw validationException("appointmentDetails", "Appointment orders require valid appointment details.")
    }
    if (input.type === "quote" && (!diamondQuoteDetails || !diamondQuoteDetails.success)) {
      throw validationException("diamondQuoteDetails", "Quote orders require valid diamond quote details.")
    }
    for (const [field, value] of Object.entries({
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      discount: input.discount,
      total: input.total,
    })) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw validationException(field, "Order amounts must be finite and non-negative.")
      }
    }
    if (input.items?.some((item) => {
      const expectedLineTotal = item.unitPrice * item.quantity
      return (
        !Number.isFinite(item.unitPrice) ||
        !Number.isFinite(item.lineTotal) ||
        item.quantity <= 0 ||
        item.unitPrice < 0 ||
        item.lineTotal < 0 ||
        Math.abs(item.lineTotal - expectedLineTotal) > 0.01
      )
    })) {
      throw validationException("items", "Order items must have valid quantity and prices.")
    }
    if (!input.tx) return await db.transaction((tx) => this.importExternalOrder({ ...input, tx }))

    const { tx } = input
    const existing = await orderRepository.findByExternalId({
      workspaceId: input.workspaceId,
      source: input.source,
      externalOrderId: input.externalOrderId,
    }, tx)
    if (existing) return existing

    const order = await orderRepository.create({
      workspaceId: input.workspaceId,
      type: input.type,
      source: input.source,
      externalOrderId: input.externalOrderId,
      status: input.type === "quote" ? "draft" : input.status ?? "confirmed",
      currency: input.currency ?? "USD",
      subtotal: input.subtotal ?? 0,
      deliveryFee: input.deliveryFee ?? 0,
      discount: input.discount ?? 0,
      total: input.total ?? 0,
      customerSnapshot:
        input.customerSnapshot || appointmentDetails?.success || diamondQuoteDetails?.success
          ? {
              ...(input.customerSnapshot ?? {}),
              ...(appointmentDetails?.success ? { appointmentDetails: appointmentDetails.data } : {}),
              ...(diamondQuoteDetails?.success ? { diamondQuoteDetails: diamondQuoteDetails.data } : {}),
            }
          : undefined,
      confirmedAt: input.type === "quote" || input.status === "draft" ? null : new Date(),
    }, tx)
    if (!order) throw new Error("Failed to import order")

    await orderRepository.createItems(
      (input.items ?? []).map((item) => ({ ...item, orderId: order.id })),
      tx,
    )
    await orderRepository.addStatusHistory({
      orderId: order.id,
      fromStatus: null,
      toStatus: order.status,
      reason: "external_order_imported",
      metadata: { externalOrderId: input.externalOrderId },
    }, tx)
    return order
  }

  async list(input: Parameters<typeof orderRepository.list>[0], tx?: DatabaseClient) {
    const database = tx ?? db
    const result = await orderRepository.list(input, database)
    const [definitions, customFieldRows] = await Promise.all([
      orderRepository.listCustomFieldDefinitions({ workspaceId: input.workspaceId }, database),
      orderRepository.listCustomFieldValues(
        { workspaceId: input.workspaceId, orderIds: result.data.map((order) => order.id) },
        database,
      ),
    ])
    const valuesByOrder = new Map<string, Map<string, unknown>>()
    for (const row of customFieldRows) {
      const valuesByDefinition = valuesByOrder.get(row.value.orderId) ?? new Map()
      valuesByDefinition.set(row.definition.id, row.value.value)
      valuesByOrder.set(row.value.orderId, valuesByDefinition)
    }

    const definitionsByType = new Map<OrderType, typeof definitions>()
    for (const definition of definitions) {
      const definitionsForType = definitionsByType.get(definition.orderType) ?? []
      definitionsForType.push(definition)
      definitionsByType.set(definition.orderType, definitionsForType)
    }

    const customFieldsByOrder = new Map<string, Array<{
      definitionId: string
      key: string
      label: string
      type: OrderCustomFieldType
      options: string[] | null
      displayOrder: number
      value: unknown
    }>>()
    for (const order of result.data) {
      const valuesByDefinition = valuesByOrder.get(order.id)
      customFieldsByOrder.set(
        order.id,
        (definitionsByType.get(order.type) ?? []).map((definition) => ({
          definitionId: definition.id,
          key: definition.key,
          label: definition.label,
          type: definition.type,
          options: definition.options,
          displayOrder: definition.displayOrder,
          value: valuesByDefinition?.get(definition.id),
        })),
      )
    }
    return {
      ...result,
      data: result.data.map((order) => ({
        ...order,
        customFields: (customFieldsByOrder.get(order.id) ?? []).sort(
          (a, b) => a.displayOrder - b.displayOrder,
        ),
      })),
    }
  }

  async listForExport(input: {
    workspaceId: string
    status?: OrderStatus
    statuses?: OrderStatus[]
    search?: string
    createdFrom?: Date
    createdTo?: Date
  }) {
    const orders: Awaited<ReturnType<typeof this.list>>["data"] = []
    let page = 1
    let pageCount = 1

    while (page <= pageCount) {
      const result = await this.list({
        ...input,
        page,
        perPage: 100,
      })
      orders.push(...result.data)
      pageCount = result.pageCount
      page += 1
    }

    const definitions = await this.listCustomFieldDefinitions({
      workspaceId: input.workspaceId,
    })
    const columns = definitions
      .filter(
        (definition) =>
          definition.key.toLowerCase().replace(/[\s_-]/g, "") !== "totalprice" &&
          orders.some(({ type }) => type === definition.orderType),
      )
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((definition) => ({
        key: definition.key,
        label: definition.label,
        definitionId: definition.id,
        type: definition.type,
        options: definition.options,
      }))

    return { orders, columns }
  }

  async listCustomFieldDefinitions(input: { workspaceId: string; orderType?: OrderType; tx?: DatabaseClient; }) {
    return await orderRepository.listCustomFieldDefinitions(input, input.tx ?? db)
  }

  async createCustomFieldDefinition(input: { workspaceId: string; orderType: OrderType; key: string; label: string; type: OrderCustomFieldType; required?: boolean; options?: string[]; aiVisible?: boolean; customerEditable?: boolean; displayOrder?: number; tx?: DatabaseClient }) {
    const key = input.key.trim()
    const label = input.label.trim()
    if (!key) throw validationException("key", "Custom field key is required.")
    if (!label) throw validationException("label", "Custom field label is required.")
    const { tx: _tx, ...values } = input
    return await orderRepository.createCustomFieldDefinition({ ...values, key, label }, input.tx ?? db)
  }

  async updateCustomFieldDefinition(input: { workspaceId: string; id: string; values: { key?: string; label?: string; type?: OrderCustomFieldType; required?: boolean; options?: string[]; aiVisible?: boolean; customerEditable?: boolean; displayOrder?: number }; tx?: DatabaseClient }) {
    const values = { ...input.values }
    if (values.key !== undefined) values.key = values.key.trim()
    if (values.label !== undefined) values.label = values.label.trim()
    if (values.key === "") throw validationException("key", "Custom field key is required.")
    if (values.label === "") throw validationException("label", "Custom field label is required.")
    const { tx: _tx, ...updateInput } = input
    const row = await orderRepository.updateCustomFieldDefinition({ ...updateInput, values }, input.tx ?? db)
    if (!row) throw notFoundException("Order custom field does not exist.")
    return row
  }

  async deleteCustomFieldDefinition(input: { workspaceId: string; id: string; tx?: DatabaseClient }) {
    const row = await orderRepository.deleteCustomFieldDefinition(input, input.tx ?? db)
    if (!row) throw notFoundException("Order custom field does not exist.")
    return row
  }

  async saveCustomFieldValues(input: { workspaceId: string; orderId: string; values: Array<{ definitionId: string; value: unknown }>; tx?: DatabaseClient }) {
    const { tx = db } = input
    const order = await this.getById(input)
    const definitions = await this.listCustomFieldDefinitions({ workspaceId: input.workspaceId, orderType: order.type, tx })
    const definitionIds = new Set(definitions.map((definition) => definition.id))
    if (input.values.some((value) => !definitionIds.has(value.definitionId))) throw validationException("values", "Order custom fields are invalid.")
    const provided = new Map(input.values.map((value) => [value.definitionId, value.value]))
    this.assertRequiredCustomFields(definitions, provided)
    return await orderRepository.saveCustomFieldValues({ orderId: input.orderId, values: input.values }, tx)
  }

  async updateDraftCustomFields(input: { workspaceId: string; orderId: string; values: Record<string, unknown>; tx?: DatabaseClient }) {
    const { tx = db } = input
    const order = await this.getById({ workspaceId: input.workspaceId, orderId: input.orderId, tx })
    if (!ACTIVE_STATUSES.includes(order.status)) throw validationException("status", "Only active drafts can be updated.")
    const definitions = await this.listCustomFieldDefinitions({ workspaceId: input.workspaceId, orderType: order.type, tx })
    const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]))
    const values = Object.entries(input.values).map(([key, value]) => {
      const definition = definitionsByKey.get(key)
      if (!definition) throw validationException(`customFields.${key}`, "This order custom field does not exist.")
      if (!definition.aiVisible) throw validationException(`customFields.${key}`, "This order custom field is not available to the AI.")
      return { definitionId: definition.id, value: this.normalizeCustomFieldValue(definition.type, value, definition.options, key) }
    })
    return await orderRepository.saveCustomFieldValues({ orderId: order.id, values }, tx)
  }

  private normalizeCustomFieldValue(type: OrderCustomFieldType, value: unknown, options: string[] | null, key: string) {
    if (value === null || value === undefined || value === "") return null
    if (type === "text" || type === "textarea" || type === "phone" || type === "email" || type === "address" || type === "product" || type === "variant") {
      if (typeof value !== "string" || !value.trim()) throw validationException(`customFields.${key}`, "A text value is required.")
      if (type === "email" && !/^\\S+@\\S+\\.\\S+$/.test(value.trim())) throw validationException(`customFields.${key}`, "A valid email is required.")
      return value.trim()
    }
    if (type === "number" || type === "currency") {
      const number = typeof value === "number" ? value : Number(value)
      if (!Number.isFinite(number)) throw validationException(`customFields.${key}`, "A valid number is required.")
      return number
    }
    if (type === "boolean") {
      if (typeof value === "boolean") return value
      if (value === "true") return true
      if (value === "false") return false
      throw validationException(`customFields.${key}`, "A boolean value is required.")
    }
    if (type === "select") {
      if (typeof value !== "string" || !options?.includes(value)) throw validationException(`customFields.${key}`, "Choose one of the configured options.")
      return value
    }
    if (type === "multiselect") {
      const selected = Array.isArray(value) ? value : [value]
      if (selected.some((item) => typeof item !== "string" || !options?.includes(item))) throw validationException(`customFields.${key}`, "Choose only configured options.")
      return [...new Set(selected)]
    }
    if (type === "date" || type === "datetime") {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw validationException(`customFields.${key}`, "A valid date is required.")
      return value
    }
    return value
  }

  private assertRequiredCustomFields(definitions: Array<{ id: string; key: string; required: boolean }>, values: Map<string, unknown>, snapshot?: Record<string, unknown> | null) {
    const missingRequired = definitions.filter((definition) => {
      const value = values.has(definition.id) ? values.get(definition.id) : snapshot?.[definition.key]
      return definition.required && (value === undefined || value === null || value === "")
    })
    if (missingRequired.length > 0) throw validationException("values", `Required order custom fields are missing: ${missingRequired.map((definition) => definition.key).join(", ")}.`)
  }

  private assertOrderComplete(
    order: OrderModel & {
      customFieldValues: Array<{ definition: { id: string }; value: unknown }>
    },
    definitions: Array<{ id: string; key: string; required: boolean }>,
  ) {
    const snapshot = order.customerSnapshot ?? {}
    if (order.type === "product") {
      const phone = snapshot.phone
      const customerName = snapshot.customer_name ?? snapshot.customerName
      const address = snapshot.delivery_address ?? snapshot.deliveryAddress
      const productName = snapshot.product_name ?? snapshot.productName ?? snapshot.product
      const quantity = Number(snapshot.quantity)
      const totalPrice = Number(snapshot.total_price ?? snapshot.totalPrice ?? order.total)
      if (
        typeof phone !== "string" ||
        !/^\+[1-9]\d{6,14}$/.test(phone) ||
        typeof customerName !== "string" ||
        !customerName.trim() ||
        typeof address !== "string" ||
        !address.trim() ||
        typeof productName !== "string" ||
        !productName.trim() ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(totalPrice) ||
        totalPrice < 0
      ) {
        throw validationException(
          "order",
          "Product orders require phone, customer name, delivery address, product name, quantity, and total price.",
        )
      }
    }
    if (
      order.type === "appointment" &&
      !appointmentOrderDetailsSchema.safeParse(snapshot.appointmentDetails).success
    ) {
      throw validationException(
        "appointmentDetails",
        "Appointment orders require valid appointment details.",
      )
    }
    if (
      order.type === "quote" &&
      !diamondQuoteDetailsSchema.safeParse(snapshot.diamondQuoteDetails).success
    ) {
      throw validationException(
        "diamondQuoteDetails",
        "Quote orders require valid diamond quote details.",
      )
    }
    this.assertRequiredCustomFields(
      definitions,
      new Map(order.customFieldValues.map((field) => [field.definition.id, field.value])),
      snapshot,
    )
  }

  async requestConfirmation(input: { workspaceId: string; orderId: string; token: string; tx?: DatabaseClient }): Promise<OrderModel> {
    if (!input.tx) return await db.transaction((tx) => this.requestConfirmation({ ...input, tx }))
    const { tx } = input
    const order = await this.getById({ ...input, tx })
    if (order.status !== "draft") return order
    if (order.type === "product") {
      const snapshot = order.customerSnapshot ?? {}
      const productName = snapshot.product_name ?? snapshot.productName ?? snapshot.product
      const quantity = Number(snapshot.quantity)
      const totalPrice = Number(snapshot.total_price ?? snapshot.totalPrice ?? order.total)
      if (typeof productName === "string" && productName.trim() && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(totalPrice) && totalPrice >= 0) {
        await orderRepository.replaceItems({ orderId: order.id, values: [{ productName: productName.trim(), sku: null, productId: null, variantId: null, unitPrice: totalPrice / quantity, quantity, lineTotal: totalPrice, snapshot }] }, tx)
      }
    }
    const definitions = await this.listCustomFieldDefinitions({ workspaceId: input.workspaceId, orderType: order.type, tx })
    this.assertOrderComplete(order, definitions)
    const updated = await orderRepository.update({ workspaceId: input.workspaceId, orderId: input.orderId, expectedVersion: order.version, values: { status: "awaiting_confirmation", confirmationMetadata: { token: input.token, version: order.version + 1 } } }, tx)
    if (!updated) throw validationException("version", "Order was modified. Please reload and try again.")
    await orderRepository.addStatusHistory({ orderId: order.id, fromStatus: order.status, toStatus: "awaiting_confirmation", reason: "confirmation_requested" }, tx)
    return updated
  }

  async confirm(input: { workspaceId: string; orderId: string; token: string; version: number; idempotencyKey?: string; tx?: DatabaseClient }): Promise<OrderModel> {
    if (!input.tx) return await db.transaction((tx) => this.confirm({ ...input, tx }))
    const { tx } = input
    const order = await this.getById({ ...input, tx })
    if (order.status === "confirmed") return order
    if (order.status !== "awaiting_confirmation") throw validationException("status", "Order is not awaiting confirmation.")
    if (order.expiresAt && order.expiresAt <= new Date()) {
      await this.changeStatus({
        workspaceId: input.workspaceId,
        orderId: input.orderId,
        status: "expired",
        reason: "confirmation_expired",
        expectedVersion: order.version,
        tx,
      })
      throw validationException("token", "Confirmation has expired.")
    }
    const metadata = order.confirmationMetadata
    if (metadata?.token !== input.token || metadata?.version !== input.version) throw validationException("token", "Confirmation token is invalid or expired.")
    const definitions = await this.listCustomFieldDefinitions({ workspaceId: input.workspaceId, orderType: order.type, tx })
    this.assertOrderComplete(order, definitions)
    const updated = await orderRepository.update({ workspaceId: input.workspaceId, orderId: input.orderId, expectedVersion: order.version, values: { status: "confirmed", confirmedAt: new Date(), confirmationMetadata: { ...metadata, idempotencyKey: input.idempotencyKey ?? null } } }, tx)
    if (!updated) return await this.getById({ ...input, tx })
    await orderRepository.addStatusHistory({ orderId: order.id, fromStatus: order.status, toStatus: "confirmed", reason: "confirmed", metadata: input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined }, tx)
    return updated
  }

  async cancel(input: { workspaceId: string; orderId: string; reason?: string; tx?: DatabaseClient }) { return await this.changeStatus({ ...input, status: "cancelled", reason: input.reason }) }

  async changeStatus(input: { workspaceId: string; orderId: string; status: OrderStatus; reason?: string; expectedVersion?: number; tx?: DatabaseClient }): Promise<OrderModel> {
    if (!input.tx) return await db.transaction((tx) => this.changeStatus({ ...input, tx }))
    const { tx } = input
    const order = await this.getById({ ...input, tx })
    if (order.status === input.status) return order
    if (!ALLOWED_TRANSITIONS[order.status]?.includes(input.status)) {
      throw validationException("status", `Cannot move an order from ${order.status} to ${input.status}.`)
    }
    const updated = await orderRepository.update({ workspaceId: input.workspaceId, orderId: input.orderId, expectedVersion: input.expectedVersion ?? order.version, values: { status: input.status } }, tx)
    if (!updated) throw validationException("version", "Order was modified. Please reload and try again.")
    await orderRepository.addStatusHistory({ orderId: order.id, fromStatus: order.status, toStatus: input.status, reason: input.reason }, tx)
    return updated
  }
}

export const orderService = new OrderService()
