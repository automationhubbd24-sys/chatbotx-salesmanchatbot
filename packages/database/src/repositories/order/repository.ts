import {
  and,
  asc,
  count,
  desc,
  ilike,
  inArray,
  type DatabaseClient,
  db,
  eq,
  or,
  sql,
} from "@chatbotx.io/database/client"
import {
  orderCustomFieldDefinitionModel,
  orderCustomFieldValueModel,
  orderItemModel,
  orderModel,
  orderStatusHistoryModel,
} from "@chatbotx.io/database/schema"
import type { OrderStatus } from "@chatbotx.io/database/partials"
import { createId } from "@chatbotx.io/utils"

export type OrderInsertValues = Omit<typeof orderModel.$inferInsert, "id">
export type OrderUpdateValues = Partial<Omit<typeof orderModel.$inferInsert, "id" | "workspaceId">>

export const orderRepository = {
  async list(
    input: {
      workspaceId: string
      status?: OrderStatus
      statuses?: OrderStatus[]
      contactId?: string
      conversationId?: string
      search?: string
      page?: number
      perPage?: number
    },
    tx: DatabaseClient = db,
  ) {
    const conditions = [eq(orderModel.workspaceId, input.workspaceId)]
    if (input.status) conditions.push(eq(orderModel.status, input.status))
    if (input.statuses?.length) conditions.push(inArray(orderModel.status, input.statuses))
    if (input.contactId) conditions.push(eq(orderModel.contactId, input.contactId))
    if (input.conversationId) conditions.push(eq(orderModel.conversationId, input.conversationId))
    if (input.search?.trim()) {
      const search = `%${input.search.trim()}%`
      conditions.push(or(sql`${orderModel.id}::text ILIKE ${search}`, ilike(orderModel.externalOrderId, search))!)
    }

    const page = Math.max(input.page ?? 1, 1)
    const perPage = Math.min(Math.max(input.perPage ?? 25, 1), 100)
    const offset = (page - 1) * perPage
    const [data, [{ total }]] = await Promise.all([
      tx.select().from(orderModel).where(and(...conditions)).orderBy(desc(orderModel.createdAt)).limit(perPage).offset(offset),
      tx.select({ total: count() }).from(orderModel).where(and(...conditions)),
    ])
    return { data, pageCount: Math.ceil(Number(total) / perPage), total: Number(total) }
  },
  async find(input: { workspaceId: string; orderId: string }, tx: DatabaseClient = db) {
    return await tx.query.orderModel.findFirst({ where: { id: input.orderId, workspaceId: input.workspaceId }, with: {
        items: true,
        statusHistory: true,
        customFieldValues: { with: { definition: true } },
      } })
  },
  async findActiveDraft(input: { workspaceId: string; conversationId?: string | null; contactId?: string | null }, tx: DatabaseClient = db) {
    const basePredicates = [
      eq(orderModel.workspaceId, input.workspaceId),
      inArray(orderModel.status, ["draft", "awaiting_confirmation"] as OrderStatus[]),
    ]

    if (input.conversationId) {
      const [conversationOrder] = await tx
        .select()
        .from(orderModel)
        .where(and(...basePredicates, eq(orderModel.conversationId, input.conversationId)))
        .orderBy(desc(orderModel.createdAt))
        .limit(1)
      if (conversationOrder) return conversationOrder
    }

    if (!input.contactId) return

    const [contactOrder] = await tx
      .select()
      .from(orderModel)
      .where(and(...basePredicates, eq(orderModel.contactId, input.contactId)))
      .orderBy(desc(orderModel.createdAt))
      .limit(1)
    return contactOrder
  },
  async create(values: OrderInsertValues, tx: DatabaseClient = db) {
    const [row] = await tx.insert(orderModel).values({ id: createId(), ...values }).returning()
    return row
  },
  async findByExternalId(input: { workspaceId: string; source: OrderInsertValues["source"]; externalOrderId: string }, tx: DatabaseClient = db) {
    const [row] = await tx
      .select()
      .from(orderModel)
      .where(and(
        eq(orderModel.workspaceId, input.workspaceId),
        eq(orderModel.source, input.source),
        eq(orderModel.externalOrderId, input.externalOrderId),
      ))
      .limit(1)
    return row
  },
  async createItems(values: Array<Omit<typeof orderItemModel.$inferInsert, "id">>, tx: DatabaseClient = db) {
    if (values.length === 0) return []
    return await tx.insert(orderItemModel).values(values.map((value) => ({ id: createId(), ...value }))).returning()
  },
  async replaceItems(input: { orderId: string; values: Array<Omit<typeof orderItemModel.$inferInsert, "id" | "orderId">> }, tx: DatabaseClient = db) {
    await tx.delete(orderItemModel).where(eq(orderItemModel.orderId, input.orderId))
    if (input.values.length === 0) return []
    return await tx.insert(orderItemModel).values(input.values.map((value) => ({ id: createId(), orderId: input.orderId, ...value }))).returning()
  },
  async update(input: { workspaceId: string; orderId: string; values: OrderUpdateValues; expectedVersion?: number }, tx: DatabaseClient = db) {
    const conditions = [eq(orderModel.workspaceId, input.workspaceId), eq(orderModel.id, input.orderId)]
    if (input.expectedVersion !== undefined) conditions.push(eq(orderModel.version, input.expectedVersion))
    const [row] = await tx.update(orderModel).set({ ...input.values, version: sql`${orderModel.version} + 1`, updatedAt: new Date() }).where(and(...conditions)).returning()
    return row
  },
  async upsertActiveDraft(input: { values: OrderInsertValues; workspaceId: string; conversationId?: string | null; contactId?: string | null }, tx: DatabaseClient = db) {
    const existing = await this.findActiveDraft(input, tx)
    if (existing) return existing
    return await this.create(input.values, tx)
  },
  async addStatusHistory(values: Omit<typeof orderStatusHistoryModel.$inferInsert, "id">, tx: DatabaseClient = db) {
    const [row] = await tx.insert(orderStatusHistoryModel).values({ id: createId(), ...values }).returning()
    return row
  },
  async listCustomFieldDefinitions(input: { workspaceId: string; orderType?: typeof orderCustomFieldDefinitionModel.$inferSelect["orderType"] }, tx: DatabaseClient = db) {
    const conditions = [eq(orderCustomFieldDefinitionModel.workspaceId, input.workspaceId)]
    if (input.orderType) conditions.push(eq(orderCustomFieldDefinitionModel.orderType, input.orderType))
    return await tx.select().from(orderCustomFieldDefinitionModel).where(and(...conditions)).orderBy(asc(orderCustomFieldDefinitionModel.displayOrder), asc(orderCustomFieldDefinitionModel.createdAt))
  },
  async createCustomFieldDefinition(values: Omit<typeof orderCustomFieldDefinitionModel.$inferInsert, "id">, tx: DatabaseClient = db) {
    const [row] = await tx.insert(orderCustomFieldDefinitionModel).values({ id: createId(), ...values }).returning()
    return row
  },
  async updateCustomFieldDefinition(input: { workspaceId: string; id: string; values: Partial<Omit<typeof orderCustomFieldDefinitionModel.$inferInsert, "id" | "workspaceId">> }, tx: DatabaseClient = db) {
    const [row] = await tx.update(orderCustomFieldDefinitionModel).set({ ...input.values, updatedAt: new Date() }).where(and(eq(orderCustomFieldDefinitionModel.workspaceId, input.workspaceId), eq(orderCustomFieldDefinitionModel.id, input.id))).returning()
    return row
  },
  async deleteCustomFieldDefinition(input: { workspaceId: string; id: string }, tx: DatabaseClient = db) {
    const [row] = await tx.delete(orderCustomFieldDefinitionModel).where(and(eq(orderCustomFieldDefinitionModel.workspaceId, input.workspaceId), eq(orderCustomFieldDefinitionModel.id, input.id))).returning()
    return row
  },
  async saveCustomFieldValues(input: { orderId: string; values: Array<{ definitionId: string; value: unknown }> }, tx: DatabaseClient = db) {
    if (input.values.length === 0) return []
    return await tx.insert(orderCustomFieldValueModel).values(input.values.map((value) => ({ id: createId(), orderId: input.orderId, ...value }))).onConflictDoUpdate({ target: [orderCustomFieldValueModel.orderId, orderCustomFieldValueModel.definitionId], set: { value: sql`excluded.value`, updatedAt: new Date() } }).returning()
  },
}
