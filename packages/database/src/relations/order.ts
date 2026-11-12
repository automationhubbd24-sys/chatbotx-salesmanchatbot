import { defineRelationsPart } from "drizzle-orm"
// biome-ignore lint/performance/noNamespaceImport: drizzle schema
import * as schema from "../schema"

export const orderRelations = defineRelationsPart(schema, (r) => ({
  orderModel: {
    workspace: r.one.workspaceModel({ from: r.orderModel.workspaceId, to: r.workspaceModel.id, optional: false }),
    contact: r.one.contactModel({ from: r.orderModel.contactId, to: r.contactModel.id }),
    conversation: r.one.conversationModel({ from: r.orderModel.conversationId, to: r.conversationModel.id }),
    items: r.many.orderItemModel({ from: r.orderModel.id, to: r.orderItemModel.orderId }),
    customFieldValues: r.many.orderCustomFieldValueModel({ from: r.orderModel.id, to: r.orderCustomFieldValueModel.orderId }),
    statusHistory: r.many.orderStatusHistoryModel({ from: r.orderModel.id, to: r.orderStatusHistoryModel.orderId }),
    externalMappings: r.many.externalOrderMappingModel({ from: r.orderModel.id, to: r.externalOrderMappingModel.orderId }),
  },
  orderItemModel: {
    order: r.one.orderModel({ from: r.orderItemModel.orderId, to: r.orderModel.id, optional: false }),
    product: r.one.productModel({ from: r.orderItemModel.productId, to: r.productModel.id }),
    variant: r.one.productVariantModel({ from: r.orderItemModel.variantId, to: r.productVariantModel.id }),
  },
  orderCustomFieldDefinitionModel: {
    workspace: r.one.workspaceModel({ from: r.orderCustomFieldDefinitionModel.workspaceId, to: r.workspaceModel.id, optional: false }),
    values: r.many.orderCustomFieldValueModel({ from: r.orderCustomFieldDefinitionModel.id, to: r.orderCustomFieldValueModel.definitionId }),
  },
  orderCustomFieldValueModel: {
    order: r.one.orderModel({ from: r.orderCustomFieldValueModel.orderId, to: r.orderModel.id, optional: false }),
    definition: r.one.orderCustomFieldDefinitionModel({ from: r.orderCustomFieldValueModel.definitionId, to: r.orderCustomFieldDefinitionModel.id, optional: false }),
  },
  orderStatusHistoryModel: {
    order: r.one.orderModel({ from: r.orderStatusHistoryModel.orderId, to: r.orderModel.id, optional: false }),
  },
  externalOrderMappingModel: {
    workspace: r.one.workspaceModel({ from: r.externalOrderMappingModel.workspaceId, to: r.workspaceModel.id, optional: false }),
    order: r.one.orderModel({ from: r.externalOrderMappingModel.orderId, to: r.orderModel.id, optional: false }),
  },
}))
