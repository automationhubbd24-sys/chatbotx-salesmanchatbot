import { z } from "zod"

export const orderIdRequest = z.object({
  orderId: z.string().min(1),
})

export const confirmOrderRequest = orderIdRequest.extend({
  token: z.string().min(1),
  version: z.number().int().positive(),
  idempotencyKey: z.string().min(1).optional(),
})
