export type LocalOrderHistoryStatus = "delivered" | "returned" | "cancelled" | "refused"

export type OrderRiskClassification = "safe" | "review_required" | "high_risk" | "no_history" | "provider_unavailable"

export type OrderRiskResult = {
  classification: OrderRiskClassification
  totalOrders: number
  deliveredOrders: number
  returnedOrders: number
  cancelledOrders: number
  refusedOrders: number
  returnRate: number | null
  shouldBlock: false
  reason: "no_history" | "provider_unavailable" | "local_history_signal" | "insufficient_signal"
}

export type ClassifyOrderRiskInput = {
  history: ReadonlyArray<{ status: LocalOrderHistoryStatus }>
  providerAvailable?: boolean
}

/**
 * Classifies local history as a review signal only. It never blocks an order
 * and does not imply that a customer is fraudulent.
 */
export function classifyOrderRisk(input: ClassifyOrderRiskInput): OrderRiskResult {
  if (input.providerAvailable === false) {
    return result("provider_unavailable", input.history, null, "provider_unavailable")
  }

  const counts = countStatuses(input.history)
  if (counts.totalOrders === 0) {
    return result("no_history", input.history, null, "no_history")
  }

  const returnRate = (counts.returnedOrders + counts.refusedOrders) / counts.totalOrders
  const classification =
    counts.totalOrders >= 3 && returnRate >= 0.7
      ? "high_risk"
      : counts.totalOrders >= 2 && returnRate >= 0.5
        ? "review_required"
        : counts.deliveredOrders > 0
          ? "safe"
          : "review_required"

  return result(classification, input.history, returnRate, "local_history_signal")
}

function countStatuses(history: ReadonlyArray<{ status: LocalOrderHistoryStatus }>) {
  return history.reduce(
    (counts, order) => {
      counts.totalOrders += 1
      if (order.status === "delivered") counts.deliveredOrders += 1
      if (order.status === "returned") counts.returnedOrders += 1
      if (order.status === "cancelled") counts.cancelledOrders += 1
      if (order.status === "refused") counts.refusedOrders += 1
      return counts
    },
    { totalOrders: 0, deliveredOrders: 0, returnedOrders: 0, cancelledOrders: 0, refusedOrders: 0 },
  )
}

function result(
  classification: OrderRiskClassification,
  history: ReadonlyArray<{ status: LocalOrderHistoryStatus }>,
  returnRate: number | null,
  reason: OrderRiskResult["reason"],
): OrderRiskResult {
  const counts = countStatuses(history)
  return { classification, ...counts, returnRate, shouldBlock: false, reason }
}
