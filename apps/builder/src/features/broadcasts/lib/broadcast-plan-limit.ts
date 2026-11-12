import {
  type BroadcastPlanLimitData,
  broadcastPlanLimitDataSchema,
} from "@salesmanchatbot.io/database/partials"

export type BroadcastPlanLimitOutcome = {
  outcome: "planLimit"
  limit: BroadcastPlanLimitData
}

export const isBroadcastPlanLimitOutcome = (
  value: unknown,
): value is BroadcastPlanLimitOutcome => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as Partial<BroadcastPlanLimitOutcome>
  return (
    candidate.outcome === "planLimit" &&
    broadcastPlanLimitDataSchema.safeParse(candidate.limit).success
  )
}
