import { describe, expect, test } from "vitest"
import { normalizeExternalOrder } from "../normalize-external-order"

describe("normalizeExternalOrder", () => {
  test.each(["website", "landing_page", "messenger", "whatsapp", "instagram"] as const)(
    "normalizes the common order shape for %s",
    (source) => {
      const result = normalizeExternalOrder({
        source,
        payload: {
          id: 42,
          type: "product",
          currency: "BDT",
          subtotalAmount: "100",
          shipping: 20,
          discountAmount: "5",
          totalAmount: 115,
          customer: { name: "Ada" },
          lineItems: [{ name: "Widget", price: "50", quantity: "2" }],
        },
      })

      expect(result).toMatchObject({
        source,
        externalOrderId: "42",
        currency: "BDT",
        subtotal: 100,
        deliveryFee: 20,
        discount: 5,
        total: 115,
        customerSnapshot: { name: "Ada" },
        items: [{ productName: "Widget", unitPrice: 50, quantity: 2, lineTotal: 100 }],
      })
    },
  )

  test("preserves source and external ID for idempotent import callers", () => {
    const result = normalizeExternalOrder({
      source: "messenger",
      payload: { externalOrderId: " msg-001 ", items: [] },
    })

    expect(result.source).toBe("messenger")
    expect(result.externalOrderId).toBe("msg-001")
  })

  test("rejects payloads without a stable external ID", () => {
    expect(() => normalizeExternalOrder({ source: "website", payload: {} })).toThrow(
      "An external order ID is required.",
    )
  })

  test("normalizes appointment details without changing product imports", () => {
    const result = normalizeExternalOrder({
      source: "website",
      payload: {
        id: "appointment-1",
        type: "appointment",
        appointmentDetails: {
          calendarId: "calendar-1",
          startAt: "2026-10-10T10:00:00+06:00",
          timeZone: "Asia/Dhaka",
        },
      },
    })

    expect(result).toMatchObject({
      type: "appointment",
      appointmentDetails: {
        calendarId: "calendar-1",
        timeZone: "Asia/Dhaka",
      },
    })
  })

  test("keeps diamond quote imports as drafts and validates quote details", () => {
    const result = normalizeExternalOrder({
      source: "whatsapp",
      payload: {
        id: "quote-1",
        type: "quote",
        diamondQuoteDetails: { carat: 1.2, shape: "round", clarity: "VS1" },
      },
    })

    expect(result).toMatchObject({
      type: "quote",
      status: "draft",
      diamondQuoteDetails: { carat: 1.2, shape: "round", clarity: "VS1" },
    })
  })

  test("rejects appointment and quote imports without typed details", () => {
    expect(() => normalizeExternalOrder({ source: "website", payload: { id: "a-1", type: "appointment" } })).toThrow("appointment details")
    expect(() => normalizeExternalOrder({ source: "website", payload: { id: "q-1", type: "quote" } })).toThrow("quote details")
  })

  test("rejects inconsistent line totals", () => {
    expect(() =>
      normalizeExternalOrder({
        source: "whatsapp",
        payload: { id: "wa-1", items: [{ productName: "Widget", unitPrice: 10, quantity: 2, lineTotal: 25 }] },
      }),
    ).toThrow("lineTotal does not match")
  })
})
