import type { ContactFilterField } from "@salesmanchatbot.io/database/partials"
import type { ContactFilterCondition } from "../schema"

export const pruneExcludedConditions = (
  conditions: ContactFilterCondition[],
  excludeFields: ContactFilterField[],
): ContactFilterCondition[] => {
  if (excludeFields.length === 0) {
    return conditions
  }

  return conditions.filter(
    (condition) =>
      !excludeFields.includes(condition.field as ContactFilterField),
  )
}
