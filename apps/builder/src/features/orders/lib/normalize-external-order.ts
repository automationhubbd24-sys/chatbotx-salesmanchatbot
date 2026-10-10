import {
  appointmentOrderDetailsSchema,
  diamondQuoteDetailsSchema,
  orderTypes,
} from "@chatbotx.io/database/partials"
import { z } from "zod"
import { importExternalOrderPublicRequest } from "../schema/public"

const supportedExternalSources = [
  "website",
  "landing_page",
  "messenger",
  "whatsapp",
  "instagram",
] as const

const numberLike = z.union([z.number(), z.string().trim().min(1)]).optional()

const externalItemSchema = z.object({
  productId: z.string().trim().min(1).nullable().optional(),
  variantId: z.string().trim().min(1).nullable().optional(),
  productName: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).nullable().optional(),
  unitPrice: numberLike,
  price: numberLike,
  quantity: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
  lineTotal: numberLike,
  total: numberLike,
  snapshot: z.record(z.string(), z.unknown()).optional(),
}).passthrough()

const externalOrderPayloadSchema = z.object({
  externalOrderId: z.string().trim().min(1).max(255).optional(),
  id: z.union([z.string().trim().min(1), z.number()]).optional(),
  orderId: z.union([z.string().trim().min(1), z.number()]).optional(),
  type: orderTypes.optional(),
  status: z.enum(["draft", "confirmed", "processing"]).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  subtotal: numberLike,
  subtotalAmount: numberLike,
  deliveryFee: numberLike,
  shipping: numberLike,
  shippingAmount: numberLike,
  discount: numberLike,
  discountAmount: numberLike,
  total: numberLike,
  totalAmount: numberLike,
  customerSnapshot: z.record(z.string(), z.unknown()).optional(),
  customer: z.record(z.string(), z.unknown()).optional(),
  appointmentDetails: z.record(z.string(), z.unknown()).optional(),
  diamondQuoteDetails: z.record(z.string(), z.unknown()).optional(),
  items: z.array(externalItemSchema).max(100).optional(),
  lineItems: z.array(externalItemSchema).max(100).optional(),
}).passthrough()

const sourceInputSchema = z.object({
  source: z.enum(supportedExternalSources),
  payload: externalOrderPayloadSchema,
})

export const externalOrderIntakeSchema = z.discriminatedUnion("source", [
  sourceInputSchema.extend({ source: z.literal("website") }),
  sourceInputSchema.extend({ source: z.literal("landing_page") }),
  sourceInputSchema.extend({ source: z.literal("messenger") }),
  sourceInputSchema.extend({ source: z.literal("whatsapp") }),
  sourceInputSchema.extend({ source: z.literal("instagram") }),
])

export type ExternalOrderIntake = z.infer<typeof externalOrderIntakeSchema>
export type WebsiteOrderIntake = Extract<ExternalOrderIntake, { source: "website" }>
export type LandingPageOrderIntake = Extract<ExternalOrderIntake, { source: "landing_page" }>
export type MessengerOrderIntake = Extract<ExternalOrderIntake, { source: "messenger" }>
export type WhatsappOrderIntake = Extract<ExternalOrderIntake, { source: "whatsapp" }>
export type InstagramOrderIntake = Extract<ExternalOrderIntake, { source: "instagram" }>

const asFiniteNumber = (value: unknown, field: string) => {
  if (value === undefined) return undefined
  const result = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(result) || result < 0) throw new Error(`${field} must be a finite, non-negative number.`)
  return result
}

const firstDefined = (...values: unknown[]) => values.find((value) => value !== undefined)

export function normalizeExternalOrder(input: ExternalOrderIntake): z.infer<typeof importExternalOrderPublicRequest> {
  const payload = input.payload
  const externalOrderId = String(firstDefined(payload.externalOrderId, payload.orderId, payload.id) ?? "").trim()
  if (!externalOrderId) throw new Error("An external order ID is required.")

  const rawItems = payload.items ?? payload.lineItems ?? []
  const items = rawItems.map((item, index) => {
    const productName = item.productName ?? item.name ?? item.title
    if (!productName) throw new Error(`Item ${index + 1} requires a product name.`)
    const unitPrice = asFiniteNumber(firstDefined(item.unitPrice, item.price), `items[${index}].unitPrice`) ?? 0
    const quantityValue = firstDefined(item.quantity, 1)
    const quantity = typeof quantityValue === "number" ? quantityValue : Number(quantityValue)
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`items[${index}].quantity must be a positive integer.`)
    const lineTotal = asFiniteNumber(firstDefined(item.lineTotal, item.total, unitPrice * quantity), `items[${index}].lineTotal`) ?? 0
    if (Math.abs(lineTotal - unitPrice * quantity) > 0.01) throw new Error(`items[${index}].lineTotal does not match its price and quantity.`)
    return {
      productId: item.productId ?? null,
      variantId: item.variantId ?? null,
      productName,
      sku: item.sku ?? null,
      unitPrice,
      quantity,
      lineTotal,
      ...(item.snapshot ? { snapshot: item.snapshot } : {}),
    }
  })

  const type = payload.type ?? "product"
  const appointmentDetails = payload.appointmentDetails
    ? appointmentOrderDetailsSchema.parse(payload.appointmentDetails)
    : undefined
  const diamondQuoteDetails = payload.diamondQuoteDetails
    ? diamondQuoteDetailsSchema.parse(payload.diamondQuoteDetails)
    : undefined

  if (type === "appointment" && !appointmentDetails) {
    throw new Error("Appointment orders require appointment details.")
  }
  if (type === "quote" && !diamondQuoteDetails) {
    throw new Error("Quote orders require diamond quote details.")
  }

  const result = {
    source: input.source,
    externalOrderId,
    type,
    status: type === "quote" ? "draft" : payload.status,

    currency: payload.currency,
    subtotal: asFiniteNumber(firstDefined(payload.subtotal, payload.subtotalAmount), "subtotal"),
    deliveryFee: asFiniteNumber(firstDefined(payload.deliveryFee, payload.shipping, payload.shippingAmount), "deliveryFee"),
    discount: asFiniteNumber(firstDefined(payload.discount, payload.discountAmount), "discount"),
    total: asFiniteNumber(firstDefined(payload.total, payload.totalAmount), "total"),
    customerSnapshot: payload.customerSnapshot ?? payload.customer,
    ...(appointmentDetails ? { appointmentDetails } : {}),
    ...(diamondQuoteDetails ? { diamondQuoteDetails } : {}),
    ...(items.length > 0 ? { items } : {}),
  }

  return importExternalOrderPublicRequest.parse(result)
}
