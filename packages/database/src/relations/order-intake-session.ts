import { defineRelationsPart } from "drizzle-orm"
// biome-ignore lint/performance/noNamespaceImport: drizzle schema
import * as schema from "../schema"

export const orderIntakeSessionRelations = defineRelationsPart(schema, (r) => ({
  orderConversationSessionModel: {
    workspace: r.one.workspaceModel({
      from: r.orderConversationSessionModel.workspaceId,
      to: r.workspaceModel.id,
    }),
    conversation: r.one.conversationModel({
      from: r.orderConversationSessionModel.conversationId,
      to: r.conversationModel.id,
    }),
    contact: r.one.contactModel({
      from: r.orderConversationSessionModel.contactId,
      to: r.contactModel.id,
    }),
    order: r.one.orderModel({
      from: r.orderConversationSessionModel.orderId,
      to: r.orderModel.id,
    }),
  },
}))
