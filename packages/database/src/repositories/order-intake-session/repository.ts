import {
  and,
  type DatabaseClient,
  db,
  eq,
  isNull,
} from "../../client"
import { orderConversationSessionModel } from "../../schema"
import type { OrderConversationSessionState } from "../../partials"
import { createId } from "@chatbotx.io/utils"

export const orderIntakeSessionRepository = {
  async createForIntent(
    input: {
      workspaceId: string
      conversationId: string
      contactId?: string | null
      intentMessageId: string
      expiresAt: Date
    },
    tx: DatabaseClient = db,
  ) {
    const [created] = await tx
      .insert(orderConversationSessionModel)
      .values({
        id: createId(),
        workspaceId: input.workspaceId,
        conversationId: input.conversationId,
        contactId: input.contactId ?? null,
        intentMessageId: input.intentMessageId,
        collectedData: {},
        expiresAt: input.expiresAt,
      })
      .onConflictDoNothing({
        target: [
          orderConversationSessionModel.workspaceId,
          orderConversationSessionModel.conversationId,
          orderConversationSessionModel.intentMessageId,
        ],
      })
      .returning()
    if (created) return created
    return await this.findByIntent(input, tx)
  },

  async findByIntent(
    input: { workspaceId: string; conversationId: string; intentMessageId: string },
    tx: DatabaseClient = db,
  ) {
    return await tx.query.orderConversationSessionModel.findFirst({
      where: {
        workspaceId: input.workspaceId,
        conversationId: input.conversationId,
        intentMessageId: input.intentMessageId,
      },
    })
  },

  async findById(
    input: { workspaceId: string; sessionId: string },
    tx: DatabaseClient = db,
  ) {
    return await tx.query.orderConversationSessionModel.findFirst({
      where: { id: input.sessionId, workspaceId: input.workspaceId },
    })
  },

  async findBoundOrder(
    input: { workspaceId: string; sessionId: string },
    tx: DatabaseClient = db,
  ) {
    return await tx.query.orderConversationSessionModel.findFirst({
      where: { id: input.sessionId, workspaceId: input.workspaceId },
      with: { order: true },
    })
  },

  async update(
    input: {
      workspaceId: string
      sessionId: string
      expectedVersion: number
      values: Partial<
        Pick<
          typeof orderConversationSessionModel.$inferInsert,
          "collectedData" | "state" | "expiresAt" | "closedAt"
        >
      >
    },
    tx: DatabaseClient = db,
  ) {
    const [row] = await tx
      .update(orderConversationSessionModel)
      .set({
        ...input.values,
        version: input.expectedVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orderConversationSessionModel.workspaceId, input.workspaceId),
          eq(orderConversationSessionModel.id, input.sessionId),
          eq(orderConversationSessionModel.version, input.expectedVersion),
        ),
      )
      .returning()
    return row
  },

  async bindOrder(
    input: {
      workspaceId: string
      sessionId: string
      expectedVersion: number
      orderId: string
      state?: Extract<OrderConversationSessionState, "draft_created" | "completed">
      closedAt?: Date | null
    },
    tx: DatabaseClient = db,
  ) {
    const [row] = await tx
      .update(orderConversationSessionModel)
      .set({
        orderId: input.orderId,
        state: input.state ?? "draft_created",
        closedAt: input.closedAt,
        version: input.expectedVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orderConversationSessionModel.workspaceId, input.workspaceId),
          eq(orderConversationSessionModel.id, input.sessionId),
          eq(orderConversationSessionModel.version, input.expectedVersion),
          isNull(orderConversationSessionModel.orderId),
        ),
      )
      .returning()
    return row
  },
}
