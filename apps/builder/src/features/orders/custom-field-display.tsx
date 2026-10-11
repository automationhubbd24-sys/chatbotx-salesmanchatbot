import type { OrderCustomFieldType } from "@chatbotx.io/database/partials"

export type OrderCustomFieldDisplay = {
  definitionId: string
  key: string
  label: string
  type: OrderCustomFieldType
  options: string[] | null
  displayOrder: number
  value: unknown
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  return String(value)
}

export function formatOrderCustomFieldValue(
  field: OrderCustomFieldDisplay,
  currency: string,
  emptyLabel: string,
  yesLabel: string,
  noLabel: string,
) {
  const { value } = field
  if (value === null || value === undefined || value === "") {
    return emptyLabel
  }

  if (field.type === "boolean") {
    return value ? yesLabel : noLabel
  }
  if (field.type === "currency") {
    const amount = Number(value)
    return Number.isFinite(amount)
      ? `${currency} ${amount.toFixed(2)}`
      : (stringifyValue(value) ?? emptyLabel)
  }
  if (field.type === "date" || field.type === "datetime") {
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) {
      return stringifyValue(value) ?? emptyLabel
    }
    if (field.type === "date") {
      return date.toLocaleDateString()
    }
    return date.toLocaleString()
  }
  if (field.type === "select") {
    const selected = String(value)
    return field.options?.find((option) => option === selected) ?? selected
  }
  if (field.type === "multiselect" && Array.isArray(value)) {
    return (
      value
        .map((item) => String(item))
        .map((item) => field.options?.find((option) => option === item) ?? item)
        .join(", ") || emptyLabel
    )
  }
  return stringifyValue(value) ?? emptyLabel
}
