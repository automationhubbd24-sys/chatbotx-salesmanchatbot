import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  bindOrder: vi.fn(),
  createDraft: vi.fn(),
  createForIntent: vi.fn(),
  findById: vi.fn(),
  findWorkspace: vi.fn(),
  getById: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
  updateDraft: vi.fn(),
  updateDraftCustomFields: vi.fn(),
}))

vi.mock("@chatbotx.io/database/client", () => ({
  db: { transaction: mocks.transaction },
}))

vi.mock("@chatbotx.io/database/repositories", () => ({
  orderIntakeSessionRepository: {
    bindOrder: mocks.bindOrder,
    createForIntent: mocks.createForIntent,
    findById: mocks.findById,
    update: mocks.update,
  },
}))

vi.mock("../src/order", () => ({
  orderService: {
    createDraft: mocks.createDraft,
    getById: mocks.getById,
    updateDraft: mocks.updateDraft,
    updateDraftCustomFields: mocks.updateDraftCustomFields,
  },
}))

vi.mock("../src/workspace/service", () => ({
  workspaceService: { find: mocks.findWorkspace },
}))

const { orderIntakeSessionService } = await import(
  "../src/order-intake-session/service"
)

const baseSession = {
  id: "session-1",
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  contactId: "contact-1",
  orderId: null,
  version: 1,
  state: "collecting" as const,
  collectedData: {},
  expiresAt: new Date("2027-01-01"),
  closedAt: null,
}

