import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  listForExport: vi.fn(),
}))

vi.mock("@chatbotx.io/business", () => ({
  orderService: { listForExport: mocks.listForExport },
}))

const ORDER_FILENAME_RE = /^orders-\d{4}-\d{2}-\d{2}\.csv$/

const { exportOrders, serializeOrderExportValue } = await import(
  "../export-orders"
)

describe("order export", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("serializes structured custom values as JSON", () => {
    expect(serializeOrderExportValue({ city: "Dhaka" })).toBe(
      '{"city":"Dhaka"}',
    )
    expect(serializeOrderExportValue(null)).toBeNull()
  })

  test("exports dynamic fields and protects spreadsheet formulas", async () => {
    mocks.listForExport.mockResolvedValue({
      columns: [
        {
          definitionId: "field-1",
          key: "customer_note",
          label: "Customer note",
          type: "text",
          options: null,
        },
      ],
      orders: [
        {
          id: "order-1",
          externalOrderId: null,
          status: "draft",
          source: "messenger",
          type: "product",
          currency: "BDT",
          subtotal: 100,
          deliveryFee: 20,
          discount: 0,
          total: 120,
          createdAt: new Date("2026-10-11T10:00:00.000Z"),
          customFields: [
            {
              definitionId: "field-1",
              value: '=HYPERLINK("https://evil.example")',
            },
          ],
        },
      ],
    })

    const result = await exportOrders({
      workspaceId: "workspace-1",
      filters: { statuses: ["draft"], search: "customer" },
    })

    expect(mocks.listForExport).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      statuses: ["draft"],
      search: "customer",
    })
    expect(result.filename).toMatch(ORDER_FILENAME_RE)
    expect(result.content).toContain("Customer note")
    expect(result.content).toContain('\'=HYPERLINK(""https://evil.example"")')
  })
})
