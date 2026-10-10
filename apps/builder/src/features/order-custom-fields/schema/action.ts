import { orderCustomFieldTypes, orderTypes } from "@chatbotx.io/database/partials"
import { z } from "zod"

const optionsSchema = z.preprocess(
  (value) => (value === null ? undefined : typeof value === "string" ? value.split("\n").map((item) => item.trim()).filter(Boolean) : value),
  z.array(z.string()).nullable().optional(),
)

export const orderCustomFieldDefinitionSchema = z.object({
  orderType: orderTypes,
  key: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  type: orderCustomFieldTypes,
  required: z.boolean().default(false),
  customerEditable: z.boolean().default(true),
  aiVisible: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
  options: optionsSchema,
})

export const updateOrderCustomFieldDefinitionSchema = orderCustomFieldDefinitionSchema.extend({
  id: z.string().min(1),
})

export const deleteOrderCustomFieldDefinitionSchema = z.object({ id: z.string().min(1) })
