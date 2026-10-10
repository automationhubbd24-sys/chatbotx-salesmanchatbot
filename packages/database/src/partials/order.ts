import z from "zod"

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max)

export const appointmentOrderDetailsSchema = z.object({
  calendarId: nonEmptyText(255).optional(),
  appointmentId: nonEmptyText(255).optional(),
  startAt: z.string().datetime({ offset: true }).optional(),
  endAt: z.string().datetime({ offset: true }).optional(),
  timeZone: nonEmptyText(100).optional(),
  notes: z.string().trim().max(2000).optional(),
})
export type AppointmentOrderDetails = z.infer<typeof appointmentOrderDetailsSchema>

export const diamondQuoteDetailsSchema = z.object({
  carat: z.number().positive().optional(),
  shape: nonEmptyText(100).optional(),
  color: nonEmptyText(100).optional(),
  clarity: nonEmptyText(100).optional(),
  certificate: nonEmptyText(255).optional(),
  budget: z.number().nonnegative().optional(),
  budgetCurrency: nonEmptyText(10).optional(),
})
export type DiamondQuoteDetails = z.infer<typeof diamondQuoteDetailsSchema>

export const orderTypes = z.enum([
  "product",
  "appointment",
  "quote",
  "digital_service",
])
export type OrderType = z.infer<typeof orderTypes>

export const orderStatuses = z.enum([
  "draft",
  "awaiting_confirmation",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "failed",
  "expired",
])
export type OrderStatus = z.infer<typeof orderStatuses>

export const orderSources = z.enum([
  "ai",
  "website",
  "landing_page",
  "messenger",
  "instagram",
  "whatsapp",
  "manual",
  "api",
])
export type OrderSource = z.infer<typeof orderSources>

export const orderFulfillmentStatuses = z.enum([
  "unfulfilled",
  "partially_fulfilled",
  "fulfilled",
  "cancelled",
])
export type OrderFulfillmentStatus = z.infer<typeof orderFulfillmentStatuses>

export const orderCustomFieldTypes = z.enum([
  "text",
  "phone",
  "email",
  "number",
  "currency",
  "date",
  "datetime",
  "select",
  "multiselect",
  "address",
  "product",
  "variant",
  "boolean",
  "textarea",
])
export type OrderCustomFieldType = z.infer<typeof orderCustomFieldTypes>
