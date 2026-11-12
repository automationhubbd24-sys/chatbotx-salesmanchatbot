import { describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  recordDetails: vi.fn(),
}))

vi.mock("@salesmanchatbot.io/ai", () => ({
  systemFunctionNames: {
    cancelOrderDraft: "cancel_order_draft",
    confirmOrder: "confirm_order",
    getOrderDetails: "get_order_details",
    getOrderIntake: "get_order_intake",
    requestOrderConfirmation: "request_order_confirmation",
    startOrderIntake: "start_order_intake",
    updateOrderDraft: "update_order_draft",
    updateOrderIntake: "update_order_intake",
  },
}))

vi.mock("@salesmanchatbot.io/business", () => ({
  orderIntakeSessionService: {
    get: mocks.get,
    recordDetails: mocks.recordDetails,
  },
  orderService: {},
}))

const { createOrderExecutors } = await import(
  "../src/integration/handlers/automated-response/system-tools/orders"
)
const { validationException } = await import("@salesmanchatbot.io/business/errors")

describe("order system tool executors", () => {
  test("returns field-scoped validation failures without exposing unexpected errors", async () => {
    mocks.get.mockResolvedValue({ orderId: null })
    mocks.recordDetails.mockRejectedValue(
      validationException("phone", "A valid phone number is required."),
    )
    const execute = createOrderExecutors().update_order_intake as (
      input: unknown,
      context: unknown,
    ) => Promise<unknown>

    await expect(
      execute(
        { sessionId: "session-1", data: { phone: "invalid" } },
        {
          workspaceId: "workspace-1",
          conversationId: "conversation-1",
          contactId: "contact-1",
        },
      ),
    ).resolves.toEqual({
      order: null,
      error: "A valid phone number is required.",
      validation: {
        field: "phone",
        code: "validation",
        message: "A valid phone number is required.",
      },
    })
  })
})
