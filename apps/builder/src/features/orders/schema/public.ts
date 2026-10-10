import {
  appointmentOrderDetailsSchema,
  diamondQuoteDetailsSchema,
  orderSources,
  orderStatuses,
  orderTypes,
} from "@chatbotx.io/database/partials"
import { z } from "zod"
import { publicListRequest } from "@/lib/public-api/list"

const orderItemRequest = z.object({
  productId: z.string().nullable().optional().describe("Workspace product identifier, when the item comes from the product catalog."),
  variantId: z.string().nullable().optional().describe("Workspace product variant identifier, when the item has a variant."),
  productName: z.string().min(1).describe("Product name captured from the external order."),
  sku: z.string().nullable().optional().describe("Product SKU supplied by the source system."),
  unitPrice: z.number().nonnegative().describe("Price of one item in the order currency."),
  quantity: z.number().int().positive().describe("Number of units ordered."),
  lineTotal: z.number().nonnegative().describe("Total price for this line after multiplying unit price by quantity."),
  snapshot: z.record(z.string(), z.unknown()).optional().describe("Additional immutable product data captured from the source."),
})

const publicOrderItemResource = z.object({
  id: z.string().describe("Unique order item identifier."),
  orderId: z.string().describe("Identifier of the parent order."),
  productId: z.string().nullable().describe("Catalog product identifier, when available."),
  variantId: z.string().nullable().describe("Catalog variant identifier, when available."),
  productName: z.string().describe("Product name captured at order time."),
  sku: z.string().nullable().describe("Product SKU captured at order time."),
  unitPrice: z.number().describe("Price of one item in the order currency."),
  quantity: z.number().int().describe("Number of units ordered."),
  lineTotal: z.number().describe("Total price for this order line."),
  snapshot: z.record(z.string(), z.unknown()).nullable().describe("Immutable product data captured at order time."),
})

export const listOrdersPublicRequest = publicListRequest.extend({
  status: orderStatuses.optional().describe("Filter orders by one lifecycle status."),
  search: z.string().trim().optional().describe("Search by order identifier or external source order identifier."),
})

export const orderIdPublicRequest = z.object({
  id: z.string().min(1).describe("Workspace order identifier."),
})

export const importExternalOrderPublicRequest = z.object({
  source: orderSources.exclude(["ai", "manual", "api"]).describe("Origin of the external order."),
  externalOrderId: z.string().trim().min(1).max(255).describe("Stable order identifier from the source system; repeated imports are idempotent."),
  type: orderTypes.describe("Business type of the order, such as product, appointment, quote, or digital service."),
  status: z.enum(["draft", "confirmed", "processing"]).optional().describe("Initial lifecycle status assigned to the imported order."),
  currency: z.string().trim().min(1).max(10).optional().describe("ISO-style currency code used for the order amounts."),
  subtotal: z.number().nonnegative().optional().describe("Sum of item prices before delivery and discount."),
  deliveryFee: z.number().nonnegative().optional().describe("Delivery charge applied to the order."),
  discount: z.number().nonnegative().optional().describe("Discount applied to the order."),
  total: z.number().nonnegative().optional().describe("Final order amount after delivery and discount."),
  customerSnapshot: z.record(z.string(), z.unknown()).optional().describe("Customer details copied from the source at import time."),
  appointmentDetails: appointmentOrderDetailsSchema.optional().describe("Typed appointment details for appointment orders."),
  diamondQuoteDetails: diamondQuoteDetailsSchema.optional().describe("Typed diamond requirements for quote orders."),
  items: z.array(orderItemRequest).max(100).optional().describe("Line items captured from the source order."),
})

export const publicOrderResource = z.object({
  id: z.string().describe("Unique workspace order identifier."),
  contactId: z.string().nullable().describe("Associated contact identifier, when the order is linked to a contact."),
  conversationId: z.string().nullable().describe("Conversation identifier that produced the order, when available."),
  type: orderTypes.describe("Business type of the order."),
  status: orderStatuses.describe("Current order lifecycle status."),
  version: z.number().describe("Optimistic-lock version of the order."),
  fulfillmentStatus: z.enum(["unfulfilled", "partially_fulfilled", "fulfilled", "cancelled"]).describe("Current fulfillment state of the order."),
  source: orderSources.describe("Origin channel or integration that created the order."),
  externalOrderId: z.string().nullable().describe("Identifier assigned by the source system, when available."),
  currency: z.string().describe("Currency used for all monetary values."),
  subtotal: z.number().describe("Sum of item prices before delivery and discount."),
  deliveryFee: z.number().describe("Delivery charge applied to the order."),
  discount: z.number().describe("Discount applied to the order."),
  total: z.number().describe("Final order amount."),
  customerSnapshot: z.record(z.string(), z.unknown()).nullable().describe("Customer details captured with the order."),
  confirmationMetadata: z.record(z.string(), z.unknown()).nullable().describe("Confirmation metadata retained for lifecycle validation."),
  expiresAt: z.date().nullable().describe("Time after which an outstanding confirmation expires."),
  confirmedAt: z.date().nullable().describe("Time when the order became confirmed."),
  createdAt: z.date().describe("Time when the order was created."),
  updatedAt: z.date().describe("Time when the order was last updated."),
  items: z.array(publicOrderItemResource).optional().describe("Line items included when retrieving a single order."),
})
