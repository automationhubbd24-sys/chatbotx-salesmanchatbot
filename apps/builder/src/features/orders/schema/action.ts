import { orderStatuses } from "@chatbotx.io/database/partials"
import { zodBigintAsString } from "@chatbotx.io/utils"
import { z } from "zod"

export const orderIdRequest = z.object({
  orderId: z.string().min(1),
})

export const confirmOrderRequest = orderIdRequest.extend({
  token: z.string().min(1),
  version: z.number().int().positive(),
  idempotencyKey: z.string().min(1).optional(),
})

export const exportOrdersRequest = z.object({
  status: orderStatuses.optional(),
  statuses: z.array(orderStatuses).optional(),
  search: z.string().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
})

export type ExportOrdersRequest = z.infer<typeof exportOrdersRequest>

export const syncOrdersToGoogleSheetsRequest = exportOrdersRequest.extend({
  spreadsheetId: zodBigintAsString(),
  sheetName: z.string().min(1),
})

export type SyncOrdersToGoogleSheetsRequest = z.infer<
  typeof syncOrdersToGoogleSheetsRequest
>

export type ExportOrdersResponse = {
  content: string
  filename: string
}
