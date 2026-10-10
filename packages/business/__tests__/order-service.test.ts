import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  find: vi.fn(),
  findByExternalId: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  createItems: vi.fn(),
  addStatusHistory: vi.fn(),
  listCustomFieldDefinitions: vi.fn(),
}))

vi.mock("@chatbotx.io/database/client", () => ({
  db: { transaction: mocks.transaction },
}))

vi.mock("@chatbotx.io/database/repositories", () => ({
  orderRepository: {
    find: mocks.find,
    findByExternalId: mocks.findByExternalId,
    update: mocks.update,
    create: mocks.create,
    createItems: mocks.createItems,
    addStatusHistory: mocks.addStatusHistory,
    listCustomFieldDefinitions: mocks.listCustomFieldDefinitions,
  },
}))

const { orderService } = await import("../src/order/service")

const draftOrder = {
  id: "order-1",
  workspaceId: "workspace-1",
  status: "draft" as const,
  version: 1,
  expiresAt: null,
  confirmationMetadata: null,
  customFieldValues: [],
}

describe("orderService lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) => callback("tx"),
    )
    mocks.addStatusHistory.mockResolvedValue(undefined)
    mocks.listCustomFieldDefinitions.mockResolvedValue([])
  })

  test("requests confirmation with a new token and optimistic version", async () => {
    mocks.find.mockResolvedValue(draftOrder)
    mocks.update.mockResolvedValue({
      ...draftOrder,
      status: "awaiting_confirmation",
      version: 2,
      confirmationMetadata: { token: "token-1", version: 2 },
    })

    const result = await orderService.requestConfirmation({
      workspaceId: "workspace-1",
      orderId: "order-1",
      token: "token-1",
    })

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        orderId: "order-1",
        expectedVersion: 1,
        values: {
          status: "awaiting_confirmation",
          confirmationMetadata: { token: "token-1", version: 2 },
        },
      }),
      "tx",
    )
    expect(mocks.addStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        fromStatus: "draft",
        toStatus: "awaiting_confirmation",
      }),
      "tx",
    )
    expect(result.status).toBe("awaiting_confirmation")
  })

  test("rejects confirmation when the token or version does not match", async () => {
    mocks.find.mockResolvedValue({
      ...draftOrder,
      status: "awaiting_confirmation",
      confirmationMetadata: { token: "expected-token", version: 2 },
    })

    await expect(
      orderService.confirm({
        workspaceId: "workspace-1",
        orderId: "order-1",
        token: "wrong-token",
        version: 2,
      }),
    ).rejects.toThrow("Confirmation token is invalid or expired.")

    expect(mocks.update).not.toHaveBeenCalled()
  })

  test("confirms an awaiting order and records idempotency metadata", async () => {
    mocks.find.mockResolvedValue({
      ...draftOrder,
      status: "awaiting_confirmation",
      confirmationMetadata: { token: "token-1", version: 2 },
    })
    mocks.update.mockResolvedValue({
      ...draftOrder,
      status: "confirmed",
      version: 3,
      confirmationMetadata: {
        token: "token-1",
        version: 2,
        idempotencyKey: "request-1",
      },
    })

    const result = await orderService.confirm({
      workspaceId: "workspace-1",
      orderId: "order-1",
      token: "token-1",
      version: 2,
      idempotencyKey: "request-1",
    })

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: 1,
        values: expect.objectContaining({
          status: "confirmed",
          confirmationMetadata: expect.objectContaining({
            idempotencyKey: "request-1",
          }),
        }),
      }),
      "tx",
    )
    expect(mocks.addStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStatus: "awaiting_confirmation",
        toStatus: "confirmed",
        metadata: { idempotencyKey: "request-1" },
      }),
      "tx",
    )
    expect(result.status).toBe("confirmed")
  })

  test("imports appointment details into the customer snapshot", async () => {
    mocks.findByExternalId.mockResolvedValue(null)
    mocks.create.mockResolvedValue({ ...draftOrder, type: "appointment", status: "confirmed" })
    mocks.createItems.mockResolvedValue(undefined)

    await orderService.importExternalOrder({
      workspaceId: "workspace-1",
      source: "website",
      externalOrderId: "appointment-1",
      type: "appointment",
      appointmentDetails: {
        calendarId: "calendar-1",
        startAt: "2026-10-10T10:00:00+06:00",
        timeZone: "Asia/Dhaka",
      },
    })

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "appointment",
        customerSnapshot: {
          appointmentDetails: {
            calendarId: "calendar-1",
            startAt: "2026-10-10T10:00:00+06:00",
            timeZone: "Asia/Dhaka",
          },
        },
      }),
      "tx",
    )
  })

  test("always keeps diamond quote imports as drafts", async () => {
    mocks.findByExternalId.mockResolvedValue(null)
    mocks.create.mockResolvedValue({ ...draftOrder, type: "quote", status: "draft" })
    mocks.createItems.mockResolvedValue(undefined)

    await orderService.importExternalOrder({
      workspaceId: "workspace-1",
      source: "whatsapp",
      externalOrderId: "quote-1",
      type: "quote",
      status: "confirmed",
      diamondQuoteDetails: { carat: 1.2, shape: "round", clarity: "VS1" },
    })

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "quote",
        status: "draft",
        confirmedAt: null,
        customerSnapshot: {
          diamondQuoteDetails: { carat: 1.2, shape: "round", clarity: "VS1" },
        },
      }),
      "tx",
    )
  })

  test("returns an existing external order without creating a duplicate", async () => {
    const existing = { ...draftOrder, externalOrderId: "external-1" }
    mocks.findByExternalId.mockResolvedValue(existing)

    const result = await orderService.importExternalOrder({
      workspaceId: "workspace-1",
      source: "website",
      externalOrderId: "external-1",
      type: "product",
    })

    expect(result).toBe(existing)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.createItems).not.toHaveBeenCalled()
  })
})
