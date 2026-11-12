import { sql } from "drizzle-orm"
import {
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
  type OrderConversationSessionState,
  orderConversationSessionStates,
} from "../partials/order-intake-session"
import { bigintAsString, sharedColumns, timestampConfig } from "../partials/shared"
import { contactModel } from "./contact"
import { conversationModel } from "./conversation"
import { orderModel } from "./order"
import { workspaceModel } from "./workspace"

export const orderConversationSessionState = pgEnum(
  "orderConversationSessionState",
  orderConversationSessionStates.options as [
    OrderConversationSessionState,
    ...OrderConversationSessionState[],
  ],
)

export const orderConversationSessionModel = pgTable(
  "OrderConversationSession",
  {
    ...sharedColumns,
    workspaceId: bigintAsString()
      .notNull()
      .references(() => workspaceModel.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    conversationId: bigintAsString()
      .notNull()
      .references(() => conversationModel.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    contactId: bigintAsString().references(() => contactModel.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    intentMessageId: text().notNull(),
    state: orderConversationSessionState().notNull().default("collecting"),
    collectedData: jsonb().$type<Record<string, unknown>>().notNull(),
    orderId: bigintAsString().references(() => orderModel.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    version: integer().notNull().default(1),
    expiresAt: timestamp(timestampConfig).notNull(),
    closedAt: timestamp(timestampConfig),
  },
  (table) => [
    uniqueIndex(
      "OrderConversationSession_workspaceId_conversationId_intentMessageId_key",
    ).on(table.workspaceId, table.conversationId, table.intentMessageId),
    uniqueIndex("OrderConversationSession_orderId_key")
      .on(table.orderId)
      .where(sql`${table.orderId} IS NOT NULL`),
    index("OrderConversationSession_workspaceId_conversationId_createdAt_idx").on(
      table.workspaceId,
      table.conversationId,
      table.createdAt,
    ),
    index("OrderConversationSession_workspaceId_conversationId_state_idx").on(
      table.workspaceId,
      table.conversationId,
      table.state,
    ),
  ],
)