describe("orderIntakeSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findWorkspace.mockResolvedValue({ targetCountry: "unknown" })
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) => callback("tx"),
    )
  })

  test("does not create an order before a valid phone is collected", async () => {
    mocks.findById.mockResolvedValue(baseSession)

    await expect(
      orderIntakeSessionService.createDraftWhenPhonePresent({
        workspaceId: "workspace-1",
        sessionId: "session-1",
        type: "product",
        source: "ai",
      }),
    ).rejects.toThrow("A valid phone number is required.")

    expect(mocks.createDraft).not.toHaveBeenCalled()
  })

  test("creates a separate intent session for each message in one conversation", async () => {
    mocks.createForIntent
      .mockResolvedValueOnce({
        ...baseSession,
        id: "session-1",
        intentMessageId: "message-1",
      })
      .mockResolvedValueOnce({
        ...baseSession,
        id: "session-2",
        intentMessageId: "message-2",
      })

    const first = await orderIntakeSessionService.startNewIntent({
      workspaceId: "workspace-1",
      conversationId: "conversation-1",
      contactId: "contact-1",
      intentMessageId: "message-1",
    })
    const second = await orderIntakeSessionService.startNewIntent({
      workspaceId: "workspace-1",
      conversationId: "conversation-1",
      contactId: "contact-1",
      intentMessageId: "message-2",
    })

    expect(first.id).not.toBe(second.id)
    expect(mocks.createForIntent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ intentMessageId: "message-1" }),
      expect.anything(),
    )
    expect(mocks.createForIntent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ intentMessageId: "message-2" }),
      expect.anything(),
    )
  })

  test("creates separate drafts for valid phones in separate intent sessions", async () => {
    const firstSession = {
      ...baseSession,
      collectedData: { phone: "+14155552671" },
      intentMessageId: "message-1",
    }
    const secondSession = {
      ...baseSession,
      id: "session-2",
      collectedData: { phone: "+14155552672" },
      intentMessageId: "message-2",
    }
    const firstOrder = { id: "order-1" }
    const secondOrder = { id: "order-2" }

    mocks.findById.mockImplementation(async ({ sessionId }) =>
      sessionId === "session-1" ? firstSession : secondSession,
    )
    mocks.createDraft
      .mockResolvedValueOnce(firstOrder)
      .mockResolvedValueOnce(secondOrder)
    mocks.bindOrder
      .mockResolvedValueOnce({ ...firstSession, orderId: firstOrder.id })
      .mockResolvedValueOnce({ ...secondSession, orderId: secondOrder.id })

    const first = await orderIntakeSessionService.createDraftWhenPhonePresent({
      workspaceId: "workspace-1",
      sessionId: "session-1",
      type: "product",
      source: "ai",
    })
    const second = await orderIntakeSessionService.createDraftWhenPhonePresent({
      workspaceId: "workspace-1",
      sessionId: "session-2",
      type: "product",
      source: "ai",
    })

    expect(first.order.id).toBe("order-1")
    expect(second.order.id).toBe("order-2")
    expect(first.session.id).not.toBe(second.session.id)
    expect(mocks.createDraft).toHaveBeenCalledTimes(2)
    expect(mocks.createDraft).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ conversationId: "conversation-1" }),
    )
    expect(mocks.createDraft).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ conversationId: "conversation-1" }),
    )
  })

  test("normalizes a Bangladesh local phone using the workspace target country", async () => {
    mocks.findWorkspace.mockResolvedValue({ targetCountry: "BD" })
    mocks.findById.mockResolvedValue(baseSession)
    mocks.update.mockImplementation(async ({ values }) => ({
      ...baseSession,
      collectedData: values.collectedData,
      version: 2,
    }))

    const session = await orderIntakeSessionService.recordDetails({
      workspaceId: "workspace-1",
      sessionId: "session-1",
      data: { phone: "01956871403" },
    })

    expect(session.collectedData.phone).toBe("+8801956871403")
  })

  test("normalizes Bengali Bangladesh phone digits using the workspace target country", async () => {
    mocks.findWorkspace.mockResolvedValue({ targetCountry: "BD" })
    mocks.findById.mockResolvedValue(baseSession)
    mocks.update.mockImplementation(async ({ values }) => ({
      ...baseSession,
      collectedData: values.collectedData,
      version: 2,
    }))

    const session = await orderIntakeSessionService.recordDetails({
      workspaceId: "workspace-1",
      sessionId: "session-1",
      data: { phone: "০১৯৩৭০৪৮৩০৭৭" },
    })

    expect(session.collectedData.phone).toBe("+88019370483077")
  })

  test("preserves explicit E.164 phone normalization without a workspace country", async () => {
    mocks.findById.mockResolvedValue(baseSession)
    mocks.update.mockImplementation(async ({ values }) => ({
      ...baseSession,
      collectedData: values.collectedData,
      version: 2,
    }))

    const session = await orderIntakeSessionService.recordDetails({
      workspaceId: "workspace-1",
      sessionId: "session-1",
      data: { phone: "+8801956871403" },
    })

    expect(session.collectedData.phone).toBe("+8801956871403")
  })

  test("rejects local phones when the workspace country is missing or unknown", async () => {
    mocks.findById.mockResolvedValue(baseSession)

    await expect(
      orderIntakeSessionService.recordDetails({
        workspaceId: "workspace-1",
        sessionId: "session-1",
        data: { phone: "01956871403" },
      }),
    ).rejects.toThrow("A valid phone number is required.")

    mocks.findWorkspace.mockResolvedValue({ targetCountry: null })

    await expect(
      orderIntakeSessionService.recordDetails({
        workspaceId: "workspace-1",
        sessionId: "session-1",
        data: { phone: "01956871403" },
      }),
    ).rejects.toThrow("A valid phone number is required.")
  })

  test("maps common phone and delivery aliases to canonical order fields", async () => {
    mocks.findWorkspace.mockResolvedValue({ targetCountry: "BD" })
    mocks.findById.mockResolvedValue(baseSession)
    mocks.update.mockImplementation(async ({ values }) => ({
      ...baseSession,
      collectedData: values.collectedData,
      version: 2,
    }))

    const session = await orderIntakeSessionService.recordDetails({
      workspaceId: "workspace-1",
      sessionId: "session-1",
      data: {
        mobile: "01956871403",
        customerName: "Habib",
        delivery_location: "Dinajpur",
        productName: "Red Bull",
        totalPrice: 1000,
      },
    })

    expect(session.collectedData).toMatchObject({
      phone: "+8801956871403",
      customer_name: "Habib",
      delivery_address: "Dinajpur",
      product_name: "Red Bull",
      total_price: 1000,
    })
    expect(session.collectedData).not.toHaveProperty("mobile")
    expect(session.collectedData).not.toHaveProperty("delivery_location")
  })

  test("flattens canonical customer snapshot values without overwriting top-level data", async () => {
    mocks.findById.mockResolvedValue(baseSession)
    mocks.update.mockImplementation(async ({ values }) => ({
      ...baseSession,
      collectedData: values.collectedData,
      version: 2,
    }))

    const session = await orderIntakeSessionService.recordDetails({
      workspaceId: "workspace-1",
      sessionId: "session-1",
      data: {
        phone: "+14155552671",
        customer_name: "Top-level name",
        customerSnapshot: {
          customer_name: "Nested name",
          delivery_address: "Dhaka",
          note: "Leave at reception",
        },
      },
    })

    expect(session.collectedData).toMatchObject({
      phone: "+14155552671",
      customer_name: "Top-level name",
      delivery_address: "Dhaka",
      customerSnapshot: { note: "Leave at reception" },
    })
  })
})
