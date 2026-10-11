import { orderService } from "@chatbotx.io/business"
import { toCsvRow } from "../../ads/lib/csv"
import type { ExportOrdersRequest } from "../schema/action"

export function serializeOrderExportValue(
  value: unknown,
): string | number | boolean | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  return value as string | number | boolean
}

export async function exportOrders(input: {
  workspaceId: string
  filters: ExportOrdersRequest
}) {
  const { orders, columns } = await orderService.listForExport({
    workspaceId: input.workspaceId,
    ...input.filters,
  })

  const header = [
    "Order ID",
    "Status",
    "Source",
    "Type",
    "Currency",
    "Subtotal",
    "Delivery fee",
    "Discount",
    "Total",
    "Created at",
    ...columns.map((column) => column.label),
  ]

  const rows = orders.map((order) => {
    const fields = new Map(
      order.customFields.map((field) => [field.definitionId, field.value]),
    )
    return [
      order.externalOrderId ?? order.id,
      order.status,
      order.source,
      order.type,
      order.currency,
      order.subtotal,
      order.deliveryFee,
      order.discount,
      order.total,
      order.createdAt.toISOString(),
      ...columns.map((column) =>
        serializeOrderExportValue(fields.get(column.definitionId)),
      ),
    ]
  })

  return {
    content: `\uFEFF${toCsvRow(header)}${rows.map(toCsvRow).join("")}`,
    filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
  }
}
