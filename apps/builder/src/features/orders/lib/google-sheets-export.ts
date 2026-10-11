import {
  buildContext,
  integrationGoogleSheetService,
  orderService,
  spreadsheetService,
} from "@chatbotx.io/business"
import type { GoogleSheetsAuthValue } from "@chatbotx.io/integration-google-sheets"
import { integrations } from "@/integration"
import type { ExportOrdersRequest } from "../schema/action"
import { serializeOrderExportValue } from "./export-orders"

const ORDER_ID_HEADER = "Order ID"

function stringifySheetValue(value: unknown): string {
  const serialized = serializeOrderExportValue(value)
  return serialized === null ? "" : String(serialized)
}

function valueByHeader(input: {
  header: string
  order: Awaited<
    ReturnType<typeof orderService.listForExport>
  >["orders"][number]
  columns: Awaited<ReturnType<typeof orderService.listForExport>>["columns"]
}) {
  const { header, order, columns } = input
  const customField = columns.find((column) => column.label === header)
  if (customField) {
    return stringifySheetValue(
      order.customFields.find(
        (field) => field.definitionId === customField.definitionId,
      )?.value,
    )
  }

  const values: Record<string, unknown> = {
    [ORDER_ID_HEADER]: order.externalOrderId ?? order.id,
    Status: order.status,
    Source: order.source,
    Type: order.type,
    Currency: order.currency,
    Subtotal: order.subtotal,
    "Delivery fee": order.deliveryFee,
    Discount: order.discount,
    Total: order.total,
    "Created at": order.createdAt.toISOString(),
  }

  return stringifySheetValue(values[header])
}

export async function syncOrdersToGoogleSheets(input: {
  workspaceId: string
  spreadsheetId: string
  sheetName: string
  filters: ExportOrdersRequest
}) {
  const [spreadsheet, sheetIntegration] = await Promise.all([
    spreadsheetService.findByWorkspaceIdOrFail({
      id: input.spreadsheetId,
      workspaceId: input.workspaceId,
    }),
    integrationGoogleSheetService.findByWorkspaceIdOrFail(input.workspaceId),
  ])

  const { orders, columns } = await orderService.listForExport({
    workspaceId: input.workspaceId,
    ...input.filters,
  })

  const ctx = await buildContext({
    workspaceId: input.workspaceId,
    integrationType: "googleSheets",
    integration: {
      ...sheetIntegration,
      auth: sheetIntegration.auth as GoogleSheetsAuthValue,
    },
  })

  const headers = await integrations.googleSheets.runAction(
    "listSheetHeaders",
    {
      ctx,
      props: {
        spreadsheetId: spreadsheet.spreadsheetId,
        sheetName: input.sheetName,
      },
    },
  )
  const orderIdColumn = headers.indexOf(ORDER_ID_HEADER)
  if (orderIdColumn < 0) {
    throw new Error(`Google Sheet must contain a ${ORDER_ID_HEADER} column.`)
  }

  const values = await integrations.googleSheets.runAction("getSheetValues", {
    ctx,
    props: {
      spreadsheetId: spreadsheet.spreadsheetId,
      sheetName: input.sheetName,
    },
  })
  const existingRows = new Map(
    values.slice(1).map((row, index) => [row[orderIdColumn], index + 1]),
  )

  for (const order of orders) {
    const row = headers.map((header) =>
      valueByHeader({ header, order, columns }),
    )
    const orderId = row[orderIdColumn]
    const rowIndex = existingRows.get(orderId)

    if (rowIndex === undefined) {
      await integrations.googleSheets.runAction("insertRow", {
        ctx,
        props: {
          spreadsheetId: spreadsheet.spreadsheetId,
          sheetName: input.sheetName,
          data: row,
        },
      })
    } else {
      await integrations.googleSheets.runAction("updateRow", {
        ctx,
        props: {
          spreadsheetId: spreadsheet.spreadsheetId,
          sheetName: input.sheetName,
          rowIndex,
          data: row,
        },
      })
    }
  }

  return { synced: orders.length }
}
