import { describe, expect, test } from "vitest"
import { classifyOrderRisk } from "../src/order/risk"

describe("classifyOrderRisk", () => {
  test("reports no history without blocking", () => {
    expect(classifyOrderRisk({ history: [] })).toMatchObject({
      classification: "no_history",
      shouldBlock: false,
      returnRate: null,
    })
  })

  test("reports provider unavailability without making an accusation", () => {
    expect(classifyOrderRisk({ history: [], providerAvailable: false })).toMatchObject({
      classification: "provider_unavailable",
      shouldBlock: false,
    })
  })

  test("classifies repeated returns as a review signal, not an automatic block", () => {
    const result = classifyOrderRisk({
      history: [
        { status: "returned" },
        { status: "refused" },
        { status: "returned" },
        { status: "delivered" },
      ],
    })

    expect(result).toMatchObject({
      classification: "high_risk",
      totalOrders: 4,
      returnRate: 0.75,
      shouldBlock: false,
    })
  })

  test("recognizes successful local history as safe", () => {
    expect(classifyOrderRisk({ history: [{ status: "delivered" }] })).toMatchObject({
      classification: "safe",
      deliveredOrders: 1,
      shouldBlock: false,
    })
  })
})
