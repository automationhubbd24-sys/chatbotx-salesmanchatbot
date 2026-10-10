import { sql } from "drizzle-orm"
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import {
  type OrderCustomFieldType,
  orderCustomFieldTypes,
  type OrderFulfillmentStatus,
  orderFulfillmentStatuses,
  type OrderSource,
  orderSources,
  type OrderStatus,
  orderStatuses,
  type OrderType,
  orderTypes,
} from "../partials/order"
import { bigintAsString, sharedColumns, timestampConfig } from "../partials/shared"
import { contactModel } from "./contact"
import { conversationModel } from "./conversation"
import { productModel } from "./product"
import { productVariantModel } from "./product-variant"
import { workspaceModel } from "./workspace"

export const orderType = pgEnum("orderType", orderTypes.options as [OrderType, ...OrderType[]])
export const orderStatus = pgEnum("orderStatus", orderStatuses.options as [OrderStatus, ...OrderStatus[]])
export const orderSource = pgEnum("orderSource", orderSources.options as [OrderSource, ...OrderSource[]])
export const orderFulfillmentStatus = pgEnum(
  "orderFulfillmentStatus",
  orderFulfillmentStatuses.options as [OrderFulfillmentStatus, ...OrderFulfillmentStatus[]],
)
export const orderCustomFieldType = pgEnum(
  "orderCustomFieldType",
  orderCustomFieldTypes.options as [OrderCustomFieldType, ...OrderCustomFieldType[]],
)

export const orderModel = pgTable(
  "Order",
  {
    ...sharedColumns,
    workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade", onUpdate: "cascade" }),
    contactId: bigintAsString().references(() => contactModel.id, { onDelete: "set null", onUpdate: "cascade" }),
    conversationId: bigintAsString().references(() => conversationModel.id, { onDelete: "set null", onUpdate: "cascade" }),
    type: orderType().notNull(),
    status: orderStatus().notNull().default("draft"),
    version: integer().notNull().default(1),
    fulfillmentStatus: orderFulfillmentStatus().notNull().default("unfulfilled"),
    source: orderSource().notNull(),
    externalOrderId: text(),
    currency: text().notNull().default("USD"),
    subtotal: doublePrecision().notNull().default(0),
    deliveryFee: doublePrecision().notNull().default(0),
    discount: doublePrecision().notNull().default(0),
    total: doublePrecision().notNull().default(0),
    customerSnapshot: jsonb().$type<Record<string, unknown>>(),
    confirmationMetadata: jsonb().$type<Record<string, unknown>>(),
    expiresAt: timestamp(timestampConfig),
    confirmedAt: timestamp(timestampConfig),
  },
  (table) => [
    index("Order_workspaceId_status_createdAt_idx").on(table.workspaceId, table.status, table.createdAt),
    index("Order_workspaceId_contactId_createdAt_idx").on(table.workspaceId, table.contactId, table.createdAt),
    uniqueIndex("Order_workspaceId_source_externalOrderId_key")
      .on(table.workspaceId, table.source, table.externalOrderId)
      .where(sql`${table.externalOrderId} IS NOT NULL`),
  ],
)

export const orderItemModel = pgTable(
  "OrderItem",
  {
    ...sharedColumns,
    orderId: bigintAsString().notNull().references(() => orderModel.id, { onDelete: "cascade", onUpdate: "cascade" }),
    productId: bigintAsString().references(() => productModel.id, { onDelete: "set null", onUpdate: "cascade" }),
    variantId: bigintAsString().references(() => productVariantModel.id, { onDelete: "set null", onUpdate: "cascade" }),
    productName: text().notNull(),
    sku: text(),
    unitPrice: doublePrecision().notNull().default(0),
    quantity: integer().notNull().default(1),
    lineTotal: doublePrecision().notNull().default(0),
    snapshot: jsonb().$type<Record<string, unknown>>(),
  },
  (table) => [index("OrderItem_orderId_idx").on(table.orderId)],
)

export const orderCustomFieldDefinitionModel = pgTable(
  "OrderCustomFieldDefinition",
  {
    ...sharedColumns,
    workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade", onUpdate: "cascade" }),
    orderType: orderType().notNull(),
    key: text().notNull(),
    label: text().notNull(),
    type: orderCustomFieldType().notNull(),
    required: boolean().notNull().default(false),
    options: jsonb().$type<string[]>(),
    aiVisible: boolean().notNull().default(true),
    customerEditable: boolean().notNull().default(true),
    displayOrder: integer().notNull().default(0),
  },
  (table) => [
    uniqueIndex("OrderCustomFieldDefinition_workspaceId_orderType_key").on(table.workspaceId, table.orderType, table.key),
    index("OrderCustomFieldDefinition_workspaceId_orderType_displayOrder_idx").on(table.workspaceId, table.orderType, table.displayOrder),
  ],
)

export const orderCustomFieldValueModel = pgTable(
  "OrderCustomFieldValue",
  {
    ...sharedColumns,
    orderId: bigintAsString().notNull().references(() => orderModel.id, { onDelete: "cascade", onUpdate: "cascade" }),
    definitionId: bigintAsString().notNull().references(() => orderCustomFieldDefinitionModel.id, { onDelete: "cascade", onUpdate: "cascade" }),
    value: jsonb().$type<unknown>(),
  },
  (table) => [
    uniqueIndex("OrderCustomFieldValue_orderId_definitionId_key").on(table.orderId, table.definitionId),
    index("OrderCustomFieldValue_definitionId_idx").on(table.definitionId),
  ],
)

export const orderStatusHistoryModel = pgTable(
  "OrderStatusHistory",
  {
    ...sharedColumns,
    orderId: bigintAsString().notNull().references(() => orderModel.id, { onDelete: "cascade", onUpdate: "cascade" }),
    fromStatus: orderStatus(),
    toStatus: orderStatus().notNull(),
    reason: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
  },
  (table) => [index("OrderStatusHistory_orderId_createdAt_idx").on(table.orderId, table.createdAt)],
)

export const externalOrderMappingModel = pgTable(
  "ExternalOrderMapping",
  {
    ...sharedColumns,
    workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade", onUpdate: "cascade" }),
    orderId: bigintAsString().notNull().references(() => orderModel.id, { onDelete: "cascade", onUpdate: "cascade" }),
    provider: text().notNull(),
    externalOrderId: text().notNull(),
    externalStatus: text(),
    rawPayload: jsonb().$type<Record<string, unknown>>(),
    lastSyncedAt: timestamp(timestampConfig),
  },
  (table) => [
    uniqueIndex("ExternalOrderMapping_workspaceId_provider_externalOrderId_key").on(table.workspaceId, table.provider, table.externalOrderId),
    uniqueIndex("ExternalOrderMapping_orderId_provider_key").on(table.orderId, table.provider),
    index("ExternalOrderMapping_workspaceId_orderId_idx").on(table.workspaceId, table.orderId),
  ],
)
